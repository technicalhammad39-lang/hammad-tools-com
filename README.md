# HAMMADTOOLS

Premium digital access marketplace built with Next.js, Firebase, and a Hostinger-compatible media system.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=nextdotjs)](#)
[![React](https://img.shields.io/badge/React-19-20232A?logo=react)](#)
[![Firebase](https://img.shields.io/badge/Firebase-Auth%20%7C%20Firestore%20%7C%20FCM-ffca28?logo=firebase&logoColor=black)](#)
[![Hostinger Uploads](https://img.shields.io/badge/Storage-Hostinger-673de6)](#)

## Overview

HAMMADTOOLS is a production-grade subscription and digital services platform with:
- public storefront for tools, services, blogs, and giveaways
- secure checkout and payment proof upload flow
- admin dashboard for catalog, media, orders, coupons, and notifications
- Firebase auth + Firestore backend
- local/Hostinger file storage abstraction for uploads

## Core Features

- Tools and services marketplace
- Coupon and promo ticker system
- Giveaway feed and admin management
- Order management with customer/admin messaging
- Media library with reusable assets
- Push notification support (FCM)
- SEO metadata and sitemap/robots support

## Tech Stack

- **Framework:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Motion
- **Backend Services:** Firebase Auth, Firestore, Firebase Admin, FCM
- **Uploads:** Hostinger-compatible public/protected storage paths + API layer

## Project Structure

```text
app/                 # App router pages and API routes
components/          # Shared UI components
context/             # Auth/cart/settings providers
lib/                 # Utilities, server helpers, domain types
public/              # Static assets
scripts/             # Build/deployment helper scripts
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill values:

- `GEMINI_API_KEY`
- `APP_URL` / `NEXT_PUBLIC_APP_URL`
- Firebase Admin credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY_BASE64`, ...)
- Hostinger upload settings (`HOSTINGER_PUBLIC_UPLOAD_ROOT`, `HOSTINGER_PRIVATE_UPLOAD_ROOT`, ...)
- Optional keys (`CRON_SECRET`, `NEXT_PUBLIC_FIREBASE_VAPID_KEY`)

## Local Development

```bash
npm install
npm run dev
```

Open: `http://localhost:3000`

## Quality Commands

```bash
npm run lint
npm run build
```

## Deployment Notes

- Uses standalone output via Next.js (`output: "standalone"`)
- `scripts/prepare-standalone.mjs` copies required static/public assets
- Hostinger storage routing supports both public and protected uploads

## Branding

- Product Name: **HAMMADTOOLS**
- Domain: **https://hammadtools.com**

## Credits

**Powered by Clyro Tech Solutions**  
**Developed by Clyro Tech Solutions**
