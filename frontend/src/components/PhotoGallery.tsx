import React, { useState, useEffect } from 'react';
import photoGalleryAPI, { Photo, Album } from '../api/photo-gallery.api';
import { useAuthStore } from '../stores/auth.store';
import PhotoUploader from './PhotoUploader';
import PhotoDetails from './PhotoDetails';
import AlbumManager from './AlbumManager';
import { usePullToRefresh } from '../hooks/useTouchGestures';

interface PhotoGalleryProps {
  onError?: (error: string) => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ onError }) => {
  const { user } = useAuthStore();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);
  const [showAlbumManager, setShowAlbumManager] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size'>('newest');

  const loadAlbums = async () => {
    try {
      const response = await photoGalleryAPI.getAlbums();
      setAlbums(response.albums);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load albums';
      onError?.(errorMessage);
      console.error('Load albums error:', err);
    }
  };

  const loadPhotos = async () => {
    try {
      setIsLoading(true);
      let response;

      if (selectedAlbum) {
        response = await photoGalleryAPI.getAlbumPhotos(selectedAlbum, currentPage, 50);
      } else {
        response = await photoGalleryAPI.getAllPhotos(currentPage, 50, sortBy);
      }

      setPhotos(response.photos);
      setTotalPages(response.totalPages);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to load photos';
      onError?.(errorMessage);
      console.error('Load photos error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pull-to-refresh for mobile
  const { ref: pullToRefreshRef, isPullRefreshing } = usePullToRefresh<HTMLDivElement>(loadPhotos);

  useEffect(() => {
    loadAlbums();
    loadPhotos();
  }, [selectedAlbum, currentPage, sortBy]);

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
  };

  const handleDeletePhoto = async (photoId: number) => {
    try {
      await photoGalleryAPI.deletePhoto(photoId);
      setPhotos(photos.filter(p => p.id !== photoId));
      setSelectedPhoto(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete photo';
      onError?.(errorMessage);
    }
  };

  const handleRotatePhoto = async (photoId: number) => {
    try {
      await photoGalleryAPI.rotatePhoto(photoId);
      // Reload photos to show rotated version
      await loadPhotos();
      setSelectedPhoto(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to rotate photo';
      onError?.(errorMessage);
    }
  };

  const handleUploadComplete = () => {
    setShowUploader(false);
    loadPhotos();
  };

  const handleAlbumChange = () => {
    loadAlbums();
    loadPhotos();
  };

  const getPhotoUrl = (photo: Photo, type: 'thumbnails' | 'medium' | 'originals' = 'medium') => {
    if (!user?.family_id) return '';
    return photoGalleryAPI.getPhotoUrl(user.family_id, type, photo.filename);
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Pull-to-refresh indicator */}
      {isPullRefreshing && (
        <div className="flex justify-center py-2 bg-white border-b border-slate-200">
          <svg
            className="w-5 h-5 text-indigo-600 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-3 md:py-4 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <h1 className="text-lg md:text-2xl font-semibold text-slate-900 truncate">Photo Gallery</h1>
            {selectedAlbum && (
              <button
                onClick={() => setSelectedAlbum(null)}
                className="text-xs md:text-sm text-indigo-600 hover:text-indigo-700 whitespace-nowrap"
                style={{ minHeight: '36px' }}
              >
                ← All
              </button>
            )}
          </div>

          {/* Desktop buttons */}
          <div className="hidden md:flex items-center gap-3">
            {!selectedAlbum && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'size')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                style={{ minHeight: '44px' }}
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="size">Largest First</option>
              </select>
            )}

            <button
              onClick={() => setShowAlbumManager(true)}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              style={{ minHeight: '44px' }}
            >
              Manage Albums
            </button>

            <button
              onClick={() => setShowUploader(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              style={{ minHeight: '44px' }}
            >
              Upload Photos
            </button>
          </div>

          {/* Mobile button */}
          <button
            onClick={() => setShowUploader(true)}
            className="md:hidden px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex-shrink-0"
            style={{ minHeight: '44px' }}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Album filters */}
        {albums.length > 0 && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            <button
              onClick={() => setSelectedAlbum(null)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                selectedAlbum === null
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              All Photos
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                onClick={() => setSelectedAlbum(album.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  selectedAlbum === album.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-white text-slate-600 border border-slate-300 hover:bg-slate-50'
                }`}
              >
                {album.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Photo Grid */}
      <div ref={pullToRefreshRef} className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-slate-500">Loading photos...</div>
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <svg
              className="w-16 h-16 text-slate-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-slate-600 text-base md:text-lg font-medium mb-2">No photos yet</p>
            <p className="text-slate-500 text-sm md:text-base mb-4 px-4">Upload your first photo to get started</p>
            <button
              onClick={() => setShowUploader(true)}
              className="px-6 py-3 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
              style={{ minHeight: '48px' }}
            >
              Upload Photos
            </button>
          </div>
        ) : (
          <>
            {/* Masonry Grid - Single column on mobile for better viewing */}
            <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-3 md:gap-4">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="break-inside-avoid mb-4 cursor-pointer group relative"
                  onClick={() => handlePhotoClick(photo)}
                >
                  <div className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition-shadow bg-white">
                    <img
                      src={getPhotoUrl(photo, 'thumbnails')}
                      alt={photo.title || photo.original_filename}
                      className="w-full h-auto object-cover group-hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                    {photo.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <p className="text-white text-sm font-medium truncate">
                          {photo.title}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 md:mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 md:px-6 py-2.5 md:py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ minHeight: '48px' }}
                >
                  Previous
                </button>
                <span className="px-3 md:px-4 py-2 text-xs md:text-sm text-slate-600 whitespace-nowrap">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 md:px-6 py-2.5 md:py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ minHeight: '48px' }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {showUploader && (
        <PhotoUploader
          albumId={selectedAlbum || undefined}
          onClose={() => setShowUploader(false)}
          onUploadComplete={handleUploadComplete}
          onError={onError}
        />
      )}

      {showAlbumManager && (
        <AlbumManager
          albums={albums}
          onClose={() => setShowAlbumManager(false)}
          onChange={handleAlbumChange}
          onError={onError}
        />
      )}

      {selectedPhoto && (
        <PhotoDetails
          photo={selectedPhoto}
          photoUrl={getPhotoUrl(selectedPhoto, 'originals')}
          albums={albums}
          onClose={() => setSelectedPhoto(null)}
          onDelete={handleDeletePhoto}
          onRotate={handleRotatePhoto}
          onUpdate={() => loadPhotos()}
          onError={onError}
        />
      )}
    </div>
  );
};

export default PhotoGallery;
