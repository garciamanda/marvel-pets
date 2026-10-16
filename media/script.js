console.log('🕷️ [7] script.js carregado! StateMachine + Balão de fala');

const pet = document.getElementById('pet');
function ensureBubble() {
  let el = document.getElementById('speech-bubble');
  console.log('🕷️ [B2] Elemento bubble encontrado:', !!el);
  if (el) {
    return el;
  }
  console.warn('🕷️ [B2] #speech-bubble AUSENTE no HTML -> criando dinamicamente');
  el = document.createElement('div');
  el.id = 'speech-bubble';
  el.className = 'is-hidden';
  const container = document.getElementById('game-container') || document.body;
  container.appendChild(el);
  return el;
}

const bubble = ensureBubble();

const FRAME_SIZE = 32;
const STATE_CHANGE_INTERVAL = 5000;
const BALLOON_DURATION = 3000;
const DEFAULT_BUBBLE_GAP = 12;

const gameContainer = document.getElementById('game-container') || document.body;

function petRect() {
  return pet.getBoundingClientRect();
}

function petSize() {
  const width = petRect().width;
  return width > 0 ? width : FRAME_SIZE;
}

function containerRect() {
  return gameContainer.getBoundingClientRect
    ? gameContainer.getBoundingClientRect()
    : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight, bottom: window.innerHeight };
}

function applySpriteSize() {
  const def = petState.def;
  const size = petSize();
  pet.style.backgroundSize = `${(def ? def.frameCount : 1) * size}px ${size}px`;
}

const STATES = ['idle', 'walk', 'run', 'swing', 'sleep', 'talk'];

const PHRASES = [
  'Com grandes poderes vêm grandes responsabilidades!',
  'Thwip!',
  'Hora do lanche!',
  'Mais um dia salvando Nova York...',
  'Cuidado, tem teia solta aqui!',
  'O espider-sense não falha!',
  'Uma fatia de pizza resolve tudo.',
  'Comigo ninguém se mete!',
  'Às vezes você tem que derrubar pra levantar.',
  'Com espada ou teia, eu dou conta!',
  'Descanso é importante até pra herói.',
  'Tocar a cabeça é com o tio Ben.'
];

function uriFor(key, guess) {
  const uris = window.SPRITE_URIS || {};
  const uri = uris[key];
  if (typeof uri === 'string' && uri && !uri.includes('{{')) {
    return uri;
  }
  if (key === 'idle' && typeof window.IDLE_URI === 'string' && !window.IDLE_URI.includes('{{')) {
    return window.IDLE_URI;
  }
  if (key === 'walk' && typeof window.WALK_URI === 'string' && !window.WALK_URI.includes('{{')) {
    return window.WALK_URI;
  }
  return guess;
}

const SPRITE_DEFS = {
  idle: {
    uri: uriFor('idle', 'idle_1.png'),
    fallback: null,
    frameCount: 1,
    moving: false,
    speed: 0,
    frameMs: 200
  },
  walk: {
    uri: uriFor('walk', 'walk_sheet.png'),
    fallback: null,
    frameCount: 10,
    moving: true,
    speed: 3,
    frameMs: 100
  },
  run: {
    uri: uriFor('run', 'run_sheet.png'),
    fallback: 'walk',
    frameCount: 10,
    moving: true,
    speed: 9,
    frameMs: 70
  },
  swing: {
    uri: uriFor('swing', 'swing_sheet.png'),
    fallback: 'walk',
    frameCount: 10,
    moving: false,
    speed: 0,
    frameMs: 90
  },
  sleep: {
    uri: uriFor('sleep', 'sleep_sheet.png'),
    fallback: 'idle',
    frameCount: 10,
    moving: false,
    speed: 0,
    frameMs: 100
  },
  talk: {
    uri: uriFor('talk', 'talk_sheet.png'),
    fallback: 'idle',
    frameCount: 10,
    moving: false,
    speed: 0,
    frameMs: 100
  }
};

function probeImage(uri) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        ok: true,
        frameCount: Math.max(1, Math.round((img.naturalWidth || FRAME_SIZE) / FRAME_SIZE))
      });
    img.onerror = () => resolve({ ok: false, frameCount: null });
    img.src = uri;
  });
}

function resolveAsset(name) {
  let def = SPRITE_DEFS[name] || SPRITE_DEFS.idle;
  const visited = new Set();
  while (def.ok === false && def.fallback && !visited.has(def.fallback)) {
    visited.add(def.fallback);
    def = SPRITE_DEFS[def.fallback] || SPRITE_DEFS.idle;
  }
  return def;
}

function stateDef(name) {
  const own = SPRITE_DEFS[name] || SPRITE_DEFS.idle;
  const asset = resolveAsset(name);
  return {
    name,
    uri: asset.uri,
    frameCount: asset.detectedFrames || asset.frameCount,
    assetFrom: asset === own ? name : own.fallback,
    moving: own.moving,
    speed: own.speed,
    frameMs: own.frameMs
  };
}

async function resolveSprites() {
  const entries = Object.entries(SPRITE_DEFS);
  const results = await Promise.all(entries.map(([, def]) => probeImage(def.uri)));
  entries.forEach(([name, def], index) => {
    def.ok = results[index].ok;
    def.detectedFrames = results[index].frameCount;
    if (!def.ok && def.fallback) {
      console.log(`🕷️ sprite "${name}" ausente (${def.uri}) -> usando fallback "${def.fallback}"`);
    }
  });
}

const petState = {
  name: null,
  def: null,
  frame: 0,
  offsetX: 0,
  direction: Math.random() < 0.5 ? -1 : 1,
  frameTimer: null,
  moveTimer: null,
  bubbleTimer: null
};

function bubbleGap() {
  if (bubble && typeof getComputedStyle === 'function') {
    const cs = getComputedStyle(bubble);
    if (cs && typeof cs.getPropertyValue === 'function') {
      const value = parseFloat(cs.getPropertyValue('--bubble-gap'));
      if (isFinite(value) && value > 0) {
        return Math.round(value);
      }
    }
  }
  return DEFAULT_BUBBLE_GAP;
}

const TAIL_FALLBACK = 10;

function tailExtension() {
  if (!bubble || typeof getComputedStyle !== 'function') {
    return TAIL_FALLBACK;
  }
  const cs = getComputedStyle(bubble, '::before');
  const h = parseFloat(cs && cs.height);
  if (!isFinite(h) || h <= 0) {
    return TAIL_FALLBACK;
  }
  const bottom = parseFloat(cs && cs.bottom);
  const below = isFinite(bottom) ? Math.abs(Math.min(bottom, 0)) : h * 0.5;
  return Math.round(below + h * 0.207);
}

const BUBBLE_SIDE_CLASSES = ['bubble-center', 'bubble-left', 'bubble-right'];

function setBubbleSide(side) {
  if (!bubble) {
    return;
  }
  BUBBLE_SIDE_CLASSES.forEach((cls) => bubble.classList.remove(cls));
  bubble.classList.add(`bubble-${side}`);
  bubble.dataset.side = side;
}

function positionBubble() {
  if (!bubble) {
    return;
  }
  const petR = petRect();
  const contR = containerRect();
  const bubbleW = bubble.offsetWidth;
  const bubbleH = bubble.offsetHeight;
  const gap = bubbleGap();
  const edge = 4;

  const petCenterX = petR.left - contR.left + petR.width / 2;
  let leftEdge = petCenterX - bubbleW / 2;
  let side = 'center';

  if (leftEdge + bubbleW > contR.width - edge) {
    side = 'left'; // estoura a direita -> balao vai para a ESQUERDA do pet
    leftEdge = petR.left - contR.left - bubbleW - edge;
  }
  if (side === 'center' && leftEdge < edge) {
    side = 'right'; // estoura a esquerda -> balao vai para a DIREITA do pet
    leftEdge = petR.right - contR.left + edge;
  }
  // clamp de seguranca: nunca sai da tela
  leftEdge = Math.min(Math.max(leftEdge, edge), Math.max(edge, contR.width - bubbleW - edge));

  setBubbleSide(side);
  bubble.style.left = `${Math.round(leftEdge + bubbleW / 2)}px`;

  // folga configurada em --bubble-gap (padrao 12px) entre a base do balao e a cabeca
  let bottomPx = contR.bottom - petR.top + gap;
  const maxBottom = Math.max(0, contR.height - bubbleH - 4);
  bottomPx = Math.min(Math.max(gap, bottomPx), maxBottom);
  bubble.style.bottom = `${Math.round(bottomPx)}px`;
  bubble.dataset.gap = String(gap);
  bubble.dataset.tail = String(tailExtension());
}

function applyTransform() {
  const mirror = petState.direction === -1 ? ' scaleX(-1)' : ' scaleX(1)';
  pet.style.transform = `translateX(calc(-50% + ${petState.offsetX}px))${mirror}`;
  positionBubble();
}

function animateFrames() {
  const def = petState.def;
  if (!def || def.frameCount <= 1) {
    return;
  }
  petState.frame = (petState.frame + 1) % def.frameCount;
  pet.style.backgroundPosition = `${-petState.frame * petSize()}px 0`;
}

function movePet() {
  const def = petState.def;
  if (!def || !def.moving) {
    return;
  }
  const contR = containerRect();
  const limit = Math.max(0, contR.width / 2 - petSize() / 2);
  petState.offsetX += petState.direction * def.speed;

  if (petState.offsetX >= limit) {
    petState.offsetX = limit;
    petState.direction = -1;
  } else if (petState.offsetX <= -limit) {
    petState.offsetX = -limit;
    petState.direction = 1;
  }

  applyTransform();
}

function showBubble(phraseOverride) {
  if (!bubble) {
    console.log('🕷️ [B2] Elemento bubble encontrado:', !!bubble, '-> ABORTADO');
    return;
  }
  const phrase =
    typeof phraseOverride === 'string' && phraseOverride.trim()
      ? phraseOverride
      : PHRASES[Math.floor(Math.random() * PHRASES.length)];
  console.log('🕷️ [B1] showBubble chamado com frase:', phrase);
  console.log('🕷️ [B2] Elemento bubble encontrado:', !!bubble);
  bubble.textContent = phrase;
  bubble.classList.remove('is-hidden');
  console.log('🕷️ [B3] Classe is-hidden removida');
  // reflow sincrono: garante que o navegador "veja" o estado sem is-hidden
  // ANTES de aplicar is-visible, permitindo reiniciar a animacao bubble-pop
  void bubble.offsetWidth;
  bubble.classList.add('is-visible');
  console.log('🕷️ [B8] classes após show:', bubble.className);
  positionBubble();
  clearTimeout(petState.bubbleTimer);
  petState.bubbleTimer = setTimeout(hideBubble, BALLOON_DURATION);
  reportBubbleStyles('apos-show');
  // a animacao dura 0.2s (0% = opacity 0); log tardio prova que termina visivel
  setTimeout(() => {
    if (bubble && !bubble.classList.contains('is-hidden')) {
      const cs = getComputedStyle(bubble);
      console.log(`🕷️ [B9] opacity/visibility: ${cs.opacity} ${cs.visibility}`);
    }
  }, 250);
}

function reportBubbleStyles(tag) {
  if (!bubble) {
    return;
  }
  const cs = getComputedStyle(bubble);
  const rect = bubble.getBoundingClientRect();
  const contR = containerRect();
  const inside =
    rect.left >= contR.left - 1 &&
    rect.right <= contR.right + 1 &&
    rect.top >= contR.top - 1;
  console.log(
    `🕷️ [B7:${tag}] opacity=${cs.opacity} visibility=${cs.visibility} display=${cs.display} z=${cs.zIndex} left=${bubble.style.left} bottom=${bubble.style.bottom} gap=${bubble.dataset.gap}px tail=${bubble.dataset.tail}px rect=${Math.round(rect.left)},${Math.round(rect.top)} ${Math.round(rect.width)}x${Math.round(rect.height)} na-tela=${inside} pet=${Math.round(petSize())}px texto="${bubble.textContent}"`
  );
}

function hideBubble() {
  console.log('🕷️ [B4] hideBubble chamado');
  clearTimeout(petState.bubbleTimer);
  petState.bubbleTimer = null;
  if (!bubble) {
    return;
  }
  bubble.classList.add('is-hidden');
  bubble.classList.remove('is-visible');
  reportBubbleStyles('apos-hide');
}

function enterState(name) {
  const def = stateDef(name);
  petState.name = name;
  petState.def = def;
  petState.frame = 0;

  pet.style.backgroundImage = `url("${def.uri}")`;
  pet.style.backgroundPosition = '0 0';
  applySpriteSize();

  if (def.moving) {
    petState.direction = Math.random() < 0.5 ? -1 : 1;
    applyTransform();
    petState.moveTimer = setInterval(movePet, def.frameMs);
  }

  if (def.frameCount > 1) {
    petState.frameTimer = setInterval(animateFrames, def.frameMs);
  }

  if (name === 'talk') {
    console.log('🕷️ [B5] Estado talk entrou no onEnter');
    applyTransform();
    showBubble();
  }

  console.log(
    `🕷️ estado -> ${name} (sprite: ${def.uri}${def.assetFrom !== name ? `, fallback: ${def.assetFrom}` : ''}, frames: ${def.frameCount}, moving: ${def.moving})`
  );
}

function exitState(name) {
  clearInterval(petState.frameTimer);
  clearInterval(petState.moveTimer);
  petState.frameTimer = null;
  petState.moveTimer = null;

  if (name === 'talk' || petState.bubbleTimer) {
    hideBubble();
  }
}

class StateMachine {
  constructor({ states, interval, onEnter, onExit, initialState }) {
    this.states = states;
    this.interval = interval;
    this.onEnter = onEnter;
    this.onExit = onExit;
    this.initialState = initialState || states[0];
    this.current = null;
    this.timer = null;
  }

  pickRandom() {
    const options = this.states.filter((state) => state !== this.current);
    const pool = options.length > 0 ? options : this.states;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  setState(name) {
    if (!this.states.includes(name)) {
      console.warn(`🕷️ estado desconhecido: ${name}`);
      return;
    }
    if (this.current === name) {
      return;
    }
    if (this.current) {
      this.onExit(this.current);
    }
    this.current = name;
    this.onEnter(name);
  }

  transition() {
    this.setState(this.pickRandom());
  }

  start() {
    this.setState(this.initialState);
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = setInterval(() => this.transition(), this.interval);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    if (this.current) {
      this.onExit(this.current);
      this.current = null;
    }
  }
}

const stateMachine = new StateMachine({
  states: STATES,
  interval: STATE_CHANGE_INTERVAL,
  onEnter: enterState,
  onExit: exitState,
  initialState: 'idle'
});

let debugReturnTimer = null;

applyTransform();

const startOnce = (() => {
  let started = false;
  return (label) => {
    if (started) {
      return;
    }
    started = true;
    console.log(`🕷️ [B0] StateMachine iniciado via ${label} (estado atual: ${stateMachine.current})`);
    reportBubbleStyles('startup');
    stateMachine.start();
  };
})();

resolveSprites().then(() => startOnce('resolveSprites'));
setTimeout(() => startOnce('timeout-2s'), 2000);

window.addEventListener('resize', () => {
  applySpriteSize();
  pet.style.backgroundPosition = `${-petState.frame * petSize()}px 0`;
  applyTransform();
  if (petState.bubbleTimer) {
    positionBubble();
  }
  reportBubbleStyles('resize');
});

// API de depuracao no ESCOPO GLOBAL (top-level do script, sem IIFE/modulo),
// para ser lida como window.__petDebug / __petDebug no Console do DevTools
// (dentro do iframe do webview — veja o log [B0] ao final).
window.__petDebug = {
  stateMachine,
  petState,
  bubble,
  PHRASES,
  petSize,
  positionBubble,
  applySpriteSize,
  bubbleGap,
  tailExtension,
  showBubble,
  hideBubble,
  reportBubbleStyles,
  // forca o estado talk (com frase opcional) e volta ao anterior em 3s
  forceTalk: (phrase) => {
    const previous = stateMachine.current;
    stateMachine.setState('talk');
    if (typeof phrase === 'string' && phrase.trim()) {
      showBubble(phrase);
    }
    clearTimeout(debugReturnTimer);
    debugReturnTimer = setTimeout(() => {
      if (stateMachine.current === 'talk') {
        stateMachine.setState(previous && previous !== 'talk' ? previous : 'idle');
      }
    }, BALLOON_DURATION);
    return stateMachine.current;
  },
  // forca qualquer estado da StateMachine: idle | walk | run | swing | sleep | talk
  forceState: (stateName) => {
    if (!STATES.includes(stateName)) {
      console.warn(`🕷️ forceState: estado inválido "${stateName}". Válidos: ${STATES.join(', ')}`);
      return stateMachine.current;
    }
    clearTimeout(debugReturnTimer);
    stateMachine.setState(stateName);
    return stateMachine.current;
  },
  // modo debug visual: contorno do balao + guias da área segura da tela
  toggleDebug: (on) => {
    const enable =
      typeof on === 'boolean' ? on : !bubble.classList.contains('debug-outline');
    bubble.classList.toggle('debug-outline', enable);
    gameContainer.classList.toggle('debug-guides', enable);
    reportBubbleStyles('debug-toggle');
    return enable;
  },
  checkBubble: () => {
    const el = document.getElementById('speech-bubble');
    const cs = el ? getComputedStyle(el) : null;
    return {
      existe: !!el,
      texto: el && el.textContent,
      isHidden: el && el.classList.contains('is-hidden'),
      isVisibleClass: el && el.classList.contains('is-visible'),
      side: el && el.dataset.side,
      opacity: cs && cs.opacity,
      visibility: cs && cs.visibility,
      display: cs && cs.display,
      z: cs && cs.zIndex,
      rect: el && el.getBoundingClientRect(),
      estadoAtual: stateMachine.current
    };
  }
};
console.log(
  '🕷️ [B0] debug API exposta em window.__petDebug. No DevTools, selecione o iframe do webview ' +
    '(dropdown "top" no canto superior esquerdo do Console -> item com vscode-webview://) antes de digitar __petDebug.forceTalk()'
);
