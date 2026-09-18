import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { NavLink } from "@/components/nav-link";
import { AuthorNameField } from "@/components/author-name";

export const metadata: Metadata = {
  title: "Requirements",
  description: "Manage personas, functional requirements and acceptance criteria",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/requirements", label: "Requirements" },
  { href: "/personas", label: "Personas" },
  { href: "/categories", label: "Categories" },
  { href: "/questions", label: "Questions" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-full">
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-3">
              <Link href="/" className="text-sm font-semibold tracking-tight text-slate-900">
                Requirements
              </Link>
              <nav className="flex flex-1 flex-wrap items-center gap-1">
                {NAV.map((item) => (
                  <NavLink key={item.href} href={item.href}>
                    {item.label}
                  </NavLink>
                ))}
              </nav>
              <AuthorNameField />
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
