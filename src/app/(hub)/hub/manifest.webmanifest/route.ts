export const dynamic = "force-static";

export function GET() {
  const manifest = {
    id: "/hub",
    name: "Conrad Hub",
    short_name: "Hub",
    description: "Conrad's private hub.",
    start_url: "/hub",
    scope: "/hub/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/hub/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/hub/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/hub/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
  return new Response(JSON.stringify(manifest), {
    headers: { "content-type": "application/manifest+json", "cache-control": "public, max-age=3600" },
  });
}
