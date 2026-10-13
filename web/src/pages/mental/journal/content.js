// Fixed lists for the journal: feelings to tap, and the rotating questions.

export const MOODS = [
  { v: 1, face: "😞", label: "Awful", color: "#f87171" },
  { v: 2, face: "😕", label: "Low", color: "#fb923c" },
  { v: 3, face: "😐", label: "Okay", color: "#fbbf24" },
  { v: 4, face: "🙂", label: "Good", color: "#a3e635" },
  { v: 5, face: "😄", label: "Great", color: "#34d399" },
];
export const moodOf = (v) => MOODS.find((m) => m.v === v);

export const SCALES = [
  { k: "energy", label: "Energy", low: "Drained", high: "Charged" },
  { k: "stress", label: "Stress", low: "Calm", high: "Stressed" },
  { k: "sleep", label: "Sleep", low: "Poor", high: "Great" },
];

export const FEELINGS = [
  "calm", "happy", "grateful", "proud", "motivated", "focused", "hopeful", "loved", "relaxed", "confident",
  "tired", "anxious", "stressed", "bored", "lonely", "sad", "angry", "frustrated", "overwhelmed", "restless",
];

// One a day, in order; the same date always shows the same question.
export const PROMPTS = [
  "What am I avoiding right now, and why?",
  "What would I tell a friend in my exact situation?",
  "What gave me energy today, even a little?",
  "What's one thing I did today that future me will thank me for?",
  "What's a worry I can let go of — and what would that feel like?",
  "Who made my day better recently? Have I told them?",
  "What did I learn about myself this week?",
  "If today repeated every day for a year, where would I end up?",
  "What's one small habit I want to start, and what's the first tiny step?",
  "What am I proud of that nobody else noticed?",
  "What's draining my time without giving anything back?",
  "What does a really good day look like for me right now?",
  "What fear is holding me back from something I want?",
  "What did I say yes to that I should have said no to?",
  "What would I do differently if I weren't afraid of being judged?",
  "Which conversation am I putting off? How could I start it?",
  "What's one thing I'm looking forward to?",
  "What drained me today, and can I avoid it next time?",
  "Where did I waste the most time this week?",
  "What's a recent win I haven't celebrated?",
  "What would make tomorrow 10% better?",
  "What do I keep telling myself that might not be true?",
  "Who do I want to become in five years? What did that person do today?",
  "What am I grateful for that I usually take for granted?",
  "When did I feel most like myself this week?",
  "What's a mistake I made recently, and what did it teach me?",
  "How did I treat my body today?",
  "What's something I want to learn next, and why?",
  "What boundary do I need to set?",
  "What made me laugh recently?",
  "What would I attempt if I knew I couldn't fail?",
  "Which skill, if I improved it, would change the most for me?",
  "What's one thing I can simplify in my life?",
  "What's weighing on my mind right now? Write it all out.",
  "What did I do today purely because I wanted to?",
  "Who inspires me right now, and what about them?",
  "What does 'enough' look like for me — money, work, effort?",
  "What would my ideal weekend look like?",
  "What am I holding on to that I should let go?",
  "What's a compliment I received that I brushed off?",
  "What's the best decision I made this month?",
  "Where do I need more patience — with others or myself?",
  "What would I tell my younger self about today?",
  "What part of my routine is working well? What isn't?",
  "What's one kind thing I can do for someone tomorrow?",
  "What's stressing me that's actually out of my control?",
  "If I had a free day with no obligations, how would I spend it?",
  "What am I curious about lately?",
  "Which relationship do I want to invest more in?",
  "What did I do this week that moved me closer to my goals?",
];
export const promptFor = (iso) => {
  const n = Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86400000);
  return PROMPTS[((n % PROMPTS.length) + PROMPTS.length) % PROMPTS.length];
};
