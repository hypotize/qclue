"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BrowserQRCodeReader } from "@zxing/browser";

type ClueData = {
  runId: string;
  huntId: string;
  clueIndex: number;
  totalClues: number;
  isFinal: boolean;
  clue: { id: string; text: string | null; imageUrl: string | null };
  hints: {
    hint1: { available: boolean; availableAt: string; text: string | null };
    hint2: { available: boolean; availableAt: string; text: string | null };
  };
  clueViewedAt: string;
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

function countdown(targetIso: string): string {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms <= 0) return "0:00";
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function ClueContent() {
  const router = useRouter();
  const params = useSearchParams();
  const runId = params.get("runId");

  const session = useSession();
  const [clue, setClue] = useState<ClueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const [hint1Text, setHint1Text] = useState<string | null>(null);
  const [hint2Text, setHint2Text] = useState<string | null>(null);
  const [hintError, setHintError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);

  const effectiveRunId = runId ?? session?.runId;
  const token = session?.sessionToken;

  const fetchClue = useCallback(async () => {
    if (!effectiveRunId || !token) return;
    try {
      const res = await fetch(`/api/runs/${effectiveRunId}/current`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.error) {
        setError(json.error.message);
        return;
      }
      const data: ClueData = json.data;
      setClue(data);
      // Restore already-revealed hints
      if (data.hints.hint1.text) setHint1Text(data.hints.hint1.text);
      if (data.hints.hint2.text) setHint2Text(data.hints.hint2.text);
    } catch {
      setError("Connection error — please try again.");
    }
  }, [effectiveRunId, token]);

  useEffect(() => {
    fetchClue();
  }, [fetchClue]);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  async function revealHint(hintNumber: 1 | 2) {
    if (!effectiveRunId || !token) return;
    setHintError(null);
    try {
      const res = await fetch(`/api/runs/${effectiveRunId}/hint`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ hintNumber }),
      });
      const json = await res.json();
      if (json.error) {
        setHintError(json.error.message);
        return;
      }
      if (hintNumber === 1) setHint1Text(json.data.text);
      else setHint2Text(json.data.text);
    } catch {
      setHintError("Connection error.");
    }
  }

  async function startScan() {
    setScanning(true);
    setScanMsg(null);
    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;
      const result = await reader.decodeOnceFromVideoDevice(undefined, videoRef.current!);
      await submitToken(result.getText());
    } catch (e: any) {
      if (e?.message?.includes("No MultiFormat")) {
        setScanMsg("Could not read QR code. Please try again.");
      } else if (!e?.message?.includes("aborted")) {
        setScanMsg("Camera error. Please allow camera access.");
      }
    } finally {
      setScanning(false);
    }
  }

  function stopScan() {
    setScanning(false);
  }

  async function submitToken(qrToken: string) {
    if (!effectiveRunId || !token) return;
    try {
      const res = await fetch(`/api/runs/${effectiveRunId}/scan`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ token: qrToken }),
      });
      const json = await res.json();
      if (json.error) {
        setScanMsg(json.error.message);
        return;
      }
      const { result } = json.data;
      if (result === "finished") {
        router.push(`/complete?runId=${effectiveRunId}&totalTimeMs=${json.data.totalTimeMs}&treasureUrl=${encodeURIComponent(json.data.treasureUrl)}`);
      } else if (result === "advanced") {
        setScanMsg(null);
        fetchClue();
      } else {
        setScanMsg(json.data.message ?? "Incorrect QR.");
      }
    } catch {
      setScanMsg("Connection error — please try again.");
    }
  }

  if (!session && !runId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50 p-6">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No active session found.</p>
          <a href="/" className="text-amber-600 underline">Register to play</a>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50 p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={fetchClue} className="text-amber-600 underline">Retry</button>
        </div>
      </main>
    );
  }

  if (!clue) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-amber-600 text-lg animate-pulse">Loading clue…</div>
      </main>
    );
  }

  const h1Available = clue.hints.hint1.available || Date.now() >= new Date(clue.hints.hint1.availableAt).getTime();
  const h2Available = clue.hints.hint2.available || Date.now() >= new Date(clue.hints.hint2.availableAt).getTime();

  return (
    <main className="min-h-screen bg-amber-50 flex flex-col">
      {/* Header */}
      <header className="bg-amber-500 text-white px-6 py-4 flex justify-between items-center">
        <div>
          <p className="text-xs opacity-80">Clue</p>
          <p className="text-2xl font-bold">{clue.clueIndex} / {clue.totalClues}</p>
        </div>
        <button
          onClick={() => router.push("/leaderboards")}
          className="text-xs opacity-80 hover:opacity-100 underline"
        >
          Leaderboard
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        {/* Clue text */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">
            {clue.isFinal ? "Final Clue ⭐" : "Find the next QR code"}
          </p>
          <p className="text-gray-800 text-lg leading-relaxed">
            {clue.clue.text ?? "No clue content available for your language."}
          </p>
          {clue.clue.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clue.clue.imageUrl} alt="Clue" className="mt-4 rounded-lg w-full object-contain max-h-48" />
          )}
        </div>

        {/* Hints */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hints</p>

          <HintCard
            label="Hint 1"
            available={h1Available}
            availableAt={clue.hints.hint1.availableAt}
            text={hint1Text}
            onReveal={() => revealHint(1)}
            tick={tick}
          />
          <HintCard
            label="Hint 2"
            available={h2Available}
            availableAt={clue.hints.hint2.availableAt}
            text={hint2Text}
            onReveal={() => revealHint(2)}
            tick={tick}
          />
          {hintError && <p className="text-red-600 text-sm">{hintError}</p>}
        </div>

        {/* Admin override link */}
        <div className="text-center">
          <button
            onClick={() => router.push(`/override?runId=${effectiveRunId}`)}
            className="text-xs text-amber-600 underline"
          >
            Request Level Override
          </button>
        </div>
      </div>

      {/* Scan area */}
      <div className="px-6 pb-8 pt-4 bg-white border-t border-gray-100">
        {scanMsg && (
          <div className="mb-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm text-center">
            {scanMsg}
          </div>
        )}
        {scanning ? (
          <div className="space-y-3">
            <video ref={videoRef} className="w-full rounded-xl aspect-square object-cover bg-black" />
            <button
              onClick={stopScan}
              className="w-full bg-gray-200 text-gray-700 rounded-lg py-3 font-medium"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={startScan}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg py-4 text-lg transition-colors"
          >
            Scan QR Code 📷
          </button>
        )}
      </div>
    </main>
  );
}

function HintCard({
  label,
  available,
  availableAt,
  text,
  onReveal,
  tick,
}: {
  label: string;
  available: boolean;
  availableAt: string;
  text: string | null;
  onReveal: () => void;
  tick: number;
}) {
  if (text) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <p className="text-xs font-semibold text-amber-600 mb-1">{label}</p>
        <p className="text-gray-800 text-sm">{text}</p>
      </div>
    );
  }

  if (!available) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 flex justify-between items-center">
        <p className="text-xs font-semibold text-gray-400">{label}</p>
        <p className="text-xs text-gray-400">Available in {countdown(availableAt)}</p>
      </div>
    );
  }

  return (
    <button
      onClick={onReveal}
      className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-left hover:bg-amber-50 transition-colors"
    >
      <p className="text-xs font-semibold text-amber-600">{label}</p>
      <p className="text-sm text-amber-700 mt-0.5">Tap to reveal hint →</p>
    </button>
  );
}

export default function CluePage() {
  return (
    <Suspense>
      <ClueContent />
    </Suspense>
  );
}
