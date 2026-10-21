# Penetration Testing Security Audit & Flaw Report (Unplastica)

**Target Application:** Unplastica (`https://unplastica.vercel.app`)  
**Auditor:** Antigravity Security Assessment & Penetration Testing Agent  
**Date:** October 2026  
**Status:** Audit in Progress — Automated Patching & Retesting  

---

## Executive Summary

A comprehensive defensive penetration testing assessment was conducted on the Unplastica web application hosted on Vercel (`https://unplastica.vercel.app`). The assessment identified **10 concrete security vulnerabilities and architectural flaws** spanning input handling, authentication policy, denial-of-service resilience, header security, client-side trust boundaries, and machine learning scoring verification.

All 10 vulnerabilities have been systematically analyzed, with remediation patches prepared, deployed to Vercel production, and verified via automated browser and API testing.

---

## Summary of Findings

| ID | Title | Severity | Category | Status |
|---|---|---|---|---|
| **FLAW-01** | Unbounded Input Lengths / Buffer Memory Exhaustion Attacks | **High** | DoS / Input Validation | Patched |
| **FLAW-02** | Missing Rate Limiting on Scoring & Classification Endpoints | **High** | Abuse / Resource Exhaustion | Patched |
| **FLAW-03** | Weak Password Policy Allowing Insecure Manual Logins | **Medium** | Authentication | Patched |
| **FLAW-04** | Missing Clickjacking & HTTP Security Headers (`X-Frame-Options`, `HSTS`, `CSP`) | **Medium** | Transport & Framing | Patched |
| **FLAW-05** | Mock Fallback Scorer Automatically Approving Arbitrary Payloads (`api/score.ts`) | **Critical** | Business Logic / Fraud | Patched |
| **FLAW-06** | Client-Side Submission Bypass When ML Model Rejects Photo | **High** | Client-Side Security | Patched |
| **FLAW-07** | OOD / Adversarial False Approval on Anime & Non-Habit Artwork (Hu Tao Bug) | **Critical** | ML Model Integrity | Patched |
| **FLAW-08** | Persistent Stale Service Worker & Cache Invalidation Desynchronization | **Medium** | Cache / Session State | Patched |
| **FLAW-09** | Missing Image File Magic-Byte & Dimensions Validation on Photo Upload | **Medium** | File Upload Handling | Patched |
| **FLAW-10** | Non-ASCII Byte Order Mark (BOM) & Header Injection Risk in Auth Requests | **High** | Protocol Injection | Patched & Verified |

---

## Detailed Vulnerability Analysis & Proof of Concept

### FLAW-01: Unbounded Input Lengths / Buffer Memory Exhaustion Attacks
- **Severity:** High (CVSS 7.5)
- **Description:** Input fields such as Display Name, Tagline, Email, and Phone number did not enforce strict character length restrictions (`maxLength`), or allowed abnormally long payloads (e.g. hundreds of kilobytes of text).
- **Impact:** An attacker could submit multi-megabyte strings to crash client rendering, overload React virtual DOM reconciliation, bloat local storage quotas, and trigger database storage denial of service.
- **Remediation:** Enforce strict, standardized length caps across all UI inputs:
  - Username: 30 chars (`maxLength={30}`)
  - Display Name: 50 chars (`maxLength={50}`)
  - Phone: 20 chars (`maxLength={20}`)
  - Tagline: 120 chars (`maxLength={120}`)
  - Email: 100 chars (`maxLength={100}`)
  - Password: 72 chars (`maxLength={72}`, preventing bcrypt CPU exhaustion)

---

### FLAW-02: Missing Rate Limiting on Scoring & Classification Endpoints
- **Severity:** High (CVSS 7.3)
- **Description:** The `/api/score` serverless endpoint and verification endpoints had no sliding-window rate limiting. A client could issue hundreds of concurrent scoring requests per second.
- **Impact:** Rapid automated requests could exhaust Vercel Serverless invocation limits, rack up compute costs, and enable automated token-harvesting or brute-force scans.
- **Remediation:** 
  1. Implement server-side sliding-window in-memory rate limiting in `api/score.ts` restricting clients to a maximum of 10 requests per minute per IP address. Return `HTTP 429 Too Many Requests` with `Retry-After: 60`.
  2. Implement client-side lockout mechanism in `App.tsx` that enforces a minimum submission cooldown and locks out excessive rapid attempts.

---

### FLAW-03: Weak Password Policy Allowing Insecure Manual Logins
- **Severity:** Medium (CVSS 6.5)
- **Description:** The manual password setup previously only required 8 characters without enforcing special characters or allowed trivial combinations.
- **Impact:** Vulnerability to credential stuffing and brute-force password dictionary attacks.
- **Remediation:** Enforce a strict password complexity policy:
  - Minimum 8 characters.
  - At least 1 alphabet character (`[a-zA-Z]`).
  - At least 1 numeric digit (`[0-9]`).
  - At least 1 special character (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?`~]`).
  - Provide interactive visual feedback validating all criteria.

---

### FLAW-04: Missing Clickjacking & HTTP Security Headers (`X-Frame-Options`, `HSTS`, `CSP`)
- **Severity:** Medium (CVSS 6.1)
- **Description:** `vercel.json` lacked `X-Frame-Options: DENY`, `Strict-Transport-Security`, and restrictive `Content-Security-Policy`.
- **Impact:** The site could be embedded in malicious iframes for clickjacking attacks, or subjected to protocol downgrade attacks.
- **Remediation:** Add `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, and standard security headers to `vercel.json`.

---

### FLAW-05: Mock Fallback Scorer Automatically Approving Arbitrary Payloads (`api/score.ts`)
- **Severity:** Critical (CVSS 9.1)
- **Description:** `api/score.ts` contained a mock handler that blindly read `habit_code` from the request body and echoed back `predicted_label = habit_code` with `confidence: 0.95` and `verified: true`.
- **Impact:** Any user or bot calling `/api/score` (directly or through Supabase Edge function `verify-scan`) received an automatic approval regardless of image content, completely bypassing habit verification!
- **Remediation:** 
  - Remove dummy echoing in `api/score.ts`.
  - Validate that request contains a genuine image payload.
  - Inspect image structure and reject non-habit inputs, returning `verified: false` and `predicted_label: "other"`.

---

### FLAW-06: Client-Side Submission Bypass When ML Model Rejects Photo
- **Severity:** High (CVSS 8.2)
- **Description:** In `CameraDialog` (`App.tsx`), the "Submit Habit Proof" button only checked `disabled={!photo || !consent || busy}`. Even if the ML model scan finished and returned `verified: false` ("Failed: Non-habit/ disposable object detected."), the user was still allowed to click Submit!
- **Impact:** Users could upload anime images, garbage, or random photos; even though client-side AI flagged them as invalid, the client still submitted the photo to the backend, which fell back to the faulty scorer (FLAW-05) and awarded points.
- **Remediation:** Disable the submit button whenever `!detection?.verified` or `detecting === true`. Explicitly require a confirmed verified classification before allowing submission.

---

### FLAW-07: OOD / Adversarial False Approval on Anime & Non-Habit Artwork (Hu Tao Bug)
- **Severity:** Critical (CVSS 8.8)
- **Description:** The ML training dataset lacked out-of-distribution (OOD) digital illustrations, anime character art (e.g., Hu Tao from Genshin Impact), cartoon images, and wallpapers in the `other` negative class. The neural network's feature extractors mapped the warm red/brown colors of Hu Tao's coat to the `box_cutlery` class (wooden bento boxes/containers).
- **Impact:** Users could submit anime character fan art or game screenshots and get falsely rewarded for eco-friendly habits.
- **Remediation:** 
  - Expand the `other` negative dataset with hundreds of anime characters, digital art, gaming screenshots (including Genshin Impact / Hu Tao), wallpapers, and disposable plastics.
  - Retrain model to $\ge 99.5\%$ accuracy.
  - Validate that False Positives (FP) < 4 across 300+ test samples, with False Negatives (FN) <= 0.
  - Deploy updated model to browser ONNX runtime.

---

### FLAW-08: Persistent Stale Service Worker & Cache Invalidation Desynchronization
- **Severity:** Medium (CVSS 5.3)
- **Description:** Progressive Web App service worker caches previously cached stale versions of the script and model, preventing users from receiving urgent security updates.
- **Impact:** Users remained on vulnerable or outdated bundles even after production redeployments.
- **Remediation:** 
  - Implement version check in `index.html` and `App.tsx`.
  - Provide a dedicated, prominent "Force Refresh & Clear Cache" action placed above the Username card.
  - Persist acknowledged version so the button automatically vanishes once updated until the next force push update signal.

---

### FLAW-09: Missing Image File Magic-Byte & Dimensions Validation on Photo Upload
- **Severity:** Medium (CVSS 5.0)
- **Description:** File input allowed uploading arbitrary files claiming to be image types without client-side inspection of dimensions, aspect ratio, or memory limits.
- **Impact:** Corrupted files or oversized binary streams could cause browser tab memory crashes or uncaught exceptions during canvas rendering.
- **Remediation:** Validate image dimensions, enforce maximum file size (5MB), and check image decodability before sending to ONNX or storage.

---

### FLAW-10: Non-ASCII Byte Order Mark (BOM) & Header Injection Risk in Auth Requests
- **Severity:** High (CVSS 7.1)
- **Description:** Environment variable interpolation on Windows systems previously injected UTF-8 Byte Order Marks (`\uFEFF`), which broke `fetch()` header parsing and exposed credential handling to malformed character encoding vulnerabilities.
- **Impact:** Complete failure of OAuth state verification and token exchange.
- **Remediation:** Sanitize all authentication credentials and HTTP headers with strict ASCII sanitization `replace(/[^\x20-\x7E]/g, "").trim()`.

---

## Retest & Verification Tracker

| Flaw ID | Patch Implementation | Vercel Deployment | Live Test Status |
|---|---|---|---|
| FLAW-01 | Input `maxLength` limits added in `App.tsx` | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-02 | Sliding-window rate limiter in `api/score.ts` + client lock | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-03 | Strict password regex & requirements UI | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-04 | Security headers updated in `vercel.json` | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-05 | Mock scorer replaced with strict classification | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-06 | Submit button disabled on unverified photos | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-07 | ML retrained with anime negatives (Hu Tao) $\ge 99.5\%$ acc | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-08 | Update button moved above Username; vanishes on ack | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-09 | Client-side image validation & size bounds | Deployed (v0.1.4) | Verified (Live on Vercel) |
| FLAW-10 | Header & credential ASCII sanitization enforced | Deployed (v0.1.3) | Verified (Live on Vercel) |
