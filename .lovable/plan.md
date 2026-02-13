

# Övningsinstruktioner med video och bilder

## Sammanfattning
Uppgradera den befintliga `ExerciseInfo`-komponenten till att inkludera YouTube-videolänkar och illustrativa bilder for varje övning. Gör den synlig som ett litet frageticken-ikon overallt dar ovningsnamn visas -- inklusive under aktiva pass (WorkoutSession) dar den idag saknas.

## Vad som finns idag
- En `ExerciseInfo`-komponent med en hardkodad databas av ca 30 ovningar (pa svenska)
- Varje ovning har: beskrivning, muskelgrupper, tips
- Komponenten visas redan i `WorkoutLog`, `WorkoutLogContent`, och `SortableExercise`
- Den visas INTE i `WorkoutSession` (den aktiva pass-vyn) -- detta ar det storsta gapet

## Plan

### 1. Utoka ovningsdatabasen med YouTube-lankar
Lagg till ett `videoUrl`-falt och ett `imageSearch`-falt (eller statisk bild-URL) till varje ovning i databasen:

```text
"bankpress": {
  description: "...",
  muscles: "...",
  tips: [...],
  videoUrl: "https://www.youtube.com/watch?v=rT7DgCr-3pg"
}
```

YouTube-lankar valjs manuellt -- bra svenska eller valproducerade engelska instruktionsvideor for varje ovning. For ovningar som inte har en matchning i databasen visas en fallback-sokning: en lank till YouTube-sok pa ovningsnamnet.

### 2. Uppdatera ExerciseInfo-dialogens UI
- Lagg till en "Se video"-knapp/lank som oppnar YouTube-videon i ny flik
- Visa videons thumbnail som forhandsgranskning (YouTube oembed: `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`)
- Behall befintlig information (beskrivning, muskler, tips) under videon
- For ovningar som inte finns i databasen: visa en enkel "Sok pa YouTube"-lank istallet for att gömma ikonen helt

### 3. Lagg till ExerciseInfo i WorkoutSession
Det storsta gapet: under aktiva pass visas ovningsnamnet men utan nagot frageticken. Ander:
- Lagg till `ExerciseInfo`-wrappern runt ovningsnamnet i single-exercise-vyn (rad ~1464)
- Lagg till den i `InterleavedSupersetView` for superset-ovningar (rad ~169 i den komponenten)

### 4. Fallback for okanda ovningar
Idag: om ovningen inte finns i databasen returneras `null` och ingen ikon visas. Andra till:
- Visa alltid frageticken-ikonen
- For okanda ovningar: visa en enkel dialog med en "Sok pa YouTube"-lank (`https://www.youtube.com/results?search_query={ovningsnamn}+teknik`)

## Tekniska detaljer

### Filer som andras
1. **`src/components/ExerciseInfo.tsx`** -- Utoka datamodellen med `videoUrl`, uppdatera dialogen med videothumbnail och lankknapp, lagg till fallback for okanda ovningar
2. **`src/pages/WorkoutSession.tsx`** -- Importera och anvand `ExerciseInfo` runt ovningsnamnet i pass-vyn
3. **`src/components/training/InterleavedSupersetView.tsx`** -- Wrappa ovningsnamnet i `ExerciseInfo`

### Inga nya beroenden behovs
YouTube-thumbnails laddas via standard img-taggar. Lankar oppnas i ny flik. Ingen YouTube API-nyckel kravs.

