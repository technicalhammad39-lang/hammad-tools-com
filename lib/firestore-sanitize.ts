type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function sanitizeInternal(value: unknown): unknown {
  if (value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeInternal(item))
      .filter((item) => item !== undefined);
  }

  if (!isPlainObject(value)) {
    return value;
  }

  const result: PlainObject = {};
  for (const [key, nested] of Object.entries(value)) {
    const sanitized = sanitizeInternal(nested);
    if (sanitized !== undefined) {
      result[key] = sanitized;
    }
  }
  return result;
}

export function sanitizeForFirestore<T>(value: T): T {
  return sanitizeInternal(value) as T;
}

function extractFieldPathFromError(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error || '');
  const match = message.match(/found in field ([^ )\n]+)/i);
  return match?.[1] || null;
}

function findMediaFields(payload: PlainObject) {
  return Object.keys(payload).filter((key) => /(?:image|thumbnail|banner|attachment)Media$/i.test(key));
}

export function logFirestoreSaveFailure(params: {
  scope: string;
  collection: string;
  payload: PlainObject | null;
  sanitized: boolean;
  error: unknown;
}) {
  const fieldPath = extractFieldPathFromError(params.error);
  const topLevelField = fieldPath ? fieldPath.split('.')[0] : null;
  const payload = params.payload || {};
  const mediaFields = findMediaFields(payload);

  console.error('[admin-content-save] Firestore write failed', {
    scope: params.scope,
    collection: params.collection,
    error: params.error instanceof Error ? params.error.message : String(params.error),
    fieldPath,
    topLevelField,
    mediaMetadataPresent: mediaFields.length > 0,
    mediaFields,
    payloadKeys: Object.keys(payload),
    payloadSanitized: params.sanitized,
  });
}
