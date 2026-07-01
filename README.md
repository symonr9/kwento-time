# Kwento Time

A mobile-first, **local-first** relationship intelligence app for iOS and Android, built with Expo (SDK 56) + Expo Router. The name comes from the Filipino word _kwento_ (story / chat). It remembers who said what, surfaces talking points before you see people, and nudges you to follow up — **all data stays on the device.**

> Architecture, conventions, and the data model are documented in [CLAUDE.md](CLAUDE.md) and the per-folder `CLAUDE.md` files under [src/](src/).

---

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Expo SDK, Expo Router (typed routes), React 19, React Native |
| Database | `expo-sqlite` (on-device SQLite) |
| ORM / migrations | Drizzle ORM + Drizzle Kit (schema-first, type-safe) |
| Builds | EAS Build (cloud) + development builds (no Expo Go) |

---

## First-time setup

```bash
npm install                          # install JS dependencies
npx expo install expo-dev-client     # required for development builds
npm install -g eas-cli               # EAS command line
eas login                            # sign into your Expo account
eas init                             # link this repo to an EAS project (writes the projectId)
```

> **Before your first build:** the iOS `bundleIdentifier` and Android `package` in [app.json](app.json) default to `com.symonr9.kwentotime`. Change them if you want a different ID — they're permanent once an app is published.

---

## Development workflow

You build the native dev client **once per platform** (and again only when native dependencies change), then iterate on JavaScript all day against the dev server.

### iOS (your primary target)

You're on Windows, so iOS builds happen **in the cloud via EAS** and install on a **physical iPhone** (no Mac, no iOS Simulator available to you).

| Command | What it does |
|---------|--------------|
| `eas device:create` | Register your iPhone's UDID with your Apple account (one-time per device; required for internal-distribution installs). |
| `eas build --profile development --platform ios` | Cloud-builds the dev client `.ipa`. When it finishes, open the install link / scan the QR on the iPhone to install. |
| `npm run dev` | Starts the Metro dev server (`expo start --dev-client`). |
| _(then)_ | Open the installed **Kwento Time (dev)** app on the iPhone — keep it on the **same Wi‑Fi** as your laptop — and it connects to the dev server. Edit code → it reloads. |

Rebuild the dev client (`eas build …`) only when you add/upgrade a **native** module or change `app.json` native config. Pure JS/TS changes never need a rebuild.

### Testing on your Windows laptop (Android)

iOS can't run on Windows, so use **Android** for fast local testing. Two ways to get the dev client:

| Command | What it does |
|---------|--------------|
| `npx expo run:android` | **Local** native build → installs the dev client onto a running emulator / connected device. Fastest iteration; needs Android Studio + SDK + JDK installed. |
| `eas build --profile development --platform android` | **Cloud** build → produces an installable `.apk` (good if you don't have the Android SDK set up locally). |
| `npm run dev` then press `a` | Launches the dev client on the Android emulator and connects it to Metro. |

> **Web** (`npm run web`) runs via `react-native-web`, but `expo-sqlite` on web needs extra WASM + COOP/COEP setup — treat web as a quick layout sanity check, not a DB test surface.

### Daily loop (after the dev client is installed)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start the dev server for development builds. |
| `npm start` | Start the dev server (plain; `--dev-client` is preferred once you have a dev build). |
| `npm run android` / `npm run ios` | Start + open on the Android emulator / iOS device. |
| `npm run typecheck` | `tsc --noEmit` — fast type safety check. |
| `npm run lint` | Expo lint. |
| Press `r` in the dev-server terminal | Reload the app. |
| Press `j` | Open the JS debugger. Press `m` for the dev menu, `shift+m` for more dev tools. |
| `npx expo start --dev-client -c` | Start with a **cleared** Metro cache (fixes stale-bundle weirdness). |

---

## Database (Drizzle + SQLite)

Everything persists to a single on-device SQLite file (`kwento.db`). The data layer lives in [src/db/](src/db/) — see [src/db/CLAUDE.md](src/db/CLAUDE.md) for the rules.

### How it works

- **Schema** ([src/db/schema/](src/db/schema/)) — tables are defined in TypeScript. Row types are *inferred* from them (`$inferSelect` / `$inferInsert`), so the DB and your types can never drift.
- **Client** ([src/db/client.ts](src/db/client.ts)) — opens the SQLite file once (WAL mode, foreign keys ON) and wraps it in the typed Drizzle instance `db`.
- **Queries** ([src/db/queries/](src/db/queries/)) — the only place that builds SQL. Screens/hooks call these functions; they never write queries inline.
- **Migrations** ([src/db/migrations/](src/db/migrations/)) — generated SQL. There are **two phases**:
  1. **Build time:** you change the schema and run `npm run db:generate`. Drizzle Kit diffs your TS schema against the last snapshot and writes a new `NNNN_name.sql` plus an updated `migrations.js`.
  2. **Run time:** on app launch, `<MigrationGate>` ([src/db/migrate.tsx](src/db/migrate.tsx)) applies any pending migrations to the device's database via `useMigrations`.

### Drizzle commands

| Command | When to run it |
|---------|----------------|
| `npm run db:generate` | After **any** change to `src/db/schema/`. Generates the migration SQL + `migrations.js`. Commit the result with your schema change. |
| `npm run db:check` | Validates that your generated migrations are consistent (no collisions / corruption). Good pre-commit check. |
| `npx drizzle-kit generate --name add_xyz` | Same as `db:generate` but names the migration file. |
| `npx drizzle-kit up` | Upgrades migration snapshot metadata after a Drizzle Kit major upgrade (rare). |

After generating, just relaunch the app — `<MigrationGate>` runs the new migration automatically. There's nothing to "apply" from the CLI.

> ⚠️ Migrations are **forward-only** and run on real user devices. Never hand-edit a generated `.sql` file that has already shipped; add a new migration instead. To wipe a dev database and start clean, delete + reinstall the dev app (or clear app storage).

### Inspecting your local database

You can't point a desktop GUI directly at the phone's DB, but you have two good options:

**A. Live, in-app (recommended):** add the Drizzle Studio dev plugin.
```bash
npx expo install expo-drizzle-studio-plugin
```
Then call its `useDrizzleStudio(expoDb)` hook once near your root component (pass the `expoDb` exported from `src/db/client.ts`). A **Drizzle Studio** panel appears in the Expo dev tools (press `shift+m` in the dev server), letting you browse tables and run queries live. _(Check the package README for the exact current API.)_

**B. Pull the file off an Android emulator (Windows-friendly):**
```bash
# kwento.db lives under the app's sandbox; this needs a debuggable (dev) build:
adb exec-out run-as com.symonr9.kwentotime cat files/SQLite/kwento.db > kwento.db
```
Then open `kwento.db` in **[DB Browser for SQLite](https://sqlitebrowser.org/)** or `sqlite3 kwento.db`.

### Database troubleshooting

| Symptom | Fix |
|---------|-----|
| "no such table" / schema looks old | A migration didn't run. Confirm `npm run db:generate` was run after the schema change and that `migrations.js` is updated; relaunch the app. |
| Migration error on launch | `<MigrationGate>` shows the error. Often a stale dev DB — reinstall the dev app to reset it, then relaunch. |
| Changed schema but app didn't update | You forgot `npm run db:generate`, or Metro served a stale bundle — restart with `npx expo start --dev-client -c`. |
| `.sql` import fails to bundle | Ensure `metro.config.js` has `sql` in `sourceExts` and `babel.config.js` has the `inline-import` plugin (both already configured). |
| FK cascade didn't delete children | Foreign keys are enabled in `client.ts`; if you opened a second connection elsewhere, set `PRAGMA foreign_keys = ON` there too. |

---

## Deployment

Builds and store submissions run through **EAS**. Profiles live in [eas.json](eas.json).

| Command | What it does |
|---------|--------------|
| `eas build --profile preview --platform ios` | Internal test build (installable on registered devices) without the dev-server dependency. |
| `eas build --profile production --platform ios` | Release build for the App Store (auto-increments build number). |
| `eas build --profile production --platform android` | Release `.aab` for Google Play. |
| `eas submit --profile production --platform ios` | Uploads the latest production build to **App Store Connect → TestFlight**. |
| `eas submit --profile production --platform android` | Uploads to the Google Play Console. |
| `eas update --branch production` | Ships an **OTA JS update** to already-installed builds (JS/asset changes only — native changes still need a new build). |

**Typical release flow:** `production` build → `eas submit` to TestFlight → test → promote to App Store. After release, small JS fixes can go out via `eas update` without a new binary.

---

## Git workflow

`main` is the default branch. Work on feature branches and open PRs.

| Command | What it does |
|---------|--------------|
| `git checkout -b feat/<short-name>` | Start a feature branch off `main`. |
| `npm run typecheck && npm run lint` | Verify before committing. |
| `git add -A && git status` | Stage, then **review what's staged** (see secrets note below). |
| `git commit -m "..."` | Commit. Include generated migration files alongside schema changes. |
| `git push -u origin feat/<short-name>` | Push the branch. |
| `gh pr create --fill` | Open a pull request (GitHub CLI). |

🔒 **Never commit secrets.** Signing credentials and any future third-party service keys must stay out of the repo — they're git-ignored (`.env*`, keystores, certs). Load secrets from the environment / EAS Secrets, and **review `git diff --staged` before every commit.** If a secret ever lands in a commit, rotate it immediately (removing it later doesn't erase it from history). See the Secrets section in [CLAUDE.md](CLAUDE.md).

---

## General troubleshooting

| Symptom | Fix |
|---------|-----|
| Stale bundle / weird red screens | `npx expo start --dev-client -c` (clears Metro cache). |
| Added a native module and it's "undefined" | Rebuild the dev client (`eas build --profile development …` or `npx expo run:android`). JS-only changes never need this. |
| Native config (`app.json`) changes not applied | Rebuild the dev client; for local Android, delete the app and `npx expo run:android` again. |
| Dependency / SDK mismatch warnings | `npx expo-doctor` and `npx expo install --check`. |
| Device can't reach the dev server | Same Wi‑Fi as your laptop; or use `npx expo start --tunnel`. |

### NoModificationAllowedError: No modification allowed
This error appeared when trying to run my app after setting up Drizzle with SQLite3 on the 
web. This error happens if **there are multiple localhost tabs running at the same time**.

On the web, Expo SQLite uses the browser's Origin Private File System (OPFS) via a web worker. This error occurs because OPFS only permits one active connection or stream to a database file at a time.

 If Tab A holds the SQLite OPFS access handle open, Tab B will instantly crash with NoModificationAllowedError.
