import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type CspReport = {
  'csp-report'?: {
    'document-uri'?: string;
    'blocked-uri'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'source-file'?: string;
    'line-number'?: number;
    'script-sample'?: string;
  };
};

export async function POST(request: Request) {
  let body: CspReport = {};
  try {
    body = (await request.json()) as CspReport;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const report = body['csp-report'];
  if (!report) return NextResponse.json({ ok: false }, { status: 400 });

  const directive = report['violated-directive'] || report['effective-directive'] || 'unknown';
  const blocked = report['blocked-uri'] || 'unknown';

  Sentry.captureMessage(`CSP violation: ${directive} blocked ${blocked}`, {
    level: 'warning',
    tags: {
      type: 'csp_violation',
      directive,
    },
    extra: {
      document: report['document-uri'],
      blocked,
      directive,
      sourceFile: report['source-file'],
      lineNumber: report['line-number'],
      sample: report['script-sample'],
    },
  });

  return NextResponse.json({ ok: true });
}
