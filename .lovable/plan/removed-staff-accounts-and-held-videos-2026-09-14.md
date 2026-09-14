# Removed staff accounts and held videos

## Outcome
- Removing an uploader or admin deletes their old sign-in account, so their email no longer retains staff data or ownership.
- Their Long Game and Quick Spark videos are preserved but immediately hidden from the consumer app.
- The removed person may register again with the same email, receiving a fresh account with no former role or uploads.
- Discipline X Admin gets a **Removed Users** tab listing removed accounts and their held videos.

## Build steps
1. Add a protected removed-staff archive containing the old account ID, email, former role, removal time, and removing administrator.
2. Add an `on hold` state to videos and exclude held videos from every public video query, including the teaser feed.
3. Update staff removal to archive the account, place all owned videos on hold, remove role/application data, and delete the old login account.
4. Add an administrator-only endpoint that returns removed users with their held Long Game and Quick Spark videos.
5. Update the Discipline X Admin Team flow to refresh both Team and Removed Users data after removal, and add the Removed Users navigation screen.
6. Verify removal authorization, fresh re-registration behavior, hidden video feeds, type checks, and production builds.

## Technical details
- Existing video files are not deleted; only their database records are held and hidden.
- Removed-user records and held-video details are server-only and available only to administrators.
- Super-admin accounts remain protected from removal. Only a super admin may remove another admin.
- The consumer app and Discipline X Admin share the same backend. Backend work is applied here; the Admin screen must be completed from the separate **Discipline X Admin Hub** project because projects cannot write into each other.
