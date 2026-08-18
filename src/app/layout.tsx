import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bazar",
  description: "Rəqəmsal məhsullar üçün etibarlı bazar",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="az" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
