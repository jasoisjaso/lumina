import apiClient from './axios.config';

/**
 * Photo Gallery API
 * Handles photo uploads, albums, and gallery management
 */

export interface Album {
  id: number;
  family_id: number;
  name: string;
  description?: string;
  source: 'local' | 'google' | 'immich';
  external_id?: string;
  cover_photo_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Photo {
  id: number;
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
  taken_at?: string;
  uploaded_by: number;
  uploaded_at: string;
  updated_at: string;
}

export interface PaginatedPhotos {
  photos: Photo[];
  total: number;
  page: number;
  totalPages: number;
}

export interface StorageStats {
  totalPhotos: number;
  totalSizeMb: number;
  albumCount: number;
}

export const photoGalleryAPI = {
  /**
   * Get all albums for the family
   */
  async getAlbums(): Promise<{ albums: Album[] }> {
    const response = await apiClient.get<{ albums: Album[] }>('/photos/albums');
    return response.data;
  },

  /**
   * Create a new album
   */
  async createAlbum(name: string, description?: string): Promise<{ album: Album }> {
    const response = await apiClient.post<{ album: Album }>('/photos/albums', {
      name,
      description,
    });
    return response.data;
  },

  /**
   * Update an album
   */
  async updateAlbum(
    albumId: number,
    updates: { name?: string; description?: string; cover_photo_id?: number }
  ): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      `/photos/albums/${albumId}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete an album
   */
  async deleteAlbum(albumId: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/photos/albums/${albumId}`);
    return response.data;
  },

  /**
   * Get photos in a specific album
   */
  async getAlbumPhotos(
    albumId: number,
    page: number = 1,
    limit: number = 50
  ): Promise<PaginatedPhotos> {
    const response = await apiClient.get<PaginatedPhotos>(
      `/photos/albums/${albumId}/photos`,
      {
        params: { page, limit },
      }
    );
    return response.data;
  },

  /**
   * Get all photos for the family
   */
  async getAllPhotos(
    page: number = 1,
    limit: number = 50,
    sortBy: 'newest' | 'oldest' | 'size' = 'newest'
  ): Promise<PaginatedPhotos> {
    const response = await apiClient.get<PaginatedPhotos>('/photos', {
      params: { page, limit, sortBy },
    });
    return response.data;
  },

  /**
   * Upload photos
   */
  async uploadPhotos(files: File[], albumId?: number): Promise<{
    message: string;
    photos: Photo[];
    errors?: { filename: string; error: string }[];
  }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('photos', file);
    });
    if (albumId) {
      formData.append('albumId', albumId.toString());
    }

    const response = await apiClient.post('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Get single photo details
   */
  async getPhoto(photoId: number): Promise<{ photo: Photo }> {
    const response = await apiClient.get<{ photo: Photo }>(`/photos/${photoId}`);
    return response.data;
  },

  /**
   * Delete a photo
   */
  async deletePhoto(photoId: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/photos/${photoId}`);
    return response.data;
  },

  /**
   * Update photo metadata
   */
  async updatePhotoMetadata(
    photoId: number,
    updates: { title?: string; description?: string; album_id?: number | null }
  ): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      `/photos/${photoId}/metadata`,
      updates
    );
    return response.data;
  },

  /**
   * Rotate a photo 90 degrees clockwise
   */
  async rotatePhoto(photoId: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/photos/${photoId}/rotate`);
    return response.data;
  },

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ stats: StorageStats }> {
    const response = await apiClient.get<{ stats: StorageStats }>('/photos/stats/storage');
    return response.data;
  },

  /**
   * Get photo URL for display
   */
  getPhotoUrl(familyId: number, type: 'originals' | 'medium' | 'thumbnails', filename: string): string {
    const baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001';
    return `${baseUrl}/api/v1/photos/serve/${familyId}/${type}/${filename}`;
  },
};

export default photoGalleryAPI;
