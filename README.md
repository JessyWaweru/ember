# Ember 🔥

Calorie tracker + training ranks + habit tracker, with home-screen widgets on iOS and Android.
Your data lives in your own Supabase project (free tier), tied to your account. New phone means you just sign in.

## What's inside

| Tab | What it does |
|---|---|
| **Today** | Calories left (goal − eaten + burned), protein/carbs/fat rings, meals by type. Arrows step through past days. |
| **History** | 7/30-day calorie chart vs goal, daily average, weight trend, every past meal. |
| **Train** | Log workouts with manually entered calories burned (or estimate them). Each exercise has a Liftoff-style rank: Rookie → Bronze → Silver → Gold → Platinum → Diamond → Master → Legend, each with divisions III/II/I, plus an overall athlete rank. |
| **Habits** | GRIT-style: build/quit habits, counted habits (e.g. 8× water), skip days without breaking streaks, morning/afternoon/evening sections, perfect-day streak, templates, stats with calendar + yearly heatmap + streak achievements. |
| **Me** | Goals (Mifflin-St Jeor calculator), weight, JSON data export, sign out. |

**Food logging:** manual entry, a free food database search (Open Food Facts), or one-tap re-log of recent foods.

**Ranking rules** (see `src/lib/tiers.ts`):
- Walking / Walk-Jog: longest distance in one session
- Push-ups / Bulgarian split squats: most reps in one set (split squats count reps per leg)
- Shadow kickboxing: longest session in minutes
- Weighted lifts: estimated 1-rep max ÷ your bodyweight

**Widgets:** Calories, Training and Habits. They refresh every time your data changes in the app, and on iOS they reset at midnight.

## Setup (one time, about 15 minutes)

### 1. Supabase (free)
1. Create a project at https://supabase.com (free plan).
2. **SQL Editor** → paste all of `supabase/schema.sql` → **Run**.
3. **Settings → API Keys**: copy the project URL and the **publishable** key (`sb_publishable_…`, never the secret key).
4. Optional: **Authentication → Sign In / Providers → Email**, turn off "Confirm email" if you don't want a confirmation step.

```bash
cp .env.example .env   # then paste the URL + anon key into .env
```

### 2. iPhone, part A: web app (free, permanent, your daily driver)
Ember also runs as an installable web app. It's hosted free on EAS Hosting:
```bash
npm install
npx eas-cli@latest login       # free Expo account (expo.dev)
npm run deploy:web             # builds + deploys; prints your URL, e.g. https://ember--xxxx.expo.app
```
On the iPhone: open that URL in **Safari** → Share button → **Add to Home Screen**. It opens full-screen
like a normal app and never expires. Run `npm run deploy:web` again whenever the code changes.
Web apps can't have iPhone home-screen widgets (an Apple limit). That's what part B is for.

In Supabase → **Authentication → URL Configuration**, set **Site URL** to that web address so
email links (password reset, sign-up confirmation) open the app.

### 3. iPhone, part B: native build via sideloading (free, widgets, re-sign weekly)
No Mac needed: GitHub's free Mac servers build the app, and SideStore installs it with your free Apple ID.

1. Push this folder to a new GitHub repo. **Make it public** (free unlimited Mac build minutes;
   private repos get ~200 Mac minutes/month). No secrets are in the code.
2. Repo → Settings → Secrets and variables → Actions → add `EXPO_PUBLIC_SUPABASE_URL` and
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
3. Actions tab → **iOS sideload build** → Run workflow (~20–30 min) → download the `Ember-ipa` artifact
   (it's a zip containing `Ember.ipa`).
4. Install **SideStore** on your iPhone (https://sidestore.io, one-time setup from your Windows PC),
   then open `Ember.ipa` with it.
5. Free Apple IDs sign apps for **7 days**. SideStore can refresh it from the phone before then.
   If it lapses, the app won't open until refreshed. Your data is safe in Supabase, and the web app keeps working meanwhile.

Caveats: with a free Apple ID, the widgets' shared App Group may not get set up during re-signing.
If the app runs but widgets stay empty, that's the reason. Use the web app and wait for Android.
I couldn't run this workflow myself; if a step fails, the Actions log shows which one.

### 4. Android (free, when you switch)
```bash
npx eas-cli@latest init
npx eas-cli@latest build --platform android --profile preview
```
Open the link it prints on your phone and install the APK. Widgets included. Sign in, and everything's there.

### Day-to-day development
```bash
npx expo start --web          # web, in your browser
```

## Costs
| Thing | Cost |
|---|---|
| Supabase free tier (500 MB DB) | $0 |
| EAS Hosting (web app) + EAS Build (Android) free tiers | $0 |
| GitHub Actions on a public repo (iPhone build) | $0 |
| SideStore + free Apple ID | $0 (re-sign every 7 days) |

Supabase's free plan pauses a project after about a week of **no activity**. Using the app daily keeps it awake. If it does pause, nothing is deleted: hit "Restore" in the dashboard. The free plan has no automatic backups, so use **Me → Export my data** now and then.

## Code map
```
supabase/schema.sql      tables + row-level security (each user only sees their own rows)
src/app/                 screens (expo-router)
src/lib/data.ts          all Supabase reads/writes (React Query hooks)
src/lib/tiers.ts         rank system
src/lib/habits.ts        streaks, skip/slip logic, templates, achievements
src/lib/nutrition.ts     calorie targets + burn estimates
src/widgets/             widget layouts (*.ios.tsx = SwiftUI, *.android.tsx = Jetpack Compose) + sync.ts
```
