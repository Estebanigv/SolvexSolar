import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";
import "./responsive.css";
import "./quote-flow.css";
import "./bill-reader.css";
import "./auth.css";

export const metadata: Metadata = {
  title: "Solvex Solar | Cotizador",
  description: "Cotizaciones de proyectos fotovoltaicos de Solvex Solar.",
  manifest: "/manifest.webmanifest",
  other: {
    "codex-preview": "development",
  },
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
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
