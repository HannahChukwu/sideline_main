import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sideline Studio — AI Athletics Marketing",
  description: "AI-powered game day poster and final score asset generator for athletic programs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
