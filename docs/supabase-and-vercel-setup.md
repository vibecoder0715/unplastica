# Supabase and Vercel setup

The app is ready for a new Supabase project, but this repository does not contain or create a cloud account. Keep the service-role key, ML key, and cron secret out of Vite variables and Git.

## Create the free preview backend

1. Create a Supabase account and a new project on the Free plan. Choose a nearby Asia region if it is available to you.
2. Install the Supabase CLI, sign in with `supabase login`, and copy the project's reference from its dashboard.
3. From this repository, run:

   ```powershell
   supabase link --project-ref YOUR_PROJECT_REF
   supabase db push
   ```

   This creates the profile, seven official habits, private proof bucket, ledger, row-level security policies, and server functions in the migration. The migration intentionally creates no real users, rewards, or game costs.
4. In Supabase Authentication settings, keep email sign-up and email confirmation enabled. Any confirmed email provider/domain is accepted. Set the Site URL to the Vercel preview URL, and add your local URL plus the Vercel preview URL pattern to allowed redirects. Configure a real SMTP sender before inviting a group; default email sending is rate-limited and is meant for testing.
5. Set Edge Function secrets. Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. Add the server-only values:

   ```powershell
   supabase secrets set ML_SCORER_URL=https://YOUR-PRIVATE-SCORER ML_SCORER_API_KEY=YOUR_RANDOM_KEY ML_SCORE_THRESHOLD=0.85 RETENTION_CRON_SECRET=YOUR_DIFFERENT_RANDOM_SECRET
   ```

6. Deploy each function:

   ```powershell
   supabase functions deploy create-proof-upload
   supabase functions deploy verify-scan
   supabase functions deploy spend-greenbits
   supabase functions deploy redeem-voucher
   supabase functions deploy flag-anomalies
   supabase functions deploy purge-expired-media
   ```

   Keep JWT verification enabled for the four user functions. The two scheduled functions are protected by `RETENTION_CRON_SECRET` inside the function.
7. In Supabase project API settings, copy the project URL and the publishable/anon key. These two values are safe to use in a browser when RLS is enabled. Do not copy the service-role key to Vercel variables beginning with `VITE_`.

## Deploy the mentor preview

1. Push this repository to a Git provider, then import it into Vercel. It is a pnpm workspace; the root `vercel.json` already sets the build and output folder.
2. For the mentor Preview, leave Supabase variables blank. The app stays read-only and uses clearly sample balance/profile data. This avoids collecting real photos before the 30-day cleanup schedule is active.
3. Deploy a Preview. Vercel provides HTTPS, which browsers require for camera access and PWA installation. You can show the mentor the visual demo without creating real accounts.
4. When you are ready for real students, add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_APP_URL` to Vercel's Production environment. Add `SUPABASE_URL` and `RETENTION_CRON_SECRET` to Production server settings. Set Vercel's `CRON_SECRET` to the same value as `RETENTION_CRON_SECRET`. The API checks the Vercel authorization header before calling cleanup.
5. Add your Production host to Supabase Auth redirect URLs, deploy the Production site, and test a verified email end to end. Vercel cron jobs run only on Production deployments, not Previews. If you choose to connect a real backend to a Preview, configure a separate cleanup schedule there before accepting proof photos.
6. Vercel Hobby runs the included Production cleanup schedule once each day; timing may vary within the scheduled hour. Images are removed after 30 days, with up to roughly one extra day until the next run.

## Free-tier notes

As of October 2026, Supabase's Free plan lists 500 MB database space and 1 GB file storage. A quiet free project can be paused after seven days of low activity; reopening it in the dashboard restores service. That is fine for a mentor preview, but it is not an always-on production promise. Keep your SQL migrations and important exports backed up. Check the current limits before a pilot because plan details can change.

Vercel's Hobby plan supports daily cron jobs, which is enough for the 30-day cleanup. Cron runs only on the Production deployment. Hobby is for personal, non-commercial use; use a suitable plan if the project becomes a commercial service or needs a stronger availability promise.

Current official references:

- [Supabase billing and usage](https://supabase.com/docs/guides/platform/billing-on-supabase)
- [Supabase free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Supabase email confirmation settings](https://supabase.com/docs/guides/auth/general-configuration)
- [Vercel Vite deployment](https://vercel.com/docs/frameworks/frontend/vite)
- [Vercel cron job limits](https://vercel.com/docs/cron-jobs/usage-and-pricing)
- [Vercel cron authorization](https://vercel.com/docs/cron-jobs/manage-cron-jobs)

## Before real students use it

Train and evaluate the model using [TRAIN.md](../TRAIN.md), configure an HTTPS scorer endpoint, test email confirmation and password reset, and review the pilot thresholds in [verification-rules.md](verification-rules.md). The voucher and game spend catalogues remain disabled until you provide real costs and rules.
