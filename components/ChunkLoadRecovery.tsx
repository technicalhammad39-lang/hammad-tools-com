'use client';

import { useEffect } from 'react';

const RECOVERY_FLAG = 'hammad_tools_chunk_recovery_once';

function shouldRecoverFromMessage(message: string) {
  const normalized = (message || '').toLowerCase();
  return (
    normalized.includes('chunkloaderror') ||
    normalized.includes('loading chunk') ||
    normalized.includes('failed to fetch dynamically imported module') ||
    normalized.includes('importing a module script failed')
  );
}

export default function ChunkLoadRecovery() {
  useEffect(() => {
    function tryRecover(reason: unknown) {
      const message =
        typeof reason === 'string'
          ? reason
          : (reason as any)?.message || (reason as any)?.reason?.message || '';

      if (!shouldRecoverFromMessage(String(message))) {
        return;
      }

      const alreadyRecovered = sessionStorage.getItem(RECOVERY_FLAG) === '1';
      if (alreadyRecovered) {
        sessionStorage.removeItem(RECOVERY_FLAG);
        return;
      }

      sessionStorage.setItem(RECOVERY_FLAG, '1');
      window.location.reload();
    }

    function onError(event: ErrorEvent) {
      tryRecover(event.error || event.message);
    }

    function onUnhandledRejection(event: PromiseRejectionEvent) {
      tryRecover(event.reason);
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
    };
  }, []);

  return null;
}

