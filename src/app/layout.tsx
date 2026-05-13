import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const proximaNova = localFont({
  src: [
    {
      path: "../../public/fonts/Proxima-Nova-Thin.otf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../../public/fonts/Proxima-Nova-Alt-Light.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/Proxima-Nova-Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../../public/fonts/Proxima-Nova-Extrabold.otf",
      weight: "800",
      style: "normal",
    },
    {
      path: "../../public/fonts/Proxima-Nova-Black.otf",
      weight: "900",
      style: "normal",
    },
  ],
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
    <html lang="en" className={`dark ${proximaNova.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
