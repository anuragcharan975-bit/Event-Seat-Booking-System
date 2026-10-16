/**
 * Client-side URL slug generator for SEO-friendly event paths.
 * Converts titles and categories to lowercase, hyphen-separated, clean URL strings.
 */
export function slugify(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}
