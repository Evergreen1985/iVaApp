# iVa — Google Play Release Checklist

App: **iVa** · Package: **`ai.intelliverify.iva`** · EAS project: `@intelliverify/iva-intelliverify`

---

## 0. Prerequisites
- [ ] **Google Play Developer account** active ($25 one-time) under the right Google account.
- [ ] Decide release track: **Internal testing → Closed → Production** (recommended ramp). Internal testing goes live to testers in minutes with no review wait — best first step.
- [ ] AAB built by EAS with the **EAS keystore (`cl6jUHZH4D`)** — done via `eas build -p android --profile production`.

## 1. Create / open the app in Play Console
- [ ] Play Console → **Create app** (if first time):
  - App name: **iVa**
  - Default language, App (not Game), **Free**
  - Confirm declarations (Play policies, US export laws)
- [ ] If the app already exists, just open it and skip to step 4.

## 2. versionCode sanity check
- [ ] Play **rejects any `versionCode` already used**. This build = **versionCode 4**.
- [ ] If build 4 (or higher) was uploaded before → bump `versionCode` in `app.json` and rebuild.

## 3. Upload the AAB
- [ ] Track (e.g. **Internal testing**) → **Create new release**.
- [ ] Upload the `.aab` from the EAS build page (Build Artifacts URL).
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
