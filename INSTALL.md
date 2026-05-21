# Planora Mobile — fast install (Windows)

If `npm i` spins for 30+ minutes, it is usually **SSL/proxy** + **heavy packages** (Sentry/PostHog). This project is set up for a **lean first install**.

## Step 1 — stop any stuck install

Press `Ctrl+C`, then:

```powershell
cd E:\manage_time_app\PlanoraMobile
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
npm cache clean --force
```

## Step 2 — fast install (~5–15 min on slow networks)

```powershell
npm run install:fast
```

Uses `.npmrc` with `strict-ssl=false` (same fix as PlanoraBackend).

## Step 3 — optional analytics (install later)

```powershell
npm run install:analytics
```

## Faster alternative: reuse existing app `node_modules`

If `ManageTimeApp_React-Native` already has `node_modules` installed:

```powershell
# From repo root — only if PlanoraMobile install keeps failing
robocopy "ManageTimeApp_React-Native\node_modules" "PlanoraMobile\node_modules" /E /NFL /NDL /NJH /NJS
cd PlanoraMobile
npm run install:fast
```

Then copy `android` and `ios` from `ManageTimeApp_React-Native` into `PlanoraMobile` before `npm run android`.

## Android build: SSL / PKIX errors (Gradle)

If `npm run android` fails with **PKIX path building failed** when downloading from `repo.maven.apache.org`:

### Fix A — restart Gradle with Windows cert store (already in `android/gradle.properties`)

```powershell
cd E:\manage_time_app\PlanoraMobile
npm run android
```

Do **not** run `gradlew clean` before every install — it breaks New Arch CMake on Windows. Use `npm run android:rebuild` only when you need a full reset.

### Phone → backend (required for login/signup)

On a **physical device**, `localhost` is the phone, not your PC. Edit `PlanoraMobile/src/config/env.ts`:

- Set `DEV_MACHINE_IP` to your PC IPv4 from `ipconfig` (e.g. `192.168.1.14`)
- Phone and PC must be on the **same Wi‑Fi**
- Run `PlanoraBackend` with `npm run dev` (port **3001**)
- Reload Metro after changing `env.ts` (`r` in Metro terminal)

Watch Metro logs for `[Planora API]` and `[Planora Auth]` lines. Backend logs show `Signup request` when the phone hits the API.

After changing `android/app/build.gradle` (cleartext HTTP), run `npm run android` once to reinstall the native app.

### Fix B — dev SSL init script (if A is not enough)

Terminal 1: `npm start`  
Terminal 2:

```powershell
npm run adb
npm run android:install
```

Uses `android/init-ssl.gradle` (development only).

### Metro says “No apps connected” but `adb devices` shows `device`

These are **two different links**:

| Check | What it means |
|--------|----------------|
| `adb devices` → `device` | USB debugging OK — Gradle can **install** the APK |
| Metro `r` / reload | The **running app** must open a dev connection to port **8081** |

`adb` does **not** connect Metro to your app. You need **port reverse** + the **app open**.

**Correct order (physical phone + USB):**

```powershell
# Terminal 1 — leave running
cd E:\manage_time_app\PlanoraMobile
npm start

# Terminal 2 — after Metro is up
npm run dev:phone          # adb reset + reverse 8081
npm run android:install    # or tap Planora on the phone if already installed
```

Then on the phone:

1. **Open “Planora AI”** from the launcher (install alone is not enough).
2. Wait until the UI loads (not stuck on splash).
3. In Metro terminal, press **`r`** to reload — or shake the phone → **Reload**.

If reload still warns “No apps connected”:

```powershell
npm run adb                # run again after unplug/replug USB
adb shell am force-stop com.mobile
adb shell am start -n com.mobile/.MainActivity
```

**Dev server host (USB):** shake phone → Dev Menu → **Change Bundle Location** → `localhost:8081`  
(With `adb reverse`, `localhost` on the phone points to your PC.)

**Wi‑Fi instead of USB reverse:** use your PC IP, e.g. `192.168.1.14:8081` (same IP as `env.ts`), allow port 8081 in Windows Firewall, phone on same Wi‑Fi.

**API vs Metro:** `env.ts` `DEV_MACHINE_IP` is only for the **backend** (port 3001). Metro is always **8081** (+ `adb reverse` for USB).

### Fix C — build from the app that already works

If **ManageTimeApp_React-Native** builds on your PC, use shared Gradle cache:

```powershell
# Terminal 1 — Planora JS bundle
cd PlanoraMobile
npm start

# Terminal 2 — legacy native shell (installs APK)
cd ManageTimeApp_React-Native
npm run adb
npm run android
```

Then point Metro to Planora by temporarily setting the legacy app’s entry to load Planora’s bundle (advanced), or finish copying `android/` after Gradle cache is warm.

### Fix D — proper fix (recommended long-term)

Import your company root CA into Java:

```powershell
# Ask IT for corporate-root-ca.pem, then:
keytool -importcert -alias corporate-ca -file corporate-root-ca.pem -keystore "%JAVA_HOME%\lib\security\cacerts" -storepass changeit
```

## Step 4 — native folders

PlanoraMobile is JS-only until you copy native projects:

```powershell
robocopy "..\ManageTimeApp_React-Native\android" "android" /E
robocopy "..\ManageTimeApp_React-Native\ios" "ios" /E
```

Update app name / bundle id in `android/app/build.gradle` when ready.

## Verify install worked

```powershell
Test-Path node_modules\react-native\package.json
# Should be True
```
