// Curated, exact exercise YouTube demonstrations verified against published tutorial listings.
// Never guess a video ID for an unverified or different exercise variant.
// The source is used only on a user-requested preview or to open an external video.
const VIDEOS = [
  {
    "names": [
      "Dumbbell Romanian Deadlift"
    ],
    "id": "aa57T45iFSE",
    "title": "How to Do a Dumbbell Romanian Deadlift",
    "creator": "National Academy of Sports Medicine (NASM)"
  },
  {
    "names": [
      "Dumbbell Lateral Raise"
    ],
    "id": "E3abEP8SIh0",
    "title": "Side Lateral Raise | Exercise Guide",
    "creator": "Bodybuilding.com"
  },
  {
    "names": [
      "Cable Rows",
      "Seated Cable Row",
      "Cable Row"
    ],
    "id": "xQNrFHEMhI4",
    "title": "Seated Cable Row | Exercise Guide",
    "creator": "Bodybuilding.com"
  },
  {
    "names": [
      "Hammer Curl"
    ],
    "id": "CFBZ4jN1CMI",
    "title": "How to Do a Dumbbell Hammer Curl",
    "creator": "National Academy of Sports Medicine (NASM)"
  },
  {
    "names": [
      "Bench Dip"
    ],
    "id": "WVeZDBhZwLA",
    "title": "How to Do a Bench Dip",
    "creator": "National Academy of Sports Medicine (NASM)"
  },
  {
    "names": [
      "Push Ups",
      "Push Up",
      "Push-Ups"
    ],
    "id": "WDIpL0pjun0",
    "title": "How to Do a Push-Up",
    "creator": "National Academy of Sports Medicine (NASM)"
  },
  {
    "names": [
      "Dumbbell Snatch"
    ],
    "id": "R0mhHuVrLHA",
    "title": "The Dumbbell Snatch",
    "creator": "CrossFit"
  },
  {
    "names": [
      "Barbell Thruster"
    ],
    "id": "L219ltL15zk",
    "title": "The Thruster",
    "creator": "CrossFit"
  },
  {
    "names": [
      "Front Squat"
    ],
    "id": "m4ytaCJZpl0",
    "title": "The Front Squat: CrossFit Foundational Movement",
    "creator": "CrossFit"
  },
  {
    "names": [
      "Air Squat"
    ],
    "id": "NadgdGWgsMI",
    "title": "CrossFit Coaching | Fix Your Air Squat",
    "creator": "CrossFit"
  },
  {
    "names": [
      "Cossack Squat"
    ],
    "id": "shYSWbqBJPM",
    "title": "Cossack Squat Tutorial & Progressions",
    "creator": "Flow Motion Fitness"
  },
  {
    "names": [
      "Sumo Deadlift"
    ],
    "id": "YMmy-PgCPVc",
    "title": "Sumo Deadlift (Tutorial) 101",
    "creator": "Nabil Lahlou"
  },
  {
    "names": [
      "Plank",
      "Plank Hold"
    ],
    "id": "xhk1JkbF2lg",
    "title": "How to Do a Plank",
    "creator": "National Academy of Sports Medicine (NASM)"
  },
  {
    "names": [
      "Rear Foot Elevated Split Squat"
    ],
    "id": "6XKBr20YI5M",
    "title": "Rear Foot Elevated Split Squat on a Box",
    "creator": "Ice Hockey Systems"
  },
  {
    "names": [
      "Jumping Jacks"
    ],
    "id": "uLVt6u15L98",
    "title": "How to Do a Jumping Jack",
    "creator": "National Academy of Sports Medicine (NASM)"
  },
  {
    "names": [
      "Bench Press (Dumbbell)",
      "Dumbbell Bench Press"
    ],
    "id": "4_QuyfOCI5U",
    "title": "How to Do a Dumbbell Bench Press",
    "creator": "National Academy of Sports Medicine (NASM)"
  },
  {
    "names": [
      "Dumbbell Pullover"
    ],
    "id": "5XO5KyDUAbE",
    "title": "Dumbbell Pullover: Technique, Dangers and Mistakes",
    "creator": "Powerexplosive"
  },
  {
    "names": [
      "Burpee",
      "Burpees"
    ],
    "id": "TU8QYVW0gDU",
    "title": "The Burpee",
    "creator": "CrossFit"
  },
  {
    "names": [
      "Tricep Kickback"
    ],
    "id": "Urn2TycUVjw",
    "title": "How to Do a Tricep Kickback",
    "creator": "Joanna Soh"
  },
  {
    "names": [
      "Deadlift"
    ],
    "id": "4x9vyLE3kos",
    "title": "Deadlift: Form, Mistakes and Muscles Worked",
    "creator": "BarBend"
  }
];

const normalise = name => String(name||'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim();
const byName = new Map();
for (const video of VIDEOS) for (const alias of video.names) {
 const key=normalise(alias);
 if(byName.has(key))throw Error('Duplicate exercise video alias: '+key);
 byName.set(key,video);
}
export const CURATED_VIDEO_COUNT=VIDEOS.length;
export function getCuratedExerciseVideo(name) {
 const reference=byName.get(normalise(name));
 return reference && /^[A-Za-z0-9_-]{11}$/.test(reference.id) ? reference : null;
}
