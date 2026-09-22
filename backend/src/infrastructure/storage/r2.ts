import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { env } from '../../config/env';
import { logger } from '../../common/logger';
import { Readable } from 'stream';

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3Client) {
    if (!env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID) {
      logger.warn('⚠️ R2 not configured (missing credentials)');
    }

    s3Client = new S3Client({
      region: 'auto',
      endpoint: env.R2_ENDPOINT,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
    logger.info('✅ R2 client initialized');
  }
  return s3Client;
}

export async function uploadToR2(
  key: string,
  body: Buffer | Readable | string,
  contentType: string
): Promise<string> {
  const client = getR2Client();
  await client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  const publicUrl = `${env.R2_PUBLIC_BASE_URL}/${key}`;
  logger.info('File uploaded to R2', { key, contentType });
  return publicUrl;
}

export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));
  logger.info('File deleted from R2', { key });
}

export async function fileExistsInR2(key: string): Promise<boolean> {
  try {
    const client = getR2Client();
    await client.send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch {
    return false;
  }
}

export function getR2PublicUrl(key: string): string {
  return `${env.R2_PUBLIC_BASE_URL}/${key}`;
}
