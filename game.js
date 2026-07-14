// ==========================================================
// Doodle Jump — простой клон на чистом JS, БЕЗ canvas.
// Шарик и ступеньки — это обычные <div>, JS двигает их,
// меняя style.left / style.top. Вся физика — тот же принцип,
// что и раньше: гравитация + отскок от ступенек + "камера",
// которая на самом деле сдвигает ступеньки вниз, а не едет сама.
// ==========================================================

var world = document.getElementById('world');
var playerEl = document.getElementById('player');

// ---------- логический размер мира (не путать с размером на экране) ----------
var W = 480;
var H = 720;

// ---------- UI elements ----------
var scoreEl = document.getElementById('score');
var finalScoreEl = document.getElementById('final-score');
var startScreen = document.getElementById('start-screen');
var gameOverScreen = document.getElementById('game-over-screen');
var startBtn = document.getElementById('start-btn');
var restartBtn = document.getElementById('restart-btn');
var touchLeft = document.getElementById('touch-left');
var touchRight = document.getElementById('touch-right');

// ---------- масштабирование мира под размер экрана ----------
function fitWorldToScreen() {
  var scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  world.style.transform = 'scale(' + scale + ')';
}
fitWorldToScreen();
window.addEventListener('resize', fitWorldToScreen);

// ---------- Game constants ----------
var GRAVITY = 0.35;
var JUMP_VELOCITY = -13.5;   // сила прыжка
var MOVE_SPEED = 4.5;
var PLATFORM_WIDTH = 70;
var PLATFORM_HEIGHT = 14;
var PLATFORM_GAP_MIN = 70;   // вертикальное расстояние между ступеньками
var PLATFORM_GAP_MAX = 130;
var MAX_HORIZONTAL_STEP = 160; // максимальный сдвиг по X между соседними ступеньками

// ---------- Game state ----------
var player;
var platforms; // массив { x, y, width, height, el }
var score;
var running;
var keys;

function initGame() {
  player = {
    x: W / 2 - 18,
    y: H - 120,
    width: 36,
    height: 36,
    vy: JUMP_VELOCITY,
    vx: 0
  };

  // убрать старые ступеньки из DOM, если это рестарт
  if (platforms) {
    for (var i = 0; i < platforms.length; i++) {
      platforms[i].el.remove();
    }
  }
  platforms = [];
  score = 0;
  running = true;

  // стартовая ступенька прямо под игроком
  var startX = W / 2 - PLATFORM_WIDTH / 2;
  platforms.push(createPlatform(startX, H - 60));

  // заполняем экран ступеньками вверх, каждая следующая — в пределах допрыга от предыдущей
  var y = H - 60;
  var prevX = startX;
  while (y > -H) {
    y -= randRange(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
    var x = nextReachableX(prevX);
    platforms.push(createPlatform(x, y));
    prevX = x;
  }

  finalScoreEl.textContent = '0';
  scoreEl.textContent = '0';
}

function randRange(min, max) {
  return Math.random() * (max - min) + min;
}

// создаёт объект платформы и сразу вешает под неё DOM-элемент
function createPlatform(x, y) {
  var el = document.createElement('div');
  el.className = 'platform';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  world.appendChild(el);
  return { x: x, y: y, width: PLATFORM_WIDTH, height: PLATFORM_HEIGHT, el: el };
}

// выбираем X для новой ступеньки не дальше MAX_HORIZONTAL_STEP от предыдущей —
// так гарантируем, что до неё всегда можно допрыгнуть
function nextReachableX(prevX) {
  var min = Math.max(0, prevX - MAX_HORIZONTAL_STEP);
  var max = Math.min(W - PLATFORM_WIDTH, prevX + MAX_HORIZONTAL_STEP);
  return randRange(min, max);
}

function getTopPlatform() {
  var top = null;
  for (var i = 0; i < platforms.length; i++) {
    if (top === null || platforms[i].y < top.y) top = platforms[i];
  }
  return top;
}

// ---------- Input ----------
keys = { left: false, right: false };

function onKeyDown(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = true;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = true;
}

function onKeyUp(e) {
  if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
  if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
}

document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);

function bindTouchZone(el, direction) {
  function start(e) {
    e.preventDefault();
    keys[direction] = true;
  }
  function end(e) {
    e.preventDefault();
    keys[direction] = false;
  }
  el.addEventListener('touchstart', start, { passive: false });
  el.addEventListener('touchend', end, { passive: false });
  el.addEventListener('touchcancel', end, { passive: false });
  // мышь — чтобы можно было потыкать зоны и на компьютере
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', end);
  el.addEventListener('mouseleave', end);
}

bindTouchZone(touchLeft, 'left');
bindTouchZone(touchRight, 'right');

// ---------- Update (физика) ----------
function update() {
  // горизонтальное движение
  if (keys.left) {
    player.vx = -MOVE_SPEED;
  } else if (keys.right) {
    player.vx = MOVE_SPEED;
  } else {
    player.vx = 0;
  }

  player.x += player.vx;

  // выход за один край экрана — появление с другого (как в оригинальной игре)
  if (player.x + player.width < 0) player.x = W;
  if (player.x > W) player.x = -player.width;

  // вертикальное движение
  player.vy += GRAVITY;
  player.y += player.vy;

  // столкновение со ступеньками — только когда падаем вниз
  if (player.vy > 0) {
    for (var i = 0; i < platforms.length; i++) {
      var p = platforms[i];
      var withinX = player.x + player.width > p.x && player.x < p.x + p.width;
      var wasAbove = player.y + player.height - player.vy <= p.y;
      var nowTouching = player.y + player.height >= p.y && player.y + player.height <= p.y + p.height + player.vy;
      if (withinX && wasAbove && nowTouching) {
        player.vy = JUMP_VELOCITY;
      }
    }
  }

  // "камера": игрок никогда не поднимается выше середины экрана —
  // вместо этого мы сдвигаем все ступеньки вниз на ту же величину
  var scrollThreshold = H / 2;
  if (player.y < scrollThreshold) {
    var diff = scrollThreshold - player.y;
    player.y = scrollThreshold;
    score += Math.round(diff);

    for (var j = 0; j < platforms.length; j++) {
      platforms[j].y += diff;
      platforms[j].el.style.top = platforms[j].y + 'px';
    }

    // убираем ступеньки, ушедшие за нижний край экрана
    var kept = [];
    for (var k = 0; k < platforms.length; k++) {
      if (platforms[k].y < H) {
        kept.push(platforms[k]);
      } else {
        platforms[k].el.remove();
      }
    }
    platforms = kept;

    // добавляем новые ступеньки сверху
    var topPlatform = getTopPlatform();
    var highestY = topPlatform ? topPlatform.y : 0;
    var prevX = topPlatform ? topPlatform.x : W / 2 - PLATFORM_WIDTH / 2;
    while (highestY > -PLATFORM_GAP_MAX) {
      highestY -= randRange(PLATFORM_GAP_MIN, PLATFORM_GAP_MAX);
      var newX = nextReachableX(prevX);
      platforms.push(createPlatform(newX, highestY));
      prevX = newX;
    }
  }

  scoreEl.textContent = score;

  // Game over: игрок упал ниже видимой области
  if (player.y > H) {
    endGame();
  }
}

// ---------- Draw (просто переносим координаты игрока в style) ----------
function draw() {
  playerEl.style.left = player.x + 'px';
  playerEl.style.top = player.y + 'px';
}

// ---------- Game loop ----------
function loop() {
  if (!running) return;
  update();
  draw();
  requestAnimationFrame(loop);
}

function endGame() {
  running = false;
  finalScoreEl.textContent = score;
  gameOverScreen.classList.remove('hidden');
}

function startGame() {
  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');
  initGame();
  draw();
  loop();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
