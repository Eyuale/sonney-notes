import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AWS_REGION as string;
const BUCKET = process.env.S3_BUCKET_NAME as string;

if (!REGION || !BUCKET) {
  // Do not throw at import time in Next.js, just warn. Runtime APIs will validate.
  console.warn("[lib/s3] Missing AWS_REGION or S3_BUCKET_NAME env var");
}

export function getS3Client() {
  return new S3Client({ region: REGION });
}

export async function presignPutUrl(params: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const { key, contentType, expiresInSeconds = 900 } = params;
  if (!REGION || !BUCKET) throw new Error("S3 not configured: set AWS_REGION and S3_BUCKET_NAME");
  const s3 = getS3Client();
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return url;
}

export async function presignGetUrl(params: { key: string; expiresInSeconds?: number }) {
  const { key, expiresInSeconds = 900 } = params;
  if (!REGION || !BUCKET) throw new Error("S3 not configured: set AWS_REGION and S3_BUCKET_NAME");
  const s3 = getS3Client();
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const url = await getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
  return url;
}

export const S3_ENV = { REGION, BUCKET };
