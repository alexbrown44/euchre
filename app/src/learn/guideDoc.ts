// The strategy guide, parsed once. The text is STRATEGY_GUIDE.md at the repository root.
import guideSource from '../../../STRATEGY_GUIDE.md?raw';
import { guideToHtml } from './guideHtml.ts';

export const GUIDE = guideToHtml(guideSource);

/**
 * The anchor of a guide heading, found by its text (without any "(F8)" reference). Some headings
 * appear twice, once on the one-page card and again in the full section; this returns the full
 * section's, which comes later.
 */
export function guideAnchor(text: string): string | null {
  const want = text.toLowerCase();
  const found = GUIDE.headings.filter((h) => h.text.replace(/\s*\(F\d+(?:, F\d+)*\)\s*$/, '').toLowerCase() === want);
  return found.length ? found[found.length - 1]!.id : null;
}
