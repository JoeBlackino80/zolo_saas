export async function GET() {
  const base = 'https://zolo.sk';
  const today = new Date().toISOString().slice(0, 10);
  const pages = [
    { loc: '', priority: '1.0' },
    { loc: '/login', priority: '0.9' },
    { loc: '/terms', priority: '0.5' },
    { loc: '/privacy', priority: '0.5' },
    { loc: '/cookies', priority: '0.3' },
    { loc: '/contact', priority: '0.7' },
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>
    <loc>${base}${p.loc}</loc>
    <lastmod>${today}</lastmod>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
