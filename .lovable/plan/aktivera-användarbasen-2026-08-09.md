# Aktivera användarbasen

## Läget just nu (hämtat från databasen idag)

- 249 registrerade konton, 5 nya senaste 30 dagarna.
- 220 av 249 (88 %) har aldrig loggat ett enda pass — varken styrka eller kondition.
- 0 användare har loggat styrkepass senaste 7 dagarna. Senaste loggade passet: 23 juli.
- Bara 1 användare med styrkepass och 2 med kondition senaste 30 dagarna.
- 76 användare har skapat ett program, men bara 23 har någonsin loggat ett pass.
- Inga aktiva community-utmaningar just nu. Inga schemalagda pass framåt. 17 push-prenumeranter.
- Mailen går ut i stor volym (418 inaktivitetsmail, 3857 veckosammanfattningar totalt) utan att ge tillbaka aktivitet.
- Trafik: ~2-6 besökare/dag, mest mobil, mest Sverige. Toppsidor: `/`, `/auth`, `/dashboard`.

Slutsatsen: problemet är inte trafik eller mailvolym, det är att nya användare aldrig kommer till sitt första loggade pass. Fler mail till en död bas ger inget. Fokus måste ligga på "registrering → första passet" och på ett skäl att komma tillbaka.

## Vad vi bygger

### 1. Aktiveringsmätning i admin (först, så vi ser om åtgärderna funkar)
En trattvy i adminpanelen: registrerade → skapat program → loggat pass 1 → loggat pass 2 → aktiv senaste 7 dagarna, med antal och procent per steg samt uppdelning på registreringsvecka. Utan detta gissar vi.

### 2. Tvingande "första passet"-flöde för nya användare
Idag kan man registrera sig, landa på dashboarden och aldrig göra något. Istället:
- Efter registrering: en kort onboarding som slutar i ett färdigt program eller ett direkt startbart snabbpass — inte en tom dashboard.
- Dashboard för användare utan loggat pass ersätts av ett enda tydligt kort: "Starta ditt första pass" med ett förifyllt pass som går att köra på 10 minuter. Övriga widgets döljs tills första passet är loggat.
- Direkt efter första passet: konfetti, XP, och en fråga "När tränar du nästa gång?" som lägger in ett schemalagt pass med påminnelse.

### 3. Återkommande skäl att öppna appen
- Alltid en pågående community-utmaning: en återkommande månadsutmaning som skapas automatiskt när ingen aktiv finns, med alla användare auto-anslutna (funktionen finns redan men det finns ingen aktiv utmaning).
- Push i onboardingen: be om push-tillstånd direkt efter första passet istället för aldrig, så att påminnelser faktiskt når fram (17 av 249 idag).

### 4. Skärpta mail istället för fler mail
- Pausa breda inaktivitetsutskick till konton som aldrig tränat efter tre försök — de svarar inte och riskerar bara spamklagomål.
- Ny sekvens riktad enbart mot nyregistrerade utan loggat pass: dag 1, dag 3, dag 7, med en enda tydlig knapp som går rakt in i det förifyllda passet.
- Veckosammanfattning skickas bara till användare som faktiskt tränat den veckan.

## Teknisk sammanfattning

- Admin: ny edge function-endpoint (eller utökning av `admin-stats`) som räknar trattstegen från `profiles`, `workout_programs`, `workout_logs` och `cardio_logs`, plus en ny sektion i `AdminStats.tsx`.
- Onboarding: bygg vidare på `OnboardingChecklist`, `GoalOnboardingDialog` och `SpontaneousWorkout` — villkorad rendering i `Dashboard.tsx` baserat på om användaren har något i `workout_logs`/`cardio_logs`.
- Efterpass-flöde: koppla in `ScheduleWorkoutDialog` och `PushNotificationSettings` som steg efter första loggade passet.
- Utmaningar: cron-jobb som skapar nästa `community_challenges`-rad när ingen aktiv finns; auto-enrollment-triggern finns redan.
- Mail: villkorslogik i `send-inactive-user-emails` och `send-weekly-summary`, plus en ny funktion för nyregistrerad-sekvensen som läser `email_logs` för att undvika dubbletter.

## Ordning

1. Trattmätningen i admin.
2. Första-passet-flödet (störst effekt: 88 % fastnar där).
3. Efterpass-schemaläggning och push-fråga.
4. Automatiska månadsutmaningar.
5. Omskrivna mailsekvenser.
