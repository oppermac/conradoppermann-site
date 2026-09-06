import type { Metadata, Viewport } from "next";
import "./hub.css";
import { ServiceWorkerRegistrar } from "./hub/components/ServiceWorkerRegistrar";

export const metadata: Metadata = {
  title: { default: "Hub", template: "%s · Hub" },
  applicationName: "Conrad Hub",
  description: "Conrad's private hub.",
  manifest: "/hub/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Hub" },
  icons: {
    icon: "/hub/icons/icon-192.png",
    apple: "/hub/icons/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function HubRootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
