// POLS DEL TEMPS — extensió per a Firefox (Manifest V3, popup)

// PALETES DE COLORS
// Cada paleta té: fons (de tot el popup), centre de la flor i "ink" (color del text de la signatura).
const PALETTES = [
  { name: 'Clàssica', bg: [255, 255, 255], center: [139, 46, 59], ink: [38, 38, 38] },
  { name: 'Nit',      bg: [18, 24, 43],    center: [230, 57, 70], ink: [235, 235, 235] },
  { name: 'Tardor',   bg: [250, 241, 228], center: [38, 70, 83],  ink: [60, 40, 30] }
];

// COLORS A TRIAR (amb les boletes del popup), per a les partícules i per al pol·len.
const COLOR_OPTIONS = [
  { name: 'Blau',   rgb: [27, 111, 168],  css: 'rgb(27, 111, 168)' },
  { name: 'Cel',    rgb: [142, 202, 230], css: 'rgb(142, 202, 230)' },
  { name: 'Daurat', rgb: [201, 162, 39],  css: 'rgb(201, 162, 39)' },
  { name: 'Groc',   rgb: [244, 196, 48],  css: 'rgb(244, 196, 48)' },
  { name: 'Rosa',   rgb: [226, 84, 138],  css: 'rgb(226, 84, 138)' },
  { name: 'Verd',   rgb: [42, 157, 143],  css: 'rgb(42, 157, 143)' },
  { name: 'Lila',   rgb: [131, 56, 236],  css: 'rgb(131, 56, 236)' }
];

// Un color diferent per a cadascuna de les 12 posicions de la flor.
const HOUR_COLORS = [
  [230, 57, 70],  [244, 162, 97], [233, 196, 106], [42, 157, 143],
  [38, 70, 83],   [142, 202, 230], [33, 158, 188],  [2, 48, 71],
  [255, 183, 3],  [251, 133, 0],  [131, 56, 236],   [58, 134, 255]
];

// VARIABLES GLOBALS
const TITLE = "Pols del Temps";
const AUTHOR = "Queralt Borrell";

// Mida fixa del llenç
const CANVAS_W = 360;
const CANVAS_H = 590;
// Alçada de la part de dalt del popup on es dibuixa la flor.
const FLOWER_AREA_H = 240;

// Prefix per a totes les claus guardades, així no es barregen amb res més.
const KEY = 'polsDelTemps.';

// Valors per defecte dels ajustos (els que modifiquen els controls).
const DEFAULTS = {
  zoom: 1,
  particleCount: 10,
  particleSpeed: 1,
  particleColor: 0,
  pollenColor: 2,
  palette: 0,
  paused: false,
  showInfo: true
};

let settings = { ...DEFAULTS }; // ajustos actuals
let particleClock = 0;// "rellotge propi" del moviment de les partícules (ms);
let twinkleClock = 0;// "rellotge" del parpelleig (ms); s'atura amb les partícules
let customFont;
let ready = false;

// Elements del DOM que cal tornar a llegir/actualitzar després
let ui = {};
let lastInfoText = '';

// CONFIGURACIÓ INICIAL
async function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  noStroke();
  frameRate(30);

  // Posem el llenç dins del contenidor del popup.html.
  const holder = document.getElementById('canvas-holder');
  if (holder) holder.appendChild(document.querySelector('canvas'));

  // Si p5 ha arrencat, amaguem el missatge de "falta p5.min.js"
  const missing = document.getElementById('missing-p5');
  if (missing) missing.style.display = 'none';

  // RECUPERAR les dades guardades de la darrera vegada
  loadSavedData();

  buildUI();
  refreshUI();

 // En tancar el popup, Firefox el destrueix: guardem just abans.
  window.addEventListener('pagehide', saveAll);

  ready = true;

  // Carrega la font DESPRÉS de crear la interfície, així el popup es veu mentre es carrega.
  customFont = await loadFont('OpenSans.ttf');
  textFont(customFont);
}

// RECUPERAR (getItem): llegeix localStorage a través de p5.js
function loadSavedData() {
  for (const name in DEFAULTS) {
    const saved = getItem(KEY + name);
    // Només acceptem el valor si existeix i és del mateix tipus que el per defecte.
    if (saved !== null && saved !== undefined && typeof saved === typeof DEFAULTS[name]) {
      settings[name] = saved;
    }
  }

  const savedClock = getItem(KEY + 'particleClock');
  if (typeof savedClock === 'number') particleClock = savedClock;
}

// GUARDAR (storeItem): escriu a localStorage a través de p5.js
function saveAll() {
  for (const name in DEFAULTS) {
    storeItem(KEY + name, settings[name]);
  }
  storeItem(KEY + 'particleClock', particleClock);
}

// INTERFÍCIE (elements del DOM creats amb p5.js, estils a style.css)
function buildUI() {
  const box = select('#controls') || createDiv('').id('controls');

  // Text amb l'hora
  // Quan s'amaga es fa servir "visibility", així ocupa lloc igualment i res es mou.
  ui.info = createDiv('').class('info').parent(box);

  // Tres grups de controls: Flor, Partícules i Pol·len
  const flower = makeSection(box, 'Flor');
  ui.zoom = makeSlider(flower, 'Mida', 0.5, 1.2, 0.05, 'zoom');

  const particles = makeSection(box, 'Partícules');
  ui.count = makeSlider(particles, 'Quantitat', 0, 20, 1, 'particleCount');
  ui.speed = makeSlider(particles, 'Velocitat', 0.2, 3, 0.1, 'particleSpeed');
  ui.particleSwatches = makeSwatches(particles, 'Color', 'particleColor');

  const pollen = makeSection(box, 'Pol·len');
  ui.pollenSwatches = makeSwatches(pollen, 'Color', 'pollenColor');

  // Caselles
  const checks = createDiv('').class('checks').parent(box);

  ui.paused = createCheckbox(' Atura les partícules', settings.paused).parent(checks);
  ui.paused.changed(() => {
    settings.paused = ui.paused.checked();
    saveAll();
  });

  ui.showInfo = createCheckbox(' Amaga l\'hora', !settings.showInfo).parent(checks);
  ui.showInfo.changed(() => {
    settings.showInfo = !ui.showInfo.checked();
    refreshUI();
    saveAll();
  });

  // Botons
  const buttons = createDiv('').class('buttons').parent(box);

  ui.paletteBtn = createButton('').class('btn').parent(buttons);
  ui.paletteBtn.mousePressed(() => {
    settings.palette = (settings.palette + 1) % PALETTES.length;
    refreshUI();
    saveAll();
  });

  ui.resetBtn = createButton('Restableix').class('btn secondary').parent(buttons);
  ui.resetBtn.mousePressed(() => {
    settings = { ...DEFAULTS };
    refreshUI();
    saveAll();
  });
}

// Crea un grup amb títol (un quadre del panell) i en retorna el contenidor.
function makeSection(parentBox, title) {
  const panel = createDiv('').class('panel').parent(parentBox);
  createDiv(title).class('panel-title').parent(panel);
  return panel;
}

// Crea una fila amb boletes de colors. "name" és l'ajust que guarda el color triat.
function makeSwatches(parentBox, label, name) {
  const row = createDiv('').class('row colors').parent(parentBox);
  createSpan(label).class('label').parent(row);
  const swatchBox = createDiv('').class('swatches').parent(row);
  const list = COLOR_OPTIONS.map((c, i) => {
    const b = createButton('').class('swatch').parent(swatchBox);
    b.attribute('title', c.name);
    b.attribute('aria-label', label + ': ' + c.name);
    b.style('background', c.css);
    b.mousePressed(() => {
      settings[name] = i;
      refreshUI();
      saveAll();
    });
    return b;
  });
  return { list, name };
}

// Crea una fila "etiqueta + slider + valor". "name" és el nom de l'ajust que modifica.
function makeSlider(parentBox, label, min, max, step, name) {
  const row = createDiv('').class('row').parent(parentBox);
  createSpan(label).class('label').parent(row);
  const slider = createSlider(min, max, settings[name], step).parent(row);
  const valueText = createSpan('').class('value').parent(row);

  slider.input(() => {
    settings[name] = Number(slider.value());
    refreshUI();
    saveAll(); // guardem cada vegada que es mou el slider
  });
  return { slider, valueText, name };
}

// Posa tots els controls i el popup d'acord amb els ajustos actuals.
// Es crida a l'inici, després de cada canvi i en restablir.
function refreshUI() {
  // Sliders i el número del costat
  for (const control of [ui.zoom, ui.count, ui.speed]) {
    control.slider.value(settings[control.name]);
    control.valueText.html(settings[control.name]);
  }

  // Boletes de color: la triada queda marcada
  for (const group of [ui.particleSwatches, ui.pollenSwatches]) {
    group.list.forEach((b, i) => {
      b.elt.classList.toggle('on', i === settings[group.name]);
    });
  }

  // Caselles
  ui.paused.checked(settings.paused);
  ui.showInfo.checked(!settings.showInfo);

  // Paleta
  const p = PALETTES[settings.palette];
  ui.paletteBtn.html('Paleta: ' + p.name);
  document.body.classList.toggle('dark', p.name === 'Nit');
  // El fons de tot el popup té el mateix color que el llenç
  document.body.style.setProperty('--bg', `rgb(${p.bg[0]}, ${p.bg[1]}, ${p.bg[2]})`);

  // "visibility" manté l'espai, per això la resta del contingut no es mou
  ui.info.style('visibility', settings.showInfo ? 'visible' : 'hidden');
}

// BUCLE PRINCIPAL
function draw() {
  if (!ready) return;

  const h = hour();
  const m = minute();
  const s = second();
  const ms = millis() % 1000;

  // Versions "suavitzades" del temps (amb decimals) per animar sense salts.
  const smoothSecond = s + ms / 1000;
  const smoothMinute = m + smoothSecond / 60;

  const palette = PALETTES[settings.palette];
  background(palette.bg[0], palette.bg[1], palette.bg[2]);

  // Els rellotges de les partícules només avancen si no estan aturades.
  // particleClock és el que fa que l'animació "continuï" on era quan es reobre el popup.
  if (!settings.paused) {
    particleClock += deltaTime * settings.particleSpeed;
    twinkleClock += deltaTime;
  }

  // Colors triats amb les boletes
  const particleRGB = COLOR_OPTIONS[settings.particleColor].rgb;
  const pollenRGB = COLOR_OPTIONS[settings.pollenColor].rgb;

  push();
  translate(width / 2, FLOWER_AREA_H / 2); // la flor es dibuixa a la part de dalt del popup
  scale((min(width, FLOWER_AREA_H) / 560) * settings.zoom);

  drawMinuteSeeds(m, smoothSecond, pollenRGB);
  drawHourBloom(h, smoothMinute, smoothSecond, palette);
  drawParticles(particleRGB);

  pop();

  drawSignature(palette);
  updateInfo(h, m, s);

  // Guardem el rellotge del pol·len cada segon (30 fotogrames).
  if (frameCount % 30 === 0) storeItem(KEY + 'particleClock', particleClock);
}

function updateInfo(h, m, s) {
  const text = `${nf(h, 2)}:${nf(m, 2)}:${nf(s, 2)}`;
  if (text !== lastInfoText) {
    ui.info.html(text);
    lastInfoText = text;
  }
}

// FLORACIÓ: un pètal nou apareix i creix cada hora
function drawHourBloom(h, smoothMinute, smoothSecond, palette) {
  const slots = 12;
  const angleStep = TWO_PI / slots;
  const slot = h % 12;
  const growth = pow(constrain(smoothMinute / 60, 0, 1), 1.25);
  const pulse = 1 + 0.06 * sin(TWO_PI * (smoothSecond / 60));
  const maxPetalLength = 220;

  push();
  for (let i = 0; i <= slot; i++) {
    const petalAngle = -HALF_PI + i * angleStep;
    const isCurrent = (i === slot);
    const petalLength = isCurrent ? maxPetalLength * growth * pulse : maxPetalLength;
    const c = HOUR_COLORS[i];

    push();
    rotate(petalAngle);
    fill(c[0], c[1], c[2], isCurrent ? 235 : 200);
    ellipse(petalLength * 0.55, 0, petalLength, petalLength * 0.28);
    pop();
  }

  fill(palette.center[0], palette.center[1], palette.center[2], 240);
  ellipse(0, 0, 34, 34);
  pop();
}

// POL·LEN (les llavors): cada minut apareix una llavor.
function drawMinuteSeeds(m, smoothSecond, rgb) {
  const goldenAngle = radians(137);
  const growth = pow(constrain(smoothSecond / 60, 0, 1), 1.3);
  const maxSeedRadius = 8;

  for (let i = 0; i <= m; i++) {
    const isCurrent = (i === m);
    const distanceFromCenter = 24 * sqrt(i + 1);
    const seedAngle = i * goldenAngle;
    const x = cos(seedAngle) * distanceFromCenter;
    const y = sin(seedAngle) * distanceFromCenter;
    const seedRadius = isCurrent ? maxSeedRadius * growth : maxSeedRadius;

    fill(rgb[0], rgb[1], rgb[2], isCurrent ? 255 : 230);
    ellipse(x, y, seedRadius, seedRadius);
  }
}

// PARTÍCULES: punts amb moviment orgànic que espurnegen un cop per segon
function drawParticles(rgb) {
  const particleCount = settings.particleCount;
  // El moviment depèn del rellotge propi (particleClock).
  const wanderTime = particleClock * 0.00018;
  // El parpelleig també té rellotge propi: quan s'aturen les partícules, es queden quietes.
  const secondFraction = (twinkleClock % 1000) / 1000;
  const wanderRadius = 520;

  for (let i = 0; i < particleCount; i++) {
    const noiseX = noise(i * 11.3, wanderTime) - 0.5;
    const noiseY = noise(i * 11.3 + 50, wanderTime) - 0.5;
    const x = noiseX * wanderRadius;
    const y = noiseY * wanderRadius;

    const phaseOffset = i / particleCount;
    const twinkle = pow(sin(TWO_PI * (secondFraction + phaseOffset)) * 0.5 + 0.5, 3);
    const particleSize = lerp(3, 12, twinkle);
    const particleAlpha = lerp(60, 255, twinkle);

    fill(rgb[0], rgb[1], rgb[2], particleAlpha);
    ellipse(x, y, particleSize, particleSize);
  }
}

// AUTORIA: títol i nom, a dalt a l'esquerra
function drawSignature(palette) {
  push();
  textAlign(LEFT, TOP);
  noStroke();

  fill(palette.ink[0], palette.ink[1], palette.ink[2], 220);
  textSize(13);
  text(TITLE, 14, 12);

  fill(palette.ink[0], palette.ink[1], palette.ink[2], 150);
  textSize(10);
  text(AUTHOR, 14, 30);
  pop();
}
