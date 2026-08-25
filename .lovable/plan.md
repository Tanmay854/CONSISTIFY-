# Android APK Dependency Pipeline Fix

## Changes

- Regenerate `package-lock.json` from the existing `package.json` without changing or removing declared dependencies.
- Ensure lockfile package URLs are reproducible on a clean public GitHub Actions runner rather than tied to a private build cache.
- Change only the workflow Node.js version from 20 to 22; retain every other Android build and artifact step.

## Verification

- Run a clean `npm ci` without legacy peer dependency flags.
- Run `npm run build` after installation to confirm the dependency graph works.
- Confirm the workflow still runs Capacitor sync, Java 17, Gradle debug APK assembly, and artifact upload unchanged.
