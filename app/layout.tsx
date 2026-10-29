import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pickl — your last resort",
  description: "Your people. Your plans. One happy place.",
  icons: {
    icon: { url: "/gigi.png", type: "image/png" },
    shortcut: "/gigi.png",
    apple: "/gigi.png",
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
