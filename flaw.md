# Penetration Test & Flaw Register — Unplastica

**Target:** Unplastica — React/Vite PWA on Vercel, Supabase (Auth/Postgres/Storage/Edge Functions), private ML scorer.
**Audit date:** 23 October 2026
**Reviewed revision:** `4d6bd0c` (`feat: regenerate greenery & furniture and handicraft images … add cache buster and mock signatures`). Working tree also has pre-existing deletions of `SETUP.md` and `VERIFIED.md`; no code was modified during this audit.
**Method:** source review of every server-side trust boundary, plus execution of the shipped ONNX artifact against the **exact award gate in the code** (`ml/pentest_probe.py`). No request was sent to production; live behaviour of the deployed build is therefore inferred from source unless stated otherwise.

**Evidence grades**

| Grade | Meaning |
|---|---|
| **A** | Executed in this audit; the command and result are in [FINDINGS.md](FINDINGS.md) §14 |
| **B** | Proven by reading the code path end-to-end (deterministic, no external dependency) |
| **C** | Inferred from code; depends on deployment configuration or a race that was not run |

**Verdict.** The access-control layer is in good shape; the **verification and reward layer is not**. Four of the five rewardable habits can be earned by uploading a public marketing image with a 3 % border added (measured, grade A). A user picks the habit *after* the model has classified the photo, and the model is downloadable, so the claim always matches the prediction. Accounts are free and unlimited, each worth an idempotent 250-point grant. Per-habit daily caps are protected by a check that is not serialised, so they can be raced. The 30-day proof-deletion cron cannot authenticate. Ten controls that the previous register listed as "patched and verified live" are, on this revision, four fixed, four partially fixed, one unfixed and one misdiagnosed.

---

## 1. Summary of findings

| ID | Title | Severity | Grade | Status |
|---|---|---|---|---|
| FLAW-11 | Rewardable habit obtainable from a public marketing image (blocklist + model bypass) | **Critical** | A | Open |
| FLAW-12 | Habit is chosen after the prediction; the model is public and deterministic | **Critical** | A/B | Open (design) |
| FLAW-13 | Unlimited free accounts: no email verification, 250-point welcome grant per account | **Critical** | B | Open |
| FLAW-14 | Daily limit / 5-hour cooldown bypass by concurrent verification (TOCTOU) | High | C | Open |
| FLAW-15 | Proof-reuse control is exact SHA-256; re-encoding yields a new "proof" | High | A/B | Open |
| FLAW-16 | Cross-account duplicate detector never runs; media-purge cron cannot authenticate | High | B | Open |
| FLAW-17 | `/api/score` rate limit trusts client-supplied `X-Forwarded-For`, per-isolate memory | Medium | B | Open |
| FLAW-18 | Unauthenticated username login: no server lockout, auto-confirms email, discloses OAuth provider | High | B | Open |
| FLAW-19 | Password policy exists only in the browser | Medium | B | Partially fixed |
| FLAW-20 | Five different acceptance thresholds; unpinned artifact; unverified `model_version` fallback | High | A/B | Open |
| FLAW-21 | Session tokens accepted from the URL fragment with no state binding; hash never cleared | Medium | B | Open |
| FLAW-22 | CSP allows inline script, a third-party CDN and `https:` for all connections; refresh tokens in `localStorage` | Medium | B | Partially fixed |
| FLAW-23 | Edge function trusts an arbitrary mutable scorer URL, unsigned JSON response | Medium | B | Open |
| FLAW-24 | Unbounded image decode on the client; no pixel cap on the proof path before the scorer | Low | B | Open |
| FLAW-25 | Client accepts at 0.28, server at 0.85 — 12.4 % of correct proofs shown "Verified" then rejected | Medium | A | Open |
| FLAW-26 | Privacy/PDPA gaps: no account deletion or export; phone stored unverified; retention broken by FLAW-16 | Medium | B | Open |
| FLAW-27 | Ledger immutability covers UPDATE only; no DELETE guard | Low | B | Open |
| FLAW-28 | Internal DB error text echoed to the UI | Low | B | Open |
| FLAW-29 | Hardcoded production Supabase URL + publishable key fallback with typo "auto-correct" | Low | B | Open |
| FLAW-30 | `preferences` jsonb and `profiles.email` are unconstrained; email edits silently dropped | Low | B | Open |
| FLAW-31 | Published 79–94 % accuracy is training accuracy; honest held-out figure is 74.7 % | High | A | Open |
| FLAW-32 | Config/documentation drift (habit point values, "verified email" policy) | Low | B | Open |

---

## 2. Re-audit of the previous register (FLAW-01 … FLAW-10)

The previous version of this file stated *"All 10 vulnerabilities … patched, deployed to Vercel production, and verified via automated browser and API testing."* Re-checking each claim against `4d6bd0c`:

| ID | Old claim | Present on this revision | Evidence |
|---|---|---|---|
| FLAW-01 | Length caps on inputs | **Fixed.** `maxLength` on every field (`App.tsx` 1165–1252) *and* `check` constraints in `profiles` (display_name ≤ 80, username ≤ 40, phone ≤ 32, tagline ≤ 160) | B |
| FLAW-02 | 10 req/min sliding window | **Not fixed.** Keyed on the first `X-Forwarded-For` value, which the caller controls; state is a per-invocation `Map`, so it does not span serverless instances; no limit at all on `verify-scan` or `sign-in` | B |
| FLAW-03 | Complexity policy enforced | **Partially.** `validatePasswordComplexity` is imported only by `App.tsx` and a unit test. GoTrue still accepts whatever it is configured to accept; `supabase.auth.updateUser({ password })` and `/auth/v1/signup` bypass the check entirely | B |
| FLAW-04 | `X-Frame-Options`, HSTS, CSP | **Fixed.** All present in `vercel.json` (and duplicated in `index.html`). Residual weakness in §FLAW-22 | A (static) |
| FLAW-05 | Mock scorer removed | **Partially.** The `habit_code` echo is gone and the endpoint now fails closed to 503 when no scorer exists — but the only *content* control left is an exact-byte blocklist of **five** files, three of which are the app's own illustrations (§FLAW-11). Genuine progress, not a closed finding | A |
| FLAW-06 | Submit disabled unless verified | **Fixed.** `detection?.verified` gates the button and `runModelDetection` now returns `verified: false` on any failure. It is also irrelevant to an attacker, who need not use the client at all | A/B |
| FLAW-07 | "Hu Tao bug" fixed by retraining | **Not fixed as a class.** The shipped artifact rejects `hu_tao_test.jpg` (`other` 1.0000) and the public bento proof (`other` 0.9944) — but approves the app's own bottle illustration at **1.0000** and the handicraft illustration at **0.9287**. A model that rejects one fixture has learned that fixture | A |
| FLAW-08 | Stale service worker | **Not a security finding.** It is a `localStorage` build-version key that unregisters the SW. It neither protects nor invalidates a session. Downgraded to informational | B |
| FLAW-09 | Magic-byte and dimension validation | **Fixed on the client and at the edge** (`isImage` in `verify-scan`, header parsing in `upload-profile-avatar`). The 20 MP cap lives only in `ml/service.py`, which is not in this repository's deployment | B |
| FLAW-10 | "BOM header injection" sanitised | **Misdiagnosed.** A UTF-8 BOM in a Windows `.env` breaking `fetch` is a local configuration bug, not a vulnerability, and no attacker-reachable header is involved. The "fix" (`cleanEnv` strips every non-ASCII byte from the project key) now silently corrupts any legitimate key containing one | B |

**Net:** 4 fixed, 4 partial/open, 1 unfixed, 1 misdiagnosed. The claim "verified live on production" cannot be supported from this repository, and the previous `VERIFIED.md` has been deleted from the working tree.

---

## 3. New findings

### Critical

#### FLAW-11 — A rewardable habit can be earned with a public marketing image
- **Grade A.** `apps/web/public/assets/habits/*.png` are served from `/assets/habits/`. The model classifies `self-bottle-refill.png` as `self_bottle_refill` with **p = 1.0000**; `recycle-bags.png` → `recycle_bags` **0.9992**; `box-cutlery.png` → `box_cutlery` **0.9771**; `handicraft-projects.png` → `handicraft_projects` **0.9287**.
- **The only thing stopping this is a blacklist.** `api/score.ts` holds five SHA-256 values; three of them are exactly those illustration files. Adding a 3 % white border and re-encoding as JPEG q88 changes the hash, drops the client's perceptual check to "not a mock" for `self-bottle-refill.png`, and leaves the prediction at **1.0000** — which passes the deployed gate (`label == habit_code && confidence ≥ 0.85`) and pays **10 Greenbits**. The same transform clears the blocklist for `recycle_bags` (0.9994), `box_cutlery` (0.9778) and `handicraft_projects` (0.9238), i.e. **4 of the 5 enabled habits**; the browser's client-side check is irrelevant because `create-proof-upload` → signed upload → `verify-scan` can be called directly.
- **Impact:** a money printer that requires no ML knowledge and no camera. `handicraft_projects` alone is 200 points per award.
- **Fix:** stop treating byte hashes as content control. Require camera capture (getUserMedia-only, strip file upload), bind proofs to a server-issued nonce, add a capture-time/EXIF and re-photograph (moiré/specular) check, and — decisively — replace the closed-set classifier with an open-set verifier (see FINDINGS §12).

#### FLAW-12 — The habit is chosen after the prediction, and the model is public
- **Grade A/B.** `inferHabit()` in `App.tsx` computes the label locally before `submit()` is enabled; the identical `model.onnx` is downloadable from `/model/model.onnx` (6,113,880 bytes, sha256 `64f5e574…`) and is fully deterministic (repeat Δ = 0.0). Any attacker computes the prediction offline, then calls `create-proof-upload` with `habit_code = predicted_label`. Nothing binds the claim to the photo, to a challenge, or to a session.
- **Measured consequence:** on 374 images labelled `other`, an attacker claiming the predicted habit is awarded **1.07 %** (4/374) at p ≥ 0.85, **2.14 %** at 0.75, **4.81 %** at 0.28. That is an *optimistic* lower bound: 317 of those 374 negatives were in the training pool (only the 57 manifest entries were held out). The honest held-out figure in the repository is a **75.44 % negative-rejection rate** (`ml/model/live_vercel_300_test_results.json`), i.e. ~24.6 % of held-out negatives are labelled as a habit and only need to clear 0.85. The previous audit's 35 % figure was measured on a different artifact and is not reproduced today.
- **Impact:** the verifier answers "which of eight things is this?" while the product asks "is this a genuine proof of *this* action?". The user's freedom to supply the label converts a classifier's error rate directly into the fraud rate.
- **Fix:** score against the *claimed* class only with a calibrated margin/rejection model; require an OOD score; make the claim an input that cannot be chosen post-hoc (the habit is selected before the camera opens and is carried in a server-signed token).

#### FLAW-13 — Unlimited free accounts, each worth 250 Greenbits
- **Grade B.** `supabase/config.toml`: `enable_signup = true`, `enable_confirmations = false`; GoTrue therefore stamps `email_confirmed_at` at signup, and `requireVerifiedUser()` — the gate every function relies on — passes for any address the attacker types. `docs/decisions.md` claims "any account with a verified email or phone may use the app"; that control does not exist. `award_welcome_bonus` is idempotent **per user id**, so each new account adds 250 to the ledger.
- **Impact:** the campus challenge ranks students by Greenbits and pays RM 500 / 200 / 100. A scripted signup loop outranks every real participant, and no human-identity check exists anywhere in the pipeline.
- **Fix:** re-enable confirmations (or an APU-domain allowlist + student-ID verification); gate the welcome grant on a confirmed email *and* a first verified award; add device/IP/behaviour clustering; cap total accounts per device and per payment identity before any prize is paid.

### High

#### FLAW-14 — Daily caps and the 5-hour cooldown are racy
- **Grade C (static).** `award_greenbits` locks only the *submission* row (`where id = p_submission_id … for update`) and then counts today's approvals. `spend_greenbits` correctly locks the profile row first; the award path does not. Ten submissions created in one hour (`create-proof-upload` allows 10) and verified concurrently can each read `today_approved_count = 0` before any of them commits, so a 1/day habit can be awarded ten times, and the `box_cutlery` 5-hour cooldown has the same shape.
- **Impact:** 10 × 200 (handicraft) = 2,000 points per account per hour, on top of FLAW-11.
- **Fix:** `perform 1 from public.profiles where id = p_user_id for update;` before the count, or a Postgres advisory lock keyed on `(user_id, habit_code)`. Add a regression test that fires two concurrent RPCs and asserts one failure.

#### FLAW-15 — "Unique proof" is defeated by re-encoding
- **Grade A/B.** Uniqueness is `habit_submissions (user_id, proof_sha256) where status = 'approved'` and the cross-account check compares the same hash. Any re-save changes the hash while the picture is unchanged: the 3 %-border transform in FLAW-11 produced a new hash for every variant.
- **Impact:** the anti-replay control on a rewardable image is a no-op against anyone who can open Paint.
- **Fix:** store a perceptual hash (dHash/pHash ≤ 10) plus a learned embedding, enforce the nearest-neighbour distance in the RPC, and keep the exact hash only as a fast path.

#### FLAW-16 — The duplicate detector never runs and the deletion job cannot authenticate
- **Grade B.** `vercel.json` schedules exactly one cron: `/api/purge-proof-media`. `flag-anomalies` has no schedule and no caller anywhere in the repository. `api/purge-proof-media.ts` compares `Authorization` against `Bearer ${RETENTION_CRON_SECRET}`; Vercel's cron invoker sends `Authorization: Bearer $CRON_SECRET` only when that variable exists, and `CRON_SECRET` appears nowhere in the repository. Unless both variables are set to the same value in the Vercel project, **every scheduled purge returns 401** and proof photos are retained indefinitely.
- **Impact:** (a) the cross-account proof farm in FLAW-13/FLAW-15 has no detector at all; (b) the published 30-day retention promise is void, which is a data-protection failure (PDPA/GDPR), not just a bug.
- **Fix:** rename to `CRON_SECRET` (or set both), add `vercel.json` cron for `flag-anomalies`, alert on any non-200 from either job, and assert deletion counts in a daily health check.

#### FLAW-18 — The username login endpoint is an unauthenticated oracle
- **Grade B.** `supabase/functions/sign-in` is `verify_jwt = false`. It (1) maps a username to its account and returns a **different** error for OAuth-only accounts ("registered with Google / Microsoft OAuth"), which discloses provider and account existence; (2) auto-confirms the account's email (`updateUserById(email_confirm: true)`) before trying the password, so an unconfirmed account becomes "verified" on any login attempt — the same trust flag that `requireVerifiedUser` and the welcome bonus depend on; (3) has no server-side attempt limit (the 5-attempt lockout in `AuthPage` is a `useRef` in the browser).
- **Mitigation present:** password checks still go through GoTrue, which applies its own IP rate limits. Username enumeration and provider disclosure are not covered by that.
- **Fix:** drop the auto-confirm; return one generic error for every failure; rate-limit by identifier *and* IP in the function; log and alert on failures.

#### FLAW-20 — Five thresholds, an unpinned artifact, and an unverified version string
- **Grade A/B.** The acceptance point differs in five places: `0.28` (client `inferHabit`), `0.35` (advertised by `GET /api/score`), `0.75` (`packages/shared` `ML_SCORE_THRESHOLD_DEFAULT`), `0.85` (`api/score.ts` and `verify-scan` default), plus `ML_SCORE_THRESHOLD` in the Supabase project. `model_version` is a literal (`…-v0.1.8-clutter-invariant`) used as a fallback whenever the scorer omits it. It happens to match the checkpoint's `version` field today, but nothing verifies that it does: the ONNX carries no metadata at all, `api/score.ts` and `verify-scan` substitute the literal on any response that lacks it, and a model swap therefore keeps the old version string. No hash is pinned in serving code; the artifact changed twice during the previous audit, and the currently shipped ONNX (`64f5e574…`) is not the one that report measured (`c177193b…`).
- **Impact:** awards cannot be reproduced or audited, and the number a user sees is not the number that decides the award (FLAW-25).
- **Fix:** one server-owned threshold per habit, echoed by `/health`; `model_version` = artifact SHA-256, verified at boot; refuse to serve if the hash is not the expected one; delete the literal fallbacks.

#### FLAW-31 — The published 79–94 % accuracy is training accuracy; the honest number is 74.7 %
- **Grade A.** `ml/data_multistyle_split/val` — the directory every evaluation script reads — is a **byte-identical copy of files in the training pool**: all 338 val files also exist under `ml/data_multistyle/<class>/<same name>`, and a 24-file sample hashed identically. `finetune_clutter_model.py` excludes only the paths in `ml/model/val_300_manifest.json` (415 entries, a *different* set) from training. So accuracy computed on `data_multistyle_split/val` measures memorisation: this audit gets 94.38 % there, `multistyle_eval_summary.json` claims 79.88 %, and neither is generalisation.
- The checkpoint's own metadata (`ml/model/best.pt`) records **`val_accuracy = 74.70 %`**, and the live-artifact test on the 415 genuinely held-out composites records **75.98 % habit approval / 75.44 % negative rejection**.
- Both the 415 held-out set and the leaked val directory are generated by `ml/build_1000_multistyle_dataset*.py` (Wikimedia query results, dHash-deduplicated, resized to 224 px, re-encoded q92, with `ml/test_fixtures/user_bento_proof.jpg` deliberately ingested into `box_cutlery`). No field photograph is involved anywhere.
- **Impact:** the figures describe the generator, not a student's phone. They must not be quoted to a sponsor or used to justify a prize pilot.
- **Fix:** delete the leaked split, regenerate splits by perceptual cluster, and publish a once-only measurement on post-cut-off field photos with per-habit false-approval rates and confidence intervals (FINDINGS §13).

### Medium

#### FLAW-17 — The rate limiter is decorative
- `getClientIp()` trusts `x-forwarded-for[0]`, which the client sets; Vercel documents `x-vercel-forwarded-for` as the trustworthy header. Rotating that header gives unlimited requests. The `Map` is per serverless instance (cold start resets it; concurrent instances do not share it) and grows to 1,000 entries before any pruning.
- **Fix:** use `x-vercel-forwarded-for`/`x-real-ip`, and put the counter in Postgres or Upstash with a per-user key rather than per-IP.

#### FLAW-19 — The password policy is not enforced by the server
- `validatePasswordComplexity` (8–72 chars, letter, digit, symbol) is called in `App.tsx` and covered by `src/lib/security.test.ts`. GoTrue has no matching configuration in `supabase/config.toml`, so `POST /auth/v1/signup` and `PUT /auth/v1/user` accept `aaaaaaaa`. The 72-char cap that the previous report justified as bcrypt-DoS protection is also client-only.

#### FLAW-21 — Session accepted from the URL fragment
- `initAuth()` reads `access_token` / `refresh_token` from `location.hash` and calls `setSession()` with no state, nonce or origin binding. A link to `https://unplastica.vercel.app/#access_token=…&refresh_token=…` silently logs a victim into the attacker's account (classic login CSRF) and can be used to make the victim's proofs credit the attacker. The code deletes `code`/`state` from the query string but never clears the fragment, so tokens stay in the address bar and in history.

#### FLAW-22 — CSP and token storage
- `script-src` allows `'unsafe-inline'` and `cdn.jsdelivr.net` (SRI is present, which is good); `connect-src https:` allows exfiltration to any TLS host. Session tokens live in `localStorage` (supabase-js default). Any XSS — including one enabled by `'unsafe-inline'` — yields long-lived refresh tokens. Add nonce/hash-based script policy, drop the CDN by bundling `onnxruntime-web`, pin `connect-src` to the Supabase project origin, and consider storing the tokens in an httpOnly cookie via a server session.

#### FLAW-23 — The edge function trusts an unsigned scorer response
- `verify-scan` posts the image to `ML_SCORER_URL` (defaulting to `https://unplastica.vercel.app/api`) and trusts `{predicted_label, confidence}` from any 200 JSON. A compromised scorer, or a stale `ML_SCORER_URL`, mints points; there is no signed response, no model-hash echo, and no cross-check of the api's own `verified` field.

#### FLAW-25 — The client and the server disagree about "Verified"
- **Grade A.** Client gate 0.28, server gate 0.85: on the val copy, **36 of 291** genuine habit photos (12.4 %) are shown "Verified" by the browser and then rejected by the server; on `ml/data/evals`, 5 of 84 (6.0 %). Users perceive a broken verifier, and the mismatch is a free oracle for calibrating an attack.

#### FLAW-26 — Data-protection gaps
- No self-service account deletion or data export; `profiles` has no DELETE policy and no delete grant. `phone` is collected and never verified. `email` can be shown as `row.email` even though only the trigger writes it. Combined with FLAW-16 this means personal media is retained past the stated 30 days. Add a deletion RPC that removes storage objects and anonymises the ledger, plus a documented retention job that is monitored.

### Low

- **FLAW-24** `runModelDetection` decodes any user-selected file into an `Image` with no dimension/size guard before canvas work (tab-level DoS against oneself). `api/score.ts` forwards base64 after a `content-length` check that a chunked request does not carry; the real cap is the scorer's 20 MP.
- **FLAW-27** `greenbit_ledger` has a BEFORE UPDATE trigger that raises, but no DELETE guard; "immutable" is enforced only against updates.
- **FLAW-28** `notify("Failed to update profile: " + profileErr.message)` surfaces raw Postgres/PostgREST text to the UI (constraint and policy names, SQLSTATE hints).
- **FLAW-29** `apps/web/src/lib/supabase.ts` hardcodes `https://jkdepxzpqbridnkcnvyj.supabase.co` and a publishable key, and "auto-corrects" a typo (`_60psXnNd` → `_6OpsXnNd`). Publishable keys are public, so this is not a secret leak, but a misconfigured environment silently writes to production and there is no staging separation.
- **FLAW-30** `preferences jsonb` has no size bound (only `jsonb_typeof = 'object'`), so a user can bloat their row; `email` has no `char_length` check; the client sends `email` in the `profiles` update, is denied (column not granted), and retries without — the UI reports success while nothing changed.
- **FLAW-32** `docs/decisions.md` still lists point values `300/50/30/300/100/40/80`; migrations now set `250/10/10/200/200` and disable two habits. `docs/verification-rules.md` and `packages/shared` each carry a different threshold. Stale documentation on a payouts system is a decision hazard.

---

## 4. What actually holds up

Worth keeping, and worth not breaking during remediation:

- **RLS and grants are tight.** Own-row policies on `profiles`, `habit_submissions`, `greenbit_ledger`, `reward_redemptions`; `insert/update/delete` revoked from `authenticated` on the ledger and submissions; `award_greenbits`, `spend_greenbits`, `redeem_reward` and `award_welcome_bonus` executable by `service_role` only. A student client cannot approve its own submission or write a ledger row. `supabase/tests/rls_and_ledger.sql` asserts 16 of these.
- **Ledger design.** One earn per submission (partial unique index), sign constraints, idempotency keys, server-owned catalogue costs, profile-row lock in the spend and redemption paths.
- **Avatar pipeline.** Server-side magic-byte parsing, APNG rejection, dimension/pixel caps, full re-encode (which strips EXIF), 15-second atomic per-user claim, server-generated path, old-object cleanup, folder-scoped read policy, no client write policy.
- **Fail-closed award path.** No scorer → 503, no points. Client detection failure → `verified: false`, submit disabled. The old echo-scorer is genuinely gone.
- **Proof bucket** is private with a 10 MiB limit and MIME allow-list; uploads use a signed, path-scoped URL.

---

## 5. Remediation order

1. **Stop the payout.** Disable automatic awards for `handicraft_projects`, `recycle_bags`, `box_cutlery` and `self_bottle_refill` (everything but `greenery_furniture` is reachable via FLAW-11) until items 2–4 land. Cap `points_awarded` and route awards over the cap to manual review.
2. **Close FLAW-11 and FLAW-15 together.** Remove file upload (camera only), bind each proof to a server nonce, add a perceptual hash + embedding duplicate check in `award_greenbits`, and stop relying on byte hashes.
3. **Serialise the economy (FLAW-14).** Lock the profile row before the daily-count check; add concurrency tests.
4. **Restore identity (FLAW-13).** Enable confirmations or a student-domain allowlist; one welcome grant per verified human, not per auth row.
5. **Fix retention and detection (FLAW-16).** `CRON_SECRET`, a schedule for `flag-anomalies`, and alerting on non-200.
6. **One threshold and a pinned artifact (FLAW-20/25).** Server-owned per-habit thresholds, `model_version` = ONNX SHA-256 verified at boot, `/health` echoing both, client reads them from `/api/score`.
7. **Harden auth (FLAW-18/19/21/22).** Generic errors, server lockout, no auto-confirm, no fragment-session, tighter CSP.
8. **Then rebuild the model** (FINDINGS §12). Everything above is containment; the verifier still cannot tell a photograph from a drawing.

---

## 6. Retest checklist

Each line is falsifiable and currently fails:

| # | Test | Pass condition |
|---|---|---|
| 1 | `python -B ml/pentest_probe.py` | No public asset produces `AWARDABLE=True` after any transform |
| 2 | Submit `self-bottle-refill.png` + 3 % border through the API | `verified: false` |
| 3 | Two concurrent `verify-scan` calls for two `handicraft_projects` submissions | Exactly one `approved` |
| 4 | Submit the same photo re-encoded as PNG | `proof_already_used` |
| 5 | New account with an email you do not own, no inbox access | Welcome bonus denied |
| 6 | Daily cron run, unauthenticated | 401, and the authenticated job reports `deleted > 0` |
| 7 | `GET /api/score` | Reports the same threshold the POST path enforces, and the artifact hash |
| 8 | Login with a username that belongs to a Google-only account | Same error as a wrong password |
| 9 | Password `aaaaaaaa` via `/auth/v1/signup` | Rejected by server configuration |
| 10 | `#access_token=…` link opened in a clean browser | No session established |
