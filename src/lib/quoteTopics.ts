export interface QuoteSub { id: string; label: string }
export interface QuoteCategory { id: string; label: string; subs: QuoteSub[] }

export const QUOTE_CATEGORIES: QuoteCategory[] = [
  {
    "id": "mindfulness_calm",
    "label": "Mindfulness & Calm",
    "subs": [
      {
        "id": "calm",
        "label": "Calm"
      },
      {
        "id": "enjoy_the_moment",
        "label": "Enjoy the moment"
      },
      {
        "id": "sleep",
        "label": "Sleep"
      },
      {
        "id": "inner_peace",
        "label": "Inner peace"
      },
      {
        "id": "zen",
        "label": "Zen"
      },
      {
        "id": "being_present",
        "label": "Being present"
      },
      {
        "id": "managing_anxiety",
        "label": "Managing anxiety"
      },
      {
        "id": "stress",
        "label": "Stress"
      },
      {
        "id": "patience",
        "label": "Patience"
      },
      {
        "id": "smile",
        "label": "Smile"
      },
      {
        "id": "appreciation",
        "label": "Appreciation"
      },
      {
        "id": "mindfulness",
        "label": "Mindfulness"
      }
    ]
  },
  {
    "id": "spiritual_philosophy",
    "label": "Spiritual & Philosophy",
    "subs": [
      {
        "id": "faith",
        "label": "Faith"
      },
      {
        "id": "hope",
        "label": "Hope"
      },
      {
        "id": "bible_verses",
        "label": "Bible verses"
      },
      {
        "id": "christianity",
        "label": "Christianity"
      },
      {
        "id": "devotions",
        "label": "Devotions"
      },
      {
        "id": "god",
        "label": "God"
      },
      {
        "id": "feeling_blessed",
        "label": "Feeling blessed"
      },
      {
        "id": "philosophy",
        "label": "Philosophy"
      },
      {
        "id": "deep",
        "label": "Deep"
      },
      {
        "id": "universe",
        "label": "Universe"
      },
      {
        "id": "karma",
        "label": "Karma"
      },
      {
        "id": "mantras",
        "label": "Mantras"
      },
      {
        "id": "wisdom",
        "label": "Wisdom"
      },
      {
        "id": "stoicism",
        "label": "Stoicism"
      },
      {
        "id": "loving_kindness",
        "label": "Loving kindness"
      }
    ]
  },
  {
    "id": "identity_voice_sayings",
    "label": "Identity, Voice & Sayings",
    "subs": [
      {
        "id": "women_s_history_month",
        "label": "Women's History Month"
      },
      {
        "id": "lgbtq",
        "label": "LGBTQ+"
      },
      {
        "id": "african_american",
        "label": "African-American"
      },
      {
        "id": "feeling_sassy",
        "label": "Feeling sassy"
      },
      {
        "id": "sayings",
        "label": "Sayings"
      },
      {
        "id": "sarcastic",
        "label": "Sarcastic"
      },
      {
        "id": "short_quotes",
        "label": "Short quotes"
      },
      {
        "id": "proverbs",
        "label": "Proverbs"
      },
      {
        "id": "funny",
        "label": "Funny"
      },
      {
        "id": "dream_big",
        "label": "Dream big"
      },
      {
        "id": "elite_athletes",
        "label": "Elite athletes"
      },
      {
        "id": "affirmations",
        "label": "Affirmations"
      },
      {
        "id": "future",
        "label": "Future"
      },
      {
        "id": "beauty",
        "label": "Beauty"
      },
      {
        "id": "passion",
        "label": "Passion"
      },
      {
        "id": "encouraging_words",
        "label": "Encouraging words"
      },
      {
        "id": "visionary_thinkers",
        "label": "Visionary thinkers"
      }
    ]
  },
  {
    "id": "work_productivity",
    "label": "Work & Productivity",
    "subs": [
      {
        "id": "entrepreneurs",
        "label": "Entrepreneurs"
      },
      {
        "id": "business",
        "label": "Business"
      },
      {
        "id": "leadership",
        "label": "Leadership"
      },
      {
        "id": "hustling",
        "label": "Hustling"
      },
      {
        "id": "work",
        "label": "Work"
      },
      {
        "id": "money_and_wealth",
        "label": "Money and wealth"
      },
      {
        "id": "success",
        "label": "Success"
      },
      {
        "id": "routine",
        "label": "Routine"
      },
      {
        "id": "building_habits",
        "label": "Building habits"
      },
      {
        "id": "consistency",
        "label": "Consistency"
      },
      {
        "id": "discipline",
        "label": "Discipline"
      },
      {
        "id": "focus",
        "label": "Focus"
      },
      {
        "id": "productivity",
        "label": "Productivity"
      },
      {
        "id": "mental_toughness",
        "label": "Mental toughness"
      },
      {
        "id": "study",
        "label": "Study"
      },
      {
        "id": "making_decisions",
        "label": "Making decisions"
      },
      {
        "id": "perseverance",
        "label": "Perseverance"
      }
    ]
  },
  {
    "id": "mental_health",
    "label": "Mental Health",
    "subs": [
      {
        "id": "bipolar_disorder",
        "label": "Bipolar disorder"
      },
      {
        "id": "addiction_disorder",
        "label": "Addiction disorder"
      },
      {
        "id": "autism",
        "label": "Autism"
      },
      {
        "id": "ptsd",
        "label": "PTSD"
      },
      {
        "id": "adhd",
        "label": "ADHD"
      },
      {
        "id": "mental_health",
        "label": "Mental health"
      }
    ]
  },
  {
    "id": "hard_times_overcoming",
    "label": "Hard Times & Overcoming",
    "subs": [
      {
        "id": "death",
        "label": "Death"
      },
      {
        "id": "depression",
        "label": "Depression"
      },
      {
        "id": "loneliness",
        "label": "Loneliness"
      },
      {
        "id": "sadness",
        "label": "Sadness"
      },
      {
        "id": "heartbroken",
        "label": "Heartbroken"
      },
      {
        "id": "missing_someone",
        "label": "Missing someone"
      },
      {
        "id": "dealing_with_change",
        "label": "Dealing with change"
      },
      {
        "id": "uncertainty",
        "label": "Uncertainty"
      },
      {
        "id": "dealing_with_frustration",
        "label": "Dealing with frustration"
      },
      {
        "id": "unrequited_love",
        "label": "Unrequited love"
      },
      {
        "id": "overcoming_fears",
        "label": "Overcoming fears"
      },
      {
        "id": "breakup",
        "label": "Breakup"
      },
      {
        "id": "overcoming_adversity",
        "label": "Overcoming adversity"
      },
      {
        "id": "resilience",
        "label": "Resilience"
      },
      {
        "id": "haters",
        "label": "Haters"
      }
    ]
  },
  {
    "id": "relationships",
    "label": "Relationships",
    "subs": [
      {
        "id": "falling_in_love",
        "label": "Falling in love"
      },
      {
        "id": "love",
        "label": "Love"
      },
      {
        "id": "unconditional_love",
        "label": "Unconditional love"
      },
      {
        "id": "marriage",
        "label": "Marriage"
      },
      {
        "id": "cheating",
        "label": "Cheating"
      },
      {
        "id": "distance",
        "label": "Distance"
      },
      {
        "id": "best_friend",
        "label": "Best friend"
      },
      {
        "id": "family",
        "label": "Family"
      },
      {
        "id": "friendship",
        "label": "Friendship"
      },
      {
        "id": "loyalty",
        "label": "Loyalty"
      },
      {
        "id": "listening",
        "label": "Listening"
      },
      {
        "id": "honesty",
        "label": "Honesty"
      },
      {
        "id": "fake_people",
        "label": "Fake people"
      },
      {
        "id": "setting_boundaries",
        "label": "Setting boundaries"
      },
      {
        "id": "forgiveness",
        "label": "Forgiveness"
      },
      {
        "id": "trust",
        "label": "Trust"
      },
      {
        "id": "introvert",
        "label": "Introvert"
      },
      {
        "id": "relationships",
        "label": "Relationships"
      }
    ]
  },
  {
    "id": "self_growth_self_worth",
    "label": "Self-Growth & Self-Worth",
    "subs": [
      {
        "id": "self_worth",
        "label": "Self-worth"
      },
      {
        "id": "self_respect",
        "label": "Self-respect"
      },
      {
        "id": "self_esteem",
        "label": "Self-esteem"
      },
      {
        "id": "self_love",
        "label": "Self-love"
      },
      {
        "id": "love_yourself",
        "label": "Love yourself"
      },
      {
        "id": "accept_yourself",
        "label": "Accept yourself"
      },
      {
        "id": "ego",
        "label": "Ego"
      },
      {
        "id": "self_improvement",
        "label": "Self-improvement"
      },
      {
        "id": "self_development",
        "label": "Self-development"
      },
      {
        "id": "self_care",
        "label": "Self-care"
      },
      {
        "id": "growth",
        "label": "Growth"
      },
      {
        "id": "finding_purpose",
        "label": "Finding purpose"
      },
      {
        "id": "be_yourself",
        "label": "Be yourself"
      },
      {
        "id": "start_change",
        "label": "Start change"
      },
      {
        "id": "positive_thinking",
        "label": "Positive thinking"
      },
      {
        "id": "optimism",
        "label": "Optimism"
      },
      {
        "id": "happiness",
        "label": "Happiness"
      },
      {
        "id": "gratitude",
        "label": "Gratitude"
      },
      {
        "id": "new_beginnings",
        "label": "New beginnings"
      },
      {
        "id": "letting_go",
        "label": "Letting go"
      },
      {
        "id": "moving_on",
        "label": "Moving on"
      },
      {
        "id": "be_strong",
        "label": "Be strong"
      },
      {
        "id": "improve_self_talk",
        "label": "Improve self-talk"
      }
    ]
  },
  {
    "id": "seasonal_daily_rituals",
    "label": "Seasonal & Daily Rituals",
    "subs": [
      {
        "id": "summer",
        "label": "Summer"
      },
      {
        "id": "good_morning",
        "label": "Good morning"
      }
    ]
  }
];

export const findCategory = (id: string | null) =>
  QUOTE_CATEGORIES.find((c) => c.id === id) ?? null;

export const subLabel = (catId: string, subId: string) =>
  findCategory(catId)?.subs.find((s) => s.id === subId)?.label ?? subId;
