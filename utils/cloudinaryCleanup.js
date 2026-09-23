import { v2 as cloudinary } from 'cloudinary';
import Product from '../models/Product.js';

// Uploads happen client-side through the unsigned widget, so the only way to
// remove them is here, server-side, with the API secret.
let isConfigured = false;
const configure = () => {
  if (isConfigured) return true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) return false;
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
  isConfigured = true;
  return true;
};

// Turns a stored secure_url like
//   https://res.cloudinary.com/<cloud>/video/upload/v1712345/folder/clip.mov
// into { resourceType: 'video', publicId: 'folder/clip' }. Returns null for
// anything not hosted on this account (e.g. the picsum.photos seed images),
// so those are never touched.
export const parseCloudinaryUrl = (url) => {
  if (typeof url !== 'string') return null;
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const match = url.match(/^https?:\/\/res\.cloudinary\.com\/([^/]+)\/(image|video)\/upload\/(?:.+\/)?v\d+\/(.+)$/);
  if (!match || match[1] !== cloudName) return null;
  const [, , resourceType, path] = match;
  return { resourceType, publicId: path.replace(/\.[a-z0-9]+$/i, '') };
};

// Deletes the given Cloudinary URLs. Never throws — a failed cleanup only
// leaves an orphaned file behind, which must not fail the product delete.
export const destroyCloudinaryAssets = async (urls) => {
  const assets = [...new Set(urls)].map(parseCloudinaryUrl).filter(Boolean);
  if (assets.length === 0) return [];
  if (!configure()) {
    console.warn('Cloudinary cleanup skipped: CLOUDINARY_* env vars are not set');
    return [];
  }

  const results = await Promise.allSettled(
    assets.map(({ publicId, resourceType }) =>
      cloudinary.uploader.destroy(publicId, { resource_type: resourceType, invalidate: true })
    )
  );
  results.forEach((r, i) => {
    const failed = r.status === 'rejected' || !['ok', 'not found'].includes(r.value?.result);
    if (failed) {
      console.error(`Cloudinary cleanup failed for ${assets[i].publicId}:`, r.reason?.message || r.value?.result);
    }
  });
  return results;
};

// Call after the product is removed from Mongo. The poster is a derived
// transformation of the video, so destroying the video removes it too.
export const cleanupProductMedia = async (product) => {
  try {
    const urls = [
      ...(product.images || []).flatMap((group) => group.urls || []),
      product.lookbookVideo?.url,
    ].filter(Boolean);
    if (urls.length === 0) return;

    // Skip any file another product still points at, so deleting one product
    // can never break another's photos.
    const stillUsed = await Product.find(
      { $or: [{ 'images.urls': { $in: urls } }, { 'lookbookVideo.url': { $in: urls } }] },
      { images: 1, lookbookVideo: 1 }
    ).lean();
    const usedUrls = new Set(
      stillUsed.flatMap((p) => [...(p.images || []).flatMap((g) => g.urls || []), p.lookbookVideo?.url])
    );

    await destroyCloudinaryAssets(urls.filter((url) => !usedUrls.has(url)));
  } catch (err) {
    console.error(`cleanupProductMedia error: ${err.message}`);
  }
};
