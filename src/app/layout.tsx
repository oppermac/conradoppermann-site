import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const display = Montserrat({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Conrad Oppermann",
  metadataBase: new URL("https://www.conradoppermann.com"),
  openGraph: {
    title: "Conrad Oppermann",
    url: "https://www.conradoppermann.com",
    siteName: "Conrad Oppermann",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${display.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
