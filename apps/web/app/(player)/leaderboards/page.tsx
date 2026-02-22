"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Entry = {
  rank: number;
  playerName: string;
  level: string;
  totalTimeMs: number;
  hintsUsed: number;
  finishedAt: string;
};

const LEVEL_LABELS: Record<string, string> = {
  basic: "Basic",
  elementary: "Elem.",
  senior_elementary: "Sr. Elem.",
  junior_high: "Jr. High",
  senior_high: "Sr. High",
  adult: "Adult",
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${(m % 60).toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function LeaderboardContent() {
  const params = useSearchParams();
  const initialHuntId = params.get("huntId") ?? "";
  const [huntId, setHuntId] = useState(initialHuntId);
  const [hunts, setHunts] = useState<{ id: string; name: string }[]>([]);
  const [range, setRange] = useState<"today" | "month" | "all">("today");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load hunts list (public — admins set this up)
  useEffect(() => {
    fetch("/api/hunts")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setHunts(json.data);
          if (!huntId && json.data.length > 0) setHuntId(json.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!huntId) return;
    setLoading(true);
    fetch(`/api/leaderboards?huntId=${huntId}&range=${range}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setEntries(json.data.entries);
          setTotal(json.data.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [huntId, range]);

  return (
    <main className="min-h-screen bg-amber-50">
      <header className="bg-amber-500 text-white px-6 py-4">
        <h1 className="text-xl font-bold">Leaderboard 🏅</h1>
      </header>

      <div className="px-4 py-4 space-y-3">
        {/* Hunt selector */}
        {hunts.length > 1 && (
          <select
            value={huntId}
            onChange={(e) => setHuntId(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-700 bg-white"
          >
            {hunts.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        )}

        {/* Range tabs */}
        <div className="flex bg-white rounded-lg border border-gray-200 p-1">
          {(["today", "month", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
                range === r ? "bg-amber-500 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {r === "today" ? "Today" : r === "month" ? "This Month" : "All Time"}
            </button>
          ))}
        </div>

        {/* Entries */}
        {loading ? (
          <div className="text-center py-12 text-amber-600 animate-pulse">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No entries yet.</div>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div
                key={`${e.playerName}-${e.finishedAt}`}
                className="bg-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm"
              >
                <span
                  className={`text-lg font-bold w-8 text-center ${
                    e.rank === 1 ? "text-yellow-500" : e.rank === 2 ? "text-gray-400" : e.rank === 3 ? "text-amber-700" : "text-gray-300"
                  }`}
                >
                  {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : `#${e.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{e.playerName}</p>
                  <p className="text-xs text-gray-400">{LEVEL_LABELS[e.level] ?? e.level}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold text-amber-700">
                    {e.totalTimeMs !== null ? formatTime(e.totalTimeMs) : "—"}
                  </p>
                  {e.hintsUsed > 0 && (
                    <p className="text-xs text-gray-400">{e.hintsUsed} hint{e.hintsUsed !== 1 ? "s" : ""}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function LeaderboardsPage() {
  return (
    <Suspense>
      <LeaderboardContent />
    </Suspense>
  );
}
