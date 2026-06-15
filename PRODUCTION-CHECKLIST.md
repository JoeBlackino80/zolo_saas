# ZOLO Production Checklist

## ✅ Already done

- [x] Next.js 16 app deployed to Vercel (`https://app2.zolo.sk`)
- [x] Supabase project active (`knijcjrpmgkuwnkvgpeu` — "invoice")
- [x] 91 cloud tables with RLS enabled
- [x] `team_invitations` table migration applied
- [x] Cloud-first architecture (no localStorage data leaks)
- [x] MFA TOTP working
- [x] Edge function `send-email` deployed
- [x] pg_cron schedule `*/2 * * * *` for email worker
- [x] CF DNS verification + CNAME for `app2.zolo.sk`
- [x] SSL cert auto-issued by Vercel
- [x] HSTS enabled
- [x] Custom domain verified

## ⏳ External integrations needed

### Email (Resend)
- [ ] Create Resend account at resend.com
- [ ] Add `zolo.sk` domain in Resend
- [ ] Add Resend DNS records (MX, SPF, DKIM) to Cloudflare zolo.sk zone
- [ ] Wait for Resend verification (~30 min)
- [ ] Create API key in Resend dashboard
- [ ] Set Supabase secret: `RESEND_API_KEY=re_xxx`
- [ ] Set Supabase secret: `EMAIL_FROM='ZOLO <noreply@zolo.sk>'`
- [ ] Test: queue email in `email_queue` table → verify it sends

### Stripe (per-firm)
- [ ] User creates Stripe account at stripe.com
- [ ] Goes to Dashboard → API Keys → copies Secret key
- [ ] In ZOLO: Nastavenia → Platby → vyber firmu → vlož kľúč
- [ ] Repeat for each firm
- [ ] Configure Stripe webhook URL: `https://app2.zolo.sk/api/stripe/webhook`
- [ ] Add webhook events: `checkout.session.completed`, `payment_intent.succeeded`
- [ ] Copy webhook signing secret → set as env var `STRIPE_WEBHOOK_SECRET`
- [ ] Test: Create FA → Generate payment link → Pay test card → mark paid auto

### Monitoring & ops
- [ ] Sentry account → install `@sentry/nextjs` → wire DSN
- [ ] Better Stack / Uptime Robot → ping `/api/health` every minute
- [ ] Slack webhook for `email_queue.failed` rows (optional)

### Legal
- [ ] Terms of Service page (`/terms`)
- [ ] Privacy Policy page (`/privacy`)
- [ ] Cookie banner if needed (GDPR)
- [ ] DPA (Data Processing Agreement) — Supabase has standard one, link to it
- [ ] Update GDPR export endpoint (already exists but verify completeness)

### Marketing
- [ ] Add Google Analytics or Plausible
- [ ] Open Graph metadata for landing page
- [ ] Sitemap.xml
- [ ] robots.txt

## Cost estimate (50 zákazníkov × 100 FA/mes)

| Service | Cost |
|---------|------|
| **Vercel** Hobby | $0 |
| **Supabase** Free | $0 (do 500MB DB) |
| **Resend** Free | $0 (3 000 emailov/mes) |
| **Stripe** | 2.9% + €0.25 per transaction |
| **Cloudflare** | $0 |
| **Domain** zolo.sk | €15/rok |
| **Total** | ~€15/mes + Stripe poplatky |

Pri škálovaní:
- Supabase Pro: $25/mes (8GB DB)
- Vercel Pro: $20/mes (1TB bandwidth)
- Resend Pro: $20/mes (50 000 emailov)

## Backup strategy

- **Supabase** robí automatické daily backupy (7 dní v free, 28 v Pro)
- Manual SQL export: `supabase db dump` ak treba
- Vercel deployment history: rollback v 1 kliku
- Git: všetko v repo `~/zolo-saas/.git`

## Disaster recovery

- Server down → Vercel automaticky failover medzi regiónami
- DB down → Supabase ti zavolá (Pro plan)
- Data corruption → restore from automatic backup
- Code regression → `vercel rollback`

## Security

- [x] HTTPS-only (HSTS)
- [x] MFA TOTP available
- [x] RLS na všetkých tabuľkách
- [x] Secrets v Vercel encrypted env vars
- [x] Token-based portal links (32-char crypto random)
- [ ] CSP headers (TODO: add to next.config.js)
- [ ] Rate limiting on API routes (TODO: add via `@vercel/edge-config`)
- [ ] Add `@upstash/ratelimit` for `/api/send-invoice`
