# Spelling Studio

A teacher-facing spelling app at https://mvenkita.github.io/myFirstClaude/spelling/.
The standalone source is in `public/spelling/`, so the repository's existing Vite deployment also copies it to `/spelling/`. Existing apps and routes are unchanged.

## Practice

Sign in with the same Google account on each device. Add a student using a first name or nickname. Choose a vowel group, a latest-result filter, and sheet/alphabetical/shuffled order. Tap Start practice. Say the word aloud and record Correct, Incorrect, Slow, or Two tries. Each result is acknowledged by Firestore before advancing. Undo restores the previous result; Skip records no grade. Keys 1–4 also record results. Hide word conceals the spelling when sharing the screen.

Word record shows the latest result per word, individual attempt histories, and CSV export. Review filters use the latest non-undone result. A session's word queue stays fixed as scores change. Students and histories sync; the active queue is specific to the current browser tab. A reload ends the queue but preserves saved results. Teachers have separate private records; this does not share a classroom between different Google accounts.

## Firebase setup (Spark plan)

The public Firebase web configuration is in `public/spelling/firebase-config.js`. There is no Analytics SDK or tracking.

1. Firebase console → Authentication → Sign-in method → enable Google and choose the support email.
2. Authentication → Settings → Authorized domains → add `mvenkita.github.io`. For local sign-in testing, add `127.0.0.1` and/or `localhost` separately.
3. Firestore Database → Create database → Standard edition → `(default)` database → select a location → Production mode.
4. Firestore Database → Rules → replace the editor with the contents of `spelling/firestore.rules`, then Publish. These rules permit an authenticated teacher to access only their own students and attempts. Do not use open test-mode rules.
5. Open the deployed app, sign in, add a sample student and record a result. Sign into a second browser/device with the same account and verify that student and result appear.

The Firebase web API key is public configuration, not an administrative credential. Authorization is enforced by Firebase Auth and the database rules. On the Spark plan, exceeding free quotas can interrupt syncing; no billing account is needed for these features.

## Storage and sync

Documents live at `teachers/{uid}/students/{studentId}` and `teachers/{uid}/attempts/{attemptId}`. Every attempt has a unique ID; concurrent writes do not replace whole student records. Undo marks that specific attempt voided. Latest-result ordering uses the attempt's device timestamp, so keep device clocks automatic. Sign out on shared devices. Cloud records use an in-memory Firestore cache and are not intentionally kept in browser storage after sign-out. An internet connection is required to confirm writes; reconnect and wait if a save is pending. The UI warns before closing while a write is pending.

The demo is separate and stores only demo records in localStorage. It never uploads them to Firebase.

## Word bank

514 distinct words transcribed from the supplied spelling sheet, preserving its vowel groupings (including exceptions). Word-family headings that are complete words are included. One ambiguous handwritten entry (`past?`) and the incomplete fragment `ru` are excluded. `babboon` was corrected to `baboon`. `head` occurs in both A and E groups and shares one result. The source PDFs and real student records are not included in the repository.

## Development and deployment

No build or dependencies are needed for this standalone app:

```sh
python3 -m http.server 4173 --directory public
node --test tests/spelling/core.test.mjs
node --check public/spelling/app.js
```

Open http://localhost:4173/spelling/. The Firebase SDK is version-pinned and loaded from Google's CDN; typography has system fallbacks.

For the existing full-site workflow, `npm run deploy` copies `public/spelling/` to `gh-pages` along with the other apps. For spelling-only changes, copy the contents of `public/spelling/` into `spelling/` on the existing `gh-pages` branch and commit without removing other files. GitHub Pages should use `gh-pages` and `/(root)` as its publishing source.

## Verification

Node tests cover bank integrity, per-student latest outcomes, undo, review/group intersection, shuffle, stable queues, and safe CSV fields. Browser checks cover recording, review updates, undo, demo persistence, and history. Actual Firebase cross-device sync must be checked after the console setup above.
