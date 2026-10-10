// PROTOTYPE — throwaway. Answers: "How does a coach design a client's repeating training week?"
// The UI shows one week with no dates. Underneath, each change is a weekly schedule row that applies
// from today, so earlier weeks keep what was planned (.scratch/workout/concept.md W6, W9, W11, W14, W16).

export type WorkoutType = 'prescribed' | 'video' | 'open';
export type ClientWorkout = {id: string; name: string; type: WorkoutType; summary: string};
export type Occasion = {time: string; place: string; coach: string};
export type Schedule = {
  id: string;
  workoutId: string;
  mask: number;
  from: string;
  until: string | null;
} & Partial<Occasion>;
export type State = {workouts: ClientWorkout[]; schedules: Schedule[]};

// Weekday mask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64.
export const weekdays = [
  {bit: 1, short: 'Mon', long: 'Monday'},
  {bit: 2, short: 'Tue', long: 'Tuesday'},
  {bit: 4, short: 'Wed', long: 'Wednesday'},
  {bit: 8, short: 'Thu', long: 'Thursday'},
  {bit: 16, short: 'Fri', long: 'Friday'},
  {bit: 32, short: 'Sat', long: 'Saturday'},
  {bit: 64, short: 'Sun', long: 'Sunday'},
] as const;

const local = new Date();
export const today = new Date(Date.UTC(local.getFullYear(), local.getMonth(), local.getDate()))
  .toISOString()
  .slice(0, 10);
const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

export const daysLabel = (mask: number) =>
  mask === 127
    ? 'Every day'
    : weekdays
        .filter((weekday) => mask & weekday.bit)
        .map((weekday) => weekday.short)
        .join(' · ');

export const occasionLabel = (schedule: Partial<Occasion>) =>
  [schedule.time, schedule.place, schedule.coach && `with ${schedule.coach}`].filter(Boolean).join(' · ');

// The rows in force from today: the week the coach is designing.
export const current = (state: State) => state.schedules.filter((schedule) => !schedule.until);

export const workoutOf = (state: State, schedule: Schedule) =>
  state.workouts.find((workout) => workout.id === schedule.workoutId);

export const pick = ({time, place, coach}: Partial<Occasion>): Partial<Occasion> => ({
  ...(time && {time}),
  ...(place && {place}),
  ...(coach && {coach}),
});

let nextId = 100;
const newId = (prefix: string) => `${prefix}${nextId++}`;

// Replace a current row from today on. A row that started today is edited in place; an older row
// ends yesterday and a new row starts today, so its past weeks stay as they were (W14).
function replace(state: State, old: Schedule, next: Pick<Schedule, 'mask'> & Partial<Occasion>): State {
  const others = state.schedules.filter((schedule) => schedule.id !== old.id);
  const ended = old.from < today ? [{...old, until: yesterday}] : [];
  const replacement =
    next.mask === 0
      ? []
      : [{id: newId('s'), workoutId: old.workoutId, from: today, until: null, ...next} satisfies Schedule];
  return {...state, schedules: [...others, ...ended, ...replacement]};
}

export const actions = {
  copyFromLibrary: (state: State, workout: Omit<ClientWorkout, 'id'>): [State, string] => {
    const copy = {...workout, id: newId('w')};
    return [{...state, workouts: [...state.workouts, copy]}, copy.id];
  },
  // Adding a workout to a day joins its existing row when that row has no session details.
  addToDay: (state: State, workoutId: string, bit: number): State => {
    const row = current(state).find((schedule) => schedule.workoutId === workoutId && !occasionLabel(schedule));
    if (row) {
      return replace(state, row, {mask: row.mask | bit});
    }
    return {
      ...state,
      schedules: [...state.schedules, {id: newId('s'), workoutId, mask: bit, from: today, until: null}],
    };
  },
  removeFromDay: (state: State, schedule: Schedule, bit: number) =>
    replace(state, schedule, {mask: schedule.mask & ~bit, ...pick(schedule)}),
  update: (state: State, schedule: Schedule, mask: number, occasion: Partial<Occasion>) =>
    replace(state, schedule, {mask, ...pick(occasion)}),
};

const started = '2026-09-14';
export const initialState: State = {
  workouts: [
    {id: 'w1', name: 'Lower A', type: 'prescribed', summary: '4 exercises · about 50 min'},
    {id: 'w2', name: 'Upper A', type: 'prescribed', summary: '5 exercises · about 45 min'},
    {id: 'w3', name: 'Zone 2 run', type: 'prescribed', summary: 'Treadmill run · 40 min'},
    {id: 'w4', name: 'PT session', type: 'open', summary: 'Open session · decided on the spot'},
    {id: 'w5', name: 'Mobility flow', type: 'video', summary: 'Video · 20 min'},
  ],
  schedules: [
    {id: 's1', workoutId: 'w1', mask: 1 | 8, from: started, until: null},
    {id: 's2', workoutId: 'w2', mask: 2 | 16, from: started, until: null},
    {
      id: 's3',
      workoutId: 'w4',
      mask: 4,
      from: started,
      until: null,
      time: '18:00',
      place: 'Iron Works gym',
      coach: 'Sam',
    },
    {id: 's4', workoutId: 'w3', mask: 32, from: started, until: null},
    {id: 's5', workoutId: 'w5', mask: 64, from: started, until: null},
  ],
};

export const library: Array<Omit<ClientWorkout, 'id'>> = [
  {name: 'Full body B', type: 'prescribed', summary: '6 exercises · about 55 min'},
  {name: 'Intervals 8 × 400 m', type: 'prescribed', summary: 'Running track · about 35 min'},
  {name: 'Yoga for runners', type: 'video', summary: 'Video · 30 min'},
  {name: 'Group class', type: 'open', summary: 'Open session'},
];
