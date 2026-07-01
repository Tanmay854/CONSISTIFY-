export const COURSE_CATEGORIES = [
  "Mindset",
  "Discipline",
  "Productivity",
  "Business",
  "Finance",
  "AI",
  "Fitness",
  "Self Improvement",
] as const;

export const COURSE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;

export type CourseLevel = (typeof COURSE_LEVELS)[number];
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export type Course = {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  instructor: string;
  category: string;
  cover_image: string;
  hero_image: string | null;
  hero_video_url: string | null;
  duration: string | null;
  lessons_count: number | null;
  level: string | null;
  rating: number | null;
  affiliate_link: string;
  what_youll_learn: string | null;
  curriculum: string | null;
  requirements: string | null;
  featured: boolean;
  trending: boolean;
  is_new_release: boolean;
  is_best_seller: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};
