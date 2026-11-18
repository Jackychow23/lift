import type { SpanishCard } from '../lib/types';

// Built-in starter deck: everyday and gym Spanish, each word inside a short sentence.
// Mexican Spanish where it differs (e.g. "jalar"). Claude adds more cards later,
// pitched to how you're doing. To add your own, append a row:
// [word, English meaning, Spanish sentence, English sentence, level, category]

type Row = [string, string, string, string, number, string];

const ROWS: Row[] = [
  // Body
  ['la espalda', 'the back', 'Me duele la espalda.', 'My back hurts.', 1, 'body'],
  ['el hombro', 'the shoulder', 'Levanto el brazo hasta el hombro.', 'I lift my arm up to my shoulder.', 1, 'body'],
  ['el cuello', 'the neck', 'Mi cuello está cansado.', 'My neck is tired.', 1, 'body'],
  ['el brazo', 'the arm', 'Este ejercicio es para el brazo.', 'This exercise is for the arm.', 1, 'body'],
  ['el pecho', 'the chest', 'Siento el ejercicio en el pecho.', 'I feel the exercise in my chest.', 1, 'body'],
  ['la mano', 'the hand', 'Tengo una pesa en cada mano.', 'I have a weight in each hand.', 1, 'body'],
  ['la pierna', 'the leg', 'Hoy no entreno la pierna.', "Today I'm not training legs.", 1, 'body'],
  ['la cabeza', 'the head', 'Mantén la cabeza quieta.', 'Keep your head still.', 1, 'body'],
  ['el codo', 'the elbow', 'Dobla el codo despacio.', 'Bend your elbow slowly.', 1, 'body'],
  ['la muñeca', 'the wrist', 'La muñeca debe estar recta.', 'The wrist should be straight.', 1, 'body'],
  ['la rodilla', 'the knee', 'Me duele un poco la rodilla.', 'My knee hurts a little.', 1, 'body'],
  ['el músculo', 'the muscle', 'El músculo está cansado.', 'The muscle is tired.', 1, 'body'],
  ['el cuerpo', 'the body', 'Escucha a tu cuerpo.', 'Listen to your body.', 1, 'body'],
  ['la cara', 'the face', 'Jala la cuerda hacia la cara.', 'Pull the rope toward your face.', 1, 'body'],
  ['el pie', 'the foot', 'Pon los pies en el suelo.', 'Put your feet on the floor.', 1, 'body'],

  // Gym
  ['la mancuerna', 'the dumbbell', '¿Cuánto pesa la mancuerna?', 'How much does the dumbbell weigh?', 1, 'gym'],
  ['el banco', 'the bench', 'Me acuesto en el banco.', 'I lie down on the bench.', 1, 'gym'],
  ['el gimnasio', 'the gym', 'Voy al gimnasio cuatro días a la semana.', 'I go to the gym four days a week.', 1, 'gym'],
  ['la serie', 'the set', 'Me falta una serie más.', 'I have one more set left.', 1, 'gym'],
  ['la repetición', 'the rep', 'Cada serie tiene diez repeticiones.', 'Each set has ten reps.', 1, 'gym'],
  ['el peso', 'the weight', 'El peso es muy ligero.', 'The weight is very light.', 1, 'gym'],
  ['el descanso', 'the break', 'Tengo un descanso de un minuto.', 'I have a one-minute break.', 1, 'gym'],
  ['el agua', 'the water', 'Necesito tomar agua.', 'I need to drink water.', 1, 'gym'],
  ['la toalla', 'the towel', '¿Dónde está mi toalla?', 'Where is my towel?', 1, 'gym'],
  ['el ejercicio', 'the exercise', 'Este ejercicio es difícil.', 'This exercise is hard.', 1, 'gym'],
  ['la máquina', 'the machine', 'La máquina está ocupada.', 'The machine is taken.', 1, 'gym'],
  ['el entrenamiento', 'the workout', 'Me gusta este entrenamiento.', 'I like this workout.', 1, 'gym'],
  ['la cuerda', 'the rope', 'Usa la cuerda para este ejercicio.', 'Use the rope for this exercise.', 1, 'gym'],

  // Verbs
  ['descansar', 'to rest', 'Necesito descansar un minuto.', 'I need to rest for a minute.', 1, 'verb'],
  ['levantar', 'to lift', 'Me gusta levantar pesas.', 'I like lifting weights.', 1, 'verb'],
  ['empujar', 'to push', 'Hay que empujar la mancuerna hacia arriba.', 'You have to push the dumbbell up.', 1, 'verb'],
  ['jalar', 'to pull', 'Jala hacia el pecho.', 'Pull toward your chest.', 1, 'verb'],
  ['bajar', 'to lower', 'Baja el peso despacio.', 'Lower the weight slowly.', 1, 'verb'],
  ['subir', 'to raise', 'Sube los brazos.', 'Raise your arms.', 1, 'verb'],
  ['respirar', 'to breathe', 'No olvides respirar.', "Don't forget to breathe.", 1, 'verb'],
  ['sentir', 'to feel', '¿Dónde lo sientes?', 'Where do you feel it?', 1, 'verb'],
  ['terminar', 'to finish', 'Ya voy a terminar.', "I'm about to finish.", 1, 'verb'],
  ['empezar', 'to start', 'Vamos a empezar.', "Let's start.", 1, 'verb'],
  ['comer', 'to eat', 'Quiero comer después del gimnasio.', 'I want to eat after the gym.', 1, 'verb'],
  ['dormir', 'to sleep', 'Quiero dormir más.', 'I want to sleep more.', 1, 'verb'],
  ['tomar', 'to drink', 'Voy a tomar un café.', "I'm going to have a coffee.", 1, 'verb'],
  ['caminar', 'to walk', 'Me gusta caminar por la tarde.', 'I like to walk in the afternoon.', 1, 'verb'],
  ['trabajar', 'to work', 'Hoy tengo que trabajar tarde.', 'Today I have to work late.', 1, 'verb'],
  ['hablar', 'to speak', 'Hablo un poco de español.', 'I speak a little Spanish.', 1, 'verb'],
  ['entender', 'to understand', 'No entiendo esa palabra.', "I don't understand that word.", 1, 'verb'],
  ['querer', 'to want', 'Quiero ser más fuerte.', 'I want to be stronger.', 1, 'verb'],
  ['poder', 'to be able to', '¿Puedo usar la máquina?', 'Can I use the machine?', 1, 'verb'],
  ['necesitar', 'to need', 'Necesito más agua.', 'I need more water.', 1, 'verb'],
  ['esperar', 'to wait', 'Espera un momento, por favor.', 'Wait a moment, please.', 1, 'verb'],
  ['ayudar', 'to help', '¿Me puedes ayudar?', 'Can you help me?', 1, 'verb'],
  ['buscar', 'to look for', 'Estoy buscando las mancuernas de veinte.', "I'm looking for the twenty-pound dumbbells.", 1, 'verb'],

  // Numbers
  ['tres', 'three', 'Hago tres series.', 'I do three sets.', 1, 'number'],
  ['cinco', 'five', 'Cinco minutos más.', 'Five more minutes.', 1, 'number'],
  ['ocho', 'eight', 'Son las ocho de la mañana.', "It's eight in the morning.", 1, 'number'],
  ['diez', 'ten', 'Tengo diez minutos.', 'I have ten minutes.', 1, 'number'],
  ['quince', 'fifteen', 'Descansa quince segundos.', 'Rest fifteen seconds.', 1, 'number'],
  ['veinte', 'twenty', 'La mancuerna pesa veinte libras.', 'The dumbbell weighs twenty pounds.', 1, 'number'],
  ['treinta', 'thirty', 'Entreno treinta minutos.', 'I train for thirty minutes.', 1, 'number'],
  ['cuarenta', 'forty', 'Hoy levanto cuarenta libras.', "Today I'm lifting forty pounds.", 1, 'number'],
  ['cincuenta', 'fifty', 'Las mancuernas más pesadas son de cincuenta.', 'The heaviest dumbbells are fifty.', 1, 'number'],
  ['cien', 'one hundred', 'Cien por ciento.', 'One hundred percent.', 1, 'number'],

  // Time
  ['hoy', 'today', 'Hoy es día de espalda.', 'Today is back day.', 1, 'time'],
  ['mañana', 'tomorrow', 'Mañana descanso.', 'Tomorrow I rest.', 1, 'time'],
  ['la semana', 'the week', 'Entreno cuatro veces a la semana.', 'I train four times a week.', 1, 'time'],
  ['el minuto', 'the minute', 'Falta un minuto.', 'One minute left.', 1, 'time'],
  ['ahora', 'now', 'Ahora no, después.', 'Not now, later.', 1, 'time'],
  ['después', 'after', 'Después del gimnasio, voy a casa.', "After the gym, I'm going home.", 1, 'time'],
  ['siempre', 'always', 'Siempre caliento primero.', 'I always warm up first.', 1, 'time'],
  ['nunca', 'never', 'Nunca hago sentadillas.', 'I never do squats.', 1, 'time'],
  ['la noche', 'the night', 'Esta noche voy a dormir temprano.', "Tonight I'm going to sleep early.", 1, 'time'],
  ['temprano', 'early', 'Me levanto temprano.', 'I get up early.', 1, 'time'],

  // Describing
  ['pesado', 'heavy', 'Este peso es muy pesado.', 'This weight is very heavy.', 1, 'adj'],
  ['ligero', 'light', 'Quiero algo más ligero.', 'I want something lighter.', 1, 'adj'],
  ['fuerte', 'strong', 'Cada semana estoy más fuerte.', "Every week I'm stronger.", 1, 'adj'],
  ['cansado', 'tired', 'Estoy muy cansado hoy.', "I'm very tired today.", 1, 'adj'],
  ['difícil', 'hard', 'La última repetición es difícil.', 'The last rep is hard.', 1, 'adj'],
  ['lento', 'slow', 'Hazlo lento y controlado.', 'Do it slow and controlled.', 1, 'adj'],
  ['rápido', 'fast', 'No lo hagas tan rápido.', "Don't do it so fast.", 1, 'adj'],
  ['derecho', 'straight', 'Mantén la espalda derecha.', 'Keep your back straight.', 1, 'adj'],
  ['listo', 'ready', '¿Estás listo?', 'Are you ready?', 1, 'adj'],
  ['contento', 'happy', 'Estoy contento con mi progreso.', "I'm happy with my progress.", 1, 'adj'],
  ['bueno', 'good', 'Es un buen ejercicio para la postura.', "It's a good exercise for posture.", 1, 'adj'],

  // Phrases
  ['por favor', 'please', 'Un momento, por favor.', 'One moment, please.', 1, 'phrase'],
  ['gracias', 'thank you', 'Gracias por tu ayuda.', 'Thanks for your help.', 1, 'phrase'],
  ['¿cuánto?', 'how much?', '¿Cuánto cuesta la membresía?', 'How much is the membership?', 1, 'phrase'],
  ['¿dónde?', 'where?', '¿Dónde están los baños?', 'Where are the restrooms?', 1, 'phrase'],
  ['¿cuándo?', 'when?', '¿Cuándo terminas?', 'When do you finish?', 1, 'phrase'],
  ['ocupado', 'taken', '¿Está ocupado este banco?', 'Is this bench taken?', 1, 'phrase'],
  ['libre', 'free', 'Sí, está libre.', "Yes, it's free.", 1, 'phrase'],
  ['otra vez', 'again', 'Otra vez, una más.', 'Again, one more.', 1, 'phrase'],
  ['un poco', 'a little', 'Sube el peso un poco.', 'Raise the weight a little.', 1, 'phrase'],
  ['más', 'more', 'Una repetición más.', 'One more rep.', 1, 'phrase'],
  ['menos', 'less', 'Usa menos peso.', 'Use less weight.', 1, 'phrase'],
  ['¡vamos!', 'come on!', '¡Vamos, tú puedes!', 'Come on, you can do it!', 1, 'phrase'],

  // Food
  ['el pollo', 'the chicken', 'Como pollo con arroz.', 'I eat chicken with rice.', 1, 'food'],
  ['el arroz', 'the rice', 'El arroz está listo.', 'The rice is ready.', 1, 'food'],
  ['el huevo', 'the egg', 'Desayuno dos huevos.', 'I have two eggs for breakfast.', 1, 'food'],
  ['la proteína', 'the protein', 'Tomo un batido de proteína.', 'I drink a protein shake.', 1, 'food'],
  ['el desayuno', 'the breakfast', 'El desayuno es importante.', 'Breakfast is important.', 1, 'food'],
  ['la cena', 'the dinner', 'La cena está lista.', 'Dinner is ready.', 1, 'food'],
  ['el plátano', 'the banana', 'Me como un plátano antes de entrenar.', 'I eat a banana before training.', 1, 'food'],
  ['la tortilla', 'the tortilla', '¿Quieres tortillas de maíz o de harina?', 'Do you want corn or flour tortillas?', 1, 'food'],

  // Places and people
  ['la casa', 'the house', 'Entreno en casa los domingos.', 'I train at home on Sundays.', 1, 'place'],
  ['el trabajo', 'work', 'Salgo del trabajo a las cinco.', 'I leave work at five.', 1, 'place'],
  ['la tienda', 'the store', 'Voy a la tienda por agua.', "I'm going to the store for water.", 1, 'place'],
  ['el amigo', 'the friend', 'Mi amigo entrena conmigo.', 'My friend trains with me.', 1, 'place'],
  ['la esposa', 'the wife', 'Mi esposa me ayudó con la aplicación.', 'My wife helped me with the app.', 1, 'place'],
  ['el carro', 'the car', 'El carro está en el estacionamiento.', 'The car is in the parking lot.', 1, 'place'],
  ['la calle', 'the street', 'Camino por la calle.', 'I walk down the street.', 1, 'place'],
  ['la playa', 'the beach', 'Quiero ir a la playa.', 'I want to go to the beach.', 1, 'place'],

  // Level 2: past tense and longer patterns
  ['ayer', 'yesterday', 'Ayer descansé todo el día.', 'Yesterday I rested all day.', 2, 'time'],
  ['tarde', 'late', 'Llegué tarde al gimnasio.', 'I got to the gym late.', 2, 'time'],
  ['fácil', 'easy', 'Esta serie fue fácil.', 'This set was easy.', 2, 'adj'],
  ['fui', 'I went', 'Fui al gimnasio en la mañana.', 'I went to the gym in the morning.', 2, 'past'],
  ['hice', 'I did', 'Hice tres series de remo.', 'I did three sets of rows.', 2, 'past'],
  ['pude', 'I was able to', 'No pude terminar la última serie.', "I couldn't finish the last set.", 2, 'past'],
  ['comí', 'I ate', 'Comí mucho anoche.', 'I ate a lot last night.', 2, 'past'],
  ['dormí', 'I slept', 'Dormí ocho horas.', 'I slept eight hours.', 2, 'past'],
  ['terminé', 'I finished', 'Ya terminé mi entrenamiento.', "I've already finished my workout.", 2, 'past'],
  ['me siento', 'I feel', 'Hoy me siento fuerte.', 'Today I feel strong.', 2, 'pattern'],
  ['tengo que', 'I have to', 'Tengo que estirar después.', 'I have to stretch afterward.', 2, 'pattern'],
  ['voy a', "I'm going to", 'Voy a subir el peso.', "I'm going to increase the weight.", 2, 'pattern'],
  ['todavía', 'still', 'Todavía me duele el hombro.', 'My shoulder still hurts.', 2, 'pattern'],
  ['ya', 'already', 'Ya es hora de irnos.', "It's already time to go.", 2, 'pattern'],
  ['la postura', 'posture', 'Mi postura está mejorando.', 'My posture is improving.', 2, 'pattern'],
  ['mejorar', 'to improve', 'Quiero mejorar cada semana.', 'I want to improve every week.', 2, 'pattern']
];

export const BASE_DECK: SpanishCard[] = ROWS.map(([word, en, es, sentenceEn, level, cat], i) => ({
  id: `b${String(i + 1).padStart(3, '0')}`,
  word,
  en,
  es,
  sentenceEn,
  level,
  cat
}));
