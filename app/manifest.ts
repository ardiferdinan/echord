import type { MetadataRoute } from "next";

/** "Add to Home Screen": opens without the browser bars (the way to go full screen on iPhone, and on iPad too). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Echord",
    short_name: "Echord",
    description: "Perpustakaan chord lagu rohani pribadi.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
