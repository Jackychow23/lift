import type { SpanishCard } from '../lib/types';

// Starter deck for a week in the Cancún–Tulum area (a wedding): taxis and prices,
// buses and colectivos, the hotel, ordering and paying, directions, small talk.
// Mexican Spanish where it differs (camión = bus, alberca = pool, ¿mande?, ahorita).
// Each word sits inside a sentence that contains it, so fill-in-the-blank works.
// Hooks are memory aids: an English word with the same root, or a quick picture.
// To add a card, append a row: [word, English, Spanish sentence, English sentence, level, category, hook?]
// Card ids come from the word, so reordering rows never mixes up progress.

type Row = [string, string, string, string, number, string, string?];

const ROWS: Row[] = [
  // ── Getting around ──
  ['¿cuánto cuesta?', 'how much is it?', '¿Cuánto cuesta ir al centro?', 'How much is it to go downtown?', 1, 'money', 'Think “quantity” + “cost”.'],
  ['el taxi', 'the taxi', '¿Dónde puedo tomar un taxi?', 'Where can I get a taxi?', 1, 'transport', 'Same word in English.'],
  ['hasta', 'up to, as far as', '¿Cuánto cuesta hasta la playa?', 'How much is it to the beach?', 1, 'transport', 'Like “hasta luego” (until later): “hasta la playa” = as far as the beach.'],
  ['el centro', 'downtown', 'Vamos al centro, por favor.', 'Downtown, please.', 1, 'places', 'Think “center”: the town center.'],
  ['la zona hotelera', 'the hotel zone', 'Mi hotel está en la zona hotelera.', 'My hotel is in the hotel zone.', 1, 'places', '“Zona” = zone, “hotelera” = of hotels.'],
  ['el aeropuerto', 'the airport', 'Necesito ir al aeropuerto.', 'I need to go to the airport.', 1, 'places', '“Aero” (air) + “puerto” (port).'],
  ['aquí', 'here', 'Aquí está bien, gracias.', 'Here is fine, thanks.', 1, 'directions', 'Say “a-KEY”: the key is right here.'],
  ['déjeme', 'drop me off, let me', 'Déjeme aquí, por favor.', 'Drop me off here, please.', 1, 'transport', 'From “dejar” (to leave): “leave me here”.'],
  ['a la derecha', 'to the right', 'El hotel está a la derecha.', 'The hotel is on the right.', 1, 'directions', 'Like “derecho” (straight, a right): the right-hand side.'],
  ['a la izquierda', 'to the left', 'El baño está a la izquierda.', 'The bathroom is on the left.', 1, 'directions', 'The longer, clumsier word goes with the clumsier hand: left.'],
  ['derecho', 'straight ahead', 'Siga derecho dos cuadras.', 'Go straight for two blocks.', 1, 'directions', 'Think “direct”: straight ahead.'],
  ['la cuadra', 'the block', 'El hotel está a una cuadra.', 'The hotel is one block away.', 1, 'directions', 'Think “quadrant”: a city block is a square.'],
  ['la esquina', 'the corner', 'Déjeme en la esquina, por favor.', 'Drop me off at the corner, please.', 1, 'directions'],
  ['cerca', 'near', '¿Hay un cajero cerca?', 'Is there an ATM nearby?', 1, 'directions', 'Same root as “circa” (around): close around you.'],
  ['lejos', 'far', '¿Está lejos de aquí?', 'Is it far from here?', 1, 'directions', 'Picture tired “legs”: it’s far.'],
  ['la parada', 'the stop', '¿Dónde está la parada del colectivo?', 'Where is the shared van stop?', 1, 'transport', 'From “parar” (to stop): where the bus stops.'],
  ['el colectivo', 'the shared van', 'El colectivo pasa cada quince minutos.', 'The shared van comes by every fifteen minutes.', 1, 'transport', 'A “collective” van: everyone shares it.'],
  ['el camión', 'the bus', 'El camión va a Playa del Carmen.', 'The bus goes to Playa del Carmen.', 1, 'transport', 'In Mexico “camión” is a bus (elsewhere it means truck).'],
  ['el boleto', 'the ticket', 'Un boleto para Cancún, por favor.', 'One ticket to Cancún, please.', 1, 'transport', 'Think “ballot”: a slip of paper.'],
  ['la estación', 'the station', '¿Dónde está la estación del tren?', 'Where is the train station?', 1, 'transport', 'Looks like “station”.'],
  ['el tren', 'the train', 'El tren sale a las nueve.', 'The train leaves at nine.', 1, 'transport', 'Sounds like “train”.'],
  ['sale', 'leaves, departs', '¿A qué hora sale el camión?', 'What time does the bus leave?', 1, 'transport', 'Like “SALIDA” (exit) signs: the bus exits.'],
  ['llegar', 'to arrive', '¿Cuándo vamos a llegar?', 'When are we going to arrive?', 1, 'transport', 'Picture tired “legs” finally arriving.'],

  // ── Money ──
  ['el precio', 'the price', '¿Cuál es el precio?', "What's the price?", 1, 'money', 'Think “price” and “precious”.'],
  ['caro', 'expensive', 'Es muy caro.', "It's very expensive.", 1, 'money', 'Same root as “cherish” and French “cher” (dear).'],
  ['barato', 'cheap', '¿Hay algo más barato?', 'Is there something cheaper?', 1, 'money', 'Same root as “barter”.'],
  ['los pesos', 'pesos', '¿Cuánto es en pesos?', 'How much is it in pesos?', 1, 'money', '“Peso” means weight: coins were once a set weight of silver.'],
  ['los dólares', 'dollars', '¿Aceptan dólares?', 'Do you take dollars?', 1, 'money', 'Looks like “dollars”.'],
  ['la tarjeta', 'the card', '¿Puedo pagar con tarjeta?', 'Can I pay by card?', 1, 'money', 'Picture your card as a small “target” for the card reader.'],
  ['el efectivo', 'cash', 'Solo aceptamos efectivo.', 'We only take cash.', 1, 'money', 'Cash is the most “effective” way to pay here.'],
  ['el cambio', 'the change', 'No tengo cambio.', "I don't have change.", 1, 'money', 'Think “exchange”: CAMBIO signs are money exchanges.'],
  ['la cuenta', 'the check', 'La cuenta, por favor.', 'The check, please.', 1, 'food', 'Think “count” and “account”.'],
  ['la propina', 'the tip', '¿Está incluida la propina?', 'Is the tip included?', 1, 'money', 'From an old word for “offering a drink”: a tip was money for a drink.'],
  ['pagar', 'to pay', 'Quiero pagar en efectivo.', 'I want to pay in cash.', 1, 'money', 'Starts like “pay”, and shares its root.'],
  ['el cajero', 'the ATM', 'El cajero no funciona.', "The ATM doesn't work.", 1, 'money', 'From “caja” (cash box), like “cashier”.'],
  ['incluido', 'included', '¿Está incluido el desayuno?', 'Is breakfast included?', 1, 'hotel', 'Looks like “included”.'],

  // ── Numbers (prices) ──
  ['dos', 'two', 'Dos cervezas, por favor.', 'Two beers, please.', 1, 'number', 'Think “duo”.'],
  ['tres', 'three', 'Somos tres personas.', "We're three people.", 1, 'number', 'Think “trio”.'],
  ['cuatro', 'four', 'Una mesa para cuatro.', 'A table for four.', 1, 'number', 'Think “quarter” and “quad”.'],
  ['cinco', 'five', 'Llegamos en cinco minutos.', "We'll arrive in five minutes.", 1, 'number', 'Cinco de Mayo: the 5th of May.'],
  ['diez', 'ten', 'Son las diez de la noche.', "It's ten at night.", 1, 'number', 'Think “dime”, a tenth of a dollar.'],
  ['quince', 'fifteen', 'Quince minutos, más o menos.', 'Fifteen minutes, more or less.', 1, 'number', 'A quinceañera is a 15th-birthday party.'],
  ['veinte', 'twenty', 'Son veinte pesos.', "It's twenty pesos.", 1, 'number', 'Close to French “vingt” (20).'],
  ['cincuenta', 'fifty', 'Cincuenta pesos por persona.', 'Fifty pesos per person.', 1, 'number', '“Cinco” (5) + “-uenta”: five tens.'],
  ['cien', 'one hundred', 'Cien pesos, ¿está bien?', 'A hundred pesos, OK?', 1, 'number', 'Think “century” and “cent”.'],
  ['doscientos', 'two hundred', 'Te doy doscientos.', "I'll give you two hundred.", 1, 'number', '“Dos” (2) + “cientos” (hundreds).'],
  ['trescientos', 'three hundred', '¿Trescientos? Es mucho.', "Three hundred? That's a lot.", 1, 'number', '“Tres” (3) + “cientos” (hundreds).'],
  ['quinientos', 'five hundred', 'Son quinientos pesos.', "It's five hundred pesos.", 1, 'number', 'Not “cincocientos”: think “quint-” (five), as in quintuplets.'],
  ['mil', 'a thousand', 'La habitación cuesta dos mil pesos la noche.', 'The room costs two thousand pesos a night.', 1, 'number', 'Think “millennium”.'],

  // ── Hotel ──
  ['la reservación', 'the reservation', 'Tengo una reservación.', 'I have a reservation.', 1, 'hotel', 'Looks like “reservation” (Mexico says reservación; Spain says reserva).'],
  ['la habitación', 'the room', '¿La habitación tiene vista al mar?', 'Does the room have an ocean view?', 1, 'hotel', 'Think “habitat”: where you live.'],
  ['el cuarto', 'the room', 'Mi cuarto es el doscientos tres.', 'My room is 203.', 1, 'hotel', 'Also means “a quarter”. In Mexico it’s the everyday word for room.'],
  ['la llave', 'the key', 'Perdí la llave del cuarto.', 'I lost the room key.', 1, 'hotel', 'Same root as “clavicle”, the “little key” bone.'],
  ['el aire acondicionado', 'the air conditioning', 'El aire acondicionado no funciona.', "The air conditioning doesn't work.", 1, 'hotel', 'Looks like “air conditioned”.'],
  ['funciona', 'works', '¿Funciona el wifi?', 'Does the wifi work?', 1, 'hotel', 'Think “function”.'],
  ['la toalla', 'the towel', '¿Me puede dar otra toalla?', 'Can you give me another towel?', 1, 'hotel', 'Sounds like “towel”.'],
  ['el desayuno', 'breakfast', 'El desayuno es de siete a diez.', 'Breakfast is from seven to ten.', 1, 'food', '“Des” (break) + “ayuno” (fast): break-fast.'],
  ['la salida', 'checkout, exit', '¿A qué hora es la salida?', 'What time is checkout?', 1, 'hotel', 'SALIDA signs mark the exit.'],
  ['la alberca', 'the pool', '¿Dónde está la alberca?', "Where's the pool?", 1, 'hotel', 'Mexican word for pool (Spain says piscina).'],
  ['el baño', 'the bathroom', '¿Dónde está el baño?', "Where's the bathroom?", 1, 'hotel', 'Think “bath”.'],
  ['la maleta', 'the suitcase', '¿Puedo dejar mi maleta aquí?', 'Can I leave my suitcase here?', 1, 'hotel', 'Same root as “mail”, which first meant a traveling bag.'],
  ['el piso', 'the floor', 'Estamos en el tercer piso.', "We're on the third floor.", 1, 'hotel'],
  ['limpio', 'clean', 'El baño no está limpio.', "The bathroom isn't clean.", 1, 'hotel', 'Think “limpid” (clear water).'],

  // ── Food and drink ──
  ['la mesa', 'the table', 'Una mesa para dos, por favor.', 'A table for two, please.', 1, 'food', 'A “mesa” is a flat-topped hill, like a table.'],
  ['la carta', 'the menu', '¿Me trae la carta, por favor?', 'Can you bring me the menu?', 1, 'food', 'Think “card” or “chart”: the menu card.'],
  ['quiero', 'I want', 'Quiero dos tacos al pastor.', 'I want two al pastor tacos.', 1, 'food', 'From “querer”, same root as “query” and “quest”.'],
  ['me da', 'can I have', 'Me da una cerveza, por favor.', 'Can I have a beer, please?', 1, 'food', 'Literally “you give me”: the usual polite way to order in Mexico.'],
  ['la cerveza', 'the beer', 'Una cerveza bien fría.', 'A really cold beer.', 1, 'food', 'You’ll see it on every beach sign.'],
  ['el agua', 'water', 'Agua natural, sin hielo.', 'Still water, no ice.', 1, 'food', 'Think “aqua”.'],
  ['sin', 'without', 'Sin cebolla, por favor.', 'Without onion, please.', 1, 'food', 'Think French “sans”: without.'],
  ['con', 'with', 'Un taco con todo.', 'A taco with everything.', 1, 'food', 'Think “chili con carne” (with meat).'],
  ['el hielo', 'the ice', '¿El hielo es purificado?', 'Is the ice purified?', 1, 'food'],
  ['picante', 'spicy', '¿Es muy picante?', 'Is it very spicy?', 1, 'food', 'Think “piquant”.'],
  ['para llevar', 'to go', 'Para llevar, por favor.', 'To go, please.', 1, 'food', '“Llevar” = to carry: “for carrying”.'],
  ['rico', 'delicious', '¡Está muy rico!', "It's really delicious!", 1, 'food', 'Rich food: “rico” means tasty.'],
  ['la comida', 'the food', 'La comida está deliciosa.', 'The food is delicious.', 1, 'food', 'From “comer” (to eat), like “comestible”.'],
  ['el pollo', 'chicken', 'Quiero pollo con arroz.', 'I want chicken with rice.', 1, 'food', 'Think “poultry”.'],
  ['el pescado', 'fish (to eat)', 'El pescado está fresco.', 'The fish is fresh.', 1, 'food', 'Think “Pisces”, the fish sign.'],
  ['los mariscos', 'seafood', '¿Tienen mariscos?', 'Do you have seafood?', 1, 'food', 'From “mar” (sea), like “marine”: seafood.'],
  ['la tortilla', 'the tortilla', '¿La tortilla es de maíz?', 'Is the tortilla corn?', 1, 'food', 'Same word in English.'],
  ['la cena', 'dinner', '¿A qué hora es la cena?', 'What time is dinner?', 1, 'food', 'The Last Supper is “la Última Cena”.'],

  // ── The wedding ──
  ['la boda', 'the wedding', 'Vamos a una boda en Tulum.', "We're going to a wedding in Tulum.", 1, 'wedding', 'From an old word for “vows”.'],
  ['los novios', 'the bride and groom', 'Los novios son mis amigos.', 'The bride and groom are my friends.', 1, 'wedding', 'Like “novel” and “novice” (new): the newlyweds.'],
  ['la fiesta', 'the party', 'La fiesta empieza a las ocho.', 'The party starts at eight.', 1, 'wedding', 'Same word in English.'],
  ['el regalo', 'the gift', 'Traje un regalo para los novios.', 'I brought a gift for the couple.', 1, 'wedding', 'Think “regal”: a gift fit for a king.'],
  ['bailar', 'to dance', '¿Quieres bailar?', 'Do you want to dance?', 1, 'wedding', 'Think “ballet” and a “ball” (a dance).'],
  ['¡felicidades!', 'congratulations!', '¡Felicidades a los novios!', 'Congratulations to the couple!', 1, 'wedding', 'Think “felicity” (happiness).'],

  // ── Talking ──
  ['mucho gusto', 'nice to meet you', 'Mucho gusto, soy Jacky.', "Nice to meet you, I'm Jacky.", 1, 'talk', 'Literally “much pleasure”, as in “with gusto”.'],
  ['¿de dónde eres?', 'where are you from?', 'Hola, ¿de dónde eres?', 'Hi, where are you from?', 1, 'talk', '“De” (from) + “dónde” (where).'],
  ['soy de', "I'm from", 'Soy de Los Ángeles.', "I'm from Los Angeles.", 1, 'talk', '“Soy” = I am, “de” = from.'],
  ['¿cómo estás?', 'how are you?', 'Hola, ¿cómo estás?', 'Hi, how are you?', 1, 'talk', '“Cómo” = how; “estás” = you are (think “status”).'],
  ['bien', 'well, fine', 'Muy bien, gracias.', 'Very well, thanks.', 1, 'talk', 'Think “benefit” and “benign”.'],
  ['no entiendo', "I don't understand", 'Perdón, no entiendo.', "Sorry, I don't understand.", 1, 'talk', '“Entender” is like “intend”: aim your mind at it.'],
  ['más despacio', 'more slowly', '¿Puede hablar más despacio, por favor?', 'Can you speak more slowly, please?', 1, 'talk', 'From “de espacio”: give the words more space.'],
  ['¿habla inglés?', 'do you speak English?', 'Disculpe, ¿habla inglés?', 'Excuse me, do you speak English?', 1, 'talk', '“Hablar” shares a root with “fable”: telling out loud.'],
  ['disculpe', 'excuse me', 'Disculpe, ¿dónde está la alberca?', "Excuse me, where's the pool?", 1, 'talk', 'Think “exculpate”: “not my fault, excuse me”.'],
  ['con permiso', 'excuse me (passing)', 'Con permiso, voy a pasar.', "Excuse me, I'm coming through.", 1, 'talk', '“With permission”: say it squeezing past people.'],
  ['repetir', 'to repeat', '¿Puede repetir, por favor?', 'Can you repeat that, please?', 1, 'talk', 'Looks like “repeat”.'],
  ['está bien', "it's fine, OK", 'Está bien, vamos.', "OK, let's go.", 1, 'talk', '“Está” (it is) + “bien” (well).'],
  ['claro', 'of course', '¡Claro que sí!', 'Of course!', 1, 'talk', 'Think “clear”: clearly, yes.'],
  ['de nada', "you're welcome", 'Gracias. De nada.', "Thanks. You're welcome.", 1, 'talk', 'Literally “of nothing”: it was nothing.'],
  ['por favor', 'please', 'Un momento, por favor.', 'One moment, please.', 1, 'talk', 'Think “do me a favor”.'],
  ['gracias', 'thank you', 'Muchas gracias por todo.', 'Thank you for everything.', 1, 'talk', 'Think “gracious” and “grateful”.'],

  // ── Places and the beach ──
  ['la playa', 'the beach', 'Vamos a la playa mañana.', "We're going to the beach tomorrow.", 1, 'places', 'Picture the beach as the place to play.'],
  ['el mar', 'the sea', 'El mar está muy bonito hoy.', 'The sea looks beautiful today.', 1, 'places', 'Think “marine” and “mariner”.'],
  ['el cenote', 'the natural swimming hole', '¿Cuánto cuesta la entrada al cenote?', 'How much is entry to the swimming hole?', 1, 'places', 'A Maya word for a natural swimming hole.'],
  ['las ruinas', 'the ruins', 'Las ruinas abren a las ocho.', 'The ruins open at eight.', 1, 'places', 'Looks like “ruins”.'],
  ['la entrada', 'the entrance, the ticket', 'La entrada es por aquí.', 'The entrance is this way.', 1, 'places', 'Think “enter”.'],
  ['abierto', 'open', '¿Está abierto hoy?', 'Is it open today?', 1, 'places', 'Think “aperture”, an opening.'],
  ['cerrado', 'closed', 'El museo está cerrado.', 'The museum is closed.', 1, 'places', 'Sounds a bit like “sealed”: closed.'],
  ['la tienda', 'the store', '¿Hay una tienda cerca?', 'Is there a store nearby?', 1, 'places', 'Also means “tent”: picture a market of tents.'],
  ['la farmacia', 'the pharmacy', 'Necesito una farmacia.', 'I need a pharmacy.', 1, 'places', 'Looks like “pharmacy”.'],
  ['el sol', 'the sun', 'Hace mucho sol.', "It's very sunny.", 1, 'places', 'Think “solar”.'],
  ['la calle', 'the street', '¿Cómo se llama esta calle?', "What's this street called?", 1, 'places', 'Sounds like “KA-yeh”; picture a narrow alley.'],
  ['el mercado', 'the market', 'El mercado está en el centro.', 'The market is downtown.', 1, 'places', 'Think “market” and “mercantile”.'],

  // ── Time ──
  ['¿a qué hora?', 'at what time?', '¿A qué hora abren?', 'What time do you open?', 1, 'time', '“Hora” = hour.'],
  ['hoy', 'today', 'Hoy vamos a las ruinas.', "Today we're going to the ruins.", 1, 'time', 'Picture someone shouting “Oy! Today?!”'],
  ['mañana', 'tomorrow', 'Nos vemos mañana.', 'See you tomorrow.', 1, 'time', 'Also means “morning”: “mañana en la mañana” is tomorrow morning.'],
  ['la noche', 'the night', 'La boda es en la noche.', 'The wedding is at night.', 1, 'time', 'Think “nocturnal”.'],
  ['ahora', 'now', 'Ahora no, gracias.', 'Not now, thanks.', 1, 'time', '“A hora” = at this hour.'],
  ['tarde', 'late', 'Ya es tarde.', "It's already late.", 1, 'time', 'Think “tardy”. It also means “afternoon”.'],

  // ── Help ──
  ['necesito', 'I need', 'Necesito ayuda.', 'I need help.', 1, 'help', 'Think “necessity”.'],
  ['la ayuda', 'the help', 'Gracias por la ayuda.', 'Thanks for the help.', 1, 'help', 'Think “aid”.'],
  ['¿dónde está?', 'where is?', '¿Dónde está el hotel?', 'Where is the hotel?', 1, 'help', 'Picture asking “Where’s Don? ¿Dónde está Don?”'],
  ['tengo', 'I have', 'Tengo una pregunta.', 'I have a question.', 1, 'help', 'From “tener” (to have), like “tenant” (a holder).'],
  ['hay', 'there is, there are', '¿Hay mesas libres?', 'Are there free tables?', 1, 'help', 'Sounds like “eye”: is there one in sight?'],
  ['libre', 'free, available', '¿Está libre?', 'Is it free?', 1, 'help', 'Think “liberty”.'],
  ['ocupado', 'taken, busy', 'Este lugar está ocupado.', 'This seat is taken.', 1, 'help', 'Looks like “occupied”.'],
  ['el problema', 'the problem', 'No hay problema.', 'No problem.', 1, 'help', 'Looks like “problem”.'],

  // ── Level 2: Mexican expressions and past tense ──
  ['¿mande?', 'pardon?', '¿Mande? No escuché.', "Sorry? I didn't hear.", 2, 'talk', 'A very Mexican, polite way to say “what?”.'],
  ['ahorita', 'in a moment', 'Ahorita vengo.', "I'll be right back.", 2, 'time', '“Ahora” (now) + “-ita” (little): could mean right now… or later.'],
  ['¡qué padre!', 'how cool!', '¡Qué padre está el cenote!', 'This swimming hole is so cool!', 2, 'talk', 'Mexican slang: “padre” (father) means cool.'],
  ['tal vez', 'maybe', 'Tal vez mañana.', 'Maybe tomorrow.', 2, 'talk', 'Literally “such a time”.'],
  ['perdón', 'sorry', 'Perdón, fue sin querer.', "Sorry, I didn't mean to.", 2, 'talk', 'Think “pardon”.'],
  ['perdí', 'I lost', 'Perdí mi teléfono.', 'I lost my phone.', 2, 'help', 'From “perder”, like “perdition” (being lost).'],
  ['el bloqueador', 'sunscreen', 'Se me olvidó el bloqueador.', 'I forgot the sunscreen.', 2, 'places', 'It “blocks” the sun: sunblock.'],
  ['me cobra', 'you charge me', '¿Cuánto me cobra hasta el centro?', 'How much will you charge me to downtown?', 2, 'transport', '“Cobrar” = to charge: “¿Cuánto me cobra?” is how you ask a taxi’s price.'],
  ['¿cuánto le debo?', 'how much do I owe you?', 'Perdón, ¿cuánto le debo?', 'Excuse me, how much do I owe you?', 2, 'money', '“Deber” = to owe, like “debt”.']
];

const slug = (w: string) =>
  w
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export const BASE_DECK: SpanishCard[] = ROWS.map(([word, en, es, sentenceEn, level, cat, hook]) => ({
  id: `w-${slug(word)}`,
  word,
  en,
  es,
  sentenceEn,
  level,
  cat,
  hook
}));
