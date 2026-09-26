import { onRequest } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { auth, db } from './firebase-admin';
import {
    buildContentDisposition, extensionForContentType, extensionOf,
    INLINE_TYPES_BY_EXTENSION, isOleContainer, sniffExtension, sniffOleExtension
} from '../../shared/dokument-download-name';

// Serves documents under vallogaard.dk/dokument/... (Hosting rewrite in firebase.json)
// instead of the firebasestorage.googleapis.com token links, so the address people see and
// share is the association's own.
//
//   /dokument/<id>              dokumenter/<id>              whoever has the link (as before)
//   /dokument/bestyrelsen/<id>  dokumenter-bestyrelse/<id>   administrators only
//   /dokument/referat/<id>      the file of Firestore referater/<id>   whoever has the link
//
// <id> is the file's UUID. Public documents are open to anyone with the link, same as the
// token links they replace; links are only ever shown to logged-in users.
//
// Board documents can't rely on a link alone. A plain <a href> can't carry an Authorization
// header, so the app keeps a short-lived Firebase ID token in the __session cookie (the one
// cookie Hosting forwards to functions) while an admin has /dokumenter open. It is verified
// here - including that the account isn't disabled/revoked - and the caller's profile must
// have role "admin", so the check is server-side, not just the UI hiding the link.
//
// europe-west1 because the default bucket is in the "eu" multi-region (same reason as resizeImage).

const DOKUMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// This is served from the same origin as the app, whose users are logged in with Firebase
// Auth - so a file that runs script when opened (an uploaded .html or .svg) would be stored
// XSS. Any logged-in user can upload to dokumenter/, so only types that can't execute in the
// page are shown inline; everything else is forced to a download as an opaque binary.
const INLINE_SAFE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif'];

// The token normally arrives in the __session cookie. A ?token= query parameter is accepted
// too, for the app running on localhost: a cookie set there is never sent to vallogaard.dk,
// so its links carry the admin's own (1 hour) ID token instead. It's verified exactly the
// same way; the only difference is that a URL is easier to leak than a cookie, which is why
// the production build never uses it.
async function requestIsFromAdmin(cookieHeader: string | undefined, queryToken: unknown): Promise<boolean> {
    const cookieToken = /(?:^|;\s*)__session=([^;]+)/.exec(cookieHeader || '')?.[1];
    const token = cookieToken ? decodeURIComponent(cookieToken) : (typeof queryToken === 'string' ? queryToken : '');
    if (!token) {
        return false;
    }
    try {
        const decoded = await auth.verifyIdToken(token, true);
        const profile = await db.collection('profiles').doc(decoded.uid).get();
        return profile.exists && profile.data()?.role === 'admin';
    } catch {
        return false;
    }
}

// A referat is a Firestore document whose `ref` is the file's Firebase Storage download URL
// (uploaded without a folder, under a UUID name). Only a root-level UUID object is accepted,
// so a referat document can't be used to read any other path in the bucket.
async function referatFile(referatId: string): Promise<{ objectName: string; title: string } | null> {
    const snap = await db.collection('referater').doc(referatId).get();
    const data = snap.data();
    const encodedName = /\/o\/([^?]+)/.exec(String(data?.ref || ''))?.[1];
    if (!snap.exists || !encodedName) {
        return null;
    }
    let objectName = '';
    try {
        objectName = decodeURIComponent(encodedName);
    } catch {
        return null;
    }
    return DOKUMENT_ID.test(objectName) ? { objectName, title: String(data?.title || '') } : null;
}

async function readBytes(file: any, start: number, end: number): Promise<Uint8Array> {
    const chunks: Buffer[] = [];
    for await (const chunk of file.createReadStream({ start, end })) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
}

async function sniffFileExtension(file: any, size: number): Promise<string> {
    try {
        const head = await readBytes(file, 0, Math.min(size, 8192) - 1);
        const extension = sniffExtension(head);
        if (extension || !isOleContainer(head)) {
            return extension;
        }
        return sniffOleExtension(await readBytes(file, 0, Math.min(size, 1024 * 1024) - 1));
    } catch (error) {
        console.error('dokument: kunne ikke aflæse filtype', error);
        return '';
    }
}

export const dokument = onRequest({
    region: 'europe-west1',
    memory: '256MiB',
    timeoutSeconds: 120
}, async (req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.set('Allow', 'GET, HEAD').status(405).send('Method Not Allowed');
        return;
    }

    // Via Hosting the path is /dokument/...; calling the function's own URL directly leaves
    // out the leading "dokument" (that's the function's name), so it's optional here.
    const segments = req.path.split('/').filter(Boolean);
    if (segments[0] === 'dokument') {
        segments.shift();
    }
    const kind = segments[0] === 'bestyrelsen' ? 'board' : segments[0] === 'referat' ? 'referat' : 'public';
    const idSegment = kind === 'public' ? segments[0] : segments[1];

    let id = '';
    try {
        id = decodeURIComponent(idSegment || '');
    } catch {
        // malformed percent-encoding falls through to the 404 below
    }

    if (kind === 'board') {
        // Nothing about a board document may be cached or shared, including the refusals.
        res.set({ 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' });
        if (!(await requestIsFromAdmin(req.headers.cookie, req.query.token))) {
            res.status(403).send('Adgang nægtet');
            return;
        }
    }

    // referat: the file is looked up through the Firestore document, so only files an actual
    // referat points at can be served, and the download name comes from its title.
    let file;
    let titleFromReferat = '';
    if (kind === 'referat') {
        const target = id && /^[A-Za-z0-9_-]{1,64}$/.test(id) ? await referatFile(id) : null;
        if (!target) {
            res.status(404).send('Ikke fundet');
            return;
        }
        file = getStorage().bucket().file(target.objectName);
        titleFromReferat = target.title;
    } else {
        if (!DOKUMENT_ID.test(id)) {
            res.status(404).send('Ikke fundet');
            return;
        }
        file = getStorage().bucket().file((kind === 'board' ? 'dokumenter-bestyrelse/' : 'dokumenter/') + id);
    }

    let metadata;
    try {
        [metadata] = await file.getMetadata();
    } catch (error: any) {
        if (error?.code === 404) {
            res.status(404).send('Ikke fundet');
        } else {
            console.error('dokument: kunne ikke hente metadata for', id, error);
            res.status(500).send('Fejl');
        }
        return;
    }

    const size = Number(metadata.size);
    let storedType = String(metadata.contentType || '').split(';')[0].trim().toLowerCase();

    // The download name is built here from the title on every request rather than trusting
    // the contentDisposition stored on the object - older uploads never got one, and without a
    // filename the browser falls back to the GUID in the URL. The extension is the original one
    // when a stored name has it, then whatever the content type says, and for the many older
    // files whose content type is missing or generic (empty, application/octet-stream) it is
    // worked out from the file's own first bytes.
    const title = (titleFromReferat || String(metadata.metadata?.title || '')).trim();
    let storedDisposition = String(metadata.contentDisposition || '');
    if (title) {
        const storedName = /filename="([^"]*)"/i.exec(storedDisposition)?.[1] || '';
        let extension = extensionOf(storedName) || extensionForContentType(storedType);
        if (!extension && size > 0) {
            extension = await sniffFileExtension(file, size);
            // A file that is verifiably a PDF/image can be shown in the tab even if it was
            // stored with a useless content type.
            if (INLINE_TYPES_BY_EXTENSION[extension] && !INLINE_SAFE_TYPES.includes(storedType)) {
                storedType = INLINE_TYPES_BY_EXTENSION[extension];
            }
        }
        storedDisposition = buildContentDisposition(title, extension);
    }
    const inlineSafe = INLINE_SAFE_TYPES.includes(storedType);

    res.set({
        'Content-Type': inlineSafe ? storedType : 'application/octet-stream',
        'Content-Disposition': inlineSafe
            ? (storedDisposition || 'inline')
            : (storedDisposition.replace(/^inline/i, 'attachment') || 'attachment'),
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes'
    });
    if (kind !== 'board') {
        // private: the response must not be stored by Hosting's CDN, so a deleted document
        // can't keep being served from there.
        res.set('Cache-Control', 'private, max-age=60');
    }

    let start = 0;
    let end = size - 1;
    let status = 200;

    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range || ''));
    if (range && (range[1] || range[2])) {
        if (range[1]) {
            start = parseInt(range[1], 10);
            end = range[2] ? Math.min(parseInt(range[2], 10), size - 1) : size - 1;
        } else {
            // "bytes=-N" means the last N bytes
            start = Math.max(size - parseInt(range[2], 10), 0);
        }
        if (start >= size || start > end) {
            res.set('Content-Range', `bytes */${size}`).status(416).end();
            return;
        }
        status = 206;
        res.set('Content-Range', `bytes ${start}-${end}/${size}`);
    }

    res.status(status).set('Content-Length', String(size === 0 ? 0 : end - start + 1));

    if (req.method === 'HEAD' || size === 0) {
        res.end();
        return;
    }

    file.createReadStream({ start, end })
        .on('error', (error) => {
            console.error('dokument: streamfejl for', id, error);
            res.destroy(error);
        })
        .pipe(res);
});
