export interface QuoteSub {
  id: string;
  label: string;
  /** Lucide icon name (see QuoteIcon) */
  icon?: string;
  /** Unicode glyph used instead of an icon (zodiac signs) */
  glyph?: string;
}
export interface QuoteCategory {
  id: string;
  label: string;
  icon: string;
  subs: QuoteSub[];
}

const s = (label: string, icon: string): QuoteSub => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""),
  label,
  icon,
});

const z = (label: string, glyph: string): QuoteSub => ({
  id: label.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
  label,
  glyph,
});

export const QUOTE_CATEGORIES: QuoteCategory[] = [
  {
    id: "mental_health",
    label: "Mental Health & Emotional Wellbeing",
    icon: "Brain",
    subs: [
      s("Stress", "Activity"),
      s("Anxiety", "Wind"),
      s("Depression", "CloudRain"),
      s("Burnout", "Flame"),
      s("Autism", "Brain"),
      s("Attention Deficit", "Zap"),
      s("Frustration", "AlertTriangle"),
      s("Introvert", "User"),
      s("PTSD", "ShieldAlert"),
      s("ADHD", "Zap"),
      s("Bipolar Disorder", "Scale"),
      s("Feeling Sassy", "Sparkles"),
      s("Insecurity", "ShieldAlert"),
      s("Low Self Confidence", "Star"),
      s("Fear of Future Failure", "Target"),
      s("Feel Lost", "Compass"),
      s("Hate", "HeartOff"),
      s("Tips to Heal", "LifeBuoy"),
    ],
  },
  {
    id: "love_relationships",
    label: "Love & Relationships",
    icon: "Heart",
    subs: [
      s("Loneliness", "User"),
      s("Communication Problem", "MessageCircle"),
      s("Difficulty in Making Friends", "Users"),
      s("Family Conflict", "Home"),
      s("Breakup", "HeartCrack"),
      s("Divorce", "Scale"),
      s("Love", "Heart"),
      s("Falling in Love", "Heart"),
      s("Unconditional Love", "Infinity"),
      s("Cheating", "EyeOff"),
      s("Loyalty", "Anchor"),
      s("Honesty", "Handshake"),
      s("Trust", "Handshake"),
      s("Forgiveness", "Feather"),
      s("Long Distance", "Plane"),
      s("Friendship", "Users"),
      s("Best Friend", "Users"),
      s("Letting Go", "Feather"),
      s("Moving On", "Footprints"),
      s("Heart Broken", "HeartCrack"),
      s("Unrequited Love", "HeartOff"),
      s("Loving Kindness", "HandHeart"),
      s("Fake People", "User"),
    ],
  },
  {
    id: "physical_health",
    label: "Physical Health & Fitness",
    icon: "HeartPulse",
    subs: [
      s("Poor Sleep", "Bed"),
      s("Obesity", "Scale"),
      s("Lack of Exercise", "Dumbbell"),
      s("Unhealthy Diet", "Apple"),
      s("To Get Started for Exercise", "Footprints"),
      s("Enjoy the Movement", "Smile"),
    ],
  },
  {
    id: "money_finance",
    label: "Money & Finance",
    icon: "Coins",
    subs: [
      s("Debt", "CreditCard"),
      s("Low Income", "Wallet"),
      s("Financial Discipline", "Shield"),
      s("Money Mindset", "Brain"),
      s("Difficulty in Saving Money", "PiggyBank"),
      s("Delayed Gratification", "Hourglass"),
      s("Starting from Zero", "Rocket"),
    ],
  },
  {
    id: "career_success",
    label: "Career, Business & Success",
    icon: "Briefcase",
    subs: [
      s("Business & Entrepreneurship", "Rocket"),
      s("Job Insecurity", "Briefcase"),
      s("Lack of Skill", "GraduationCap"),
      s("Career Confusion", "Compass"),
      s("Handle Academic Pressure", "BookOpen"),
      s("Work-Life Balance", "Scale"),
      s("Dream Big", "Star"),
      s("Passion", "Heart"),
      s("Visionary", "EyeOff"),
      s("Business", "Building2"),
      s("Entrepreneur", "Rocket"),
      s("Leadership", "Crown"),
      s("Hustling", "Hammer"),
      s("Success", "Trophy"),
      s("Work", "Hammer"),
    ],
  },
  {
    id: "discipline_productivity",
    label: "Discipline & Productivity",
    icon: "Clock",
    subs: [
      s("Overcome Laziness", "Bed"),
      s("Routine", "ListChecks"),
      s("Building Habit", "Repeat"),
      s("Focus", "Crosshair"),
      s("Study", "BookOpen"),
      s("Perseverance", "Mountain"),
      s("Making Decision", "Scale"),
      s("Procrastination", "Timer"),
      s("Low Self Discipline", "Shield"),
      s("Poor Time Management", "Clock"),
    ],
  },
  {
    id: "self_growth",
    label: "Self-Love & Personal Growth",
    icon: "Sprout",
    subs: [
      s("Self Worth", "Gem"),
      s("Self Respect", "Shield"),
      s("Self Esteem", "Star"),
      s("Self Love", "Heart"),
      s("Self Improvement", "TrendingUp"),
      s("Self Development", "Sprout"),
      s("Self Care", "Leaf"),
      s("Ego", "Crown"),
      s("Wisdom", "BookOpen"),
    ],
  },
  {
    id: "strength_resilience",
    label: "Strength, Resilience & Challenges",
    icon: "Shield",
    subs: [
      s("New Beginning", "Sunrise"),
      s("Be Strong", "Dumbbell"),
      s("Death", "Cross"),
      s("Moving Forward", "Footprints"),
      s("Dealing With Change", "RefreshCw"),
      s("Overcome Fear", "ShieldCheck"),
      s("Resilience", "Mountain"),
    ],
  },
  {
    id: "purpose_life_direction",
    label: "Purpose & Life Direction",
    icon: "Compass",
    subs: [
      s("Finding Purpose", "Compass"),
      s("Inspiration", "Lightbulb"),
    ],
  },
  {
    id: "happiness_mindset",
    label: "Happiness & Positive Mindset",
    icon: "Sun",
    subs: [
      s("Optimism", "Sun"),
      s("Happiness", "Smile"),
      s("Gratitude", "HandHeart"),
      s("Positive Thinking", "Sun"),
      s("Calm", "Waves"),
      s("Inner Peace", "Waves"),
      s("Joy", "PartyPopper"),
      s("Smile", "Smile"),
      s("Appreciation", "HandHeart"),
      s("Mindfulness", "Brain"),
      s("Funny", "Laugh"),
    ],
  },
  {
    id: "spirituality_peace",
    label: "Spirituality & Inner Peace",
    icon: "Sparkle",
    subs: [
      s("Stoicism", "Landmark"),
      s("Mantras", "MessageCircle"),
      s("Karma", "Recycle"),
      s("Universe", "Orbit"),
      s("Deep", "Brain"),
      s("Philosophy", "BookOpen"),
      s("Feeling Blessed", "HandHeart"),
      s("God", "Cross"),
      s("Devotion", "Heart"),
      s("Faith", "Church"),
      s("Hope", "Sunrise"),
      s("Bible Verses", "BookOpen"),
    ],
  },
  {
    id: "zodiac_signs",
    label: "Zodiac Signs",
    icon: "Star",
    subs: [
      z("Aries", "♈"),
      z("Taurus", "♉"),
      z("Gemini", "♊"),
      z("Cancer", "♋"),
      z("Leo", "♌"),
      z("Virgo", "♍"),
      z("Libra", "♎"),
      z("Scorpio", "♏"),
      z("Sagittarius", "♐"),
      z("Capricorn", "♑"),
      z("Aquarius", "♒"),
      z("Pisces", "♓"),
    ],
  },
];

export const TOTAL_TOPICS = QUOTE_CATEGORIES.length;
export const TOTAL_SUBTOPICS = QUOTE_CATEGORIES.reduce((n, c) => n + c.subs.length, 0);

export const findCategory = (id: string | null) =>
  QUOTE_CATEGORIES.find((c) => c.id === id) ?? null;

export const subLabel = (catId: string, subId: string) =>
  findCategory(catId)?.subs.find((x) => x.id === subId)?.label ?? subId;
