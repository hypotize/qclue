"use client";

import { useEffect, useState } from "react";

type LevelMapping = { id: string; level: string; minAge: number; maxAge: number | null };

const LEVELS = ["basic", "elementary", "senior_elementary", "junior_high", "senior_high", "adult"] as const;
const LEVEL_LABELS: Record<string, string> = {
  basic: "Basic",
  elementary: "Elementary",
  senior_elementary: "Senior Elementary",
  junior_high: "Junior High",
  senior_high: "Senior High",
  adult: "Adult",
};

export default function AdminSettingsPage() {
  const [mappings, setMappings] = useState<LevelMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/admin/config/level-mapping");
    const json = await res.json();
    if (json.data) setMappings(json.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function update(level: string, field: "minAge" | "maxAge", value: string) {
    setMappings((prev) =>
      prev.map((m) =>
        m.level === level
          ? { ...m, [field]: value === "" ? null : parseInt(value, 10) }
          : m
      )
    );
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/admin/config/level-mapping", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mappings.map((m) => ({ level: m.level, minAge: m.minAge, maxAge: m.maxAge }))),
    });
    const json = await res.json();
    setSaving(false);
    setMsg(json.error ? `Error: ${json.error.message}` : "Saved.");
    if (!json.error) load();
  }

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
      <p className="text-gray-500 text-sm mb-6">Age → difficulty level assignment.</p>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading…</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <h2 className="font-semibold text-white text-sm">Age Ranges</h2>

          {LEVELS.map((level) => {
            const m = mappings.find((x) => x.level === level);
            return (
              <div key={level} className="flex items-center gap-3">
                <span className="w-40 text-sm text-gray-300">{LEVEL_LABELS[level]}</span>
                <input
                  type="number"
                  value={m?.minAge ?? ""}
                  placeholder="Min"
                  onChange={(e) => {
                    if (!m) {
                      setMappings((prev) => [...prev, { id: "", level, minAge: parseInt(e.target.value) || 0, maxAge: null }]);
                    } else {
                      update(level, "minAge", e.target.value);
                    }
                  }}
                  className="w-16 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                />
                <span className="text-gray-600 text-sm">–</span>
                <input
                  type="number"
                  value={m?.maxAge ?? ""}
                  placeholder="Max (∞)"
                  onChange={(e) => m && update(level, "maxAge", e.target.value)}
                  className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-sm text-white text-center focus:outline-none focus:border-indigo-500"
                />
              </div>
            );
          })}

          {msg && (
            <p className={`text-sm ${msg.startsWith("Error") ? "text-red-400" : "text-green-400"}`}>{msg}</p>
          )}

          <button
            onClick={save}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-lg px-4 py-2 transition-colors"
          >
            {saving ? "Saving…" : "Save Mappings"}
          </button>
        </div>
      )}
    </div>
  );
}
