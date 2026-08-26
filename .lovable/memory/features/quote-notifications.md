---
name: Quote notifications
description: Native local notifications delivering a different daily quote every 3 hours, following the user's chosen topic/subtopic
type: feature
---
- Capacitor Local Notifications (native only, no-op on web). Logic in `src/lib/quoteNotifications.ts`.
- Slots: 06, 09, 12, 15, 18, 21 (every 3h inside the 6am–11pm window). 48 notifications queued ahead (~8 days).
- Each notification carries a DIFFERENT quote pulled from `daily_quotes` filtered by the anonymous user's stored `daily_quote_cat` / `daily_quote_sub` (localStorage). Rotation cursor + per-pass shuffle prevents repeats.
- Re-scheduled on app start, on app resume, and whenever the user picks a new subtopic in the Quotes tab.
- Toggle lives in Settings drawer ("Quote Notifications"), stored at `quote_notifications_enabled`.
