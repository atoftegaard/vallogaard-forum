import * as functions from 'firebase-functions/v1';
import sharp = require('sharp');
import { getStorage } from 'firebase-admin/storage';

const RESIZE_SUFFIX = '_500x500';

// Replaces the deprecated "Resize Images" Firebase Extension. Triggers on every upload;
// skips its own output (files already ending in RESIZE_SUFFIX) to avoid re-triggering itself.
// Deployed to europe-west1 because the default storage bucket is in the "eu" multi-region -
// running the function anywhere else means an unnecessary cross-region hop for every upload.
export const resizeImage = functions.region('europe-west1').runWith({
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
