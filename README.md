# Unplastica (Beta)

> **Note:** Unplastica is currently in **Beta**. We are actively testing and improving features.

- **Demo website:** https://unplastica.vercel.app/
- **Real website:** Pending...

Unplastica is a fun, gamified app that helps you cut down on single-use plastic. Whenever you make an eco-friendly choice—like using a reusable bag, refilling your water bottle, or using your own food container—just take a photo. Our smart machine learning detects your action and rewards you with **Greenbits** points!

# Features

- 📸 **Smart Action Detection:** Snap a photo of your plastic-free habit. Our machine learning model automatically checks your action.
- 🎮 **Gamified Habits & Points:** Earn **Greenbits** for every green action you take. Build daily streaks and level up your eco profile.
- 📱 **Mobile-First & Installable:** Works smoothly in your phone browser and installs right to your home screen like a native app (PWA).
- 🌐 **Multi-Language Support:** Easy to use with English, Bahasa Melayu, and Chinese language options.
- 🔒 **Private & Secure:** Proof photos are kept private, and points are protected with secure backend verification.

# Tech stack

In a nutshell:

- **Frontend:** React 19, TypeScript, and Vite built as an installable Progressive Web App (PWA).
- **Machine Learning:** PyTorch (MobileNetV3) & FastAPI service to detect and score eco-friendly habit photos.
- **Backend & Database:** Supabase (PostgreSQL, Edge Functions, and Authentication) to manage user accounts and points.
- **Hosting:** Vercel for the web app and cloud hosting for the ML scoring service.

## Setup

See [SETUP.md](SETUP.md) for Vercel deployment, connecting a real Supabase backend, secure avatar uploads, and training/deploying the camera model.

---



