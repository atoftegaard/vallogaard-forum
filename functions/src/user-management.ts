import * as functions from 'firebase-functions/v1';
import { db, auth } from './firebase-admin';

// Client-side role checks (and even Firestore rules) only gate the UI/database - these
// functions run with the Admin SDK, so they must independently verify the caller is an
// admin before touching another user's Auth account.
async function assertIsAdmin(context: functions.https.CallableContext) {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Du skal være logget ind.');
    }
    const callerProfile = await db.collection('profiles').doc(context.auth.uid).get();
    if (!callerProfile.exists || callerProfile.data()?.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Kun administratorer kan udføre denne handling.');
    }
}

// auth.listUsers() is paginated at up to 1000 users per call - this walks every page and
// returns the full list, since every caller in this file needs the complete user set.
async function listAllAuthUsers(): Promise<any[]> {
    const users: any[] = [];
    let pageToken: string | undefined;
    do {
        const listResult = await auth.listUsers(1000, pageToken);
        users.push(...listResult.users);
        pageToken = listResult.pageToken;
    } while (pageToken);
    return users;
}

export const deleteUserAccount = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await assertIsAdmin(context);
    const uid: string = data.uid;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'uid mangler.');
    }

    await db.collection('profiles').doc(uid).delete();
    await auth.deleteUser(uid);

    return { success: true };
});

export const setUserDisabled = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await assertIsAdmin(context);
    const uid: string = data.uid;
    const disabled: boolean = !!data.disabled;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'uid mangler.');
    }

    await auth.updateUser(uid, { disabled });
    await db.collection('profiles').doc(uid).update({ disabled });

    return { success: true };
});

export const setUserRole = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await assertIsAdmin(context);
    const uid: string = data.uid;
    const role: string = data.role;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'uid mangler.');
    }
    if (role !== 'admin' && role !== 'user') {
        throw new functions.https.HttpsError('invalid-argument', 'role skal være "admin" eller "user".');
    }
    // Without this check an admin could remove their own admin role and lock everyone
    // (including themselves) out of the /brugere page, since AdminGuard requires it.
    if (uid === context.auth!.uid) {
        throw new functions.https.HttpsError('failed-precondition', 'Du kan ikke ændre din egen rolle.');
    }

    await db.collection('profiles').doc(uid).update({ role });

    return { success: true };
});

// Firestore has no visibility into Auth records at all, and the "disabled" field mirrored
// onto the profile doc can drift (e.g. applyForUser creates the Auth user as disabled but
// never sets it on the profile). This is the only way to get the real, current value.
export const listUserAuthStatus = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await assertIsAdmin(context);

    const result: { [uid: string]: boolean } = {};
    for (const user of await listAllAuthUsers()) {
        result[user.uid] = user.disabled;
    }
    return result;
});

// Public member directory: any logged-in user (not just admins) may see the name/email/address
// of other active members. Only these three fields are ever returned - never uid, role, image,
// notification settings, etc. "Active" is checked against the real Auth record, not the
// Firestore profile's own "disabled" mirror, since that mirror is never set for users who are
// still pending admin approval (see applyForUser) and would otherwise leak their details here.
export const listActiveMembers = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Du skal være logget ind.');
    }

    const disabledUids = new Set(
        (await listAllAuthUsers()).filter(user => user.disabled).map(user => user.uid)
    );

    const profilesSnap = await db.collection('profiles').get();
    return profilesSnap.docs
        .filter(doc => !disabledUids.has(doc.id))
        .map(doc => {
            const profile = doc.data();
            return { name: profile.name, email: profile.email, address: profile.address };
        });
});
