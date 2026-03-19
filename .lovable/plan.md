

# Plan: Fixa byggfel + Bygga nya funktioner + Marknadsföringsunderlag

## Steg 1: Fixa byggfel (NodeJS.Timeout)

Fyra filer använder `NodeJS.Timeout` som inte finns i browser-TypeScript. Ändra alla till `ReturnType<typeof setInterval>` eller `ReturnType<typeof setTimeout>`:

- `src/components/QuickStartCardio.tsx` rad 79
- `src/components/RestTimer.tsx` rad 66  
- `src/components/TabataWorkout.tsx` rad 77
- `src/components/training/WorkoutLogContent.tsx` rad 211