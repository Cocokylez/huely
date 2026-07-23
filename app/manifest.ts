import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Huely — Paint It for Real",
    short_name: "Huely",
    description:
      "Turn any photo into an oil-paint reference, exact palette, paint-by-numbers guide, and real-paint mixing recipes.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone"],
    orientation: "any",
    background_color: "#f4efe6",
    theme_color: "#c65d3b",
    categories: ["art", "education", "utilities"],
    icons: [
      {
        src: "/pwa/icon?size=192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon?size=512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon?size=512&maskable=1",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "New painting reference",
        short_name: "New photo",
        description: "Choose or photograph a new painting reference.",
        url: "/create",
        icons: [{ src: "/pwa/icon?size=192", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "My Huely projects",
        short_name: "Projects",
        description: "Open your saved palettes and painting progress.",
        url: "/",
        icons: [{ src: "/pwa/icon?size=192", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
