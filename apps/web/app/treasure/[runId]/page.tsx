import { prisma } from "@/lib/prisma";

export default async function TreasurePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;

  const run = await prisma.run.findUnique({
    where: { id: runId },
    include: { hunt: { select: { finalTreasureYoutubeId: true, name: true } } },
  });

  const youtubeId = run?.hunt?.finalTreasureYoutubeId ?? null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-amber-50 px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="text-5xl mb-4">🎊</div>
        <h1 className="text-3xl font-bold text-amber-900 mb-2">Final Treasure!</h1>
        <p className="text-amber-700 mb-8 text-lg">
          Congratulations. You&apos;ve reached the final treasure. Please see the clue master for your prize.
        </p>

        {youtubeId && (
          <div className="rounded-2xl overflow-hidden shadow-lg mb-8 aspect-video bg-black">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title="Congratulations video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <a
          href="/leaderboards"
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg px-6 py-3 transition-colors"
        >
          View Leaderboard
        </a>
      </div>
    </main>
  );
}
