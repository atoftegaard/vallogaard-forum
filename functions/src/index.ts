import * as functions from 'firebase-functions/v1';
import sharp = require('sharp');
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import { environment } from '../../src/environments/environment';
import { Profile } from '../../src/app/core/models/profile.model';
import { Article } from '../../src/app/core/models/article.model';

const nodemailer = require('nodemailer');
const md5 = require( 'md5' );
const cors = require('cors')({ origin: true });

// firebase-admin's classic admin.firestore()/admin.auth() namespace API stopped reliably
// attaching via plain require('firebase-admin') under v14 - the modular getFirestore()/
// getAuth() accessors are the officially supported replacement.
initializeApp();
const db = getFirestore();
const auth = getAuth();

const RESIZE_SUFFIX = '_500x500';

// The app's own public URL for links embedded in emails. Derived from the function's own
// runtime, never from client-supplied request data - the client making the request isn't
// necessarily the same audience as the email recipient (e.g. an admin notification), and a
// URL built from unvalidated input would let a caller inject an arbitrary link into the mail.
// FUNCTIONS_EMULATOR is set by the Firebase Emulator Suite itself, not by any caller, so it's
// safe to trust for telling local testing apart from a real deployment.
const APP_BASE_URL = process.env.FUNCTIONS_EMULATOR === 'true' ? 'http://localhost:4200' : 'https://vallogaard.dk';

// Replaces the deprecated "Resize Images" Firebase Extension. Triggers on every upload;
// skips its own output (files already ending in RESIZE_SUFFIX) to avoid re-triggering itself.
// Deployed to europe-west1 because the default storage bucket is in the "eu" multi-region -
// running the function anywhere else means an unnecessary cross-region hop for every upload.
exports.resizeImage = functions.region('europe-west1').runWith({
    memory: '512MB',
    timeoutSeconds: 60,
}).storage.object().onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;

    if (!filePath || !contentType || !contentType.startsWith('image/')) {
        return null;
    }

    if (filePath.endsWith(RESIZE_SUFFIX)) {
        return null;
    }

    const bucket = getStorage().bucket(object.bucket);
    const [buffer] = await bucket.file(filePath).download();

    const resized = await sharp(buffer).resize(500, 500, { fit: 'cover' }).toBuffer();

    await bucket.file(filePath + RESIZE_SUFFIX).save(resized, {
        metadata: { contentType }
    });

    return null;
});

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

exports.deleteUserAccount = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await assertIsAdmin(context);
    const uid: string = data.uid;
    if (!uid) {
        throw new functions.https.HttpsError('invalid-argument', 'uid mangler.');
    }

    await db.collection('profiles').doc(uid).delete();
    await auth.deleteUser(uid);

    return { success: true };
});

exports.setUserDisabled = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
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

// Firestore has no visibility into Auth records at all, and the "disabled" field mirrored
// onto the profile doc can drift (e.g. applyForUser creates the Auth user as disabled but
// never sets it on the profile). This is the only way to get the real, current value.
exports.listUserAuthStatus = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    await assertIsAdmin(context);

    const result: { [uid: string]: boolean } = {};
    let pageToken: string | undefined;
    do {
        const listResult = await auth.listUsers(1000, pageToken);
        listResult.users.forEach((userRecord: any) => {
            result[userRecord.uid] = userRecord.disabled;
        });
        pageToken = listResult.pageToken;
    } while (pageToken);

    return result;
});

// Public member directory: any logged-in user (not just admins) may see the name/email/address
// of other active members. Only these three fields are ever returned - never uid, role, image,
// notification settings, etc. "Active" is checked against the real Auth record, not the
// Firestore profile's own "disabled" mirror, since that mirror is never set for users who are
// still pending admin approval (see applyForUser) and would otherwise leak their details here.
exports.listActiveMembers = functions.https.onCall(async (data: any, context: functions.https.CallableContext) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Du skal være logget ind.');
    }

    const disabledUids = new Set<string>();
    let pageToken: string | undefined;
    do {
        const listResult = await auth.listUsers(1000, pageToken);
        listResult.users.forEach((userRecord: any) => {
            if (userRecord.disabled) {
                disabledUids.add(userRecord.uid);
            }
        });
        pageToken = listResult.pageToken;
    } while (pageToken);

    const profilesSnap = await db.collection('profiles').get();
    const members: { name: string, email: string, address: string }[] = [];
    profilesSnap.forEach((doc: any) => {
        if (disabledUids.has(doc.id)) {
            return;
        }
        const profile = doc.data();
        members.push({
            name: profile.name,
            email: profile.email,
            address: profile.address
        });
    });

    return members;
});

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: environment.emailconfig.username,
        pass: environment.emailconfig.password
    }
});

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

exports.applyForUser = functions.https.onRequest((req: any, res: any) => {
    return cors(req, res, async () => {

        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }

		console.log('applyForUser called with body', JSON.stringify(req.body));

        const isHuman = await verifyRecaptcha(req.body.data.recaptchaToken);
        if (!isHuman) {
            console.log('applyForUser rejected: failed reCAPTCHA verification');
            res.status(403).send('Kunne ikke verificere at anmodningen kommer fra et menneske.');
            return;
        }

        const name = req.body.data.name;
        const email = req.body.data.email;
        const address = req.body.data.address;
        const image = 'https://www.gravatar.com/avatar/' + md5(email);

        auth.createUser({
            email: email,
            emailVerified: false,
            password: 'testtest',
            displayName: name,
            photoURL: image,
            disabled: true
          }).then((userRecord: any) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully created new user:', userRecord.uid);
            db.collection('profiles').doc(userRecord.uid).set({
                'name': name,
                'email': email,
                'address': address,
                'image': image,
                'notifyAboutNewArticles': true,
                'notifyAboutNewComments': true,
                'notifyAboutAnyComments': false,
                'shareEmail': false,
                'uid': userRecord.uid,
                'role': 'user'
              })
              .then(() => {
                console.log('profile added');
                const dest = req.body.data.destination;
                const brugereUrl = `${APP_BASE_URL}/brugere`;
                const mailOptions = {
                    from: 'Valløgård Forum <noreply@vallogaard.dk>',
                    to: dest,
                    subject: 'Anmodning om brugeroprettelse',
                    html: `Der er kommet en anmodning om brugeroprettelse fra "` + name + `" - check <a href="${brugereUrl}">${brugereUrl}</a>`
                };

                // The account and profile are already created at this point - a failed
                // notification email shouldn't make the client think registration failed.
                transporter.sendMail(mailOptions, (error: any) => {
                    if (error) {
                        console.log('sendMail error', error.toString());
                    }
                });
                return res.status(200).send({ data: 'OK' });
              })
              .catch((error: any) => {
                console.log('collection error', error);
                return res.status(500).send(error.toString());
              });
        }).catch((error: any) => {
            console.log('Error creating new user:', error);
            return res.status(500).send(error.toString());
        });
    });    
});

exports.notifyNewArticle = functions.runWith({
    enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
}).https.onRequest((req: any, res: any) => {
    return cors(req, res, () => {
        
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }
 
        const articlename = req.body.data.articlename;
        const articleurl = req.body.data.articleurl;
        const authorname = req.body.data.authorname;
        const authoruid = req.body.data.authoruid;
       
        console.log('notifyNewArticle called with body', JSON.stringify(req.body));
        
        db.collection('profiles').where('notifyAboutNewArticles', '==', true).get()
        .then((snap: any) => {
            if (snap.empty) {
                return;
            }
            snap.forEach((doc: any) => {
                let profile = doc.data() as Profile;
                if (profile.uid === authoruid) {
                    return;
                }
                const mailOptions = {
                    from: 'Valløgård Forum <noreply@vallogaard.dk>',
                    to: profile.email,
                    subject: 'Nyt opslag fra ' +  authorname,
                    html: `<p>Hej ${profile.name}</p><p>${authorname} har lavet opslaget ${articlename}, <a href="${articleurl}">klik her for at se det.</a></p>`
                };
        
                return transporter.sendMail(mailOptions, (error: any) => {
                    if(error){
                        console.log('sendMail error', error.toString());
                        return res.status(500).send(error.toString());
                    }
                    return res.status(200).send({ data: 'OK' });
                });
            });
        });
    });    
});

exports.notifyWatchers = functions.runWith({
    enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
}).https.onRequest((req: any, res: any) => {
    return cors(req, res, () => {
        
        res.set('Access-Control-Allow-Origin', "*");
        res.set('Access-Control-Allow-Methods', 'GET, POST');

        const articleSlug = req.body.data.articleSlug;
        const commentorUid = req.body.data.commentorUid;
        const articleUrl = req.body.data.articleUrl;
        const commentorName = req.body.data.commentorName;

        if(req.method !== 'POST'){
            res.status(400).send('Please send a POST request');
            return;
        }
 
        console.log('notifyWatchers called with body', JSON.stringify(req.body));
        
        db.collection('articles').doc(articleSlug).get().then((aDoc: any) => {
            if (!aDoc.exists) {
                console.log('article not found');
                return;
            }

            const article = aDoc.data() as Article;

            db.collection('profiles').where('notifyAboutNewComments', '==', true).get()
                .then((snap: any) => {
                    if (snap.empty) {
                        return;
                    }

                    snap.forEach((doc: any) => {
                        const profile = doc.data() as Profile;
                        if (profile.uid === commentorUid) {
                            return;
                        }

                        if (!(profile.uid in article.watchers)) {
                            return;
                        }

                        const mailOptions = {
                            from: 'Valløgård Forum <noreply@vallogaard.dk>',
                            to: profile.email,
                            subject: 'Ny kommentar på opslaget "' +  article.title + '"',
                            html: `<p>Hej ${profile.name}</p><p>${commentorName} har skrevet en kommentar
                            på opslaget ${article.title}, <a href="${articleUrl}">klik her for at se den.</a></p>
                            <p>Du modtager denne besked fordi du har skrevet en kommentar i samme opslag.
                            Hvis du ikke ønsker at notificeres, kan du slå det fra på opslaget ved at trykke
                            på "øjet" i toppen af siden - eller du kan redigere dine notifikationsindstillinger.</p>`
                        };

                        return transporter.sendMail(mailOptions, (error: any) => {
                            if(error){
                                console.log('sendMail error', error.toString());
                                return res.status(500).send(error.toString());
                            }
                            return res.status(200).send({ data: 'OK' });
                        });
                    });
                });
        });
    });
});