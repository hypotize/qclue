-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('basic', 'elementary', 'senior_elementary', 'junior_high', 'senior_high', 'adult');

-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('en', 'ja', 'fr', 'es', 'zh_Hans', 'zh_Hant');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('active', 'finished', 'abandoned', 'invalid');

-- CreateEnum
CREATE TYPE "RunEventType" AS ENUM ('clue_viewed', 'hint1_shown', 'hint2_shown', 'qr_scanned_ok', 'qr_scanned_wrong', 'qr_unrecognized', 'level_override', 'finished');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('admin');

-- CreateTable
CREATE TABLE "admins" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'admin',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "players" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "preferred_language" "LanguageCode" NOT NULL,
    "assigned_level" "DifficultyLevel" NOT NULL,
    "session_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "players_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hunts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "final_treasure_youtube_id" TEXT NOT NULL,
    "fallback_language" "LanguageCode" NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hunts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_age_mappings" (
    "id" TEXT NOT NULL,
    "level" "DifficultyLevel" NOT NULL,
    "min_age" INTEGER NOT NULL,
    "max_age" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "level_age_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clues" (
    "id" TEXT NOT NULL,
    "hunt_id" TEXT NOT NULL,
    "sequence_index" INTEGER NOT NULL,
    "token" TEXT NOT NULL,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clue_contents" (
    "id" TEXT NOT NULL,
    "clue_id" TEXT NOT NULL,
    "language" "LanguageCode" NOT NULL,
    "level" "DifficultyLevel",
    "clue_text" TEXT NOT NULL,
    "hint1_text" TEXT,
    "hint2_text" TEXT,
    "image_url" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clue_contents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "player_id" TEXT NOT NULL,
    "hunt_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "status" "RunStatus" NOT NULL DEFAULT 'active',
    "total_time_ms" BIGINT,
    "current_clue_index" INTEGER NOT NULL DEFAULT 1,
    "last_progressed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hints_used_count" INTEGER NOT NULL DEFAULT 0,
    "level_overridden" BOOLEAN NOT NULL DEFAULT false,
    "level_at_start" "DifficultyLevel" NOT NULL,
    "level_at_finish" "DifficultyLevel",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "run_events" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "event_type" "RunEventType" NOT NULL,
    "clue_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "run_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_credentials" (
    "id" TEXT NOT NULL,
    "credential_hash" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "scope" TEXT NOT NULL DEFAULT 'global',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "rotated_at" TIMESTAMP(3),
    "rotated_by" TEXT,

    CONSTRAINT "admin_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_key" ON "admins"("email");

-- CreateIndex
CREATE INDEX "players_session_token_hash_idx" ON "players"("session_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "level_age_mappings_level_key" ON "level_age_mappings"("level");

-- CreateIndex
CREATE UNIQUE INDEX "clues_token_key" ON "clues"("token");

-- CreateIndex
CREATE INDEX "clues_hunt_id_sequence_index_idx" ON "clues"("hunt_id", "sequence_index");

-- CreateIndex
CREATE INDEX "clues_token_idx" ON "clues"("token");

-- CreateIndex
CREATE UNIQUE INDEX "clues_hunt_id_sequence_index_key" ON "clues"("hunt_id", "sequence_index");

-- CreateIndex
CREATE INDEX "clue_contents_clue_id_language_level_idx" ON "clue_contents"("clue_id", "language", "level");

-- CreateIndex
CREATE UNIQUE INDEX "clue_contents_clue_id_language_level_key" ON "clue_contents"("clue_id", "language", "level");

-- CreateIndex
CREATE INDEX "runs_player_id_idx" ON "runs"("player_id");

-- CreateIndex
CREATE INDEX "runs_hunt_id_status_total_time_ms_idx" ON "runs"("hunt_id", "status", "total_time_ms");

-- CreateIndex
CREATE INDEX "runs_status_last_progressed_at_idx" ON "runs"("status", "last_progressed_at");

-- CreateIndex
CREATE INDEX "run_events_run_id_event_type_timestamp_idx" ON "run_events"("run_id", "event_type", "timestamp");

-- CreateIndex
CREATE INDEX "run_events_run_id_clue_id_event_type_idx" ON "run_events"("run_id", "clue_id", "event_type");

-- AddForeignKey
ALTER TABLE "level_age_mappings" ADD CONSTRAINT "level_age_mappings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clues" ADD CONSTRAINT "clues_hunt_id_fkey" FOREIGN KEY ("hunt_id") REFERENCES "hunts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clue_contents" ADD CONSTRAINT "clue_contents_clue_id_fkey" FOREIGN KEY ("clue_id") REFERENCES "clues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clue_contents" ADD CONSTRAINT "clue_contents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_hunt_id_fkey" FOREIGN KEY ("hunt_id") REFERENCES "hunts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "run_events" ADD CONSTRAINT "run_events_clue_id_fkey" FOREIGN KEY ("clue_id") REFERENCES "clues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_credentials" ADD CONSTRAINT "admin_credentials_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_credentials" ADD CONSTRAINT "admin_credentials_rotated_by_fkey" FOREIGN KEY ("rotated_by") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE CASCADE;
