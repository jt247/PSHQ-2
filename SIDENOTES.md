# Sidenotes

Running decisions and open questions. Not exhaustive history, just what's live.

## 2026-08-26 — Text-to-speech for articles

Two options were on the table: the browser's built-in Web Speech API (free, no
key, but historically throttles or stops in Chrome after ~15s once a tab is
backgrounded) versus a real TTS provider generating an actual audio file
played through `<audio>` (survives minimizing, costs money, needs a key and
storage).

**Decision: build Option A (Web Speech API) now.** JT wants to stay on the
free path rather than start burning an API budget for this. Known limitation
carried forward: playback may not survive the browser being minimized on
Chrome specifically, since `speechSynthesis` is a JS API, not real media
playback — Chrome's background-tab throttling can stop it after roughly 15
seconds. If that limitation proves unacceptable in real use, Plan B is the
real-audio-file approach (OpenAI TTS recommended, `<audio>` element playback,
cached files in the same R2 bucket already used for ebook/template files).
Revisit if JT reports the minimize behavior isn't good enough.

## 2026-08-26 — New content notifications: email deferred

In-app notifications for new content (article/ebook/template/course) are
being wired now, reusing the existing `broadcastNotificationAction` machinery
in `src/app/admin/notifications/actions.ts` (already supports in_app/email/
both channels and audience filters). Email fan-out to all registered users is
being held back for now.

**Why:** blasting every registered user's inbox automatically on every publish
is a different risk profile than an admin manually choosing to broadcast.
Two concrete things need a decision first: Resend's sending limits (batch
sends are capped and can rate-limit or silently drop above a threshold at
volume), and unsubscribe handling (a fully automatic email on every publish
needs its own opt-out, not just the manual broadcast tool's implicit "admin
chose to send this" trust). Turning email on for auto-publish notifications
is a one-line change (channel `'in_app'` → `'both'`) once those two are
decided — flagging here so it doesn't get relitigated as a bigger project
than it is.

## 2026-08-26 — LinkedIn-imported article cleanup

Reviewed all 49 published articles for stray LinkedIn artifacts left over
from the original import. Found the same artifact in 41 of them: a
"Recommended by LinkedIn" related-posts widget (three suggested post titles,
authors, and "X ago" timestamps), pasted mid-body verbatim from LinkedIn's own
feed UI. Not a phrasing issue and not editorial voice, an actual chunk of
LinkedIn page chrome sitting inside the article text. Removed that widget
block from all 41 articles via a direct database update, touching nothing
else in the body. Titles and summaries were checked too and none needed
changes. The other 8 articles had no such artifact and were left untouched.

Full per-article breakdown of exactly what was removed is in the agent's
report from this session, not duplicated here.

Worth checking before importing more LinkedIn posts: since the artifact was
byte-for-byte identical across all 41 articles, the LinkedIn-to-article
import pipeline likely still has this bug for any future imports.

**Follow-up same day:** the agent's scan for engagement-bait phrasing came
back clean, but a manual spot-check of the article it used as its own
example (`why-your-startup-needs-internal-gtm-before-external`) still ended
with "Read, Engage, Repost and Subscribe" and a "PS: Product Slice HQ is
live y'all, go check it out" plug — exactly what it was supposed to catch.
A full scan turned up 27 articles total with a trailing LinkedIn-style CTA
block ("Read, Engage and Share", "Don't forget to Subscribe, Engage and
Repost", "Drop a comment", "repost, forward it to a fellow PM", etc.), all
sitting in the last 1-27% of the body with nothing but the sign-off after
them. Removed all 27 by cutting the body at the start of that block.

One of those 27 (`your-roadmap-is-a-lie`) was worse than a sign-off: after
its own CTA line, the stored body also had real LinkedIn commenter replies
pasted in ("I'm currently working on a roadmap, and this is really
insightful...", "Are you a seer Joshua Theophilus...") followed by a
teaser list of other post snippets with no "Recommended by LinkedIn" header
to string-match on — which is why the earlier pass missed it. Handled that
one individually: body now ends at the article's actual last sentence
("...sticking to our goals, but adapting our path.").

All 27 edits verified by re-scanning for the same patterns afterward: zero
remaining matches across all 49 published articles. Same caveat as above
applies here too — the import pipeline is worth checking before pulling in
more LinkedIn posts, since both artifact types point at the same source.
