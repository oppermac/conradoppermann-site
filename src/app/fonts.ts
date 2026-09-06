import localFont from "next/font/local";

/**
 * Proxima Nova, self-hosted. Used by the landing page (as the --font-sans variable)
 * and by the hub only for the "CONRAD" wordmark (via className).
 */
export const proximaNova = localFont({
  src: [
    { path: "../../public/fonts/Proxima-Nova-Thin.otf", weight: "100", style: "normal" },
    { path: "../../public/fonts/Proxima-Nova-Alt-Light.otf", weight: "300", style: "normal" },
    { path: "../../public/fonts/Proxima-Nova-Bold.otf", weight: "700", style: "normal" },
    { path: "../../public/fonts/Proxima-Nova-Extrabold.otf", weight: "800", style: "normal" },
    { path: "../../public/fonts/Proxima-Nova-Black.otf", weight: "900", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});
