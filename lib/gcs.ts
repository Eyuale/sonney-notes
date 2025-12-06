import { Storage, GetSignedUrlConfig } from '@google-cloud/storage';

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const BUCKET = process.env.GCS_BUCKET_NAME as string;
const CLIENT_EMAIL = process.env.GCP_CLIENT_EMAIL;
const PRIVATE_KEY = process.env.GCP_PRIVATE_KEY;

if (!BUCKET || !PROJECT_ID) {
    // Do not throw at import time in Next.js, just warn
    console.warn("[lib/gcs] Missing GCP_PROJECT_ID or GCS_BUCKET_NAME env var");
}

const storage = new Storage({
    projectId: PROJECT_ID,
    credentials: (CLIENT_EMAIL && PRIVATE_KEY) ? {
        client_email: CLIENT_EMAIL,
        private_key: PRIVATE_KEY.replace(/\\n/g, '\n'),
    } : undefined
});

export function getGCSClient() {
    return storage;
}

export async function presignPutUrl(params: {
    key: string;
    contentType: string;
    expiresInSeconds?: number;
}) {
    const { key, contentType, expiresInSeconds = 900 } = params;
    if (!BUCKET) throw new Error("GCS not configured: set GCS_BUCKET_NAME");

    const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'write',
        expires: Date.now() + expiresInSeconds * 1000,
        contentType: contentType,
    };

    const [url] = await storage.bucket(BUCKET).file(key).getSignedUrl(options);
    return url;
}

export async function presignGetUrl(params: { key: string; expiresInSeconds?: number }) {
    const { key, expiresInSeconds = 900 } = params;
    if (!BUCKET) throw new Error("GCS not configured: set GCS_BUCKET_NAME");

    const options: GetSignedUrlConfig = {
        version: 'v4',
        action: 'read',
        expires: Date.now() + expiresInSeconds * 1000,
    };

    const [url] = await storage.bucket(BUCKET).file(key).getSignedUrl(options);
    return url;
}

export async function deleteFile(key: string) {
    if (!BUCKET) throw new Error("GCS not configured: set GCS_BUCKET_NAME");
    try {
        await storage.bucket(BUCKET).file(key).delete();
    } catch (error: any) {
        if (error.code === 404) {
            console.warn(`File ${key} not found during deletion`);
            return;
        }
        throw error;
    }
}

export const GCS_ENV = { BUCKET, PROJECT_ID };
