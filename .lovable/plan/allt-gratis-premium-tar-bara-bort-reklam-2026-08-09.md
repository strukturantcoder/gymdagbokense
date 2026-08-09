# Allt gratis – Premium tar bara bort reklam

## Svar på frågan
Ja, tekniskt sett fungerar det redan så. Premiumstatus (`isPremium`) används bara på tre ställen i koden, och alla handlar om reklam:
- Bannerannonser (AdBanner, IM8AdBanner) döljs för premium
- Popupen efter passet (15 sek reklam) hoppas över för premium
- Knappen för att teckna/hantera prenumerationen

Ingen funktion – AI-program, statistik, export, utmaningar, Garmin, coach – är låst bakom betalning någonstans i koden.

## Problemet
Marknadsföringstexten säger något annat. Prislistan påstår att gratis bara får "AI-genererade program (3/mån)", "grundläggande träningslogg", ingen "avancerad statistik" och ingen "export", och underrubriken säger "uppgradera när du är redo att ta bort reklamen och låsa upp alla funktioner". Det stämmer inte med produkten och skapar onödig friktion för nya användare.

## Vad som ändras
Bara text och presentation – ingen logik.

1. **Prissektionen (`Pricing`)**
   - Gratiskortet listar allt som ingår (obegränsad logg, obegränsade AI-program, full statistik, utmaningar, Garmin, export, mobilapp) med enda minus: "Reklam visas".
   - Premiumkortet blir enkelt: "Allt i Gratis" + "Helt reklamfritt" + "Stöttar utvecklingen av appen".
   - Underrubriken ändras till att alla funktioner är gratis och att Premium bara tar bort reklamen.

2. **Texter i sv.json och en.json** uppdateras för ovanstående.

3. **Villkorssidan (`Terms`)** – stycket om "gratis och premiumfunktioner" formuleras om till att alla funktioner är gratis och att prenumerationen enbart avser en reklamfri upplevelse.

4. **Uppmaningarna vid annonserna** ("Bli Premium för att ta bort annonser") behålls – de är redan korrekta.

## Teknisk detalj
Ändringar i `src/components/Pricing.tsx` (antal feature-rader per plan), `src/i18n/locales/sv.json`, `src/i18n/locales/en.json` och `src/pages/Terms.tsx`. Ingen ändring i `useAuth`, checkout-funktioner eller reklamkomponenter.