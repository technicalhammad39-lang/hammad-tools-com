import { NextResponse } from 'next/server';
import { requireStaff } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import {
  getUploadRuntimeDiagnostics,
  isUploadDebugEnabled,
  toPublicUrl,
} from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const decoded = await requireStaff(request);
    const diagnostics = await getUploadRuntimeDiagnostics({
      ensureDirectories: true,
      attemptWriteTest: true,
    });

    if (isUploadDebugEnabled()) {
      console.info('[upload][diagnostics] requested by staff', {
        uid: decoded.uid,
        email: decoded.email || '',
        diagnostics,
      });
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        ...diagnostics,
        publicBaseUrl: toPublicUrl(request, diagnostics.uploadPublicBasePath),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
