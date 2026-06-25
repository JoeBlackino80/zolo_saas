import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ZOLO — Slovak Tax & Accounting';
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
          background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)',
          fontFamily: 'sans-serif',
          padding: 64,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 28,
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 96,
            fontWeight: 900,
            color: '#3b82f6',
            boxShadow: '0 30px 60px rgba(0,0,0,0.15)',
          }}
        >
          Z
        </div>
        <div style={{ color: 'white', fontSize: 96, fontWeight: 900, marginTop: 40, letterSpacing: -2 }}>
          ZOLO
        </div>
        <div style={{ color: 'rgba(255,255,255,0.95)', fontSize: 36, marginTop: 8, fontWeight: 600 }}>
          Účtovníctvo · Fakturácia · DPH · Mzdy
        </div>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 26, marginTop: 36 }}>
          Cloud-first pre slovenský trh · zolo.sk
        </div>
      </div>
    ),
    size,
  );
}
