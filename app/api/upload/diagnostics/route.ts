import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { jsonError } from '@/lib/server/http';
import { getFirebaseAdminInitDiagnostics } from '@/lib/server/firebase-admin';
import {
  getUploadRuntimeDiagnostics,
  isUploadDebugEnabled,
  toPublicUrl,
} from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const firebaseAdmin = getFirebaseAdminInitDiagnostics();
    const decoded = await requireAdmin(request);
    const diagnostics = await getUploadRuntimeDiagnostics({
      ensureDirectories: true,
      attemptWriteTest: true,
    });

    if (isUploadDebugEnabled()) {
      console.info('[upload][diagnostics] requested by staff', {
        uid: decoded.uid,
        email: decoded.email || '',
        firebaseAdmin,
        diagnostics,
      });
    }

    return NextResponse.json({
      success: true,
      diagnostics: {
        firebaseAdmin,
        ...diagnostics,
        publicBaseUrl: toPublicUrl(request, diagnostics.uploadPublicBasePath),
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
