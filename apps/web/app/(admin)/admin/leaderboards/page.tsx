import Link from "next/link";

export default function AdminLeaderboardsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-4">Leaderboards</h1>
      <p className="text-gray-500 mb-6">View the public leaderboard for any hunt.</p>
      <Link
        href="/leaderboards"
        target="_blank"
        className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg px-5 py-3 text-sm transition-colors"
      >
        Open Leaderboard →
      </Link>
    </div>
  );
}
