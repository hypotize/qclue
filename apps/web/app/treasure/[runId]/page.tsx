// P9 — Final Treasure Page
export default async function TreasurePage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  return (
    <main>
      <p>Congratulations. You&apos;ve reached the final treasure. Please see the clue master for your prize.</p>
    </main>
  );
}
