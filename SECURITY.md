# Security Policy

## Reporting a Vulnerability

If you have discovered a security vulnerability in ZOLO (`zolo.sk`, `app.zolo.sk`, or the source code in this repository), please report it responsibly.

**Do NOT** open a public GitHub issue. Instead, email:

- **security@zolo.sk** (primary)
- **privacy@zolo.sk** (data protection issues)

Include in your report:

1. A description of the vulnerability and its potential impact
2. Steps to reproduce (proof of concept if possible)
3. Affected URL(s), endpoint(s), or component(s)
4. Your contact information (so we can follow up)

We aim to:

- Acknowledge your report within **48 hours**
- Provide an initial assessment within **5 business days**
- Keep you informed throughout the resolution process
- Credit you in our security advisories (with your permission)

## In Scope

- `zolo.sk` (marketing/landing)
- `app.zolo.sk` (dashboard / API)
- Source code in `JoeBlackino80/zolo_saas`
- Supabase Edge Functions used by the platform

## Out of Scope

- Third-party services we use (Supabase, Vercel, Resend, Stripe, Cloudflare, Upstash, Sentry, Better Stack) — please report directly to their security teams.
- Social engineering of ZOLO employees or customers
- Physical attacks
- DDoS / volumetric attacks
- Findings only exploitable with already-compromised user devices

## Safe Harbor

We will not pursue legal action against good-faith security researchers who:

- Make a reasonable effort to avoid privacy violations, data destruction, and service disruption
- Do not exploit the vulnerability beyond what is necessary to demonstrate it
- Give us reasonable time to fix the issue before public disclosure (we aim for 90 days)
- Do not attempt to access, modify, or exfiltrate data of other users

## Hall of Fame

Researchers who report valid vulnerabilities and follow this policy will be acknowledged here (with their permission).

_None yet — be the first._
