import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Market Pulse",
  description: "Indicatori di attenzione mediatica su crypto e mercati tradizionali",
};

// Niente webfont caricato (Geist rimosso): system-ui eredita il font
// nativo della piattaforma (San Francisco su Apple, Segoe UI su Windows,
// Roboto su Android) — vedi Design-Apple/il-valore-system-ui-di-font-family...
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
