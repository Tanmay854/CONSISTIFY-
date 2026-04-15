---
name: Upload Tab
description: Dedicated upload tab visible only to admin and approved uploaders for posting videos, music, and photos
type: feature
---
- 4th tab in bottom nav, only visible when user has canUpload permission
- Three upload types: Video (title + URL), Music (title, artist, duration, category), Photo (title, category, image file)
- Photos uploaded to quote-images storage bucket
- Uses existing RLS policies requiring admin or uploader role for inserts
