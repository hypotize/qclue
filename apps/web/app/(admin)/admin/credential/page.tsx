"use client";

import { useEffect, useState } from "react";

export default function AdminCredentialPage() {
  const [qrData, setQrData] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rotating, setRotating] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/credential");
    const json = await res.json();
    if (json.data) { setQrData(json.data.qrData); setIsNew(json.data.isNew); }
    setLoading(false);
  }

  async function rotate() {
    if (!confirm("Rotate the admin credential? The old QR code will be immediately invalidated.")) return;
    setRotating(true);
    const res = await fetch("/api/admin/credential/rotate", { method: "POST" });
    const json = await res.json();
    if (json.data) { setQrData(json.data.qrData); setIsNew(true); }
    setRotating(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold text-white mb-2">Admin Credential QR</h1>
      <p className="text-gray-500 text-sm mb-6">
        This token grants a one-time level override for any player. Keep it secret — never share as plain text.
      </p>

      {loading ? (
        <p className="text-gray-500 animate-pulse">Loading…</p>
      ) : qrData ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          {isNew && (
            <div className="bg-yellow-950 border border-yellow-800 text-yellow-400 rounded-lg px-4 py-3 text-sm">
              ⚠️ This token is shown only once. Copy or print it now.
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Token</p>
            <div className="bg-gray-800 rounded-lg p-3 font-mono text-xs text-gray-300 break-all select-all border border-gray-700">
              {qrData}
            </div>
          </div>
          <p className="text-xs text-gray-600">
            Generate a QR code from this token using any QR generator and print it at 2 cm × 2 cm.
          </p>
          <button
            onClick={rotate}
            disabled={rotating}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-medium text-sm rounded-lg px-4 py-2 transition-colors"
          >
            {rotating ? "Rotating…" : "Rotate Credential — Invalidates Old QR"}
          </button>
        </div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
          <p className="text-gray-400 text-sm">A credential exists. Rotate it to reveal a new token.</p>
          <button
            onClick={rotate}
            disabled={rotating}
            className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white font-medium text-sm rounded-lg px-4 py-2 transition-colors"
          >
            {rotating ? "Rotating…" : "Rotate Credential"}
          </button>
        </div>
      )}
    </div>
  );
}
