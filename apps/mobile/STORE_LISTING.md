# Store Listing Draft (Epic I §I.7)

Draft copy for TestFlight and Google Play internal testing. Not submitted anywhere yet, that decision is JT's. Update this file when the copy changes rather than writing it fresh in the store console.

## App name

ProductSlice HQ

## Subtitle (iOS, 30 chars max)

Learn product, ship faster

## Short description (Google Play, 80 chars max)

Practical product, growth, and AI learning from real-world practice.

## Full description

ProductSlice HQ is where people building technology products go to learn product management, growth, AI, and leadership from real practice, not theory.

Read articles and build notes from real product work. Work through ebooks and templates you can save for offline reading. Follow structured learning paths or build your own with AI. Study real product case studies. Track your progress, earn achievements, and see where you rank against other members building in public.

What you get:
- Articles, ebooks, templates, and guides across product, growth, AI, building, careers, and leadership
- Structured learning paths, including ones AI builds for your specific goal
- Real product case studies and build notes
- Progress tracking, favorites, and a personal learning dashboard
- A leaderboard and achievements for real contribution, not pageviews
- Offline reading for downloaded ebooks and templates

## Keywords (iOS, 100 chars max, comma-separated)

product management,growth,AI,startup,product manager,learning,career,leadership,PM,product

## Category

Primary: Education
Secondary: Productivity

## Age rating

4+ / Everyone. No user-generated content beyond comments/ratings on published material, which are moderated (Epic G comment moderation applies platform-wide).

## Privacy policy / support URLs

Privacy policy: https://productslicehq.com/privacy-policy
Support / contact: in-app Give Feedback screen, or https://productslicehq.com/contact

## Screenshots needed (not yet captured)

- Home / browse screen
- Article reader with save/share/mark-complete controls
- Ebook screen showing the offline download button
- My ProductSlice (Profile tab) dashboard
- Leaderboard

## What's new (first beta build)

First beta release. Native reading experience with adjustable text size and offline ebook downloads, push notifications, and the full ProductSlice HQ learning library.

## Outstanding before a real submission (not done in this pass, needs JT)

- Apple Developer Program account + App Store Connect app record
- Google Play Console account + app record, plus a service account key for `eas submit`
- Real bundle identifier confirmation — `com.productslicehq.mobile` is a placeholder in `app.json`/`eas.json`, not yet verified as registered anywhere
- `eas init` (or `npx eas-cli init`) run under JT's own Expo account to generate a real EAS project ID (currently a placeholder in `app.json`)
- Push notifications need real APNs (Apple) and FCM (Google/Firebase) credentials configured in the Expo/EAS project before push works outside of Expo Go's development sandbox
- Real screenshots per the list above
