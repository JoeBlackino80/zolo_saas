export async function GET() {
  const body = `User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /api/
Disallow: /portal/
Disallow: /onboarding/

Sitemap: https://zolo.sk/sitemap.xml
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}
