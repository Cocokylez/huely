import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { MixerProvider } from "@/components/mixer/MixerProvider";
import { Mixer } from "@/components/mixer/Mixer";
import { Navbar } from "@/components/Navbar";
import { GuestProjectMigration } from "@/components/history/GuestProjectMigration";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Huely — paint it for real",
  description:
    "Turn a photo into an oil-paint reference and the exact colors to mix by hand, plus a paint-by-numbers guide and a color mixer.",
  manifest: "/manifest.webmanifest",
  applicationName: "Huely",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Huely",
  },
  icons: {
    icon: [
      { url: "/pwa/icon?size=192", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon?size=512", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/pwa/icon?size=192", sizes: "192x192", type: "image/png" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#201d1a" },
  ],
};

// Applies the saved theme before first paint so there's no flash (spec 01).
const THEME_INIT = `try{var t=localStorage.getItem("huely-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();
  const navUser = user ? { email: user.email, displayName: user.displayName } : null;

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <ToastProvider>
          <GuestProjectMigration authed={Boolean(user)} />
          <PwaInstallPrompt />
          <MixerProvider>
            <Navbar user={navUser} />
            <main
              id="main-content"
              tabIndex={-1}
              className="mx-auto w-full max-w-xl flex-1 px-5 pb-28 pt-6"
            >
              {children}
            </main>
            <Mixer />
          </MixerProvider>
        </ToastProvider>
        <div id="print-area" className="print-area" aria-hidden="true" />
      </body>
    </html>
  );
}
