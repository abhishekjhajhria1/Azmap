import { ThemeProvider } from "@abh/ui/lite";
import type { Metadata } from "next";
import "./globals.css";

// Set the theme before first paint so there's no flash of the wrong theme.
const noFlash = `(function(){try{var t=localStorage.getItem('abh.theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export const metadata: Metadata = {
  title: "ABH — everything you learn, on one map that grows with you",
  description:
    "Name anything you want to learn and get a real path through it. Your progress becomes a living map, not a pile of forgotten notes — and the people who matter can see how far you've actually come.",
  keywords: [
    "learning",
    "roadmap",
    "knowledge map",
    "second brain",
    "spaced learning",
    "mind map",
  ],
  openGraph: {
    title: "ABH — everything you learn, on one map that grows with you",
    description:
      "One living map of everything you know. AI proposes, you accept. Your data never leaves your device.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
      </head>
      <body>
        <ThemeProvider>
          <div className="abh-ambient" aria-hidden />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
