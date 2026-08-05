export interface QuoteSub { id: string; label: string }
export interface QuoteCategory { id: string; label: string; subs: QuoteSub[] }

export const QUOTE_CATEGORIES: QuoteCategory[] = [
  {
    "id": "mental_health",
    "label": "Mental Health",
    "subs": [
      {
        "id": "stress",
        "label": "Stress"
      },
      {
        "id": "anxiety",
        "label": "Anxiety"
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
        "id": "burnout",
        "label": "Burnout"
      }
    ]
  },
  {
    "id": "physical_health",
    "label": "Physical Health",
    "subs": [
      {
        "id": "poor_sleep",
        "label": "Poor sleep"
      },
      {
        "id": "obesity",
        "label": "Obesity"
      },
      {
        "id": "chronic_diseases",
        "label": "Chronic diseases"
      },
      {
        "id": "lack_of_exercise",
        "label": "Lack of exercise"
      },
      {
        "id": "unhealthy_diet",
        "label": "Unhealthy diet"
      }
    ]
  },
  {
    "id": "financial_problems",
    "label": "Financial Problems",
    "subs": [
      {
        "id": "debt",
        "label": "Debt"
      },
      {
        "id": "low_income",
        "label": "Low income"
      },
      {
        "id": "inflation",
        "label": "Inflation"
      },
      {
        "id": "unemployment",
        "label": "Unemployment"
      },
      {
        "id": "difficulty_saving_money",
        "label": "Difficulty saving money"
      }
    ]
  },
  {
    "id": "relationships",
    "label": "Relationships",
    "subs": [
      {
        "id": "family_conflicts",
        "label": "Family conflicts"
      },
      {
        "id": "breakups",
        "label": "Breakups"
      },
      {
        "id": "divorce",
        "label": "Divorce"
      },
      {
        "id": "difficulty_making_friends",
        "label": "Difficulty making friends"
      },
      {
        "id": "communication_problems",
        "label": "Communication problems"
      }
    ]
  },
  {
    "id": "career_and_education",
    "label": "Career and Education",
    "subs": [
      {
        "id": "job_insecurity",
        "label": "Job insecurity"
      },
      {
        "id": "lack_of_skills",
        "label": "Lack of skills"
      },
      {
        "id": "career_confusion",
        "label": "Career confusion"
      },
      {
        "id": "academic_pressure",
        "label": "Academic pressure"
      },
      {
        "id": "work_life_imbalance",
        "label": "Work-life imbalance"
      }
    ]
  },
  {
    "id": "technology",
    "label": "Technology",
    "subs": [
      {
        "id": "social_media_addiction",
        "label": "Social media addiction"
      },
      {
        "id": "excessive_screen_time",
        "label": "Excessive screen time"
      },
      {
        "id": "cyberbullying",
        "label": "Cyberbullying"
      },
      {
        "id": "privacy_concerns",
        "label": "Privacy concerns"
      },
      {
        "id": "information_overload",
        "label": "Information overload"
      }
    ]
  },
  {
    "id": "personal_development",
    "label": "Personal Development",
    "subs": [
      {
        "id": "procrastination",
        "label": "Procrastination"
      },
      {
        "id": "low_self_confidence",
        "label": "Low self-confidence"
      },
      {
        "id": "lack_of_discipline",
        "label": "Lack of discipline"
      },
      {
        "id": "fear_of_failure",
        "label": "Fear of failure"
      },
      {
        "id": "poor_time_management",
        "label": "Poor time management"
      }
    ]
  },
  {
    "id": "societal_issues",
    "label": "Societal Issues",
    "subs": [
      {
        "id": "crime",
        "label": "Crime"
      },
      {
        "id": "pollution",
        "label": "Pollution"
      },
      {
        "id": "climate_change",
        "label": "Climate change"
      },
      {
        "id": "political_conflicts",
        "label": "Political conflicts"
      },
      {
        "id": "inequality",
        "label": "Inequality"
      }
    ]
  },
  {
    "id": "basic_needs",
    "label": "Basic Needs",
    "subs": [
      {
        "id": "hunger",
        "label": "Hunger"
      },
      {
        "id": "clean_water",
        "label": "Clean water"
      },
      {
        "id": "housing",
        "label": "Housing"
      },
      {
        "id": "healthcare_access",
        "label": "Healthcare access"
      },
      {
        "id": "safety",
        "label": "Safety"
      }
    ]
  },
  {
    "id": "existential_questions",
    "label": "Existential Questions",
    "subs": [
      {
        "id": "finding_meaning_in_life",
        "label": "Finding meaning in life"
      },
      {
        "id": "fear_of_death",
        "label": "Fear of death"
      },
      {
        "id": "identity",
        "label": "Identity"
      },
      {
        "id": "happiness",
        "label": "Happiness"
      },
      {
        "id": "spiritual_fulfillment",
        "label": "Spiritual fulfillment"
      }
    ]
  }
];

export const findCategory = (id: string | null) =>
  QUOTE_CATEGORIES.find((c) => c.id === id) ?? null;

export const subLabel = (catId: string, subId: string) =>
  findCategory(catId)?.subs.find((s) => s.id === subId)?.label ?? subId;
