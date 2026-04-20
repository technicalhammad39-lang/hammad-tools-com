import { NextResponse } from 'next/server';
import { constants as fsConstants } from 'fs';
import { access, unlink } from 'fs/promises';
import { adminAuth, adminDb, adminFieldValue } from '@/lib/server/firebase-admin';
import { requireAdmin } from '@/lib/server/auth';
import { ApiError, jsonError } from '@/lib/server/http';
import { getAbsoluteFilePathFromStoragePath, resolveAccessForMedia } from '@/lib/server/local-upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type AllowedRole = 'admin' | 'manager' | 'user';
type SupportedAction = 'set-role' | 'set-ban';

const SUPER_ADMIN_EMAIL = 'technicalhammad39@gmail.com';
const DELETE_BATCH_SIZE = 350;

function sanitizeText(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function normalizeRole(value: unknown): AllowedRole | null {
  if (value === 'admin' || value === 'manager' || value === 'user') {
    return value;
  }
  if (value === 'Admin') {
    return 'admin';
  }
  if (value === 'Manager' || value === 'staff' || value === 'Staff') {
    return 'manager';
  }
  if (value === 'User') {
    return 'user';
  }
  return null;
}

function isAuthUserMissingError(error: unknown) {
  const code = String((error as any)?.code || '').toLowerCase();
  return code.includes('auth/user-not-found');
}

function assertValidUserId(userId: string) {
  const safeUserId = decodeURIComponent(userId || '').trim();
  if (!safeUserId) {
    throw new ApiError(400, 'User ID is required.');
  }
  return safeUserId;
}

async function countAdminUsers(excludeUid?: string) {
  const snapshot = await adminDb.collection('users').where('role', 'in', ['admin', 'Admin']).get();
  return snapshot.docs.filter((doc) => doc.id !== excludeUid).length;
}

async function assertNotLastAdmin(targetUid: string, targetRole: AllowedRole, targetEmail: string) {
  const isSuperAdmin = targetEmail.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
  if (isSuperAdmin) {
    throw new ApiError(403, 'Super admin account cannot be modified.');
  }

  if (targetRole !== 'admin') {
    return;
  }

  const adminsRemaining = await countAdminUsers(targetUid);
  if (adminsRemaining < 1) {
    throw new ApiError(409, 'Cannot modify the last admin account.');
  }
}

async function readTargetUser(targetUid: string) {
  const userRef = adminDb.collection('users').doc(targetUid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    throw new ApiError(404, 'User profile not found.');
  }

  const userData = userSnap.data() as Record<string, unknown>;
  return {
    ref: userRef,
    data: userData,
    email: sanitizeText(userData.email, 320).toLowerCase(),
    role: normalizeRole(userData.role) || 'user',
    banned: Boolean(userData.banned),
  };
}

async function updateRole(targetUid: string, requestedRole: unknown, actorUid: string) {
  const role = normalizeRole(requestedRole);
  if (!role) {
    throw new ApiError(400, 'Invalid role. Allowed: admin, manager, user.');
  }

  const target = await readTargetUser(targetUid);
  await assertNotLastAdmin(targetUid, target.role, target.email);

  await target.ref.set(
    {
      role,
      updatedAt: adminFieldValue.serverTimestamp(),
      updatedByAdminId: actorUid,
    },
    { merge: true }
  );

  try {
    const authUser = await adminAuth.getUser(targetUid);
    await adminAuth.setCustomUserClaims(targetUid, {
      ...(authUser.customClaims || {}),
      role,
      banned: target.banned,
    });
  } catch (error) {
    if (!isAuthUserMissingError(error)) {
      throw error;
    }
  }

  return {
    uid: targetUid,
    role,
  };
}

async function setBanState(targetUid: string, requestedBanned: unknown, actorUid: string) {
  if (typeof requestedBanned !== 'boolean') {
    throw new ApiError(400, 'banned must be true or false.');
  }

  const banned = requestedBanned;
  const target = await readTargetUser(targetUid);
  await assertNotLastAdmin(targetUid, target.role, target.email);

  await target.ref.set(
    {
      banned,
      bannedAt: banned ? adminFieldValue.serverTimestamp() : null,
      bannedByAdminId: banned ? actorUid : null,
      updatedAt: adminFieldValue.serverTimestamp(),
      updatedByAdminId: actorUid,
    },
    { merge: true }
  );

  try {
    const authUser = await adminAuth.getUser(targetUid);
    await adminAuth.updateUser(targetUid, { disabled: banned });
    await adminAuth.setCustomUserClaims(targetUid, {
      ...(authUser.customClaims || {}),
      role: target.role,
      banned,
    });
    if (banned) {
      await adminAuth.revokeRefreshTokens(targetUid);
    }
  } catch (error) {
    if (!isAuthUserMissingError(error)) {
      throw error;
    }
  }

  return {
    uid: targetUid,
    banned,
  };
}

async function deleteMatchingDocuments(queryBuilder: () => any) {
  let deletedCount = 0;
  while (true) {
    const snapshot = await queryBuilder().limit(DELETE_BATCH_SIZE).get();
    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    deletedCount += snapshot.size;
    if (snapshot.size < DELETE_BATCH_SIZE) {
      break;
    }
  }
  return deletedCount;
}

async function deleteOwnedMediaFiles(targetUid: string) {
  let docsDeleted = 0;
  let filesDeleted = 0;
  let fileDeleteErrors = 0;

  while (true) {
    const snapshot = await adminDb
      .collection('media_files')
      .where('ownerId', '==', targetUid)
      .limit(DELETE_BATCH_SIZE)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = adminDb.batch();
    for (const mediaDoc of snapshot.docs) {
      const data = mediaDoc.data() as Record<string, unknown>;
      const storagePath = sanitizeText(data.storagePath, 800);

      if (storagePath) {
        try {
          const accessType = resolveAccessForMedia({
            access: sanitizeText(data.access, 40),
            folder: sanitizeText(data.folder, 80),
          });
          const absolutePath = getAbsoluteFilePathFromStoragePath(storagePath, accessType);
          await access(absolutePath, fsConstants.F_OK);
          await unlink(absolutePath);
          filesDeleted += 1;
        } catch (error: any) {
          if (error?.code !== 'ENOENT') {
            fileDeleteErrors += 1;
          }
        }
      }

      batch.delete(mediaDoc.ref);
      docsDeleted += 1;
    }

    await batch.commit();

    if (snapshot.size < DELETE_BATCH_SIZE) {
      break;
    }
  }

  return {
    mediaFilesDeleted: docsDeleted,
    mediaFilesRemovedFromDisk: filesDeleted,
    mediaFileDeleteErrors: fileDeleteErrors,
  };
}

async function deleteUser(targetUid: string, actorUid: string) {
  const target = await readTargetUser(targetUid);
  await assertNotLastAdmin(targetUid, target.role, target.email);

  const mediaCleanup = await deleteOwnedMediaFiles(targetUid);

  const cleanupStats = {
    ...mediaCleanup,
    notificationsDeleted: await deleteMatchingDocuments(() =>
      adminDb.collection('notifications').where('recipientId', '==', targetUid)
    ),
    pushTokensDeleted: await deleteMatchingDocuments(() =>
      adminDb.collection('push_tokens').where('userId', '==', targetUid)
    ),
    serviceActivationsDeleted: await deleteMatchingDocuments(() =>
      adminDb.collection('service_activations').where('userId', '==', targetUid)
    ),
    userEntriesDeleted: await deleteMatchingDocuments(() =>
      adminDb.collection('user_entries').where('userId', '==', targetUid)
    ),
    giveawayEntriesDeleted: await deleteMatchingDocuments(() =>
      adminDb.collectionGroup('entries').where('userId', '==', targetUid)
    ),
    giveawayCommentsDeleted: await deleteMatchingDocuments(() =>
      adminDb.collectionGroup('comments').where('userId', '==', targetUid)
    ),
  };

  await target.ref.delete();

  try {
    await adminAuth.deleteUser(targetUid);
  } catch (error) {
    if (!isAuthUserMissingError(error)) {
      throw error;
    }
  }

  await adminDb.collection('admin_audit_logs').add({
    type: 'user_delete',
    targetUid,
    actorUid,
    createdAt: adminFieldValue.serverTimestamp(),
    cleanupStats,
  });

  return cleanupStats;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    const { userId } = await context.params;
    const targetUid = assertValidUserId(userId);
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = sanitizeText(body.action, 30) as SupportedAction;

    if (targetUid === decoded.uid) {
      throw new ApiError(403, 'You cannot modify your own admin account from this action.');
    }

    if (action === 'set-role') {
      const result = await updateRole(targetUid, body.role, decoded.uid);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'set-ban') {
      const result = await setBanState(targetUid, body.banned, decoded.uid);
      return NextResponse.json({ success: true, result });
    }

    throw new ApiError(400, 'Unsupported action.');
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const decoded = await requireAdmin(request);
    const { userId } = await context.params;
    const targetUid = assertValidUserId(userId);

    if (targetUid === decoded.uid) {
      throw new ApiError(403, 'You cannot delete your own admin account.');
    }

    const cleanupStats = await deleteUser(targetUid, decoded.uid);
    return NextResponse.json({
      success: true,
      deleted: {
        uid: targetUid,
        cleanupStats,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
