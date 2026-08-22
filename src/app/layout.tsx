import type { Metadata } from "next";
import "./globals.css";
import SupportChatWidget from "./support-chat-widget";

export const metadata: Metadata = {
  title: "İtemBazar",
  description: "Rəqəmsal məhsullar üçün etibarlı bazar",
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
