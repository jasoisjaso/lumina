import knex from '../database/knex';
import settingsService from './settings.service';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

/**
 * Local Photo Gallery Service
 * Handles local photo uploads, storage, and management
 * Designed for future expansion to Google Photos/Immich
 */

interface PhotoUpload {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  size: number;
}

interface Photo {
  id?: number;
  family_id: number;
  album_id?: number;
  source: 'local' | 'google' | 'immich';
  external_id?: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  width?: number;
  height?: number;
  title?: string;
  description?: string;
  taken_at?: Date;
  uploaded_by: number;
  uploaded_at?: Date;
  updated_at?: Date;
}

interface Album {
  id?: number;
  family_id: number;
  name: string;
  description?: string;
  source: 'local' | 'google' | 'immich';
  external_id?: string;
  cover_photo_id?: number;
  created_at?: Date;
  updated_at?: Date;
}

class LocalPhotoService {
  private readonly UPLOADS_BASE_DIR = path.join(process.cwd(), 'data', 'uploads', 'photos');
  private readonly THUMBNAIL_SIZE = 300;
  private readonly MEDIUM_SIZE = 1200;

  /**
   * Check if photo gallery is enabled for a family
   */
  async isEnabledForFamily(familyId: number): Promise<boolean> {
    const featureSettings = await settingsService.getSettings(familyId, 'features');
    return featureSettings?.photoGallery?.enabled === true;
  }

  /**
   * Get photo gallery settings for a family
   */
  async getPhotoGallerySettings(familyId: number) {
    const featureSettings = await settingsService.getSettings(familyId, 'features');
    return featureSettings?.photoGallery || {
      enabled: false,
      storage: {
        maxUploadMb: 10,
        allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      },
      features: {
        autoRotate: true,
        generateThumbnails: true,
      },
    };
  }

  /**
   * Ensure directory structure exists for a family
   */
  private async ensureDirectories(familyId: number): Promise<void> {
    const basePath = path.join(this.UPLOADS_BASE_DIR, familyId.toString());
    const directories = ['originals', 'medium', 'thumbnails', 'temp'];

    for (const dir of directories) {
      const dirPath = path.join(basePath, dir);
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Upload and process a photo
   */
  async uploadPhoto(
    upload: PhotoUpload,
    familyId: number,
    userId: number,
    albumId?: number
  ): Promise<Photo> {
    try {
      // Ensure directories exist
      await this.ensureDirectories(familyId);

      // Generate unique filename
      const ext = path.extname(upload.originalFilename);
      const filename = `${uuidv4()}${ext}`;
      const basePath = path.join(this.UPLOADS_BASE_DIR, familyId.toString());

      // Process image with sharp
      const image = sharp(upload.buffer);
      const metadata = await image.metadata();

      // Get settings
      const settings = await this.getPhotoGallerySettings(familyId);

      // Auto-rotate based on EXIF if enabled
      if (settings.features?.autoRotate) {
        image.rotate();
      }

      // Save original
      const originalPath = path.join(basePath, 'originals', filename);
      await image.toFile(originalPath);

      // Generate medium version (1200px width)
      let mediumPath: string | undefined;
      if (settings.features?.generateThumbnails && metadata.width && metadata.width > this.MEDIUM_SIZE) {
        mediumPath = path.join(basePath, 'medium', filename);
        await sharp(upload.buffer)
          .rotate()
          .resize(this.MEDIUM_SIZE, null, { withoutEnlargement: true })
          .jpeg({ quality: 85 })
          .toFile(mediumPath);
      }

      // Generate thumbnail (300px width)
      let thumbnailPath: string | undefined;
      if (settings.features?.generateThumbnails) {
        thumbnailPath = path.join(basePath, 'thumbnails', filename);
        await sharp(upload.buffer)
          .rotate()
          .resize(this.THUMBNAIL_SIZE, null, { withoutEnlargement: true })
          .jpeg({ quality: 80 })
          .toFile(thumbnailPath);
      }

      // Create database entry
      const photo: Omit<Photo, 'id'> = {
        family_id: familyId,
        album_id: albumId,
        source: 'local',
        filename: filename,
        original_filename: upload.originalFilename,
        file_path: `photos/${familyId}/originals/${filename}`,
        file_size: upload.size,
        mime_type: upload.mimeType,
        width: metadata.width,
        height: metadata.height,
        uploaded_by: userId,
        uploaded_at: new Date(),
        updated_at: new Date(),
      };

      const [photoId] = await knex('photos').insert(photo);

      return { ...photo, id: photoId };
    } catch (error: any) {
      console.error('Photo upload error:', error);
      throw new Error(`Failed to upload photo: ${error.message}`);
    }
  }

  /**
   * Delete a photo and its files
   */
  async deletePhoto(photoId: number, familyId: number): Promise<void> {
    try {
      // Get photo details
      const photo = await knex('photos')
        .where({ id: photoId, family_id: familyId })
        .first();

      if (!photo) {
        throw new Error('Photo not found');
      }

      // Delete files
      const basePath = path.join(this.UPLOADS_BASE_DIR, familyId.toString());
      const filesToDelete = [
        path.join(basePath, 'originals', photo.filename),
        path.join(basePath, 'medium', photo.filename),
        path.join(basePath, 'thumbnails', photo.filename),
      ];

      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // Ignore if file doesn't exist
        }
      }

      // Delete from database
      await knex('photos').where({ id: photoId }).delete();
    } catch (error: any) {
      console.error('Photo delete error:', error);
      throw new Error(`Failed to delete photo: ${error.message}`);
    }
  }

  /**
   * Create an album
   */
  async createAlbum(
    familyId: number,
    name: string,
    description?: string
  ): Promise<Album> {
    try {
      const album: Omit<Album, 'id'> = {
        family_id: familyId,
        name,
        description,
        source: 'local',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const [albumId] = await knex('albums').insert(album);

      return { ...album, id: albumId };
    } catch (error: any) {
      console.error('Album creation error:', error);
      throw new Error(`Failed to create album: ${error.message}`);
    }
  }

  /**
   * Update album
   */
  async updateAlbum(
    albumId: number,
    familyId: number,
    updates: Partial<Album>
  ): Promise<void> {
    try {
      await knex('albums')
        .where({ id: albumId, family_id: familyId })
        .update({
          ...updates,
          updated_at: new Date(),
        });
    } catch (error: any) {
      console.error('Album update error:', error);
      throw new Error(`Failed to update album: ${error.message}`);
    }
  }

  /**
   * Delete an album
   */
  async deleteAlbum(albumId: number, familyId: number): Promise<void> {
    try {
      await knex('albums')
        .where({ id: albumId, family_id: familyId })
        .delete();
    } catch (error: any) {
      console.error('Album delete error:', error);
      throw new Error(`Failed to delete album: ${error.message}`);
    }
  }

  /**
   * Get albums for a family
   */
  async getAlbums(familyId: number): Promise<Album[]> {
    try {
      const albums = await knex('albums')
        .where({ family_id: familyId })
        .orderBy('created_at', 'desc');

      return albums;
    } catch (error: any) {
      console.error('Get albums error:', error);
      throw new Error(`Failed to get albums: ${error.message}`);
    }
  }

  /**
   * Get photos by album with pagination
   */
  async getPhotosByAlbum(
    albumId: number,
    familyId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<{ photos: Photo[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;

      const [{ count }] = await knex('photos')
        .where({ album_id: albumId, family_id: familyId })
        .count('* as count');

      const total = Number(count);
      const totalPages = Math.ceil(total / limit);

      const photos = await knex('photos')
        .where({ album_id: albumId, family_id: familyId })
        .orderBy('uploaded_at', 'desc')
        .limit(limit)
        .offset(offset);

      return {
        photos,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      console.error('Get photos by album error:', error);
      throw new Error(`Failed to get photos: ${error.message}`);
    }
  }

  /**
   * Get all photos for a family with pagination
   */
  async getAllPhotos(
    familyId: number,
    page: number = 1,
    limit: number = 50,
    sortBy: 'newest' | 'oldest' | 'size' = 'newest'
  ): Promise<{ photos: Photo[]; total: number; page: number; totalPages: number }> {
    try {
      const offset = (page - 1) * limit;

      const [{ count }] = await knex('photos')
        .where({ family_id: familyId })
        .count('* as count');

      const total = Number(count);
      const totalPages = Math.ceil(total / limit);

      let query = knex('photos').where({ family_id: familyId });

      // Apply sorting
      switch (sortBy) {
        case 'newest':
          query = query.orderBy('uploaded_at', 'desc');
          break;
        case 'oldest':
          query = query.orderBy('uploaded_at', 'asc');
          break;
        case 'size':
          query = query.orderBy('file_size', 'desc');
          break;
      }

      const photos = await query.limit(limit).offset(offset);

      return {
        photos,
        total,
        page,
        totalPages,
      };
    } catch (error: any) {
      console.error('Get all photos error:', error);
      throw new Error(`Failed to get photos: ${error.message}`);
    }
  }

  /**
   * Get single photo details
   */
  async getPhoto(photoId: number, familyId: number): Promise<Photo | null> {
    try {
      const photo = await knex('photos')
        .where({ id: photoId, family_id: familyId })
        .first();

      return photo || null;
    } catch (error: any) {
      console.error('Get photo error:', error);
      throw new Error(`Failed to get photo: ${error.message}`);
    }
  }

  /**
   * Update photo metadata
   */
  async updatePhotoMetadata(
    photoId: number,
    familyId: number,
    updates: { title?: string; description?: string; album_id?: number }
  ): Promise<void> {
    try {
      await knex('photos')
        .where({ id: photoId, family_id: familyId })
        .update({
          ...updates,
          updated_at: new Date(),
        });
    } catch (error: any) {
      console.error('Update photo metadata error:', error);
      throw new Error(`Failed to update photo: ${error.message}`);
    }
  }

  /**
   * Get storage statistics for a family
   */
  async getStorageStats(familyId: number): Promise<{
    totalPhotos: number;
    totalSizeMb: number;
    albumCount: number;
  }> {
    try {
      const [{ photoCount, totalSize }] = await knex('photos')
        .where({ family_id: familyId })
        .select(
          knex.raw('COUNT(*) as photoCount'),
          knex.raw('SUM(file_size) as totalSize')
        );

      const [{ albumCount }] = await knex('albums')
        .where({ family_id: familyId })
        .count('* as albumCount');

      return {
        totalPhotos: Number(photoCount) || 0,
        totalSizeMb: Math.round((Number(totalSize) || 0) / (1024 * 1024) * 100) / 100,
        albumCount: Number(albumCount) || 0,
      };
    } catch (error: any) {
      console.error('Get storage stats error:', error);
      throw new Error(`Failed to get storage stats: ${error.message}`);
    }
  }

  /**
   * Rotate photo 90 degrees clockwise
   */
  async rotatePhoto(photoId: number, familyId: number): Promise<void> {
    try {
      const photo = await this.getPhoto(photoId, familyId);
      if (!photo) {
        throw new Error('Photo not found');
      }

      const basePath = path.join(this.UPLOADS_BASE_DIR, familyId.toString());
      const originalPath = path.join(basePath, 'originals', photo.filename);

      // Rotate original
      const rotatedBuffer = await sharp(originalPath).rotate(90).toBuffer();
      await fs.writeFile(originalPath, rotatedBuffer);

      // Regenerate medium and thumbnail
      const mediumPath = path.join(basePath, 'medium', photo.filename);
      await sharp(rotatedBuffer)
        .resize(this.MEDIUM_SIZE, null, { withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(mediumPath);

      const thumbnailPath = path.join(basePath, 'thumbnails', photo.filename);
      await sharp(rotatedBuffer)
        .resize(this.THUMBNAIL_SIZE, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Update dimensions in database
      const metadata = await sharp(rotatedBuffer).metadata();
      await knex('photos')
        .where({ id: photoId })
        .update({
          width: metadata.width,
          height: metadata.height,
          updated_at: new Date(),
        });
    } catch (error: any) {
      console.error('Rotate photo error:', error);
      throw new Error(`Failed to rotate photo: ${error.message}`);
    }
  }
}

// Export singleton instance
export const localPhotoService = new LocalPhotoService();
export default localPhotoService;
