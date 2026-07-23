# 🎨 Huely

Turn a photo into colors you can **paint by hand** — an oil-paint reference, the exact palette, a paint-by-numbers guide, and a paint-accurate color mixer. v2 is a Next.js app with accounts and saved history.

> Huely is a **reference tool** for painting on a real canvas — there's no in-app drawing.

## Features

- **Oil-paint render** of your photo, plus **Original** and **Paint-by-numbers** views.
- **Palette extraction** — dominant colors as numbered swatches with copyable HEX/RGB.
- **Color Mixer** — blends like real pigment (RYB subtractive model, so blue + yellow → green) and **names any shade**.
- **Eyedropper** — tap the image to grab any pixel's exact color.
- **History** — save palettes; kept locally for guests, synced to your account when signed in.
- All image processing runs **client-side in a Web Worker** — photos never leave your device.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Supabase (auth + Postgres).

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

Runs in **guest mode** with local history and no accounts if Supabase isn't configured.

## Enable accounts + cloud history (Supabase)

1. Create a Supabase project.
2. Copy `.env.example` → `.env.local` and fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor (creates the `projects` table with row-level security).
4. Restart `npm run dev`. Add the same two env vars in your Vercel project settings for production.
5. In Supabase Authentication → URL Configuration, set the production Site URL and add
   `https://your-app.vercel.app/auth/callback` to Redirect URLs. Optionally set
   `NEXT_PUBLIC_SITE_URL` to the same production origin in Vercel.

Auth is email + password with confirmation, resend, and password-reset flows.

## Project structure

```
app/            layout, studio (page), history, login, signup, auth/actions
components/      Navbar, AccountMenu, studio/*, mixer/*, history/*, ui/*
lib/image/      oil paint, quantize, paint-by-numbers, mixer (RYB), color naming
lib/worker/     pipeline.worker.ts (heavy work off the main thread)
lib/history/    local (IndexedDB) + cloud (Supabase) stores
lib/supabase/   browser + server clients
proxy.ts        Supabase session refresh (Next 16's renamed middleware)
```

## Deploy

Push to GitHub; Vercel auto-deploys (add the Supabase env vars in project settings).
