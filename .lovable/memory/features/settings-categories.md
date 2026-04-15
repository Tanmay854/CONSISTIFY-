---
name: Settings & Categories
description: Settings drawer with category preferences (Workout, Study, Motivation, Mindfulness, Finance, Relationships) stored in user_preferences table
type: feature
---
- Settings accessible via gear icon in top-right corner of app
- Drawer slides in from right with user info, category chips, admin panel, sign out
- Categories: Workout, Study, Motivation, Mindfulness, Finance, Relationships
- Stored in user_preferences table with selected_categories TEXT[] column
- RLS: users can only view/edit their own preferences
