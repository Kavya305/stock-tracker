import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import ProfileSwitcher from "./components/ProfileSwitcher";
import AlertsNav from "./components/AlertsNav";
import { auth, signOut } from "@/auth";

export const metadata: Metadata = {
  title: "Stock Tracker",
  description: "Universal stock list, watchlists, portfolios & reports",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        {session && (
          <nav className="border-b border-gray-800 bg-gray-900/80 sticky top-0 z-10 backdrop-blur">
            <div className="mx-auto max-w-7xl px-4 flex items-center gap-6 h-14">
              <span className="font-bold text-emerald-400">📈 Stock Tracker</span>
              <Link href="/" className="text-sm hover:text-emerald-400">Stocks</Link>
              <Link href="/watchlists" className="text-sm hover:text-emerald-400">Watchlists</Link>
              <Link href="/portfolios" className="text-sm hover:text-emerald-400">Portfolios</Link>
              <AlertsNav />
              <ProfileSwitcher />
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 hidden sm:inline">
                  {session.user?.email}
                </span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/signin" });
                  }}
                >
                  <button className="text-xs rounded bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5">
                    Sign out
                  </button>
                </form>
              </div>
            </div>
          </nav>
        )}
        <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
