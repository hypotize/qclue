import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const [huntCount, playerCount, activeRunCount, finishedToday] = await Promise.all([
    prisma.hunt.count(),
    prisma.player.count(),
    prisma.run.count({ where: { status: "active" } }),
    prisma.run.count({
      where: {
        status: "finished",
        finishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
  ]);

  const recentRuns = await prisma.run.findMany({
    where: { status: "finished" },
    orderBy: { finishedAt: "desc" },
    take: 5,
    include: { player: { select: { name: true } }, hunt: { select: { name: true } } },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Hunts" value={huntCount} icon="🗺️" href="/admin/hunts" />
        <StatCard label="Players" value={playerCount} icon="👥" href="/admin/players" />
        <StatCard label="Active Runs" value={activeRunCount} icon="⏱️" href="/admin/runs" />
        <StatCard label="Finished Today" value={finishedToday} icon="🏆" href="/admin/runs" />
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <h2 className="text-base font-semibold text-white mb-4">Recent Completions</h2>
        {recentRuns.length === 0 ? (
          <p className="text-gray-500 text-sm">No completions yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-800">
                <th className="pb-2 font-medium">Player</th>
                <th className="pb-2 font-medium">Hunt</th>
                <th className="pb-2 font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentRuns.map((r) => (
                <tr key={r.id}>
                  <td className="py-2.5 text-gray-200">{r.player.name}</td>
                  <td className="py-2.5 text-gray-500">{r.hunt.name}</td>
                  <td className="py-2.5 font-mono text-gray-300">
                    {r.totalTimeMs !== null ? formatTime(Number(r.totalTimeMs)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, href }: { label: string; value: number; icon: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors"
    >
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </Link>
  );
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${(m % 60).toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
