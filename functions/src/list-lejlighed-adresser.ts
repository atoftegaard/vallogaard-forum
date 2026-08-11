import * as functions from 'firebase-functions/v1';
import { db } from './firebase-admin';
import { corsHandler, requirePostMethod, setCorsResponseHeaders } from './cors';

// Public and unauthenticated on purpose - this feeds the address dropdown on /register,
// which runs before the visitor has any Firebase Auth session, so it can't go through the
// normal authenticated Firestore read the rest of the app uses for lejligheder. Only
// nummer/adresse are ever returned here - never beboere/telefonnummer/email, which are
// private (Firestore security rules can't restrict which fields a read returns, only
// whether the read is allowed at all, which is why this needs its own endpoint).
export const listLejlighedAdresser = functions.https.onRequest((req: any, res: any) => {
    return corsHandler(req, res, async () => {
        setCorsResponseHeaders(res);
        if (!requirePostMethod(req, res)) {
            return;
        }

        const snap = await db.collection('lejligheder').get();
        const adresser = snap.docs
            .map((doc: any) => doc.data())
            .map((data: any) => ({ nummer: data.nummer as string, adresse: data.adresse as string }))
            .sort((a: any, b: any) => a.adresse.localeCompare(b.adresse, 'da'));

        res.status(200).send({ data: adresser });
    });
});
