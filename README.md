# ZOLO — Slovak Tax & Accounting Platform

Cloud-first SaaS pre slovenské firmy. Fakturácia, DPH, účtovníctvo, mzdy.

## Stack

- **Next.js 16** (App Router, RSC, Turbopack)
- **TypeScript** + **Tailwind CSS 4**
- **Supabase** (Auth + Postgres + RLS) — `knijcjrpmgkuwnkvgpeu` projekt s 91 tabuľkami
- **Lucide React** ikony

## Setup

```bash
npm install
cp .env.local.example .env.local  # už máš
npm run dev
# → http://localhost:3000
```

## Features

### Auth
- Email/password login + signup
- MFA (TOTP) challenge na druhom kroku
- Server-side proxy middleware redirects (`/login` ↔ `/dashboard`)

### Multi-tenant
- 1 user = N firiem cez `user_company_roles` (admin/accountant/viewer)
- Cloud-first: žiadne localStorage data leaks
- RLS na DB úrovni

### Fakturácia (`/dashboard/invoices`)
- 6 typov: FA, ZF, DO, DL, PPD, CP
- List + create + detail
- Mark paid, email (cez `/api/send-invoice`), PDF tlač
- Auto-VAT calc 23/19/10/EU
- Multi-položkový editor

### DPH
- **Zadávanie** (`/dashboard/vat`) — cross-firm tabuľka per sadzba
- **DP DPH** XML (`/dashboard/vat-return`) — `DPHv24` namespace
- **KV DPH** (`/dashboard/control-statement`) — `KVDPHv21` so sekciami A.1, B.1
- **SV DPH** (`/dashboard/summary-statement`) — `SVDPHv21` EÚ dodania

### Účtovníctvo
- **Denník** (`/dashboard/journal`)
- **Pohľadávky** (`/dashboard/receivables`) — aging buckets

### Mzdy + DZP
- **Mzdová kalkulačka** SK 2026 (SP 9.4%, ZP 4%, daň 19/25%, daňový bonus)
- **DZP kalkulačka** — FO typ A/B + PO (15% / 21%)

### Banky + Import
- **CSV import** + auto-match cez VS/sumu

### Plánovanie
- **Daňový kalendár** + ICS export
- Browser notifications

### Optimalizácia
- **DPH** skupinové započítanie cez firmy
- **Prepojenia** — inter-firm faktúry, obojsmerné toky

### Koncoročné
- **Závierka** 10-bodový checklist s progress

### Tím
- Pozvánky účtovníčky + role
- `team_invitations` cloud tabuľka s RLS

### Global
- Command palette Cmd+K
- Toast notifications
- Apple-style sidebar

## Deploy

```bash
vercel
# alebo
npx wrangler pages deploy .next
```

Env:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## TODO

- [ ] Real SMTP via Resend Edge Function
- [ ] Stripe payment links
- [ ] eDane priame podanie
- [ ] eKasa hardware integration
- [ ] PDF export server-side
- [ ] Customer portal
- [ ] OCR pre prijaté FA
- [ ] AI Vision import
- [ ] REST API
- [ ] CZ/EN lokalizácia
