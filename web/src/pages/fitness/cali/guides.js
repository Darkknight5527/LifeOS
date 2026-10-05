// Training guides, summarised in our own words from the WINGS Calisthenics
// Training Guides. Items can link to a skill: { t: "text", s: "skillId" }.

// Foundation goals (Beginner guide) — checked against your logged bests.
export const FOUNDATION = [
  { skill: "pushup", goal: 20, label: "Push-ups" },
  { skill: "pullup", goal: 10, label: "Pull-ups" },
  { skill: "dip", goal: 15, label: "Dips" },
  { skill: "austrow", goal: 20, label: "Rows" },
  { skill: "hollow", goal: 30, label: "Hollow body hold" },
  { skill: "lsit", goal: 20, label: "L-sit" },
  { skill: "squat", goal: 20, label: "Squats" },
];

export const GUIDES = [
  {
    id: "beginner",
    title: "Beginner guide",
    icon: "sparkle",
    intro: "Calisthenics builds muscle, balance, flexibility and skill with your bodyweight. Big skills take 1–2 years — and showing up consistently matters far more than training brutally hard.",
    foundation: true,
    sections: [
      {
        h: "How progress really works",
        items: [
          "Consistency beats intensity: regular, decent sessions win over occasional all-out ones.",
          "Body proportions matter: shorter people tend to find levers easier; being lighter helps every skill.",
          "Film your training — it's the best way to check form and to see progress you'd otherwise miss.",
        ],
      },
      {
        h: "Beginner workout (3× a week)",
        items: [
          { t: "Push — 3 × 12 of the hardest push-up variation you can do cleanly", s: "pushup" },
          { t: "Pull — 3 × 12 of the hardest pull variation (rows → assisted → pull-ups)", s: "pullup" },
          { t: "Core — 4 hollow body holds to failure", s: "hollow" },
          { t: "Legs — 3 × 12 bodyweight squats", s: "squat" },
        ],
      },
      {
        h: "Common mistakes",
        items: [
          "Skipping the foundation phase to chase skills.",
          "Too much volume or intensity — train around 80–90% effort, not to collapse.",
          "Letting form slide to get more reps.",
          "Training every day with no recovery.",
        ],
      },
      {
        h: "Food",
        items: [
          "Protein about 1 g per lb of bodyweight (0.8 g/lb minimum) — roughly 1.8–2.2 g/kg.",
          "Mostly complex carbs and healthy fats.",
          "Body composition changes how hard skills feel — lighter makes everything easier.",
          "Change your diet gradually so it sticks.",
        ],
      },
      {
        h: "Myths",
        items: [
          "Calisthenics does build muscle — leverage creates loads comparable to heavy weights.",
          "You don't need weights to get genuinely strong.",
          "You don't need to train every day.",
        ],
      },
    ],
  },
  {
    id: "overload",
    title: "Progressive overload",
    icon: "trend",
    intro: "You get stronger by making training a little harder over time. With bodyweight, the main lever is literally leverage.",
    sections: [
      {
        h: "Leverage",
        items: [
          "Moving your hands closer to your centre of mass puts more load on the arms — that's why pseudo push-ups and planche progressions get harder.",
          { t: "Pseudo push-ups: hands further back = heavier", s: "pplpu" },
          { t: "Planche lean: lean further = closer to the planche", s: "plean" },
        ],
      },
      {
        h: "When a new skill joins your workouts",
        items: [
          "Holds: once you can hold 6–8 seconds.",
          { t: "Handstand push-ups: once you can do at least 3 reps", s: "hspu" },
        ],
      },
      {
        h: "Other ways to overload",
        items: ["More reps or more sets.", "Slower tempo (especially the lowering).", "Stricter form.", "Resistance bands to bridge big gaps between progressions."],
      },
      {
        h: "Log it",
        items: ["Write down the date, the focus (push / pull / legs) and sets × reps for every exercise — the Training view does this for you."],
      },
    ],
  },
  {
    id: "handstand",
    title: "Handstand guide",
    icon: "figure",
    intro: "A freestanding handstand is a C-level skill — about 2–3 months with daily practice.",
    sections: [
      {
        h: "Before you start",
        items: [
          "Warm up: wrist circles and stretches, arm circles, lunges, hollow body practice.",
          "Shoulder mobility: arms straight overhead with the biceps by the ears.",
          "Wrist extension of at least 90°.",
        ],
      },
      {
        h: "Learn to fall first",
        items: ["Move one hand forward a couple of inches, twist toward it, and step down with one or both legs.", "Practise from chest-to-wall before trying it freestanding."],
      },
      {
        h: "Form cues",
        items: ["Straight arms and legs.", "Stack wrists, shoulders, hips, knees and feet.", "Push the floor away (elevation).", "Look between your hands.", "Keep breathing.", "Whole body tight, toes pointed."],
      },
      {
        h: "Progressions",
        ordered: true,
        items: [
          { t: "Pike push-ups", s: "pikepu" },
          { t: "Elevated pike hold", s: "elevpike" },
          { t: "30 s back-to-wall handstand", s: "wallhs" },
          "Learn the bail-out",
          "Back-to-wall balance (hands < 1 ft from the wall, control with the fingers)",
          "Chest-to-wall balance (control with the heel of the palm)",
          "Freestanding kick-ups",
          { t: "Freestanding handstand", s: "hs" },
        ],
      },
      {
        h: "After that",
        items: ["Shapes and leg variations.", { t: "One-arm handstand", s: "oahs" }],
      },
    ],
  },
  {
    id: "push",
    title: "Push roadmap",
    icon: "up",
    intro: "From push-ups to the full planche, in three phases.",
    sections: [
      {
        h: "Beginner",
        items: [
          { t: "Push-ups in all variations until 15 feel comfortable", s: "pushup" },
          { t: "Then pike push-ups", s: "pikepu" },
          { t: "Planche leans", s: "plean" },
          { t: "Pseudo push-ups", s: "pplpu" },
          { t: "Crow pose and wall handstands", s: "crow" },
          "Focus on locked elbows and shoulders pushed forward and down (protraction + depression).",
        ],
      },
      {
        h: "Intermediate — handstand push-ups first",
        items: [
          "HSPU strength carries over to the planche, so it comes first (it unlocks once you have a handstand).",
          { t: "Train pike push-ups, chest-to-wall HSPU and bent arm stands", s: "wallhspu" },
          { t: "Goal: 3–5 HSPU", s: "hspu" },
          "Optional: start planche progressions alongside.",
        ],
      },
      {
        h: "Advanced — the planche",
        items: [
          { t: "Main work: the hardest planche you can hold meaningfully (adv. tuck or straddle)", s: "advtuckpl" },
          "Second: banded holds and dynamic raises.",
          "Accessories: HSPU, planche leans, back extensions, hollow body holds.",
          "Cues: protract and depress the shoulders, switch on the lower back and glutes, tuck the pelvis (posterior tilt).",
          { t: "Straddle", s: "straddlepl" },
          { t: "Half lay", s: "halflaypl" },
          { t: "Full planche", s: "fullpl" },
          { t: "Beyond: maltese and other planche variations", s: "maltese" },
        ],
      },
    ],
  },
  {
    id: "pull",
    title: "Pull skills guide",
    icon: "down",
    intro: "From rows and pull-ups to the one-arm pull-up and the front lever.",
    sections: [
      {
        h: "Beginner",
        items: [
          { t: "Inverted rows", s: "austrow" },
          { t: "Assisted pull-ups", s: "assistedpullup" },
          { t: "Pull-ups — wide and close grips too", s: "pullup" },
          { t: "Then chest pulls", s: "chestpullup" },
          { t: "And waist pull-ups — the focus is explosive pulling", s: "waistpullup" },
        ],
      },
      {
        h: "Intermediate — two paths (train both)",
        items: [
          { t: "Path 1 (vertical): muscle-up", s: "muscleup" },
          { t: "→ archer pull-up", s: "archerpullup" },
          { t: "→ one-arm pull-up", s: "oapullup" },
          { t: "Path 2 (horizontal): front lever progressions", s: "tuckfl" },
          { t: "Bonus: weighted pull-ups speed up both paths", s: "weightedpu" },
        ],
      },
      {
        h: "Advanced",
        items: [
          { t: "One-arm pull-up: work through archer variants to the full rep", s: "oapullup" },
          { t: "Front lever: tuck → adv. tuck → super adv. tuck → straddle → half lay → full", s: "fullfl" },
          "Cues: retract the shoulder blades, keep the arms straight, use the triceps.",
          { t: "Beyond: front lever touch, one-arm front lever", s: "fltouch" },
        ],
      },
    ],
  },
  {
    id: "frontlever",
    title: "Front lever guide",
    icon: "target",
    intro: "An A-level skill — about 1–2 years with consistent training.",
    sections: [
      {
        h: "Before you start",
        items: [
          { t: "10–15 pull-ups", s: "pullup" },
          { t: "20 rows", s: "austrow" },
          { t: "Lat strength (weighted pull-ups are ideal)", s: "weightedpu" },
          "Core, triceps and scapula retraction strength.",
        ],
      },
      {
        h: "Stage I",
        items: [
          { t: "Tuck front lever — aim for 15+ seconds", s: "tuckfl" },
          "Focus: retracted shoulder blades, straight arms, horizontal body.",
          { t: "Supplements: scapula pull-ups and pull-ups", s: "scappull" },
          { t: "Optional bridge: pike front lever", s: "pikefl" },
        ],
      },
      {
        h: "Stage II",
        items: [
          { t: "Advanced tuck — 15+ seconds", s: "advtuckfl" },
          { t: "Super advanced tuck — learn the open pelvis (flat lower back) lying down and in hollow holds", s: "superadvtuckfl" },
          { t: "Add advanced tuck rows", s: "advtuckflrow" },
          { t: "Accessory: dragon flags", s: "dragonflag" },
        ],
      },
      {
        h: "Stage III (the longest)",
        items: [
          { t: "Straddle — maximum hip opening; holds, negatives and raises", s: "straddlefl" },
          { t: "Half lay — the closest step to full", s: "halflayfl" },
          { t: "Full front lever — holds, negatives and momentum raises", s: "fullfl" },
          "Bands: start heavy and move to lighter ones; place them near the wrists.",
        ],
      },
    ],
  },
  {
    id: "workout",
    title: "Workout structure",
    icon: "list",
    intro: "How to build sessions that make you stronger — beginners should mainly build muscle first.",
    sections: [
      {
        h: "Every session",
        items: ["Warm up the joints you'll use: arm circles, lunges, wrist stretches."],
      },
      {
        h: "Complete beginner (full body, 3× a week)",
        items: ["One exercise per muscle group.", "3 sets × 8–12 reps.", "Rest 2–4 minutes between sets.", "Progress by swapping to a harder variation."],
      },
      {
        h: "Ready to move on?",
        items: [{ t: "When you can do 25 push-ups or 8 pull-ups without a warm-up", s: "pullup" }],
      },
      {
        h: "Strength focus",
        items: ["3 sets × 4–8 reps.", "Rest 3–5 minutes.", "Move to split workouts."],
      },
      {
        h: "Building a split day",
        ordered: true,
        items: [
          "Start with the most demanding exercise (3–5 sets).",
          "Follow with easier exercises at the same perceived effort.",
          "Add 1–2 exercises that hit the other muscles of the day (push day: chest, shoulders, triceps).",
          "Finish with accessory work.",
        ],
      },
      {
        h: "Weekly rhythm",
        items: ["Usually push twice and pull twice a week.", "Example: Push · Pull · Rest · Push · Pull."],
      },
    ],
  },
];
