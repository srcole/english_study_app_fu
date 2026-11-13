# What the Fu?

A cheerful English–Simplified Chinese vocabulary game, supervised by an
unreasonably confident piece of tofu.

**Start here: [Supabase + Vercel setup guide](DEPLOYMENT.md).**

## Run locally

Use Node.js 22.12 or newer (Node 24 LTS recommended).

```sh
npm ci
npm run dev
```

Open the printed local URL. Without Supabase environment variables, the app uses
a 72-entry demo. To enable email login and all 1,676 entries, follow
[DEPLOYMENT.md](DEPLOYMENT.md).

## What is included

- Passwordless email sign-in with Supabase Auth; first-time users sign up through
  the same flow.
- Chinese → English, English → Chinese, and mixed-direction rounds.
- Collapsed filters for words/idioms/slang, priority, topic, question count,
  speaking speed, and optionally rude slang.
- Text answers, immediate feedback, English pronunciation and sentence playback,
  IPA, Simplified Chinese translations, and self-marking for alternate translations.
- Results, practice for missed words, and the last 10 completed rounds per account.
- Responsive, keyboard-accessible interface with Master Tofu and plenty of fu.

## Architecture

React + TypeScript + Vite builds a static frontend hosted by Vercel. The browser
uses the public Supabase client key; Supabase Auth identifies users and Postgres
row-level security protects their records. No Vercel server function, paid AI
API, service-role key, or audio-generation service is required.

Speech uses the browser's Web Speech API. The installed English voices and device
settings determine the voice and availability. Audio is requested after an answer
is submitted; a replay button is always available.

Open **Voice settings** in the header to choose and preview an English voice,
adjust speed, or toggle automatic reading. Automatic selection prefers voices
labeled natural/enhanced/premium, then Google voices, over basic system voices.
On phones, automatic selection prioritizes installed English voices to avoid
depending on an online speech service. **Device default English** compatibility
mode lets the phone choose its own English voice, even with an incomplete voice
list. Paused engines are resumed on a playback tap; a startup timeout reports
silent failures with recovery steps rather than leaving the user guessing.
The default speed is **1×**; older saved settings are migrated to that default
once. Subsequent voice/speed choices are saved in this browser. You can open
settings during a round without losing your answer. Available voices depend on
your browser and OS; online voices may require connectivity.

## Useful files

| File | Purpose |
| --- | --- |
| `DEPLOYMENT.md` | Step-by-step website setup, publishing, and troubleshooting |
| `.env.example` | The two public Supabase environment variables |
| `src/App.tsx` | Home, login, game, feedback, results, and history |
| `src/lib/game.ts` | Filtering, randomized question selection, answer matching |
| `src/lib/speech.ts` | English pronunciation playback |
| `supabase/schema.sql` | Tables, constraints, grants, and per-user security policies |
| `supabase/seed.sql` | Ready-to-paste import of all 1,676 entries |
| `supabase/add_cefr_b2_c1_c2.sql` | Incremental import of 100 B2, 100 C1, and 100 C2 words into an existing database |
| `cefr_b2_c1_c2_additions.csv` | The 300 additions with all columns and editorial CEFR levels |
| `scripts/prepare_data.py` | Convert the existing CSV into SQL and demo JSON |
| `chinese_to_english_game.csv` | Canonical vocabulary content |
| `VOCABULARY_README.md` | Dataset fields and pronunciation conventions |
| `vercel.json` | Vercel build, routing, and response headers |

## Validation

```sh
npm test
npm run build
npm run test:e2e
```

Unit tests cover answer matching and filters. Database tests run the real SQL in
an embedded PostgreSQL engine and check two-user isolation, anonymous access,
constraints, and safe re-imports. Browser tests use installed Google Chrome and
start their own local server; install Chrome first or adjust the Playwright
`channel` in `playwright.config.ts` for your browser setup. They cover demo mode
and a mocked Supabase login/data flow, without sending real emails.

For a CSV content change:

```sh
npm run data:prepare
npm test
npm run build
```

Then run the updated `supabase/seed.sql` in Supabase and deploy the frontend.
Keep existing CSV IDs stable: an upsert updates the corresponding database row.

## Deliberate limits

This is a self-study game: answer checks are deterministic, not AI translations.
Known variants are accepted, and learners can mark another equivalent answer as
correct. Scores are user-controlled study records, not verified competition
scores. Unfinished rounds are not persisted; refreshing or leaving loses that
round. Preferences are stored in the current browser. Completed account rounds
are stored in Supabase. The demo is public and does not save scores.
