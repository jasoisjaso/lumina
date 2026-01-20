import React, { useState } from 'react';
import photoGalleryAPI, { Photo, Album } from '../api/photo-gallery.api';

interface PhotoDetailsProps {
  photo: Photo;
  photoUrl: string;
  albums: Album[];
  onClose: () => void;
  onDelete: (photoId: number) => void;
  onRotate: (photoId: number) => void;
  onUpdate: () => void;
  onError?: (error: string) => void;
}

const PhotoDetails: React.FC<PhotoDetailsProps> = ({
  photo,
  photoUrl,
  albums,
  onClose,
  onDelete,
  onRotate,
  onUpdate,
  onError,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(photo.title || '');
  const [description, setDescription] = useState(photo.description || '');
  const [albumId, setAlbumId] = useState<number | null>(photo.album_id || null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await photoGalleryAPI.updatePhotoMetadata(photo.id, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        album_id: albumId,
      });
      setIsEditing(false);
      onUpdate();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update photo';
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    onDelete(photo.id);
    setShowDeleteConfirm(false);
  };

  const handleRotate = () => {
    onRotate(photo.id);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col md:flex-row overflow-hidden">
        {/* Image Preview */}
        <div className="flex-1 bg-black flex items-center justify-center p-4 md:p-8">
          <img
            src={photoUrl}
            alt={photo.title || photo.original_filename}
            className="max-w-full max-h-full object-contain"
          />
        </div>

        {/* Details Panel */}
        <div className="w-full md:w-96 bg-white flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <h2 className="text-lg font-semibold text-slate-900">Photo Details</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Metadata */}
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Add a title"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a description"
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Album
                  </label>
                  <select
                    value={albumId || ''}
                    onChange={(e) => setAlbumId(e.target.value ? parseInt(e.target.value) : null)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">No Album</option>
                    {albums.map((album) => (
                      <option key={album.id} value={album.id}>
                        {album.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setTitle(photo.title || '');
                      setDescription(photo.description || '');
                      setAlbumId(photo.album_id || null);
                    }}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {photo.title && (
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{photo.title}</h3>
                  </div>
                )}
                {photo.description && (
                  <div>
                    <p className="text-sm text-slate-600">{photo.description}</p>
                  </div>
                )}
                {photo.album_id && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">ALBUM</p>
                    <p className="text-sm text-slate-900">
                      {albums.find((a) => a.id === photo.album_id)?.name || 'Unknown'}
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  Edit Details
                </button>
              </div>
            )}

            {/* File Information */}
            <div className="pt-4 border-t border-slate-200">
              <h4 className="text-xs font-medium text-slate-500 mb-3">FILE INFORMATION</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Filename</span>
                  <span className="text-slate-900 font-medium truncate ml-2">
                    {photo.original_filename}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Size</span>
                  <span className="text-slate-900 font-medium">
                    {formatFileSize(photo.file_size)}
                  </span>
                </div>
                {photo.width && photo.height && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Dimensions</span>
                    <span className="text-slate-900 font-medium">
                      {photo.width} × {photo.height}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Uploaded</span>
                  <span className="text-slate-900 font-medium">
                    {formatDate(photo.uploaded_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
            <button
              onClick={handleRotate}
              className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <svg
                className="w-4 h-4 inline-block mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Rotate
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <svg
                className="w-4 h-4 inline-block mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Photo?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This action cannot be undone. The photo will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoDetails;
