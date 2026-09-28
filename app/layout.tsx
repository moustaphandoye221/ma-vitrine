import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ma Vitrine — votre boutique catalogue",
  description: "Créez votre boutique personnelle, présentez vos produits et partagez vos liens de paiement.",
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
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
