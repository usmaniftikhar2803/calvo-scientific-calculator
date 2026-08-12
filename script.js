/* ============================================
   CALVO SCIENTIFIC CALCULATOR + FORMULAS
   Full Math Engine + 12 Themes + Formula Library
   ============================================ */

/* ---------- STATE ---------- */
let expr = '';
let lastAns = 0;
let memory = 0;
let isDeg = true;
let isShift = false;
let isAlpha = false;
let isHyp = false;
let historyStack = [];
let historyIndex = -1;
let currentTheme = 'default';
let activeSubject = 'Mathematics';

/* ============================================
   TOAST + SHARE/COPY HELPERS
   ============================================ */
function showToast(msg) {
  let toastEl = document.getElementById('appToast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'appToast';
    toastEl.className = 'app-toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.remove('show');
  void toastEl.offsetWidth; // restart animation if triggered again quickly
  toastEl.classList.add('show');
  clearTimeout(toastEl._hideTimer);
  toastEl._hideTimer = setTimeout(() => toastEl.classList.remove('show'), 1800);
}

function fallbackCopy(text) {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

function shareOrCopyText(text) {
  if (navigator.share) {
    navigator.share({ text }).catch(() => { /* user cancelled — no error toast */ });
    return;
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => showToast(t('copied_toast')))
      .catch(() => {
        if (fallbackCopy(text)) showToast(t('copied_toast'));
        else showToast(t('share_failed_toast'));
      });
    return;
  }
  if (fallbackCopy(text)) showToast(t('copied_toast'));
  else showToast(t('share_failed_toast'));
}

/* Wires a destructive button (Clear All, etc.) to a "tap again to confirm"
   pattern instead of the browser's native confirm() dialog — native confirm
   boxes show the page's own address/origin in their title bar, which looks
   like a stray, confusing line of text sitting above the message. Tapping
   once arms the button (label swaps to a warning for a few seconds); tapping
   again within that window runs the action. Tapping elsewhere, or letting
   the window expire, disarms it safely. */
function armConfirmButton(btn, armedLabelKey, onConfirm) {
  if (!btn) return;
  let armed = false;
  let armTimer = null;
  // Read the resting label via its data-i18n key (if present) rather than
  // caching plain text, so a language switch while unarmed still shows the
  // right label on disarm.
  function restingLabel() {
    return btn.dataset.i18n ? t(btn.dataset.i18n) : btn.textContent;
  }

  function disarm() {
    armed = false;
    clearTimeout(armTimer);
    btn.textContent = restingLabel();
    btn.classList.remove('confirm-armed');
  }

  btn.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      btn.textContent = t(armedLabelKey);
      btn.classList.add('confirm-armed');
      armTimer = setTimeout(disarm, 2500);
      return;
    }
    disarm();
    onConfirm();
  });

  btn._disarmConfirm = disarm;
}

const lcdMain = document.getElementById('lcdMain');
const lcdSub = document.getElementById('lcdSub');
const angleIndicator = document.getElementById('angleIndicator');
const shiftIndicator = document.getElementById('shiftIndicator');
const alphaIndicator = document.getElementById('alphaIndicator');
const hypIndicator = document.getElementById('hypIndicator');
const memIndicator = document.getElementById('memIndicator');

/* ---------- 12 THEMES ---------- */
const themes = [
  { id: 'default', label: 'Dark', case: '#252529', accent: '#ff8a1f', lcd: '#9ab87a', keyDark: '#3a3a42', keyBlack: '#1e1e24', keyOrange: '#d4822a' },
  { id: 'midnight', label: 'Midnight', case: '#1a1a20', accent: '#ff8a1f', lcd: '#7a9a5a', keyDark: '#2a2a32', keyBlack: '#16161c', keyOrange: '#c4721a' },
  { id: 'ocean', label: 'Ocean', case: '#1e2a3a', accent: '#3a9aff', lcd: '#7ab8a0', keyDark: '#2a3a4a', keyBlack: '#162030', keyOrange: '#c87020' },
  { id: 'rose', label: 'Rose', case: '#2a1e24', accent: '#e8548b', lcd: '#c8a8a0', keyDark: '#3a2e34', keyBlack: '#1e1218', keyOrange: '#c85840' },
  { id: 'slate', label: 'Slate', case: '#1b2230', accent: '#5b9dff', lcd: '#8aa0b0', keyDark: '#2a3240', keyBlack: '#161e2c', keyOrange: '#c88030' },
  { id: 'forest', label: 'Forest', case: '#1a2a1e', accent: '#3fa34d', lcd: '#8ab87a', keyDark: '#2a3a2e', keyBlack: '#162a1e', keyOrange: '#a88820' },
  { id: 'grape', label: 'Grape', case: '#221830', accent: '#8a4fe0', lcd: '#b8a0c8', keyDark: '#3a2e4a', keyBlack: '#261a34', keyOrange: '#c88030' },
  { id: 'mint', label: 'Mint', case: '#1a2a26', accent: '#1fbf9a', lcd: '#80c8a8', keyDark: '#2a3a36', keyBlack: '#162a24', keyOrange: '#b88020' },
  { id: 'ember', label: 'Ember', case: '#2a1a16', accent: '#e34b3a', lcd: '#d0a080', keyDark: '#3a2a26', keyBlack: '#2e1e18', keyOrange: '#c84020' },
  { id: 'sunflower', label: 'Sunflower', case: '#2a2610', accent: '#e0b220', lcd: '#c8c070', keyDark: '#3a3620', keyBlack: '#2e2a14', keyOrange: '#b88810' },
  { id: 'coral', label: 'Coral', case: '#2a1e1a', accent: '#ff7a54', lcd: '#d0b0a0', keyDark: '#3a2e2a', keyBlack: '#2e2218', keyOrange: '#c85830' },
  { id: 'lavender', label: 'Lavender', case: '#221e2e', accent: '#9b8ce0', lcd: '#b8b0d0', keyDark: '#3a364a', keyBlack: '#262234', keyOrange: '#b87840' },
];

const themeGrid = document.getElementById('themeGrid');
const themePanel = document.getElementById('themePanel');
const menuTheme = document.getElementById('menuTheme');
const themeClose = document.getElementById('themeClose');

function buildThemeGrid() {
  themeGrid.innerHTML = '';
  themes.forEach(t => {
    const btn = document.createElement('button');
    btn.className = 'theme-option' + (t.id === currentTheme ? ' active' : '');
    btn.title = t.label;
    btn.innerHTML = `
      <div class="theme-mini-lcd" style="background:${t.lcd};"></div>
      <div class="theme-mini-keys">
        <div class="theme-mini-key" style="background:${t.keyBlack};"></div>
        <div class="theme-mini-key" style="background:${t.keyBlack};"></div>
        <div class="theme-mini-key accent" style="background:${t.accent};"></div>
        <div class="theme-mini-key" style="background:${t.keyDark};"></div>
        <div class="theme-mini-key" style="background:${t.keyDark};"></div>
        <div class="theme-mini-key accent" style="background:${t.keyOrange};"></div>
      </div>
      <div class="theme-label">${t.label}</div>
    `;
    btn.addEventListener('click', () => applyTheme(t.id));
    themeGrid.appendChild(btn);
  });
}

function applyTheme(themeId) {
  currentTheme = themeId;
  if (themeId === 'default') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', themeId);
  }
  buildThemeGrid();
  try { localStorage.setItem('calvo_theme', themeId); } catch(e) {}
}

if (menuTheme) {
  menuTheme.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTopbarMenu();
    themePanel.classList.toggle('open');
  });
}

themeClose.addEventListener('click', () => {
  themePanel.classList.remove('open');
});

document.addEventListener('click', (e) => {
  if (!themePanel.contains(e.target) && e.target !== menuTheme && !(menuTheme && menuTheme.contains(e.target))) {
    themePanel.classList.remove('open');
  }
});

try {
  const saved = localStorage.getItem('calvo_theme');
  if (saved && themes.find(t => t.id === saved)) applyTheme(saved);
} catch(e) {}

buildThemeGrid();

/* ---------- TOPBAR 3-DOT MENU ---------- */
const topbarMenuBtn = document.getElementById('topbarMenuBtn');
const topbarMenu = document.getElementById('topbarMenu');
const menuLanguages = document.getElementById('menuLanguages');
const menuFeedback = document.getElementById('menuFeedback');
const menuAbout = document.getElementById('menuAbout');

const languagesOverlay = document.getElementById('languagesOverlay');
const languagesClose = document.getElementById('languagesClose');
const languageList = document.getElementById('languageList');

const aboutOverlay = document.getElementById('aboutOverlay');
const aboutClose = document.getElementById('aboutClose');

const FEEDBACK_EMAIL = 'usmaniftikhar2803@gmail.com';

if (topbarMenuBtn && topbarMenu) {
  topbarMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    topbarMenu.classList.toggle('open');
  });

  document.addEventListener('click', (e) => {
    if (!topbarMenu.contains(e.target) && e.target !== topbarMenuBtn && !topbarMenuBtn.contains(e.target)) {
      topbarMenu.classList.remove('open');
    }
  });
}

function closeTopbarMenu() {
  if (topbarMenu) topbarMenu.classList.remove('open');
}

/* Languages */
if (menuLanguages) {
  menuLanguages.addEventListener('click', () => {
    closeTopbarMenu();
    languagesOverlay.classList.add('open');
  });
}
if (languagesClose) {
  languagesClose.addEventListener('click', () => languagesOverlay.classList.remove('open'));
}
if (languagesOverlay) {
  languagesOverlay.addEventListener('click', (e) => {
    if (e.target === languagesOverlay) languagesOverlay.classList.remove('open');
  });
}
if (languageList) {
  languageList.querySelectorAll('.language-option').forEach(opt => {
    opt.addEventListener('click', () => {
      setLanguage(opt.dataset.lang);
    });
  });
}

/* Share Feedback */
if (menuFeedback) {
  menuFeedback.addEventListener('click', () => {
    closeTopbarMenu();
    const subject = encodeURIComponent('Calvo Feedback');
    const body = encodeURIComponent('Hi Calvo team,\n\n');
    window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  });
}

/* About Us */
if (menuAbout) {
  menuAbout.addEventListener('click', () => {
    closeTopbarMenu();
    aboutOverlay.classList.add('open');
  });
}
if (aboutClose) {
  aboutClose.addEventListener('click', () => aboutOverlay.classList.remove('open'));
}
if (aboutOverlay) {
  aboutOverlay.addEventListener('click', (e) => {
    if (e.target === aboutOverlay) aboutOverlay.classList.remove('open');
  });
}

/* ---------- TAB SWITCHING ---------- */
const ACTIVE_TAB_KEY = 'calvo_active_tab';

function activateTab(tabName, remember) {
  const tabBtn = document.querySelector('.topbar-tab[data-tab="' + tabName + '"]');
  const tabPanel = document.getElementById('tab-' + tabName);
  if (!tabBtn || !tabPanel) return;
  document.querySelectorAll('.topbar-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  tabBtn.classList.add('active');
  tabPanel.classList.add('active');
  if (remember) {
    try { sessionStorage.setItem(ACTIVE_TAB_KEY, tabName); } catch (e) {}
  }
}

document.querySelectorAll('.topbar-tab').forEach(tab => {
  tab.addEventListener('click', () => activateTab(tab.dataset.tab, true));
});

// On a page REFRESH (same browser session), reopen on whichever tab was
// active — sessionStorage survives reloads but is cleared when the tab/
// browser is closed, so a fresh open of the site always lands on Calculator.
let restoredTab = 'calc';
try {
  const remembered = sessionStorage.getItem(ACTIVE_TAB_KEY);
  if (remembered && document.getElementById('tab-' + remembered)) restoredTab = remembered;
} catch (e) {}
activateTab(restoredTab, false);

/* ---------- DISPLAY ---------- */
function updateDisplay() {
  lcdMain.textContent = expr === '' ? '0' : expr;
  fitText(lcdMain, 1.5, 0.72);
  fitText(lcdSub, 0.58, 0.42);
}

function fitText(el, maxRem, minRem) {
  let size = maxRem;
  el.style.fontSize = size + 'rem';
  let guard = 0;
  while (el.scrollWidth > el.clientWidth && size > minRem && guard < 60) {
    size -= 0.05;
    el.style.fontSize = size + 'rem';
    guard++;
  }
}

function showError(msg) {
  lcdMain.textContent = msg;
  lcdMain.style.color = '#8b0000';
  setTimeout(() => {
    lcdMain.style.color = '';
    expr = '';
    updateDisplay();
  }, 1800);
}

/* ---------- MODE TOGGLES ---------- */
function setShift(on) {
  isShift = on;
  shiftIndicator.classList.toggle('active', on);
  document.getElementById('shiftBtn').classList.toggle('active', on);
  updateKeyLabels();
}

function setAlpha(on) {
  isAlpha = on;
  alphaIndicator.classList.toggle('active', on);
  document.getElementById('alphaBtn').classList.toggle('active', on);
}

function setHyp(on) {
  isHyp = on;
  hypIndicator.classList.toggle('active', on);
}

function updateMemIndicator() {
  memIndicator.classList.toggle('active', memory !== 0);
  angleIndicator.textContent = (isDeg ? 'DEG' : 'RAD') + (memory !== 0 ? ' M' : '');
}

function updateKeyLabels() {
  document.querySelectorAll('.key').forEach(key => {
    const shiftText = key.dataset.shift;
    const mainText = key.dataset.main;
    if (!shiftText && !mainText) return;
    let label = mainText;
    if (isShift && shiftText) label = shiftText;
    key.innerHTML = '';
    if (shiftText) {
      const shiftSpan = document.createElement('span');
      shiftSpan.className = 'shift-label';
      shiftSpan.textContent = shiftText;
      key.appendChild(shiftSpan);
    }
    const mainSpan = document.createElement('span');
    mainSpan.className = 'main-label';
    mainSpan.textContent = label;
    key.appendChild(mainSpan);
  });
}

/* ---------- MATH ENGINE ---------- */
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function evaluate(str) {
  if (!str) return 0;
  let s = str;
  s = s.replace(/\u03C0/g, 'Math.PI');
  s = s.replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, 'Math.E');
  s = s.replace(/Ans/g, '(' + lastAns + ')');
  s = s.replace(/(\d+(\.\d+)?)%/g, (m, n) => '(' + n + '/100)');
  s = s.replace(/(\d+(\.\d+)?)!/g, (m, n) => factorial(parseFloat(n)));
  s = s.replace(/(\d+(\.\d+)?)\^3/g, (m, n) => '(' + n + ')**3');
  s = s.replace(/(\d+(\.\d+)?)\^2/g, (m, n) => '(' + n + ')**2');
  s = s.replace(/\^/g, '**');
  s = s.replace(/nrt\(([^,()]*),([^()]*)\)/g, (m, x, n) => 'Math.pow((' + x + '),1/(' + n + '))');
  s = s.replace(/sqrt\(/g, 'Math.sqrt(');
  s = s.replace(/ln\(/g, 'Math.log(');
  s = s.replace(/log\(/g, 'Math.log10(');
  s = s.replace(/abs\(/g, 'Math.abs(');
  s = s.replace(/10\^\(/g, 'Math.pow(10,');
  s = s.replace(/e\^\(/g, 'Math.exp(');
  ['sinh', 'cosh', 'tanh'].forEach(fn => {
    const re = new RegExp(fn + '\\(([^()]*)\\)', 'g');
    s = s.replace(re, (m, inner) => 'Math.' + fn + '(' + evaluate(inner) + ')');
  });
  ['asin', 'acos', 'atan'].forEach(fn => {
    const re = new RegExp(fn + '\\(([^()]*)\\)', 'g');
    s = s.replace(re, (m, inner) => {
      const val = evaluate(inner);
      const raw = Math[fn](val);
      const out = isDeg ? raw * 180 / Math.PI : raw;
      return '(' + out + ')';
    });
  });
  ['sin', 'cos', 'tan'].forEach(fn => {
    const re = new RegExp(fn + '\\(([^()]*)\\)', 'g');
    s = s.replace(re, (m, inner) => {
      const val = evaluate(inner);
      const rad = isDeg ? val * Math.PI / 180 : val;
      return 'Math.' + fn + '(' + rad + ')';
    });
  });
  const fn = new Function('return (' + s + ')');
  const result = fn();
  return Math.round(result * 1e10) / 1e10;
}

/* ---------- INPUT HANDLING ---------- */
function addToExpr(text) {
  expr += text;
  updateDisplay();
}
function backspace() {
  expr = expr.slice(0, -1);
  updateDisplay();
}
function clearAll() {
  expr = '';
  lcdSub.innerHTML = '&nbsp;';
  updateDisplay();
}
function clearEntry() { backspace(); }

function calculate() {
  try {
    const original = expr;
    const result = evaluate(expr);
    lcdSub.textContent = expr;
    lastAns = result;
    expr = String(result);
    updateDisplay();
    if (historyStack.length === 0 || historyStack[historyStack.length - 1] !== expr) {
      historyStack.push(expr);
      if (historyStack.length > 50) historyStack.shift();
      historyIndex = historyStack.length;
    }
    logCalcHistory(original, expr);
  } catch (e) {
    showError('Syntax ERROR');
  }
}

/* ---------- KEY MAPPING ---------- */
const keyMap = {
  'keyShift': () => { setShift(!isShift); setAlpha(false); },
  'keyAlpha': () => { setAlpha(!isAlpha); setShift(false); },
  'keyOn': () => { clearAll(); setShift(false); setAlpha(false); setHyp(false); },
  'keyMode': () => { isDeg = !isDeg; angleIndicator.textContent = isDeg ? 'DEG' : 'RAD'; updateMemIndicator(); },
  'key0': () => addToExpr('0'), 'key1': () => addToExpr('1'), 'key2': () => addToExpr('2'),
  'key3': () => addToExpr('3'), 'key4': () => addToExpr('4'), 'key5': () => addToExpr('5'),
  'key6': () => addToExpr('6'), 'key7': () => addToExpr('7'), 'key8': () => addToExpr('8'), 'key9': () => addToExpr('9'),
  'keyDot': () => addToExpr('.'),
  'keyAdd': () => addToExpr('+'), 'keySub': () => addToExpr('-'), 'keyMul': () => addToExpr('*'), 'keyDiv': () => addToExpr('/'),
  'keyLParen': () => addToExpr('('), 'keyRParen': () => addToExpr(')'),
  'keySin': () => { if (isShift) { addToExpr('asin('); setShift(false); } else if (isHyp) { addToExpr('sinh('); setHyp(false); } else { addToExpr('sin('); } },
  'keyCos': () => { if (isShift) { addToExpr('acos('); setShift(false); } else if (isHyp) { addToExpr('cosh('); setHyp(false); } else { addToExpr('cos('); } },
  'keyTan': () => { if (isShift) { addToExpr('atan('); setShift(false); } else if (isHyp) { addToExpr('tanh('); setHyp(false); } else { addToExpr('tan('); } },
  'keyLog': () => { if (isShift) { addToExpr('10^('); setShift(false); } else { addToExpr('log('); } },
  'keyLn': () => { if (isShift) { addToExpr('e^('); setShift(false); } else { addToExpr('ln('); } },
  'keySqrt': () => { if (isShift) { addToExpr('^2'); setShift(false); } else { addToExpr('sqrt('); } },
  'keySquare2': () => { if (isShift) { const m = expr.match(/(\d+(\.\d+)?)$/); if (m) expr = expr.slice(0, -m[1].length) + m[1] + '!'; else addToExpr('!'); setShift(false); } else { addToExpr('^2'); } },
  'keyCube': () => { if (isShift) { addToExpr('nrt('); setShift(false); } else { addToExpr('^3'); } },
  'keyPow': () => { if (isShift) { addToExpr('nrt('); setShift(false); } else { addToExpr('^'); } },
  'keyNrt': () => addToExpr('nrt('),
  'keyPi': () => addToExpr('\u03C0'), 'keyE': () => addToExpr('e'), 'keyNeg': () => addToExpr('(-'),
  'keyExp': () => addToExpr('E'), 'keyPercent': () => addToExpr('%'), 'keySci': () => addToExpr('*10^'),
  'keyAns': () => addToExpr('Ans'), 'keyHyp': () => { setHyp(!isHyp); }, 'keyAbs': () => addToExpr('abs('),
  'keyMplus': () => { if (isShift) { memory -= (expr ? evaluate(expr) : 0); setShift(false); } else { memory += (expr ? evaluate(expr) : 0); } updateMemIndicator(); },
  'keyMc': () => { memory = 0; updateMemIndicator(); },
  'keyMr': () => { addToExpr('(' + memory + ')'); },
  'keyDel': () => clearEntry(), 'keyAc': () => clearAll(),
  'keyEq': () => { setShift(false); setAlpha(false); setHyp(false); calculate(); },
  'keyRcl': () => { addToExpr('(' + memory + ')'); },
  'keyEng': () => {}, 'keySd': () => {}, 'keyCalc': () => {},
  'keyIntegral': () => { addToExpr('\u222B'); }, 'keySquare': () => {},
  'keyAsin': () => addToExpr('asin('), 'keyAcos': () => addToExpr('acos('),
};

document.querySelectorAll('.key').forEach(key => {
  key.addEventListener('click', () => {
    const handler = keyMap[key.id];
    if (handler) {
      handler();
      key.style.transform = 'translateY(2px) scale(0.97)';
      setTimeout(() => { key.style.transform = ''; }, 100);
    }
  });
});

document.getElementById('replayBtn').addEventListener('click', () => {
  if (historyStack.length === 0) return;
  historyIndex--;
  if (historyIndex < 0) historyIndex = historyStack.length - 1;
  expr = historyStack[historyIndex];
  updateDisplay();
});

document.addEventListener('keydown', (e) => {
  // Don't hijack keystrokes meant for a text field elsewhere on the page
  // (e.g. the AI Solver's question box or API key field).
  const target = e.target;
  const isEditable = target && (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.isContentEditable
  );
  if (isEditable) return;

  const key = e.key;
  const map = {
    '0': 'key0', '1': 'key1', '2': 'key2', '3': 'key3', '4': 'key4',
    '5': 'key5', '6': 'key6', '7': 'key7', '8': 'key8', '9': 'key9',
    '.': 'keyDot', '+': 'keyAdd', '-': 'keySub',
    '*': 'keyMul', '/': 'keyDiv', '(': 'keyLParen', ')': 'keyRParen',
    '^': 'keyPow', '%': 'keyPercent'
  };
  if (map[key]) {
    e.preventDefault();
    const btn = document.getElementById(map[key]);
    if (btn) btn.click();
  }
  if (key === 'Enter' || key === '=') { e.preventDefault(); document.getElementById('keyEq').click(); }
  if (key === 'Backspace') { e.preventDefault(); document.getElementById('keyDel').click(); }
  if (key === 'Escape') { e.preventDefault(); document.getElementById('keyAc').click(); }
  if (key === 'p' || key === 'P') { e.preventDefault(); document.getElementById('keyPi').click(); }
});

/* ---------- FORMULA DATA (9th to MS Level) ---------- */
const formulaData = {
  Mathematics: [
    { cat: 'Algebra (9th-10th)', name: 'Quadratic Formula', expr: 'x = (-b ± √(b² - 4ac)) / 2a' },
    { cat: 'Algebra (9th-10th)', name: 'Discriminant', expr: 'D = b² - 4ac' },
    { cat: 'Algebra (9th-10th)', name: 'Sum of Roots', expr: 'α + β = -b/a' },
    { cat: 'Algebra (9th-10th)', name: 'Product of Roots', expr: 'αβ = c/a' },
    { cat: 'Algebra (9th-10th)', name: '(a + b)²', expr: 'a² + 2ab + b²' },
    { cat: 'Algebra (9th-10th)', name: '(a - b)²', expr: 'a² - 2ab + b²' },
    { cat: 'Algebra (9th-10th)', name: 'a² - b²', expr: '(a + b)(a - b)' },
    { cat: 'Algebra (9th-10th)', name: '(a + b)³', expr: 'a³ + 3a²b + 3ab² + b³' },
    { cat: 'Algebra (9th-10th)', name: 'a³ + b³', expr: '(a + b)(a² - ab + b²)' },
    { cat: 'Algebra (9th-10th)', name: 'a³ - b³', expr: '(a - b)(a² + ab + b²)' },
    { cat: 'Algebra (9th-10th)', name: 'Binomial Theorem', expr: '(x + y)ⁿ = Σ ⁿCᵣ xⁿ⁻ʳ yʳ' },
    { cat: 'Logarithms (FSc)', name: 'Product Rule', expr: 'log(mn) = log m + log n' },
    { cat: 'Logarithms (FSc)', name: 'Quotient Rule', expr: 'log(m/n) = log m - log n' },
    { cat: 'Logarithms (FSc)', name: 'Power Rule', expr: 'log(mⁿ) = n log m' },
    { cat: 'Logarithms (FSc)', name: 'Change of Base', expr: 'logₐ b = log b / log a' },
    { cat: 'Trigonometry (FSc)', name: 'Pythagorean Identity', expr: 'sin²θ + cos²θ = 1' },
    { cat: 'Trigonometry (FSc)', name: '1 + tan²θ', expr: 'sec²θ' },
    { cat: 'Trigonometry (FSc)', name: '1 + cot²θ', expr: 'cosec²θ' },
    { cat: 'Trigonometry (FSc)', name: 'sin(A ± B)', expr: 'sinA cosB ± cosA sinB' },
    { cat: 'Trigonometry (FSc)', name: 'cos(A ± B)', expr: 'cosA cosB ∓ sinA sinB' },
    { cat: 'Trigonometry (FSc)', name: 'tan(A ± B)', expr: '(tanA ± tanB) / (1 ∓ tanA tanB)' },
    { cat: 'Trigonometry (FSc)', name: 'Double Angle sin2θ', expr: '2 sinθ cosθ' },
    { cat: 'Trigonometry (FSc)', name: 'Double Angle cos2θ', expr: 'cos²θ - sin²θ = 2cos²θ - 1' },
    { cat: 'Trigonometry (FSc)', name: 'Law of Sines', expr: 'a/sinA = b/sinB = c/sinC' },
    { cat: 'Trigonometry (FSc)', name: 'Law of Cosines', expr: 'c² = a² + b² - 2ab cosC' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Distance Formula', expr: 'd = √((x₂-x₁)² + (y₂-y₁)²)' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Midpoint', expr: 'M = ((x₁+x₂)/2, (y₁+y₂)/2)' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Slope', expr: 'm = (y₂-y₁)/(x₂-x₁)' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Line Equation', expr: 'y = mx + c' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Circle Equation', expr: '(x-h)² + (y-k)² = r²' },
    { cat: 'Calculus (FSc-BS)', name: 'Power Rule', expr: 'd/dx(xⁿ) = nxⁿ⁻¹' },
    { cat: 'Calculus (FSc-BS)', name: 'Product Rule', expr: 'd/dx(uv) = u\'v + uv\'' },
    { cat: 'Calculus (FSc-BS)', name: 'Quotient Rule', expr: 'd/dx(u/v) = (u\'v - uv\')/v²' },
    { cat: 'Calculus (FSc-BS)', name: 'Chain Rule', expr: 'dy/dx = dy/du × du/dx' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(sin x)', expr: 'cos x' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(cos x)', expr: '-sin x' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(tan x)', expr: 'sec²x' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(eˣ)', expr: 'eˣ' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(ln x)', expr: '1/x' },
    { cat: 'Integration (FSc-BS)', name: 'Power Rule', expr: '∫xⁿ dx = xⁿ⁺¹/(n+1) + C' },
    { cat: 'Integration (FSc-BS)', name: '∫1/x dx', expr: 'ln|x| + C' },
    { cat: 'Integration (FSc-BS)', name: '∫eˣ dx', expr: 'eˣ + C' },
    { cat: 'Integration (FSc-BS)', name: '∫sin x dx', expr: '-cos x + C' },
    { cat: 'Integration (FSc-BS)', name: '∫cos x dx', expr: 'sin x + C' },
    { cat: 'Integration (FSc-BS)', name: 'Integration by Parts', expr: '∫u dv = uv - ∫v du' },
    { cat: 'Sequences & Series (FSc)', name: 'nth term of AP', expr: 'aₙ = a₁ + (n-1)d' },
    { cat: 'Sequences & Series (FSc)', name: 'Sum of AP', expr: 'Sₙ = n/2 × (2a₁ + (n-1)d)' },
    { cat: 'Sequences & Series (FSc)', name: 'nth term of GP', expr: 'aₙ = a₁rⁿ⁻¹' },
    { cat: 'Sequences & Series (FSc)', name: 'Sum of GP', expr: 'Sₙ = a₁(1-rⁿ)/(1-r)' },
    { cat: 'Sequences & Series (FSc)', name: 'Infinite GP', expr: 'S = a₁/(1-r), |r| < 1' },
    { cat: 'Complex Numbers (FSc-BS)', name: 'Modulus', expr: '|z| = √(a² + b²), z = a + bi' },
    { cat: 'Complex Numbers (FSc-BS)', name: "Euler's Formula", expr: 'e^(iθ) = cosθ + i sinθ' },
    { cat: 'Complex Numbers (FSc-BS)', name: "De Moivre's Theorem", expr: '(cosθ + i sinθ)ⁿ = cos(nθ) + i sin(nθ)' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Determinant 2×2', expr: '|A| = ad - bc' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Inverse 2×2', expr: 'A⁻¹ = (1/|A|)[d -b; -c a]' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Eigenvalue', expr: 'Av = λv' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Dot Product', expr: 'A·B = |A||B|cosθ' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Cross Product', expr: '|A×B| = |A||B|sinθ' },
    { cat: 'Differential Equations (BS-MS)', name: 'Linear First Order', expr: "dy/dx + Py = Q" },
    { cat: 'Differential Equations (BS-MS)', name: 'Integrating Factor', expr: 'IF = e^(∫P dx)' },
    { cat: 'Probability (BS-MS)', name: 'Permutations', expr: 'ⁿPᵣ = n!/(n-r)!' },
    { cat: 'Probability (BS-MS)', name: 'Combinations', expr: 'ⁿCᵣ = n!/(r!(n-r)!)' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Union', expr: 'A∪B = {x: x∈A or x∈B}' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Intersection', expr: 'A∩B = {x: x∈A and x∈B}' },
    { cat: 'Sets & Functions (9th-10th)', name: "De Morgan's Law", expr: "(A∪B)' = A'∩B'" },
    { cat: 'Sets & Functions (9th-10th)', name: 'Cartesian Product Size', expr: '|A×B| = |A|×|B|' },
    { cat: 'Matrices (10th-FSc)', name: 'Determinant 3×3', expr: '|A| = a(ei−fh) − b(di−fg) + c(dh−eg)' },
    { cat: 'Matrices (10th-FSc)', name: 'Matrix Multiplication', expr: '(AB)ᵢⱼ = Σₖ AᵢₖBₖⱼ' },
    { cat: 'Matrices (10th-FSc)', name: 'Transpose Property', expr: '(AB)ᵀ = BᵀAᵀ' },
    { cat: 'Inverse Trig Identities (FSc)', name: 'sin⁻¹x + cos⁻¹x', expr: 'π/2' },
    { cat: 'Inverse Trig Identities (FSc)', name: 'tan⁻¹x + cot⁻¹x', expr: 'π/2' },
    { cat: 'Partial Fractions (FSc)', name: 'Linear Factor', expr: '1/((x-a)(x-b)) = A/(x-a) + B/(x-b)' },
    { cat: 'Numerical Methods (BS)', name: "Newton-Raphson", expr: 'xₙ₊₁ = xₙ - f(xₙ)/f\'(xₙ)' },
    { cat: 'Numerical Methods (BS)', name: 'Trapezoidal Rule', expr: '∫f(x)dx ≈ h/2[f(x₀)+2Σf(xᵢ)+f(xₙ)]' },
    { cat: 'Numerical Methods (BS)', name: "Simpson's Rule", expr: '∫f(x)dx ≈ h/3[f(x₀)+4Σf(odd)+2Σf(even)+f(xₙ)]' },
    { cat: 'Real Analysis (BS-MS)', name: 'Limit Definition (ε-δ)', expr: '|f(x)-L| < ε whenever 0<|x-a|<δ' },
    { cat: 'Real Analysis (BS-MS)', name: 'Taylor Series', expr: 'f(x) = Σ fⁿ(a)(x-a)ⁿ/n!' },
    { cat: 'Real Analysis (BS-MS)', name: 'Maclaurin Series', expr: 'f(x) = Σ fⁿ(0)xⁿ/n!' },
    { cat: 'Group Theory (BS-MS)', name: 'Lagrange\'s Theorem', expr: '|H| divides |G|' },
    { cat: 'Group Theory (BS-MS)', name: 'Order of Element', expr: 'ord(g) = smallest n: gⁿ = e' },
    { cat: 'Number Theory (BS-MS)', name: 'Euclidean Algorithm', expr: 'gcd(a,b) = gcd(b, a mod b)' },
    { cat: 'Number Theory (BS-MS)', name: "Euler's Totient", expr: 'φ(n) = n∏(1-1/p)' },
    { cat: 'Fourier Analysis (BS-MS)', name: 'Fourier Series', expr: 'f(x) = a₀/2 + Σ(aₙcos nx + bₙsin nx)' },
    { cat: 'Laplace Transform (BS-MS)', name: 'Definition', expr: 'L{f(t)} = ∫₀^∞ e^(-st)f(t) dt' },
    { cat: 'Basic Arithmetic (9th)', name: 'Ratio & Proportion', expr: 'a:b = c:d ⇒ ad = bc' },
    { cat: 'Basic Arithmetic (9th)', name: 'Compound Proportion', expr: 'a/b = (c×e)/(d×f)' },
    { cat: 'Basic Arithmetic (9th)', name: 'Direct Variation', expr: 'y = kx' },
    { cat: 'Basic Arithmetic (9th)', name: 'Inverse Variation', expr: 'y = k/x' },
    { cat: 'Exponents & Radicals (9th-10th)', name: 'Product of Powers', expr: 'aᵐ × aⁿ = aᵐ⁺ⁿ' },
    { cat: 'Exponents & Radicals (9th-10th)', name: 'Power of Power', expr: '(aᵐ)ⁿ = aᵐⁿ' },
    { cat: 'Exponents & Radicals (9th-10th)', name: 'Negative Exponent', expr: 'a⁻ⁿ = 1/aⁿ' },
    { cat: 'Exponents & Radicals (9th-10th)', name: 'Fractional Exponent', expr: 'a^(m/n) = ⁿ√(aᵐ)' },
    { cat: 'Algebra (9th-10th)', name: '(a+b+c)²', expr: 'a²+b²+c²+2ab+2bc+2ca' },
    { cat: 'Algebra (9th-10th)', name: 'Remainder Theorem', expr: 'f(x) ÷ (x-a): remainder = f(a)' },
    { cat: 'Algebra (9th-10th)', name: 'Factor Theorem', expr: '(x-a) is a factor of f(x) iff f(a)=0' },
    { cat: 'Algebra (9th-10th)', name: 'Sum/Product for Cubic', expr: 'x³+px+q=0: α+β+γ=0' },
    { cat: 'Geometry (9th-10th)', name: 'Pythagoras Theorem', expr: 'a² + b² = c²' },
    { cat: 'Geometry (9th-10th)', name: 'Area of Triangle (Heron\'s)', expr: 'A = √(s(s-a)(s-b)(s-c))' },
    { cat: 'Geometry (9th-10th)', name: 'Area of Circle', expr: 'A = πr²' },
    { cat: 'Geometry (9th-10th)', name: 'Circumference', expr: 'C = 2πr' },
    { cat: 'Geometry (9th-10th)', name: 'Volume of Sphere', expr: 'V = (4/3)πr³' },
    { cat: 'Geometry (9th-10th)', name: 'Volume of Cylinder', expr: 'V = πr²h' },
    { cat: 'Geometry (9th-10th)', name: 'Volume of Cone', expr: 'V = (1/3)πr²h' },
    { cat: 'Geometry (9th-10th)', name: 'Surface Area of Sphere', expr: 'SA = 4πr²' },
    { cat: 'Trigonometry (9th-10th)', name: 'SOH-CAH-TOA', expr: 'sinθ=opp/hyp, cosθ=adj/hyp, tanθ=opp/adj' },
    { cat: 'Trigonometry (9th-10th)', name: 'Area using Trig', expr: 'A = ½ab sinC' },
    { cat: 'Trigonometry (FSc)', name: 'Half Angle sin(θ/2)', expr: '±√((1-cosθ)/2)' },
    { cat: 'Trigonometry (FSc)', name: 'Half Angle cos(θ/2)', expr: '±√((1+cosθ)/2)' },
    { cat: 'Trigonometry (FSc)', name: 'Product to Sum', expr: 'sinA cosB = ½[sin(A+B)+sin(A-B)]' },
    { cat: 'Trigonometry (FSc)', name: 'Sum to Product', expr: 'sinA+sinB = 2 sin((A+B)/2) cos((A-B)/2)' },
    { cat: 'Vectors (FSc)', name: 'Vector Magnitude', expr: '|A| = √(x²+y²+z²)' },
    { cat: 'Vectors (FSc)', name: 'Unit Vector', expr: 'â = A/|A|' },
    { cat: 'Vectors (FSc)', name: 'Scalar Triple Product', expr: 'A·(B×C)' },
    { cat: 'Conic Sections (FSc)', name: 'Parabola', expr: 'y² = 4ax' },
    { cat: 'Conic Sections (FSc)', name: 'Ellipse', expr: 'x²/a² + y²/b² = 1' },
    { cat: 'Conic Sections (FSc)', name: 'Hyperbola', expr: 'x²/a² − y²/b² = 1' },
    { cat: 'Conic Sections (FSc)', name: 'Eccentricity (ellipse)', expr: 'e = √(1 − b²/a²)' },
    { cat: 'Limits (FSc)', name: 'Standard Limit sinx/x', expr: 'lim(x→0) sinx/x = 1' },
    { cat: 'Limits (FSc)', name: "L'Hôpital's Rule", expr: 'lim f/g = lim f\'/g\' (0/0 or ∞/∞)' },
    { cat: 'Differentiation (FSc-BS)', name: 'Implicit Differentiation', expr: 'd/dx[F(x,y)=0] → solve for dy/dx' },
    { cat: 'Differentiation (FSc-BS)', name: 'Second Derivative Test', expr: "f''(x) > 0 ⇒ local min" },
    { cat: 'Integration (FSc-BS)', name: 'Definite Integral (FTC)', expr: '∫ₐᵇ f(x)dx = F(b) − F(a)' },
    { cat: 'Integration (FSc-BS)', name: 'Area Between Curves', expr: 'A = ∫ₐᵇ [f(x) − g(x)] dx' },
    { cat: 'Integration (FSc-BS)', name: 'Volume of Revolution', expr: 'V = π∫ₐᵇ [f(x)]² dx' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Rank of Matrix', expr: 'rank(A) = number of independent rows' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Cramer\'s Rule', expr: 'xᵢ = det(Aᵢ)/det(A)' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Characteristic Equation', expr: 'det(A − λI) = 0' },
    { cat: 'Differential Equations (BS-MS)', name: 'Homogeneous 2nd Order', expr: "ay'' + by' + cy = 0" },
    { cat: 'Differential Equations (BS-MS)', name: 'Auxiliary Equation', expr: 'am² + bm + c = 0' },
    { cat: 'Complex Analysis (MS)', name: 'Cauchy-Riemann Equations', expr: '∂u/∂x = ∂v/∂y, ∂u/∂y = −∂v/∂x' },
    { cat: 'Complex Analysis (MS)', name: "Cauchy's Integral Formula", expr: 'f(a) = (1/2πi)∮ f(z)/(z−a) dz' },
    { cat: 'Topology (MS)', name: 'Open Set Definition', expr: '∀x∈U, ∃ε>0: B(x,ε)⊆U' },
    { cat: 'Abstract Algebra (MS)', name: 'Isomorphism Theorem', expr: 'G/ker(φ) ≅ Im(φ)' },
    { cat: 'Algebra (9th-10th)', name: 'Cube of Trinomial', expr: '(a+b+c)³ = a³+b³+c³+3(a+b)(b+c)(c+a)' },
    { cat: 'Algebra (9th-10th)', name: 'Surds Rationalization', expr: '1/√a = √a/a' },
    { cat: 'Algebra (9th-10th)', name: 'Componendo-Dividendo', expr: '(a+b)/(a-b) = (c+d)/(c-d)' },
    { cat: 'Logarithms (FSc)', name: 'log base a of a', expr: 'logₐa = 1' },
    { cat: 'Logarithms (FSc)', name: 'log of 1', expr: 'logₐ1 = 0' },
    { cat: 'Trigonometry (FSc)', name: 'cot θ', expr: 'cotθ = cosθ/sinθ' },
    { cat: 'Trigonometry (FSc)', name: 'sec θ', expr: 'secθ = 1/cosθ' },
    { cat: 'Trigonometry (FSc)', name: 'cosec θ', expr: 'cosecθ = 1/sinθ' },
    { cat: 'Trigonometry (FSc)', name: 'Triple Angle sin3θ', expr: '3sinθ − 4sin³θ' },
    { cat: 'Trigonometry (FSc)', name: 'Triple Angle cos3θ', expr: '4cos³θ − 3cosθ' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Section Formula', expr: 'P = ((mx₂+nx₁)/(m+n), (my₂+ny₁)/(m+n))' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Area of Triangle (coords)', expr: 'A = ½|x₁(y₂−y₃)+x₂(y₃−y₁)+x₃(y₁−y₂)|' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Perpendicular Distance (point-line)', expr: 'd = |Ax₁+By₁+C|/√(A²+B²)' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(secx)', expr: 'secx tanx' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(cscx)', expr: '-cscx cotx' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(cotx)', expr: '-csc²x' },
    { cat: 'Integration (FSc-BS)', name: '∫sec²x dx', expr: 'tanx + C' },
    { cat: 'Integration (FSc-BS)', name: '∫secx tanx dx', expr: 'secx + C' },
    { cat: 'Sequences & Series (FSc)', name: 'Sum of Squares (1 to n)', expr: 'Σn² = n(n+1)(2n+1)/6' },
    { cat: 'Sequences & Series (FSc)', name: 'Sum of Cubes (1 to n)', expr: 'Σn³ = [n(n+1)/2]²' },
    { cat: 'Sequences & Series (FSc)', name: 'Harmonic Mean', expr: 'HM = n/Σ(1/aᵢ)' },
    { cat: 'Probability (BS-MS)', name: 'Circular Permutation', expr: '(n-1)!' },
    { cat: 'Probability (BS-MS)', name: 'Variance (probability)', expr: 'Var(X) = E(X²) − [E(X)]²' },
    { cat: 'Matrices (10th-FSc)', name: 'Adjoint', expr: 'adj(A) = transpose of cofactor matrix' },
    { cat: 'Matrices (10th-FSc)', name: 'Inverse via Adjoint', expr: 'A⁻¹ = adj(A)/|A|' },
    { cat: 'Basic Arithmetic (9th)', name: 'Percentage Formula', expr: '% = (Part/Whole) × 100' },
    { cat: 'Exponents & Radicals (9th-10th)', name: 'Zero Exponent', expr: 'a⁰ = 1' },
    { cat: 'Geometry (9th-10th)', name: 'Area of Trapezium', expr: 'A = ½(a+b)h' },
    { cat: 'Geometry (9th-10th)', name: 'Area of Parallelogram', expr: 'A = base × height' },
    { cat: 'Geometry (9th-10th)', name: 'Volume of Cube', expr: 'V = a³' },
    { cat: 'Geometry (9th-10th)', name: 'Volume of Cuboid', expr: 'V = l × w × h' },
    { cat: 'Real Analysis (BS-MS)', name: 'Ratio Test', expr: 'lim|aₙ₊₁/aₙ| = L' },
    { cat: 'Numerical Methods (BS)', name: 'Bisection Method', expr: 'c = (a+b)/2' },
    { cat: 'Group Theory (BS-MS)', name: "Cayley's Theorem", expr: 'every group is isomorphic to a subgroup of a symmetric group' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Matrix Multiplication', expr: '(AB)ᵢⱼ = Σₖ Aᵢₖ Bₖⱼ' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Transpose of Product', expr: '(AB)ᵀ = BᵀAᵀ' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Trace of Matrix', expr: 'tr(A) = Σ aᵢᵢ' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Determinant 3×3', expr: '|A| = a(ei−fh) − b(di−fg) + c(dh−eg)' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Inverse via Adjoint', expr: 'A⁻¹ = adj(A)/|A|' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Orthogonal Matrix', expr: 'AᵀA = I' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Eigenvector Equation', expr: 'Av = λv' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Diagonalization', expr: 'A = PDP⁻¹' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Dimension of Vector Space', expr: 'dim(V) = n (size of basis)' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Linear Independence', expr: 'c₁v₁+...+cₙvₙ=0 ⇒ all cᵢ=0' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Gradient', expr: '∇f = (∂f/∂x, ∂f/∂y, ∂f/∂z)' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Divergence', expr: '∇·F = ∂P/∂x + ∂Q/∂y + ∂R/∂z' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Curl', expr: '∇×F = |i j k; ∂/∂x ∂/∂y ∂/∂z; P Q R|' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Laplacian', expr: '∇²f = ∂²f/∂x² + ∂²f/∂y² + ∂²f/∂z²' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Line Integral', expr: '∫C F·dr' },
    { cat: 'Vector Calculus (BS-MS)', name: "Green's Theorem", expr: '∮C(Pdx+Qdy) = ∬(∂Q/∂x−∂P/∂y)dA' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Divergence Theorem', expr: '∬F·dS = ∭(∇·F)dV' },
    { cat: 'Vector Calculus (BS-MS)', name: "Stokes' Theorem", expr: '∮C F·dr = ∬S(∇×F)·dS' },
    { cat: 'Differential Equations (BS-MS)', name: 'Separable Equation', expr: 'dy/y = f(x)dx' },
    { cat: 'Differential Equations (BS-MS)', name: 'Exactness Condition', expr: '∂M/∂y = ∂N/∂x' },
    { cat: 'Differential Equations (BS-MS)', name: 'Bernoulli Equation', expr: 'dy/dx + Py = Qyⁿ' },
    { cat: 'Differential Equations (BS-MS)', name: 'Particular Integral (operator)', expr: 'PI = [1/f(D)]·X' },
    { cat: 'Differential Equations (BS-MS)', name: 'Wronskian', expr: 'W(y₁,y₂) = y₁y₂′ − y₂y₁′' },
    { cat: 'Differential Equations (BS-MS)', name: 'Laplace Transform of Derivative', expr: 'L{y′} = sY(s) − y(0)' },
    { cat: 'Differential Equations (BS-MS)', name: 'Power Series Solution', expr: 'y = Σ aₙxⁿ' },
    { cat: 'Differential Equations (BS-MS)', name: 'System of ODEs (matrix form)', expr: "X′ = AX" },
    { cat: 'Real Analysis (BS-MS)', name: 'Continuity Definition', expr: '∀ε>0 ∃δ>0: |x−a|<δ ⇒ |f(x)−f(a)|<ε' },
    { cat: 'Real Analysis (BS-MS)', name: 'Uniform Continuity', expr: '∀ε>0 ∃δ>0 (independent of point) ⇒ |f(x)−f(y)|<ε' },
    { cat: 'Real Analysis (BS-MS)', name: 'Cauchy Sequence', expr: '|aₙ−aₘ| < ε for n,m > N' },
    { cat: 'Real Analysis (BS-MS)', name: 'Monotone Convergence Theorem', expr: 'bounded monotone sequence converges' },
    { cat: 'Real Analysis (BS-MS)', name: 'Bolzano-Weierstrass Theorem', expr: 'every bounded sequence has a convergent subsequence' },
    { cat: 'Real Analysis (BS-MS)', name: 'Mean Value Theorem', expr: "f′(c) = [f(b)−f(a)]/(b−a)" },
    { cat: 'Real Analysis (BS-MS)', name: 'Root Test', expr: 'lim|aₙ|^(1/n) = L' },
    { cat: 'Real Analysis (BS-MS)', name: 'Riemann Integral', expr: '∫ₐᵇf(x)dx = lim Σf(xᵢ*)Δx' },
    { cat: 'Complex Analysis (BS-MS)', name: 'Complex Modulus', expr: '|z| = √(a²+b²)' },
    { cat: 'Complex Analysis (BS-MS)', name: "Euler's Formula", expr: 'e^(iθ) = cosθ + i sinθ' },
    { cat: 'Complex Analysis (BS-MS)', name: "Cauchy's Integral Formula", expr: 'f(a) = (1/2πi)∮f(z)/(z−a) dz' },
    { cat: 'Complex Analysis (MS)', name: 'Residue Theorem', expr: '∮f(z)dz = 2πi Σ Res(f, zₖ)' },
    { cat: 'Complex Analysis (MS)', name: 'Laurent Series', expr: 'f(z) = Σ aₙ(z−z₀)ⁿ, n∈ℤ' },
    { cat: 'Complex Analysis (MS)', name: 'Analytic Function Condition', expr: 'f satisfies Cauchy-Riemann everywhere in domain' },
    { cat: 'Group Theory (BS-MS)', name: 'Group Axioms', expr: 'closure, associativity, identity, inverse' },
    { cat: 'Group Theory (BS-MS)', name: 'Subgroup Test', expr: 'H≤G if ab⁻¹∈H for all a,b∈H' },
    { cat: 'Group Theory (BS-MS)', name: 'Cyclic Group Order', expr: '|⟨a⟩| = smallest n with aⁿ=e' },
    { cat: 'Abstract Algebra (BS-MS)', name: 'Homomorphism Property', expr: 'φ(ab) = φ(a)φ(b)' },
    { cat: 'Abstract Algebra (BS-MS)', name: 'Kernel of Homomorphism', expr: 'ker(φ) = {a∈G : φ(a)=e}' },
    { cat: 'Abstract Algebra (BS-MS)', name: 'Ring Definition', expr: 'set with two operations (+, ×) satisfying ring axioms' },
    { cat: 'Abstract Algebra (BS-MS)', name: 'Field Definition', expr: 'commutative ring where every nonzero element has a multiplicative inverse' },
    { cat: 'Abstract Algebra (MS)', name: "Sylow's Theorem", expr: 'existence of subgroups of prime power order' },
    { cat: 'Number Theory (BS-MS)', name: 'GCD-LCM Relation', expr: 'gcd(a,b)·lcm(a,b) = a·b' },
    { cat: 'Number Theory (BS-MS)', name: "Fermat's Little Theorem", expr: 'aᵖ⁻¹ ≡ 1 (mod p)' },
    { cat: 'Number Theory (BS-MS)', name: "Euler's Totient Function", expr: 'φ(n) = n∏(1−1/p)' },
    { cat: 'Number Theory (BS-MS)', name: 'Modular Congruence', expr: 'a ≡ b (mod n)' },
    { cat: 'Number Theory (BS-MS)', name: 'Chinese Remainder Theorem', expr: 'unique solution mod (n₁n₂...nₖ)' },
    { cat: 'Number Theory (BS-MS)', name: 'Prime Factorization', expr: 'n = p₁^a₁·p₂^a₂·...' },
    { cat: 'Topology (MS)', name: 'Closed Set Definition', expr: 'complement of an open set' },
    { cat: 'Topology (MS)', name: 'Compactness', expr: 'every open cover has a finite subcover' },
    { cat: 'Topology (MS)', name: 'Continuity in Topology', expr: 'preimage of every open set is open' },
    { cat: 'Topology (MS)', name: 'Homeomorphism', expr: 'continuous bijection with continuous inverse' },
    { cat: 'Numerical Methods (BS)', name: 'Newton-Raphson Method', expr: 'xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ)' },
    { cat: 'Numerical Methods (BS)', name: 'Trapezoidal Rule', expr: '∫≈(h/2)[f(x₀)+2Σf(xᵢ)+f(xₙ)]' },
    { cat: 'Numerical Methods (BS)', name: "Simpson's 1/3 Rule", expr: '∫≈(h/3)[f₀+4Σf(odd)+2Σf(even)+fₙ]' },
    { cat: 'Numerical Methods (BS)', name: "Euler's Method", expr: 'yₙ₊₁ = yₙ + h·f(xₙ,yₙ)' },
    { cat: 'Numerical Methods (BS)', name: 'Runge-Kutta 4th Order', expr: 'yₙ₊₁ = yₙ + (h/6)(k₁+2k₂+2k₃+k₄)' },
    { cat: 'Numerical Methods (BS)', name: 'Lagrange Interpolation', expr: 'P(x) = Σ yᵢ Lᵢ(x)' },
    { cat: 'Probability (BS-MS)', name: "Bayes' Theorem", expr: 'P(A|B) = P(B|A)P(A)/P(B)' },
    { cat: 'Probability (BS-MS)', name: 'Conditional Probability', expr: 'P(A|B) = P(A∩B)/P(B)' },
    { cat: 'Probability (BS-MS)', name: 'Independence Condition', expr: 'P(A∩B) = P(A)P(B)' },
    { cat: 'Probability (BS-MS)', name: 'Law of Total Probability', expr: 'P(A) = Σ P(A|Bᵢ)P(Bᵢ)' },
    { cat: 'Probability (BS-MS)', name: 'Expected Value (discrete)', expr: 'E(X) = Σ x·P(x)' },
    { cat: 'Probability (BS-MS)', name: 'Moment Generating Function', expr: 'M(t) = E(e^(tX))' },
    { cat: 'Fourier & Laplace (BS-MS)', name: 'Inverse Laplace Transform', expr: 'L⁻¹{F(s)} = f(t)' },
    { cat: 'Fourier & Laplace (BS-MS)', name: 'Fourier Transform', expr: 'F(ω) = ∫f(t)e^(-iωt)dt' },
    { cat: 'Fourier & Laplace (MS)', name: "Parseval's Theorem", expr: '∫|f(t)|²dt = (1/2π)∫|F(ω)|²dω' },
    { cat: 'Fourier & Laplace (MS)', name: 'Convolution Theorem', expr: 'L{f*g} = F(s)·G(s)' },
    { cat: 'Graph Theory (BS-MS)', name: 'Handshaking Lemma', expr: 'Σ deg(v) = 2|E|' },
    { cat: 'Graph Theory (BS-MS)', name: "Euler's Formula (Planar Graphs)", expr: 'V − E + F = 2' },
    { cat: 'Graph Theory (BS-MS)', name: 'Chromatic Number', expr: 'χ(G) = minimum colors needed' },
    { cat: 'Graph Theory (BS-MS)', name: 'Adjacency Matrix', expr: 'Aᵢⱼ = 1 if edge(i,j) exists, else 0' },
    { cat: 'Graph Theory (BS-MS)', name: 'Tree Edge Count', expr: '|E| = |V| − 1' },
    { cat: 'Graph Theory (BS-MS)', name: "Dijkstra's Algorithm", expr: 'shortest path via greedy relaxation' },
  ],

  Physics: [
    { cat: 'Mechanics (9th-10th)', name: "Newton's 2nd Law", expr: 'F = ma' },
    { cat: 'Mechanics (9th-10th)', name: 'Equations of Motion', expr: 'v = u + at' },
    { cat: 'Mechanics (9th-10th)', name: 'Displacement', expr: 's = ut + ½at²' },
    { cat: 'Mechanics (9th-10th)', name: 'v² Formula', expr: 'v² = u² + 2as' },
    { cat: 'Mechanics (9th-10th)', name: 'Momentum', expr: 'p = mv' },
    { cat: 'Mechanics (9th-10th)', name: 'Impulse', expr: 'J = FΔt = Δp' },
    { cat: 'Mechanics (9th-10th)', name: 'Friction', expr: 'f = μN' },
    { cat: 'Work & Energy (FSc)', name: 'Work Done', expr: 'W = Fd cosθ' },
    { cat: 'Work & Energy (FSc)', name: 'Kinetic Energy', expr: 'KE = ½mv²' },
    { cat: 'Work & Energy (FSc)', name: 'Potential Energy', expr: 'PE = mgh' },
    { cat: 'Work & Energy (FSc)', name: 'Power', expr: 'P = W/t' },
    { cat: 'Work & Energy (FSc)', name: 'Spring PE', expr: 'PE = ½kx²' },
    { cat: 'Rotational Motion (FSc)', name: 'Torque', expr: 'τ = rF sinθ' },
    { cat: 'Rotational Motion (FSc)', name: 'Moment of Inertia', expr: 'I = Σmr²' },
    { cat: 'Rotational Motion (FSc)', name: 'Angular Momentum', expr: 'L = Iω' },
    { cat: 'Rotational Motion (FSc)', name: 'Rotational KE', expr: 'KE = ½Iω²' },
    { cat: 'Gravitation (FSc)', name: "Newton's Law", expr: 'F = Gm₁m₂/r²' },
    { cat: 'Gravitation (FSc)', name: 'Gravitational PE', expr: 'U = -GMm/r' },
    { cat: 'Gravitation (FSc)', name: 'Orbital Velocity', expr: 'v = √(GM/r)' },
    { cat: 'Gravitation (FSc)', name: 'Escape Velocity', expr: 'v = √(2GM/r)' },
    { cat: 'Thermodynamics (FSc-BS)', name: '1st Law', expr: 'ΔU = Q - W' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Ideal Gas Law', expr: 'PV = nRT' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Heat Capacity', expr: 'Q = mcΔT' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Efficiency', expr: 'η = 1 - Tc/Th' },
    { cat: 'Electrostatics (FSc)', name: "Coulomb's Law", expr: 'F = kq₁q₂/r²' },
    { cat: 'Electrostatics (FSc)', name: 'Electric Field', expr: 'E = F/q = kQ/r²' },
    { cat: 'Electrostatics (FSc)', name: 'Electric Potential', expr: 'V = kQ/r' },
    { cat: 'Electrostatics (FSc)', name: 'Capacitance', expr: 'C = Q/V' },
    { cat: 'Current Electricity (FSc)', name: "Ohm's Law", expr: 'V = IR' },
    { cat: 'Current Electricity (FSc)', name: 'Electrical Power', expr: 'P = VI = I²R' },
    { cat: 'Current Electricity (FSc)', name: 'Resistivity', expr: 'R = ρL/A' },
    { cat: 'Magnetism (FSc-BS)', name: 'Force on Charge', expr: 'F = qvB sinθ' },
    { cat: 'Magnetism (FSc-BS)', name: "Faraday's Law", expr: 'EMF = -dΦ/dt' },
    { cat: 'Magnetism (FSc-BS)', name: 'Magnetic Flux', expr: 'Φ = BA cosθ' },
    { cat: 'Waves & Sound (FSc)', name: 'Wave Speed', expr: 'v = fλ' },
    { cat: 'Waves & Sound (FSc)', name: 'Doppler Effect', expr: "f' = f(v±vₒ)/(v∓vₛ)" },
    { cat: 'Optics (FSc)', name: 'Lens Formula', expr: '1/f = 1/v - 1/u' },
    { cat: 'Optics (FSc)', name: "Snell's Law", expr: 'n₁sinθ₁ = n₂sinθ₂' },
    { cat: 'Modern Physics (FSc-BS)', name: "Planck's Equation", expr: 'E = hf' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Mass-Energy', expr: 'E = mc²' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Photoelectric', expr: 'KE_max = hf - φ' },
    { cat: 'Modern Physics (FSc-BS)', name: 'de Broglie', expr: 'λ = h/p' },
    { cat: 'Nuclear Physics (BS)', name: 'Radioactive Decay', expr: 'N = N₀e^(-λt)' },
    { cat: 'Nuclear Physics (BS)', name: 'Half-life', expr: 't½ = ln2/λ' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Bernoulli', expr: 'P + ½ρv² + ρgh = const' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Continuity', expr: 'A₁v₁ = A₂v₂' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: "Archimedes'", expr: 'F_b = ρVg' },
    { cat: 'Mechanics (9th-10th)', name: 'Weight', expr: 'W = mg' },
    { cat: 'Mechanics (9th-10th)', name: 'Density', expr: 'ρ = m/V' },
    { cat: 'Mechanics (9th-10th)', name: 'Pressure', expr: 'P = F/A' },
    { cat: 'Mechanics (9th-10th)', name: 'Speed', expr: 'v = d/t' },
    { cat: 'Mechanics (9th-10th)', name: 'Acceleration', expr: 'a = Δv/Δt' },
    { cat: 'Mechanics (9th-10th)', name: 'Free Fall Velocity', expr: 'v = √(2gh)' },
    { cat: 'Work & Energy (FSc)', name: 'Efficiency (machines)', expr: 'η = Output/Input × 100' },
    { cat: 'Work & Energy (FSc)', name: 'Elastic PE (general)', expr: 'U = ½Fx' },
    { cat: 'Rotational Motion (FSc)', name: 'Angular Velocity', expr: 'ω = Δθ/Δt' },
    { cat: 'Rotational Motion (FSc)', name: 'Angular Acceleration', expr: 'α = Δω/Δt' },
    { cat: 'Rotational Motion (FSc)', name: 'Centripetal Force', expr: 'Fc = mv²/r' },
    { cat: 'Rotational Motion (FSc)', name: 'Centripetal Acceleration', expr: 'ac = v²/r' },
    { cat: 'Gravitation (FSc)', name: 'Time Period (orbit)', expr: 'T = 2π√(r³/GM)' },
    { cat: 'Thermodynamics (FSc-BS)', name: '2nd Law (entropy)', expr: 'ΔS ≥ 0' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Carnot Efficiency', expr: 'η = 1 − Tc/Th' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Linear Expansion', expr: 'ΔL = L₀αΔT' },
    { cat: 'Electrostatics (FSc)', name: 'Capacitors in Series', expr: '1/C = 1/C₁ + 1/C₂ + ...' },
    { cat: 'Electrostatics (FSc)', name: 'Capacitors in Parallel', expr: 'C = C₁ + C₂ + ...' },
    { cat: 'Electrostatics (FSc)', name: 'Energy Stored in Capacitor', expr: 'U = ½CV²' },
    { cat: 'Electrostatics (FSc)', name: 'Electric Flux', expr: 'Φ = EA cosθ' },
    { cat: 'Current Electricity (FSc)', name: 'Resistors in Series', expr: 'R = R₁ + R₂ + ...' },
    { cat: 'Current Electricity (FSc)', name: 'Resistors in Parallel', expr: '1/R = 1/R₁ + 1/R₂ + ...' },
    { cat: 'Current Electricity (FSc)', name: 'Electrical Energy', expr: 'E = Pt' },
    { cat: 'Magnetism (FSc-BS)', name: 'Force between Parallel Wires', expr: 'F/L = μ₀I₁I₂/2πd' },
    { cat: 'Magnetism (FSc-BS)', name: 'Magnetic Field (solenoid)', expr: 'B = μ₀nI' },
    { cat: 'Waves & Sound (FSc)', name: 'Frequency-Period', expr: 'f = 1/T' },
    { cat: 'Waves & Sound (FSc)', name: 'Intensity of Sound', expr: 'I = P/A' },
    { cat: 'Waves & Sound (FSc)', name: 'Beat Frequency', expr: 'fbeat = |f₁ − f₂|' },
    { cat: 'Optics (FSc)', name: 'Magnification (lens)', expr: 'm = v/u = h_i/h_o' },
    { cat: 'Optics (FSc)', name: 'Power of Lens', expr: 'P = 1/f (in metres)' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Compton Effect', expr: 'Δλ = (h/m_ec)(1 − cosθ)' },
    { cat: 'Nuclear Physics (BS)', name: 'Binding Energy', expr: 'BE = Δmc²' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Pressure in Fluid', expr: 'P = ρgh' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: "Pascal's Law", expr: 'P₁ = P₂ (transmitted equally)' },
    { cat: 'Oscillations (FSc)', name: 'SHM Displacement', expr: 'x = A sin(ωt + φ)' },
    { cat: 'Oscillations (FSc)', name: 'Simple Pendulum Period', expr: 'T = 2π√(L/g)' },
    { cat: 'Oscillations (FSc)', name: 'Spring Period', expr: 'T = 2π√(m/k)' },
    { cat: 'Oscillations (FSc)', name: 'SHM Max Velocity', expr: 'vₘₐₓ = Aω' },
    { cat: 'Circular Motion (9th-FSc)', name: 'Centripetal Force', expr: 'F = mv²/r' },
    { cat: 'Circular Motion (9th-FSc)', name: 'Angular Velocity', expr: 'ω = v/r = 2π/T' },
    { cat: 'Wave Optics (FSc)', name: "Young's Double Slit", expr: 'y = mλD/d' },
    { cat: 'Wave Optics (FSc)', name: 'Diffraction Grating', expr: 'd sinθ = mλ' },
    { cat: 'Electromagnetism (FSc-BS)', name: "Ampere's Law", expr: '∮B·dl = μ₀I' },
    { cat: 'Electromagnetism (FSc-BS)', name: 'Solenoid Field', expr: 'B = μ₀nI' },
    { cat: 'Electromagnetism (FSc-BS)', name: 'Motional EMF', expr: 'ε = BLv' },
    { cat: 'Relativity (BS-MS)', name: 'Time Dilation', expr: "t' = t/√(1-v²/c²)" },
    { cat: 'Relativity (BS-MS)', name: 'Length Contraction', expr: "L' = L√(1-v²/c²)" },
    { cat: 'Relativity (BS-MS)', name: 'Relativistic Energy', expr: 'E = γmc²' },
    { cat: 'Quantum Mechanics (BS-MS)', name: "Heisenberg's Uncertainty", expr: 'Δx·Δp ≥ ħ/2' },
    { cat: 'Quantum Mechanics (BS-MS)', name: "Schrödinger's Equation", expr: 'iħ∂Ψ/∂t = ĤΨ' },
    { cat: 'Kinematics (9th-10th)', name: 'Average Speed', expr: 'speed = distance/time' },
    { cat: 'Kinematics (9th-10th)', name: 'Average Velocity', expr: 'v_avg = Δx/Δt' },
    { cat: 'Kinematics (9th-10th)', name: 'Acceleration', expr: 'a = (v-u)/t' },
    { cat: 'Forces (9th-10th)', name: "Newton's 1st Law", expr: 'Object at rest stays at rest unless acted on by force' },
    { cat: 'Forces (9th-10th)', name: "Newton's 3rd Law", expr: 'F₁₂ = −F₂₁' },
    { cat: 'Forces (9th-10th)', name: 'Weight', expr: 'W = mg' },
    { cat: 'Pressure (9th-10th)', name: 'Pressure', expr: 'P = F/A' },
    { cat: 'Pressure (9th-10th)', name: 'Pressure in Fluid', expr: 'P = ρgh' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Heat Transfer', expr: 'Q = mcΔT' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Linear Expansion', expr: 'ΔL = αLΔT' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Latent Heat', expr: 'Q = mL' },
    { cat: 'Simple Machines (9th-10th)', name: 'Mechanical Advantage', expr: 'MA = Load/Effort' },
    { cat: 'Simple Machines (9th-10th)', name: 'Efficiency', expr: 'η = (Output/Input) × 100' },
    { cat: 'Sound (9th-10th)', name: 'Speed of Sound', expr: 'v = fλ' },
    { cat: 'Sound (9th-10th)', name: 'Intensity', expr: 'I = P/A' },
    { cat: 'Errors & Measurements (9th-FSc)', name: 'Percentage Error', expr: '%E = (Δa/a) × 100' },
    { cat: 'Vectors (FSc)', name: 'Resultant Vector', expr: 'R = √(A²+B²+2ABcosθ)' },
    { cat: 'Vectors (FSc)', name: 'Vector Components', expr: 'Aₓ = A cosθ, Aᵧ = A sinθ' },
    { cat: 'Projectile Motion (FSc)', name: 'Time of Flight', expr: 'T = 2u sinθ/g' },
    { cat: 'Projectile Motion (FSc)', name: 'Max Height', expr: 'H = u²sin²θ/2g' },
    { cat: 'Projectile Motion (FSc)', name: 'Range', expr: 'R = u²sin2θ/g' },
    { cat: 'Elasticity (FSc)', name: "Young's Modulus", expr: 'Y = Stress/Strain' },
    { cat: 'Elasticity (FSc)', name: "Hooke's Law", expr: 'F = kx' },
    { cat: 'Current Electricity (FSc)', name: 'Series Resistance', expr: 'Rₜ = R₁+R₂+R₃' },
    { cat: 'Current Electricity (FSc)', name: 'Parallel Resistance', expr: '1/Rₜ = 1/R₁+1/R₂+1/R₃' },
    { cat: 'Current Electricity (FSc)', name: 'Kirchhoff\'s Voltage Law', expr: 'ΣV = 0 (closed loop)' },
    { cat: 'Current Electricity (FSc)', name: 'Terminal Voltage', expr: 'V = ε − Ir' },
    { cat: 'Astrophysics (BS)', name: "Hubble's Law", expr: 'v = H₀d' },
    { cat: 'Astrophysics (BS)', name: 'Kepler\'s Third Law', expr: 'T² ∝ r³' },
    { cat: 'Statistical Mechanics (MS)', name: 'Boltzmann Distribution', expr: 'P(E) ∝ e^(-E/kT)' },
    { cat: 'Statistical Mechanics (MS)', name: 'Entropy (Boltzmann)', expr: 'S = k ln(Ω)' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Schrödinger Equation (Time-Dependent)', expr: 'iℏ ∂ψ/∂t = Ĥψ' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Schrödinger Equation (Time-Independent)', expr: 'Ĥψ = Eψ' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'de Broglie Wavelength', expr: 'λ = h/p' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Heisenberg Uncertainty Principle', expr: 'ΔxΔp ≥ ℏ/2' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Particle in a Box Energy', expr: 'Eₙ = n²h²/8mL²' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Bohr Radius', expr: 'a₀ = ε₀h²/πme²' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Compton Wavelength Shift', expr: 'Δλ = (h/mc)(1−cosθ)' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Photoelectric Equation', expr: 'hν = φ + KEmax' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Wave Function Normalization', expr: '∫|ψ|²dx = 1' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Orbital Angular Momentum', expr: 'L = √(l(l+1)) ℏ' },
    { cat: 'Quantum Mechanics (MS)', name: 'Spin Magnetic Moment', expr: 'μ = −g μB S/ℏ' },
    { cat: 'Quantum Mechanics (MS)', name: 'Tunneling Probability', expr: 'T ≈ e^(-2κL), κ=√(2m(V−E))/ℏ' },
    { cat: 'Relativity (BS-MS)', name: 'Relativistic Momentum', expr: 'p = γmv' },
    { cat: 'Relativity (BS-MS)', name: 'Lorentz Factor', expr: 'γ = 1/√(1−v²/c²)' },
    { cat: 'Relativity (BS-MS)', name: 'Mass-Energy Equivalence', expr: 'E = mc²' },
    { cat: 'Relativity (BS-MS)', name: 'Relativistic Velocity Addition', expr: "u′ = (u+v)/(1+uv/c²)" },
    { cat: 'Relativity (BS-MS)', name: 'Spacetime Interval', expr: 's² = c²t² − x²' },
    { cat: 'Relativity (MS)', name: 'Relativistic Doppler Effect', expr: "f′ = f√[(1+β)/(1−β)]" },
    { cat: 'Statistical Mechanics (MS)', name: 'Partition Function', expr: 'Z = Σ e^(-Eᵢ/kT)' },
    { cat: 'Statistical Mechanics (MS)', name: 'Fermi-Dirac Distribution', expr: 'f(E) = 1/(e^((E−Ef)/kT)+1)' },
    { cat: 'Statistical Mechanics (MS)', name: 'Bose-Einstein Distribution', expr: 'f(E) = 1/(e^((E−μ)/kT)−1)' },
    { cat: 'Statistical Mechanics (MS)', name: 'Helmholtz Free Energy', expr: 'F = U − TS' },
    { cat: 'Statistical Mechanics (MS)', name: 'Gibbs Free Energy (statistical)', expr: 'G = H − TS' },
    { cat: 'Statistical Mechanics (MS)', name: 'Equipartition Theorem', expr: 'E = (f/2)kT per degree of freedom' },
    { cat: 'Statistical Mechanics (MS)', name: "Planck's Radiation Law", expr: 'u(ν,T) = (8πhν³/c³)·1/(e^(hν/kT)−1)' },
    { cat: 'Statistical Mechanics (MS)', name: 'Maxwell-Boltzmann Speed Distribution', expr: 'f(v) ∝ v²e^(-mv²/2kT)' },
    { cat: 'Electromagnetism (BS-MS)', name: "Gauss's Law", expr: '∮E·dA = Q/ε₀' },
    { cat: 'Electromagnetism (BS-MS)', name: "Ampere's Law", expr: '∮B·dl = μ₀I' },
    { cat: 'Electromagnetism (BS-MS)', name: "Faraday's Law", expr: 'ε = −dΦ/dt' },
    { cat: 'Electromagnetism (BS-MS)', name: "Maxwell's Equations", expr: '∇·E=ρ/ε₀, ∇·B=0, ∇×E=−∂B/∂t, ∇×B=μ₀J+μ₀ε₀∂E/∂t' },
    { cat: 'Electromagnetism (BS-MS)', name: 'Poynting Vector', expr: 'S = (1/μ₀) E×B' },
    { cat: 'Electromagnetism (BS-MS)', name: 'EM Wave Speed', expr: 'c = 1/√(μ₀ε₀)' },
    { cat: 'Electromagnetism (BS-MS)', name: 'Displacement Current', expr: 'Id = ε₀ dΦE/dt' },
    { cat: 'Electromagnetism (MS)', name: 'Magnetic Vector Potential', expr: 'B = ∇×A' },
    { cat: 'Electromagnetism (MS)', name: 'Skin Depth', expr: 'δ = √(2/ωμσ)' },
    { cat: 'Electromagnetism (BS-MS)', name: 'Lorentz Force Law', expr: 'F = q(E + v×B)' },
    { cat: 'Thermodynamics (BS-MS)', name: 'First Law of Thermodynamics', expr: 'dU = δQ − δW' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Second Law (entropy form)', expr: 'dS ≥ δQ/T' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Carnot Efficiency', expr: 'η = 1 − Tc/Th' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Gibbs Free Energy', expr: 'G = H − TS' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Helmholtz Free Energy', expr: 'A = U − TS' },
    { cat: 'Thermodynamics (MS)', name: 'Maxwell Relations', expr: '(∂T/∂V)ₛ = −(∂P/∂S)ᵥ (and 3 analogous)' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Clausius-Clapeyron (Physics)', expr: 'dP/dT = L/(TΔV)' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Enthalpy', expr: 'H = U + PV' },
    { cat: 'Thermodynamics (MS)', name: 'Chemical Potential', expr: 'μᵢ = (∂G/∂nᵢ)T,P,nⱼ' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Third Law of Thermodynamics', expr: 'S → 0 as T → 0 K for a perfect crystal' },
    { cat: 'Nuclear Physics (BS)', name: 'Radioactive Decay Law', expr: 'N = N₀e^(-λt)' },
    { cat: 'Nuclear Physics (BS)', name: 'Half-Life', expr: 't½ = ln2/λ' },
    { cat: 'Nuclear Physics (BS)', name: 'Mass Defect', expr: 'Δm = Zmp + Nmn − M' },
    { cat: 'Nuclear Physics (BS)', name: 'Binding Energy', expr: 'BE = Δmc²' },
    { cat: 'Nuclear Physics (BS)', name: 'Nuclear Radius', expr: 'R = R₀A^(1/3)' },
    { cat: 'Nuclear Physics (BS)', name: 'Activity', expr: 'A = λN' },
    { cat: 'Nuclear Physics (BS-MS)', name: 'Q-value of Reaction', expr: 'Q = (Σm_initial − Σm_final)c²' },
    { cat: 'Nuclear Physics (BS)', name: 'Decay Constant Relation', expr: 'λ = 0.693/t½' },
    { cat: 'Solid State Physics (BS-MS)', name: "Bragg's Law", expr: 'nλ = 2d sinθ' },
    { cat: 'Solid State Physics (BS-MS)', name: 'Fermi Energy', expr: 'Ef = (ℏ²/2m)(3π²n)^(2/3)' },
    { cat: 'Solid State Physics (MS)', name: 'Density of States', expr: 'g(E) ∝ √E (free electron model)' },
    { cat: 'Solid State Physics (BS-MS)', name: 'Hall Effect', expr: 'VH = IB/(nqt)' },
    { cat: 'Solid State Physics (MS)', name: 'Band Gap Energy', expr: 'Eg = Ec − Ev' },
    { cat: 'Solid State Physics (BS-MS)', name: 'Miller Indices', expr: '(hkl) from reciprocal intercepts' },
    { cat: 'Solid State Physics (BS-MS)', name: 'Curie-Weiss Law', expr: 'χ = C/(T−θ)' },
    { cat: 'Solid State Physics (MS)', name: 'London Penetration Depth', expr: 'λL = √(m/μ₀nse²)' },
    { cat: 'Optics (BS-MS)', name: "Lens Maker's Equation", expr: '1/f = (n−1)(1/R₁−1/R₂)' },
    { cat: 'Optics (BS-MS)', name: 'Diffraction Grating', expr: 'd sinθ = mλ' },
    { cat: 'Optics (BS-MS)', name: "Malus's Law", expr: 'I = I₀cos²θ' },
    { cat: 'Optics (BS-MS)', name: "Brewster's Angle", expr: 'tanθB = n₂/n₁' },
    { cat: 'Optics (BS-MS)', name: 'Rayleigh Criterion', expr: 'θmin = 1.22λ/D' },
    { cat: 'Optics (MS)', name: 'Fresnel Equations', expr: 'reflectance/transmittance at an interface' },
    { cat: 'Optics (BS-MS)', name: 'Numerical Aperture', expr: 'NA = n sinθ' },
    { cat: 'Optics (BS-MS)', name: 'Interference Fringe Width', expr: 'β = λD/d' },
    { cat: 'Classical Mechanics (BS-MS)', name: 'Lagrangian', expr: 'L = T − V' },
    { cat: 'Classical Mechanics (BS-MS)', name: 'Euler-Lagrange Equation', expr: 'd/dt(∂L/∂q̇) − ∂L/∂q = 0' },
    { cat: 'Classical Mechanics (BS-MS)', name: 'Hamiltonian', expr: 'H = Σ p q̇ − L' },
    { cat: 'Classical Mechanics (BS-MS)', name: "Hamilton's Equations", expr: 'q̇ = ∂H/∂p,  ṗ = −∂H/∂q' },
    { cat: 'Classical Mechanics (BS-MS)', name: 'Generalized Momentum', expr: 'p = ∂L/∂q̇' },
    { cat: 'Classical Mechanics (MS)', name: 'Poisson Bracket', expr: '{f,g} = Σ(∂f/∂q ∂g/∂p − ∂f/∂p ∂g/∂q)' },
    { cat: 'Classical Mechanics (BS-MS)', name: 'Principle of Least Action', expr: 'δ∫L dt = 0' },
    { cat: 'Classical Mechanics (BS-MS)', name: 'Moment of Inertia Tensor', expr: 'Iᵢⱼ = Σm(r²δᵢⱼ − xᵢxⱼ)' },
    { cat: 'Astrophysics (BS-MS)', name: 'Stefan-Boltzmann Law', expr: 'L = 4πR²σT⁴' },
    { cat: 'Astrophysics (BS-MS)', name: "Wien's Displacement Law", expr: 'λmax T = b' },
    { cat: 'Astrophysics (BS-MS)', name: 'Schwarzschild Radius', expr: 'Rs = 2GM/c²' },
    { cat: 'Astrophysics (BS-MS)', name: 'Escape Velocity', expr: 'v = √(2GM/R)' },
    { cat: 'Astrophysics (MS)', name: 'Luminosity Distance', expr: 'dL = √(L/4πF)' },
    { cat: 'Astrophysics (MS)', name: 'Chandrasekhar Limit', expr: '≈1.4 M☉ (max stable white dwarf mass)' },
    { cat: 'Fluid Mechanics (BS-MS)', name: 'Navier-Stokes Equation', expr: 'ρ(∂v/∂t + v·∇v) = −∇P + μ∇²v + f' },
    { cat: 'Fluid Mechanics (BS-MS)', name: 'Reynolds Number', expr: 'Re = ρvL/μ' },
    { cat: 'Fluid Mechanics (BS-MS)', name: "Bernoulli's Equation", expr: 'P + ½ρv² + ρgh = constant' },
    { cat: 'Fluid Mechanics (BS-MS)', name: 'Continuity Equation', expr: 'A₁v₁ = A₂v₂' },
    { cat: 'Fluid Mechanics (BS-MS)', name: "Poiseuille's Law", expr: 'Q = πr⁴ΔP/8ηL' },
    { cat: 'Fluid Mechanics (BS-MS)', name: "Stokes' Law", expr: 'F = 6πηrv' },
    { cat: 'Condensed Matter (MS)', name: 'Debye Temperature', expr: 'θD = ℏωmax/kB' },
    { cat: 'Condensed Matter (MS)', name: 'BCS Theory (Energy Gap)', expr: 'Δ ≈ 1.76 kBTc' },
    { cat: 'Condensed Matter (MS)', name: 'London Equations', expr: '∂J/∂t = (ns e²/m)E' },
    { cat: 'Condensed Matter (MS)', name: 'Cooper Pair Binding', expr: 'binding energy ≈ 2Δ' },
    { cat: 'Condensed Matter (MS)', name: 'Meissner Effect', expr: 'B = 0 inside a superconductor' },
  ],

  Chemistry: [
    { cat: 'Atomic Structure (FSc)', name: "Bohr's Energy", expr: 'Eₙ = -13.6/n² eV' },
    { cat: 'Atomic Structure (FSc)', name: 'Rydberg Equation', expr: '1/λ = R(1/n₁² - 1/n₂²)' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Ideal Gas', expr: 'PV = nRT' },
    { cat: 'Gas Laws (9th-FSc)', name: "Boyle's Law", expr: 'P₁V₁ = P₂V₂' },
    { cat: 'Gas Laws (9th-FSc)', name: "Charles's Law", expr: 'V₁/T₁ = V₂/T₂' },
    { cat: 'Thermodynamics (FSc-BS)', name: '1st Law', expr: 'ΔU = q + w' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Enthalpy', expr: 'H = U + PV' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Gibbs Free Energy', expr: 'ΔG = ΔH - TΔS' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Equilibrium Constant', expr: 'Kc = [C]ᶜ[D]ᵈ/[A]ᵃ[B]ᵇ' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Kp & Kc Relation', expr: 'Kp = Kc(RT)^Δn' },
    { cat: 'Kinetics (FSc-BS)', name: 'Rate Law', expr: 'Rate = k[A]ᵐ[B]ⁿ' },
    { cat: 'Kinetics (FSc-BS)', name: 'Arrhenius', expr: 'k = Ae^(-Ea/RT)' },
    { cat: 'Kinetics (FSc-BS)', name: 'First Order Half-life', expr: 't½ = 0.693/k' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Nernst Equation', expr: 'E = E° - (RT/nF)lnQ' },
    { cat: 'Electrochemistry (FSc-BS)', name: "Faraday's Law", expr: 'm = ZIt' },
    { cat: 'Solutions (FSc)', name: 'Molarity', expr: 'M = mol solute / L solution' },
    { cat: 'Solutions (FSc)', name: 'Molality', expr: 'm = mol solute / kg solvent' },
    { cat: 'Solutions (FSc)', name: "Raoult's Law", expr: 'P = P°X' },
    { cat: 'Solutions (FSc)', name: 'Freezing Point', expr: 'ΔTf = Kf × m' },
    { cat: 'Solutions (FSc)', name: 'Boiling Point', expr: 'ΔTb = Kb × m' },
    { cat: 'Solutions (FSc)', name: 'Osmotic Pressure', expr: 'π = MRT' },
    { cat: 'Acid-Base (FSc-BS)', name: 'pH', expr: 'pH = -log[H⁺]' },
    { cat: 'Acid-Base (FSc-BS)', name: 'pOH', expr: 'pOH = -log[OH⁻]' },
    { cat: 'Acid-Base (FSc-BS)', name: 'pH + pOH', expr: 'pH + pOH = 14' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Henderson-Hasselbalch', expr: 'pH = pKa + log([A⁻]/[HA])' },
    { cat: 'Organic (FSc-BS)', name: 'Degree of Unsaturation', expr: 'DoU = (2C + 2 + N - H)/2' },
    { cat: 'Stoichiometry (9th-10th)', name: 'Moles', expr: 'n = mass/molar mass' },
    { cat: 'Stoichiometry (9th-10th)', name: 'Molar Volume (STP)', expr: 'n = V/22.4 L' },
    { cat: 'Stoichiometry (9th-10th)', name: 'Percentage Yield', expr: '%Yield = (Actual/Theoretical) × 100' },
    { cat: 'Atomic Structure (9th-FSc)', name: 'Number of Electrons in Shell', expr: 'max e⁻ = 2n²' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Standard Cell Potential', expr: 'E°cell = E°cathode − E°anode' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Gibbs–Cell Potential', expr: 'ΔG° = −nFE°' },
    { cat: 'Coordination Chemistry (BS)', name: 'Crystal Field Splitting', expr: 'Δₒ = 10Dq' },
    { cat: 'Nuclear Chemistry (FSc-BS)', name: 'Mass Defect', expr: 'Δm = Zmₚ + Nmₙ − M' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'van der Waals Equation', expr: '(P + a n²/V²)(V − nb) = nRT' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Clausius–Clapeyron', expr: 'ln(P₂/P₁) = −ΔHvap/R (1/T₂ − 1/T₁)' },
    { cat: 'Basic Concepts (9th)', name: 'Avogadro\'s Number', expr: 'Nₐ = 6.022 × 10²³ /mol' },
    { cat: 'Basic Concepts (9th)', name: 'Percentage Composition', expr: '%element = (mass element/molar mass) × 100' },
    { cat: 'Basic Concepts (9th)', name: 'Empirical Formula Mass', expr: 'n = molecular mass/empirical mass' },
    { cat: 'Gas Laws (9th-FSc)', name: "Gay-Lussac's Law", expr: 'P₁/T₁ = P₂/T₂' },
    { cat: 'Gas Laws (9th-FSc)', name: "Avogadro's Law", expr: 'V₁/n₁ = V₂/n₂' },
    { cat: 'Gas Laws (9th-FSc)', name: "Graham's Law of Diffusion", expr: 'r₁/r₂ = √(M₂/M₁)' },
    { cat: 'Gas Laws (9th-FSc)', name: "Dalton's Law", expr: 'Pₜ = P₁+P₂+P₃+...' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Formal Charge', expr: 'FC = V − N − B/2' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Bond Order', expr: 'BO = (bonding e⁻ − antibonding e⁻)/2' },
    { cat: 'Kinetics (FSc-BS)', name: 'Zero Order Half-life', expr: 't½ = [A]₀/2k' },
    { cat: 'Kinetics (FSc-BS)', name: 'Second Order Integrated Rate', expr: '1/[A] = kt + 1/[A]₀' },
    { cat: 'Solutions (FSc)', name: 'Dilution Formula', expr: 'M₁V₁ = M₂V₂' },
    { cat: 'Solutions (FSc)', name: 'Mole Fraction', expr: 'X_A = nₐ/(nₐ+n_b)' },
    { cat: 'Solutions (FSc)', name: 'Parts per Million', expr: 'ppm = (mass solute/mass solution) × 10⁶' },
    { cat: 'Titration (FSc)', name: 'Normality', expr: 'N = molarity × n-factor' },
    { cat: 'Titration (FSc)', name: 'Titration Equation', expr: 'N₁V₁ = N₂V₂' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Faraday\'s Second Law', expr: 'm/M = Q/(nF)' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Alkane Formula', expr: 'CₙH₂ₙ₊₂' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Alkene Formula', expr: 'CₙH₂ₙ' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Alkyne Formula', expr: 'CₙH₂ₙ₋₂' },
    { cat: 'Environmental Chemistry (FSc-BS)', name: 'Hardness of Water', expr: 'as CaCO₃ (mg/L)' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Beer-Lambert Law', expr: 'A = εcl' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Raoult\'s Law (vapor pressure)', expr: 'P = ΣXᵢPᵢ°' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Rate Constant (Arrhenius log form)', expr: 'log k = log A − Ea/2.303RT' },
    { cat: 'Spectroscopy (BS-MS)', name: 'Planck-Einstein Relation', expr: 'E = hν = hc/λ' },
    { cat: 'Basic Concepts (9th)', name: 'Relative Atomic Mass', expr: 'Ar = mass of atom / (1/12 mass of C-12)' },
    { cat: 'Basic Concepts (9th)', name: 'Molar Mass', expr: 'M = mass/mol' },
    { cat: 'Basic Concepts (9th)', name: 'Law of Conservation of Mass', expr: 'mass of reactants = mass of products' },
    { cat: 'Basic Concepts (9th)', name: 'Law of Definite Proportions', expr: 'compound has fixed ratio of elements by mass' },
    { cat: 'Gas Laws (9th-FSc)', name: "Boyle's Law", expr: 'P₁V₁ = P₂V₂' },
    { cat: 'Gas Laws (9th-FSc)', name: "Charles's Law", expr: 'V₁/T₁ = V₂/T₂' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Combined Gas Law', expr: 'P₁V₁/T₁ = P₂V₂/T₂' },
    { cat: 'Stoichiometry (9th-10th)', name: 'Limiting Reagent (concept)', expr: 'reagent that produces least product runs out first' },
    { cat: 'Atomic Structure (9th-FSc)', name: 'Bohr Radius', expr: 'rₙ = n²h²/(4π²mke²)' },
    { cat: 'Atomic Structure (9th-FSc)', name: 'Energy Levels (Bohr)', expr: 'Eₙ = −13.6/n² eV' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Octet Rule', expr: 'atoms gain/lose/share e⁻ to have 8 valence e⁻' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'VSEPR (basic)', expr: 'electron pairs arrange to minimize repulsion' },
    { cat: 'Kinetics (FSc-BS)', name: 'Rate Law', expr: 'Rate = k[A]ᵐ[B]ⁿ' },
    { cat: 'Kinetics (FSc-BS)', name: 'First Order Half-life', expr: 't½ = 0.693/k' },
    { cat: 'Kinetics (FSc-BS)', name: 'Arrhenius Equation', expr: 'k = Ae^(−Ea/RT)' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Equilibrium Constant', expr: 'Kc = [products]/[reactants]' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Kp-Kc Relation', expr: 'Kp = Kc(RT)^Δn' },
    { cat: 'Equilibrium (FSc-BS)', name: "Le Chatelier's Principle", expr: 'system shifts to counter applied stress' },
    { cat: 'Thermochemistry (FSc-BS)', name: 'Enthalpy Change', expr: 'ΔH = H_products − H_reactants' },
    { cat: 'Thermochemistry (FSc-BS)', name: "Hess's Law", expr: 'ΔH_total = ΣΔH_steps' },
    { cat: 'Thermochemistry (FSc-BS)', name: 'Gibbs Free Energy', expr: 'ΔG = ΔH − TΔS' },
    { cat: 'Solutions (FSc)', name: 'Percent by Mass', expr: '% = (mass solute/mass solution) × 100' },
    { cat: 'Solutions (FSc)', name: 'Percent by Volume', expr: '% = (vol solute/vol solution) × 100' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'Degree of Unsaturation (alt)', expr: 'DoU = (2C+2−H)/2 (no N)' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'Empirical Formula (organic)', expr: 'simplest whole-number mole ratio of elements' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Faraday Constant', expr: 'F = 96500 C/mol' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Molar Conductivity', expr: 'Λm = κ/C' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Ka-Kb Relation', expr: 'Ka × Kb = Kw' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Buffer Capacity (concept)', expr: 'resists pH change on addition of acid/base' },
    { cat: 'Physical Chemistry (BS-MS)', name: "Osmotic Pressure (van't Hoff)", expr: 'π = iMRT' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Freezing Point Depression (van\'t Hoff)', expr: 'ΔTf = iKfm' },
    { cat: 'Nuclear Chemistry (FSc-BS)', name: 'Half-life (nuclear)', expr: 'N = N₀(½)^(t/t½)' },
    { cat: 'Coordination Chemistry (BS)', name: 'EAN Rule', expr: 'EAN = Z − oxidation state + 2×CN' },
    { cat: 'Environmental Chemistry (FSc-BS)', name: 'BOD', expr: 'Biochemical Oxygen Demand (mg/L)' },
    { cat: 'Basic Concepts (9th)', name: "Law of Multiple Proportions", expr: 'masses of one element combine with fixed mass of other in small whole numbers' },
    { cat: 'Basic Concepts (9th)', name: "Law of Reciprocal Proportions", expr: 'ratio of masses combining with fixed mass of a third element' },
    { cat: 'Atomic Structure (9th-FSc)', name: 'de Broglie Wavelength', expr: 'λ = h/mv' },
    { cat: 'Atomic Structure (9th-FSc)', name: "Heisenberg's Uncertainty Principle", expr: 'Δx·Δp ≥ h/4π' },
    { cat: 'Atomic Structure (9th-FSc)', name: 'Frequency-Wavelength Relation', expr: 'c = νλ' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Dipole Moment', expr: 'μ = q × d' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Percentage Ionic Character', expr: '%IC = (μobs/μionic) × 100' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Lattice Energy (Born-Landé)', expr: 'U = −NAMz⁺z⁻e²/(4πε₀r₀)(1−1/n)' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Kinetic Energy of Gas', expr: 'KE = (3/2)RT (per mole)' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Root Mean Square Speed', expr: 'vrms = √(3RT/M)' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Real Gas Deviation (Z)', expr: 'Z = PV/nRT' },
    { cat: 'Kinetics (FSc-BS)', name: 'Third Order Half-life', expr: 't½ = 3/(2k[A]₀²)' },
    { cat: 'Kinetics (FSc-BS)', name: 'Activation Energy (two-point)', expr: 'ln(k₂/k₁) = −Ea/R(1/T₂ − 1/T₁)' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Solubility Product', expr: 'Ksp = [Aⁿ⁺]ᵐ[Bᵐ⁻]ⁿ' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Common Ion Effect (concept)', expr: 'adding common ion shifts equilibrium, lowers solubility' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Conductivity Cell Constant', expr: 'κ = G × (l/A)' },
    { cat: 'Electrochemistry (FSc-BS)', name: "Kohlrausch's Law", expr: 'Λm° = λ°+ + λ°−' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Alcohol Formula', expr: 'CₙH₂ₙ₊₁OH' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'Percentage of Element (Organic)', expr: '%C = (mass CO₂ × 12/44 × 100)/sample mass' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Entropy Change', expr: 'ΔS = qrev/T' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Work Done (expansion)', expr: 'w = −PΔV' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Bond Enthalpy Calculation', expr: 'ΔH = Σ(bonds broken) − Σ(bonds formed)' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Percent Transmittance', expr: '%T = (I/I₀) × 100' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Detection Limit (3σ)', expr: 'LOD = 3σ/slope' },
    { cat: 'Physical Chemistry (BS-MS)', name: "Henry's Law", expr: 'P = KH·X' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Surface Tension', expr: 'γ = F/L' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Gibbs Free Energy Change', expr: 'ΔG = ΔH − TΔS' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Gibbs-Helmholtz Equation', expr: '[∂(ΔG/T)/∂T]P = −ΔH/T²' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Equilibrium Constant', expr: 'Kc = [products]/[reactants]' },
    { cat: 'Physical Chemistry (BS-MS)', name: "Van't Hoff Equation", expr: 'ln(K2/K1) = −(ΔH/R)(1/T2−1/T1)' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Nernst Equation', expr: 'E = E° − (RT/nF)lnQ' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Gibbs Phase Rule', expr: 'F = C − P + 2' },
    { cat: 'Physical Chemistry (MS)', name: 'Debye-Hückel Limiting Law', expr: 'logγ± = −A|z+z−|√I' },
    { cat: 'Physical Chemistry (MS)', name: 'Fugacity', expr: 'f = γP (effective pressure of real gas)' },
    { cat: 'Physical Chemistry (MS)', name: 'Partial Molar Volume', expr: 'V̄ᵢ = (∂V/∂nᵢ)T,P,nⱼ' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Activity Coefficient', expr: 'a = γC' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Ideal Gas Entropy Change', expr: 'ΔS = nR ln(V₂/V₁)' },
    { cat: 'Physical Chemistry (BS-MS)', name: "Van't Hoff Osmotic Pressure", expr: 'π = MRT' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Chemical Potential', expr: 'μ = μ° + RT ln(a)' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Boiling Point Elevation', expr: 'ΔTb = Kb·m' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Titration Equivalence', expr: 'N₁V₁ = N₂V₂' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'pH Calculation', expr: 'pH = −log[H⁺]' },
    { cat: 'Analytical Chemistry (MS)', name: 'Buffer Capacity', expr: 'β = dCb/d(pH)' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Standard Deviation of Measurements', expr: 'σ = √(Σ(x−x̄)²/(n−1))' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Relative Standard Deviation', expr: 'RSD = (σ/x̄) × 100' },
    { cat: 'Analytical Chemistry (MS)', name: 'Signal to Noise Ratio', expr: 'S/N = signal amplitude / noise amplitude' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Calibration Curve Slope', expr: 'y = mx + c (response vs concentration)' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Limit of Quantification', expr: 'LOQ = 10σ/slope' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Retention Factor (Chromatography)', expr: 'Rf = distance by solute / distance by solvent' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Chromatographic Resolution', expr: 'Rs = 2(tR2−tR1)/(w1+w2)' },
    { cat: 'Quantum Chemistry (BS-MS)', name: 'Particle in a Box (Chemistry)', expr: 'E = n²h²/8mL²' },
    { cat: 'Quantum Chemistry (MS)', name: 'Hückel Molecular Orbital Theory', expr: 'E = α + xβ (secular determinant solution)' },
    { cat: 'Quantum Chemistry (BS-MS)', name: 'Molecular Orbital Bond Order', expr: 'BO = (bonding e⁻ − antibonding e⁻)/2' },
    { cat: 'Quantum Chemistry (MS)', name: 'Variation Principle', expr: 'E_trial ≥ E_ground state' },
    { cat: 'Quantum Chemistry (MS)', name: 'Born-Oppenheimer Approximation', expr: 'nuclear and electronic motion separated' },
    { cat: 'Quantum Chemistry (BS-MS)', name: 'Hybridization', expr: 'sp, sp², sp³ orbital mixing' },
    { cat: 'Quantum Chemistry (MS)', name: "Slater's Rules", expr: 'estimate effective nuclear charge Zeff' },
    { cat: 'Quantum Chemistry (BS-MS)', name: 'Aufbau Principle', expr: 'electrons fill lowest energy orbitals first' },
    { cat: 'Quantum Chemistry (BS-MS)', name: 'Pauli Exclusion Principle', expr: 'no two electrons share all 4 quantum numbers' },
    { cat: 'Quantum Chemistry (BS-MS)', name: "Hund's Rule", expr: 'degenerate orbitals fill singly before pairing' },
    { cat: 'Electrochemistry (BS-MS)', name: "Faraday's Law of Electrolysis", expr: 'm = (Q×M)/(nF)' },
    { cat: 'Electrochemistry (BS-MS)', name: 'Cell Potential', expr: 'E°cell = E°cathode − E°anode' },
    { cat: 'Electrochemistry (BS-MS)', name: 'Conductivity', expr: 'κ = 1/ρ' },
    { cat: 'Electrochemistry (BS-MS)', name: 'Molar Conductivity', expr: 'Λm = κ/C' },
    { cat: 'Electrochemistry (BS-MS)', name: "Kohlrausch's Law", expr: 'Λm° = λ°+ + λ°−' },
    { cat: 'Electrochemistry (BS-MS)', name: 'ΔG-E Relation', expr: 'ΔG° = −nFE°' },
    { cat: 'Electrochemistry (BS-MS)', name: 'K-E Relation', expr: 'ΔG° = −RT lnK' },
    { cat: 'Electrochemistry (MS)', name: 'Overpotential', expr: 'η = Eapplied − Eequilibrium' },
    { cat: 'Electrochemistry (BS-MS)', name: 'Electrochemical Series', expr: 'ranking of standard electrode potentials' },
    { cat: 'Electrochemistry (MS)', name: 'Debye-Hückel-Onsager Equation', expr: 'Λm = Λm° − (A+BΛm°)√C' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: 'Enthalpy of Formation', expr: 'ΔHf° (standard reference state = 0)' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: "Hess's Law", expr: 'ΔHrxn = ΣΔHf(products) − ΣΔHf(reactants)' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: "Kirchhoff's Law (thermochemistry)", expr: 'ΔH₂ = ΔH₁ + ΔCpΔT' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: 'Bond Dissociation Energy', expr: 'ΔH = Σ(bonds broken) − Σ(bonds formed)' },
    { cat: 'Thermodynamics (Chemistry, MS)', name: 'Entropy of Mixing', expr: 'ΔSmix = −R Σ xᵢ ln xᵢ' },
    { cat: 'Thermodynamics (Chemistry, MS)', name: "Trouton's Rule", expr: 'ΔSvap ≈ 88 J/(mol·K)' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: 'Clapeyron Equation', expr: 'dP/dT = ΔH/(TΔV)' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: 'Standard Free Energy of Formation', expr: 'ΔGf°' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: "Le Chatelier's Principle", expr: 'system shifts to counteract applied stress' },
    { cat: 'Thermodynamics (Chemistry, BS-MS)', name: 'Kp-Kc Relation', expr: 'Kp = Kc(RT)^Δn' },
    { cat: 'Kinetics (BS-MS)', name: 'General Rate Law', expr: 'rate = k[A]^m[B]^n' },
    { cat: 'Kinetics (BS-MS)', name: 'Zero Order Integrated Law', expr: '[A] = [A]₀ − kt' },
    { cat: 'Kinetics (BS-MS)', name: 'First Order Integrated Law', expr: 'ln[A] = ln[A]₀ − kt' },
    { cat: 'Kinetics (BS-MS)', name: 'Second Order Integrated Law', expr: '1/[A] = 1/[A]₀ + kt' },
    { cat: 'Kinetics (BS-MS)', name: 'Half-life (first order)', expr: 't½ = 0.693/k' },
    { cat: 'Kinetics (BS-MS)', name: 'Arrhenius Equation', expr: 'k = A e^(-Ea/RT)' },
    { cat: 'Kinetics (MS)', name: 'Steady State Approximation', expr: 'd[intermediate]/dt ≈ 0' },
    { cat: 'Kinetics (BS-MS)', name: 'Michaelis-Menten Kinetics (Chem)', expr: 'v = Vmax[S]/(Km+[S])' },
    { cat: 'Spectroscopy (BS-MS)', name: 'Beer-Lambert Law', expr: 'A = εcl' },
    { cat: 'Spectroscopy (BS-MS)', name: 'Wavenumber', expr: 'ṽ = 1/λ' },
    { cat: 'Spectroscopy (MS)', name: 'NMR Chemical Shift', expr: 'δ = (νsample − νreference)/νreference × 10⁶' },
    { cat: 'Spectroscopy (BS-MS)', name: 'IR Vibrational Frequency', expr: 'ṽ = (1/2πc)√(k/μ)' },
    { cat: 'Spectroscopy (BS-MS)', name: 'Mass Spectrometry m/z', expr: 'm/z = mass / charge' },
    { cat: 'Spectroscopy (MS)', name: 'Franck-Condon Principle', expr: 'electronic transitions occur with fixed nuclear positions' },
    { cat: 'Coordination Chemistry (BS-MS)', name: 'Crystal Field Splitting Energy', expr: 'Δo (octahedral field splitting)' },
    { cat: 'Coordination Chemistry (BS-MS)', name: 'Effective Atomic Number Rule', expr: 'EAN = Z − oxidation state + 2×CN' },
    { cat: 'Coordination Chemistry (MS)', name: 'Ligand Field Stabilization Energy', expr: 'LFSE = (−0.4nt2g + 0.6neg)Δo' },
    { cat: 'Coordination Chemistry (BS-MS)', name: 'Spin-Only Magnetic Moment', expr: 'μ = √(n(n+2)) BM' },
    { cat: 'Coordination Chemistry (BS-MS)', name: 'Coordination Number', expr: 'number of donor atoms bonded to central metal' },
    { cat: 'Coordination Chemistry (BS-MS)', name: 'Chelate Effect', expr: 'polydentate ligands form more stable complexes' },
    { cat: 'Coordination Chemistry (MS)', name: 'Jahn-Teller Distortion', expr: 'geometric distortion removing orbital degeneracy' },
    { cat: 'Coordination Chemistry (BS-MS)', name: 'Nomenclature of Complexes', expr: 'ligands (alphabetical) + metal + oxidation state' },
    { cat: 'Nuclear Chemistry (BS-MS)', name: 'Radioactive Decay (Chemistry)', expr: 'N = N₀e^(-λt)' },
    { cat: 'Nuclear Chemistry (BS-MS)', name: 'Half-Life (Chemistry)', expr: 't½ = 0.693/λ' },
    { cat: 'Nuclear Chemistry (BS-MS)', name: 'Mass-Energy Relation', expr: 'E = Δmc²' },
    { cat: 'Nuclear Chemistry (MS)', name: 'Specific Activity', expr: 'SA = activity / mass of sample' },
    { cat: 'Nuclear Chemistry (BS-MS)', name: 'Binding Energy per Nucleon', expr: 'BE/A' },
    { cat: 'Nuclear Chemistry (BS-MS)', name: 'Decay Series', expr: 'sequential α/β decays to a stable isotope' },
    { cat: 'Organic Chemistry (BS-MS)', name: 'SN1 Reaction Rate', expr: 'rate = k[substrate]' },
    { cat: 'Organic Chemistry (BS-MS)', name: 'SN2 Reaction Rate', expr: 'rate = k[substrate][nucleophile]' },
    { cat: 'Organic Chemistry (BS-MS)', name: "Markovnikov's Rule", expr: 'H adds to carbon with more H atoms' },
    { cat: 'Organic Chemistry (BS-MS)', name: 'Degree of Unsaturation', expr: 'DoU = (2C+2+N−H)/2' },
    { cat: 'Organic Chemistry (BS-MS)', name: "Zaitsev's Rule", expr: 'major product = more substituted alkene' },
    { cat: 'Organic Chemistry (MS)', name: 'Hammett Equation', expr: 'log(k/k₀) = ρσ' },
    { cat: 'Organic Chemistry (BS-MS)', name: "Aromaticity (Hückel's Rule)", expr: '4n+2 π electrons' },
    { cat: 'Organic Chemistry (BS-MS)', name: 'Optical Rotation', expr: '[α] = α/(l×c)' },
    { cat: 'Polymer Chemistry (BS-MS)', name: 'Degree of Polymerization', expr: 'DP = Mn/M₀' },
    { cat: 'Polymer Chemistry (BS-MS)', name: 'Number Average Molecular Weight', expr: 'Mn = ΣNᵢMᵢ/ΣNᵢ' },
    { cat: 'Polymer Chemistry (BS-MS)', name: 'Weight Average Molecular Weight', expr: 'Mw = ΣNᵢMᵢ²/ΣNᵢMᵢ' },
    { cat: 'Polymer Chemistry (BS-MS)', name: 'Polydispersity Index', expr: 'PDI = Mw/Mn' },
  ],

  Biology: [
    { cat: 'Genetics (FSc-BS)', name: 'Hardy-Weinberg', expr: 'p² + 2pq + q² = 1' },
    { cat: 'Genetics (FSc-BS)', name: 'Allele Frequency', expr: 'p + q = 1' },
    { cat: 'Genetics (FSc-BS)', name: 'Dihybrid Ratio', expr: '9:3:3:1' },
    { cat: 'Genetics (FSc-BS)', name: 'Recombination Frequency', expr: 'RF = recombinants/total × 100' },
    { cat: 'Ecology (FSc-BS)', name: 'Exponential Growth', expr: 'dN/dt = rN' },
    { cat: 'Ecology (FSc-BS)', name: 'Logistic Growth', expr: 'dN/dt = rN(1 - N/K)' },
    { cat: 'Ecology (FSc-BS)', name: 'Growth Rate', expr: 'r = (births - deaths)/N' },
    { cat: 'Physiology (FSc-BS)', name: 'Cardiac Output', expr: 'CO = HR × SV' },
    { cat: 'Physiology (FSc-BS)', name: 'BMI', expr: 'BMI = weight(kg)/height(m)²' },
    { cat: 'Physiology (FSc-BS)', name: 'Mean Arterial Pressure', expr: 'MAP = DP + ⅓(SP - DP)' },
    { cat: 'Biochemistry (BS-MS)', name: 'Michaelis-Menten', expr: 'v = Vmax[S]/(Km + [S])' },
    { cat: 'Biochemistry (BS-MS)', name: 'Lineweaver-Burk', expr: '1/v = (Km/Vmax)(1/[S]) + 1/Vmax' },
    { cat: 'Molecular Biology (BS-MS)', name: 'SA:V Ratio', expr: 'SA:V = SA / V' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Central Dogma', expr: 'DNA → RNA → Protein' },
    { cat: 'Evolution (BS-MS)', name: 'Selection Coefficient', expr: 's = 1 - w' },
    { cat: 'Cell Biology (9th-FSc)', name: 'Magnification', expr: 'M = Image size / Actual size' },
    { cat: 'Bioenergetics (9th-FSc)', name: 'Photosynthesis (word eq.)', expr: '6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂' },
    { cat: 'Bioenergetics (9th-FSc)', name: 'Cellular Respiration', expr: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ATP' },
    { cat: 'Population Genetics (BS-MS)', name: 'Effective Population Size', expr: 'Ne = 4NmNf/(Nm+Nf)' },
    { cat: 'Taxonomy (9th-10th)', name: 'Binomial Nomenclature', expr: 'Genus species (italicized)' },
    { cat: 'Physiology (FSc-BS)', name: 'Osmosis Water Potential', expr: 'Ψ = Ψs + Ψp' },
    { cat: 'Basic Biology (9th-10th)', name: 'Magnification Formula', expr: 'M = size of image/size of object' },
    { cat: 'Basic Biology (9th-10th)', name: 'Diffusion Rate', expr: 'proportional to surface area, inversely to distance' },
    { cat: 'Nutrition (9th-10th)', name: 'Basal Metabolic Rate (approx)', expr: 'BMR = 66 + 13.7W + 5H − 6.8A (men)' },
    { cat: 'Genetics (9th-FSc)', name: 'Monohybrid Ratio', expr: '3:1 (phenotype)' },
    { cat: 'Genetics (FSc-BS)', name: 'Chi-Square Test (genetics)', expr: 'χ² = Σ(O−E)²/E' },
    { cat: 'Genetics (FSc-BS)', name: 'Genetic Map Distance', expr: '1 map unit = 1% recombination' },
    { cat: 'Ecology (FSc-BS)', name: 'Carrying Capacity Equation', expr: 'dN/dt = rN(K−N)/K' },
    { cat: 'Ecology (FSc-BS)', name: 'Species Diversity (Shannon)', expr: "H' = −Σpᵢ ln(pᵢ)" },
    { cat: 'Ecology (FSc-BS)', name: 'Ecological Efficiency', expr: 'EE = (energy at trophic n+1/energy at n) × 100' },
    { cat: 'Physiology (FSc-BS)', name: 'Vital Capacity', expr: 'VC = TV + IRV + ERV' },
    { cat: 'Physiology (FSc-BS)', name: 'Glomerular Filtration Rate', expr: 'GFR = Uᵢₙ × V / Pᵢₙ' },
    { cat: 'Biochemistry (BS-MS)', name: 'Henderson-Hasselbalch (biology)', expr: 'pH = pKa + log([A⁻]/[HA])' },
    { cat: 'Biochemistry (BS-MS)', name: 'ATP Yield (glycolysis net)', expr: 'net 2 ATP per glucose' },
    { cat: 'Molecular Biology (BS-MS)', name: 'DNA Melting Temperature', expr: 'Tm = 4(G+C) + 2(A+T)' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Codon Combinations', expr: '4³ = 64 codons' },
    { cat: 'Evolution (BS-MS)', name: 'Hardy-Weinberg Allele Check', expr: 'p + q = 1, p² + 2pq + q² = 1' },
    { cat: 'Biostatistics (BS-MS)', name: 'Standard Error of Mean', expr: 'SEM = σ/√n' },
    { cat: 'Genetics (FSc-BS)', name: 'Test Cross Ratio', expr: '1:1 (heterozygous × homozygous recessive)' },
    { cat: 'Genetics (FSc-BS)', name: 'Trihybrid Ratio', expr: '27:9:9:9:3:3:3:1' },
    { cat: 'Genetics (FSc-BS)', name: 'Genetic Variance Components', expr: 'Vp = Vg + Ve' },
    { cat: 'Genetics (9th-FSc)', name: 'Back Cross', expr: 'offspring crossed with either parent genotype' },
    { cat: 'Ecology (FSc-BS)', name: 'Population Density', expr: 'D = N/A' },
    { cat: 'Ecology (FSc-BS)', name: 'Birth Rate', expr: 'b = births/(N × time)' },
    { cat: 'Ecology (FSc-BS)', name: 'Death Rate', expr: 'd = deaths/(N × time)' },
    { cat: 'Ecology (FSc-BS)', name: 'Biomagnification (concept)', expr: 'toxin concentration increases up trophic levels' },
    { cat: 'Ecology (FSc-BS)', name: 'Trophic Level Energy Loss', expr: '~90% energy lost per trophic level' },
    { cat: 'Physiology (FSc-BS)', name: 'Pulse Pressure', expr: 'PP = SP − DP' },
    { cat: 'Physiology (FSc-BS)', name: 'Stroke Volume', expr: 'SV = EDV − ESV' },
    { cat: 'Physiology (FSc-BS)', name: 'Respiratory Quotient', expr: 'RQ = CO₂ produced/O₂ consumed' },
    { cat: 'Physiology (FSc-BS)', name: 'Renal Clearance', expr: 'C = (U×V)/P' },
    { cat: 'Physiology (FSc-BS)', name: 'Blood Pressure Notation', expr: 'BP = Systolic/Diastolic mmHg' },
    { cat: 'Physiology (FSc-BS)', name: 'Cardiac Cycle Duration', expr: '≈0.8 s at 75 bpm' },
    { cat: 'Biochemistry (BS-MS)', name: 'Enzyme Turnover Number', expr: 'kcat = Vmax/[E]' },
    { cat: 'Biochemistry (BS-MS)', name: 'ATP Yield (Krebs cycle)', expr: '2 ATP per glucose (substrate-level)' },
    { cat: 'Biochemistry (BS-MS)', name: 'ATP Yield (ETC, total)', expr: '~30-32 ATP per glucose' },
    { cat: 'Biochemistry (BS-MS)', name: 'Isoelectric Point (concept)', expr: 'pH at which protein has zero net charge' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Number of Amino Acids per Codon', expr: '1 codon = 1 amino acid' },
    { cat: 'Molecular Biology (BS-MS)', name: 'DNA Base Pairing', expr: 'A=T, G≡C' },
    { cat: 'Molecular Biology (BS-MS)', name: 'PCR Amplification', expr: 'copies = 2ⁿ (n = number of cycles)' },
    { cat: 'Cell Biology (9th-FSc)', name: 'Surface Area of Sphere (cell)', expr: 'SA = 4πr²' },
    { cat: 'Cell Biology (9th-FSc)', name: 'Volume of Sphere (cell)', expr: 'V = (4/3)πr³' },
    { cat: 'Cell Biology (9th-FSc)', name: 'Osmolarity', expr: 'Osm = molarity × number of particles' },
    { cat: 'Bioenergetics (9th-FSc)', name: 'ATP Hydrolysis Energy', expr: 'ATP → ADP + Pi + energy (~30.5 kJ/mol)' },
    { cat: 'Taxonomy (9th-10th)', name: 'Taxonomic Hierarchy', expr: 'Kingdom>Phylum>Class>Order>Family>Genus>Species' },
    { cat: 'Evolution (BS-MS)', name: 'Fitness (relative)', expr: 'w = individual fitness/max fitness' },
    { cat: 'Evolution (BS-MS)', name: 'Genetic Drift (concept)', expr: 'random allele frequency change, stronger in small N' },
    { cat: 'Population Genetics (BS-MS)', name: 'Inbreeding Coefficient', expr: 'F = (Ho_expected − Ho_observed)/Ho_expected' },
    { cat: 'Biostatistics (BS-MS)', name: 'Coefficient of Variation (biology)', expr: 'CV = (σ/x̄) × 100' },
    { cat: 'Nutrition (9th-10th)', name: 'Caloric Value', expr: 'Energy = mass × caloric value per g' },
    { cat: 'Basic Biology (9th-10th)', name: 'Pulse Rate', expr: 'beats per minute (bpm)' },
    { cat: 'Basic Biology (9th-10th)', name: 'Vital Capacity (approx)', expr: 'VC ≈ 4.8 L (average adult)' },
    { cat: 'Genetics (FSc-BS)', name: 'Number of Gametes', expr: '2ⁿ (n = number of heterozygous pairs)' },
    { cat: 'Genetics (FSc-BS)', name: 'Number of Genotype Combinations', expr: '3ⁿ (n = number of gene pairs)' },
    { cat: 'Genetics (FSc-BS)', name: 'Linkage Group Number', expr: 'linkage groups = haploid chromosome number' },
    { cat: 'Genetics (BS-MS)', name: 'Heritability', expr: 'H² = Vg/Vp' },
    { cat: 'Genetics (BS-MS)', name: 'Genetic Load', expr: 'L = (wmax − w̄)/wmax' },
    { cat: 'Ecology (FSc-BS)', name: 'Net Primary Productivity', expr: 'NPP = GPP − R' },
    { cat: 'Ecology (FSc-BS)', name: 'Trophic Level Efficiency', expr: 'TLE = (production at n+1/production at n) × 100' },
    { cat: 'Ecology (FSc-BS)', name: 'Simpson\'s Diversity Index', expr: 'D = 1 − Σ(n/N)²' },
    { cat: 'Ecology (FSc-BS)', name: 'Species Richness', expr: 'S = number of species in a community' },
    { cat: 'Ecology (FSc-BS)', name: 'Per Capita Growth Rate', expr: 'r = b − d' },
    { cat: 'Ecology (BS-MS)', name: 'Lotka-Volterra Predation', expr: 'dN/dt = rN − aNP' },
    { cat: 'Ecology (BS-MS)', name: 'Island Biogeography (species #)', expr: 'S = cAᶻ' },
    { cat: 'Physiology (FSc-BS)', name: 'Total Peripheral Resistance', expr: 'TPR = MAP/CO' },
    { cat: 'Physiology (FSc-BS)', name: 'Ejection Fraction', expr: 'EF = (SV/EDV) × 100' },
    { cat: 'Physiology (FSc-BS)', name: 'Tidal Volume Ventilation', expr: 'Minute Ventilation = TV × RR' },
    { cat: 'Physiology (FSc-BS)', name: 'Alveolar Ventilation', expr: 'VA = (TV − Dead Space) × RR' },
    { cat: 'Physiology (FSc-BS)', name: 'Body Surface Area (Du Bois)', expr: 'BSA = 0.007184 × W^0.425 × H^0.725' },
    { cat: 'Physiology (FSc-BS)', name: 'Oxygen Consumption', expr: 'VO₂ = CO × (CaO₂ − CvO₂)' },
    { cat: 'Physiology (FSc-BS)', name: 'Poiseuille\'s Law (blood flow)', expr: 'Q = πPr⁴/8ηL' },
    { cat: 'Biochemistry (BS-MS)', name: 'Enzyme Specificity Constant', expr: 'kcat/Km' },
    { cat: 'Biochemistry (BS-MS)', name: 'Hill Equation', expr: 'θ = [S]ⁿ/(Kd + [S]ⁿ)' },
    { cat: 'Biochemistry (BS-MS)', name: 'ATP Yield (Complete Oxidation)', expr: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + ~36-38 ATP' },
    { cat: 'Biochemistry (BS-MS)', name: 'Redox Potential (Nernst, biological)', expr: 'ΔE°′ = E°′(acceptor) − E°′(donor)' },
    { cat: 'Biochemistry (BS-MS)', name: 'Free Energy from ΔE', expr: 'ΔG°′ = −nFΔE°′' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Number of Possible Proteins', expr: '20ⁿ (n = amino acid positions)' },
    { cat: 'Molecular Biology (BS-MS)', name: 'DNA Length from Base Pairs', expr: 'L = bp × 0.34 nm' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Sequence Similarity', expr: '% identity = (identical residues/total) × 100' },
    { cat: 'Evolution (BS-MS)', name: 'Genetic Distance', expr: 'D = −ln(I), I = proportion of shared alleles' },
    { cat: 'Evolution (BS-MS)', name: 'Molecular Clock', expr: 'divergence time = mutations/(2 × substitution rate)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Sample Variance', expr: 's² = Σ(x − x̄)²/(n−1)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Correlation Coefficient', expr: 'r = Σ(x−x̄)(y−ȳ)/√[Σ(x−x̄)²Σ(y−ȳ)²]' },
    { cat: 'Biostatistics (BS-MS)', name: 'Confidence Interval (mean)', expr: 'CI = x̄ ± z(σ/√n)' },
    { cat: 'Taxonomy (9th-10th)', name: 'Five Kingdom Classification', expr: 'Monera, Protista, Fungi, Plantae, Animalia' },
    { cat: 'Basic Biology (9th-10th)', name: 'Water Potential (simplified)', expr: 'Ψw = Ψs (solute potential, closed system)' },
    { cat: 'Basic Biology (9th-10th)', name: 'Transpiration Rate', expr: 'water loss (g) per unit time per unit leaf area' },
    { cat: 'Basic Biology (9th-10th)', name: 'Turgor Pressure', expr: 'Ψp = Ψw − Ψs' },
    { cat: 'Nutrition (9th-10th)', name: 'Energy from Macronutrients', expr: '4 kcal/g (carbs/protein), 9 kcal/g (fat)' },
    { cat: 'Nutrition (9th-10th)', name: 'Water Requirement (approx)', expr: '≈35 mL/kg body weight/day' },
    { cat: 'Immunology (BS-MS)', name: 'Antibody Titer', expr: 'reciprocal of highest dilution showing reaction' },
    { cat: 'Immunology (BS-MS)', name: 'Vaccine Efficacy', expr: 'VE = (ARu − ARv)/ARu × 100' },
    { cat: 'Microbiology (BS-MS)', name: 'Bacterial Growth Rate', expr: 'Nt = N₀ × 2ⁿ' },
    { cat: 'Microbiology (BS-MS)', name: 'Generation Time', expr: 'g = t/n' },
    { cat: 'Microbiology (BS-MS)', name: 'Specific Growth Rate', expr: 'μ = ln(Nt/N₀)/t' },
    { cat: 'Biochemistry (BS-MS)', name: 'Gibbs Free Energy (Biochemistry)', expr: 'ΔG = ΔG° + RT ln(Q)' },
    { cat: 'Biochemistry (BS-MS)', name: 'ATP Hydrolysis Free Energy', expr: 'ΔG ≈ −30.5 kJ/mol' },
    { cat: 'Biochemistry (BS-MS)', name: 'Competitive Inhibition (apparent Km)', expr: 'Km(app) = Km(1+[I]/Ki)' },
    { cat: 'Biochemistry (BS-MS)', name: 'Amino Acid Isoelectric Point', expr: 'pI = (pKa1+pKa2)/2' },
    { cat: 'Biochemistry (BS-MS)', name: 'Protein Concentration (Beer-Lambert use)', expr: 'A = εcl' },
    { cat: 'Biochemistry (BS-MS)', name: 'Henderson-Hasselbalch (general buffer)', expr: 'pH = pKa + log([A⁻]/[HA])' },
    { cat: 'Biochemistry (BS-MS)', name: 'Oxygen-Hemoglobin Saturation (Hill Eq.)', expr: 'Y = [O₂]ⁿ/(P50ⁿ+[O₂]ⁿ)' },
    { cat: 'Biochemistry (MS)', name: 'Basal Metabolic Rate (concept)', expr: 'energy expended at rest per unit time' },
    { cat: 'Biochemistry (BS-MS)', name: 'Redox Half-Reaction Potential', expr: 'E = E° − (RT/nF) ln(Q)' },
    { cat: 'Biochemistry (BS-MS)', name: 'Buffering Capacity (Biochemistry)', expr: 'β = dCb/d(pH)' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Restriction Enzyme Cutting Frequency', expr: '1/4ⁿ (n = recognition site length)' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Transformation Efficiency', expr: 'TE = colonies / μg DNA' },
    { cat: 'Molecular Biology (MS)', name: 'Plasmid Copy Number', expr: 'copies of plasmid per bacterial cell' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Gene Expression Fold Change (qPCR)', expr: 'Fold = 2^(−ΔΔCt)' },
    { cat: 'Molecular Biology (BS-MS)', name: 'DNA Concentration (Spectrophotometry)', expr: 'C = A260 × dilution × 50 μg/mL' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Nucleic Acid Purity Ratio', expr: 'A260/A280' },
    { cat: 'Molecular Biology (MS)', name: 'Codon Usage Bias', expr: 'relative frequency of synonymous codons' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Recombination Frequency', expr: 'RF = recombinants/total × 100' },
    { cat: 'Genetics (BS-MS)', name: 'Hardy-Weinberg Equilibrium', expr: 'p²+2pq+q²=1,  p+q=1' },
    { cat: 'Genetics (MS)', name: 'Coefficient of Relationship', expr: 'proportion of shared genes between relatives' },
    { cat: 'Genetics (BS-MS)', name: 'Linkage Map Distance', expr: '1 map unit = 1% recombination frequency' },
    { cat: 'Genetics (BS-MS)', name: 'Chi-Square Test for Genetic Ratios', expr: 'χ² = Σ(O−E)²/E' },
    { cat: 'Genetics (MS)', name: 'Mutation Rate', expr: 'μ = mutations / generation / locus' },
    { cat: 'Genetics (BS-MS)', name: 'Genetic Variance Components', expr: 'Vp = Vg + Ve' },
    { cat: 'Genetics (BS-MS)', name: 'Broad Sense Heritability', expr: 'H² = Vg/Vp' },
    { cat: 'Genetics (BS-MS)', name: 'Narrow Sense Heritability', expr: 'h² = Va/Vp' },
    { cat: 'Ecology (BS-MS)', name: 'Exponential Population Growth', expr: 'dN/dt = rN' },
    { cat: 'Ecology (BS-MS)', name: 'Logistic Growth', expr: 'dN/dt = rN(1−N/K)' },
    { cat: 'Ecology (BS-MS)', name: 'Shannon Diversity Index', expr: "H' = −Σ pᵢ ln(pᵢ)" },
    { cat: 'Ecology (BS-MS)', name: "Simpson's Diversity Index", expr: 'D = 1 − Σ pᵢ²' },
    { cat: 'Ecology (BS-MS)', name: 'Carrying Capacity (concept)', expr: 'K = max population size an environment supports' },
    { cat: 'Ecology (BS-MS)', name: 'Trophic Level Energy Transfer', expr: '~10% efficiency between levels' },
    { cat: 'Evolution (BS-MS)', name: 'Selection Differential', expr: 'S = mean(selected) − mean(population)' },
    { cat: 'Evolution (BS-MS)', name: 'Response to Selection', expr: 'R = h²S' },
    { cat: 'Evolution (MS)', name: 'Genetic Drift Variance', expr: 'Var(Δp) = p(1−p)/2Ne' },
    { cat: 'Evolution (MS)', name: "Nei's Genetic Distance", expr: 'D = −ln(I), I = identity of genes between populations' },
    { cat: 'Evolution (BS-MS)', name: 'Founder Effect (concept)', expr: 'reduced genetic variation from a small founding population' },
    { cat: 'Biostatistics (BS-MS)', name: 'Relative Risk', expr: 'RR = incidence(exposed)/incidence(unexposed)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Odds Ratio', expr: 'OR = (a×d)/(b×c)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Sensitivity', expr: 'Sens = TP/(TP+FN)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Specificity', expr: 'Spec = TN/(TN+FP)' },
    { cat: 'Immunology (MS)', name: 'ELISA Titer', expr: 'highest dilution giving a positive signal' },
    { cat: 'Immunology (MS)', name: 'Antibody Affinity Constant', expr: 'Ka = [Ab-Ag]/([Ab][Ag])' },
    { cat: 'Immunology (BS-MS)', name: 'Complement Activation (concept)', expr: 'classical, alternative, and lectin pathways' },
    { cat: 'Immunology (BS-MS)', name: 'Cytokine Concentration (ELISA-based)', expr: 'read from a standard curve of known concentrations' },
    { cat: 'Microbiology (BS-MS)', name: 'Colony Forming Units', expr: 'CFU/mL = colonies × dilution factor / volume plated' },
    { cat: 'Microbiology (BS-MS)', name: 'Doubling Time', expr: 'td = ln2/μ' },
    { cat: 'Microbiology (BS-MS)', name: 'Minimum Inhibitory Concentration (concept)', expr: 'lowest drug concentration that prevents visible growth' },
    { cat: 'Microbiology (MS)', name: 'Biofilm Growth Rate (concept)', expr: 'logistic-type growth on a surface over time' },
    { cat: 'Physiology (BS-MS)', name: 'Cardiac Output', expr: 'CO = HR × SV' },
    { cat: 'Physiology (BS-MS)', name: 'Mean Arterial Pressure', expr: 'MAP = DP + ⅓(SP−DP)' },
    { cat: 'Physiology (BS-MS)', name: 'Glomerular Filtration Rate (concept)', expr: 'volume filtered by kidneys per unit time' },
    { cat: 'Physiology (BS-MS)', name: 'Renal Clearance', expr: 'C = (U×V)/P' },
    { cat: 'Physiology (BS-MS)', name: 'Vital Capacity (concept)', expr: 'max air exhaled after maximal inhalation' },
    { cat: 'Physiology (BS-MS)', name: 'Body Mass Index', expr: 'BMI = weight(kg) / height(m)²' },
  ],

  Statistics: [
    { cat: 'Descriptive (FSc-BS)', name: 'Mean', expr: 'x̄ = Σx / n' },
    { cat: 'Descriptive (FSc-BS)', name: 'Variance', expr: 'σ² = Σ(x-x̄)²/n' },
    { cat: 'Descriptive (FSc-BS)', name: 'Standard Deviation', expr: 'σ = √(Σ(x-x̄)²/n)' },
    { cat: 'Descriptive (FSc-BS)', name: 'Coefficient of Variation', expr: 'CV = (σ/x̄) × 100' },
    { cat: 'Probability (FSc-BS)', name: 'Basic Probability', expr: 'P(A) = favorable / total' },
    { cat: 'Probability (FSc-BS)', name: 'Addition Rule', expr: 'P(A∪B) = P(A) + P(B) - P(A∩B)' },
    { cat: 'Probability (FSc-BS)', name: 'Multiplication Rule', expr: 'P(A∩B) = P(A) × P(B|A)' },
    { cat: 'Probability (FSc-BS)', name: "Bayes' Theorem", expr: 'P(A|B) = P(B|A)P(A)/P(B)' },
    { cat: 'Distributions (BS-MS)', name: 'Binomial', expr: 'P(x) = ⁿCₓ pˣ(1-p)ⁿ⁻ˣ' },
    { cat: 'Distributions (BS-MS)', name: 'Poisson', expr: 'P(x) = (e^-λ λˣ)/x!' },
    { cat: 'Distributions (BS-MS)', name: 'Normal z-score', expr: 'z = (x-μ)/σ' },
    { cat: 'Distributions (BS-MS)', name: 'Expected Value', expr: 'E(X) = Σx·P(x)' },
    { cat: 'Correlation (BS-MS)', name: "Pearson's r", expr: 'r = Σ(x-x̄)(y-ȳ) / √(Σ(x-x̄)²Σ(y-ȳ)²)' },
    { cat: 'Correlation (BS-MS)', name: 'Linear Regression', expr: 'b = Σ(x-x̄)(y-ȳ)/Σ(x-x̄)²' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Z-test', expr: 'z = (x̄-μ)/(σ/√n)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'T-test', expr: 't = (x̄-μ)/(s/√n)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Chi-square', expr: 'χ² = Σ(O-E)²/E' },
    { cat: 'Sampling (BS-MS)', name: 'Standard Error', expr: 'SE = σ/√n' },
    { cat: 'Sampling (BS-MS)', name: 'Sample Size', expr: 'n = (z²σ²)/E²' },
    { cat: 'Descriptive (FSc-BS)', name: 'Median (grouped)', expr: 'Med = l + [(n/2−cf)/f]×h' },
    { cat: 'Descriptive (FSc-BS)', name: 'Skewness', expr: 'Sk = 3(x̄−Med)/σ' },
    { cat: 'Confidence Intervals (BS-MS)', name: 'CI for Mean', expr: 'x̄ ± z(σ/√n)' },
    { cat: 'ANOVA (BS-MS)', name: 'F-statistic', expr: 'F = MSB/MSW' },
    { cat: 'Regression (BS-MS)', name: 'Coefficient of Determination', expr: 'R² = 1 − SSres/SStot' },
    { cat: 'Time Series (MS)', name: 'Moving Average', expr: 'MAₜ = (1/k)Σyₜ₋ᵢ' },
    { cat: 'Descriptive (9th-10th)', name: 'Range', expr: 'Range = Max − Min' },
    { cat: 'Descriptive (9th-10th)', name: 'Mode (grouped)', expr: 'Mode = l + [(f₁−f₀)/(2f₁−f₀−f₂)]×h' },
    { cat: 'Descriptive (FSc-BS)', name: 'Quartile Deviation', expr: 'QD = (Q₃ − Q₁)/2' },
    { cat: 'Descriptive (FSc-BS)', name: 'Mean Deviation', expr: 'MD = Σ|x−x̄|/n' },
    { cat: 'Probability (FSc-BS)', name: 'Conditional Probability', expr: 'P(A|B) = P(A∩B)/P(B)' },
    { cat: 'Probability (FSc-BS)', name: 'Independent Events', expr: 'P(A∩B) = P(A)·P(B)' },
    { cat: 'Distributions (BS-MS)', name: 'Uniform Distribution Mean', expr: 'μ = (a+b)/2' },
    { cat: 'Distributions (BS-MS)', name: 'Exponential Distribution', expr: 'f(x) = λe^(−λx)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Type I Error', expr: 'α = P(reject H₀ | H₀ true)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Type II Error', expr: 'β = P(fail to reject H₀ | H₀ false)' },
    { cat: 'Correlation (BS-MS)', name: 'Spearman Rank Correlation', expr: 'ρ = 1 − 6Σd²/(n(n²−1))' },
    { cat: 'Descriptive (9th-10th)', name: 'Class Width', expr: 'CW = (Max − Min)/number of classes' },
    { cat: 'Descriptive (9th-10th)', name: 'Relative Frequency', expr: 'RF = frequency/total' },
    { cat: 'Descriptive (9th-10th)', name: 'Cumulative Frequency', expr: 'CF = running total of frequencies' },
    { cat: 'Descriptive (FSc-BS)', name: 'Weighted Mean', expr: 'x̄w = Σwᵢxᵢ/Σwᵢ' },
    { cat: 'Descriptive (FSc-BS)', name: 'Geometric Mean', expr: 'GM = ⁿ√(x₁x₂...xₙ)' },
    { cat: 'Descriptive (FSc-BS)', name: 'Harmonic Mean', expr: 'HM = n/Σ(1/xᵢ)' },
    { cat: 'Descriptive (FSc-BS)', name: 'Coefficient of Skewness (Bowley)', expr: 'Sk = (Q₃+Q₁−2Med)/(Q₃−Q₁)' },
    { cat: 'Descriptive (FSc-BS)', name: 'Interquartile Range', expr: 'IQR = Q₃ − Q₁' },
    { cat: 'Descriptive (FSc-BS)', name: 'Z-score', expr: 'z = (x−μ)/σ' },
    { cat: 'Probability (FSc-BS)', name: 'Complement Rule', expr: "P(A') = 1 − P(A)" },
    { cat: 'Probability (FSc-BS)', name: 'Mutually Exclusive Events', expr: 'P(A∪B) = P(A) + P(B)' },
    { cat: 'Probability (FSc-BS)', name: 'Odds Ratio', expr: 'OR = P(A)/P(not A)' },
    { cat: 'Distributions (BS-MS)', name: 'Geometric Distribution', expr: 'P(x) = (1-p)^(x-1) p' },
    { cat: 'Distributions (BS-MS)', name: 'Variance of Binomial', expr: 'Var(X) = np(1-p)' },
    { cat: 'Distributions (BS-MS)', name: 'Variance of Poisson', expr: 'Var(X) = λ' },
    { cat: 'Distributions (BS-MS)', name: 'Standard Normal Distribution', expr: 'Z ~ N(0,1)' },
    { cat: 'Distributions (BS-MS)', name: 'Cumulative Distribution Function', expr: 'F(x) = P(X≤x)' },
    { cat: 'Correlation (BS-MS)', name: 'Covariance', expr: 'Cov(X,Y) = Σ(x-x̄)(y-ȳ)/n' },
    { cat: 'Correlation (BS-MS)', name: 'Coefficient of Determination (r²)', expr: 'r² = explained variance/total variance' },
    { cat: 'Correlation (BS-MS)', name: 'Multiple Correlation Coefficient', expr: 'R = √(explained SS/total SS)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Degrees of Freedom (t-test)', expr: 'df = n − 1' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Pooled Variance', expr: 'sp² = [(n₁-1)s₁²+(n₂-1)s₂²]/(n₁+n₂-2)' },
    { cat: 'Sampling (BS-MS)', name: 'Finite Population Correction', expr: 'FPC = √((N-n)/(N-1))' },
    { cat: 'Sampling (BS-MS)', name: 'Margin of Error', expr: 'E = z(σ/√n)' },
    { cat: 'Sampling (BS-MS)', name: 'Confidence Interval for Proportion', expr: 'p̂ ± z√(p̂(1-p̂)/n)' },
    { cat: 'Index Numbers (BS-MS)', name: 'Laspeyres Price Index', expr: 'L = Σp₁q₀/Σp₀q₀ × 100' },
    { cat: 'Index Numbers (BS-MS)', name: 'Paasche Price Index', expr: 'P = Σp₁q₁/Σp₀q₁ × 100' },
    { cat: 'Time Series (MS)', name: 'Trend (linear)', expr: 'Yt = a + bt' },
    { cat: 'Time Series (MS)', name: 'Seasonal Index', expr: 'SI = (seasonal avg/grand avg) × 100' },
    { cat: 'ANOVA (BS-MS)', name: 'Total Sum of Squares', expr: 'SST = SSB + SSW' },
    { cat: 'Regression (BS-MS)', name: 'Regression Line (y on x)', expr: 'y = a + bx' },
    { cat: 'Regression (BS-MS)', name: 'Standard Error of Estimate', expr: 'SE = √(Σ(y−ŷ)²/(n−2))' },
    { cat: 'Nonparametric (BS-MS)', name: 'Sign Test (concept)', expr: 'compares medians using +/- signs' },
    { cat: 'Nonparametric (BS-MS)', name: 'Mann-Whitney U Test (concept)', expr: 'compares ranks of two independent samples' },
    { cat: 'Descriptive (9th-10th)', name: 'Midpoint of Class', expr: 'Midpoint = (Lower + Upper)/2' },
    { cat: 'Descriptive (9th-10th)', name: 'Number of Classes (Sturges)', expr: 'k = 1 + 3.322 log(n)' },
    { cat: 'Descriptive (9th-10th)', name: 'Percentage Frequency', expr: 'PF = (frequency/total) × 100' },
    { cat: 'Descriptive (9th-10th)', name: 'Cumulative Percentage', expr: 'CP = (CF/n) × 100' },
    { cat: 'Descriptive (FSc-BS)', name: 'Combined Mean', expr: 'x̄c = (n₁x̄₁+n₂x̄₂)/(n₁+n₂)' },
    { cat: 'Descriptive (FSc-BS)', name: 'Combined Variance', expr: 'σc² = [n₁(σ₁²+d₁²)+n₂(σ₂²+d₂²)]/(n₁+n₂)' },
    { cat: 'Descriptive (FSc-BS)', name: 'Moment Coefficient of Skewness', expr: 'γ₁ = m₃/m₂^(3/2)' },
    { cat: 'Descriptive (FSc-BS)', name: 'Kurtosis', expr: 'γ₂ = m₄/m₂² − 3' },
    { cat: 'Descriptive (FSc-BS)', name: 'Standard Error of Mean', expr: 'SEM = s/√n' },
    { cat: 'Descriptive (FSc-BS)', name: 'Pooled Standard Deviation', expr: 'sp = √[((n₁-1)s₁²+(n₂-1)s₂²)/(n₁+n₂-2)]' },
    { cat: 'Descriptive (FSc-BS)', name: 'Decile', expr: 'Dₖ = l + [(kn/10−cf)/f]×h' },
    { cat: 'Descriptive (FSc-BS)', name: 'Percentile', expr: 'Pₖ = l + [(kn/100−cf)/f]×h' },
    { cat: 'Descriptive (FSc-BS)', name: 'Quartile (grouped)', expr: 'Qₖ = l + [(kn/4−cf)/f]×h' },
    { cat: 'Descriptive (FSc-BS)', name: 'Mean Absolute Deviation', expr: 'MAD = Σ|x−median|/n' },
    { cat: 'Descriptive (FSc-BS)', name: 'Sum of Squares (corrected)', expr: 'SS = Σx² − (Σx)²/n' },
    { cat: 'Descriptive (FSc-BS)', name: 'Coefficient of Mean Deviation', expr: 'CMD = (MD/x̄) × 100' },
    { cat: 'Descriptive (FSc-BS)', name: 'Coefficient of Quartile Deviation', expr: 'CQD = (Q₃−Q₁)/(Q₃+Q₁) × 100' },
    { cat: 'Probability (FSc-BS)', name: 'Permutation', expr: 'ⁿPᵣ = n!/(n−r)!' },
    { cat: 'Probability (FSc-BS)', name: 'Combination', expr: 'ⁿCᵣ = n!/[r!(n−r)!]' },
    { cat: 'Probability (FSc-BS)', name: 'Total Probability Theorem', expr: 'P(A) = ΣP(A|Bᵢ)P(Bᵢ)' },
    { cat: 'Probability (FSc-BS)', name: 'Union of Three Events', expr: 'P(A∪B∪C) = ΣP(A)−ΣP(A∩B)+P(A∩B∩C)' },
    { cat: 'Probability (FSc-BS)', name: 'Probability of At Least One', expr: 'P(at least one) = 1 − P(none)' },
    { cat: 'Distributions (BS-MS)', name: 'Variance of Uniform Distribution', expr: 'σ² = (b−a)²/12' },
    { cat: 'Distributions (BS-MS)', name: 'Mean of Exponential Distribution', expr: 'μ = 1/λ' },
    { cat: 'Distributions (BS-MS)', name: 'Variance of Exponential Distribution', expr: 'σ² = 1/λ²' },
    { cat: 'Distributions (BS-MS)', name: 'Mean of Geometric Distribution', expr: 'μ = 1/p' },
    { cat: 'Distributions (BS-MS)', name: 'Hypergeometric Distribution', expr: 'P(x) = (ᴷCₓ)(ᴺ⁻ᴷCₙ₋ₓ)/ᴺCₙ' },
    { cat: 'Distributions (BS-MS)', name: 'Negative Binomial Distribution', expr: 'P(x) = ˣ⁻¹Cᵣ₋₁ pʳ(1-p)ˣ⁻ʳ' },
    { cat: 'Distributions (BS-MS)', name: "Chebyshev's Theorem", expr: 'P(|x−μ|<kσ) ≥ 1 − 1/k²' },
    { cat: 'Distributions (BS-MS)', name: 'Moment Generating Function (concept)', expr: 'M(t) = E(e^tX)' },
    { cat: 'Distributions (BS-MS)', name: 'Standard Normal Area (empirical rule)', expr: '≈68% within 1σ, 95% within 2σ, 99.7% within 3σ' },
    { cat: 'Correlation (BS-MS)', name: 'Rank Correlation (tied ranks)', expr: 'ρ = 1 − [6(Σd²+correction)]/(n(n²−1))' },
    { cat: 'Correlation (BS-MS)', name: 'Regression Coefficient (x on y)', expr: "b'ₓy = r(σx/σy)" },
    { cat: 'Correlation (BS-MS)', name: 'Regression Coefficient (y on x)', expr: 'byx = r(σy/σx)' },
    { cat: 'Correlation (BS-MS)', name: 'r from Regression Coefficients', expr: 'r = √(bxy × byx)' },
    { cat: 'Correlation (BS-MS)', name: 'Partial Correlation', expr: 'r₁₂.₃ = (r₁₂−r₁₃r₂₃)/√[(1−r₁₃²)(1−r₂₃²)]' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Two-Sample Z-test', expr: 'z = (x̄₁−x̄₂)/√(σ₁²/n₁+σ₂²/n₂)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Paired T-test', expr: 't = d̄/(sd/√n)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Two-Sample T-test (pooled)', expr: 't = (x̄₁−x̄₂)/(sp√(1/n₁+1/n₂))' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Test Statistic for Proportion', expr: 'z = (p̂−p₀)/√(p₀(1−p₀)/n)' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Power of a Test', expr: 'Power = 1 − β' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'p-value (concept)', expr: 'smallest α at which H₀ is rejected' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Chi-square Goodness of Fit', expr: 'χ² = Σ(Oᵢ−Eᵢ)²/Eᵢ' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Chi-square Test of Independence', expr: 'df = (r−1)(c−1)' },
    { cat: 'Sampling (BS-MS)', name: 'Sample Size for Proportion', expr: 'n = z²p(1−p)/E²' },
    { cat: 'Sampling (BS-MS)', name: 'Stratified Sample Size', expr: 'nᵢ = (Nᵢ/N) × n' },
    { cat: 'Sampling (BS-MS)', name: 'Relative Standard Error', expr: 'RSE = (SE/x̄) × 100' },
    { cat: 'Sampling (BS-MS)', name: 'Sampling Fraction', expr: 'f = n/N' },
    { cat: 'Sampling (BS-MS)', name: 'Standard Error of Difference of Means', expr: 'SE = √(s₁²/n₁+s₂²/n₂)' },
    { cat: 'Sampling (BS-MS)', name: 'Standard Error of Proportion', expr: 'SEp = √(p(1−p)/n)' },
    { cat: 'Index Numbers (BS-MS)', name: "Fisher's Ideal Index", expr: 'F = √(L × P)' },
    { cat: 'Index Numbers (BS-MS)', name: 'Simple Aggregate Price Index', expr: 'SAPI = Σp₁/Σp₀ × 100' },
    { cat: 'Index Numbers (BS-MS)', name: 'Simple Average of Relatives Index', expr: 'I = Σ(p₁/p₀ × 100)/n' },
    { cat: 'Index Numbers (BS-MS)', name: 'Quantity Index', expr: 'Q = Σq₁p₀/Σq₀p₀ × 100' },
    { cat: 'Index Numbers (BS-MS)', name: 'Value Index', expr: 'V = Σp₁q₁/Σp₀q₀ × 100' },
    { cat: 'Index Numbers (BS-MS)', name: 'Deflating a Value using Index', expr: 'Real Value = Nominal Value/(Index/100)' },
    { cat: 'Time Series (MS)', name: 'Additive Model', expr: 'Y = T + S + C + I' },
    { cat: 'Time Series (MS)', name: 'Multiplicative Model', expr: 'Y = T × S × C × I' },
    { cat: 'Time Series (MS)', name: 'Trend by Semi-Average Method', expr: 'trend line joins averages of two halves' },
    { cat: 'Time Series (MS)', name: 'Deseasonalized Value', expr: 'DV = Y/SI × 100' },
    { cat: 'Time Series (MS)', name: 'Cyclical Variation (concept)', expr: 'C = (Y/(T×S×I))' },
    { cat: 'ANOVA (BS-MS)', name: 'Mean Square Between', expr: 'MSB = SSB/dfB' },
    { cat: 'ANOVA (BS-MS)', name: 'Mean Square Within', expr: 'MSW = SSW/dfW' },
    { cat: 'ANOVA (BS-MS)', name: 'df Between Groups', expr: 'dfB = k − 1' },
    { cat: 'ANOVA (BS-MS)', name: 'df Within Groups', expr: 'dfW = N − k' },
    { cat: 'ANOVA (BS-MS)', name: 'Two-Way ANOVA Total SS', expr: 'SST = SSR + SSC + SSE' },
    { cat: 'Regression (BS-MS)', name: 'Multiple Regression Equation', expr: 'ŷ = b₀ + b₁x₁ + b₂x₂' },
    { cat: 'Regression (BS-MS)', name: 'Adjusted R²', expr: 'R²adj = 1 − [(1−R²)(n−1)/(n−k−1)]' },
    { cat: 'Regression (BS-MS)', name: 'Residual', expr: 'e = y − ŷ' },
    { cat: 'Regression (BS-MS)', name: 'Total Variation', expr: 'SST = Σ(y−ȳ)²' },
    { cat: 'Regression (BS-MS)', name: 'Explained Variation', expr: 'SSR = Σ(ŷ−ȳ)²' },
    { cat: 'Regression (BS-MS)', name: 'Unexplained Variation', expr: 'SSE = Σ(y−ŷ)²' },
    { cat: 'Regression (BS-MS)', name: 'Slope Standard Error', expr: 'SEb = SE/√Σ(x−x̄)²' },
    { cat: 'Nonparametric (BS-MS)', name: 'Kruskal-Wallis Test (concept)', expr: 'compares ranks across three or more groups' },
    { cat: 'Nonparametric (BS-MS)', name: 'Wilcoxon Signed-Rank Test (concept)', expr: 'compares paired samples using signed ranks' },
    { cat: 'Nonparametric (BS-MS)', name: 'Runs Test (concept)', expr: 'tests randomness of a data sequence' },
    { cat: 'Nonparametric (BS-MS)', name: "Kolmogorov-Smirnov Test (concept)", expr: 'compares sample distribution to a reference distribution' },
    { cat: 'Business Statistics (BS-MS)', name: 'Break-even Point (statistical)', expr: 'BEP = Fixed Cost/(Price−Variable Cost)' },
    { cat: 'Business Statistics (BS-MS)', name: 'Forecast Error', expr: 'FE = Actual − Forecast' },
    { cat: 'Business Statistics (BS-MS)', name: 'Mean Absolute Percentage Error', expr: 'MAPE = (Σ|FE/Actual|/n) × 100' },
    { cat: 'Business Statistics (BS-MS)', name: 'Mean Squared Error', expr: 'MSE = Σ(Actual−Forecast)²/n' },
    { cat: 'Business Statistics (BS-MS)', name: 'Root Mean Squared Error', expr: 'RMSE = √MSE' },
    { cat: 'Business Statistics (BS-MS)', name: 'Exponential Smoothing Forecast', expr: 'Ft = αYt₋₁ + (1−α)Ft₋₁' },
    { cat: 'Business Statistics (BS-MS)', name: 'Weighted Moving Average', expr: 'WMA = Σ(wᵢxᵢ)/Σwᵢ' },
    { cat: 'Probability Distributions (BS-MS)', name: 'Joint Probability', expr: 'P(A∩B) = P(A)P(B|A)' },
    { cat: 'Probability Distributions (BS-MS)', name: 'Marginal Probability', expr: 'P(A) = ΣP(A∩Bᵢ)' },
    { cat: 'Probability Distributions (BS-MS)', name: 'Variance (definition)', expr: 'Var(X) = E(X²) − [E(X)]²' },
    { cat: 'Probability Distributions (BS-MS)', name: 'Standard Deviation of Random Variable', expr: 'σ = √Var(X)' },
    { cat: 'Probability Distributions (BS-MS)', name: 'Linear Combination Variance', expr: 'Var(aX+b) = a²Var(X)' },
    { cat: 'Probability Distributions (BS-MS)', name: 'Sum of Independent Variances', expr: 'Var(X+Y) = Var(X) + Var(Y)' },
    { cat: 'Quality Control (BS-MS)', name: 'Control Chart Upper Limit', expr: 'UCL = x̄ + 3σ' },
    { cat: 'Quality Control (BS-MS)', name: 'Control Chart Lower Limit', expr: 'LCL = x̄ − 3σ' },
    { cat: 'Quality Control (BS-MS)', name: 'Process Capability Index', expr: 'Cp = (USL−LSL)/6σ' },
    { cat: 'Quality Control (BS-MS)', name: 'Defect Rate', expr: 'DR = defects/total units × 100' },
    { cat: 'Survey Sampling (BS-MS)', name: 'Response Rate', expr: 'RR = responses/sample size × 100' },
    { cat: 'Survey Sampling (BS-MS)', name: 'Nonresponse Bias (concept)', expr: 'error from systematic difference in nonrespondents' },
    { cat: 'Survey Sampling (BS-MS)', name: 'Cluster Sampling Estimate', expr: 'x̄ = Σx̄ᵢ/k' },
    { cat: 'Survey Sampling (BS-MS)', name: 'Systematic Sampling Interval', expr: 'k = N/n' },
    { cat: 'Reliability (BS-MS)', name: "Cronbach's Alpha", expr: 'α = (k/(k−1))(1 − Σσᵢ²/σt²)' },
    { cat: 'Reliability (BS-MS)', name: 'Split-Half Reliability', expr: 'r = 2r₁₂/(1+r₁₂)' },
    { cat: 'Vital Statistics (BS-MS)', name: 'Crude Birth Rate', expr: 'CBR = births/mid-year population × 1000' },
    { cat: 'Vital Statistics (BS-MS)', name: 'Crude Death Rate', expr: 'CDR = deaths/mid-year population × 1000' },
    { cat: 'Vital Statistics (BS-MS)', name: 'Infant Mortality Rate', expr: 'IMR = infant deaths/live births × 1000' },
    { cat: 'Vital Statistics (BS-MS)', name: 'Growth Rate', expr: 'GR = (CBR − CDR)/10' },
  ],

  Commerce: [
    { cat: 'Accounting (FSc-B.Com)', name: 'Accounting Equation', expr: 'Assets = Liabilities + Equity' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Gross Profit', expr: 'GP = Sales - COGS' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Net Profit Margin', expr: 'NP Margin = (Net Profit/Sales) × 100' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Straight Line Depreciation', expr: 'D = (Cost - Salvage)/Life' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Current Ratio', expr: 'CR = Current Assets/Current Liabilities' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Quick Ratio', expr: 'QR = (CA - Inventory)/CL' },
    { cat: 'Finance (B.Com-MBA)', name: 'Simple Interest', expr: 'SI = P×R×T/100' },
    { cat: 'Finance (B.Com-MBA)', name: 'Compound Interest', expr: 'A = P(1+r/n)^(nt)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Present Value', expr: 'PV = FV/(1+r)ⁿ' },
    { cat: 'Finance (B.Com-MBA)', name: 'Future Value', expr: 'FV = PV(1+r)ⁿ' },
    { cat: 'Finance (B.Com-MBA)', name: 'NPV', expr: 'NPV = ΣCFt/(1+r)ᵗ - Initial Cost' },
    { cat: 'Finance (B.Com-MBA)', name: 'ROI', expr: 'ROI = (Gain-Cost)/Cost × 100' },
    { cat: 'Finance (B.Com-MBA)', name: 'EPS', expr: 'EPS = Net Income/Shares Outstanding' },
    { cat: 'Finance (B.Com-MBA)', name: 'P/E Ratio', expr: 'P/E = Market Price/EPS' },
    { cat: 'Economics (B.Com-MBA)', name: 'Price Elasticity', expr: 'Ed = %ΔQd / %ΔP' },
    { cat: 'Economics (B.Com-MBA)', name: 'GDP Expenditure', expr: 'GDP = C + I + G + (X-M)' },
    { cat: 'Economics (B.Com-MBA)', name: 'Inflation', expr: 'Inflation = (CPIₙ-CPI₀)/CPI₀ × 100' },
    { cat: 'Economics (B.Com-MBA)', name: 'Break-even', expr: 'BEP = Fixed Costs/(Price-Variable Cost)' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Markup', expr: 'Markup = Selling Price - Cost Price' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Profit %', expr: 'Profit% = (Profit/Cost) × 100' },
    { cat: 'Costing (B.Com-MBA)', name: 'Total Cost', expr: 'TC = Fixed Cost + Variable Cost' },
    { cat: 'Costing (B.Com-MBA)', name: 'Contribution Margin', expr: 'CM = Sales - Variable Costs' },
    { cat: 'Costing (B.Com-MBA)', name: 'EOQ', expr: 'EOQ = √(2DS/H)' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Debt-to-Equity', expr: 'D/E = Total Debt/Total Equity' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Return on Equity', expr: 'ROE = Net Income/Shareholder Equity' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Inventory Turnover', expr: 'IT = COGS/Avg Inventory' },
    { cat: 'Finance (B.Com-MBA)', name: 'CAGR', expr: 'CAGR = (FV/PV)^(1/n) − 1' },
    { cat: 'Finance (B.Com-MBA)', name: 'IRR (concept)', expr: 'NPV = 0 at r = IRR' },
    { cat: 'Finance (B.Com-MBA)', name: 'Annuity Present Value', expr: 'PV = PMT × [1−(1+r)⁻ⁿ]/r' },
    { cat: 'Economics (B.Com-MBA)', name: 'Marginal Utility', expr: 'MU = ΔTU/ΔQ' },
    { cat: 'Economics (B.Com-MBA)', name: 'Multiplier Effect', expr: 'k = 1/(1−MPC)' },
    { cat: 'Accounting (9th-B.Com)', name: 'Trial Balance Check', expr: 'ΣDebits = ΣCredits' },
    { cat: 'Accounting (9th-B.Com)', name: 'Working Capital', expr: 'WC = Current Assets − Current Liabilities' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Reducing Balance Depreciation', expr: 'D = Book Value × Rate' },
    { cat: 'Finance (B.Com-MBA)', name: 'Payback Period', expr: 'PBP = Initial Investment/Annual Cash Flow' },
    { cat: 'Finance (B.Com-MBA)', name: 'Weighted Average Cost of Capital', expr: 'WACC = (E/V)Re + (D/V)Rd(1−T)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Dividend Yield', expr: 'DY = Annual Dividend/Share Price' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Break-even Units', expr: 'Q = Fixed Cost/(Price − Variable Cost)' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Customer Lifetime Value', expr: 'CLV = Avg Purchase Value × Frequency × Lifespan' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Index Number', expr: 'I = (Value in given year/Value in base year) × 100' },
    { cat: 'Accounting (FSc-B.Com)', name: "Owner's Equity", expr: 'OE = Assets − Liabilities' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Cost of Goods Sold', expr: 'COGS = Opening Stock + Purchases − Closing Stock' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Gross Profit Ratio', expr: 'GP Ratio = (GP/Sales) × 100' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Operating Ratio', expr: 'OR = (Operating Cost/Sales) × 100' },
    { cat: 'Accounting (9th-B.Com)', name: 'Double Entry Rule', expr: 'every debit has an equal credit' },
    { cat: 'Accounting (9th-B.Com)', name: 'Bank Reconciliation (concept)', expr: 'reconciles cash book balance with bank statement' },
    { cat: 'Finance (B.Com-MBA)', name: 'Effective Annual Rate', expr: 'EAR = (1+r/n)ⁿ − 1' },
    { cat: 'Finance (B.Com-MBA)', name: 'Perpetuity Value', expr: 'PV = C/r' },
    { cat: 'Finance (B.Com-MBA)', name: 'Growing Perpetuity', expr: 'PV = C/(r−g)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Bond Price', expr: 'Price = ΣC/(1+r)ᵗ + FV/(1+r)ⁿ' },
    { cat: 'Finance (B.Com-MBA)', name: 'Cost of Equity (CAPM)', expr: 'Re = Rf + β(Rm−Rf)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Cost of Debt (after tax)', expr: 'Kd = Rd(1−T)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Real Interest Rate', expr: 'r_real ≈ r_nominal − inflation' },
    { cat: 'Finance (B.Com-MBA)', name: 'Rule of 72', expr: 'Years to double ≈ 72/r%' },
    { cat: 'Economics (B.Com-MBA)', name: 'Income Elasticity', expr: 'Ei = %ΔQd/%ΔIncome' },
    { cat: 'Economics (B.Com-MBA)', name: 'Cross Elasticity', expr: 'Exy = %ΔQx/%ΔPy' },
    { cat: 'Economics (B.Com-MBA)', name: 'Marginal Propensity to Consume', expr: 'MPC = ΔC/ΔY' },
    { cat: 'Economics (B.Com-MBA)', name: 'Marginal Propensity to Save', expr: 'MPS = ΔS/ΔY' },
    { cat: 'Economics (B.Com-MBA)', name: 'National Income (Income method)', expr: 'NI = Wages + Rent + Interest + Profit' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Discount Amount', expr: 'Discount = List Price − Selling Price' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Trade Discount', expr: 'TD = List Price × Discount%' },
    { cat: 'Costing (B.Com-MBA)', name: 'Prime Cost', expr: 'PC = Direct Material + Direct Labor + Direct Expenses' },
    { cat: 'Costing (B.Com-MBA)', name: 'Factory Cost', expr: 'FC = Prime Cost + Factory Overheads' },
    { cat: 'Costing (B.Com-MBA)', name: 'Margin of Safety', expr: 'MOS = Actual Sales − Break-even Sales' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Gross Profit Margin', expr: 'GPM = (GP/Sales) × 100' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Net Profit Margin (alt)', expr: 'NPM = (NP/Sales) × 100' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Asset Turnover Ratio', expr: 'ATR = Sales/Total Assets' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Receivables Turnover', expr: 'RT = Net Credit Sales/Avg Receivables' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Market Share', expr: 'MS = Company Sales/Total Market Sales × 100' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Return on Marketing Investment', expr: 'ROMI = (Revenue−Cost)/Cost × 100' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Price Relative', expr: 'PR = (p₁/p₀) × 100' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Time Series Index', expr: 'compares value at time t to a base period' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Taxable Income', expr: 'TI = Gross Income − Deductions' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Sales Tax Amount', expr: 'ST = Price × Tax Rate' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Value Added Tax', expr: 'VAT = Output Tax − Input Tax' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Withholding Tax', expr: 'WHT = Payment × Tax Rate' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Effective Tax Rate', expr: 'ETR = Total Tax/Taxable Income × 100' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Capital Gains Tax', expr: 'CGT = (Sale Price − Cost) × Tax Rate' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Net Sales', expr: 'Net Sales = Gross Sales − Returns − Discounts' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Net Purchases', expr: 'Net Purchases = Gross Purchases − Returns − Discounts' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Retained Earnings', expr: 'RE = Beginning RE + Net Income − Dividends' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Book Value of Asset', expr: 'BV = Cost − Accumulated Depreciation' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Units of Production Depreciation', expr: 'D = (Cost−Salvage)/Total Units × Units Used' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Sum-of-Years-Digits Depreciation', expr: 'D = (Remaining Life/Sum of Years) × (Cost−Salvage)' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Accounts Receivable Turnover', expr: 'ART = Net Credit Sales/Avg Accounts Receivable' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Days Sales Outstanding', expr: 'DSO = 365/ART' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Accounts Payable Turnover', expr: 'APT = Net Credit Purchases/Avg Accounts Payable' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Days Payable Outstanding', expr: 'DPO = 365/APT' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Cash Conversion Cycle', expr: 'CCC = DIO + DSO − DPO' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Days Inventory Outstanding', expr: 'DIO = 365/Inventory Turnover' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Total Assets Formula', expr: 'TA = Current Assets + Fixed Assets' },
    { cat: 'Accounting (FSc-B.Com)', name: 'Total Liabilities Formula', expr: 'TL = Current Liabilities + Long-term Liabilities' },
    { cat: 'Accounting (9th-B.Com)', name: 'Capital Account', expr: 'Capital = Assets − Outside Liabilities' },
    { cat: 'Accounting (9th-B.Com)', name: 'Drawings Effect', expr: 'Ending Capital = Beginning Capital + Net Income − Drawings' },
    { cat: 'Accounting (9th-B.Com)', name: 'Suspense Account (concept)', expr: 'temporary account for unresolved trial balance errors' },
    { cat: 'Accounting (9th-B.Com)', name: 'Bad Debts Expense', expr: 'Bad Debts = % of Credit Sales' },
    { cat: 'Accounting (9th-B.Com)', name: 'Allowance for Doubtful Accounts', expr: 'ADA = % of Accounts Receivable' },
    { cat: 'Accounting (9th-B.Com)', name: 'Net Realizable Value', expr: 'NRV = Accounts Receivable − ADA' },
    { cat: 'Finance (B.Com-MBA)', name: 'Weighted Average Cost of Debt', expr: 'Kd = ΣwᵢKdᵢ' },
    { cat: 'Finance (B.Com-MBA)', name: 'Degree of Operating Leverage', expr: 'DOL = %ΔEBIT/%ΔSales' },
    { cat: 'Finance (B.Com-MBA)', name: 'Degree of Financial Leverage', expr: 'DFL = %ΔEPS/%ΔEBIT' },
    { cat: 'Finance (B.Com-MBA)', name: 'Degree of Combined Leverage', expr: 'DCL = DOL × DFL' },
    { cat: 'Finance (B.Com-MBA)', name: 'Operating Leverage', expr: 'OL = Contribution Margin/EBIT' },
    { cat: 'Finance (B.Com-MBA)', name: 'Financial Leverage', expr: 'FL = EBIT/EBT' },
    { cat: 'Finance (B.Com-MBA)', name: 'Times Interest Earned', expr: 'TIE = EBIT/Interest Expense' },
    { cat: 'Finance (B.Com-MBA)', name: 'Debt Ratio', expr: 'DR = Total Debt/Total Assets' },
    { cat: 'Finance (B.Com-MBA)', name: 'Equity Multiplier', expr: 'EM = Total Assets/Total Equity' },
    { cat: 'Finance (B.Com-MBA)', name: 'DuPont ROE', expr: 'ROE = Net Margin × Asset Turnover × Equity Multiplier' },
    { cat: 'Finance (B.Com-MBA)', name: 'Return on Assets', expr: 'ROA = Net Income/Total Assets' },
    { cat: 'Finance (B.Com-MBA)', name: 'Book Value per Share', expr: 'BVPS = Total Equity/Shares Outstanding' },
    { cat: 'Finance (B.Com-MBA)', name: 'Market to Book Ratio', expr: 'M/B = Market Price/BVPS' },
    { cat: 'Finance (B.Com-MBA)', name: 'Dividend Payout Ratio', expr: 'DPR = Dividends/Net Income × 100' },
    { cat: 'Finance (B.Com-MBA)', name: 'Retention Ratio', expr: 'RR = 1 − DPR' },
    { cat: 'Finance (B.Com-MBA)', name: 'Sustainable Growth Rate', expr: 'SGR = ROE × Retention Ratio' },
    { cat: 'Finance (B.Com-MBA)', name: 'Gordon Growth Model', expr: 'P₀ = D₁/(r−g)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Holding Period Return', expr: 'HPR = (Ending Value−Beginning Value+Income)/Beginning Value' },
    { cat: 'Finance (B.Com-MBA)', name: 'Nominal Interest Rate', expr: 'i = (1+r)(1+inflation) − 1' },
    { cat: 'Finance (B.Com-MBA)', name: 'Loan Amortization Payment', expr: 'PMT = P[r(1+r)ⁿ]/[(1+r)ⁿ−1]' },
    { cat: 'Finance (B.Com-MBA)', name: 'Discounted Payback Period', expr: 'time to recover investment using PV of cash flows' },
    { cat: 'Finance (B.Com-MBA)', name: 'Profitability Index', expr: 'PI = PV of Future Cash Flows/Initial Investment' },
    { cat: 'Finance (B.Com-MBA)', name: 'Cost of Preferred Stock', expr: 'Kp = Dividend/Net Proceeds' },
    { cat: 'Finance (B.Com-MBA)', name: 'Beta (concept)', expr: 'measures asset volatility relative to market' },
    { cat: 'Finance (B.Com-MBA)', name: 'Risk Premium', expr: 'RP = Expected Return − Risk-free Rate' },
    { cat: 'Finance (B.Com-MBA)', name: 'Sharpe Ratio', expr: 'SR = (Rp−Rf)/σp' },
    { cat: 'Economics (B.Com-MBA)', name: 'Total Revenue', expr: 'TR = Price × Quantity' },
    { cat: 'Economics (B.Com-MBA)', name: 'Marginal Revenue', expr: 'MR = ΔTR/ΔQ' },
    { cat: 'Economics (B.Com-MBA)', name: 'Marginal Cost', expr: 'MC = ΔTC/ΔQ' },
    { cat: 'Economics (B.Com-MBA)', name: 'Average Cost', expr: 'AC = TC/Q' },
    { cat: 'Economics (B.Com-MBA)', name: 'Average Fixed Cost', expr: 'AFC = TFC/Q' },
    { cat: 'Economics (B.Com-MBA)', name: 'Average Variable Cost', expr: 'AVC = TVC/Q' },
    { cat: 'Economics (B.Com-MBA)', name: 'Profit Maximization Condition', expr: 'MR = MC' },
    { cat: 'Economics (B.Com-MBA)', name: 'Consumer Surplus (concept)', expr: 'area between demand curve and market price' },
    { cat: 'Economics (B.Com-MBA)', name: 'Producer Surplus (concept)', expr: 'area between market price and supply curve' },
    { cat: 'Economics (B.Com-MBA)', name: 'Price Elasticity of Supply', expr: 'Es = %ΔQs/%ΔP' },
    { cat: 'Economics (B.Com-MBA)', name: 'GDP (Income Method)', expr: 'GDP = Wages + Rent + Interest + Profits' },
    { cat: 'Economics (B.Com-MBA)', name: 'GNP', expr: 'GNP = GDP + Net Income from Abroad' },
    { cat: 'Economics (B.Com-MBA)', name: 'Net National Product', expr: 'NNP = GNP − Depreciation' },
    { cat: 'Economics (B.Com-MBA)', name: 'Real GDP', expr: 'Real GDP = Nominal GDP/GDP Deflator × 100' },
    { cat: 'Economics (B.Com-MBA)', name: 'GDP Deflator', expr: 'Deflator = (Nominal GDP/Real GDP) × 100' },
    { cat: 'Economics (B.Com-MBA)', name: 'GDP Per Capita', expr: 'GDP per Capita = GDP/Population' },
    { cat: 'Economics (B.Com-MBA)', name: 'Unemployment Rate', expr: 'UR = Unemployed/Labor Force × 100' },
    { cat: 'Economics (B.Com-MBA)', name: 'Labor Force Participation Rate', expr: 'LFPR = Labor Force/Working Age Population × 100' },
    { cat: 'Economics (B.Com-MBA)', name: 'Money Multiplier', expr: 'MM = 1/Reserve Ratio' },
    { cat: 'Economics (B.Com-MBA)', name: 'Quantity Theory of Money', expr: 'MV = PQ' },
    { cat: 'Economics (B.Com-MBA)', name: 'Balance of Trade', expr: 'BOT = Exports − Imports' },
    { cat: 'Economics (B.Com-MBA)', name: 'Exchange Rate (purchasing power parity)', expr: 'E = P domestic/P foreign' },
    { cat: 'Economics (B.Com-MBA)', name: 'Gini Coefficient (concept)', expr: 'measures income inequality from 0 (equal) to 1 (unequal)' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Cash Discount', expr: 'CD = Invoice Amount × Discount Rate' },
    { cat: 'Business Math (FSc-B.Com)', name: 'List Price from Net Price', expr: 'LP = Net Price/(1 − Discount%)' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Commission', expr: 'Commission = Sales × Commission Rate' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Simple Interest Amount', expr: 'A = P + SI' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Compound Amount', expr: 'A = P(1+r)ⁿ' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Installment Payment', expr: 'Installment = (Price−Down Payment)/Number of Installments' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Markup on Cost', expr: 'Markup% = (Markup/Cost) × 100' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Markup on Selling Price', expr: 'Markup% = (Markup/Selling Price) × 100' },
    { cat: 'Costing (B.Com-MBA)', name: 'Direct Labor Cost', expr: 'DLC = Hours Worked × Wage Rate' },
    { cat: 'Costing (B.Com-MBA)', name: 'Overhead Absorption Rate', expr: 'OAR = Total Overheads/Total Base Units' },
    { cat: 'Costing (B.Com-MBA)', name: 'Cost per Unit', expr: 'CPU = Total Cost/Units Produced' },
    { cat: 'Costing (B.Com-MBA)', name: 'Standard Cost Variance', expr: 'Variance = Standard Cost − Actual Cost' },
    { cat: 'Costing (B.Com-MBA)', name: 'Material Price Variance', expr: 'MPV = (Standard Price−Actual Price) × Actual Quantity' },
    { cat: 'Costing (B.Com-MBA)', name: 'Material Usage Variance', expr: 'MUV = (Standard Qty−Actual Qty) × Standard Price' },
    { cat: 'Costing (B.Com-MBA)', name: 'Labor Rate Variance', expr: 'LRV = (Standard Rate−Actual Rate) × Actual Hours' },
    { cat: 'Costing (B.Com-MBA)', name: 'Labor Efficiency Variance', expr: 'LEV = (Standard Hours−Actual Hours) × Standard Rate' },
    { cat: 'Costing (B.Com-MBA)', name: 'Break-even Sales Revenue', expr: 'BE Sales = Fixed Cost/Contribution Margin Ratio' },
    { cat: 'Costing (B.Com-MBA)', name: 'Contribution Margin Ratio', expr: 'CMR = Contribution Margin/Sales' },
    { cat: 'Costing (B.Com-MBA)', name: 'Target Profit Sales Volume', expr: 'Q = (Fixed Cost+Target Profit)/Contribution per Unit' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Working Capital Ratio', expr: 'WCR = Current Assets/Current Liabilities' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Cash Ratio', expr: 'Cash Ratio = (Cash+Marketable Securities)/Current Liabilities' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Fixed Asset Turnover', expr: 'FAT = Sales/Net Fixed Assets' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Total Asset Turnover', expr: 'TAT = Sales/Total Assets' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Interest Coverage Ratio', expr: 'ICR = EBIT/Interest Expense' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Capital Gearing Ratio', expr: 'CGR = Fixed Interest Capital/Equity Capital' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Customer Acquisition Cost', expr: 'CAC = Total Marketing Cost/New Customers' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Customer Retention Rate', expr: 'CRR = (Customers End−New Customers)/Customers Start × 100' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Churn Rate', expr: 'Churn = Customers Lost/Total Customers × 100' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Conversion Rate', expr: 'CVR = Conversions/Total Visitors × 100' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Click Through Rate', expr: 'CTR = Clicks/Impressions × 100' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Cost per Click', expr: 'CPC = Total Ad Spend/Clicks' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Cost per Acquisition', expr: 'CPA = Total Ad Spend/Conversions' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Return on Ad Spend', expr: 'ROAS = Revenue from Ads/Ad Spend' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Business Mean', expr: 'x̄ = Σx/n (of sales/data)' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Sales Growth Rate', expr: 'SGR = (Current Sales−Previous Sales)/Previous Sales × 100' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Year-over-Year Growth', expr: 'YoY = (This Year−Last Year)/Last Year × 100' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Compound Annual Growth Rate (Business)', expr: 'CAGR = (Ending Value/Beginning Value)^(1/n) − 1' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Employee Turnover Rate', expr: 'ETR = Employees Left/Avg Employees × 100' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Absenteeism Rate', expr: 'AR = Days Absent/Total Working Days × 100' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Labor Productivity', expr: 'LP = Output/Labor Hours' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Cost per Hire', expr: 'CPH = Total Recruiting Cost/Number Hired' },
    { cat: 'Insurance (B.Com-MBA)', name: 'Insurance Premium', expr: 'Premium = Sum Insured × Rate' },
    { cat: 'Insurance (B.Com-MBA)', name: 'Loss Ratio', expr: 'LR = Claims Paid/Premiums Earned × 100' },
    { cat: 'Insurance (B.Com-MBA)', name: 'Underwriting Profit', expr: 'UP = Premiums − Claims − Expenses' },
    { cat: 'Banking (B.Com-MBA)', name: 'Bank Reserve Ratio', expr: 'RR = Reserves/Deposits' },
    { cat: 'Banking (B.Com-MBA)', name: 'Loan to Deposit Ratio', expr: 'LDR = Total Loans/Total Deposits' },
    { cat: 'Banking (B.Com-MBA)', name: 'Net Interest Margin', expr: 'NIM = (Interest Income−Interest Expense)/Avg Earning Assets' },
    { cat: 'International Trade (B.Com-MBA)', name: 'FOB Value', expr: 'FOB = Cost of Goods + Export Charges' },
    { cat: 'International Trade (B.Com-MBA)', name: 'CIF Value', expr: 'CIF = FOB + Insurance + Freight' },
    { cat: 'International Trade (B.Com-MBA)', name: 'Terms of Trade', expr: 'ToT = Export Price Index/Import Price Index × 100' },
  ],
};

/* ---------- FORMULA RENDERING ---------- */
const subjectPills = document.getElementById('subjectPills');
const formulaList = document.getElementById('formulaList');
const formulaSearch = document.getElementById('formulaSearch');
const FAV_SUBJECT_KEY = '__FAVORITES__';
const RECENT_SUBJECT_KEY = '__RECENT__';
const RECENT_FORMULAS_MAX = 20;

/* ---- Favorite formulas (persisted) ---- */
let favFormulas = [];
try { favFormulas = JSON.parse(localStorage.getItem('calvo_fav_formulas') || '[]'); } catch (e) { favFormulas = []; }

/* ---- Recently viewed formulas (persisted) ---- */
let recentFormulas = [];
try { recentFormulas = JSON.parse(localStorage.getItem('calvo_recent_formulas') || '[]'); } catch (e) { recentFormulas = []; }

function persistRecentFormulas() {
  try { localStorage.setItem('calvo_recent_formulas', JSON.stringify(recentFormulas)); } catch (e) {}
}

/* Records/moves a formula to the top of "Recently Viewed" whenever the
   user taps on it, so the list always reflects most-recent-first order. */
function logRecentFormula(subj, f) {
  const key = favKey(subj, f);
  recentFormulas = recentFormulas.filter(r => r.key !== key);
  recentFormulas.unshift({ key, subj, name: f.name, expr: f.expr, cat: f.cat || '', time: Date.now() });
  if (recentFormulas.length > RECENT_FORMULAS_MAX) recentFormulas = recentFormulas.slice(0, RECENT_FORMULAS_MAX);
  persistRecentFormulas();
  // Only re-render if the Recently Viewed pill is the one currently open,
  // otherwise leave the user's current browsing view undisturbed.
  if (activeSubject === RECENT_SUBJECT_KEY) renderFormulas();
}

/* Wires up "tap formula to log it as viewed" on a rendered formula row.
   Ignores taps on the star/share buttons, which have their own handlers. */
function attachFormulaViewLogger(div, subj, f) {
  const textEl = div.querySelector('.formula-item-text');
  if (textEl) textEl.addEventListener('click', () => logRecentFormula(subj, f));
}

function favKey(subj, f) { return subj + '||' + (f.cat || '') + '||' + f.name; }
function isFavByKey(key) { return favFormulas.includes(key); }
function persistFavFormulas() {
  try { localStorage.setItem('calvo_fav_formulas', JSON.stringify(favFormulas)); } catch (e) {}
}
function toggleFavByKey(key) {
  const idx = favFormulas.indexOf(key);
  if (idx === -1) favFormulas.push(key);
  else favFormulas.splice(idx, 1);
  persistFavFormulas();
}

function buildSubjectPills() {
  subjectPills.innerHTML = '';

  const favBtn = document.createElement('button');
  favBtn.className = 'subject-pill fav-pill' + (activeSubject === FAV_SUBJECT_KEY ? ' active' : '');
  favBtn.textContent = t('favorites_pill');
  favBtn.addEventListener('click', () => {
    activeSubject = FAV_SUBJECT_KEY;
    document.querySelectorAll('.subject-pill').forEach(b => b.classList.remove('active'));
    favBtn.classList.add('active');
    renderFormulas();
    formulaList.scrollTop = 0;
  });
  subjectPills.appendChild(favBtn);

  const recentBtn = document.createElement('button');
  recentBtn.className = 'subject-pill recent-pill' + (activeSubject === RECENT_SUBJECT_KEY ? ' active' : '');
  recentBtn.textContent = t('recent_pill');
  recentBtn.addEventListener('click', () => {
    activeSubject = RECENT_SUBJECT_KEY;
    document.querySelectorAll('.subject-pill').forEach(b => b.classList.remove('active'));
    recentBtn.classList.add('active');
    renderFormulas();
    formulaList.scrollTop = 0;
  });
  subjectPills.appendChild(recentBtn);

  Object.keys(formulaData).forEach(subj => {
    const btn = document.createElement('button');
    btn.className = 'subject-pill' + (subj === activeSubject ? ' active' : '');
    btn.textContent = subj;
    btn.addEventListener('click', () => {
      activeSubject = subj;
      document.querySelectorAll('.subject-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderFormulas();
      formulaList.scrollTop = 0;
    });
    subjectPills.appendChild(btn);
  });
}

function formulaItemHtml(f, key, subjTag) {
  const fav = isFavByKey(key);
  const tagHtml = subjTag ? `<span class="formula-subj-tag">${subjTag}</span>` : '';
  return `<div class="formula-item-row">
      <div class="formula-item-text">
        <div class="formula-name">${tagHtml}${f.name}</div>
        <div class="formula-expr">${f.expr}</div>
      </div>
      <div class="formula-item-actions">
        <button class="icon-action-btn fav-star-btn${fav ? ' active' : ''}" data-key="${key}" title="${fav ? t('remove_favorite_title') : t('add_favorite_title')}">${fav ? '★' : '☆'}</button>
        <button class="icon-action-btn formula-share-btn" data-key="${key}" title="${t('share_title')}">&#128228;</button>
      </div>
    </div>`;
}

function renderFormulas() {
  const q = formulaSearch.value.toLowerCase();
  formulaList.innerHTML = '';

  /* ---- Favorites view: pulls matching formulas across every subject ---- */
  if (activeSubject === FAV_SUBJECT_KEY) {
    const favItems = [];
    Object.keys(formulaData).forEach(subj => {
      formulaData[subj].forEach(f => {
        const key = favKey(subj, f);
        if (!isFavByKey(key)) return;
        if (!(f.name.toLowerCase().includes(q) || (f.cat && f.cat.toLowerCase().includes(q)))) return;
        favItems.push({ f, key, subj });
      });
    });
    if (favItems.length === 0) {
      formulaList.innerHTML = `<div class="formula-empty">${t('no_favorite_formulas')}</div>`;
      return;
    }
    let lastSubj = null;
    favItems.forEach(({ f, key, subj }) => {
      if (subj !== lastSubj) {
        const catHead = document.createElement('div');
        catHead.className = 'formula-cat';
        catHead.textContent = subj;
        formulaList.appendChild(catHead);
        lastSubj = subj;
      }
      const div = document.createElement('div');
      div.className = 'formula-item';
      div.innerHTML = formulaItemHtml(f, key);
      attachFormulaViewLogger(div, subj, f);
      formulaList.appendChild(div);
    });
    return;
  }

  /* ---- Recently Viewed view: flat, most-recent-first, across subjects ---- */
  if (activeSubject === RECENT_SUBJECT_KEY) {
    const recentItems = recentFormulas.filter(r =>
      r.name.toLowerCase().includes(q) || (r.cat && r.cat.toLowerCase().includes(q))
    );
    if (recentItems.length === 0) {
      formulaList.innerHTML = `<div class="formula-empty">${t('no_recent_formulas')}</div>`;
      return;
    }
    recentItems.forEach(r => {
      const f = { name: r.name, expr: r.expr, cat: r.cat };
      const div = document.createElement('div');
      div.className = 'formula-item';
      div.innerHTML = formulaItemHtml(f, r.key, r.subj);
      attachFormulaViewLogger(div, r.subj, f);
      formulaList.appendChild(div);
    });
    return;
  }

  const items = formulaData[activeSubject].filter(f =>
    f.name.toLowerCase().includes(q) || (f.cat && f.cat.toLowerCase().includes(q))
  );
  if (items.length === 0) {
    formulaList.innerHTML = `<div class="formula-empty">${t('no_formulas_found')}</div>`;
    return;
  }
  let lastCat = null;
  items.forEach(f => {
    if (f.cat && f.cat !== lastCat) {
      const catHead = document.createElement('div');
      catHead.className = 'formula-cat';
      catHead.textContent = f.cat;
      formulaList.appendChild(catHead);
      lastCat = f.cat;
    }
    const key = favKey(activeSubject, f);
    const div = document.createElement('div');
    div.className = 'formula-item';
    div.innerHTML = formulaItemHtml(f, key);
    attachFormulaViewLogger(div, activeSubject, f);
    formulaList.appendChild(div);
  });
}

/* ---- Event delegation: favorite toggle + share/copy, for every formula item ---- */
formulaList.addEventListener('click', (e) => {
  const starBtn = e.target.closest('.fav-star-btn');
  if (starBtn) {
    toggleFavByKey(starBtn.dataset.key);
    renderFormulas();
    return;
  }
  const shareBtn = e.target.closest('.formula-share-btn');
  if (shareBtn) {
    const parts = shareBtn.dataset.key.split('||');
    const name = parts[2] || '';
    // Find the matching formula text currently on screen for exact expr
    const row = shareBtn.closest('.formula-item');
    const exprText = row ? row.querySelector('.formula-expr').textContent : '';
    shareOrCopyText(`${name}: ${exprText}`);
  }
});

formulaSearch.addEventListener('input', () => { renderFormulas(); formulaList.scrollTop = 0; });
buildSubjectPills();
renderFormulas();

/* ============================================
   CALCULATION HISTORY
   ============================================ */
let calcHistory = [];
try { calcHistory = JSON.parse(localStorage.getItem('calvo_calc_history') || '[]'); } catch(e) { calcHistory = []; }

const historyListEl = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

function saveCalcHistory() {
  try { localStorage.setItem('calvo_calc_history', JSON.stringify(calcHistory)); } catch(e) {}
}

function logCalcHistory(exprStr, resultStr) {
  if (!exprStr || exprStr === resultStr) return;
  calcHistory.unshift({ expr: exprStr, result: resultStr, time: Date.now() });
  if (calcHistory.length > 200) calcHistory = calcHistory.slice(0, 200);
  saveCalcHistory();
  renderCalcHistory();
}

const LOCALE_MAP = { en: 'en-US', ur: 'ur-PK', ar: 'ar-EG', fr: 'fr-FR', es: 'es-ES', hi: 'hi-IN', zh: 'zh-CN', tr: 'tr-TR', de: 'de-DE', ru: 'ru-RU' };

function formatHistoryTime(ts) {
  const d = new Date(ts);
  const locale = LOCALE_MAP[currentLang] || 'en-US';
  return d.toLocaleDateString(locale) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

function renderCalcHistory() {
  if (!historyListEl) return;
  historyListEl.innerHTML = '';
  if (calcHistory.length === 0) {
    historyListEl.innerHTML = `<div class="formula-empty">${t('no_history')}</div>`;
    return;
  }
  calcHistory.forEach(h => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `<div class="history-item-row">
        <div class="history-item-text">
          <div class="history-expr">${h.expr} =</div>
          <div class="history-result">${h.result}</div>
          <div class="history-time">${formatHistoryTime(h.time)}</div>
        </div>
        <button class="icon-action-btn history-share-btn" title="${t('share_title')}">&#128228;</button>
      </div>`;
    div.querySelector('.history-item-text').addEventListener('click', () => {
      lastAns = parseFloat(h.result);
      expr = h.result;
      updateDisplay();
      document.querySelector('.topbar-tab[data-tab="calc"]').click();
    });
    div.querySelector('.history-share-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      shareOrCopyText(`${h.expr} = ${h.result}`);
    });
    historyListEl.appendChild(div);
  });
}

if (clearHistoryBtn) {
  armConfirmButton(clearHistoryBtn, 'ai_tap_again_confirm', () => {
    calcHistory = [];
    saveCalcHistory();
    renderCalcHistory();
  });
}

renderCalcHistory();

/* ============================================
   UNIT CONVERTER
   ============================================ */
const convertData = {
  Length: {
    base: 'm',
    units: {
      Meter: 1, Kilometer: 1000, Centimeter: 0.01, Millimeter: 0.001,
      Mile: 1609.344, Yard: 0.9144, Foot: 0.3048, Inch: 0.0254,
      'Nautical Mile': 1852,
    }
  },
  Weight: {
    base: 'kg',
    units: {
      Kilogram: 1, Gram: 0.001, Milligram: 0.000001, 'Metric Ton': 1000,
      Pound: 0.45359237, Ounce: 0.028349523125, Stone: 6.35029318,
    }
  },
  Temperature: { special: true },
  Area: {
    base: 'm2',
    units: {
      'Square Meter': 1, 'Square Kilometer': 1000000, 'Square Foot': 0.09290304,
      'Square Yard': 0.83612736, Acre: 4046.8564224, Hectare: 10000,
      Marla: 25.2929, Kanal: 505.857,
    }
  },
  Volume: {
    base: 'l',
    units: {
      Liter: 1, Milliliter: 0.001, 'Cubic Meter': 1000, Gallon: 3.785411784,
      Quart: 0.946352946, Pint: 0.473176473, 'Cubic Foot': 28.316846592,
    }
  },
  Speed: {
    base: 'mps',
    units: {
      'Meters/sec': 1, 'Kilometers/hour': 0.277778, 'Miles/hour': 0.44704,
      Knot: 0.514444, 'Feet/sec': 0.3048,
    }
  },
  Time: {
    base: 's',
    units: {
      Second: 1, Minute: 60, Hour: 3600, Day: 86400, Week: 604800,
      Month: 2629800, Year: 31557600,
    }
  },
  Data: {
    base: 'byte',
    units: {
      Byte: 1, Kilobyte: 1024, Megabyte: 1024 ** 2, Gigabyte: 1024 ** 3,
      Terabyte: 1024 ** 4, Bit: 0.125,
    }
  },
  Currency: { special: true, currency: true },
};

/* ---- Currency list shown in the dropdowns (code + label) ---- */
const currencyList = [
  { code: 'USD', name: 'US Dollar' }, { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' }, { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'INR', name: 'Indian Rupee' }, { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' }, { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'JPY', name: 'Japanese Yen' }, { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' }, { code: 'CHF', name: 'Swiss Franc' },
  { code: 'TRY', name: 'Turkish Lira' }, { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'NPR', name: 'Nepalese Rupee' }, { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'QAR', name: 'Qatari Riyal' }, { code: 'OMR', name: 'Omani Rial' },
  { code: 'BHD', name: 'Bahraini Dinar' }, { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'SGD', name: 'Singapore Dollar' }, { code: 'ZAR', name: 'South African Rand' },
  { code: 'RUB', name: 'Russian Ruble' }, { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' }, { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'THB', name: 'Thai Baht' }, { code: 'KRW', name: 'South Korean Won' },
  { code: 'NZD', name: 'New Zealand Dollar' }, { code: 'EGP', name: 'Egyptian Pound' },
  { code: 'NGN', name: 'Nigerian Naira' }, { code: 'SEK', name: 'Swedish Krona' },
  { code: 'NOK', name: 'Norwegian Krone' }, { code: 'DKK', name: 'Danish Krone' },
  { code: 'PLN', name: 'Polish Zloty' }, { code: 'HKD', name: 'Hong Kong Dollar' },
  { code: 'AFN', name: 'Afghan Afghani' }, { code: 'LKR', name: 'Sri Lankan Rupee' },
];

/* ---- Live currency rates (base USD), fetched from the free,
   no-API-key ExchangeRate-API open endpoint and cached in
   localStorage so the app works offline after the first fetch. ---- */
const CURRENCY_CACHE_KEY = 'calvoCurrencyRatesV1';
const CURRENCY_CACHE_TTL = 12 * 60 * 60 * 1000; // refresh at most every 12h
let currencyRates = null;
let currencyRatesTime = null;
let currencyFetchPromise = null;

function loadCachedCurrencyRates() {
  try {
    const raw = localStorage.getItem(CURRENCY_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.rates || !data.time) return null;
    return data;
  } catch (e) { return null; }
}

function fetchCurrencyRates(force) {
  if (currencyFetchPromise) return currencyFetchPromise;
  const cached = loadCachedCurrencyRates();
  if (!force && cached && (Date.now() - cached.time) < CURRENCY_CACHE_TTL) {
    currencyRates = cached.rates;
    currencyRatesTime = cached.time;
    return Promise.resolve(currencyRates);
  }
  currencyFetchPromise = fetch('https://open.er-api.com/v6/latest/USD')
    .then(res => res.json())
    .then(data => {
      if (data && data.result === 'success' && data.rates) {
        currencyRates = data.rates;
        currencyRatesTime = Date.now();
        try {
          localStorage.setItem(CURRENCY_CACHE_KEY, JSON.stringify({ rates: currencyRates, time: currencyRatesTime }));
        } catch (e) {}
        return currencyRates;
      }
      throw new Error('bad currency response');
    })
    .catch(err => {
      if (cached && cached.rates) {
        currencyRates = cached.rates;
        currencyRatesTime = cached.time;
        return currencyRates;
      }
      throw err;
    })
    .finally(() => { currencyFetchPromise = null; });
  return currencyFetchPromise;
}

let activeConvertCategory = 'Length';
const convertCategoryPills = document.getElementById('convertCategoryPills');
const convertFromEl = document.getElementById('convertFrom');
const convertToEl = document.getElementById('convertTo');
const convertFromUnitEl = document.getElementById('convertFromUnit');
const convertToUnitEl = document.getElementById('convertToUnit');
const convertSwapBtn = document.getElementById('convertSwapBtn');
const convertHintEl = document.getElementById('convertHint');
const convertAttributionEl = document.getElementById('convertAttribution');

function buildConvertPills() {
  if (!convertCategoryPills) return;
  convertCategoryPills.innerHTML = '';
  Object.keys(convertData).forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'subject-pill' + (cat === activeConvertCategory ? ' active' : '');
    btn.textContent = cat;
    btn.addEventListener('click', () => {
      activeConvertCategory = cat;
      document.querySelectorAll('#convertCategoryPills .subject-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      buildConvertUnitOptions();
      runConvert();
      if (convertAttributionEl) convertAttributionEl.style.display = (cat === 'Currency') ? 'block' : 'none';
    });
    convertCategoryPills.appendChild(btn);
  });
}

function buildConvertUnitOptions() {
  const cat = convertData[activeConvertCategory];
  convertFromUnitEl.innerHTML = '';
  convertToUnitEl.innerHTML = '';
  if (cat.currency) {
    currencyList.forEach((c, i) => {
      const label = `${c.code} — ${c.name}`;
      convertFromUnitEl.add(new Option(label, c.code, false, c.code === 'USD'));
      convertToUnitEl.add(new Option(label, c.code, false, c.code === 'PKR'));
    });
  } else if (cat.special) {
    ['Celsius', 'Fahrenheit', 'Kelvin'].forEach((u, i) => {
      convertFromUnitEl.add(new Option(u, u, false, i === 0));
      convertToUnitEl.add(new Option(u, u, false, i === 1));
    });
  } else {
    const names = Object.keys(cat.units);
    names.forEach((u, i) => {
      convertFromUnitEl.add(new Option(u, u, false, i === 0));
      convertToUnitEl.add(new Option(u, u, false, i === 1));
    });
  }
}

function convertTemperature(val, from, to) {
  let celsius;
  if (from === 'Celsius') celsius = val;
  else if (from === 'Fahrenheit') celsius = (val - 32) * 5 / 9;
  else celsius = val - 273.15;
  if (to === 'Celsius') return celsius;
  if (to === 'Fahrenheit') return celsius * 9 / 5 + 32;
  return celsius + 273.15;
}

function runConvert() {
  const val = parseFloat(convertFromEl.value);
  if (isNaN(val)) { convertToEl.value = ''; convertHintEl.textContent = ''; return; }
  const cat = convertData[activeConvertCategory];
  const fromU = convertFromUnitEl.value;
  const toU = convertToUnitEl.value;

  if (cat.currency) {
    runCurrencyConvert(val, fromU, toU);
    return;
  }

  let result;
  if (cat.special) {
    result = convertTemperature(val, fromU, toU);
  } else {
    const baseVal = val * cat.units[fromU];
    result = baseVal / cat.units[toU];
  }
  const rounded = Math.round(result * 1e8) / 1e8;
  convertToEl.value = rounded;
  convertHintEl.textContent = `${val} ${fromU} = ${rounded} ${toU}`;
}

function computeAndShowCurrency(val, fromU, toU) {
  if (isNaN(val) || !currencyRates || !currencyRates[fromU] || !currencyRates[toU]) return;
  const inUsd = val / currencyRates[fromU];
  const result = inUsd * currencyRates[toU];
  const rounded = Math.round(result * 1e6) / 1e6;
  convertToEl.value = rounded;
  convertHintEl.textContent = `${val} ${fromU} = ${rounded} ${toU}`;
}

function runCurrencyConvert(val, fromU, toU) {
  if (currencyRates && currencyRates[fromU] && currencyRates[toU]) {
    computeAndShowCurrency(val, fromU, toU);
  } else {
    convertToEl.value = '';
    convertHintEl.textContent = t('convert_rates_loading');
  }
  fetchCurrencyRates()
    .then(() => {
      if (activeConvertCategory !== 'Currency') return;
      computeAndShowCurrency(parseFloat(convertFromEl.value), convertFromUnitEl.value, convertToUnitEl.value);
    })
    .catch(() => {
      if (activeConvertCategory !== 'Currency') return;
      convertHintEl.textContent = t('convert_rates_error');
    });
}

if (convertFromEl) {
  convertFromEl.addEventListener('input', runConvert);
  convertFromUnitEl.addEventListener('change', runConvert);
  convertToUnitEl.addEventListener('change', runConvert);
  convertSwapBtn.addEventListener('click', () => {
    const fromIdx = convertFromUnitEl.selectedIndex;
    const toIdx = convertToUnitEl.selectedIndex;
    convertFromUnitEl.selectedIndex = toIdx;
    convertToUnitEl.selectedIndex = fromIdx;
    runConvert();
  });
  buildConvertPills();
  buildConvertUnitOptions();
  runConvert();
  if (convertAttributionEl) convertAttributionEl.style.display = (activeConvertCategory === 'Currency') ? 'block' : 'none';
  // Warm the currency rates cache in the background so switching to the
  // Currency tab feels instant even on first launch.
  fetchCurrencyRates().catch(() => {});
}

/* ============================================
   PERCENTAGE + GPA/CGPA CALCULATOR + SAVE RESULTS
   ============================================ */
let percentMode = 'basic';
const percentModePills = document.getElementById('percentModePills');
const percentPanelBasic = document.getElementById('percentPanelBasic');
const percentPanelCgpa = document.getElementById('percentPanelCgpa');

function buildPercentPills() {
  if (!percentModePills) return;
  const modes = [{ id: 'basic', label: t('mode_percentage') }, { id: 'cgpa', label: t('mode_cgpa') }];
  percentModePills.innerHTML = '';
  modes.forEach(m => {
    const btn = document.createElement('button');
    btn.className = 'subject-pill' + (m.id === percentMode ? ' active' : '');
    btn.textContent = m.label;
    btn.addEventListener('click', () => {
      percentMode = m.id;
      document.querySelectorAll('#percentModePills .subject-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      percentPanelBasic.style.display = percentMode === 'basic' ? 'block' : 'none';
      percentPanelCgpa.style.display = percentMode === 'cgpa' ? 'block' : 'none';
    });
    percentModePills.appendChild(btn);
  });
}
buildPercentPills();

/* ---- Grade percentage (subject-wise) calculator ---- */
const gradeSubjectListEl = document.getElementById('gradeSubjectList');
const gradeResultBoxEl = document.getElementById('gradeResultBox');
const gradeAddSubjectBtn = document.getElementById('gradeAddSubjectBtn');
let gradeSubjects = [];
let gradeSubjectSeq = 0;

function addGradeSubject(obtained = '', total = '100') {
  gradeSubjectSeq += 1;
  gradeSubjects.push({ id: gradeSubjectSeq, obtained, total });
  renderGradeSubjects();
}

function removeGradeSubject(id) {
  gradeSubjects = gradeSubjects.filter(s => s.id !== id);
  renderGradeSubjects();
}

function calcGradePercent() {
  let sumObtained = 0, sumTotal = 0, any = false;
  gradeSubjects.forEach(s => {
    const o = parseFloat(s.obtained), t = parseFloat(s.total);
    if (!isNaN(o) && !isNaN(t) && t > 0) { sumObtained += o; sumTotal += t; any = true; }
  });
  if (!any || sumTotal === 0) return null;
  return (sumObtained / sumTotal) * 100;
}

function renderGradeSubjects() {
  if (!gradeSubjectListEl) return;
  gradeSubjectListEl.innerHTML = '';
  gradeSubjects.forEach((s, idx) => {
    const row = document.createElement('div');
    row.className = 'grade-subject-row';

    const name = document.createElement('span');
    name.className = 'grade-subject-name';
    name.textContent = `${t('subject_label')} ${idx + 1}`;
    row.appendChild(name);

    const obtainedInput = document.createElement('input');
    obtainedInput.type = 'number';
    obtainedInput.className = 'grade-input';
    obtainedInput.placeholder = t('score_placeholder');
    obtainedInput.value = s.obtained;
    obtainedInput.addEventListener('input', () => {
      s.obtained = obtainedInput.value;
      updateGradeResult();
    });
    row.appendChild(obtainedInput);

    const slash = document.createElement('span');
    slash.className = 'grade-slash';
    slash.textContent = '/';
    row.appendChild(slash);

    const totalInput = document.createElement('input');
    totalInput.type = 'number';
    totalInput.className = 'grade-input';
    totalInput.placeholder = '100';
    totalInput.value = s.total;
    totalInput.addEventListener('input', () => {
      s.total = totalInput.value;
      updateGradeResult();
    });
    row.appendChild(totalInput);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'grade-remove-btn';
    removeBtn.innerHTML = '&#10005;';
    removeBtn.title = t('remove_title');
    removeBtn.addEventListener('click', () => removeGradeSubject(s.id));
    row.appendChild(removeBtn);

    gradeSubjectListEl.appendChild(row);
  });
  updateGradeResult();
}

function updateGradeResult() {
  if (!gradeResultBoxEl) return;
  const pct = calcGradePercent();
  gradeResultBoxEl.textContent = pct === null ? '0.00%' : `${pct.toFixed(2)}%`;
}

if (gradeAddSubjectBtn) {
  gradeAddSubjectBtn.addEventListener('click', () => addGradeSubject());
  // Start with a couple of blank subjects, like a fresh gradebook.
  addGradeSubject();
  addGradeSubject();
}

/* ---- CGPA / GPA calculator ---- */
const cgpaTableEl = document.getElementById('cgpaTable');
const cgpaScaleEl = document.getElementById('cgpaScale');
const cgpaResultEl = document.getElementById('cgpaResult');
let cgpaSemesterCount = 1;

const gradeScales = {
  '4': { 'A': 4.0, 'B+': 3.5, 'B': 3.0, 'C+': 2.5, 'C': 2.0, 'D': 1.0, 'F': 0.0 },
  '4uet': { 'A+': 4.0, 'A': 4.0, 'A-': 3.7, 'B+': 3.4, 'B': 3.0, 'B-': 2.7, 'C+': 2.4, 'C': 2.0, 'C-': 1.7, 'D+': 1.4, 'D': 1.0, 'F': 0.0 },
};

function gradeOptionsHtml(scaleId) {
  const scale = gradeScales[scaleId];
  return Object.keys(scale).map(g => `<option value="${g}">${g}</option>`).join('');
}

function addCgpaRow(semester) {
  const scaleId = cgpaScaleEl.value;
  const row = document.createElement('div');
  row.className = 'cgpa-row';
  row.dataset.semester = semester;
  row.innerHTML = `
    <input type="text" class="cgpa-subject" placeholder="${t('subject_name_placeholder')}">
    <input type="number" class="cgpa-credit" placeholder="${t('credit_hrs_placeholder')}" min="0" step="0.5">
    <select class="cgpa-grade">${gradeOptionsHtml(scaleId)}</select>
    <button class="cgpa-del" title="${t('remove_title')}">&#10005;</button>
  `;
  row.querySelector('.cgpa-del').addEventListener('click', () => { row.remove(); calcCgpa(); });
  row.querySelector('.cgpa-subject').addEventListener('input', calcCgpa);
  row.querySelector('.cgpa-credit').addEventListener('input', calcCgpa);
  row.querySelector('.cgpa-grade').addEventListener('change', calcCgpa);
  cgpaTableEl.appendChild(row);
}

/* Semester labels are editable text inputs (not static text) so a saved
   semester in the history/trend list below can carry a meaningful name
   like "Fall 2025" instead of just a row index. */
function addCgpaSemesterLabel(semester) {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'cgpa-semester-label';
  input.dataset.semester = semester;
  input.value = t('semester_label') + ' ' + semester;
  input.placeholder = t('semester_label') + ' ' + semester;
  cgpaTableEl.appendChild(input);
}

/* Populated by calcCgpa() on every run so other features (the semester
   history/CGPA-trend save button) can read the latest per-semester
   points/credits without recomputing them. */
let lastSemesterTotals = {};

function calcCgpa() {
  const rows = cgpaTableEl.querySelectorAll('.cgpa-row');
  let totalPoints = 0, totalCredits = 0;
  const semesterTotals = {};
  rows.forEach(row => {
    const credit = parseFloat(row.querySelector('.cgpa-credit').value);
    const grade = row.querySelector('.cgpa-grade').value;
    const scale = gradeScales[cgpaScaleEl.value];
    if (isNaN(credit) || credit <= 0 || !(grade in scale)) return;
    const points = scale[grade] * credit;
    totalPoints += points;
    totalCredits += credit;
    const sem = row.dataset.semester;
    if (!semesterTotals[sem]) semesterTotals[sem] = { points: 0, credits: 0 };
    semesterTotals[sem].points += points;
    semesterTotals[sem].credits += credit;
  });
  lastSemesterTotals = semesterTotals;
  const overall = totalCredits > 0 ? totalPoints / totalCredits : 0;
  let detail = '';
  const semKeys = Object.keys(semesterTotals);
  if (semKeys.length > 1) {
    detail = semKeys.map(s => {
      const gpa = semesterTotals[s].credits > 0 ? semesterTotals[s].points / semesterTotals[s].credits : 0;
      return `${t('sem_short')} ${s}: ${gpa.toFixed(2)}`;
    }).join(' &nbsp;|&nbsp; ');
    cgpaResultEl.innerHTML = `${t('cgpa_prefix')} ${overall.toFixed(2)} <div style="font-size:0.65rem;color:#999;font-weight:600;margin-top:4px;">${detail}</div>`;
  } else {
    cgpaResultEl.textContent = t('gpa_prefix') + ' ' + overall.toFixed(2);
  }
  return overall;
}

if (cgpaTableEl) {
  addCgpaSemesterLabel(1);
  addCgpaRow(1);
  addCgpaRow(1);

  document.getElementById('cgpaAddRow').addEventListener('click', () => {
    addCgpaRow(cgpaSemesterCount);
    calcCgpa();
  });
  document.getElementById('cgpaAddSemester').addEventListener('click', () => {
    cgpaSemesterCount++;
    addCgpaSemesterLabel(cgpaSemesterCount);
    addCgpaRow(cgpaSemesterCount);
    calcCgpa();
  });
  cgpaScaleEl.addEventListener('change', () => {
    cgpaTableEl.querySelectorAll('.cgpa-grade').forEach(sel => {
      sel.innerHTML = gradeOptionsHtml(cgpaScaleEl.value);
    });
    calcCgpa();
  });
  calcCgpa();
}

/* ---- Saved Results (shared by percentage + CGPA) ---- */
let savedResults = [];
try { savedResults = JSON.parse(localStorage.getItem('calvo_saved_results') || '[]'); } catch(e) { savedResults = []; }

const savedResultsListEl = document.getElementById('savedResultsList');

function persistSavedResults() {
  try { localStorage.setItem('calvo_saved_results', JSON.stringify(savedResults)); } catch(e) {}
}

function renderSavedResults() {
  if (!savedResultsListEl) return;
  savedResultsListEl.innerHTML = '';
  if (savedResults.length === 0) {
    savedResultsListEl.innerHTML = `<div class="formula-empty">${t('no_saved_results')}</div>`;
    return;
  }
  savedResults.forEach((r, idx) => {
    const div = document.createElement('div');
    div.className = 'saved-item';
    div.innerHTML = `<span>${r.label}</span><span style="display:flex;align-items:center;gap:8px;"><b style="color:var(--accent);">${r.value}</b><button class="icon-action-btn saved-share-btn" title="${t('share_title')}">&#128228;</button><button class="saved-del" title="${t('delete_title')}">&#10005;</button></span>`;
    div.querySelector('.saved-share-btn').addEventListener('click', () => {
      shareOrCopyText(`${r.label}: ${r.value}`);
    });
    div.querySelector('.saved-del').addEventListener('click', () => {
      savedResults.splice(idx, 1);
      persistSavedResults();
      renderSavedResults();
    });
    savedResultsListEl.appendChild(div);
  });
}

function saveResult(label, value) {
  savedResults.unshift({ label, value, time: Date.now() });
  persistSavedResults();
  renderSavedResults();
}

const savePercentBtn = document.getElementById('savePercentBtn');
if (savePercentBtn) {
  savePercentBtn.addEventListener('click', () => {
    const pct = calcGradePercent();
    if (pct === null) { showToast(t('alert_enter_marks')); return; }
    const validCount = gradeSubjects.filter(s => {
      const o = parseFloat(s.obtained), tt = parseFloat(s.total);
      return !isNaN(o) && !isNaN(tt) && tt > 0;
    }).length;
    const subjWord = validCount === 1 ? t('subject_word') : t('subjects_word');
    saveResult(`${t('percentage_word')} (${validCount} ${subjWord})`, `${pct.toFixed(2)}%`);
  });
}

const saveCgpaBtn = document.getElementById('saveCgpaBtn');
if (saveCgpaBtn) {
  saveCgpaBtn.addEventListener('click', () => {
    const gpa = calcCgpa();
    const subjectCount = cgpaTableEl.querySelectorAll('.cgpa-row').length;
    saveResult(`${t('cgpa_word')} (${subjectCount} ${t('subjects_word')})`, gpa.toFixed(2));
  });
}

/* ---- Semester-wise GPA history + running CGPA trend (persisted) ---- */
let gpaHistory = [];
try { gpaHistory = JSON.parse(localStorage.getItem('calvo_gpa_history') || '[]'); } catch (e) { gpaHistory = []; }

const gpaHistoryListEl = document.getElementById('gpaHistoryList');
const gpaTrendResultEl = document.getElementById('gpaTrendResult');
const saveSemesterHistoryBtn = document.getElementById('saveSemesterHistoryBtn');
const clearGpaHistoryBtn = document.getElementById('clearGpaHistoryBtn');

function persistGpaHistory() {
  try { localStorage.setItem('calvo_gpa_history', JSON.stringify(gpaHistory)); } catch (e) {}
}

/* Adds a semester, or updates it in place (matched by label, case-insensitive)
   so re-saving the same semester after editing grades refreshes its numbers
   instead of piling up duplicate entries. New semesters are appended, since
   this list represents a timeline (oldest first) that the trend is built on. */
function upsertGpaHistory(label, points, credits) {
  const gpa = credits > 0 ? points / credits : 0;
  const match = gpaHistory.find(r => r.label.trim().toLowerCase() === label.trim().toLowerCase());
  if (match) {
    match.points = points;
    match.credits = credits;
    match.gpa = gpa;
    match.time = Date.now();
  } else {
    gpaHistory.push({ id: Date.now() + Math.random(), label, points, credits, gpa, time: Date.now() });
  }
}

function saveSemesterHistory() {
  calcCgpa();
  const semKeys = Object.keys(lastSemesterTotals).filter(s => lastSemesterTotals[s].credits > 0);
  if (semKeys.length === 0) { showToast(t('alert_enter_cgpa_data')); return; }
  semKeys.forEach(s => {
    const input = cgpaTableEl.querySelector(`.cgpa-semester-label[data-semester="${s}"]`);
    const label = (input && input.value.trim()) || (t('semester_label') + ' ' + s);
    const { points, credits } = lastSemesterTotals[s];
    upsertGpaHistory(label, points, credits);
  });
  persistGpaHistory();
  renderGpaHistory();
  showToast(t('semester_saved_toast'));
}

function renderGpaHistory() {
  if (!gpaHistoryListEl) return;
  gpaHistoryListEl.innerHTML = '';
  if (gpaHistory.length === 0) {
    gpaHistoryListEl.innerHTML = `<div class="formula-empty">${t('no_gpa_history')}</div>`;
    if (gpaTrendResultEl) gpaTrendResultEl.style.display = 'none';
    return;
  }
  let cumPoints = 0, cumCredits = 0;
  gpaHistory.forEach((rec, idx) => {
    const prevCgpa = cumCredits > 0 ? cumPoints / cumCredits : null;
    cumPoints += rec.points;
    cumCredits += rec.credits;
    const runningCgpa = cumCredits > 0 ? cumPoints / cumCredits : 0;
    let trend = '';
    if (prevCgpa !== null) {
      if (runningCgpa > prevCgpa + 0.005) trend = '<span class="gpa-trend gpa-trend-up" title="CGPA rose">&#9650;</span>';
      else if (runningCgpa < prevCgpa - 0.005) trend = '<span class="gpa-trend gpa-trend-down" title="CGPA fell">&#9660;</span>';
      else trend = '<span class="gpa-trend gpa-trend-flat" title="CGPA unchanged">&#9679;</span>';
    }
    const div = document.createElement('div');
    div.className = 'saved-item';
    div.innerHTML = `<span>${rec.label}</span><span style="display:flex;align-items:center;gap:8px;">${trend}<b style="color:var(--accent);">${rec.gpa.toFixed(2)}</b><button class="icon-action-btn gpa-share-btn" title="${t('share_title')}">&#128228;</button><button class="saved-del" title="${t('delete_title')}">&#10005;</button></span>`;
    div.querySelector('.gpa-share-btn').addEventListener('click', () => {
      shareOrCopyText(`${rec.label}: GPA ${rec.gpa.toFixed(2)}`);
    });
    div.querySelector('.saved-del').addEventListener('click', () => {
      gpaHistory.splice(idx, 1);
      persistGpaHistory();
      renderGpaHistory();
    });
    gpaHistoryListEl.appendChild(div);
  });
  const overall = cumCredits > 0 ? cumPoints / cumCredits : 0;
  if (gpaTrendResultEl) {
    gpaTrendResultEl.style.display = 'block';
    gpaTrendResultEl.innerHTML = `${t('overall_cgpa_trend_prefix')} <b>${overall.toFixed(2)}</b>`;
  }
}

if (saveSemesterHistoryBtn) saveSemesterHistoryBtn.addEventListener('click', saveSemesterHistory);
if (clearGpaHistoryBtn) {
  armConfirmButton(clearGpaHistoryBtn, 'ai_tap_again_confirm', () => {
    gpaHistory = [];
    persistGpaHistory();
    renderGpaHistory();
  });
}
renderGpaHistory();

const clearSavedBtn = document.getElementById('clearSavedBtn');
if (clearSavedBtn) {
  armConfirmButton(clearSavedBtn, 'ai_tap_again_confirm', () => {
    savedResults = [];
    persistSavedResults();
    renderSavedResults();
  });
}

renderSavedResults();

/* ---------- LANGUAGE CHANGE RE-RENDER ---------- */
function onLanguageChange() {
  // Percent/GPA mode pills (labels are translated)
  if (percentModePills) buildPercentPills();

  // Grade (percentage) subject rows — rebuilt from state, values preserved
  renderGradeSubjects();

  // CGPA table — update placeholders/titles/labels in place, values preserved
  if (cgpaTableEl) {
    cgpaTableEl.querySelectorAll('.cgpa-subject').forEach(inp => { inp.placeholder = t('subject_name_placeholder'); });
    cgpaTableEl.querySelectorAll('.cgpa-credit').forEach(inp => { inp.placeholder = t('credit_hrs_placeholder'); });
    cgpaTableEl.querySelectorAll('.cgpa-del').forEach(btn => { btn.title = t('remove_title'); });
    // Only refresh the placeholder, never the value — the value may be a
    // custom semester name the user typed (e.g. "Fall 2025") and must survive
    // a language switch untouched.
    cgpaTableEl.querySelectorAll('.cgpa-semester-label').forEach(input => {
      input.placeholder = t('semester_label') + ' ' + input.dataset.semester;
    });
    calcCgpa();
  }

  // History, saved results, formulas — refresh empty-state / dynamic text
  renderCalcHistory();
  renderSavedResults();
  renderGpaHistory();
  if (typeof buildSubjectPills === 'function') buildSubjectPills();
  if (typeof renderFormulas === 'function') renderFormulas();

  // Disarm any "tap again to confirm" clear buttons that were mid-arm when
  // the language changed, so their label doesn't get stuck on the old text.
  [clearHistoryBtn, clearGpaHistoryBtn, clearSavedBtn].forEach(btn => {
    if (btn && typeof btn._disarmConfirm === 'function') btn._disarmConfirm();
  });

  // Quiz tab — refresh subject pills / labels for the new language
  if (typeof window.refreshQuizI18n === 'function') window.refreshQuizI18n();
}

/* ---------- INIT ---------- */
updateKeyLabels();
updateDisplay();
updateMemIndicator();

setTimeout(() => {
  document.querySelector('.lcd-bezel').classList.add('pulse');
  setTimeout(() => {
    document.querySelector('.lcd-bezel').classList.remove('pulse');
  }, 1500);
}, 300);
/* ============================================
   QUIZ MODE — auto-generated from formulaData
   ============================================ */
(function () {
  const quizSubjectPills = document.getElementById('quizSubjectPills');
  const quizLengthSelect = document.getElementById('quizLengthSelect');
  const quizStartBtn = document.getElementById('quizStartBtn');
  const quizSetupScreen = document.getElementById('quizSetupScreen');
  const quizPlayScreen = document.getElementById('quizPlayScreen');
  const quizResultScreen = document.getElementById('quizResultScreen');
  const quizEmptyNote = document.getElementById('quizEmptyNote');
  const quizProgressLabel = document.getElementById('quizProgressLabel');
  const quizScoreLabel = document.getElementById('quizScoreLabel');
  const quizProgressFill = document.getElementById('quizProgressFill');
  const quizQuestionCat = document.getElementById('quizQuestionCat');
  const quizQuestionText = document.getElementById('quizQuestionText');
  const quizOptionsList = document.getElementById('quizOptionsList');
  const quizNextBtn = document.getElementById('quizNextBtn');
  const quizQuitBtn = document.getElementById('quizQuitBtn');
  const quizRestartBtn = document.getElementById('quizRestartBtn');
  const quizResultScoreText = document.getElementById('quizResultScoreText');
  const quizResultMsg = document.getElementById('quizResultMsg');

  if (!quizSubjectPills || typeof formulaData === 'undefined') return;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  let quizSubject = 'All';
  let quizQuestions = [];
  let quizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function allFormulasFlat() {
    const out = [];
    Object.keys(formulaData).forEach(subj => {
      formulaData[subj].forEach(f => out.push(Object.assign({ subject: subj }, f)));
    });
    return out;
  }

  function pool() {
    return quizSubject === 'All'
      ? allFormulasFlat()
      : (formulaData[quizSubject] || []).map(f => Object.assign({ subject: quizSubject }, f));
  }

  function buildQuizSubjectPills() {
    let html = '<button class="subject-pill' + (quizSubject === 'All' ? ' active' : '') + '" data-quizsubj="All">' + t('quiz_all_subjects') + '</button>';
    Object.keys(formulaData).forEach(subj => {
      html += '<button class="subject-pill' + (quizSubject === subj ? ' active' : '') + '" data-quizsubj="' + escapeHtml(subj) + '">' + escapeHtml(subj) + '</button>';
    });
    quizSubjectPills.innerHTML = html;
    quizSubjectPills.querySelectorAll('.subject-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        quizSubject = btn.dataset.quizsubj;
        buildQuizSubjectPills();
        checkQuizPoolSize();
      });
    });
  }

  function checkQuizPoolSize() {
    const size = pool().length;
    const enough = size >= 4;
    quizStartBtn.disabled = !enough;
    quizStartBtn.style.opacity = enough ? '1' : '0.5';
    quizEmptyNote.style.display = enough ? 'none' : 'block';
  }

  function generateQuestions(n) {
    const p = pool();
    const chosen = shuffle(p).slice(0, Math.min(n, p.length));
    return chosen.map(correct => {
      const distractorPool = p.filter(f => f.expr !== correct.expr);
      const distractors = shuffle(distractorPool).slice(0, 3);
      const options = shuffle([correct, ...distractors]);
      return { cat: correct.cat, name: correct.name, correctExpr: correct.expr, options: options.map(o => o.expr) };
    });
  }

  function startQuiz() {
    const n = parseInt(quizLengthSelect.value, 10) || 10;
    quizQuestions = generateQuestions(n);
    if (quizQuestions.length < 4) return;
    quizIndex = 0;
    quizScore = 0;
    quizSetupScreen.style.display = 'none';
    quizResultScreen.style.display = 'none';
    quizPlayScreen.style.display = 'block';
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    quizAnswered = false;
    const q = quizQuestions[quizIndex];
    quizProgressLabel.textContent = t('quiz_question_progress')
      .replace('{n}', quizIndex + 1).replace('{total}', quizQuestions.length);
    quizScoreLabel.textContent = t('quiz_score_label') + ' ' + quizScore;
    quizProgressFill.style.width = ((quizIndex) / quizQuestions.length * 100) + '%';
    quizQuestionCat.textContent = q.cat;
    quizQuestionText.textContent = q.name;
    quizOptionsList.innerHTML = '';
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectQuizAnswer(btn, opt, q.correctExpr));
      quizOptionsList.appendChild(btn);
    });
    quizNextBtn.style.display = 'none';
  }

  function selectQuizAnswer(btn, chosen, correct) {
    if (quizAnswered) return;
    quizAnswered = true;
    const isCorrect = chosen === correct;
    if (isCorrect) quizScore++;
    quizOptionsList.querySelectorAll('.quiz-option-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add('correct');
      else if (b === btn && !isCorrect) b.classList.add('wrong');
    });
    quizScoreLabel.textContent = t('quiz_score_label') + ' ' + quizScore;
    quizNextBtn.style.display = 'block';
    quizNextBtn.textContent = (quizIndex === quizQuestions.length - 1) ? t('quiz_finish') : t('quiz_next');
  }

  function nextQuizQuestion() {
    quizIndex++;
    if (quizIndex >= quizQuestions.length) {
      finishQuiz();
    } else {
      renderQuizQuestion();
    }
  }

  function finishQuiz() {
    quizPlayScreen.style.display = 'none';
    quizResultScreen.style.display = 'block';
    quizResultScoreText.textContent = quizScore + ' / ' + quizQuestions.length;
    const pct = Math.round((quizScore / quizQuestions.length) * 100);
    let msgKey = 'quiz_msg_good';
    if (pct === 100) msgKey = 'quiz_msg_perfect';
    else if (pct < 50) msgKey = 'quiz_msg_practice';
    quizResultMsg.textContent = t(msgKey);
  }

  function quitQuiz() {
    quizPlayScreen.style.display = 'none';
    quizResultScreen.style.display = 'none';
    quizSetupScreen.style.display = 'block';
  }

  quizStartBtn.addEventListener('click', startQuiz);
  quizNextBtn.addEventListener('click', nextQuizQuestion);
  quizQuitBtn.addEventListener('click', quitQuiz);
  quizRestartBtn.addEventListener('click', () => {
    quizResultScreen.style.display = 'none';
    quizSetupScreen.style.display = 'block';
  });

  buildQuizSubjectPills();
  checkQuizPoolSize();

  window.refreshQuizI18n = function () {
    buildQuizSubjectPills();
    checkQuizPoolSize();
    if (quizPlayScreen.style.display === 'block' && quizQuestions.length) renderQuizQuestion();
  };
})();

/* ============================================
   GRAPHING TOOL + UNIT CIRCLE
   ============================================ */
(function () {
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const fnInput = document.getElementById('graphFnInput');
  const xMinInput = document.getElementById('graphXMin');
  const xMaxInput = document.getElementById('graphXMax');
  const graphError = document.getElementById('graphError');
  const quickBtns = document.getElementById('graphQuickBtns');
  const fnPanel = document.getElementById('graphFunctionPanel');
  const circlePanel = document.getElementById('graphUnitCirclePanel');
  const modeFnBtn = document.getElementById('graphModeFnBtn');
  const modeCircleBtn = document.getElementById('graphModeCircleBtn');
  const angleSlider = document.getElementById('graphAngleSlider');
  const angleDeg = document.getElementById('graphAngleDeg');
  const angleValues = document.getElementById('graphAngleValues');

  let graphMode = 'function';

  // Whitelist-validate the expression before ever handing it to Function(),
  // so only numbers, x, basic operators, parens, commas, dots and known
  // function names can appear — nothing else is allowed through.
  const ALLOWED_FN_NAMES = ['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sqrt', 'abs', 'log', 'ln', 'exp', 'pow', 'min', 'max'];
  function compileFn(exprRaw) {
    let expr = exprRaw.trim();
    if (!expr) return null;
    // implicit multiplication: 2x -> 2*x, )x -> )*x, 2( -> 2*(
    expr = expr.replace(/(\d)(x)/gi, '$1*$2');
    expr = expr.replace(/\)(\s*)(x|\()/gi, ')*$2');
    expr = expr.replace(/(\d)(\()/g, '$1*$2');
    expr = expr.replace(/\^/g, '**');
    expr = expr.replace(/\bln\(/g, 'log(');

    const safety = expr
      .replace(/\b(sin|cos|tan|asin|acos|atan|sqrt|abs|log|exp|pow|min|max|pi|PI)\b/g, '')
      .replace(/[x\d\s+\-*/().,]/g, '');
    if (safety.length > 0) return null;

    const funcBody = expr
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\basin\(/g, 'Math.asin(')
      .replace(/\bacos\(/g, 'Math.acos(')
      .replace(/\batan\(/g, 'Math.atan(')
      .replace(/\bsqrt\(/g, 'Math.sqrt(')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\blog\(/g, 'Math.log(')
      .replace(/\bexp\(/g, 'Math.exp(')
      .replace(/\bpow\(/g, 'Math.pow(')
      .replace(/\bmin\(/g, 'Math.min(')
      .replace(/\bmax\(/g, 'Math.max(')
      .replace(/\bpi\b/gi, 'Math.PI');

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('x', 'return (' + funcBody + ');');
      fn(1); // sanity call
      return fn;
    } catch (e) {
      return null;
    }
  }

  function drawAxes(w, h, xmin, xmax, ymin, ymax) {
    ctx.clearRect(0, 0, w, h);
    const styles = getComputedStyle(document.documentElement);
    const gridColor = 'rgba(255,255,255,0.08)';
    const axisColor = 'rgba(255,255,255,0.35)';
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    const toPx = (x, y) => [
      (x - xmin) / (xmax - xmin) * w,
      h - (y - ymin) / (ymax - ymin) * h,
    ];

    // grid lines
    const xStep = niceStep(xmax - xmin);
    const yStep = niceStep(ymax - ymin);
    for (let gx = Math.ceil(xmin / xStep) * xStep; gx <= xmax; gx += xStep) {
      const [px] = toPx(gx, 0);
      ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
    }
    for (let gy = Math.ceil(ymin / yStep) * yStep; gy <= ymax; gy += yStep) {
      const [, py] = toPx(0, gy);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
    }

    // axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1.5;
    if (xmin <= 0 && xmax >= 0) {
      const [px0] = toPx(0, 0);
      ctx.beginPath(); ctx.moveTo(px0, 0); ctx.lineTo(px0, h); ctx.stroke();
    }
    if (ymin <= 0 && ymax >= 0) {
      const [, py0] = toPx(0, 0);
      ctx.beginPath(); ctx.moveTo(0, py0); ctx.lineTo(w, py0); ctx.stroke();
    }
    return toPx;
  }

  function niceStep(range) {
    const rough = range / 10;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const norm = rough / mag;
    let step;
    if (norm < 1.5) step = 1;
    else if (norm < 3.5) step = 2;
    else if (norm < 7.5) step = 5;
    else step = 10;
    return step * mag;
  }

  function plotFunction() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const xmin = parseFloat(xMinInput.value);
    const xmax = parseFloat(xMaxInput.value);
    graphError.textContent = '';

    if (!isFinite(xmin) || !isFinite(xmax) || xmin >= xmax) {
      graphError.textContent = t('graph_error_range');
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const fn = compileFn(fnInput.value);
    if (!fn) {
      graphError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }

    // Sample to find a sensible y-range
    const samples = 400;
    let ymin = Infinity, ymax = -Infinity;
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const x = xmin + (xmax - xmin) * i / samples;
      let y;
      try { y = fn(x); } catch (e) { y = NaN; }
      pts.push([x, y]);
      if (isFinite(y)) {
        if (y < ymin) ymin = y;
        if (y > ymax) ymax = y;
      }
    }
    if (!isFinite(ymin) || !isFinite(ymax)) {
      graphError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const pad = (ymax - ymin) * 0.1;
    ymin -= pad; ymax += pad;
    // clamp extreme spikes (e.g. tan(x), 1/x asymptotes)
    const yspan = ymax - ymin;
    const cap = Math.min(yspan, (xmax - xmin) * 4);
    if (yspan > cap) {
      const mid = (ymax + ymin) / 2;
      ymin = mid - cap / 2; ymax = mid + cap / 2;
    }

    const toPx = drawAxes(w, h, xmin, xmax, ymin, ymax);

    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    let prevY = null;
    pts.forEach(([x, y]) => {
      const [px, py] = toPx(x, y);
      const outOfRange = !isFinite(y) || y < ymin - yspan || y > ymax + yspan;
      const bigJump = prevY !== null && Math.abs(y - prevY) > yspan * 0.6;
      if (outOfRange || bigJump) {
        started = false;
      } else {
        if (!started) { ctx.moveTo(px, py); started = true; }
        else ctx.lineTo(px, py);
      }
      prevY = isFinite(y) ? y : null;
    });
    ctx.stroke();
  }

  function drawUnitCircle(angleDegVal) {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w, h) * 0.38;
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';

    // axes
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();

    // circle
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();

    const rad = angleDegVal * Math.PI / 180;
    const px = cx + r * Math.cos(rad);
    const py = cy - r * Math.sin(rad);

    // radius line
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();

    // cos projection (x-axis, green)
    ctx.strokeStyle = '#3fbf6f';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, cy); ctx.stroke();

    // sin projection (y-axis, blue)
    ctx.strokeStyle = '#5a9ad8';
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(cx, py); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, py); ctx.stroke();
    ctx.setLineDash([]);

    // point
    ctx.fillStyle = accent;
    ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();

    const sinV = Math.sin(rad), cosV = Math.cos(rad);
    angleDeg.textContent = angleDegVal + '°';
    angleValues.textContent = 'sin=' + sinV.toFixed(3) + '  cos=' + cosV.toFixed(3) + '  tan=' + (Math.abs(cosV) < 1e-6 ? '∞' : (sinV / cosV).toFixed(3));
  }

  function redraw() {
    // resize canvas to actual displayed size for crispness
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const w = rect.width || 600, h = rect.height || 380;
    if (graphMode === 'function') {
      plotFunctionSized(w, h);
    } else {
      drawUnitCircleSized(w, h, parseFloat(angleSlider.value));
    }
  }

  // re-bind sized versions so canvas.width/height (CSS px via transform) match
  function plotFunctionSized(w, h) { canvas.__w = w; canvas.__h = h; plotFunction(); }
  function drawUnitCircleSized(w, h, a) { canvas.__w = w; canvas.__h = h; drawUnitCircle(a); }

  function setGraphMode(mode) {
    graphMode = mode;
    modeFnBtn.classList.toggle('active', mode === 'function');
    modeCircleBtn.classList.toggle('active', mode === 'unitcircle');
    fnPanel.style.display = mode === 'function' ? 'block' : 'none';
    circlePanel.style.display = mode === 'unitcircle' ? 'block' : 'none';
    redraw();
  }

  modeFnBtn.addEventListener('click', () => setGraphMode('function'));
  modeCircleBtn.addEventListener('click', () => setGraphMode('unitcircle'));

  let debounceTimer;
  function debounceRedraw() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(redraw, 150);
  }
  fnInput.addEventListener('input', debounceRedraw);
  xMinInput.addEventListener('input', debounceRedraw);
  xMaxInput.addEventListener('input', debounceRedraw);
  quickBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fn]');
    if (!btn) return;
    fnInput.value = btn.dataset.fn;
    redraw();
  });
  angleSlider.addEventListener('input', () => {
    drawUnitCircle(parseFloat(angleSlider.value));
  });

  window.addEventListener('resize', debounceRedraw);
  document.querySelectorAll('.topbar-tab[data-tab="graph"]').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => setTimeout(redraw, 60));
  });

  // initial draw once layout settles
  setTimeout(redraw, 200);
})();

/* ============================================
   EQUATION SOLVER — offline, step-by-step
   ============================================ */
(function () {
  const eqModeLinearBtn = document.getElementById('eqModeLinearBtn');
  const eqModeQuadBtn = document.getElementById('eqModeQuadBtn');
  const eqCGroup = document.getElementById('eqCGroup');
  const eqA = document.getElementById('eqA');
  const eqB = document.getElementById('eqB');
  const eqC = document.getElementById('eqC');
  const eqSolveBtn = document.getElementById('eqSolveBtn');
  const eqStepsBox = document.getElementById('eqStepsBox');
  if (!eqSolveBtn) return;

  let eqMode = 'linear';

  function fmt(n) {
    if (!isFinite(n)) return '—';
    const r = Math.round(n * 1e6) / 1e6;
    return Number.isInteger(r) ? String(r) : String(r);
  }

  function stepHtml(label, content, isFinal) {
    return '<div class="eq-step' + (isFinal ? ' eq-final' : '') + '">'
      + '<span class="eq-step-label">' + label + '</span>' + content + '</div>';
  }

  function setEqMode(mode) {
    eqMode = mode;
    eqModeLinearBtn.classList.toggle('active', mode === 'linear');
    eqModeQuadBtn.classList.toggle('active', mode === 'quadratic');
    eqCGroup.style.display = 'flex';
    eqStepsBox.innerHTML = '';
  }

  function solveLinear() {
    const a = parseFloat(eqA.value), b = parseFloat(eqB.value), c = parseFloat(eqC.value);
    if (!isFinite(a) || !isFinite(b) || !isFinite(c)) {
      eqStepsBox.innerHTML = '<div class="eq-error">' + t('eq_error_input') + '</div>';
      return;
    }
    if (a === 0) {
      eqStepsBox.innerHTML = '<div class="eq-error">' + t('eq_error_a_zero') + '</div>';
      return;
    }
    let html = '';
    html += stepHtml(t('eq_step_original'), a + 'x + ' + b + ' = ' + c);
    html += stepHtml(t('eq_step_isolate'), a + 'x = ' + c + ' − (' + b + ') = ' + fmt(c - b));
    const x = (c - b) / a;
    html += stepHtml(t('eq_step_divide'), 'x = ' + fmt(c - b) + ' / ' + a);
    html += stepHtml(t('eq_step_answer'), 'x = ' + fmt(x), true);
    eqStepsBox.innerHTML = html;
  }

  function solveQuadratic() {
    const a = parseFloat(eqA.value), b = parseFloat(eqB.value), c = parseFloat(eqC.value);
    if (!isFinite(a) || !isFinite(b) || !isFinite(c)) {
      eqStepsBox.innerHTML = '<div class="eq-error">' + t('eq_error_input') + '</div>';
      return;
    }
    if (a === 0) {
      eqStepsBox.innerHTML = '<div class="eq-error">' + t('eq_error_a_zero') + '</div>';
      return;
    }
    let html = '';
    html += stepHtml(t('eq_step_original'), a + 'x² + ' + b + 'x + ' + c + ' = 0');
    const D = b * b - 4 * a * c;
    html += stepHtml(t('eq_step_discriminant'), 'D = b² − 4ac = (' + b + ')² − 4(' + a + ')(' + c + ') = ' + fmt(D));

    if (D > 0) {
      const sqrtD = Math.sqrt(D);
      const x1 = (-b + sqrtD) / (2 * a);
      const x2 = (-b - sqrtD) / (2 * a);
      html += stepHtml(t('eq_step_formula'), 'x = (−b ± √D) / 2a = (' + (-b) + ' ± √' + fmt(D) + ') / ' + (2 * a));
      html += stepHtml(t('eq_step_two_roots'), 'x₁ = ' + fmt(x1) + ',  x₂ = ' + fmt(x2), true);
    } else if (D === 0) {
      const x = -b / (2 * a);
      html += stepHtml(t('eq_step_formula'), 'x = −b / 2a = ' + (-b) + ' / ' + (2 * a));
      html += stepHtml(t('eq_step_one_root'), 'x = ' + fmt(x), true);
    } else {
      const real = (-b / (2 * a));
      const imag = Math.sqrt(-D) / (2 * a);
      html += stepHtml(t('eq_step_no_real'), t('eq_step_complex_roots'));
      html += stepHtml(t('eq_step_two_roots'), 'x₁ = ' + fmt(real) + ' + ' + fmt(imag) + 'i,  x₂ = ' + fmt(real) + ' − ' + fmt(imag) + 'i', true);
    }
    eqStepsBox.innerHTML = html;
  }

  eqModeLinearBtn.addEventListener('click', () => setEqMode('linear'));
  eqModeQuadBtn.addEventListener('click', () => setEqMode('quadratic'));
  eqSolveBtn.addEventListener('click', () => {
    if (eqMode === 'linear') solveLinear();
    else solveQuadratic();
  });
})();

/* ============================================
   MATRIX CALCULATOR
   ============================================ */
(function () {
  const gridA = document.getElementById('matrixGridA');
  const gridB = document.getElementById('matrixGridB');
  const bBlock = document.getElementById('matrixBBlock');
  const size2Btn = document.getElementById('matrixSize2Btn');
  const size3Btn = document.getElementById('matrixSize3Btn');
  const opPills = document.getElementById('matrixOpPills');
  const calcBtn = document.getElementById('matrixCalcBtn');
  const resultBox = document.getElementById('matrixResultBox');
  if (!gridA) return;

  let mSize = 2;
  let mOp = 'add';

  function buildGrid(container, size, seed) {
    container.dataset.size = size;
    container.style.gridTemplateColumns = 'repeat(' + size + ', 52px)';
    let html = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const val = seed ? seed[r][c] : (r === c ? 1 : 0);
        html += '<input type="number" data-r="' + r + '" data-c="' + c + '" value="' + val + '">';
      }
    }
    container.innerHTML = html;
  }

  function readMatrix(container, size) {
    const m = [];
    for (let r = 0; r < size; r++) {
      m.push([]);
      for (let c = 0; c < size; c++) {
        const inp = container.querySelector('input[data-r="' + r + '"][data-c="' + c + '"]');
        m[r].push(parseFloat(inp.value) || 0);
      }
    }
    return m;
  }

  function setSize(size) {
    mSize = size;
    size2Btn.classList.toggle('active', size === 2);
    size3Btn.classList.toggle('active', size === 3);
    buildGrid(gridA, size);
    buildGrid(gridB, size);
    resultBox.innerHTML = '';
  }

  function setOp(op) {
    mOp = op;
    opPills.querySelectorAll('.subject-pill').forEach(p => p.classList.toggle('active', p.dataset.mop === op));
    bBlock.style.display = (op === 'det' || op === 'inv') ? 'none' : 'block';
    resultBox.innerHTML = '';
  }

  function matAdd(A, B, sign) {
    return A.map((row, r) => row.map((v, c) => v + sign * B[r][c]));
  }
  function matMul(A, B, n) {
    const R = [];
    for (let r = 0; r < n; r++) {
      R.push([]);
      for (let c = 0; c < n; c++) {
        let sum = 0;
        for (let k = 0; k < n; k++) sum += A[r][k] * B[k][c];
        R[r].push(sum);
      }
    }
    return R;
  }
  function det2(M) { return M[0][0] * M[1][1] - M[0][1] * M[1][0]; }
  function det3(M) {
    return (
      M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
      M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
      M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])
    );
  }
  function inv2(M) {
    const d = det2(M);
    if (d === 0) return null;
    return [
      [M[1][1] / d, -M[0][1] / d],
      [-M[1][0] / d, M[0][0] / d],
    ];
  }
  function inv3(M) {
    const d = det3(M);
    if (d === 0) return null;
    const cof = (r, c) => {
      const rows = [0, 1, 2].filter(x => x !== r);
      const cols = [0, 1, 2].filter(x => x !== c);
      const sub = [
        [M[rows[0]][cols[0]], M[rows[0]][cols[1]]],
        [M[rows[1]][cols[0]], M[rows[1]][cols[1]]],
      ];
      const sign = ((r + c) % 2 === 0) ? 1 : -1;
      return sign * det2(sub);
    };
    const adjT = [];
    for (let r = 0; r < 3; r++) {
      adjT.push([]);
      for (let c = 0; c < 3; c++) adjT[r].push(cof(c, r) / d); // transposed cofactor = adjugate
    }
    return adjT;
  }

  function fmtNum(n) {
    const r = Math.round(n * 1e6) / 1e6;
    return String(r);
  }

  function renderMatrixResult(M) {
    let html = '<div class="matrix-result-grid" style="grid-template-columns:repeat(' + M[0].length + ', 60px);">';
    M.forEach(row => row.forEach(v => { html += '<div class="matrix-result-cell">' + fmtNum(v) + '</div>'; }));
    html += '</div>';
    resultBox.innerHTML = html;
  }

  function calculate() {
    const A = readMatrix(gridA, mSize);
    const B = readMatrix(gridB, mSize);
    if (mOp === 'add') { renderMatrixResult(matAdd(A, B, 1)); return; }
    if (mOp === 'sub') { renderMatrixResult(matAdd(A, B, -1)); return; }
    if (mOp === 'mul') { renderMatrixResult(matMul(A, B, mSize)); return; }
    if (mOp === 'det') {
      const d = mSize === 2 ? det2(A) : det3(A);
      resultBox.innerHTML = '<div class="matrix-result-scalar">det(A) = ' + fmtNum(d) + '</div>';
      return;
    }
    if (mOp === 'inv') {
      const inv = mSize === 2 ? inv2(A) : inv3(A);
      if (!inv) {
        resultBox.innerHTML = '<div class="eq-error">' + t('matrix_error_singular') + '</div>';
        return;
      }
      renderMatrixResult(inv);
    }
  }

  size2Btn.addEventListener('click', () => setSize(2));
  size3Btn.addEventListener('click', () => setSize(3));
  opPills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-mop]');
    if (btn) setOp(btn.dataset.mop);
  });
  calcBtn.addEventListener('click', calculate);

  setSize(2);
  setOp('add');
})();

/* ============================================
   PROGRAMMER MODE — base conversion + bitwise
   ============================================ */
(function () {
  const decInput = document.getElementById('progDecInput');
  const binInput = document.getElementById('progBinInput');
  const octInput = document.getElementById('progOctInput');
  const hexInput = document.getElementById('progHexInput');
  const errBox = document.getElementById('progError');
  const opA = document.getElementById('progOpA');
  const opB = document.getElementById('progOpB');
  const opPills = document.getElementById('progOpPills');
  const bitwiseResult = document.getElementById('progBitwiseResult');
  if (!decInput) return;

  let progOp = 'AND';

  function syncFrom(base) {
    errBox.textContent = '';
    let n;
    try {
      if (base === 'dec') n = parseInt(decInput.value.trim(), 10);
      else if (base === 'bin') n = parseInt(binInput.value.trim() || '0', 2);
      else if (base === 'oct') n = parseInt(octInput.value.trim() || '0', 8);
      else if (base === 'hex') n = parseInt(hexInput.value.trim() || '0', 16);
    } catch (e) { n = NaN; }

    if (!Number.isFinite(n) || Number.isNaN(n)) {
      errBox.textContent = t('prog_error_invalid');
      return;
    }
    const neg = n < 0;
    const abs = Math.abs(n);
    if (base !== 'dec') decInput.value = n;
    if (base !== 'bin') binInput.value = (neg ? '-' : '') + abs.toString(2);
    if (base !== 'oct') octInput.value = (neg ? '-' : '') + abs.toString(8);
    if (base !== 'hex') hexInput.value = (neg ? '-' : '') + abs.toString(16).toUpperCase();
  }

  decInput.addEventListener('input', () => syncFrom('dec'));
  binInput.addEventListener('input', () => syncFrom('bin'));
  octInput.addEventListener('input', () => syncFrom('oct'));
  hexInput.addEventListener('input', () => syncFrom('hex'));

  function computeBitwise() {
    const a = parseInt(opA.value, 10) || 0;
    const b = parseInt(opB.value, 10) || 0;
    let result, label;
    switch (progOp) {
      case 'AND': result = a & b; label = 'A AND B'; break;
      case 'OR': result = a | b; label = 'A OR B'; break;
      case 'XOR': result = a ^ b; label = 'A XOR B'; break;
      case 'NOT': result = ~a; label = 'NOT A'; break;
      case 'SHL': result = a << b; label = 'A << B'; break;
      case 'SHR': result = a >> b; label = 'A >> B'; break;
      default: result = 0; label = '';
    }
    bitwiseResult.innerHTML = label + ' = ' + result
      + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + (result < 0 ? '-' + Math.abs(result).toString(2) : result.toString(2)) + '</span>';
  }

  opPills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bop]');
    if (!btn) return;
    progOp = btn.dataset.bop;
    opPills.querySelectorAll('.subject-pill').forEach(p => p.classList.toggle('active', p === btn));
    computeBitwise();
  });
  [opA, opB].forEach(inp => inp.addEventListener('input', computeBitwise));

  computeBitwise();
})();

/* ============================================
   STATISTICS MODE
   ============================================ */
(function () {
  const dataInput = document.getElementById('statsDataInput');
  const calcBtn = document.getElementById('statsCalcBtn');
  const errBox = document.getElementById('statsError');
  const resultGrid = document.getElementById('statsResultGrid');
  if (!calcBtn) return;

  function statCell(label, value) {
    return '<div class="stats-result-cell"><div class="stats-label">' + label + '</div><div class="stats-value">' + value + '</div></div>';
  }

  function computeStats() {
    errBox.textContent = '';
    resultGrid.innerHTML = '';
    const raw = dataInput.value.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    const nums = raw.map(Number);
    if (nums.length === 0 || nums.some(n => !isFinite(n))) {
      errBox.textContent = t('stats_error_invalid');
      return;
    }
    const n = nums.length;
    const sum = nums.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const sorted = nums.slice().sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[(n - 1) / 2];

    const freq = {};
    nums.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
    let maxFreq = 0;
    Object.values(freq).forEach(f => { if (f > maxFreq) maxFreq = f; });
    let modeVals = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
    const modeStr = maxFreq === 1 ? t('stats_no_mode') : modeVals.join(', ');

    const min = sorted[0], max = sorted[n - 1];
    const range = max - min;
    const variancePop = nums.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / n;
    const varianceSample = n > 1 ? nums.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / (n - 1) : 0;
    const stdPop = Math.sqrt(variancePop);
    const stdSample = Math.sqrt(varianceSample);

    const round = (x) => Math.round(x * 1e4) / 1e4;

    let html = '';
    html += statCell(t('stats_count'), n);
    html += statCell(t('stats_sum'), round(sum));
    html += statCell(t('stats_mean'), round(mean));
    html += statCell(t('stats_median'), round(median));
    html += statCell(t('stats_mode'), modeStr);
    html += statCell(t('stats_range'), round(range));
    html += statCell(t('stats_min'), min);
    html += statCell(t('stats_max'), max);
    html += statCell(t('stats_std_pop'), round(stdPop));
    html += statCell(t('stats_std_sample'), round(stdSample));
    resultGrid.innerHTML = html;
  }

  calcBtn.addEventListener('click', computeStats);
})();

/* ============================================
   TOPBAR TABS — horizontal scroll affordance
   (mouse wheel support + click arrows, since the
   tab strip now holds 12 tabs and doesn't all fit
   on smaller/laptop screens)
   ============================================ */
(function () {
  const wrap = document.getElementById('topbarTabs');
  const leftBtn = document.getElementById('topbarTabsLeft');
  const rightBtn = document.getElementById('topbarTabsRight');
  if (!wrap || !leftBtn || !rightBtn) return;

  function updateArrows() {
    const maxScroll = wrap.scrollWidth - wrap.clientWidth;
    const canScrollLeft = wrap.scrollLeft > 4;
    const canScrollRight = wrap.scrollLeft < maxScroll - 4;
    leftBtn.classList.toggle('visible', canScrollLeft);
    rightBtn.classList.toggle('visible', canScrollRight);
    wrap.classList.toggle('fade-left', canScrollLeft);
    wrap.classList.toggle('fade-right', canScrollRight);
  }

  // Let a normal vertical mouse-wheel/trackpad scroll move the tab strip
  // horizontally — this is the main desktop discoverability fix, since the
  // scrollbar itself is intentionally hidden for a cleaner look.
  wrap.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already horizontal, let it be
    if (wrap.scrollWidth <= wrap.clientWidth) return; // nothing to scroll
    e.preventDefault();
    wrap.scrollLeft += e.deltaY;
  }, { passive: false });

  leftBtn.addEventListener('click', () => wrap.scrollBy({ left: -160, behavior: 'smooth' }));
  rightBtn.addEventListener('click', () => wrap.scrollBy({ left: 160, behavior: 'smooth' }));

  wrap.addEventListener('scroll', updateArrows);
  window.addEventListener('resize', updateArrows);
  // Re-check after fonts/layout settle and whenever a tab is clicked
  // (switching tabs doesn't change scroll width, but harmless to re-check).
  setTimeout(updateArrows, 300);
  wrap.querySelectorAll('.topbar-tab').forEach(btn => btn.addEventListener('click', updateArrows));

  updateArrows();
})();
