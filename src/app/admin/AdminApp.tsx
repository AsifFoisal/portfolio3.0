'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import type { SiteContent } from '../data/content-types';
import { useToast } from './Toaster';
import './admin.css';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const IMAGE_PATTERN = /\.(png|jpe?g|webp|gif|svg|avif)(\?.*)?$/i;
const isImagePath = (value: string) => IMAGE_PATTERN.test(value) && /^(https?:)?\/\//.test(value) === (value.startsWith('http'));

const VIDEO_PATTERN = /\.(mp4|webm|mov|m4v|ogv|ogg|avi|mkv)(\?.*)?$/i;
const isVideoPath = (value: string) =>
  VIDEO_PATTERN.test(value) || /res\.cloudinary\.com\/[^/]+\/video\/upload\//i.test(value);

/** Cloudinary's free plan caps a single upload at 100 MB. */
const MAX_MEDIA_BYTES = 100 * 1024 * 1024;

/** Field order for each top-level section. Important fields first. */
const FIELD_ORDER: Record<string, string[]> = {
  meta: ['title', 'description'],
  hero: ['greeting', 'nameLines', 'portrait', 'portraitAlt', 'portraitCaption', 'description', 'ctaLabel', 'title', 'disciplines', 'reel'],
  about: ['stats', 'face', 'faceHover', 'segments', 'posters'],
  featured: ['heading', 'eyebrow', 'projects', 'viewAllLabel', 'behanceUrl', 'liveLinkLabel', 'figmaLinkLabel', 'dialogEyebrowPrefix', 'dialogDownloadLabel'],
  services: ['heading', 'eyebrow', 'callLabel', 'items', 'title', 'description', 'imageLeft', 'imageRight', 'tags'],
  stories: ['captionTitle', 'captionText', 'captionEyebrow', 'videoUrl', 'poster', 'mobileTitleTop', 'mobileTitleBottom'],
  latest: ['heading', 'items'],
  helix: ['items', 'image'],
  work: ['brandName', 'heroTitle', 'projects', 'heroLogoDim', 'heroLogoFill', 'heroLogoAlt', 'liveLinkLabel', 'figmaLinkLabel', 'title', 'description', 'image', 'liveUrl', 'figmaUrl', 'align', 'width', 'art'],
  approach: ['heading', 'steps'],
  experience: ['heading', 'items'],
  testimonials: ['heading', 'eyebrow', 'items'],
  footer: ['backgroundImage', 'name', 'blurb', 'marqueeText', 'marqueeSymbol', 'cursorLabel', 'sayHelloLabel', 'whatsappUrl', 'email', 'servicesHeading', 'askAiLabel'],
  navigation: ['label', 'href'],
};

const SECTION_LABELS: Array<{ key: keyof SiteContent; label: string }> = [
  { key: 'meta', label: 'Site meta' },
  { key: 'hero', label: 'Hero' },
  { key: 'about', label: 'About' },
  { key: 'featured', label: 'Projects' },
  { key: 'services', label: 'Services' },
  { key: 'stories', label: 'Visual stories' },
  { key: 'latest', label: 'Latest works' },
  { key: 'helix', label: '3D Ribbon' },
  { key: 'work', label: 'Work page' },
  { key: 'approach', label: 'Approach' },
  { key: 'experience', label: 'Experience' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'footer', label: 'Footer' },
  { key: 'navigation', label: 'Navigation' },
];

function humanize(key: string) {
  return key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^(.)|\s(.)/g, (match) => match.toUpperCase());
}

function emptyLike(value: JsonValue): JsonValue {
  if (value === null || typeof value !== 'object') return '';
  if (Array.isArray(value)) return [];
  const template: { [key: string]: JsonValue } = {};
  for (const [key, child] of Object.entries(value)) template[key] = emptyLike(child);
  return template;
}

/** Sort object keys so important fields appear first, then alphabetically. */
function orderedEntries(obj: Record<string, JsonValue>, section: string): [string, JsonValue][] {
  const order = FIELD_ORDER[section] ?? [];
  const keys = new Set(Object.keys(obj));
  const ordered: [string, JsonValue][] = [];
  for (const key of order) {
    if (keys.has(key)) {
      ordered.push([key, obj[key]]);
      keys.delete(key);
    }
  }
  return ordered.concat([...keys].sort().map((key) => [key, obj[key]] as [string, JsonValue]));
}

type UploadSignatureResponse = {
  configured?: boolean;
  apiKey?: string;
  timestamp?: number;
  signature?: string;
  folder?: string;
  uploadUrl?: string;
};

/**
 * Media field for images and videos. When Cloudinary is configured the file is
 * uploaded straight from the browser to Cloudinary (via a server-signed
 * payload) so large videos bypass the app server, then the backend records it
 * and returns an optimized delivery URL. Otherwise it falls back to the
 * built-in database uploader (images only).
 */
function MediaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUpLoading] = useState(false);
  const isVideo = isVideoPath(value);

  async function handleFile(file: File) {
    setUpLoading(true);
    try {
      if (file.size > MAX_MEDIA_BYTES) throw new Error('File is larger than 100 MB');
      const kind = file.type.startsWith('video/') ? 'video' : 'image';

      // Ask the backend whether Cloudinary is configured and get a signed payload.
      const signResponse = await fetch('/api/admin/upload/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: kind }),
      });
      const signature = (await signResponse.json().catch(() => ({}))) as UploadSignatureResponse;

      if (signResponse.ok && signature.configured && signature.uploadUrl) {
        const form = new FormData();
        form.append('file', file);
        form.append('api_key', signature.apiKey ?? '');
        form.append('timestamp', String(signature.timestamp ?? ''));
        form.append('folder', signature.folder ?? '');
        form.append('signature', signature.signature ?? '');
        const response = await fetch(signature.uploadUrl, { method: 'POST', body: form });
        const result = (await response.json().catch(() => ({}))) as {
          public_id?: string;
          secure_url?: string;
          resource_type?: string;
          format?: string;
          bytes?: number;
          width?: number;
          height?: number;
          duration?: number;
          error?: { message?: string };
        };
        if (!response.ok || !result.secure_url) {
          throw new Error(result.error?.message ?? 'Cloudinary upload failed');
        }

        // Record metadata + receive the optimized delivery URL.
        const completeResponse = await fetch('/api/admin/upload/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            resourceType: result.resource_type ?? kind,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
            duration: result.duration,
          }),
        });
        const complete = (await completeResponse.json().catch(() => ({}))) as { url?: string; error?: string };
        if (!completeResponse.ok) throw new Error(complete.error ?? 'Could not record upload');
        onChange(complete.url ?? result.secure_url);
        toast.success(kind === 'video' ? 'Video uploaded.' : 'Image uploaded.');
        return;
      }

      // Cloudinary not configured → built-in database uploader (images only).
      if (kind === 'video') {
        throw new Error('Video upload needs Cloudinary credentials (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).');
      }
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/admin/upload', { method: 'POST', body });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error ?? 'Upload failed');
      onChange(data.url);
      toast.success('Image uploaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUpLoading(false);
    }
  }

  return (
    <div className="admin-image-field">
      <span className="admin-label">{label}</span>
      <div className="admin-image-row">
        {value && (isVideo ? (
          <video className="admin-image-preview" src={value} controls muted preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="admin-image-preview" src={value} alt="" />
        ))}
        <div className="admin-image-controls">
          <input className="admin-input" value={value} onChange={(event) => onChange(event.target.value)} spellCheck={false} />
          <div className="admin-image-actions">
            <button type="button" className="admin-outline-button" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? 'Uploading…' : isVideo ? 'Upload video' : 'Upload image'}
            </button>
            {value && <a className="admin-outline-button" href={value} target="_blank" rel="noreferrer">Open</a>}
          </div>
        </div>
      </div>
      <input ref={(el) => { fileRef.current = el; }} type="file" accept="image/*,video/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.target.value = ''; }} />
    </div>
  );
}

/**
 * Number input that can be cleared. A plain controlled number input snaps back
 * to "0" the moment you empty it; we keep a local text draft so the field stays
 * blank while editing and only commit a number (0 when blank / not yet valid).
 */
function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? String(value);

  return (
    <label className="admin-field">
      {label}
      <input
        className="admin-input"
        type="number"
        step="any"
        value={text}
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = Number(raw);
          onChange(raw === '' || !Number.isFinite(parsed) ? 0 : parsed);
        }}
      />
    </label>
  );
}

function JsonField({ label, value, onChange }: { label: string; value: JsonValue; onChange: (value: JsonValue) => void }) {
  if (typeof value === 'boolean') {
    return (
      <label className="admin-check-field">
        <input type="checkbox" checked={value} onChange={(event) => onChange(event.target.checked)} />
        <span>{label}</span>
      </label>
    );
  }

  if (typeof value === 'number') {
    return <NumberField label={label} value={value} onChange={onChange} />;
  }

  if (typeof value === 'string') {
    // Media fields are recognised by label (stable, e.g. "Image Left") or by
    // value (for arrays of images whose items only get a generic "Item n" label).
    const isMediaLabel = label.toLowerCase().startsWith('image') || label === 'Video url';
    if (isMediaLabel || isImagePath(value) || isVideoPath(value) || value.startsWith('/uploads/')) {
      return <MediaField label={label} value={value} onChange={onChange} />;
    }
    if (value.length > 90 || value.includes('\n')) {
      return (
        <label className="admin-field">
          {label}
          <textarea className="admin-input admin-textarea" rows={4} value={value} onChange={(event) => onChange(event.target.value)} />
        </label>
      );
    }
    return (
      <label className="admin-field">
        {label}
        <input className="admin-input" value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  return null;
}

function JsonArray({ label, value, onChange, section }: { label: string; value: JsonValue[]; onChange: (value: JsonValue[]) => void; section: string }) {
  const toast = useToast();
  const template = value.length > 0 ? emptyLike(value[0]) : '';

  function replaceAt(index: number, item: JsonValue) {
    onChange(value.map((existing, i) => (i === index ? item : existing)));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    toast.info(delta < 0 ? `Moved #${index + 1} up.` : `Moved #${index + 1} down.`);
  }

  return (
    <fieldset className="admin-array">
      <legend className="admin-legend">{label}</legend>
      {value.map((item, index) => (
        <div className="admin-array-item" key={index}>
          <div className="admin-array-item-head">
            <span>#{index + 1}</span>
            <div className="admin-array-item-actions">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} title="Move up">↑</button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === value.length - 1} title="Move down">↓</button>
              <button type="button" className="admin-danger" onClick={() => { onChange(value.filter((_, i) => i !== index)); toast.info(`Item #${index + 1} removed.`); }} title="Remove">✕</button>
            </div>
          </div>
          <JsonNode label={`Item ${index + 1}`} value={item} onChange={(itemValue) => replaceAt(index, itemValue)} section={section} />
        </div>
      ))}
      <button type="button" className="admin-outline-button" onClick={() => { onChange([...value, template]); toast.success('Item added.'); }}>
        Add item
      </button>
    </fieldset>
  );
}

function JsonObject({ label, value, onChange, section }: { label: string; value: { [key: string]: JsonValue }; onChange: (value: { [key: string]: JsonValue }) => void; section: string }) {
  return (
    <fieldset className="admin-object">
      {label && <legend className="admin-legend">{label}</legend>}
      {orderedEntries(value, section).map(([key, child]) => (
        <JsonNode key={key} label={humanize(key)} value={child} onChange={(childValue) => onChange({ ...value, [key]: childValue })} section={section} />
      ))}
    </fieldset>
  );
}

function JsonNode({ label, value, onChange, section }: { label: string; value: JsonValue; onChange: (value: JsonValue) => void; section: string }) {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return <JsonObject label={label} value={value} onChange={onChange} section={section} />;
  }
  if (Array.isArray(value)) {
    return <JsonArray label={label} value={value} onChange={onChange} section={section} />;
  }
  return <JsonField label={label} value={value} onChange={onChange} />;
}

export default function AdminApp({ initialContent }: { initialContent: SiteContent }) {
  const router = useRouter();
  const toast = useToast();
  const [content, setContent] = useState<SiteContent>(initialContent);
  const [activeTab, setActiveTab] = useState<keyof SiteContent>('about');
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });

  const activeContent = content[activeTab] as unknown as JsonValue;

  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(initialContent),
    [content, initialContent]
  );

  function updateActiveSection(value: JsonValue) {
    setContent((previous) => ({ ...previous, [activeTab]: value } as SiteContent));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/content', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Save failed');
      toast.success('Changes saved — the live site is updated.');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    try {
      const response = await fetch('/api/admin/content');
      if (!response.ok) throw new Error('Could not load the saved version.');
      const data = await response.json();
      setContent(data.content);
      toast.info('Reverted to the last saved version.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revert.');
    }
  }

  async function handleLogout() {
    await authClient.signOut();
    toast.info('Signed out.');
    router.push('/admin/login');
    router.refresh();
  }

  async function handleChangePassword(event: React.FormEvent) {
    event.preventDefault();
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('New passwords do not match.');
      return;
    }
    const result = await authClient.changePassword({
      currentPassword: passwordForm.current,
      newPassword: passwordForm.next,
      revokeOtherSessions: false,
    });
    if (result.error) {
      toast.error(result.error.message ?? 'Could not change the password.');
      return;
    }
    setPasswordForm({ current: '', next: '', confirm: '' });
    toast.success('Password updated.');
  }

  return (
    <div className="admin-app">
      <header className="admin-header">
        <div className="admin-header-brand">
          <span className="admin-eyebrow">SEAM RAHMAN</span>
          <strong>Content Admin</strong>
        </div>
        <div className="admin-header-actions">
          {dirty && <span className="admin-dirty">Unsaved changes</span>}
          <button className="admin-ghost-button" onClick={handleReset} disabled={saving}>Revert</button>
          <button className="admin-solid-button" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          <a className="admin-ghost-button" href="/" target="_blank" rel="noreferrer">View site</a>
          <button className="admin-ghost-button" onClick={handleLogout}>Log out</button>
        </div>
      </header>

      <div className="admin-body">
        <nav className="admin-tabs" aria-label="Content sections">
          {SECTION_LABELS.map((section) => (
            <button
              key={section.key}
              className={`admin-tab${activeTab === section.key ? ' is-active' : ''}`}
              onClick={() => setActiveTab(section.key)}
            >
              {section.label}
            </button>
          ))}
        </nav>

        <main className="admin-editor">
          <h1 className="admin-title">{SECTION_LABELS.find((section) => section.key === activeTab)?.label}</h1>
          <JsonNode label="" value={activeContent} onChange={updateActiveSection} section={activeTab} />

          <section className="admin-password">
            <h2 className="admin-subtitle">Change password</h2>
            <form onSubmit={handleChangePassword} className="admin-password-form">
              <label className="admin-field">Current password
                <input className="admin-input" type="password" value={passwordForm.current} onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })} autoComplete="current-password" required />
              </label>
              <label className="admin-field">New password
                <input className="admin-input" type="password" value={passwordForm.next} onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })} autoComplete="new-password" required minLength={8} />
              </label>
              <label className="admin-field">Confirm new password
                <input className="admin-input" type="password" value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} autoComplete="new-password" required minLength={8} />
              </label>
              <button className="admin-outline-button" type="submit">Update password</button>
            </form>
          </section>
        </main>
      </div>
    </div>
  );
}
