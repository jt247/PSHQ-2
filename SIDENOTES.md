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
