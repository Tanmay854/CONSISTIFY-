# Project Memory

## Core
- Premium black and gold theme: deep black background, gold accents.
- Navigation: Bottom nav uses Videos, Music, Quotes (lightbulb icon), Upload (creators only).
- Minimalist UI: NEVER add social features (likes, shares, creator names) or duration timestamps.
- Backend: Supabase for database and roles (admin, uploader, user).
- Settings drawer via gear icon (top-right): categories, user info, admin panel, sign out.

## Memories
- [Splash screen](mem://features/splash-screen) — Hinge-inspired splash screen animation displaying 'Motivation'
- [Quotes grid](mem://features/quotes-grid) — Cinematic 2-column grid for stylized image cards
- [Role-based access](mem://auth/role-based-access-control) — Roles (admin, uploader, user) and admin panel assignments
- [Video management](mem://features/video-management-system) — Video ingestion via URLs and Supabase metadata storage
- [Videos tab feed](mem://features/videos-tab) — Primary vertical scroll snapping video feed, no social features
- [Settings & categories](mem://features/settings-categories) — Settings drawer with 6 category preferences and user_preferences table
- [Upload tab](mem://features/upload-tab) — Dedicated creator upload tab for videos, music, photos (admin/uploader only)
- [Quote notifications](mem://features/quote-notifications) — Local push every 3h with a different quote from the user's chosen topic/subtopic

