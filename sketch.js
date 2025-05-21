// ———— 全局参数配置 ————
let textLines = ` 
文字从页面中缓缓浮现，漂浮起来。
熟悉的字符仿佛变得陌生，总是逃脱视线；
你尝试抓住它们，却又无可奈何地任其流逝。
这种瞬间的迷茫，或许正是他们日常经历的阅读困境。
此刻，我们希望通过动态视觉效果，让你感同身受，
更理解并关注阅读障碍者的文字世界。
`.trim().split('\n');

let chars = [];
let fontSize         = 36;
let lineSpacing      = 60;
let margin           = 40;
let charSpacing      = fontSize * 1.0;
let currentCharIndex = 0;
let allTextDisplayed = false;

// ———— 运动参数（可调节） ————
let floatSpeed       = 15;    // 【偏移速度倍率】每帧偏移增量 = 基础速度 × floatSpeed
let floatAmount      = 25;    // 【最大偏移幅度】当偏移量超过此值时，速度反向
let returnToHomeSpeed= 0.1;   // 【归位插值速度】鼠标悬停时，文字回归原位的 lerp 速度

let LOCK_DELAY       = 3000;
let RESET_DELAY      = 20000;

let hoveredLine    = -1;
let touchedLine    = -1;
let touchStartTime = 0;

let lineLockTimers = [];
let lineLocked     = [];
let allLockedTimer = 0;

let totalLines     = 0;    

let myFont;

function preload() {
  myFont = loadFont('JianHeSans-Optimized(1).ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont(myFont);
  textSize(fontSize);
  textLeading(lineSpacing);
  frameRate(60);
  initStateAndLayout();
}

function initStateAndLayout() {
  chars = [];
  currentCharIndex = 0;
  allTextDisplayed  = false;
  allLockedTimer    = 0;
  lineLockTimers    = [];
  lineLocked        = [];
  initializeCharLayout();
}

function initializeCharLayout() {
  let x = margin;
  let displayLine = 0;
  let temp = [];

  for (let para of textLines) {
    for (let ch of para) {
      if (ch === ' ' || ch === '\u3000') {
        x += charSpacing;
        continue;
      }
      if (x + charSpacing > width - margin) {
        displayLine++;
        x = margin;
      }
      temp.push({ char: ch, line: displayLine, xOff: x });
      x += charSpacing;
    }
    displayLine++;
    x = margin;
  }

  totalLines = displayLine;
  let blockHeight = totalLines * lineSpacing;
  let startY = (height - blockHeight) / 2 + fontSize;

  for (let i = 0; i < totalLines; i++) {
    lineLockTimers[i] = 0;
    lineLocked[i]     = false;
  }

  for (let obj of temp) {
    chars.push({
      char: obj.char,
      homeX: obj.xOff,
      homeY: startY + obj.line * lineSpacing,
      x: obj.xOff,
      y: startY + obj.line * lineSpacing,
      line: obj.line,
      isVisible: false,
      floatOffsetX: 0,
      floatOffsetY: 0,
      floatSpeedX: random(-0.1, 0.1),
      floatSpeedY: random(-0.1, 0.1),
      isLocked: false
    });
  }
}

function draw() {
  background(0);
  detectHoveredLine();
  updateLockTimers();

  if (!allTextDisplayed) {
    displayTextProgressively();
  } else if (allLockedTimer === 0) {
    allLockedTimer = millis();
  }

  handleFloatingEffects();
  checkForGlobalReset();
  drawAllChars();
}

function displayTextProgressively() {
  if (currentCharIndex < chars.length) {
    chars[currentCharIndex].isVisible = true;
    currentCharIndex++;
  } else {
    allTextDisplayed = true;
  }
}

function detectHoveredLine() {
  hoveredLine = -1;
  if (!allTextDisplayed) return;
  let startY = (height - totalLines * lineSpacing) / 2 + fontSize;
  let halfH = (textAscent() + textDescent()) / 2;
  for (let i = 0; i < totalLines; i++) {
    let baselineY = startY + i * lineSpacing;
    if (mouseY >= baselineY - halfH && mouseY <= baselineY + halfH) {
      hoveredLine = i;
      break;
    }
  }
}

function updateLockTimers() {
  if (!allTextDisplayed) return;

  if (hoveredLine >= 0 && !lineLocked[hoveredLine]) {
    lineLockTimers[hoveredLine] += deltaTime;
    if (lineLockTimers[hoveredLine] >= LOCK_DELAY) {
      lockLine(hoveredLine);
    }
  } else {
    for (let i = 0; i < lineLockTimers.length; i++) {
      if (i !== hoveredLine && !lineLocked[i]) {
        lineLockTimers[i] = 0;
      }
    }
  }

  if (touchedLine >= 0 && !lineLocked[touchedLine] &&
      millis() - touchStartTime >= LOCK_DELAY) {
    lockLine(touchedLine);
  }
}

function lockLine(line) {
  lineLocked[line] = true;
  chars.forEach(c => {
    if (c.line === line) {
      c.isLocked     = true;
      c.floatOffsetX = 0;
      c.floatOffsetY = 0;
      c.floatSpeedX  = 0;
      c.floatSpeedY  = 0;    
    }
  });
}

function checkForGlobalReset() {
  if (millis() - allLockedTimer > RESET_DELAY) {
    resetAllLines();
    allLockedTimer = millis();
  }
}

function resetAllLines() {
  for (let i = 0; i < lineLocked.length; i++) {
    lineLocked[i]     = false;
    lineLockTimers[i] = 0;
  }
  chars.forEach(c => {
    if (!c.isLocked) {
      c.floatSpeedX = random(-0.1, 0.1);
      c.floatSpeedY = random(-0.1, 0.1);
    }
  });
}

function handleFloatingEffects() {
  if (!allTextDisplayed) return;
  chars.forEach(c => {
    if (!c.isVisible) return;
    if (c.isLocked) {
      c.x = c.homeX; c.y = c.homeY;
    } else if (hoveredLine === c.line) {
      c.floatOffsetX = lerp(c.floatOffsetX, 0, returnToHomeSpeed);
      c.floatOffsetY = lerp(c.floatOffsetY, 0, returnToHomeSpeed);
      c.x = c.homeX + c.floatOffsetX;
      c.y = c.homeY + c.floatOffsetY;
    } else {
      c.floatOffsetX += c.floatSpeedX * floatSpeed;
      c.floatOffsetY += c.floatSpeedY * floatSpeed;
      if (abs(c.floatOffsetX) > floatAmount) c.floatSpeedX *= -1;
      if (abs(c.floatOffsetY) > floatAmount) c.floatSpeedY *= -1;
      c.x = c.homeX + c.floatOffsetX;
      c.y = c.homeY + c.floatOffsetY;
    }
  });
}

function drawAllChars() {
  fill(255);
  noStroke();
  chars.forEach(c => {
    if (c.isVisible) text(c.char, c.x, c.y);
  });
}

function touchStarted() {
  if (!allTextDisplayed) return false;
  let startY = (height - totalLines * lineSpacing) / 2 + fontSize;
  let halfH = (textAscent() + textDescent()) / 2;
  for (let i = 0; i < totalLines; i++) {
    let baselineY = startY + i * lineSpacing;
    if (touchY >= baselineY - halfH && touchY <= baselineY + halfH) {
      touchedLine    = i;
      touchStartTime = millis();
      break;
    }
  }
  return false;
}

function touchEnded() {
  touchedLine    = -1;
  touchStartTime = 0;
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initStateAndLayout();
}