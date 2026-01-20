import React, { useState } from 'react';
import photoGalleryAPI, { Album } from '../api/photo-gallery.api';

interface AlbumManagerProps {
  albums: Album[];
  onClose: () => void;
  onChange: () => void;
  onError?: (error: string) => void;
}

const AlbumManager: React.FC<AlbumManagerProps> = ({ albums, onClose, onChange, onError }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<Album | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setIsSaving(true);
      await photoGalleryAPI.createAlbum(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
      setShowCreateForm(false);
      onChange();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create album';
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlbum || !name.trim()) return;

    try {
      setIsSaving(true);
      await photoGalleryAPI.updateAlbum(editingAlbum.id, {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setEditingAlbum(null);
      setName('');
      setDescription('');
      onChange();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update album';
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (albumId: number) => {
    try {
      await photoGalleryAPI.deleteAlbum(albumId);
      setDeleteConfirmId(null);
      onChange();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete album';
      onError?.(errorMessage);
    }
  };

  const startEdit = (album: Album) => {
    setEditingAlbum(album);
    setName(album.name);
    setDescription(album.description || '');
    setShowCreateForm(false);
  };

  const cancelEdit = () => {
    setEditingAlbum(null);
    setName('');
    setDescription('');
  };

  const startCreate = () => {
    setShowCreateForm(true);
    setEditingAlbum(null);
    setName('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h2 className="text-xl font-semibold text-slate-900">Manage Albums</h2>
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
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create/Edit Form */}
          {(showCreateForm || editingAlbum) && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="text-sm font-medium text-slate-900 mb-4">
                {editingAlbum ? 'Edit Album' : 'Create New Album'}
              </h3>
              <form onSubmit={editingAlbum ? handleUpdate : handleCreate} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Album Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter album name"
                    required
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter album description"
                    rows={2}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSaving || !name.trim()}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? 'Saving...' : editingAlbum ? 'Update Album' : 'Create Album'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false);
                      cancelEdit();
                    }}
                    disabled={isSaving}
                    className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Create Button */}
          {!showCreateForm && !editingAlbum && (
            <button
              onClick={startCreate}
              className="w-full mb-6 px-4 py-3 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border-2 border-dashed border-indigo-300"
            >
              + Create New Album
            </button>
          )}

          {/* Albums List */}
          {albums.length === 0 ? (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 mx-auto mb-3 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <p className="text-slate-600 font-medium">No albums yet</p>
              <p className="text-slate-500 text-sm mt-1">
                Create your first album to organize photos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-slate-900 mb-1">
                        {album.name}
                      </h4>
                      {album.description && (
                        <p className="text-sm text-slate-600 mb-2">{album.description}</p>
                      )}
                      <p className="text-xs text-slate-500">
                        Created {new Date(album.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => startEdit(album)}
                        className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        title="Edit album"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(album.id)}
                        className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete album"
                      >
                        <svg
                          className="w-4 h-4"
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
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Album?</h3>
            <p className="text-sm text-slate-600 mb-6">
              This will delete the album but not the photos in it. Photos will be moved to "All
              Photos".
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
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

export default AlbumManager;
