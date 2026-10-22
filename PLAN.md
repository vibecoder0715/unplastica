# PLAN

This file is written by Noulette from your answers. You can edit it at any time.

Q: In one or two sentences, what does your app do?
A: Unplastica is a PWA where users photograph a reusable habit; an image classifier is supposed to verify the photo and the app awards Greenbits through a Supabase ledger, with a campus challenge and real prize pool.

Q: What is your main goal for this app?
A: Campus pilot at APU with real prizes and about 1,000 users in 12 months.

Q: How many users do you expect in the next 12 months?
A: 1000

Q: Who are your users and where are they?
A: APU students and staff in Malaysia, mostly 18-25.

Q: What kind of data does the app handle?
A: Emails, usernames, optional phone numbers, profile photos, private habit-proof photos kept 30 days, Greenbits balance and ledger.

Q: Where will the app run?
A: Vercel (Vite PWA plus two serverless API routes) and Supabase (auth, Postgres, storage, edge functions).

Q: Does it connect to outside systems (APIs, payment providers, hardware)?
A: Supabase, Google OAuth, a private ML scorer service over HTTP, ONNX Runtime loaded from jsDelivr, Google Fonts.

Q: How do I start the app on this computer, and on which port?
A: pnpm dev on port 5173 (Vite). Supabase functions are remote.

Q: Two throwaway test accounts for multi-user checks (username:password, comma separated)?
A: 2 test account(s) saved privately in .noulette (not in this file).

Q: How do I run your tests?
A: pnpm test (vitest), and supabase test db for RLS/ledger SQL tests.
