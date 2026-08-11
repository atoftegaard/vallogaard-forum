import * as functions from 'firebase-functions/v1';
import { db } from './firebase-admin';
import { transporter } from './mailer';
import { corsHandler, requirePostMethod, setCorsResponseHeaders } from './cors';
import { Profile } from '../../shared/models/profile.model';
import { Article } from '../../shared/models/article.model';

// Promise wrapper around nodemailer's callback API so callers can just await it in a loop -
// a send failure is only ever logged, never rejects, since one recipient's bounce shouldn't
// stop the rest of the notification run.
function sendMailLogged(mailOptions: any): Promise<void> {
    return new Promise(resolve => {
        transporter.sendMail(mailOptions, (error: any) => {
            if (error) {
                console.log('sendMail error', error.toString());
            }
            resolve();
        });
    });
}

export const notifyNewArticle = functions.runWith({
    enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
}).https.onRequest((req: any, res: any) => {
    return corsHandler(req, res, async () => {
        setCorsResponseHeaders(res);
        if (!requirePostMethod(req, res)) {
            return;
        }

        const { articlename, articleurl, authorname, authoruid } = req.body.data;
        console.log('notifyNewArticle called with body', JSON.stringify(req.body));

        const snap = await db.collection('profiles').where('notifyAboutNewArticles', '==', true).get();
        for (const doc of snap.docs) {
            const profile = doc.data() as Profile;
            if (profile.uid === authoruid) {
                continue;
            }

            await sendMailLogged({
                from: 'Valløgård Forum <noreply@vallogaard.dk>',
                to: profile.email,
                subject: 'Nyt opslag fra ' + authorname,
                html: `<p>Hej ${profile.name}</p><p>${authorname} har lavet opslaget ${articlename}, <a href="${articleurl}">klik her for at se det.</a></p>`
            });
        }

        res.status(200).send({ data: 'OK' });
    });
});

export const notifyWatchers = functions.runWith({
    enforceAppCheck: true, // Reject requests with missing or invalid App Check tokens.
}).https.onRequest((req: any, res: any) => {
    return corsHandler(req, res, async () => {
        setCorsResponseHeaders(res);
        if (!requirePostMethod(req, res)) {
            return;
        }

        const { articleSlug, commentorUid, articleUrl, commentorName } = req.body.data;
        console.log('notifyWatchers called with body', JSON.stringify(req.body));

        const articleDoc = await db.collection('articles').doc(articleSlug).get();
        if (!articleDoc.exists) {
            console.log('article not found');
            res.status(200).send({ data: 'OK' });
            return;
        }
        const article = articleDoc.data() as Article;

        const snap = await db.collection('profiles').where('notifyAboutNewComments', '==', true).get();
        for (const doc of snap.docs) {
            const profile = doc.data() as Profile;
            if (profile.uid === commentorUid || !(profile.uid in article.watchers)) {
                continue;
            }

            await sendMailLogged({
                from: 'Valløgård Forum <noreply@vallogaard.dk>',
                to: profile.email,
                subject: 'Ny kommentar på opslaget "' + article.title + '"',
                html: `<p>Hej ${profile.name}</p><p>${commentorName} har skrevet en kommentar
                på opslaget ${article.title}, <a href="${articleUrl}">klik her for at se den.</a></p>
                <p>Du modtager denne besked fordi du har skrevet en kommentar i samme opslag.
                Hvis du ikke ønsker at notificeres, kan du slå det fra på opslaget ved at trykke
                på "øjet" i toppen af siden - eller du kan redigere dine notifikationsindstillinger.</p>`
            });
        }

        res.status(200).send({ data: 'OK' });
    });
});
