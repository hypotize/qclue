import Link from "next/link";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "🏠" },
  { href: "/admin/hunts", label: "Hunts", icon: "🗺️" },
  { href: "/admin/clues", label: "Clues", icon: "📜" },
  { href: "/admin/players", label: "Players", icon: "👥" },
  { href: "/admin/runs", label: "Runs", icon: "⏱️" },
  { href: "/admin/credential", label: "Admin QR", icon: "🔑" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gray-950">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen shrink-0">
        <div className="px-5 py-5 border-b border-gray-800">
          <p className="text-white font-bold text-lg">QClue Admin</p>
          <p className="text-gray-500 text-xs mt-0.5">Clue Master Console</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white text-sm transition-colors"
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="px-3 py-4 border-t border-gray-800">
          <form action="/api/admin/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full text-left text-gray-500 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
