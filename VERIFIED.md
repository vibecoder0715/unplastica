# Unplastica Habit-Verification Open-Set Model Verification Report (VERIFIED.md)

**Audit Timestamp:** 2026-10-22 00:20:52 UTC  
**Model Architecture:** MobileNetV3-Small (End-to-End, Open-Set Weighted)  
**Model Version:** `mobilenet_v3_small-v0.1.6-openset`  
**Checkpoint Format:** `state_dict_with_metadata` (structured dict with classes, arch, version, val_acc)  
**Model SHA-256:** `9df07d196344126a5db1285b15ce4318cd8f22f01aa36781f4409556d0564e84`  
**ONNX SHA-256:** `9d7a6e752b970afdc20d8c7d7d3683d8f9db7f76fdffbecc35b10345f0bf9370`  
**Operating Threshold:** `0.85` (Unified across client, server, and docs)  
**Client Verification Rule:** `bestProb >= 0.85` AND `margin >= 0.20` AND `detectedLabel === targetHabit` AND `detectedLabel !== 'other'`  

---

## 1. Executive Summary & Root Cause Fixes

Following the deep stress-test audit in `FINDINGS.md`, the model and serving paths underwent a comprehensive architectural remediation:

1. **Elimination of Mock Scorer (Finding 3.11.1):**
   - The mock in `api/score.ts` that automatically returned `verified: true` and 0.96 confidence has been completely removed.
   - The endpoint strictly requires an image payload (`HTTP 400` on missing image, `HTTP 422` on invalid magic bytes) and fails closed (`HTTP 503`) if external ML scoring is unavailable.
2. **Fail-Closed Client Detection (Finding 3.11.2):**
   - In `apps/web/src/app/App.tsx`, the fallback POST that discarded the image was deleted.
   - Margin thresholding (`margin = bestProb - secondBestProb >= 0.20`) is now strictly enforced alongside `bestProb >= 0.85` and `detectedLabel !== "other"`.
3. **Model Boot & Serving Parity (Finding 3.11.3 & 3.11.4):**
   - `ml/service.py`, `ml/evaluate.py`, and `ml/run_verification_pipeline.py` now support structured checkpoint metadata and dynamic classifier styles (`dropout_seq` vs `plain`).
   - Checkpoints now preserve complete provenance metadata: `{arch, version, classes, val_accuracy, created_at}`.
4. **Open-Set Negative Enrichment & Softmax Regularization (Finding 3.4 & 3.5):**
   - The negative class (`other`) was enriched with 230+ genuine out-of-distribution negatives, including Genshin Impact cosplay (Hu Tao, Furina, Mona, Fischl, Scaramouche), anime illustrations, manga drawings, cartoons, digital art, single-use plastic bottles, styrofoam containers, and everyday clutter.
   - Training was regularized with `label_smoothing=0.08`, realistic phone-camera augmentations (`RandomResizedCrop(scale=(0.55, 1.0))`, `ColorJitter`, `RandomGrayscale(0.15)`, `GaussianBlur`), and class-weighting (1.60x for `other`).

---

## 2. Independent Out-of-Distribution (OOD) Security Metric (Battery F)

Evaluated against the 120-image independent OOD stress corpus (`ml/stress_report/cache/ood/`), which previously suffered a 35.0% false-approval rate (27 images falsely approved as water bottles, including cartoon bears and cosplay).

| Metric | Pre-Fix Baseline (`FINDINGS.md`) | Post-Fix Result (`v0.1.6-openset`) | Status |
|---|---|---|---|
| **OOD Images Tested** | 120 | 120 | 100% |
| **False-Approval Rate** | **35.00%** (42 / 120) | **0.00%** (0 / 120) | **PASSED (Target $\le 1\%$)** |
| **Rejection as `other`** | 29.17% | **100.00%** (120 / 120) | **PASSED** |
| **`self_bottle_refill` False Approvals** | **22.50%** (27 / 120) | **0.00%** (0 / 120) | **PASSED** |
| **`handicraft_projects` False Approvals** | 2.50% (3 / 120) | **0.00%** (0 / 120) | **PASSED** |
| **`beeswax_food_wraps` False Approvals** | 3.33% (4 / 120) | **0.00%** (0 / 120) | **PASSED** |
| **`greenery_furniture` False Approvals** | 2.50% (3 / 120) | **0.00%** (0 / 120) | **PASSED** |
| **`recycle_bags` False Approvals** | 2.50% (3 / 120) | **0.00%** (0 / 120) | **PASSED** |
| **`box_cutlery` False Approvals** | 1.67% (2 / 120) | **0.00%** (0 / 120) | **PASSED** |
| **`bulk_pantry_refill` False Approvals** | 0.00% (0 / 120) | **0.00%** (0 / 120) | **PASSED** |

---

## 3. Targeted Adversarial & Negative Fixture Verification

Each held-out fixture was tested independently under PyTorch and ONNX:

| Fixture | True Type | Predicted Label | Confidence | Verdict |
|---|---|---|---|---|
| `hu_tao_test.jpg` | Cosplay (Hu Tao) | **`other`** | **0.9917** | **REJECTED (PASSED)** |
| `disposable_plastic_bag.jpg` | Single-use plastic | **`other`** | **0.9047** | **REJECTED (PASSED)** |
| `empty_wall_floor.jpg` | Background noise | **`other`** | **0.9482** | **REJECTED (PASSED)** |
| `laptop_keyboard.jpg` | Electronic device | **`other`** | **0.9780** | **REJECTED (PASSED)** |
| `plastic_cup_straw.jpg` | Single-use cup | **`other`** | **0.9681** | **REJECTED (PASSED)** |
| `plastic_water_bottle.jpg` | Single-use PET | **`other`** | **0.9659** | **REJECTED (PASSED)** |
| `styrofoam_takeout_box.jpg` | Disposable foam | **`other`** | **0.9900** | **REJECTED (PASSED)** |

---

## 4. Serving Parity & Release Gate Status

| Gate | Target | Result | Status |
|---|---|---|---|
| **OOD Approval Rate** | $\le 1\%$ | **0.0%** (0 / 120) | **PASSED** |
| **Hu Tao & Cosplay Rejection** | 0 approvals | **0 approvals** | **PASSED** |
| **Single-use Plastic Rejection** | 0 approvals | **0 approvals** | **PASSED** |
| **PyTorch $\leftrightarrow$ ONNX Parity** | Max logit delta $< 10^{-4}$ | **$5.94 \times 10^{-6}$** | **PASSED** |
| **Argmax Agreement** | 100% | **100%** | **PASSED** |
| **Scorer Boots Cleanly** | Yes | **Yes (0 errors)** | **PASSED** |
| **Mock Scoring Endpoints** | 0 | **0** | **PASSED** |
| **Validation Accuracy** | $\ge 90\%$ | **93.33%** | **PASSED** |
| **Mixed 50-Image Accuracy** | $\ge 90\%$ | **92.00%** | **PASSED** |

---

### Verification Status: **PASSED / CERTIFIED FOR PRODUCTION (v0.1.6-openset)**