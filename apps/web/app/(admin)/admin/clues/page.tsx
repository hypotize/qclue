"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

type Clue = {
  id: string;
  sequenceIndex: number;
  isFinal: boolean;
  token: string;
  answer: string | null;
  contents: Content[];
};

type Content = {
  id: string;
  language: string;
  level: string | null;
  clueText: string;
  hint1Text: string | null;
  hint2Text: string | null;
  approved: boolean;
};

function CluesContent() {
  const params = useSearchParams();
  const huntId = params.get("huntId");
  const [clues, setClues] = useState<Clue[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddContent, setShowAddContent] = useState<string | null>(null);
  const [contentForm, setContentForm] = useState({
    language: "en",
    level: "",
    clueText: "",
    hint1Text: "",
    hint2Text: "",
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [editingAnswer, setEditingAnswer] = useState<{ clueId: string; value: string } | null>(null);

  async function load() {
    if (!huntId) return;
    const res = await fetch(`/api/admin/hunts/${huntId}/clues`);
    const json = await res.json();
    if (json.data) setClues(json.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [huntId]);

  async function addClue() {
    if (!huntId) return;
    const nextIdx = clues.length + 1;
    const isFinal = window.confirm("Is this the final clue?");
    await fetch(`/api/admin/hunts/${huntId}/clues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequenceIndex: nextIdx, isFinal }),
    });
    load();
  }

  async function deleteClue(clueId: string) {
    if (!confirm("Delete this clue?")) return;
    await fetch(`/api/admin/clues/${clueId}`, { method: "DELETE" });
    load();
  }

  async function addContent(clueId: string) {
    setMsg(null);
    const res = await fetch(`/api/admin/clues/${clueId}/contents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...contentForm, level: contentForm.level || null }),
    });
    const json = await res.json();
    if (json.error) { setMsg(json.error.message); return; }
    setShowAddContent(null);
    setContentForm({ language: "en", level: "", clueText: "", hint1Text: "", hint2Text: "" });
    load();
  }

  async function approveContent(contentId: string) {
    await fetch(`/api/admin/clue-contents/${contentId}/approve`, { method: "POST" });
    load();
  }

  async function generateVariants(clueId: string) {
    const baseText = prompt("Enter base clue text:");
    if (!baseText) return;
    setAiLoading(true);
    setMsg(null);
    const res = await fetch(`/api/admin/clues/${clueId}/generate-variants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ baseText, language: "en" }),
    });
    const json = await res.json();
    setAiLoading(false);
    if (json.error) { setMsg(json.error.message); return; }
    setMsg(`Generated ${json.data.generated} level variants — pending approval.`);
    load();
  }

  async function saveAnswer(clueId: string, answer: string) {
    await fetch(`/api/admin/clues/${clueId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer }),
    });
    setEditingAnswer(null);
    load();
  }

  async function downloadQr(clueId: string, index: number) {
    const res = await fetch(`/api/admin/qr/clue/${clueId}/print`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clue-${index}-qr.png`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!huntId) {
    return (
      <div className="p-8 text-gray-500">
        Select a hunt from the{" "}
        <a href="/admin/hunts" className="text-indigo-400 hover:underline">Hunts</a> page first.
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Clues</h1>
        <button
          onClick={addClue}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors"
        >
          + Add Clue
        </button>
      </div>

      {msg && (
        <div className="bg-indigo-950 border border-indigo-800 text-indigo-300 rounded-lg px-4 py-3 text-sm mb-4">
          {msg}
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading…</p>
      ) : clues.length === 0 ? (
        <div className="text-center py-20 text-gray-600">
          <p className="text-4xl mb-3">📜</p>
          <p>No clues yet. Add your first clue!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clues.map((clue) => (
            <div key={clue.id} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <div
                className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-800 transition-colors"
                onClick={() => setExpanded(expanded === clue.id ? null : clue.id)}
              >
                <span className="text-lg font-bold text-gray-600 w-8">#{clue.sequenceIndex}</span>
                <div className="flex-1">
                  <p className="font-medium text-white">
                    Clue {clue.sequenceIndex}
                    {clue.isFinal && <span className="text-amber-400 text-xs font-semibold ml-2">FINAL</span>}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {clue.contents.length} content row{clue.contents.length !== 1 ? "s" : ""}
                    {clue.contents.some((c) => !c.approved) && (
                      <span className="ml-2 text-yellow-500">● pending approval</span>
                    )}
                  </p>
                  {clue.answer && (
                    <p className="text-xs mt-1">
                      <span className="text-gray-600">Answer: </span>
                      <span className="text-emerald-400 font-medium">{clue.answer}</span>
                    </p>
                  )}
                </div>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => downloadQr(clue.id, clue.sequenceIndex)}
                    className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-2 py-1 hover:border-gray-500 transition-colors"
                  >
                    QR PNG
                  </button>
                  <button
                    onClick={() => deleteClue(clue.id)}
                    className="text-xs text-red-600 hover:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {expanded === clue.id && (
                <div className="border-t border-gray-800 px-5 py-4 space-y-4">
                  {/* Answer — admin-only */}
                  <div className="bg-emerald-950 border border-emerald-800 rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wide mb-2">
                      Answer (admin only)
                    </p>
                    {editingAnswer?.clueId === clue.id ? (
                      <div className="flex gap-2">
                        <input
                          autoFocus
                          value={editingAnswer.value}
                          onChange={(e) => setEditingAnswer({ clueId: clue.id, value: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveAnswer(clue.id, editingAnswer.value);
                            if (e.key === "Escape") setEditingAnswer(null);
                          }}
                          className="flex-1 bg-gray-900 border border-emerald-700 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                          placeholder="e.g. Under the kitchen sink"
                        />
                        <button
                          onClick={() => saveAnswer(clue.id, editingAnswer.value)}
                          className="text-xs bg-emerald-700 hover:bg-emerald-600 text-white px-3 py-1.5 rounded transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingAnswer(null)}
                          className="text-xs text-gray-500 hover:text-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingAnswer({ clueId: clue.id, value: clue.answer ?? "" })}
                        className="w-full text-left group"
                      >
                        {clue.answer ? (
                          <span className="text-emerald-300 text-sm group-hover:text-emerald-200">
                            {clue.answer}
                            <span className="ml-2 text-xs text-emerald-700 group-hover:text-emerald-500">edit</span>
                          </span>
                        ) : (
                          <span className="text-emerald-700 text-sm group-hover:text-emerald-500 italic">
                            + Add answer…
                          </span>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {clue.contents.map((c) => (
                      <div key={c.id} className="bg-gray-800 rounded-lg p-3 text-sm space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-2 flex-wrap">
                            <span className="font-mono text-xs bg-gray-700 text-gray-300 px-1.5 py-0.5 rounded">{c.language}</span>
                            {c.level && <span className="font-mono text-xs bg-amber-900 text-amber-400 px-1.5 py-0.5 rounded">{c.level}</span>}
                            {!c.approved && (
                              <span className="font-mono text-xs bg-yellow-900 text-yellow-400 px-1.5 py-0.5 rounded">pending</span>
                            )}
                          </div>
                          {!c.approved && (
                            <button
                              onClick={() => approveContent(c.id)}
                              className="text-xs text-green-400 hover:text-green-300 font-medium shrink-0"
                            >
                              Approve
                            </button>
                          )}
                        </div>
                        <p className="text-gray-200">{c.clueText}</p>
                        {c.hint1Text && <p className="text-gray-500 text-xs">Hint 1: {c.hint1Text}</p>}
                        {c.hint2Text && <p className="text-gray-500 text-xs">Hint 2: {c.hint2Text}</p>}
                      </div>
                    ))}
                  </div>

                  {showAddContent === clue.id ? (
                    <div className="border border-gray-700 rounded-lg p-4 space-y-3 bg-gray-800">
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={contentForm.language}
                          onChange={(e) => setContentForm({ ...contentForm, language: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        >
                          {["en", "ja", "fr", "es", "zh_Hans", "zh_Hant"].map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                        <select
                          value={contentForm.level}
                          onChange={(e) => setContentForm({ ...contentForm, level: e.target.value })}
                          className="bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white"
                        >
                          <option value="">Shared (all levels)</option>
                          {["basic", "elementary", "senior_elementary", "junior_high", "senior_high", "adult"].map((l) => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>
                      <textarea
                        placeholder="Clue text *"
                        value={contentForm.clueText}
                        onChange={(e) => setContentForm({ ...contentForm, clueText: e.target.value })}
                        rows={3}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        placeholder="Hint 1 (optional)"
                        value={contentForm.hint1Text}
                        onChange={(e) => setContentForm({ ...contentForm, hint1Text: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                      <input
                        placeholder="Hint 2 (optional)"
                        value={contentForm.hint2Text}
                        onChange={(e) => setContentForm({ ...contentForm, hint2Text: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                      />
                      <div className="flex gap-3">
                        <button
                          onClick={() => addContent(clue.id)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Save
                        </button>
                        <button onClick={() => setShowAddContent(null)} className="text-gray-500 hover:text-gray-300 text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-4">
                      <button
                        onClick={() => setShowAddContent(clue.id)}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        + Add Content Row
                      </button>
                      <button
                        onClick={() => generateVariants(clue.id)}
                        disabled={aiLoading}
                        className="text-sm text-purple-400 hover:text-purple-300 disabled:opacity-40"
                      >
                        {aiLoading ? "Generating…" : "✦ AI: Generate Level Variants"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminCluesPage() {
  return (
    <Suspense>
      <CluesContent />
    </Suspense>
  );
}
