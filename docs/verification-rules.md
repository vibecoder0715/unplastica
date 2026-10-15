# Verification and Greenbits rules

- A client never supplies an award amount, model score, database user id, or catalogue cost as trusted input.
- The upload function obtains the user from a verified Supabase session, accepts only the seven enabled habit codes, and creates a private per-user upload path.
- Images must be JPEG, PNG, or WebP and no larger than 10 MB. The verifier checks image bytes, hashes the photo, and sends it to the private model scorer.
- An award requires a score at or above `ML_SCORE_THRESHOLD` (default 0.85) and an exact match to the selected habit code.
- The database locks the submission and writes its approval and one positive ledger entry in one transaction. Repeated requests return the existing result; the browser cannot write the ledger.
- Negative scores, mismatched labels, reused proof, disabled habits, and disabled/unlisted spend or reward items do not earn or spend points.
- Spend and redemption RPCs read cost from their server-side catalogues, lock the profile row, check the balance, and use an idempotency key. The game/reward catalogues are empty or disabled until their costs are decided.
- Proof photos stay in a private bucket and expire after 30 days. A daily authenticated Vercel cron invokes the server-side purge; no photo is cached by the PWA.
- The anomaly job flags identical approved image hashes submitted by different accounts for future review. It does not quietly modify balances.

Before a real pilot, agree on repeat-submission cooldowns per habit, an appeals path, and the false-approval rate that is acceptable to the program. They are intentionally not invented here.
