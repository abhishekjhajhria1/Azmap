import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
