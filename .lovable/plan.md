# Implementation Plan

## 1. Signup → Application-only flow
- Remove generic "Create account" from `AuthSheet.tsx`. Two tabs only: **Login** and **Become Uploader**.
- "Become Uploader" form: email + password + 50-word reason + requested role (uploader default; admin option visible only to super-admin email entry — actually keep uploader-only here; admin grants stay in admin panel).
- On submit: `supabase.auth.signUp` (no email confirm) + immediately insert into `uploader_applications` with status `pending`.
- Add `application_status` check on login: if user has no role AND has a pending/rejected application → `signOut()` and show "Application pending admin approval" / "Application rejected". Only users with `admin`/`uploader` role OR no application at all (anonymous browsers) can use the app as authenticated.
- Actually simpler: after sign-in, fetch roles + latest application. If `roles.length === 0` and application exists → force sign-out with message. Anonymous browsing of content remains available (no login required to view).
- Forgot password: keep `resetPasswordForEmail` with `redirectTo` set to deep-link/app origin. For APK use `window.location.origin + '/reset-password'` — works inside Capacitor webview since it loads from sandbox URL. `ResetPassword.tsx` already exists.

## 2. Role management (already mostly built — verify)
- Edge functions `admin-grant-role` and `admin-remove-role` already enforce super-admin for admin role and admin for uploader. Keep as-is.
- `MembersManager.tsx` already provides in-app remove. Confirm it works for admins (not just super).

## 3. Analytics 30-day chart
- Update `AnalyticsChart.tsx` (or `StatsChart.tsx`) to query `user_roles` joined with `auth.users.created_at` via a new edge function or use `profiles.created_at`. Show daily counts of new admins + uploaders over last 30 days.

## 4. Report button on content
- Add small flag icon overlay in `ReelsTab` (video), `MusicTab` (music card), `QuotesTab` (photo card).
- Reuses existing `ReportDialog.tsx` — wire it with `content_type` + `content_id`.
- Create `reports` table if not present (id, content_type, content_id, reporter_id, reason text ≤50 words, status, created_at) with RLS: anyone authenticated can insert, admins+uploaders can read.
- `ReportsTab.tsx` already exists in AdminPanel — verify it lists reports.

## 5. Upload: device-only, no YouTube
- In `UploadTab.tsx`: remove "Video URL" text input for video type. Replace with file picker → upload to `videos` storage bucket → store public URL in `reels.video_url`.
- Remove YouTube embed handling in `ReelsTab.tsx` (keep HTML5 `<video>` only for non-YT URLs already there).

## 6. Remove "mark as pro" for photos
- In `UploadTab.tsx` photo form: remove `is_pro` checkbox. Default stays `false`.

## 7. Fix in-app trim save
- `AddReelDialog.tsx` (or wherever trim is): currently writes `trim_start`/`trim_end` to DB but playback may not honor it. 
- Ensure save action: validates numbers, calls `supabase.from('reels').update({ trim_start, trim_end }).eq('id', reelId)`, shows toast on success, refreshes parent. 
- In `ReelsTab` video element, apply `currentTime = trim_start` on load and pause/loop at `trim_end`.

## Files to edit
- `src/components/AuthSheet.tsx` — rewrite tabs
- `src/components/UploadTab.tsx` — remove URL input + pro checkbox; add video file upload
- `src/components/ReelsTab.tsx` — report button + trim playback + drop YouTube
- `src/components/MusicTab.tsx` — report button
- `src/components/QuotesTab.tsx` — report button
- `src/components/AddReelDialog.tsx` — fix trim save
- `src/components/ReportDialog.tsx` — confirm 50-word validation
- `src/components/AnalyticsChart.tsx` — 30-day chart
- `src/hooks/useAuth.tsx` — application-pending sign-out guard
- New migration: `reports` table (if missing) with RLS

## Open question
Reports table — should reports be visible to **uploaders too** (you said "admins and uploaders") or admins only? I'll allow both per your message.

Approve to proceed?
