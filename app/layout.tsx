import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource/courier-prime/latin-400.css";
import "@fontsource/courier-prime/latin-700.css";
import "@fontsource/special-elite/latin-400.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Forensicology — Forensic escape rooms", template: "%s · Forensicology" },
  description: "Solve fictional crimes by examining evidence and cracking forensic puzzles. Play the first case free.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e9e0cc" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0f13" },
  ],
};

// Runs before paint so the saved theme doesn't flash.
const themeScript = `try{var t=localStorage.getItem("fx-theme");if(t!=="manila"&&t!=="lab"){t=matchMedia("(prefers-color-scheme: dark)").matches?"lab":"manila"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="lab"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <a href="#main" className="sr-only-focusable fixed top-2 left-2 z-50 rounded bg-surface px-3 py-2 text-ink">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
