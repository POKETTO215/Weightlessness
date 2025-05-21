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
let currentCharIndex = 0;
let allTextDisplayed = false;

// ———— 运动参数（可调节） ————
let floatSpeed        = 15;   // 漂浮速度倍率
let floatAmount       = 25;   // 最大偏移幅度
let returnToHomeSpeed = 0.1;  // 回归插值速度

let LOCK_DELAY  = 800;
let RESET_DELAY = 10000;

let hoveredLine    = -1;
let touchedLine    = -1;
let touchStartTime = 0;

let lineLockTimers = [];
let lineLocked     = [];
let allLockedTimer = 0;

let totalLines = 0;

let myFont;

function preload() {
  myFont = loadFont('JianHeSans-Optimized.ttf');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont(myFont);
  frameRate(60);
  initLayout();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initLayout();
}

function initLayout() {
  chars = [];
  currentCharIndex = 0;
  allTextDisplayed = false;
  allLockedTimer = 0;

  // —— 动态计算字号、行距、初始字距 ——
  let baseSize    = min(windowWidth, windowHeight) / 40;
  let fontSize    = max(20, baseSize);
  let lineSpacing = fontSize * 1.2;
  let charSpacing = fontSize * 1.2;

  textSize(fontSize);
  textLeading(lineSpacing);
  textAlign(CENTER, CENTER);

  // —— 响应式边距 ——
  let marginX = width * 0.10;
  let marginY = height * 0.10;
  let availW   = width - marginX * 2;
  let availH   = height - marginY * 2;

  // —— 计算换行及垂直居中起始 Y ——
  let temp = [];
  let x = marginX;
  let displayLine = 0;

  // 按字符布局并自动换行
  for (let line of textLines) {
    for (let ch of line) {
      if (ch === ' ' || ch === '\u3000') {
        x += charSpacing;
        continue;
      }
      if (x + charSpacing > marginX + availW) {
        displayLine++;
        x = marginX;
      }
      temp.push({ char: ch, line: displayLine, xOff: x });
      x += charSpacing;
    }
    displayLine++;
    x = marginX;
  }

  totalLines = displayLine;
  let blockHeight = totalLines * lineSpacing;
  // 垂直居中起点
  let startY = marginY + (availH - blockHeight) / 2 + fontSize / 2;

  // 初始化锁定状态
  for (let i = 0; i < totalLines; i++) {
    lineLockTimers[i] = 0;
    lineLocked[i]     = false;
  }

  // 构建 chars 数组
  for (let obj of temp) {
    let x0 = obj.xOff;
    let y0 = startY + obj.line * lineSpacing;
    chars.push({
      char: obj.char,
      homeX: x0,
      homeY: y0,
      x: x0,
      y: y0,
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
    chars[currentCharIndex].isVisible = true;
    currentCharIndex = min(currentCharIndex + 1, chars.length);
    if (currentCharIndex === chars.length) allTextDisplayed = true;
  } else if (allLockedTimer === 0) {
    allLockedTimer = millis();
  }

  // 漂浮及回归
  for (let c of chars) {
    if (!c.isVisible) continue;
    if (c.isLocked) {
      c.x = c.homeX;
      c.y = c.homeY;
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
  }

  // 全部重置
  if (allTextDisplayed && millis() - allLockedTimer > RESET_DELAY) {
    for (let i = 0; i < totalLines; i++) {
      lineLocked[i] = false;
      lineLockTimers[i] = 0;
    }
    chars.forEach(c => {
      if (!c.isLocked) {
        c.floatSpeedX = random(-0.1, 0.1);
        c.floatSpeedY = random(-0.1, 0.1);
      }
    });
    allLockedTimer = millis();
  }

  // 绘制文本
  fill(255);
  noStroke();
  for (let c of chars) {
    if (c.isVisible) text(c.char, c.x, c.y);
  }
}

function detectHoveredLine() {
  hoveredLine = -1;
  if (!allTextDisplayed) return;
  let marginY = height * 0.10;
  let availH  = height - marginY * 2;
  let lineSpacing = textLeading();
  let halfH = textAscent() / 2;
  let startY = marginY + (availH - totalLines * lineSpacing) / 2 + textSize() / 2;
  for (let i = 0; i < totalLines; i++) {
    let y = startY + i * lineSpacing;
    if (mouseY > y - halfH && mouseY < y + halfH) {
      hoveredLine = i;
      break;
    }
  }
}

function updateLockTimers() {
  if (!allTextDisplayed) return;
  if (hoveredLine >= 0 && !lineLocked[hoveredLine]) {
    lineLockTimers[hoveredLine] += deltaTime;
    if (lineLockTimers[hoveredLine] > LOCK_DELAY) {
      lockLine(hoveredLine);
    }
  } else {
    for (let i = 0; i < lineLockTimers.length; i++) {
      if (i !== hoveredLine && !lineLocked[i]) lineLockTimers[i] = 0;
    }
  }
}

function lockLine(line) {
  lineLocked[line] = true;
  chars.forEach(c => {
    if (c.line === line) c.isLocked = true;
  });
}

function touchStarted() {
  detectHoveredLine();
  lockLine(hoveredLine);
  return false;
}
