'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  ArrowLeft,
  CalendarClock,
  Edit,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  PencilRuler,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ToastProvider';
import UploadedImage from '@/components/UploadedImage';
import MediaLibraryModal from '@/components/MediaLibraryModal';
import { deleteUploadedMedia, toStorageMetadataFromLibrary } from '@/lib/storage-utils';
import { logFirestoreSaveFailure, sanitizeForFirestore } from '@/lib/firestore-sanitize';
import {
  blogSortTimestamp,
  formatBlogPublishDate,
  normalizeBlogPostDocument,
  normalizeBlogSlug,
  type BlogPostDocument,
} from '@/lib/blog';
import type { StoredFileMetadata } from '@/lib/types/domain';
import {
  buildBlogRelValue,
  isExternalBlogHref,
  normalizeBlogEditorUrl,
  parseBlogLinkMeta,
  sanitizeBlogHref,
} from '@/lib/blog-links';

type BlogFormState = {
  title: string;
  shortDescription: string;
  content: string;
  coverImageUrl: string;
  coverImageMedia: StoredFileMetadata | null;
};

type LinkInsertTargetField = 'shortDescription' | 'content';

type LinkInsertState = {
  targetField: LinkInsertTargetField;
  anchorText: string;
  url: string;
  title: string;
  openInNewTab: boolean;
  nofollow: boolean;
};

const INITIAL_FORM: BlogFormState = {
  title: '',
  shortDescription: '',
  content: '',
  coverImageUrl: '',
  coverImageMedia: null,
};

const INITIAL_LINK_INSERT: LinkInsertState = {
  targetField: 'content',
  anchorText: '',
  url: '',
  title: '',
  openInNewTab: false,
  nofollow: false,
};

export default function BlogCMSPage() {
  const { isStaff, profile } = useAuth();
  const toast = useToast();

  const [posts, setPosts] = useState<BlogPostDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
  const [showLinkBuilder, setShowLinkBuilder] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostDocument | null>(null);
  const [formData, setFormData] = useState<BlogFormState>(INITIAL_FORM);
  const [linkInsert, setLinkInsert] = useState<LinkInsertState>(INITIAL_LINK_INSERT);
  const shortDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!isStaff) {
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'blogPosts'),
      (snapshot) => {
        const next = snapshot.docs
          .map((entry) => normalizeBlogPostDocument(entry.data(), entry.id))
          .sort((a, b) => blogSortTimestamp(b) - blogSortTimestamp(a));
        setPosts(next);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading blog posts:', error);
        toast.error('Failed to load blog posts');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isStaff, toast]);

  const formImagePreview = useMemo(() => {
    return formData.coverImageUrl || formData.coverImageMedia?.fileUrl || '';
  }, [formData.coverImageMedia, formData.coverImageUrl]);

  function resetEditor() {
    setFormData(INITIAL_FORM);
    setEditingPost(null);
    setLinkInsert(INITIAL_LINK_INSERT);
    setShowLinkBuilder(false);
    setShowMarkdownPreview(false);
    setIsEditorOpen(false);
  }

  function openCreateEditor() {
    setFormData(INITIAL_FORM);
    setEditingPost(null);
    setLinkInsert(INITIAL_LINK_INSERT);
    setShowLinkBuilder(false);
    setShowMarkdownPreview(false);
    setIsEditorOpen(true);
  }

  function openEditEditor(post: BlogPostDocument) {
    setEditingPost(post);
    setFormData({
      title: post.title,
      shortDescription: post.shortDescription,
      content: post.content,
      coverImageUrl: post.coverImageUrl,
      coverImageMedia: post.coverImageMedia || null,
    });
    setLinkInsert(INITIAL_LINK_INSERT);
    setShowLinkBuilder(false);
    setShowMarkdownPreview(false);
    setIsEditorOpen(true);
  }

  function buildMarkdownLinkMarkup(input: {
    anchorText: string;
    url: string;
    title: string;
    openInNewTab: boolean;
    nofollow: boolean;
  }) {
    const cleanAnchor = input.anchorText.trim();
    const cleanUrl = normalizeBlogEditorUrl(input.url);
    const cleanTitle = input.title.trim();

    if (!cleanAnchor || !cleanUrl) {
      return '';
    }

    const titleTokens = [];
    if (cleanTitle) {
      titleTokens.push(cleanTitle);
    }
    if (input.openInNewTab) {
      titleTokens.push('newtab');
    }
    if (input.nofollow) {
      titleTokens.push('nofollow');
    }

    const suffix = titleTokens.length
      ? ` "${titleTokens.join(' | ').replace(/"/g, '\\"')}"`
      : '';
    return `[${cleanAnchor}](${cleanUrl}${suffix})`;
  }

  function applyMarkdownAtCursor(field: LinkInsertTargetField, markup: string) {
    const ref = field === 'shortDescription' ? shortDescriptionRef : contentRef;
    const element = ref.current;

    if (!element) {
      setFormData((prev) => ({
        ...prev,
        [field]: `${prev[field].trimEnd()} ${markup}`.trim(),
      }));
      return;
    }

    const source = formData[field] || '';
    const start = element.selectionStart ?? source.length;
    const end = element.selectionEnd ?? source.length;
    const nextValue = `${source.slice(0, start)}${markup}${source.slice(end)}`;

    setFormData((prev) => ({
      ...prev,
      [field]: nextValue,
    }));

    window.requestAnimationFrame(() => {
      const cursor = start + markup.length;
      element.focus();
      element.setSelectionRange(cursor, cursor);
    });
  }

  function handleInsertLink() {
    const targetField = linkInsert.targetField;
    const targetRef = targetField === 'shortDescription' ? shortDescriptionRef : contentRef;
    const source = formData[targetField] || '';
    const selectedText =
      targetRef.current && targetRef.current.selectionStart !== targetRef.current.selectionEnd
        ? source
            .slice(targetRef.current.selectionStart, targetRef.current.selectionEnd)
            .trim()
        : '';

    const anchorText = linkInsert.anchorText.trim() || selectedText;
    const markup = buildMarkdownLinkMarkup({
      anchorText,
      url: linkInsert.url,
      title: linkInsert.title,
      openInNewTab: linkInsert.openInNewTab,
      nofollow: linkInsert.nofollow,
    });

    if (!anchorText) {
      toast.error('Anchor text required', 'Select text or provide anchor text.');
      return;
    }
    if (!markup) {
      toast.error('Valid URL required', 'Enter a valid internal/external URL.');
      return;
    }

    applyMarkdownAtCursor(targetField, markup);
    setLinkInsert((prev) => ({
      ...prev,
      anchorText: '',
      url: '',
      title: '',
      openInNewTab: false,
      nofollow: false,
    }));
    toast.success('Link inserted');
  }

  async function isSlugAvailable(slug: string, currentPostId = '') {
    const checkQuery = query(collection(db, 'blogPosts'), where('slug', '==', slug), limit(3));
    const snapshot = await getDocs(checkQuery);
    return snapshot.docs.every((entry) => entry.id === currentPostId);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) {
      return;
    }

    const title = formData.title.trim();
    const slug = normalizeBlogSlug(title);
    const shortDescription = formData.shortDescription.trim();
    const content = formData.content.trim();
    const coverImageUrl = formData.coverImageUrl.trim();
    const resolvedCoverImage = coverImageUrl || formData.coverImageMedia?.fileUrl || '';

    if (!title) {
      toast.error('Title is required');
      return;
    }
    if (!slug) {
      toast.error('Slug is required');
      return;
    }
    if (!shortDescription) {
      toast.error('Short description is required');
      return;
    }
    if (!content) {
      toast.error('Content is required');
      return;
    }
    if (!resolvedCoverImage) {
      toast.error('Cover image is required');
      return;
    }

    setSaving(true);

    let rawPayloadForDebug: Record<string, unknown> | null = null;
    let finalPayloadForDebug: Record<string, unknown> | null = null;

    try {
      const available = await isSlugAvailable(slug, editingPost?.id || '');
      if (!available) {
        toast.error('Slug already exists. Please choose a unique slug.');
        setSaving(false);
        return;
      }

      const authorName = profile?.displayName?.trim() || editingPost?.authorName || 'Admin';
      const payload = {
        title,
        slug,
        shortDescription,
        excerpt: shortDescription,
        content,
        status: 'published',
        published: true,
        publishedAt: serverTimestamp(),
        category: editingPost?.category || 'General',
        tags: editingPost?.tags || [],
        coverImageUrl: resolvedCoverImage,
        coverImageMedia: formData.coverImageMedia || null,
        thumbnail: resolvedCoverImage,
        thumbnailMedia: formData.coverImageMedia || null,
        authorName,
        author: authorName,
        authorId: profile?.uid || editingPost?.authorId || '',
        updatedAt: serverTimestamp(),
      };
      rawPayloadForDebug = payload as Record<string, unknown>;

      const sanitizedPayload = sanitizeForFirestore(payload);
      finalPayloadForDebug = sanitizedPayload as Record<string, unknown>;

      if (editingPost) {
        await updateDoc(doc(db, 'blogPosts', editingPost.id), sanitizedPayload);
        toast.success('Blog post updated and published');
      } else {
        await addDoc(
          collection(db, 'blogPosts'),
          sanitizeForFirestore({
            ...sanitizedPayload,
            createdAt: serverTimestamp(),
          })
        );
        toast.success('Blog post created and published');
      }

      resetEditor();
    } catch (error) {
      logFirestoreSaveFailure({
        scope: 'admin-blog-save',
        collection: 'blogPosts',
        payload: finalPayloadForDebug || rawPayloadForDebug,
        sanitized: Boolean(finalPayloadForDebug),
        error,
      });
      console.error('Error saving blog post:', error);
      toast.error('Failed to save blog post', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(post: BlogPostDocument) {
    if (!window.confirm(`Delete "${post.title}"?`)) {
      return;
    }

    try {
      if (post.coverImageMedia?.mediaId) {
        await deleteUploadedMedia(post.coverImageMedia.mediaId).catch((mediaError) => {
          console.warn('Blog cover cleanup failed:', mediaError);
        });
      }
      await deleteDoc(doc(db, 'blogPosts', post.id));
      toast.success('Blog post deleted');
    } catch (error) {
      console.error('Error deleting blog post:', error);
      toast.error('Failed to delete blog post', error instanceof Error ? error.message : 'Please try again.');
    }
  }

  if (!isStaff) {
    return <div className="pt-32 text-center">Access Denied.</div>;
  }

  return (
    <div className="pt-32 pb-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center text-center mb-10 gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black uppercase text-brand-text leading-tight">
              Blog <span className="text-primary">CMS</span>
            </h1>
            <p className="text-brand-text/40 text-[10px] md:text-sm font-black uppercase tracking-widest mt-2 px-6">
              Simplified editor: auto publish + auto publish date
            </p>
          </div>

          <button
            onClick={openCreateEditor}
            className="w-full md:w-auto bg-primary text-brand-bg px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center justify-center gap-3 border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 transition-all active:scale-95"
          >
            <Plus className="w-5 h-5" />
            <span>Create Blog Post</span>
          </button>
        </div>

        {isEditorOpen ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 md:relative md:inset-auto w-full h-full md:h-auto bg-[#121212] md:bg-transparent z-[60] md:z-auto overflow-y-auto md:overflow-visible rounded-none md:rounded-[2.5rem] p-6 md:p-10 border-none md:border border-white/10 mb-12 backdrop-blur-3xl md:backdrop-blur-none"
          >
            <div className="max-w-5xl mx-auto pt-20 relative">
              <button
                type="button"
                onClick={resetEditor}
                className="absolute top-4 left-0 flex items-center gap-2 text-brand-text/50 hover:text-primary transition-colors py-2 px-4 bg-white/5 rounded-xl border border-white/10"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Close Editor</span>
              </button>

              <div className="flex items-start justify-between mb-8 gap-4">
                <div>
                  <h2 className="text-3xl font-black uppercase text-brand-text">
                    {editingPost ? 'Edit Blog Post' : 'Create Blog Post'}
                  </h2>
                  <p className="text-xs text-brand-text/40 mt-2 uppercase tracking-widest font-black">
                    Only essential fields - published automatically
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMarkdownPreview((prev) => !prev)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  <PencilRuler className="w-4 h-4 text-primary" />
                  {showMarkdownPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">
                    Title*
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(event) =>
                      setFormData((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary"
                    required
                  />
                  <p className="mt-2 text-[11px] text-brand-text/40">
                    Slug auto-generated: /blogs/{normalizeBlogSlug(formData.title) || 'auto-generated'}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-2">
                    Short Description*
                  </label>
                  <textarea
                    ref={shortDescriptionRef}
                    value={formData.shortDescription}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, shortDescription: event.target.value }))
                    }
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary h-28"
                    maxLength={240}
                    required
                  />
                  <p className="mt-2 text-[11px] text-brand-text/40">
                    {formData.shortDescription.length}/240 characters
                  </p>
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40 mb-3">
                    Cover Image*
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="w-24 h-24 rounded-xl bg-white/5 border border-white/10 flex-shrink-0 relative overflow-hidden">
                      {formImagePreview ? (
                        <UploadedImage
                          src={formImagePreview}
                          fallbackSrc={null}
                          fallbackOnError={false}
                          alt="Blog cover preview"
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-text/20" />
                      )}
                    </div>
                    <div className="flex-1">
                      <button
                        type="button"
                        onClick={() => setIsMediaLibraryOpen(true)}
                        className="inline-flex items-center space-x-2 bg-white/5 hover:bg-white/10 px-4 py-2.5 rounded-lg border border-white/10 transition-colors text-xs font-bold uppercase tracking-widest"
                      >
                        <ImageIcon className="w-4 h-4 text-primary" />
                        <span>Select/Upload Cover</span>
                      </button>
                      <p className="mt-2 text-[11px] text-brand-text/40">
                        Uses Hostinger public uploads (`/uploads/...`)
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-text/40">
                      Content (Markdown)*
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLinkBuilder((prev) => !prev)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/15 transition-colors"
                    >
                      {showLinkBuilder ? 'Hide Link Tool' : 'Insert Link'}
                    </button>
                  </div>

                  {showLinkBuilder ? (
                    <div className="mb-4 rounded-xl border border-white/10 bg-black/20 p-4 space-y-3">
                      <p className="text-[11px] text-brand-text/55">
                        Select text in editor then insert backlink. External links open in new tab by default.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest font-black text-brand-text/45 mb-1.5">
                            Target Field
                          </label>
                          <select
                            value={linkInsert.targetField}
                            onChange={(event) =>
                              setLinkInsert((prev) => ({
                                ...prev,
                                targetField: event.target.value as LinkInsertTargetField,
                              }))
                            }
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          >
                            <option value="content">Main Content</option>
                            <option value="shortDescription">Short Description</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase tracking-widest font-black text-brand-text/45 mb-1.5">
                            Anchor Text
                          </label>
                          <input
                            type="text"
                            value={linkInsert.anchorText}
                            onChange={(event) =>
                              setLinkInsert((prev) => ({ ...prev, anchorText: event.target.value }))
                            }
                            placeholder="Use selected text or type manually"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-widest font-black text-brand-text/45 mb-1.5">
                            URL
                          </label>
                          <input
                            type="text"
                            value={linkInsert.url}
                            onChange={(event) =>
                              setLinkInsert((prev) => ({ ...prev, url: event.target.value }))
                            }
                            placeholder="https://example.com or /tools/canva-pro"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] uppercase tracking-widest font-black text-brand-text/45 mb-1.5">
                            Optional Link Title
                          </label>
                          <input
                            type="text"
                            value={linkInsert.title}
                            onChange={(event) =>
                              setLinkInsert((prev) => ({ ...prev, title: event.target.value }))
                            }
                            placeholder="Tooltip/title text"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-5">
                        <label className="inline-flex items-center gap-2 text-[11px] text-brand-text/75">
                          <input
                            type="checkbox"
                            checked={linkInsert.openInNewTab}
                            onChange={(event) =>
                              setLinkInsert((prev) => ({ ...prev, openInNewTab: event.target.checked }))
                            }
                            className="accent-primary"
                          />
                          Open in new tab (for internal links)
                        </label>
                        <label className="inline-flex items-center gap-2 text-[11px] text-brand-text/75">
                          <input
                            type="checkbox"
                            checked={linkInsert.nofollow}
                            onChange={(event) =>
                              setLinkInsert((prev) => ({ ...prev, nofollow: event.target.checked }))
                            }
                            className="accent-primary"
                          />
                          Mark as nofollow
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={handleInsertLink}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-black text-[10px] font-black uppercase tracking-widest border-b-2 border-[#FF8C2A]"
                        >
                          Insert Markdown Link
                        </button>
                        <span className="text-[11px] text-brand-text/40">
                          Internal examples: `/tools`, `/services`, `/blogs/your-slug`
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <textarea
                    ref={contentRef}
                    value={formData.content}
                    onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary h-72 font-mono text-sm"
                    required
                  />
                </div>

                {showMarkdownPreview ? (
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-6">
                    <h3 className="text-xs font-black uppercase tracking-widest text-brand-text/40 mb-4">
                      Live Markdown Preview
                    </h3>
                    <div className="prose prose-invert max-w-none prose-headings:text-brand-text prose-headings:font-black prose-p:text-brand-text/80 prose-li:text-brand-text/80 prose-a:text-primary">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        skipHtml
                        allowedElements={[
                          'h1',
                          'h2',
                          'h3',
                          'h4',
                          'h5',
                          'h6',
                          'p',
                          'a',
                          'strong',
                          'em',
                          'ul',
                          'ol',
                          'li',
                          'blockquote',
                          'code',
                          'pre',
                          'hr',
                          'br',
                        ]}
                        components={{
                          p: ({ children }) => (
                            <p className="whitespace-pre-wrap leading-7 text-brand-text/80">{children}</p>
                          ),
                          a: ({ href, title, children, ...props }) => {
                            const safeHref = sanitizeBlogHref(href);
                            const linkMeta = parseBlogLinkMeta(title);
                            const external = isExternalBlogHref(safeHref);
                            const openInNewTab = external || linkMeta.openInNewTab;
                            const rel = buildBlogRelValue({
                              external,
                              nofollow: linkMeta.nofollow,
                              openInNewTab,
                            });

                            return (
                              <a
                                href={safeHref}
                                title={linkMeta.title}
                                target={openInNewTab ? '_blank' : undefined}
                                rel={rel}
                                {...props}
                              >
                                {children}
                              </a>
                            );
                          },
                        }}
                      >
                        {formData.content || 'Start writing markdown content...'}
                      </ReactMarkdown>
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-col md:flex-row justify-end gap-4 p-6 border-t border-white/5 bg-black/40 rounded-2xl">
                  <button
                    type="button"
                    onClick={resetEditor}
                    className="order-2 md:order-1 px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-brand-text/40 hover:text-brand-text transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="order-1 md:order-2 bg-primary text-brand-bg px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] border-b-4 border-[#FF8C2A] shadow-xl shadow-primary/10 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    <span>{saving ? 'Saving...' : editingPost ? 'Update & Publish' : 'Publish Post'}</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : null}

        <div className="glass rounded-[2.5rem] border-white/10 overflow-hidden">
          <div className="p-8 md:p-10">
            {loading ? (
              <div className="text-center py-10 text-brand-text/60">Loading posts...</div>
            ) : posts.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[860px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="pb-5 text-xs font-bold uppercase tracking-widest text-brand-text/40">
                        Article
                      </th>
                      <th className="pb-5 text-xs font-bold uppercase tracking-widest text-brand-text/40">
                        Published
                      </th>
                      <th className="pb-5 text-xs font-bold uppercase tracking-widest text-brand-text/40 text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => {
                      const publishDate = formatBlogPublishDate(post.publishedAt || post.createdAt);
                      return (
                        <tr key={post.id} className="border-b border-white/5">
                          <td className="py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 border border-white/10 relative">
                                {post.coverImageUrl ? (
                                  <UploadedImage
                                    src={post.coverImageUrl}
                                    fallbackSrc={null}
                                    fallbackOnError={false}
                                    alt={post.title}
                                    className="absolute inset-0 w-full h-full object-cover"
                                  />
                                ) : (
                                  <ImageIcon className="w-5 h-5 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-brand-text/25" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-brand-text">{post.title}</p>
                                <p className="text-xs text-brand-text/40">/blogs/{post.slug}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-5">
                            <span className="inline-flex items-center gap-2 text-sm text-brand-text/75">
                              <CalendarClock className="w-4 h-4 text-primary" />
                              {publishDate}
                            </span>
                          </td>
                          <td className="py-5 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <Link
                                href={`/blogs/${post.slug}`}
                                target="_blank"
                                className="p-2 rounded-lg hover:bg-white/10 text-brand-text/40 hover:text-primary transition-colors"
                                aria-label={`Open ${post.title}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <button
                                type="button"
                                onClick={() => openEditEditor(post)}
                                className="p-2 rounded-lg hover:bg-white/10 text-brand-text/40 hover:text-primary transition-colors"
                                aria-label={`Edit ${post.title}`}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDelete(post)}
                                className="p-2 rounded-lg hover:bg-white/10 text-brand-text/40 hover:text-accent transition-colors"
                                aria-label={`Delete ${post.title}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-20">
                <FileText className="w-16 h-16 text-brand-text/10 mx-auto mb-4" />
                <p className="text-brand-text/45">No blog posts yet. Create your first post.</p>
              </div>
            )}
          </div>
        </div>

        <MediaLibraryModal
          open={isMediaLibraryOpen}
          onClose={() => setIsMediaLibraryOpen(false)}
          allowDelete
          onSelect={(media) => {
            setFormData((prev) => ({
              ...prev,
              coverImageUrl: media.url,
              coverImageMedia: toStorageMetadataFromLibrary(media),
            }));
          }}
          folder="blogs"
          title="Blog Media Library"
          description="Select an existing blog image or upload a new one."
          accept="image/*"
          relatedType="blog"
          relatedId={editingPost?.id || ''}
          replaceMediaId={formData.coverImageMedia?.mediaId || ''}
        />
      </div>
    </div>
  );
}
