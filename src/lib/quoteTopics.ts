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
      s("Anxiety", "Wind"),
      s("Depression", "CloudRain"),
      s("Stress", "Activity"),
      s("Burnout", "Flame"),
      s("Loneliness", "User"),
      s("Overthinking", "Brain"),
      s("Panic Attacks", "HeartPulse"),
      s("PTSD", "ShieldAlert"),
      s("ADHD", "Zap"),
      s("Bipolar Disorder", "Scale"),
      s("OCD", "Repeat"),
      s("Grief & Loss", "HeartCrack"),
      s("Emotional Healing", "Sparkles"),
      s("Therapy & Support", "MessageCircle"),
      s("Sleep & Rest", "Moon"),
      s("Recovery", "LifeBuoy"),
      s("Social Anxiety", "Users"),
      s("Mental Health Awareness", "Ribbon"),
    ],
  },
  {
    id: "love_relationships",
    label: "Love & Relationships",
    icon: "Heart",
    subs: [
      s("Falling in Love", "Heart"),
      s("True Love", "HeartHandshake"),
      s("Unconditional Love", "Infinity"),
      s("First Love", "Flower2"),
      s("Crush", "Smile"),
      s("Dating", "Coffee"),
      s("Long Distance", "Plane"),
      s("Marriage", "Gem"),
      s("Soulmates", "Sparkles"),
      s("Romance", "Wine"),
      s("Breakup", "HeartCrack"),
      s("Heartbreak", "HeartOff"),
      s("Moving On", "Footprints"),
      s("Cheating", "EyeOff"),
      s("Trust", "Handshake"),
      s("Communication", "MessageCircle"),
      s("Boundaries", "Shield"),
      s("Toxic Relationships", "AlertTriangle"),
      s("Fake People", "User"),
      s("Missing Someone", "Hourglass"),
      s("Friendship", "Users"),
      s("Family", "Home"),
      s("Loyalty", "Anchor"),
      s("Forgiveness", "Feather"),
    ],
  },
  {
    id: "physical_health",
    label: "Physical Health & Fitness",
    icon: "HeartPulse",
    subs: [
      s("Workout Motivation", "Dumbbell"),
      s("Weight Loss", "Scale"),
      s("Nutrition", "Apple"),
      s("Sleep", "Bed"),
      s("Running", "Footprints"),
      s("Body Confidence", "Smile"),
    ],
  },
  {
    id: "money_finance",
    label: "Money & Finance",
    icon: "Coins",
    subs: [
      s("Money Mindset", "Brain"),
      s("Saving", "PiggyBank"),
      s("Investing", "TrendingUp"),
      s("Debt", "CreditCard"),
      s("Wealth Building", "Coins"),
      s("Financial Freedom", "Wallet"),
      s("Abundance", "Gem"),
    ],
  },
  {
    id: "career_success",
    label: "Career, Business & Success",
    icon: "Briefcase",
    subs: [
      s("Entrepreneurship", "Rocket"),
      s("Leadership", "Crown"),
      s("Startups", "Lightbulb"),
      s("Hard Work", "Hammer"),
      s("Success", "Trophy"),
      s("Failure", "RefreshCw"),
      s("Goals", "Target"),
      s("Ambition", "Flag"),
      s("Job Search", "Search"),
      s("Workplace", "Building2"),
      s("Teamwork", "Users"),
      s("Side Hustle", "Store"),
      s("Negotiation", "Handshake"),
      s("Public Speaking", "Mic"),
      s("Study & Learning", "GraduationCap"),
    ],
  },
  {
    id: "discipline_productivity",
    label: "Discipline & Productivity",
    icon: "Clock",
    subs: [
      s("Self-Discipline", "Shield"),
      s("Consistency", "Repeat"),
      s("Habits", "ListChecks"),
      s("Focus", "Crosshair"),
      s("Procrastination", "Timer"),
      s("Time Management", "Clock"),
      s("Morning Routine", "Sunrise"),
      s("Deep Work", "Headphones"),
      s("Daily Grind", "Hammer"),
      s("Willpower", "Flame"),
    ],
  },
  {
    id: "self_growth",
    label: "Self-Love & Personal Growth",
    icon: "Sprout",
    subs: [
      s("Self-Love", "Heart"),
      s("Self-Worth", "Gem"),
      s("Self-Confidence", "Star"),
      s("Self-Care", "Leaf"),
      s("Self-Respect", "Shield"),
      s("Growth Mindset", "Sprout"),
      s("Finding Purpose", "Compass"),
      s("Inspiration", "Lightbulb"),
      s("Letting Go", "Feather"),
      s("Authenticity", "Fingerprint"),
      s("Personal Growth", "TrendingUp"),
    ],
  },
  {
    id: "strength_resilience",
    label: "Strength, Resilience & Challenges",
    icon: "Shield",
    subs: [
      s("Resilience", "Mountain"),
      s("Overcoming Fear", "ShieldCheck"),
      s("Hard Times", "CloudLightning"),
      s("Never Give Up", "Flame"),
      s("Courage", "Swords"),
      s("Mental Toughness", "Anchor"),
      s("Rising Again", "Sunrise"),
    ],
  },
  {
    id: "happiness_mindset",
    label: "Happiness & Positive Mindset",
    icon: "Sun",
    subs: [
      s("Happiness", "Smile"),
      s("Gratitude", "HandHeart"),
      s("Positive Thinking", "Sun"),
      s("Optimism", "Rainbow"),
      s("Joy", "PartyPopper"),
      s("Laughter", "Laugh"),
      s("Kindness", "Gift"),
      s("Contentment", "Coffee"),
      s("Enjoy the Moment", "Camera"),
      s("Hope", "Sunrise"),
      s("Good Vibes", "Sparkles"),
    ],
  },
  {
    id: "spirituality_peace",
    label: "Spirituality & Inner Peace",
    icon: "Sparkle",
    subs: [
      s("Faith", "Church"),
      s("God", "Cross"),
      s("Prayer", "Hand"),
      s("Meditation", "Flower2"),
      s("Mindfulness", "Brain"),
      s("Inner Peace", "Waves"),
      s("Karma", "Recycle"),
      s("Universe", "Orbit"),
      s("Stoicism", "Landmark"),
      s("Zen", "Leaf"),
      s("Wisdom", "BookOpen"),
      s("Soul", "Feather"),
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
