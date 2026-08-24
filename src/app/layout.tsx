import type { Metadata } from "next";
import "./globals.css";
import SupportChatWidget from "./support-chat-widget";

export const metadata: Metadata = {
  metadataBase: new URL("https://itembazar.online"),
  title: {
    default: "İtemBazar — Onlayn Bazar, Alış-Satış, Elanlar",
    template: "%s | İtemBazar",
  },
  description: "İtemBazar — Azərbaycanda rəqəmsal məhsulların (oyun hesabları, gift kartlar, sosial media xidmətləri) təhlükəsiz alış-satış bazarı. Elan yerləşdir, ödənişini qorunmada saxla, güvənli ticarət et.",
  keywords: ["bazar", "satış", "alış", "elanlar", "onlayn bazar", "itembazar", "oyun hesabı satışı", "gift kart", "Azərbaycan bazar", "elan yerləşdir"],
  openGraph: {
    title: "İtemBazar — Onlayn Bazar, Alış-Satış, Elanlar",
    description: "Rəqəmsal məhsulların təhlükəsiz P2P bazarı. Ödənişiniz siz təsdiqləyənə qədər qorunur.",
    url: "https://itembazar.online",
    siteName: "İtemBazar",
    locale: "az_AZ",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="az" className="h-full antialiased">
      <body className="min-h-full">
        {children}
        <SupportChatWidget />
      </body>
    </html>
  );
}
