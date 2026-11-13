# Deploy What the Fu? with Supabase and Vercel

This guide takes the app in this repository from local files to a working public
website with email login and private game history. You will do the database and
hosting configuration in the Supabase and Vercel dashboards. No Supabase CLI,
database server installation, or Vercel CLI is needed.

## 1. Understand what goes where

| Service | What it does |
| --- | --- |
| GitHub | Stores this project; Vercel can redeploy when you push changes |
| Vercel | Builds and serves the React website over HTTPS |
| Supabase | Sends login links, manages accounts, stores vocabulary and completed rounds |
| An SMTP email provider | Delivers Supabase's login emails to your users |

You will need accounts at [GitHub](https://github.com/),
[Supabase](https://supabase.com/dashboard), and [Vercel](https://vercel.com/).
For public email login, also use an SMTP provider and a verified sending domain.
You can test the entire game locally without any of these accounts using demo mode.

The interface uses English and Simplified Chinese. “Priority 1” means most
essential. A cutoff of P1–P2 includes both priorities 1 and 2.

## 2. Create the Supabase project

1. Sign into the [Supabase dashboard](https://supabase.com/dashboard).
2. Choose **New project**, select or create an organization, and name the project
   something like `what-the-fu`.
3. Choose a strong database password and keep it in a password manager. The
   frontend does **not** use this password.
4. Select a region suitable for your audience. Confirm the plan and create the
   project. Wait for it to finish provisioning.
5. Open the project's **Connect** dialog and find the **Project URL** and
   **Publishable key**. You can also find keys under **Settings → API Keys**.
   Copy the URL beginning `https://` and the key beginning `sb_publishable_`.

The publishable key is intended for browser apps. Do not substitute a secret key,
`service_role` key, database password, or connection string. Row-level security
controls what users can access. See [Supabase's API key guide](https://supabase.com/docs/guides/getting-started/api-keys).

## 3. Create the tables and security policies

1. In the Supabase project's left navigation, open **SQL Editor**.
2. Create a new query. Open this repository's
   [`supabase/schema.sql`](supabase/schema.sql), copy **all** of its contents, and
   paste them into the editor.
3. Run the query. A success response with no rows returned is normal.
4. Open **Table Editor** and confirm you see `vocabulary` and `game_sessions` in
   the `public` schema.

The schema file creates:

- `vocabulary`: the bilingual learning entries, readable by signed-in users.
- `game_sessions`: completed rounds, including answer details, owned by one user.
- Row-level security policies so users can read/write only their own rounds.
- Constraints on scores, round size, and stored answer counts.

Do not disable RLS or add public write policies to make a connection error go
away. The dashboard's Table Editor runs with administrative privileges, so seeing
all users' rows there does not mean the browser app can see them.

## 4. Import the vocabulary

1. Create another query in **SQL Editor**.
2. Open [`supabase/seed.sql`](supabase/seed.sql), copy its complete contents, paste
   them into the editor, and run it.
3. Verify the import by running:

   ```sql
   select
     count(*) as total,
     count(*) filter (where not is_idiom and not is_slang) as vocabulary,
     count(*) filter (where is_idiom) as idioms,
     count(*) filter (where is_slang) as slang
   from public.vocabulary;
   ```

   Expected results:

   | total | vocabulary | idioms | slang |
   | --- | --- | --- | --- |
   | 2576 | 2376 | 100 | 100 |

The seed has already been generated from `chinese_to_english_game.csv`. You do
not need to import the CSV manually or rename its columns. Re-running the seed
updates matching IDs without creating duplicate entries. It does not remove rows
that you later remove from the CSV; intentional deletions need a separate SQL
change. Keep IDs stable when editing vocabulary.

**Already have the original 1,376 entries?** Run the complete
[`supabase/add_cefr_b2_c1_c2.sql`](supabase/add_cefr_b2_c1_c2.sql) file instead of
reimporting the full seed. This migration adds the `cefr_level` column and the
300 new entries, preserves existing content, and can be rerun. Its final query
should show B2: 100, C1: 100, C2: 100. Level labels are editorial estimates;
see [the dataset notes](VOCABULARY_README.md). Refresh the game after import and
select **All priorities** to make all the advanced words eligible.

To classify the original entries already in your database, also run
[`supabase/classify_remaining_cefr.sql`](supabase/classify_remaining_cefr.sql).
It fills empty levels only and preserves existing assignments. Fresh installs
using the current full seed already include all classifications. The game's
CEFR filter supports A1, A2, B1, B2, C1, and C2; redeploy the frontend if your
current version only offers the three advanced levels.

## 5. Configure email login in Supabase

### Enable email and new accounts

1. Open **Authentication** and find **Sign In / Providers** (some dashboard
   versions label it **Providers**).
2. Confirm the **Email** provider is enabled.
3. Keep new user signups enabled so first-time visitors can create accounts.
   Keep email confirmation enabled; the user proves ownership by opening the link.
4. You do not need anonymous auth, Google login, or a password configuration.

The app calls `signInWithOtp` with an email, but deliberately uses the default
**magic-link** flow. The same form signs in returning users and creates new
accounts. See [Supabase passwordless email authentication](https://supabase.com/docs/guides/auth/auth-email-passwordless).

### Keep the link in your email templates

In **Authentication → Email Templates** (or **Emails → Templates**), inspect
**Magic Link** and **Confirm Signup**. Keep the `{{ .ConfirmationURL }}` template
variable in the sign-in link. For example, the email body can contain:

```html
<h2>Your daily dose of fu is ready.</h2>
<p>Click below to sign in to What the Fu?</p>
<p><a href="{{ .ConfirmationURL }}">Enter the fu dojo</a></p>
<p>If you didn't request this email, you can ignore it.</p>
```

Set a subject such as `Your What the Fu? sign-in link`. Keep the confirmation URL
intact; do not replace it with a plain link to the homepage or only display
`{{ .Token }}`. This app expects a clickable sign-in link, not a code entry field.
Template reference: [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates).

### Set up SMTP for public users

Supabase's default sender is for testing and currently only sends to addresses on
your Supabase organization team, with a small rate limit. A visitor who merely
appears in **Authentication → Users** is not necessarily an authorized default
email recipient. Configure custom SMTP before inviting ordinary users.

1. Choose an email service supporting SMTP, such as Resend, Postmark, SendGrid,
   or Amazon SES.
2. In that service, verify your sending domain by adding its required DNS records
   at your domain/DNS provider. Wait until verification succeeds.
3. Obtain the provider's SMTP host, port, username, and password. Use its SMTP
   credentials, not your normal account password.
4. In Supabase, open **Authentication → Email → SMTP Settings** (the wording can
   also be **Custom SMTP** under authentication settings) and enable custom SMTP.
5. Enter those four values, a verified sender address such as
   `login@your-domain.com`, and sender name `What the Fu?`.
6. Save. Review **Authentication → Rate Limits** and the provider's sending limits.
7. Turn off email-provider click tracking/link rewriting for authentication links,
   then test delivery to an address outside your Supabase team.

Provider-specific credential formats vary. Follow the selected provider's SMTP
instructions and [Supabase's SMTP guide](https://supabase.com/docs/guides/auth/auth-smtp).

## 6. Try the app locally

Install Node.js 24 LTS, then open a terminal in this repository:

```sh
npm ci
cp .env.example .env.local
```

Edit `.env.local` with a text editor:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_REAL_PUBLIC_KEY
```

Do not put spaces around the variable names. Use values from the **same** Supabase
project. `.env.local` is excluded from Git.

In Supabase **Authentication → URL Configuration**, add this **Redirect URL**:

```text
http://localhost:5173/
```

For the initial local test, you may set **Site URL** to that URL as well. Start:

```sh
npm run dev -- --host localhost --port 5173 --strictPort
```

Open **http://localhost:5173/**. Enter your email, open the newest sign-in link,
and play a round. The app also supports `127.0.0.1`, but if you use it, add
`http://127.0.0.1:5173/` as a separate allowed redirect URL.

When the variables are missing or still contain the sample placeholders, the app
shows a 72-entry demo. A connected, signed-in app should load all 2,576 entries,
although your filters normally show a smaller matching pool. Restart the dev
server after changing environment variables.

## 7. Put the project on GitHub

1. On GitHub, create a repository such as `what-the-fu`. Public or private both
   work with Vercel. For an existing local project, creating an empty repository
   avoids an unnecessary initial README conflict.
2. Upload or push this project. GitHub Desktop is an option if you prefer a GUI:
   add the existing folder, commit the files, then publish the repository.
3. Include `package.json`, `package-lock.json`, `index.html`, `src/`, `public/`,
   `tsconfig.json`, `vite.config.ts`, and `vercel.json`. Keep `supabase/`, `scripts/`,
   the CSVs, tests, and instructions in the repository too.
4. Do not upload `node_modules/`, `dist/`, or `.env.local`. The included
   `.gitignore` handles these when using Git.

The project root is the directory containing `package.json`, not `src` or `dist`.

## 8. Deploy from the Vercel website

1. Sign into [Vercel](https://vercel.com/), preferably with the GitHub account
   containing the project.
2. Choose **Add New → Project**, connect GitHub if needed, and import the
   repository. Grant Vercel access to that repository.
3. On the project configuration screen, confirm:

   | Setting | Value for this project |
   | --- | --- |
   | Framework preset | Vite |
   | Root directory | `./` unless the project is inside a repository subfolder |
   | Build command | `npm run build` |
   | Output directory | `dist` |
   | Install command | `npm ci` (or the npm default detected from the lockfile) |
   | Node.js version | 24.x |

4. Add these **Environment Variables**, using the same values as local setup:

   | Name | Value |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Your Supabase HTTPS project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Your `sb_publishable_...` key |

5. Apply them to **Production**. Also select **Preview** and **Development** if
   you want those environments connected to the same project; a separate test
   Supabase project is preferable once you have real user data.
6. Click **Deploy**, wait for the build, and open the resulting site.

The repository's `vercel.json` already specifies the Vite build and routing.
Official reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

If the page displays the demo unexpectedly, check the variables for spelling and
placeholder values. Vite includes `VITE_` variables during the build, so changing
them requires a **new deployment**, not just a refresh. In Vercel, use **Settings
→ Environment Variables** to edit them, then **Deployments → latest deployment
→ Redeploy**. These two values are public browser configuration, not server
secrets. See [Vite environment variables](https://vite.dev/guide/env-and-mode).

## 9. Point login links to the real website

After the first Vercel deployment, copy its stable production URL, for example:

```text
https://what-the-fu.vercel.app/
```

In **Supabase → Authentication → URL Configuration**:

1. Set **Site URL** to the production URL.
2. Add that exact URL, including the trailing slash, under **Redirect URLs**.
3. Keep the local URLs if you will continue local development.
4. Save the changes, then request a **new** sign-in email from the production site.

The app requests a redirect to its current origin plus `/`. Allow the exact origin
you use. If you add a custom domain in **Vercel → Settings → Domains**, update the
Supabase Site URL and redirect list for that domain too.

Vercel preview deployments have different addresses. To test login on a preview,
add its exact URL to the redirect list, and account for any Vercel deployment
protection. Prefer exact allowed URLs over a broad `*.vercel.app` wildcard.
See [Supabase redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).

## 10. Verify the finished setup

Use the actual production site for these checks:

1. **New account:** enter a new email address, receive the message, and open the
   link. You should see **Sign out** in the header.
2. **Auth record:** Supabase **Authentication → Users** should list that account.
3. **Vocabulary:** open filters and choose **All priorities** and **Include rude /
   insulting slang** with all topics/types. The matching count should be 2,576.
4. **Both directions:** play Chinese → English, then English → Chinese. Mixed
   mode randomly selects a direction for each question.
5. **Feedback:** try a correct answer, a wrong answer, and a skip. Each should show
   the correct word, IPA, example sentence, and Chinese translation.
6. **Audio:** with automatic audio on, submit an answer. The word and English
   example should play. Try **Listen again**, sentence-only playback, and **Stop
   audio**. Check device volume and an installed English speech voice if silent.
7. **History:** finish a short round and wait for the saved message. Open **My
   rounds**; the round should be there. Reload and confirm it remains.
8. **Database:** Supabase **Table Editor → game_sessions** should contain the
   result, its `user_id`, settings, and answer details.
9. **Separate user:** sign into a second email in a separate browser profile.
   Its history should not show the first user's rounds.
10. **Phone:** open the site on your phone, enter a Chinese answer using its IME,
    and test speech. Voice quality and automatic playback vary by browser/device;
    the replay control remains available.

## Troubleshooting

| Symptom | Check / fix |
| --- | --- |
| Login email says address is not authorized | Configure custom SMTP; the default service only permits team addresses. |
| No email arrives | Check spam, Supabase Auth logs, SMTP provider logs, sender domain verification, and rate limits. |
| Too many requests | Wait before resending; inspect Supabase and SMTP rate limits. The app also has a 60-second resend cooldown. |
| Email opens localhost instead of production | Fix Site URL and allowed redirect URLs, then request a new email from production. |
| Expired or invalid link | Request a fresh link and use the newest message. Links are one-use; email security scanners can also consume them. Check link tracking. |
| App stays in demo | Check both exact `VITE_` variable names and values, then rebuild/redeploy. Click “Use my account” if you manually selected demo. |
| Empty vocabulary | Run `schema.sql` first, then the complete `seed.sql`. Confirm the count query. |
| Permission denied / cannot load words | Confirm login, RLS policies, table grants, and that the URL/key refer to the same project. Rerun the supplied schema instead of disabling RLS. |
| No questions for idioms/slang | P1-only excludes most expressions. Try P1–P3 or all priorities and clear the topic filter. |
| Valid translation marked wrong | Use “Close enough — mark correct”; the checker has a finite set of variants. Extend `src/lib/game.ts` for more aliases. |
| No voice on a phone | Open **Voice settings**, select **Device default English**, and tap **Preview voice**. Check media volume/output and an installed English speech voice. If using an embedded browser inside another app, try the same site directly in Safari or Chrome. After deploying audio changes, reload the page. |
| Round does not save | Confirm you are signed in and not in demo, finish the round, then use “Retry saving.” Check Auth logs, table policies, and network access. |
| Build cannot find files | Confirm Vercel root directory and that the required source/config files were committed. |

## Ongoing updates and data handling

- Push frontend changes to the connected GitHub production branch to trigger a
  Vercel deployment. Database SQL is **not** automatically applied by Vercel.
- To change vocabulary, edit the CSV, run `npm run data:prepare`, then apply the
  regenerated seed through Supabase SQL Editor and deploy the updated demo file.
- The full vocabulary stays in Supabase; 72 selected sample entries are shipped
  publicly for demo mode. Browser-loaded study words are not a secret answer bank.
- Scores are self-study records, computed by the browser and optionally
  self-marked. This app does not implement a tamper-proof leaderboard.
- Settings stay in browser storage. Completed signed-in rounds are saved to
  Supabase. Refreshing or leaving an unfinished round discards it.
- To remove a user's stored history, an administrator can delete their rows in
  `game_sessions`. Deleting a user from Supabase Auth also deletes their rounds
  through the database foreign key. There is no in-app account-deletion UI yet.
- Review your chosen providers' current pricing and quotas before opening the app
  to a large audience; this guide does not assume any fixed free-tier limits.

## What has and has not been tested

The repository includes automated game-logic tests, local PostgreSQL tests of the
schema/import/permissions, and browser tests of demo gameplay, mobile layout,
and a mocked Supabase email-login/data flow.
Real email delivery, production Auth redirects, and persistence on your hosted
Supabase project require your accounts and configuration. Complete the production
checks above after you deploy.

### Add the second CEFR expansion (900 words)

For an existing database, open **Supabase → SQL Editor → New query**, paste the
entire contents of `supabase/add_cefr_900.sql`, and click **Run**. It adds 300
more words each at B2, C1, and C2, with all vocabulary columns. The final query
should show 300 per level. The import is safe to rerun; ID or duplicate-headword
conflicts stop the transaction. It leaves earlier vocabulary and game history
untouched. Refresh the game, open **Fine-tune your fu**, and select one or more CEFR levels
with all topics/priorities. No schema change or Vercel configuration change is
needed for an already configured app. New installations use the full seed.

The new batch is also in `cefr_b2_c1_c2_900_additions.csv`. Full collection: 2,576
entries, including B2: 521, C1: 451, C2: 400. Levels are editorial estimates.
