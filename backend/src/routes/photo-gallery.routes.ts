import express, { Request, Response } from 'express';
import multer from 'multer';
import localPhotoService from '../services/local-photo.service';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

/**
 * Photo Gallery API Routes
 * Handles local photo uploads, albums, and management
 * All routes require authentication
 */

// Configure multer for memory storage (we'll process with Sharp)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max (will check against family settings)
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.'));
    }
  },
});

// ============================================================================
// ALBUM ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/photos/albums
 * List all albums for the user's family
 */
router.get('/albums', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    // Check if photo gallery is enabled
    const isEnabled = await localPhotoService.isEnabledForFamily(familyId);
    if (!isEnabled) {
      return res.status(403).json({ error: 'Photo gallery is not enabled for this family' });
    }

    const albums = await localPhotoService.getAlbums(familyId);
    res.json({ albums });
  } catch (error: any) {
    console.error('Get albums error:', error);
    res.status(500).json({ error: 'Failed to retrieve albums', details: error.message });
  }
});

/**
 * POST /api/v1/photos/albums
 * Create a new album
 * Body: { name: string, description?: string }
 */
router.post('/albums', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const isEnabled = await localPhotoService.isEnabledForFamily(familyId);
    if (!isEnabled) {
      return res.status(403).json({ error: 'Photo gallery is not enabled for this family' });
    }

    const { name, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'Album name is required' });
    }

    const album = await localPhotoService.createAlbum(familyId, name.trim(), description);
    res.status(201).json({ album });
  } catch (error: any) {
    console.error('Create album error:', error);
    res.status(500).json({ error: 'Failed to create album', details: error.message });
  }
});

/**
 * PUT /api/v1/photos/albums/:id
 * Update an album
 * Body: { name?: string, description?: string, cover_photo_id?: number }
 */
router.put('/albums/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    const { name, description, cover_photo_id } = req.body;
    const updates: any = {};

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Album name must be a non-empty string' });
      }
      updates.name = name.trim();
    }

    if (description !== undefined) {
      updates.description = description;
    }

    if (cover_photo_id !== undefined) {
      updates.cover_photo_id = cover_photo_id;
    }

    await localPhotoService.updateAlbum(albumId, familyId, updates);
    res.json({ message: 'Album updated successfully' });
  } catch (error: any) {
    console.error('Update album error:', error);
    res.status(500).json({ error: 'Failed to update album', details: error.message });
  }
});

/**
 * DELETE /api/v1/photos/albums/:id
 * Delete an album (photos in album are not deleted, just unlinked)
 */
router.delete('/albums/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    await localPhotoService.deleteAlbum(albumId, familyId);
    res.json({ message: 'Album deleted successfully' });
  } catch (error: any) {
    console.error('Delete album error:', error);
    res.status(500).json({ error: 'Failed to delete album', details: error.message });
  }
});

/**
 * GET /api/v1/photos/albums/:id/photos
 * Get photos in a specific album (paginated)
 * Query params: page (default: 1), limit (default: 50)
 */
router.get('/albums/:id/photos', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const albumId = parseInt(req.params.id);
    if (isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page

    const result = await localPhotoService.getPhotosByAlbum(albumId, familyId, page, limit);
    res.json(result);
  } catch (error: any) {
    console.error('Get album photos error:', error);
    res.status(500).json({ error: 'Failed to retrieve album photos', details: error.message });
  }
});

// ============================================================================
// PHOTO ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/photos
 * List all photos for the family (paginated)
 * Query params: page (default: 1), limit (default: 50), sortBy (newest|oldest|size)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const isEnabled = await localPhotoService.isEnabledForFamily(familyId);
    if (!isEnabled) {
      return res.status(403).json({ error: 'Photo gallery is not enabled for this family' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const sortBy = (req.query.sortBy as 'newest' | 'oldest' | 'size') || 'newest';

    if (!['newest', 'oldest', 'size'].includes(sortBy)) {
      return res.status(400).json({ error: 'Invalid sortBy value. Must be newest, oldest, or size' });
    }

    const result = await localPhotoService.getAllPhotos(familyId, page, limit, sortBy);
    res.json(result);
  } catch (error: any) {
    console.error('Get photos error:', error);
    res.status(500).json({ error: 'Failed to retrieve photos', details: error.message });
  }
});

/**
 * POST /api/v1/photos/upload
 * Upload one or more photos
 * Multipart form data with 'photos' field and optional 'albumId'
 */
router.post('/upload', authenticate, upload.array('photos', 10), async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    const userId = req.user?.userId;

    if (!familyId || !userId) {
      return res.status(400).json({ error: 'Family ID or User ID not found' });
    }

    const isEnabled = await localPhotoService.isEnabledForFamily(familyId);
    if (!isEnabled) {
      return res.status(403).json({ error: 'Photo gallery is not enabled for this family' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No photos uploaded' });
    }

    // Get photo gallery settings to check file size limits
    const settings = await localPhotoService.getPhotoGallerySettings(familyId);
    const maxSizeMb = settings.storage?.maxUploadMb || 10;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    const albumId = req.body.albumId ? parseInt(req.body.albumId) : undefined;
    if (albumId && isNaN(albumId)) {
      return res.status(400).json({ error: 'Invalid album ID' });
    }

    // Validate file sizes
    for (const file of files) {
      if (file.size > maxSizeBytes) {
        return res.status(400).json({
          error: `File ${file.originalname} exceeds maximum size of ${maxSizeMb}MB`,
        });
      }
    }

    // Upload all photos
    const uploadedPhotos = [];
    const errors = [];

    for (const file of files) {
      try {
        const photo = await localPhotoService.uploadPhoto(
          {
            buffer: file.buffer,
            originalFilename: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          },
          familyId,
          userId,
          albumId
        );
        uploadedPhotos.push(photo);
      } catch (error: any) {
        errors.push({
          filename: file.originalname,
          error: error.message,
        });
      }
    }

    if (uploadedPhotos.length === 0) {
      return res.status(500).json({
        error: 'Failed to upload any photos',
        details: errors,
      });
    }

    res.status(201).json({
      message: `Successfully uploaded ${uploadedPhotos.length} photo(s)`,
      photos: uploadedPhotos,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Upload photos error:', error);
    res.status(500).json({ error: 'Failed to upload photos', details: error.message });
  }
});

/**
 * GET /api/v1/photos/:id
 * Get single photo details
 */
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const photoId = parseInt(req.params.id);
    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'Invalid photo ID' });
    }

    const photo = await localPhotoService.getPhoto(photoId, familyId);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    res.json({ photo });
  } catch (error: any) {
    console.error('Get photo error:', error);
    res.status(500).json({ error: 'Failed to retrieve photo', details: error.message });
  }
});

/**
 * DELETE /api/v1/photos/:id
 * Delete a photo and its files
 */
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const photoId = parseInt(req.params.id);
    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'Invalid photo ID' });
    }

    await localPhotoService.deletePhoto(photoId, familyId);
    res.json({ message: 'Photo deleted successfully' });
  } catch (error: any) {
    console.error('Delete photo error:', error);
    res.status(500).json({ error: 'Failed to delete photo', details: error.message });
  }
});

/**
 * PUT /api/v1/photos/:id/metadata
 * Update photo metadata (title, description, album)
 * Body: { title?: string, description?: string, album_id?: number }
 */
router.put('/:id/metadata', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const photoId = parseInt(req.params.id);
    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'Invalid photo ID' });
    }

    const { title, description, album_id } = req.body;
    const updates: any = {};

    if (title !== undefined) {
      updates.title = title;
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (album_id !== undefined) {
      updates.album_id = album_id === null ? null : parseInt(album_id);
      if (updates.album_id !== null && isNaN(updates.album_id)) {
        return res.status(400).json({ error: 'Invalid album ID' });
      }
    }

    await localPhotoService.updatePhotoMetadata(photoId, familyId, updates);
    res.json({ message: 'Photo metadata updated successfully' });
  } catch (error: any) {
    console.error('Update photo metadata error:', error);
    res.status(500).json({ error: 'Failed to update photo metadata', details: error.message });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

/**
 * GET /api/v1/photos/stats
 * Get storage statistics for the family
 */
router.get('/stats/storage', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const stats = await localPhotoService.getStorageStats(familyId);
    res.json({ stats });
  } catch (error: any) {
    console.error('Get storage stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve storage stats', details: error.message });
  }
});

/**
 * POST /api/v1/photos/:id/rotate
 * Rotate a photo 90 degrees clockwise
 */
router.post('/:id/rotate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const familyId = req.user?.familyId;
    if (!familyId) {
      return res.status(400).json({ error: 'Family ID not found' });
    }

    const photoId = parseInt(req.params.id);
    if (isNaN(photoId)) {
      return res.status(400).json({ error: 'Invalid photo ID' });
    }

    await localPhotoService.rotatePhoto(photoId, familyId);
    res.json({ message: 'Photo rotated successfully' });
  } catch (error: any) {
    console.error('Rotate photo error:', error);
    res.status(500).json({ error: 'Failed to rotate photo', details: error.message });
  }
});

/**
 * GET /api/v1/photos/serve/:familyId/:type/:filename
 * Serve photo files (originals, medium, thumbnails)
 * Type: original | medium | thumbnail
 */
router.get('/serve/:familyId/:type/:filename', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { familyId, type, filename } = req.params;
    const userFamilyId = req.user?.familyId;

    // Security: Ensure user can only access their own family's photos
    if (parseInt(familyId) !== userFamilyId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Validate type
    const validTypes = ['originals', 'medium', 'thumbnails'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid photo type' });
    }

    // Build file path
    const uploadsDir = path.join(process.cwd(), 'data', 'uploads', 'photos');
    const filePath = path.join(uploadsDir, familyId, type, filename);

    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    const expectedBase = path.join(uploadsDir, familyId, type);
    if (!normalizedPath.startsWith(expectedBase)) {
      return res.status(403).json({ error: 'Invalid file path' });
    }

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Photo not found' });
    }

    // Determine content type based on file extension
    const ext = path.extname(filename).toLowerCase();
    const contentTypeMap: { [key: string]: string } = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
    };
    const contentType = contentTypeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.sendFile(filePath);
  } catch (error: any) {
    console.error('Serve photo error:', error);
    res.status(500).json({ error: 'Failed to serve photo', details: error.message });
  }
});

export default router;
