import * as functions from 'firebase-functions/v1';
import { db, auth } from './firebase-admin';
import { transporter } from './mailer';
import { corsHandler, requirePostMethod, setCorsResponseHeaders } from './cors';

const md5 = require('md5');

// The app's own public URL for links embedded in emails. Derived from the function's own
// runtime, never from client-supplied request data - the client making the request isn't
// necessarily the same audience as the email recipient (e.g. an admin notification), and a
// URL built from unvalidated input would let a caller inject an arbitrary link into the mail.
// FUNCTIONS_EMULATOR is set by the Firebase Emulator Suite itself, not by any caller, so it's
// safe to trust for telling local testing apart from a real deployment.
const APP_BASE_URL = process.env.FUNCTIONS_EMULATOR === 'true' ? 'http://localhost:4200' : 'https://vallogaard.dk';

const RECAPTCHA_SCORE_THRESHOLD = 0.5;

// enforceAppCheck (previously set on this function) only works for callable (onCall) functions,
// not plain onRequest ones like this - it was silently doing nothing, which is why bots kept
// getting through despite it being present. reCAPTCHA v3 verification below is what actually
// gates this endpoint: it checks a per-request token against Google, scoring bot-likelihood.
async function verifyRecaptcha(token: string): Promise<boolean> {
    if (!token) {
        return false;
    }
    const secret = process.env.RECAPTCHA_SECRET_KEY;
    if (!secret) {
        console.error('RECAPTCHA_SECRET_KEY is not configured');
        return false;
    }

    const params = new URLSearchParams({ secret, response: token });
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        body: params
    });
    const result: any = await response.json();

    return result.success === true
        && result.action === 'apply_for_user'
        && typeof result.score === 'number'
        && result.score >= RECAPTCHA_SCORE_THRESHOLD;
}

// Creates the (disabled) Auth account and its Firestore profile. Throws on failure - the two
// steps keep their own try/catch so the original "Error creating new user" vs "collection error"
// log distinction survives, which is the only thing that tells you which one actually failed.
async function createUserAccount(name: string, email: string, address: string): Promise<void> {
    const image = 'https://www.gravatar.com/avatar/' + md5(email);

    let userRecord: any;
    try {
        userRecord = await auth.createUser({
            email,
            emailVerified: false,
            password: 'testtest',
            displayName: name,
            photoURL: image,
            disabled: true
        });
        console.log('Successfully created new user:', userRecord.uid);
    } catch (error: any) {
        console.log('Error creating new user:', error);
        throw error;
    }

    try {
        await db.collection('profiles').doc(userRecord.uid).set({
            name,
            email,
            address,
            image,
            notifyAboutNewArticles: true,
            notifyAboutNewComments: true,
            notifyAboutAnyComments: false,
            shareEmail: false,
            uid: userRecord.uid,
            role: 'user'
        });
        console.log('profile added');
    } catch (error: any) {
        console.log('collection error', error);
        throw error;
    }
}

// Recipients are looked up server-side, not taken from the request - the same reasoning as
// APP_BASE_URL above: a client-supplied "destination" would let a caller redirect this
// notification to an arbitrary address instead of the admins.
async function notifyAdminsOfApplication(name: string): Promise<void> {
    const adminsSnap = await db.collection('profiles').where('role', '==', 'admin').get();
    const adminEmails = adminsSnap.docs.map((doc: any) => doc.data().email).filter(Boolean);

    if (adminEmails.length === 0) {
        console.log('applyForUser: no admins with an email to notify');
        return;
    }

    const brugereUrl = `${APP_BASE_URL}/brugere`;
    const mailOptions = {
        from: 'Valløgård Forum <noreply@vallogaard.dk>',
        to: adminEmails,
        subject: 'Anmodning om brugeroprettelse',
        html: `Der er kommet en anmodning om brugeroprettelse fra "` + name + `" - check <a href="${brugereUrl}">${brugereUrl}</a>`
    };

    transporter.sendMail(mailOptions, (error: any) => {
        if (error) {
            console.log('sendMail error', error.toString());
        }
    });
}

export const applyForUser = functions.https.onRequest((req: any, res: any) => {
    return corsHandler(req, res, async () => {
        setCorsResponseHeaders(res);
        if (!requirePostMethod(req, res)) {
            return;
        }

        console.log('applyForUser called with body', JSON.stringify(req.body));

        const isHuman = await verifyRecaptcha(req.body.data.recaptchaToken);
        if (!isHuman) {
            console.log('applyForUser rejected: failed reCAPTCHA verification');
            res.status(403).send('Kunne ikke verificere at anmodningen kommer fra et menneske.');
            return;
        }

        const { name, email, address } = req.body.data;

        try {
            await createUserAccount(name, email, address);
        } catch (error: any) {
            res.status(500).send(error.toString());
            return;
        }

        // The account and profile are already created at this point - a failed notification
        // email shouldn't make the client think registration failed, so this isn't awaited
        // and its own failures never affect the response below.
        notifyAdminsOfApplication(name).catch((error: any) => {
            console.log('applyForUser: failed to notify admins', error.toString());
        });

        res.status(200).send({ data: 'OK' });
    });
});
