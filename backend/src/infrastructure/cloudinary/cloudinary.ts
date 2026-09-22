import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';
import { logger } from '../../common/logger';

let isConfigured = false;

export function configureCloudinary(): void {
  if (isConfigured) return;

  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();

  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    isConfigured = true;
    logger.info('✅ Cloudinary configured');
  } else {
    logger.warn('⚠️ Cloudinary not configured (missing credentials)');
  }
}

export interface SignedUploadParams {
  timestamp: number;
  signature: string;
  apiKey: string;
  api_key: string;
  cloudName: string;
  cloud_name: string;
  folder: string;
  uploadPreset?: string;
}

export function generateSignedUpload(folder: string, resourceType = 'image'): SignedUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();

  const params: Record<string, string | number> = {
    timestamp,
    folder: `${env.CLOUDINARY_UPLOAD_FOLDER}/${folder}`,
  };

  const signature = cloudinary.utils.api_sign_request(params, apiSecret);

  return {
    timestamp,
    signature,
    apiKey,
    api_key: apiKey,
    cloudName,
    cloud_name: cloudName,
    folder: `${env.CLOUDINARY_UPLOAD_FOLDER}/${folder}`,
  };
}

export async function uploadBufferToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'image'
): Promise<{ url: string; publicId: string; width?: number; height?: number; format?: string; bytes?: number }> {
  configureCloudinary();

  if (!isConfigured) {
    logger.warn('⚠️ Cloudinary not configured; falling back to Data URL for uploaded media asset');
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    return {
      url: dataUrl,
      publicId: `local_${Date.now()}`,
      bytes: buffer.length,
    };
  }

  try {
    return await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `${env.CLOUDINARY_UPLOAD_FOLDER}/${folder}`,
          resource_type: resourceType,
        },
        (error, result) => {
          if (error || !result) {
            return reject(error || new Error('Cloudinary upload failed'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            bytes: result.bytes,
          });
        }
      );
      uploadStream.end(buffer);
    });
  } catch (err: any) {
    logger.warn('⚠️ Cloudinary stream upload failed. Falling back to Data URL.', {
      error: err.message || err,
    });
    const base64 = buffer.toString('base64');
    const dataUrl = `data:image/png;base64,${base64}`;
    return {
      url: dataUrl,
      publicId: `local_${Date.now()}`,
      bytes: buffer.length,
    };
  }
}

export function getOptimizedUrl(publicId: string, transformations: Record<string, string | number> = {}): string {
  return cloudinary.url(publicId, {
    fetch_format: 'auto',
    quality: 'auto',
    ...transformations,
  });
}

export { cloudinary };
