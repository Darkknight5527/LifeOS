// Gym split names and the exercise list per muscle group.
export const SPLIT_LABEL = { push: "Push", pull: "Pull", legs: "Legs", rest: "Rest", core: "Core" };

export const MUSCLE_GROUPS = {
  push: [
    { id: "chest", label: "Chest", exercises: ["Bench Press", "Incline Bench Press", "Decline Bench Press", "Dumbbell Press", "Incline Dumbbell Press", "Chest Fly", "Cable Crossover", "Push-ups", "Dips"] },
    { id: "shoulders", label: "Shoulders", exercises: ["Overhead Press", "Dumbbell Shoulder Press", "Lateral Raise", "Front Raise", "Rear Delt Fly", "Arnold Press", "Shrugs"] },
    { id: "triceps", label: "Triceps", exercises: ["Tricep Pushdown", "Skull Crushers", "Overhead Tricep Extension", "Close-Grip Bench Press", "Tricep Dips"] },
  ],
  pull: [
    { id: "back", label: "Back", exercises: ["Deadlift", "Pull-ups", "Lat Pulldown", "Barbell Row", "Dumbbell Row", "T-Bar Row", "Seated Cable Row", "Face Pull"] },
    { id: "biceps", label: "Biceps", exercises: ["Barbell Curl", "Dumbbell Curl", "Hammer Curl", "Preacher Curl", "Concentration Curl", "Cable Curl"] },
  ],
  legs: [
    { id: "legs", label: "Legs", exercises: ["Squat", "Leg Press", "Lunges", "Leg Extension", "Leg Curl", "Romanian Deadlift", "Calf Raise", "Hip Thrust"] },
  ],
  core: [
    { id: "core", label: "Core", exercises: ["Plank", "Crunches", "Hanging Leg Raise", "Russian Twist", "Cable Crunch"] },
  ],
};

export function defaultSplitForToday() {
  const idx = new Date().getDay(); // Sun=0
  const map = { 0: "rest", 1: "push", 2: "pull", 3: "legs", 4: "push", 5: "pull", 6: "legs" };
  return map[idx];
}
