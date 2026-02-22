"use client";

import { useEffect, useState } from "react";

type Player = {
  id: string;
  name: string;
  age: number;
  preferredLanguage: string;
  assignedLevel: string;
  createdAt: string;
  latestRun: { id: string; status: string; currentClueIndex: number; huntId: string } | null;
};

const LEVEL_LABELS: Record<string, string> = {
  basic: "Basic",
  elementary: "Elementary",
  senior_elementary: "Sr. Elem.",
  junior_high: "Jr. High",
  senior_high: "Sr. High",
  adult: "Adult",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900 text-green-400",
  finished: "bg-blue-900 text-blue-400",
  abandoned: "bg-gray-800 text-gray-500",
  invalid: "bg-red-900 text-red-400",
};

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetch("/api/admin/players")
      .then((r) => r.json())
      .then((json) => {
        if (json.data) { setPlayers(json.data.players); setTotal(json.data.total); }
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Players</h1>
        <p className="text-sm text-gray-500">{total} total</p>
      </div>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading…</p>
      ) : players.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">👥</p>
          <p>No players yet.</p>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr>
                {["Name", "Age", "Level", "Lang", "Run Status", "Step"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {players.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-200">{p.name}</td>
                  <td className="px-4 py-3 text-gray-400">{p.age}</td>
                  <td className="px-4 py-3 text-gray-400">{LEVEL_LABELS[p.assignedLevel] ?? p.assignedLevel}</td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.preferredLanguage}</td>
                  <td className="px-4 py-3">
                    {p.latestRun ? (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[p.latestRun.status] ?? "bg-gray-800 text-gray-500"}`}>
                        {p.latestRun.status}
                      </span>
                    ) : (
                      <span className="text-gray-700 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {p.latestRun?.status === "active" ? `#${p.latestRun.currentClueIndex}` : "—"}
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
