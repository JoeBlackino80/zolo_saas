import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ZOLO — Cenník';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: '#09090b',
          fontFamily: 'sans-serif',
          padding: 80,
          color: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 900,
              color: '#09090b',
              letterSpacing: -1,
            }}
          >
            Z
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>ZOLO</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 28, color: '#71717a', fontWeight: 500, marginBottom: 8 }}>Začni zadarmo.</div>
          <div style={{ fontSize: 100, fontWeight: 800, letterSpacing: -4, lineHeight: 0.95 }}>Vyber si plán.</div>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {['Free · €0', 'Pro · €15', 'Business · €49'].map((t) => (
            <div
              key={t}
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: '#fff',
                padding: '12px 22px',
                borderRadius: 999,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
