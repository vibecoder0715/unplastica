# Product and security decisions

- Any account with a verified email or phone may use the student app; no email-domain allowlist is applied.
- There are no vendor or administrator routes in this student version.
- Habit values are server-owned and match the seven reference values: 300, 50, 30, 300, 100, 40, and 80 Greenbits.
- The future game may spend Greenbits only through a server-side spend catalogue and immutable ledger. No game cost is active until the game and its costs are defined.
- The sample voucher catalogue is empty and disabled until real rewards and costs are provided.
- Camera proof is private, limited to 10 MB, and scheduled for deletion after 30 days. Scoring runs on a separately hosted ML service; no award is made when it is unavailable.
- The first automatic-award threshold is 0.85, and the model must return the requested habit label. Treat this as a pilot setting, not a proven accuracy claim.
- With no Supabase project configured, visitors are guests: the UI shows no invented profile or points balance, browsing stays available, and earning/game actions prompt login. Core actions require a verified account.
- A verified account receives a one-time 500 Greenbits welcome entry from a server-only idempotent RPC on first sign-in. The client cannot grant it.
- The service worker caches the app shell only. Supabase, API, authentication, storage, score, and balance traffic is network-only.
- Scheduled deletion runs daily on Vercel Hobby, which meets the 30-day retention window with up to about one extra day before deletion.
