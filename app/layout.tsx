import type { Metadata } from "next";
import "./globals.css";
import "./auto.css";
import "./manage.css";

export const metadata: Metadata = { title: "Tavern Deck | Hearthstone Deck Tracker", description: "Automatically track cards remaining in your Hearthstone deck" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body>{children}</body></html>;
}
