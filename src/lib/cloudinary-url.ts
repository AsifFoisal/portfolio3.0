/**
 * Cloudinary delivery-URL helpers.
 *
 * Deliberately free of Node imports so client components can size media without
 * pulling the signing code (`src/lib/cloudinary.ts`) into the browser bundle.
 */

export type CloudinaryResourceType = 'image' | 'video';

/** The segment that separates transformations from the asset path. */
const uploadMarker = (type: CloudinaryResourceType) => `/${type}/upload/`;

/** True for URLs served by Cloudinary's delivery CDN (not /public or other hosts). */
export function isCloudinaryDeliveryUrl(url: string | undefined | null): boolean {
  return Boolean(url && url.includes('res.cloudinary.com') && url.includes('/upload/'));
}

/**
 * The transformation string for a given delivery size.
 *   - `f_auto`      → best format per browser (AVIF/WebP for images, WebM/MP4 for video)
 *   - `q_auto:good` → Cloudinary's perceptual quality/bitrate optimiser
 *   - `vc_auto`     → (video) most efficient codec for the requesting browser
 *   - `c_limit,w_*` → downscales oversized media only, never upscales
 */
export function deliveryTransformation(
  type: CloudinaryResourceType,
  width: number
): string {
  return type === 'video'
    ? `f_auto,q_auto:good,vc_auto,c_limit,w_${width}`
    : `f_auto,q_auto:good,c_limit,w_${width}`;
}

/**
 * Replaces the transformation segment of a Cloudinary delivery URL, keeping the
 * version + public id intact. Any transformation already baked into the URL is
 * dropped, so an asset uploaded at `w_2400` can be served at `w_600` later.
 *
 * Returns the URL untouched when it is not a Cloudinary delivery URL — external
 * hosts, `/public` assets and base64 fallbacks keep working.
 */
export function withTransformation(
  url: string,
  type: CloudinaryResourceType,
  transformation: string
): string {
  if (!isCloudinaryDeliveryUrl(url)) return url;

  const marker = uploadMarker(type);
  const index = url.indexOf(marker);
  if (index === -1) return url;

  const head = url.slice(0, index + marker.length);
  const segments = url.slice(index + marker.length).split('/');

  // Everything before the `v<digits>` version segment is transformation data.
  const versionIndex = segments.findIndex((segment) => /^v\d+$/.test(segment));
  if (versionIndex < 0) return url;

  return `${head}${transformation}/${segments.slice(versionIndex).join('/')}`;
}

/** A Cloudinary URL re-rendered at an exact pixel width. */
export function resizedDeliveryUrl(
  url: string,
  type: CloudinaryResourceType,
  width: number
): string {
  return withTransformation(url, type, deliveryTransformation(type, width));
}

/**
 * A `srcset` for a Cloudinary image so the browser downloads only what it can
 * display — a phone no longer receives a 2400px render for a 92vw card.
 */
export function deliverySrcSet(
  url: string,
  widths: readonly number[],
  type: CloudinaryResourceType = 'image'
): string | undefined {
  if (!isCloudinaryDeliveryUrl(url)) return undefined;
  return widths.map((width) => `${resizedDeliveryUrl(url, type, width)} ${width}w`).join(', ');
}
