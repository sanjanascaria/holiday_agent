import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pickl — good trips start here",
  description: "Your people. Your plans. One happy place.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
