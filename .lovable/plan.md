## Mål
Användare som glömt sitt lösenord ska själva kunna begära en återställningslänk via mail och sätta ett nytt lösenord — utan att du behöver göra något manuellt.

(Att mejla ut ett färdigt lösenord är inte möjligt/säkert — standard är en tidsbegränsad återställningslänk.)

## Vad som byggs

**1. "Glömt lösenord?"-länk på inloggningssidan (`/auth`)**
- Liten länk under lösenordsfältet.
- Öppnar ett läge/dialog där man fyller i sin e-post och klickar "Skicka återställningslänk".
- Skickar återställningsmail via inbyggd auth (`resetPasswordForEmail`) med retur till `/reset-password`.
- Neutralt bekräftelsemeddelande ("Om adressen finns hos oss har vi skickat ett mail") så man inte kan gissa vilka konton som existerar.
- Enkel validering av e-postformat.

**2. Ny publik sida `/reset-password`**
- Läser recovery-sessionen från länken i mailet.
- Formulär: nytt lösenord + bekräfta (min 6 tecken, matchning, visa/dölj-öga) — samma stil som befintliga `PasswordChangeSection`.
- Sparar via `updateUser({ password })`, visar bekräftelse och skickar vidare till `/dashboard`.
- Tydligt felläge om länken är utgången/ogiltig, med knapp för att begära ny länk.

**3. Hjälptext i kontaktformuläret/supportsvar**
- På kontaktsidan: kort rad "Glömt lösenord? Återställ det här" som länkar till flödet, så färre mailar in samma fråga.

## Tekniska detaljer
- Frontend: ny sida `src/pages/ResetPassword.tsx` + route i `src/App.tsx` (publik, ej bakom auth-guard).
- `/auth` utökas med reset-läge; ingen ändring av befintlig inloggnings-/registreringslogik.
- Texter på svenska + engelska via befintlig i18n.
- Inga databasändringar. Standardmail för lösenordsåterställning skickas av backend direkt (kräver inga nya nycklar).
