import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "agent-pipeline · fleet dashboard",
  description: "Remote convoy analytics across pipeline consumer repos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
