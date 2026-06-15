# ZOLO Deploy Guide

## Option A: Vercel (recommended)

```bash
cd ~/zolo-saas
npx vercel              # First-time: OAuth login in browser
npx vercel --prod       # Deploy to production
```

Set env vars in Vercel dashboard:
- `NEXT_PUBLIC_SUPABASE_URL=https://knijcjrpmgkuwnkvgpeu.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_R1c90sEVyF6cicIDUECFAw_8qKJ7rpK`

After deploy:
1. Vercel Settings → Domains → Add `app2.zolo.sk`
2. Cloudflare DNS → CNAME `app2` → `cname.vercel-dns.com`

## Option B: Cloudflare Pages

```bash
cd ~/zolo-saas
npm install -g wrangler
npm run build
wrangler pages deploy .next
```

## Option C: Custom Docker

```dockerfile
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t zolo-saas .
docker run -p 3000:3000 -e NEXT_PUBLIC_SUPABASE_URL=... -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... zolo-saas
```

## Supabase Edge Function (Email)

```bash
# Install Supabase CLI if needed
brew install supabase/tap/supabase

cd ~/zolo-saas
supabase login
supabase link --project-ref knijcjrpmgkuwnkvgpeu
supabase functions deploy send-email --no-verify-jwt
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set EMAIL_FROM='ZOLO <noreply@zolo.sk>'

# Schedule every 2 min in Supabase Dashboard:
# Database → Cron → New job → Function: send-email → Schedule: */2 * * * *
```

## Production checklist

- [ ] Set up Resend account + verify domain `zolo.sk`
- [ ] Create Stripe account + Connect (if multi-firm)
- [ ] Configure Supabase Cron for email worker
- [ ] Add custom domain `app2.zolo.sk` to Vercel
- [ ] Test login/MFA flow
- [ ] Test invoice → email → payment link
- [ ] Test portal token expiration
- [ ] Set up Sentry for error tracking
- [ ] Set up uptime monitoring (e.g., Better Stack)
- [ ] Backup strategy (Supabase auto-backups)
- [ ] GDPR data export endpoint
- [ ] Terms of Service + Privacy Policy pages

## Monitoring

- `/api/health` — DB latency + version check
- Audit log: `/dashboard/audit`
- Email log: `email_log` table in Supabase

## Costs estimate

- **Vercel** Hobby: $0 (deploy + 100GB bandwidth)
- **Supabase** Free: $0 (500MB DB, 1GB storage, 2GB bandwidth)
- **Resend** Free: $0 (3,000 emails/mo)
- **Stripe**: 2.9% + €0.25 per successful card transaction
- **Cloudflare** zone: $0 (zolo.sk already managed)
- **Domain**: $15/yr renewal (Webhouse)

**Total monthly cost @ 50 zákazníkov × 100 faktúr**: ~$15-50/mo (Stripe transaction fees dominate)
