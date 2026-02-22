"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

const LEVEL_LABELS: Record<string, string> = {
  basic: "Basic",
  elementary: "Elementary",
  senior_elementary: "Senior Elementary",
  junior_high: "Junior High",
  senior_high: "Senior High",
  adult: "Adult",
};

const LANG_LABELS: Record<string, string> = {
  en: "English",
  ja: "日本語",
  fr: "Français",
  es: "Español",
  zh_Hans: "中文（简体）",
  zh_Hant: "中文（繁體）",
};

function ConfirmContent() {
  const router = useRouter();
  const params = useSearchParams();

  const name = params.get("name") ?? "";
  const age = params.get("age") ?? "";
  const language = params.get("language") ?? "en";
  const level = params.get("level") ?? "";
  const runId = params.get("runId") ?? "";

  function handleStart() {
    router.push(`/clue?runId=${runId}`);
  }

  function handleOverride() {
    router.push(`/override?runId=${runId}`);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-amber-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🎉</div>
          <h1 className="text-2xl font-bold text-amber-900">You&apos;re registered!</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-6 space-y-4 mb-6">
          <Row label="Name" value={name} />
          <Row label="Age" value={age} />
          <Row label="Language" value={LANG_LABELS[language] ?? language} />
          <div className="border-t border-gray-100 pt-4">
            <Row label="Difficulty Level" value={LEVEL_LABELS[level] ?? level} highlight />
          </div>
        </div>

        <p className="text-sm text-amber-700 text-center mb-6">
          Your difficulty level is now locked. Ask the clue master if you need to change it.
        </p>

        <button
          onClick={handleStart}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg py-4 text-lg transition-colors mb-3"
        >
          Start Hunt 🗺️
        </button>

        <button
          onClick={handleOverride}
          className="w-full bg-white border border-amber-300 text-amber-700 font-medium rounded-lg py-3 transition-colors hover:bg-amber-50"
        >
          Request Level Override
        </button>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-500">{label}</span>
      <span
        className={`text-sm font-semibold ${highlight ? "text-amber-700 bg-amber-100 px-3 py-1 rounded-full" : "text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense>
      <ConfirmContent />
    </Suspense>
  );
}
