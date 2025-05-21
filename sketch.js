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
let fontSize         = 20;
let lineSpacing      = 30;
let margin           = 40;            // 屏幕边缘留白
let charSpacing      = fontSize * 1.0;
let currentCharIndex = 0;
let allTextDisplayed = false;

// ———— 运动参数（可调节） ————
let floatSpeed       = 15;    // 【偏移速度倍率】
let floatAmount      = 25;    // 【最大偏移幅度】
let returnToHomeSpeed= 0.1;   // 【归位插值速度】

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
  myFont = loadFont('SmileySans-Optimized.ttf');
}

function setup() {
  // 自适应全屏
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
      if (ch === ' ' || ch === '\u3000') { x += charSpacing; continue; }
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
  // 垂直居中且保留 margin
  let blockHeight = totalLines * lineSpacing;
  let availH = height - 2 * margin;
  let startY = margin + (availH - blockHeight) / 2 + fontSize;

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
  // 清除页面默认白边: 在 index.html 中添加 CSS
  background(0);
  detectHoveredLine();
  updateLockTimers();
  if (!allTextDisplayed) displayTextProgressively();
  else if (allLockedTimer === 0) allLockedTimer = millis();
  handleFloatingEffects();
  checkForGlobalReset();
  drawAllChars();
}

// 其余函数保持不变...
