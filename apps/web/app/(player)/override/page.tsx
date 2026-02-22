"use client";

import { useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrowserQRCodeReader } from "@zxing/browser";

const LEVEL_LABELS: Record<string, string> = {
  basic: "Basic",
  elementary: "Elementary",
  senior_elementary: "Senior Elementary",
  junior_high: "Junior High",
  senior_high: "Senior High",
  adult: "Adult",
};

function useSession() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem("qclue_session") ?? "null") as {
      playerId: string;
      sessionToken: string;
      runId: string;
    } | null;
  } catch {
    return null;
  }
}

function OverrideContent() {
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get("runId");
  const session = useSession();
  const effectiveRunId = runId ?? session?.runId;
  const token = session?.sessionToken;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [availableLevels, setAvailableLevels] = useState<string[] | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function startScan() {
    setError(null);
    setScanning(true);
    try {
      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current!);
      await submitCredential(result.getText());
    } catch (e: any) {
      if (!e?.message?.includes("aborted")) {
        setError("Camera error or no QR found. Please try again.");
      }
    } finally {
      setScanning(false);
    }
  }

  async function submitCredential(adminToken: string) {
    if (!effectiveRunId || !token) return;
    const res = await fetch(`/api/runs/${effectiveRunId}/override`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ adminCredentialToken: adminToken }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error.message);
      return;
    }
    setAvailableLevels(json.data.availableLevels);
  }

  async function saveLevel() {
    if (!selectedLevel || !effectiveRunId || !token) return;
    const res = await fetch(`/api/runs/${effectiveRunId}/level`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ level: selectedLevel }),
    });
    const json = await res.json();
    if (json.error) {
      setError(json.error.message);
      return;
    }
    setSaved(true);
    setTimeout(() => router.push(`/confirm?level=${selectedLevel}&runId=${effectiveRunId}&name=&age=&language=en`), 1500);
  }

  if (saved) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50 p-6">
        <div className="text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-lg font-semibold text-amber-900">Level updated!</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <button onClick={() => router.back()} className="text-amber-600 text-sm mb-6 underline">
          ← Back
        </button>

        <h1 className="text-2xl font-bold text-amber-900 mb-2">Level Override</h1>
        <p className="text-gray-600 text-sm mb-6">
          Ask the clue master to scan the Admin Credential QR using your phone.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
            {error}
          </div>
        )}

        {!availableLevels ? (
          <div className="space-y-3">
            {scanning ? (
              <>
                <video ref={videoRef} className="w-full rounded-xl aspect-square object-cover bg-black" />
                <button
                  onClick={() => setScanning(false)}
                  className="w-full bg-gray-200 text-gray-700 rounded-lg py-3 font-medium"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={startScan}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg py-4 text-lg transition-colors"
              >
                Scan Admin QR 📷
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm font-medium text-gray-700">Select your new level:</p>
            <div className="space-y-2">
              {availableLevels.map((l) => (
                <button
                  key={l}
                  onClick={() => setSelectedLevel(l)}
                  className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${
                    selectedLevel === l
                      ? "border-amber-500 bg-amber-50 text-amber-900 font-semibold"
                      : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {LEVEL_LABELS[l] ?? l}
                </button>
              ))}
            </div>
            <button
              onClick={saveLevel}
              disabled={!selectedLevel}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-semibold rounded-lg py-3 transition-colors"
            >
              Confirm Level
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export default function OverridePage() {
  return (
    <Suspense>
      <OverrideContent />
    </Suspense>
  );
}
