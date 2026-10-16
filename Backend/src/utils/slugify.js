/**
 * URL Slug generation utility for SEO-friendly event and category paths.
 */

/**
 * Converts a string into a clean, URL-friendly slug.
 * - Converts to lowercase
 * - Strips accent characters / diacritics
 * - Removes special characters and punctuation
 * - Converts spaces, underscores, and consecutive hyphens to a single hyphen
 * - Removes leading and trailing hyphens
 *
 * Example:
 *   'Arijit Singh Concert' -> 'arijit-singh-concert'
 *   'Rock & Jazz Fest 2026!' -> 'rock-jazz-fest-2026'
 *
 * @param {string} text - Input text to slugify
 * @returns {string} Clean URL slug
 */
function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()
    .normalize('NFD') // Normalize Unicode diacritics
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritic accents
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and') // Replace & with 'and' for readability
    .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric except spaces and hyphens
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with a hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens into one
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start and end
}

/**
 * Generates a guaranteed unique slug for an Event document in MongoDB.
 * If base slug already exists on a different event document, appends
 * an incremental suffix (-2, -3, etc.) until a unique slug is found.
 *
 * @param {import('mongoose').Model} model - Mongoose Event model
 * @param {string} title - The event title
 * @param {string|import('mongoose').Types.ObjectId|null} existingId - Optional current doc _id to exclude from collision check
 * @returns {Promise<string>} Unique slug
 */
async function generateUniqueEventSlug(model, title, existingId = null) {
  const baseSlug = slugify(title) || 'event';
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const query = { slug: candidate };
    if (existingId) {
      query._id = { $ne: existingId };
    }

    const existing = await model.findOne(query).select('_id').lean();
    if (!existing) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
}

module.exports = {
  slugify,
  generateUniqueEventSlug
};
