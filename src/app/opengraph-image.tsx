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
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: '#fff',
          fontFamily: 'sans-serif',
          padding: 80,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: '#09090b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 36,
              fontWeight: 900,
              color: '#fff',
              letterSpacing: -1,
            }}
          >
            Z
          </div>
          <div style={{ fontSize: 28, fontWeight: 600, color: '#09090b', letterSpacing: -0.5 }}>ZOLO</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              color: '#09090b',
              fontSize: 100,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 0.95,
            }}
          >
            Účtovníctvo,
          </div>
          <div
            style={{
              color: '#a1a1aa',
              fontSize: 100,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 0.95,
            }}
          >
            znovu navrhnuté.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-end' }}>
          <div style={{ color: '#71717a', fontSize: 22, fontWeight: 500 }}>
            Fakturácia · DPH · Mzdy · Cloud-first pre slovenský trh
          </div>
          <div style={{ color: '#a1a1aa', fontSize: 20, fontWeight: 500 }}>zolo.sk</div>
        </div>
      </div>
    ),
    size,
  );
}
