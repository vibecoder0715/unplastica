# Unplastica setup guide

This guide covers the mentor preview, a real Supabase project, the secure profile-photo upload, the camera scoring backend, and training the first camera model. The preview can run without Supabase; real accounts, profile photos, points, and camera verification need the backend configured.

## 1. Put the preview on Vercel

1. Push this repository to a Git provider and import it into Vercel.
2. Keep the repository root as the Vercel Root Directory. The root `vercel.json` already selects the pnpm build and `apps/web/dist` output.
3. For a visual mentor preview, leave the Supabase variables empty. The app runs in guest browsing mode and does not accept real photos.
4. Deploy a Preview and use the HTTPS link Vercel gives you. HTTPS is needed for camera access and PWA installation.

When you connect Supabase, add these values under Vercel → Project → Settings → Environment Variables. Use the Production environment, and Preview too only if you deliberately want Preview builds to use the real backend:

```text
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
VITE_APP_URL=https://YOUR_DOMAIN
```

The Vite-prefixed values are public browser settings, not secrets. Never put a Supabase service-role key, model key, or cron secret in a `VITE_` variable. Redeploy after changing environment variables.

## 2. Create and connect Supabase

1. Create a Supabase account and project. Choose a nearby Asia region if one is available.
2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and open PowerShell at this repository root.
3. Sign in and link this folder to the new project:

   ```powershell
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   ```

4. Apply the versioned database migrations:

   ```powershell
   supabase db push
   ```

   This creates the profiles, habits, points ledger, security rules, private proof-photo bucket, and private avatar bucket. Avatar uploads are limited to 50 KiB, JPEG or PNG input, and are converted by a server function to a small JPEG before storage. The browser has no storage write policy, so it cannot directly publish arbitrary files. The old avatar is removed when a new one is saved.

5. In Supabase → Authentication → URL Configuration, set the Site URL to your Vercel production URL. Add your local URL and exact Preview/Production `/login` callback URLs to the redirect allow-list. Email confirmation should stay enabled. Any email provider is accepted once the address is verified.
6. For Google login, create a Web OAuth client in Google Cloud. Add the local and Vercel site origins there. Copy the callback URL shown in Supabase → Authentication → Providers → Google into Google's authorized redirect URIs, then enter the Google client ID and secret in Supabase. Keep the Google secret in Supabase only.
7. For phone accounts, enable the phone provider and connect an SMS provider in Supabase. Test with its sandbox first; SMS providers may charge per message. Configure rate limits and CAPTCHA before inviting a large group.
8. The first verified sign-in receives 250 Greenbits once. A database function writes it to the ledger; the client cannot set balances or repeat the award.

## 3. Deploy the Supabase backend

The Edge Functions get `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from Supabase at runtime. Do not add the service-role key to Vercel or browser code. Set only the server secrets needed by these functions in Supabase:

```powershell
supabase secrets set ML_SCORER_URL=https://YOUR_PRIVATE_SCORER ML_SCORER_API_KEY=YOUR_LONG_RANDOM_MODEL_KEY ML_SCORE_THRESHOLD=0.85 RETENTION_CRON_SECRET=YOUR_DIFFERENT_LONG_RANDOM_SECRET
```

Deploy the functions from the repository root:

```powershell
supabase functions deploy create-proof-upload
supabase functions deploy upload-profile-avatar
supabase functions deploy sign-in
supabase functions deploy welcome-bonus
supabase functions deploy verify-scan
supabase functions deploy spend-greenbits
supabase functions deploy redeem-voucher
supabase functions deploy flag-anomalies
supabase functions deploy purge-expired-media
```

The photo-upload and account functions require a valid signed-in user. `upload-profile-avatar` also requires a verified email or phone. The username sign-in and scheduled cleanup functions have platform JWT checking disabled because they use their own checks; do not remove their internal password/secret checks.

To turn on proof scoring, host the model service from `ml/` on a private HTTPS service that can accept requests from Supabase Edge Functions. Set its `ML_SCORER_API_KEY` to the same secret as the Supabase function. Do not use `localhost` or `127.0.0.1` for `ML_SCORER_URL` on the hosted Supabase project; that would point back to Supabase, not your computer. The scorer checks its key and image size, and the Edge Function—not the browser—decides whether to award points.

For the Vercel daily 30-day proof cleanup, add these Production-only server variables:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
RETENTION_CRON_SECRET=THE_SAME_SECRET_SET_IN_SUPABASE
CRON_SECRET=THE_SAME_SECRET_SET_IN_SUPABASE
```

Vercel's cron authorization header uses `CRON_SECRET`; the API route compares it with `RETENTION_CRON_SECRET`, then calls the Supabase cleanup function. The schedule in `vercel.json` runs on Production, not Preview deployments. Keep proof photos in the private bucket and confirm the daily cleanup runs before accepting real camera submissions.

## 4. Profile-photo upload safety

The profile page accepts JPEG or PNG files only, with a hard 50 KiB maximum. The Edge Function repeats the size check while reading the request stream, checks the real file signature and image dimensions, rejects animated PNGs and oversized images, then decodes and re-encodes the picture as JPEG. The stored version is resized and must also remain under 50 KiB. Metadata such as EXIF is not carried over.

The `profile-avatars` bucket is private. A signed-in user can read only their own avatar; clients have no insert, overwrite, or delete permission. The server uses a random path and its private service key to save the sanitized result. Uploads are limited to one per user every 15 seconds. SVG, HTML, scripts, archives, and unknown file types are rejected; no uploaded filename is used as a storage path.

The Edge Function uses ImageScript 1.3.1, pinned in `deno.lock`. This design reduces the risk from malicious files but no image decoder can promise zero bugs. Keep the library version pinned and review upgrades, keep the storage bucket private, and do not add a direct-to-storage avatar upload path. If you add account deletion later, also delete that user's private avatar object.

## 5. Train the camera model

The camera model is a small prototype image classifier. It recognizes seven habit photo types plus `other`. Your 8 GB of graphics memory (VRAM) and 24 GB of normal memory are enough for the starter model. Gradio can be used for a private review screen, but it does not train the model; the training script below uses PyTorch. You can train locally or in a private GPU notebook such as Google Colab.

### Collect and sort photos

Only use photos people have agreed can be used for this project. Remove names, location details, and faces where possible. Do not use web photos without permission. Keep the data folder private and out of Git.

Create this exact folder layout. The folder names become the model's labels:

```text
ml/data/
  train/
    box_cutlery/
    recycle_bags/
    self_bottle_refill/
    greenery_furniture/
    handicraft_projects/
    beeswax_food_wraps/
    bulk_pantry_refill/
    other/
  val/
    box_cutlery/
    recycle_bags/
    self_bottle_refill/
    greenery_furniture/
    handicraft_projects/
    beeswax_food_wraps/
    bulk_pantry_refill/
    other/
```

`train` is for learning. `val` is for photos the model never sees during training. Do not put pictures from the same video or the same photo session in both folders. A useful first trial has a few hundred different pictures per label, with varied phones, lighting, backgrounds, and examples that do not show the habit. The `other` class is important because it teaches the model when not to approve.

### Install and train on Windows

Open PowerShell at the repository root:

```powershell
cd ml
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

If PyTorch does not see your graphics card, use the official [PyTorch install selector](https://pytorch.org/get-started/locally/) to install a build that matches your CUDA driver. Check it:

```powershell
python -c "import torch; print(torch.cuda.is_available(), torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU mode')"
```

Start training from the `ml` folder:

```powershell
python train.py --data data --epochs 12 --batch-size 16 --output model/best.pt
```

The first run downloads starter weights. With 8 GB VRAM, batch size 16 is a reasonable start. If you see an out-of-memory error, close other graphics programs and retry with `--batch-size 8`. The model is saved as `ml/model/best.pt`; model weights are ignored by Git.

### Check mistakes before giving points

Validation accuracy alone is not enough. Try a separate set of new photos from different people and phones. Count false approvals (the photo does not show the habit but the model approves) and missed real habits for each label. False approvals matter most because an approval can earn Greenbits.

The server starts with an 85% confidence threshold. A high score is not proof that an action really happened. Do not lower the threshold or use real rewards until you have reviewed mistakes and tested all seven habits. Keep the `other` class and test poor lighting, unusual angles, and empty scenes.

### Run the scoring service

From `ml`, set a long random key in your terminal and start the local service:

```powershell
$env:ML_SCORER_API_KEY = "replace-with-a-long-random-secret"
$env:MODEL_PATH = "model/best.pt"
python -m uvicorn service:app --host 127.0.0.1 --port 8000
```

It has `/health` and a protected `/score` endpoint. This local address is for testing on your computer only; hosted Supabase cannot call it. For a real test, build the provided Docker image in `ml/` and deploy it to a server that gives you HTTPS and is reachable by Supabase. Set `ML_SCORER_API_KEY` there and set `ML_SCORER_URL` plus the same key in Supabase Edge Function secrets. Never put the model key in the app, Vercel browser variables, or Git.

The model service is a prototype. Keep user proof photos private and delete them after 30 days, explain camera use to users, and review the first 50–100 real decisions before a larger pilot.

## 6. Final checks before inviting students

- Test verified email, phone (if enabled), Google login, and the one-time 250 Greenbits award.
- Upload a small JPEG and PNG avatar, then try an oversized file and a renamed non-image file; only a valid sanitized image should be saved.
- Submit each habit type, an `other` photo, a blurry photo, and a photo over the 85% threshold. Confirm points are decided by the server.
- Confirm the proof bucket is private and the daily cleanup is working before collecting proof images.
- Keep secrets out of Git, keep `.env` files private, and review `docs/verification-rules.md` before changing rewards or limits.

## Official references

- [Vercel: deploy a Vite app](https://vercel.com/docs/frameworks/frontend/vite)
- [Supabase: CLI](https://supabase.com/docs/guides/cli)
- [Supabase: Edge Functions and image manipulation](https://supabase.com/docs/guides/functions/examples/image-manipulation)
- [ImageScript on JSR](https://jsr.io/@matmen/imagescript)
- [PyTorch: install for your computer](https://pytorch.org/get-started/locally/)
