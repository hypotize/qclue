"use client";

import { useEffect, useState } from "react";

type Run = {
  id: string;
  status: string;
  currentClueIndex: number;
  totalTimeMs: number | null;
  hintsUsedCount: number;
  startedAt: string;
  finishedAt: string | null;
  levelAtStart: string;
  player: { id: string; name: string };
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900 text-green-400",
  finished: "bg-blue-900 text-blue-400",
  abandoned: "bg-gray-800 text-gray-500",
  invalid: "bg-red-900 text-red-400",
};

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${(m % 60).toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function AdminRunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");

  async function load() {
    const qs = statusFilter ? `?status=${statusFilter}` : "";
    const res = await fetch(`/api/admin/runs${qs}`);
    const json = await res.json();
    if (json.data) { setRuns(json.data.runs); setTotal(json.data.total); }
    setLoading(false);
  }

  useEffect(() => { load(); }, [statusFilter]);

  async function resetRun(runId: string) {
    if (!confirm("Reset this run to Clue 1?")) return;
    await fetch(`/api/admin/runs/${runId}/reset`, { method: "POST" });
    load();
  }

  async function invalidateRun(runId: string) {
    if (!confirm("Mark this run as invalid?")) return;
    await fetch(`/api/admin/runs/${runId}/invalidate`, { method: "POST" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Runs</h1>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{total} total</p>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setLoading(true); }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="finished">Finished</option>
            <option value="abandoned">Abandoned</option>
            <option value="invalid">Invalid</option>
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading…</p>
      ) : runs.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">⏱️</p>
          <p>No runs found.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr>
                {["Player", "Status", "Step", "Time", "Hints", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {runs.map((r) => (
                <tr key={r.id} className="hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-200">{r.player.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[r.status] ?? ""}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.status === "active" ? `#${r.currentClueIndex}` : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-300">
                    {r.totalTimeMs !== null ? formatTime(r.totalTimeMs) : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{r.hintsUsedCount}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-3">
                      <button onClick={() => resetRun(r.id)} className="text-xs text-indigo-400 hover:text-indigo-300">
                        Reset
                      </button>
                      {r.status !== "invalid" && (
                        <button onClick={() => invalidateRun(r.id)} className="text-xs text-red-600 hover:text-red-400">
                          Invalidate
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
