"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m ${seconds.toString().padStart(2, "0")}s`;
  }
  return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
}

function CompleteContent() {
  const params = useSearchParams();
  const totalTimeMs = parseInt(params.get("totalTimeMs") ?? "0", 10);
  const treasureUrl = params.get("treasureUrl") ?? "";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-bold text-amber-900 mb-2">You did it!</h1>
        <p className="text-amber-700 mb-8">You&apos;ve completed the treasure hunt!</p>

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">
          <p className="text-sm text-gray-500 mb-1">Your Time</p>
          <p className="text-4xl font-bold text-amber-600">{formatTime(totalTimeMs)}</p>
        </div>

        <a
          href={treasureUrl || "#"}
          className="block w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg py-4 text-lg transition-colors mb-4"
        >
          Open Final Treasure 🎁
        </a>

        <a
          href="/leaderboards"
          className="block w-full bg-white border border-amber-300 text-amber-700 font-medium rounded-lg py-3 transition-colors hover:bg-amber-50"
        >
          View Leaderboard
        </a>
      </div>
    </main>
  );
}

export default function CompletePage() {
  return (
    <Suspense>
      <CompleteContent />
    </Suspense>
  );
}
