"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Hunt = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  timezone: string;
  clueCount: number;
  runCount: number;
  createdAt: string;
};

export default function AdminHuntsPage() {
  const [hunts, setHunts] = useState<Hunt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    isActive: false,
    timezone: "UTC",
    finalTreasureYoutubeId: "",
    fallbackLanguage: "en",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/hunts");
    const json = await res.json();
    if (json.data) setHunts(json.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createHunt() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/hunts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSaving(false);
    if (json.error) { setError(json.error.message); return; }
    setShowForm(false);
    setForm({ name: "", description: "", isActive: false, timezone: "UTC", finalTreasureYoutubeId: "", fallbackLanguage: "en" });
    load();
  }

  async function toggleActive(hunt: Hunt) {
    await fetch(`/api/admin/hunts/${hunt.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !hunt.isActive }),
    });
    load();
  }

  async function deleteHunt(id: string) {
    if (!confirm("Delete this hunt? This cannot be undone.")) return;
    await fetch(`/api/admin/hunts/${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Hunts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          + New Hunt
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-white">New Hunt</h2>
          <input
            placeholder="Hunt name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            placeholder="YouTube Video ID (e.g. dQw4w9WgXcQ) *"
            value={form.finalTreasureYoutubeId}
            onChange={(e) => setForm({ ...form, finalTreasureYoutubeId: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <input
            placeholder="Timezone (e.g. America/New_York)"
            value={form.timezone}
            onChange={(e) => setForm({ ...form, timezone: e.target.value })}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="accent-indigo-500"
            />
            Set as active hunt
          </label>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={createHunt}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
            >
              {saving ? "Saving…" : "Create Hunt"}
            </button>
            <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300 text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading…</p>
      ) : hunts.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">🗺️</p>
          <p>No hunts yet. Create your first hunt!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {hunts.map((h) => (
            <div key={h.id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center gap-4 hover:border-gray-700 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white">{h.name}</p>
                  {h.isActive && (
                    <span className="bg-green-900 text-green-400 text-xs font-medium px-2 py-0.5 rounded-full">
                      Active
                    </span>
                  )}
                </div>
                {h.description && <p className="text-sm text-gray-500 truncate mt-0.5">{h.description}</p>}
                <p className="text-xs text-gray-600 mt-1">
                  {h.clueCount} clue{h.clueCount !== 1 ? "s" : ""} · {h.runCount} run{h.runCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={`/admin/clues?huntId=${h.id}`}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  Clues →
                </Link>
                <button
                  onClick={() => toggleActive(h)}
                  className="text-sm text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-1 hover:border-gray-500 transition-colors"
                >
                  {h.isActive ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => deleteHunt(h.id)}
                  className="text-sm text-red-600 hover:text-red-400"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
