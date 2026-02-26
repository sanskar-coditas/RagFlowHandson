import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RAG Educational Demo | Coditas",
  description: "Step-by-step RAG pipeline demonstration with Coditas theme",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
