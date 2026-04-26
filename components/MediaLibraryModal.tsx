'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  File,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import UploadedImage from '@/components/UploadedImage';
import {
  deleteUploadedMedia,
  fetchMediaLibrary,
  type MediaLibraryItem,
  type UploadFolder,
  uploadMediaFile,
  withProtectedFileToken,
} from '@/lib/storage-utils';
import { resolveImageSource } from '@/lib/image-display';
import { useToast } from '@/components/ToastProvider';

interface MediaLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaLibraryItem) => void;
  folder: UploadFolder;
  title?: string;
  description?: string;
  accept?: string;
  relatedType?: string;
  relatedId?: string;
  relatedUserId?: string;
  relatedOrderId?: string;
  relatedProductId?: string;
  replaceMediaId?: string;
  fileAccessToken?: string;
  filterByRelatedFields?: boolean;
  allowDelete?: boolean;
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb = kb / 1024;
  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(mb / 1024).toFixed(1)} GB`;
}

function looksLikeImage(media: MediaLibraryItem) {
  const mime = (media.mimeType || '').toLowerCase();
  if (mime.startsWith('image/')) {
    return true;
  }

  const name = `${media.originalFileName || ''} ${media.fileName || ''}`.toLowerCase();
  return /\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(name);
}

export default function MediaLibraryModal({
  open,
  onClose,
  onSelect,
  folder,
  title = 'Media Library',
  description = 'Select an existing asset or upload a new one.',
  accept = 'image/*',
  relatedType = '',
  relatedId = '',
  relatedUserId = '',
  relatedOrderId = '',
  relatedProductId = '',
  replaceMediaId = '',
  fileAccessToken = '',
  filterByRelatedFields = false,
  allowDelete = false,
}: MediaLibraryModalProps) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [items, setItems] = useState<MediaLibraryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedId, setSelectedId] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadLibrary = useCallback(async (showRefreshState = false) => {
    if (!open) {
      return;
    }

    if (showRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      const relationFilters = filterByRelatedFields
        ? {
            relatedType,
            relatedId,
            relatedUserId,
            relatedOrderId,
            relatedProductId,
          }
        : {};

      const loaded = await fetchMediaLibrary({
        folder,
        limit: 120,
        ...relationFilters,
      });
      setItems(loaded);
      setSelectedId((prev) => (loaded.some((item) => item.id === prev) ? prev : ''));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load media library.';
      setErrorMessage(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [open, folder, relatedType, relatedId, relatedUserId, relatedOrderId, relatedProductId, filterByRelatedFields]);

  useEffect(() => {
    if (!open) {
      return;
    }
    void loadLibrary(false);
  }, [open, loadLibrary]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onEscape);
    return () => window.removeEventListener('keydown', onEscape);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setMobileSearchOpen(false);
    }
  }, [open]);

  const filteredItems = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {
      return items;
    }

    return items.filter((item) => {
      const haystack = [
        item.originalFileName,
        item.fileName,
        item.mimeType,
        item.note,
        item.relatedType,
        item.relatedId,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, searchTerm]);

  const selectedMedia = useMemo(
    () => filteredItems.find((item) => item.id === selectedId) || items.find((item) => item.id === selectedId) || null,
    [filteredItems, items, selectedId]
  );

  function closeIfBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }

  function handleOpenDevicePicker() {
    if (uploading) {
      return;
    }
    fileInputRef.current?.click();
  }

  async function handleUploadChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      const uploadedItems: MediaLibraryItem[] = [];
      let failedCount = 0;
      const failedMessages: string[] = [];

      for (const [index, file] of files.entries()) {
        try {
          const uploaded = await uploadMediaFile({
            file,
            folder,
            relatedType,
            relatedId,
            relatedUserId,
            relatedOrderId,
            relatedProductId,
            replaceMediaId: index === 0 ? replaceMediaId : '',
          });

          uploadedItems.push({
            id: uploaded.id,
            url: uploaded.url,
            publicPath: uploaded.publicPath,
            storagePath: uploaded.storagePath,
            fileName: uploaded.fileName,
            originalFileName: file.name,
            mimeType: uploaded.mimeType,
            sizeBytes: uploaded.sizeBytes,
            folder: uploaded.folder,
            access: uploaded.access,
            ownerId: '',
            relatedType,
            relatedId,
            relatedUserId,
            relatedOrderId,
            relatedProductId,
            note: '',
            createdAt: new Date().toISOString(),
          });
        } catch (uploadError) {
          failedCount += 1;
          const reason =
            uploadError instanceof Error && uploadError.message.trim()
              ? uploadError.message.trim()
              : 'Unknown upload error';
          failedMessages.push(`${file.name}: ${reason}`);
        }
      }

      if (uploadedItems.length) {
        setItems((prev) => {
          const next = [...uploadedItems];
          const seen = new Set(next.map((item) => item.id));
          for (const currentItem of prev) {
            if (!seen.has(currentItem.id)) {
              next.push(currentItem);
            }
          }
          return next;
        });
        setSelectedId(uploadedItems[0].id);
      }

      if (uploadedItems.length && failedCount === 0) {
        toast.success(
          uploadedItems.length === 1 ? 'File uploaded' : `${uploadedItems.length} files uploaded`
        );
      } else if (uploadedItems.length && failedCount > 0) {
        const detail = failedMessages[0] || `${failedCount} file${failedCount > 1 ? 's' : ''} failed`;
        setErrorMessage(detail);
        toast.info(
          `${uploadedItems.length} files uploaded`,
          detail
        );
      } else {
        throw new Error(failedMessages[0] || 'Failed to upload selected files.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload file.';
      setErrorMessage(message);
      toast.error('Upload failed', message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handleDeleteItem(item: MediaLibraryItem, event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();

    if (!allowDelete || deletingIds.includes(item.id)) {
      return;
    }

    if (!window.confirm(`Delete "${item.originalFileName || item.fileName}" from media library?`)) {
      return;
    }

    setDeletingIds((prev) => [...prev, item.id]);
    try {
      await deleteUploadedMedia(item.id);
      setItems((prev) => prev.filter((entry) => entry.id !== item.id));
      setSelectedId((prev) => (prev === item.id ? '' : prev));
      toast.success('Media deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete media.';
      setErrorMessage(message);
      toast.error('Delete failed', message);
    } finally {
      setDeletingIds((prev) => prev.filter((id) => id !== item.id));
    }
  }

  function handleSelectAndApply() {
    if (!selectedMedia) {
      return;
    }
    onSelect(selectedMedia);
    onClose();
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm p-4 md:p-8"
      onMouseDown={closeIfBackdrop}
      data-lenis-prevent
    >
      <div className="mx-auto h-full max-w-6xl rounded-[2rem] border border-primary/20 bg-[#101010] shadow-[0_24px_80px_rgba(0,0,0,0.55)] overflow-hidden flex flex-col">
        <div className="px-5 md:px-7 py-4 border-b border-white/10 bg-gradient-to-r from-[#141414] via-[#1A1A1A] to-[#121212]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-black uppercase tracking-wide text-brand-text">{title}</h2>
              <p className="text-[10px] md:text-xs text-brand-text/45 font-black uppercase tracking-[0.18em] mt-1">
                {description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="h-10 w-10 shrink-0 rounded-xl border border-white/15 bg-white/5 text-brand-text/65 hover:text-brand-text hover:border-primary/35 transition-colors grid place-items-center"
              aria-label="Close media library"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-4 md:px-7 py-3 md:py-4 border-b border-white/10 bg-[#111111]">
          <div className="md:hidden space-y-2.5">
            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenDevicePicker}
                disabled={uploading}
                className="flex-1 rounded-xl border border-primary/35 bg-gradient-to-r from-primary via-[#FFE54A] to-[#F9B12D] px-4 py-2.5 text-black text-[10px] font-black uppercase tracking-widest shadow-[0_10px_24px_rgba(255,214,0,0.25)] disabled:opacity-70 inline-flex items-center justify-center gap-2"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Upload Files
              </button>

              <button
                onClick={() => setMobileSearchOpen((prev) => !prev)}
                className={`h-10 w-10 rounded-xl border grid place-items-center transition-colors ${
                  mobileSearchOpen
                    ? 'border-primary/45 text-primary bg-primary/10'
                    : 'border-white/15 bg-white/[0.03] text-brand-text/65'
                }`}
                aria-label="Toggle search"
              >
                <Search className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  void loadLibrary(true);
                }}
                disabled={loading || refreshing || uploading}
                className="h-10 w-10 rounded-xl border border-white/15 bg-white/[0.03] text-brand-text/65 hover:text-brand-text disabled:opacity-60 inline-flex items-center justify-center"
                aria-label="Refresh library"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              </button>
            </div>

            {mobileSearchOpen ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/35" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search files"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-primary/40"
                />
              </div>
            ) : null}
          </div>

          <div className="hidden md:grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto] gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text/35" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search files by name or type"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] pl-10 pr-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-primary/40"
              />
            </div>

            <button
              onClick={() => {
                void loadLibrary(true);
              }}
              disabled={loading || refreshing || uploading}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-brand-text/65 hover:text-brand-text disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>

            <button
              onClick={handleOpenDevicePicker}
              disabled={uploading}
              className="rounded-xl border border-primary/35 bg-gradient-to-r from-primary via-[#FFE54A] to-[#F9B12D] px-5 py-2.5 text-black text-[11px] font-black uppercase tracking-widest shadow-[0_10px_24px_rgba(255,214,0,0.25)] disabled:opacity-70 inline-flex items-center justify-center gap-2"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload Files
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple
            className="hidden"
            onChange={handleUploadChange}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-7 py-5 bg-[#0F0F0F]" data-lenis-prevent>
          {loading ? (
            <div className="h-full min-h-[260px] grid place-items-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : errorMessage ? (
            <div className="rounded-2xl border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-accent">
              {errorMessage}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="h-full min-h-[260px] grid place-items-center text-center">
              <div className="max-w-md space-y-4">
                <div className="mx-auto h-14 w-14 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
                  <ImageIcon className="w-7 h-7 text-brand-text/30" />
                </div>
                <div className="text-sm text-brand-text/60">No matching media found in this library.</div>
                <button
                  onClick={handleOpenDevicePicker}
                  disabled={uploading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/35 bg-primary/90 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-black"
                >
                  <Upload className="w-4 h-4" />
                  Upload Files
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {filteredItems.map((item) => {
                const isImage = looksLikeImage(item);
                const basePreviewUrl = resolveImageSource(item, {
                  stringPaths: ['url', 'publicPath', 'storagePath'],
                });
                const previewUrl =
                  item.access === 'protected'
                    ? withProtectedFileToken(basePreviewUrl, fileAccessToken)
                    : basePreviewUrl;
                const isSelected = item.id === selectedId;
                const displayName = item.originalFileName || item.fileName || 'Untitled';
                const createdAtLabel = item.createdAt
                  ? new Date(item.createdAt).toLocaleDateString()
                  : '';

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className={`group relative text-left rounded-2xl border overflow-hidden transition-all ${
                      isSelected
                        ? 'border-primary bg-white/10 shadow-[0_0_0_1px_rgba(255,214,0,0.4),0_12px_30px_rgba(0,0,0,0.35)]'
                        : 'border-white/10 bg-white/[0.03] hover:border-primary/35'
                    }`}
                  >
                    {allowDelete ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          void handleDeleteItem(item, event);
                        }}
                        disabled={deletingIds.includes(item.id)}
                        className="absolute left-2 top-2 z-20 h-6 w-6 rounded-full border border-accent/30 bg-black/65 text-accent hover:bg-accent/15 hover:text-accent disabled:opacity-50 grid place-items-center"
                        aria-label={`Delete ${displayName}`}
                      >
                        {deletingIds.includes(item.id) ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    ) : null}

                    <div className="relative h-32 md:h-36 bg-[#161616]">
                      {isImage ? (
                        <UploadedImage
                          src={previewUrl}
                          fallbackSrc={null}
                          fallbackOnError={false}
                          alt={displayName}
                          className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="absolute inset-0 grid place-items-center">
                          <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/[0.04] grid place-items-center">
                            <File className="w-6 h-6 text-brand-text/55" />
                          </div>
                        </div>
                      )}

                      {isSelected ? (
                        <div className="absolute right-2 top-2 h-6 w-6 rounded-full bg-primary text-black grid place-items-center shadow-lg">
                          <Check className="w-4 h-4" />
                        </div>
                      ) : null}
                    </div>

                    <div className="px-3 py-2.5 space-y-1">
                      <div className="text-xs font-semibold text-brand-text truncate" title={displayName}>
                        {displayName}
                      </div>
                      <div className="text-[10px] text-brand-text/45 flex items-center justify-between gap-2">
                        <span className="truncate">{formatFileSize(item.sizeBytes)}</span>
                        {createdAtLabel ? <span className="truncate">{createdAtLabel}</span> : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-4 md:px-7 py-3 md:py-4 border-t border-white/10 bg-[#111111] flex items-center justify-between gap-2.5 md:gap-3">
          <div className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-brand-text/35">
            {selectedMedia ? `${selectedMedia.originalFileName || selectedMedia.fileName} selected` : 'No media selected'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-white/15 bg-white/[0.03] px-3.5 md:px-4 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-brand-text/65 hover:text-brand-text"
            >
              Cancel
            </button>
            <button
              onClick={handleSelectAndApply}
              disabled={!selectedMedia}
              className="rounded-xl border border-primary/35 bg-primary px-4 md:px-5 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-black disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Use Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
