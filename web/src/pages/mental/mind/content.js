// Mind content: breathing patterns, guided sessions (spoken + captions),
// SOS steps and the sleep wind-down list.

// ---------- breathing ----------
// Phase kinds: in, in2 (a second top-up breath in), hold, out, rest (hold after out).
export const PHASE_TEXT = { in: "Breathe in", in2: "Top up", hold: "Hold", out: "Breathe out", rest: "Hold" };
export const PHASE_SPOKEN = { in: "In", in2: "Again", hold: "Hold", out: "Out", rest: "Hold" };
// How big the circle is at the end of each phase (1 = full).
export const PHASE_SIZE = { in: 1, in2: 1.08, hold: 1, out: 0.5, rest: 0.5 };

export const PATTERNS = [
  {
    id: "sigh",
    name: "Physiological sigh",
    tag: "Fastest way to calm down",
    why: "Two breaths in through the nose, then one long sigh out. In a Stanford study, 5 minutes a day of this lifted mood more than the same time spent meditating.",
    phases: [
      { k: "in", s: 2.5 },
      { k: "in2", s: 1 },
      { k: "out", s: 6 },
    ],
    minutes: 2,
    tip: "In through the nose, then a second short sip of air on top. Breathe out slowly through the mouth.",
  },
  {
    id: "box",
    name: "Box breathing",
    tag: "Calm and focused",
    why: "Equal in, hold, out, hold. Used by pilots and the military to stay clear-headed under pressure.",
    phases: [
      { k: "in", s: 4 },
      { k: "hold", s: 4 },
      { k: "out", s: 4 },
      { k: "rest", s: 4 },
    ],
    minutes: 3,
    tip: "Breathe through your nose. Keep it smooth, not forced.",
  },
  {
    id: "478",
    name: "4-7-8",
    tag: "Settle and fall asleep",
    why: "A long hold and an even longer out-breath slow your heart rate. Great in bed.",
    phases: [
      { k: "in", s: 4 },
      { k: "hold", s: 7 },
      { k: "out", s: 8 },
    ],
    cycles: 4,
    tip: "In quietly through the nose, out through the mouth with a soft whoosh. 4 rounds is plenty to start with.",
  },
  {
    id: "coherent",
    name: "Coherent breathing",
    tag: "Balance",
    why: "About 5.5 breaths a minute — the rhythm where your heart rate and breath fall into sync (higher HRV).",
    phases: [
      { k: "in", s: 5.5 },
      { k: "out", s: 5.5 },
    ],
    minutes: 5,
    tip: "Slow and even. Let your belly rise as you breathe in.",
  },
];
export const patternById = (id) => PATTERNS.find((p) => p.id === id) || PATTERNS[0];

// ---------- guided sessions ----------
// lines: [seconds from start, what is said]. `end` = total length in seconds.
const countdown = () => {
  const lines = [
    [0, "Lie down and close your eyes. We'll count down slowly together, one number for each out-breath."],
    [18, "If you lose count, that's fine. Just start again from wherever you remember."],
    [36, "Breathe in… and as you breathe out, think: fifty."],
  ];
  let t = 50;
  for (let n = 49; n >= 10; n--) lines.push([(t += 13), String(n)]);
  lines.push([t + 20, "Let go of the counting now. Rest, and drift."]);
  return lines;
};

export const GUIDED = [
  {
    id: "breath",
    title: "Breath focus",
    group: "meditate",
    desc: "The basics: rest your attention on your breath.",
    end: 300,
    lines: [
      [0, "Welcome. Find a comfortable position, sitting or lying down, and let your hands rest."],
      [10, "Gently close your eyes, or lower your gaze to the floor."],
      [20, "Take a deep breath in through your nose… and slowly let it out through your mouth."],
      [33, "Once more. Breathe in… and let it go."],
      [45, "Now let your breathing return to its natural rhythm. No need to control it."],
      [60, "Notice where you feel the breath most clearly. Maybe the nose, the chest, or the belly."],
      [82, "Just rest your attention there. Feel each breath come in… and go out."],
      [112, "Your mind will wander. That's completely normal. When you notice it, simply come back to the breath."],
      [152, "If it helps, silently count: one on the in-breath, two on the out-breath, up to ten, then start again."],
      [197, "Each time you come back is like one repetition for your attention muscle."],
      [237, "Keep resting with the breath, just as it is."],
      [268, "Now let go of any focus. Let the mind do whatever it wants for a few breaths."],
      [284, "Notice the sounds around you, and the feeling of your body. When you're ready, open your eyes."],
    ],
  },
  {
    id: "morning",
    title: "Morning intention",
    group: "meditate",
    desc: "Set one goal and one word for the day.",
    end: 240,
    lines: [
      [0, "Good morning. Sit up comfortably and take a deep breath in… and out."],
      [14, "Feel your feet on the ground and your body waking up."],
      [28, "Take three slow breaths here, a little deeper than usual."],
      [55, "Now ask yourself: what's the one thing that would make today a good day?"],
      [90, "Picture yourself doing it. Where are you? How does it feel when it's done?"],
      [125, "Now choose one word for how you want to show up today. Calm. Focused. Kind. Bold. Whatever fits."],
      [160, "Say the word silently to yourself, three times."],
      [190, "Remember: you don't have to feel ready. You just have to start."],
      [215, "Take one last deep breath. Open your eyes, and begin your day."],
    ],
  },
  {
    id: "unwind",
    title: "Unwind after work",
    group: "meditate",
    desc: "Put the work day down and come home to yourself.",
    end: 360,
    ambient: "rain",
    lines: [
      [0, "The work day is over. Let's put it down. Sit back and close your eyes."],
      [12, "Breathe in slowly for four… and out for six. The longer out-breath tells your body it can relax."],
      [40, "Again. In for four… out for six."],
      [60, "Notice what you're still carrying from today. Tasks, conversations, worries."],
      [90, "Imagine placing each one in a box on a shelf. They'll be there tomorrow. You don't need to hold them tonight."],
      [130, "Now think of one thing that went well today, however small."],
      [160, "And one thing you did your best at, even if it didn't go perfectly."],
      [195, "Let your shoulders drop. Unclench your jaw. Soften your hands."],
      [230, "Breathe in calm… breathe out the day."],
      [270, "Rest here. Nothing to do, nowhere to be."],
      [332, "When you're ready, open your eyes. The evening is yours."],
    ],
  },
  {
    id: "noting",
    title: "Noting, for a busy mind",
    group: "meditate",
    desc: "Label thoughts as they come, and watch them pass.",
    end: 480,
    lines: [
      [0, "This one is for when your mind is busy. Sit comfortably and close your eyes."],
      [12, "Take a few breaths and let your body settle."],
      [30, "Rest your attention on the breath. In a moment, thoughts will appear. That's fine."],
      [55, "When a thought comes, give it a simple label. If you're planning, note: planning. If you're remembering, note: remembering."],
      [92, "If you're worrying, note: worrying. If you hear a sound, note: hearing. Then come back to the breath."],
      [132, "Keep the label light and gentle, like a soft tap. No need to follow the thought."],
      [180, "Thinking… thinking… back to the breath."],
      [240, "Notice how thoughts come and go on their own, like clouds passing through the sky."],
      [300, "You are not your thoughts. You're the one noticing them."],
      [360, "Keep noting, and keep returning."],
      [420, "Now drop the labels, and just rest for a few breaths."],
      [455, "Notice how your mind feels now. When you're ready, open your eyes."],
    ],
  },
  {
    id: "kindness",
    title: "Loving-kindness",
    group: "meditate",
    desc: "Warmth for yourself and others. Good after a rough day with people.",
    end: 420,
    lines: [
      [0, "Sit comfortably and close your eyes. Take a few calm breaths."],
      [20, "Think of someone who makes you smile easily. A friend, a family member, or even a pet."],
      [40, "Picture them clearly. Silently wish them: may you be happy. May you be healthy. May you be at peace."],
      [80, "Notice any warmth that comes up. Let it grow."],
      [105, "Now turn the same wishes towards yourself. May I be happy. May I be healthy. May I be at peace."],
      [150, "If that feels awkward, that's okay. Keep offering it, the way you would to a good friend."],
      [185, "Now think of someone neutral — someone you see but don't really know. A colleague, a shopkeeper."],
      [212, "Wish them the same. May you be happy. May you be healthy. May you be at peace."],
      [250, "Now, if you can, think of someone you find difficult. Start with someone only mildly difficult."],
      [277, "They also want to be happy, just like you. May you be happy. May you be at peace."],
      [320, "Finally, widen it out to everyone. Everyone in this city, this country, the whole world."],
      [345, "May all beings be happy. May all beings be at peace."],
      [385, "Let go of the words, and rest in whatever feeling is here. When you're ready, open your eyes."],
    ],
  },
  {
    id: "body",
    title: "Body scan",
    group: "meditate",
    desc: "Head to toe, notice and release tension.",
    end: 600,
    lines: [
      [0, "Welcome to the body scan. Lie down or sit comfortably, and close your eyes."],
      [12, "Take three slow breaths. In through the nose… and out through the mouth."],
      [35, "Now bring your attention to the top of your head. Notice any sensation there — tingling, warmth, or nothing at all."],
      [65, "Move down to your forehead, your eyes and your jaw. Let the jaw soften and the teeth part slightly."],
      [100, "Notice your neck and shoulders. They hold a lot of tension. On your next out-breath, let them drop."],
      [140, "Move down through your arms, to your hands and fingertips. Feel them resting, heavy and still."],
      [185, "Bring your attention to your chest. Feel it rise and fall with each breath."],
      [225, "Now your stomach. Let it be soft. No need to hold it in."],
      [265, "Notice your lower back, and where your body meets the chair or the floor. Let it carry your weight."],
      [310, "Move to your hips and your thighs. Notice any tightness, and breathe into it."],
      [355, "Your knees, your calves, and your shins."],
      [395, "Now your feet. The heels, the soles, and each of your toes."],
      [440, "Now feel your whole body at once, from head to toe, breathing as one."],
      [490, "If you found any tension, that's useful information. Just noticing it is enough."],
      [530, "Rest here for a few more breaths."],
      [570, "Slowly start to move your fingers and toes. Stretch if you like. When you're ready, open your eyes."],
    ],
  },
  {
    id: "conversation",
    title: "Before a hard conversation",
    group: "meditate",
    desc: "3 minutes to get steady before a meeting, call or difficult talk.",
    end: 180,
    lines: [
      [0, "You've got a conversation coming up. Let's get you steady. Take a slow breath in… and a long breath out."],
      [15, "Once more. In… and out, slower than the in-breath."],
      [30, "Notice where you feel nervous in your body. Your chest, your stomach, your hands. Just notice it."],
      [55, "Nerves mean this matters to you. That's okay."],
      [70, "Now ask: what do I want from this conversation? Not to win. What outcome would be good for both of us?"],
      [100, "Remind yourself: listen first. Ask questions. Stay curious about their side."],
      [125, "Pick the one sentence you most want to say, and say it simply."],
      [150, "Two more slow breaths. Shoulders down. You're ready."],
    ],
  },
  {
    id: "sleepscan",
    title: "Sleep body scan",
    group: "sleep",
    desc: "Lie down and let each part of you get heavy. Fades out, no bell at the end.",
    end: 900,
    rate: 0.8,
    sleep: true,
    ambient: "rain",
    lines: [
      [0, "Lie down in bed and get comfortable. Let the mattress hold your whole weight."],
      [15, "Close your eyes. There's nothing else to do today."],
      [30, "Breathe in through your nose… and let a long, slow breath out."],
      [50, "Again. In… and a long breath out, like a sigh."],
      [75, "Let your breathing slow down on its own."],
      [100, "Bring your attention to your feet. Let them grow heavy and warm."],
      [150, "The heaviness moves up into your calves and your knees. Let them sink."],
      [200, "Your thighs and hips relax. They're heavy, and still."],
      [250, "Your lower back softens into the bed."],
      [300, "Your stomach rises and falls, slowly, with each breath."],
      [350, "Your chest is soft. Your shoulders melt down, away from your ears."],
      [400, "Your arms are heavy. Your hands rest, loose and warm."],
      [460, "Your neck relaxes. Your jaw is loose. Your eyes are heavy."],
      [520, "Your forehead is smooth. Your whole face is soft."],
      [580, "Your whole body is heavy, warm and still."],
      [640, "If thoughts come, let them drift past. You don't need to answer them tonight."],
      [720, "Just breathing… sinking… resting."],
      [800, "There's nothing left to do. Let yourself drift off to sleep."],
    ],
  },
  {
    id: "countdown",
    title: "Countdown to sleep",
    group: "sleep",
    desc: "Count slowly down from 50, one number per breath. Boring on purpose.",
    end: 640,
    rate: 0.8,
    sleep: true,
    ambient: "brown",
    lines: countdown(),
  },
];
export const guidedById = (id) => GUIDED.find((g) => g.id === id);

/** What to suggest right now, by time of day. */
export function suggestion(hour = new Date().getHours()) {
  if (hour >= 4 && hour < 11) return { label: "Start your morning", type: "guided", id: "morning" };
  if (hour >= 11 && hour < 17) return { label: "Reset your focus", type: "breath", id: "box" };
  if (hour >= 17 && hour < 21) return { label: "Leave work behind", type: "guided", id: "unwind" };
  return { label: "Get ready for sleep", type: "guided", id: "sleepscan" };
}

// ---------- SOS ----------
export const GROUNDING = [
  { n: 5, sense: "see", text: "Look around. Name 5 things you can see." },
  { n: 4, sense: "feel", text: "Notice 4 things you can feel — your feet on the floor, your clothes, the air." },
  { n: 3, sense: "hear", text: "Listen for 3 things you can hear, near or far." },
  { n: 2, sense: "smell", text: "Find 2 things you can smell (or 2 smells you like)." },
  { n: 1, sense: "taste", text: "Notice 1 thing you can taste, or take a sip of water." },
];

export const SOS_FEELINGS = [
  {
    id: "anxious",
    label: "Anxious / panicky",
    emoji: "😰",
    tip: "Panic feels dangerous, but it isn't. It rises, peaks and passes — usually within 10 minutes. Don't fight it; let it wash over you while you keep your out-breaths slow.",
    next: "Do one more round of slow breathing, then one small, ordinary task.",
  },
  {
    id: "angry",
    label: "Angry",
    emoji: "😤",
    tip: "Anger floods the body with adrenaline, and that clouds judgement for a while. Don't send, reply or decide anything for the next 20 minutes.",
    next: "Move — a fast 10-minute walk burns off the adrenaline. Decide what to say afterwards.",
  },
  {
    id: "overwhelmed",
    label: "Overwhelmed",
    emoji: "🌀",
    tip: "Your mind is trying to hold everything at once. You don't have to solve it all now.",
    next: "Write down everything in your head, then pick only the next small step — just one.",
  },
  {
    id: "sad",
    label: "Sad / low",
    emoji: "😔",
    tip: "Low moments are real, and they do shift. Talk to yourself the way you would talk to a good friend.",
    next: "Reach out to one person, even with one message. Or step outside for a few minutes of daylight.",
  },
  {
    id: "stressed",
    label: "Stressed about work",
    emoji: "💼",
    tip: "Ask: what part of this is in my control right now? Everything else can wait until it's its turn.",
    next: "Do one 10-minute piece of the thing that's in your control. Momentum makes it smaller.",
  },
  {
    id: "racing",
    label: "Racing thoughts",
    emoji: "💭",
    tip: "A racing mind is trying not to forget things. Writing them down lets it stop holding them.",
    next: "Brain-dump into your journal, then try 4-7-8 breathing or the noting meditation.",
  },
];

// India: Tele-MANAS (government mental-health line, free, 24×7) and the emergency number.
export const HELPLINES = [
  { name: "Tele-MANAS", number: "14416", note: "Free, 24×7, talk to a counsellor" },
  { name: "Emergency", number: "112", note: "If you're in danger right now" },
];

// ---------- sleep wind-down ----------
export const WIND_DOWN = [
  { id: "screens", text: "Bright screens off or on night mode" },
  { id: "top3", text: "Tomorrow's top 3 written down (Journal)" },
  { id: "dump", text: "Anything still on my mind is on paper" },
  { id: "caffeine", text: "No caffeine after 2 pm" },
  { id: "room", text: "Room cool, dark and quiet" },
  { id: "time", text: "Lights out around my usual time" },
];
