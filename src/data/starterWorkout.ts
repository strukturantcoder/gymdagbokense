export interface StarterExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  notes?: string;
  supersetGroup?: number | null;
}

export interface StarterWorkout {
  name: string;
  focus: string;
  estimatedDuration: number;
  exercises: StarterExercise[];
}

/** Ready-to-run 10 minute starter workout — no equipment, no setup. */
export const STARTER_WORKOUT: StarterWorkout = {
  name: 'Ditt första pass',
  focus: 'Helkropp',
  estimatedDuration: 10,
  exercises: [
    { name: 'Knäböj (kroppsvikt)', sets: 3, reps: '12', rest: '45 sek', notes: 'Håll ryggen rak och gå så djupt du kan.' },
    { name: 'Armhävningar', sets: 3, reps: '8-12', rest: '45 sek', notes: 'Gå på knä om det behövs.' },
    { name: 'Utfall', sets: 3, reps: '10 per ben', rest: '45 sek' },
    { name: 'Planka', sets: 3, reps: '30 sek', rest: '30 sek', notes: 'Spänn magen, håll höften i linje.' },
  ],
};
