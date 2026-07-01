export const BOOK_CATEGORIES = [
  "Discipline",
  "Motivation",
  "Productivity",
  "Psychology",
  "Business",
  "Finance",
  "Leadership",
  "Success",
  "Habits",
  "Focus",
  "Self Improvement",
  "Fitness",
  "Entrepreneurship",
  "Biography",
  "Philosophy",
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export type Book = {
  id: string;
  public_id: string | null;
  title: string;
  author: string;
  category: string;
  description: string | null;
  key_takeaways: string | null;
  why_read: string | null;
  cover_url: string;
  cover_url_2: string | null;
  amazon_url: string;
  price: number | null;
  rating: number | null;
  is_featured: boolean;
  is_trending: boolean;
  is_best_seller: boolean;
  is_new_release: boolean;
  created_at: string;
};
