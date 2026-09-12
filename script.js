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

/* ---- Direct "Share to WhatsApp" — a dedicated one-tap button (separate
   from the generic OS share-sheet button above) since WhatsApp is the
   primary group-study tool for our students and shouldn't be buried a
   tap deeper inside the native share sheet, and this also works on
   desktop browsers where navigator.share isn't available at all. ---- */
const CALVO_SHARE_URL = 'https://calvoscientificcalculator.online/';
const WHATSAPP_ICON_SVG = '<svg viewBox="0 0 32 32" width="15" height="15" fill="#25D366" aria-hidden="true"><path d="M16.001 3C9.373 3 4 8.373 4 15c0 2.646.86 5.098 2.317 7.087L5 29l7.127-2.272A11.94 11.94 0 0 0 16.001 27C22.628 27 28 21.627 28 15S22.628 3 16.001 3zm0 21.818c-1.94 0-3.79-.52-5.39-1.5l-.386-.23-4.232 1.35 1.372-4.127-.25-.4A9.79 9.79 0 0 1 5.818 15c0-5.615 4.568-10.182 10.183-10.182S26.183 9.385 26.183 15 21.616 24.818 16.001 24.818zm5.646-7.633c-.31-.155-1.83-.902-2.113-1.005-.283-.104-.489-.155-.695.155-.207.31-.797 1.005-.977 1.212-.18.207-.36.233-.67.078-.31-.155-1.31-.483-2.494-1.54-.922-.822-1.545-1.837-1.726-2.147-.18-.31-.02-.478.136-.633.14-.14.31-.36.464-.54.155-.18.207-.31.31-.517.104-.207.052-.388-.026-.543-.078-.155-.695-1.677-.953-2.297-.25-.6-.505-.52-.695-.53-.18-.008-.388-.01-.596-.01-.207 0-.543.078-.828.388-.283.31-1.084 1.06-1.084 2.582 0 1.522 1.11 2.994 1.265 3.2.155.207 2.183 3.33 5.29 4.672.74.32 1.317.512 1.767.655.742.236 1.418.203 1.952.123.596-.089 1.83-.748 2.088-1.47.258-.72.258-1.34.18-1.47-.078-.13-.283-.207-.594-.362z"/></svg>';
function shareToWhatsApp(text) {
  const full = `${text}\n\n_${t('shared_via_calvo')}_\n${CALVO_SHARE_URL}`;
  const url = 'https://wa.me/?text=' + encodeURIComponent(full);
  window.open(url, '_blank', 'noopener');
}
function whatsappBtnHtml(extraClass, extraAttrs) {
  return `<button class="icon-action-btn whatsapp-btn ${extraClass || ''}" ${extraAttrs || ''} title="${t('share_whatsapp_title')}">${WHATSAPP_ICON_SVG}</button>`;
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

/* ---------- SUBJECT TOOLS (Chemistry/Physics/Biology/Commerce/Math) ---------- */
(function () {
  const categoryGrid = document.getElementById('subjectToolsCategoryGrid');
  const categoryView = document.getElementById('subjectToolsCategoryView');
  const listView = document.getElementById('subjectToolsListView');
  const listTitle = document.getElementById('subjectToolsListTitle');
  const toolList = document.getElementById('subjectToolsList');
  const listBackBtn = document.getElementById('subjectToolsListBackBtn');
  const detailView = document.getElementById('subjectToolsDetailView');
  const detailTitle = document.getElementById('subjectToolsDetailTitle');
  const backBtn = document.getElementById('subjectToolsBackBtn');
  const body = document.getElementById('subjectToolsBody');
  const calcBtn = document.getElementById('subjectToolsCalcBtn');
  const resultBox = document.getElementById('subjectToolsResult');

  if (!categoryGrid || typeof window.CalvoSubjectTools === 'undefined') return;
  const TOOLS = window.CalvoSubjectTools.TOOLS;
  const CATEGORIES = Object.keys(TOOLS);

  const CATEGORY_ICONS = {
    Chemistry: '⚗', Physics: '⚛', Biology: '🧬', Commerce: '💰', Math: '∑'
  };

  let activeCat = CATEGORIES[0];
  let activeToolId = TOOLS[activeCat][0].id;

  function currentTool() {
    return TOOLS[activeCat].find(tl => tl.id === activeToolId);
  }

  function renderCategoryGrid() {
    categoryGrid.innerHTML = CATEGORIES.map(cat => {
      const icon = CATEGORY_ICONS[cat] || 'ƒ';
      const label = t('subjecttools_cat_' + cat.toLowerCase());
      return `<div class="subject-tile" data-cat="${cat}">
        <div class="subject-tile-icon">${icon}</div>
        <div class="subject-tile-name">${label}</div>
        <div class="subject-tile-count">${TOOLS[cat].length} tools</div>
      </div>`;
    }).join('');
    categoryGrid.querySelectorAll('.subject-tile').forEach(tile => {
      tile.addEventListener('click', () => openCategoryList(tile.dataset.cat));
    });
  }

  // STEP 1 -> STEP 2: clicking a subject opens the list of its tools,
  // one tool per line (name shown, nothing to fill in yet).
  function openCategoryList(cat) {
    activeCat = cat;
    listTitle.textContent = t('subjecttools_cat_' + cat.toLowerCase());
    categoryView.style.display = 'none';
    detailView.style.display = 'none';
    listView.style.display = '';
    renderToolList();
  }

  function renderToolList() {
    toolList.innerHTML = TOOLS[activeCat].map(tl =>
      `<div class="subject-tool-row" data-tool="${tl.id}">
        <span class="subject-tool-row-name">${t(tl.label)}</span>
        <span class="subject-tool-row-arrow">&rarr;</span>
      </div>`
    ).join('');
    toolList.querySelectorAll('.subject-tool-row').forEach(row => {
      row.addEventListener('click', () => openToolDetail(row.dataset.tool));
    });
  }

  if (listBackBtn) {
    listBackBtn.addEventListener('click', () => {
      listView.style.display = 'none';
      categoryView.style.display = '';
    });
  }

  // STEP 2 -> STEP 3: clicking one tool's line opens its own page,
  // where the input fields and Calculate button live.
  function openToolDetail(toolId) {
    activeToolId = toolId;
    detailTitle.textContent = t(currentTool().label);
    listView.style.display = 'none';
    detailView.style.display = '';
    renderToolBody();
  }

  if (backBtn) {
    backBtn.addEventListener('click', () => {
      detailView.style.display = 'none';
      listView.style.display = '';
    });
  }

  function renderToolBody() {
    resultBox.innerHTML = '';
    body.innerHTML = currentTool().render();
  }

  calcBtn.addEventListener('click', () => {
    currentTool().calc(resultBox);
  });

  renderCategoryGrid();

  window.refreshSubjectToolsI18n = function () {
    renderCategoryGrid();
    if (listView.style.display !== 'none') {
      listTitle.textContent = t('subjecttools_cat_' + activeCat.toLowerCase());
      renderToolList();
    }
    if (detailView.style.display !== 'none') {
      detailTitle.textContent = t(currentTool().label);
      renderToolBody();
    }
  };
})();

/* ---------- OFFLINE MODE INDICATOR ---------- */
(function () {
  const offlineBadge = document.getElementById('offlineBadge');
  if (!offlineBadge) return;

  function updateOnlineStatus() {
    offlineBadge.classList.toggle('visible', !navigator.onLine);
  }

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
})();

/* ---------- LIGHT / DARK MODE ---------- */
const menuColorMode = document.getElementById('menuColorMode');
const colorModeIcon = document.getElementById('colorModeIcon');
const colorModeLabel = document.getElementById('colorModeLabel');
const SUN_PATH = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
const MOON_PATH = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';

function applyColorMode(mode) {
  if (mode === 'light') {
    document.documentElement.setAttribute('data-mode', 'light');
    if (colorModeIcon) colorModeIcon.innerHTML = SUN_PATH;
    if (colorModeLabel) colorModeLabel.textContent = t('menu_dark_mode') || 'Dark Mode';
  } else {
    document.documentElement.removeAttribute('data-mode');
    if (colorModeIcon) colorModeIcon.innerHTML = MOON_PATH;
    if (colorModeLabel) colorModeLabel.textContent = t('menu_color_mode') || 'Light Mode';
  }
  try { localStorage.setItem('calvo_color_mode', mode); } catch (e) {}
}

if (menuColorMode) {
  menuColorMode.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-mode') === 'light';
    applyColorMode(isLight ? 'dark' : 'light');
    closeTopbarMenu();
  });
}

// On first load: use a saved choice if there is one, otherwise default
// to dark mode for every new visitor (regardless of device system theme).
try {
  const savedMode = localStorage.getItem('calvo_color_mode');
  if (savedMode === 'light' || savedMode === 'dark') {
    applyColorMode(savedMode);
  } else {
    applyColorMode('dark');
  }
} catch (e) {}

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
    if (typeof textSizePanel !== 'undefined' && textSizePanel) textSizePanel.classList.remove('open');
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

/* ---------- TEXT SIZE (accessibility) ----------
   Scales the reading text in Formulas/Quiz/AI Solver/History/etc via a
   CSS `zoom` custom property (see style.css) — the calculator tab is
   explicitly excluded there since its key sizes are tuned separately. */
const TEXT_SIZES = ['small', 'medium', 'large'];
const textSizePanel = document.getElementById('textSizePanel');
const menuTextSize = document.getElementById('menuTextSize');
const textSizeClose = document.getElementById('textSizeClose');
const textSizeOptions = document.getElementById('textSizeOptions');

function applyTextSize(size) {
  if (!TEXT_SIZES.includes(size)) size = 'medium';
  if (size === 'medium') {
    document.body.removeAttribute('data-textsize');
  } else {
    document.body.setAttribute('data-textsize', size);
  }
  if (textSizeOptions) {
    textSizeOptions.querySelectorAll('.text-size-option').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === size);
    });
  }
  try { localStorage.setItem('calvo_text_size', size); } catch (e) {}
}

if (textSizeOptions) {
  textSizeOptions.querySelectorAll('.text-size-option').forEach(btn => {
    btn.addEventListener('click', () => applyTextSize(btn.dataset.size));
  });
}

if (menuTextSize && textSizePanel) {
  menuTextSize.addEventListener('click', (e) => {
    e.stopPropagation();
    closeTopbarMenu();
    themePanel.classList.remove('open');
    textSizePanel.classList.toggle('open');
  });
}
if (textSizeClose) {
  textSizeClose.addEventListener('click', () => textSizePanel.classList.remove('open'));
}
document.addEventListener('click', (e) => {
  if (textSizePanel && !textSizePanel.contains(e.target) && e.target !== menuTextSize && !(menuTextSize && menuTextSize.contains(e.target))) {
    textSizePanel.classList.remove('open');
  }
});

try {
  applyTextSize(localStorage.getItem('calvo_text_size') || 'medium');
} catch (e) { applyTextSize('medium'); }

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
  fractionDisplayActive = false;
  lcdMain.textContent = expr === '' ? '0' : expr;
  fitText(lcdMain, 1.5, 0.72);
  fitText(lcdSub, 0.58, 0.42);
}

/* ============================================
   FRACTION MODE (S<=>D key)
   Converts the current displayed value to its
   nearest simple fraction using a continued-
   fraction expansion, and back again. This only
   changes what's SHOWN — the underlying value used
   for further calculation is untouched.
   ============================================ */
let fractionDisplayActive = false;

function decimalToFraction(x, maxDen, tolerance) {
  maxDen = maxDen || 1000000;
  tolerance = tolerance || 1e-9;
  if (!isFinite(x)) return null;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  if (x === 0) return { num: 0, den: 1 };
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = x;
  let num = 1, den = 1;
  for (let i = 0; i < 40; i++) {
    const a = Math.floor(b);
    const h = a * h1 + h2;
    const k = a * k1 + k2;
    h2 = h1; h1 = h;
    k2 = k1; k1 = k;
    if (k1 > maxDen) { num = h2; den = k2; break; }
    num = h1; den = k1;
    if (Math.abs(x - h1 / k1) < tolerance) break;
    const frac = b - a;
    if (frac < 1e-12) break;
    b = 1 / frac;
  }
  if (!den) return null;
  return { num: sign * num, den: den };
}

function formatAsFraction(value) {
  const f = decimalToFraction(value);
  if (!f) return null;
  if (f.den === 1) return String(f.num);
  const whole = Math.trunc(f.num / f.den);
  const remainder = Math.abs(f.num % f.den);
  if (whole !== 0 && remainder !== 0) return whole + ' ' + remainder + '/' + f.den;
  return f.num + '/' + f.den;
}

function toggleFractionView() {
  if (fractionDisplayActive) {
    fractionDisplayActive = false;
    updateDisplay();
    return;
  }
  let val = Number(expr);
  if (expr === '' || isNaN(val) || !isFinite(val)) {
    try { val = evaluate(expr); } catch (e) { val = NaN; }
  }
  if (isNaN(val) || !isFinite(val)) return;
  const fracStr = formatAsFraction(val);
  if (fracStr === null) return;
  fractionDisplayActive = true;
  lcdMain.textContent = fracStr;
  fitText(lcdMain, 1.5, 0.72);
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

/* ============================================
   CALCULATOR VOICE INPUT
   Speak a math expression instead of tapping keys,
   e.g. "23 plus 15 divided by 2 equals". Uses the
   same browser-native Web Speech API as the AI Solver's
   voice input — nothing is sent to any server.
   ============================================ */
(function () {
  const calcVoiceBtn = document.getElementById('calcVoiceBtn');
  if (!calcVoiceBtn) return;

  const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechCtor) {
    calcVoiceBtn.style.display = 'none';
    return;
  }

  let recognition = null;
  let listening = false;

  function wordsToExpr(raw) {
    let s = ' ' + raw.toLowerCase().trim() + ' ';
    s = s
      .replace(/\bplus\b/g, ' + ')
      .replace(/\b(minus)\b/g, ' - ')
      .replace(/\b(multiplied by|multiply by|multiply|times|into)\b/g, ' * ')
      .replace(/\b(divided by|divide by|divide|over)\b/g, ' / ')
      .replace(/\b(open bracket|open parenthesis|left bracket|left parenthesis)\b/g, ' ( ')
      .replace(/\b(close bracket|close parenthesis|right bracket|right parenthesis)\b/g, ' ) ')
      .replace(/\bpoint\b/g, '.')
      .replace(/\bpercent\b/g, '%')
      .replace(/\bsquare root of\b/g, '√(')
      .replace(/\bsquared\b/g, '^2')
      .replace(/\bcubed\b/g, '^3')
      .replace(/\bpi\b/g, 'π')
      .replace(/\b(equals to|equals|equal to|is equal to)\b/g, ' = ');
    // Keep digits, decimal points, and the math symbols we just inserted;
    // drop anything else the speech engine misheard as a stray word.
    s = s.replace(/[^0-9+\-*/.()%√π^= ]/g, ' ');
    s = s.replace(/\s+/g, '');
    return s;
  }

  function setListening(on) {
    listening = on;
    calcVoiceBtn.classList.toggle('listening', on);
  }

  function startCalcVoice() {
    recognition = new SpeechCtor();
    const lang = (typeof currentLang !== 'undefined' && currentLang && typeof LOCALE_MAP !== 'undefined')
      ? (LOCALE_MAP[currentLang] || 'en-US') : 'en-US';
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const parsed = wordsToExpr(transcript);
      if (!parsed) {
        if (typeof showToast === 'function') showToast(t('calc_voice_not_understood') || "Didn't catch a math expression");
        return;
      }
      const hasEquals = parsed.includes('=');
      const cleanExpr = parsed.replace(/=/g, '');
      addToExpr(cleanExpr);
      if (hasEquals) calculate();
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      const msg = (event.error === 'not-allowed' || event.error === 'service-not-allowed')
        ? (t('ai_voice_mic_denied') || 'Microphone access denied')
        : (t('ai_voice_error') || 'Voice input error');
      if (typeof showToast === 'function') showToast(msg);
    };

    recognition.onend = () => { setListening(false); recognition = null; };

    try { recognition.start(); } catch (e) { setListening(false); }
  }

  function stopCalcVoice() {
    if (recognition) { try { recognition.stop(); } catch (e) {} }
  }

  calcVoiceBtn.addEventListener('click', () => {
    if (listening) stopCalcVoice();
    else startCalcVoice();
  });
})();

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
  'keyEng': () => {}, 'keySd': () => toggleFractionView(), 'keyCalc': () => {},
  'keyIntegral': () => { addToExpr('\u222B'); }, 'keySquare': () => {},
  'keyAsin': () => addToExpr('asin('), 'keyAcos': () => addToExpr('acos('),
  // Basic (mobile-style) keypad — reuses the same underlying functions
  'keyBasicAc': () => clearAll(), 'keyBasicDel': () => clearEntry(),
  'keyBasicPercent': () => addToExpr('%'), 'keyBasicDiv': () => addToExpr('/'),
  'keyBasic7': () => addToExpr('7'), 'keyBasic8': () => addToExpr('8'), 'keyBasic9': () => addToExpr('9'),
  'keyBasicMul': () => addToExpr('*'),
  'keyBasic4': () => addToExpr('4'), 'keyBasic5': () => addToExpr('5'), 'keyBasic6': () => addToExpr('6'),
  'keyBasicSub': () => addToExpr('-'),
  'keyBasic1': () => addToExpr('1'), 'keyBasic2': () => addToExpr('2'), 'keyBasic3': () => addToExpr('3'),
  'keyBasicAdd': () => addToExpr('+'),
  'keyBasicNeg': () => addToExpr('(-'), 'keyBasic0': () => addToExpr('0'), 'keyBasicDot': () => addToExpr('.'),
  'keyBasicEq': () => { setShift(false); setAlpha(false); setHyp(false); calculate(); },
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

/* ---------- BASIC / SCIENTIFIC CALCULATOR VIEW TOGGLE ---------- */
(function () {
  const caseEl = document.querySelector('.calculator-case');
  const basicBtn = document.getElementById('calcViewBasicBtn');
  const sciBtn = document.getElementById('calcViewSciBtn');
  const brandTag = document.getElementById('calcBrandTag');
  const modelBadge = document.getElementById('calcModelBadge');
  const modelTag = document.getElementById('calcModelTag');
  const keypadSci = document.getElementById('keypad');
  const keypadBasic = document.getElementById('keypadBasic');
  if (!caseEl || !basicBtn || !sciBtn || !keypadSci || !keypadBasic) return;

  function applyCalcView(view) {
    const isBasic = view === 'basic';
    caseEl.classList.toggle('basic-view', isBasic);
    basicBtn.classList.toggle('active', isBasic);
    sciBtn.classList.toggle('active', !isBasic);
    keypadSci.style.display = isBasic ? 'none' : 'grid';
    keypadBasic.style.display = isBasic ? 'grid' : 'none';
    if (brandTag) brandTag.textContent = isBasic ? 'Basic Calculator' : 'Scientific Calculator';
    if (modelBadge) modelBadge.textContent = isBasic ? 'B-100' : 'SC-991';
    if (modelTag) modelTag.textContent = isBasic ? 'Simple Mode' : 'Dual Power';
    try { localStorage.setItem('calvo_calc_view', view); } catch (e) {}
  }

  basicBtn.addEventListener('click', () => applyCalcView('basic'));
  sciBtn.addEventListener('click', () => applyCalcView('scientific'));

  let savedView = 'scientific';
  try { savedView = localStorage.getItem('calvo_calc_view') || 'scientific'; } catch (e) {}
  applyCalcView(savedView);
})();

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
    { cat: 'Algebra (9th-10th)', name: 'a⁴ − b⁴', expr: '(a²+b²)(a+b)(a−b)' },
    { cat: 'Trigonometry (FSc)', name: 'Half Angle tan(θ/2)', expr: '±√((1−cosθ)/(1+cosθ))' },
    { cat: 'Calculus (FSc-BS)', name: 'Logarithmic Differentiation (concept)', expr: 'take ln of both sides before differentiating' },
    { cat: 'Algebra (9th)', name: 'Laws of Exponents - Product', expr: 'aᵐ × aⁿ = aᵐ⁺ⁿ' },
    { cat: 'Algebra (9th)', name: 'Laws of Exponents - Quotient', expr: 'aᵐ ÷ aⁿ = aᵐ⁻ⁿ' },
    { cat: 'Algebra (9th)', name: 'Laws of Exponents - Power of Power', expr: '(aᵐ)ⁿ = aᵐⁿ' },
    { cat: 'Algebra (9th)', name: 'Surds - Rationalizing', expr: '1/√a = √a/a' },
    { cat: 'Algebra (9th)', name: 'HCF and LCM Relation', expr: 'HCF × LCM = Product of two numbers' },
    { cat: 'Algebra (9th)', name: 'Percentage Change', expr: '% change = (New − Old)/Old × 100' },
    { cat: 'Algebra (9th)', name: 'Ratio and Proportion', expr: 'a:b = c:d ⇒ ad = bc' },
    { cat: 'Algebra (9th)', name: 'a² + b² (from sum/product)', expr: '(a+b)² − 2ab' },
    { cat: 'Algebra (9th)', name: 'Linear Equation Slope-Intercept', expr: 'y = mx + c' },
    { cat: 'Algebra (9th)', name: 'Simple Interest', expr: 'SI = PRT/100' },
    { cat: 'Algebra (9th)', name: 'Compound Interest', expr: 'A = P(1 + r/100)ⁿ' },
    { cat: 'Algebra (9th)', name: 'Arithmetic Mean of Two Numbers', expr: 'AM = (a+b)/2' },
    { cat: 'Algebra (9th)', name: 'Geometric Mean of Two Numbers', expr: 'GM = √(ab)' },
    { cat: 'Algebra (9th)', name: 'Speed Distance Time', expr: 'Speed = Distance/Time' },
    { cat: 'Algebra (10th)', name: 'Sum of First n Natural Numbers', expr: 'Sₙ = n(n+1)/2' },
    { cat: 'Algebra (10th)', name: 'Sum of Squares of First n Numbers', expr: 'Σn² = n(n+1)(2n+1)/6' },
    { cat: 'Algebra (10th)', name: 'Sum of Cubes of First n Numbers', expr: 'Σn³ = [n(n+1)/2]²' },
    { cat: 'Algebra (10th)', name: 'Nature of Roots (Discriminant)', expr: 'D>0 real distinct, D=0 real equal, D<0 complex' },
    { cat: 'Algebra (10th)', name: 'Formation of Quadratic Equation', expr: 'x² − (Sum of roots)x + Product of roots = 0' },
    { cat: 'Algebra (10th)', name: 'Reciprocal of Roots Equation', expr: 'cx² + bx + a = 0' },
    { cat: 'Algebra (10th)', name: 'Distance from Point to Line', expr: 'd = |Ax₁+By₁+C|/√(A²+B²)' },
    { cat: 'Algebra (10th)', name: 'Section Formula (Internal Division)', expr: 'P = (mx₂+nx₁)/(m+n), (my₂+ny₁)/(m+n)' },
    { cat: 'Algebra (10th)', name: 'Two-Point Form of Line', expr: '(y−y₁)/(x−x₁) = (y₂−y₁)/(x₂−x₁)' },
    { cat: 'Algebra (10th)', name: 'Intercept Form of Line', expr: 'x/a + y/b = 1' },
    { cat: 'Algebra (10th)', name: 'Slope from General Equation', expr: 'm = −A/B, for Ax+By+C=0' },
    { cat: 'Algebra (10th)', name: 'Condition for Parallel Lines', expr: 'm₁ = m₂' },
    { cat: 'Algebra (10th)', name: 'Condition for Perpendicular Lines', expr: 'm₁ × m₂ = −1' },
    { cat: 'Algebra (10th)', name: 'Area of Triangle (Coordinates)', expr: '½|x₁(y₂−y₃)+x₂(y₃−y₁)+x₃(y₁−y₂)|' },
    { cat: 'Algebra (10th)', name: 'Variation Joint', expr: 'z = kxy' },
    { cat: 'Algebra (10th)', name: 'Matrix Addition Condition', expr: 'Matrices must have same order' },
    { cat: 'Algebra (10th)', name: 'Scalar Multiplication of Matrix', expr: 'kA = k·aᵢⱼ' },
    { cat: 'Algebra (10th)', name: 'Identity Matrix Property', expr: 'AI = IA = A' },
    { cat: 'Trigonometry (10th-FSc)', name: 'sinθ Definition', expr: 'sinθ = Opposite/Hypotenuse' },
    { cat: 'Trigonometry (10th-FSc)', name: 'cosθ Definition', expr: 'cosθ = Adjacent/Hypotenuse' },
    { cat: 'Trigonometry (10th-FSc)', name: 'tanθ Definition', expr: 'tanθ = Opposite/Adjacent = sinθ/cosθ' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Reciprocal Identity cosecθ', expr: 'cosecθ = 1/sinθ' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Reciprocal Identity secθ', expr: 'secθ = 1/cosθ' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Reciprocal Identity cotθ', expr: 'cotθ = 1/tanθ' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Angle of Elevation/Depression (concept)', expr: 'angle from horizontal to line of sight' },
    { cat: 'Trigonometry (10th-FSc)', name: 'sin(A − B)', expr: 'sinA cosB − cosA sinB' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Sum to Product sinA+sinB', expr: '2 sin((A+B)/2) cos((A−B)/2)' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Sum to Product cosA+cosB', expr: '2 cos((A+B)/2) cos((A−B)/2)' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Product to Sum 2sinAcosB', expr: 'sin(A+B) + sin(A−B)' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Area of Triangle (Trig)', expr: 'Area = ½ab sinC' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Radian to Degree', expr: 'θ(deg) = θ(rad) × 180/π' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Arc Length', expr: 's = rθ' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Area of Circular Sector', expr: 'A = ½r²θ' },
    { cat: 'Trigonometry (10th-FSc)', name: 'Period of sin/cos', expr: 'T = 2π/b for sin(bx)' },
    { cat: 'Mensuration (9th-10th)', name: 'Area of Triangle (Base-Height)', expr: 'A = ½ × base × height' },
    { cat: 'Mensuration (9th-10th)', name: 'Heron\'s Formula', expr: 'A = √(s(s−a)(s−b)(s−c))' },
    { cat: 'Mensuration (9th-10th)', name: 'Area of Rhombus', expr: 'A = ½ × d₁ × d₂' },
    { cat: 'Mensuration (9th-10th)', name: 'Circumference of Circle', expr: 'C = 2πr' },
    { cat: 'Mensuration (9th-10th)', name: 'Surface Area of Cube', expr: 'SA = 6a²' },
    { cat: 'Mensuration (9th-10th)', name: 'Surface Area of Cuboid', expr: 'SA = 2(lb+bh+hl)' },
    { cat: 'Mensuration (9th-10th)', name: 'Curved Surface Area of Cylinder', expr: 'CSA = 2πrh' },
    { cat: 'Mensuration (9th-10th)', name: 'Total Surface Area of Cylinder', expr: 'TSA = 2πr(r+h)' },
    { cat: 'Mensuration (9th-10th)', name: 'Curved Surface Area of Cone', expr: 'CSA = πrl' },
    { cat: 'Mensuration (9th-10th)', name: 'Volume of Hemisphere', expr: 'V = 2/3 πr³' },
    { cat: 'Mensuration (9th-10th)', name: 'Pythagoras\' Theorem', expr: 'c² = a² + b²' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(cot x)', expr: '−cosec²x' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(sec x)', expr: 'sec x tan x' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(cosec x)', expr: '−cosec x cot x' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(logₐ x)', expr: '1/(x ln a)' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(aˣ)', expr: 'aˣ ln a' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(sin⁻¹x)', expr: '1/√(1−x²)' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(cos⁻¹x)', expr: '−1/√(1−x²)' },
    { cat: 'Calculus (FSc-BS)', name: 'd/dx(tan⁻¹x)', expr: '1/(1+x²)' },
    { cat: 'Calculus (FSc-BS)', name: 'Second Derivative Test (Maxima)', expr: 'f\'(x)=0, f\'\'(x)<0' },
    { cat: 'Calculus (FSc-BS)', name: 'Second Derivative Test (Minima)', expr: 'f\'(x)=0, f\'\'(x)>0' },
    { cat: 'Calculus (FSc-BS)', name: 'Slope of Tangent', expr: 'm = f\'(x₀)' },
    { cat: 'Calculus (FSc-BS)', name: 'Equation of Tangent Line', expr: 'y − y₀ = f\'(x₀)(x − x₀)' },
    { cat: 'Calculus (FSc-BS)', name: 'Equation of Normal Line', expr: 'y − y₀ = −1/f\'(x₀) (x − x₀)' },
    { cat: 'Calculus (FSc-BS)', name: 'Rate of Change', expr: 'dy/dt = dy/dx × dx/dt' },
    { cat: 'Calculus (FSc-BS)', name: 'L\'Hopital\'s Rule', expr: 'lim f/g = lim f\'/g\' (0/0 or infinity/infinity form)' },
    { cat: 'Calculus (FSc-BS)', name: 'Definition of Derivative', expr: 'f\'(x) = lim(h→0) [f(x+h)−f(x)]/h' },
    { cat: 'Calculus (FSc-BS)', name: 'Implicit Differentiation (concept)', expr: 'differentiate both sides w.r.t x treating y as f(x)' },
    { cat: 'Calculus (FSc-BS)', name: 'Concavity Test', expr: 'f\'\'(x) > 0 concave up, f\'\'(x) < 0 concave down' },
    { cat: 'Calculus (FSc-BS)', name: 'Point of Inflection', expr: 'f\'\'(x) = 0 and changes sign' },
    { cat: 'Calculus (FSc-BS)', name: 'Related Rates Setup (concept)', expr: 'differentiate a relating equation w.r.t time' },
    { cat: 'Integration (FSc-BS)', name: '∫cosec²x dx', expr: '−cot x + C' },
    { cat: 'Integration (FSc-BS)', name: '∫sec x tan x dx', expr: 'sec x + C' },
    { cat: 'Integration (FSc-BS)', name: '∫cosec x cot x dx', expr: '−cosec x + C' },
    { cat: 'Integration (FSc-BS)', name: '∫tan x dx', expr: 'ln|sec x| + C' },
    { cat: 'Integration (FSc-BS)', name: '∫aˣ dx', expr: 'aˣ/ln a + C' },
    { cat: 'Integration (FSc-BS)', name: '∫1/(1+x²) dx', expr: 'tan⁻¹x + C' },
    { cat: 'Integration (FSc-BS)', name: '∫1/√(1−x²) dx', expr: 'sin⁻¹x + C' },
    { cat: 'Integration (FSc-BS)', name: 'Definite Integral - Area Under Curve', expr: 'A = ∫[a,b] f(x) dx' },
    { cat: 'Integration (FSc-BS)', name: 'Fundamental Theorem of Calculus', expr: '∫[a,b] f(x)dx = F(b) − F(a)' },
    { cat: 'Integration (FSc-BS)', name: 'Volume by Disk Method', expr: 'V = π∫[a,b] [f(x)]² dx' },
    { cat: 'Integration (FSc-BS)', name: 'Area Between Two Curves', expr: 'A = ∫[a,b] [f(x) − g(x)] dx' },
    { cat: 'Integration (FSc-BS)', name: 'Integration by Substitution (concept)', expr: 'let u = g(x), du = g\'(x)dx' },
    { cat: 'Integration (FSc-BS)', name: 'Average Value of Function', expr: 'f_avg = 1/(b−a) ∫[a,b] f(x)dx' },
    { cat: 'Sequences & Series (FSc)', name: 'Arithmetic-Geometric Mean Inequality', expr: 'AM ≥ GM ≥ HM' },
    { cat: 'Sequences & Series (FSc)', name: 'General Term of Binomial Expansion', expr: 'Tᵣ₊₁ = ⁿCᵣ xⁿ⁻ʳ yʳ' },
    { cat: 'Sequences & Series (FSc)', name: 'Sum of Infinite Series (1+x)ⁿ', expr: '1 + nx + n(n−1)x²/2! + ...' },
    { cat: 'Sequences & Series (FSc)', name: 'nth Term of HP', expr: 'aₙ = 1/(1/a₁ + (n−1)d)' },
    { cat: 'Complex Numbers (FSc-BS)', name: 'Conjugate of Complex Number', expr: 'z̄ = a − bi, for z = a+bi' },
    { cat: 'Complex Numbers (FSc-BS)', name: 'Argument of Complex Number', expr: 'θ = tan⁻¹(b/a)' },
    { cat: 'Complex Numbers (FSc-BS)', name: 'Polar Form', expr: 'z = r(cosθ + i sinθ)' },
    { cat: 'Complex Numbers (FSc-BS)', name: 'Product of Complex Numbers (Polar)', expr: 'r₁r₂[cos(θ₁+θ₂)+i sin(θ₁+θ₂)]' },
    { cat: 'Complex Numbers (FSc-BS)', name: 'i Powers Cycle', expr: 'i²=−1, i³=−i, i⁴=1' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Determinant 3×3 (Cofactor)', expr: '|A| = Σ aᵢⱼ Cᵢⱼ' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Rank of Matrix (concept)', expr: 'number of linearly independent rows/columns' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Cramer\'s Rule (2 variables)', expr: 'x = Dx/D, y = Dy/D' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Adjoint of Matrix', expr: 'A⁻¹ = adj(A)/|A|' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Orthogonal Matrix Condition', expr: 'AAᵀ = I' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Symmetric Matrix Condition', expr: 'A = Aᵀ' },
    { cat: 'Linear Algebra (BS-MS)', name: 'Linear Independence (concept)', expr: 'c₁v₁+...+cₙvₙ=0 ⇒ all cᵢ=0' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Magnitude of Vector', expr: '|A| = √(Ax²+Ay²+Az²)' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Green\'s Theorem (concept)', expr: '∮(Pdx+Qdy) = ∬(∂Q/∂x−∂P/∂y)dA' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Divergence Theorem (concept)', expr: '∬F·n dS = ∭∇·F dV' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Stokes\' Theorem (concept)', expr: '∮F·dr = ∬(∇×F)·n dS' },
    { cat: 'Vector Calculus (BS-MS)', name: 'Directional Derivative', expr: 'Dᵤf = ∇f · û' },
    { cat: 'Differential Equations (BS-MS)', name: 'Separable DE (concept)', expr: 'dy/dx = g(x)h(y) ⇒ ∫dy/h(y) = ∫g(x)dx' },
    { cat: 'Differential Equations (BS-MS)', name: 'Homogeneous 2nd Order (constant coeff)', expr: 'ay\'\' + by\' + cy = 0' },
    { cat: 'Differential Equations (BS-MS)', name: 'General Solution (Real Distinct Roots)', expr: 'y = c₁e^(m₁x) + c₂e^(m₂x)' },
    { cat: 'Differential Equations (BS-MS)', name: 'General Solution (Equal Roots)', expr: 'y = (c₁+c₂x)e^(mx)' },
    { cat: 'Differential Equations (BS-MS)', name: 'General Solution (Complex Roots)', expr: 'y = e^(αx)(c₁cosβx + c₂sinβx)' },
    { cat: 'Differential Equations (BS-MS)', name: 'Order of DE (concept)', expr: 'highest order derivative present' },
    { cat: 'Differential Equations (BS-MS)', name: 'Degree of DE (concept)', expr: 'power of highest order derivative' },
    { cat: 'Differential Equations (BS-MS)', name: 'Laplace Transform of eᵃᵗ', expr: 'L{e^(at)} = 1/(s−a)' },
    { cat: 'Probability (BS-MS)', name: 'Addition Rule (Mutually Exclusive)', expr: 'P(A∪B) = P(A)+P(B)' },
    { cat: 'Probability (BS-MS)', name: 'Addition Rule (General)', expr: 'P(A∪B) = P(A)+P(B)−P(A∩B)' },
    { cat: 'Probability (BS-MS)', name: 'Multiplication Rule (Independent)', expr: 'P(A∩B) = P(A)×P(B)' },
    { cat: 'Probability (BS-MS)', name: 'Complement Rule', expr: 'P(A\') = 1 - P(A)' },
    { cat: 'Probability (BS-MS)', name: 'Circular Permutations', expr: '(n−1)!' },
    { cat: 'Probability (BS-MS)', name: 'Permutations with Repetition', expr: 'n!/(p!q!r!...)' },
    { cat: 'Probability (BS-MS)', name: 'Variance of Random Variable', expr: 'Var(X) = E(X²) − [E(X)]²' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Complement of Set', expr: 'A\' = U − A' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Power Set Cardinality', expr: '|P(A)| = 2ⁿ' },
    { cat: 'Sets & Functions (9th-10th)', name: 'De Morgan\'s Law (Intersection)', expr: '(A∩B)\' = A\'∪B\'' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Composition of Functions', expr: '(f∘g)(x) = f(g(x))' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Inverse Function Condition', expr: 'f(f⁻¹(x)) = x' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Domain and Range (concept)', expr: 'Domain = set of inputs, Range = set of outputs' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Even Function', expr: 'f(−x) = f(x)' },
    { cat: 'Sets & Functions (9th-10th)', name: 'Odd Function', expr: 'f(−x) = −f(x)' },
    { cat: 'Matrices (10th-FSc)', name: 'Singular Matrix Condition', expr: '|A| = 0' },
    { cat: 'Matrices (10th-FSc)', name: 'Symmetric Matrix (10th)', expr: 'aᵢⱼ = aⱼᵢ' },
    { cat: 'Matrices (10th-FSc)', name: 'Skew-Symmetric Matrix', expr: 'Aᵀ = −A' },
    { cat: 'Matrices (10th-FSc)', name: 'Inverse Matrix Property', expr: 'AA⁻¹ = I' },
    { cat: 'Numerical Methods (BS)', name: 'Bisection Method (concept)', expr: 'root between a,b when f(a)f(b)<0, bisect repeatedly' },
    { cat: 'Numerical Methods (BS)', name: 'Fixed Point Iteration', expr: 'xₙ₊₁ = g(xₙ)' },
    { cat: 'Numerical Methods (BS)', name: 'Percentage Error', expr: '|True−Approx|/True × 100' },
    { cat: 'Partial Fractions (FSc)', name: 'Repeated Linear Factor', expr: '1/(x−a)² = A/(x−a) + B/(x−a)²' },
    { cat: 'Partial Fractions (FSc)', name: 'Quadratic Factor', expr: '(Ax+B)/(x²+px+q)' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Point-Slope Form', expr: 'y − y₁ = m(x − x₁)' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Ellipse Equation', expr: 'x²/a² + y²/b² = 1' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Hyperbola Equation', expr: 'x²/a² − y²/b² = 1' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Parabola Equation', expr: 'y² = 4ax' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Eccentricity of Ellipse', expr: 'e = √(1 − b²/a²)' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Focus of Parabola', expr: 'F = (a, 0), for y² = 4ax' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Angle Between Two Lines', expr: 'tanθ = |(m₁−m₂)/(1+m₁m₂)|' },
    { cat: 'Coordinate Geometry (FSc)', name: 'Centroid of Triangle', expr: 'G = ((x₁+x₂+x₃)/3, (y₁+y₂+y₃)/3)' },
    { cat: '3D Geometry (FSc-BS)', name: 'Direction Cosines Relation', expr: 'l² + m² + n² = 1' },
    { cat: '3D Geometry (FSc-BS)', name: 'Distance Between Two Points in 3D', expr: 'd = √((x2-x1)² + (y2-y1)² + (z2-z1)²)' },
    { cat: '3D Geometry (FSc-BS)', name: 'Equation of Plane (Normal Form)', expr: 'ax + by + cz = d' },
    { cat: '3D Geometry (FSc-BS)', name: 'Angle Between Two Planes', expr: 'cos(theta) = |a1a2+b1b2+c1c2| / (|n1||n2|)' },
    { cat: '3D Geometry (FSc-BS)', name: 'Equation of Line in Space', expr: '(x-x1)/l = (y-y1)/m = (z-z1)/n' },
    { cat: '3D Geometry (FSc-BS)', name: 'Distance Between Point and Plane', expr: 'd = |ax1+by1+cz1-d| / sqrt(a²+b²+c²)' },
    { cat: '3D Geometry (FSc-BS)', name: 'Direction Ratios from Two Points', expr: '(x2-x1, y2-y1, z2-z1)' },
    { cat: '3D Geometry (FSc-BS)', name: 'Angle Between Two Lines (3D)', expr: 'cos(theta) = (l1l2+m1m2+n1n2)' },
    { cat: 'Inequalities (9th-FSc)', name: 'Triangle Inequality', expr: '|a+b| <= |a|+|b|' },
    { cat: 'Inequalities (9th-FSc)', name: 'AM-GM Inequality (n terms)', expr: '(a1+a2+...+an)/n >= (a1a2...an)^(1/n)' },
    { cat: 'Inequalities (9th-FSc)', name: 'Cauchy-Schwarz Inequality', expr: '(Sum aibi)² <= (Sum ai²)(Sum bi²)' },
    { cat: 'Inequalities (9th-FSc)', name: 'Absolute Value Inequality', expr: '|x-a| < b means a-b < x < a+b' },
    { cat: 'Discrete Mathematics (BS)', name: 'Boolean OR Identity', expr: 'A + 1 = 1' },
    { cat: 'Discrete Mathematics (BS)', name: 'Boolean AND Identity', expr: 'A . 0 = 0' },
    { cat: 'Discrete Mathematics (BS)', name: 'De Morgan\'s Law (Boolean)', expr: '(A+B)\' = A\'.B\'' },
    { cat: 'Discrete Mathematics (BS)', name: 'Number of Relations on a Set', expr: '2^(n²)' },
    { cat: 'Discrete Mathematics (BS)', name: 'Number of Functions A to B', expr: '|B|^|A|' },
    { cat: 'Discrete Mathematics (BS)', name: 'Pigeonhole Principle (concept)', expr: 'n+1 items into n boxes means one box has 2+ items' },
    { cat: 'Discrete Mathematics (BS)', name: 'Recurrence Relation (Fibonacci)', expr: 'Fn = F(n-1) + F(n-2)' },
    { cat: 'Discrete Mathematics (BS)', name: 'Inclusion-Exclusion (2 sets)', expr: '|AUB| = |A|+|B|-|A∩B|' },
    { cat: 'Discrete Mathematics (BS)', name: 'Inclusion-Exclusion (3 sets)', expr: '|AUBUC| = |A|+|B|+|C|-|A∩B|-|B∩C|-|A∩C|+|A∩B∩C|' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Profit Percentage', expr: 'Profit% = (SP-CP)/CP × 100' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Loss Percentage', expr: 'Loss% = (CP-SP)/CP × 100' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Markup Price', expr: 'MP = CP + Markup' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Discount Amount', expr: 'Discount = MP - SP' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Zakat Calculation', expr: 'Zakat = 2.5% of Nisab-exceeding wealth' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Present Value', expr: 'PV = FV / (1+r)^n' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Future Value of Annuity', expr: 'FV = P × [((1+r)^n - 1)/r]' },
    { cat: 'Financial Mathematics (9th-BCom)', name: 'Effective Annual Rate', expr: 'EAR = (1+r/n)^n - 1' },
    { cat: 'Real Analysis (BS-MS)', name: 'Supremum (concept)', expr: 'least upper bound of a set' },
    { cat: 'Real Analysis (BS-MS)', name: 'Infimum (concept)', expr: 'greatest lower bound of a set' },
    { cat: 'Real Analysis (BS-MS)', name: 'Sandwich (Squeeze) Theorem', expr: 'if g(x)<=f(x)<=h(x) and lim g=lim h=L then lim f=L' },
    { cat: 'Real Analysis (BS-MS)', name: 'Rolle\'s Theorem', expr: 'if f(a)=f(b) then there exists c in (a,b) with f\'(c)=0' },
    { cat: 'Real Analysis (BS-MS)', name: 'Intermediate Value Theorem', expr: 'if f continuous on [a,b], f takes every value between f(a) and f(b)' },
    { cat: 'Real Analysis (BS-MS)', name: 'Absolute Convergence (concept)', expr: 'series converges if sum of |an| converges' },
    { cat: 'Real Analysis (BS-MS)', name: 'p-Series Test', expr: 'Sum 1/n^p converges if p>1' },
    { cat: 'Real Analysis (BS-MS)', name: 'Alternating Series Test (concept)', expr: 'converges if terms decrease to 0' },
    { cat: 'Complex Analysis (MS)', name: 'Harmonic Conjugate Condition', expr: 'u,v satisfy Cauchy-Riemann equations' },
    { cat: 'Complex Analysis (MS)', name: 'Modulus-Argument Multiplication', expr: '|z1z2| = |z1||z2|, arg(z1z2) = arg(z1)+arg(z2)' },
    { cat: 'Complex Analysis (MS)', name: 'nth Roots of Unity', expr: 'z_k = cos(2πk/n) + i sin(2πk/n)' },
    { cat: 'Complex Analysis (MS)', name: 'Singularity Classification (concept)', expr: 'removable, pole, or essential singularity' },
    { cat: 'Abstract Algebra (MS)', name: 'Lagrange\'s Theorem (Order)', expr: 'order of subgroup divides order of group' },
    { cat: 'Abstract Algebra (MS)', name: 'Normal Subgroup Condition', expr: 'gNg⁻¹ = N for all g in G' },
    { cat: 'Abstract Algebra (MS)', name: 'Quotient Group Order', expr: '|G/N| = |G|/|N|' },
    { cat: 'Abstract Algebra (MS)', name: 'Galois Group (concept)', expr: 'group of automorphisms of a field extension fixing the base field' },
    { cat: 'Abstract Algebra (MS)', name: 'Ideal Definition (concept)', expr: 'subring closed under multiplication by ring elements' },
    { cat: 'Abstract Algebra (MS)', name: 'Euclidean Domain (concept)', expr: 'integral domain with a division algorithm' },
    { cat: 'Optimization (BS-MS)', name: 'Objective Function (LP)', expr: 'Z = c1x1 + c2x2 + ... + cnxn' },
    { cat: 'Optimization (BS-MS)', name: 'Lagrange Multiplier Condition', expr: '∇f = λ∇g' },
    { cat: 'Optimization (BS-MS)', name: 'Simplex Method (concept)', expr: 'iteratively moves along vertices of feasible region to optimize Z' },
    { cat: 'Optimization (BS-MS)', name: 'Convexity Condition', expr: 'f\'\'(x) >= 0 for all x in interval' },
    { cat: 'Numerical Methods (BS)', name: 'Gauss Elimination (concept)', expr: 'reduce augmented matrix to row echelon form' },
    { cat: 'Numerical Methods (BS)', name: 'Gauss-Seidel Method (concept)', expr: 'iterative method using latest updated values' },
    { cat: 'Numerical Methods (BS)', name: 'Runge-Kutta 4th Order (k1)', expr: 'k1 = h f(xn, yn)' },
    { cat: 'Numerical Methods (BS)', name: 'Newton Forward Difference Formula', expr: 'y = y0 + pΔy0 + p(p-1)/2! Δ²y0 + ...' },
    { cat: 'Numerical Methods (BS)', name: 'Regula Falsi Method (concept)', expr: 'linear interpolation between f(a) and f(b) to find root' },
    { cat: 'Sequences & Series (FSc)', name: 'nth Term from End of AP', expr: 'l - (n-1)d' },
    { cat: 'Sequences & Series (FSc)', name: 'Sum of AP (Last Term Form)', expr: 'Sn = n/2 (a1 + an)' },
    { cat: 'Sequences & Series (FSc)', name: 'Arithmetic Mean Insertion', expr: 'A = (a+b)/2 between a and b' },
    { cat: 'Sequences & Series (FSc)', name: 'Geometric Mean Insertion', expr: 'G = sqrt(ab) between a and b' },
    { cat: 'Trigonometric Equations (FSc)', name: 'General Solution sin x = sin a', expr: 'x = nπ + (-1)ⁿ a' },
    { cat: 'Trigonometric Equations (FSc)', name: 'General Solution cos x = cos a', expr: 'x = 2nπ ± a' },
    { cat: 'Trigonometric Equations (FSc)', name: 'General Solution tan x = tan a', expr: 'x = nπ + a' },
    { cat: 'Graph Theory (BS-MS)', name: 'Complete Graph Edges', expr: 'E = n(n-1)/2' },
    { cat: 'Graph Theory (BS-MS)', name: 'Euler\'s Path Condition', expr: 'graph has 0 or 2 vertices of odd degree' },
    { cat: 'Graph Theory (BS-MS)', name: 'Kruskal\'s Algorithm (concept)', expr: 'greedily add smallest edge avoiding a cycle to build MST' },
    { cat: 'Set Theory (9th-BS)', name: 'Cardinality of Union (3 Sets)', expr: '|A∪B∪C| = |A|+|B|+|C|-|A∩B|-|A∩C|-|B∩C|+|A∩B∩C|' },
    { cat: 'Set Theory (9th-BS)', name: 'Symmetric Difference', expr: 'A Δ B = (A-B) ∪ (B-A)' },
    { cat: 'Game Theory (BS-MS)', name: 'Nash Equilibrium (concept)', expr: 'a set of strategies where no player can benefit by changing their strategy alone, given others\' choices' },
    { cat: 'Game Theory (BS-MS)', name: 'Payoff Matrix (concept)', expr: 'a table showing the outcomes/payoffs for each player based on the combination of strategies chosen' },
    { cat: 'Game Theory (BS-MS)', name: 'Dominant Strategy (concept)', expr: 'a strategy that yields a better outcome for a player regardless of what the opponent does' },
    { cat: 'Game Theory (BS-MS)', name: 'Zero-Sum Game (concept)', expr: 'a game where one player\'s gain is exactly equal to another player\'s loss' },
    { cat: 'Game Theory (BS-MS)', name: 'Expected Payoff (Mixed Strategy)', expr: 'E(Payoff) = Σ(Probability of Strategy × Payoff of Strategy)' },
    { cat: 'Game Theory (BS-MS)', name: "Prisoner's Dilemma (concept)", expr: 'a classic game showing how two rational players may not cooperate even when it is in their mutual best interest' },

    { cat: 'Combinatorics — Extra (BS)', name: 'Circular Permutations', expr: 'Circular Permutations = (n − 1)!' },
    { cat: 'Combinatorics — Extra (BS)', name: 'Permutations with Repetition', expr: 'P = n!/(n1! × n2! × ... × nk!)' },
    { cat: 'Combinatorics — Extra (BS)', name: 'Combinations with Repetition', expr: 'C(n + r − 1, r) = (n + r − 1)!/(r!(n − 1)!)' },
    { cat: 'Combinatorics — Extra (BS)', name: 'Derangement Formula', expr: 'D(n) = n! × Σ((−1)^k/k!), k = 0 to n' },
    { cat: 'Combinatorics — Extra (BS)', name: "Pascal's Triangle Identity", expr: 'C(n, r) = C(n−1, r−1) + C(n−1, r)' },
    { cat: 'Combinatorics — Extra (BS)', name: 'Binomial Coefficient Symmetry', expr: 'C(n, r) = C(n, n − r)' },
    { cat: 'Combinatorics — Extra (BS)', name: 'Vandermonde\'s Identity', expr: 'C(m+n, r) = Σ C(m, k) × C(n, r−k)' },
    { cat: 'Combinatorics — Extra (BS)', name: 'Stirling Numbers of the Second Kind (concept)', expr: 'count the number of ways to partition a set of n objects into k non-empty subsets' },

    { cat: 'Mathematical Logic (BS)', name: 'Tautology (concept)', expr: 'a compound proposition that is true under every possible truth assignment' },
    { cat: 'Mathematical Logic (BS)', name: 'Contradiction (Logic) (concept)', expr: 'a compound proposition that is false under every possible truth assignment' },
    { cat: 'Mathematical Logic (BS)', name: 'Logical Equivalence', expr: 'two statements p and q are logically equivalent if p ↔ q is a tautology' },
    { cat: 'Mathematical Logic (BS)', name: 'Universal Quantifier', expr: '∀x P(x) means "P(x) is true for all values of x"' },
    { cat: 'Mathematical Logic (BS)', name: 'Existential Quantifier', expr: '∃x P(x) means "there exists at least one x for which P(x) is true"' },
    { cat: 'Mathematical Logic (BS)', name: 'Rules of Inference — Modus Ponens', expr: 'from p → q and p, we can conclude q' },
    { cat: 'Mathematical Logic (BS)', name: 'Rules of Inference — Modus Tollens', expr: 'from p → q and ¬q, we can conclude ¬p' },
    { cat: 'Mathematical Logic (BS)', name: 'Proof by Contradiction (concept)', expr: 'assumes the negation of a statement and derives a logical contradiction, proving the original statement true' },

    { cat: 'Chaos Theory & Fractals (MS)', name: 'Fractal Dimension (concept)', expr: 'a non-integer measure describing how a fractal pattern\'s detail changes with the scale at which it is measured' },
    { cat: 'Chaos Theory & Fractals (MS)', name: 'Logistic Map', expr: 'xₙ₊₁ = r × xₙ × (1 − xₙ), a simple equation exhibiting chaotic behavior for certain values of r' },
    { cat: 'Chaos Theory & Fractals (MS)', name: 'Sensitive Dependence on Initial Conditions (concept)', expr: 'small differences in a system\'s starting state can lead to vastly different outcomes over time (the "butterfly effect")' },
    { cat: 'Chaos Theory & Fractals (MS)', name: 'Mandelbrot Set (concept)', expr: 'the set of complex numbers c for which the sequence z² + c remains bounded, producing a famous fractal shape' },
    { cat: 'Chaos Theory & Fractals (MS)', name: 'Self-Similarity (concept)', expr: 'a property where a fractal pattern looks similar to itself at different levels of magnification' },
    { cat: 'Chaos Theory & Fractals (MS)', name: 'Strange Attractor (concept)', expr: 'a set of values toward which a chaotic dynamical system tends to evolve, without ever repeating exactly' },
    { cat: 'Chaos Theory & Fractals (MS)', name: 'Bifurcation (concept)', expr: 'a sudden qualitative change in a dynamical system\'s behavior as a parameter is varied' },
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
    { cat: 'Mechanics (9th-10th)', name: 'Terminal Velocity (concept)', expr: 'reached when net force on a falling object = 0' },
    { cat: 'Kinematics (9th-10th)', name: 'Distance from v-t Graph', expr: 'distance = area under velocity-time graph' },
    { cat: 'Forces (9th-10th)', name: "Newton's Second Law (Variable Mass)", expr: 'F = d(mv)/dt' },
    { cat: 'Work & Energy (FSc)', name: 'Work-Energy Theorem', expr: 'W = ΔKE' },
    { cat: 'Rotational Motion (FSc)', name: 'Radius of Gyration', expr: 'k = √(I/m)' },
    { cat: 'Gravitation (FSc)', name: 'Gravitational Field Strength', expr: 'g = GM/r²' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Isothermal Work Done', expr: 'W = nRT ln(V₂/V₁)' },
    { cat: 'Electrostatics (FSc)', name: 'Electric Dipole Moment', expr: 'p = qd' },
    { cat: 'Current Electricity (FSc)', name: 'Drift Velocity', expr: 'I = nAvq' },
    { cat: 'Magnetism (FSc-BS)', name: 'Torque on Current Loop', expr: 'τ = NIAB sinθ' },
    { cat: 'Waves & Sound (FSc)', name: 'Fundamental Frequency (Stretched String)', expr: 'f₁ = v/2L' },
    { cat: 'Optics (FSc)', name: 'Critical Angle', expr: 'sinθc = 1/n' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Bohr Radius (Hydrogen)', expr: 'rₙ = n²h²ε₀/πme²' },
    { cat: 'Nuclear Physics (BS)', name: 'Number of Half-Lives Elapsed', expr: 'n = t/t½' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Terminal Velocity (Stokes)', expr: 'vₜ = 2r²(ρ−σ)g/9η' },
    { cat: 'Oscillations (FSc)', name: 'SHM Total Energy', expr: 'E = ½kA²' },
    { cat: 'Waves & Sound (FSc)', name: 'Speed of Sound in Air (vs Temperature)', expr: 'v = 331 + 0.6T (m/s)' },
    { cat: 'Errors & Measurements (9th-FSc)', name: 'Absolute Error', expr: 'Δa = |a_measured − a_true|' },
    { cat: 'Vectors (FSc)', name: 'Dot Product', expr: 'A·B = AB cosθ' },
    { cat: 'Vectors (FSc)', name: 'Cross Product Magnitude', expr: '|A×B| = AB sinθ' },
    { cat: 'Elasticity (FSc)', name: 'Bulk Modulus', expr: 'K = −V(ΔP/ΔV)' },
    { cat: 'Elasticity (FSc)', name: 'Shear Modulus', expr: 'G = Shear Stress/Shear Strain' },
    { cat: 'Astrophysics (BS)', name: "Kepler's Second Law (Areal Velocity)", expr: 'dA/dt = constant' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Expectation Value', expr: '⟨A⟩ = ∫ψ*Âψ dx' },
    { cat: 'Electromagnetism (FSc-BS)', name: 'Self Inductance', expr: 'ε = −L(dI/dt)' },
    { cat: 'Electromagnetism (BS-MS)', name: 'Mutual Inductance', expr: 'ε₂ = −M(dI₁/dt)' },
    { cat: 'Thermodynamics (BS-MS)', name: 'Adiabatic Process Relation', expr: 'PVᵞ = constant' },
    { cat: 'Measurements (9th)', name: 'Least Count of Instrument', expr: 'LC = Smallest Main Scale Division / Number of Vernier Divisions' },
    { cat: 'Measurements (9th)', name: 'Percentage Uncertainty', expr: '(Uncertainty/Measured Value) × 100' },
    { cat: 'Measurements (9th)', name: 'Significant Figures Rule (concept)', expr: 'all certain digits plus one estimated digit' },
    { cat: 'Measurements (9th)', name: 'Density Unit Conversion', expr: '1 g/cm³ = 1000 kg/m³' },
    { cat: 'Kinematics (9th-10th)', name: 'First Equation of Motion', expr: 'v = u + at' },
    { cat: 'Kinematics (9th-10th)', name: 'Second Equation of Motion', expr: 's = ut + ½at²' },
    { cat: 'Kinematics (9th-10th)', name: 'Third Equation of Motion', expr: 'v² = u² + 2as' },
    { cat: 'Kinematics (9th-10th)', name: 'Relative Velocity', expr: 'v_AB = v_A − v_B' },
    { cat: 'Kinematics (9th-10th)', name: 'Instantaneous Velocity', expr: 'v = lim(Δt→0) Δs/Δt' },
    { cat: 'Forces (9th-10th)', name: 'Newton\'s Law of Gravitation (basic)', expr: 'F = Gm1m2/r²' },
    { cat: 'Forces (9th-10th)', name: 'Coefficient of Friction', expr: 'μ = F(friction)/N' },
    { cat: 'Forces (9th-10th)', name: 'Center of Mass (two bodies)', expr: 'Xcm = (m1x1+m2x2)/(m1+m2)' },
    { cat: 'Forces (9th-10th)', name: 'Torque (basic)', expr: 'τ = F × r × sinθ' },
    { cat: 'Forces (9th-10th)', name: 'Conservation of Momentum', expr: 'm1u1 + m2u2 = m1v1 + m2v2' },
    { cat: 'Forces (9th-10th)', name: 'Elastic Collision (1D velocity)', expr: 'v1 = ((m1−m2)u1 + 2m2u2)/(m1+m2)' },
    { cat: 'Forces (9th-10th)', name: 'Coefficient of Restitution', expr: 'e = (v2−v1)/(u1−u2)' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Specific Heat Capacity', expr: 'Q = mcΔT' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Heat Gained/Lost (Calorimetry)', expr: 'Heat lost by hot body = Heat gained by cold body' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Volumetric (Cubical) Expansion', expr: 'ΔV = V0γΔT' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Areal Expansion', expr: 'ΔA = A0βΔT' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Celsius to Fahrenheit', expr: 'F = (9/5)C + 32' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Celsius to Kelvin', expr: 'K = C + 273' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Boyle\'s Law', expr: 'P1V1 = P2V2 (constant T)' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Charles\'s Law', expr: 'V1/T1 = V2/T2 (constant P)' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Gay-Lussac\'s Law', expr: 'P1/T1 = P2/T2 (constant V)' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Molar Specific Heat Relation', expr: 'Cp − Cv = R' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Degree of Freedom Internal Energy', expr: 'U = (f/2)nRT' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Work Done at Constant Pressure', expr: 'W = PΔV' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Heat Engine Efficiency (basic)', expr: 'η = W(output)/Q(input)' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Coefficient of Performance (Refrigerator)', expr: 'COP = Qc/W' },
    { cat: 'Waves & Sound (FSc)', name: 'Organ Pipe Closed at One End (Fundamental)', expr: 'f1 = v/4L' },
    { cat: 'Waves & Sound (FSc)', name: 'Organ Pipe Open at Both Ends (Fundamental)', expr: 'f1 = v/2L' },
    { cat: 'Waves & Sound (FSc)', name: 'Wavelength-Frequency Relation', expr: 'v = fλ' },
    { cat: 'Waves & Sound (FSc)', name: 'Loudness (Decibel Scale)', expr: 'β = 10 log10(I/I0) dB' },
    { cat: 'Waves & Sound (FSc)', name: 'Resonance Tube (concept)', expr: 'air column resonates at odd multiples of quarter wavelength' },
    { cat: 'Optics (FSc)', name: 'Mirror Formula', expr: '1/f = 1/v + 1/u' },
    { cat: 'Optics (FSc)', name: 'Magnification (Mirror)', expr: 'm = −v/u' },
    { cat: 'Optics (FSc)', name: 'Refractive Index', expr: 'n = c/v' },
    { cat: 'Optics (FSc)', name: 'Snell\'s Law (n form)', expr: 'n1 sinθ1 = n2 sinθ2' },
    { cat: 'Optics (FSc)', name: 'Simple Microscope Magnification', expr: 'M = 1 + D/f' },
    { cat: 'Optics (FSc)', name: 'Compound Microscope Magnification', expr: 'M = (L/fo)(D/fe)' },
    { cat: 'Optics (FSc)', name: 'Astronomical Telescope Magnification', expr: 'M = fo/fe' },
    { cat: 'Optics (FSc)', name: 'Human Eye Near Point', expr: 'D = 25 cm (normal eye)' },
    { cat: 'Optics (FSc)', name: 'Resolving Power of Microscope', expr: 'RP = 2n sinθ/λ' },
    { cat: 'Current Electricity (FSc)', name: 'Current Definition', expr: 'I = Q/t' },
    { cat: 'Current Electricity (FSc)', name: 'Kirchhoff\'s Current Law', expr: 'Sum of currents entering = Sum leaving a junction' },
    { cat: 'Current Electricity (FSc)', name: 'Power Dissipated (Resistor)', expr: 'P = I²R' },
    { cat: 'Current Electricity (FSc)', name: 'Wheatstone Bridge Balance Condition', expr: 'P/Q = R/S' },
    { cat: 'Current Electricity (FSc)', name: 'Potentiometer Principle (concept)', expr: 'potential drop is proportional to length of wire' },
    { cat: 'Current Electricity (FSc)', name: 'RMS Value (AC)', expr: 'Irms = I0/√2' },
    { cat: 'Current Electricity (FSc)', name: 'Average Power (AC circuit)', expr: 'P = Vrms Irms cosφ' },
    { cat: 'Current Electricity (FSc)', name: 'Transformer Voltage Ratio', expr: 'Vs/Vp = Ns/Np' },
    { cat: 'Current Electricity (FSc)', name: 'Capacitive Reactance', expr: 'Xc = 1/(2πfC)' },
    { cat: 'Current Electricity (FSc)', name: 'Inductive Reactance', expr: 'XL = 2πfL' },
    { cat: 'Current Electricity (FSc)', name: 'Resonant Frequency (LC Circuit)', expr: 'f0 = 1/(2π√(LC))' },
    { cat: 'Electrostatics (FSc)', name: 'Electric Field due to Point Charge', expr: 'E = kQ/r²' },
    { cat: 'Electrostatics (FSc)', name: 'Electric Potential due to Point Charge', expr: 'V = kQ/r' },
    { cat: 'Electrostatics (FSc)', name: 'Work Done Moving Charge', expr: 'W = qΔV' },
    { cat: 'Electrostatics (FSc)', name: 'Parallel Plate Capacitor', expr: 'C = ε0A/d' },
    { cat: 'Electrostatics (FSc)', name: 'Electric Field Between Plates', expr: 'E = V/d' },
    { cat: 'Magnetism (FSc-BS)', name: 'Magnetic Field due to Long Straight Wire', expr: 'B = μ0I/(2πr)' },
    { cat: 'Magnetism (FSc-BS)', name: 'Ampere Force on Current-Carrying Wire', expr: 'F = BIL sinθ' },
    { cat: 'Magnetism (FSc-BS)', name: 'Cyclotron Frequency', expr: 'f = qB/(2πm)' },
    { cat: 'Magnetism (FSc-BS)', name: 'EMF Induced (Faraday, N turns)', expr: 'ε = −N dΦ/dt' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Photon Energy (Frequency Form)', expr: 'E = hf' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Photon Energy (Wavelength Form)', expr: 'E = hc/λ' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Work Function', expr: 'W0 = hf0' },
    { cat: 'Modern Physics (FSc-BS)', name: 'Rydberg Formula', expr: '1/λ = R(1/n1² − 1/n2²)' },
    { cat: 'Modern Physics (FSc-BS)', name: 'X-ray Wavelength (Moseley Law concept)', expr: '√f = a(Z − b)' },
    { cat: 'Nuclear Physics (BS)', name: 'Fission Energy Release (concept)', expr: 'ΔE = Δm c² from mass difference of products vs reactants' },
    { cat: 'Nuclear Physics (BS)', name: 'Fusion Reaction (concept)', expr: 'light nuclei combine releasing energy due to mass defect' },
    { cat: 'Nuclear Physics (BS)', name: 'Alpha Decay (concept)', expr: 'nucleus emits a helium-4 nucleus (2 protons, 2 neutrons)' },
    { cat: 'Nuclear Physics (BS)', name: 'Beta Decay (concept)', expr: 'neutron converts to proton emitting an electron and antineutrino' },
    { cat: 'Astrophysics (BS-MS)', name: 'Kepler\'s First Law (concept)', expr: 'planets orbit the sun in ellipses with the sun at one focus' },
    { cat: 'Astrophysics (BS-MS)', name: 'Apparent Magnitude-Flux Relation', expr: 'm1−m2 = −2.5 log10(F1/F2)' },
    { cat: 'Semiconductor Physics (FSc-BS)', name: 'Diode Equation (concept)', expr: 'I = I0(e^(qV/kT) − 1)' },
    { cat: 'Semiconductor Physics (FSc-BS)', name: 'Transistor Current Relation', expr: 'IE = IB + IC' },
    { cat: 'Semiconductor Physics (FSc-BS)', name: 'Current Gain (Beta)', expr: 'β = IC/IB' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Buoyant Force', expr: 'FB = ρ(fluid) g V(displaced)' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Torricelli\'s Theorem', expr: 'v = √(2gh)' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Surface Tension', expr: 'T = F/L' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Capillary Rise', expr: 'h = 2Tcosθ/(ρgr)' },
    { cat: 'Vectors (FSc)', name: 'Angle Between Two Vectors', expr: 'cosθ = (A·B)/(|A||B|)' },
    { cat: 'Vectors (FSc)', name: 'Unit Vector (Physics)', expr: 'â = A/|A|' },
    { cat: 'Acoustics (9th-FSc)', name: 'Speed of Sound in Air', expr: 'v = 331 + 0.6T (T in °C)' },
    { cat: 'Acoustics (9th-FSc)', name: 'Sound Intensity Level', expr: 'β = 10 log₁₀(I/I₀) dB' },
    { cat: 'Acoustics (9th-FSc)', name: 'Doppler Effect (Source Moving Toward)', expr: "f' = f(v/(v - vs))" },
    { cat: 'Acoustics (9th-FSc)', name: 'Doppler Effect (Source Moving Away)', expr: "f' = f(v/(v + vs))" },
    { cat: 'Acoustics (FSc-BS)', name: 'Fundamental Frequency (Open Pipe)', expr: 'f1 = v/2L' },
    { cat: 'Acoustics (FSc-BS)', name: 'Fundamental Frequency (Closed Pipe)', expr: 'f1 = v/4L' },
    { cat: 'Acoustics (FSc-BS)', name: 'Reverberation Time (Sabine)', expr: 'RT60 = 0.161V/A' },
    { cat: 'Acoustics (BS-MS)', name: 'Acoustic Impedance', expr: 'Z = ρv' },

    { cat: 'Particle Physics (BS-MS)', name: 'Rest Mass Energy', expr: 'E₀ = m₀c²' },
    { cat: 'Particle Physics (BS-MS)', name: 'Relativistic Total Energy', expr: 'E² = (pc)² + (m₀c²)²' },
    { cat: 'Particle Physics (MS)', name: 'Cross Section (Scattering)', expr: 'σ = N_scattered/(N_incident × n × t)' },
    { cat: 'Particle Physics (MS)', name: 'Decay Rate (Mean Lifetime)', expr: 'τ = 1/λ' },
    { cat: 'Particle Physics (MS)', name: 'Heisenberg Energy-Time Uncertainty', expr: 'ΔE·Δt ≥ ℏ/2' },
    { cat: 'Particle Physics (MS)', name: 'Heisenberg Position-Momentum Uncertainty', expr: 'Δx·Δp ≥ ℏ/2' },
    { cat: 'Particle Physics (BS-MS)', name: 'Threshold Energy for Pair Production', expr: 'Eth = 2mₑc² (in nuclear field)' },
    { cat: 'Particle Physics (MS)', name: 'Yukawa Potential', expr: 'V(r) = -(g²/r)e^(-r/a)' },

    { cat: 'Astrophysics (BS-MS)', name: "Kepler's Third Law", expr: 'T² ∝ a³' },
    { cat: 'Astrophysics (BS-MS)', name: 'Escape Velocity (Astronomical Body)', expr: 've = √(2GM/R)' },
    { cat: 'Astrophysics (BS-MS)', name: 'Luminosity (Stefan-Boltzmann for Stars)', expr: 'L = 4πR²σT⁴' },
    { cat: 'Astrophysics (BS-MS)', name: 'Apparent vs Absolute Magnitude', expr: 'm - M = 5log₁₀(d/10)' },
    { cat: 'Astrophysics (BS-MS)', name: 'Parallax Distance', expr: 'd(pc) = 1/p(arcsec)' },
    { cat: 'Astrophysics (BS-MS)', name: 'Hubble\'s Law', expr: 'v = H₀d' },
    { cat: 'Astrophysics (MS)', name: 'Jeans Mass (Star Formation)', expr: 'Mj ∝ T^(3/2)/√ρ' },
    { cat: 'Cosmology (MS)', name: 'Friedmann Equation', expr: '(ȧ/a)² = 8πGρ/3 - kc²/a² + Λc²/3' },
    { cat: 'Cosmology (MS)', name: 'Critical Density of Universe', expr: 'ρc = 3H²/8πG' },
    { cat: 'Cosmology (MS)', name: 'Redshift Parameter', expr: 'z = (λobs - λemit)/λemit' },

    { cat: 'Plasma Physics (MS)', name: 'Plasma Frequency', expr: 'ωp = √(ne²/ε₀m)' },
    { cat: 'Plasma Physics (MS)', name: 'Debye Length', expr: 'λD = √(ε₀kT/ne²)' },
    { cat: 'Plasma Physics (MS)', name: 'Larmor Radius', expr: 'rL = mv⊥/qB' },
    { cat: 'Plasma Physics (MS)', name: 'Alfvén Speed', expr: 'vA = B/√(μ₀ρ)' },
    { cat: 'Plasma Physics (MS)', name: 'Magnetic Pressure', expr: 'Pmag = B²/2μ₀' },
    { cat: 'Plasma Physics (MS)', name: 'Plasma Beta', expr: 'β = Pthermal/Pmagnetic' },
    { cat: 'Plasma Physics (MS)', name: 'Saha Ionization Equation', expr: 'nᵢnₑ/nₙ = (2πmₑkT/h²)^(3/2) × 2 × e^(-χ/kT)' },

    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Population Inversion Gain', expr: 'g(ν) ∝ (N2 - N1)' },
    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Laser Cavity Resonance Condition', expr: 'L = mλ/2' },
    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Photon Energy from Wavelength', expr: 'E = hc/λ' },
    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Fiber Optic Acceptance Angle', expr: 'θa = sin⁻¹(√(n1² - n2²))' },
    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Beam Divergence Angle', expr: 'θ ≈ λ/(πw₀)' },
    { cat: 'Laser Physics & Photonics (MS)', name: 'Malus\'s Law', expr: 'I = I₀cos²θ' },
    { cat: 'Laser Physics & Photonics (MS)', name: 'Brewster\'s Angle', expr: 'θB = tan⁻¹(n2/n1)' },
    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Diffraction Grating Equation', expr: 'd sinθ = mλ' },

    { cat: 'Medical Physics (BS-MS)', name: 'Radiation Absorbed Dose', expr: 'D = E/m (Gray)' },
    { cat: 'Medical Physics (BS-MS)', name: 'Equivalent Dose', expr: 'H = D × wR (Sievert)' },
    { cat: 'Medical Physics (BS-MS)', name: 'Attenuation of X-rays', expr: 'I = I₀e^(-μx)' },
    { cat: 'Medical Physics (BS-MS)', name: 'Half Value Layer', expr: 'HVL = ln2/μ' },
    { cat: 'Medical Physics (BS-MS)', name: 'Ultrasound Doppler Shift (Medical)', expr: 'Δf = 2f₀v cosθ/c' },
    { cat: 'Medical Physics (BS-MS)', name: 'Specific Absorption Rate (MRI)', expr: 'SAR = σE²/2ρ' },
    { cat: 'Medical Physics (MS)', name: 'Larmor Frequency (MRI)', expr: 'ω = γB₀' },

    { cat: 'Biophysics (BS-MS)', name: 'Nernst Equation (Membrane Potential)', expr: 'E = (RT/zF) ln([ion]out/[ion]in)' },
    { cat: 'Biophysics (BS-MS)', name: 'Fick\'s First Law of Diffusion', expr: 'J = -D(dc/dx)' },
    { cat: 'Biophysics (BS-MS)', name: 'Poiseuille\'s Law (Blood Flow)', expr: 'Q = πΔPr⁴/8ηL' },
    { cat: 'Biophysics (BS-MS)', name: 'Cell Membrane Capacitance', expr: 'C = εA/d' },
    { cat: 'Biophysics (MS)', name: 'Boltzmann Distribution (Ion Channels)', expr: 'P ∝ e^(-E/kT)' },
    { cat: 'Biophysics (BS-MS)', name: 'Stokes-Einstein Diffusion Coefficient', expr: 'D = kT/6πηr' },

    { cat: 'Superconductivity (MS)', name: 'BCS Energy Gap', expr: 'Δ(0) ≈ 1.76 kBTc' },
    { cat: 'Superconductivity (MS)', name: 'London Equation (Current-Field)', expr: 'J = -(ns e²/m)A' },
    { cat: 'Superconductivity (MS)', name: 'Critical Magnetic Field', expr: 'Hc(T) = Hc(0)[1 - (T/Tc)²]' },
    { cat: 'Superconductivity (MS)', name: 'Coherence Length', expr: 'ξ₀ = ℏvF/(πΔ)' },
    { cat: 'Superconductivity (MS)', name: 'Josephson Current', expr: 'I = Ic sinφ' },

    { cat: 'Geophysics (BS-MS)', name: 'Gravitational Acceleration at Depth', expr: 'g(d) = g₀(1 - d/R)' },
    { cat: 'Geophysics (BS-MS)', name: 'Seismic P-wave Velocity', expr: 'Vp = √((K + 4μ/3)/ρ)' },
    { cat: 'Geophysics (BS-MS)', name: 'Seismic S-wave Velocity', expr: 'Vs = √(μ/ρ)' },
    { cat: 'Geophysics (BS-MS)', name: 'Richter Magnitude', expr: 'M = log₁₀(A) - log₁₀(A₀)' },
    { cat: 'Geophysics (BS-MS)', name: "Earth's Magnetic Dipole Field", expr: 'B = (μ₀m/4πr³)√(1+3cos²θ)' },
    { cat: 'Geophysics (MS)', name: 'Geothermal Heat Flow', expr: 'Q = -k(dT/dz)' },

    { cat: 'Continuum Mechanics (BS-MS)', name: 'Stress-Strain Relation (Hooke)', expr: 'σ = Eε' },
    { cat: 'Continuum Mechanics (BS-MS)', name: "Poisson's Ratio", expr: 'ν = -εlateral/εaxial' },
    { cat: 'Continuum Mechanics (BS-MS)', name: 'Torsional Stress in Shaft', expr: 'τ = Tr/J' },
    { cat: 'Continuum Mechanics (BS-MS)', name: 'Beam Bending Stress', expr: 'σ = My/I' },
    { cat: 'Continuum Mechanics (BS-MS)', name: 'Euler Buckling Load', expr: 'Pcr = π²EI/(KL)²' },
    { cat: 'Continuum Mechanics (MS)', name: 'Navier-Stokes Equation (Incompressible)', expr: 'ρ(∂v/∂t + v·∇v) = -∇P + μ∇²v + ρg' },

    { cat: 'AC Circuits (FSc-BS)', name: 'Impedance of RLC Series Circuit', expr: 'Z = √(R² + (XL - Xc)²)' },
    { cat: 'AC Circuits (FSc-BS)', name: 'Power Factor', expr: 'cosφ = R/Z' },
    { cat: 'AC Circuits (FSc-BS)', name: 'RMS Voltage', expr: 'Vrms = V₀/√2' },
    { cat: 'AC Circuits (FSc-BS)', name: 'Average AC Power', expr: 'P = VrmsIrms cosφ' },
    { cat: 'AC Circuits (FSc-BS)', name: 'Q Factor of RLC Circuit', expr: 'Q = (1/R)√(L/C)' },
    { cat: 'AC Circuits (BS)', name: 'Transformer Turns Ratio', expr: 'Vs/Vp = Ns/Np' },
    { cat: 'AC Circuits (BS)', name: 'Time Constant (RC Circuit)', expr: 'τ = RC' },

    { cat: 'Semiconductor Devices (FSc-BS)', name: 'Diode Current Equation', expr: 'I = I₀(e^(V/ηVT) - 1)' },
    { cat: 'Semiconductor Devices (FSc-BS)', name: 'Transistor Current Gain (Beta)', expr: 'β = Ic/Ib' },
    { cat: 'Semiconductor Devices (FSc-BS)', name: 'Fermi Level (Intrinsic Semiconductor)', expr: 'EF = (Ec + Ev)/2' },
    { cat: 'Semiconductor Devices (FSc-BS)', name: 'Carrier Concentration Product', expr: 'n·p = ni²' },
    { cat: 'Semiconductor Devices (FSc-BS)', name: 'Depletion Width (p-n Junction)', expr: 'W = √(2ε(Vbi - V)/q × (1/Na + 1/Nd))' },
    { cat: 'Semiconductor Devices (BS)', name: 'MOSFET Drain Current (Saturation)', expr: 'ID = ½μnCox(W/L)(VGS - Vt)²' },

    { cat: 'Vibrations & Damping (FSc-BS)', name: 'Damped Oscillation Amplitude', expr: 'A(t) = A₀e^(-bt/2m)' },
    { cat: 'Vibrations & Damping (FSc-BS)', name: 'Damped Angular Frequency', expr: "ω' = √(ω₀² - (b/2m)²)" },
    { cat: 'Vibrations & Damping (FSc-BS)', name: 'Quality Factor (Damped Oscillator)', expr: 'Q = ω₀m/b' },
    { cat: 'Vibrations & Damping (FSc-BS)', name: 'Resonance Condition (Driven Oscillator)', expr: 'ωdriving = ω₀' },
    { cat: 'Vibrations & Damping (FSc-BS)', name: 'Logarithmic Decrement', expr: 'δ = ln(A₁/A₂)' },
    { cat: 'Vibrations & Damping (BS)', name: 'Critical Damping Coefficient', expr: 'bc = 2√(mk)' },

    { cat: 'Statistical Thermodynamics (MS)', name: 'Boltzmann Entropy Formula', expr: 'S = kB lnΩ' },
    { cat: 'Statistical Thermodynamics (MS)', name: 'Helmholtz Free Energy (Statistical)', expr: 'F = -kT lnZ' },

    { cat: 'Acoustics (FSc-BS)', name: 'Sound Wave Pressure Amplitude', expr: 'ΔP = ρvωs₀' },
    { cat: 'Particle Physics (BS-MS)', name: 'Compton Wavelength', expr: 'λc = h/(mc)' },
    { cat: 'Astrophysics (BS-MS)', name: 'Wien\'s Displacement Law (Stellar Temp)', expr: 'λmaxT = 2.898×10⁻³ m·K' },
    { cat: 'Astrophysics (BS-MS)', name: 'Orbital Period from Semi-Major Axis', expr: 'T² = 4π²a³/GM' },
    { cat: 'Cosmology (MS)', name: 'Cosmological Scale Factor Relation', expr: '1 + z = a(t₀)/a(t)' },
    { cat: 'Plasma Physics (MS)', name: 'Ion Acoustic Speed', expr: 'cs = √(kTe/mi)' },
    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Optical Path Length', expr: 'OPL = nL' },
    { cat: 'Laser Physics & Photonics (BS-MS)', name: 'Resolving Power of Grating', expr: 'R = λ/Δλ = mN' },
    { cat: 'Medical Physics (BS-MS)', name: 'Linear Attenuation Coefficient Relation', expr: 'μ = μm × ρ' },
    { cat: 'Biophysics (BS-MS)', name: 'Osmotic Pressure', expr: 'π = MRT' },
    { cat: 'Superconductivity (MS)', name: 'London Penetration Depth (Temp Dependence)', expr: 'λ(T) = λ(0)/√(1 - (T/Tc)⁴)' },
    { cat: 'Geophysics (BS-MS)', name: 'Free-Air Gravity Correction', expr: 'Δg = 0.3086h (mGal, h in m)' },
    { cat: 'Continuum Mechanics (BS-MS)', name: 'Young\'s Modulus (Stress-Strain)', expr: 'E = σ/ε' },
    { cat: 'AC Circuits (BS)', name: 'Apparent Power', expr: 'S = VrmsIrms' },
    { cat: 'AC Circuits (BS)', name: 'Reactive Power', expr: 'Q = VrmsIrms sinφ' },
    { cat: 'Semiconductor Devices (BS)', name: 'Diffusion Current Density', expr: 'Jdiff = qD(dn/dx)' },
    { cat: 'Vibrations & Damping (BS)', name: 'Coupled Oscillator Normal Modes (concept)', expr: 'two masses/springs oscillating at characteristic in-phase and out-of-phase frequencies' },
    { cat: 'Statistical Thermodynamics (MS)', name: 'Gibbs Free Energy (Statistical)', expr: 'G = -kT ln(Ξ) + μN' },
    { cat: 'Kinematics (9th-10th)', name: 'Relative Velocity (1D)', expr: 'vAB = vA - vB' },
    { cat: 'Forces (9th-10th)', name: 'Tension in a String (Equilibrium)', expr: 'T = mg (for hanging mass at rest)' },
    { cat: 'Pressure (9th-10th)', name: "Pascal's Principle", expr: 'F1/A1 = F2/A2' },
    { cat: 'Pressure (9th-10th)', name: 'Gauge Pressure', expr: 'Pgauge = Pabsolute - Patm' },
    { cat: 'Simple Machines (9th-10th)', name: 'Velocity Ratio of a Lever', expr: 'VR = Effort Arm/Load Arm' },
    { cat: 'Sound (9th-10th)', name: 'Echo Distance', expr: 'd = vt/2' },
    { cat: 'Heat & Temperature (9th-10th)', name: 'Linear Thermal Expansion', expr: 'ΔL = LαΔT' },
    { cat: 'Errors & Measurements (9th-FSc)', name: 'Fractional Error', expr: 'Δx/x' },

    { cat: 'Projectile Motion (FSc)', name: 'Range of Projectile', expr: 'R = u²sin2θ/g' },
    { cat: 'Rotational Motion (FSc)', name: 'Rotational Kinetic Energy', expr: 'KE = ½Iω²' },
    { cat: 'Work & Energy (FSc)', name: 'Power Delivered by a Force', expr: 'P = Fv cosθ' },
    { cat: 'Work & Energy (FSc)', name: 'Efficiency of a Machine', expr: 'η = (Output Energy/Input Energy) × 100%' },
    { cat: 'Elasticity (FSc)', name: "Young's Modulus (Wire)", expr: 'Y = (F/A)/(ΔL/L)' },
    { cat: 'Elasticity (FSc)', name: 'Elastic Potential Energy', expr: 'U = ½kx²' },
    { cat: 'Gravitation (FSc)', name: "Kepler's Third Law (Simple Form)", expr: 'T²/R³ = constant' },
    { cat: 'Gravitation (FSc)', name: 'Gravitational Potential Energy (General)', expr: 'U = -GMm/r' },

    { cat: 'Electrostatics (FSc)', name: 'Electric Potential Energy', expr: 'U = kq1q2/r' },
    { cat: 'Electrostatics (FSc)', name: 'Capacitance of Parallel Plate Capacitor', expr: 'C = ε₀A/d' },
    { cat: 'Current Electricity (FSc)', name: "Kirchhoff's Current Law (concept)", expr: 'sum of currents entering a junction equals sum leaving' },
    { cat: 'Current Electricity (FSc)', name: "Kirchhoff's Voltage Law (concept)", expr: 'sum of voltage drops around a closed loop equals zero' },
    { cat: 'Current Electricity (FSc)', name: 'Terminal Voltage of a Cell', expr: 'V = ε - Ir' },
    { cat: 'Magnetism (FSc-BS)', name: 'Force on Moving Charge in Magnetic Field', expr: 'F = qvB sinθ' },
    { cat: 'Magnetism (FSc-BS)', name: 'Magnetic Field of a Long Straight Wire', expr: 'B = μ₀I/(2πr)' },
    { cat: 'Magnetism (FSc-BS)', name: 'Magnetic Field inside a Solenoid', expr: 'B = μ₀nI' },
    { cat: 'Electromagnetism (FSc-BS)', name: "Faraday's Law of Induction", expr: 'ε = -N(dΦ/dt)' },
    { cat: 'Electromagnetism (FSc-BS)', name: "Lenz's Law (concept)", expr: 'induced current opposes the change in magnetic flux that produced it' },

    { cat: 'Waves & Sound (FSc)', name: 'Wave Speed Equation', expr: 'v = fλ' },
    { cat: 'Waves & Sound (FSc)', name: 'Mach Number', expr: 'M = v_object/v_sound' },
    { cat: 'Wave Optics (FSc)', name: "Young's Double Slit Fringe Spacing", expr: 'Δy = λD/d' },
    { cat: 'Optics (FSc)', name: 'Lens Maker Equation', expr: '1/f = (n-1)(1/R1 - 1/R2)' },
    { cat: 'Optics (FSc)', name: 'Magnification (Lens)', expr: 'm = v/u = hi/ho' },
    { cat: 'Oscillations (FSc)', name: 'Spring-Mass System Period', expr: 'T = 2π√(m/k)' },

    { cat: 'Thermodynamics (FSc-BS)', name: 'Efficiency of Carnot Engine', expr: 'η = 1 - Tc/Th' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Work Done in Isothermal Process', expr: 'W = nRT ln(Vf/Vi)' },

    { cat: 'Modern Physics (FSc-BS)', name: 'Uncertainty Principle (Simplified)', expr: 'Δx·Δp ≥ h/4π' },
    { cat: 'Quantum Mechanics (BS-MS)', name: 'Particle in a Box Energy Levels', expr: 'En = n²h²/(8mL²)' },
    { cat: 'Quantum Mechanics (MS)', name: 'Expectation Value of Position', expr: '⟨x⟩ = ∫ψ* x ψ dx' },

    { cat: 'Nuclear Physics (BS)', name: 'Nuclear Fission Energy Release (concept)', expr: 'Efission = (Σm_products − m_parent)c²' },
    { cat: 'Solid State Physics (BS-MS)', name: 'Lattice Constant Relation (Cubic)', expr: 'a = (nM/ρNA)^(1/3)' },
    { cat: 'Condensed Matter (MS)', name: 'Debye Temperature (concept)', expr: 'temperature above which all vibrational modes of a crystal are excited' },
    { cat: 'Classical Mechanics (BS-MS)', name: "Lagrangian Function", expr: 'L = T - V' },

    { cat: 'Kinematics (9th-10th)', name: 'Uniform Acceleration from v-t Graph', expr: 'a = slope of v-t graph' },
    { cat: 'Forces (9th-10th)', name: 'Weight vs Mass Relation', expr: 'W = mg' },
    { cat: 'Pressure (9th-10th)', name: 'Pressure in a Fluid Column', expr: 'P = hρg' },
    { cat: 'Rotational Motion (FSc)', name: 'Moment of Inertia (Point Mass)', expr: 'I = mr²' },
    { cat: 'Current Electricity (FSc)', name: 'Power Dissipated in Resistor', expr: 'P = I²R' },
    { cat: 'Magnetism (FSc-BS)', name: 'Torque on Current Loop in Magnetic Field', expr: 'τ = NIAB sinθ' },
    { cat: 'Optics (FSc)', name: 'Critical Angle for Total Internal Reflection', expr: 'θc = sin⁻¹(n2/n1)' },
    { cat: 'Oscillations (FSc)', name: 'Angular Frequency of SHM', expr: 'ω = 2π/T = √(k/m)' },
    { cat: 'Nuclear Physics (BS)', name: 'Binding Energy per Nucleon', expr: 'BE/A' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Equation of Continuity', expr: 'A1v1 = A2v2' },

    { cat: 'Pressure (9th-10th)', name: 'Atmospheric Pressure (Barometer)', expr: 'P = hρg (mercury column)' },
    { cat: 'Electrostatics (FSc)', name: 'Energy Stored in a Capacitor', expr: 'U = ½CV²' },
    { cat: 'Fluid Mechanics (FSc-BS)', name: 'Stokes\' Law (Terminal Velocity)', expr: 'vt = 2r²(ρ - σ)g/9η' },

    { cat: 'Kinematics (9th-10th)', name: 'Deceleration in Braking', expr: 'a = (v² - u²)/2s' },

    { cat: 'Optics (FSc)', name: 'Power of a Lens', expr: 'P = 1/f (in Diopters)' },

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
    { cat: 'Atomic Structure (9th-FSc)', name: 'Principal Quantum Number', expr: 'n = 1, 2, 3... defines the energy level' },
    { cat: 'Atomic Structure (9th-FSc)', name: 'Azimuthal Quantum Number', expr: 'l = 0 to (n−1)' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Molar Mass from Gas Density', expr: 'M = dRT/P' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Specific Heat Capacity', expr: 'c = Q/(mΔT)' },
    { cat: 'Thermodynamics (FSc-BS)', name: 'Molar Heat Capacity (Ideal Monatomic Gas)', expr: 'Cv = (3/2)R' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Degree of Dissociation', expr: 'α = moles dissociated/initial moles' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Ionic Product of Water', expr: 'Kw = [H⁺][OH⁻] = 10⁻¹⁴' },
    { cat: 'Kinetics (FSc-BS)', name: 'Collision Theory Rate Constant', expr: 'k = PZ_A e^(−Ea/RT)' },
    { cat: 'Kinetics (FSc-BS)', name: 'Overall Reaction Order', expr: 'order = sum of exponents (m + n) in rate law' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Standard Hydrogen Electrode', expr: 'E°(SHE) = 0.00 V (reference)' },
    { cat: 'Electrochemistry (BS-MS)', name: 'Transport Number', expr: 'tᵢ = λᵢ/Σλ' },
    { cat: 'Solutions (FSc)', name: 'Colligative Property (Relative Lowering)', expr: 'ΔP/P° = mole fraction of solute' },
    { cat: 'Solutions (FSc)', name: "Van't Hoff Factor", expr: 'i = 1 + α(n−1)' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Percent Ionization', expr: '%ionization = [H⁺]/[HA]₀ × 100' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Common Ion Effect on Ionization (concept)', expr: 'a common ion suppresses ionization of a weak acid or base' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Cycloalkane Formula', expr: 'CₙH₂ₙ' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'IUPAC Parent Chain Rule (concept)', expr: 'longest continuous carbon chain determines the parent name' },
    { cat: 'Stoichiometry (9th-10th)', name: 'Theoretical Yield (concept)', expr: 'maximum product calculated from the limiting reagent' },
    { cat: 'Stoichiometry (9th-10th)', name: 'Mass-to-Mass Stoichiometry', expr: 'mass B = (mass A/M_A) × mole ratio × M_B' },
    { cat: 'Basic Concepts (9th)', name: 'Gram Equivalent Weight', expr: 'GEW = molar mass/n-factor' },
    { cat: 'Basic Concepts (9th)', name: 'Mole Concept (Avogadro)', expr: '1 mole = 6.022 × 10²³ particles' },
    { cat: 'Coordination Chemistry (BS)', name: 'Geometric Isomer Count (concept)', expr: 'cis/trans arrangements depend on ligand positions' },
    { cat: 'Nuclear Chemistry (BS)', name: 'Nuclear Stability (N/Z Ratio)', expr: 'N/Z ≈ 1 for light stable nuclei, increases for heavier ones' },
    { cat: 'Physical Chemistry (BS-MS)', name: "Ostwald's Dilution Law", expr: 'Ka = Cα²/(1−α)' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Vapor Pressure Lowering', expr: 'ΔP = X₂P°' },
    { cat: 'Physical Chemistry (MS)', name: 'Rate Constant Units (nth Order)', expr: 'units = (mol/L)^(1−n) s⁻¹' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Molar Absorptivity', expr: 'ε = A/(cl)' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Gravimetric Factor', expr: 'GF = molar mass of analyte/molar mass of precipitate' },
    { cat: 'Spectroscopy (BS-MS)', name: 'Energy of a Photon', expr: 'E = hc/λ' },
    { cat: 'Quantum Chemistry (BS-MS)', name: 'Energy-Time Uncertainty', expr: 'ΔE·Δt ≥ h/4π' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Electronegativity Difference', expr: 'ΔEN = EN(A) − EN(B)' },
    { cat: 'Chemical Bonding (9th-10th)', name: 'Resonance Energy', expr: 'RE = actual bond energy − calculated bond energy' },
    { cat: 'Environmental Chemistry (FSc-BS)', name: 'Carbon Footprint (concept)', expr: 'total CO₂-equivalent emissions from an activity' },
    { cat: 'Titration (FSc)', name: 'Equivalence Point (concept)', expr: 'moles of acid equal moles of base at stoichiometric ratio' },
    { cat: 'Basic Concepts (9th)', name: 'Percentage Purity', expr: '%Purity = (pure substance mass/total mass) × 100' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Atomic Number', expr: 'Z = Number of Protons' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Mass Number', expr: 'A = Protons + Neutrons' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Number of Neutrons', expr: 'n = A − Z' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Isotope Notation', expr: 'ᴬZX (A = mass number, Z = atomic number)' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Average Atomic Mass (Isotopes)', expr: 'Sum of (isotope mass × fractional abundance)' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Atomic Mass Unit', expr: '1 amu = 1/12 mass of C-12 atom' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Electron Configuration Rule (concept)', expr: 'electrons fill orbitals from lowest to highest energy (Aufbau)' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Ionization Energy Trend (concept)', expr: 'increases across a period, decreases down a group' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Atomic Radius Trend (concept)', expr: 'decreases across a period, increases down a group' },
    { cat: 'Periodic Trends (9th-10th)', name: 'Electron Affinity (concept)', expr: 'energy released when an atom gains an electron' },
    { cat: 'Basic Concepts (9th)', name: 'Number of Moles from Mass', expr: 'n = mass/molar mass' },
    { cat: 'Basic Concepts (9th)', name: 'Number of Particles', expr: 'N = n × NA' },
    { cat: 'Basic Concepts (9th)', name: 'Molar Volume at STP', expr: '1 mole of gas = 22.4 L at STP' },
    { cat: 'Basic Concepts (9th)', name: 'Vapor Density', expr: 'VD = Molar Mass/2' },
    { cat: 'Basic Concepts (9th)', name: 'Equivalent Weight (Acid)', expr: 'Eq. Wt = Molar Mass/Basicity' },
    { cat: 'Basic Concepts (9th)', name: 'Equivalent Weight (Base)', expr: 'Eq. Wt = Molar Mass/Acidity' },
    { cat: 'Environmental Chemistry (FSc-BS)', name: 'Total Dissolved Solids (concept)', expr: 'sum of all dissolved minerals and salts in water, in mg/L' },
    { cat: 'Environmental Chemistry (FSc-BS)', name: 'pH Scale of Rainwater (concept)', expr: 'normal rainwater has pH about 5.6 due to dissolved CO2' },
    { cat: 'Environmental Chemistry (FSc-BS)', name: 'COD (Chemical Oxygen Demand)', expr: 'amount of oxygen required to oxidize organic matter chemically' },
    { cat: 'Environmental Chemistry (FSc-BS)', name: 'Ozone Depletion Reaction (concept)', expr: 'Cl radicals catalytically destroy ozone: Cl + O3 → ClO + O2' },
    { cat: 'Acid-Base (FSc-BS)', name: 'pH of Strong Acid', expr: 'pH = −log[H+]' },
    { cat: 'Acid-Base (FSc-BS)', name: 'pOH of Strong Base', expr: 'pOH = −log[OH−]' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Kw at 25°C', expr: 'Kw = [H+][OH−] = 1×10⁻¹⁴' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Conjugate Acid-Base Pair (concept)', expr: 'acid loses a proton to form its conjugate base' },
    { cat: 'Acid-Base (FSc-BS)', name: 'Amphoteric Species (concept)', expr: 'a substance that can act as both an acid and a base' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Universal Gas Constant Value', expr: 'R = 0.0821 L·atm/(mol·K)' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Standard Temperature and Pressure', expr: 'STP: 0°C (273 K), 1 atm' },
    { cat: 'Gas Laws (9th-FSc)', name: 'Partial Pressure (Mole Fraction Form)', expr: 'Pi = xi × Ptotal' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Reaction Quotient Q', expr: 'Q = [Products]/[Reactants] at any time' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Relationship Between Q and K (concept)', expr: 'Q<K forward shift, Q>K reverse shift, Q=K equilibrium' },
    { cat: 'Equilibrium (FSc-BS)', name: 'Solubility from Ksp (AB type salt)', expr: 's = √Ksp' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Number of Electrons Transferred (n)', expr: 'from balanced half-reaction' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Electrolysis Mass Deposited', expr: 'm = (ItM)/(nF)' },
    { cat: 'Electrochemistry (FSc-BS)', name: 'Cell Notation Convention (concept)', expr: 'anode | anode solution || cathode solution | cathode' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Formula of Carboxylic Acids', expr: 'CnH2nO2' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Formula of Aldehydes', expr: 'CnH2nO' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Formula of Ketones', expr: 'CnH2nO' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Formula of Ethers', expr: 'CnH2n+2O' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Formula of Amines', expr: 'CnH2n+3N' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'General Formula of Esters', expr: 'CnH2nO2' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'Homologous Series (concept)', expr: 'members differ by a -CH2- unit and share similar properties' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'Markovnikov\'s Rule (simple statement)', expr: 'H adds to carbon with more H atoms already attached' },
    { cat: 'Organic Chemistry (FSc-BS)', name: 'Isomers Count (concept)', expr: 'compounds with same molecular formula, different structure' },
    { cat: 'Biochemistry (FSc-BS)', name: 'Peptide Bond Formation (concept)', expr: 'condensation of -COOH and -NH2 groups releasing H2O' },
    { cat: 'Biochemistry (FSc-BS)', name: 'Glycosidic Bond (concept)', expr: 'bond linking two monosaccharides formed by dehydration' },
    { cat: 'Biochemistry (FSc-BS)', name: 'ATP Hydrolysis Energy (concept)', expr: 'ATP + H2O → ADP + Pi, releases ~30.5 kJ/mol' },
    { cat: 'Biochemistry (FSc-BS)', name: 'Isoelectric Point (concept)', expr: 'pH at which a molecule carries no net electric charge' },
    { cat: 'Biochemistry (FSc-BS)', name: 'Enzyme-Substrate Rate (Michaelis-Menten)', expr: 'v = Vmax[S]/(Km+[S])' },
    { cat: 'Industrial Chemistry (BS)', name: 'Haber Process (concept)', expr: 'N2 + 3H2 ⇌ 2NH3, high pressure with iron catalyst' },
    { cat: 'Industrial Chemistry (BS)', name: 'Contact Process (concept)', expr: 'SO2 oxidized to SO3 using V2O5 catalyst, then converted to H2SO4' },
    { cat: 'Industrial Chemistry (BS)', name: 'Atom Economy', expr: 'Atom Economy = (Mass of desired product/Mass of all reactants) × 100' },
    { cat: 'Industrial Chemistry (BS)', name: 'Percent Atom Utilization', expr: '(Molar mass of product/Sum molar mass of reactants) × 100' },
    { cat: 'Coordination Chemistry (BS)', name: 'Oxidation Number Rule (Complex Ion)', expr: 'sum of oxidation states of ligands and metal = overall charge' },
    { cat: 'Coordination Chemistry (BS)', name: 'Werner\'s Theory (concept)', expr: 'metal ions have primary and secondary valencies in complexes' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Molarity from Density and % Purity', expr: 'M = (10 × density × %purity)/molar mass' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Degree of Dissociation from Van\'t Hoff Factor', expr: 'i = 1 + alpha(n-1)' },
    { cat: 'Physical Chemistry (BS-MS)', name: 'Crystal Lattice Energy Trend (concept)', expr: 'increases with higher ionic charge and smaller ionic radius' },
    { cat: 'Spectroscopy (BS-MS)', name: 'Beer-Lambert Absorbance', expr: 'A = εcl' },
    { cat: 'Spectroscopy (BS-MS)', name: 'Chromatography Rf Value', expr: 'Rf = Distance moved by solute/Distance moved by solvent' },
    { cat: 'Analytical Chemistry (BS-MS)', name: 'Normality from Molarity', expr: 'N = M × n-factor' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'General Formula of Alkanes', expr: 'CₙH₂ₙ₊₂' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'General Formula of Alkenes', expr: 'CₙH₂ₙ' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'General Formula of Alkynes', expr: 'CₙH₂ₙ₋₂' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Degree of Unsaturation', expr: 'DoU = (2C + 2 + N − H)/2, C = carbons, N = nitrogens, H = hydrogens' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Isomers (concept)', expr: 'compounds with the same molecular formula but different structural arrangements' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Functional Group (concept)', expr: 'a specific group of atoms within a molecule responsible for its characteristic chemical reactions' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Nucleophilic Substitution (SN1/SN2) (concept)', expr: 'reactions where a nucleophile replaces a leaving group; SN1 is stepwise, SN2 is a single concerted step' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Electrophilic Addition (concept)', expr: 'an electrophile adds across a double or triple bond, typical of alkene/alkyne reactions' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Elimination Reaction (E1/E2) (concept)', expr: 'a reaction that removes atoms from a molecule to form a double bond, releasing a small byproduct' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Markovnikov\'s Rule (concept)', expr: 'in addition to an unsymmetrical alkene, H adds to the carbon with more hydrogens already attached' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Esterification Reaction (concept)', expr: 'Carboxylic Acid + Alcohol ⇌ Ester + Water (catalyzed by acid)' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Saponification Reaction (concept)', expr: 'Ester + Strong Base → Soap (carboxylate salt) + Alcohol' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Aromaticity (Hückel\'s Rule)', expr: 'a ring is aromatic if it is planar, cyclic, fully conjugated, and has (4n+2) π electrons' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Chirality / Optical Isomerism (concept)', expr: 'a molecule with a carbon bonded to four different groups can exist as non-superimposable mirror images' },
    { cat: 'Organic Chemistry — Extra (FSc-BS)', name: 'Polymerization (concept)', expr: 'the process of joining many small monomer molecules together to form a large polymer chain' },

    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Percent Yield', expr: 'Percent Yield = (Actual Yield/Theoretical Yield) × 100' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Limiting Reagent (concept)', expr: 'the reactant that is completely consumed first, limiting the amount of product formed' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Theoretical Yield (concept)', expr: 'the maximum amount of product that could be formed from the limiting reagent, based on stoichiometry' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Percent Composition', expr: 'Percent Composition = (Mass of Element in Compound/Molar Mass of Compound) × 100' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Empirical Formula (concept)', expr: 'the simplest whole-number ratio of atoms of each element in a compound' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Molecular Formula from Empirical Formula', expr: 'Molecular Formula = (Empirical Formula)ₙ, n = Molar Mass/Empirical Formula Mass' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Molar Mass', expr: 'Molar Mass = Mass of Substance (g)/Number of Moles' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Number of Moles from Mass', expr: 'n = Mass (g)/Molar Mass (g/mol)' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Number of Particles from Moles', expr: 'N = n × Nₐ, Nₐ = Avogadro\'s Number (6.022 × 10²³)' },
    { cat: 'Stoichiometry — Extra (9th-BS)', name: 'Molar Volume of a Gas at STP', expr: '1 mole of any gas occupies 22.4 L at STP' },

    { cat: 'Thermochemistry — Extra (FSc-BS)', name: 'Enthalpy of Reaction', expr: 'ΔH_rxn = ΔH_products − ΔH_reactants' },
    { cat: 'Thermochemistry — Extra (FSc-BS)', name: "Hess's Law", expr: 'the total enthalpy change for a reaction is the same regardless of the number of steps taken' },
    { cat: 'Thermochemistry — Extra (FSc-BS)', name: 'Enthalpy of Formation (concept)', expr: 'the heat change when 1 mole of a compound forms from its elements in their standard states' },
    { cat: 'Thermochemistry — Extra (FSc-BS)', name: 'Enthalpy of Combustion (concept)', expr: 'the heat released when 1 mole of a substance burns completely in oxygen' },
    { cat: 'Thermochemistry — Extra (FSc-BS)', name: 'Bond Enthalpy Calculation', expr: 'ΔH = Σ(Bond Energies Broken) − Σ(Bond Energies Formed)' },
    { cat: 'Thermochemistry — Extra (FSc-BS)', name: 'Calorimetry Heat Formula', expr: 'q = mcΔT, m = mass, c = specific heat capacity, ΔT = temperature change' },
    { cat: 'Thermochemistry — Extra (FSc-BS)', name: 'Exothermic vs Endothermic (concept)', expr: 'exothermic reactions release heat (ΔH negative); endothermic reactions absorb heat (ΔH positive)' },
    { cat: 'Thermochemistry — Extra (FSc-BS)', name: 'Specific Heat Capacity (concept)', expr: 'the amount of heat needed to raise the temperature of 1 g of a substance by 1°C' },

    { cat: 'Colligative Properties (FSc-BS)', name: 'Relative Lowering of Vapor Pressure', expr: '(P° − P)/P° = Mole Fraction of Solute' },
    { cat: 'Colligative Properties (FSc-BS)', name: 'Elevation in Boiling Point', expr: 'ΔTb = Kb × m, Kb = molal boiling point constant, m = molality' },
    { cat: 'Colligative Properties (FSc-BS)', name: 'Depression in Freezing Point', expr: 'ΔTf = Kf × m, Kf = molal freezing point constant' },
    { cat: 'Colligative Properties (FSc-BS)', name: 'Osmotic Pressure (Van\'t Hoff Equation)', expr: 'π = MRT, M = molarity, R = gas constant, T = temperature (K)' },
    { cat: 'Colligative Properties (FSc-BS)', name: "Van't Hoff Factor", expr: 'i = Actual number of particles in solution/Number of formula units initially dissolved' },
    { cat: 'Colligative Properties (FSc-BS)', name: 'Molality', expr: 'm = Moles of Solute/Mass of Solvent (kg)' },
    { cat: 'Colligative Properties (FSc-BS)', name: 'Mole Fraction', expr: 'X_A = Moles of A/Total Moles of All Components' },
    { cat: 'Colligative Properties (FSc-BS)', name: 'Isotonic Solutions (concept)', expr: 'two solutions with equal osmotic pressure, causing no net water movement between them' },

    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Nernst Equation', expr: 'E = E° − (RT/nF)ln(Q)' },
    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Faraday\'s First Law of Electrolysis', expr: 'Mass Deposited ∝ Quantity of Charge Passed (Q = It)' },
    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Faraday\'s Second Law of Electrolysis', expr: 'for the same charge, mass deposited is proportional to the equivalent weight of the substance' },
    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Standard Cell Potential', expr: 'E°_cell = E°_cathode − E°_anode' },
    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Gibbs Free Energy and Cell Potential', expr: 'ΔG° = −nFE°' },
    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Equilibrium Constant from Cell Potential', expr: 'ln(K) = nFE°/RT' },
    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Molar Conductivity', expr: 'Λm = κ/C, κ = specific conductivity, C = molar concentration' },
    { cat: 'Electrochemistry — Extra (BS-MS)', name: 'Galvanic vs Electrolytic Cell (concept)', expr: 'a galvanic cell generates electricity from a spontaneous reaction; an electrolytic cell uses electricity to drive a non-spontaneous reaction' },

    { cat: 'Photochemistry (BS-MS)', name: 'Photochemical Reaction (concept)', expr: 'a chemical reaction initiated by the absorption of light energy' },
    { cat: 'Photochemistry (BS-MS)', name: 'Energy of a Photon', expr: 'E = hν = hc/λ, h = Planck\'s constant, ν = frequency, λ = wavelength' },
    { cat: 'Photochemistry (BS-MS)', name: 'Quantum Yield (Photochemistry)', expr: 'Φ = Number of Molecules Reacted/Number of Photons Absorbed' },
    { cat: 'Photochemistry (BS-MS)', name: 'Photosynthesis Light Reactions (concept)', expr: 'light energy is absorbed by chlorophyll and converted into chemical energy (ATP and NADPH)' },
    { cat: 'Photochemistry (BS-MS)', name: 'Fluorescence vs Phosphorescence (concept)', expr: 'fluorescence emits light almost instantly after absorption; phosphorescence emits it over a longer delayed period' },

    { cat: 'Green Chemistry (BS-MS)', name: 'Green Chemistry (concept)', expr: 'the design of chemical products and processes that reduce or eliminate hazardous substances' },
    { cat: 'Green Chemistry (BS-MS)', name: 'Atom Economy', expr: 'Atom Economy = (Molar Mass of Desired Product/Total Molar Mass of Reactants) × 100' },
    { cat: 'Green Chemistry (BS-MS)', name: 'E-Factor (Environmental Factor)', expr: 'E-Factor = Mass of Waste/Mass of Desired Product' },
    { cat: 'Green Chemistry (BS-MS)', name: 'Renewable Feedstock (concept)', expr: 'raw materials derived from replenishable biological sources rather than fossil fuels' },
    { cat: 'Green Chemistry (BS-MS)', name: 'Biodegradability (concept)', expr: 'the ability of a substance to be broken down naturally by microorganisms without harming the environment' },
    { cat: 'Green Chemistry (BS-MS)', name: 'Catalysis in Green Chemistry (concept)', expr: 'catalysts speed up reactions and reduce energy requirements and waste production' },

    { cat: 'Food Chemistry (BS-MS)', name: 'Caloric Value of Macronutrients (concept)', expr: 'Carbohydrates and Proteins ≈ 4 kcal/g, Fats ≈ 9 kcal/g' },
    { cat: 'Food Chemistry (BS-MS)', name: 'Maillard Reaction (concept)', expr: 'a chemical reaction between amino acids and reducing sugars that browns food and creates flavor when heated' },
    { cat: 'Food Chemistry (BS-MS)', name: 'Rancidity (concept)', expr: 'the oxidative or hydrolytic decomposition of fats/oils, producing unpleasant odors and taste' },
    { cat: 'Food Chemistry (BS-MS)', name: 'pH of Common Foods (concept)', expr: 'most foods are mildly acidic; e.g. lemon juice ≈ pH 2, milk ≈ pH 6.5' },
    { cat: 'Food Chemistry (BS-MS)', name: 'Preservatives (concept)', expr: 'substances added to food to prevent microbial spoilage and extend shelf life' },
    { cat: 'Food Chemistry (BS-MS)', name: 'Emulsification (concept)', expr: 'the process of mixing two immiscible liquids (e.g. oil and water) into a stable dispersion' },

    { cat: 'Forensic Chemistry (BS-MS)', name: 'Forensic Chemistry (concept)', expr: 'the application of chemical analysis techniques to identify substances relevant to criminal investigations' },
    { cat: 'Forensic Chemistry (BS-MS)', name: 'Chromatography in Forensics (concept)', expr: 'separates mixtures (e.g. drugs, inks) into components based on differing movement through a stationary phase' },
    { cat: 'Forensic Chemistry (BS-MS)', name: 'Mass Spectrometry (concept)', expr: 'identifies compounds by measuring the mass-to-charge ratio of ionized fragments' },
    { cat: 'Forensic Chemistry (BS-MS)', name: 'Blood Alcohol Content (BAC) (concept)', expr: 'the percentage of alcohol present in a person\'s bloodstream, used in toxicology testing' },
    { cat: 'Forensic Chemistry (BS-MS)', name: 'Presumptive vs Confirmatory Tests (concept)', expr: 'presumptive tests give a quick, tentative result; confirmatory tests provide definitive identification' },
    { cat: 'Forensic Chemistry (BS-MS)', name: 'Luminol Test (concept)', expr: 'a chemical test that produces a blue glow when it reacts with the iron in hemoglobin, detecting trace blood' },

    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Adsorption (concept)', expr: 'the adhesion of molecules from a gas or liquid to a solid or liquid surface, forming a thin film' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Absorption vs Adsorption (concept)', expr: 'absorption is uptake throughout the bulk of a material; adsorption occurs only at the surface' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Freundlich Adsorption Isotherm', expr: 'x/m = kP^(1/n), x/m = mass adsorbed per unit mass of adsorbent, P = pressure' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Langmuir Adsorption Isotherm', expr: 'θ = KP/(1 + KP), θ = fraction of surface covered' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Colloid (concept)', expr: 'a mixture where microscopically dispersed particles (1–1000 nm) are suspended throughout another substance' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Tyndall Effect (concept)', expr: 'the scattering of light by particles in a colloid, making the light beam visible' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Brownian Motion (concept)', expr: 'the random, erratic movement of colloidal particles caused by collisions with solvent molecules' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Emulsion (concept)', expr: 'a colloidal dispersion of one liquid within another immiscible liquid, stabilized by an emulsifier' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Micelle Formation (concept)', expr: 'surfactant molecules aggregate above a critical concentration, orienting hydrophobic tails inward' },
    { cat: 'Surface Chemistry & Colloids (BS-MS)', name: 'Critical Micelle Concentration (CMC) (concept)', expr: 'the surfactant concentration above which micelles begin to form spontaneously' },

    { cat: 'Solid State Chemistry (BS-MS)', name: 'Unit Cell (concept)', expr: 'the smallest repeating structural unit of a crystal lattice' },
    { cat: 'Solid State Chemistry (BS-MS)', name: "Bragg's Law", expr: 'nλ = 2d sinθ, used in X-ray diffraction to determine crystal spacing' },
    { cat: 'Solid State Chemistry (BS-MS)', name: 'Packing Efficiency (Simple Cubic)', expr: 'Packing Efficiency ≈ 52.4%' },
    { cat: 'Solid State Chemistry (BS-MS)', name: 'Packing Efficiency (Body-Centered Cubic)', expr: 'Packing Efficiency ≈ 68%' },
    { cat: 'Solid State Chemistry (BS-MS)', name: 'Packing Efficiency (Face-Centered Cubic)', expr: 'Packing Efficiency ≈ 74%' },
    { cat: 'Solid State Chemistry (BS-MS)', name: 'Density of Unit Cell', expr: 'ρ = ZM/(Nₐ × a³), Z = number of atoms per cell, M = molar mass, a = edge length' },
    { cat: 'Solid State Chemistry (BS-MS)', name: 'Coordination Number (Crystal Lattice) (concept)', expr: 'the number of nearest neighboring atoms/ions surrounding a given atom or ion in a crystal' },
    { cat: 'Solid State Chemistry (BS-MS)', name: 'Crystal Defects (concept)', expr: 'irregularities in a crystal lattice, such as vacancies, interstitials, and substitutions' },

    { cat: 'Petrochemistry & Fuel Chemistry (BS)', name: 'Fractional Distillation of Crude Oil (concept)', expr: 'separates crude oil into fractions based on differing boiling points of hydrocarbons' },
    { cat: 'Petrochemistry & Fuel Chemistry (BS)', name: 'Octane Number (concept)', expr: 'a measure of a fuel\'s resistance to knocking during combustion in a gasoline engine' },
    { cat: 'Petrochemistry & Fuel Chemistry (BS)', name: 'Calorific Value of Fuel (concept)', expr: 'the amount of heat released when a unit mass of fuel is completely combusted' },
    { cat: 'Petrochemistry & Fuel Chemistry (BS)', name: 'Cracking (Petrochemistry) (concept)', expr: 'breaking down large hydrocarbon molecules into smaller, more useful ones using heat, pressure, or catalysts' },
    { cat: 'Petrochemistry & Fuel Chemistry (BS)', name: 'Biofuel (concept)', expr: 'fuel derived from recently living biological material, such as ethanol from crops' },
    { cat: 'Petrochemistry & Fuel Chemistry (BS)', name: 'Combustion Reaction (General)', expr: 'Fuel + O₂ → CO₂ + H₂O + Energy (complete combustion)' },

    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'Drug Design (concept)', expr: 'the process of finding new medications based on the biological structure of a target molecule' },
    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'Structure-Activity Relationship (SAR) (concept)', expr: 'the relationship between a molecule\'s chemical structure and its biological activity' },
    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'Prodrug (concept)', expr: 'an inactive compound that is metabolized in the body into its active pharmaceutical form' },
    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'Racemic Mixture (concept)', expr: 'an equal mixture of two enantiomers of a chiral molecule, often with differing biological activity' },
    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'Solubility and Drug Absorption (concept)', expr: 'a drug\'s solubility strongly affects how well and how quickly it is absorbed into the bloodstream' },
    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'pKa and Drug Ionization', expr: 'pH = pKa + log([A⁻]/[HA]), determines the ionized/unionized ratio of a drug at a given pH' },
    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'Excipient (concept)', expr: 'an inactive substance formulated alongside the active drug to aid in its manufacture or delivery' },
    { cat: 'Pharmaceutical Chemistry (BS-MS)', name: 'Controlled Drug Release (concept)', expr: 'formulation technology designed to release a drug gradually over an extended period' },

    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Crystal Field Splitting Energy (Octahedral)', expr: 'Δo = 10 Dq, splitting of d-orbitals in an octahedral ligand field' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Crystal Field Stabilization Energy (CFSE) (concept)', expr: 'the extra stability a transition metal complex gains from electrons occupying lower-energy d-orbitals' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Lattice Energy (concept)', expr: 'the energy released when gaseous ions combine to form one mole of an ionic solid, proportional to (Q1×Q2)/r' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Coordination Number (concept)', expr: 'the number of ligand donor atoms directly bonded to a central metal atom or ion' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Hard and Soft Acids and Bases (HSAB) (concept)', expr: 'hard acids/bases prefer to bond with other hard species, and soft acids/bases prefer soft species' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Jahn-Teller Effect (concept)', expr: 'a geometric distortion in certain electronic configurations that removes orbital degeneracy and lowers energy' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Diagonal Relationship (concept)', expr: 'similarity in properties between an element and the element diagonally below-right of it in the periodic table' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: "Effective Nuclear Charge (Slater's Rules)", expr: 'Z_eff = Z − S, Z = atomic number, S = screening constant' },
    { cat: 'Inorganic Chemistry — Extra (BS-MS)', name: 'Ionic Radius Trend (concept)', expr: 'ionic radius decreases across a period and increases down a group, due to effective nuclear charge and added shells' },

    { cat: 'Organometallic Chemistry (BS-MS)', name: '18-Electron Rule', expr: 'stable organometallic complexes tend to have a total of 18 valence electrons around the metal center' },
    { cat: 'Organometallic Chemistry (BS-MS)', name: 'Oxidative Addition (concept)', expr: 'a reaction where a metal center increases its oxidation state and coordination number by inserting into a bond' },
    { cat: 'Organometallic Chemistry (BS-MS)', name: 'Reductive Elimination (concept)', expr: 'a reaction where a metal center decreases its oxidation state and coordination number, releasing a new bond' },
    { cat: 'Organometallic Chemistry (BS-MS)', name: 'Migratory Insertion (concept)', expr: 'a step where a ligand migrates to an adjacent coordinated group, forming a new bond without changing oxidation state' },
    { cat: 'Organometallic Chemistry (BS-MS)', name: 'Hapticity (concept)', expr: 'ηⁿ notation describing the number of contiguous ligand atoms bonded to a metal center' },
    { cat: 'Organometallic Chemistry (BS-MS)', name: 'Metal Carbonyl Bonding (concept)', expr: 'synergic bonding between CO and a metal involving σ-donation from CO and π-back donation from the metal' },
    { cat: 'Organometallic Chemistry (BS-MS)', name: 'Catalytic Cycle (concept)', expr: 'a repeating sequence of elementary steps in which a catalyst is regenerated after converting reactants to products' },

    { cat: 'Medicinal Chemistry (BS-MS)', name: 'Drug-Receptor Interaction (concept)', expr: 'the binding of a drug molecule to a specific biological receptor to produce a pharmacological effect' },
    { cat: 'Medicinal Chemistry (BS-MS)', name: "Lipinski's Rule of Five (concept)", expr: 'predicts oral drug-likeness based on molecular weight, lipophilicity, and hydrogen bond donors/acceptors' },
    { cat: 'Medicinal Chemistry (BS-MS)', name: 'Bioavailability', expr: 'F = (AUC oral/AUC IV) × 100, the fraction of an administered drug that reaches systemic circulation' },
    { cat: 'Medicinal Chemistry (BS-MS)', name: 'Half-Life of a Drug', expr: 't½ = 0.693/k, k = elimination rate constant' },
    { cat: 'Medicinal Chemistry (BS-MS)', name: 'Pharmacophore (concept)', expr: 'the arrangement of molecular features necessary for a drug to interact with its biological target' },
    { cat: 'Medicinal Chemistry (BS-MS)', name: 'IC50 (concept)', expr: 'the concentration of a drug required to inhibit a biological process by 50%' },
    { cat: 'Medicinal Chemistry (BS-MS)', name: 'ED50 (concept)', expr: 'the dose of a drug that produces a therapeutic effect in 50% of a population' },
    { cat: 'Medicinal Chemistry (BS-MS)', name: 'Drug Metabolism — ADME (concept)', expr: 'Absorption, Distribution, Metabolism, Excretion — the four stages describing a drug\'s journey through the body' },

    { cat: 'Chromatography (BS-MS)', name: 'Retention Factor (Rf)', expr: 'Rf = Distance traveled by solute/Distance traveled by solvent' },
    { cat: 'Chromatography (BS-MS)', name: 'Retention Time (concept)', expr: 'the time a compound takes to pass through a chromatography column and reach the detector' },
    { cat: 'Chromatography (BS-MS)', name: 'Column Chromatography (concept)', expr: 'a technique separating compounds based on differential adsorption as they pass through a packed column' },
    { cat: 'Chromatography (BS-MS)', name: 'Thin Layer Chromatography (TLC) (concept)', expr: 'a technique separating compounds on a thin adsorbent layer coated on a plate, based on polarity' },
    { cat: 'Chromatography (BS-MS)', name: 'Gas Chromatography (concept)', expr: 'a technique separating volatile compounds based on their interaction with a stationary phase in a gas-flow column' },
    { cat: 'Chromatography (BS-MS)', name: 'HPLC (High-Performance Liquid Chromatography) (concept)', expr: 'a technique using high pressure to force a liquid sample through a column for precise separation and analysis' },
    { cat: 'Chromatography (BS-MS)', name: 'Resolution (Chromatography)', expr: 'Rs = 2(tR2 − tR1)/(w1 + w2), measures separation between two adjacent peaks' },
    { cat: 'Chromatography (BS-MS)', name: 'Partition Coefficient', expr: 'K = Concentration in Stationary Phase/Concentration in Mobile Phase' },

    { cat: 'Mass Spectrometry (BS-MS)', name: 'Mass-to-Charge Ratio (m/z) (concept)', expr: 'the ratio of an ion\'s mass to its charge, plotted on the x-axis of a mass spectrum' },
    { cat: 'Mass Spectrometry (BS-MS)', name: 'Molecular Ion Peak (concept)', expr: 'the peak corresponding to the unfragmented molecule that has lost one electron' },
    { cat: 'Mass Spectrometry (BS-MS)', name: 'Base Peak (concept)', expr: 'the tallest peak in a mass spectrum, assigned a relative intensity of 100%' },
    { cat: 'Mass Spectrometry (BS-MS)', name: 'Fragmentation Pattern (concept)', expr: 'the characteristic set of ion peaks produced when a molecule breaks apart during ionization' },
    { cat: 'Mass Spectrometry (BS-MS)', name: 'Isotope Pattern (concept)', expr: 'the relative peak intensities in a mass spectrum arising from an element\'s naturally occurring isotopes' },
    { cat: 'Mass Spectrometry (BS-MS)', name: 'Resolving Power (Mass Spectrometry)', expr: 'RP = m/Δm, m = mass of the ion, Δm = smallest resolvable mass difference' },
    { cat: 'Mass Spectrometry (BS-MS)', name: 'Nitrogen Rule (concept)', expr: 'a molecule with an odd number of nitrogen atoms has an odd nominal molecular mass, and vice versa' },

    { cat: 'Computational Chemistry (BS-MS)', name: 'Molecular Mechanics (concept)', expr: 'models molecular energy using classical physics with force fields, treating atoms as balls and bonds as springs' },
    { cat: 'Computational Chemistry (BS-MS)', name: 'Ab Initio Methods (concept)', expr: 'quantum chemistry calculations based purely on fundamental physical constants, without empirical parameters' },
    { cat: 'Computational Chemistry (BS-MS)', name: 'Density Functional Theory (DFT) (concept)', expr: 'a computational method that determines molecular properties using electron density rather than the full wavefunction' },
    { cat: 'Computational Chemistry (BS-MS)', name: 'Basis Set (concept)', expr: 'a set of mathematical functions used to approximate molecular orbitals in computational calculations' },
    { cat: 'Computational Chemistry (BS-MS)', name: 'Potential Energy Surface (concept)', expr: 'a multidimensional surface representing a molecule\'s energy as a function of its atomic coordinates' },
    { cat: 'Computational Chemistry (BS-MS)', name: 'Molecular Dynamics Simulation (concept)', expr: 'simulates the physical movement of atoms and molecules over time by numerically solving Newton\'s equations of motion' },
    { cat: 'Computational Chemistry (BS-MS)', name: 'Hartree-Fock Method (concept)', expr: 'an approximate method for determining the wavefunction and energy of a many-electron system' },

    { cat: 'Corrosion Chemistry (BS)', name: 'Corrosion (concept)', expr: 'the gradual destruction of a material, usually a metal, through chemical or electrochemical reaction with its environment' },
    { cat: 'Corrosion Chemistry (BS)', name: 'Rusting Reaction', expr: '4Fe + 3O₂ + 6H₂O → 4Fe(OH)₃, the electrochemical corrosion of iron in the presence of water and oxygen' },
    { cat: 'Corrosion Chemistry (BS)', name: 'Galvanic Corrosion (concept)', expr: 'accelerated corrosion of a less noble metal when it is in electrical contact with a more noble metal in an electrolyte' },
    { cat: 'Corrosion Chemistry (BS)', name: 'Corrosion Rate', expr: 'CR = (K × W)/(A × T × D), W = weight loss, A = area, T = time, D = density, K = constant' },
    { cat: 'Corrosion Chemistry (BS)', name: 'Cathodic Protection (concept)', expr: 'a technique preventing corrosion by making the metal surface the cathode of an electrochemical cell' },
    { cat: 'Corrosion Chemistry (BS)', name: 'Passivation (concept)', expr: 'the formation of a thin protective oxide layer on a metal surface that slows further corrosion' },
    { cat: 'Corrosion Chemistry (BS)', name: 'Pitting Corrosion (concept)', expr: 'localized corrosion that produces small holes or pits in a metal surface' },

    { cat: 'Catalysis (BS-MS)', name: 'Catalyst (concept)', expr: 'a substance that increases the rate of a chemical reaction without being consumed in the process' },
    { cat: 'Catalysis (BS-MS)', name: 'Homogeneous vs Heterogeneous Catalysis (concept)', expr: 'homogeneous catalysts are in the same phase as reactants; heterogeneous catalysts are in a different phase' },
    { cat: 'Catalysis (BS-MS)', name: 'Turnover Number (Catalysis)', expr: 'TON = Moles of Product/Moles of Catalyst' },
    { cat: 'Catalysis (BS-MS)', name: 'Turnover Frequency (Catalysis)', expr: 'TOF = TON/Time' },
    { cat: 'Catalysis (BS-MS)', name: 'Enzyme as Biological Catalyst (concept)', expr: 'a protein catalyst that accelerates biochemical reactions by lowering activation energy' },
    { cat: 'Catalysis (BS-MS)', name: 'Autocatalysis (concept)', expr: 'a reaction in which one of the products acts as a catalyst for the reaction itself' },
    { cat: 'Catalysis (BS-MS)', name: 'Catalytic Poisoning (concept)', expr: 'the loss of catalytic activity caused by a substance binding to and blocking active sites' },
    { cat: 'Catalysis (BS-MS)', name: 'Activation Energy Lowering by Catalyst (concept)', expr: 'a catalyst provides an alternative reaction pathway with lower activation energy, increasing reaction rate' },

    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'Hardness of Water (concept)', expr: 'water hardness results from dissolved calcium and magnesium ions, causing scale formation and reduced soap lathering' },
    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'Total Dissolved Solids (TDS) (concept)', expr: 'the total concentration of dissolved organic and inorganic substances in water' },
    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'Water Hardness Calculation', expr: 'Hardness (as CaCO₃) = (mg Ca²⁺ × 2.5) + (mg Mg²⁺ × 4.1)' },
    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'Chlorination (concept)', expr: 'the addition of chlorine to water to disinfect it by killing bacteria and other pathogens' },
    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'Biochemical Oxygen Demand (BOD) (concept)', expr: 'the amount of dissolved oxygen consumed by microorganisms decomposing organic matter in water' },
    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'Chemical Oxygen Demand (COD) (concept)', expr: 'the amount of oxygen required to chemically oxidize both organic and inorganic matter in water' },
    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'Reverse Osmosis (concept)', expr: 'a purification process that forces water through a semi-permeable membrane to remove ions, molecules, and larger particles' },
    { cat: 'Water Chemistry & Treatment (BS-MS)', name: 'pH of Water and Water Quality (concept)', expr: 'safe drinking water typically has a pH between 6.5 and 8.5; values outside this range indicate contamination or imbalance' },

    { cat: 'Crystallography (BS-MS)', name: 'Unit Cell (concept)', expr: 'the smallest repeating structural unit of a crystal lattice that shows the full symmetry of the crystal' },
    { cat: 'Crystallography (BS-MS)', name: "Bragg's Law", expr: 'nλ = 2d sinθ, relates X-ray wavelength, interplanar spacing, and diffraction angle' },
    { cat: 'Crystallography (BS-MS)', name: 'Miller Indices (concept)', expr: 'a notation system (hkl) used to describe the orientation of crystal planes' },
    { cat: 'Crystallography (BS-MS)', name: 'Packing Efficiency (concept)', expr: 'the percentage of a unit cell\'s volume actually occupied by its constituent atoms' },
    { cat: 'Crystallography (BS-MS)', name: 'Coordination Number in Crystal Lattices (concept)', expr: 'the number of nearest neighboring atoms or ions surrounding a given atom in a crystal structure' },
    { cat: 'Crystallography (BS-MS)', name: 'Avogadro\'s Number from Unit Cell', expr: 'N_A = (Z × M)/(ρ × a³), Z = atoms per cell, M = molar mass, ρ = density, a = edge length' },
    { cat: 'Crystallography (BS-MS)', name: 'Types of Unit Cells (concept)', expr: 'simple cubic, body-centered cubic (BCC), and face-centered cubic (FCC) are common cubic unit cell types' },
    { cat: 'Crystallography (BS-MS)', name: 'X-ray Diffraction (concept)', expr: 'a technique using the scattering of X-rays by a crystal lattice to determine its atomic structure' },

    { cat: 'Agricultural Chemistry (BS-MS)', name: 'NPK Fertilizer Ratio (concept)', expr: 'the percentage by weight of Nitrogen (N), Phosphorus (P), and Potassium (K) in a fertilizer' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Soil pH and Nutrient Availability (concept)', expr: 'soil pH strongly affects the solubility and availability of nutrients for plant uptake' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Cation Exchange Capacity (CEC) (concept)', expr: 'a measure of a soil\'s ability to hold and exchange positively charged nutrient ions' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Nitrogen Fixation in Soil (concept)', expr: 'the conversion of atmospheric nitrogen into ammonia by soil bacteria, making it usable by plants' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Pesticide Residue (concept)', expr: 'the trace amount of pesticide that remains on or in food, soil, or water after application' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Fertilizer Nutrient Content Calculation', expr: '% Nutrient = (Weight of Nutrient/Weight of Fertilizer) × 100' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Soil Organic Matter (concept)', expr: 'the decomposed plant and animal material in soil that improves fertility, structure, and water retention' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Eutrophication (concept)', expr: 'excessive nutrient enrichment of water bodies, often from fertilizer runoff, causing algal blooms and oxygen depletion' },
    { cat: 'Agricultural Chemistry (BS-MS)', name: 'Biofertilizer (concept)', expr: 'a substance containing living microorganisms that enhance nutrient availability when applied to soil or plants' },
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
    { cat: 'Genetics (FSc-BS)', name: 'Multiple Alleles Genotypes', expr: 'possible genotypes = C(n,2) + n, for n alleles' },
    { cat: 'Genetics (FSc-BS)', name: 'Epistasis Ratio (Dominant)', expr: '12:3:1' },
    { cat: 'Genetics (FSc-BS)', name: 'Epistasis Ratio (Recessive)', expr: '9:3:4' },
    { cat: 'Genetics (FSc-BS)', name: 'Complementary Gene Ratio', expr: '9:7' },
    { cat: 'Genetics (FSc-BS)', name: 'Lethal Gene Ratio', expr: '2:1' },
    { cat: 'Genetics (FSc-BS)', name: 'Polygenic Inheritance Classes', expr: '2n+1 phenotype classes for n gene pairs' },
    { cat: 'Ecology (FSc-BS)', name: "Simpson's Index of Dominance", expr: 'D = Σ(n/N)²' },
    { cat: 'Ecology (FSc-BS)', name: 'Species Evenness', expr: "E = H'/ln(S)" },
    { cat: 'Ecology (FSc-BS)', name: 'Biomass Pyramid (concept)', expr: 'total biomass decreases at each higher trophic level' },
    { cat: 'Ecology (FSc-BS)', name: 'Gross Primary Productivity', expr: 'GPP = NPP + R' },
    { cat: 'Ecology (BS-MS)', name: 'Ecological Footprint (concept)', expr: 'land/water area required to sustain resource use' },
    { cat: 'Ecology (BS-MS)', name: 'Age-Specific Fertility Rate', expr: 'ASFR = births in age group/women in age group' },
    { cat: 'Ecology (BS-MS)', name: 'Life Table Survivorship', expr: 'lx = number surviving to age x / initial number' },
    { cat: 'Ecology (BS-MS)', name: 'Metapopulation Dynamics (concept)', expr: 'balance of local extinction and colonization rates' },
    { cat: 'Physiology (FSc-BS)', name: 'Heart Rate Reserve', expr: 'HRR = HRmax − HRrest' },
    { cat: 'Physiology (FSc-BS)', name: 'Maximum Heart Rate (estimate)', expr: 'HRmax = 220 − age' },
    { cat: 'Physiology (BS-MS)', name: 'Cardiac Index', expr: 'CI = CO/BSA' },
    { cat: 'Physiology (BS-MS)', name: 'Systemic Vascular Resistance', expr: 'SVR = (MAP − CVP)/CO' },
    { cat: 'Physiology (FSc-BS)', name: "Frank-Starling Law (concept)", expr: 'stroke volume increases with venous return' },
    { cat: 'Physiology (FSc-BS)', name: 'Oxygen Saturation (concept)', expr: 'percentage of hemoglobin bound with O₂' },
    { cat: 'Physiology (BS-MS)', name: 'Anion Gap', expr: 'AG = Na⁺ − (Cl⁻ + HCO₃⁻)' },
    { cat: 'Physiology (BS-MS)', name: 'Creatinine Clearance', expr: 'CrCl = (U×V)/P' },
    { cat: 'Physiology (BS-MS)', name: 'BMR (Harris-Benedict, Men)', expr: 'BMR = 88.4 + 13.4W + 4.8H − 5.68A' },
    { cat: 'Physiology (BS-MS)', name: 'BMR (Harris-Benedict, Women)', expr: 'BMR = 447.6 + 9.25W + 3.10H − 4.33A' },
    { cat: 'Physiology (BS-MS)', name: 'Body Fat Percentage (estimate)', expr: '%BF = (1.20×BMI) + (0.23×age) − (10.8×sex) − 5.4' },
    { cat: 'Physiology (BS-MS)', name: 'Mean Corpuscular Volume', expr: 'MCV = Hct/RBC count × 10' },
    { cat: 'Physiology (FSc-BS)', name: 'Peak Expiratory Flow (concept)', expr: 'maximum airflow rate during forced exhalation' },
    { cat: 'Biochemistry (BS-MS)', name: 'Enzyme Activity Unit', expr: 'U = μmol substrate converted per minute' },
    { cat: 'Biochemistry (BS-MS)', name: 'Specific Activity', expr: 'SA = enzyme activity (U)/total protein (mg)' },
    { cat: 'Biochemistry (BS-MS)', name: 'Percent Yield (Purification)', expr: '%Yield = (activity in step/activity at start) × 100' },
    { cat: 'Biochemistry (BS-MS)', name: 'Purification Fold', expr: 'Fold = specific activity(step)/specific activity(start)' },
    { cat: 'Biochemistry (BS-MS)', name: 'Lineweaver-Burk Intercepts', expr: 'x-intercept = −1/Km, y-intercept = 1/Vmax' },
    { cat: 'Biochemistry (BS-MS)', name: 'Hill Coefficient (Cooperativity)', expr: 'nH > 1 = positive cooperativity' },
    { cat: 'Biochemistry (BS-MS)', name: 'Buffer Capacity (general)', expr: 'β = Δ(base added)/Δ(pH)' },
    { cat: 'Biochemistry (BS-MS)', name: "Osmotic Pressure (van't Hoff)", expr: 'π = MRT' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Number of tRNA Anticodons', expr: '4³ = 64 possible anticodons' },
    { cat: 'Molecular Biology (MS)', name: 'Gene Density', expr: 'genes per Mb of genomic DNA' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Mutation Frequency', expr: 'mutants/total organisms examined' },
    { cat: 'Molecular Biology (MS)', name: 'Transcription Rate (concept)', expr: 'nucleotides synthesized per second by RNA polymerase' },
    { cat: 'Molecular Biology (MS)', name: 'Ligation Efficiency', expr: 'transformants per μg of vector DNA' },
    { cat: 'Molecular Biology (BS-MS)', name: 'Southern Blot Band Size (concept)', expr: 'estimated by migration distance relative to marker' },
    { cat: 'Molecular Biology (MS)', name: 'Sanger Sequencing Read Length', expr: '~800–1000 bp per read (typical)' },
    { cat: 'Evolution (BS-MS)', name: 'Neutral Theory Substitution Rate', expr: 'k = μ (substitution rate = mutation rate)' },
    { cat: 'Evolution (BS-MS)', name: 'Effective Population Size (bottleneck)', expr: 'Ne = 4NmNf/(Nm+Nf)' },
    { cat: 'Evolution (BS-MS)', name: 'Migration Rate (Gene Flow)', expr: 'm = migrants/total population size' },
    { cat: 'Evolution (BS-MS)', name: 'Inbreeding Depression Coefficient', expr: 'ID = (wo − wi)/wo' },
    { cat: 'Evolution (MS)', name: 'Speciation Rate (concept)', expr: 'new species formed per unit time' },
    { cat: 'Evolution (MS)', name: 'Phylogenetic Branch Length', expr: 'proportional to number of substitutions' },
    { cat: 'Cell Biology (9th-FSc)', name: 'Cell Cycle Duration (typical)', expr: '~24 hours for a mammalian somatic cell' },
    { cat: 'Cell Biology (BS-MS)', name: 'Mitotic Index', expr: 'MI = cells in mitosis/total cells × 100' },
    { cat: 'Cell Biology (BS-MS)', name: 'Nuclear to Cytoplasmic Ratio', expr: 'N:C = nuclear volume/cytoplasmic volume' },
    { cat: 'Cell Biology (BS-MS)', name: 'Membrane Potential (Nernst)', expr: 'Em = (RT/zF) ln([ion]out/[ion]in)' },
    { cat: 'Cell Biology (BS-MS)', name: 'Goldman Equation (Resting Potential)', expr: 'Vm = (RT/F) ln[(PK[K]o+PNa[Na]o)/(PK[K]i+PNa[Na]i)]' },
    { cat: 'Cell Biology (BS-MS)', name: 'Osmolarity (Calculated, Serum)', expr: 'Osm = 2×Na + Glucose/18 + BUN/2.8' },
    { cat: 'Bioenergetics (9th-FSc)', name: 'ATP Yield (Fermentation)', expr: 'net 2 ATP per glucose' },
    { cat: 'Bioenergetics (BS-MS)', name: 'Photosynthetic Efficiency', expr: 'η = energy stored/light energy absorbed × 100' },
    { cat: 'Bioenergetics (BS-MS)', name: 'Light Reaction ATP:NADPH Ratio', expr: '≈1.5:1' },
    { cat: 'Bioenergetics (BS-MS)', name: 'Chemiosmotic ATP Production (concept)', expr: 'ATP yield proportional to proton-motive force (ΔpH + Δψ)' },
    { cat: 'Taxonomy (9th-10th)', name: 'Three Domain Classification', expr: 'Bacteria, Archaea, Eukarya' },
    { cat: 'Taxonomy (9th-10th)', name: 'Binomial Name Format', expr: 'Genus (capitalized) + species (lowercase), italicized' },
    { cat: 'Basic Biology (9th-10th)', name: 'Resting Heart Rate (average)', expr: '~72 beats per minute' },
    { cat: 'Basic Biology (9th-10th)', name: 'Resting Breathing Rate (average)', expr: '~12–16 breaths per minute' },
    { cat: 'Basic Biology (9th-10th)', name: 'Blood Volume (approx)', expr: '~7% of body weight' },
    { cat: 'Basic Biology (9th-10th)', name: 'Red Blood Cell Lifespan', expr: '~120 days' },
    { cat: 'Nutrition (9th-10th)', name: 'Protein Requirement (approx)', expr: '~0.8 g/kg body weight/day' },
    { cat: 'Nutrition (9th-10th)', name: 'Body Water Content (approx)', expr: '~60% of body weight' },
    { cat: 'Nutrition (9th-10th)', name: 'Glycemic Index (concept)', expr: 'ranks carbohydrates by their effect on blood glucose' },
    { cat: 'Biostatistics (BS-MS)', name: 'Standard Deviation', expr: 'σ = √(Σ(x−x̄)²/n)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Z-score', expr: 'z = (x − μ)/σ' },
    { cat: 'Biostatistics (BS-MS)', name: 'Chi-Square Goodness of Fit', expr: 'χ² = Σ(O−E)²/E' },
    { cat: 'Biostatistics (BS-MS)', name: 'Positive Predictive Value', expr: 'PPV = TP/(TP+FP)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Negative Predictive Value', expr: 'NPV = TN/(TN+FN)' },
    { cat: 'Immunology (BS-MS)', name: 'Antibody Valency', expr: 'IgG = 2, IgM = 10 (theoretical)' },
    { cat: 'Immunology (BS-MS)', name: 'Herd Immunity Threshold', expr: 'HIT = 1 − 1/R₀' },
    { cat: 'Microbiology (BS-MS)', name: 'Multiplicity of Infection', expr: 'MOI = viral particles/number of cells' },
    { cat: 'Microbiology (BS-MS)', name: 'Plaque Forming Units', expr: 'PFU/mL = plaques × dilution factor/volume plated' },
    { cat: 'Endocrinology (BS-MS)', name: 'Insulin Resistance (HOMA-IR)', expr: 'HOMA-IR = (fasting glucose × fasting insulin)/405' },
    { cat: 'Endocrinology (BS-MS)', name: 'Thyroid Feedback (concept)', expr: 'TSH release regulated by negative feedback from T3/T4' },
    { cat: 'Neurophysiology (BS-MS)', name: 'Nerve Conduction Velocity (concept)', expr: 'distance ÷ time between stimulation and response' },
    { cat: 'Neurophysiology (BS-MS)', name: 'Action Potential Threshold (concept)', expr: 'minimum depolarization needed to trigger an action potential' },
    { cat: 'Basic Biology (9th-10th)', name: 'Cell Theory (concept)', expr: 'all living things are made of cells, the basic unit of life' },
    { cat: 'Basic Biology (9th-10th)', name: 'Homeostasis (concept)', expr: 'maintenance of stable internal conditions despite external change' },
    { cat: 'Basic Biology (9th-10th)', name: 'Photosynthesis Balanced Equation', expr: '6CO2 + 6H2O + light -> C6H12O6 + 6O2' },
    { cat: 'Basic Biology (9th-10th)', name: 'Aerobic Respiration Balanced Equation', expr: 'C6H12O6 + 6O2 -> 6CO2 + 6H2O + Energy' },
    { cat: 'Basic Biology (9th-10th)', name: 'Anaerobic Respiration (Yeast)', expr: 'C6H12O6 -> 2C2H5OH + 2CO2 + Energy' },
    { cat: 'Basic Biology (9th-10th)', name: 'Lactic Acid Fermentation', expr: 'C6H12O6 -> 2C3H6O3 + Energy' },
    { cat: 'Basic Biology (9th-10th)', name: 'Osmosis (concept)', expr: 'movement of water from high to low water potential across a semi-permeable membrane' },
    { cat: 'Basic Biology (9th-10th)', name: 'Diffusion (concept)', expr: 'net movement of particles from high to low concentration' },
    { cat: 'Basic Biology (9th-10th)', name: 'Active Transport (concept)', expr: 'movement of particles against a concentration gradient using ATP' },
    { cat: 'Basic Biology (9th-10th)', name: 'Food Chain Energy Transfer Rule', expr: 'about 10% of energy passes to the next trophic level' },
    { cat: 'Basic Biology (9th-10th)', name: 'Enzyme Classification (concept)', expr: 'oxidoreductases, transferases, hydrolases, lyases, isomerases, ligases' },
    { cat: 'Basic Biology (9th-10th)', name: 'pH of Human Blood (normal range)', expr: '7.35 - 7.45' },
    { cat: 'Basic Biology (9th-10th)', name: 'Normal Body Temperature', expr: '37 degrees C (98.6 degrees F)' },
    { cat: 'Basic Biology (9th-10th)', name: 'Menstrual Cycle Length (average)', expr: '28 days' },
    { cat: 'Basic Biology (9th-10th)', name: 'Human Chromosome Number', expr: '46 (23 pairs)' },
    { cat: 'Basic Biology (9th-10th)', name: 'Gestation Period (human, average)', expr: '~280 days (40 weeks)' },
    { cat: 'Plant Biology (9th-FSc)', name: 'Transpiration Pull (concept)', expr: 'water is pulled up the xylem due to evaporation from leaves' },
    { cat: 'Plant Biology (9th-FSc)', name: 'Translocation (concept)', expr: 'movement of sugars through phloem from source to sink' },
    { cat: 'Plant Biology (9th-FSc)', name: 'Stomatal Opening (concept)', expr: 'guard cells swell with turgor pressure to open the stomatal pore' },
    { cat: 'Plant Biology (9th-FSc)', name: 'Light Reaction (concept)', expr: 'converts light energy to ATP and NADPH in the thylakoid membrane' },
    { cat: 'Plant Biology (9th-FSc)', name: 'Calvin Cycle (Dark Reaction, concept)', expr: 'fixes CO2 into glucose using ATP and NADPH' },
    { cat: 'Plant Biology (9th-FSc)', name: 'Compensation Point (concept)', expr: 'light intensity at which photosynthesis rate equals respiration rate' },
    { cat: 'Genetics (9th-FSc)', name: 'Punnett Square Probability (Monohybrid)', expr: '3:1 phenotypic ratio for heterozygous cross' },
    { cat: 'Genetics (9th-FSc)', name: 'Sex Determination (Humans)', expr: 'XX = female, XY = male' },
    { cat: 'Genetics (9th-FSc)', name: 'Codominance (concept)', expr: 'both alleles are fully and simultaneously expressed in heterozygote' },
    { cat: 'Genetics (9th-FSc)', name: 'Incomplete Dominance (concept)', expr: 'heterozygote phenotype is a blend of both alleles' },
    { cat: 'Human Anatomy (9th-FSc)', name: 'Number of Bones (Adult Human)', expr: '206 bones' },
    { cat: 'Human Anatomy (9th-FSc)', name: 'Number of Vertebrae', expr: '33 (in a child), 26 fused in an adult' },
    { cat: 'Human Anatomy (9th-FSc)', name: 'Heart Chambers', expr: '4 (2 atria, 2 ventricles)' },
    { cat: 'Human Anatomy (9th-FSc)', name: 'Normal Resting Blood Pressure', expr: '~120/80 mmHg' },
    { cat: 'Immunology (FSc-BS)', name: 'Antibody Structure (concept)', expr: 'Y-shaped protein with 2 heavy and 2 light chains' },
    { cat: 'Immunology (FSc-BS)', name: 'Primary vs Secondary Immune Response (concept)', expr: 'secondary response is faster and stronger due to memory cells' },
    { cat: 'Microbiology (FSc-BS)', name: 'Binary Fission (concept)', expr: 'asexual reproduction where a bacterial cell divides into two identical cells' },
    { cat: 'Microbiology (FSc-BS)', name: 'Gram Staining (concept)', expr: 'differentiates bacteria based on cell wall peptidoglycan content' },
    { cat: 'Evolution (9th-FSc)', name: 'Natural Selection (concept)', expr: 'organisms best adapted to their environment survive and reproduce more' },
    { cat: 'Evolution (9th-FSc)', name: 'Survival of the Fittest (concept)', expr: 'individuals with favorable traits have a reproductive advantage' },
    { cat: 'Ecology (9th-FSc)', name: 'Food Web (concept)', expr: 'interconnected network of multiple food chains in an ecosystem' },
    { cat: 'Ecology (9th-FSc)', name: 'Ecological Pyramid (concept)', expr: 'graphical representation of energy, numbers, or biomass across trophic levels' },
    { cat: 'Ecology (9th-FSc)', name: 'Carbon Cycle (concept)', expr: 'carbon moves between atmosphere, organisms, and geosphere via respiration, photosynthesis, decomposition' },
    { cat: 'Ecology (9th-FSc)', name: 'Nitrogen Fixation (concept)', expr: 'conversion of atmospheric N2 into usable nitrogen compounds by bacteria' },
    { cat: 'Biotechnology (BS-MS)', name: 'Recombinant DNA (concept)', expr: 'DNA formed by combining genetic material from different sources' },
    { cat: 'Biotechnology (BS-MS)', name: 'Gel Electrophoresis (concept)', expr: 'separates DNA fragments by size using an electric field through a gel' },
    { cat: 'Biotechnology (BS-MS)', name: 'CRISPR-Cas9 (concept)', expr: 'guide RNA directs Cas9 enzyme to cut DNA at a specific target sequence' },
    { cat: 'Biotechnology (BS-MS)', name: 'Cloning Vector (concept)', expr: 'DNA molecule (e.g. plasmid) used to carry foreign DNA into a host cell' },
    { cat: 'Developmental Biology (BS-MS)', name: 'Cleavage (concept)', expr: 'rapid mitotic divisions of the zygote without overall growth in size' },
    { cat: 'Developmental Biology (BS-MS)', name: 'Gastrulation (concept)', expr: 'formation of the three germ layers: ectoderm, mesoderm, endoderm' },
    { cat: 'Physiology (BS-MS)', name: 'Sarcomere Contraction (concept, Sliding Filament)', expr: 'actin filaments slide over myosin filaments to shorten the sarcomere' },
    { cat: 'Physiology (BS-MS)', name: 'Reflex Arc (concept)', expr: 'receptor -> sensory neuron -> relay neuron -> motor neuron -> effector' },
    { cat: 'Physiology (BS-MS)', name: 'Synaptic Transmission (concept)', expr: 'neurotransmitter release from a presynaptic to postsynaptic neuron across a synapse' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Body Mass Index (BMI)', expr: 'BMI = Weight (kg)/Height² (m²)' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Basal Metabolic Rate (BMR) (concept)', expr: 'the amount of energy the body needs at complete rest to maintain vital functions' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Cardiac Output', expr: 'CO = Heart Rate × Stroke Volume' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Blood Pressure (concept)', expr: 'expressed as Systolic/Diastolic pressure, e.g. 120/80 mmHg' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Mean Arterial Pressure (MAP)', expr: 'MAP = Diastolic Pressure + 1/3(Systolic − Diastolic)' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Vital Capacity (Lungs)', expr: 'VC = Tidal Volume + Inspiratory Reserve Volume + Expiratory Reserve Volume' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Glomerular Filtration Rate (GFR) (concept)', expr: 'the rate at which the kidneys filter blood, used to assess kidney function' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Homeostasis (concept)', expr: 'the body\'s ability to maintain a stable internal environment despite external changes' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Reflex Arc Pathway (concept)', expr: 'the neural pathway of a reflex: receptor → sensory neuron → spinal cord → motor neuron → effector' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Action Potential (concept)', expr: 'a rapid, temporary reversal of membrane potential that transmits a nerve impulse along an axon' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Resting Membrane Potential', expr: 'approximately −70 mV in most neurons, maintained by ion gradients across the membrane' },
    { cat: 'Human Anatomy & Physiology — Extra (FSc-BS)', name: 'Synapse (concept)', expr: 'the junction where a neuron transmits an electrical or chemical signal to another cell' },

    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Photosynthesis Overall Equation', expr: '6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Cellular Respiration Overall Equation', expr: 'C₆H₁₂O₆ + 6O₂ → 6CO₂ + 6H₂O + energy (ATP)' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Transpiration Rate (concept)', expr: 'the rate of water vapor loss from a plant\'s leaves, mainly through stomata' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Water Potential', expr: 'Ψ = Ψs + Ψp, Ψs = solute potential, Ψp = pressure potential' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Osmosis (concept)', expr: 'movement of water across a semipermeable membrane from a region of high to low water potential' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Stomatal Conductance (concept)', expr: 'measures how easily gases (CO₂, water vapor) pass through the stomata' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Photosynthetic Rate (concept)', expr: 'the amount of CO₂ fixed or O₂ released by a plant per unit time' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Compensation Point (concept)', expr: 'the light intensity at which photosynthesis rate equals respiration rate, with no net gas exchange' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Phototropism (concept)', expr: 'directional growth of a plant in response to a light source, driven by auxin distribution' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Geotropism / Gravitropism (concept)', expr: 'directional growth response of a plant to gravity' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Germination Percentage', expr: 'Germination % = (Number of Seeds Germinated/Total Seeds Sown) × 100' },
    { cat: 'Botany / Plant Physiology — Extra (FSc-BS)', name: 'Leaf Area Index (LAI)', expr: 'LAI = Total Leaf Area/Ground Area Covered' },

    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Metabolic Rate vs Body Size (concept)', expr: 'larger animals generally have a lower metabolic rate per unit body mass than smaller animals' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: "Kleiber's Law", expr: 'Metabolic Rate ∝ Body Mass^(3/4)' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Countercurrent Exchange (concept)', expr: 'blood and water/air flow in opposite directions to maximize gas or heat exchange efficiency (e.g. fish gills)' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Osmoregulation (concept)', expr: 'the regulation of water and solute balance within an organism\'s body fluids' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Ectotherm vs Endotherm (concept)', expr: 'ectotherms rely on external heat sources to regulate body temperature; endotherms generate their own heat internally' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Hemoglobin Oxygen Saturation (concept)', expr: 'the percentage of hemoglobin binding sites occupied by oxygen, shown by the oxygen dissociation curve' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Molting / Ecdysis (concept)', expr: 'the periodic shedding of an exoskeleton to allow growth in arthropods' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Metamorphosis (concept)', expr: 'a biological transformation from a larval to an adult form, e.g. tadpole to frog' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Peristalsis (concept)', expr: 'wave-like muscle contractions that move food through the digestive tract' },
    { cat: 'Zoology / Animal Physiology (FSc-BS)', name: 'Digestive Efficiency', expr: 'Digestive Efficiency = (Food Consumed − Feces Produced)/Food Consumed × 100' },

    { cat: 'Cell Biology — Extra (BS)', name: 'Surface Area to Volume Ratio (Cell)', expr: 'SA:V = Surface Area/Volume, limits maximum efficient cell size' },
    { cat: 'Cell Biology — Extra (BS)', name: 'Cell Cycle Phases (concept)', expr: 'Interphase (G1, S, G2) → Mitosis (Prophase, Metaphase, Anaphase, Telophase) → Cytokinesis' },
    { cat: 'Cell Biology — Extra (BS)', name: 'Mitotic Index', expr: 'Mitotic Index = Number of Cells in Mitosis/Total Number of Cells Observed' },
    { cat: 'Cell Biology — Extra (BS)', name: 'Osmotic Pressure', expr: 'π = MRT, M = molar concentration, R = gas constant, T = temperature (Kelvin)' },
    { cat: 'Cell Biology — Extra (BS)', name: 'Diffusion Rate (concept)', expr: 'the rate at which particles move from high to low concentration, driven by the concentration gradient' },
    { cat: 'Cell Biology — Extra (BS)', name: "Fick's Law of Diffusion", expr: 'Rate ∝ (Surface Area × Concentration Difference)/Diffusion Distance' },
    { cat: 'Cell Biology — Extra (BS)', name: 'Apoptosis (concept)', expr: 'programmed cell death, a controlled process that eliminates damaged or unneeded cells' },
    { cat: 'Cell Biology — Extra (BS)', name: 'Endocytosis vs Exocytosis (concept)', expr: 'endocytosis brings material into the cell; exocytosis expels material out of the cell' },

    { cat: 'Virology (BS-MS)', name: 'Virus Structure (concept)', expr: 'consists of genetic material (DNA or RNA) enclosed in a protein coat called a capsid' },
    { cat: 'Virology (BS-MS)', name: 'Lytic Cycle (concept)', expr: 'viral replication cycle that ends with the host cell bursting (lysis), releasing new virus particles' },
    { cat: 'Virology (BS-MS)', name: 'Lysogenic Cycle (concept)', expr: 'viral DNA integrates into the host genome and replicates along with it without immediately destroying the cell' },
    { cat: 'Virology (BS-MS)', name: 'Viral Titer', expr: 'Titer = Number of Infectious Virus Particles/Volume of Sample' },
    { cat: 'Virology (BS-MS)', name: 'Basic Reproduction Number (R₀)', expr: 'R₀ = average number of secondary infections caused by one infected individual in a fully susceptible population' },
    { cat: 'Virology (BS-MS)', name: 'Herd Immunity Threshold', expr: 'HIT = 1 − 1/R₀' },
    { cat: 'Virology (BS-MS)', name: 'Multiplicity of Infection (MOI)', expr: 'MOI = Number of Infectious Virus Particles/Number of Target Cells' },
    { cat: 'Virology (BS-MS)', name: 'Antigenic Drift vs Shift (concept)', expr: 'drift is gradual mutation of viral surface proteins; shift is a sudden major genetic reassortment' },

    { cat: 'Parasitology (BS-MS)', name: 'Host-Parasite Relationship (concept)', expr: 'an interaction where the parasite benefits at the expense of the host organism' },
    { cat: 'Parasitology (BS-MS)', name: 'Definitive vs Intermediate Host (concept)', expr: 'the definitive host harbors the adult/sexual stage of a parasite; the intermediate host harbors its larval stage' },
    { cat: 'Parasitology (BS-MS)', name: 'Prevalence of Infection', expr: 'Prevalence = Number of Infected Hosts/Total Hosts Examined × 100' },
    { cat: 'Parasitology (BS-MS)', name: 'Parasite Life Cycle (concept)', expr: 'the sequence of developmental stages a parasite undergoes, often across multiple hosts' },
    { cat: 'Parasitology (BS-MS)', name: 'Vector-Borne Disease (concept)', expr: 'a disease transmitted to humans or animals by an intermediate carrier organism, such as a mosquito' },
    { cat: 'Parasitology (BS-MS)', name: 'Ectoparasite vs Endoparasite (concept)', expr: 'ectoparasites live on the host\'s body surface; endoparasites live inside the host\'s body' },

    { cat: 'Pharmacology (BS-MS)', name: 'Drug Half-Life', expr: 't½ = time required for the plasma concentration of a drug to reduce by half' },
    { cat: 'Pharmacology (BS-MS)', name: 'Bioavailability', expr: 'F = (Amount of Drug Reaching Systemic Circulation/Dose Administered) × 100' },
    { cat: 'Pharmacology (BS-MS)', name: 'Therapeutic Index', expr: 'TI = Toxic Dose (TD50)/Effective Dose (ED50)' },
    { cat: 'Pharmacology (BS-MS)', name: 'Median Effective Dose (ED50) (concept)', expr: 'the dose that produces a therapeutic effect in 50% of the population tested' },
    { cat: 'Pharmacology (BS-MS)', name: 'Median Lethal Dose (LD50) (concept)', expr: 'the dose of a substance that is lethal to 50% of a test population' },
    { cat: 'Pharmacology (BS-MS)', name: 'Drug Clearance', expr: 'Clearance = Rate of Drug Elimination/Plasma Drug Concentration' },
    { cat: 'Pharmacology (BS-MS)', name: 'Volume of Distribution (Vd)', expr: 'Vd = Total Amount of Drug in Body/Plasma Drug Concentration' },
    { cat: 'Pharmacology (BS-MS)', name: 'Agonist vs Antagonist (concept)', expr: 'an agonist binds a receptor and activates a response; an antagonist binds but blocks the response' },

    { cat: 'Reproductive Biology (FSc-BS)', name: 'Menstrual Cycle Length (concept)', expr: 'typically about 28 days, divided into follicular, ovulation, and luteal phases' },
    { cat: 'Reproductive Biology (FSc-BS)', name: 'Gestation Period (concept)', expr: 'the duration of pregnancy from fertilization to birth, about 38–40 weeks in humans' },
    { cat: 'Reproductive Biology (FSc-BS)', name: 'Fertilization (concept)', expr: 'the fusion of a sperm cell and an egg cell to form a diploid zygote' },
    { cat: 'Reproductive Biology (FSc-BS)', name: 'Spermatogenesis vs Oogenesis (concept)', expr: 'spermatogenesis produces four sperm cells; oogenesis produces one egg and polar bodies from one parent cell' },
    { cat: 'Reproductive Biology (FSc-BS)', name: 'Fecundity (concept)', expr: 'the potential reproductive capacity of an organism, measured by the number of offspring produced' },
    { cat: 'Reproductive Biology (FSc-BS)', name: 'Sexual vs Asexual Reproduction (concept)', expr: 'sexual reproduction combines genetic material from two parents; asexual reproduction produces genetically identical offspring from one parent' },
    { cat: 'Reproductive Biology (FSc-BS)', name: 'Hormonal Control of Ovulation (concept)', expr: 'a surge in Luteinizing Hormone (LH) triggers the release of an egg from the ovary' },
    { cat: 'Reproductive Biology (FSc-BS)', name: 'Placenta Function (concept)', expr: 'exchanges nutrients, gases, and waste between mother and fetus during pregnancy' },

    { cat: 'Animal Behavior / Ethology (BS-MS)', name: 'Innate vs Learned Behavior (concept)', expr: 'innate behavior is instinctive and genetically programmed; learned behavior develops through experience' },
    { cat: 'Animal Behavior / Ethology (BS-MS)', name: 'Fixed Action Pattern (concept)', expr: 'an instinctive, stereotyped behavior sequence triggered by a specific stimulus and carried out to completion' },
    { cat: 'Animal Behavior / Ethology (BS-MS)', name: 'Habituation (concept)', expr: 'a decrease in response to a repeated, harmless stimulus over time' },
    { cat: 'Animal Behavior / Ethology (BS-MS)', name: 'Classical Conditioning (concept)', expr: 'learning where a neutral stimulus becomes associated with a meaningful stimulus to trigger a response' },
    { cat: 'Animal Behavior / Ethology (BS-MS)', name: 'Territoriality (concept)', expr: 'behavior in which an animal defends a specific area against intrusion by others of its species' },
    { cat: 'Animal Behavior / Ethology (BS-MS)', name: 'Altruism in Animals (concept)', expr: 'behavior that benefits another individual at a cost to the performer, often explained by kin selection' },

    { cat: 'Conservation Biology (BS-MS)', name: 'Biodiversity Index (concept)', expr: 'a measure combining species richness and evenness to quantify biodiversity in an area' },
    { cat: 'Conservation Biology (BS-MS)', name: "Shannon Diversity Index", expr: "H' = −Σ(pᵢ × ln(pᵢ)), pᵢ = proportion of individuals of species i" },
    { cat: 'Conservation Biology (BS-MS)', name: 'Species Richness (concept)', expr: 'the total number of different species present in a given community or area' },
    { cat: 'Conservation Biology (BS-MS)', name: 'Minimum Viable Population (concept)', expr: 'the smallest population size at which a species can survive and maintain genetic diversity long-term' },
    { cat: 'Conservation Biology (BS-MS)', name: 'Habitat Fragmentation (concept)', expr: 'the breaking up of a large habitat into smaller, isolated patches, reducing species survival chances' },
    { cat: 'Conservation Biology (BS-MS)', name: 'Extinction Rate', expr: 'Extinction Rate = Number of Species Lost/Time Period' },
    { cat: 'Conservation Biology (BS-MS)', name: 'Endangered vs Threatened vs Extinct (concept)', expr: 'endangered = at high risk of extinction; threatened = likely to become endangered; extinct = no living members remain' },
    { cat: 'Conservation Biology (BS-MS)', name: 'Carrying Capacity (concept)', expr: 'the maximum population size an environment can sustainably support given its available resources' },

    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Muscle Force-Velocity Relationship (concept)', expr: 'as the load on a muscle increases, the velocity of its contraction decreases' },
    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Lever Systems in the Body (concept)', expr: 'bones act as levers, joints as fulcrums, and muscle contractions as the applied force' },
    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Bone Stress', expr: 'Stress = Force/Cross-sectional Area, used to assess bone strength under load' },
    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Gait Analysis (concept)', expr: 'the study of the mechanics and pattern of human or animal locomotion' },
    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Terminal Velocity (Falling Body) (concept)', expr: 'the constant speed reached when gravitational force is balanced by air resistance' },
    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Bioluminescence (concept)', expr: 'the production and emission of light by a living organism through a chemical reaction' },
    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Electromyography (EMG) (concept)', expr: 'a technique that records the electrical activity produced by skeletal muscles' },
    { cat: 'Biomechanics & Biophysics (BS-MS)', name: 'Metabolic Energy Cost of Movement (concept)', expr: 'the amount of energy expended by an organism to perform physical movement or exercise' },

    { cat: 'Agricultural Biology (BS-MS)', name: 'Crop Yield', expr: 'Yield = Total Production/Total Cultivated Area' },
    { cat: 'Agricultural Biology (BS-MS)', name: 'Harvest Index', expr: 'HI = Economic Yield (grain)/Total Biological Yield (plant)' },
    { cat: 'Agricultural Biology (BS-MS)', name: 'Fertilizer Use Efficiency', expr: 'FUE = Increase in Yield/Amount of Fertilizer Applied' },
    { cat: 'Agricultural Biology (BS-MS)', name: 'Water Use Efficiency (Crops)', expr: 'WUE = Crop Yield/Total Water Used' },
    { cat: 'Agricultural Biology (BS-MS)', name: 'Selective Breeding (concept)', expr: 'the process of breeding plants or animals for particular desirable genetic traits' },
    { cat: 'Agricultural Biology (BS-MS)', name: 'Crop Rotation (concept)', expr: 'growing different crops in succession on the same land to maintain soil fertility and reduce pests' },

    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Michaelis-Menten Equation', expr: 'V = (Vmax[S])/(Km + [S])' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Km (Michaelis Constant) (concept)', expr: 'the substrate concentration at which reaction velocity is half of Vmax' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Vmax (concept)', expr: 'the maximum reaction velocity reached when the enzyme is fully saturated with substrate' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Lineweaver-Burk Plot (concept)', expr: 'a double reciprocal plot of 1/V vs 1/[S] used to determine Km and Vmax graphically' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Turnover Number (kcat)', expr: 'kcat = Vmax/[E], moles of substrate converted per enzyme molecule per unit time' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Catalytic Efficiency', expr: 'Catalytic Efficiency = kcat/Km' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Competitive Inhibition (concept)', expr: 'an inhibitor binds the active site, raising the apparent Km while Vmax remains unchanged' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Non-Competitive Inhibition (concept)', expr: 'an inhibitor binds a site other than the active site, lowering Vmax while Km remains unchanged' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Q10 Temperature Coefficient', expr: 'Q10 = (Reaction Rate at T + 10°C)/(Reaction Rate at T)' },
    { cat: 'Enzyme Kinetics (BS-MS)', name: 'Enzyme Activity Unit', expr: '1 Unit (U) = amount of enzyme converting 1 µmol of substrate per minute' },

    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Incidence Rate', expr: 'Incidence = New Cases/(Population at Risk × Time)' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Prevalence', expr: 'Prevalence = Total Cases/Total Population' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Basic Reproduction Number (R0) (concept)', expr: 'the average number of secondary infections produced by one infected individual in a fully susceptible population' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Case Fatality Rate (CFR)', expr: 'CFR = (Deaths from Disease/Total Confirmed Cases) × 100' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Herd Immunity Threshold', expr: 'HIT = 1 − 1/R0' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Attack Rate', expr: 'Attack Rate = (New Cases/Population at Risk) × 100' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Mortality Rate', expr: 'Mortality Rate = (Total Deaths/Total Population) × 1000 (per 1000 population)' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Morbidity Rate (concept)', expr: 'the rate at which disease occurs within a specific population' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Relative Risk (RR)', expr: 'RR = Incidence in Exposed Group/Incidence in Unexposed Group' },
    { cat: 'Epidemiology & Public Health (BS-MS)', name: 'Odds Ratio (OR)', expr: 'OR = (a × d)/(b × c), from a 2×2 exposure-outcome contingency table' },

    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'CRISPR-Cas9 (concept)', expr: 'a gene-editing technology using a guide RNA to direct the Cas9 enzyme to cut DNA at a specific sequence' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'Restriction Enzyme (concept)', expr: 'a protein that cuts DNA at specific recognition sequences' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'Recombinant DNA (concept)', expr: 'DNA formed by artificially combining genetic material from two or more different sources' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'Gel Electrophoresis (concept)', expr: 'separates DNA, RNA, or protein fragments by size as they migrate through a gel under an electric field' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'Transformation Efficiency', expr: 'TE = Number of Colonies/Amount of DNA Used (µg)' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'Cloning Vector (concept)', expr: 'a DNA molecule such as a plasmid or virus used to carry foreign genetic material into a host cell' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'Gene Therapy (concept)', expr: 'introducing, altering, or removing genetic material within a patient\'s cells to treat or prevent disease' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'Southern Blotting (concept)', expr: 'a technique used to detect the presence of a specific DNA sequence in a sample' },
    { cat: 'Genetic Engineering & Biotechnology — Extra (BS-MS)', name: 'PCR Amplification Efficiency', expr: 'Amplification = (1 + E)ⁿ, E = efficiency, n = number of cycles' },

    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'Tumor Growth (concept)', expr: 'the increase in tumor size over time, often modeled using exponential or Gompertzian growth curves' },
    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'Tumor Doubling Time', expr: 'Td = (0.693 × t)/ln(Final Volume/Initial Volume)' },
    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'Cell Cycle Checkpoints (concept)', expr: 'G1, S, G2, and M checkpoints regulate and monitor progression through the cell cycle' },
    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'Proto-oncogene vs Tumor Suppressor Gene (concept)', expr: 'mutated proto-oncogenes (oncogenes) promote uncontrolled division; tumor suppressor genes normally restrain division' },
    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'Metastasis (concept)', expr: 'the spread of cancer cells from a primary tumor to other parts of the body' },
    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'Apoptosis (concept)', expr: 'programmed cell death that eliminates damaged or unwanted cells in a controlled manner' },
    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'Mitotic Index', expr: 'MI = (Cells in Mitosis/Total Cells Counted) × 100' },
    { cat: 'Cancer Biology / Oncology (BS-MS)', name: 'TNM Staging System (concept)', expr: 'classifies cancer severity by Tumor size (T), lymph Node involvement (N), and Metastasis (M)' },

    { cat: 'Histology (FSc-BS)', name: 'Types of Epithelial Tissue (concept)', expr: 'squamous, cuboidal, and columnar, each occurring as simple (single layer) or stratified (multiple layers)' },
    { cat: 'Histology (FSc-BS)', name: 'Connective Tissue (concept)', expr: 'tissue that supports, binds, and protects other tissues and organs, e.g. bone, cartilage, blood' },
    { cat: 'Histology (FSc-BS)', name: 'Muscle Tissue Types (concept)', expr: 'skeletal (voluntary, striated), smooth (involuntary, non-striated), cardiac (involuntary, striated)' },
    { cat: 'Histology (FSc-BS)', name: 'Nervous Tissue (concept)', expr: 'tissue made of neurons and glial cells that generates and transmits electrical signals' },
    { cat: 'Histology (FSc-BS)', name: 'Basement Membrane (concept)', expr: 'a thin extracellular layer that separates epithelial tissue from the underlying connective tissue' },
    { cat: 'Histology (FSc-BS)', name: 'H&E Staining (concept)', expr: 'Hematoxylin stains cell nuclei blue/purple; Eosin stains cytoplasm and extracellular matrix pink' },
    { cat: 'Histology (FSc-BS)', name: 'Tissue Section Thickness (Microtome)', expr: 'typically 4–10 micrometers (µm) for standard light microscopy' },
    { cat: 'Histology (FSc-BS)', name: 'Cell Density in Tissue', expr: 'Cell Density = Number of Cells/Area or Volume of Tissue' },

    { cat: 'Embryology (FSc-BS)', name: 'Fertilization (concept)', expr: 'the fusion of sperm and egg nuclei to form a diploid zygote' },
    { cat: 'Embryology (FSc-BS)', name: 'Cleavage (concept)', expr: 'rapid mitotic division of the zygote into smaller cells without an overall increase in size' },
    { cat: 'Embryology (FSc-BS)', name: 'Blastula Stage (concept)', expr: 'a hollow ball of cells formed after cleavage, enclosing a fluid-filled cavity called the blastocoel' },
    { cat: 'Embryology (FSc-BS)', name: 'Gastrulation (concept)', expr: 'the process that forms the three germ layers: ectoderm, mesoderm, and endoderm' },
    { cat: 'Embryology (FSc-BS)', name: 'Germ Layer Derivatives (concept)', expr: 'ectoderm → skin/nervous system, mesoderm → muscle/bone, endoderm → gut lining and associated organs' },
    { cat: 'Embryology (FSc-BS)', name: 'Neurulation (concept)', expr: 'the formation of the neural tube from ectoderm, which later develops into the brain and spinal cord' },
    { cat: 'Embryology (FSc-BS)', name: 'Gestation Period (concept)', expr: 'the time between fertilization and birth, which varies widely between species' },
    { cat: 'Embryology (FSc-BS)', name: 'Apgar Score (concept)', expr: 'a quick newborn health assessment based on Appearance, Pulse, Grimace, Activity, and Respiration' },

    { cat: 'Toxicology (BS-MS)', name: 'LD50 (Lethal Dose 50%) (concept)', expr: 'the dose of a substance required to kill 50% of a test population' },
    { cat: 'Toxicology (BS-MS)', name: 'LC50 (Lethal Concentration 50%) (concept)', expr: 'the concentration of a substance in air or water that kills 50% of a test population' },
    { cat: 'Toxicology (BS-MS)', name: 'Therapeutic Index', expr: 'TI = LD50/ED50 (a higher TI indicates a safer drug)' },
    { cat: 'Toxicology (BS-MS)', name: 'Dose-Response Curve (concept)', expr: 'shows the relationship between the dose of a substance and the magnitude of its biological effect' },
    { cat: 'Toxicology (BS-MS)', name: 'Bioaccumulation (concept)', expr: 'the gradual buildup of a substance in an organism faster than it can be metabolized or excreted' },
    { cat: 'Toxicology (BS-MS)', name: 'Biomagnification (concept)', expr: 'the increasing concentration of a toxin at successively higher levels of a food chain' },
    { cat: 'Toxicology (BS-MS)', name: 'Half-Life of a Toxin', expr: 't½ = time required for the concentration of a substance in the body to reduce by half' },
    { cat: 'Toxicology (BS-MS)', name: 'No Observed Adverse Effect Level (NOAEL) (concept)', expr: 'the highest tested dose of a substance at which no harmful effects are observed' },

    { cat: 'Marine Biology (BS-MS)', name: 'Salinity (concept)', expr: 'the concentration of dissolved salts in seawater, typically measured in parts per thousand (ppt)' },
    { cat: 'Marine Biology (BS-MS)', name: 'Photic Zone (concept)', expr: 'the upper layer of the ocean that receives enough sunlight to support photosynthesis' },
    { cat: 'Marine Biology (BS-MS)', name: 'Thermocline (concept)', expr: 'a layer of the ocean where temperature changes rapidly with increasing depth' },
    { cat: 'Marine Biology (BS-MS)', name: 'Primary Productivity (Ocean)', expr: 'Productivity = Rate of Carbon Fixation by Phytoplankton per Unit Area per Unit Time' },
    { cat: 'Marine Biology (BS-MS)', name: 'Coral Bleaching (concept)', expr: 'loss of symbiotic algae (zooxanthellae) from coral tissue, usually caused by stress such as rising temperature' },
    { cat: 'Marine Biology (BS-MS)', name: 'Tidal Zonation (concept)', expr: 'the distribution of marine organisms into distinct bands based on tolerance to tidal exposure' },
    { cat: 'Marine Biology (BS-MS)', name: 'Osmoregulation in Marine Organisms (concept)', expr: 'the process by which marine organisms maintain internal salt and water balance' },
    { cat: 'Marine Biology (BS-MS)', name: 'Biological Oxygen Demand (BOD) (concept)', expr: 'the amount of dissolved oxygen required by microorganisms to break down organic matter in water' },

    { cat: 'Entomology (BS-MS)', name: 'Insect Body Segments (concept)', expr: 'head, thorax, and abdomen form the three main body regions of an insect' },
    { cat: 'Entomology (BS-MS)', name: 'Metamorphosis Types (concept)', expr: 'complete metamorphosis (egg-larva-pupa-adult) vs incomplete metamorphosis (egg-nymph-adult)' },
    { cat: 'Entomology (BS-MS)', name: 'Insect Population Growth Rate', expr: 'r = (Births − Deaths)/Population Size' },
    { cat: 'Entomology (BS-MS)', name: 'Pheromone (concept)', expr: 'a chemical secreted by an insect that influences the behavior of other individuals of the same species' },
    { cat: 'Entomology (BS-MS)', name: 'Compound Eye (concept)', expr: 'an eye composed of many individual visual units (ommatidia), providing a wide field of view' },
    { cat: 'Entomology (BS-MS)', name: 'Economic Injury Level (EIL) (concept)', expr: 'the pest population density at which the cost of control equals the economic damage caused' },
    { cat: 'Entomology (BS-MS)', name: 'Insect Exoskeleton (concept)', expr: 'a hard outer covering made of chitin that supports and protects the insect\'s body' },

    { cat: 'Forensic Biology (BS-MS)', name: 'DNA Fingerprinting (concept)', expr: 'a technique used to identify individuals based on unique patterns in their DNA' },
    { cat: 'Forensic Biology (BS-MS)', name: 'Short Tandem Repeats (STR) (concept)', expr: 'short DNA sequences repeated a variable number of times, used for individual identification' },
    { cat: 'Forensic Biology (BS-MS)', name: 'Postmortem Interval Estimation (concept)', expr: 'estimating time since death using indicators such as body temperature, rigor mortis, and livor mortis' },
    { cat: 'Forensic Biology (BS-MS)', name: 'Rigor Mortis (concept)', expr: 'stiffening of muscles after death due to loss of ATP, typically beginning 2–6 hours after death' },
    { cat: 'Forensic Biology (BS-MS)', name: 'Algor Mortis', expr: 'body temperature decreases by approximately 1.5°F (0.83°C) per hour after death (average estimate)' },
    { cat: 'Forensic Biology (BS-MS)', name: 'Blood Spatter Analysis (concept)', expr: 'interpreting the pattern, shape, and size of bloodstains to reconstruct events at a crime scene' },
    { cat: 'Forensic Biology (BS-MS)', name: 'Forensic Entomology (concept)', expr: 'using insect evidence, such as maggot development stage, to estimate the time since death' },

    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Systems Biology (concept)', expr: 'an approach that studies biological systems through the interactions of their components as an integrated network' },
    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Gene Regulatory Network (concept)', expr: 'a collection of genes and regulators that interact to control gene expression levels' },
    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Biological Feedback Loop (concept)', expr: 'a mechanism where a system\'s output influences its own input, either amplifying (positive) or stabilizing (negative)' },
    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Synthetic Biology (concept)', expr: 'designing and constructing new biological parts, devices, and systems not found in nature' },
    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Metabolic Flux (concept)', expr: 'the rate of turnover of molecules through a metabolic pathway' },
    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Biological Oscillator (concept)', expr: 'a genetic circuit that produces periodic, rhythmic changes in gene expression over time' },
    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Systems Robustness (concept)', expr: 'the ability of a biological system to maintain its function despite internal or external perturbations' },
    { cat: 'Systems & Synthetic Biology (BS-MS)', name: 'Synthetic Gene Circuit (concept)', expr: 'an engineered network of genes designed to perform a specific logical function within a cell' },

    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Carbon Cycle (concept)', expr: 'the continuous movement of carbon between the atmosphere, oceans, soil, and living organisms' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Nitrogen Cycle (concept)', expr: 'the conversion of nitrogen between atmospheric, soil, and organic forms via fixation, nitrification, and denitrification' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Nitrogen Fixation (concept)', expr: 'the conversion of atmospheric nitrogen (N₂) into ammonia by bacteria or industrial processes' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Phosphorus Cycle (concept)', expr: 'the movement of phosphorus through rocks, soil, water, and living organisms, largely without an atmospheric phase' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Water (Hydrologic) Cycle (concept)', expr: 'the continuous movement of water through evaporation, condensation, precipitation, and runoff' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Carbon Footprint (concept)', expr: 'the total greenhouse gas emissions caused directly or indirectly by an individual, organization, or product' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Ecological Footprint (concept)', expr: 'the area of land and water required to sustainably support an individual\'s or population\'s resource use and waste' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Biomagnification Factor', expr: 'BMF = Concentration in Organism/Concentration in Diet' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Trophic (Ecological) Efficiency', expr: 'approximately 10% of energy is transferred from one trophic level to the next (the "10% rule")' },
    { cat: 'Biogeochemical Cycles & Environmental Biology (BS-MS)', name: 'Net Primary Productivity (NPP)', expr: 'NPP = Gross Primary Productivity (GPP) − Respiration (R)' },
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
    { cat: 'Bayesian Statistics (BS-MS)', name: 'Posterior Probability', expr: 'P(θ|x) ∝ P(x|θ)P(θ)' },
    { cat: 'Bayesian Statistics (BS-MS)', name: 'Prior Probability (concept)', expr: 'initial belief about a parameter before observing data' },
    { cat: 'Bayesian Statistics (MS)', name: 'Credible Interval (concept)', expr: 'interval containing the parameter with a given posterior probability' },
    { cat: 'Bayesian Statistics (MS)', name: 'Maximum A Posteriori Estimate', expr: 'θ_MAP = argmax P(θ|x)' },
    { cat: 'Experimental Design (BS-MS)', name: 'Randomized Block Design (concept)', expr: 'blocking controls for a known nuisance variable' },
    { cat: 'Experimental Design (BS-MS)', name: 'Factorial Design (concept)', expr: 'tests multiple factors and their interactions simultaneously' },
    { cat: 'Experimental Design (MS)', name: 'Latin Square Design (concept)', expr: 'controls for two nuisance variables using a grid layout' },
    { cat: 'Experimental Design (BS-MS)', name: 'Completely Randomized Design (concept)', expr: 'treatments assigned to units entirely at random' },
    { cat: 'Econometrics (MS)', name: 'Durbin-Watson Statistic', expr: 'd = Σ(eₜ−eₜ₋₁)²/Σeₜ²' },
    { cat: 'Econometrics (MS)', name: 'Variance Inflation Factor', expr: 'VIF = 1/(1−R²ⱼ)' },
    { cat: 'Econometrics (BS-MS)', name: 'Heteroscedasticity (concept)', expr: 'non-constant variance of residuals across observations' },
    { cat: 'Econometrics (BS-MS)', name: 'Autocorrelation (concept)', expr: 'correlation of a variable with its own lagged values' },
    { cat: 'Demography (BS-MS)', name: 'Life Expectancy (concept)', expr: 'average years remaining at a given age' },
    { cat: 'Demography (BS-MS)', name: 'Total Fertility Rate', expr: 'TFR = Σ(age-specific fertility rates) × 5' },
    { cat: 'Demography (BS-MS)', name: 'Dependency Ratio', expr: 'DR = (pop. <15 + pop. 65+)/working-age population × 100' },
    { cat: 'Demography (MS)', name: 'Net Reproduction Rate (concept)', expr: 'average number of daughters replacing each woman' },
    { cat: 'Data Science (MS)', name: 'Precision', expr: 'Precision = TP/(TP+FP)' },
    { cat: 'Data Science (MS)', name: 'Recall', expr: 'Recall = TP/(TP+FN)' },
    { cat: 'Data Science (MS)', name: 'F1 Score', expr: 'F1 = 2×(Precision×Recall)/(Precision+Recall)' },
    { cat: 'Data Science (MS)', name: 'Classification Accuracy', expr: 'Accuracy = (TP+TN)/(TP+TN+FP+FN)' },
    { cat: 'Multivariate Statistics (MS)', name: 'Mahalanobis Distance', expr: 'D² = (x−μ)ᵀΣ⁻¹(x−μ)' },
    { cat: 'Multivariate Statistics (MS)', name: 'Principal Component (concept)', expr: 'linear combination of variables capturing maximum variance' },
    { cat: 'Multivariate Statistics (MS)', name: 'Proportion of Variance Explained', expr: 'proportion = λᵢ/Σλ' },
    { cat: 'Multivariate Statistics (MS)', name: 'Factor Loading (concept)', expr: 'correlation between an observed variable and an underlying factor' },
    { cat: 'Descriptive (FSc-BS)', name: 'Trimmed Mean (concept)', expr: 'mean after removing a fixed % of extreme values' },
    { cat: 'Descriptive (FSc-BS)', name: 'Sample Coefficient of Variation', expr: 'CV = (s/x̄) × 100' },
    { cat: 'Descriptive (FSc-BS)', name: 'Range-Based SD Estimate', expr: 'σ ≈ Range/4 (rough approximation)' },
    { cat: 'Descriptive (9th-10th)', name: 'Five Number Summary', expr: 'Min, Q1, Median, Q3, Max' },
    { cat: 'Descriptive (FSc-BS)', name: 'Outlier Boundary (IQR Method)', expr: 'outlier if x < Q1−1.5·IQR or x > Q3+1.5·IQR' },
    { cat: 'Descriptive (FSc-BS)', name: 'Percentile Rank', expr: 'PR = (number of values below x/n) × 100' },
    { cat: 'Probability (FSc-BS)', name: 'Multiplication Rule (3 Independent Events)', expr: 'P(A∩B∩C) = P(A)P(B)P(C)' },
    { cat: 'Probability (FSc-BS)', name: 'Probability Tree (concept)', expr: 'branches represent sequential conditional probabilities' },
    { cat: 'Probability (FSc-BS)', name: 'Odds', expr: 'Odds = P(A)/(1−P(A))' },
    { cat: 'Probability (FSc-BS)', name: 'Union of Three Mutually Exclusive Events', expr: 'P(A∪B∪C) = P(A)+P(B)+P(C)' },
    { cat: 'Probability (BS-MS)', name: 'Expected Value of a Sum', expr: 'E(X+Y) = E(X)+E(Y)' },
    { cat: 'Probability (BS-MS)', name: 'Covariance under Independence', expr: 'if X, Y independent, Cov(X,Y) = 0' },
    { cat: 'Probability (BS-MS)', name: 'Conditional Expectation', expr: 'E(X|Y=y) = Σx·P(X=x|Y=y)' },
    { cat: 'Distributions (BS-MS)', name: 'Log-Normal Distribution Mean', expr: 'E(X) = e^(μ+σ²/2)' },
    { cat: 'Distributions (MS)', name: 'Beta Distribution Mean', expr: 'μ = α/(α+β)' },
    { cat: 'Distributions (MS)', name: 'Gamma Distribution Mean', expr: 'μ = kθ' },
    { cat: 'Distributions (MS)', name: 'Weibull Distribution (concept)', expr: 'used to model reliability and survival/failure times' },
    { cat: 'Distributions (BS-MS)', name: 'Multinomial Distribution', expr: 'P(x₁,...,xₖ) = n!/(x₁!...xₖ!) × p₁^x₁...pₖ^xₖ' },
    { cat: 'Distributions (BS-MS)', name: 'Standard Error of the Median', expr: 'SE(median) ≈ 1.2533 × σ/√n' },
    { cat: 'Correlation (BS-MS)', name: 'Point-Biserial Correlation (concept)', expr: 'correlation between a continuous and a binary variable' },
    { cat: 'Regression (BS-MS)', name: 'Regression Through the Origin', expr: 'y = bx (no intercept term)' },
    { cat: "Regression (MS)", name: "Cook's Distance (concept)", expr: 'measures the influence of a single data point on a regression fit' },
    { cat: 'Regression (MS)', name: 'Leverage (concept)', expr: 'measures how far a predictor value is from the mean of predictors' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'Critical Value (concept)', expr: 'threshold value defining the rejection region' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'One-Tailed vs Two-Tailed Test (concept)', expr: 'set by the direction of the alternative hypothesis' },
    { cat: 'Hypothesis Testing (BS-MS)', name: 'F-test for Equality of Variances', expr: 'F = s₁²/s₂²' },
    { cat: 'Hypothesis Testing (MS)', name: "McNemar's Test (concept)", expr: 'tests changes in paired categorical (before/after) data' },
    { cat: 'Hypothesis Testing (BS-MS)', name: "Effect Size (Cohen's d)", expr: 'd = (x̄₁−x̄₂)/s_pooled' },
    { cat: 'Sampling (BS-MS)', name: 'Simple Random Sampling (concept)', expr: 'every member of the population has an equal chance of selection' },
    { cat: 'Sampling (BS-MS)', name: 'Convenience Sampling (concept)', expr: 'a sample chosen based on ease of access' },
    { cat: 'Sampling (BS-MS)', name: 'Sampling Distribution of the Mean (concept)', expr: 'distribution of sample means over repeated samples' },
    { cat: 'Sampling (BS-MS)', name: 'Central Limit Theorem (concept)', expr: 'sample mean distribution approaches normal as n increases' },
    { cat: 'ANOVA (BS-MS)', name: 'Grand Mean', expr: 'x̄_G = ΣΣxᵢⱼ/N' },
    { cat: 'ANOVA (MS)', name: 'Tukey HSD Test (concept)', expr: 'post-hoc test comparing all pairs of group means' },
    { cat: 'ANOVA (BS-MS)', name: 'Eta Squared (Effect Size)', expr: 'η² = SSB/SST' },
    { cat: 'Time Series (MS)', name: 'Autoregressive Model AR(1)', expr: 'Yt = φYt₋₁ + εt' },
    { cat: 'Time Series (MS)', name: 'Exponential Trend Model', expr: 'Yt = ab^t' },
    { cat: 'Time Series (MS)', name: 'Seasonal Adjustment (Ratio-to-Moving-Average)', expr: 'SI = (Y/MA) × 100' },
    { cat: 'Index Numbers (BS-MS)', name: 'Marshall-Edgeworth Index', expr: 'ME = Σ(q₀+q₁)p₁ / Σ(q₀+q₁)p₀ × 100' },
    { cat: 'Index Numbers (BS-MS)', name: 'Consumer Price Index (concept)', expr: 'measures the average price change of a fixed basket of goods' },
    { cat: 'Index Numbers (BS-MS)', name: 'Cost of Living Index (concept)', expr: 'measures the change in cost to maintain a standard of living' },
    { cat: 'Nonparametric (BS-MS)', name: "Spearman's vs Pearson (concept)", expr: 'used for ordinal or non-linear monotonic relationships' },
    { cat: 'Nonparametric (MS)', name: 'Median Test (concept)', expr: 'compares medians of two or more independent samples' },
    { cat: 'Quality Control (BS-MS)', name: 'Range Chart Upper Control Limit', expr: 'UCL_R = D₄R̄' },
    { cat: 'Quality Control (MS)', name: 'Six Sigma Defect Rate (DPMO)', expr: 'defects per million opportunities' },
    { cat: 'Reliability (BS-MS)', name: 'Test-Retest Reliability (concept)', expr: 'correlation between scores from two administrations of the same test' },
    { cat: 'Vital Statistics (BS-MS)', name: 'General Fertility Rate', expr: 'GFR = births/women aged 15–49 × 1000' },
    { cat: 'Vital Statistics (BS-MS)', name: 'Maternal Mortality Rate', expr: 'MMR = maternal deaths/live births × 100,000' },
    { cat: 'Vital Statistics (BS-MS)', name: 'Age-Specific Death Rate', expr: 'ASDR = deaths in age group/mid-year population of age group × 1000' },
    { cat: 'Business Statistics (BS-MS)', name: 'Return on Investment (statistical)', expr: 'ROI = (Gain − Cost)/Cost × 100' },
    { cat: 'Survey Sampling (MS)', name: 'Design Effect', expr: 'DEFF = actual variance/SRS variance' },
    { cat: 'Confidence Intervals (BS-MS)', name: 'CI for Difference of Two Means', expr: '(x̄₁−x̄₂) ± t·SE' },
    { cat: 'Descriptive (9th-10th)', name: 'Arithmetic Mean (Ungrouped)', expr: 'x̄ = (Σx)/n' },
    { cat: 'Descriptive (9th-10th)', name: 'Median (Ungrouped, Odd n)', expr: 'value at position (n+1)/2' },
    { cat: 'Descriptive (9th-10th)', name: 'Median (Ungrouped, Even n)', expr: 'average of the two middle values' },
    { cat: 'Descriptive (9th-10th)', name: 'Mode (Ungrouped)', expr: 'most frequently occurring value' },
    { cat: 'Descriptive (9th-10th)', name: 'Frequency Density', expr: 'Frequency/Class Width' },
    { cat: 'Descriptive (9th-10th)', name: 'Class Boundaries', expr: 'Lower boundary = Lower limit - 0.5, Upper boundary = Upper limit + 0.5' },
    { cat: 'Descriptive (9th-10th)', name: 'Tally Marks (concept)', expr: 'method of recording data in groups of five for frequency tables' },
    { cat: 'Descriptive (9th-10th)', name: 'Pie Chart Sector Angle', expr: 'Angle = (Frequency/Total) × 360°' },
    { cat: 'Probability (FSc-BS)', name: 'Probability of Impossible Event', expr: 'P(impossible) = 0' },
    { cat: 'Probability (FSc-BS)', name: 'Probability of Certain Event', expr: 'P(certain) = 1' },
    { cat: 'Probability (FSc-BS)', name: 'Sample Space Size (Coin Tosses)', expr: 'n(S) = 2ⁿ for n coin tosses' },
    { cat: 'Probability (FSc-BS)', name: 'Sample Space Size (Dice Rolls)', expr: 'n(S) = 6ⁿ for n dice rolls' },
    { cat: 'Multivariate Statistics (MS)', name: 'MANOVA Wilks Lambda (concept)', expr: 'ratio of within-group to total variance-covariance determinants' },
    { cat: 'Survival Analysis (MS)', name: 'Survival Function', expr: 'S(t) = P(T > t)' },
    { cat: 'Survival Analysis (MS)', name: 'Hazard Function', expr: 'h(t) = f(t)/S(t)' },
    { cat: 'Survival Analysis (MS)', name: 'Kaplan-Meier Estimator (concept)', expr: 'nonparametric estimate of the survival function from observed lifetimes' },
    { cat: 'Resampling Methods (MS)', name: 'Bootstrap Estimate (concept)', expr: 'repeated resampling with replacement to estimate a statistics distribution' },
    { cat: 'Resampling Methods (MS)', name: 'Jackknife Estimate (concept)', expr: 'leave-one-out resampling to estimate bias and variance' },
    { cat: 'Machine Learning Stats (MS)', name: 'AIC (Akaike Information Criterion)', expr: 'AIC = 2k − 2ln(L)' },
    { cat: 'Machine Learning Stats (MS)', name: 'BIC (Bayesian Information Criterion)', expr: 'BIC = k ln(n) − 2ln(L)' },
    { cat: 'Machine Learning Stats (MS)', name: 'ROC Curve AUC (concept)', expr: 'area under the true positive vs false positive rate curve' },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Chi-Square Statistic', expr: 'χ² = Σ(Oᵢ − Eᵢ)²/Eᵢ, O = observed, E = expected' },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Chi-Square Test for Independence (concept)', expr: 'tests whether two categorical variables are associated using a contingency table' },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Chi-Square Test for Goodness of Fit (concept)', expr: 'tests whether observed frequencies match an expected theoretical distribution' },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Expected Frequency (Contingency Table)', expr: 'Eᵢⱼ = (Row Total × Column Total)/Grand Total' },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Degrees of Freedom (Chi-Square Independence)', expr: 'df = (r − 1)(c − 1), r = rows, c = columns' },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Degrees of Freedom (Chi-Square Goodness of Fit)', expr: 'df = k − 1, k = number of categories' },
    { cat: 'Chi-Square Tests (BS-MS)', name: "Yates's Continuity Correction", expr: 'χ² = Σ(|Oᵢ − Eᵢ| − 0.5)²/Eᵢ, used for 2×2 tables' },
    { cat: 'Chi-Square Tests (BS-MS)', name: "Cramér's V (Effect Size)", expr: "V = √(χ²/(n × min(r−1, c−1)))" },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Phi Coefficient', expr: 'φ = √(χ²/n), used for 2×2 contingency tables' },
    { cat: 'Chi-Square Tests (BS-MS)', name: 'Chi-Square Test for Variance', expr: 'χ² = (n − 1)s²/σ₀²' },

    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Range', expr: 'Range = Maximum value − Minimum value' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Mean Absolute Deviation (MAD)', expr: 'MAD = Σ|xᵢ − x̄|/n' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Coefficient of Range', expr: 'CR = (Max − Min)/(Max + Min) × 100' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Coefficient of Mean Deviation', expr: 'CMD = MAD/Mean × 100' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Quartile Deviation', expr: 'QD = (Q₃ − Q₁)/2' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Coefficient of Quartile Deviation', expr: 'CQD = (Q₃ − Q₁)/(Q₃ + Q₁) × 100' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Combined Mean of Two Groups', expr: 'x̄_c = (n₁x̄₁ + n₂x̄₂)/(n₁ + n₂)' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Combined Variance of Two Groups', expr: 's²_c = [n₁(s₁² + d₁²) + n₂(s₂² + d₂²)]/(n₁+n₂), where dᵢ = x̄ᵢ − x̄_c' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Relative Standard Deviation', expr: 'RSD = (Standard Deviation/Mean) × 100' },
    { cat: 'Measures of Dispersion — Extra (9th-BS)', name: 'Interquartile Range (IQR)', expr: 'IQR = Q₃ − Q₁' },

    { cat: 'Probability — Extra (FSc-BS)', name: 'Conditional Probability', expr: 'P(A|B) = P(A ∩ B)/P(B)' },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Multiplication Rule (Independent Events)', expr: 'P(A ∩ B) = P(A) × P(B)' },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Multiplication Rule (Dependent Events)', expr: 'P(A ∩ B) = P(A) × P(B|A)' },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Addition Rule (Mutually Exclusive)', expr: 'P(A ∪ B) = P(A) + P(B)' },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Addition Rule (Not Mutually Exclusive)', expr: 'P(A ∪ B) = P(A) + P(B) − P(A ∩ B)' },
    { cat: 'Probability — Extra (FSc-BS)', name: "Bayes' Theorem", expr: 'P(A|B) = [P(B|A) × P(A)]/P(B)' },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Law of Total Probability', expr: 'P(B) = ΣP(B|Aᵢ) × P(Aᵢ)' },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Complement Rule', expr: "P(A') = 1 − P(A)" },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Odds in Favor of an Event', expr: 'Odds = P(A)/(1 − P(A))' },
    { cat: 'Probability — Extra (FSc-BS)', name: 'Expected Value (Discrete Random Variable)', expr: 'E(X) = Σxᵢ × P(xᵢ)' },

    { cat: 'Biostatistics (BS-MS)', name: 'Incidence Rate', expr: 'Incidence Rate = New Cases in Period/Population at Risk × Time' },
    { cat: 'Biostatistics (BS-MS)', name: 'Prevalence Rate', expr: 'Prevalence = Total Cases at a Point in Time/Total Population × 100' },
    { cat: 'Biostatistics (BS-MS)', name: 'Sensitivity (Medical Test)', expr: 'Sensitivity = True Positives/(True Positives + False Negatives)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Specificity (Medical Test)', expr: 'Specificity = True Negatives/(True Negatives + False Positives)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Positive Predictive Value (PPV)', expr: 'PPV = True Positives/(True Positives + False Positives)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Negative Predictive Value (NPV)', expr: 'NPV = True Negatives/(True Negatives + False Negatives)' },
    { cat: 'Biostatistics (BS-MS)', name: 'Relative Risk (RR)', expr: 'RR = Incidence in Exposed Group/Incidence in Unexposed Group' },
    { cat: 'Biostatistics (BS-MS)', name: 'Odds Ratio (OR)', expr: 'OR = (a×d)/(b×c), from a 2×2 exposure-outcome table' },
    { cat: 'Biostatistics (BS-MS)', name: 'Number Needed to Treat (NNT)', expr: 'NNT = 1/Absolute Risk Reduction' },
    { cat: 'Biostatistics (BS-MS)', name: 'Case Fatality Rate', expr: 'CFR = Deaths from Disease/Total Diagnosed Cases × 100' },

    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Pure Premium', expr: 'Pure Premium = Total Losses/Number of Exposure Units' },
    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Loss Ratio', expr: 'Loss Ratio = Total Claims Paid/Total Premiums Earned × 100' },
    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Probability of Survival', expr: 'ₙpₓ = probability a person aged x survives n more years' },
    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Probability of Death', expr: 'qₓ = probability a person aged x dies within one year' },
    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Expected Loss (Insurance)', expr: 'Expected Loss = Probability of Claim × Claim Amount' },
    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Present Value of an Annuity', expr: 'PV = Payment × [1 − (1+r)^−n]/r' },
    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Combined Ratio (Insurance)', expr: 'Combined Ratio = Loss Ratio + Expense Ratio' },
    { cat: 'Actuarial & Insurance Statistics (BS-MS)', name: 'Mortality Rate', expr: 'Mortality Rate = Deaths in Period/Mid-Period Population × 1000' },

    { cat: 'Statistical Computing (BS-MS)', name: 'p-value (concept)', expr: 'the probability of observing results as extreme as the sample, assuming the null hypothesis is true' },
    { cat: 'Statistical Computing (BS-MS)', name: 'Statistical Software (concept)', expr: 'R, SPSS, Python (pandas/scipy), and Excel are commonly used tools for statistical analysis' },
    { cat: 'Statistical Computing (BS-MS)', name: 'Random Number Generation (concept)', expr: 'algorithms that produce sequences of numbers approximating true statistical randomness' },
    { cat: 'Statistical Computing (BS-MS)', name: 'Simulation (Monte Carlo) (concept)', expr: 'uses repeated random sampling to estimate the probability of different outcomes' },
    { cat: 'Statistical Computing (BS-MS)', name: 'Data Visualization — Boxplot (concept)', expr: 'displays median, quartiles, and outliers of a dataset in one summary chart' },
    { cat: 'Statistical Computing (BS-MS)', name: 'Data Visualization — Histogram (concept)', expr: 'shows the frequency distribution of continuous data divided into intervals (bins)' },
    { cat: 'Statistical Computing (BS-MS)', name: 'Outlier Detection (IQR Method)', expr: 'a value is an outlier if it is below Q₁ − 1.5×IQR or above Q₃ + 1.5×IQR' },
    { cat: 'Statistical Computing (BS-MS)', name: 'Z-Score Outlier Detection', expr: 'a value is typically flagged as an outlier if |z-score| > 3' },

    { cat: 'Missing Data & Data Cleaning (BS-MS)', name: 'Missing Completely at Random (MCAR) (concept)', expr: 'the probability of missing data is unrelated to any observed or unobserved values' },
    { cat: 'Missing Data & Data Cleaning (BS-MS)', name: 'Missing at Random (MAR) (concept)', expr: 'the probability of missing data depends only on observed data, not the missing values themselves' },
    { cat: 'Missing Data & Data Cleaning (BS-MS)', name: 'Mean Imputation (concept)', expr: 'replaces missing values with the mean of the observed values for that variable' },
    { cat: 'Missing Data & Data Cleaning (BS-MS)', name: 'Listwise Deletion (concept)', expr: 'removes an entire record from analysis if any of its values are missing' },
    { cat: 'Missing Data & Data Cleaning (BS-MS)', name: 'Multiple Imputation (concept)', expr: 'creates several plausible imputed datasets and combines results to account for missing-data uncertainty' },
    { cat: 'Missing Data & Data Cleaning (BS-MS)', name: 'Winsorization (concept)', expr: 'limits extreme values by capping them at a specified percentile instead of removing them' },

    { cat: 'Meta-Analysis (MS)', name: 'Meta-Analysis (concept)', expr: 'statistically combines results from multiple independent studies to estimate an overall effect' },
    { cat: 'Meta-Analysis (MS)', name: 'Fixed-Effects Model (concept)', expr: 'assumes all studies share one true effect size, differing only by sampling error' },
    { cat: 'Meta-Analysis (MS)', name: 'Random-Effects Model (concept)', expr: 'assumes true effect sizes vary across studies, adding between-study variance to the estimate' },
    { cat: 'Meta-Analysis (MS)', name: 'Forest Plot (concept)', expr: 'a graphical display showing effect sizes and confidence intervals from multiple studies' },
    { cat: 'Meta-Analysis (MS)', name: 'Publication Bias (concept)', expr: 'the tendency for studies with significant/positive results to be published more often than null results' },
    { cat: 'Meta-Analysis (MS)', name: 'Heterogeneity (I² Statistic) (concept)', expr: 'measures the percentage of variation across studies due to true differences rather than chance' },

    { cat: 'Spatial Statistics (MS)', name: 'Spatial Autocorrelation (concept)', expr: 'measures how similar nearby locations are with respect to a given variable' },
    { cat: 'Spatial Statistics (MS)', name: "Moran's I", expr: "measures spatial autocorrelation; values range from −1 (dispersed) to +1 (clustered)" },
    { cat: 'Spatial Statistics (MS)', name: 'Kriging (concept)', expr: 'a geostatistical interpolation method that estimates values at unsampled locations' },
    { cat: 'Spatial Statistics (MS)', name: 'Spatial Weight Matrix (concept)', expr: 'defines the spatial relationships/neighbors between locations in a dataset' },
    { cat: 'Spatial Statistics (MS)', name: 'Hotspot Analysis (concept)', expr: 'identifies statistically significant spatial clusters of high or low values' },
    { cat: 'Spatial Statistics (MS)', name: 'Nearest Neighbor Index', expr: 'NNI = Observed Mean Distance/Expected Mean Distance (for random distribution)' },

    { cat: 'Generalized Linear Models (MS)', name: 'Generalized Linear Model (GLM) (concept)', expr: 'extends linear regression to allow response variables with non-normal error distributions' },
    { cat: 'Generalized Linear Models (MS)', name: 'Logistic Regression Model', expr: 'log(p/(1−p)) = β₀ + β₁x₁ + ... + βₙxₙ' },
    { cat: 'Generalized Linear Models (MS)', name: 'Odds from Logistic Regression', expr: 'Odds = e^(β₀ + β₁x₁ + ...)' },
    { cat: 'Generalized Linear Models (MS)', name: 'Poisson Regression Model', expr: 'log(λ) = β₀ + β₁x₁ + ... + βₙxₙ, models count data' },
    { cat: 'Generalized Linear Models (MS)', name: 'Link Function (concept)', expr: 'connects the linear predictor to the mean of the response variable\'s distribution' },
    { cat: 'Generalized Linear Models (MS)', name: 'Deviance (GLM)', expr: 'measures the goodness of fit of a GLM; lower deviance indicates a better fit' },
    { cat: 'Generalized Linear Models (MS)', name: 'Multicollinearity (concept)', expr: 'occurs when two or more predictor variables are highly correlated, destabilizing regression estimates' },
    { cat: 'Generalized Linear Models (MS)', name: 'Variance Inflation Factor (VIF)', expr: 'VIF = 1/(1 − R²ᵢ), measures multicollinearity for predictor i' },

    { cat: 'Panel & Longitudinal Data (MS)', name: 'Panel Data (concept)', expr: 'data collected on the same subjects/entities across multiple time periods' },
    { cat: 'Panel & Longitudinal Data (MS)', name: 'Fixed Effects Model (concept)', expr: 'controls for unobserved, time-invariant characteristics unique to each entity in panel data' },
    { cat: 'Panel & Longitudinal Data (MS)', name: 'Random Effects Model (concept)', expr: 'assumes entity-specific effects are uncorrelated with the independent variables' },
    { cat: 'Panel & Longitudinal Data (MS)', name: 'Within-Group Estimator (concept)', expr: 'estimates effects using deviations of each variable from its entity-specific mean' },
    { cat: 'Panel & Longitudinal Data (MS)', name: 'Hausman Test (concept)', expr: 'tests whether fixed effects or random effects is the more appropriate panel data model' },
    { cat: 'Panel & Longitudinal Data (MS)', name: 'Autocorrelation in Time Series (concept)', expr: 'measures how correlated a variable is with its own past values' },

    { cat: 'Quality Control — Extra (BS-MS)', name: 'Process Capability Index (Cp)', expr: 'Cp = (USL − LSL)/6σ' },
    { cat: 'Quality Control — Extra (BS-MS)', name: 'Process Capability Index (Cpk)', expr: 'Cpk = min[(USL − μ)/3σ, (μ − LSL)/3σ]' },
    { cat: 'Quality Control — Extra (BS-MS)', name: 'Control Chart Upper Control Limit (X-bar Chart)', expr: 'UCL = x̄̄ + A₂R̄' },
    { cat: 'Quality Control — Extra (BS-MS)', name: 'Control Chart Lower Control Limit (X-bar Chart)', expr: 'LCL = x̄̄ − A₂R̄' },
    { cat: 'Quality Control — Extra (BS-MS)', name: 'Sigma Level (concept)', expr: 'measures process capability in terms of standard deviations that fit between the mean and spec limits' },
    { cat: 'Quality Control — Extra (BS-MS)', name: 'Defects Per Unit (DPU)', expr: 'DPU = Total Defects/Total Units Produced' },

    { cat: 'Categorical Data Analysis (BS-MS)', name: 'Contingency Table (concept)', expr: 'a table displaying the frequency distribution of two or more categorical variables' },
    { cat: 'Categorical Data Analysis (BS-MS)', name: 'Marginal Frequency', expr: 'the row or column totals in a contingency table' },
    { cat: 'Categorical Data Analysis (BS-MS)', name: 'Relative Risk vs Odds Ratio (concept)', expr: 'relative risk compares probabilities directly; odds ratio compares the odds of an event between groups' },
    { cat: 'Categorical Data Analysis (BS-MS)', name: "Cohen's Kappa (Inter-rater Agreement)", expr: 'κ = (Observed Agreement − Expected Agreement)/(1 − Expected Agreement)' },
    { cat: 'Categorical Data Analysis (BS-MS)', name: 'Log-Linear Model (concept)', expr: 'models the expected cell frequencies of a contingency table as a linear function of category effects' },
    { cat: 'Categorical Data Analysis (BS-MS)', name: 'Ordinal vs Nominal Data (concept)', expr: 'ordinal data has a meaningful order (e.g. ratings); nominal data has categories with no inherent order' },
    { cat: 'Sports Statistics (BS)', name: 'Batting Average (Cricket)', expr: 'Average = Total Runs Scored/Number of Times Out' },
    { cat: 'Sports Statistics (BS)', name: 'Bowling Average (Cricket)', expr: 'Average = Total Runs Conceded/Total Wickets Taken' },
    { cat: 'Sports Statistics (BS)', name: 'Strike Rate (Cricket)', expr: 'Strike Rate = (Runs Scored/Balls Faced) × 100' },
    { cat: 'Sports Statistics (BS)', name: 'Win Percentage', expr: 'Win % = (Games Won/Total Games Played) × 100' },
    { cat: 'Sports Statistics (BS)', name: 'Net Run Rate (Cricket)', expr: 'NRR = (Runs Scored/Overs Faced) − (Runs Conceded/Overs Bowled)' },
    { cat: 'Sports Statistics (BS)', name: 'Player Efficiency Rating (concept)', expr: 'a composite statistic summarizing a player\'s overall per-minute productivity' },

    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Test Reliability (concept)', expr: 'the consistency of a test\'s results across repeated administrations or items' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: "Cronbach's Alpha", expr: 'α = (k/(k−1))(1 − ΣVarianceᵢ/VarianceTotal), k = number of items, measures internal consistency' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Test Validity (concept)', expr: 'the degree to which a test accurately measures what it claims to measure' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Item Difficulty Index', expr: 'p = Number of Students Answering Correctly/Total Number of Students' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Item Discrimination Index', expr: 'D = (Correct in Upper Group − Correct in Lower Group)/Number in Each Group' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Standard Error of Measurement', expr: 'SEM = SD × √(1 − Reliability)' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Percentile Rank', expr: 'Percentile Rank = (Number of Scores Below X/Total Number of Scores) × 100' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Grade Equivalent Score (concept)', expr: 'a score expressing a student\'s performance in terms of a typical grade level' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Standardized Score (T-score)', expr: 'T = 50 + 10 × z-score' },
    { cat: 'Educational Statistics / Psychometrics (BS-MS)', name: 'Norm-Referenced vs Criterion-Referenced Test (concept)', expr: 'norm-referenced compares a student to peers; criterion-referenced compares against a fixed standard' },

    { cat: 'Environmental Statistics (BS-MS)', name: 'Air Quality Index (AQI) (concept)', expr: 'a standardized indicator summarizing pollutant concentration levels for public health reporting' },
    { cat: 'Environmental Statistics (BS-MS)', name: 'Pollution Index', expr: 'Pollution Index = Measured Concentration/Permissible Standard Limit' },
    { cat: 'Environmental Statistics (BS-MS)', name: 'Environmental Trend Analysis (concept)', expr: 'statistical methods used to detect long-term changes in environmental variables over time' },
    { cat: 'Environmental Statistics (BS-MS)', name: 'Return Period (Extreme Events)', expr: 'Return Period = 1/Probability of Exceedance per Year' },
    { cat: 'Environmental Statistics (BS-MS)', name: 'Carbon Footprint Estimation (concept)', expr: 'the total greenhouse gas emissions caused directly or indirectly by an activity or entity' },
    { cat: 'Environmental Statistics (BS-MS)', name: 'Species Abundance Estimation (concept)', expr: 'statistical sampling methods used to estimate population sizes of species in an ecosystem' },

    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Value at Risk (VaR) (concept)', expr: 'estimates the maximum expected loss of an investment over a given time period at a set confidence level' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Sharpe Ratio', expr: 'Sharpe Ratio = (Return − Risk-Free Rate)/Standard Deviation of Return' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Beta Coefficient (Finance)', expr: 'β = Covariance(Stock, Market)/Variance(Market)' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Portfolio Variance (Two Assets)', expr: 'σp² = w1²σ1² + w2²σ2² + 2w1w2Cov(1,2)' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Expected Portfolio Return', expr: 'E(Rp) = w1E(R1) + w2E(R2)' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Standard Deviation as Risk Measure (concept)', expr: 'measures the volatility/dispersion of investment returns around their mean' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Coefficient of Variation (Risk per Unit Return)', expr: 'CV = Standard Deviation/Expected Return' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Monte Carlo Simulation in Finance (concept)', expr: 'uses repeated random sampling to model the probability of different financial outcomes' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Credit Scoring Model (concept)', expr: 'a statistical model that estimates the probability a borrower will default on a loan' },
    { cat: 'Financial & Risk Statistics (BS-MS)', name: 'Compound Annual Growth Rate (CAGR)', expr: 'CAGR = (Ending Value/Beginning Value)^(1/n) − 1' },

    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Ogive (Cumulative Frequency Curve) (concept)', expr: 'a graph plotting cumulative frequency against the upper class boundaries of a distribution' },
    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Stem-and-Leaf Plot (concept)', expr: 'displays data by splitting each value into a "stem" (leading digits) and a "leaf" (last digit)' },
    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Pie Chart Angle', expr: 'Angle = (Category Frequency/Total Frequency) × 360°' },
    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Frequency Polygon (concept)', expr: 'a line graph formed by connecting the midpoints of the tops of a histogram\'s bars' },
    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Scatter Plot (concept)', expr: 'a graph displaying paired data points to visualize the relationship between two variables' },
    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Pareto Chart (concept)', expr: 'a bar chart combined with a cumulative line graph, highlighting the most significant factors in a dataset' },
    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Class Boundaries', expr: 'Class Boundary = (Upper Limit of one class + Lower Limit of next class)/2' },
    { cat: 'Statistical Graphs — Extra (9th-FSc)', name: 'Class Width', expr: 'Class Width = Upper Class Boundary − Lower Class Boundary' },

    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: "Pearson's First Coefficient of Skewness", expr: 'Sk = (Mean − Mode)/Standard Deviation' },
    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: "Pearson's Second Coefficient of Skewness", expr: 'Sk = 3(Mean − Median)/Standard Deviation' },
    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: 'Bowley\'s Coefficient of Skewness', expr: 'Sk = (Q3 + Q1 − 2Q2)/(Q3 − Q1)' },
    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: 'Kurtosis (concept)', expr: 'measures the "tailedness" or peakedness of a probability distribution relative to a normal distribution' },
    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: 'Excess Kurtosis', expr: 'Excess Kurtosis = Kurtosis − 3 (relative to normal distribution)' },
    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: 'Leptokurtic vs Platykurtic (concept)', expr: 'leptokurtic distributions have sharper peaks and fatter tails; platykurtic have flatter peaks and thinner tails' },
    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: 'Positively vs Negatively Skewed (concept)', expr: 'positive skew has a longer tail to the right; negative skew has a longer tail to the left' },
    { cat: 'Skewness & Kurtosis — Extra (FSc-BS)', name: 'Moment Coefficient of Skewness', expr: 'γ1 = m3/m2^(3/2), m2 and m3 are the 2nd and 3rd central moments' },

    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Residual (Regression)', expr: 'Residual = Observed Value − Predicted Value' },
    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Standard Error of Estimate', expr: 'SEE = √(Σ(y − ŷ)²/(n − 2))' },
    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Coefficient of Determination (R²)', expr: 'R² = 1 − (SS_residual/SS_total)' },
    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Adjusted R²', expr: 'Adj R² = 1 − [(1 − R²)(n − 1)/(n − k − 1)], k = number of predictors' },
    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Homoscedasticity (concept)', expr: 'the assumption that residuals have constant variance across all levels of the independent variable' },
    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Heteroscedasticity (concept)', expr: 'occurs when the variance of residuals is not constant, violating a key regression assumption' },
    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Durbin-Watson Statistic (concept)', expr: 'tests for autocorrelation in the residuals of a regression analysis' },
    { cat: 'Regression Diagnostics — Extra (BS)', name: 'Outlier vs Leverage vs Influence Point (concept)', expr: 'an outlier has an unusual Y value; a leverage point has an unusual X value; an influence point notably changes the regression line' },

    { cat: 'Sampling Distributions (BS-MS)', name: 'Central Limit Theorem (concept)', expr: 'as sample size increases, the sampling distribution of the mean approaches a normal distribution' },
    { cat: 'Sampling Distributions (BS-MS)', name: 'Standard Error of the Mean', expr: 'SE = σ/√n' },
    { cat: 'Sampling Distributions (BS-MS)', name: 'Standard Error of the Proportion', expr: 'SE = √(p(1−p)/n)' },
    { cat: 'Sampling Distributions (BS-MS)', name: 'Sampling Distribution (concept)', expr: 'the probability distribution of a given statistic based on many random samples from a population' },
    { cat: 'Sampling Distributions (BS-MS)', name: 'Finite Population Correction Factor', expr: 'FPC = √((N − n)/(N − 1))' },
    { cat: 'Sampling Distributions (BS-MS)', name: 'Degrees of Freedom (t-distribution)', expr: 'df = n − 1, for a one-sample t-test' },
    { cat: 'Sampling Distributions (BS-MS)', name: 'Sample Size Determination (Mean)', expr: 'n = (Z × σ/E)², E = margin of error' },
    { cat: 'Sampling Distributions (BS-MS)', name: 'Sample Size Determination (Proportion)', expr: 'n = Z² × p(1−p)/E²' },

    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Mann-Whitney U Test (concept)', expr: 'a nonparametric test comparing differences between two independent groups using ranked data' },
    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Wilcoxon Signed-Rank Test (concept)', expr: 'a nonparametric test comparing two related samples or repeated measurements on a single sample' },
    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Kruskal-Wallis Test (concept)', expr: 'a nonparametric alternative to one-way ANOVA for comparing three or more independent groups' },
    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Spearman\'s Rank Correlation', expr: 'rs = 1 − (6Σd²)/(n(n² − 1)), d = difference between ranks' },
    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Sign Test (concept)', expr: 'a simple nonparametric test that uses the sign (positive/negative) of differences between paired observations' },
    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Runs Test for Randomness (concept)', expr: 'tests whether a sequence of data occurs in a random order' },
    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Kolmogorov-Smirnov Test (concept)', expr: 'compares a sample distribution with a reference distribution, or compares two sample distributions' },
    { cat: 'Nonparametric Methods — Extra (BS-MS)', name: 'Kendall\'s Tau (concept)', expr: 'a nonparametric measure of the ordinal association between two ranked variables' },

    { cat: 'Text & NLP Statistics (BS-MS)', name: 'Term Frequency (TF)', expr: 'TF = Number of times a term appears in a document/Total number of terms in that document' },
    { cat: 'Text & NLP Statistics (BS-MS)', name: 'Inverse Document Frequency (IDF)', expr: 'IDF = log(Total Documents/Documents Containing the Term)' },
    { cat: 'Text & NLP Statistics (BS-MS)', name: 'TF-IDF Score', expr: 'TF-IDF = TF × IDF' },
    { cat: 'Text & NLP Statistics (BS-MS)', name: 'Word Frequency Distribution (concept)', expr: 'follows Zipf\'s Law — a word\'s frequency is inversely proportional to its rank in the frequency table' },
    { cat: 'Text & NLP Statistics (BS-MS)', name: 'Jaccard Similarity', expr: 'J(A,B) = |A ∩ B|/|A ∪ B|' },
    { cat: 'Text & NLP Statistics (BS-MS)', name: 'Sentiment Score (concept)', expr: 'a numeric value representing the positive, negative, or neutral tone of a piece of text' },

    { cat: 'Queueing Theory (BS-MS)', name: 'Arrival Rate (λ) (concept)', expr: 'the average number of customers/requests arriving at a system per unit time' },
    { cat: 'Queueing Theory (BS-MS)', name: 'Service Rate (μ) (concept)', expr: 'the average number of customers a server can process per unit time' },
    { cat: 'Queueing Theory (BS-MS)', name: 'Traffic Intensity (ρ)', expr: 'ρ = λ/μ' },
    { cat: 'Queueing Theory (BS-MS)', name: 'Average Number in System (M/M/1 Queue)', expr: 'L = ρ/(1 − ρ)' },
    { cat: 'Queueing Theory (BS-MS)', name: 'Average Waiting Time in Queue (M/M/1)', expr: 'Wq = ρ/(μ − λ)' },
    { cat: 'Queueing Theory (BS-MS)', name: "Little's Law", expr: 'L = λW, L = average number in system, W = average time in system' },

    { cat: 'Stochastic Processes (MS)', name: 'Stochastic Process (concept)', expr: 'a collection of random variables representing the evolution of a system over time' },
    { cat: 'Stochastic Processes (MS)', name: 'Markov Chain (concept)', expr: 'a stochastic process where the next state depends only on the current state, not the sequence of prior states' },
    { cat: 'Stochastic Processes (MS)', name: 'Transition Probability Matrix (concept)', expr: 'a matrix giving the probabilities of moving from each state to every other state in one step' },
    { cat: 'Stochastic Processes (MS)', name: 'Stationary Distribution (Markov Chain) (concept)', expr: 'a probability distribution that remains unchanged as the Markov chain evolves over time' },
    { cat: 'Stochastic Processes (MS)', name: 'Poisson Process (concept)', expr: 'a stochastic process counting random events occurring independently at a constant average rate' },
    { cat: 'Stochastic Processes (MS)', name: 'Random Walk (concept)', expr: 'a mathematical path formed by a sequence of random steps, used to model many stochastic phenomena' },
    { cat: 'Stochastic Processes (MS)', name: 'Brownian Motion (Statistical) (concept)', expr: 'a continuous-time stochastic process modeling random, erratic movement, key in financial modeling' },
    { cat: 'Stochastic Processes (MS)', name: 'Ergodicity (concept)', expr: 'a property where a process\'s time average equals its ensemble average over the long run' },

    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Completely Randomized Design (CRD) (concept)', expr: 'treatments are assigned to experimental units entirely at random, with no additional grouping' },
    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Randomized Block Design (RBD) (concept)', expr: 'experimental units are grouped into blocks of similar units before randomly assigning treatments within each block' },
    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Latin Square Design (concept)', expr: 'controls for two blocking factors simultaneously by arranging treatments so each appears once per row and column' },
    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Factorial Design (concept)', expr: 'studies the effect of two or more factors simultaneously, including their interactions' },
    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Main Effect (concept)', expr: 'the average effect of a factor on the response variable, averaged across levels of other factors' },
    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Interaction Effect (concept)', expr: 'occurs when the effect of one factor on the response depends on the level of another factor' },
    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Replication (concept)', expr: 'repeating an experiment to increase precision and allow estimation of experimental error' },
    { cat: 'Design of Experiments — Extra (BS-MS)', name: 'Blocking (concept)', expr: 'grouping similar experimental units together to reduce the effect of known sources of variability' },
    { cat: 'Order Statistics (BS-MS)', name: 'Order Statistics (concept)', expr: 'the values of a sample arranged in ascending order, denoted X(1) ≤ X(2) ≤ ... ≤ X(n)' },
    { cat: 'Order Statistics (BS-MS)', name: 'Sample Minimum', expr: 'X(1) = the smallest value in the ordered sample' },
    { cat: 'Order Statistics (BS-MS)', name: 'Sample Maximum', expr: 'X(n) = the largest value in the ordered sample' },
    { cat: 'Order Statistics (BS-MS)', name: 'Sample Range (Order Statistics)', expr: 'Range = X(n) − X(1)' },
    { cat: 'Order Statistics (BS-MS)', name: 'Median from Order Statistics (Odd n)', expr: 'Median = X((n+1)/2)' },
    { cat: 'Order Statistics (BS-MS)', name: 'Median from Order Statistics (Even n)', expr: 'Median = [X(n/2) + X(n/2 + 1)]/2' },
    { cat: 'Order Statistics (BS-MS)', name: 'Rank of a Value', expr: 'the position of a value when the dataset is sorted in ascending order' },
    { cat: 'Order Statistics (BS-MS)', name: 'Percentile Formula', expr: 'Pₖ position = (k/100) × (n + 1), k = desired percentile' },


    { cat: 'Six Sigma / DMAIC (BS-MS)', name: 'DMAIC (concept)', expr: 'Define, Measure, Analyze, Improve, Control — a structured process improvement methodology' },
    { cat: 'Six Sigma / DMAIC (BS-MS)', name: 'Defects Per Million Opportunities (DPMO)', expr: 'DPMO = (Number of Defects/(Number of Units × Opportunities per Unit)) × 1,000,000' },
    { cat: 'Six Sigma / DMAIC (BS-MS)', name: 'First Pass Yield (FPY)', expr: 'FPY = Units Passing Without Rework/Total Units Started' },
    { cat: 'Six Sigma / DMAIC (BS-MS)', name: 'Rolled Throughput Yield (RTY)', expr: 'RTY = Product of the First Pass Yields of Each Process Step' },
    { cat: 'Six Sigma / DMAIC (BS-MS)', name: 'Six Sigma Quality Level (concept)', expr: 'a process achieving Six Sigma has only about 3.4 defects per million opportunities' },
    { cat: 'Six Sigma / DMAIC (BS-MS)', name: 'Voice of the Customer (VOC) (concept)', expr: 'the documented expectations, preferences, and requirements customers have for a product or service' },

    { cat: 'Robust Statistics (MS)', name: 'Robust Statistic (concept)', expr: 'a statistical measure that is not overly affected by outliers or small departures from model assumptions' },
    { cat: 'Robust Statistics (MS)', name: 'Median as a Robust Measure (concept)', expr: 'the median is less sensitive to outliers than the mean, making it a more robust measure of central tendency' },
    { cat: 'Robust Statistics (MS)', name: 'Trimmed Mean', expr: 'the mean calculated after removing a fixed percentage of the smallest and largest values from a dataset' },
    { cat: 'Robust Statistics (MS)', name: 'Median Absolute Deviation (MAD)', expr: 'MAD = median(|xᵢ − median(x)|)' },
    { cat: 'Robust Statistics (MS)', name: 'Breakdown Point (concept)', expr: 'the smallest proportion of extreme data points needed to make an estimator arbitrarily inaccurate' },
    { cat: 'Robust Statistics (MS)', name: 'Winsorized Mean (concept)', expr: 'a mean calculated after replacing extreme values with the nearest non-extreme values, rather than removing them' },
    { cat: 'Robust Statistics (MS)', name: 'Huber Loss Function (concept)', expr: 'a loss function that behaves quadratically for small errors and linearly for large errors, reducing outlier sensitivity' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'A/B Test (concept)', expr: 'a controlled experiment comparing two variants (A and B) to determine which performs better on a target metric' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'Minimum Detectable Effect (concept)', expr: 'the smallest true effect size an A/B test is designed to reliably detect' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'Statistical Significance in A/B Testing (concept)', expr: 'indicates that an observed difference between variants is unlikely to be due to random chance' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'Sample Ratio Mismatch (concept)', expr: 'occurs when the actual split of traffic between test variants differs unexpectedly from the intended ratio' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'Uplift (A/B Testing)', expr: 'Uplift = (Metric in Variant B − Metric in Variant A)/Metric in Variant A × 100' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'Multiple Testing Problem (concept)', expr: 'the increased chance of a false positive when performing many statistical tests simultaneously' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'Bonferroni Correction', expr: 'adjusted significance level = α/n, n = number of comparisons being made' },
    { cat: 'A/B Testing Statistics (BS-MS)', name: 'Multi-Armed Bandit (concept)', expr: 'an adaptive testing approach that dynamically shifts traffic toward better-performing variants during the test' },
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
    { cat: 'Accounting (9th-B.Com)', name: 'Accrued Expenses (concept)', expr: 'expenses incurred but not yet paid' },
    { cat: 'Accounting (9th-B.Com)', name: 'Prepaid Expenses (concept)', expr: 'expenses paid in advance, recorded as an asset' },
    { cat: 'Accounting (9th-B.Com)', name: 'Unearned Revenue (concept)', expr: 'revenue received before goods/services are delivered' },
    { cat: 'Accounting (9th-B.Com)', name: 'Debit-Credit Rule', expr: 'debit what comes in, credit what goes out' },
    { cat: 'Accounting (9th-B.Com)', name: 'Ledger Balancing', expr: 'Balance = Total Debit − Total Credit' },
    { cat: 'Accounting (9th-B.Com)', name: 'Petty Cash Reimbursement', expr: 'Reimbursement = Total Vouchers − Cash Remaining' },
    { cat: 'Finance (B.Com-MBA)', name: 'Internal Rate of Return (concept)', expr: 'discount rate r that makes NPV = 0' },
    { cat: 'Finance (B.Com-MBA)', name: 'Modified Internal Rate of Return', expr: 'MIRR = (FV of inflows/PV of outflows)^(1/n) − 1' },
    { cat: 'Finance (B.Com-MBA)', name: 'Free Cash Flow', expr: 'FCF = Operating Cash Flow − Capital Expenditures' },
    { cat: 'Finance (B.Com-MBA)', name: 'Economic Value Added', expr: 'EVA = NOPAT − (Capital × WACC)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Weighted Average Maturity', expr: 'WAM = Σ(weight × maturity)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Yield to Maturity (concept)', expr: 'discount rate equating bond price to PV of its cash flows' },
    { cat: 'Finance (B.Com-MBA)', name: 'Current Yield (Bond)', expr: 'CY = Annual Coupon/Current Bond Price' },
    { cat: 'Finance (B.Com-MBA)', name: 'Zero Coupon Bond Price', expr: 'Price = FV/(1+r)ⁿ' },
    { cat: 'Economics (B.Com-MBA)', name: 'Law of Demand (concept)', expr: 'price and quantity demanded move in opposite directions' },
    { cat: 'Economics (B.Com-MBA)', name: 'Law of Supply (concept)', expr: 'price and quantity supplied move in the same direction' },
    { cat: 'Economics (B.Com-MBA)', name: 'Equilibrium Price (concept)', expr: 'price where quantity demanded equals quantity supplied' },
    { cat: 'Economics (B.Com-MBA)', name: 'Cross Elasticity Interpretation', expr: 'positive value = substitutes, negative value = complements' },
    { cat: 'Economics (B.Com-MBA)', name: 'Opportunity Cost (concept)', expr: 'value of the next best alternative forgone' },
    { cat: 'Economics (B.Com-MBA)', name: 'Production Possibility Frontier (concept)', expr: 'maximum output combinations achievable with given resources' },
    { cat: 'Economics (B.Com-MBA)', name: 'Marginal Rate of Substitution', expr: 'MRS = ΔY/ΔX along an indifference curve' },
    { cat: 'Economics (B.Com-MBA)', name: 'Herfindahl-Hirschman Index', expr: 'HHI = Σ(market share)²' },
    { cat: 'Economics (B.Com-MBA)', name: 'Circular Flow of Income (concept)', expr: 'flow of money between households and firms in an economy' },
    { cat: 'Business Math (FSc-B.Com)', name: 'True Discount', expr: 'TD = (PV × Rate × Time)/100' },
    { cat: 'Business Math (FSc-B.Com)', name: "Banker's Discount", expr: 'BD = (Face Value × Rate × Time)/100' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Chain Discount', expr: 'Net Price = List Price × (1−d₁)(1−d₂)...' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Break-even in Sales Value', expr: 'BE Sales = Fixed Cost/(1 − Variable Cost/Sales)' },
    { cat: 'Costing (B.Com-MBA)', name: 'Absorption Costing (concept)', expr: 'all manufacturing costs are assigned to units produced' },
    { cat: 'Costing (B.Com-MBA)', name: 'Marginal Costing (concept)', expr: 'only variable costs are assigned to units produced' },
    { cat: 'Costing (B.Com-MBA)', name: 'Reorder Level', expr: 'ROL = Max Usage × Max Lead Time' },
    { cat: 'Costing (B.Com-MBA)', name: 'Minimum Stock Level', expr: 'Min Level = ROL − (Avg Usage × Avg Lead Time)' },
    { cat: 'Costing (B.Com-MBA)', name: 'Maximum Stock Level', expr: 'Max Level = ROL + ROQ − (Min Usage × Min Lead Time)' },
    { cat: 'Costing (B.Com-MBA)', name: 'Average Stock Level', expr: 'Avg Level = (Min Level + Max Level)/2' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Price to Sales Ratio', expr: 'P/S = Market Cap/Total Revenue' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Price to Book Ratio', expr: 'P/B = Market Price/Book Value per Share' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Operating Margin', expr: 'OM = Operating Income/Sales × 100' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'EBITDA Margin', expr: 'EBITDA Margin = EBITDA/Sales × 100' },
    { cat: 'Ratio Analysis (B.Com-MBA)', name: 'Solvency Ratio', expr: 'SR = (Net Income+Depreciation)/Total Liabilities' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Net Promoter Score (concept)', expr: 'NPS = %Promoters − %Detractors' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Average Order Value', expr: 'AOV = Total Revenue/Number of Orders' },
    { cat: 'Marketing/Business (B.Com-MBA)', name: 'Bounce Rate', expr: 'BR = Single Page Visits/Total Visits × 100' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Break-even Chart (concept)', expr: 'graphical intersection of total cost and total revenue lines' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Weighted Moving Average (Sales Forecast)', expr: 'WMA = Σ(wᵢ×Salesᵢ)/Σwᵢ' },
    { cat: 'Statistics for Business (B.Com-MBA)', name: 'Seasonal Sales Index', expr: 'SSI = (Seasonal Avg Sales/Overall Avg Sales) × 100' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Progressive Tax (concept)', expr: 'tax rate increases as taxable income increases' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Regressive Tax (concept)', expr: 'takes a larger percentage of income from low earners' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Customs Duty', expr: 'Duty = Assessable Value × Duty Rate' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Time to Fill (Recruitment)', expr: 'days from job posting to offer acceptance' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Employee Engagement Score (concept)', expr: 'survey-based measure typically scaled 0–100' },
    { cat: 'Insurance (B.Com-MBA)', name: 'Combined Ratio (Insurance)', expr: 'CR = Loss Ratio + Expense Ratio' },
    { cat: 'Insurance (B.Com-MBA)', name: 'Sum Assured (concept)', expr: 'guaranteed amount payable on claim or maturity' },
    { cat: 'Banking (B.Com-MBA)', name: 'Capital Adequacy Ratio', expr: 'CAR = (Tier 1 + Tier 2 Capital)/Risk-Weighted Assets' },
    { cat: 'International Trade (B.Com-MBA)', name: 'Balance of Payments (concept)', expr: "record of a country's transactions with the rest of the world" },
    { cat: 'Business Studies (9th-10th)', name: 'Types of Business Organization (concept)', expr: 'sole proprietorship, partnership, company' },
    { cat: 'Business Studies (9th-10th)', name: 'Fixed Assets (concept)', expr: 'long-term tangible resources used in business operations, e.g. land, machinery' },
    { cat: 'Business Studies (9th-10th)', name: 'Current Assets (concept)', expr: 'assets expected to be converted to cash within one year' },
    { cat: 'Business Studies (9th-10th)', name: 'Journal Entry Rule (concept)', expr: 'debit what comes in, credit what goes out' },
    { cat: 'Business Studies (9th-10th)', name: 'Ledger (concept)', expr: 'book containing all accounts where journal entries are posted' },
    { cat: 'Business Studies (9th-10th)', name: 'Cash Book (concept)', expr: 'records all cash receipts and payments in chronological order' },
    { cat: 'Accounting (9th-B.Com)', name: 'Net Income Formula', expr: 'Net Income = Total Revenue − Total Expenses' },
    { cat: 'Accounting (9th-B.Com)', name: 'Total Purchases', expr: 'Purchases = Opening Stock + Purchases − Closing Stock (used in COGS)' },
    { cat: 'Accounting (9th-B.Com)', name: 'Rent Owing / Accrued Rent (concept)', expr: 'rent expense incurred but not yet paid' },
    { cat: 'Accounting (9th-B.Com)', name: 'Carriage Inwards (concept)', expr: 'transportation cost of bringing goods into the business, added to purchases' },
    { cat: 'Accounting (9th-B.Com)', name: 'Carriage Outwards (concept)', expr: 'transportation cost of delivering goods to customers, treated as an expense' },
    { cat: 'Management (B.Com-MBA)', name: 'Porter\'s Five Forces (concept)', expr: 'competitive rivalry, supplier power, buyer power, threat of substitution, threat of new entry' },
    { cat: 'Management (B.Com-MBA)', name: 'SWOT Analysis (concept)', expr: 'Strengths, Weaknesses, Opportunities, Threats' },
    { cat: 'Management (B.Com-MBA)', name: 'Span of Control (concept)', expr: 'number of subordinates a manager can effectively supervise' },
    { cat: 'Management (B.Com-MBA)', name: 'Break-even Time (concept)', expr: 'time required for cumulative profit to equal cumulative investment' },
    { cat: 'Supply Chain (B.Com-MBA)', name: 'Inventory Turnover Days', expr: '365/Inventory Turnover Ratio' },
    { cat: 'Supply Chain (B.Com-MBA)', name: 'Safety Stock', expr: 'Safety Stock = (Max daily usage × Max lead time) − (Avg daily usage × Avg lead time)' },
    { cat: 'Supply Chain (B.Com-MBA)', name: 'Fill Rate', expr: 'Fill Rate = (Units shipped/Units ordered) × 100' },
    { cat: 'Supply Chain (B.Com-MBA)', name: 'Perfect Order Rate', expr: '% of orders delivered complete, on time, and damage-free' },
    { cat: 'E-Commerce (B.Com-MBA)', name: 'Cart Abandonment Rate', expr: '(Carts started − Purchases completed)/Carts started × 100' },
    { cat: 'E-Commerce (B.Com-MBA)', name: 'Average Revenue Per User', expr: 'ARPU = Total Revenue/Number of Users' },
    { cat: 'E-Commerce (B.Com-MBA)', name: 'Gross Merchandise Value', expr: 'GMV = Sum of value of all goods sold over a period' },
    { cat: 'Entrepreneurship (B.Com-MBA)', name: 'Burn Rate', expr: 'rate at which a startup spends its cash reserves per month' },
    { cat: 'Entrepreneurship (B.Com-MBA)', name: 'Runway', expr: 'Runway (months) = Cash Balance/Monthly Burn Rate' },
    { cat: 'Entrepreneurship (B.Com-MBA)', name: 'Valuation (Pre-Money vs Post-Money)', expr: 'Post-Money = Pre-Money + Investment Amount' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Cost Price from Selling Price and Profit%', expr: 'CP = SP/(1 + Profit%/100)' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Selling Price from Cost Price and Loss%', expr: 'SP = CP × (1 − Loss%/100)' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Partnership Profit Sharing', expr: 'Profit Share = (Individual Investment × Time)/Sum of (Investment × Time)' },
    { cat: 'Business Math (FSc-B.Com)', name: 'Depreciation Rate (Reducing Balance)', expr: 'r = 1 − (Salvage Value/Cost)^(1/n)' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Gross Salary to Net Salary', expr: 'Net Salary = Gross Salary − Deductions (Tax, Provident Fund, etc.)' },
    { cat: 'Taxation (B.Com-MBA)', name: 'Sales Tax Inclusive Price Reversal', expr: 'Base Price = Total Price/(1 + Tax Rate)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Break-even in Units (Simple)', expr: 'BEP(units) = Fixed Costs/(Price − Variable Cost per unit)' },
    { cat: 'Finance (B.Com-MBA)', name: 'Total Interest Paid (Loan)', expr: 'Total Interest = (Monthly Payment × Number of Payments) − Principal' },
    { cat: 'Finance (B.Com-MBA)', name: 'Debt Service Coverage Ratio', expr: 'DSCR = Net Operating Income/Total Debt Service' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Revenue per Employee', expr: 'Total Revenue/Number of Employees' },
    { cat: 'Human Resource (B.Com-MBA)', name: 'Training ROI', expr: '(Benefits of Training − Cost of Training)/Cost of Training × 100' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Audit (concept)', expr: 'an independent examination of financial records to ensure accuracy and compliance with accounting standards' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Materiality (concept)', expr: 'the threshold above which a misstatement in financial records could influence users\' decisions' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Audit Risk Model', expr: 'Audit Risk = Inherent Risk × Control Risk × Detection Risk' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Internal Control (concept)', expr: 'policies and procedures a company implements to safeguard assets and ensure reliable financial reporting' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Sampling Risk in Auditing (concept)', expr: 'the risk that an auditor\'s conclusion based on a sample differs from the conclusion if the entire population were tested' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Qualified vs Unqualified Audit Opinion (concept)', expr: 'unqualified means financial statements are fairly presented; qualified means there are specific exceptions or limitations' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Substantive Testing (concept)', expr: 'audit procedures designed to detect material misstatements directly in account balances or transactions' },
    { cat: 'Auditing (B.Com-MBA)', name: 'Forensic Audit (concept)', expr: 'an examination of financial records specifically to detect fraud or financial crimes for legal purposes' },

    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Corporate Governance (concept)', expr: 'the system of rules and practices by which a company is directed and controlled' },
    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Board of Directors (concept)', expr: 'a group elected by shareholders to oversee a company\'s management and major decisions' },
    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Fiduciary Duty (concept)', expr: 'a legal obligation for directors/officers to act in the best interests of the company and its shareholders' },
    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Limited Liability (concept)', expr: 'shareholders are only liable for company debts up to the amount they invested' },
    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Contract Essentials (concept)', expr: 'a valid contract requires offer, acceptance, consideration, capacity, and lawful object' },
    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Intellectual Property Rights (concept)', expr: 'legal protections such as patents, trademarks, and copyrights for creations of the mind' },
    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Partnership vs Sole Proprietorship (concept)', expr: 'a partnership has two or more owners sharing profits/liability; a sole proprietorship has a single owner with full control and liability' },
    { cat: 'Business Law & Corporate Governance (B.Com-MBA)', name: 'Shareholder vs Stakeholder (concept)', expr: 'a shareholder owns equity in the company; a stakeholder is any party affected by its operations (employees, customers, community)' },

    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Riba (Interest) (concept)', expr: 'a prohibited excess or increment charged on loans in Islamic finance' },
    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Murabaha (concept)', expr: 'a cost-plus-profit sale where the bank buys an asset and resells it to the customer at a disclosed markup' },
    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Mudarabah (concept)', expr: 'a profit-sharing partnership where one party provides capital and the other provides expertise/management' },
    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Musharakah (concept)', expr: 'a joint venture partnership where all partners contribute capital and share profits/losses proportionally' },
    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Ijarah (concept)', expr: 'an Islamic leasing arrangement where the bank buys an asset and leases it to the customer for a rental fee' },
    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Sukuk (Islamic Bonds) (concept)', expr: 'Shariah-compliant certificates representing ownership in a tangible asset or project, instead of interest-bearing debt' },
    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Zakat Calculation', expr: 'Zakat = 2.5% × Total Zakatable Wealth held above the Nisab threshold for one lunar year' },
    { cat: 'Islamic Banking & Finance (B.Com-MBA)', name: 'Takaful (Islamic Insurance) (concept)', expr: 'a cooperative system where members contribute to a pool used to support one another against loss' },

    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Earnings Per Share (EPS)', expr: 'EPS = Net Income/Number of Outstanding Shares' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Price-to-Earnings Ratio (P/E)', expr: 'P/E = Market Price per Share/Earnings per Share' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Dividend Yield', expr: 'Dividend Yield = Annual Dividend per Share/Market Price per Share × 100' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Dividend Payout Ratio', expr: 'Payout Ratio = Dividends Paid/Net Income × 100' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Market Capitalization', expr: 'Market Cap = Share Price × Total Number of Outstanding Shares' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Book Value per Share', expr: 'BVPS = (Total Equity − Preferred Equity)/Number of Common Shares Outstanding' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Price-to-Book Ratio (P/B)', expr: 'P/B = Market Price per Share/Book Value per Share' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Capital Gain', expr: 'Capital Gain = Selling Price − Purchase Price' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Total Return on Investment (Stock)', expr: 'Total Return = (Capital Gain + Dividends)/Purchase Price × 100' },
    { cat: 'Stock Market & Investment (B.Com-MBA)', name: 'Diversification (concept)', expr: 'spreading investments across different assets to reduce overall portfolio risk' },

    { cat: 'International Finance — Extra (MBA)', name: 'Exchange Rate (concept)', expr: 'the value of one currency expressed in terms of another currency' },
    { cat: 'International Finance — Extra (MBA)', name: 'Purchasing Power Parity (PPP)', expr: 'PPP states exchange rates should adjust so identical goods cost the same in different countries' },
    { cat: 'International Finance — Extra (MBA)', name: 'Interest Rate Parity (concept)', expr: 'links exchange rates and interest rates so no arbitrage opportunity exists between currencies' },
    { cat: 'International Finance — Extra (MBA)', name: 'Balance of Trade', expr: 'Balance of Trade = Value of Exports − Value of Imports' },
    { cat: 'International Finance — Extra (MBA)', name: 'Balance of Payments (concept)', expr: 'a record of all economic transactions between a country and the rest of the world' },
    { cat: 'International Finance — Extra (MBA)', name: 'Foreign Direct Investment (FDI) (concept)', expr: 'investment made by a company or individual in business interests located in another country' },
    { cat: 'International Finance — Extra (MBA)', name: 'Currency Appreciation vs Depreciation (concept)', expr: 'appreciation is a rise in a currency\'s value relative to another; depreciation is a fall in its value' },
    { cat: 'International Finance — Extra (MBA)', name: 'Letter of Credit (concept)', expr: 'a bank guarantee ensuring an exporter receives payment once agreed conditions of a trade are met' },

    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Contribution Margin', expr: 'Contribution Margin = Sales Revenue − Variable Costs' },
    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Contribution Margin Ratio', expr: 'CM Ratio = Contribution Margin/Sales Revenue × 100' },
    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Break-Even Point (Units)', expr: 'BEP (units) = Fixed Costs/Contribution Margin per Unit' },
    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Break-Even Point (Sales Revenue)', expr: 'BEP (sales) = Fixed Costs/Contribution Margin Ratio' },
    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Margin of Safety', expr: 'Margin of Safety = Actual Sales − Break-Even Sales' },
    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Margin of Safety Ratio', expr: 'MOS Ratio = Margin of Safety/Actual Sales × 100' },
    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Target Profit Sales Volume', expr: 'Units = (Fixed Costs + Target Profit)/Contribution Margin per Unit' },
    { cat: 'Cost-Volume-Profit Analysis — Extra (B.Com)', name: 'Operating Leverage', expr: 'Degree of Operating Leverage = Contribution Margin/Operating Income' },

    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Working Capital', expr: 'Working Capital = Current Assets − Current Liabilities' },
    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Net Working Capital Ratio', expr: 'NWC Ratio = Net Working Capital/Total Assets' },
    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Cash Conversion Cycle', expr: 'CCC = Days Inventory Outstanding + Days Sales Outstanding − Days Payable Outstanding' },
    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Days Inventory Outstanding (DIO)', expr: 'DIO = (Average Inventory/Cost of Goods Sold) × 365' },
    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Days Sales Outstanding (DSO)', expr: 'DSO = (Average Accounts Receivable/Total Credit Sales) × 365' },
    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Days Payable Outstanding (DPO)', expr: 'DPO = (Average Accounts Payable/Cost of Goods Sold) × 365' },
    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Working Capital Turnover Ratio', expr: 'WC Turnover = Net Sales/Average Working Capital' },
    { cat: 'Working Capital Management (B.Com-MBA)', name: 'Economic Order Quantity (EOQ)', expr: 'EOQ = √(2DS/H), D = annual demand, S = ordering cost, H = holding cost per unit' },

    { cat: 'Mergers & Acquisitions (MBA)', name: 'Merger vs Acquisition (concept)', expr: 'a merger combines two companies into one new entity; an acquisition is one company taking over another' },
    { cat: 'Mergers & Acquisitions (MBA)', name: 'Synergy (M&A) (concept)', expr: 'the added value created when two merged companies perform better together than separately' },
    { cat: 'Mergers & Acquisitions (MBA)', name: 'Exchange Ratio (M&A)', expr: 'Exchange Ratio = Offer Price per Share of Target/Share Price of Acquirer' },
    { cat: 'Mergers & Acquisitions (MBA)', name: 'Accretion vs Dilution (M&A) (concept)', expr: 'a deal is accretive if it increases the acquirer\'s EPS, and dilutive if it decreases it' },
    { cat: 'Mergers & Acquisitions (MBA)', name: 'Due Diligence (concept)', expr: 'a thorough investigation of a target company\'s finances and operations before completing a deal' },
    { cat: 'Mergers & Acquisitions (MBA)', name: 'Hostile Takeover (concept)', expr: 'an acquisition attempt made directly to shareholders against the wishes of the target\'s management' },

    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Click-Through Rate (CTR)', expr: 'CTR = (Number of Clicks/Number of Impressions) × 100' },
    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Conversion Rate', expr: 'Conversion Rate = (Number of Conversions/Total Visitors) × 100' },
    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Cost Per Click (CPC)', expr: 'CPC = Total Ad Spend/Number of Clicks' },
    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Cost Per Mille (CPM)', expr: 'CPM = (Total Ad Spend/Total Impressions) × 1000' },
    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Return on Ad Spend (ROAS)', expr: 'ROAS = Revenue from Ads/Cost of Ads' },
    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Customer Acquisition Cost (CAC)', expr: 'CAC = Total Sales & Marketing Cost/Number of New Customers Acquired' },
    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Customer Lifetime Value (CLV)', expr: 'CLV = Average Purchase Value × Purchase Frequency × Customer Lifespan' },
    { cat: 'Digital Marketing Metrics (BBA-MBA)', name: 'Bounce Rate', expr: 'Bounce Rate = (Single-Page Visits/Total Visits) × 100' },

    { cat: 'Strategic Management (MBA)', name: 'SWOT Analysis (concept)', expr: 'evaluates a business\'s Strengths, Weaknesses, Opportunities, and Threats' },
    { cat: 'Strategic Management (MBA)', name: "Porter's Five Forces (concept)", expr: 'analyzes industry competitiveness through Rivalry, Supplier Power, Buyer Power, Threat of Substitutes, Threat of New Entrants' },
    { cat: 'Strategic Management (MBA)', name: 'PESTLE Analysis (concept)', expr: 'evaluates macro-environmental factors: Political, Economic, Social, Technological, Legal, Environmental' },
    { cat: 'Strategic Management (MBA)', name: 'BCG Matrix (concept)', expr: 'classifies business units as Stars, Cash Cows, Question Marks, or Dogs based on market growth and share' },
    { cat: 'Strategic Management (MBA)', name: 'Competitive Advantage (concept)', expr: 'an attribute that allows a company to outperform its competitors, e.g. through cost leadership or differentiation' },
    { cat: 'Strategic Management (MBA)', name: 'Value Chain Analysis (concept)', expr: 'examines each business activity to identify where value is added and costs can be reduced' },
    { cat: 'Strategic Management (MBA)', name: 'Balanced Scorecard (concept)', expr: 'a strategic performance framework measuring financial, customer, internal process, and learning perspectives' },
    { cat: 'Strategic Management (MBA)', name: 'Blue Ocean Strategy (concept)', expr: 'creating uncontested market space rather than competing in an existing, saturated industry' },

    { cat: 'Organizational Behavior (BBA-MBA)', name: 'Organizational Culture (concept)', expr: 'the shared values, beliefs, and practices that shape how members of an organization behave' },
    { cat: 'Organizational Behavior (BBA-MBA)', name: "Maslow's Hierarchy of Needs (concept)", expr: 'a motivation theory ranking human needs: Physiological, Safety, Social, Esteem, Self-Actualization' },
    { cat: 'Organizational Behavior (BBA-MBA)', name: "Herzberg's Two-Factor Theory (concept)", expr: 'distinguishes hygiene factors (prevent dissatisfaction) from motivators (create satisfaction) at work' },
    { cat: 'Organizational Behavior (BBA-MBA)', name: 'Employee Turnover Rate', expr: 'Turnover Rate = (Number of Employees Who Left/Average Total Employees) × 100' },
    { cat: 'Organizational Behavior (BBA-MBA)', name: 'Span of Control (concept)', expr: 'the number of subordinates a manager can effectively supervise' },
    { cat: 'Organizational Behavior (BBA-MBA)', name: 'Transformational vs Transactional Leadership (concept)', expr: 'transformational leaders inspire change through vision; transactional leaders motivate through rewards and structure' },

    { cat: 'Payroll & Compensation (B.Com-MBA)', name: 'Gross Salary vs Net Salary (concept)', expr: 'gross salary is total earnings before deductions; net salary is what remains after taxes and deductions' },
    { cat: 'Payroll & Compensation (B.Com-MBA)', name: 'Overtime Pay Calculation', expr: 'Overtime Pay = Overtime Hours × (Hourly Rate × Overtime Multiplier)' },
    { cat: 'Payroll & Compensation (B.Com-MBA)', name: 'Provident Fund Contribution (concept)', expr: 'a retirement savings scheme where both employer and employee contribute a percentage of salary regularly' },
    { cat: 'Payroll & Compensation (B.Com-MBA)', name: 'Gratuity Calculation (concept)', expr: 'a lump-sum benefit paid to an employee based on years of service and last drawn salary' },
    { cat: 'Payroll & Compensation (B.Com-MBA)', name: 'Cost to Company (CTC)', expr: 'CTC = Gross Salary + Employer\'s Contributions (PF, insurance, bonuses, etc.)' },
    { cat: 'Payroll & Compensation (B.Com-MBA)', name: 'Compensation Benchmarking (concept)', expr: 'comparing a company\'s pay structure against industry standards to remain competitive' },
    { cat: 'Retail Management (BBA)', name: 'Sales per Square Foot', expr: 'Sales per Sq Ft = Total Sales/Total Retail Floor Area (sq ft)' },
    { cat: 'Retail Management (BBA)', name: 'Stock-to-Sales Ratio', expr: 'Stock-to-Sales Ratio = Value of Inventory/Value of Sales' },
    { cat: 'Retail Management (BBA)', name: 'Sell-Through Rate', expr: 'Sell-Through Rate = (Units Sold/Units Received) × 100' },
    { cat: 'Retail Management (BBA)', name: 'Gross Margin Return on Investment (GMROI)', expr: 'GMROI = Gross Margin/Average Inventory Cost' },
    { cat: 'Retail Management (BBA)', name: 'Footfall Conversion Rate', expr: 'Conversion Rate = (Number of Transactions/Total Footfall) × 100' },
    { cat: 'Retail Management (BBA)', name: 'Average Transaction Value', expr: 'ATV = Total Sales Revenue/Number of Transactions' },
    { cat: 'Retail Management (BBA)', name: 'Shrinkage Rate (Retail)', expr: 'Shrinkage Rate = (Recorded Inventory − Actual Inventory)/Recorded Inventory × 100' },
    { cat: 'Retail Management (BBA)', name: 'Same-Store Sales Growth', expr: 'Growth % = (Current Period Sales − Prior Period Sales)/Prior Period Sales × 100' },

    { cat: 'Project Management (BBA-MBA)', name: 'Critical Path (concept)', expr: 'the longest sequence of dependent tasks in a project, which determines the minimum possible project duration' },
    { cat: 'Project Management (BBA-MBA)', name: 'Total Float (Slack)', expr: 'Total Float = Late Start − Early Start (or Late Finish − Early Finish)' },
    { cat: 'Project Management (BBA-MBA)', name: 'PERT Expected Time', expr: 'TE = (O + 4M + P)/6, O = optimistic, M = most likely, P = pessimistic time' },
    { cat: 'Project Management (BBA-MBA)', name: 'PERT Variance', expr: 'Variance = ((P − O)/6)²' },
    { cat: 'Project Management (BBA-MBA)', name: 'Earned Value (EV)', expr: 'EV = % Complete × Budget at Completion (BAC)' },
    { cat: 'Project Management (BBA-MBA)', name: 'Cost Variance (CV)', expr: 'CV = Earned Value (EV) − Actual Cost (AC)' },
    { cat: 'Project Management (BBA-MBA)', name: 'Schedule Variance (SV)', expr: 'SV = Earned Value (EV) − Planned Value (PV)' },
    { cat: 'Project Management (BBA-MBA)', name: 'Cost Performance Index (CPI)', expr: 'CPI = EV/AC' },
    { cat: 'Project Management (BBA-MBA)', name: 'Schedule Performance Index (SPI)', expr: 'SPI = EV/PV' },
    { cat: 'Project Management (BBA-MBA)', name: 'Estimate at Completion (EAC)', expr: 'EAC = BAC/CPI' },

    { cat: 'Operations Management (BBA-MBA)', name: 'Capacity Utilization Rate', expr: 'CUR = (Actual Output/Maximum Possible Output) × 100' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Overall Equipment Effectiveness (OEE)', expr: 'OEE = Availability × Performance × Quality' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Cycle Time', expr: 'Cycle Time = Net Production Time/Number of Units Produced' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Takt Time', expr: 'Takt Time = Available Production Time/Customer Demand' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Just-in-Time (JIT) (concept)', expr: 'a production strategy that minimizes inventory by receiving goods only as they are needed in the process' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Six Sigma (concept)', expr: 'a data-driven methodology aiming to reduce process defects to 3.4 per million opportunities' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Total Productive Maintenance (TPM) (concept)', expr: 'a maintenance approach aiming for zero breakdowns and zero defects through proactive equipment care' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Throughput', expr: 'Throughput = Total Output/Total Time' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Bottleneck (concept)', expr: 'the process step with the lowest capacity, which limits the overall throughput of a system' },
    { cat: 'Operations Management (BBA-MBA)', name: 'Lean Manufacturing (concept)', expr: 'a systematic approach to minimizing waste while maximizing productivity in production processes' },

    { cat: 'Consumer Behavior (BBA-MBA)', name: 'Consumer Decision-Making Process (concept)', expr: 'problem recognition → information search → evaluation of alternatives → purchase decision → post-purchase evaluation' },
    { cat: 'Consumer Behavior (BBA-MBA)', name: 'Brand Loyalty (concept)', expr: 'the tendency of a consumer to consistently purchase the same brand over competing options' },
    { cat: 'Consumer Behavior (BBA-MBA)', name: 'Perceived Value', expr: 'Perceived Value = Perceived Benefits/Perceived Costs' },
    { cat: 'Consumer Behavior (BBA-MBA)', name: 'Net Promoter Score (NPS)', expr: 'NPS = % Promoters − % Detractors' },
    { cat: 'Consumer Behavior (BBA-MBA)', name: 'Customer Satisfaction Score (CSAT)', expr: 'CSAT = (Number of Satisfied Customers/Total Respondents) × 100' },
    { cat: 'Consumer Behavior (BBA-MBA)', name: "Maslow's Hierarchy in Consumer Motivation (concept)", expr: 'consumers seek to satisfy physiological, safety, social, esteem, and self-actualization needs through purchases' },
    { cat: 'Consumer Behavior (BBA-MBA)', name: 'Cognitive Dissonance (concept)', expr: 'the discomfort a consumer feels after a purchase when doubting whether it was the right decision' },
    { cat: 'Consumer Behavior (BBA-MBA)', name: 'Word of Mouth (WOM) Effect (concept)', expr: 'the influence of informal recommendations and opinions shared between consumers on purchase decisions' },

    { cat: 'Business Communication (B.Com-BBA)', name: '7 Cs of Communication (concept)', expr: 'Clarity, Conciseness, Concreteness, Correctness, Coherence, Completeness, Courtesy' },
    { cat: 'Business Communication (B.Com-BBA)', name: 'Communication Process Model (concept)', expr: 'sender → encoding → message → channel → decoding → receiver → feedback' },
    { cat: 'Business Communication (B.Com-BBA)', name: 'Barriers to Communication (concept)', expr: 'factors such as noise, language differences, or perception that distort or block a message' },
    { cat: 'Business Communication (B.Com-BBA)', name: 'Formal vs Informal Communication (concept)', expr: 'formal communication follows official organizational channels; informal communication (grapevine) flows unofficially' },
    { cat: 'Business Communication (B.Com-BBA)', name: 'Verbal vs Non-verbal Communication (concept)', expr: 'verbal communication uses spoken or written words; non-verbal uses body language, tone, and gestures' },
    { cat: 'Business Communication (B.Com-BBA)', name: 'Active Listening (concept)', expr: 'fully concentrating on, understanding, and thoughtfully responding to a speaker\'s message' },

    { cat: 'Total Quality Management (TQM) (BBA-MBA)', name: 'Total Quality Management (concept)', expr: 'a management approach focused on continuous improvement of quality across all organizational processes' },
    { cat: 'Total Quality Management (TQM) (BBA-MBA)', name: 'PDCA Cycle (concept)', expr: 'Plan-Do-Check-Act, a continuous improvement cycle used in quality management' },
    { cat: 'Total Quality Management (TQM) (BBA-MBA)', name: 'Kaizen (concept)', expr: 'a Japanese philosophy of continuous, incremental improvement involving all employees' },
    { cat: 'Total Quality Management (TQM) (BBA-MBA)', name: 'Cost of Quality', expr: 'Cost of Quality = Cost of Conformance + Cost of Non-Conformance' },
    { cat: 'Total Quality Management (TQM) (BBA-MBA)', name: 'Defects Per Million Opportunities (DPMO)', expr: 'DPMO = (Number of Defects/(Units × Opportunities per Unit)) × 1,000,000' },
    { cat: 'Total Quality Management (TQM) (BBA-MBA)', name: 'Quality Control vs Quality Assurance (concept)', expr: 'quality control detects defects in the finished product; quality assurance prevents defects in the process' },
    { cat: 'Total Quality Management (TQM) (BBA-MBA)', name: 'Benchmarking (concept)', expr: 'comparing a company\'s processes and performance metrics against industry best practices' },

    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Fiscal Policy (concept)', expr: 'government use of spending and taxation to influence overall economic activity' },
    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Budget Deficit', expr: 'Budget Deficit = Total Government Expenditure − Total Government Revenue' },
    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Fiscal Deficit', expr: 'Fiscal Deficit = Total Expenditure − Total Revenue (excluding borrowings)' },
    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Public Debt to GDP Ratio', expr: 'Debt-to-GDP = (Total Public Debt/GDP) × 100' },
    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Progressive vs Regressive Tax (concept)', expr: 'progressive tax rates rise with income; regressive tax takes a larger percentage from lower incomes' },
    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Value Added Tax (VAT) (concept)', expr: 'a tax levied on the value added at each stage of production or distribution of goods and services' },
    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Government Subsidy (concept)', expr: 'financial assistance provided by the government to support a particular industry or activity' },
    { cat: 'Public Finance & Fiscal Policy (B.Com-MBA)', name: 'Crowding Out Effect (concept)', expr: 'increased government borrowing that reduces private sector investment by raising interest rates' },

    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Money Supply (M1, M2, M3) (concept)', expr: 'measures of the total money in circulation, ranging from most liquid (M1) to less liquid (M2, M3)' },
    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Money Multiplier', expr: 'Money Multiplier = 1/Reserve Ratio' },
    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Quantity Theory of Money', expr: 'MV = PQ, M = money supply, V = velocity, P = price level, Q = output' },
    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Repo Rate (concept)', expr: 'the rate at which a central bank lends short-term funds to commercial banks' },
    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Open Market Operations (concept)', expr: 'a central bank buying or selling government securities to control the money supply' },
    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Inflation Targeting (concept)', expr: 'a central bank policy of setting a specific inflation rate as its explicit monetary policy goal' },
    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Liquidity Trap (concept)', expr: 'a situation where very low interest rates fail to stimulate borrowing, spending, or investment' },
    { cat: 'Monetary Economics (B.Com-MBA)', name: 'Velocity of Money', expr: 'V = (P × Q)/M' },

    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Price Elasticity of Demand', expr: 'Ed = %Δ Quantity Demanded/%Δ Price' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Income Elasticity of Demand', expr: 'Ei = %Δ Quantity Demanded/%Δ Income' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Cross Elasticity of Demand', expr: 'Exy = %Δ Quantity Demanded of X/%Δ Price of Y' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Elasticity of Supply', expr: 'Es = %Δ Quantity Supplied/%Δ Price' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Marginal Utility', expr: 'MU = ΔTotal Utility/ΔQuantity Consumed' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Law of Diminishing Marginal Utility (concept)', expr: 'each additional unit consumed yields less satisfaction than the previous unit' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Consumer Surplus (concept)', expr: 'the difference between what consumers are willing to pay and what they actually pay' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Producer Surplus (concept)', expr: 'the difference between what producers receive for a good and the minimum amount they would accept' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Indifference Curve (concept)', expr: 'a curve showing combinations of two goods that give a consumer equal satisfaction' },
    { cat: 'Microeconomics — Extra (B.Com-MBA)', name: 'Marginal Rate of Substitution (MRS)', expr: 'MRS = ΔY/ΔX, measured along an indifference curve' },

    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'GDP — Expenditure Approach', expr: 'GDP = C + I + G + (X − M)' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Gross National Product (GNP)', expr: 'GNP = GDP + Net Income from Abroad' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Nominal vs Real GDP (concept)', expr: 'nominal GDP is measured at current prices; real GDP is adjusted for inflation' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'GDP Deflator', expr: 'GDP Deflator = (Nominal GDP/Real GDP) × 100' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Unemployment Rate', expr: 'Unemployment Rate = (Number of Unemployed/Labor Force) × 100' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Inflation Rate', expr: 'Inflation Rate = ((CPI this year − CPI last year)/CPI last year) × 100' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Consumer Price Index (CPI) (concept)', expr: 'measures the average change over time in prices paid by consumers for a basket of goods and services' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Multiplier Effect', expr: 'Multiplier = 1/(1 − MPC), MPC = Marginal Propensity to Consume' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Phillips Curve (concept)', expr: 'illustrates an inverse relationship between the rate of inflation and the rate of unemployment' },
    { cat: 'Macroeconomics — Extra (B.Com-MBA)', name: 'Balance of Trade vs Balance of Payments (concept)', expr: 'balance of trade covers only goods and services; balance of payments covers all economic transactions with the world' },

    { cat: 'Real Estate & Property Management (B.Com-MBA)', name: 'Capitalization Rate (Cap Rate)', expr: 'Cap Rate = Net Operating Income/Current Market Value' },
    { cat: 'Real Estate & Property Management (B.Com-MBA)', name: 'Gross Rent Multiplier (GRM)', expr: 'GRM = Property Price/Gross Annual Rental Income' },
    { cat: 'Real Estate & Property Management (B.Com-MBA)', name: 'Loan-to-Value Ratio (LTV)', expr: 'LTV = (Loan Amount/Appraised Property Value) × 100' },
    { cat: 'Real Estate & Property Management (B.Com-MBA)', name: 'Net Operating Income (NOI)', expr: 'NOI = Total Rental Income − Operating Expenses' },
    { cat: 'Real Estate & Property Management (B.Com-MBA)', name: 'Occupancy Rate', expr: 'Occupancy Rate = (Occupied Units/Total Units) × 100' },
    { cat: 'Real Estate & Property Management (B.Com-MBA)', name: 'Cash-on-Cash Return', expr: 'Cash-on-Cash Return = Annual Pre-Tax Cash Flow/Total Cash Invested' },
    { cat: 'Real Estate & Property Management (B.Com-MBA)', name: 'Property Appreciation Rate', expr: 'Appreciation Rate = ((Current Value − Purchase Value)/Purchase Value) × 100' },

    { cat: 'Actuarial Science & Risk Management (MBA)', name: 'Actuarial Science (concept)', expr: 'the discipline applying mathematical and statistical methods to assess risk in insurance and finance' },
    { cat: 'Actuarial Science & Risk Management (MBA)', name: 'Premium Calculation (concept)', expr: 'the process of determining an insurance premium based on risk probability and expected claims' },
    { cat: 'Actuarial Science & Risk Management (MBA)', name: 'Expected Loss', expr: 'Expected Loss = Probability of Loss × Amount of Loss' },
    { cat: 'Actuarial Science & Risk Management (MBA)', name: 'Risk Pooling (concept)', expr: 'spreading risk across a large group so that the losses of a few are covered by the contributions of many' },
    { cat: 'Actuarial Science & Risk Management (MBA)', name: 'Value at Risk (VaR) (concept)', expr: 'estimates the maximum potential loss of a portfolio over a given time period at a given confidence level' },
    { cat: 'Actuarial Science & Risk Management (MBA)', name: 'Loss Ratio', expr: 'Loss Ratio = Incurred Losses/Earned Premiums' },
    { cat: 'Actuarial Science & Risk Management (MBA)', name: 'Combined Ratio (Insurance)', expr: 'Combined Ratio = Loss Ratio + Expense Ratio' },

    { cat: 'Behavioral Economics (MBA)', name: 'Behavioral Economics (concept)', expr: 'studies how psychological, social, and emotional factors influence economic decision-making' },
    { cat: 'Behavioral Economics (MBA)', name: 'Anchoring Bias (concept)', expr: 'the tendency to rely heavily on the first piece of information encountered when making decisions' },
    { cat: 'Behavioral Economics (MBA)', name: 'Loss Aversion (concept)', expr: 'the tendency to prefer avoiding losses over acquiring an equivalent gain' },
    { cat: 'Behavioral Economics (MBA)', name: 'Prospect Theory (concept)', expr: 'describes how people choose between probabilistic alternatives, weighing potential losses and gains differently' },
    { cat: 'Behavioral Economics (MBA)', name: 'Herd Behavior (concept)', expr: 'the tendency of individuals to mimic the actions of a larger group, especially in financial markets' },
    { cat: 'Behavioral Economics (MBA)', name: 'Nudge Theory (concept)', expr: 'using subtle policy shifts to encourage people toward decisions that are in their broad self-interest' },

    { cat: 'Game Theory in Business (MBA)', name: 'Game Theory (concept)', expr: 'the study of strategic decision-making between rational players whose outcomes depend on each other\'s choices' },
    { cat: 'Game Theory in Business (MBA)', name: 'Nash Equilibrium (concept)', expr: 'a state where no player can improve their outcome by changing strategy while others keep theirs unchanged' },
    { cat: 'Game Theory in Business (MBA)', name: "Prisoner's Dilemma (concept)", expr: 'a game illustrating why two rational players might not cooperate even when cooperation is in their best interest' },
    { cat: 'Game Theory in Business (MBA)', name: 'Dominant Strategy (concept)', expr: 'a strategy that yields the best outcome for a player regardless of what the other player chooses' },
    { cat: 'Game Theory in Business (MBA)', name: 'Zero-Sum Game (concept)', expr: 'a situation where one player\'s gain is exactly balanced by another player\'s loss' },
    { cat: 'Game Theory in Business (MBA)', name: 'Cooperative vs Non-Cooperative Game (concept)', expr: 'cooperative games allow binding agreements between players; non-cooperative games do not' },
    { cat: 'Game Theory in Business (MBA)', name: 'First-Mover Advantage (concept)', expr: 'the competitive edge gained by the first company to enter a market or introduce a product' },

    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Corporate Social Responsibility (CSR) (concept)', expr: 'a company\'s commitment to conducting business in a way that is ethical, sustainable, and beneficial to society' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Triple Bottom Line (concept)', expr: 'evaluates business performance across three dimensions: People, Planet, and Profit' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Business Ethics (concept)', expr: 'the study of moral principles that guide decision-making and conduct within a business' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Code of Conduct (concept)', expr: 'a set of formal rules outlining the expected behavior and ethical standards for employees of an organization' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Stakeholder Theory (concept)', expr: 'holds that a business should create value for all stakeholders, not just shareholders' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Sustainability Reporting (concept)', expr: 'the practice of publicly disclosing a company\'s environmental, social, and economic performance' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Environmental, Social, and Governance (ESG) (concept)', expr: 'a set of criteria used to evaluate a company\'s environmental impact, social responsibility, and governance practices' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Whistleblowing (concept)', expr: 'the act of an employee reporting illegal or unethical conduct within an organization to internal or external authorities' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Conflict of Interest (concept)', expr: 'a situation where a person\'s personal interests could improperly influence their professional judgment or duties' },
    { cat: 'CSR & Business Ethics (BBA-MBA)', name: 'Fair Trade (concept)', expr: 'a trading partnership that ensures fair prices, decent working conditions, and sustainable practices for producers' },
  ],
  'Computer Science': [
    { cat: 'Number Systems (9th-ICS)', name: 'Binary to Decimal', expr: 'Decimal = Σ(digit × 2^position), position starting at 0 from right' },
    { cat: 'Number Systems (9th-ICS)', name: 'Decimal to Binary', expr: 'Repeatedly divide decimal number by 2, read remainders bottom to top' },
    { cat: 'Number Systems (9th-ICS)', name: 'Binary to Octal', expr: 'Group binary digits in 3s from right, convert each group to octal digit' },
    { cat: 'Number Systems (9th-ICS)', name: 'Binary to Hexadecimal', expr: 'Group binary digits in 4s from right, convert each group to hex digit' },
    { cat: 'Number Systems (9th-ICS)', name: 'Octal to Decimal', expr: 'Decimal = Σ(digit × 8^position)' },
    { cat: 'Number Systems (9th-ICS)', name: 'Hexadecimal to Decimal', expr: 'Decimal = Σ(digit × 16^position)' },
    { cat: 'Number Systems (9th-ICS)', name: "1's Complement", expr: 'Flip every bit (0→1, 1→0)' },
    { cat: 'Number Systems (9th-ICS)', name: "2's Complement", expr: "2's Complement = 1's Complement + 1" },
    { cat: 'Number Systems (9th-ICS)', name: 'Signed Binary Range (n bits)', expr: 'Range = −2^(n−1) to 2^(n−1) − 1' },
    { cat: 'Number Systems (9th-ICS)', name: 'Unsigned Binary Range (n bits)', expr: 'Range = 0 to 2ⁿ − 1' },
    { cat: 'Number Systems (9th-ICS)', name: 'BCD (Binary Coded Decimal)', expr: 'Each decimal digit represented by its own 4-bit binary code' },
    { cat: 'Number Systems (9th-ICS)', name: 'ASCII Value Range', expr: 'Standard ASCII = 0 to 127 (7-bit)' },
    { cat: 'Number Systems (9th-ICS)', name: 'Number of Addressable Bytes (n address lines)', expr: 'Bytes = 2ⁿ' },
    { cat: 'Number Systems (9th-ICS)', name: 'Floating Point Bias (IEEE 754 Single)', expr: 'Bias = 127, Exponent stored = Actual exponent + 127' },
    { cat: 'Number Systems (9th-ICS)', name: 'IEEE 754 Single Precision Value', expr: 'Value = (−1)^S × 1.M × 2^(E−127)' },

    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'AND Gate', expr: 'Y = A · B (Y = 1 only if A = 1 and B = 1)' },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'OR Gate', expr: 'Y = A + B (Y = 1 if A = 1 or B = 1)' },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'NOT Gate', expr: "Y = A' (inverts input)" },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'NAND Gate', expr: "Y = (A · B)'" },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'NOR Gate', expr: "Y = (A + B)'" },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'XOR Gate', expr: 'Y = A ⊕ B (Y = 1 only when A ≠ B)' },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'XNOR Gate', expr: 'Y = (A ⊕ B)′ (Y = 1 only when A = B)' },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: "De Morgan's First Theorem", expr: "(A · B)' = A' + B'" },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: "De Morgan's Second Theorem", expr: "(A + B)' = A' · B'" },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'Idempotent Law', expr: 'A · A = A, A + A = A' },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'Complement Law', expr: "A · A' = 0, A + A' = 1" },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'Absorption Law', expr: 'A + (A · B) = A, A · (A + B) = A' },
    { cat: 'Boolean Algebra & Logic Gates (9th-ICS)', name: 'Distributive Law', expr: 'A · (B + C) = (A·B) + (A·C)' },
    { cat: 'Boolean Algebra & Logic Gates (ICS-BS)', name: 'Number of Rows in Truth Table', expr: 'Rows = 2ⁿ, for n input variables' },
    { cat: 'Boolean Algebra & Logic Gates (ICS-BS)', name: 'Sum of Products (SOP)', expr: 'Boolean expression written as OR of AND terms (minterms)' },
    { cat: 'Boolean Algebra & Logic Gates (ICS-BS)', name: 'Product of Sums (POS)', expr: 'Boolean expression written as AND of OR terms (maxterms)' },
    { cat: 'Boolean Algebra & Logic Gates (ICS-BS)', name: 'Karnaugh Map (K-Map) (concept)', expr: 'graphical method to simplify Boolean expressions by grouping adjacent 1s' },
    { cat: 'Boolean Algebra & Logic Gates (ICS-BS)', name: 'Half Adder Sum', expr: 'Sum = A ⊕ B, Carry = A · B' },
    { cat: 'Boolean Algebra & Logic Gates (ICS-BS)', name: 'Full Adder Sum', expr: 'Sum = A ⊕ B ⊕ Cin, Cout = AB + Cin(A ⊕ B)' },
    { cat: 'Boolean Algebra & Logic Gates (ICS-BS)', name: 'Multiplexer Output Lines', expr: 'A 2ⁿ:1 MUX has n select lines' },

    { cat: 'Programming Fundamentals (ICS)', name: 'Order of Operator Precedence (concept)', expr: '() → unary(!,++,--) → *,/,% → +,- → relational → equality → && → || → =' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Modulus Operator', expr: 'a % b = remainder after dividing a by b' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Increment/Decrement (concept)', expr: 'x++ uses value then adds 1 (post); ++x adds 1 then uses value (pre)' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Array Index Range (0-based)', expr: 'Valid indices = 0 to (Size − 1)' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Array Memory Address (1-D)', expr: 'Address(A[i]) = Base + i × Size_of_element' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Array Memory Address (2-D, Row-Major)', expr: 'Address(A[i][j]) = Base + (i × Cols + j) × Size_of_element' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Array Memory Address (2-D, Column-Major)', expr: 'Address(A[i][j]) = Base + (j × Rows + i) × Size_of_element' },
    { cat: 'Programming Fundamentals (ICS)', name: 'For Loop Iteration Count', expr: 'Iterations = ⌈(End − Start)/Step⌉' },
    { cat: 'Programming Fundamentals (ICS)', name: 'String Length (concept)', expr: 'number of characters before the null terminator (\\0) in a C-string' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Function Call Stack (concept)', expr: 'each function call pushes a stack frame; return pops it' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Recursion Base Case (concept)', expr: 'the condition that stops recursive calls and prevents infinite recursion' },
    { cat: 'Programming Fundamentals (ICS)', name: 'Type Casting (concept)', expr: 'explicit conversion of a value from one data type to another' },
    { cat: 'OOP with C++ (ICS)', name: 'Class vs Object (concept)', expr: 'a class is a blueprint; an object is an instance created from that class' },
    { cat: 'OOP with C++ (ICS)', name: 'Four Pillars of OOP (concept)', expr: 'Encapsulation, Abstraction, Inheritance, Polymorphism' },
    { cat: 'OOP with C++ (ICS)', name: 'Constructor (concept)', expr: 'special member function, same name as class, runs automatically on object creation' },
    { cat: 'OOP with C++ (ICS)', name: 'Function Overloading (concept)', expr: 'same function name with different parameter lists (compile-time polymorphism)' },
    { cat: 'OOP with C++ (ICS)', name: 'Virtual Function (concept)', expr: 'enables runtime polymorphism by resolving the call to the derived class method' },

    { cat: 'Data Structures (ICS-BS)', name: 'Stack (LIFO) (concept)', expr: 'Last In, First Out — push/pop only at the top' },
    { cat: 'Data Structures (ICS-BS)', name: 'Queue (FIFO) (concept)', expr: 'First In, First Out — insert at rear, remove from front' },
    { cat: 'Data Structures (ICS-BS)', name: 'Stack Overflow Condition', expr: 'Top = Max_Size − 1 and a push is attempted' },
    { cat: 'Data Structures (ICS-BS)', name: 'Stack Underflow Condition', expr: 'Top = −1 and a pop is attempted' },
    { cat: 'Data Structures (ICS-BS)', name: 'Circular Queue Rear (Insert)', expr: 'Rear = (Rear + 1) mod Size' },
    { cat: 'Data Structures (ICS-BS)', name: 'Linked List Node (concept)', expr: 'a node stores data plus a pointer/reference to the next node' },
    { cat: 'Data Structures (ICS-BS)', name: 'Singly vs Doubly Linked List (concept)', expr: 'singly stores next pointer only; doubly stores next and previous pointers' },
    { cat: 'Data Structures (BS)', name: 'Binary Tree Max Nodes at Level L', expr: 'Max Nodes = 2^L (root at L = 0)' },
    { cat: 'Data Structures (BS)', name: 'Binary Tree Max Nodes (height h)', expr: 'Max Nodes = 2^(h+1) − 1' },
    { cat: 'Data Structures (BS)', name: 'Minimum Height of Binary Tree (n nodes)', expr: 'h_min = ⌈log₂(n+1)⌉ − 1' },
    { cat: 'Data Structures (BS)', name: 'Complete Binary Tree Leaf Nodes', expr: 'Leaf Nodes ≈ ⌈n/2⌉, for n total nodes' },
    { cat: 'Data Structures (BS)', name: 'Binary Search Tree Property', expr: 'Left subtree keys < node key < Right subtree keys' },
    { cat: 'Data Structures (BS)', name: 'AVL Tree Balance Factor', expr: 'BF = Height(Left subtree) − Height(Right subtree), must be in {−1, 0, 1}' },
    { cat: 'Data Structures (BS)', name: 'Tree Traversal Orders (concept)', expr: 'Inorder (L-Root-R), Preorder (Root-L-R), Postorder (L-R-Root)' },
    { cat: 'Data Structures (BS)', name: 'Graph Edges (Undirected, Complete)', expr: 'Max Edges = n(n−1)/2' },
    { cat: 'Data Structures (BS)', name: 'Graph Edges (Directed, Complete)', expr: 'Max Edges = n(n−1)' },
    { cat: 'Data Structures (BS)', name: "Handshaking Lemma", expr: 'Σ(degree of all vertices) = 2 × Number of Edges' },
    { cat: 'Data Structures (BS)', name: 'Adjacency Matrix Space', expr: 'Space = O(n²), for n vertices' },
    { cat: 'Data Structures (BS)', name: 'Hash Table Load Factor', expr: 'α = Number of entries/Number of buckets' },
    { cat: 'Data Structures (BS)', name: 'Hash Function (Division Method)', expr: 'h(k) = k mod m' },
    { cat: 'Data Structures (BS)', name: 'Linear Probing (Collision Resolution)', expr: 'h(k, i) = (h(k) + i) mod m' },
    { cat: 'Data Structures (BS)', name: 'Heap Parent Index (0-based array)', expr: 'Parent(i) = ⌊(i−1)/2⌋' },
    { cat: 'Data Structures (BS)', name: 'Heap Left Child Index', expr: 'Left(i) = 2i + 1' },
    { cat: 'Data Structures (BS)', name: 'Heap Right Child Index', expr: 'Right(i) = 2i + 2' },
    { cat: 'Data Structures (BS)', name: 'Min-Heap / Max-Heap Property (concept)', expr: 'in a min-heap every parent ≤ its children; in a max-heap every parent ≥ its children' },

    { cat: 'Algorithm Complexity (ICS-BS)', name: 'Big-O Notation (concept)', expr: 'O(g(n)) describes the worst-case upper bound of an algorithm\'s growth rate' },
    { cat: 'Algorithm Complexity (ICS-BS)', name: 'Constant Time', expr: 'O(1)' },
    { cat: 'Algorithm Complexity (ICS-BS)', name: 'Logarithmic Time', expr: 'O(log n)' },
    { cat: 'Algorithm Complexity (ICS-BS)', name: 'Linear Time', expr: 'O(n)' },
    { cat: 'Algorithm Complexity (ICS-BS)', name: 'Linearithmic Time', expr: 'O(n log n)' },
    { cat: 'Algorithm Complexity (ICS-BS)', name: 'Quadratic Time', expr: 'O(n²)' },
    { cat: 'Algorithm Complexity (ICS-BS)', name: 'Exponential Time', expr: 'O(2ⁿ)' },
    { cat: 'Algorithm Complexity (BS)', name: 'Linear Search Complexity', expr: 'Best = O(1), Worst/Average = O(n)' },
    { cat: 'Algorithm Complexity (BS)', name: 'Binary Search Complexity', expr: 'O(log n), array must be sorted' },
    { cat: 'Algorithm Complexity (BS)', name: 'Bubble Sort Complexity', expr: 'Best = O(n), Worst/Average = O(n²)' },
    { cat: 'Algorithm Complexity (BS)', name: 'Selection Sort Complexity', expr: 'O(n²) in all cases' },
    { cat: 'Algorithm Complexity (BS)', name: 'Insertion Sort Complexity', expr: 'Best = O(n), Worst/Average = O(n²)' },
    { cat: 'Algorithm Complexity (BS)', name: 'Merge Sort Complexity', expr: 'O(n log n) in all cases' },
    { cat: 'Algorithm Complexity (BS)', name: 'Quick Sort Complexity', expr: 'Best/Average = O(n log n), Worst = O(n²)' },
    { cat: 'Algorithm Complexity (BS)', name: 'Heap Sort Complexity', expr: 'O(n log n) in all cases' },
    { cat: 'Algorithm Complexity (BS)', name: 'Master Theorem (Divide & Conquer)', expr: 'T(n) = aT(n/b) + f(n), compares f(n) to n^(log_b a)' },
    { cat: 'Algorithm Complexity (BS)', name: "Fibonacci Recursive Recurrence", expr: 'T(n) = T(n−1) + T(n−2) + O(1)' },
    { cat: 'Algorithm Complexity (BS)', name: 'Space Complexity (concept)', expr: 'the amount of extra memory an algorithm uses relative to input size' },
    { cat: 'Algorithm Complexity (BS-MS)', name: "Amortized Analysis (concept)", expr: 'average cost per operation over a worst-case sequence of operations' },
    { cat: 'Algorithm Complexity (BS-MS)', name: 'Dynamic Programming (concept)', expr: 'breaks a problem into overlapping subproblems and stores results to avoid recomputation' },
    { cat: 'Algorithm Complexity (BS-MS)', name: 'Greedy Algorithm (concept)', expr: 'makes the locally optimal choice at each step, hoping for a global optimum' },
    { cat: 'Algorithm Complexity (BS-MS)', name: "Dijkstra's Algorithm (concept)", expr: 'finds shortest paths from a source vertex in a weighted graph with non-negative edges' },
    { cat: 'Algorithm Complexity (BS-MS)', name: 'P vs NP (concept)', expr: 'P = problems solvable in polynomial time; NP = problems verifiable in polynomial time' },

    { cat: 'Database / DBMS (BS)', name: 'Primary Key (concept)', expr: 'a column (or set of columns) that uniquely identifies each row in a table' },
    { cat: 'Database / DBMS (BS)', name: 'Foreign Key (concept)', expr: 'a column that references the primary key of another table, linking the two' },
    { cat: 'Database / DBMS (BS)', name: 'Cardinality of Cartesian Product', expr: '|R × S| = |R| × |S|' },
    { cat: 'Database / DBMS (BS)', name: 'Relational Algebra — Selection', expr: 'σ(condition)(Table) — filters rows meeting a condition' },
    { cat: 'Database / DBMS (BS)', name: 'Relational Algebra — Projection', expr: 'π(columns)(Table) — selects specific columns' },
    { cat: 'Database / DBMS (BS)', name: 'Relational Algebra — Join', expr: 'R ⋈ S — combines rows from two tables on a related column' },
    { cat: 'Database / DBMS (BS)', name: '1NF (First Normal Form) (concept)', expr: 'all columns hold atomic (indivisible) values, no repeating groups' },
    { cat: 'Database / DBMS (BS)', name: '2NF (Second Normal Form) (concept)', expr: '1NF plus no partial dependency of any column on part of a composite key' },
    { cat: 'Database / DBMS (BS)', name: '3NF (Third Normal Form) (concept)', expr: '2NF plus no transitive dependency of non-key columns on other non-key columns' },
    { cat: 'Database / DBMS (BS)', name: 'BCNF (Boyce-Codd Normal Form) (concept)', expr: 'every determinant in a functional dependency must be a candidate key' },
    { cat: 'Database / DBMS (BS)', name: 'ACID Properties (concept)', expr: 'Atomicity, Consistency, Isolation, Durability — guarantee reliable transactions' },
    { cat: 'Database / DBMS (BS)', name: 'Functional Dependency Notation', expr: 'X → Y means X uniquely determines Y' },
    { cat: 'Database / DBMS (BS)', name: 'Entity-Relationship (ER) Cardinality (concept)', expr: 'describes 1:1, 1:N, or M:N relationships between entities' },
    { cat: 'Database / DBMS (BS)', name: 'SQL Query Execution Order (concept)', expr: 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY' },
    { cat: 'Database / DBMS (BS)', name: 'B-Tree Index (concept)', expr: 'a balanced tree structure used by databases to speed up row lookups' },

    { cat: 'Computer Networks (ICS-BS)', name: 'OSI Model Layers (concept)', expr: 'Physical, Data Link, Network, Transport, Session, Presentation, Application' },
    { cat: 'Computer Networks (ICS-BS)', name: 'TCP/IP Model Layers (concept)', expr: 'Network Access, Internet, Transport, Application' },
    { cat: 'Computer Networks (ICS-BS)', name: 'IPv4 Address Format', expr: '32 bits, written as 4 octets, e.g. 192.168.1.1' },
    { cat: 'Computer Networks (ICS-BS)', name: 'IPv6 Address Format', expr: '128 bits, written as 8 groups of hexadecimal, e.g. 2001:0db8::1' },
    { cat: 'Computer Networks (ICS-BS)', name: 'Number of Hosts per Subnet', expr: 'Usable Hosts = 2^(32−prefix) − 2' },
    { cat: 'Computer Networks (ICS-BS)', name: 'Number of Subnets', expr: 'Subnets = 2^(borrowed bits)' },
    { cat: 'Computer Networks (ICS-BS)', name: 'Default Subnet Mask (Class A)', expr: '255.0.0.0 (/8)' },
    { cat: 'Computer Networks (ICS-BS)', name: 'Default Subnet Mask (Class B)', expr: '255.255.0.0 (/16)' },
    { cat: 'Computer Networks (ICS-BS)', name: 'Default Subnet Mask (Class C)', expr: '255.255.255.0 (/24)' },
    { cat: 'Computer Networks (BS)', name: 'Bandwidth vs Throughput (concept)', expr: 'bandwidth = maximum theoretical data rate; throughput = actual achieved data rate' },
    { cat: 'Computer Networks (BS)', name: 'Data Transfer Time', expr: 'Time = File Size/Bandwidth' },
    { cat: 'Computer Networks (BS)', name: 'Propagation Delay', expr: 'Propagation Delay = Distance/Propagation Speed' },
    { cat: 'Computer Networks (BS)', name: 'Transmission Delay', expr: 'Transmission Delay = Packet Size/Bandwidth' },
    { cat: 'Computer Networks (BS)', name: 'Total Latency (Simple)', expr: 'Latency = Transmission Delay + Propagation Delay + Queuing Delay + Processing Delay' },
    { cat: 'Computer Networks (BS)', name: "Nyquist Bit Rate (Noiseless Channel)", expr: 'BitRate = 2 × Bandwidth × log₂(L), L = signal levels' },
    { cat: 'Computer Networks (BS)', name: 'Shannon Capacity (Noisy Channel)', expr: 'Capacity = Bandwidth × log₂(1 + SNR)' },
    { cat: 'Computer Networks (BS)', name: 'CRC / Checksum (concept)', expr: 'error-detection codes that verify data integrity after transmission' },
    { cat: 'Computer Networks (BS)', name: 'Three-Way TCP Handshake (concept)', expr: 'SYN → SYN-ACK → ACK, used to establish a reliable TCP connection' },
    { cat: 'Computer Networks (BS)', name: 'TCP vs UDP (concept)', expr: 'TCP is connection-oriented and reliable; UDP is connectionless and faster but unreliable' },
    { cat: 'Computer Networks (BS)', name: 'DNS Resolution (concept)', expr: 'translates a human-readable domain name into its numeric IP address' },

    { cat: 'Operating Systems (BS)', name: 'CPU Utilization', expr: 'CPU Utilization = (Busy Time/Total Time) × 100' },
    { cat: 'Operating Systems (BS)', name: 'Throughput (OS)', expr: 'Throughput = Number of Processes Completed/Total Time' },
    { cat: 'Operating Systems (BS)', name: 'Turnaround Time', expr: 'Turnaround Time = Completion Time − Arrival Time' },
    { cat: 'Operating Systems (BS)', name: 'Waiting Time', expr: 'Waiting Time = Turnaround Time − Burst Time' },
    { cat: 'Operating Systems (BS)', name: 'Response Time', expr: 'Response Time = Time of first CPU response − Arrival Time' },
    { cat: 'Operating Systems (BS)', name: 'FCFS Scheduling (concept)', expr: 'First Come, First Served — processes executed strictly in arrival order' },
    { cat: 'Operating Systems (BS)', name: 'SJF Scheduling (concept)', expr: 'Shortest Job First — process with smallest burst time runs next' },
    { cat: 'Operating Systems (BS)', name: 'Round Robin Scheduling (concept)', expr: 'each process gets a fixed time quantum in cyclic order' },
    { cat: 'Operating Systems (BS)', name: 'Page Fault (concept)', expr: 'occurs when a requested page is not present in main memory' },
    { cat: 'Operating Systems (BS)', name: 'Page Fault Rate', expr: 'Page Fault Rate = Number of Page Faults/Total Page References' },
    { cat: 'Operating Systems (BS)', name: 'Effective Access Time (with paging)', expr: 'EAT = (1−p) × Memory Access Time + p × Page Fault Time, p = fault rate' },
    { cat: 'Operating Systems (BS)', name: 'Number of Pages', expr: 'Pages = ⌈Process Size/Page Size⌉' },
    { cat: 'Operating Systems (BS)', name: 'Number of Frames', expr: 'Frames = Physical Memory Size/Page Size' },
    { cat: 'Operating Systems (BS)', name: 'Logical Address (Paging)', expr: 'Logical Address = (Page Number, Offset)' },
    { cat: 'Operating Systems (BS)', name: 'Deadlock Necessary Conditions (concept)', expr: 'Mutual Exclusion, Hold and Wait, No Preemption, Circular Wait' },
    { cat: 'Operating Systems (BS)', name: 'Semaphore (concept)', expr: 'an integer variable used with wait()/signal() to control access to shared resources' },
    { cat: 'Operating Systems (BS)', name: 'Belady\'s Anomaly (concept)', expr: 'page fault rate can increase even when more frames are allocated (in FIFO)' },

    { cat: 'Computer Architecture (BS)', name: 'CPU Clock Cycle Time', expr: 'Cycle Time = 1/Clock Frequency' },
    { cat: 'Computer Architecture (BS)', name: 'CPU Execution Time', expr: 'Execution Time = Instruction Count × CPI × Cycle Time' },
    { cat: 'Computer Architecture (BS)', name: 'MIPS (Million Instructions per Second)', expr: 'MIPS = Instruction Count/(Execution Time × 10⁶)' },
    { cat: 'Computer Architecture (BS)', name: 'Speedup (Amdahl\'s Law)', expr: 'Speedup = 1/((1 − f) + f/S), f = fraction improved, S = speedup of that fraction' },
    { cat: 'Computer Architecture (BS)', name: 'Cache Hit Ratio', expr: 'Hit Ratio = Number of Hits/Total Memory Accesses' },
    { cat: 'Computer Architecture (BS)', name: 'Average Memory Access Time (AMAT)', expr: 'AMAT = Hit Time + Miss Rate × Miss Penalty' },
    { cat: 'Computer Architecture (BS)', name: 'Pipeline Speedup (Ideal)', expr: 'Speedup = Number of Pipeline Stages (ideal, no stalls)' },
    { cat: 'Computer Architecture (BS)', name: 'Pipeline Execution Time', expr: 'Time = (k + n − 1) × Clock Cycle, k = stages, n = instructions' },
    { cat: 'Computer Architecture (BS)', name: 'Memory Address Space', expr: 'Address Space = 2^(number of address bits)' },
    { cat: 'Computer Architecture (BS)', name: "Moore's Law (concept)", expr: 'the number of transistors on a chip roughly doubles every two years' },
    { cat: 'Computer Architecture (BS)', name: 'RISC vs CISC (concept)', expr: 'RISC uses simple, fixed-length instructions; CISC uses complex, variable-length instructions' },

    { cat: 'Software Engineering (BS)', name: 'Software Development Life Cycle (concept)', expr: 'Requirements → Design → Implementation → Testing → Deployment → Maintenance' },
    { cat: 'Software Engineering (BS)', name: 'Lines of Code (LOC) Metric (concept)', expr: 'a simple size measure counting the number of code lines in a program' },
    { cat: 'Software Engineering (BS)', name: 'COCOMO Effort Estimate (Basic)', expr: 'Effort = a × (KLOC)^b person-months' },
    { cat: 'Software Engineering (BS)', name: 'Function Point Analysis (concept)', expr: 'estimates software size based on functionality delivered to the user' },
    { cat: 'Software Engineering (BS)', name: 'Defect Density', expr: 'Defect Density = Number of Defects/Size (KLOC or Function Points)' },
    { cat: 'Software Engineering (BS)', name: 'Test Coverage', expr: 'Coverage = (Lines/Branches Tested/Total Lines/Branches) × 100' },
    { cat: 'Software Engineering (BS)', name: 'Cyclomatic Complexity', expr: 'V(G) = E − N + 2, E = edges, N = nodes in control flow graph' },
    { cat: 'Software Engineering (BS)', name: 'Software Reliability (concept)', expr: 'the probability that software performs without failure for a given time period' },
    { cat: 'Software Engineering (BS)', name: 'Agile Velocity', expr: 'Velocity = Story Points Completed/Sprint' },
    { cat: 'Software Engineering (BS)', name: 'SOLID Principles (concept)', expr: 'Single Responsibility, Open-Closed, Liskov Substitution, Interface Segregation, Dependency Inversion' },

    { cat: 'Cybersecurity & Cryptography (ICS-BS)', name: 'Caesar Cipher Encryption', expr: 'Cipher = (Plain + Shift) mod 26' },
    { cat: 'Cybersecurity & Cryptography (ICS-BS)', name: 'Caesar Cipher Decryption', expr: 'Plain = (Cipher − Shift) mod 26' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'Symmetric vs Asymmetric Encryption (concept)', expr: 'symmetric uses one shared key; asymmetric uses a public/private key pair' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'RSA Key Generation (concept)', expr: 'choose primes p, q → n = p×q, compute φ(n) = (p−1)(q−1), pick e, d such that e·d ≡ 1 mod φ(n)' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'RSA Encryption', expr: 'C = M^e mod n' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'RSA Decryption', expr: 'M = C^d mod n' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'Hashing (concept)', expr: 'one-way function that maps data of any size to a fixed-size digest, used for integrity checks' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'Digital Signature (concept)', expr: 'a hash of the message encrypted with the sender\'s private key, verified with their public key' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'Brute Force Key Space', expr: 'Possible Keys = 2^(key length in bits)' },
    { cat: 'Cybersecurity & Cryptography (BS)', name: 'CIA Triad (concept)', expr: 'Confidentiality, Integrity, Availability — the three core goals of information security' },

    { cat: 'Theory of Computation (BS-MS)', name: 'Finite Automaton (concept)', expr: 'a machine with a finite set of states used to recognize regular languages' },
    { cat: 'Theory of Computation (BS-MS)', name: 'DFA vs NFA (concept)', expr: 'DFA has exactly one transition per input per state; NFA may have zero, one, or many' },
    { cat: 'Theory of Computation (BS-MS)', name: 'Regular Expression (concept)', expr: 'a pattern describing a set of strings accepted by a finite automaton' },
    { cat: 'Theory of Computation (BS-MS)', name: 'Context-Free Grammar (concept)', expr: 'a set of production rules of the form A → α used to generate context-free languages' },
    { cat: 'Theory of Computation (BS-MS)', name: 'Turing Machine (concept)', expr: 'an abstract machine with an infinite tape that models general computation' },
    { cat: 'Theory of Computation (BS-MS)', name: 'Decidability (concept)', expr: 'a problem is decidable if an algorithm exists that always halts with a correct yes/no answer' },
    { cat: 'Theory of Computation (BS-MS)', name: 'Chomsky Hierarchy (concept)', expr: 'Type 0 (Recursively Enumerable) ⊃ Type 1 (Context-Sensitive) ⊃ Type 2 (Context-Free) ⊃ Type 3 (Regular)' },

    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Accuracy', expr: 'Accuracy = (TP + TN)/(TP + TN + FP + FN)' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Precision', expr: 'Precision = TP/(TP + FP)' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Recall (Sensitivity)', expr: 'Recall = TP/(TP + FN)' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'F1 Score', expr: 'F1 = 2 × (Precision × Recall)/(Precision + Recall)' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Mean Squared Error (Loss)', expr: 'MSE = (1/n) × Σ(yᵢ − ŷᵢ)²' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Sigmoid Activation Function', expr: 'σ(x) = 1/(1 + e^(−x))' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'ReLU Activation Function', expr: 'ReLU(x) = max(0, x)' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Gradient Descent Update Rule', expr: 'θ = θ − α × ∇J(θ), α = learning rate' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Euclidean Distance (k-NN)', expr: 'd(p,q) = √Σ(pᵢ − qᵢ)²' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: "Bayes' Theorem (Naive Bayes)", expr: 'P(A|B) = P(B|A)P(A)/P(B)' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Overfitting vs Underfitting (concept)', expr: 'overfitting learns noise in training data; underfitting fails to capture the underlying pattern' },
    { cat: 'Artificial Intelligence & ML (BS-MS)', name: 'Train/Test Split (concept)', expr: 'dataset is divided into a training set (to fit the model) and a test set (to evaluate it)' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'SR Flip-Flop (concept)', expr: 'basic latch with Set and Reset inputs; invalid state when S=R=1' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'D Flip-Flop (concept)', expr: 'output Q follows input D on each clock edge, avoids the invalid SR state' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'JK Flip-Flop Toggle', expr: 'when J = K = 1, output toggles on each clock pulse' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'T Flip-Flop (concept)', expr: 'output toggles every clock pulse when T = 1, holds when T = 0' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'Modulus of a Counter', expr: 'MOD-N counter cycles through N states before repeating' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'Flip-Flops Needed for MOD-N Counter', expr: 'n = ⌈log₂ N⌉' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'Shift Register (concept)', expr: 'a chain of flip-flops that shifts stored bits left or right on each clock pulse' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'Register Capacity', expr: 'an n-bit register can store 2ⁿ distinct values' },
    { cat: 'Digital Logic — Sequential Circuits (BS)', name: 'Propagation Delay of a Gate (concept)', expr: 'the time taken for a gate\'s output to change after its input changes' },
    { cat: 'Digital Logic — Number Codes (ICS-BS)', name: 'Gray Code Property (concept)', expr: 'only one bit changes between two successive values' },
    { cat: 'Digital Logic — Number Codes (ICS-BS)', name: 'Binary to Gray Code', expr: 'G₀ = B₀, Gᵢ = Bᵢ ⊕ Bᵢ₋₁' },
    { cat: 'Digital Logic — Number Codes (ICS-BS)', name: 'Excess-3 Code', expr: 'Excess-3 = BCD code + 0011 (adds 3 to each decimal digit before converting)' },
    { cat: 'Digital Logic — Number Codes (ICS-BS)', name: 'Parity Bit (Even Parity)', expr: 'added bit makes the total number of 1s in the word even' },
    { cat: 'Digital Logic — Number Codes (ICS-BS)', name: 'Parity Bit (Odd Parity)', expr: 'added bit makes the total number of 1s in the word odd' },

    { cat: 'Discrete Structures for CS (BS)', name: 'Number of Subsets of a Set', expr: 'Subsets = 2ⁿ, for a set with n elements' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Number of Proper Subsets', expr: 'Proper Subsets = 2ⁿ − 1' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Permutations (nPr)', expr: 'nPr = n!/(n − r)!' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Combinations (nCr)', expr: 'nCr = n!/(r!(n − r)!)' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Power Set Cardinality', expr: '|P(A)| = 2^|A|' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Logical Implication Truth Table (concept)', expr: 'p → q is false only when p is true and q is false' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Biconditional (p ↔ q) (concept)', expr: 'true only when p and q have the same truth value' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Contrapositive (concept)', expr: 'the contrapositive of p → q is ¬q → ¬p, and is logically equivalent to it' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Relation Reflexive Property (concept)', expr: 'every element is related to itself: (a,a) ∈ R for all a' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Relation Symmetric Property (concept)', expr: 'if (a,b) ∈ R then (b,a) ∈ R' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Relation Transitive Property (concept)', expr: 'if (a,b) ∈ R and (b,c) ∈ R then (a,c) ∈ R' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Equivalence Relation (concept)', expr: 'a relation that is reflexive, symmetric, and transitive' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Mathematical Induction (concept)', expr: 'prove base case P(1), then prove P(k) ⟹ P(k+1) to conclude P(n) for all n' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Pigeonhole Principle (concept)', expr: 'if n items are placed into m containers and n > m, at least one container holds more than one item' },
    { cat: 'Discrete Structures for CS (BS)', name: 'Graph Coloring — Chromatic Number (concept)', expr: 'the minimum number of colors needed so no two adjacent vertices share a color' },
    { cat: 'Discrete Structures for CS (BS)', name: "Euler's Formula for Planar Graphs", expr: 'V − E + F = 2, V = vertices, E = edges, F = faces' },

    { cat: 'Programming Languages & Compilers (BS)', name: 'Compiler vs Interpreter (concept)', expr: 'a compiler translates the whole program to machine code before running; an interpreter executes line by line' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Phases of a Compiler (concept)', expr: 'Lexical Analysis → Syntax Analysis → Semantic Analysis → Intermediate Code → Optimization → Code Generation' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Lexical Analysis (concept)', expr: 'breaks source code into tokens (keywords, identifiers, operators, etc.)' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Syntax Analysis / Parsing (concept)', expr: 'checks token sequence against grammar rules and builds a parse tree' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Top-Down vs Bottom-Up Parsing (concept)', expr: 'top-down builds the parse tree from root to leaves; bottom-up builds it from leaves to root' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Symbol Table (concept)', expr: 'a data structure storing information about identifiers used in a program' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Static vs Dynamic Typing (concept)', expr: 'static typing checks types at compile time; dynamic typing checks types at runtime' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Pass by Value vs Pass by Reference (concept)', expr: 'pass by value copies the argument; pass by reference passes the original variable\'s address' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Garbage Collection (concept)', expr: 'automatic reclaiming of memory occupied by objects no longer referenced by the program' },
    { cat: 'Programming Languages & Compilers (BS)', name: 'Exception Handling (concept)', expr: 'try/catch blocks used to detect and handle runtime errors gracefully' },

    { cat: 'Web Development (ICS-BS)', name: 'HTTP Status Codes (concept)', expr: '2xx Success, 3xx Redirection, 4xx Client Error, 5xx Server Error' },
    { cat: 'Web Development (ICS-BS)', name: 'HTTP GET vs POST (concept)', expr: 'GET requests data and appends parameters to the URL; POST sends data in the request body' },
    { cat: 'Web Development (ICS-BS)', name: 'Client-Server Model (concept)', expr: 'clients send requests to a server, which processes them and returns responses' },
    { cat: 'Web Development (ICS-BS)', name: 'Frontend vs Backend (concept)', expr: 'frontend handles what the user sees (HTML/CSS/JS); backend handles server logic, data, and APIs' },
    { cat: 'Web Development (ICS-BS)', name: 'Cookies vs Sessions (concept)', expr: 'cookies are stored on the client; sessions are stored on the server and referenced by a session ID' },
    { cat: 'Web Development (ICS-BS)', name: 'REST API (concept)', expr: 'an architectural style using HTTP methods (GET, POST, PUT, DELETE) to access and manipulate resources' },
    { cat: 'Web Development (ICS-BS)', name: 'DOM (Document Object Model) (concept)', expr: 'a tree-structured representation of an HTML page that JavaScript can read and modify' },
    { cat: 'Web Development (ICS-BS)', name: 'Responsive Web Design (concept)', expr: 'layouts that adapt to different screen sizes using flexible grids and media queries' },

    { cat: 'Version Control (ICS-BS)', name: 'Git Repository (concept)', expr: 'a folder tracked by Git that stores the full history of changes to its files' },
    { cat: 'Version Control (ICS-BS)', name: 'Git Commit (concept)', expr: 'a saved snapshot of changes in the repository at a point in time' },
    { cat: 'Version Control (ICS-BS)', name: 'Git Branch (concept)', expr: 'an independent line of development that can be merged back into the main codebase' },
    { cat: 'Version Control (ICS-BS)', name: 'Merge Conflict (concept)', expr: 'occurs when two branches change the same lines of a file differently and Git cannot auto-merge' },
    { cat: 'Version Control (ICS-BS)', name: 'Push vs Pull (concept)', expr: 'push uploads local commits to a remote repository; pull downloads and merges remote changes locally' },

    { cat: 'Cloud & Distributed Systems (BS-MS)', name: 'IaaS / PaaS / SaaS (concept)', expr: 'Infrastructure, Platform, and Software as a Service — increasing levels of managed cloud abstraction' },
    { cat: 'Cloud & Distributed Systems (BS-MS)', name: 'Horizontal vs Vertical Scaling (concept)', expr: 'horizontal scaling adds more machines; vertical scaling adds more power to an existing machine' },
    { cat: 'Cloud & Distributed Systems (BS-MS)', name: 'Load Balancing (concept)', expr: 'distributes incoming requests across multiple servers to optimize resource use and avoid overload' },
    { cat: 'Cloud & Distributed Systems (BS-MS)', name: 'CAP Theorem', expr: 'a distributed system can guarantee at most 2 of: Consistency, Availability, Partition tolerance' },
    { cat: 'Cloud & Distributed Systems (BS-MS)', name: 'Latency vs Throughput (Distributed Systems) (concept)', expr: 'latency = time for one request to complete; throughput = requests handled per unit time' },
    { cat: 'Cloud & Distributed Systems (BS-MS)', name: 'Virtualization (concept)', expr: 'running multiple virtual machines on one physical machine via a hypervisor' },
    { cat: 'Cloud & Distributed Systems (BS-MS)', name: 'Containerization (concept)', expr: 'packaging an application with its dependencies into a lightweight, portable container (e.g. Docker)' },

    { cat: 'File Systems & I/O (BS)', name: 'File Allocation Methods (concept)', expr: 'Contiguous, Linked, and Indexed allocation are the three main disk space allocation methods' },
    { cat: 'File Systems & I/O (BS)', name: 'FCFS Disk Scheduling (concept)', expr: 'requests served strictly in the order they arrive' },
    { cat: 'File Systems & I/O (BS)', name: 'SSTF Disk Scheduling (concept)', expr: 'Shortest Seek Time First — services the request closest to the current head position' },
    { cat: 'File Systems & I/O (BS)', name: 'SCAN Disk Scheduling (concept)', expr: 'the disk arm moves in one direction servicing requests, reverses at the end (elevator algorithm)' },
    { cat: 'File Systems & I/O (BS)', name: 'Disk Seek Time', expr: 'Total Access Time = Seek Time + Rotational Latency + Transfer Time' },
    { cat: 'File Systems & I/O (BS)', name: 'RAID 0 (concept)', expr: 'striping data across multiple disks for speed, with no redundancy' },
    { cat: 'File Systems & I/O (BS)', name: 'RAID 1 (concept)', expr: 'mirroring — data is duplicated identically across two disks for redundancy' },

    { cat: 'Computer Graphics (BS)', name: 'Pixel Resolution', expr: 'Resolution = Horizontal Pixels × Vertical Pixels' },
    { cat: 'Computer Graphics (BS)', name: 'Image File Size (Uncompressed)', expr: 'Size (bits) = Width × Height × Bits per Pixel' },
    { cat: 'Computer Graphics (BS)', name: 'Aspect Ratio', expr: 'Aspect Ratio = Width : Height' },
    { cat: 'Computer Graphics (BS)', name: 'RGB Color Model (concept)', expr: 'colors formed by combining Red, Green, and Blue light values, each typically 0–255' },
    { cat: 'Computer Graphics (BS)', name: 'Frame Rate', expr: 'FPS = Number of Frames/Time in seconds' },
    { cat: 'Computer Graphics (BS)', name: '2D Translation Transformation', expr: "x' = x + tx, y' = y + ty" },
    { cat: 'Computer Graphics (BS)', name: '2D Scaling Transformation', expr: "x' = x × sx, y' = y × sy" },

    { cat: 'Data Science & Statistics for CS (BS-MS)', name: 'Confusion Matrix (concept)', expr: 'a table showing True Positives, True Negatives, False Positives, and False Negatives' },
    { cat: 'Data Science & Statistics for CS (BS-MS)', name: 'Entropy (Information Theory)', expr: 'H(X) = −Σ p(x) log₂ p(x)' },
    { cat: 'Data Science & Statistics for CS (BS-MS)', name: 'Information Gain (Decision Trees)', expr: 'IG = Entropy(Parent) − Weighted Average Entropy(Children)' },
    { cat: 'Data Science & Statistics for CS (BS-MS)', name: 'K-Means Clustering Objective', expr: 'minimizes Σ ||xᵢ − centroid_of_cluster||²' },
    { cat: 'Data Science & Statistics for CS (BS-MS)', name: 'Normalization (Min-Max Scaling)', expr: "x' = (x − min)/(max − min)" },
    { cat: 'Data Science & Statistics for CS (BS-MS)', name: 'Standardization (Z-score)', expr: "x' = (x − μ)/σ" },
    { cat: 'Data Science & Statistics for CS (BS-MS)', name: 'Cosine Similarity', expr: 'cos(θ) = (A · B)/(||A|| × ||B||)' },

    { cat: 'Software Design Patterns (BS)', name: 'Singleton Pattern (concept)', expr: 'ensures a class has only one instance and provides a global point of access to it' },
    { cat: 'Software Design Patterns (BS)', name: 'Factory Pattern (concept)', expr: 'creates objects without specifying the exact class of object to be created' },
    { cat: 'Software Design Patterns (BS)', name: 'Observer Pattern (concept)', expr: 'defines a one-to-many dependency so that when one object changes state, all dependents are notified' },
    { cat: 'Software Design Patterns (BS)', name: 'MVC Architecture (concept)', expr: 'Model (data), View (UI), Controller (logic) — separates concerns in an application' },

    { cat: 'Number Systems — Extra (ICS-BS)', name: 'Decimal to BCD', expr: 'convert each decimal digit separately into its 4-bit binary equivalent' },
    { cat: 'Number Systems — Extra (ICS-BS)', name: 'Hexadecimal Addition (concept)', expr: 'add digit by digit in base 16, carrying 1 whenever a column sum reaches 16' },
    { cat: 'Number Systems — Extra (ICS-BS)', name: 'Fixed-Point vs Floating-Point (concept)', expr: 'fixed-point has a set number of digits after the decimal; floating-point uses a mantissa and exponent for a wider range' },
    { cat: 'Number Systems — Extra (ICS-BS)', name: 'Overflow in Signed Addition (concept)', expr: 'occurs when adding two numbers of the same sign produces a result of the opposite sign' },

    { cat: 'Computer Networks — Extra (BS)', name: 'Application Layer Protocols (concept)', expr: 'HTTP (web), FTP (files), SMTP (email), DNS (naming), DHCP (IP assignment)' },
    { cat: 'Computer Networks — Extra (BS)', name: 'Port Number Range', expr: 'Well-known ports = 0–1023, Registered = 1024–49151, Dynamic/Private = 49152–65535' },
    { cat: 'Computer Networks — Extra (BS)', name: 'MAC Address Format', expr: '48-bit address written as 6 pairs of hexadecimal digits, e.g. 00:1A:2B:3C:4D:5E' },
    { cat: 'Computer Networks — Extra (BS)', name: 'Firewall (concept)', expr: 'a system that monitors and filters incoming/outgoing network traffic based on security rules' },
    { cat: 'Computer Networks — Extra (BS)', name: 'VPN (concept)', expr: 'creates an encrypted tunnel over a public network to securely connect to a private network' },

    { cat: 'Algorithm Design — Extra (BS-MS)', name: 'Backtracking (concept)', expr: 'explores all possible solutions incrementally and abandons a path as soon as it fails a constraint' },
    { cat: 'Algorithm Design — Extra (BS-MS)', name: "Bellman-Ford Algorithm (concept)", expr: 'finds shortest paths from a source vertex, and can handle negative edge weights' },
    { cat: 'Algorithm Design — Extra (BS-MS)', name: "Kruskal's Algorithm (concept)", expr: 'builds a minimum spanning tree by adding the smallest edge that doesn\'t form a cycle' },
    { cat: 'Algorithm Design — Extra (BS-MS)', name: "Prim's Algorithm (concept)", expr: 'builds a minimum spanning tree by growing it one vertex at a time from a starting node' },
    { cat: 'Algorithm Design — Extra (BS-MS)', name: 'Breadth-First Search (BFS) Complexity', expr: 'O(V + E), V = vertices, E = edges' },
    { cat: 'Algorithm Design — Extra (BS-MS)', name: 'Depth-First Search (DFS) Complexity', expr: 'O(V + E), V = vertices, E = edges' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Instruction Cycle (concept)', expr: 'Fetch → Decode → Execute → Store, repeated for every CPU instruction' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Instruction Format (concept)', expr: 'an instruction is made up of an Opcode (operation) and Operand(s) (data/address)' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Addressing Modes (concept)', expr: 'Immediate, Direct, Indirect, and Register addressing describe how an operand\'s location is specified' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Program Counter (PC) (concept)', expr: 'register holding the memory address of the next instruction to be executed' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Instruction Register (IR) (concept)', expr: 'register that holds the instruction currently being decoded or executed' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Accumulator (concept)', expr: 'a CPU register that temporarily holds intermediate arithmetic/logic results' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Machine Cycle Time', expr: 'Machine Cycle Time = Number of Clock Periods × Clock Period' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Opcode Bits Needed', expr: 'Opcode bits = ⌈log₂(number of distinct instructions)⌉' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Stack-Based vs Register-Based Machines (concept)', expr: 'stack machines operate on a push/pop stack; register machines operate directly on named registers' },
    { cat: 'Assembly & Machine-Level Programming (BS)', name: 'Interrupt (concept)', expr: 'a signal that pauses the current program so the CPU can handle a higher-priority event' },

    { cat: 'Memory Management (BS)', name: 'Virtual Memory (concept)', expr: 'lets a program use more memory than physically available by mapping to disk storage' },
    { cat: 'Memory Management (BS)', name: 'Segmentation (concept)', expr: 'divides a program into variable-sized logical units (code, data, stack) instead of fixed pages' },
    { cat: 'Memory Management (BS)', name: 'Internal Fragmentation (concept)', expr: 'wasted space inside an allocated fixed-size block that is larger than what is actually needed' },
    { cat: 'Memory Management (BS)', name: 'External Fragmentation (concept)', expr: 'free memory becomes scattered in small blocks too small to satisfy new requests' },
    { cat: 'Memory Management (BS)', name: 'FIFO Page Replacement (concept)', expr: 'replaces the page that has been in memory the longest' },
    { cat: 'Memory Management (BS)', name: 'LRU Page Replacement (concept)', expr: 'Least Recently Used — replaces the page that hasn\'t been used for the longest time' },
    { cat: 'Memory Management (BS)', name: 'Optimal Page Replacement (concept)', expr: 'replaces the page that won\'t be used for the longest time in the future (theoretical best)' },
    { cat: 'Memory Management (BS)', name: 'Thrashing (concept)', expr: 'excessive paging activity that causes CPU utilization to drop drastically' },
    { cat: 'Memory Management (BS)', name: 'Segment Table Entry (concept)', expr: 'stores a segment\'s base address and its length/limit' },
    { cat: 'Memory Management (BS)', name: 'Working Set (concept)', expr: 'the set of pages a process actively references in a given time window' },

    { cat: 'Networking — Routing & Error Control (BS)', name: 'Hamming Code — Redundant Bits', expr: '2^r ≥ m + r + 1, m = data bits, r = redundant bits' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Hamming Distance', expr: 'number of bit positions in which two binary strings of equal length differ' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Distance Vector Routing (concept)', expr: 'each router shares its routing table with directly connected neighbors periodically' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Link State Routing (concept)', expr: 'each router builds a complete map of the network topology and computes shortest paths independently' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Stop-and-Wait Protocol (concept)', expr: 'sender transmits one frame and waits for an acknowledgment before sending the next' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Sliding Window Protocol (concept)', expr: 'allows multiple frames to be sent before requiring an acknowledgment, improving throughput' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Sliding Window Size Formula', expr: 'Efficiency = W/(1 + 2a), W = window size, a = propagation delay/transmission time' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Bit Stuffing (concept)', expr: 'inserts an extra bit into a data stream to prevent it from being confused with a control sequence' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'NAT (Network Address Translation) (concept)', expr: 'maps private IP addresses inside a network to a single public IP address for internet access' },
    { cat: 'Networking — Routing & Error Control (BS)', name: 'Wireless vs Wired Networks (concept)', expr: 'wireless uses radio signals (no physical medium); wired uses cables for typically faster, more stable links' },

    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Transaction (concept)', expr: 'a sequence of database operations treated as a single logical unit of work' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Concurrency Control (concept)', expr: 'techniques that ensure correct results when multiple transactions execute simultaneously' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Deadlock in Databases (concept)', expr: 'occurs when two or more transactions wait indefinitely for locks held by each other' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Two-Phase Locking (concept)', expr: 'a transaction acquires all locks it needs (growing phase) before releasing any (shrinking phase)' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Dirty Read (concept)', expr: 'a transaction reads data that another uncommitted transaction has modified' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Isolation Levels (concept)', expr: 'Read Uncommitted, Read Committed, Repeatable Read, Serializable — increasing strictness of transaction isolation' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Indexing (concept)', expr: 'a data structure that speeds up data retrieval at the cost of extra storage and update overhead' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Clustered vs Non-Clustered Index (concept)', expr: 'clustered index sorts and stores data rows in index order; non-clustered index stores a separate pointer structure' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'View (Database) (concept)', expr: 'a virtual table defined by a stored query, computed dynamically from underlying tables' },
    { cat: 'Database — Transactions & Concurrency (BS)', name: 'Trigger (concept)', expr: 'a stored procedure that automatically runs in response to a specified database event' },

    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Perceptron Output', expr: 'y = f(Σwᵢxᵢ + b), f = activation function' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Tanh Activation Function', expr: 'tanh(x) = (eˣ − e⁻ˣ)/(eˣ + e⁻ˣ)' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Softmax Function', expr: 'softmax(zᵢ) = e^zᵢ/Σⱼe^zⱼ' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Forward Propagation (concept)', expr: 'input data passes through the network layer by layer to produce an output prediction' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Backpropagation (concept)', expr: 'computes gradients of the loss with respect to weights by propagating error backward through the network' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Cross-Entropy Loss', expr: 'L = −Σ yᵢ log(ŷᵢ)' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Learning Rate (concept)', expr: 'a hyperparameter controlling how large a step gradient descent takes toward the minimum' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Epoch (concept)', expr: 'one complete pass of the entire training dataset through the neural network' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Batch Size (concept)', expr: 'the number of training samples processed before the model\'s weights are updated' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Convolutional Layer (concept)', expr: 'applies a sliding filter/kernel across the input to detect spatial features like edges' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Pooling Layer (concept)', expr: 'reduces the spatial size of feature maps, commonly using max or average pooling' },
    { cat: 'Neural Networks & Deep Learning (BS-MS)', name: 'Dropout (concept)', expr: 'randomly disables a fraction of neurons during training to reduce overfitting' },

    { cat: 'Number Theory for CS (BS)', name: 'GCD — Euclidean Algorithm', expr: 'gcd(a, b) = gcd(b, a mod b), until b = 0' },
    { cat: 'Number Theory for CS (BS)', name: 'LCM from GCD', expr: 'lcm(a, b) = (a × b)/gcd(a, b)' },
    { cat: 'Number Theory for CS (BS)', name: 'Modular Addition', expr: '(a + b) mod n = ((a mod n) + (b mod n)) mod n' },
    { cat: 'Number Theory for CS (BS)', name: 'Modular Multiplication', expr: '(a × b) mod n = ((a mod n) × (b mod n)) mod n' },
    { cat: 'Number Theory for CS (BS)', name: 'Modular Exponentiation', expr: 'a^b mod n, computed efficiently via repeated squaring' },
    { cat: 'Number Theory for CS (BS)', name: 'Prime Number (concept)', expr: 'a natural number greater than 1 with no positive divisors other than 1 and itself' },
    { cat: 'Number Theory for CS (BS)', name: 'Sieve of Eratosthenes (concept)', expr: 'an algorithm to find all primes up to n by iteratively marking multiples of each prime' },
    { cat: 'Number Theory for CS (BS)', name: "Fermat's Little Theorem", expr: 'if p is prime, then a^(p−1) ≡ 1 (mod p), for a not divisible by p' },
    { cat: 'Number Theory for CS (BS)', name: 'Euler\'s Totient Function', expr: 'φ(n) = number of integers from 1 to n that are coprime to n' },
    { cat: 'Number Theory for CS (BS)', name: 'Coprime Numbers (concept)', expr: 'two numbers are coprime if their greatest common divisor is 1' },

    { cat: 'Data Compression & Encoding (BS)', name: 'Huffman Coding (concept)', expr: 'assigns shorter binary codes to more frequent symbols to minimize total encoded length' },
    { cat: 'Data Compression & Encoding (BS)', name: 'Lossless vs Lossy Compression (concept)', expr: 'lossless compression allows exact original data recovery; lossy compression discards some data permanently' },
    { cat: 'Data Compression & Encoding (BS)', name: 'Compression Ratio', expr: 'Compression Ratio = Original Size/Compressed Size' },
    { cat: 'Data Compression & Encoding (BS)', name: 'Run-Length Encoding (RLE) (concept)', expr: 'replaces sequences of repeated values with a single value and a count' },
    { cat: 'Data Compression & Encoding (BS)', name: 'Base64 Encoding (concept)', expr: 'encodes binary data into ASCII text using 64 printable characters, for safe transmission' },
    { cat: 'Data Compression & Encoding (BS)', name: 'Unicode vs ASCII (concept)', expr: 'ASCII encodes 128 characters in 7 bits; Unicode supports virtually all world scripts using variable-width encoding' },
    { cat: 'Data Compression & Encoding (BS)', name: 'UTF-8 Encoding (concept)', expr: 'a variable-length Unicode encoding using 1 to 4 bytes per character, backward-compatible with ASCII' },
    { cat: 'Data Compression & Encoding (BS)', name: 'Entropy Coding (concept)', expr: 'compression technique that encodes symbols based on their probability of occurrence' },

    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Process vs Thread (concept)', expr: 'a process has its own memory space; threads within a process share the same memory space' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Race Condition (concept)', expr: 'occurs when multiple threads access shared data simultaneously and the outcome depends on timing' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Mutex (concept)', expr: 'a locking mechanism ensuring only one thread can access a critical section at a time' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Critical Section (concept)', expr: 'a code segment where a process accesses shared resources that must not be executed by more than one process at once' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: "Amdahl's Law (Parallel Speedup)", expr: 'Speedup(N) = 1/((1 − P) + P/N), P = parallel portion, N = number of processors' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Parallel Efficiency', expr: 'Efficiency = Speedup/Number of Processors' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Multithreading (concept)', expr: 'running multiple threads concurrently within a single process to improve responsiveness or performance' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Producer-Consumer Problem (concept)', expr: 'classic synchronization problem where producers generate data and consumers process it via a shared buffer' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'Dining Philosophers Problem (concept)', expr: 'classic problem illustrating deadlock and resource allocation issues in concurrent systems' },
    { cat: 'Parallel & Concurrent Computing (BS-MS)', name: 'MapReduce (concept)', expr: 'a programming model that processes large datasets by splitting work into parallel Map and Reduce phases' },

    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'Embedded System (concept)', expr: 'a combination of hardware and software designed to perform a specific dedicated function' },
    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'Microcontroller vs Microprocessor (concept)', expr: 'a microcontroller integrates CPU, memory, and I/O on one chip; a microprocessor needs external memory/I/O chips' },
    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'Real-Time Operating System (RTOS) (concept)', expr: 'an OS designed to process data and respond within a guaranteed, strict time constraint' },
    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'Native vs Cross-Platform Apps (concept)', expr: 'native apps are built for one OS using its own SDK; cross-platform apps share one codebase across OSes' },
    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'Battery Life Estimate', expr: 'Battery Life (hours) = Battery Capacity (mAh)/Average Current Draw (mA)' },
    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'IoT (Internet of Things) (concept)', expr: 'a network of physical devices embedded with sensors that collect and exchange data over the internet' },
    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'Sensor vs Actuator (concept)', expr: 'a sensor detects/measures a physical property; an actuator produces physical motion or action in response' },
    { cat: 'Mobile & Embedded Systems (ICS-BS)', name: 'Sampling Rate (Sensors)', expr: 'Sampling Rate (Hz) = Number of Samples/Time (seconds)' },

    { cat: 'Emerging Technologies (BS-MS)', name: 'Blockchain (concept)', expr: 'a distributed, tamper-resistant ledger where each block cryptographically references the previous one' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Block Hash Linking (concept)', expr: 'each block stores the hash of the previous block, so altering any block breaks the chain\'s integrity' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Proof of Work (concept)', expr: 'a consensus mechanism requiring nodes to solve a computational puzzle before adding a new block' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Smart Contract (concept)', expr: 'self-executing code on a blockchain that automatically enforces the terms of an agreement' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Quantum Bit (Qubit) (concept)', expr: 'the basic unit of quantum information that can exist in a superposition of 0 and 1 simultaneously' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Superposition (concept)', expr: 'a quantum system\'s ability to exist in multiple states at once until it is measured' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Quantum Entanglement (concept)', expr: 'a phenomenon where the state of one particle is directly correlated with another, regardless of distance' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Augmented Reality (AR) (concept)', expr: 'overlays digital content onto the real-world view, typically through a camera or headset' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Virtual Reality (VR) (concept)', expr: 'creates a fully immersive, simulated digital environment that replaces the user\'s real-world view' },
    { cat: 'Emerging Technologies (BS-MS)', name: 'Edge Computing (concept)', expr: 'processes data closer to where it is generated instead of sending it all to a centralized cloud server' },

    { cat: 'Software Testing & QA (BS)', name: 'Unit Testing (concept)', expr: 'tests individual components or functions of a program in isolation' },
    { cat: 'Software Testing & QA (BS)', name: 'Integration Testing (concept)', expr: 'tests how multiple modules work together after being combined' },
    { cat: 'Software Testing & QA (BS)', name: 'Black-Box Testing (concept)', expr: 'tests functionality without knowledge of the internal code structure' },
    { cat: 'Software Testing & QA (BS)', name: 'White-Box Testing (concept)', expr: 'tests internal code logic and structure with full knowledge of the implementation' },
    { cat: 'Software Testing & QA (BS)', name: 'Regression Testing (concept)', expr: 're-running tests after changes to ensure existing functionality still works correctly' },
    { cat: 'Software Testing & QA (BS)', name: 'Test Case (concept)', expr: 'a set of conditions and inputs used to verify a specific feature or requirement' },
    { cat: 'Software Testing & QA (BS)', name: 'Boundary Value Analysis (concept)', expr: 'testing technique focusing on values at the edges of valid input ranges, where errors are most likely' },
    { cat: 'Software Testing & QA (BS)', name: 'Bug Severity vs Priority (concept)', expr: 'severity measures a bug\'s impact on the system; priority measures how urgently it should be fixed' },

    { cat: 'Human-Computer Interaction (BS)', name: 'Usability (concept)', expr: 'the ease with which users can learn and use a system to achieve their goals effectively' },
    { cat: 'Human-Computer Interaction (BS)', name: "Fitts's Law", expr: 'T = a + b log₂(D/W + 1), T = time to reach target, D = distance, W = target width' },
    { cat: 'Human-Computer Interaction (BS)', name: 'User-Centered Design (concept)', expr: 'a design process that focuses on user needs and feedback at every development stage' },
    { cat: 'Human-Computer Interaction (BS)', name: 'Accessibility (concept)', expr: 'designing systems usable by people with a wide range of abilities and disabilities' },
    { cat: 'Human-Computer Interaction (BS)', name: 'Wireframe (concept)', expr: 'a simplified visual layout showing the structure and placement of elements on a screen before design' },
    { cat: 'Human-Computer Interaction (BS)', name: 'A/B Testing (concept)', expr: 'compares two versions of a design with real users to determine which performs better' },

    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'Regex — Any Character', expr: '. matches any single character except a newline' },
    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'Regex — Zero or More', expr: '* matches zero or more occurrences of the preceding element' },
    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'Regex — One or More', expr: '+ matches one or more occurrences of the preceding element' },
    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'Regex — Zero or One', expr: '? matches zero or one occurrence of the preceding element' },
    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'Regex — Character Class', expr: '[abc] matches any single character among a, b, or c' },
    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'Regex — Anchors', expr: '^ matches the start of a string, $ matches the end of a string' },
    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'Regex — Quantifier Range', expr: '{n,m} matches between n and m occurrences of the preceding element' },
    { cat: 'Regular Expressions & Pattern Matching (ICS-BS)', name: 'String Matching — Naive Approach Complexity', expr: 'O(n×m), n = text length, m = pattern length' },

    { cat: 'Searching & Sorting — Extra (BS)', name: 'Interpolation Search Complexity', expr: 'Average = O(log log n), Worst = O(n), for uniformly distributed sorted data' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Jump Search Complexity', expr: 'O(√n), optimal jump size = √n' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Counting Sort Complexity', expr: 'O(n + k), k = range of input values' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Radix Sort Complexity', expr: 'O(d × (n + k)), d = number of digits, k = base/range' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Bucket Sort Complexity', expr: 'Average = O(n + k), Worst = O(n²)' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Shell Sort Complexity', expr: 'depends on gap sequence, typically between O(n log n) and O(n²)' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Stable vs Unstable Sort (concept)', expr: 'a stable sort preserves the relative order of equal elements; an unstable sort does not guarantee this' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'In-Place vs Out-of-Place Sort (concept)', expr: 'in-place sorting uses O(1) extra memory; out-of-place sorting requires additional memory proportional to input size' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Divide and Conquer (concept)', expr: 'breaks a problem into smaller subproblems, solves them independently, then combines their results' },
    { cat: 'Searching & Sorting — Extra (BS)', name: 'Best, Average, Worst Case (concept)', expr: 'describe an algorithm\'s performance under the most favorable, typical, and least favorable input conditions' },

    { cat: 'Automata Theory — Extra (BS-MS)', name: 'Pushdown Automaton (PDA) (concept)', expr: 'a finite automaton extended with a stack, used to recognize context-free languages' },
    { cat: 'Automata Theory — Extra (BS-MS)', name: 'Pumping Lemma (Regular Languages) (concept)', expr: 'used to prove a language is not regular by showing it cannot be "pumped" while staying in the language' },
    { cat: 'Automata Theory — Extra (BS-MS)', name: 'Language (Formal Definition) (concept)', expr: 'a set of strings formed from symbols of a given alphabet' },
    { cat: 'Automata Theory — Extra (BS-MS)', name: 'Kleene Star (concept)', expr: 'A* denotes zero or more concatenations of strings from language A' },
    { cat: 'Automata Theory — Extra (BS-MS)', name: 'NFA to DFA Conversion (concept)', expr: 'subset construction — each DFA state represents a set of possible NFA states' },
    { cat: 'Automata Theory — Extra (BS-MS)', name: 'Minimal DFA (concept)', expr: 'the DFA with the fewest possible states that still accepts exactly the same language' },
    { cat: 'Automata Theory — Extra (BS-MS)', name: 'Halting Problem (concept)', expr: 'proven undecidable — no general algorithm can determine whether every program halts on every input' },
    { cat: 'Automata Theory — Extra (BS-MS)', name: 'NP-Complete Problem (concept)', expr: 'a problem in NP to which every other NP problem can be reduced in polynomial time' },
    { cat: 'IT Fundamentals — Extra (9th-ICS)', name: 'Green Computing (concept)', expr: 'designing and using computers and IT resources in an energy-efficient, environmentally responsible way' },
    { cat: 'IT Fundamentals — Extra (9th-ICS)', name: 'Open Source vs Proprietary Software (concept)', expr: 'open source allows free access and modification of source code; proprietary software restricts it under license' },
    { cat: 'IT Fundamentals — Extra (9th-ICS)', name: 'System Software vs Application Software (concept)', expr: 'system software manages hardware and runs the computer (e.g. OS); application software performs user tasks' },
    { cat: 'IT Fundamentals — Extra (9th-ICS)', name: 'Compiler Error vs Runtime Error (concept)', expr: 'a compiler error is caught before the program runs; a runtime error occurs while the program is executing' },
    { cat: 'IT Fundamentals — Extra (9th-ICS)', name: 'Digital Divide (concept)', expr: 'the gap between those who have easy access to computers/internet and those who do not' },
    { cat: 'IT Fundamentals — Extra (9th-ICS)', name: 'Data vs Information (concept)', expr: 'data is raw, unprocessed facts; information is data that has been processed into a meaningful form' },

    { cat: 'Graph Algorithms (BS)', name: 'BFS Complexity', expr: 'O(V + E), V = vertices, E = edges' },
    { cat: 'Graph Algorithms (BS)', name: 'DFS Complexity', expr: 'O(V + E), V = vertices, E = edges' },
    { cat: 'Graph Algorithms (BS)', name: "Dijkstra's Algorithm Complexity", expr: 'O((V + E) log V) using a priority queue (min-heap)' },
    { cat: 'Graph Algorithms (BS)', name: 'Bellman-Ford Algorithm Complexity', expr: 'O(V × E), handles negative edge weights' },
    { cat: 'Graph Algorithms (BS)', name: 'Floyd-Warshall Algorithm Complexity', expr: 'O(V³), finds shortest paths between all pairs' },
    { cat: 'Graph Algorithms (BS)', name: "Kruskal's Algorithm Complexity", expr: 'O(E log E), builds Minimum Spanning Tree by sorting edges' },
    { cat: 'Graph Algorithms (BS)', name: "Prim's Algorithm Complexity", expr: 'O(E log V), builds Minimum Spanning Tree using a priority queue' },
    { cat: 'Graph Algorithms (BS)', name: 'Topological Sort Complexity', expr: 'O(V + E), valid only for a Directed Acyclic Graph (DAG)' },
    { cat: 'Graph Algorithms (BS)', name: 'Edges in a Complete Graph', expr: 'E = n(n − 1)/2, for n vertices' },

    { cat: 'Advanced Trees & Hashing (BS)', name: 'AVL Tree Balance Factor', expr: 'BF = Height(Left Subtree) − Height(Right Subtree), must be −1, 0, or 1' },
    { cat: 'Advanced Trees & Hashing (BS)', name: 'Height of a Balanced Binary Tree', expr: 'h = O(log n), for n nodes' },
    { cat: 'Advanced Trees & Hashing (BS)', name: 'B-Tree Order (Max Children/Keys)', expr: 'Max children = m, Max keys per node = m − 1, for order m' },
    { cat: 'Advanced Trees & Hashing (BS)', name: 'Red-Black Tree Property (concept)', expr: 'a self-balancing BST where every node is red or black and root-to-leaf paths have the same number of black nodes' },
    { cat: 'Advanced Trees & Hashing (BS)', name: 'Trie (concept)', expr: 'a tree-like structure that stores strings by sharing common prefixes among nodes' },
    { cat: 'Advanced Trees & Hashing (BS)', name: 'Hash Function (concept)', expr: 'a function that maps input data of arbitrary size to a fixed-size value (hash code)' },
    { cat: 'Advanced Trees & Hashing (BS)', name: 'Load Factor (Hash Table)', expr: 'Load Factor = n/m, n = number of entries, m = number of buckets' },
    { cat: 'Advanced Trees & Hashing (BS)', name: 'Hash Table Search Complexity', expr: 'Average = O(1), Worst = O(n), worst case occurs with many collisions' },

    { cat: 'Dynamic Programming & Greedy Algorithms (BS)', name: '0/1 Knapsack Recurrence', expr: 'dp[i][w] = max(dp[i−1][w], dp[i−1][w−wt[i]] + val[i])' },
    { cat: 'Dynamic Programming & Greedy Algorithms (BS)', name: 'Longest Common Subsequence (LCS) Recurrence', expr: 'if match: dp[i][j] = dp[i−1][j−1] + 1, else: dp[i][j] = max(dp[i−1][j], dp[i][j−1])' },
    { cat: 'Dynamic Programming & Greedy Algorithms (BS)', name: 'Fibonacci via Dynamic Programming', expr: 'DP complexity = O(n), versus naive recursive complexity = O(2ⁿ)' },
    { cat: 'Dynamic Programming & Greedy Algorithms (BS)', name: 'Memoization vs Tabulation (concept)', expr: 'memoization is top-down recursion with caching; tabulation is bottom-up iterative table filling' },
    { cat: 'Dynamic Programming & Greedy Algorithms (BS)', name: 'Greedy Algorithm (concept)', expr: 'builds a solution step by step, always choosing the locally optimal option at each step' },
    { cat: 'Dynamic Programming & Greedy Algorithms (BS)', name: 'Optimal Substructure (concept)', expr: "a problem has optimal substructure if an optimal solution can be built from optimal solutions of its subproblems" },

    { cat: 'Compiler Design (BS)', name: 'Phases of a Compiler (concept)', expr: 'Lexical Analysis → Syntax Analysis → Semantic Analysis → Intermediate Code → Optimization → Code Generation' },
    { cat: 'Compiler Design (BS)', name: 'Lexical Analysis (concept)', expr: 'converts source code into a stream of tokens by removing whitespace and comments' },
    { cat: 'Compiler Design (BS)', name: 'Parsing — LL vs LR (concept)', expr: 'LL parsers scan input left-to-right building a leftmost derivation; LR parsers build a rightmost derivation in reverse' },
    { cat: 'Compiler Design (BS)', name: 'Symbol Table (concept)', expr: 'a data structure storing information about identifiers such as variables, functions, and their attributes' },
    { cat: 'Compiler Design (BS)', name: 'Three Address Code (concept)', expr: 'an intermediate representation where each instruction has at most three operands, e.g. t1 = t2 + t3' },
    { cat: 'Compiler Design (BS)', name: 'Context-Free Grammar (CFG)', expr: 'G = (V, T, P, S), V = variables, T = terminals, P = production rules, S = start symbol' },

    { cat: 'Software Project Management (BS-MS)', name: 'COCOMO Basic Model — Effort', expr: 'Effort = a × (KLOC)^b person-months' },
    { cat: 'Software Project Management (BS-MS)', name: 'COCOMO Basic Model — Development Time', expr: 'Time = c × (Effort)^d months' },
    { cat: 'Software Project Management (BS-MS)', name: 'Function Point (FP) (concept)', expr: 'a measure of software size based on the functionality delivered to the user, independent of technology' },
    { cat: 'Software Project Management (BS-MS)', name: 'Cyclomatic Complexity', expr: 'V(G) = E − N + 2, E = edges, N = nodes in control flow graph' },
    { cat: 'Software Project Management (BS-MS)', name: 'Defect Density', expr: 'Defect Density = Number of Defects/Size (KLOC)' },

    { cat: 'Information Theory & Coding (BS-MS)', name: 'Shannon Entropy', expr: 'H(X) = −Σ p(x) log₂ p(x)' },
    { cat: 'Information Theory & Coding (BS-MS)', name: 'Information Content', expr: 'I(x) = −log₂ p(x)' },
    { cat: 'Information Theory & Coding (BS-MS)', name: 'Huffman Coding (concept)', expr: 'builds a variable-length prefix code assigning shorter codes to more frequent symbols to minimize average length' },
    { cat: 'Information Theory & Coding (BS-MS)', name: 'Compression Ratio', expr: 'Compression Ratio = Uncompressed Size/Compressed Size' },

    { cat: 'Cryptography — Extra (BS-MS)', name: 'RSA Key Generation (concept)', expr: 'choose primes p, q; n = p×q; compute φ(n) = (p−1)(q−1); pick e coprime to φ(n); find d = e⁻¹ mod φ(n)' },
    { cat: 'Cryptography — Extra (BS-MS)', name: 'RSA Encryption', expr: 'C = M^e mod n' },
    { cat: 'Cryptography — Extra (BS-MS)', name: 'RSA Decryption', expr: 'M = C^d mod n' },
    { cat: 'Cryptography — Extra (BS-MS)', name: 'Diffie-Hellman Key Exchange (concept)', expr: 'allows two parties to jointly establish a shared secret key over an insecure channel without transmitting it directly' },
    { cat: 'Cryptography — Extra (BS-MS)', name: 'Digital Signature (concept)', expr: 'a sender encrypts a message hash with their private key so a receiver can verify authenticity using the public key' },

    { cat: 'Data Mining & Big Data (BS-MS)', name: 'Support (Association Rule)', expr: 'Support(A→B) = P(A ∩ B)' },
    { cat: 'Data Mining & Big Data (BS-MS)', name: 'Confidence (Association Rule)', expr: 'Confidence(A→B) = P(B | A)' },
    { cat: 'Data Mining & Big Data (BS-MS)', name: 'Lift (Association Rule)', expr: 'Lift(A→B) = Confidence(A→B)/Support(B)' },
    { cat: 'Data Mining & Big Data (BS-MS)', name: 'CAP Theorem (concept)', expr: 'a distributed system can guarantee at most two of: Consistency, Availability, Partition Tolerance' },
    { cat: 'Data Mining & Big Data (BS-MS)', name: 'MapReduce (concept)', expr: 'a programming model that processes large datasets by splitting work into parallel Map and Reduce tasks' },

    { cat: 'Blockchain Technology (BS-MS)', name: 'Block Hash (concept)', expr: 'a unique fixed-size digital fingerprint of a block\'s data, including the previous block\'s hash, linking the chain' },
    { cat: 'Blockchain Technology (BS-MS)', name: 'Merkle Tree (concept)', expr: 'a binary tree of hashes where each leaf is a data hash and each parent is the hash of its children, used to verify data integrity' },
    { cat: 'Blockchain Technology (BS-MS)', name: 'Proof of Work (concept)', expr: 'a consensus mechanism requiring miners to solve a computationally difficult puzzle to validate and add a new block' },

    { cat: 'Computer Vision & NLP (BS-MS)', name: 'Convolution Operation (concept)', expr: 'slides a filter/kernel over an input to produce a feature map by computing element-wise products and summing' },
    { cat: 'Computer Vision & NLP (BS-MS)', name: 'TF-IDF (Term Frequency–Inverse Document Frequency)', expr: 'TF-IDF = TF × log(N/DF), N = total documents, DF = documents containing the term' },
    { cat: 'Computer Vision & NLP (BS-MS)', name: 'N-gram (concept)', expr: 'a contiguous sequence of n items (words or characters) from a given text, used in language modeling' },
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

const formulaSubjectView = document.getElementById('formulaSubjectView');
const formulaDetailView = document.getElementById('formulaDetailView');
const formulaDetailTitle = document.getElementById('formulaDetailTitle');
const formulaBackBtn = document.getElementById('formulaBackBtn');

const SUBJECT_ICONS = {
  Mathematics: '∑', Physics: '⚛', Chemistry: '⚗', Biology: '🧬', Statistics: '📊', Commerce: '💰', 'Computer Science': '💻'
};

function openSubjectDetail(subj, label) {
  activeSubject = subj;
  formulaDetailTitle.textContent = label;
  formulaSubjectView.style.display = 'none';
  formulaDetailView.style.display = '';
  formulaSearch.value = '';
  renderFormulas();
  formulaList.scrollTop = 0;
}

if (formulaBackBtn) {
  formulaBackBtn.addEventListener('click', () => {
    formulaDetailView.style.display = 'none';
    formulaSubjectView.style.display = '';
  });
}

function buildSubjectPills() {
  subjectGrid.innerHTML = '';

  const favTile = document.createElement('div');
  favTile.className = 'subject-tile fav-tile';
  favTile.innerHTML = `<div class="subject-tile-icon">★</div><div class="subject-tile-name">${t('favorites_pill')}</div><div class="subject-tile-count">${favFormulas.length}</div>`;
  favTile.addEventListener('click', () => openSubjectDetail(FAV_SUBJECT_KEY, t('favorites_pill')));
  subjectGrid.appendChild(favTile);

  const recentTile = document.createElement('div');
  recentTile.className = 'subject-tile recent-tile';
  recentTile.innerHTML = `<div class="subject-tile-icon">🕐</div><div class="subject-tile-name">${t('recent_pill')}</div><div class="subject-tile-count">${recentFormulas.length}</div>`;
  recentTile.addEventListener('click', () => openSubjectDetail(RECENT_SUBJECT_KEY, t('recent_pill')));
  subjectGrid.appendChild(recentTile);

  Object.keys(formulaData).forEach(subj => {
    const tile = document.createElement('div');
    tile.className = 'subject-tile';
    const icon = SUBJECT_ICONS[subj] || 'ƒ';
    tile.innerHTML = `<div class="subject-tile-icon">${icon}</div><div class="subject-tile-name">${subj}</div><div class="subject-tile-count">${formulaData[subj].length} formulas</div>`;
    tile.addEventListener('click', () => openSubjectDetail(subj, subj));
    subjectGrid.appendChild(tile);
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
        <button class="icon-action-btn formula-explain-btn" data-key="${key}" title="${t('explain_formula_title')}">💡</button>
        <button class="icon-action-btn formula-share-btn" data-key="${key}" title="${t('share_title')}">&#128228;</button>
        ${whatsappBtnHtml('formula-whatsapp-btn', `data-key="${key}"`)}
      </div>
    </div>
    <div class="formula-explain-box" style="display:none;"></div>`;
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
  const closeExplainBtn = e.target.closest('.formula-explain-close');
  if (closeExplainBtn) {
    const box = closeExplainBtn.closest('.formula-explain-box');
    if (box) box.style.display = 'none';
    return;
  }
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
    return;
  }
  const waBtn = e.target.closest('.formula-whatsapp-btn');
  if (waBtn) {
    const parts = waBtn.dataset.key.split('||');
    const name = parts[2] || '';
    const row = waBtn.closest('.formula-item');
    const exprText = row ? row.querySelector('.formula-expr').textContent : '';
    shareToWhatsApp(`${name}: ${exprText}`);
    return;
  }
  const explainBtn = e.target.closest('.formula-explain-btn');
  if (explainBtn) {
    const row = explainBtn.closest('.formula-item');
    const box = row ? row.querySelector('.formula-explain-box') : null;
    if (!box) return;

    // Toggle closed if already open and already has content
    if (box.style.display !== 'none' && box.dataset.loaded === '1') {
      box.style.display = 'none';
      return;
    }
    box.style.display = 'block';
    if (box.dataset.loaded === '1') return; // already fetched once, just re-show

    const name = row.querySelector('.formula-name').textContent;
    const expr = row.querySelector('.formula-expr').textContent;

    const closeBtnHtml = `<button class="formula-explain-close" title="Close">&#10005;</button>`;

    if (typeof window.calvoExplainFormula !== 'function') {
      box.innerHTML = `${closeBtnHtml}<span class="ai-error">${t('explain_unavailable')}</span>`;
      return;
    }

    box.innerHTML = `${closeBtnHtml}<span class="ai-loading">${t('explain_loading')}</span>`;
    window.calvoExplainFormula(name, expr, (result) => {
      if (result.error) {
        box.innerHTML = `${closeBtnHtml}<span class="ai-error">${result.error}</span>`;
        return;
      }
      box.innerHTML = `${closeBtnHtml}${result.html}`;
      box.dataset.loaded = '1';
    });
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
        ${whatsappBtnHtml('history-whatsapp-btn')}
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
    div.querySelector('.history-whatsapp-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      shareToWhatsApp(`${h.expr} = ${h.result}`);
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
    div.innerHTML = `<span>${r.label}</span><span style="display:flex;align-items:center;gap:8px;"><b style="color:var(--accent);">${r.value}</b><button class="icon-action-btn saved-share-btn" title="${t('share_title')}">&#128228;</button>${whatsappBtnHtml('saved-whatsapp-btn')}<button class="saved-del" title="${t('delete_title')}">&#10005;</button></span>`;
    div.querySelector('.saved-share-btn').addEventListener('click', () => {
      shareOrCopyText(`${r.label}: ${r.value}`);
    });
    div.querySelector('.saved-whatsapp-btn').addEventListener('click', () => {
      shareToWhatsApp(`${r.label}: ${r.value}`);
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
    div.innerHTML = `<span>${rec.label}</span><span style="display:flex;align-items:center;gap:8px;">${trend}<b style="color:var(--accent);">${rec.gpa.toFixed(2)}</b><button class="icon-action-btn gpa-share-btn" title="${t('share_title')}">&#128228;</button>${whatsappBtnHtml('gpa-whatsapp-btn')}<button class="saved-del" title="${t('delete_title')}">&#10005;</button></span>`;
    div.querySelector('.gpa-share-btn').addEventListener('click', () => {
      shareOrCopyText(`${rec.label}: GPA ${rec.gpa.toFixed(2)}`);
    });
    div.querySelector('.gpa-whatsapp-btn').addEventListener('click', () => {
      shareToWhatsApp(`${rec.label}: GPA ${rec.gpa.toFixed(2)}`);
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
  if (typeof window.refreshTimerI18n === 'function') window.refreshTimerI18n();
  if (typeof window.refreshSubjectToolsI18n === 'function') window.refreshSubjectToolsI18n();
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
  const quizModeFormulaBtn = document.getElementById('quizModeFormulaBtn');
  const quizModePracticeBtn = document.getElementById('quizModePracticeBtn');
  const quizSubtitle = document.getElementById('quizSubtitle');
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
  const quizExplanationBox = document.getElementById('quizExplanationBox');
  const quizNextBtn = document.getElementById('quizNextBtn');
  const quizQuitBtn = document.getElementById('quizQuitBtn');
  const quizRestartBtn = document.getElementById('quizRestartBtn');
  const quizResultScoreText = document.getElementById('quizResultScoreText');
  const quizResultMsg = document.getElementById('quizResultMsg');
  const quizWrongReviewWrap = document.getElementById('quizWrongReviewWrap');
  const quizReviewToggleBtn = document.getElementById('quizReviewToggleBtn');
  const quizWrongReviewList = document.getElementById('quizWrongReviewList');
  const quizDifficultyPills = document.getElementById('quizDifficultyPills');
  const quizLengthLabel = document.getElementById('quizLengthLabel');

  // Flashcards mode elements
  const quizModeFlashcardsBtn = document.getElementById('quizModeFlashcardsBtn');
  const flashcardDueNote = document.getElementById('flashcardDueNote');
  const flashcardPlayScreen = document.getElementById('flashcardPlayScreen');
  const flashcardResultScreen = document.getElementById('flashcardResultScreen');
  const flashcardProgressLabel = document.getElementById('flashcardProgressLabel');
  const flashcardDueLabel = document.getElementById('flashcardDueLabel');
  const flashcardProgressFill = document.getElementById('flashcardProgressFill');
  const flashcardStage = document.getElementById('flashcardStage');
  const flashcardInner = document.getElementById('flashcardInner');
  const flashcardCat = document.getElementById('flashcardCat');
  const flashcardName = document.getElementById('flashcardName');
  const flashcardCatBack = document.getElementById('flashcardCatBack');
  const flashcardExpr = document.getElementById('flashcardExpr');
  const flashcardRateRow = document.getElementById('flashcardRateRow');
  const flashcardQuitBtn = document.getElementById('flashcardQuitBtn');
  const flashcardRestartBtn = document.getElementById('flashcardRestartBtn');
  const flashcardResultScoreText = document.getElementById('flashcardResultScoreText');
  const flashcardResultMsg = document.getElementById('flashcardResultMsg');

  if (!quizSubjectPills || typeof formulaData === 'undefined') return;

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  // 'formula' = existing formula-recall quiz (auto-generated from formulaData)
  // 'practice' = real MCQs with 4 options + explanations, from question-bank.js
  let quizMode = 'formula';
  let quizSubject = 'All';
  let quizDifficulty = 'All'; // Easy | Medium | Hard | All — only used in practice mode
  let quizQuestions = [];
  let quizIndex = 0;
  let quizScore = 0;
  let quizAnswered = false;
  let quizWrongAnswers = []; // { cat, name, correctExpr, chosen, explanation }

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

  function practiceSubjects() {
    return (typeof practiceQuestionBank !== 'undefined') ? Object.keys(practiceQuestionBank) : [];
  }

  function practicePool() {
    if (typeof practiceQuestionBank === 'undefined') return [];
    let out = [];
    if (quizSubject === 'All') {
      practiceSubjects().forEach(subj => {
        practiceQuestionBank[subj].forEach(q => out.push(Object.assign({ subject: subj }, q)));
      });
    } else {
      out = (practiceQuestionBank[quizSubject] || []).map(q => Object.assign({ subject: quizSubject }, q));
    }
    if (quizDifficulty !== 'All') {
      out = out.filter(q => (q.difficulty || 'Medium') === quizDifficulty);
    }
    return out;
  }

  function buildQuizDifficultyPills() {
    if (!quizDifficultyPills) return;
    if (quizMode !== 'practice') { quizDifficultyPills.style.display = 'none'; return; }
    quizDifficultyPills.style.display = 'flex';
    const levels = ['All', 'Easy', 'Medium', 'Hard'];
    quizDifficultyPills.innerHTML = levels.map(lvl =>
      `<button class="subject-pill diff-pill diff-${lvl.toLowerCase()}${quizDifficulty === lvl ? ' active' : ''}" data-difficulty="${lvl}">${lvl === 'All' ? t('quiz_all_difficulty') : t('quiz_difficulty_' + lvl.toLowerCase())}</button>`
    ).join('');
    quizDifficultyPills.querySelectorAll('.diff-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        quizDifficulty = btn.dataset.difficulty;
        buildQuizDifficultyPills();
        checkQuizPoolSize();
      });
    });
  }

  function setQuizMode(mode) {
    quizMode = mode;
    quizSubject = 'All';
    quizDifficulty = 'All';
    quizModeFormulaBtn.classList.toggle('active', mode === 'formula');
    quizModePracticeBtn.classList.toggle('active', mode === 'practice');
    if (quizModeFlashcardsBtn) quizModeFlashcardsBtn.classList.toggle('active', mode === 'flashcards');
    if (quizSubtitle) {
      const subKey = mode === 'practice' ? 'quiz_practice_subtitle' : (mode === 'flashcards' ? 'flashcard_subtitle' : 'quiz_subtitle');
      quizSubtitle.setAttribute('data-i18n', subKey);
      quizSubtitle.textContent = t(subKey);
    }
    if (quizLengthLabel) {
      const lenKey = mode === 'flashcards' ? 'flashcard_length_label' : 'quiz_length_label';
      quizLengthLabel.setAttribute('data-i18n', lenKey);
      quizLengthLabel.textContent = t(lenKey);
    }
    if (quizStartBtn) {
      const startKey = mode === 'flashcards' ? 'flashcard_start' : 'quiz_start';
      quizStartBtn.setAttribute('data-i18n', startKey);
      quizStartBtn.textContent = t(startKey);
    }
    if (quizEmptyNote) {
      const emptyKey = mode === 'flashcards' ? 'flashcard_not_enough' : 'quiz_not_enough';
      quizEmptyNote.setAttribute('data-i18n', emptyKey);
      quizEmptyNote.textContent = t(emptyKey);
    }
    buildQuizSubjectPills();
    buildQuizDifficultyPills();
    checkQuizPoolSize();
    updateFlashcardDueNote();
  }

  if (quizModeFormulaBtn) quizModeFormulaBtn.addEventListener('click', () => setQuizMode('formula'));
  if (quizModePracticeBtn) quizModePracticeBtn.addEventListener('click', () => setQuizMode('practice'));
  if (quizModeFlashcardsBtn) quizModeFlashcardsBtn.addEventListener('click', () => setQuizMode('flashcards'));

  function buildQuizSubjectPills() {
    const subjects = quizMode === 'practice' ? practiceSubjects() : Object.keys(formulaData);
    let html = '<button class="subject-pill' + (quizSubject === 'All' ? ' active' : '') + '" data-quizsubj="All">' + t('quiz_all_subjects') + '</button>';
    subjects.forEach(subj => {
      html += '<button class="subject-pill' + (quizSubject === subj ? ' active' : '') + '" data-quizsubj="' + escapeHtml(subj) + '">' + escapeHtml(subj) + '</button>';
    });
    quizSubjectPills.innerHTML = html;
    quizSubjectPills.querySelectorAll('.subject-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        quizSubject = btn.dataset.quizsubj;
        buildQuizSubjectPills();
        checkQuizPoolSize();
        updateFlashcardDueNote();
      });
    });
  }

  function checkQuizPoolSize() {
    if (quizMode === 'flashcards') {
      const size = pool().length;
      const enough = size >= 1;
      quizStartBtn.disabled = !enough;
      quizStartBtn.style.opacity = enough ? '1' : '0.5';
      quizEmptyNote.style.display = enough ? 'none' : 'block';
      return;
    }
    const size = quizMode === 'practice' ? practicePool().length : pool().length;
    const enough = size >= 4;
    quizStartBtn.disabled = !enough;
    quizStartBtn.style.opacity = enough ? '1' : '0.5';
    quizEmptyNote.style.display = enough ? 'none' : 'block';
  }

  function generateQuestions(n) {
    if (quizMode === 'practice') {
      const p = practicePool();
      const chosen = shuffle(p).slice(0, Math.min(n, p.length));
      return chosen.map(q => ({
        cat: q.subject + (q.topic ? ' · ' + q.topic : ''),
        difficulty: q.difficulty || 'Medium',
        name: q.question,
        correctExpr: q.options[q.correct],
        options: shuffle(q.options.slice()),
        explanation: q.explanation || ''
      }));
    }
    const p = pool();
    const chosen = shuffle(p).slice(0, Math.min(n, p.length));
    return chosen.map(correct => {
      const distractorPool = p.filter(f => f.expr !== correct.expr);
      const distractors = shuffle(distractorPool).slice(0, 3);
      const options = shuffle([correct, ...distractors]);
      return { cat: correct.cat, name: correct.name, correctExpr: correct.expr, options: options.map(o => o.expr), explanation: '' };
    });
  }

  function startQuiz() {
    const n = parseInt(quizLengthSelect.value, 10) || 10;
    quizQuestions = generateQuestions(n);
    if (quizQuestions.length < 4) return;
    quizIndex = 0;
    quizScore = 0;
    quizWrongAnswers = [];
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
    quizQuestionCat.innerHTML = escapeHtml(q.cat) +
      (q.difficulty ? ` <span class="quiz-diff-tag diff-${q.difficulty.toLowerCase()}">${t('quiz_difficulty_' + q.difficulty.toLowerCase())}</span>` : '');
    quizQuestionText.textContent = q.name;
    quizOptionsList.innerHTML = '';
    if (quizExplanationBox) { quizExplanationBox.style.display = 'none'; quizExplanationBox.innerHTML = ''; }
    q.options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'quiz-option-btn';
      btn.textContent = opt;
      btn.addEventListener('click', () => selectQuizAnswer(btn, opt, q.correctExpr, q.explanation, q));
      quizOptionsList.appendChild(btn);
    });
    quizNextBtn.style.display = 'none';
  }

  function selectQuizAnswer(btn, chosen, correct, explanation, q) {
    if (quizAnswered) return;
    quizAnswered = true;
    const isCorrect = chosen === correct;
    if (isCorrect) {
      quizScore++;
    } else {
      quizWrongAnswers.push({
        cat: q.cat,
        name: q.name,
        correctExpr: correct,
        chosen: chosen,
        explanation: explanation || ''
      });
    }
    quizOptionsList.querySelectorAll('.quiz-option-btn').forEach(b => {
      b.disabled = true;
      if (b.textContent === correct) b.classList.add('correct');
      else if (b === btn && !isCorrect) b.classList.add('wrong');
    });
    if (explanation && quizExplanationBox) {
      quizExplanationBox.innerHTML = '<b>' + escapeHtml(t('quiz_explanation_label')) + '</b> ' + escapeHtml(explanation);
      quizExplanationBox.style.display = 'block';
    }
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
    renderWrongAnswerReview();
  }

  function renderWrongAnswerReview() {
    if (!quizWrongReviewWrap || !quizWrongReviewList || !quizReviewToggleBtn) return;
    if (quizWrongAnswers.length === 0) {
      quizWrongReviewWrap.style.display = 'none';
      return;
    }
    quizWrongReviewWrap.style.display = 'block';
    quizReviewToggleBtn.textContent = t('quiz_review_wrong').replace('{n}', quizWrongAnswers.length);
    quizWrongReviewList.innerHTML = quizWrongAnswers.map(w => `
      <div class="quiz-wrong-item">
        <div class="quiz-wrong-cat">${escapeHtml(w.cat)}</div>
        <div class="quiz-wrong-q">${escapeHtml(w.name)}</div>
        <div class="quiz-wrong-your">${escapeHtml(t('quiz_your_answer'))} <span class="wrong-val">${escapeHtml(w.chosen)}</span></div>
        <div class="quiz-wrong-correct">${escapeHtml(t('quiz_correct_answer'))} <span class="correct-val">${escapeHtml(w.correctExpr)}</span></div>
        ${w.explanation ? `<div class="quiz-wrong-explain">${escapeHtml(w.explanation)}</div>` : ''}
      </div>
    `).join('');
    quizWrongReviewList.style.display = 'none';
  }

  if (quizReviewToggleBtn) {
    quizReviewToggleBtn.addEventListener('click', () => {
      const open = quizWrongReviewList.style.display !== 'none';
      quizWrongReviewList.style.display = open ? 'none' : 'block';
    });
  }

  function quitQuiz() {
    quizPlayScreen.style.display = 'none';
    quizResultScreen.style.display = 'none';
    quizSetupScreen.style.display = 'block';
  }

  quizStartBtn.addEventListener('click', () => {
    if (quizMode === 'flashcards') startFlashcards();
    else startQuiz();
  });
  quizNextBtn.addEventListener('click', nextQuizQuestion);
  quizQuitBtn.addEventListener('click', quitQuiz);
  quizRestartBtn.addEventListener('click', () => {
    quizResultScreen.style.display = 'none';
    quizSetupScreen.style.display = 'block';
  });

  /* ============================================
     FLASHCARDS — Leitner-style spaced repetition
     over the same formulaData used by Formula Quiz.
     Progress (box level + due date) is stored per
     formula in localStorage so due cards resurface
     across sessions.
     ============================================ */
  const FLASHCARD_SRS_KEY = 'calvo_flashcard_srs';
  const FLASHCARD_BOX_INTERVAL_DAYS = [0, 1, 3, 7, 16, 35]; // box 0..5
  const FLASHCARD_MAX_BOX = FLASHCARD_BOX_INTERVAL_DAYS.length - 1;
  const DAY_MS = 24 * 60 * 60 * 1000;

  let flashcardQueue = [];
  let flashcardIndex = 0;
  let flashcardSessionTotal = 0;
  let flashcardFlipped = false;
  let flashcardStats = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };

  function loadSrs() {
    try { return JSON.parse(localStorage.getItem(FLASHCARD_SRS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveSrs(map) {
    try { localStorage.setItem(FLASHCARD_SRS_KEY, JSON.stringify(map)); } catch (e) {}
  }
  function flashcardKey(f) { return favKey(f.subject, f); }

  function srsRecordFor(map, key) {
    return map[key] || { box: 0, due: 0 };
  }

  function dueCardsIn(list) {
    const map = loadSrs();
    const now = Date.now();
    return list.filter(f => {
      const rec = srsRecordFor(map, flashcardKey(f));
      return rec.due <= now;
    });
  }

  function updateFlashcardDueNote() {
    if (!flashcardDueNote) return;
    if (quizMode !== 'flashcards') { flashcardDueNote.style.display = 'none'; return; }
    const p = pool();
    if (p.length === 0) { flashcardDueNote.style.display = 'none'; return; }
    const due = dueCardsIn(p).length;
    flashcardDueNote.style.display = 'block';
    flashcardDueNote.textContent = t('flashcard_due_label').replace('{n}', due) + ' / ' + p.length;
  }

  function startFlashcards() {
    const p = pool();
    if (p.length === 0) return;
    const n = Math.min(parseInt(quizLengthSelect.value, 10) || 10, p.length);

    const due = shuffle(dueCardsIn(p));
    let selected = due.slice(0, n);
    if (selected.length < n) {
      const remaining = shuffle(p.filter(f => !selected.includes(f)));
      selected = selected.concat(remaining.slice(0, n - selected.length));
    }

    flashcardQueue = selected;
    flashcardSessionTotal = flashcardQueue.length;
    flashcardIndex = 0;
    flashcardStats = { reviewed: 0, again: 0, hard: 0, good: 0, easy: 0 };

    quizSetupScreen.style.display = 'none';
    quizResultScreen.style.display = 'none';
    flashcardResultScreen.style.display = 'none';
    flashcardPlayScreen.style.display = 'block';
    renderFlashcard();
  }

  function renderFlashcard() {
    if (flashcardIndex >= flashcardQueue.length) { finishFlashcards(); return; }
    flashcardFlipped = false;
    const f = flashcardQueue[flashcardIndex];
    flashcardInner.classList.remove('flipped');
    flashcardCat.textContent = f.cat || f.subject;
    flashcardName.textContent = f.name;
    flashcardCatBack.textContent = f.cat || f.subject;
    flashcardExpr.textContent = f.expr;
    flashcardRateRow.style.display = 'none';

    const displayTotal = flashcardQueue.length;
    flashcardProgressLabel.textContent = t('flashcard_progress')
      .replace('{n}', flashcardIndex + 1).replace('{total}', displayTotal);
    flashcardProgressFill.style.width = (flashcardIndex / displayTotal * 100) + '%';
    const dueLeft = dueCardsIn(flashcardQueue.slice(flashcardIndex)).length;
    flashcardDueLabel.textContent = t('flashcard_due_label').replace('{n}', dueLeft);
  }

  function flipFlashcard() {
    if (flashcardIndex >= flashcardQueue.length) return;
    flashcardFlipped = !flashcardFlipped;
    flashcardInner.classList.toggle('flipped', flashcardFlipped);
    flashcardRateRow.style.display = flashcardFlipped ? 'flex' : 'none';
  }

  function rateFlashcard(rating) {
    const f = flashcardQueue[flashcardIndex];
    if (!f) return;
    const key = flashcardKey(f);
    const map = loadSrs();
    const rec = srsRecordFor(map, key);
    let box = rec.box || 0;

    flashcardStats.reviewed++;
    if (rating === 'again') {
      flashcardStats.again++;
      box = 0;
      map[key] = { box: box, due: Date.now() }; // due immediately -> resurfaces next session too
      flashcardQueue.push(f); // resurface later in this same session
    } else if (rating === 'hard') {
      flashcardStats.hard++;
      map[key] = { box: box, due: Date.now() + DAY_MS };
    } else if (rating === 'good') {
      flashcardStats.good++;
      box = Math.min(FLASHCARD_MAX_BOX, box + 1);
      map[key] = { box: box, due: Date.now() + FLASHCARD_BOX_INTERVAL_DAYS[box] * DAY_MS };
    } else if (rating === 'easy') {
      flashcardStats.easy++;
      box = Math.min(FLASHCARD_MAX_BOX, box + 2);
      map[key] = { box: box, due: Date.now() + FLASHCARD_BOX_INTERVAL_DAYS[box] * DAY_MS };
    }
    saveSrs(map);

    flashcardIndex++;
    renderFlashcard();
  }

  function finishFlashcards() {
    flashcardPlayScreen.style.display = 'none';
    flashcardResultScreen.style.display = 'block';
    const mastered = flashcardStats.good + flashcardStats.easy;
    flashcardResultScoreText.textContent = flashcardStats.reviewed + ' \u2705';
    flashcardResultMsg.textContent =
      t('flashcard_session_summary').replace('{reviewed}', flashcardStats.reviewed).replace('{mastered}', mastered) +
      '. ' + t(flashcardStats.again > 0 ? 'flashcard_msg_ok' : 'flashcard_msg_great');
    updateFlashcardDueNote();
  }

  function quitFlashcards() {
    flashcardPlayScreen.style.display = 'none';
    flashcardResultScreen.style.display = 'none';
    quizSetupScreen.style.display = 'block';
    updateFlashcardDueNote();
  }

  if (flashcardStage) flashcardStage.addEventListener('click', flipFlashcard);
  if (flashcardRateRow) {
    flashcardRateRow.addEventListener('click', (e) => {
      const btn = e.target.closest('.flashcard-rate-btn');
      if (!btn) return;
      rateFlashcard(btn.dataset.rate);
    });
  }
  if (flashcardQuitBtn) flashcardQuitBtn.addEventListener('click', quitFlashcards);
  if (flashcardRestartBtn) {
    flashcardRestartBtn.addEventListener('click', () => {
      flashcardResultScreen.style.display = 'none';
      quizSetupScreen.style.display = 'block';
      updateFlashcardDueNote();
    });
  }

  buildQuizSubjectPills();
  buildQuizDifficultyPills();
  checkQuizPoolSize();
  updateFlashcardDueNote();

  window.refreshQuizI18n = function () {
    buildQuizSubjectPills();
    buildQuizDifficultyPills();
    checkQuizPoolSize();
    updateFlashcardDueNote();
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

    // Coefficient of Variation — how spread out the data is relative to the mean
    const coefVar = mean !== 0 ? (stdSample / Math.abs(mean)) * 100 : 0;

    // Quartiles (using the median-of-halves method) and Interquartile Range
    function quartileMedian(arr) {
      const len = arr.length;
      if (len === 0) return 0;
      return len % 2 === 0 ? (arr[len / 2 - 1] + arr[len / 2]) / 2 : arr[(len - 1) / 2];
    }
    let q1 = NaN, q3 = NaN, iqr = NaN;
    if (n >= 4) {
      const lowerHalf = n % 2 === 0 ? sorted.slice(0, n / 2) : sorted.slice(0, (n - 1) / 2);
      const upperHalf = n % 2 === 0 ? sorted.slice(n / 2) : sorted.slice((n + 1) / 2);
      q1 = quartileMedian(lowerHalf);
      q3 = quartileMedian(upperHalf);
      iqr = q3 - q1;
    }

    // Sum of squared deviations from the mean — the raw building block behind variance
    const sumOfSquares = nums.reduce((a, v) => a + Math.pow(v - mean, 2), 0);

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
    html += statCell(t('stats_var_pop'), round(variancePop));
    html += statCell(t('stats_var_sample'), round(varianceSample));
    html += statCell(t('stats_cv'), round(coefVar) + '%');
    html += statCell(t('stats_sum_squares'), round(sumOfSquares));
    if (n >= 4) {
      html += statCell(t('stats_q1'), round(q1));
      html += statCell(t('stats_q3'), round(q3));
      html += statCell(t('stats_iqr'), round(iqr));
    }
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

/* ============================================
   EXAM/TEST TIMER + POMODORO MODE
   Notifications use the browser's built-in
   Notification API — no server/backend involved.
   Sound uses the Web Audio API (a short generated
   beep), so no audio files are needed either.
   ============================================ */
(function () {
  const modePomodoroBtn = document.getElementById('timerModePomodoroBtn');
  const modeCountdownBtn = document.getElementById('timerModeCountdownBtn');
  const pomodoroSettings = document.getElementById('timerPomodoroSettings');
  const countdownSettings = document.getElementById('timerCountdownSettings');
  const focusMinInput = document.getElementById('timerFocusMin');
  const breakMinInput = document.getElementById('timerBreakMin');
  const longBreakMinInput = document.getElementById('timerLongBreakMin');
  const cyclesInput = document.getElementById('timerCyclesInput');
  const countdownMinInput = document.getElementById('timerCountdownMin');
  const ringProgress = document.getElementById('timerRingProgress');
  const timeDisplay = document.getElementById('timerTimeDisplay');
  const phaseLabel = document.getElementById('timerPhaseLabel');
  const cycleLabel = document.getElementById('timerCycleLabel');
  const startBtn = document.getElementById('timerStartBtn');
  const pauseBtn = document.getElementById('timerPauseBtn');
  const resetBtn = document.getElementById('timerResetBtn');
  const soundToggle = document.getElementById('timerSoundToggle');
  const notifyPermBtn = document.getElementById('timerNotifyPermBtn');
  const notifyNote = document.getElementById('timerNotifyNote');
  if (!startBtn) return;

  const RING_CIRCUMFERENCE = 2 * Math.PI * 98;

  let timerMode = 'pomodoro'; // 'pomodoro' | 'countdown'
  let phase = 'focus'; // 'focus' | 'break' | 'longbreak' | 'countdown'
  let cyclesCompleted = 0;
  let totalSeconds = 25 * 60;
  let remainingSeconds = 25 * 60;
  let endAt = null; // timestamp (ms) the current phase should end at, while running
  let tickInterval = null;
  let running = false;

  function trT(key) { return (typeof t === 'function') ? t(key) : key; }

  function fmtTime(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
  }

  function updateRing() {
    const frac = totalSeconds > 0 ? Math.max(0, Math.min(1, remainingSeconds / totalSeconds)) : 0;
    ringProgress.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - frac));
    ringProgress.classList.toggle('timer-break-color', phase === 'break' || phase === 'longbreak');
  }

  function updateDisplay() {
    timeDisplay.textContent = fmtTime(remainingSeconds);
    const phaseKey = phase === 'focus' ? 'timer_phase_focus'
      : phase === 'break' ? 'timer_phase_break'
      : phase === 'longbreak' ? 'timer_phase_long_break'
      : 'timer_phase_countdown';
    phaseLabel.textContent = trT(phaseKey);
    cycleLabel.textContent = (timerMode === 'pomodoro')
      ? trT('timer_cycle_label').replace('{n}', cyclesCompleted + 1)
      : '';
    updateRing();
  }

  function setTimerMode(mode) {
    if (running) stopTicking(); // switching modes cancels any active run
    running = false;
    timerMode = mode;
    modePomodoroBtn.classList.toggle('active', mode === 'pomodoro');
    modeCountdownBtn.classList.toggle('active', mode === 'countdown');
    pomodoroSettings.style.display = mode === 'pomodoro' ? 'block' : 'none';
    countdownSettings.style.display = mode === 'countdown' ? 'block' : 'none';
    resetTimerState();
    setControlsRunning(false);
  }

  function resetTimerState() {
    cyclesCompleted = 0;
    if (timerMode === 'pomodoro') {
      phase = 'focus';
      totalSeconds = Math.max(1, parseInt(focusMinInput.value, 10) || 25) * 60;
    } else {
      phase = 'countdown';
      totalSeconds = Math.max(1, parseInt(countdownMinInput.value, 10) || 60) * 60;
    }
    remainingSeconds = totalSeconds;
    updateDisplay();
  }

  function setControlsRunning(isRunning) {
    startBtn.style.display = isRunning ? 'none' : 'flex';
    pauseBtn.style.display = isRunning ? 'flex' : 'none';
  }

  /* ---- Sound: a short generated beep, no audio files needed ---- */
  let audioCtx = null;
  function beep() {
    if (!soundToggle.checked) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const now = audioCtx.currentTime;
      [0, 0.22, 0.44].forEach((delay, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = i === 2 ? 880 : 660;
        gain.gain.setValueAtTime(0.0001, now + delay);
        gain.gain.exponentialRampToValueAtTime(0.25, now + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.18);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(now + delay);
        osc.stop(now + delay + 0.2);
      });
    } catch (e) { /* Web Audio unavailable — silently skip */ }
  }

  /* ---- Notifications: browser Notification API only, no backend ---- */
  const NotifCtor = window.Notification;

  function updateNotifyUI() {
    if (!NotifCtor) {
      notifyPermBtn.style.display = 'none';
      notifyNote.textContent = trT('timer_notify_unsupported');
      return;
    }
    if (NotifCtor.permission === 'granted') {
      notifyPermBtn.style.display = 'none';
      notifyNote.textContent = trT('timer_notify_enabled');
    } else if (NotifCtor.permission === 'denied') {
      notifyPermBtn.style.display = 'none';
      notifyNote.textContent = trT('timer_notify_denied');
    } else {
      notifyPermBtn.style.display = 'inline-flex';
      notifyNote.textContent = trT('timer_notify_hint');
    }
  }

  if (notifyPermBtn) {
    notifyPermBtn.addEventListener('click', () => {
      if (!NotifCtor) return;
      NotifCtor.requestPermission().then(updateNotifyUI);
    });
  }

  function notify(titleKey, bodyKey) {
    if (NotifCtor && NotifCtor.permission === 'granted') {
      try {
        new NotifCtor(trT(titleKey), { body: trT(bodyKey), icon: './icon-192.png', tag: 'calvo-timer' });
      } catch (e) { /* ignore */ }
    }
  }

  /* ---- Ticking: computed against wall-clock end time so it stays
     accurate even if the tab is backgrounded and setInterval is throttled ---- */
  function stopTicking() {
    if (tickInterval) { clearInterval(tickInterval); tickInterval = null; }
  }

  function tick() {
    remainingSeconds = Math.max(0, Math.round((endAt - Date.now()) / 1000));
    updateDisplay();
    if (remainingSeconds <= 0) {
      stopTicking();
      running = false;
      onPhaseComplete();
    }
  }

  function startTicking() {
    endAt = Date.now() + remainingSeconds * 1000;
    stopTicking();
    tickInterval = setInterval(tick, 250);
    running = true;
    setControlsRunning(true);
  }

  function onPhaseComplete() {
    beep();
    if (timerMode === 'countdown') {
      notify('timer_notify_title_done', 'timer_notify_body_done');
      remainingSeconds = 0;
      updateDisplay();
      setControlsRunning(false);
      return;
    }

    // Pomodoro: advance to the next phase automatically.
    if (phase === 'focus') {
      cyclesCompleted++;
      const cyclesPerLongBreak = Math.max(1, parseInt(cyclesInput.value, 10) || 4);
      if (cyclesCompleted % cyclesPerLongBreak === 0) {
        phase = 'longbreak';
        totalSeconds = Math.max(1, parseInt(longBreakMinInput.value, 10) || 15) * 60;
        notify('timer_notify_title_long_break', 'timer_notify_body_long_break');
      } else {
        phase = 'break';
        totalSeconds = Math.max(1, parseInt(breakMinInput.value, 10) || 5) * 60;
        notify('timer_notify_title_break', 'timer_notify_body_break');
      }
    } else {
      phase = 'focus';
      totalSeconds = Math.max(1, parseInt(focusMinInput.value, 10) || 25) * 60;
      notify('timer_notify_title_focus', 'timer_notify_body_focus');
    }
    remainingSeconds = totalSeconds;
    updateDisplay();
    startTicking(); // auto-continue into the next phase
  }

  startBtn.addEventListener('click', () => {
    if (remainingSeconds <= 0) resetTimerState();
    // Re-sync duration fields in case the user tweaked them before the
    // very first start of a fresh phase.
    if (!running && remainingSeconds === totalSeconds) {
      if (timerMode === 'pomodoro' && phase === 'focus') {
        totalSeconds = Math.max(1, parseInt(focusMinInput.value, 10) || 25) * 60;
        remainingSeconds = totalSeconds;
      } else if (timerMode === 'countdown') {
        totalSeconds = Math.max(1, parseInt(countdownMinInput.value, 10) || 60) * 60;
        remainingSeconds = totalSeconds;
      }
    }
    startTicking();
    updateDisplay();
  });

  pauseBtn.addEventListener('click', () => {
    stopTicking();
    running = false;
    setControlsRunning(false);
  });

  resetBtn.addEventListener('click', () => {
    stopTicking();
    running = false;
    resetTimerState();
    setControlsRunning(false);
  });

  modePomodoroBtn.addEventListener('click', () => setTimerMode('pomodoro'));
  modeCountdownBtn.addEventListener('click', () => setTimerMode('countdown'));

  [focusMinInput, countdownMinInput].forEach(inp => {
    inp.addEventListener('change', () => {
      if (!running) resetTimerState();
    });
  });

  window.refreshTimerI18n = updateDisplay;

  resetTimerState();
  setControlsRunning(false);
  updateNotifyUI();
})();
