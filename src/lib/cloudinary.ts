import { createHash } from 'node:crypto';

/**
 * Cloudinary integration for the admin media uploader.
 *
 * Credentials are read from the environment and may be supplied either as three
 * discrete variables or as a single CLOUDINARY_URL. When nothing is configured,
 * `getCloudinaryConfig()` returns `null` and the admin falls back to the
 * built-in database uploader (images only).
 *
 * Videos are uploaded straight from the browser to Cloudinary using a
 * server-signed payload, so large files never pass through the app server, and
 * every asset is delivered through an optimization transformation
 * (`f_auto,q_auto`) to cut file size without a visible quality loss.
 */

export type CloudinaryResourceType = 'image' | 'video';

export type CloudinaryConfig = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder: string;
};

/** Read Cloudinary credentials from the environment, or `null` when unset. */
export function getCloudinaryConfig(): CloudinaryConfig | null {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const folder = process.env.CLOUDINARY_FOLDER?.trim() || 'seam-rahman';

  if (cloudName && apiKey && apiSecret) {
    return { cloudName, apiKey, apiSecret, folder };
  }

  // Single-URL form: cloudinary://<api_key>:<api_secret>@<cloud_name>
  const raw = process.env.CLOUDINARY_URL?.trim();
  if (raw) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'cloudinary:' && parsed.hostname && parsed.username && parsed.password) {
        return {
          cloudName: parsed.hostname,
          apiKey: decodeURIComponent(parsed.username),
          apiSecret: decodeURIComponent(parsed.password),
          folder,
        };
      }
    } catch {
      /* malformed CLOUDINARY_URL — treat as unconfigured */
    }
  }

  return null;
}

/** Cloudinary signs requests with the SHA-1 of the alphabetically sorted params + API secret. */
export function signParams(params: Record<string, string | number>, apiSecret: string): string {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(toSign + apiSecret).digest('hex');
}

/** The upload endpoint for a given resource type. */
export function uploadEndpoint(config: CloudinaryConfig, type: CloudinaryResourceType): string {
  return `https://api.cloudinary.com/v1_1/${config.cloudName}/${type}/upload`;
}

/**
 * Delivery transformations that shrink files without a visible quality loss:
 *   - `f_auto`      → best format per browser (AVIF/WebP for images, WebM/MP4 for video)
 *   - `q_auto:good` → Cloudinary's perceptual quality/bitrate optimizer
 *   - `vc_auto`     → (video) most efficient codec for the requesting browser
 *   - `c_limit,w_*` → downscales oversized media only, never upscales
 */
export function optimizedTransformation(type: CloudinaryResourceType): string {
  return type === 'video'
    ? 'f_auto,q_auto:good,vc_auto,c_limit,w_1920'
    : 'f_auto,q_auto:good,c_limit,w_2400';
}

/**
 * Insert the delivery transformation into a Cloudinary secure URL so every
 * request is served optimized. Falls back to the original URL when it cannot be
 * parsed. Handles nested folders because the transform is inserted directly
 * after the `<type>/upload/` segment.
 */
export function optimizedDeliveryUrl(secureUrl: string, type: CloudinaryResourceType): string {
  const marker = `/${type}/upload/`;
  const index = secureUrl.indexOf(marker);
  if (index === -1) return secureUrl;

  const head = secureUrl.slice(0, index + marker.length);
  const tail = secureUrl.slice(index + marker.length);
  if (tail.startsWith(optimizedTransformation(type))) return secureUrl;
  return `${head}${optimizedTransformation(type)}/${tail}`;
}

export type UploadSignature =
  | { configured: false }
  | {
      configured: true;
      cloudName: string;
      apiKey: string;
      timestamp: number;
      signature: string;
      folder: string;
      uploadUrl: string;
    };

/** Build the signed payload the browser needs to upload directly to Cloudinary. */
export function createUploadSignature(type: CloudinaryResourceType): UploadSignature {
  const config = getCloudinaryConfig();
  if (!config) return { configured: false };

  const timestamp = Math.round(Date.now() / 1000);
  const signature = signParams({ folder: config.folder, timestamp }, config.apiSecret);

  return {
    configured: true,
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    signature,
    folder: config.folder,
    uploadUrl: uploadEndpoint(config, type),
  };
}
