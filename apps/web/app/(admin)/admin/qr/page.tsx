import Link from "next/link";

export default function AdminQrPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-4">QR Codes</h1>
      <p className="text-gray-500 mb-2">
        Download QR codes per clue from the{" "}
        <Link href="/admin/clues" className="text-indigo-400 hover:underline">Clues</Link>{" "}
        page — expand a clue and click <span className="text-gray-300 font-medium">QR PNG</span>.
      </p>
      <p className="text-gray-500 text-sm">
        The admin override credential QR is on the{" "}
        <Link href="/admin/credential" className="text-indigo-400 hover:underline">Admin QR</Link> page.
      </p>
    </div>
  );
}
