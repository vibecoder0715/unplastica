# Unplastica

Live website: [https://unplastica.vercel.app](https://unplastica.vercel.app)

Unplastica turns plastic-free habits into a fun daily game. Snap a photo of your reusable container, bag, or bottle, get verified by AI, and earn Greenbits rewards to care for wildlife in your personal sanctuary.

---

## Mission & Vision

- **Mission:** Make cutting down single-use plastic simple, rewarding, and part of everyday life.
- **Vision:** A clean future free from single-use plastic, powered by positive daily habits.

---

## Features

- **Server-Side AI Habit Verification:** Reusable habit verification routed through serverless endpoints (`/api/infer` and `/api/score`). Simple habits use a lightweight MobileNetV3 model, while complex habits route to a higher-capacity model.
- **Adaptive Performance:** Dynamic hardware profiling automatically tunes game graphics (particle density, render scale, shadow quality, cloud caching, and frustum culling) for capable and lower-spec devices.
- **Fast & Responsive PWA:** Code-split route bundles, content-hashed caching, animated status spinners, and offline support.
- **Eco Sanctuary Simulation:** Care for native Malaysian wildlife and flora in an interactive vector-rendered sanctuary.
- **Fair Play & Rate Limiting:** IP-based rate limiting (30 requests/minute) and anti-spoofing verification checks.
- **Multi-Language:** Available in English, Bahasa Melayu, Chinese, and Tamil.

---

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Canvas2D vector graphics.
- **Inference Engine:** ONNX Runtime (server-side serverless execution with model routing).
- **Backend & Persistence:** Vercel Serverless Functions, Supabase (auth, database, storage).
- **Hosting:** Vercel Edge Network.

---

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.
