import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CmsProvider } from "./components/CmsProvider";
import "./globals.css";
import "./overrides.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = {
  title: { default: "AllegoryNow", template: "%s | AllegoryNow" },
  description: "An evidence-based civic inquiry into New York Family Court and reform.",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}><CmsProvider>{children}</CmsProvider></body>
    </html>
  );
}
