# FINDINGS — Verification, Reward and Provenance Audit of Unplastica

**Verdict: the verifier is decorative.** Four of the five rewardable habits can be earned by uploading the app's own public marketing image with a 3 % border added; the model scores that image at **0.9238–1.0000** and the server awards it. The attacker never needs a camera, a photo, or any knowledge of machine learning. Separately, the user chooses which habit to claim *after* the model has classified the image, and the model is downloadable and deterministic, so the claim always agrees with the prediction.

This report is pinned to revision **`4d6bd0c`** (23 Oct 2026), with two pre-existing working-tree deletions (`SETUP.md`, `VERIFIED.md`). No request was sent to any deployed endpoint, no production data was touched, and no application code was modified. Every number marked **A** was produced in this audit by the script in §14.

| Item | Value |
|---|---|
| ONNX actually served to browsers | `apps/web/public/model/model.onnx` |
| SHA-256 | `64f5e5741fd1dcb06132e1944b4320704b493c9cafc316f00ddfd6f88150a41b` |
| Size | 6,113,880 bytes (`apps/web/public`, `apps/web/dist`, `ml/model` are byte-identical) |
| PyTorch checkpoint | `ml/model/best.pt`, SHA-256 `060a3d17f61fb95b366455995e415117d26bc1b630ac42d67b93aff9fd94ccd3`, 6,224,361 bytes |
| Checkpoint metadata | `arch=mobilenet_v3_small`, `version=mobilenet_v3_small-v0.1.8-clutter-invariant`, `val_accuracy=74.69879518072288`, `created_at=2026-10-22 06:16:31 UTC`, classes in `classes.json` order |
| Architecture | MobileNetV3-Small, 8-way softmax, 224×224, ImageNet normalisation |
| Artifact measured by the *previous* `FINDINGS.md` | `ml/stress_report/pinned/*` — `64b94b9d…` / `c177193b…`; **not the shipped model** |
| Determinism | repeat-run max |Δp| = **0.0** (3 runs) |
| Latency | **3–18 ms / image** on CPU (varies with machine load) |
| Reproduce | `python -B ml/pentest_probe.py` (reads only, writes nothing) |

---

## 1. The decision path, as built

```
photo ──▶ create-proof-upload        (habit_code chosen by the user here)
            │  requires verified session, enabled habit, daily quota, 10/hour
            ▼
        signed upload to private bucket (user id + uuid path)
            ▼
        verify-scan
            │  isImage(magic bytes) → sha256 → POST to ML_SCORER_URL
            ▼
        api/score.ts  OR the private FastAPI scorer
            │  reject if sha256 ∈ MOCK_IMAGE_SHA256 (5 exact byte strings)
            │  verified = predicted_label == habit_code && confidence >= 0.85
            ▼
        award_greenbits()  ── locks the submission row, counts today's approvals,
                              inserts one ledger entry
```

Four properties of this path decide the economics:

1. **The label is chosen by the applicant** (`create-proof-upload`), before the photo is seen by the scorer, but nothing prevents the applicant from knowing the answer first — the model is public.
2. **The only content control on the server is a five-entry SHA-256 blocklist** — not a classifier of authenticity, not an OOD check, not an EXIF/capture check.
3. **The gate is `argmax == claimed && p ≥ 0.85`** on a softmax that is heavily saturated (mean max-probability 0.91–0.97 across every corpus tested), with no abstention class other than the eighth label `other`.
4. **Uniqueness, quotas and identity are all enforced by checks that are either racy, hash-exact, or absent.**

---

## 2. Evidence A — a public image is a valid proof (grade A)

`apps/web/public/assets/habits/*.png` are shipped as marketing illustrations and served from `/assets/habits/`. The shipped model classifies them as follows, and the deployed gate awards any prediction ≥ 0.85 whose label the applicant names:

| Public asset | Model prediction | p | In server blocklist? | Client "mock" check? | Server would award |
|---|---|---|---|---|---|
| `self-bottle-refill.png` | `self_bottle_refill` | **1.0000** | yes | yes | no (blocked by hash) |
| `recycle-bags.png` | `recycle_bags` | **0.9992** | yes | yes | no (blocked by hash) |
| `box-cutlery.png` | `box_cutlery` | **0.9771** | yes | yes | no (blocked by hash) |
| `handicraft-projects.png` | `handicraft_projects` | **0.9287** | no | yes | **yes** |
| `greenery-furniture.png` | `greenery_furniture` | 0.6678 | no | yes | no (below 0.85) |

Now add a **3 % white border and re-save as JPEG q88** — one trivial image edit:

| Variant | SHA-256 in blocklist | Client mock check | Model prediction | p | Server would award |
|---|---|---|---|---|---|
| `self-bottle-refill.png` + border | **no** | **no** | `self_bottle_refill` | **1.0000** | **yes (10 pts)** |
| `recycle-bags.png` + border | no | yes | `recycle_bags` | 0.9994 | **yes (10 pts)** |
| `box-cutlery.png` + border | no | yes | `box_cutlery` | 0.9778 | **yes (250 pts)** |
| `handicraft-projects.png` + border | no | yes | `handicraft_projects` | 0.9238 | **yes (200 pts)** |
| `greenery-furniture.png` + border | no | yes | `greenery_furniture` | 0.7255 | no |

The client "mock" check only matters if the attacker uses the browser. The award path is three ordinary HTTP calls (`create-proof-upload` → `uploadToSignedUrl` → `verify-scan`); `isMockScreenshot` lives exclusively in `App.tsx` and is never consulted by the server. **Four of five rewardable habits are therefore obtainable from a public asset, with no camera and no photograph.** The self-bottle variant passes even through the official UI.

This is the single highest-value finding in the audit, and it is not a model-accuracy problem. It is the absence of any concept of "authentic capture" in the pipeline: the only defence against submitting an arbitrary image is a list of five byte strings.

---

## 3. Evidence B — the applicant chooses the habit after the answer is known

- The identical ONNX file is downloadable from `/model/model.onnx`; nothing rate-limits or authenticates it.
- The client itself computes the label and confidence (`inferHabit`) and shows the user "Verified"/"Not verified" before submission.
- The model is deterministic (repeat-run Δ = 0.0), so an attacker can reproduce the server's answer offline for any image.
- `create-proof-upload` accepts `habit_code` as a free parameter. Nothing binds it to the image, to a challenge, to a nonce, or to a session.

Consequence: **the user's claim can always equal the model's prediction.** Fraud resistance then reduces entirely to "how often does the model assign a habit class with p ≥ 0.85 to something that is not that habit" — the *false-approval* rate, which is the one number the product does not measure.

Measured, claiming the predicted label (grade A), on `ml/data_multistyle/other` (n = 374 images labelled not-a-habit):

| Gate | Approved | Rate |
|---|---|---|
| p ≥ 0.28 (client) | 18 / 374 | 4.81 % |
| p ≥ 0.75 (`packages/shared` default) | 8 / 374 | 2.14 % |
| **p ≥ 0.85 (deployed)** | **4 / 374** | **1.07 %** |
| p ≥ 0.90 | 3 / 374 | 0.80 % |

Approved as: `handicraft_projects` 3 images (mean p **0.9461**), `recycle_bags` 1 (0.8946).

**This 1.07 % is an optimistic lower bound, not a field estimate.** 317 of those 374 negatives were in the model's training pool — only the 57 negatives listed in `ml/model/val_300_manifest.json` were held out — so most of this set is memorised. The repository's only honest held-out measurement on the same generator is `ml/model/live_vercel_300_test_results.json`: **negative rejection 75.44 %** (43/57), i.e. roughly **24.6 % of held-out negatives are labelled as some habit** and then need only clear 0.85 with the attacker's chosen label. The true fraud rate lies somewhere between the two and has never been measured on data that was not produced by the training pipeline.

---

## 4. Evidence C — five thresholds, and a client that lies to the user

| Value | Where |
|---|---|
| **0.28** | `App.tsx` `inferHabit()` — "clutter-tolerant", enables the Submit button |
| **0.35** | `GET /api/score` — advertised to the world, unauthenticated |
| **0.75** | `packages/shared` `ML_SCORE_THRESHOLD_DEFAULT` |
| **0.85** | `api/score.ts`, `supabase/functions/verify-scan` default, `docs/verification-rules.md` |
| env-supplied | `ML_SCORE_THRESHOLD` in the Supabase project, if set |

Because the client is more permissive than the server, legitimate users are told their proof is good and then told it failed. Measured (grade A):

| Corpus | Server-awardable | Client "Verified" | Client-verified but server-rejected |
|---|---|---|---|
| `data_multistyle_split/val`, habit images (n = 291) | **238 (81.8 %)** | 274 (94.2 %) | **36 (12.4 %)** |
| `ml/data/evals`, habit images (n = 84) | 76 (90.5 %) | 81 (96.4 %) | 5 (6.0 %) |

One in eight genuine proofs is presented as verified and then rejected. That is both a user-facing defect and a free calibration oracle for an attacker tuning an image until the browser says "Verified".

---

## 5. Evidence D — what the anti-mock controls actually are

**Server (`api/score.ts`)** — `MOCK_IMAGE_SHA256`, five entries, returned as `rejected` with "Screenshot or mock image detected". Composition (grade A):

| Entry | Matches |
|---|---|
| `437472beef86…` | `apps/web/public/assets/habits/self-bottle-refill.png` |
| `cfe6f28d2059…` | `apps/web/public/assets/habits/recycle-bags.png` |
| `3563b334eae2…` | `apps/web/public/assets/habits/box-cutlery.png` |
| `fff618b66156…` | no file in the repository |
| `ef68e04a4ea7…` | no file in the repository |

**Three of the five "screenshot detectors" are the app's own illustrations.** The control therefore blocks the app's artwork, not screenshots.

**Client (`App.tsx`) — `isMockScreenshot`** — seven perceptual signatures (dHash + aHash pairs), five of which match the app's own illustrations and are regenerated by `ml/print_mock_signatures.py`; matched at Hamming ≤ 12 on both hashes. It is:
- trivially defeated by a border, a crop, or a re-encode (measured: the self-bottle illustration with a 3 % border has Hamming > 12 and is no longer a "mock");
- bypassed entirely by any client that is not the shipped browser app;
- not a security control in any sense, since the attacker controls the client.

What a real control would need — capture provenance, a server nonce rendered into the frame, EXIF/capture-time consistency, sensor-noise or moiré analysis, and re-photograph detection — is absent.

The two *shipped public fixtures* show the same picture from the other side:

| Fixture (served at `/test_fixtures/…`) | SHA-256 in blocklist | Client mock | Model verdict |
|---|---|---|---|
| `hu_tao_test.jpg` | no | no (min Hamming 31) | `other` **1.0000** ✓ |
| `user_bento_proof.jpg` | no | no (min Hamming 25) | `other` **0.9944** (wrongly rejected) |

`user_bento_proof.jpg` is also ingested into the `box_cutlery` training class by `ml/build_1000_multistyle_dataset*.py`, and is nevertheless rejected at 0.9944 — a compact illustration of how little the fixtures mean.

---

## 6. Evidence E — model quality, and an evaluation that leaks

Accuracy of the shipped artifact, all measured here (grade A) with the server's preprocessing (`Resize(224)` bilinear):

| Corpus | n | argmax accuracy | mean max-prob | predicted `other` |
|---|---|---|---|---|
| `ml/data_multistyle_split/val` | 338 | 94.38 % | 0.9109 | 14.2 % |
| `ml/data_multistyle/other` (negatives) | 374 | 94.65 % | 0.9343 | 94.7 % |
| `ml/data/evals` | 96 | 95.83 % | 0.9687 | 12.5 % |

Per habit on the leaked val directory, at the deployed gate (claim = argmax) — these are **training** numbers:

| Habit | Awardable | Enabled in production? |
|---|---|---|
| `beeswax_food_wraps` | 36/39 (92.3 %) | no (disabled 2026-10-23) |
| `box_cutlery` | 33/38 (86.8 %) | yes |
| `bulk_pantry_refill` | 19/39 (48.7 %) | no |
| `greenery_furniture` | 38/47 (80.9 %) | yes |
| `handicraft_projects` | 50/52 (96.2 %) | yes |
| `recycle_bags` | 28/38 (73.7 %) | yes |
| `self_bottle_refill` | 34/38 (89.5 %) | yes |

Enabled-habit recall at the gate on the same leaked copy: **183/213 = 85.9 %**.

**These 94/95 % figures are not generalisation numbers.** `ml/data_multistyle_split/val` is a *byte-identical copy of training files*: all 338 val paths also exist under `ml/data_multistyle/<class>/<same filename>`, and a 24-file sample hashed identically. The fine-tuning script holds out a different set — the 415 paths in `ml/model/val_300_manifest.json` — so the directory used by `eval_live_model.py` and by `multistyle_eval_summary.json` measures memorisation.

The honest numbers in the repository are:

| Source | What it measures | Value |
|---|---|---|
| `ml/model/best.pt` → `val_accuracy` | 415 held-out **composites** from the same generator | **74.70 %** |
| `ml/model/live_vercel_300_test_results.json` | same 415, live model, clean + clutter | habit approval **75.98 %**, clutter **75.14 %**, negative rejection **75.44 %** |
| `ml/model/multistyle_eval_summary.json` | leaked val copy | 79.88 % |
| this audit | leaked val copy | 94.38 % |

And all of those corpora are synthetic: `build_1000_multistyle_dataset*.py` fetches Wikimedia results per query, deduplicates by dHash, resizes to 224 px, re-encodes q92 as `loc_XXXX.jpg`, and composites clutter patches during fine-tuning. No student's phone photograph appears anywhere in the evaluation.

Two model-level facts survive all of this and are worth stating plainly:

- On the closed-set task it is doing its job: it rejects `hu_tao_test.jpg` at 1.0000 `other` (the previous artifact rejected the same file at 0.9964) and puts 94.7 % of its largely-seen negative pool in `other`. **No out-of-distribution improvement can be claimed**: the two artifacts were never evaluated on a common OOD corpus, and the previous report's 35 % OOD result has no counterpart in this repository.
- It still cannot tell a photograph from a drawing. A flat vector illustration of a bottle is "a bottle" at p = 1.0000. That is expected for an 8-way object classifier and is precisely why it cannot be the authenticity gate for a payout.

---

## 7. Evidence F — economy and ledger

| # | Issue | Where | Grade |
|---|---|---|---|
| F1 | Daily cap and 5-hour cooldown counted after locking only the submission row, not the user | `award_greenbits` (all three revisions) | C |
| F2 | Proof uniqueness is exact SHA-256 → any re-encode is a new proof | `habit_submissions_no_reused_proof`, `proof_already_used` check | A/B |
| F3 | Cross-account duplicate detector never scheduled | `vercel.json` (only `purge-proof-media`), `flag-anomalies` unreferenced | B |
| F4 | Signup open, email confirmation disabled → every account "verified" | `supabase/config.toml` | B |
| F5 | 250-point welcome grant per account, idempotent per user id only | `award_welcome_bonus` | B |
| F6 | Media purge compares `RETENTION_CRON_SECRET`; no `CRON_SECRET` exists in the repo, so the Vercel cron authenticates with the wrong value (if at all) | `api/purge-proof-media.ts` | B |
| F7 | No appeals path, no moderation queue, no review threshold | `docs/verification-rules.md` acknowledges this | B |

**F1, spelled out.** `spend_greenbits` and `redeem_reward` both do `perform 1 from public.profiles where id = p_user_id for update` before reading the balance — the correct pattern. `award_greenbits` does not: it locks the submission, counts today's approvals, and inserts. Ten submissions can be created in one hour (`create-proof-upload` allows 10/hour) with no approved rows yet, because the daily check counts only `status = 'approved'`. Firing ten `verify-scan` calls concurrently lets each transaction count zero approved rows before any commits, so a habit limited to **1/day** can be awarded **10 times**, and the `box_cutlery` 5-hour cooldown has the same shape. This was **not executed** against a database (no write access in this audit) — it is a code-level conclusion, hence grade C — but the lock pattern difference with the spend path is unambiguous.

**F3/F4/F5 together.** A campaign of N accounts, each with a disposable address, starts at 250 points before any photograph is taken; one public illustration plus a border supplies a daily award loop; nothing correlates accounts by device, IP, payment identity or proof similarity. The campus challenge pays RM 500/200/100 on the resulting ranking.

**F6** is a privacy failure rather than a fraud one: the 30-day deletion promise in `README`, `docs/decisions.md` and `docs/verification-rules.md` is executed by a job that cannot authenticate, with no alerting on failure. Photographs of students' kitchens and lunchboxes are retained indefinitely.

---

## 8. Evidence G — authentication and session

| # | Issue | Grade |
|---|---|---|
| G1 | `sign-in` is `verify_jwt = false`, has no attempt limiting, and returns a distinct message for OAuth-only accounts (provider + existence disclosure) | B |
| G2 | `sign-in` auto-confirms `email_confirmed_at` before attempting the password — the flag `requireVerifiedUser` and the welcome bonus trust | B |
| G3 | Password complexity is enforced only by `App.tsx`; GoTrue is unconstrained | B |
| G4 | `initAuth()` accepts `access_token`/`refresh_token` from `location.hash` and calls `setSession()` with no state binding (login CSRF / forced session); the fragment is never removed from history | B |
| G5 | Refresh tokens persist in `localStorage`; CSP allows `'unsafe-inline'` and a third-party script host, and `connect-src https:` permits exfiltration to any TLS origin | B |
| G6 | `upload-profile-avatar`, `create-proof-upload`, `verify-scan`, `spend-greenbits`, `redeem-voucher` are correctly `verify_jwt = true` and re-check the session server-side | B ✓ |

G4 is the one worth an explicit attack: `https://unplastica.vercel.app/#access_token=<attacker>&refresh_token=<attacker>` logs a victim into the attacker's account. The victim then earns Greenbits into the attacker's ledger, or uploads proofs the attacker later redeems. Supabase's own PKCE flow does not need the fragment path here; it exists only as a fallback.

---

## 9. Evidence H — serving and configuration

| # | Issue | Grade |
|---|---|---|
| H1 | `GET /api/score` is unauthenticated and advertises classes, a threshold (0.35) that is not enforced, and a model version | B |
| H2 | Model identity is asserted, not verified: the ONNX has no metadata, and both `api/score.ts` and `verify-scan` substitute the literal `mobilenet_v3_small-v0.1.8-clutter-invariant` when the scorer omits it | A/B |
| H3 | Rate limiting keys on `x-forwarded-for[0]` (client-controlled; Vercel documents `x-vercel-forwarded-for` as trustworthy) and lives in per-instance memory | B |
| H4 | `verify-scan` trusts `{predicted_label, confidence}` from any 200 response at `ML_SCORER_URL`, defaulting to the public production API; no signature, no hash echo, no cross-check of `verified` | B |
| H5 | `api/score.ts` `content-length` check is skipped for chunked bodies; the real pixel cap lives only in `ml/service.py` | B |
| H6 | `profiles.email` is accepted from the client, denied by column grants, retried without it, and the UI still reports success | B |
| H7 | Internal Postgres/PostgREST error text is shown to users (`"Failed to update profile: " + profileErr.message`) | B |
| H8 | Hardcoded production Supabase URL + publishable key fallback with a typo "auto-correct" (`_60psXnNd` → `_6OpsXnNd`) | B |
| H9 | Public `/test_fixtures/` (two photographs) and `/model/model.onnx` are shipped in the production bundle | A |

---

## 10. What holds up

Stated so remediation does not break it:

- **RLS is correct.** Own-row policies on every user table; `insert/update/delete` revoked from `authenticated` on `habit_submissions`, `greenbit_ledger` and `reward_redemptions`; the four award/spend RPCs are `service_role`-only; the balance view is `security_invoker`. `supabase/tests/rls_and_ledger.sql` asserts 16 of these properties.
- **The ledger is well modelled.** One earn per submission (partial unique index), sign constraints per `entry_type`, idempotency keys, server-owned catalogue costs, `for update` on the profile row in both spend paths, and an UPDATE-blocking trigger.
- **The award path fails closed.** No scorer → 503, no points. Removed mock echo. Client detection failure → `verified: false`, Submit disabled.
- **The avatar pipeline is the most mature code in the repo**: header-parsed dimensions, APNG rejection, 8 MP and 4096 px caps, full decode/re-encode (which also strips EXIF), 15-second atomic per-user claim, server-generated path, previous-object cleanup, folder-scoped read policy.
- **The proof bucket** is private, 10 MiB, MIME-allow-listed, with a path-scoped signed upload and no client write policy.

---

## 11. Root causes

1. **No concept of authenticity.** The pipeline verifies *what object is in the image*, not *that the image is a photograph taken now by this person*. A drawing of a bottle satisfies it completely. Everything in §2 follows from this single gap.
2. **The label is an input the attacker controls.** Making the habit a free parameter turns a classifier's accuracy into the fraud rate.
3. **Byte hashes used as security controls.** A five-entry SHA-256 blocklist and a seven-entry perceptual signature table cannot enumerate "non-authentic images", and both are defeated by a border.
4. **Unverified identity underneath a rewards ledger.** Email confirmation is disabled, so the "verified account" invariant that every function assumes is false, and each account carries a 250-point grant.
5. **Economic checks that are neither serialised nor perceptual.** Count-then-write without a user lock; exact-hash deduplication; a detector with no schedule.
6. **Evaluation built by the training pipeline.** The val directory is a copy of training files; the held-out set is synthetic composites; nothing measures the field.
7. **Configuration drift on safety-critical values.** Five thresholds, a stale point table in `docs/decisions.md`, an unauthenticated `/health`-style endpoint that reports a number nobody enforces.

---

## 12. Remediation

**Blocking, before any further automatic award**

1. Disable automatic awards for `box_cutlery`, `handicraft_projects`, `recycle_bags` and `self_bottle_refill` (all reachable via §2). Keep `greenery_furniture` only if a manual review exists, and cap `points_awarded`.
2. Remove the byte blocklist from the trust path — it is not a control. Replace with (a) camera-only capture (`getUserMedia`, no file input), (b) a server nonce embedded in the capture instruction and checked in the frame, (c) capture-time and EXIF consistency, (d) an explicit "is this a photograph of the claimed object, taken now" classifier, evaluated as an open-set problem.
3. Bind the claim: the habit must be fixed before the camera opens and carried in a server-signed token, so it cannot be chosen after the prediction. Do not return per-class probabilities to the client.
4. Lock the profile row at the top of `award_greenbits` (or take an advisory lock on `(user_id, habit_code)`) before the daily/cooldown counts; add a concurrency test that asserts one of two parallel awards fails.
5. Replace exact-hash dedupe with dHash/pHash ≤ 10 plus an embedding distance in the same RPC; keep the exact hash only as a fast path.

**Identity and payout integrity**

6. Re-enable email confirmation, or restrict signup to an APU domain with student-ID verification. Make the welcome grant conditional on a confirmed address *and* a first verified award.
7. Schedule `flag-anomalies`; rename the cron secret to `CRON_SECRET` (or set both variables); alert on any non-200 from either job and assert a non-zero deletion count at least weekly.
8. Add device/IP/behaviour clustering and a manual review queue above a points threshold before any real prize is paid.

**Model and provenance**

9. One server-owned, per-habit threshold; `/health` (authenticated) echoes threshold set and artifact SHA-256; both `api/score.ts` and `verify-scan` read it; the client reads it from the server instead of hardcoding 0.28.
10. Pin `model_version` to the ONNX SHA-256 and refuse to boot on mismatch. Delete the literal fallbacks.
11. Delete `ml/data_multistyle_split/val` (it is a copy of training data), rebuild splits by perceptual cluster across the *base* images, and re-run every published number.
12. Keep 415 held-out composites as a *regression* test only; collect ≥ 100 real post-cut-off photos per enabled habit from student phones, plus ≥ 1,000 explicitly non-habit images (including flat illustrations, screenshots, cosplay, receipts), and report per-habit false-approval rate with Wilson intervals. Until that exists, no accuracy number should be published.

**Auth and privacy**

13. Generic errors on `sign-in`, server-side attempt limits by identifier *and* IP, no auto-confirm.
14. Configure a minimum password length and complexity in GoTrue so the browser is not the only enforcement point.
15. Delete the fragment-token fallback, or validate it against a server-issued state; clear the hash from history.
16. Move tokens out of `localStorage` (httpOnly cookie via a server session), tighten CSP (`'unsafe-inline'` removed, CDN dropped by bundling `onnxruntime-web`, `connect-src` pinned to the Supabase origin).
17. Implement account deletion and export; make the retention job observable; stop collecting phone numbers that are never verified.
18. Stop shipping `/test_fixtures/` in the production bundle.

---

## 13. Acceptance gates

Every row is falsifiable; current values are from this audit.

| Gate | Target | Current |
|---|---|---|
| Public marketing asset + 3 % border is rejected | rejected | **awarded, 4/5 habits (grade A)** |
| Held-out false-approval rate, attacker claims predicted label | ≤ 0.5 %, CI upper ≤ 1 % | **1.07 %** on largely-seen negatives; **≈24.6 % of held-out negatives are labelled a habit** |
| Threshold consistency | exactly one, server-owned | **five values: 0.28 / 0.35 / 0.75 / 0.85 / env** |
| Client and server agree on "Verified" | 0 disagreements | **36/291 (12.4 %)** |
| Proof reuse after re-encode | rejected | **accepted (new SHA-256)** |
| Concurrent awards against a 1/day cap | exactly one succeeds | **untested; no user lock (grade C)** |
| Duplicate-proof detector runs daily | runs, alerts on failure | **no schedule** |
| Proof media deleted after 30 days | ≥ 99 % within 31 days | **cron cannot authenticate** |
| Account requires ownership of its email | yes | **no (`enable_confirmations = false`)** |
| Held-out accuracy on non-leaked data | ≥ 90 % | **74.70 %** (checkpoint metadata) / **75.98 %** (live composites) |
| Evaluation set disjoint from training set | 0 shared files | **338/338 val files byte-identical to training** |
| Model provenance verifiable | SHA-256 pinned in serving code | **literal version string substituted on missing metadata** |
| Password policy enforced server-side | enforced | **client-only** |
| Session established only via a validated flow | yes | **accepts `#access_token` from any link** |
| Determinism | 0.0 | **0.0** ✓ |
| ONNX present in web bundle matches `ml/model/model.onnx` | identical | **identical** ✓ |
| Client can write ledger / submissions | no | **no** ✓ (RLS verified) |

The system passes 3 of 18.

---

## 14. Reproduction

```bash
# Artifact identity and every number in §2–§6 (read-only; writes nothing)
python -B ml/pentest_probe.py

# The evaluation leak (§6): val files are training files
python -B - <<'PY'
import hashlib, os
same = total = 0
for c in os.listdir("ml/data_multistyle_split/val"):
    d = os.path.join("ml/data_multistyle_split/val", c)
    for f in os.listdir(d):
        a, b = os.path.join(d, f), os.path.join("ml/data_multistyle", c, f)
        if os.path.exists(b):
            total += 1
            same += hashlib.sha256(open(a,"rb").read()).hexdigest() == hashlib.sha256(open(b,"rb").read()).hexdigest()
print(same, "/", total, "val files are byte-identical to training files")
PY

# Checkpoint metadata (§6)
python -B - <<'PY'
import torch
ck = torch.load("ml/model/best.pt", map_location="cpu", weights_only=True)
print({k: ck[k] for k in ("arch", "version", "val_accuracy", "created_at")})
PY
```

| Artifact | Contents |
|---|---|
| [`ml/pentest_probe.py`](ml/pentest_probe.py) | Read-only probe: artifact hashes, per-corpus accuracy, false-approval sweep, blocklist composition, client/server disagreement, both anti-mock ports, transform bypass, determinism, latency |
| `ml/model/best.pt` | Shipped checkpoint with `arch`/`classes`/`version`/`val_accuracy`/`created_at` |
| `apps/web/public/model/model.onnx` | Artifact served to browsers (identical to `ml/model/model.onnx`) |
| `ml/model/live_vercel_300_test_results.json` | The repository's only held-out measurement |
| `ml/model/multistyle_eval_summary.json` | Leaked val copy — superseded |

---

## 15. Limitations, and relationship to the previous report

**Not executed in this audit**, and therefore not claimed: any live HTTP request; any write to the database or storage; the F1 race (needs two concurrent RPCs); a fresh out-of-distribution corpus (Wikimedia crawl); adversarial PGD or patch optimisation; a full checkpoint↔ONNX parity run. Where a conclusion depends on deployment configuration — cron secrets, `ML_SCORE_THRESHOLD`, whether `ML_SCORER_URL` points at `ml/service.py` or elsewhere — it is marked grade C.

**The previous `FINDINGS.md` measured a different artifact.** Its pinned hashes (`64b94b9d…` / `c177193b…`) do not match what ships today (`060a3d17…` / `64f5e574…`), its `VERIFIED.md` target has been deleted from the working tree, and several of its premises no longer hold: the checkpoint now carries `classes`, `arch`, `version` and `val_accuracy`, and `ml/service.py` no longer raises `KeyError: 'classes'`. Its numbers (47 % fresh-set accuracy, 35 % OOD approval, the PGD and sticker results) should be treated as historical measurements of a retired model, not as current defects.

Its **structural** critique, however, is still correct and now applies to the replacement model in a new form: the evaluation set is not independent (today: byte-identical copies), the "leakage check" can never fail, and the operating point was never validated on honest data. The new model rejects the old adversary (Hu Tao, 1.0000 `other`) and puts 94.7 % of its largely-seen negative pool in `other`, while accepting a flat illustration of the same object at 1.0000. Same root cause, different picture.
