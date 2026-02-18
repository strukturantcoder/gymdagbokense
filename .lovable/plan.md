

# Lösningsplan: Apple App Store-avvisning

Apple har identifierat **5 problem** som måste lösas. Här är en sammanfattning och plan:

---

## 1. Sign in with Apple (Guideline 4.8)

**Problem:** Appen erbjuder Google-inloggning men saknar "Sign in with Apple" som alternativ.

**Lösning:** Lägga till en "Logga in med Apple"-knapp på inloggningssidan (Auth.tsx). Lovable Cloud stödjer Apple-inloggning.

**Steg:**
- Aktivera Apple som OAuth-provider via Lovable Cloud
- Lägga till Apple-inloggningsknapp i Auth.tsx bredvid Google-knappen
- Använda `lovable.auth.signInWithOAuth("apple", ...)` (inte Supabase-klienten direkt)

---

## 2. Age Rating i App Store Connect (Guideline 2.3.6)

**Problem:** Ni har valt "In-App Controls" (Parental Controls / Age Assurance) i Age Rating men appen har inga sådana funktioner.

**Lösning:** Ingen kodändring behövs. Gå till **App Store Connect → App Information → Age Rating** och ändra "Parental Controls" och "Age Assurance" till **"None"**.

---

## 3. In-App Purchase / Premium (Guideline 3.1.1)

**Problem:** Premium-prenumerationen köps via Stripe (extern betalning) men erbjuds inte via Apples In-App Purchase.

**Lösning - två alternativ:**

- **Alternativ A (enklast):** Dölj Premium-köpknappen i iOS-appen helt. Användare som köpt Premium via webben kan fortfarande använda sina förmåner. Apple tillåter att innehåll köpt utanför appen kan nyttjas (Guideline 3.1.3(b) Multiplatform Services).
- **Alternativ B (komplett):** Implementera Apples StoreKit/In-App Purchase. Detta kräver native Xcode-kod (Swift), setup i App Store Connect och en server-side verifieringslogik. Betydligt mer arbete.

**Rekommendation:** Alternativ A - dölj köp-knappar/Stripe-länkar i iOS-appen. Detektera plattform med Capacitor och visa ett meddelande som "Uppgradera via gymdagboken.se".

---

## 4. Radera konto (Guideline 5.1.1(v))

**Problem:** Appen saknar funktion för att radera sitt konto.

**Lösning:** Lägga till en "Radera konto"-knapp på kontosidan med:
- Bekräftelsedialog (förhindra oavsiktlig radering)
- Edge function som raderar användarens data och konto
- Utloggning och redirect efter radering

**Steg:**
- Skapa edge function `delete-user-account` som raderar profil, data och auth-användare
- Lägga till knapp + bekräftelsedialog i Account.tsx

---

## 5. Crash vid kamera/foto (Guideline 2.1)

**Problem:** Appen kraschar när reviewer försöker ta ett foto (iPad Air M3).

**Lösning:** Progressbilder-funktionen använder en vanlig fil-input (`<input type="file">`). På iPad/iOS kan detta trigga kameran. Lägga till felhantering och kontrollera att kamera-åtkomst hanteras korrekt i Capacitor-appen.

**Steg:**
- Lägga till `accept="image/*"` på fil-inputen
- Wrappa filhantering i try-catch
- Eventuellt använda Capacitor Camera-plugin istället för vanlig fil-input för bättre native-stöd
- Testa på iPad innan ny submission

---

## Sammanfattning - vad som kan göras i Lovable vs App Store Connect

| Problem | Var löses det? |
|---------|---------------|
| Sign in with Apple | Lovable (kodändring) |
| Age Rating | App Store Connect (inställning) |
| In-App Purchase | Lovable (dölj köpknappar på iOS) |
| Radera konto | Lovable (kodändring + edge function) |
| Kamera-krasch | Lovable (kodändring + testa native) |

---

## Tekniska detaljer

### Sign in with Apple
- Konfigureras via Lovable Cloud auth-inställningar
- Använder `lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin })`
- Knapp placeras under Google-knappen i Auth.tsx

### Dölj Stripe på iOS
- Detektera plattform: `import { Capacitor } from '@capacitor/core'; const isNative = Capacitor.isNativePlatform();`
- I SubscriptionButton.tsx: om `isNative && platform === 'ios'`, visa "Uppgradera via webben" istället för Stripe-checkout

### Radera konto - Edge function
- Tar emot autentiserad request
- Raderar användarens data från alla tabeller
- Använder Supabase Admin API för att radera auth-användaren
- Returnerar success → frontend loggar ut och redirectar

### Kamera-fix
- Byt till `accept="image/*"` och lägg till error boundary runt fotouppladdning
- Överväg `@capacitor/camera` plugin för bättre native-upplevelse

