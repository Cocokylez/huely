import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { MixerProvider } from "@/components/mixer/MixerProvider";
import { Mixer } from "@/components/mixer/Mixer";
import { Navbar } from "@/components/Navbar";
import { GuestProjectMigration } from "@/components/history/GuestProjectMigration";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Huely — paint it for real",
  description:
    "Turn a photo into an oil-paint reference and the exact colors to mix by hand, plus a paint-by-numbers guide and a color mixer.",
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
        <ToastProvider>
          <GuestProjectMigration authed={Boolean(user)} />
          <MixerProvider>
            <Navbar user={navUser} />
            <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-10 pt-6">{children}</main>
            <Mixer />
          </MixerProvider>
        </ToastProvider>
        <div id="print-area" className="print-area" aria-hidden="true" />
      </body>
    </html>
  );
}
