# Monetization access update

- [x] Require an account before opening Long Game videos or books.
- [x] Restrict every full book to premium accounts in the backend.
- [x] Allow one administrator-selected Long Game video for signed-in free accounts.
- [x] Keep covers and thumbnails visible as locked previews.
- [x] Verify TypeScript and the production build.

# Account and premium access reliability

- [x] Enable email/password account creation.
- [x] Use a valid web confirmation link when signup starts inside the Android app.
- [x] Clearly distinguish immediate sign-in, email confirmation, and existing accounts.
- [x] Reload protected videos after sign-in or a Premium status change.
- [x] Refresh Premium status when users return to the app.
- [x] Require email confirmation in both account settings and the app session.
- [ ] Verify account creation and premium entitlement behavior on an installed APK.

# Removed staff accounts and held videos

- [x] Archive removed uploader and admin identities.
- [x] Place their Long Game and Quick Spark videos on hold and hide them from public feeds.
- [x] Delete the old login so the same email can register as a fresh account.
- [x] Provide an administrator-only Removed Users feed with held videos.
- [ ] Add the Removed Users navigation screen in the separate Discipline X Admin Hub project.