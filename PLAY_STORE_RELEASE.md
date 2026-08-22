# iVa Edu — Google Play Release Checklist

App: **iVa Edu** · Package: **`ai.intelliverify.ivaedu`** · EAS project: `@intelliverify/iva-intelliverify`

> ⚠️ **New app / new package.** `ai.intelliverify.ivaedu` is a **brand-new Play listing**, separate from the original `ai.intelliverify.iva`. A published package name can never be changed, so this does **not** update the old app — it's its own app with its own installs, reviews, and signing key.

---

## 0. Prerequisites
- [ ] **Google Play Developer account** active ($25 one-time) under the right Google account.
- [ ] Decide release track: **Internal testing → Closed → Production** (recommended ramp). Internal testing goes live to testers in minutes with no review wait — best first step.
- [x] AAB built by EAS via `eas build -p android --profile production`. A **new upload keystore was auto-generated** for `ai.intelliverify.ivaedu` (the old `iva` key `cl6jUHZH4D` is **not** reused). View it anytime with `eas credentials -p android`.
  - Latest build: `iVaEdu-v1.0.1-code1-production.aab` — versionCode **1**, EAS build `37a60d5c-6327-42f0-9bb2-2beb20cf0808`.

## 1. Create / open the app in Play Console
- [ ] Play Console → **Create app** (this is a first-time listing for `ivaedu`):
  - App name: **iVa Edu**
  - Default language, App (not Game), **Free**
  - Confirm declarations (Play policies, US export laws)

## 2. versionCode sanity check
- [ ] Play **rejects any `versionCode` already used** *within this app*. Since `ivaedu` is brand new, this build = **versionCode 1** and is fine to upload.
- [ ] For each subsequent release, bump `versionCode` in `app.json` (2, 3, …) and rebuild.

## 3. Upload the AAB
- [ ] Track (e.g. **Internal testing**) → **Create new release**.
- [ ] Upload the `.aab` — either the local file `~/Downloads/iVaEdu-v1.0.1-code1-production.aab` or from the EAS build page (Build Artifacts URL).
- [ ] Let **Play App Signing** manage the app signing key (accept on first upload). Your EAS key becomes the *upload* key.
- [ ] Add release notes → **Save** → **Review release** → **Roll out**.

## 4. Required compliance (Play blocks production until all are done)
- [ ] **Privacy policy URL** — mandatory (app handles personal data). Host one (e.g. `https://edu.intelliverify.in/privacy` or evergreenprepschools.com/privacy).
- [ ] **App access** — ⚠️ *This app requires login.* Provide **working demo credentials** (parent + teacher) under App content → App access, or Google review **will reject** it.
- [ ] **Data safety form** — declare what's collected. For iVa this includes:
  - Personal info (name, phone), Photos/media, **Location** (bus GPS), Push tokens.
  - State whether data is encrypted in transit and if users can request deletion.
- [ ] **Content rating** questionnaire (likely "Everyone").
- [ ] **Target audience & content** — users are **adults (parents/teachers)**. Declare audience accordingly; note it processes children's data on behalf of the school but the app is **not directed at children** (avoids Families policy unless you intend otherwise).
- [ ] **Ads** declaration — iVa has no ads → declare "No ads".
- [ ] **Government apps / financial features** — fees/payments via Razorpay: answer the financial-features questions honestly if prompted.

## 5. App-specific permission notes
- [ ] **Location** (`ACCESS_FINE_LOCATION`) is *when-in-use* (bus position sharing) — declare its purpose in Data safety; no background-location declaration form needed since it's not background.
- [ ] **Photos / media** (`READ_MEDIA_IMAGES`) — class gallery uploads; covered by Data safety "Photos".
- [ ] **Notifications** (`POST_NOTIFICATIONS`) — push; no special form.

## 6. Store listing assets (needed before production rollout)
- [ ] App icon (512×512 PNG), Feature graphic (1024×500)
- [ ] Phone screenshots (min 2; 16:9 or 9:16)
- [ ] Short description (≤80 chars) + Full description
- [ ] App category: **Education**

## 7. Recommended rollout order
1. **Internal testing** — verify the signed AAB installs & login works on a real device.
2. **Closed testing** — small group of real parents/teachers.
3. **Production** — staged rollout (e.g. 20% → 100%).

---

### Notes
- First upload **must be manual** here (org policy blocks the service-account key needed for `eas submit`). Once a key exception is granted, future releases can auto-submit with `eas submit -p android --profile production`.
- Keep the EAS keystore safe — it's your upload key; losing it complicates future updates (though Play App Signing protects the actual app signature).
