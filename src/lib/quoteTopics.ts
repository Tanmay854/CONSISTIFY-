export interface QuoteSub { id: string; label: string }
export interface QuoteCategory { id: string; label: string; subs: QuoteSub[] }

/**
 * Quote taxonomy — intentionally empty.
 * Categories, sub-categories and their quotes were cleared for a redesign;
 * new ones will be added here (and imported via the admin app) later.
 */
export const QUOTE_CATEGORIES: QuoteCategory[] = [];

export const findCategory = (id: string | null) =>
  QUOTE_CATEGORIES.find((c) => c.id === id) ?? null;

export const subLabel = (catId: string, subId: string) =>
  findCategory(catId)?.subs.find((s) => s.id === subId)?.label ?? subId;
