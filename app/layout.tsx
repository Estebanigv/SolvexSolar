import {AppInstallProvider} from "./install-app";
import type { Metadata } from "next";
import "./globals.css";
import "./workspace.css";
import "./responsive.css";
import "./quote-flow.css";
import "./bill-reader.css";
import "./auth.css";
import "./install-app.css";
import "./commercial.css";
import "./quote-history.css";
import "./members.css";
import "./activity.css";
import "./clients.css";
import "./management-dashboard.css";
import "./workspace-status.css";
import "./cne-reference.css";

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
    apple: "/app-icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased"><AppInstallProvider>{children}</AppInstallProvider></body>
    </html>
  );
}
