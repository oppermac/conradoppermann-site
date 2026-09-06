import type { Metadata } from "next";
import { proximaNova } from "../fonts";
import "./site.css";

export const metadata: Metadata = {
  title: "Conrad Oppermann",
  metadataBase: new URL("https://conradoppermann.com"),
  openGraph: {
    title: "Conrad Oppermann",
    url: "https://conradoppermann.com",
    siteName: "Conrad Oppermann",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${proximaNova.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
