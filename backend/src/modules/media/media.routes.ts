import { Router } from 'express';
import { z } from 'zod';
import multer from 'multer';
import { prisma } from '../../infrastructure/database/prisma';
import { requireAuth, asyncHandler, sendSuccess, validate } from '../../common/middleware';
import { AppError } from '../../common/errors';
import { generateSignedUpload, uploadBufferToCloudinary } from '../../infrastructure/cloudinary/cloudinary';

const router = Router();

const signatureSchema = z.object({
  assetType: z.enum(['AVATAR', 'COVER_IMAGE', 'STREAM_THUMBNAIL', 'GIFT_ICON', 'OTHER']),
  resourceType: z.string().default('image'),
});

const completeUploadSchema = z.object({
  providerPublicId: z.string().min(1),
  assetType: z.enum(['AVATAR', 'COVER_IMAGE', 'STREAM_THUMBNAIL', 'GIFT_ICON', 'OTHER']),
  resourceType: z.string().default('image'),
  originalUrl: z.string().url(),
  deliveryUrl: z.string().url(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  format: z.string().optional(),
  bytes: z.number().int().optional(),
});

// Server-defined folder paths (never trust client)
const ASSET_FOLDERS: Record<string, (userId: string) => string> = {
  AVATAR: (userId) => `users/${userId}/avatar`,
  COVER_IMAGE: (userId) => `users/${userId}/profile`,
  STREAM_THUMBNAIL: (userId) => `streams/${userId}/thumbnail`,
  GIFT_ICON: () => `gifts`,
  OTHER: (userId) => `users/${userId}/other`,
};

const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/v1/media/upload (Backend Server Upload)
router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      throw AppError.badRequest('No file uploaded');
    }

    const assetType = (req.body.assetType as string) || 'STREAM_THUMBNAIL';
    const folderFn = ASSET_FOLDERS[assetType] || ASSET_FOLDERS.OTHER;
    const folder = folderFn(req.user!.id);

    // Direct server-side upload to Cloudinary
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, folder);

    // Persist MediaAsset in DB
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: req.user!.id,
        provider: 'cloudinary',
        providerPublicId: uploadResult.publicId,
        resourceType: 'image',
        assetType: assetType as any,
        originalUrl: uploadResult.url,
        deliveryUrl: uploadResult.url,
        width: uploadResult.width,
        height: uploadResult.height,
        format: uploadResult.format,
        bytes: uploadResult.bytes || req.file.size,
        status: 'ACTIVE',
      },
    });

    sendSuccess(res, { url: uploadResult.url, asset }, 201);
  })
);

// POST /api/v1/media/cloudinary/signature
router.post(
  '/cloudinary/signature',
  requireAuth,
  validate(signatureSchema),
  asyncHandler(async (req, res) => {
    const { assetType } = req.body;
    const folder = ASSET_FOLDERS[assetType](req.user!.id);
    const params = generateSignedUpload(folder);

    sendSuccess(res, { uploadParams: params });
  })
);

// POST /api/v1/media/complete
router.post(
  '/complete',
  requireAuth,
  validate(completeUploadSchema),
  asyncHandler(async (req, res) => {
    const asset = await prisma.mediaAsset.create({
      data: {
        ownerId: req.user!.id,
        provider: 'cloudinary',
        providerPublicId: req.body.providerPublicId,
        resourceType: req.body.resourceType,
        assetType: req.body.assetType,
        originalUrl: req.body.originalUrl,
        deliveryUrl: req.body.deliveryUrl,
        width: req.body.width,
        height: req.body.height,
        format: req.body.format,
        bytes: req.body.bytes,
        status: 'ACTIVE',
      },
    });

    sendSuccess(res, { asset }, 201);
  })
);

// DELETE /api/v1/media/:id
router.delete('/:id', requireAuth, asyncHandler(async (req, res) => {
  const asset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });

  if (!asset) throw AppError.notFound('Media asset not found');
  if (asset.ownerId !== req.user!.id) {
    throw AppError.forbidden('Not authorized to delete this asset');
  }

  await prisma.mediaAsset.update({
    where: { id: asset.id },
    data: { status: 'DELETED' },
  });

  sendSuccess(res, { message: 'Asset deleted' });
}));

export const mediaRouter = router;
