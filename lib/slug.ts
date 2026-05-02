/**
 * Slug generation for public signup form URLs.
 *
 * Goal: produce a URL-safe, human-readable, reasonably short slug from a
 * form name, with a small random suffix to keep collisions from being
 * predictable / scrape-able.
 */

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 48);
}

/**
 * Crockford-ish base32 random suffix. Avoids visually ambiguous chars
 * (no 0/O, 1/I/L). 6 chars = ~30 bits = collision-resistant enough for
 * our scale.
 */
const SUFFIX_ALPHABET = 'abcdefghjkmnpqrstvwxyz23456789';

export function randomSuffix(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += SUFFIX_ALPHABET[Math.floor(Math.random() * SUFFIX_ALPHABET.length)];
  }
  return out;
}

/**
 * Compose a slug + suffix. Always appends a suffix so we never need to
 * retry on collision.
 */
export function generateFormSlug(name: string): string {
  const base = slugify(name) || 'form';
  return `${base}-${randomSuffix()}`;
}
