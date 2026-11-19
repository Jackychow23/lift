import type { Exercise } from '../lib/types';

// Photos: free-exercise-db (public domain, github.com/yuhonas/free-exercise-db),
// resized for offline use. Chin-tuck drawings are made for this app.
// Steps and "feel it / don't feel it" notes are written for this app.
// To add an exercise: add an entry here and a folder under public/exercises/<id>/.

const img = (id: string, ext = 'webp') => [`exercises/${id}/0.${ext}`, `exercises/${id}/1.${ext}`];

export const EXERCISES: Exercise[] = [
  // ───────── Horizontal push ─────────
  {
    id: 'db_bench_press',
    name: 'Dumbbell Bench Press',
    pattern: 'h_push',
    load: 'dumbbell',
    needs: ['flat_bench'],
    repRange: [6, 10],
    start: 30,
    images: img('db_bench_press'),
    steps: [
      'Sit with the dumbbells on your thighs, lie back, and bring them up over your chest.',
      'Pinch your shoulder blades back and down. Feet flat on the floor.',
      'Lower slowly until the dumbbells are level with your chest, elbows about 45° from your sides.',
      'Press up and slightly in. Stop just before they touch.'
    ],
    feel: { main: ['Chest'], also: ['Front of shoulders', 'Triceps'] },
    notFeel: [
      { where: 'Pinch at the front of the shoulder', fix: 'Elbows are flaring out wide. Tuck them in toward 45°.' },
      { where: 'Lower back', fix: 'Arching too hard or feet lifting. Plant your feet and ease off the arch.' },
      { where: 'Wrists', fix: 'Wrists are bending back. Stack them straight over your elbows.' }
    ]
  },
  {
    id: 'db_bench_neutral',
    name: 'Neutral-Grip Dumbbell Bench Press',
    pattern: 'h_push',
    load: 'dumbbell',
    needs: ['flat_bench'],
    repRange: [6, 10],
    start: 30,
    images: img('db_bench_neutral'),
    steps: [
      'Same setup as a dumbbell bench press, but palms face each other.',
      'Shoulder blades back and down, feet flat.',
      'Lower until the dumbbells touch the sides of your chest, elbows close to your body.',
      'Press straight up.'
    ],
    feel: { main: ['Chest', 'Triceps'], also: ['Front of shoulders'] },
    notFeel: [
      { where: 'Front of the shoulder', fix: 'Shoulders are rolling forward at the top. Keep the blades pinched the whole set.' },
      { where: 'Elbows', fix: 'Lowering too fast. Take 2 seconds on the way down.' }
    ]
  },
  {
    id: 'db_floor_press',
    name: 'Dumbbell Floor Press',
    pattern: 'h_push',
    load: 'dumbbell',
    needs: [],
    floor: true,
    repRange: [6, 10],
    start: 30,
    images: img('db_floor_press'),
    steps: [
      'Lie on the floor with knees bent and a dumbbell in each hand.',
      'Start with the dumbbells pressed up over your chest.',
      'Lower until your upper arms lightly touch the floor, then pause for a beat.',
      'Press back up.'
    ],
    feel: { main: ['Chest', 'Triceps'], also: ['Front of shoulders'] },
    notFeel: [
      { where: 'Elbows banging the floor', fix: 'Lower slower and let the arms land softly.' },
      { where: 'Front of the shoulder', fix: 'Elbows too wide. Keep them about 45° from your body.' }
    ]
  },
  {
    id: 'db_incline_press',
    name: 'Incline Dumbbell Press',
    pattern: 'h_push',
    load: 'dumbbell',
    needs: ['adjustable_bench'],
    repRange: [6, 10],
    start: 25,
    images: img('db_incline_press'),
    steps: [
      'Set the bench to a low incline, about 30°.',
      'Shoulder blades back and down against the bench.',
      'Lower the dumbbells to the top of your chest, elbows about 45° out.',
      'Press up and slightly in.'
    ],
    feel: { main: ['Upper chest'], also: ['Front of shoulders', 'Triceps'] },
    notFeel: [
      { where: 'Mostly shoulders, little chest', fix: 'Bench is too steep. Drop it a notch or two.' },
      { where: 'Neck', fix: 'Head is pushing into the bench or craning up. Keep it resting and relaxed.' }
    ]
  },
  {
    id: 'push_up',
    name: 'Push-Up',
    pattern: 'h_push',
    load: 'bodyweight',
    needs: [],
    floor: true,
    repRange: [8, 20],
    start: 0,
    images: img('push_up'),
    steps: [
      'Hands a little wider than shoulders, body in a straight line from head to heels.',
      'Lower until your chest is a fist above the floor, elbows about 45° out.',
      'Push the floor away until your arms are straight.'
    ],
    feel: { main: ['Chest', 'Triceps'], also: ['Front of shoulders', 'Core'] },
    notFeel: [
      { where: 'Lower back', fix: 'Hips are sagging. Squeeze your glutes and brace your stomach.' },
      { where: 'Neck', fix: 'Head is dropping or poking forward. Keep a long neck, eyes just ahead of your hands.' }
    ]
  },
  {
    id: 'cable_chest_press',
    name: 'Standing Cable Chest Press',
    pattern: 'h_push',
    load: 'cable',
    needs: ['d_handle'],
    repRange: [8, 12],
    start: 30,
    images: img('cable_chest_press'),
    steps: [
      'Set the handle at chest height and face away from the machine, one foot forward.',
      'Start with the handle beside your chest, elbow about 45° from your side.',
      'Press straight forward until your arm is nearly straight, then return slowly. With one handle, do all reps on one arm, then switch.'
    ],
    feel: { main: ['Chest'], also: ['Front of shoulder', 'Triceps'] },
    notFeel: [
      { where: 'Lower back', fix: 'Leaning into it or arching. Stagger your feet and brace your stomach.' },
      { where: 'Front of the shoulder', fix: 'Elbow flared high and wide. Keep it about 45° from your side.' }
    ]
  },
  // ───────── Chest accessory ─────────
  {
    id: 'db_fly',
    name: 'Dumbbell Fly',
    pattern: 'chest',
    load: 'dumbbell',
    needs: ['flat_bench'],
    repRange: [10, 15],
    start: 15,
    images: img('db_fly'),
    steps: [
      'Lie on the bench with dumbbells over your chest, palms facing each other.',
      'Keep a slight bend in the elbows and open your arms in a wide arc.',
      'Stop when you feel a stretch across the chest, then hug the weights back up.'
    ],
    feel: { main: ['Chest'], also: ['Front of shoulders'] },
    notFeel: [
      { where: 'Front of the shoulder', fix: 'Going too deep. Stop when the elbows reach bench height.' },
      { where: 'Biceps or elbows', fix: 'Arms are bending and straightening. Lock the elbow angle and move only at the shoulder.' }
    ]
  },
  // ───────── Vertical push ─────────
  {
    id: 'db_shoulder_press',
    name: 'Seated Dumbbell Shoulder Press',
    pattern: 'v_push',
    load: 'dumbbell',
    needs: ['flat_bench'],
    repRange: [6, 10],
    start: 25,
    images: img('db_shoulder_press'),
    steps: [
      'Sit tall on the bench, dumbbells at shoulder height, palms forward.',
      'Brace your stomach and keep your ribs down.',
      'Press straight up until your arms are nearly straight, biceps near your ears.',
      'Lower back to shoulder height under control.'
    ],
    feel: { main: ['Shoulders'], also: ['Triceps', 'Upper chest'] },
    notFeel: [
      { where: 'Lower back', fix: 'Leaning back to finish the rep. Brace, ribs down, or lower the weight.' },
      { where: 'Neck or top of the traps', fix: 'Shrugging up as you press. Keep shoulders down away from your ears.' }
    ]
  },
  {
    id: 'db_one_arm_shoulder_press',
    name: 'One-Arm Dumbbell Shoulder Press',
    pattern: 'v_push',
    load: 'dumbbell',
    needs: [],
    repRange: [8, 12],
    start: 25,
    images: img('db_one_arm_shoulder_press'),
    steps: [
      'Stand tall with one dumbbell at shoulder height.',
      'Squeeze your glutes and brace so your body does not lean.',
      'Press straight up, then lower under control. Do all reps, then switch arms.'
    ],
    feel: { main: ['Shoulder'], also: ['Triceps', 'Core'] },
    notFeel: [
      { where: 'Lower back', fix: 'Leaning sideways or back. Lighter weight and brace harder.' },
      { where: 'Neck', fix: 'Shrugging. Keep the working shoulder down.' }
    ]
  },
  {
    id: 'cable_shoulder_press',
    name: 'Cable Shoulder Press',
    pattern: 'v_push',
    load: 'cable',
    needs: ['d_handle'],
    repRange: [8, 12],
    start: 25,
    images: img('cable_shoulder_press'),
    steps: [
      'Handle on the lowest setting. Stand or kneel facing away, handle at shoulder height, palm forward.',
      'Brace your stomach and press up and slightly forward until your arm is nearly straight.',
      'Lower back to shoulder height. Do all reps on one arm, then switch.'
    ],
    feel: { main: ['Shoulder'], also: ['Triceps', 'Upper chest'] },
    notFeel: [
      { where: 'Lower back', fix: 'Leaning back to finish. Brace and use less weight.' },
      { where: 'Neck or top of the traps', fix: 'Shrugging as you press. Keep the shoulder down.' }
    ]
  },
  {
    id: 'cable_lateral_raise',
    name: 'Cable Lateral Raise',
    pattern: 'shoulders',
    load: 'cable',
    needs: ['d_handle'],
    repRange: [10, 15],
    start: 10,
    images: img('cable_lateral_raise'),
    steps: [
      'Handle on the lowest setting. Stand side-on and hold it with the far hand, cable across your body.',
      'Raise your arm out to the side, slight bend in the elbow, up to shoulder height.',
      'Lower slowly. Do all reps, then switch sides.'
    ],
    feel: { main: ['Side of the shoulder'], also: [] },
    notFeel: [
      { where: 'Neck or top of the traps', fix: 'Shrugging the weight up. Think long neck; stop at shoulder height.' }
    ]
  },
  {
    id: 'db_lateral_raise',
    name: 'Dumbbell Lateral Raise',
    pattern: 'shoulders',
    load: 'dumbbell',
    needs: [],
    repRange: [10, 15],
    start: 10,
    images: img('db_lateral_raise'),
    steps: [
      'Stand tall, dumbbells at your sides, slight bend in the elbows.',
      'Raise your arms out to the sides until they are level with your shoulders.',
      'Lower slowly. No swinging.'
    ],
    feel: { main: ['Side of shoulders'], also: [] },
    notFeel: [
      { where: 'Neck or top of the traps', fix: 'Shrugging the weight up. Think "long neck" and stop at shoulder height.' },
      { where: 'Lower back', fix: 'Swinging. Use a lighter weight.' }
    ]
  },
  // ───────── Triceps ─────────
  {
    id: 'cable_pushdown',
    name: 'Cable Rope Pushdown',
    pattern: 'triceps',
    load: 'cable',
    needs: ['rope'],
    repRange: [10, 15],
    start: 40,
    images: img('cable_pushdown'),
    steps: [
      'Rope on the high pulley. Stand tall, elbows pinned at your sides.',
      'Push the rope down until your arms are straight, spreading the ends apart at the bottom.',
      'Let your forearms come back up to about parallel to the floor.'
    ],
    feel: { main: ['Triceps (back of the arm)'], also: [] },
    notFeel: [
      { where: 'Shoulders or chest', fix: 'Elbows drifting forward and leaning in. Pin the elbows and stand taller.' },
      { where: 'Elbow joint', fix: 'Snapping into lockout. Finish smoothly.' }
    ]
  },
  {
    id: 'cable_overhead_triceps',
    name: 'Cable Overhead Triceps Extension',
    pattern: 'triceps',
    load: 'cable',
    needs: ['rope'],
    repRange: [10, 15],
    start: 30,
    images: img('cable_overhead_triceps'),
    steps: [
      'Rope on a low or middle pulley. Face away, rope behind your head, one foot forward.',
      'Elbows point forward and stay still.',
      'Straighten your arms overhead, then bend them back slowly for a stretch.'
    ],
    feel: { main: ['Triceps (back of the arm)'], also: [] },
    notFeel: [
      { where: 'Lower back', fix: 'Arching to move the weight. Brace and lighten it.' },
      { where: 'Shoulders', fix: 'Elbows flaring out wide. Keep them pointing forward.' }
    ]
  },
  {
    id: 'db_overhead_triceps',
    name: 'Dumbbell Overhead Triceps Extension',
    pattern: 'triceps',
    load: 'dumbbell',
    needs: [],
    repRange: [10, 15],
    start: 25,
    images: img('db_overhead_triceps'),
    steps: [
      'Sit or stand tall holding one dumbbell with both hands overhead.',
      'Keep elbows pointing forward and lower the dumbbell behind your head.',
      'Straighten your arms back overhead.'
    ],
    feel: { main: ['Triceps (back of the arm)'], also: [] },
    notFeel: [
      { where: 'Lower back', fix: 'Ribs flaring and back arching. Brace and sit if needed.' },
      { where: 'Elbows', fix: 'Dropping too fast into the bottom. Lower under control.' }
    ]
  },
  // ───────── Horizontal pull ─────────
  {
    id: 'seated_cable_row',
    name: 'Seated Cable Row',
    pattern: 'h_pull',
    load: 'cable',
    needs: [],
    repRange: [6, 10],
    start: 80,
    images: img('seated_cable_row'),
    steps: [
      'Sit tall with a slight bend in the knees, chest up.',
      'Pull the handle to your lower ribs, driving your elbows back and squeezing your shoulder blades together.',
      'Let your arms straighten and your shoulder blades open forward without rounding your back.'
    ],
    feel: { main: ['Middle back (between the shoulder blades)', 'Lats'], also: ['Biceps', 'Rear shoulders'] },
    notFeel: [
      { where: 'Lower back', fix: 'Rocking back and forth. Keep your torso still; lower the weight if needed.' },
      { where: 'Mostly biceps', fix: 'Pulling with the hands. Think "elbows back" and squeeze the shoulder blades.' },
      { where: 'Neck or top of the traps', fix: 'Shrugging. Keep shoulders down as you pull.' }
    ]
  },
  {
    id: 'one_arm_db_row',
    name: 'One-Arm Dumbbell Row',
    pattern: 'h_pull',
    load: 'dumbbell',
    needs: ['flat_bench'],
    repRange: [6, 10],
    start: 35,
    images: img('one_arm_db_row'),
    steps: [
      'One hand and knee on the bench, back flat, other foot on the floor.',
      'Pull the dumbbell toward your hip, elbow close to your body.',
      'Lower until the arm is straight. Do all reps, then switch sides.'
    ],
    feel: { main: ['Lats', 'Middle back'], also: ['Biceps', 'Rear shoulder'] },
    notFeel: [
      { where: 'Lower back', fix: 'Twisting to lift the weight. Keep your hips and shoulders square to the floor.' },
      { where: 'Mostly biceps', fix: 'Pulling toward the chest. Pull toward the hip, leading with the elbow.' }
    ]
  },
  {
    id: 'db_bent_over_row',
    name: 'Bent-Over Dumbbell Row',
    pattern: 'h_pull',
    load: 'dumbbell',
    needs: [],
    repRange: [6, 10],
    start: 30,
    images: img('db_bent_over_row'),
    steps: [
      'Hold a dumbbell in each hand, palms facing in. Hinge at the hips until your chest is about 45° to the floor, knees soft, back flat.',
      'Row both dumbbells toward your hips, squeezing your shoulder blades together.',
      'Lower until your arms are straight without letting your back round.'
    ],
    feel: { main: ['Middle back', 'Lats'], also: ['Rear shoulders', 'Biceps', 'Hamstrings (holding the hinge)'] },
    notFeel: [
      { where: 'Lower back', fix: 'Back is rounding or you are standing up as you row. Brace, keep the hinge still, go lighter.' },
      { where: 'Neck', fix: 'Looking up at the mirror. Keep your eyes on the floor a little ahead of you.' }
    ]
  },
  {
    id: 'cable_one_arm_row',
    name: 'One-Arm Cable Row',
    pattern: 'h_pull',
    load: 'cable',
    needs: ['d_handle'],
    repRange: [8, 12],
    start: 35,
    images: img('cable_one_arm_row'),
    steps: [
      'Single handle on a low or middle setting. Sit or stand tall facing the machine.',
      'Pull the handle to your side, elbow close to your body, squeezing your shoulder blade back.',
      'Let the arm reach forward without twisting your torso. Do all reps, then switch.'
    ],
    feel: { main: ['Middle back', 'Lats'], also: ['Biceps', 'Rear shoulder'] },
    notFeel: [
      { where: 'Lower back', fix: 'Twisting to finish the rep. Keep your chest facing the machine.' },
      { where: 'Mostly biceps', fix: 'Pulling with the hand. Lead with the elbow.' }
    ]
  },
  // ───────── Vertical pull ─────────
  {
    id: 'db_pullover',
    name: 'Dumbbell Pullover',
    pattern: 'v_pull',
    load: 'dumbbell',
    needs: ['flat_bench'],
    repRange: [8, 12],
    start: 25,
    images: img('db_pullover'),
    steps: [
      'Lie on the bench holding one dumbbell with both hands over your chest, elbows slightly bent.',
      'Lower it back behind your head in an arc until you feel a stretch along your sides.',
      'Pull it back over your chest using your lats, keeping the elbow bend the same.'
    ],
    feel: { main: ['Lats (sides of the back)'], also: ['Chest', 'Triceps'] },
    notFeel: [
      { where: 'Front of the shoulder', fix: 'Going too far back. Stop when your arms are about level with your head.' },
      { where: 'Lower back', fix: 'Ribs flaring and back arching. Keep your ribs down and lower less far.' }
    ]
  },
  {
    id: 'lat_pulldown',
    name: 'Lat Pulldown',
    pattern: 'v_pull',
    load: 'cable',
    needs: ['lat_bar'],
    repRange: [6, 10],
    start: 80,
    images: img('lat_pulldown'),
    steps: [
      'Grip the bar a bit wider than your shoulders, thighs under the pad.',
      'Lean back slightly, chest up.',
      'Pull the bar to your upper chest, driving elbows down toward your back pockets.',
      'Let the bar rise until your arms are straight.'
    ],
    feel: { main: ['Lats (sides of the back)'], also: ['Biceps', 'Middle back'] },
    notFeel: [
      { where: 'Neck', fix: 'Pulling behind the head or poking the head forward. Bring the bar to the front, chin level.' },
      { where: 'Lower back', fix: 'Leaning way back and yanking. Lighten the weight.' },
      { where: 'Mostly forearms', fix: 'Squeezing the bar too hard. Hook the fingers and pull with the elbows.' }
    ]
  },
  {
    id: 'close_grip_pulldown',
    name: 'Close-Grip Pulldown',
    pattern: 'v_pull',
    load: 'cable',
    needs: ['v_bar'],
    repRange: [6, 10],
    start: 80,
    images: img('close_grip_pulldown'),
    steps: [
      'Attach a V-handle. Sit with thighs under the pad.',
      'Pull the handle to your upper chest, elbows close to your body.',
      'Let your arms straighten fully at the top.'
    ],
    feel: { main: ['Lats'], also: ['Biceps', 'Middle back'] },
    notFeel: [
      { where: 'Neck', fix: 'Head poking forward to meet the handle. Keep chin level and bring the handle to you.' },
      { where: 'Lower back', fix: 'Leaning back too far. Stay nearly upright.' }
    ]
  },
  {
    id: 'one_arm_pulldown',
    name: 'One-Arm Cable Pulldown',
    pattern: 'v_pull',
    load: 'cable',
    needs: ['d_handle'],
    repRange: [8, 12],
    start: 35,
    images: img('one_arm_pulldown'),
    steps: [
      'Single handle on the high pulley. Sit or kneel facing the machine.',
      'Pull the handle down to the side of your chest, elbow toward your hip.',
      'Let the arm reach up and stretch. Do all reps, then switch.'
    ],
    feel: { main: ['Lats'], also: ['Biceps'] },
    notFeel: [
      { where: 'Side of the neck', fix: 'Shrugging the working shoulder. Pull the shoulder down first, then the elbow.' }
    ]
  },
  {
    id: 'straight_arm_pulldown',
    name: 'Straight-Arm Pulldown',
    pattern: 'v_pull',
    load: 'cable',
    needs: ['straight_bar'],
    repRange: [10, 15],
    start: 30,
    images: img('straight_arm_pulldown'),
    steps: [
      'Bar on the high pulley. Step back and hinge forward slightly, arms straight.',
      'Sweep the bar down to your thighs, keeping arms straight.',
      'Let it rise back to eye level slowly.'
    ],
    feel: { main: ['Lats'], also: ['Back of the shoulders', 'Triceps'] },
    notFeel: [
      { where: 'Mostly triceps', fix: 'Bending and straightening the elbows. Keep them locked at one angle.' },
      { where: 'Lower back', fix: 'Bobbing the torso. Stay still and use less weight.' }
    ]
  },
  // ───────── Biceps ─────────
  {
    id: 'db_hammer_curl',
    name: 'Dumbbell Hammer Curl',
    pattern: 'biceps',
    load: 'dumbbell',
    needs: [],
    repRange: [8, 12],
    start: 20,
    images: img('db_hammer_curl'),
    steps: [
      'Stand tall, dumbbells at your sides, palms facing in.',
      'Curl them up without moving your elbows forward.',
      'Lower slowly all the way down.'
    ],
    feel: { main: ['Biceps', 'Forearms'], also: [] },
    notFeel: [
      { where: 'Lower back', fix: 'Swinging. Lighter weight, stand against a wall if you need to.' },
      { where: 'Front of the shoulder', fix: 'Elbows drifting forward. Keep them at your sides.' }
    ]
  },
  {
    id: 'db_curl',
    name: 'Dumbbell Curl',
    pattern: 'biceps',
    load: 'dumbbell',
    needs: [],
    repRange: [8, 12],
    start: 20,
    images: img('db_curl'),
    steps: [
      'Stand tall, dumbbells at your sides, palms forward.',
      'Curl up, keeping elbows still at your sides.',
      'Lower slowly until your arms are straight.'
    ],
    feel: { main: ['Biceps'], also: ['Forearms'] },
    notFeel: [
      { where: 'Lower back', fix: 'Swinging the weight up. Use a lighter weight.' },
      { where: 'Front of the shoulder', fix: 'Elbows moving forward. Pin them.' }
    ]
  },
  {
    id: 'cable_curl',
    name: 'Cable Curl',
    pattern: 'biceps',
    load: 'cable',
    needs: ['straight_bar'],
    repRange: [10, 15],
    start: 40,
    images: img('cable_curl'),
    steps: [
      'Straight bar on the low pulley. Stand tall, elbows at your sides.',
      'Curl the bar up to your chest.',
      'Lower slowly until your arms are straight.'
    ],
    feel: { main: ['Biceps'], also: ['Forearms'] },
    notFeel: [
      { where: 'Lower back', fix: 'Leaning back to finish. Lighten the weight.' }
    ]
  },
  // ───────── Posture ─────────
  {
    id: 'chin_tuck',
    name: 'Chin Tuck',
    pattern: 'posture',
    load: 'bodyweight',
    needs: [],
    repRange: [8, 12],
    start: 0,
    holdSeconds: 5,
    images: img('chin_tuck', 'svg'),
    steps: [
      'Stand or sit tall, eyes level.',
      'Glide your head straight back, like making a double chin. Do not tilt up or down.',
      'Hold for the time shown, feeling the back of your neck lengthen, then relax.'
    ],
    feel: { main: ['Deep front of the neck', 'Base of the skull (gentle stretch)'], also: [] },
    notFeel: [
      { where: 'Pain or tingling into the arm', fix: 'Stop. Try a smaller movement; if it keeps happening, get it checked.' },
      { where: 'Front of the throat straining', fix: 'Pushing too hard or tilting the chin down. Smaller, gentler glide.' }
    ]
  },
  {
    id: 'face_pull',
    name: 'Cable Face Pull',
    pattern: 'posture',
    load: 'cable',
    needs: ['rope'],
    repRange: [12, 20],
    start: 25,
    images: img('face_pull'),
    steps: [
      'Rope on the pulley at about face height. Grip with thumbs toward you.',
      'Pull the rope toward your face, splitting the ends apart beside your ears.',
      'Finish with elbows high and hands rotated back, like a double-biceps pose. Return slowly.'
    ],
    feel: { main: ['Rear shoulders', 'Upper back between the shoulder blades'], also: [] },
    notFeel: [
      { where: 'Neck or top of the traps', fix: 'Shrugging or head poking forward. Keep a long neck and shoulders down.' },
      { where: 'Lower back', fix: 'Leaning back to pull. Use less weight and stand tall.' }
    ]
  },
  {
    id: 'rear_delt_fly',
    name: 'Bent-Over Rear Delt Fly',
    pattern: 'posture',
    load: 'dumbbell',
    needs: ['flat_bench'],
    repRange: [12, 20],
    start: 10,
    images: img('rear_delt_fly'),
    steps: [
      'Sit at the end of the bench and fold forward, chest near your thighs, dumbbells under your legs.',
      'With a slight bend in the elbows, raise the dumbbells out to the sides.',
      'Squeeze at the top, then lower slowly.'
    ],
    feel: { main: ['Rear shoulders'], also: ['Upper back'] },
    notFeel: [
      { where: 'Neck', fix: 'Looking up. Keep your eyes on the floor and neck long.' },
      { where: 'Lower back', fix: 'Jerking the weight up. Go lighter and slower.' }
    ]
  },
  {
    id: 'cable_rear_delt_fly',
    name: 'Cable Rear Delt Fly',
    pattern: 'posture',
    load: 'cable',
    needs: ['d_handle'],
    repRange: [12, 20],
    start: 10,
    images: img('cable_rear_delt_fly'),
    steps: [
      'Handle at about shoulder height. Stand side-on and hold it with the far hand, arm across your chest.',
      'Keeping a slight bend in the elbow, sweep your arm out and back to shoulder level.',
      'Return slowly. Do all reps, then switch sides.'
    ],
    feel: { main: ['Rear shoulder'], also: ['Upper back between the shoulder blades'] },
    notFeel: [
      { where: 'Neck or top of the traps', fix: 'Shrugging. Keep the shoulder down and the neck long.' },
      { where: 'Lower back', fix: 'Twisting your torso. Stay square and go lighter.' }
    ]
  },
  {
    id: 'db_scaption',
    name: 'Dumbbell Y-Raise (Scaption)',
    pattern: 'posture',
    load: 'dumbbell',
    needs: [],
    repRange: [10, 15],
    start: 5,
    images: img('db_scaption'),
    steps: [
      'Stand tall, light dumbbells at your sides, thumbs up.',
      'Raise your arms forward and out in a Y shape, up to shoulder height.',
      'Lower slowly.'
    ],
    feel: { main: ['Upper back and around the shoulder blades'], also: ['Front and side of shoulders'] },
    notFeel: [
      { where: 'Neck or top of the traps', fix: 'Shrugging. Keep shoulders down and stop at shoulder height.' },
      { where: 'Pinch in the shoulder', fix: 'Thumbs turned down. Keep thumbs pointing up.' }
    ]
  },
  {
    id: 'cable_external_rotation',
    name: 'Cable External Rotation',
    pattern: 'posture',
    load: 'cable',
    needs: ['d_handle'],
    repRange: [12, 15],
    start: 10,
    images: img('cable_external_rotation'),
    steps: [
      'Single handle at elbow height. Stand side-on, holding it with the far hand.',
      'Keep the elbow tucked at your side, bent 90°.',
      'Rotate the forearm out away from your stomach, then back slowly. Switch sides.'
    ],
    feel: { main: ['Back of the shoulder (rotator cuff)'], also: [] },
    notFeel: [
      { where: 'Front of the shoulder', fix: 'Elbow drifting away from your side. Tuck a towel between elbow and ribs.' }
    ]
  },
  // ───────── Hinge (legs — only when legs are on) ─────────
  {
    id: 'db_rdl',
    name: 'Dumbbell Romanian Deadlift',
    pattern: 'hinge',
    load: 'dumbbell',
    needs: [],
    repRange: [8, 12],
    start: 40,
    legs: true,
    images: img('db_rdl'),
    steps: [
      'Stand with dumbbells in front of your thighs, knees slightly bent.',
      'Push your hips back and slide the weights down your legs, back flat.',
      'Stop when you feel a strong hamstring stretch, then drive the hips forward to stand.'
    ],
    feel: { main: ['Hamstrings', 'Glutes'], also: ['Lower back (working, not hurting)'] },
    notFeel: [
      { where: 'Sharp lower-back pain', fix: 'Back is rounding. Shorter range, keep the weights close to your legs.' }
    ]
  },
  {
    id: 'cable_pull_through',
    name: 'Cable Pull-Through',
    pattern: 'hinge',
    load: 'cable',
    needs: ['rope'],
    repRange: [10, 15],
    start: 50,
    legs: true,
    images: img('cable_pull_through'),
    steps: [
      'Rope on the low pulley. Face away, rope between your legs, step forward.',
      'Push your hips back, letting the rope pull your hands back between your legs.',
      'Drive the hips forward to stand tall and squeeze your glutes.'
    ],
    feel: { main: ['Glutes', 'Hamstrings'], also: [] },
    notFeel: [
      { where: 'Lower back', fix: 'Pulling with the arms or leaning back at the top. Arms are just hooks; finish by squeezing glutes.' }
    ]
  }
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]));

export const PATTERN_LABEL: Record<string, string> = {
  h_push: 'Horizontal press',
  v_push: 'Overhead press',
  h_pull: 'Row',
  v_pull: 'Pulldown',
  chest: 'Chest',
  shoulders: 'Shoulders',
  triceps: 'Triceps',
  biceps: 'Biceps',
  posture: 'Posture',
  hinge: 'Hip hinge'
};
