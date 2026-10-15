# Unplastica

Unplastica is a phone-first, installable web app that rewards verified low-plastic habits with Greenbits. It mirrors the supplied Stitch Home, Earn, Events, and Profile references while adding secure Supabase-ready data handling and a PWA install flow.

## Run the mentor preview

1. Install Node.js 20+ and pnpm.
2. Copy \`.env.example\` to \`.env\`.
3. For visual-only preview, leave the Supabase values blank.
4. Run \`pnpm install\`, then \`pnpm dev\`.
5. Open the printed local URL. Visitors are guests until Supabase is configured: they can browse, but earning features ask them to log in.

## Deploy a preview to Vercel

1. Create a free Vercel account and import this Git repository.
2. Select pnpm. The build command is \`pnpm build\`; Vercel detects \`apps/web/dist\` from \`vercel.json\`.
3. Add only \`VITE_SUPABASE_URL\` and \`VITE_SUPABASE_ANON_KEY\` when a Supabase project exists. These are public browser values.
4. Deploy. Vercel provides HTTPS, which is required for PWA installation and camera access.

See [docs/supabase-and-vercel-setup.md](docs/supabase-and-vercel-setup.md) for the complete free-tier setup, including database migrations, Storage, Edge Function secrets, and the retention cron.

The auth screen supports verified email or phone + password, username/email/phone login, Google OAuth, and English, Bahasa Melayu, and Chinese UI. Supabase provider settings must be completed before live sign-in is available. A verified account receives a one-time 500 Greenbits welcome bonus from the server after first sign-in.

## Security model

- Users can read only their own profile, submissions, and Greenbits ledger.
- The browser cannot add, remove, or edit Greenbits.
- Edge Functions validate the user, official habit value, uploaded proof, ML score, cooldown, and idempotency before writing the immutable ledger.
- Proof media is private and is purged after 30 days by a scheduled server-side function.
- The service worker never caches Supabase/API responses, proof uploads, Greenbits balances, or redemption endpoints.

## Training

Read [TRAIN.md](TRAIN.md) before collecting, labeling, training, or deploying an image model.

