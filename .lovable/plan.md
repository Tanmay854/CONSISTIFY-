# Implementation Plan

A large set of related changes. I'll group them into phases.

## 1. Auth & Application flow (req 1, 11)
- Update `AuthSheet`: after signup success, show inline prompt "Apply to become Uploader or Admin" with a reason textarea and role selector. Submits to `uploader_applications` (extend table to include `requested_role`).
- Add **Forgot password** link on sign-in screen → calls `supabase.auth.resetPasswordForEmail` with redirect to `/reset-password`.
- New route `/reset-password` → form to set new password via `supabase.auth.updateUser`.

## 2. Database migration
- `uploader_applications`: add `requested_role text default 'uploader' check in ('uploader','admin')`.
- Update `handle_uploader_application_approval` trigger to grant the requested role (uploader or admin) on approval.
- Add limits enforced via trigger:
  - Max **5 admins** total.
  - Max **200 uploaders** total.
  - Only `tanmaynimbalkar854@gmail.com` can INSERT an `admin` role; other admins can only manage uploaders.
  - Only that super-admin email can DELETE an `admin` role.
- Add `super_admin` check function `is_super_admin(_user_id uuid)` looking up `auth.users.email`.
- Update `user_roles` RLS:
  - INSERT admin role → only super-admin.
  - DELETE admin role → only super-admin.
  - INSERT/DELETE uploader role → any admin.
- Add `category` column to `reels` (videos) and ensure `music` already has it; add interest tagging.
- Add `image_url` column to `music` for cover art (Spotify-like).

## 3. In-app Admin Panel upgrades (req 2, 3, 8, 12)
`UploaderApplications` already exists — extend so admin can approve/reject in-app (already does via update). Confirm it surfaces `requested_role`.

New **"Members"** tab in `AdminPanel`:
- Lists all users with `admin` or `uploader` roles (join `user_roles` + `profiles` + emails via edge function since `auth.users` not exposed).
- Edge function `list-staff` (service role) returns `{user_id, email, display_name, role}[]`.
- Remove-role button:
  - Uploader → any admin can remove.
  - Admin → only super-admin sees the button. Calls edge function `admin-remove-role` that validates super-admin server-side.

## 4. Interests for anonymous users (req 4)
- `SettingsDrawer` already has category chips behind auth. Add a **public** interest picker accessible from settings even when logged out; store in `localStorage` under `guest_categories`. When user signs in, merge into `user_preferences`.

## 5. Upload tagging + music cover (req 5, 6)
- `UploadTab`:
  - Video form: add Category select (Workout, Study, Motivation, Mindfulness, Finance, Relationships).
  - Music form: add cover image upload to `quote-images` bucket → store in `music.image_url`.
- Video/Music feeds filter by selected categories (already done for some).

## 6. Player mute (req 7)
- `ReelsTab`: add a Mute toggle button in the existing settings menu (below the gear), persists in localStorage.

## 7. Ads management (req 9)
Already have `ads` table. Update `AdminContentManager`:
- Add **Ads** sub-tab visible to admins only.
- Admin can add (video or music ad) with title, media URL, placement, link URL — and remove.
- Update `ads` INSERT RLS to **admin only** (currently allows uploaders too).
- Show ads in feeds based on placement (existing logic preserved).

## 8. Edge functions
- `admin-grant-role` (existing) — update to enforce admin-cap (5) and super-admin-only for admin role.
- `admin-remove-role` (new) — validates super-admin for admin removal, admin for uploader removal.
- `list-staff` (new) — returns all admins + uploaders with email/display_name.

## Technical details

**Files to edit/create:**
- migration (single)
- `src/components/AuthSheet.tsx` — add forgot password + post-signup application prompt
- `src/pages/ResetPassword.tsx` — new
- `src/App.tsx` — add `/reset-password` route
- `src/components/AdminPanel.tsx` — add Members tab + Ads tab
- `src/components/UploaderApplications.tsx` — show requested_role
- `src/components/MembersManager.tsx` — new
- `src/components/AdsManager.tsx` — new
- `src/components/UploadTab.tsx` — category select + music cover image
- `src/components/ReelsTab.tsx` — mute toggle in settings
- `src/components/SettingsDrawer.tsx` — guest interests
- `supabase/functions/admin-grant-role/index.ts` — cap enforcement
- `supabase/functions/admin-remove-role/index.ts` — new
- `supabase/functions/list-staff/index.ts` — new

**Super-admin email** `tanmaynimbalkar854@gmail.com` is hard-coded server-side in edge functions and in the `is_super_admin` SQL function (looks up by email).

## Scope confirmation

This is a large change set (~12 files + migration + 2 new edge functions). Approve and I'll implement in order: migration → edge functions → frontend.
