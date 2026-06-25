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
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          fontFamily: 'sans-serif',
          padding: 64,
        }}
      >
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 24, fontWeight: 600, letterSpacing: 4, textTransform: 'uppercase' }}>
          ZOLO Cenník
        </div>
        <div style={{ color: 'white', fontSize: 88, fontWeight: 900, marginTop: 20, letterSpacing: -2 }}>
          Od €4,99 / mesiac
        </div>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 32, marginTop: 16 }}>
          Free · Pro · Business
        </div>
        <div
          style={{
            display: 'flex',
            gap: 16,
            marginTop: 56,
          }}
        >
          {['DPH XML', 'Mzdy 2026', 'eDane', 'Stripe', 'Multi-firma'].map((t) => (
            <div
              key={t}
              style={{
                background: 'rgba(255,255,255,0.1)',
                color: 'white',
                padding: '12px 20px',
                borderRadius: 999,
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 22, marginTop: 64 }}>
          zolo.sk
        </div>
      </div>
    ),
    size,
  );
}
