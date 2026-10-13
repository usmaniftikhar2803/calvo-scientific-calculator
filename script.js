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
    Chemistry: '⚗', Physics: '⚛', Biology: '🧬', Commerce: '💰', Math: '∑',
    Finance: '🏦', Vectors: '➡', Calculus: '∂', Probability: '🎲'
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
    const tool = currentTool();
    body.innerHTML = tool.render();
    if (typeof tool.afterRender === 'function') tool.afterRender();
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
  const moreBtn = document.querySelector('.topbar-more');
  if (moreBtn) moreBtn.classList.toggle('active', tabBtn.classList.contains('secondary'));
  if (tabName === 'home') tabPanel.scrollTop = 0;
  if (remember) {
    try { sessionStorage.setItem(ACTIVE_TAB_KEY, tabName); } catch (e) {}
  }
}

/* ---- Mobile/hardware back button: step back ONE screen at a time ----
   Every screen change pushes its own history entry: tab -> tab (Home ->
   Calculator -> Graph ...) AND inside a tool (Subject Tools: subjects ->
   tools list -> one tool; Formulas: subjects -> formula list; Quiz: setup ->
   count -> play; Equations / Matrix: list -> detail). Back therefore walks
   back through the exact path the user took. Home is the very first entry,
   so only a back press on Home leaves the site / closes the app. If a popup
   (More menu, Languages, About) is open, back closes just that popup. */
let currentHistoryTab = 'home';

// Sub-screens ("levels") inside each tool tab. depth() = how many levels deep
// the tab currently is; closeBtn(d) = the on-screen Back button that leaves level d.
const SUB_SCREENS = {
  subjecttools: {
    depth() { return shown('subjectToolsDetailView') ? 2 : shown('subjectToolsListView') ? 1 : 0; },
    closeBtn(d) { return d >= 2 ? 'subjectToolsBackBtn' : 'subjectToolsListBackBtn'; }
  },
  graph: {
    // Function Grapher: 1 = graph names, 2 = functions, 3 = the graph
    depth() { return shown('graphStep3') ? 2 : shown('graphStep2') ? 1 : 0; },
    closeBtn(d) { return d >= 2 ? 'graphBackToInputBtn' : 'graphBackToListBtn'; }
  },
  formulas: {
    depth() { return shown('formulaDetailView') ? 1 : 0; },
    closeBtn() { return 'formulaBackBtn'; }
  },
  eqsolver: {
    depth() { return shown('eqDetailView') ? 1 : 0; },
    closeBtn() { return 'eqDetailBackBtn'; }
  },
  matrix: {
    depth() { return shown('matrixDetailView') ? 1 : 0; },
    closeBtn() { return 'matrixDetailBackBtn'; }
  },
  quiz: {
    depth() {
      if (shown('quizPlayScreen') || shown('quizResultScreen') || shown('flashcardPlayScreen') || shown('flashcardResultScreen')) return 2;
      return shown('quizCountScreen') ? 1 : 0;
    },
    closeBtn(d) {
      if (d < 2) return 'quizBackBtn';
      if (shown('quizPlayScreen')) return 'quizQuitBtn';
      if (shown('quizResultScreen')) return 'quizRestartBtn';
      if (shown('flashcardPlayScreen')) return 'flashcardQuitBtn';
      return 'flashcardRestartBtn';
    }
  }
};
const subDepthRecorded = {};

function shown(id) {
  const el = document.getElementById(id);
  return !!el && el.style.display !== 'none';
}
function subDepth(tab) { return SUB_SCREENS[tab] ? SUB_SCREENS[tab].depth() : 0; }

function closeOneSubScreen(tab) {
  const cfg = SUB_SCREENS[tab];
  const d = subDepth(tab);
  if (!cfg || d === 0) return false;
  const btn = document.getElementById(cfg.closeBtn(d));
  if (btn) btn.click();
  return subDepth(tab) < d;
}

function resetSubScreens(tab) {
  let guard = 6;
  while (subDepth(tab) > 0 && guard-- > 0) { if (!closeOneSubScreen(tab)) break; }
  subDepthRecorded[tab] = subDepth(tab);
}

function closeOpenPopups() {
  let closed = false;
  ['languagesOverlay', 'aboutOverlay', 'morePop', 'moreBackdrop', 'themePanel', 'textSizePanel', 'topbarMenu'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.classList.contains('open')) { el.classList.remove('open'); closed = true; }
  });
  const mb = document.getElementById('topbarMoreBtn');
  if (mb) mb.setAttribute('aria-expanded', 'false');
  return closed;
}

/* ---------- Popups and the Back button ----------
   Every popup (More, menu, Languages, About, Theme, Text size) gets its own
   history entry while it is open. So Back only closes the popup and can never
   throw the person out of the site. If a tool is picked from the popup, that
   same entry is reused for the tool, so Back goes one step at a time. */
const POPUP_SEL = '#morePop.open, #topbarMenu.open, #languagesOverlay.open, #aboutOverlay.open, #themePanel.open, #textSizePanel.open';
let popupEntry = false;
function syncPopupHistory() {
  const open = !!document.querySelector(POPUP_SEL);
  if (open && !popupEntry) {
    popupEntry = true;
    history.pushState({ tab: currentHistoryTab, sub: subDepth(currentHistoryTab), popup: 1 }, '', location.href);
  } else if (!open && popupEntry) {
    popupEntry = false;      // closed by tapping outside / X / Esc: drop its entry
    history.back();
  }
}
['morePop', 'topbarMenu', 'languagesOverlay', 'aboutOverlay', 'themePanel', 'textSizePanel'].forEach(id => {
  const el = document.getElementById(id);
  if (el && typeof MutationObserver !== 'undefined') new MutationObserver(syncPopupHistory).observe(el, { attributes: true, attributeFilter: ['class'] });
});

function navigateToTab(tabName, remember) {
  // Opening a tool from outside always starts at its first screen, so the
  // history entries and the visible screen can never disagree.
  resetSubScreens(tabName);
  const reuseEntry = popupEntry;      // a popup entry is on top of the stack
  popupEntry = false;
  if (tabName === currentHistoryTab) {
    activateTab(tabName, remember);
    if (reuseEntry) history.back();   // same screen: just remove the popup entry
    return;
  }
  activateTab(tabName, remember);
  if (reuseEntry) history.replaceState({ tab: tabName, sub: 0 }, '', location.href);
  else history.pushState({ tab: tabName, sub: 0 }, '', location.href);
  currentHistoryTab = tabName;
}

// A tool moved to a deeper screen (push an entry) or the person used the
// on-screen Back button (pop the matching entry so history stays in step).
function syncSubScreens(tab) {
  const d = subDepth(tab);
  const r = subDepthRecorded[tab] || 0;
  if (d === r) return;
  subDepthRecorded[tab] = d;
  if (tab !== currentHistoryTab) return;
  if (d > r) {
    for (let i = r + 1; i <= d; i++) history.pushState({ tab, sub: i }, '', location.href);
  } else {
    history.go(-(r - d));
  }
}
Object.keys(SUB_SCREENS).forEach(tab => {
  const panel = document.getElementById('tab-' + tab);
  if (!panel || typeof MutationObserver === 'undefined') return;
  new MutationObserver(() => syncSubScreens(tab)).observe(panel, { subtree: true, attributes: true, attributeFilter: ['style'] });
});

window.addEventListener('popstate', (e) => {
  // A popup is open: back only closes it, and we stay on the same screen.
  if (popupEntry) {
    popupEntry = false;
    closeOpenPopups();
    return;
  }
  if (closeOpenPopups()) {
    history.pushState({ tab: currentHistoryTab, sub: subDepth(currentHistoryTab) }, '', location.href);
    return;
  }
  const state = e.state;
  if (!state || !state.tab) return;
  const tab = state.tab, sub = state.sub || 0;
  if (tab !== currentHistoryTab) {
    activateTab(tab, true);
    currentHistoryTab = tab;
    window.scrollTo(0, 0);
  }
  // Close inner screens until we are as deep as this history entry says.
  let guard = 6;
  while (subDepth(tab) > sub && guard-- > 0) { if (!closeOneSubScreen(tab)) break; }
  subDepthRecorded[tab] = subDepth(tab);
  // Stale entry (that inner screen is no longer open): skip it.
  if (subDepth(tab) < sub) history.back();
  // No entry left (we were on the very first Home entry) -> the phone/browser
  // handles back normally, which closes the site/app.
});

document.querySelectorAll('.topbar-tab[data-tab]').forEach(tab => {
  tab.addEventListener('click', () => navigateToTab(tab.dataset.tab, true));
});

/* ---------- Home screen + "More" popover (one tool list feeds both) ---------- */
const HOME_TOOL_GROUPS = [
  { title: 'Math & Science', items: [
    { go: 'graph',        gl: 'f(x)', t: 'Graph',         s: 'Plot functions' },
    { go: 'eqsolver',     gl: 'x\u00B2',   t: 'Equations',     s: 'Solve equations' },
    { go: 'matrix',       gl: '[ ]',  t: 'Matrix',        s: 'Matrix operations' },
    { go: 'stats',        gl: '\u03C3',    t: 'Statistics',    s: 'Statistical calculator' },
    { go: 'programmer',   gl: '</>',  t: 'Programmer',    s: 'Binary, octal and hex' },
    { go: 'subjecttools', gl: 'H\u2082O',  t: 'Subject Tools', s: 'Chemistry, Physics, Biology, Finance and more' },
  ]},
  { title: 'Convert & Results', items: [
    { go: 'convert',    gl: '\u21C4',   t: 'Unit Converter',  s: 'Length, currency and more' },
    { go: 'percentage', gl: '%',        t: 'Percent & Merit', s: 'MDCAT, ECAT, NUST, FAST-NU' },
    { href: 'gpa-calculator.html',             gl: 'GPA', t: 'GPA',         s: 'One semester' },
    { href: 'cgpa-calculator.html',            gl: 'CG',  t: 'CGPA',        s: 'All semesters', onlyMore: true },
    { href: 'marks-percentage-calculator.html', gl: '%\u2191', t: 'Marks to %', s: 'Subject-wise percentage' },
  ]},
  { title: 'Study & Tools', items: [
    { go: 'quiz',    gl: '?',   t: 'Quiz',    s: 'Test yourself' },
    { go: 'timer',   gl: '\u25F7', t: 'Timer',   s: 'Study timer' },
    { go: 'history', gl: '\u21BA', t: 'History', s: 'Your saved results' },
    { href: 'image-to-pdf.html',  gl: 'PDF',    t: 'Image to PDF',  s: 'Photos to one PDF' },
    { href: 'compress-pdf.html',  gl: 'PDF\u2193', t: 'Compress PDF',  s: 'Reduce PDF size' },
    { href: 'photo-resizer.html', gl: 'KB',     t: 'Photo Resizer', s: 'Passport size, 20-100 KB' },
    { href: 'merge-split-pdf.html', gl: 'PDF+',  t: 'Merge & Split PDF', s: 'Join, extract, delete pages' },
    { href: 'title-page-generator.html', gl: 'Aa', t: 'Title Page Generator', s: 'Assignment cover page' },
    { href: 'cv-builder.html', gl: 'CV', t: 'CV / Resume Builder', s: 'Make a PDF resume' },
    { href: 'notes-todo.html', gl: '\u2713', t: 'Notepad', s: 'Simple notes, works offline' },
  ]},
];

function buildToolGroups(container, forMore) {
  if (!container) return;
  container.innerHTML = '';
  HOME_TOOL_GROUPS.forEach(g => {
    const items = g.items.filter(it => forMore || !it.onlyMore);
    if (!items.length) return;
    const col = document.createElement('div');
    col.className = 'home-group';
    const h = document.createElement('h3');
    h.textContent = g.title;
    col.appendChild(h);
    items.forEach(it => {
      const el = document.createElement(it.href ? 'a' : 'button');
      el.className = 'tool-row';
      if (it.href) el.href = it.href; else { el.type = 'button'; el.dataset.go = it.go; }
      const gl = document.createElement('span');
      gl.className = 'tool-gl' + (it.gl.length === 1 ? ' sym' : '');
      gl.textContent = it.gl;
      const tx = document.createElement('span');
      tx.className = 'tool-tx';
      const b = document.createElement('b'); b.textContent = it.t;
      const sm = document.createElement('small'); sm.textContent = it.s;
      tx.appendChild(b); tx.appendChild(sm);
      el.appendChild(gl); el.appendChild(tx);
      col.appendChild(el);
    });
    container.appendChild(col);
  });
}
buildToolGroups(document.getElementById('homeTools'), false);
buildToolGroups(document.getElementById('morePopTools'), true);

/* The tile already draws its own icon, so drop the star / clock repeated in the label text */
function stripLeadingGlyph(txt) { return String(txt || '').replace(/^[^\p{L}\p{N}]+/u, ''); }

/* Search box above a tool list (Home + "More" popover): type to filter, Enter opens the first match */
function attachToolSearch(container) {
  if (!container || container.previousElementSibling?.classList.contains('tool-search-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'tool-search-wrap';
  wrap.innerHTML = '<svg class="tool-search-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.5" y2="16.5"></line></svg>';
  const input = document.createElement('input');
  input.type = 'search';
  input.className = 'tool-search';
  input.placeholder = 'Search tools (e.g. PDF, CGPA, resume)';
  input.setAttribute('aria-label', 'Search tools');
  input.autocomplete = 'off';
  wrap.appendChild(input);
  const empty = document.createElement('div');
  empty.className = 'tool-empty';
  empty.textContent = 'No tool found. Try another word, e.g. "pdf", "gpa" or "graph".';
  container.parentNode.insertBefore(wrap, container);
  container.parentNode.insertBefore(empty, container);
  const apply = () => {
    const q = input.value.trim().toLowerCase();
    let shown = 0;
    container.querySelectorAll('.home-group').forEach(g => {
      let any = false;
      g.querySelectorAll('.tool-row').forEach(r => {
        const hit = !q || r.textContent.toLowerCase().includes(q);
        r.hidden = !hit;
        if (hit) { any = true; shown++; }
      });
      g.hidden = !any;
    });
    empty.classList.toggle('show', !!q && shown === 0);
  };
  input.addEventListener('input', apply);
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const first = container.querySelector('.tool-row:not([hidden])');
    if (first) first.click();
  });
}
attachToolSearch(document.getElementById('homeTools'));
attachToolSearch(document.getElementById('morePopTools'));

/* "All tools" crumb above every tool page (everything except Calculator / Home) */
document.querySelectorAll('.tab-panel').forEach(panel => {
  if (panel.id === 'tab-calc' || panel.id === 'tab-home') return;
  const wrap = panel.querySelector('.formulas-wrap');
  if (!wrap || wrap.querySelector('.tool-crumb')) return;
  const crumb = document.createElement('div');
  crumb.className = 'tool-crumb';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'tool-back';
  btn.textContent = '\u2190 All tools';
  btn.addEventListener('click', () => { navigateToTab('home', true); window.scrollTo(0, 0); });
  crumb.appendChild(btn);
  wrap.insertBefore(crumb, wrap.firstChild);
});

/* Safety net: html/body are locked to the viewport, so the page itself must never scroll.
   If anything (focus, scrollIntoView, keyboard) nudges it, snap back so the fixed navbar
   never covers the "All tools" button. */
(function lockPageScroll() {
  const reset = () => {
    const de = document.documentElement, b = document.body;
    if (de && de.scrollTop) de.scrollTop = 0;
    if (b && b.scrollTop) b.scrollTop = 0;
  };
  window.addEventListener('scroll', reset, { passive: true });
  document.addEventListener('scroll', reset, { passive: true });
})();

const brandBtn = document.getElementById('topbarBrand');
if (brandBtn) {
  const goHome = () => { setMoreOpen(false); navigateToTab('home', true); window.scrollTo(0, 0); };
  brandBtn.addEventListener('click', goHome);
  brandBtn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHome(); } });
}
const moreBtn = document.getElementById('topbarMoreBtn');
const morePop = document.getElementById('morePop');
const moreBackdrop = document.getElementById('moreBackdrop');
function setMoreOpen(open) {
  if (!morePop) return;
  morePop.classList.toggle('open', open);
  if (moreBackdrop) moreBackdrop.classList.toggle('open', open);
  if (moreBtn) moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}
if (moreBtn) moreBtn.addEventListener('click', (e) => { e.stopPropagation(); setMoreOpen(!morePop.classList.contains('open')); });
if (moreBackdrop) moreBackdrop.addEventListener('click', () => setMoreOpen(false));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMoreOpen(false); });

/* Any [data-go] card / row / skip button on Home or in the More popover */
document.addEventListener('click', (e) => {
  const el = e.target.closest('#tab-home [data-go], #morePop [data-go]');
  if (!el) return;
  setMoreOpen(false);
  navigateToTab(el.dataset.go, true);
  window.scrollTo(0, 0);
});

// Everyone (new or returning) lands on the Home screen first. Search-engine
// bots get the Calculator instead, so Google still indexes the real tool.
let restoredTab = 'home';
try {
  if (/bot|crawl|spider|lighthouse|pagespeed|headless/i.test(navigator.userAgent)) restoredTab = 'calc';
} catch (e) {}
// Back/forward from another page of the site: reopen the tool the person left,
// instead of dropping them on Home.
let backState = null;
try {
  const nav = performance.getEntriesByType('navigation')[0];
  const st = history.state;
  if (nav && nav.type === 'back_forward' && st && st.tab && document.getElementById('tab-' + st.tab)) backState = st;
} catch (e) {}
if (backState) restoredTab = backState.tab;
activateTab(restoredTab, false);
currentHistoryTab = restoredTab;
if (backState) {
  if (backState.popup) history.back();   // a popup was open when the person left: step over that entry
  else history.replaceState({ tab: restoredTab, sub: 0 }, '', location.href);
} else {
  history.replaceState({ tab: 'home', sub: 0 }, '', location.href);
  if (restoredTab !== 'home') {
    // Not on Home (bots only) - still push the one extra entry so the back
    // button behaves the same as normal in-app navigation.
    history.pushState({ tab: restoredTab, sub: 0 }, '', location.href);
  }
}

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
  window.setCalcView = applyCalcView;
})();

/* Home cards "Basic Calculator" / "Scientific Calculator" open the calculator in that view */
document.querySelectorAll('[data-calcview-go]').forEach(el => {
  el.addEventListener('click', () => { if (window.setCalcView) window.setCalcView(el.dataset.calcviewGo); });
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
/* ---------- FORMULA DATA (9th to MS Level) — LAZY-LOADED ----------
   The formula library (~1.4 MB, 10,000+ formulas) used to live inside this
   file. It now lives in data/formulas/<subject>.json and each subject is
   downloaded only when a student opens it (or starts a quiz on it).
   FORMULA_MANIFEST is tiny and gives names + counts instantly, so the
   subject grid renders with no network request at all. */
const FORMULA_MANIFEST = {
  "Mathematics": { file: 'data/formulas/mathematics.json', count: 500 },
  "Physics": { file: 'data/formulas/physics.json', count: 500 },
  "Chemistry": { file: 'data/formulas/chemistry.json', count: 500 },
  "Biology": { file: 'data/formulas/biology.json', count: 500 },
  "Statistics": { file: 'data/formulas/statistics.json', count: 500 },
  "Commerce": { file: 'data/formulas/commerce.json', count: 500 },
  "Computer Science": { file: 'data/formulas/computer-science.json', count: 500 },
  "Accounting & Finance": { file: 'data/formulas/accounting-finance.json', count: 500 },
  "Cost Accounting": { file: 'data/formulas/cost-accounting.json', count: 284 },
  "Psychology": { file: 'data/formulas/psychology.json', count: 500 },
  "Economics": { file: 'data/formulas/economics.json', count: 500 },
  "Financial Management": { file: 'data/formulas/financial-management.json', count: 500 },
  "Electrical Engineering": { file: 'data/formulas/electrical-engineering.json', count: 500 },
  "Mechanical Engineering": { file: 'data/formulas/mechanical-engineering.json', count: 500 },
  "Civil Engineering": { file: 'data/formulas/civil-engineering.json', count: 500 },
  "Data Science": { file: 'data/formulas/data-science.json', count: 500 },
  "Pharmacy & Pharmacology": { file: 'data/formulas/pharmacy-pharmacology.json', count: 500 },
  "Environmental Science": { file: 'data/formulas/environmental-science.json', count: 500 },
  "Chemical Engineering": { file: 'data/formulas/chemical-engineering.json', count: 500 },
  "Software Engineering": { file: 'data/formulas/software-engineering.json', count: 500 },
  "Textile Engineering": { file: 'data/formulas/textile-engineering.json', count: 500 }
};
const formulaData = {};      // subject -> array of {cat, name, expr}; filled on demand
const formulaLoading = {};   // subject -> in-flight Promise (avoids duplicate fetches)

function formulaSubjectCount(subj) {
  return FORMULA_MANIFEST[subj] ? FORMULA_MANIFEST[subj].count : 0;
}

function loadFormulaSubject(subj) {
  if (formulaData[subj]) return Promise.resolve(formulaData[subj]);
  if (formulaLoading[subj]) return formulaLoading[subj];
  const meta = FORMULA_MANIFEST[subj];
  if (!meta) return Promise.resolve([]);
  const p = fetch(meta.file)
    .then(res => { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(arr => { formulaData[subj] = arr; delete formulaLoading[subj]; return arr; })
    .catch(err => { delete formulaLoading[subj]; throw err; });
  formulaLoading[subj] = p;
  return p;
}

function ensureFormulaSubjects(list) {
  return Promise.all(list.map(loadFormulaSubject));
}

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

/* Removes a single formula from "Recently Viewed" by its key (used by the
   ✕ button shown only in the Recent list) and re-renders that view. */
function removeRecentFormula(key) {
  recentFormulas = recentFormulas.filter(r => r.key !== key);
  persistRecentFormulas();
  if (activeSubject === RECENT_SUBJECT_KEY) renderFormulas();
  buildSubjectPills();
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
  Mathematics: '∑', Physics: '⚛', Chemistry: '⚗', Biology: '🧬', Statistics: '📊', Commerce: '💰', 'Computer Science': '💻', 'Accounting & Finance': '📒', 'Cost Accounting': '🧮', Psychology: '🧠', Economics: '📈', 'Financial Management': '🏦', 'Electrical Engineering': '⚡', 'Mechanical Engineering': '⚙️', 'Civil Engineering': '🏗️', 'Data Science': '🤖', 'Pharmacy & Pharmacology': '💊', 'Chemical Engineering': '🏭', 'Environmental Science': '🌍', 'Software Engineering': '🧩', 'Textile Engineering': '🧵'
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
  favTile.innerHTML = `<div class="subject-tile-icon">★</div><div class="subject-tile-name">${stripLeadingGlyph(t('favorites_pill'))}</div><div class="subject-tile-count">${favFormulas.length}</div>`;
  favTile.addEventListener('click', () => openSubjectDetail(FAV_SUBJECT_KEY, t('favorites_pill')));
  subjectGrid.appendChild(favTile);

  const recentTile = document.createElement('div');
  recentTile.className = 'subject-tile recent-tile';
  recentTile.innerHTML = `<div class="subject-tile-icon">🕐</div><div class="subject-tile-name">${stripLeadingGlyph(t('recent_pill'))}</div><div class="subject-tile-count">${recentFormulas.length}</div>`;
  recentTile.addEventListener('click', () => openSubjectDetail(RECENT_SUBJECT_KEY, t('recent_pill')));
  subjectGrid.appendChild(recentTile);

  Object.keys(FORMULA_MANIFEST).forEach(subj => {
    const tile = document.createElement('div');
    tile.className = 'subject-tile';
    const icon = SUBJECT_ICONS[subj] || 'ƒ';
    tile.innerHTML = `<div class="subject-tile-icon">${icon}</div><div class="subject-tile-name">${subj}</div><div class="subject-tile-count">${formulaSubjectCount(subj)} formulas</div>`;
    tile.addEventListener('click', () => openSubjectDetail(subj, subj));
    subjectGrid.appendChild(tile);
  });
}

function formulaItemHtml(f, key, subjTag, isRecent) {
  const fav = isFavByKey(key);
  const tagHtml = subjTag ? `<span class="formula-subj-tag">${subjTag}</span>` : '';
  const removeBtnHtml = isRecent
    ? `<button class="icon-action-btn formula-remove-recent-btn" data-key="${key}" title="Remove from recent">&#10005;</button>`
    : '';
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
        ${removeBtnHtml}
      </div>
    </div>
    <div class="formula-explain-box" style="display:none;"></div>`;
}

/* Which subject files must be loaded before the current view can render. */
function formulaSubjectsNeeded() {
  if (activeSubject === RECENT_SUBJECT_KEY) return [];
  if (activeSubject === FAV_SUBJECT_KEY) {
    // Favorites are stored as "subject||category||name" — only load subjects that have one.
    const have = new Set(favFormulas.map(k => String(k).split('||')[0]));
    return Object.keys(FORMULA_MANIFEST).filter(s => have.has(s));
  }
  return FORMULA_MANIFEST[activeSubject] ? [activeSubject] : [];
}

let formulaRenderToken = 0;
function renderFormulas() {
  const need = formulaSubjectsNeeded().filter(s => !formulaData[s]);
  if (need.length === 0) { renderFormulasNow(); return; }
  // Nothing visible yet (e.g. first page load, or a language switch while the
  // formula list is closed) — don't download anything until a subject is opened.
  if (!formulaList.offsetParent) return;
  const token = ++formulaRenderToken;
  formulaList.innerHTML = '<div class="formula-empty">Loading formulas…</div>';
  ensureFormulaSubjects(need)
    .then(() => { if (token === formulaRenderToken) renderFormulasNow(); })
    .catch(() => {
      if (token !== formulaRenderToken) return;
      formulaList.innerHTML = '<div class="formula-empty">Could not load formulas. Check your internet connection and try again.<br><button type="button" class="icon-action-btn" id="formulaRetryBtn" style="margin-top:10px;padding:6px 14px;width:auto;">Retry</button></div>';
      const rb = document.getElementById('formulaRetryBtn');
      if (rb) rb.addEventListener('click', renderFormulas);
    });
}

function renderFormulasNow() {
  const q = formulaSearch.value.toLowerCase();
  formulaList.innerHTML = '';

  /* ---- Favorites view: pulls matching formulas across every subject ---- */
  if (activeSubject === FAV_SUBJECT_KEY) {
    const favItems = [];
    Object.keys(FORMULA_MANIFEST).forEach(subj => {
      (formulaData[subj] || []).forEach(f => {
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
      div.innerHTML = formulaItemHtml(f, r.key, r.subj, true);
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
  const removeRecentBtn = e.target.closest('.formula-remove-recent-btn');
  if (removeRecentBtn) {
    removeRecentFormula(removeRecentBtn.dataset.key);
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
  const aiMoreBtn = e.target.closest('.explain-ai-btn');
  if (aiMoreBtn) {
    const aiBox = aiMoreBtn.closest('.formula-explain-box');
    const aiRow = aiBox ? aiBox.closest('.formula-item') : null;
    const aiOut = aiBox ? aiBox.querySelector('.explain-ai-out') : null;
    if (!aiRow || !aiOut) return;
    const aiName = aiRow.querySelector('.formula-name').textContent;
    const aiExpr = aiRow.querySelector('.formula-expr').textContent;
    if (typeof window.calvoExplainFormula !== 'function') {
      aiOut.innerHTML = `<span class="ai-error">${t('explain_unavailable')}</span>`;
      return;
    }
    aiOut.innerHTML = `<span class="ai-loading">${t('explain_loading')}</span>`;
    window.calvoExplainFormula(aiName, aiExpr, (result) => {
      aiOut.innerHTML = result.error ? `<span class="ai-error">${result.error}</span>` : result.html;
    });
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

    // Built-in Urdu explanation (no API key needed). Plain text nodes only, so tags like the subject label are ignored.
    const nameEl = row.querySelector('.formula-name');
    const lookupName = Array.from(nameEl.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim() || name;
    const urduNote = (typeof window.urduNoteFor === 'function') ? window.urduNoteFor(lookupName) : null;
    const solvedEx = (typeof window.solvedExampleHtml === 'function') ? window.solvedExampleHtml(lookupName, typeof currentLang !== 'undefined' && currentLang === 'ur') : '';
    if (urduNote) {
      box.innerHTML = `${closeBtnHtml}<div class="urdu-note" dir="rtl" lang="ur">${urduNote}</div>${solvedEx}<button class="pill-btn explain-ai-btn">${t('explain_ai_more')}</button><div class="explain-ai-out"></div>`;
      box.dataset.loaded = '1';
      return;
    }

    if (typeof window.calvoExplainFormula !== 'function') {
      box.innerHTML = `${closeBtnHtml}${solvedEx}<span class="ai-error">${t('explain_unavailable')}</span>`;
      return;
    }

    box.innerHTML = `${closeBtnHtml}${solvedEx}<span class="ai-loading">${t('explain_loading')}</span>`;
    window.calvoExplainFormula(name, expr, (result) => {
      if (result.error) {
        box.innerHTML = `${closeBtnHtml}${solvedEx}<span class="ai-error">${result.error}</span>`;
        return;
      }
      box.innerHTML = `${closeBtnHtml}${solvedEx}${result.html}`;
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
    if (historyKind !== 'calc') { clearHistoryKind(historyKind); return; }
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
      'Nautical Mile': 1852, Micrometer: 0.000001, Nanometer: 0.000000001,
      'Light Year': 9460730472580800,
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
      Marla: 25.2929, Kanal: 505.857, 'Square Centimeter': 0.0001,
      'Square Inch': 0.00064516, 'Square Mile': 2589988.110336,
    }
  },
  Volume: {
    base: 'l',
    units: {
      Liter: 1, Milliliter: 0.001, 'Cubic Meter': 1000, Gallon: 3.785411784,
      Quart: 0.946352946, Pint: 0.473176473, 'Cubic Foot': 28.316846592,
      'Cubic Centimeter': 0.001, 'Imperial Gallon': 4.54609,
      'Cup (US)': 0.2365882365, 'Tablespoon (US)': 0.01478676478125,
      'Teaspoon (US)': 0.00492892159375, 'Fluid Ounce (US)': 0.0295735295625,
    }
  },
  Speed: {
    base: 'mps',
    units: {
      'Meters/sec': 1, 'Kilometers/hour': 0.277778, 'Miles/hour': 0.44704,
      Knot: 0.514444, 'Feet/sec': 0.3048, Mach: 340.29, 'Speed of Light': 299792458,
    }
  },
  Time: {
    base: 's',
    units: {
      Second: 1, Minute: 60, Hour: 3600, Day: 86400, Week: 604800,
      Month: 2629800, Year: 31557600, Millisecond: 0.001,
      Microsecond: 0.000001, Nanosecond: 0.000000001,
    }
  },
  Data: {
    base: 'byte',
    units: {
      Byte: 1, Kilobyte: 1024, Megabyte: 1024 ** 2, Gigabyte: 1024 ** 3,
      Terabyte: 1024 ** 4, Petabyte: 1024 ** 5, Bit: 0.125,
    }
  },
  Pressure: {
    base: 'Pa',
    units: {
      Pascal: 1, Kilopascal: 1000, Megapascal: 1000000, Bar: 100000,
      Millibar: 100, 'Atmosphere (atm)': 101325, PSI: 6894.757293168,
      'mmHg (Torr)': 133.322368,
    }
  },
  Energy: {
    base: 'J',
    units: {
      Joule: 1, Kilojoule: 1000, Calorie: 4.184, Kilocalorie: 4184,
      'Watt-hour': 3600, 'Kilowatt-hour': 3600000, Electronvolt: 1.602176634e-19,
      BTU: 1055.05585262, 'Foot-pound': 1.3558179483,
    }
  },
  Power: {
    base: 'W',
    units: {
      Watt: 1, Kilowatt: 1000, Megawatt: 1000000,
      'Horsepower (mechanical)': 745.69987158, 'Horsepower (metric)': 735.49875,
      'BTU/hour': 0.29307107,
    }
  },
  Force: {
    base: 'N',
    units: {
      Newton: 1, Kilonewton: 1000, Dyne: 0.00001,
      'Pound-force': 4.4482216152605, 'Kilogram-force': 9.80665,
    }
  },
  Angle: {
    base: 'deg',
    units: {
      Degree: 1, Radian: 180 / Math.PI, Gradian: 0.9, Arcminute: 1 / 60,
      Arcsecond: 1 / 3600, Revolution: 360,
    }
  },
  Frequency: {
    base: 'Hz',
    units: {
      Hertz: 1, Kilohertz: 1000, Megahertz: 1000000, Gigahertz: 1000000000,
      'RPM (per minute)': 1 / 60,
    }
  },
  'Fuel Economy': { special: true, fuel: true },
  'Tola / Maund': {
    base: 'g',
    units: {
      Ratti: 0.121498, Masha: 0.971984, Tola: 11.6638038, Gram: 1,
      Kilogram: 1000, Seer: 933.105, Maund: 37324.2,
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

/* ---- Crypto assets shown in the SAME currency dropdown (merged into
   currencyRates as "units per 1 USD" so they convert seamlessly against
   every fiat currency above, e.g. BTC -> PKR in one step). ---- */
const cryptoList = [
  { code: 'BTC', name: 'Bitcoin', id: 'bitcoin' },
  { code: 'ETH', name: 'Ethereum', id: 'ethereum' },
  { code: 'USDT', name: 'Tether', id: 'tether' },
  { code: 'BNB', name: 'BNB', id: 'binancecoin' },
  { code: 'SOL', name: 'Solana', id: 'solana' },
  { code: 'XRP', name: 'XRP', id: 'ripple' },
  { code: 'USDC', name: 'USD Coin', id: 'usd-coin' },
  { code: 'DOGE', name: 'Dogecoin', id: 'dogecoin' },
  { code: 'ADA', name: 'Cardano', id: 'cardano' },
  { code: 'TRX', name: 'TRON', id: 'tron' },
  { code: 'TON', name: 'Toncoin', id: 'the-open-network' },
  { code: 'LTC', name: 'Litecoin', id: 'litecoin' },
];
const CRYPTO_CACHE_KEY = 'calvoCryptoRatesV1';
const CRYPTO_CACHE_TTL = 5 * 60 * 1000; // crypto moves fast — refresh every 5 min
let cryptoFetchPromise = null;

function loadCachedCryptoRates() {
  try {
    const raw = localStorage.getItem(CRYPTO_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.rates || !data.time) return null;
    return data;
  } catch (e) { return null; }
}

// Merges crypto prices into currencyRates as "units of CODE per 1 USD"
// (i.e. 1 / priceInUsd), matching the convention open.er-api already uses
// for fiat, so the existing convert math needs zero changes.
function mergeCryptoIntoRates(pricesUsd) {
  if (!currencyRates) currencyRates = {};
  cryptoList.forEach(c => {
    const price = pricesUsd[c.id] && pricesUsd[c.id].usd;
    if (price && price > 0) currencyRates[c.code] = 1 / price;
  });
}

function fetchCryptoRates(force) {
  if (cryptoFetchPromise) return cryptoFetchPromise;
  const cached = loadCachedCryptoRates();
  if (!force && cached && (Date.now() - cached.time) < CRYPTO_CACHE_TTL) {
    mergeCryptoIntoRates(cached.rates);
    return Promise.resolve(currencyRates);
  }
  const ids = cryptoList.map(c => c.id).join(',');
  cryptoFetchPromise = fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
    .then(res => res.json())
    .then(data => {
      if (data && Object.keys(data).length) {
        try { localStorage.setItem(CRYPTO_CACHE_KEY, JSON.stringify({ rates: data, time: Date.now() })); } catch (e) {}
        mergeCryptoIntoRates(data);
        return currencyRates;
      }
      throw new Error('bad crypto response');
    })
    .catch(err => {
      if (cached && cached.rates) { mergeCryptoIntoRates(cached.rates); return currencyRates; }
      throw err;
    })
    .finally(() => { cryptoFetchPromise = null; });
  return cryptoFetchPromise;
}

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
    const cryptoGroupFrom = document.createElement('optgroup');
    cryptoGroupFrom.label = 'Crypto';
    const cryptoGroupTo = document.createElement('optgroup');
    cryptoGroupTo.label = 'Crypto';
    cryptoList.forEach(c => {
      const label = `${c.code} — ${c.name}`;
      cryptoGroupFrom.appendChild(new Option(label, c.code));
      cryptoGroupTo.appendChild(new Option(label, c.code));
    });
    convertFromUnitEl.appendChild(cryptoGroupFrom);
    convertToUnitEl.appendChild(cryptoGroupTo);
  } else if (cat.fuel) {
    ['Kilometers/Liter', 'Liters/100 km', 'Miles/Gallon (US)', 'Miles/Gallon (UK)'].forEach((u, i) => {
      convertFromUnitEl.add(new Option(u, u, false, i === 0));
      convertToUnitEl.add(new Option(u, u, false, i === 1));
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

function convertFuelEconomy(val, from, to) {
  // Everything goes through km/L. L/100km is the inverse of the others.
  let kmpl;
  if (from === 'Kilometers/Liter') kmpl = val;
  else if (from === 'Liters/100 km') kmpl = val === 0 ? NaN : 100 / val;
  else if (from === 'Miles/Gallon (US)') kmpl = val * 0.425143707;
  else kmpl = val * 0.354006189;
  if (to === 'Kilometers/Liter') return kmpl;
  if (to === 'Liters/100 km') return kmpl === 0 ? NaN : 100 / kmpl;
  if (to === 'Miles/Gallon (US)') return kmpl / 0.425143707;
  return kmpl / 0.354006189;
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
  if (cat.fuel) {
    result = convertFuelEconomy(val, fromU, toU);
    if (!isFinite(result)) { convertToEl.value = ''; convertHintEl.textContent = ''; return; }
  } else if (cat.special) {
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
  Promise.all([fetchCurrencyRates(), fetchCryptoRates()])
    .then(() => {
      if (activeConvertCategory !== 'Currency') return;
      computeAndShowCurrency(parseFloat(convertFromEl.value), convertFromUnitEl.value, convertToUnitEl.value);
    })
    .catch(() => {
      if (activeConvertCategory !== 'Currency') return;
      if (currencyRates && currencyRates[convertFromUnitEl.value] && currencyRates[convertToUnitEl.value]) {
        computeAndShowCurrency(parseFloat(convertFromEl.value), convertFromUnitEl.value, convertToUnitEl.value);
      } else {
        convertHintEl.textContent = t('convert_rates_error');
      }
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
  // Warm the currency + crypto rates cache in the background so switching
  // to the Currency tab feels instant even on first launch.
  fetchCurrencyRates().catch(() => {});
  fetchCryptoRates().catch(() => {});
}

/* ============================================
   PERCENTAGE + GPA/CGPA CALCULATOR + SAVE RESULTS
   ============================================ */
let percentMode = 'basic';
const percentPanelBasic = document.getElementById('percentPanelBasic');
const percentPanelCgpa = document.getElementById('percentPanelCgpa');

/* Three modes: Percentage / GPA (one semester) / CGPA (all semesters). */
function setPercentMode(id) {
  if (['basic', 'gpa', 'cgpa'].indexOf(id) < 0) id = 'basic';
  percentMode = id;
  document.querySelectorAll('#percentModeGrid .merit-mode').forEach(b => b.classList.toggle('active', b.dataset.mode === id));
  if (percentPanelBasic) percentPanelBasic.style.display = id === 'basic' ? 'block' : 'none';
  if (percentPanelCgpa) {
    percentPanelCgpa.style.display = id === 'basic' ? 'none' : 'block';
    percentPanelCgpa.classList.toggle('gpa-only', id === 'gpa');
  }
  if (id !== 'basic') { try { calcCgpa(); } catch (e) { /* table not built yet */ } }
}
function buildPercentPills() {
  document.querySelectorAll('#percentModeGrid .merit-mode').forEach(b => { b.onclick = () => setPercentMode(b.dataset.mode); });
  setPercentMode(percentMode);
}
buildPercentPills();

/* ---- Grade percentage (subject-wise) calculator ---- */
const gradeSubjectListEl = document.getElementById('gradeSubjectList');
const gradeResultBoxEl = document.getElementById('gradeResultBox');
const gradeAddSubjectBtn = document.getElementById('gradeAddSubjectBtn');
let gradeSubjects = [];
let gradeSubjectSeq = 0;
const GRADE_STORE_KEY = 'calvo_percent_v1';

/* Autosave the subject table so marks and names are still there after a reload. */
function persistGradeSubjects() {
  try {
    localStorage.setItem(GRADE_STORE_KEY, JSON.stringify(gradeSubjects.map(s => ({ name: s.name || '', obtained: s.obtained, total: s.total }))));
  } catch (e) {}
}
function loadGradeSubjects() {
  try {
    const a = JSON.parse(localStorage.getItem(GRADE_STORE_KEY) || '[]');
    if (!Array.isArray(a)) return [];
    return a.slice(0, 40).map(x => ({ name: String((x && x.name) || '').slice(0, 60), obtained: String((x && x.obtained) ?? ''), total: String((x && x.total) ?? '100') }));
  } catch (e) { return []; }
}

function addGradeSubject(obtained = '', total = '100', name = '') {
  gradeSubjectSeq += 1;
  gradeSubjects.push({ id: gradeSubjectSeq, name, obtained, total });
  renderGradeSubjects();
  persistGradeSubjects();
}

function removeGradeSubject(id) {
  gradeSubjects = gradeSubjects.filter(s => s.id !== id);
  renderGradeSubjects();
  persistGradeSubjects();
}

function gradeSubjectLabel(s, idx) {
  return (s.name && s.name.trim()) || `${t('subject_label')} ${idx + 1}`;
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

    const name = document.createElement('input');
    name.type = 'text';
    name.className = 'grade-subject-name grade-subject-name-input';
    name.placeholder = `${t('subject_label')} ${idx + 1}`;
    name.maxLength = 60;
    name.value = s.name || '';
    name.setAttribute('aria-label', `${t('subject_label')} ${idx + 1}`);
    name.addEventListener('input', () => {
      s.name = name.value;
      persistGradeSubjects();
    });
    row.appendChild(name);

    const obtainedInput = document.createElement('input');
    obtainedInput.type = 'number';
    obtainedInput.className = 'grade-input';
    obtainedInput.placeholder = t('score_placeholder');
    obtainedInput.value = s.obtained;
    obtainedInput.addEventListener('input', () => {
      s.obtained = obtainedInput.value;
      updateGradeResult();
      persistGradeSubjects();
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
      persistGradeSubjects();
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
  // Restore the last table; otherwise start with a couple of blank subjects, like a fresh gradebook.
  const savedGrade = loadGradeSubjects();
  if (savedGrade.length) {
    savedGrade.forEach(x => { gradeSubjectSeq += 1; gradeSubjects.push({ id: gradeSubjectSeq, name: x.name, obtained: x.obtained, total: x.total }); });
    renderGradeSubjects();
  } else {
    addGradeSubject();
    addGradeSubject();
  }
}

/* ---- CGPA / GPA calculator ---- */
const cgpaTableEl = document.getElementById('cgpaTable');
const cgpaScaleEl = document.getElementById('cgpaScale');
const cgpaResultEl = document.getElementById('cgpaResult');
let cgpaSemesterCount = 1;


/* Custom grade picker: replaces the native (Android) select popup, which scrolls
   the list to the selected item and hides A+ above the visible area. All grades
   are shown at once in a grid. The <select> stays as the source of truth. */
function attachGradePicker(sel) {
  function open(e) {
    e.preventDefault(); e.stopPropagation();
    if (sel.blur) sel.blur();
    if (document.getElementById('gradePickerOv')) return;
    var opened = Date.now();
    var ov = document.createElement('div'); ov.id = 'gradePickerOv'; ov.className = 'gp-overlay';
    var box = document.createElement('div'); box.className = 'gp-box';
    var ttl = document.createElement('div'); ttl.className = 'gp-title'; ttl.textContent = 'Select grade';
    var grid = document.createElement('div'); grid.className = 'gp-grid';
    function close() { if (ov.parentNode) ov.parentNode.removeChild(ov); }
    Array.prototype.forEach.call(sel.options, function (o) {
      var b = document.createElement('button'); b.type = 'button';
      b.className = 'gp-btn' + (o.value === sel.value ? ' active' : '');
      b.textContent = o.value;
      b.addEventListener('click', function (ev) {
        ev.stopPropagation();
        sel.value = o.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
      grid.appendChild(b);
    });
    ov.addEventListener('click', function (ev) { if (ev.target === ov && Date.now() - opened > 300) close(); });
    box.appendChild(ttl); box.appendChild(grid); ov.appendChild(box); document.body.appendChild(ov);
  }
  sel.addEventListener('mousedown', open);
  sel.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') open(e); });
}

/* HEC (Pakistan) official fractionalized grading table, section 13.1 of the
   HEC Policy Guidelines for Uniform Semester System. Grade points are the
   upper limit of each HEC range; `min` is the lowest percentage for the grade.
   A+ is not in the HEC table, so it is selectable by hand (4.0) but never auto-picked. */
const hecMarksBands = [
  { min: 85, grade: 'A' },  { min: 80, grade: 'A-' }, { min: 75, grade: 'B+' },
  { min: 71, grade: 'B' },  { min: 68, grade: 'B-' }, { min: 64, grade: 'C+' },
  { min: 61, grade: 'C' },  { min: 58, grade: 'C-' }, { min: 54, grade: 'D+' },
  { min: 50, grade: 'D' },  { min: 0,  grade: 'F' }
];
function gradeFromMarks(percent) {
  if (isNaN(percent) || percent < 0 || percent > 100) return null;
  for (const b of hecMarksBands) { if (percent >= b.min) return b.grade; }
  return 'F';
}

const gradeScales = {
  'hec': { 'A+': 4.0, 'A': 4.0, 'A-': 3.66, 'B+': 3.33, 'B': 3.0, 'B-': 2.66, 'C+': 2.33, 'C': 2.0, 'C-': 1.66, 'D+': 1.30, 'D': 1.0, 'F': 0.0 },
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
    <input type="number" class="cgpa-marks" placeholder="Marks %" min="0" max="100" step="any" title="Enter marks (out of 100) and the grade is selected automatically (HEC table)">
    <select class="cgpa-grade">${gradeOptionsHtml(scaleId)}</select>
    <button class="cgpa-del" title="${t('remove_title')}">&#10005;</button>
  `;
  row.querySelector('.cgpa-del').addEventListener('click', () => { row.remove(); calcCgpa(); });
  row.querySelector('.cgpa-subject').addEventListener('input', calcCgpa);
  row.querySelector('.cgpa-credit').addEventListener('input', calcCgpa);
  row.querySelector('.cgpa-grade').addEventListener('change', calcCgpa);
  row.querySelector('.cgpa-marks').addEventListener('input', () => {
    const g = gradeFromMarks(parseFloat(row.querySelector('.cgpa-marks').value));
    const sel = row.querySelector('.cgpa-grade');
    if (g && [...sel.options].some(o => o.value === g)) sel.value = g;
    calcCgpa();
  });
  attachGradePicker(row.querySelector('.cgpa-grade'));
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

let lastCgpaMeta = null;
const CGPA_STORE_KEY = 'calvo_cgpa_table_v1';
let cgpaRestoring = false;

/* Autosave the GPA/CGPA table (scale, semester names, subjects, credits, marks, grades). */
function persistCgpaTable() {
  if (cgpaRestoring || !cgpaTableEl) return;
  try {
    const sems = [];
    const rows = [];
    cgpaTableEl.querySelectorAll('.cgpa-semester-label').forEach(l => sems.push({ n: Number(l.dataset.semester), label: l.value }));
    cgpaTableEl.querySelectorAll('.cgpa-row').forEach(r => rows.push({
      sem: Number(r.dataset.semester),
      subject: r.querySelector('.cgpa-subject').value,
      credit: r.querySelector('.cgpa-credit').value,
      marks: r.querySelector('.cgpa-marks').value,
      grade: r.querySelector('.cgpa-grade').value
    }));
    localStorage.setItem(CGPA_STORE_KEY, JSON.stringify({ scale: cgpaScaleEl.value, sems, rows }));
  } catch (e) {}
}
function restoreCgpaTable() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(CGPA_STORE_KEY) || 'null'); } catch (e) { d = null; }
  if (!d || !Array.isArray(d.sems) || !d.sems.length || !Array.isArray(d.rows) || !d.rows.length) return false;
  cgpaRestoring = true;
  try {
    if (d.scale && [...cgpaScaleEl.options].some(o => o.value === d.scale)) cgpaScaleEl.value = d.scale;
    cgpaTableEl.innerHTML = '';
    let maxSem = 1;
    d.sems.slice(0, 12).forEach(sm => {
      const n = Number(sm.n) || 1;
      maxSem = Math.max(maxSem, n);
      addCgpaSemesterLabel(n);
      const lab = cgpaTableEl.querySelector('.cgpa-semester-label[data-semester="' + n + '"]');
      if (lab && typeof sm.label === 'string') lab.value = sm.label.slice(0, 40);
      d.rows.filter(r => Number(r.sem) === n).slice(0, 40).forEach(r => {
        addCgpaRow(n);
        const row = cgpaTableEl.lastElementChild;
        row.querySelector('.cgpa-subject').value = String(r.subject || '').slice(0, 60);
        row.querySelector('.cgpa-credit').value = String(r.credit ?? '');
        row.querySelector('.cgpa-marks').value = String(r.marks ?? '');
        const sel = row.querySelector('.cgpa-grade');
        if ([...sel.options].some(o => o.value === r.grade)) sel.value = r.grade;
      });
    });
    cgpaSemesterCount = maxSem;
  } finally { cgpaRestoring = false; }
  return true;
}

function calcCgpa() {
  const rows = Array.from(cgpaTableEl.querySelectorAll('.cgpa-row')).filter(r => percentMode !== 'gpa' || r.dataset.semester === '1');
  let totalPoints = 0, totalCredits = 0, validRows = 0;
  const semesterTotals = {};
  rows.forEach(row => {
    const credit = parseFloat(row.querySelector('.cgpa-credit').value);
    const grade = row.querySelector('.cgpa-grade').value;
    const scale = gradeScales[cgpaScaleEl.value];
    if (isNaN(credit) || credit <= 0 || !(grade in scale)) return;
    const points = scale[grade] * credit;
    totalPoints += points;
    totalCredits += credit;
    validRows++;
    const sem = row.dataset.semester;
    if (!semesterTotals[sem]) semesterTotals[sem] = { points: 0, credits: 0 };
    semesterTotals[sem].points += points;
    semesterTotals[sem].credits += credit;
  });
  lastSemesterTotals = semesterTotals;
  const overall = totalCredits > 0 ? totalPoints / totalCredits : 0;
  let detail = '';
  const semKeys = Object.keys(semesterTotals);
  lastCgpaMeta = { overall, totalCredits, subjects: validRows, semesters: semKeys.length };
  if (semKeys.length > 1) {
    detail = semKeys.map(s => {
      const gpa = semesterTotals[s].credits > 0 ? semesterTotals[s].points / semesterTotals[s].credits : 0;
      return `${t('sem_short')} ${s}: ${gpa.toFixed(2)}`;
    }).join(' &nbsp;|&nbsp; ');
    cgpaResultEl.innerHTML = `${t('cgpa_prefix')} ${overall.toFixed(2)} <div style="font-size:0.65rem;color:#999;font-weight:600;margin-top:4px;">${detail}</div>`;
  } else {
    cgpaResultEl.textContent = t('gpa_prefix') + ' ' + overall.toFixed(2);
  }
  persistCgpaTable();
  return overall;
}

const shareCgpaImgBtn = document.getElementById('shareCgpaImgBtn');
if (shareCgpaImgBtn) {
  shareCgpaImgBtn.addEventListener('click', () => {
    const v = calcCgpa();
    const m = lastCgpaMeta;
    if (!m || !m.totalCredits || !window.CalvoShareCard) { showToast(t('share_card_need_data')); return; }
    const scaleVals = Object.values(gradeScales[cgpaScaleEl.value] || { A: 4 });
    const scaleMax = Math.max.apply(null, scaleVals);
    const scaleName = cgpaScaleEl.options[cgpaScaleEl.selectedIndex].text.split(' (')[0];
    const multi = m.semesters > 1 || percentMode === 'cgpa';
    const lines = [];
    if (multi) lines.push(['Semesters', String(m.semesters)]);
    lines.push(['Subjects', String(m.subjects)], ['Credit hours', String(m.totalCredits)]);
    if (multi) {
      Object.keys(lastSemesterTotals).slice(0, 4).forEach(k => {
        const s = lastSemesterTotals[k];
        if (s.credits > 0) lines.push(['Semester ' + k + ' GPA', (s.points / s.credits).toFixed(2)]);
      });
    }
    window.CalvoShareCard.open({
      label: multi ? 'My CGPA' : 'My GPA',
      value: v.toFixed(2),
      sub: 'out of ' + scaleMax.toFixed(2) + ' (' + scaleName + ')',
      lines: lines,
      filename: 'calvo-' + (multi ? 'cgpa' : 'gpa'),
      text: (multi ? 'My CGPA is ' : 'My GPA is ') + v.toFixed(2) + ' - calculated on Calvo: https://calvoscientificcalculator.online/'
    });
  });
}

if (cgpaTableEl) {
  if (!restoreCgpaTable()) {
    addCgpaSemesterLabel(1);
    addCgpaRow(1);
    addCgpaRow(1);
  }
  cgpaTableEl.addEventListener('input', (e) => { if (e.target.classList.contains('cgpa-semester-label')) persistCgpaTable(); });

  document.getElementById('cgpaAddRow').addEventListener('click', () => {
    if (percentMode === 'gpa') {
      addCgpaRow(1);
      const sem1 = Array.from(cgpaTableEl.querySelectorAll('.cgpa-row')).filter(r => r.dataset.semester === '1');
      if (sem1.length > 1) sem1[sem1.length - 2].after(sem1[sem1.length - 1]);
    } else {
      addCgpaRow(cgpaSemesterCount);
    }
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
      const prev = sel.value;
      sel.innerHTML = gradeOptionsHtml(cgpaScaleEl.value);
      if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
      else {
        const g = gradeFromMarks(parseFloat(sel.closest('.cgpa-row').querySelector('.cgpa-marks').value));
        if (g && [...sel.options].some(o => o.value === g)) sel.value = g;
      }
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
    div.innerHTML = `<span class="saved-label"></span><span style="display:flex;align-items:center;gap:8px;"><b style="color:var(--accent);">${r.value}</b><button class="icon-action-btn saved-share-btn" title="${t('share_title')}">&#128228;</button>${whatsappBtnHtml('saved-whatsapp-btn')}<button class="saved-del" title="${t('delete_title')}">&#10005;</button></span>`;
    const savedLab = div.querySelector('.saved-label');
    savedLab.textContent = r.label;
    if (r.details) {
      const det = document.createElement('div');
      det.className = 'saved-details';
      det.textContent = r.details;
      savedLab.appendChild(det);
    }
    const savedText = `${r.label}: ${r.value}` + (r.details ? `\n${r.details}` : '');
    div.querySelector('.saved-share-btn').addEventListener('click', () => {
      shareOrCopyText(savedText);
    });
    div.querySelector('.saved-whatsapp-btn').addEventListener('click', () => {
      shareToWhatsApp(savedText);
    });
    div.querySelector('.saved-del').addEventListener('click', () => {
      savedResults.splice(idx, 1);
      persistSavedResults();
      renderSavedResults();
    });
    savedResultsListEl.appendChild(div);
  });
}

function saveResult(label, value, details, kind) {
  kind = kind || 'percent';
  savedResults.unshift({ label, value, details: details || '', time: Date.now(), kind });
  persistSavedResults();
  renderSavedResults();
  showToast(hsText('saved_to_history_toast', 'Saved to History'));
  showSaveNote(kind === 'percent' ? 'percentSaveNote' : 'cgpaSaveNote', kind);
}

const savePercentBtn = document.getElementById('savePercentBtn');
if (savePercentBtn) {
  savePercentBtn.addEventListener('click', () => {
    const pct = calcGradePercent();
    if (pct === null) { showToast(t('alert_enter_marks')); return; }
    const validRows = [];
    gradeSubjects.forEach((s, idx) => {
      const o = parseFloat(s.obtained), tt = parseFloat(s.total);
      if (!isNaN(o) && !isNaN(tt) && tt > 0) validRows.push(`${gradeSubjectLabel(s, idx)}: ${o}/${tt}`);
    });
    const validCount = validRows.length;
    const subjWord = validCount === 1 ? t('subject_word') : t('subjects_word');
    saveResult(`${t('percentage_word')} (${validCount} ${subjWord})`, `${pct.toFixed(2)}%`, validRows.slice(0, 15).join(', '), 'percent');
  });
}

const saveCgpaBtn = document.getElementById('saveCgpaBtn');
if (saveCgpaBtn) {
  saveCgpaBtn.addEventListener('click', () => {
    const gpa = calcCgpa();
    const parts = [];
    cgpaTableEl.querySelectorAll('.cgpa-row').forEach((r, i) => {
      if (percentMode === 'gpa' && r.dataset.semester !== '1') return;
      const c = parseFloat(r.querySelector('.cgpa-credit').value);
      if (isNaN(c) || c <= 0) return;
      const nm = r.querySelector('.cgpa-subject').value.trim() || `${t('subject_label')} ${i + 1}`;
      parts.push(`${nm}: ${r.querySelector('.cgpa-grade').value} (${c})`);
    });
    const isGpa = percentMode === 'gpa';
    const word = isGpa ? hsText('gpa_word', 'GPA') : t('cgpa_word');
    saveResult(`${word} (${parts.length} ${t('subjects_word')})`, gpa.toFixed(2), parts.slice(0, 15).join(', '), isGpa ? 'gpa' : 'cgpa');
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
  showToast(hsText('saved_to_history_toast', 'Saved to History'));
  showSaveNote('cgpaSaveNote', 'cgpa');
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

/* ---- History tab: 4 views - Calculator / Percentage / GPA-CGPA / Merit (ECAT etc.) ---- */
function hsText(key, fallback) { const v = t(key); return (!v || v === key) ? fallback : v; }
const HISTORY_KINDS = ['calc', 'percent', 'gpa', 'cgpa', 'merit'];
const HISTORY_KIND_FALLBACK = { calc: 'Calculator', percent: 'Percentage', gpa: 'GPA', cgpa: 'CGPA', merit: 'Merit (ECAT etc.)' };
const HISTORY_SUB_FALLBACK = {
  calc: 'Every equal-sign result, saved automatically',
  percent: 'Percentage results you saved',
  gpa: 'GPA results you saved',
  cgpa: 'CGPA and semester results you saved',
  merit: 'ECAT, MDCAT, NUST, FAST and other merit results you saved'
};
const HISTORY_EMPTY_FALLBACK = {
  percent: 'No percentage saved yet. On the Percent/GPA tab, tap Save Result.',
  gpa: 'No GPA saved yet. On the Percent/GPA tab, open GPA and tap Save Result.',
  cgpa: 'No CGPA saved yet. On the Percent/GPA tab, open CGPA and tap Save Result or Save Semester(s) to History.',
  merit: 'No merit result saved yet. Calculate on an ECAT, MDCAT, NUST or FAST page and tap Save to History.'
};
let historyKind = 'calc';

/* Works even if an older index.html (without the new markup) is being served. */
const historyCard = document.querySelector('#tab-history .formulas-card');
let historyKindPillsEl = document.getElementById('historyKindPills');
let historySavedListEl = document.getElementById('historySavedList');
let historySubtitleEl = document.getElementById('historySubtitle') || document.querySelector('#tab-history .formulas-subtitle');
if (historyCard && historyListEl) {
  if (!historyKindPillsEl) {
    historyKindPillsEl = document.createElement('div');
    historyKindPillsEl.className = 'subject-pills';
    historyKindPillsEl.id = 'historyKindPills';
    historyCard.insertBefore(historyKindPillsEl, historyListEl);
  }
  if (!historySavedListEl) {
    historySavedListEl = document.createElement('div');
    historySavedListEl.className = 'formula-list';
    historySavedListEl.id = 'historySavedList';
    historyCard.appendChild(historySavedListEl);
  }
  const strayHeaders = historyCard.querySelectorAll('.app-card-header');
  if (strayHeaders.length > 1) { for (let i = 1; i < strayHeaders.length; i++) strayHeaders[i].style.display = 'none'; }
}
if (historySubtitleEl && historySubtitleEl.hasAttribute('data-i18n')) historySubtitleEl.removeAttribute('data-i18n');

function savedKindOf(r) {
  const lab = String(r.label || '').toUpperCase();
  if (r.kind === 'gpa' || !r.kind) {
    if (!r.kind && /%\s*$/.test(String(r.value))) return 'percent';
    return lab.indexOf('CGPA') === 0 ? 'cgpa' : 'gpa';
  }
  return r.kind;
}
function kindLabel(k) { return hsText('hk_' + k, HISTORY_KIND_FALLBACK[k]); }
function historyCount(k) {
  if (k === 'calc') return calcHistory.length;
  let n = savedResults.filter(r => savedKindOf(r) === k).length;
  if (k === 'cgpa') n += gpaHistory.length;
  return n;
}

function buildHistoryPills() {
  if (!historyKindPillsEl) return;
  historyKindPillsEl.innerHTML = '';
  HISTORY_KINDS.forEach(k => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'subject-pill' + (k === historyKind ? ' active' : '');
    btn.textContent = `${kindLabel(k)} (${historyCount(k)})`;
    btn.addEventListener('click', () => setHistoryKind(k));
    historyKindPillsEl.appendChild(btn);
  });
}

function setHistoryKind(k) {
  if (HISTORY_KINDS.indexOf(k) < 0) k = 'calc';
  historyKind = k;
  if (historyListEl) historyListEl.style.display = k === 'calc' ? '' : 'none';
  if (historySavedListEl) historySavedListEl.style.display = k === 'calc' ? 'none' : '';
  if (historySubtitleEl) historySubtitleEl.textContent = k === 'calc' ? t('history_subtitle') : hsText('hs_' + k, HISTORY_SUB_FALLBACK[k]);
  buildHistoryPills();
  renderHistorySaved();
}

function renderHistorySaved() {
  if (!historySavedListEl) return;
  buildHistoryPills();
  if (historyKind === 'calc') return;
  const items = [];
  savedResults.forEach(r => { if (savedKindOf(r) === historyKind) items.push({ ref: r, label: r.label, value: String(r.value), details: r.details || '', time: r.time || 0 }); });
  if (historyKind === 'cgpa') gpaHistory.forEach(r => items.push({ sem: r, label: r.label, value: r.gpa.toFixed(2), details: hsText('semester_gpa_tag', 'Semester GPA'), time: r.time || 0 }));
  items.sort((a, b) => b.time - a.time);
  historySavedListEl.innerHTML = '';
  if (!items.length) {
    historySavedListEl.innerHTML = `<div class="formula-empty">${hsText('he_' + historyKind, HISTORY_EMPTY_FALLBACK[historyKind])}</div>`;
    return;
  }
  items.forEach(it => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `<div class="history-item-row">
        <div class="history-item-text">
          <div class="history-expr"></div>
          <div class="history-result"></div>
          <div class="saved-details"></div>
          <div class="history-time"></div>
        </div>
        <button class="icon-action-btn hs-share-btn" title="${t('share_title')}">&#128228;</button>
        ${whatsappBtnHtml('hs-whatsapp-btn')}
        <button class="icon-action-btn hs-del-btn" title="${t('remove_title')}">&#10005;</button>
      </div>`;
    div.querySelector('.history-expr').textContent = it.label;
    div.querySelector('.history-result').textContent = it.value;
    div.querySelector('.saved-details').textContent = it.details;
    div.querySelector('.history-time').textContent = it.time ? formatHistoryTime(it.time) : '';
    const text = it.sem ? `${it.label}: GPA ${it.value}` : `${it.label}: ${it.value}` + (it.details ? `\n${it.details}` : '');
    div.querySelector('.hs-share-btn').addEventListener('click', () => shareOrCopyText(text));
    div.querySelector('.hs-whatsapp-btn').addEventListener('click', () => shareToWhatsApp(text));
    div.querySelector('.hs-del-btn').addEventListener('click', () => {
      if (it.sem) { const i = gpaHistory.indexOf(it.sem); if (i >= 0) gpaHistory.splice(i, 1); persistGpaHistory(); renderGpaHistory(); }
      else { const i = savedResults.indexOf(it.ref); if (i >= 0) savedResults.splice(i, 1); persistSavedResults(); renderSavedResults(); }
    });
    historySavedListEl.appendChild(div);
  });
}

function clearHistoryKind(k) {
  savedResults = savedResults.filter(r => savedKindOf(r) !== k);
  persistSavedResults();
  if (k === 'cgpa') { gpaHistory = []; persistGpaHistory(); renderGpaHistory(); }
  renderSavedResults();
}

/* Message shown under the Save buttons: points the student to the History tab. */
function showSaveNote(noteId, kind) {
  const el = document.getElementById(noteId);
  if (!el) return;
  el.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = `\u2713 ${hsText('save_note_saved', 'Saved in History')} \u203A ${kindLabel(kind)}. ${hsText('save_note_check', 'Check it there.')} `;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'save-note-link';
  btn.textContent = hsText('save_note_open', 'Open History');
  btn.addEventListener('click', () => {
    navigateToTab('history', true);
    setHistoryKind(kind);
    window.scrollTo(0, 0);
  });
  el.appendChild(span);
  el.appendChild(btn);
  el.style.display = 'block';
  clearTimeout(el._noteTimer);
  el._noteTimer = setTimeout(() => { el.style.display = 'none'; }, 20000);
}

// Keep the History views and counts in sync whenever anything is added, changed or removed.
(function () {
  const baseSaved = renderSavedResults;
  renderSavedResults = function () { baseSaved(); renderHistorySaved(); };
  const baseGpa = renderGpaHistory;
  renderGpaHistory = function () { baseGpa(); renderHistorySaved(); };
  const baseCalc = renderCalcHistory;
  renderCalcHistory = function () { baseCalc(); buildHistoryPills(); };
})();
setHistoryKind('calc');

// Saves made on another page (e.g. the ECAT / MDCAT calculators) arrive through localStorage.
window.addEventListener('storage', e => {
  if (e.key === 'calvo_saved_results') {
    try { savedResults = JSON.parse(e.newValue || '[]'); } catch (err) { savedResults = []; }
    renderSavedResults();
  }
});
// Links like /#history-merit open the History tab on that view.
function openHistoryFromHash() {
  const m = /^#history(?:-(calc|percent|gpa|cgpa|merit))?$/.exec(location.hash);
  if (!m) return;
  navigateToTab('history', true);
  if (m[1]) setHistoryKind(m[1]);
  try { history.replaceState(history.state, '', location.pathname + location.search); } catch (err) {}
}
openHistoryFromHash();
window.addEventListener('hashchange', openHistoryFromHash);
const historyTabBtn = document.querySelector('.topbar-tab[data-tab="history"]');
if (historyTabBtn) historyTabBtn.addEventListener('click', renderHistorySaved);

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
  // Percentage / GPA / CGPA buttons (their labels are translated through data-i18n)
  setPercentMode(percentMode);
  if (typeof buildHistoryPills === 'function') buildHistoryPills();

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
  if (typeof window.refreshMatrixI18n === 'function') window.refreshMatrixI18n();
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
  const quizCountScreen = document.getElementById('quizCountScreen');
  const quizBackBtn = document.getElementById('quizBackBtn');
  const quizCountSubjectLabel = document.getElementById('quizCountSubjectLabel');
  const quizCountNumberLabel = document.getElementById('quizCountNumberLabel');
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
    Object.keys(FORMULA_MANIFEST).forEach(subj => {
      (formulaData[subj] || []).forEach(f => out.push(Object.assign({ subject: subj }, f)));
    });
    return out;
  }

  // Instant pool size from the manifest (no download needed) — used for the
  // "N questions available" labels and enable/disable of the Start button.
  function poolSize() {
    if (quizSubject === 'All') {
      return Object.keys(FORMULA_MANIFEST).reduce((sum, s) => sum + formulaSubjectCount(s), 0);
    }
    return formulaSubjectCount(quizSubject);
  }

  // Downloads whatever subject files the current quiz/flashcard pool needs.
  function ensureQuizData() {
    return ensureFormulaSubjects(quizSubject === 'All' ? Object.keys(FORMULA_MANIFEST) : [quizSubject]);
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
        updateQuizCountLabels();
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
    quizSetupScreen.style.display = 'block';
    if (quizCountScreen) quizCountScreen.style.display = 'none';
    buildQuizSubjectPills();
    buildQuizDifficultyPills();
    checkQuizPoolSize();
    updateFlashcardDueNote();
  }

  if (quizModeFormulaBtn) quizModeFormulaBtn.addEventListener('click', () => setQuizMode('formula'));
  if (quizModePracticeBtn) quizModePracticeBtn.addEventListener('click', () => setQuizMode('practice'));
  if (quizModeFlashcardsBtn) quizModeFlashcardsBtn.addEventListener('click', () => setQuizMode('flashcards'));

  function buildQuizSubjectPills() {
    const subjects = quizMode === 'practice' ? practiceSubjects() : Object.keys(FORMULA_MANIFEST);
    let html = '<button class="subject-pill' + (quizSubject === 'All' ? ' active' : '') + '" data-quizsubj="All">' + t('quiz_all_subjects') + '</button>';
    subjects.forEach(subj => {
      html += '<button class="subject-pill' + (quizSubject === subj ? ' active' : '') + '" data-quizsubj="' + escapeHtml(subj) + '">' + escapeHtml(subj) + '</button>';
    });
    quizSubjectPills.innerHTML = html;
    quizSubjectPills.querySelectorAll('.subject-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        quizSubject = btn.dataset.quizsubj;
        buildQuizSubjectPills();
        goToQuizCountScreen();
      });
    });
  }

  // Page 2: shows the chosen subject and how many quiz questions
  // (or flashcards) are available for it, before the quiz actually starts.
  function updateQuizCountLabels() {
    if (!quizCountSubjectLabel || !quizCountNumberLabel) return;
    quizCountSubjectLabel.textContent = quizSubject === 'All' ? t('quiz_all_subjects') : quizSubject;
    const n = quizMode === 'practice' ? practicePool().length : poolSize();
    const key = quizMode === 'flashcards' ? 'flashcard_cards_available' : 'quiz_questions_available';
    quizCountNumberLabel.textContent = t(key).replace('{n}', n);
  }

  function goToQuizCountScreen() {
    if (!quizCountScreen) return;
    quizSetupScreen.style.display = 'none';
    quizCountScreen.style.display = 'block';
    updateQuizCountLabels();
    buildQuizDifficultyPills();
    checkQuizPoolSize();
    updateFlashcardDueNote();
  }

  function goToQuizSubjectScreen() {
    if (!quizCountScreen) return;
    quizCountScreen.style.display = 'none';
    quizSetupScreen.style.display = 'block';
  }

  if (quizBackBtn) quizBackBtn.addEventListener('click', goToQuizSubjectScreen);

  function checkQuizPoolSize() {
    if (quizMode === 'flashcards') {
      const size = poolSize();
      const enough = size >= 1;
      quizStartBtn.disabled = !enough;
      quizStartBtn.style.opacity = enough ? '1' : '0.5';
      quizEmptyNote.style.display = enough ? 'none' : 'block';
      return;
    }
    const size = quizMode === 'practice' ? practicePool().length : poolSize();
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

  async function startQuiz() {
    if (quizMode !== 'practice') {
      try {
        if (quizStartBtn) quizStartBtn.disabled = true;
        await ensureQuizData();
      } catch (e) {
        showToast('Could not load quiz data. Check your internet connection and try again.');
        checkQuizPoolSize();
        return;
      }
      checkQuizPoolSize();
    }
    const n = parseInt(quizLengthSelect.value, 10) || 10;
    quizQuestions = generateQuestions(n);
    if (quizQuestions.length < 4) return;
    quizIndex = 0;
    quizScore = 0;
    quizWrongAnswers = [];
    if (quizCountScreen) quizCountScreen.style.display = 'none';
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
    goToQuizCountScreen();
  }

  quizStartBtn.addEventListener('click', () => {
    if (quizMode === 'flashcards') startFlashcards();
    else startQuiz();
  });
  quizNextBtn.addEventListener('click', nextQuizQuestion);
  quizQuitBtn.addEventListener('click', quitQuiz);
  quizRestartBtn.addEventListener('click', () => {
    quizResultScreen.style.display = 'none';
    goToQuizCountScreen();
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

  async function updateFlashcardDueNote() {
    if (!flashcardDueNote) return;
    if (quizMode !== 'flashcards') { flashcardDueNote.style.display = 'none'; return; }
    const modeAtCall = quizMode, subjAtCall = quizSubject;
    try { await ensureQuizData(); } catch (e) { flashcardDueNote.style.display = 'none'; return; }
    if (quizMode !== modeAtCall || quizSubject !== subjAtCall) return; // user moved on while loading
    const p = pool();
    if (p.length === 0) { flashcardDueNote.style.display = 'none'; return; }
    const due = dueCardsIn(p).length;
    flashcardDueNote.style.display = 'block';
    flashcardDueNote.textContent = t('flashcard_due_label').replace('{n}', due) + ' / ' + p.length;
  }

  async function startFlashcards() {
    try {
      if (quizStartBtn) quizStartBtn.disabled = true;
      await ensureQuizData();
    } catch (e) {
      showToast('Could not load flashcards. Check your internet connection and try again.');
      checkQuizPoolSize();
      return;
    }
    checkQuizPoolSize();
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

    if (quizCountScreen) quizCountScreen.style.display = 'none';
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
    goToQuizCountScreen();
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
      goToQuizCountScreen();
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
    if (quizCountScreen && quizCountScreen.style.display === 'block') updateQuizCountLabels();
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
  const mode3DBtn = document.getElementById('graphMode3DBtn');
  const angleSlider = document.getElementById('graphAngleSlider');
  const angleDeg = document.getElementById('graphAngleDeg');
  const angleValues = document.getElementById('graphAngleValues');
  const panel3D = document.getElementById('graph3DPanel');
  const fn3DInput = document.getElementById('graph3DFnInput');
  const quick3DBtns = document.getElementById('graph3DQuickBtns');
  const error3D = document.getElementById('graph3DError');
  const canvas3D = document.getElementById('graph3DCanvas');
  const ctx3D = canvas3D ? canvas3D.getContext('2d') : null;
  const showSecondCb = document.getElementById('graphShowSecond');
  const showDerivCb = document.getElementById('graphShowDeriv');
  const showIntegralCb = document.getElementById('graphShowIntegral');
  const fn2Input = document.getElementById('graphFn2Input');
  const integralRow = document.getElementById('graphIntegralRow');
  const intAInput = document.getElementById('graphIntA');
  const intBInput = document.getElementById('graphIntB');
  const intValueSpan = document.getElementById('graphIntValue');
  const tableBtn = document.getElementById('graphTableBtn');
  const tableWrap = document.getElementById('graphTableWrap');
  const legendEl = document.getElementById('graphLegend');
  const modePolarBtn = document.getElementById('graphModePolarBtn');
  const polarPanel = document.getElementById('graphPolarPanel');
  const polarFnInput = document.getElementById('graphPolarFnInput');
  const polarThetaMaxInput = document.getElementById('graphPolarThetaMax');
  const polarError = document.getElementById('graphPolarError');
  const quickPolarBtns = document.getElementById('graphPolarQuickBtns');
  const modeParametricBtn = document.getElementById('graphModeParametricBtn');
  const paramPanel = document.getElementById('graphParametricPanel');
  const paramXInput = document.getElementById('graphParamXInput');
  const paramYInput = document.getElementById('graphParamYInput');
  const paramQuickBtns = document.getElementById('graphParamQuickBtns');
  const paramTMinInput = document.getElementById('graphParamTMin');
  const paramTMaxInput = document.getElementById('graphParamTMax');
  const paramError = document.getElementById('graphParamError');
  const modeIneqBtn = document.getElementById('graphModeInequalityBtn');
  const ineqPanel = document.getElementById('graphInequalityPanel');
  const ineqInput = document.getElementById('graphIneqInput');
  const ineqQuickBtns = document.getElementById('graphIneqQuickBtns');
  const ineqXMinInput = document.getElementById('graphIneqXMin');
  const ineqXMaxInput = document.getElementById('graphIneqXMax');
  const ineqError = document.getElementById('graphIneqError');
  const modeDataBtn = document.getElementById('graphModeDataBtn');
  const dataPanel = document.getElementById('graphDataPanel');
  const dataInput = document.getElementById('graphDataInput');
  const dataBarBtn = document.getElementById('graphDataBarBtn');
  const dataScatterBtn = document.getElementById('graphDataScatterBtn');
  const dataError = document.getElementById('graphDataError');
  const dataLineBtn = document.getElementById('graphDataLineBtn');
  const dataAreaBtn = document.getElementById('graphDataAreaBtn');
  let dataChartType = 'bar';

  // new graphs: implicit curve + pie chart
  const implicitPanel = document.getElementById('graphImplicitPanel');
  const implicitInput = document.getElementById('graphImplicitInput');
  const implicitMinInput = document.getElementById('graphImplicitMin');
  const implicitMaxInput = document.getElementById('graphImplicitMax');
  const implicitQuickBtns = document.getElementById('graphImplicitQuickBtns');
  const implicitError = document.getElementById('graphImplicitError');
  const piePanel = document.getElementById('graphPiePanel');
  const pieInput = document.getElementById('graphPieInput');
  const pieError = document.getElementById('graphPieError');

  // 3-step flow: 1 = graph names, 2 = functions/inputs, 3 = the graph
  const step1El = document.getElementById('graphStep1');
  const step2El = document.getElementById('graphStep2');
  const step3El = document.getElementById('graphStep3');
  const step2Title = document.getElementById('graphStep2Title');
  const step3Title = document.getElementById('graphStep3Title');
  const step3Error = document.getElementById('graphStep3Error');
  const typeList = document.getElementById('graphTypeList');
  const circleStartPanel = document.getElementById('graphCircleStartPanel');
  const circleQuickBtns = document.getElementById('graphCircleQuickBtns');
  const hint3D = document.getElementById('graph3DHint');
  const showGraphBtn = document.getElementById('graphShowBtn');
  const backToListBtn = document.getElementById('graphBackToListBtn');
  const backToInputBtn = document.getElementById('graphBackToInputBtn');
  let graphStep = 1;

  let graphMode = 'function';

  // Whitelist-validate the expression before ever handing it to Function(),
  // so only numbers, x, basic operators, parens, commas, dots and known
  // function names can appear — nothing else is allowed through.
  const ALLOWED_FN_NAMES = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'asin', 'acos', 'atan', 'acot', 'asec', 'acsc',
    'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'sqrt', 'cbrt', 'abs', 'log', 'ln', 'log10', 'log2',
    'exp', 'pow', 'min', 'max', 'floor', 'ceil', 'round', 'trunc', 'sign'];
  // Helper functions injected into the compiled Function's scope for names
  // JS's Math object has no native equivalent for (reciprocal trig etc.)
  const FN_HELPERS = 'const cot=a=>1/Math.tan(a),sec=a=>1/Math.cos(a),csc=a=>1/Math.sin(a),' +
    'acot=a=>Math.atan(1/a),asec=a=>Math.acos(1/a),acsc=a=>Math.asin(1/a);';
  function compileFn(exprRaw) {
    let expr = exprRaw.trim();
    if (!expr) return null;
    // implicit multiplication: 2x -> 2*x, )x -> )*x, 2( -> 2*(
    expr = expr.replace(/(\d)(x)/gi, '$1*$2');
    expr = expr.replace(/\)(\s*)(x|\()/gi, ')*$2');
    // skip the digit-before-paren rule when it's actually part of log10( / log2(
    expr = expr.replace(/(?<!log1)(?<!log)(\d)(\()/g, '$1*$2');
    expr = expr.replace(/\^/g, '**');
    expr = expr.replace(/\bln\(/g, 'log(');

    const safety = expr
      .replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|acot|asec|acsc|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|abs|log10|log2|log|exp|pow|min|max|floor|ceil|round|trunc|sign|pi|PI)\b/g, '')
      .replace(/[x\d\s+\-*/().,]/g, '');
    if (safety.length > 0) return null;

    const funcBody = expr
      .replace(/\bsin\(/g, 'Math.sin(')
      .replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(')
      .replace(/\basin\(/g, 'Math.asin(')
      .replace(/\bacos\(/g, 'Math.acos(')
      .replace(/\batan\(/g, 'Math.atan(')
      .replace(/\bsinh\(/g, 'Math.sinh(')
      .replace(/\bcosh\(/g, 'Math.cosh(')
      .replace(/\btanh\(/g, 'Math.tanh(')
      .replace(/\basinh\(/g, 'Math.asinh(')
      .replace(/\bacosh\(/g, 'Math.acosh(')
      .replace(/\batanh\(/g, 'Math.atanh(')
      .replace(/\bsqrt\(/g, 'Math.sqrt(')
      .replace(/\bcbrt\(/g, 'Math.cbrt(')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\blog10\(/g, 'Math.log10(')
      .replace(/\blog2\(/g, 'Math.log2(')
      .replace(/\blog\(/g, 'Math.log(')
      .replace(/\bexp\(/g, 'Math.exp(')
      .replace(/\bpow\(/g, 'Math.pow(')
      .replace(/\bmin\(/g, 'Math.min(')
      .replace(/\bmax\(/g, 'Math.max(')
      .replace(/\bfloor\(/g, 'Math.floor(')
      .replace(/\bceil\(/g, 'Math.ceil(')
      .replace(/\bround\(/g, 'Math.round(')
      .replace(/\btrunc\(/g, 'Math.trunc(')
      .replace(/\bsign\(/g, 'Math.sign(')
      .replace(/\bpi\b/gi, 'Math.PI');

    try {
      // eslint-disable-next-line no-new-func
      const fn = new Function('x', FN_HELPERS + ' return (' + funcBody + ');');
      fn(1); // sanity call
      return fn;
    } catch (e) {
      return null;
    }
  }

  // Same whitelist/compile approach as compileFn, but for polar r(θ)
  // expressions using "t" as the angle variable (radians).
  function compilePolarFn(exprRaw) {
    let expr = (exprRaw || '').trim();
    if (!expr) return null;
    expr = expr.replace(/(\d)(t)/gi, '$1*$2');
    expr = expr.replace(/\)(\s*)(t|\()/gi, ')*$2');
    expr = expr.replace(/(?<!log1)(?<!log)(\d)(\()/g, '$1*$2');
    expr = expr.replace(/\^/g, '**');
    expr = expr.replace(/\bln\(/g, 'log(');

    const safety = expr
      .replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|acot|asec|acsc|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|abs|log10|log2|log|exp|pow|min|max|floor|ceil|round|trunc|sign|pi|PI)\b/g, '')
      .replace(/[t\d\s+\-*/().,]/g, '');
    if (safety.length > 0) return null;

    const funcBody = expr
      .replace(/\bsin\(/g, 'Math.sin(').replace(/\bcos\(/g, 'Math.cos(').replace(/\btan\(/g, 'Math.tan(')
      .replace(/\basin\(/g, 'Math.asin(').replace(/\bacos\(/g, 'Math.acos(').replace(/\batan\(/g, 'Math.atan(')
      .replace(/\bsinh\(/g, 'Math.sinh(').replace(/\bcosh\(/g, 'Math.cosh(').replace(/\btanh\(/g, 'Math.tanh(')
      .replace(/\basinh\(/g, 'Math.asinh(').replace(/\bacosh\(/g, 'Math.acosh(').replace(/\batanh\(/g, 'Math.atanh(')
      .replace(/\bsqrt\(/g, 'Math.sqrt(').replace(/\bcbrt\(/g, 'Math.cbrt(').replace(/\babs\(/g, 'Math.abs(')
      .replace(/\blog10\(/g, 'Math.log10(').replace(/\blog2\(/g, 'Math.log2(').replace(/\blog\(/g, 'Math.log(')
      .replace(/\bexp\(/g, 'Math.exp(').replace(/\bpow\(/g, 'Math.pow(').replace(/\bmin\(/g, 'Math.min(').replace(/\bmax\(/g, 'Math.max(')
      .replace(/\bfloor\(/g, 'Math.floor(').replace(/\bceil\(/g, 'Math.ceil(').replace(/\bround\(/g, 'Math.round(').replace(/\btrunc\(/g, 'Math.trunc(')
      .replace(/\bsign\(/g, 'Math.sign(').replace(/\bpi\b/gi, 'Math.PI');

    try {
      const fn = new Function('t', FN_HELPERS + ' return (' + funcBody + ');');
      fn(1);
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

  // numeric derivative via central difference
  function numericDeriv(fn, x, h) {
    try {
      const y1 = fn(x + h), y2 = fn(x - h);
      if (!isFinite(y1) || !isFinite(y2)) return NaN;
      return (y1 - y2) / (2 * h);
    } catch (e) { return NaN; }
  }

  // numeric definite integral via Simpson's rule
  function numericIntegral(fn, a, b, n) {
    if (n % 2 === 1) n++;
    const hstep = (b - a) / n;
    let sum = 0;
    try {
      sum += fn(a) + fn(b);
      for (let i = 1; i < n; i++) {
        const x = a + i * hstep;
        const y = fn(x);
        if (!isFinite(y)) return NaN;
        sum += (i % 2 === 0 ? 2 : 4) * y;
      }
    } catch (e) { return NaN; }
    return (hstep / 3) * sum;
  }

  function samplePts(fn, xmin, xmax, samples) {
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const x = xmin + (xmax - xmin) * i / samples;
      let y;
      try { y = fn(x); } catch (e) { y = NaN; }
      pts.push([x, y]);
    }
    return pts;
  }

  function drawCurve(pts, toPx, color, ymin, yspan, dashed) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    ctx.setLineDash(dashed ? [6, 4] : []);
    ctx.beginPath();
    let started = false;
    let prevY = null;
    pts.forEach(([x, y]) => {
      const [px, py] = toPx(x, y);
      const outOfRange = !isFinite(y) || y < ymin - yspan || y > ymin + yspan * 2;
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
    ctx.setLineDash([]);
  }

  function renderLegend(entries) {
    if (!legendEl) return;
    legendEl.innerHTML = entries.map(e =>
      `<span><i style="background:${e.color}${e.dashed ? ';border-top:2px dashed ' + e.color : ''}"></i>${e.label}</span>`
    ).join('');
  }

  function renderTable(rows) {
    if (!tableWrap) return;
    if (!tableWrap.dataset.open) { tableWrap.style.display = 'none'; return; }
    const cols = rows.cols;
    let html = '<table><thead><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>';
    rows.data.forEach(row => {
      html += '<tr>' + row.map(v => `<td>${v}</td>`).join('') + '</tr>';
    });
    html += '</tbody></table>';
    tableWrap.innerHTML = html;
    tableWrap.style.display = 'block';
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

    const showSecond = showSecondCb && showSecondCb.checked;
    const showDeriv = showDerivCb && showDerivCb.checked;
    const showIntegral = showIntegralCb && showIntegralCb.checked;
    const fn2 = showSecond ? compileFn(fn2Input.value) : null;
    if (showSecond && !fn2) { graphError.textContent = t('graph_error_expr'); }

    const samples = 400;
    const pts = samplePts(fn, xmin, xmax, samples);
    const h0 = (xmax - xmin) / samples;
    const derivPts = showDeriv ? pts.map(([x]) => [x, numericDeriv(fn, x, Math.max(h0 / 4, 1e-4))]) : [];
    const pts2 = fn2 ? samplePts(fn2, xmin, xmax, samples) : [];

    let ymin = Infinity, ymax = -Infinity;
    [pts, pts2, derivPts].forEach(arr => arr.forEach(([, y]) => {
      if (isFinite(y)) { if (y < ymin) ymin = y; if (y > ymax) ymax = y; }
    }));
    if (!isFinite(ymin) || !isFinite(ymax)) {
      graphError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const pad = (ymax - ymin) * 0.1;
    ymin -= pad; ymax += pad;
    // clamp extreme spikes (e.g. tan(x), 1/x asymptotes)
    const yspan0 = ymax - ymin;
    const cap = Math.min(yspan0, (xmax - xmin) * 4);
    if (yspan0 > cap) {
      const mid = (ymax + ymin) / 2;
      ymin = mid - cap / 2; ymax = mid + cap / 2;
    }
    const yspan = ymax - ymin;

    const toPx = drawAxes(w, h, xmin, xmax, ymin, ymax);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';

    // shaded area under f(x) between a and b
    let intValue = null;
    if (showIntegral && intAInput && intBInput) {
      const a = parseFloat(intAInput.value), b = parseFloat(intBInput.value);
      if (isFinite(a) && isFinite(b) && a !== b) {
        const lo = Math.min(a, b), hi = Math.max(a, b);
        ctx.fillStyle = 'rgba(255,138,31,0.22)';
        ctx.beginPath();
        const shadeSamples = 100;
        const [pz0] = toPx(lo, 0), [, pyz] = toPx(0, 0);
        ctx.moveTo(pz0, pyz);
        for (let i = 0; i <= shadeSamples; i++) {
          const x = lo + (hi - lo) * i / shadeSamples;
          let y; try { y = fn(x); } catch (e) { y = 0; }
          if (!isFinite(y)) y = 0;
          const [px, py] = toPx(x, y);
          ctx.lineTo(px, py);
        }
        const [pxEnd] = toPx(hi, 0);
        ctx.lineTo(pxEnd, pyz);
        ctx.closePath();
        ctx.fill();
        intValue = numericIntegral(fn, lo, hi, 200);
      }
    }
    if (intValueSpan) intValueSpan.textContent = intValue !== null && isFinite(intValue) ? ('≈ ' + intValue.toFixed(4)) : '';

    if (showDeriv) drawCurve(derivPts, toPx, '#3fbf6f', ymin, yspan, true);
    if (fn2) drawCurve(pts2, toPx, '#5a9ad8', ymin, yspan, false);
    drawCurve(pts, toPx, accent, ymin, yspan, false);

    const legend = [{ color: accent, label: 'f(x) = ' + fnInput.value }];
    if (fn2) legend.push({ color: '#5a9ad8', label: 'g(x) = ' + fn2Input.value });
    if (showDeriv) legend.push({ color: '#3fbf6f', label: "f'(x)", dashed: true });
    renderLegend(legend.length > 1 ? legend : []);

    if (tableWrap && tableWrap.dataset.open) {
      const n = 9;
      const cols = ['x', 'f(x)'];
      if (fn2) cols.push('g(x)');
      const data = [];
      for (let i = 0; i < n; i++) {
        const x = xmin + (xmax - xmin) * i / (n - 1);
        let y; try { y = fn(x); } catch (e) { y = NaN; }
        const row = [x.toFixed(2), isFinite(y) ? y.toFixed(4) : '—'];
        if (fn2) {
          let y2; try { y2 = fn2(x); } catch (e) { y2 = NaN; }
          row.push(isFinite(y2) ? y2.toFixed(4) : '—');
        }
        data.push(row);
      }
      renderTable({ cols, data });
    }
  }

  function plotPolar() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    if (polarError) polarError.textContent = '';

    const fn = compilePolarFn(polarFnInput ? polarFnInput.value : '');
    if (!fn) {
      if (polarError) polarError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }

    let thetaMult = polarThetaMaxInput ? parseFloat(polarThetaMaxInput.value) : 2;
    if (!isFinite(thetaMult) || thetaMult <= 0) thetaMult = 2;
    const thetaMax = thetaMult * Math.PI;

    const samples = 720;
    let maxR = 0;
    const pts = [];
    for (let i = 0; i <= samples; i++) {
      const theta = thetaMax * i / samples;
      let r;
      try { r = fn(theta); } catch (e) { r = NaN; }
      if (isFinite(r)) {
        pts.push([theta, r]);
        if (Math.abs(r) > maxR) maxR = Math.abs(r);
      } else {
        pts.push([theta, NaN]);
      }
    }
    if (!isFinite(maxR) || maxR === 0) {
      if (polarError) polarError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }
    maxR *= 1.15;

    const toPx = drawAxes(w, h, -maxR, maxR, -maxR, maxR);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    pts.forEach(([theta, r]) => {
      if (!isFinite(r)) { started = false; return; }
      const x = r * Math.cos(theta), y = r * Math.sin(theta);
      const [px, py] = toPx(x, y);
      if (!started) { ctx.moveTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    });
    ctx.stroke();
  }

  function plotParametric() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    if (paramError) paramError.textContent = '';

    const xFn = compilePolarFn(paramXInput ? paramXInput.value : '');
    const yFn = compilePolarFn(paramYInput ? paramYInput.value : '');
    if (!xFn || !yFn) {
      if (paramError) paramError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const tMin = paramTMinInput ? parseFloat(paramTMinInput.value) : 0;
    const tMax = paramTMaxInput ? parseFloat(paramTMaxInput.value) : 6.283;
    if (!isFinite(tMin) || !isFinite(tMax) || tMin >= tMax) {
      if (paramError) paramError.textContent = t('graph_error_range');
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const samples = 600;
    const pts = [];
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (let i = 0; i <= samples; i++) {
      const tt = tMin + (tMax - tMin) * i / samples;
      let px, py;
      try { px = xFn(tt); py = yFn(tt); } catch (e) { px = NaN; py = NaN; }
      pts.push([px, py]);
      if (isFinite(px)) { if (px < xmin) xmin = px; if (px > xmax) xmax = px; }
      if (isFinite(py)) { if (py < ymin) ymin = py; if (py > ymax) ymax = py; }
    }
    if (!isFinite(xmin) || !isFinite(xmax) || !isFinite(ymin) || !isFinite(ymax)) {
      if (paramError) paramError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }
    // keep equal aspect so circles/ellipses aren't distorted
    const cx0 = (xmin + xmax) / 2, cy0 = (ymin + ymax) / 2;
    let half = Math.max((xmax - xmin) / 2, (ymax - ymin) / 2, 1e-6) * 1.15;
    const xmin2 = cx0 - half, xmax2 = cx0 + half, ymin2 = cy0 - half, ymax2 = cy0 + half;

    const toPx = drawAxes(w, h, xmin2, xmax2, ymin2, ymax2);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let started = false;
    pts.forEach(([x, y]) => {
      if (!isFinite(x) || !isFinite(y)) { started = false; return; }
      const [px, py] = toPx(x, y);
      if (!started) { ctx.moveTo(px, py); started = true; } else ctx.lineTo(px, py);
    });
    ctx.stroke();
    renderLegend([{ color: accent, label: 'x(t)=' + paramXInput.value + ', y(t)=' + paramYInput.value }]);
  }

  // Parses "y > expr", "y >= expr", "y < expr" or "y <= expr" (expr in x)
  function parseInequality(exprRaw) {
    const s = (exprRaw || '').trim();
    const m = s.match(/^y\s*(>=|<=|>|<)\s*(.+)$/i);
    if (!m) return null;
    const fn = compileFn(m[2]);
    if (!fn) return null;
    return { op: m[1], fn, rhsText: m[2] };
  }

  function plotInequality() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    if (ineqError) ineqError.textContent = '';

    const xmin = ineqXMinInput ? parseFloat(ineqXMinInput.value) : -10;
    const xmax = ineqXMaxInput ? parseFloat(ineqXMaxInput.value) : 10;
    if (!isFinite(xmin) || !isFinite(xmax) || xmin >= xmax) {
      if (ineqError) ineqError.textContent = t('graph_error_range');
      ctx.clearRect(0, 0, w, h);
      return;
    }

    const parsed = parseInequality(ineqInput ? ineqInput.value : '');
    if (!parsed) {
      if (ineqError) ineqError.textContent = t('graph_ineq_error');
      ctx.clearRect(0, 0, w, h);
      return;
    }
    const { op, fn, rhsText } = parsed;

    const samples = 300;
    const pts = samplePts(fn, xmin, xmax, samples);
    let ymin = Infinity, ymax = -Infinity;
    pts.forEach(([, y]) => { if (isFinite(y)) { if (y < ymin) ymin = y; if (y > ymax) ymax = y; } });
    if (!isFinite(ymin) || !isFinite(ymax)) {
      if (ineqError) ineqError.textContent = t('graph_error_expr');
      ctx.clearRect(0, 0, w, h);
      return;
    }
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const pad = (ymax - ymin) * 0.6;
    ymin -= pad; ymax += pad;
    const yspan0 = ymax - ymin;
    const cap = Math.min(yspan0, (xmax - xmin) * 4);
    if (yspan0 > cap) { const mid = (ymax + ymin) / 2; ymin = mid - cap / 2; ymax = mid + cap / 2; }

    const toPx = drawAxes(w, h, xmin, xmax, ymin, ymax);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';
    const above = (op === '>' || op === '>=');
    const boundaryY = above ? ymax : ymin;

    ctx.fillStyle = 'rgba(255,138,31,0.22)';
    ctx.beginPath();
    let started = false;
    pts.forEach(([x, y]) => {
      const yy = isFinite(y) ? y : boundaryY;
      const [px, py] = toPx(x, yy);
      if (!started) { const [bx, by] = toPx(x, boundaryY); ctx.moveTo(bx, by); ctx.lineTo(px, py); started = true; }
      else ctx.lineTo(px, py);
    });
    if (pts.length) {
      const lastX = pts[pts.length - 1][0];
      const [ex, ey] = toPx(lastX, boundaryY);
      ctx.lineTo(ex, ey);
    }
    ctx.closePath();
    ctx.fill();

    const dashed = (op === '>' || op === '<');
    drawCurve(pts, toPx, accent, ymin, yspan0, dashed);
    renderLegend([{ color: accent, label: 'y ' + op + ' ' + rhsText, dashed }]);
  }

  function parseDataPairs(raw) {
    const lines = (raw || '').split('\n').map(l => l.trim()).filter(l => l.length);
    const pts = [];
    lines.forEach((line, idx) => {
      const parts = line.split(',').map(s => s.trim());
      let x, y;
      if (parts.length >= 2) { x = parseFloat(parts[0]); y = parseFloat(parts[1]); }
      else { x = idx + 1; y = parseFloat(parts[0]); }
      if (isFinite(x) && isFinite(y)) pts.push([x, y]);
    });
    return pts;
  }

  function plotDataChart() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    if (dataError) dataError.textContent = '';

    const pts = parseDataPairs(dataInput ? dataInput.value : '');
    if (!pts.length) {
      if (dataError) dataError.textContent = t('graph_data_error');
      ctx.clearRect(0, 0, w, h);
      return;
    }

    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    pts.forEach(([x, y]) => { if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y; });
    if (ymin > 0) ymin = 0;
    if (ymax < 0) ymax = 0;
    if (xmin === xmax) { xmin -= 1; xmax += 1; }
    if (ymin === ymax) { ymin -= 1; ymax += 1; }
    const padX = (xmax - xmin) * 0.15 || 1;
    const padY = (ymax - ymin) * 0.15 || 1;
    const dxmin = xmin - padX, dxmax = xmax + padX, dymin = ymin - padY, dymax = ymax + padY;

    const toPx = drawAxes(w, h, dxmin, dxmax, dymin, dymax);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';

    if (dataChartType === 'area') {
      const sortedA = pts.slice().sort((a, b) => a[0] - b[0]);
      const [, zeroY] = toPx(0, 0);
      ctx.fillStyle = 'rgba(255,138,31,0.28)';
      ctx.beginPath();
      sortedA.forEach(([x, y], i) => {
        const [px, py] = toPx(x, y);
        if (i === 0) { ctx.moveTo(px, zeroY); ctx.lineTo(px, py); } else ctx.lineTo(px, py);
      });
      ctx.lineTo(toPx(sortedA[sortedA.length - 1][0], 0)[0], zeroY);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = accent; ctx.lineWidth = 2.5; ctx.lineJoin = 'round';
      ctx.beginPath();
      sortedA.forEach(([x, y], i) => { const [px, py] = toPx(x, y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      ctx.stroke();
    } else if (dataChartType === 'line') {
      const sorted = pts.slice().sort((a, b) => a[0] - b[0]);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      sorted.forEach(([x, y], i) => {
        const [px, py] = toPx(x, y);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
      ctx.fillStyle = accent;
      sorted.forEach(([x, y]) => {
        const [px, py] = toPx(x, y);
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      });
    } else if (dataChartType === 'bar') {
      const barW = Math.max(6, Math.min(46, (w / pts.length) * 0.5));
      const [, zeroPy] = toPx(0, 0);
      ctx.fillStyle = accent;
      pts.forEach(([x, y]) => {
        const [px, py] = toPx(x, y);
        ctx.fillRect(px - barW / 2, Math.min(py, zeroPy), barW, Math.abs(zeroPy - py) || 1);
      });
    } else {
      ctx.fillStyle = accent;
      pts.forEach(([x, y]) => {
        const [px, py] = toPx(x, y);
        ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fill();
      });
    }
    const label = (dataChartType === 'bar' ? t('graph_data_bar') : dataChartType === 'line' ? t('graph_data_line') : dataChartType === 'area' ? t('graph_data_area') : t('graph_data_scatter')) + ' — ' + pts.length + (pts.length === 1 ? ' pt' : ' pts');
    renderLegend([{ color: accent, label }]);
  }

  function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Implicit curve F(x, y) = 0 (circle, ellipse, hyperbola ...) drawn with marching squares
  function plotImplicit() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    if (implicitError) implicitError.textContent = '';
    const bad = () => {
      if (implicitError) implicitError.textContent = t('graph_implicit_error');
      ctx.clearRect(0, 0, w, h);
      renderLegend([]);
    };
    const xmin = parseFloat(implicitMinInput.value), xmax = parseFloat(implicitMaxInput.value);
    if (!isFinite(xmin) || !isFinite(xmax) || xmin >= xmax) {
      if (implicitError) implicitError.textContent = t('graph_error_range');
      ctx.clearRect(0, 0, w, h);
      renderLegend([]);
      return;
    }
    const raw = (implicitInput.value || '').trim();
    const parts = raw.split('=');
    if (parts.length > 2 || !parts[0].trim()) return bad();
    const lhs = parts[0], rhs = parts.length === 2 ? parts[1] : '0';
    if (!rhs.trim()) return bad();
    const fn = compileFn3D('(' + lhs + ')-(' + rhs + ')');
    if (!fn) return bad();

    const span = xmax - xmin;
    const yspan = span * h / w;           // equal scale on both axes so circles look round
    const ymin = -yspan / 2, ymax = yspan / 2;
    const toPx = drawAxes(w, h, xmin, xmax, ymin, ymax);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';

    const cell = 3;
    const nx = Math.max(20, Math.min(320, Math.floor(w / cell)));
    const ny = Math.max(20, Math.min(320, Math.floor(h / cell)));
    const stride = nx + 1;
    const vals = new Float64Array(stride * (ny + 1));
    for (let j = 0; j <= ny; j++) {
      const y = ymax - yspan * j / ny;
      for (let i = 0; i <= nx; i++) {
        const x = xmin + span * i / nx;
        let v; try { v = fn(x, y); } catch (e) { v = NaN; }
        vals[j * stride + i] = isFinite(v) ? v : NaN;
      }
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    let any = false;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v0 = vals[j * stride + i], v1 = vals[j * stride + i + 1];
        const v2 = vals[(j + 1) * stride + i + 1], v3 = vals[(j + 1) * stride + i];
        if (isNaN(v0) || isNaN(v1) || isNaN(v2) || isNaN(v3)) continue;
        const x0 = i * w / nx, x1 = (i + 1) * w / nx, y0 = j * h / ny, y1 = (j + 1) * h / ny;
        const top = ((v0 < 0) !== (v1 < 0)) ? [x0 + v0 / (v0 - v1) * (x1 - x0), y0] : null;
        const right = ((v1 < 0) !== (v2 < 0)) ? [x1, y0 + v1 / (v1 - v2) * (y1 - y0)] : null;
        const bottom = ((v3 < 0) !== (v2 < 0)) ? [x0 + v3 / (v3 - v2) * (x1 - x0), y1] : null;
        const left = ((v0 < 0) !== (v3 < 0)) ? [x0, y0 + v0 / (v0 - v3) * (y1 - y0)] : null;
        const edges = [top, right, bottom, left].filter(Boolean);
        const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); any = true; };
        if (edges.length === 2) seg(edges[0], edges[1]);
        else if (edges.length === 4) {
          const centre = (v0 + v1 + v2 + v3) / 4;
          if ((centre < 0) === (v0 < 0)) { seg(top, right); seg(bottom, left); }
          else { seg(top, left); seg(right, bottom); }
        }
      }
    }
    ctx.stroke();
    if (!any && implicitError) implicitError.textContent = t('graph_implicit_nocurve');
    renderLegend([{ color: accent, label: escHtml(raw) }]);
  }

  const PIE_COLORS = ['#ff8a1f', '#5a9ad8', '#3fbf6f', '#e8548b', '#f2c14e', '#9b6ee0', '#2fc4b2', '#ff7a59', '#7fb069', '#c06c84'];
  function plotPie() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    if (pieError) pieError.textContent = '';
    ctx.clearRect(0, 0, w, h);
    const lines = (pieInput.value || '').split('\n').map(l => l.trim()).filter(Boolean);
    const items = [];
    lines.forEach((line, idx) => {
      const cut = line.lastIndexOf(',');
      let label, val;
      if (cut === -1) { label = 'Item ' + (idx + 1); val = parseFloat(line); }
      else { label = line.slice(0, cut).trim() || ('Item ' + (idx + 1)); val = parseFloat(line.slice(cut + 1)); }
      if (isFinite(val) && val > 0) items.push({ label, val });
    });
    const total = items.reduce((a, b) => a + b.val, 0);
    if (!items.length || total <= 0) {
      if (pieError) pieError.textContent = t('graph_pie_error');
      renderLegend([]);
      return;
    }
    const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.4;
    let ang = -Math.PI / 2;
    const legend = [];
    items.forEach((it, i) => {
      const frac = it.val / total;
      const a2 = ang + frac * Math.PI * 2;
      const color = PIE_COLORS[i % PIE_COLORS.length];
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, ang, a2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.5; ctx.stroke();
      if (frac >= 0.05) {
        const mid = (ang + a2) / 2;
        ctx.fillStyle = '#fff';
        ctx.font = '700 12px Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText((frac * 100).toFixed(1) + '%', cx + Math.cos(mid) * r * 0.62, cy + Math.sin(mid) * r * 0.62);
      }
      legend.push({ color, label: escHtml(it.label) + ' — ' + (frac * 100).toFixed(1) + '%' });
      ang = a2;
    });
    renderLegend(legend);
  }

  /* ====== 9 more graphs: slope field, contour, histogram, box plot, normal, binomial, regression, argand, vectors ====== */
  const gEl = (id) => document.getElementById(id);
  const accentColor = () => getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';
  function parseNumList(raw) {
    return (raw || '').split(/[\s,;]+/).map(v => parseFloat(v)).filter(v => isFinite(v)).slice(0, 5000);
  }
  function fmtN(v, d) { return String(+Number(v).toFixed(d === undefined ? 4 : d)); }
  function drawArrow(x0, y0, x1, y1, color, width) {
    const ang = Math.atan2(y1 - y0, x1 - x0), hd = 9;
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width || 2.2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - hd * Math.cos(ang - 0.4), y1 - hd * Math.sin(ang - 0.4));
    ctx.lineTo(x1 - hd * Math.cos(ang + 0.4), y1 - hd * Math.sin(ang + 0.4));
    ctx.closePath(); ctx.fill();
  }
  function failPlot(errEl, key, w, h) {
    if (errEl) errEl.textContent = t(key);
    ctx.clearRect(0, 0, w, h);
    renderLegend([]);
  }
  // marching squares for one level of a gridded function
  function marchLevel(vals, stride, nx, ny, w, h, level) {
    ctx.beginPath();
    let any = false;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v0 = vals[j * stride + i] - level, v1 = vals[j * stride + i + 1] - level;
        const v2 = vals[(j + 1) * stride + i + 1] - level, v3 = vals[(j + 1) * stride + i] - level;
        if (isNaN(v0) || isNaN(v1) || isNaN(v2) || isNaN(v3)) continue;
        const x0 = i * w / nx, x1 = (i + 1) * w / nx, y0 = j * h / ny, y1 = (j + 1) * h / ny;
        const top = ((v0 < 0) !== (v1 < 0)) ? [x0 + v0 / (v0 - v1) * (x1 - x0), y0] : null;
        const right = ((v1 < 0) !== (v2 < 0)) ? [x1, y0 + v1 / (v1 - v2) * (y1 - y0)] : null;
        const bottom = ((v3 < 0) !== (v2 < 0)) ? [x0 + v3 / (v3 - v2) * (x1 - x0), y1] : null;
        const left = ((v0 < 0) !== (v3 < 0)) ? [x0, y0 + v0 / (v0 - v3) * (y1 - y0)] : null;
        const edges = [top, right, bottom, left].filter(Boolean);
        const seg = (a, b) => { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); any = true; };
        if (edges.length === 2) seg(edges[0], edges[1]);
        else if (edges.length === 4) {
          const centre = (v0 + v1 + v2 + v3) / 4;
          if ((centre < 0) === (v0 < 0)) { seg(top, right); seg(bottom, left); } else { seg(top, left); seg(right, bottom); }
        }
      }
    }
    ctx.stroke();
    return any;
  }

  function plotSlopeField() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphSlopeError'); errEl.textContent = '';
    const xmin = parseFloat(gEl('graphSlopeMin').value), xmax = parseFloat(gEl('graphSlopeMax').value);
    if (!isFinite(xmin) || !isFinite(xmax) || xmin >= xmax) return failPlot(errEl, 'graph_error_range', w, h);
    const fn = compileFn3D(gEl('graphSlopeInput').value);
    if (!fn) return failPlot(errEl, 'graph_slope_error', w, h);
    const span = xmax - xmin, yspan = span * h / w, ymin = -yspan / 2, ymax = yspan / 2;
    const toPx = drawAxes(w, h, xmin, xmax, ymin, ymax);
    const accent = accentColor();
    const cols = 22, d = span / cols, rows = Math.max(1, Math.floor(yspan / d)), L = d * 0.4;
    ctx.strokeStyle = 'rgba(255,138,31,0.8)'; ctx.lineWidth = 1.6; ctx.beginPath();
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < rows; j++) {
        const x = xmin + (i + 0.5) * d, y = -rows * d / 2 + (j + 0.5) * d;
        let m; try { m = fn(x, y); } catch (e) { m = NaN; }
        if (isNaN(m)) continue;
        const ang = isFinite(m) ? Math.atan(m) : Math.PI / 2;
        const [ax, ay] = toPx(x - L * Math.cos(ang), y - L * Math.sin(ang));
        const [bx, by] = toPx(x + L * Math.cos(ang), y + L * Math.sin(ang));
        ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
      }
    }
    ctx.stroke();
    // solution curve through (x0, y0) using RK4, both directions
    const x0 = parseFloat(gEl('graphSlopeX0').value), y0 = parseFloat(gEl('graphSlopeY0').value);
    const legend = [{ color: accent, label: 'dy/dx = ' + escHtml(gEl('graphSlopeInput').value) }];
    if (isFinite(x0) && isFinite(y0)) {
      const f = (x, y) => { try { return fn(x, y); } catch (e) { return NaN; } };
      const trace = (dir) => {
        const pts = [[x0, y0]]; let x = x0, y = y0; const hs = dir * span / 600;
        for (let n = 0; n < 700; n++) {
          const k1 = f(x, y), k2 = f(x + hs / 2, y + hs * k1 / 2), k3 = f(x + hs / 2, y + hs * k2 / 2), k4 = f(x + hs, y + hs * k3);
          const yn = y + hs * (k1 + 2 * k2 + 2 * k3 + k4) / 6;
          x += hs;
          if (!isFinite(yn) || Math.abs(yn) > yspan * 3 || x < xmin - 1e-9 || x > xmax + 1e-9) break;
          y = yn; pts.push([x, y]);
        }
        return pts;
      };
      const pts = trace(-1).reverse().concat(trace(1).slice(1));
      ctx.strokeStyle = '#5a9ad8'; ctx.lineWidth = 2.6; ctx.beginPath();
      pts.forEach(([x, y], i) => { const [px, py] = toPx(x, y); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); });
      ctx.stroke();
      const [dx0, dy0] = toPx(x0, y0);
      ctx.fillStyle = '#5a9ad8'; ctx.beginPath(); ctx.arc(dx0, dy0, 4.5, 0, Math.PI * 2); ctx.fill();
      legend.push({ color: '#5a9ad8', label: 'y(' + fmtN(x0, 2) + ') = ' + fmtN(y0, 2) });
    }
    renderLegend(legend);
  }

  function plotContour() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphContourError'); errEl.textContent = '';
    const xmin = parseFloat(gEl('graphContourMin').value), xmax = parseFloat(gEl('graphContourMax').value);
    if (!isFinite(xmin) || !isFinite(xmax) || xmin >= xmax) return failPlot(errEl, 'graph_error_range', w, h);
    const fn = compileFn3D(gEl('graphContourInput').value);
    if (!fn) return failPlot(errEl, 'graph_contour_error', w, h);
    const span = xmax - xmin, yspan = span * h / w, ymin = -yspan / 2, ymax = yspan / 2;
    drawAxes(w, h, xmin, xmax, ymin, ymax);
    const nx = Math.max(20, Math.min(240, Math.floor(w / 4))), ny = Math.max(20, Math.min(240, Math.floor(h / 4)));
    const stride = nx + 1, vals = new Float64Array(stride * (ny + 1));
    let zmin = Infinity, zmax = -Infinity;
    for (let j = 0; j <= ny; j++) {
      const y = ymax - yspan * j / ny;
      for (let i = 0; i <= nx; i++) {
        const x = xmin + span * i / nx;
        let v; try { v = fn(x, y); } catch (e) { v = NaN; }
        if (!isFinite(v)) v = NaN; else { if (v < zmin) zmin = v; if (v > zmax) zmax = v; }
        vals[j * stride + i] = v;
      }
    }
    if (!isFinite(zmin) || zmin === zmax) return failPlot(errEl, 'graph_contour_error', w, h);
    let k = parseInt(gEl('graphContourLevels').value, 10);
    if (!(k >= 2)) k = 8; k = Math.min(k, 15);
    const legend = [];
    ctx.lineWidth = 1.8;
    for (let n = 0; n < k; n++) {
      const level = zmin + (zmax - zmin) * (n + 1) / (k + 1);
      const color = 'hsl(' + Math.round(220 - 200 * n / (k - 1)) + ',85%,62%)';
      ctx.strokeStyle = color;
      marchLevel(vals, stride, nx, ny, w, h, level);
      legend.push({ color, label: 'z = ' + fmtN(level, 3) });
    }
    renderLegend(legend);
  }

  function plotHistogram() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphHistError'); errEl.textContent = '';
    const vals = parseNumList(gEl('graphHistInput').value);
    if (!vals.length) return failPlot(errEl, 'graph_hist_error', w, h);
    let k = parseInt(gEl('graphHistBins').value, 10);
    if (!(k >= 1)) k = Math.ceil(Math.log2(vals.length)) + 1;
    k = Math.min(k, 60);
    let lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
    if (lo === hi) { lo -= 0.5; hi += 0.5; }
    const bw = (hi - lo) / k, counts = new Array(k).fill(0);
    vals.forEach(v => { counts[Math.min(k - 1, Math.floor((v - lo) / bw))]++; });
    const maxC = Math.max.apply(null, counts), pad = (hi - lo) * 0.08;
    const toPx = drawAxes(w, h, lo - pad, hi + pad, -maxC * 0.06, maxC * 1.2);
    const accent = accentColor();
    ctx.save();
    ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    counts.forEach((c, i) => {
      const xa = lo + i * bw, [px0, py] = toPx(xa, c), [px1, pz] = toPx(xa + bw, 0);
      ctx.fillStyle = 'rgba(255,138,31,0.75)'; ctx.fillRect(px0 + 1, py, Math.max(1, px1 - px0 - 2), pz - py);
      ctx.strokeStyle = accent; ctx.lineWidth = 1; ctx.strokeRect(px0 + 1, py, Math.max(1, px1 - px0 - 2), pz - py);
      if (c > 0) { ctx.fillStyle = '#ddd'; ctx.fillText(String(c), (px0 + px1) / 2, py - 2); }
    });
    ctx.restore();
    renderLegend([{ color: accent, label: 'n = ' + vals.length + ' · ' + k + ' bins · width ' + fmtN(bw, 3) + ' · ' + fmtN(lo, 3) + ' → ' + fmtN(hi, 3) }]);
  }

  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q, b = Math.floor(pos), r = pos - b;
    return sorted[b + 1] !== undefined ? sorted[b] + r * (sorted[b + 1] - sorted[b]) : sorted[b];
  }
  function plotBoxPlot() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphBoxError'); errEl.textContent = '';
    const vals = parseNumList(gEl('graphBoxInput').value).sort((a, b) => a - b);
    if (vals.length < 2) return failPlot(errEl, 'graph_box_error', w, h);
    const q1 = quantile(vals, 0.25), med = quantile(vals, 0.5), q3 = quantile(vals, 0.75), iqr = q3 - q1;
    const inliers = vals.filter(v => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr);
    const wlo = inliers[0], whi = inliers[inliers.length - 1];
    const outliers = vals.filter(v => v < wlo || v > whi);
    let lo = vals[0], hi = vals[vals.length - 1]; if (lo === hi) { lo -= 1; hi += 1; }
    const pad = (hi - lo) * 0.1;
    const toPx = drawAxes(w, h, lo - pad, hi + pad, 0, 1);
    const accent = accentColor();
    const yT = 0.62, yB = 0.38, yM = 0.5;
    const [pq1, pT] = toPx(q1, yT), [pq3, pB] = toPx(q3, yB), [pmed] = toPx(med, yM);
    ctx.fillStyle = 'rgba(255,138,31,0.25)'; ctx.fillRect(pq1, pT, pq3 - pq1, pB - pT);
    ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(pq1, pT, pq3 - pq1, pB - pT);
    ctx.lineWidth = 3.2; ctx.beginPath(); ctx.moveTo(pmed, pT); ctx.lineTo(pmed, pB); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath();
    const [pwl, pm] = toPx(wlo, yM), [pwh] = toPx(whi, yM), [, pc1] = toPx(wlo, 0.55), [, pc2] = toPx(wlo, 0.45);
    ctx.moveTo(pq1, pm); ctx.lineTo(pwl, pm); ctx.moveTo(pq3, pm); ctx.lineTo(pwh, pm);
    ctx.moveTo(pwl, pc1); ctx.lineTo(pwl, pc2); ctx.moveTo(pwh, pc1); ctx.lineTo(pwh, pc2);
    ctx.stroke();
    ctx.fillStyle = '#ff6b6b';
    outliers.forEach(v => { const [ox, oy] = toPx(v, yM); ctx.beginPath(); ctx.arc(ox, oy, 4, 0, Math.PI * 2); ctx.fill(); });
    renderLegend([
      { color: accent, label: 'Min ' + fmtN(vals[0], 3) + ' · Q1 ' + fmtN(q1, 3) + ' · Median ' + fmtN(med, 3) + ' · Q3 ' + fmtN(q3, 3) + ' · Max ' + fmtN(vals[vals.length - 1], 3) },
      { color: '#ff6b6b', label: 'IQR ' + fmtN(iqr, 3) + ' · outliers: ' + (outliers.length ? outliers.map(v => fmtN(v, 3)).join(', ') : '—') }
    ]);
  }

  function plotNormal() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphNormError'); errEl.textContent = '';
    const mu = parseFloat(gEl('graphNormMean').value), sd = parseFloat(gEl('graphNormSd').value);
    if (!isFinite(mu) || !isFinite(sd) || sd <= 0) return failPlot(errEl, 'graph_norm_error', w, h);
    const pdf = x => Math.exp(-0.5 * Math.pow((x - mu) / sd, 2)) / (sd * Math.sqrt(2 * Math.PI));
    const peak = pdf(mu), xmin = mu - 4 * sd, xmax = mu + 4 * sd;
    const toPx = drawAxes(w, h, xmin, xmax, -peak * 0.04, peak * 1.15);
    const accent = accentColor();
    const shade = (a, b, color) => {
      ctx.fillStyle = color; ctx.beginPath();
      const [sx, sz] = toPx(a, 0); ctx.moveTo(sx, sz);
      for (let i = 0; i <= 80; i++) { const x = a + (b - a) * i / 80; const [px, py] = toPx(x, pdf(x)); ctx.lineTo(px, py); }
      const [ex] = toPx(b, 0); ctx.lineTo(ex, sz); ctx.closePath(); ctx.fill();
    };
    shade(mu - 2 * sd, mu + 2 * sd, 'rgba(90,154,216,0.22)');
    shade(mu - sd, mu + sd, 'rgba(255,138,31,0.32)');
    ctx.strokeStyle = accent; ctx.lineWidth = 2.6; ctx.beginPath();
    for (let i = 0; i <= 300; i++) { const x = xmin + (xmax - xmin) * i / 300; const [px, py] = toPx(x, pdf(x)); if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
    const [mx, m0] = toPx(mu, 0), [, mTop] = toPx(mu, peak);
    ctx.beginPath(); ctx.moveTo(mx, m0); ctx.lineTo(mx, mTop); ctx.stroke(); ctx.setLineDash([]);
    renderLegend([
      { color: accent, label: 'μ = ' + fmtN(mu, 3) + ', σ = ' + fmtN(sd, 3) + ' · peak ' + fmtN(peak, 4) },
      { color: 'rgba(255,138,31,0.7)', label: '±1σ: 68.27% (' + fmtN(mu - sd, 2) + ' → ' + fmtN(mu + sd, 2) + ')' },
      { color: 'rgba(90,154,216,0.8)', label: '±2σ: 95.45% (' + fmtN(mu - 2 * sd, 2) + ' → ' + fmtN(mu + 2 * sd, 2) + ')' }
    ]);
  }

  function plotBinomial() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphBinError'); errEl.textContent = '';
    const n = parseInt(gEl('graphBinN').value, 10), p = parseFloat(gEl('graphBinP').value);
    if (!(n >= 1 && n <= 300) || !isFinite(p) || p < 0 || p > 1) return failPlot(errEl, 'graph_bin_error', w, h);
    const lf = [0]; for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
    const probs = [];
    for (let k = 0; k <= n; k++) {
      if (p === 0) probs.push(k === 0 ? 1 : 0);
      else if (p === 1) probs.push(k === n ? 1 : 0);
      else probs.push(Math.exp(lf[n] - lf[k] - lf[n - k] + k * Math.log(p) + (n - k) * Math.log(1 - p)));
    }
    const pmax = Math.max.apply(null, probs);
    const toPx = drawAxes(w, h, -0.8, n + 0.8, -pmax * 0.06, pmax * 1.2);
    const accent = accentColor();
    ctx.save(); ctx.font = '600 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    probs.forEach((pr, k) => {
      const [px0, py] = toPx(k - 0.4, pr), [px1, pz] = toPx(k + 0.4, 0);
      ctx.fillStyle = 'rgba(255,138,31,0.8)'; ctx.fillRect(px0, py, Math.max(1, px1 - px0), pz - py);
      if (n <= 20 && pr > 0.0005) { ctx.fillStyle = '#ddd'; ctx.fillText(pr.toFixed(3), (px0 + px1) / 2, py - 2); }
    });
    ctx.restore();
    renderLegend([{ color: accent, label: 'Binomial(n = ' + n + ', p = ' + fmtN(p, 3) + ') · mean = ' + fmtN(n * p, 3) + ' · σ = ' + fmtN(Math.sqrt(n * p * (1 - p)), 3) }]);
  }

  function plotRegression() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphRegError'); errEl.textContent = '';
    const pts = parseDataPairs(gEl('graphRegInput').value);
    const n = pts.length;
    let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
    pts.forEach(([x, y]) => { sx += x; sy += y; sxx += x * x; sxy += x * y; syy += y * y; });
    const den = n * sxx - sx * sx;
    if (n < 2 || Math.abs(den) < 1e-12) return failPlot(errEl, 'graph_reg_error', w, h);
    const m = (n * sxy - sx * sy) / den, c = (sy - m * sx) / n;
    const vy = n * syy - sy * sy;
    const r = vy < 1e-12 ? NaN : (n * sxy - sx * sy) / Math.sqrt(den * vy);
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    pts.forEach(([x, y]) => { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); });
    const px = (xmax - xmin) * 0.15, dxmin = xmin - px, dxmax = xmax + px;
    ymin = Math.min(ymin, m * dxmin + c, m * dxmax + c); ymax = Math.max(ymax, m * dxmin + c, m * dxmax + c);
    const py = (ymax - ymin) * 0.12 || 1;
    const toPx = drawAxes(w, h, dxmin, dxmax, ymin - py, ymax + py);
    const accent = accentColor();
    ctx.strokeStyle = '#5a9ad8'; ctx.lineWidth = 2.6; ctx.beginPath();
    const [lx0, ly0] = toPx(dxmin, m * dxmin + c), [lx1, ly1] = toPx(dxmax, m * dxmax + c);
    ctx.moveTo(lx0, ly0); ctx.lineTo(lx1, ly1); ctx.stroke();
    ctx.fillStyle = accent;
    pts.forEach(([x, y]) => { const [qx, qy] = toPx(x, y); ctx.beginPath(); ctx.arc(qx, qy, 5, 0, Math.PI * 2); ctx.fill(); });
    renderLegend([
      { color: accent, label: 'Data (' + n + ' pts)' },
      { color: '#5a9ad8', label: 'y = ' + fmtN(m, 4) + 'x ' + (c < 0 ? '− ' : '+ ') + fmtN(Math.abs(c), 4) + ' · r = ' + (isNaN(r) ? '—' : fmtN(r, 4)) + ' · r² = ' + (isNaN(r) ? '—' : fmtN(r * r, 4)) }
    ]);
  }

  function parseComplex(str) {
    let sv = (str || '').replace(/\s+/g, '').replace(/j/gi, 'i');
    if (!sv) return null;
    const numRe = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i;
    if (sv.slice(-1) !== 'i') return numRe.test(sv) ? { re: parseFloat(sv), im: 0 } : null;
    const body = sv.slice(0, -1);
    let split = -1;
    for (let i = body.length - 1; i > 0; i--) { if ((body[i] === '+' || body[i] === '-') && !/e/i.test(body[i - 1])) { split = i; break; } }
    const imStr = split === -1 ? body : body.slice(split);
    const reStr = split === -1 ? '0' : body.slice(0, split);
    const im = (imStr === '' || imStr === '+') ? 1 : imStr === '-' ? -1 : (numRe.test(imStr) ? parseFloat(imStr) : NaN);
    const re = numRe.test(reStr) ? parseFloat(reStr) : NaN;
    return (isFinite(re) && isFinite(im)) ? { re, im } : null;
  }
  function fmtComplexStr(re, im) { return fmtN(re, 3) + ' ' + (im < 0 ? '−' : '+') + ' ' + fmtN(Math.abs(im), 3) + 'i'; }

  // shared plane drawing for Argand + vectors (equal scale, fits all arrows)
  function planeSetup(w, h, xs, ys) {
    const maxX = Math.max.apply(null, xs.map(Math.abs).concat([1])), maxY = Math.max.apply(null, ys.map(Math.abs).concat([1]));
    const R = Math.max(maxX * 1.35, maxY * 1.35 * w / h);
    const yspan = 2 * R * h / w;
    return { xmin: -R, xmax: R, ymin: -yspan / 2, ymax: yspan / 2 };
  }
  function planeLabels(toPx, a, b) {
    ctx.save(); ctx.fillStyle = '#aaa'; ctx.font = '700 11px Inter, sans-serif'; ctx.textBaseline = 'middle';
    ctx.textAlign = 'right'; const [rx, ry] = toPx(a.xmax, 0); ctx.fillText(a.text || '', rx - 4, ry - 10);
    ctx.textAlign = 'left'; const [ux, uy] = toPx(0, b.ymax); ctx.fillText(b.text || '', ux + 6, uy + 10);
    ctx.restore();
  }
  function plotArgand() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphArgError'); errEl.textContent = '';
    const lines = gEl('graphArgInput').value.split('\n').map(l => l.trim()).filter(Boolean);
    const zs = lines.map(parseComplex);
    if (!zs.length || zs.some(z => !z)) return failPlot(errEl, 'graph_arg_error', w, h);
    const rg = planeSetup(w, h, zs.map(z => z.re), zs.map(z => z.im));
    const toPx = drawAxes(w, h, rg.xmin, rg.xmax, rg.ymin, rg.ymax);
    planeLabels(toPx, { xmax: rg.xmax, text: 'Re' }, { ymax: rg.ymax, text: 'Im' });
    const [ox, oy] = toPx(0, 0), legend = [];
    ctx.save(); ctx.font = '700 12px Inter, sans-serif'; ctx.textBaseline = 'middle';
    zs.forEach((z, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length], [px, py] = toPx(z.re, z.im);
      drawArrow(ox, oy, px, py, color, 2.2);
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
      ctx.textAlign = px >= ox ? 'left' : 'right'; ctx.fillText('z' + (i + 1), px + (px >= ox ? 8 : -8), py + (py > oy ? 10 : -10));
      const mod = Math.hypot(z.re, z.im), arg = Math.atan2(z.im, z.re) * 180 / Math.PI;
      legend.push({ color, label: 'z' + (i + 1) + ' = ' + fmtComplexStr(z.re, z.im) + ' · |z| = ' + fmtN(mod, 3) + ' · arg = ' + fmtN(arg, 2) + '°' });
    });
    ctx.restore();
    renderLegend(legend);
  }

  function plotVectors() {
    const w = canvas.__w || canvas.width, h = canvas.__h || canvas.height;
    const errEl = gEl('graphVecError'); errEl.textContent = '';
    const lines = gEl('graphVecInput').value.split('\n').map(l => l.trim()).filter(Boolean);
    const vs = lines.map(l => { const p = l.split(/[,\s;]+/).map(parseFloat); return (p.length >= 2 && isFinite(p[0]) && isFinite(p[1])) ? { x: p[0], y: p[1] } : null; });
    if (!vs.length || vs.some(v => !v)) return failPlot(errEl, 'graph_vec_error', w, h);
    const R = vs.reduce((a, v) => ({ x: a.x + v.x, y: a.y + v.y }), { x: 0, y: 0 });
    const rg = planeSetup(w, h, vs.map(v => v.x).concat([R.x]), vs.map(v => v.y).concat([R.y]));
    const toPx = drawAxes(w, h, rg.xmin, rg.xmax, rg.ymin, rg.ymax);
    planeLabels(toPx, { xmax: rg.xmax, text: 'x' }, { ymax: rg.ymax, text: 'y' });
    const [ox, oy] = toPx(0, 0), legend = [];
    ctx.save(); ctx.font = '700 12px Inter, sans-serif'; ctx.textBaseline = 'middle';
    vs.forEach((v, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length], [px, py] = toPx(v.x, v.y);
      drawArrow(ox, oy, px, py, color, 2.2);
      ctx.fillStyle = color; ctx.textAlign = px >= ox ? 'left' : 'right'; ctx.fillText('v' + (i + 1), px + (px >= ox ? 8 : -8), py + (py > oy ? 10 : -10));
      legend.push({ color, label: 'v' + (i + 1) + ' = (' + fmtN(v.x, 3) + ', ' + fmtN(v.y, 3) + ') · |v| = ' + fmtN(Math.hypot(v.x, v.y), 3) });
    });
    if (vs.length > 1) {
      const [rx, ry] = toPx(R.x, R.y);
      drawArrow(ox, oy, rx, ry, '#ffffff', 3.2);
      ctx.fillStyle = '#fff'; ctx.textAlign = rx >= ox ? 'left' : 'right'; ctx.fillText('R', rx + (rx >= ox ? 8 : -8), ry + (ry > oy ? 12 : -12));
      legend.push({ color: '#ffffff', label: 'R = (' + fmtN(R.x, 3) + ', ' + fmtN(R.y, 3) + ') · |R| = ' + fmtN(Math.hypot(R.x, R.y), 3) + ' · θ = ' + fmtN(Math.atan2(R.y, R.x) * 180 / Math.PI, 2) + '°' });
    }
    ctx.restore();
    renderLegend(legend);
  }

  /* ====== 20 MORE GRAPHS (data-driven: each graph = inputs + plot function) ======
     Panels and step-1 buttons are generated from the GX list below, and every
     graph is registered in EXTRA, so it reuses the same 3-step flow, legend,
     error line and redraw logic as the other graphs. */
  const tx = (k, fb) => { const s = t(k); return s === k ? fb : s; };
  const bad = (msg) => { throw { gx: msg }; };
  const sg = (n) => (n < 0 ? '− ' : '+ ') + fmtN(Math.abs(n), 4);
  const esc = (s) => escHtml(s);

  // view box that fits the given x / y values; eq = equal scale on both axes
  function box(xs, ys, o) {
    o = o || {};
    const pad = o.pad == null ? 0.15 : o.pad, ms = o.minSpan || 2;
    if (o.zero) { xs = xs.concat([0]); ys = ys.concat([0]); }
    let x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs);
    let y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if (x1 - x0 < ms) { const m = (x0 + x1) / 2; x0 = m - ms / 2; x1 = m + ms / 2; }
    if (y1 - y0 < ms) { const m = (y0 + y1) / 2; y0 = m - ms / 2; y1 = m + ms / 2; }
    const px = (x1 - x0) * pad, py = (y1 - y0) * pad;
    x0 -= px; x1 += px; y0 -= py; y1 += py;
    if (o.eq) {
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const s = Math.max((x1 - x0) / o.W, (y1 - y0) / o.H);
      x0 = cx - s * o.W / 2; x1 = cx + s * o.W / 2; y0 = cy - s * o.H / 2; y1 = cy + s * o.H / 2;
    }
    return { x0, x1, y0, y1 };
  }
  // numbers along the axes (the shared drawAxes only draws the grid)
  function axisNums(toPx, b, W, H) {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '600 10px Inter, sans-serif';
    const xs = niceStep(b.x1 - b.x0), ys = niceStep(b.y1 - b.y0), o = toPx(0, 0);
    const ay = Math.min(H - 13, Math.max(2, o[1] + 3)), ax = Math.min(W - 32, Math.max(3, o[0] + 4));
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let i = Math.ceil(b.x0 / xs); i <= Math.floor(b.x1 / xs); i++) { if (i) ctx.fillText(fmtN(i * xs, 3), toPx(i * xs, 0)[0], ay); }
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    for (let i = Math.ceil(b.y0 / ys); i <= Math.floor(b.y1 / ys); i++) { if (i) ctx.fillText(fmtN(i * ys, 3), ax, toPx(0, i * ys)[1]); }
    ctx.restore();
  }
  function view(b, W, H) { const tp = drawAxes(W, H, b.x0, b.x1, b.y0, b.y1); axisNums(tp, b, W, H); return tp; }
  // polyline with gaps for NaN / off-screen / asymptote jumps (brk = break at big jumps)
  function poly(pts, tp, color, b, o) {
    o = o || {};
    ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = o.lw || 2.5; ctx.lineJoin = 'round';
    ctx.setLineDash(o.dash ? [6, 4] : []); ctx.beginPath();
    const sx = b.x1 - b.x0, sy = b.y1 - b.y0; let on = false, prev = null;
    pts.forEach(p => {
      const ok = isFinite(p[0]) && isFinite(p[1]) && p[1] > b.y0 - 2 * sy && p[1] < b.y1 + 2 * sy && p[0] > b.x0 - 2 * sx && p[0] < b.x1 + 2 * sx;
      const jump = o.brk && prev && (Math.abs(p[1] - prev[1]) > sy * 0.8 || Math.abs(p[0] - prev[0]) > sx * 0.8);
      if (!ok || jump) on = false;
      if (ok) { const q = tp(p[0], p[1]); if (!on) { ctx.moveTo(q[0], q[1]); on = true; } else ctx.lineTo(q[0], q[1]); }
      prev = ok ? p : null;
    });
    ctx.stroke(); ctx.restore();
  }
  function seg(tp, x0, y0, x1, y1, color, dash, lw) { poly([[x0, y0], [x1, y1]], tp, color, { x0: -1e9, x1: 1e9, y0: -1e9, y1: 1e9 }, { dash, lw: lw || 1.6 }); }
  function dot(tp, x, y, color, label, dx, dy) {
    const q = tp(x, y); ctx.save(); ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(q[0], q[1], 4.2, 0, Math.PI * 2); ctx.fill();
    if (label) { ctx.font = '700 11px Inter, sans-serif'; ctx.textAlign = (dx || 8) < 0 ? 'right' : 'left'; ctx.textBaseline = 'middle'; ctx.fillText(label, q[0] + (dx == null ? 8 : dx), q[1] + (dy == null ? -9 : dy)); }
    ctx.restore();
  }
  function fillPoly(pts, tp, color) {
    ctx.save(); ctx.fillStyle = color; ctx.beginPath();
    pts.forEach((p, i) => { const q = tp(p[0], p[1]); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  // y-range for f(x) curves: same spike clamp as the main Function Graph
  function autoY(arrs, xspan, extra) {
    let lo = Infinity, hi = -Infinity;
    arrs.forEach(a => a.forEach(p => { if (isFinite(p[1])) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } }));
    (extra || []).forEach(y => { if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } });
    if (!isFinite(lo)) bad(tx('graph_x_noval', 'The function has no real values on this range.'));
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const cap = xspan * 4;
    if (hi - lo > cap) { const m = extra && extra.length ? extra[0] : (hi + lo) / 2; lo = m - cap / 2; hi = m + cap / 2; }
    return [lo, hi];
  }
  const fact = (k) => { let r = 1; for (let i = 2; i <= k; i++) r *= i; return r; };
  const supNum = (k) => String(k).replace(/\d/g, d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]);
  // line  a·x + b·y = c  drawn across the whole view
  function lineABC(tp, a, b, c, bx, color, dash) {
    if (Math.abs(b) > 1e-12) seg(tp, bx.x0, (c - a * bx.x0) / b, bx.x1, (c - a * bx.x1) / b, color, dash, 2.4);
    else seg(tp, c / a, bx.y0, c / a, bx.y1, color, dash, 2.4);
  }

  const GROUPS = [
    { id: 'alg', key: 'graph_xg_alg', label: 'Algebra & Geometry' },
    { id: 'trig', key: 'graph_xg_trig', label: 'Trigonometry & Waves' },
    { id: 'calc', key: 'graph_xg_calc', label: 'Calculus Tools' },
    { id: 'phys', key: 'graph_xg_phys', label: 'Physics & Science' },
    { id: 'stat', key: 'graph_xg_stat', label: 'More Statistics' },
    { id: 'math', key: 'graph_group_math', label: 'Math Tools', after: 'graphModeVectorsBtn' }
  ];
  const FN_PRESETS = [['x²', 'x^2'], ['x³', 'x^3'], ['sin x', 'sin(x)'], ['eˣ', 'exp(x)']];
  const GX = [];

  /* ---------- Algebra & Geometry ---------- */
  GX.push({
    id: 'quadratic', grp: 'alg', label: 'Quadratic Explorer (ax²+bx+c)',
    inputs: [{ k: 'a', l: 'a', v: 1 }, { k: 'b', l: 'b', v: -2 }, { k: 'c', l: 'c', v: -3 }],
    presets: [['x²−2x−3', { a: 1, b: -2, c: -3 }], ['−x²+4', { a: -1, b: 0, c: 4 }], ['2x²−4x+2', { a: 2, b: -4, c: 2 }], ['x²+1', { a: 1, b: 0, c: 1 }]],
    plot(v, W, H) {
      const { a, b, c } = v; if (a === 0) bad(tx('graph_x_a0', 'a cannot be 0 — that would be a straight line.'));
      const D = b * b - 4 * a * c, vx = -b / (2 * a), vy = a * vx * vx + b * vx + c, f = x => a * x * x + b * x + c;
      const roots = D >= 0 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q) : [];
      const all = [0, vx].concat(roots), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = Math.max(hi - lo, 2) * 0.6;
      const x0 = lo - pad, x1 = hi + pad, bx = box([x0, x1], [0, vy, c, f(x0), f(x1)], { pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, vx, bx.y0, vx, bx.y1, '#5a9ad8', true);
      poly(samplePts(f, bx.x0, bx.x1, 300), tp, acc, bx, { brk: true });
      dot(tp, vx, vy, '#ffffff', 'V'); dot(tp, 0, c, '#f2c14e', '', 8, 0);
      roots.forEach(r => dot(tp, r, 0, '#3fbf6f', fmtN(r, 3), 8, 12));
      return [{ color: acc, label: 'y = ' + fmtN(a) + 'x² ' + sg(b) + 'x ' + sg(c) },
        { color: '#ffffff', label: 'Vertex (' + fmtN(vx, 3) + ', ' + fmtN(vy, 3) + ') · axis x = ' + fmtN(vx, 3) },
        { color: '#3fbf6f', label: D > 0 ? 'Roots: x = ' + fmtN(roots[0], 4) + ' and ' + fmtN(roots[1], 4) : D === 0 ? 'Double root: x = ' + fmtN(roots[0], 4) : 'No real roots (D < 0)' },
        { color: '#f2c14e', label: 'D = b² − 4ac = ' + fmtN(D, 4) + ' · y-intercept (0, ' + fmtN(c, 3) + ')' }];
    }
  });

  GX.push({
    id: 'line2pt', grp: 'alg', label: 'Straight Line (two points)',
    inputs: [{ k: 'x1', l: 'x₁', v: 1, r: 0 }, { k: 'y1', l: 'y₁', v: 1, r: 0 }, { k: 'x2', l: 'x₂', v: 4, r: 1 }, { k: 'y2', l: 'y₂', v: 7, r: 1 }],
    presets: [['(1,1) (4,7)', { x1: 1, y1: 1, x2: 4, y2: 7 }], ['(−2,3) (2,−1)', { x1: -2, y1: 3, x2: 2, y2: -1 }], ['Vertical', { x1: 2, y1: -3, x2: 2, y2: 4 }]],
    plot(v, W, H) {
      const { x1, y1, x2, y2 } = v; if (x1 === x2 && y1 === y2) bad(tx('graph_x_samept', 'The two points must be different.'));
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dist = Math.hypot(x2 - x1, y2 - y1);
      const bx = box([x1, x2, mx], [y1, y2, my], { zero: true, eq: true, pad: 0.35, W, H }), tp = view(bx, W, H), acc = accentColor();
      let eq, extra;
      if (x1 === x2) { lineABC(tp, 1, 0, x1, bx, acc); eq = 'x = ' + fmtN(x1, 4); extra = 'Vertical line — slope undefined'; }
      else {
        const m = (y2 - y1) / (x2 - x1), c = y1 - m * x1; lineABC(tp, -m, 1, c, bx, acc);
        eq = 'y = ' + fmtN(m, 4) + 'x ' + sg(c); extra = 'Slope m = ' + fmtN(m, 4) + ' · angle = ' + fmtN(Math.atan(m) * 180 / Math.PI, 2) + '°';
        if (m !== 0) dot(tp, -c / m, 0, '#3fbf6f', '', 8, 0);
        dot(tp, 0, c, '#3fbf6f', '', 8, 0);
      }
      dot(tp, x1, y1, '#ffffff', 'A'); dot(tp, x2, y2, '#ffffff', 'B'); dot(tp, mx, my, '#f2c14e', 'M', 8, 12);
      return [{ color: acc, label: eq }, { color: '#5a9ad8', label: extra },
        { color: '#ffffff', label: 'Distance AB = ' + fmtN(dist, 4) }, { color: '#f2c14e', label: 'Midpoint M = (' + fmtN(mx, 3) + ', ' + fmtN(my, 3) + ')' }];
    }
  });

  GX.push({
    id: 'system2', grp: 'alg', label: 'Linear System (2 lines)',
    inputs: [{ k: 'a1', l: 'a₁', v: 1, r: 0 }, { k: 'b1', l: 'b₁', v: 1, r: 0 }, { k: 'c1', l: 'c₁', v: 5, r: 0 }, { k: 'a2', l: 'a₂', v: 1, r: 1 }, { k: 'b2', l: 'b₂', v: -1, r: 1 }, { k: 'c2', l: 'c₂', v: 1, r: 1 }],
    presets: [['x+y=5, x−y=1', { a1: 1, b1: 1, c1: 5, a2: 1, b2: -1, c2: 1 }], ['Parallel', { a1: 1, b1: 1, c1: 2, a2: 2, b2: 2, c2: 8 }], ['Same line', { a1: 1, b1: -1, c1: 1, a2: 2, b2: -2, c2: 2 }]],
    plot(v, W, H) {
      const { a1, b1, c1, a2, b2, c2 } = v;
      if ((a1 === 0 && b1 === 0) || (a2 === 0 && b2 === 0)) bad(tx('graph_x_ab0', 'In each equation a and b cannot both be 0.'));
      const det = a1 * b2 - a2 * b1; let sol = null, note;
      if (Math.abs(det) > 1e-12) { sol = [(c1 * b2 - c2 * b1) / det, (a1 * c2 - a2 * c1) / det]; note = 'Intersection: x = ' + fmtN(sol[0], 4) + ', y = ' + fmtN(sol[1], 4); }
      else if (Math.abs(a1 * c2 - a2 * c1) < 1e-9 && Math.abs(b1 * c2 - b2 * c1) < 1e-9) note = 'Same line — infinitely many solutions';
      else note = 'Parallel lines — no solution';
      const xs = [-6, 6], ys = [-6, 6]; if (sol) { const R = Math.max(Math.abs(sol[0]), Math.abs(sol[1]), 3) * 1.6; xs[0] = sol[0] - R; xs[1] = sol[0] + R; ys[0] = sol[1] - R; ys[1] = sol[1] + R; }
      const bx = box(xs, ys, { eq: true, pad: 0, W, H }), tp = view(bx, W, H), acc = accentColor();
      lineABC(tp, a1, b1, c1, bx, acc); lineABC(tp, a2, b2, c2, bx, '#5a9ad8');
      if (sol) dot(tp, sol[0], sol[1], '#ffffff', '(' + fmtN(sol[0], 3) + ', ' + fmtN(sol[1], 3) + ')');
      return [{ color: acc, label: fmtN(a1) + 'x ' + sg(b1) + 'y = ' + fmtN(c1) }, { color: '#5a9ad8', label: fmtN(a2) + 'x ' + sg(b2) + 'y = ' + fmtN(c2) }, { color: '#ffffff', label: note }];
    }
  });

  GX.push({
    id: 'ellipse', grp: 'alg', label: 'Circle / Ellipse',
    inputs: [{ k: 'h', l: 'h', v: 0, r: 0 }, { k: 'k', l: 'k', v: 0, r: 0 }, { k: 'a', l: 'a (x-radius)', v: 4, r: 1, min: 0.01 }, { k: 'b', l: 'b (y-radius)', v: 3, r: 1, min: 0.01 }],
    presets: [['Circle r=3', { h: 0, k: 0, a: 3, b: 3 }], ['Ellipse 5×3', { h: 0, k: 0, a: 5, b: 3 }], ['Tall 2×4', { h: 1, k: 1, a: 2, b: 4 }]],
    plot(v, W, H) {
      const { h, k, a, b } = v, pts = []; for (let i = 0; i <= 240; i++) { const th = i / 240 * 2 * Math.PI; pts.push([h + a * Math.cos(th), k + b * Math.sin(th)]); }
      const bx = box([h - a, h + a], [k - b, k + b], { zero: true, eq: true, pad: 0.2, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(pts, tp, acc, bx); dot(tp, h, k, '#ffffff', 'C', 8, 10);
      const circle = Math.abs(a - b) < 1e-9, major = Math.max(a, b), c = Math.sqrt(Math.abs(a * a - b * b)), horiz = a >= b;
      if (!circle) { dot(tp, horiz ? h - c : h, horiz ? k : k - c, '#3fbf6f', 'F₁', 8, -10); dot(tp, horiz ? h + c : h, horiz ? k : k + c, '#3fbf6f', 'F₂', 8, -10); }
      const area = Math.PI * a * b, per = Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
      return [{ color: acc, label: circle ? '(x ' + sg(-h) + ')² + (y ' + sg(-k) + ')² = ' + fmtN(a * a, 4) : '(x−' + fmtN(h, 3) + ')²/' + fmtN(a * a, 3) + ' + (y−' + fmtN(k, 3) + ')²/' + fmtN(b * b, 3) + ' = 1' },
        { color: '#ffffff', label: 'Centre (' + fmtN(h, 3) + ', ' + fmtN(k, 3) + ') · ' + (circle ? 'radius ' + fmtN(a, 4) : 'a = ' + fmtN(a, 3) + ', b = ' + fmtN(b, 3)) },
        { color: '#3fbf6f', label: circle ? 'Circle: e = 0' : 'Foci distance c = ' + fmtN(c, 4) + ' · eccentricity e = ' + fmtN(c / major, 4) },
        { color: '#f2c14e', label: 'Area = ' + fmtN(area, 4) + ' · ' + (circle ? 'circumference' : 'perimeter ≈') + ' ' + fmtN(per, 4) }];
    }
  });

  GX.push({
    id: 'rootsunity', grp: 'alg', label: 'Roots of Unity (zⁿ = 1)',
    inputs: [{ k: 'n', l: 'n', v: 6, min: 1, max: 60, int: true }],
    presets: [['n = 3', { n: 3 }], ['n = 4', { n: 4 }], ['n = 5', { n: 5 }], ['n = 8', { n: 8 }], ['n = 12', { n: 12 }]],
    plot(v, W, H) {
      const n = v.n, bx = box([-1, 1], [-1, 1], { eq: true, pad: 0.3, W, H }), tp = view(bx, W, H), acc = accentColor(), ring = [], pts = [];
      for (let i = 0; i <= 200; i++) ring.push([Math.cos(i / 200 * 2 * Math.PI), Math.sin(i / 200 * 2 * Math.PI)]);
      poly(ring, tp, 'rgba(255,255,255,0.35)', bx, { lw: 1.4 });
      for (let j = 0; j < n; j++) pts.push([Math.cos(2 * Math.PI * j / n), Math.sin(2 * Math.PI * j / n)]);
      if (n > 1) poly(pts.concat([pts[0]]), tp, acc, bx, { lw: 2 });
      pts.forEach((p, j) => dot(tp, p[0], p[1], PIE_COLORS[j % PIE_COLORS.length], n <= 12 ? 'z' + j : '', p[0] >= 0 ? 8 : -8, p[1] >= 0 ? -9 : 9));
      const lg = [{ color: acc, label: n + ' roots of zⁿ = 1: z_k = cos(2πk/' + n + ') + i·sin(2πk/' + n + '), k = 0…' + (n - 1) },
        { color: '#5a9ad8', label: 'Angle between neighbours = ' + fmtN(360 / n, 3) + '° · sum of all roots = 0' }];
      if (n <= 6) lg.push({ color: '#3fbf6f', label: pts.map(p => fmtComplexStr(p[0], p[1])).join('  ·  ') });
      return lg;
    }
  });

  GX.push({
    id: 'inverse', grp: 'alg', label: 'Function & Inverse',
    inputs: [{ k: 'f', l: 'f(x)', t: 'f', v: 'x^3 + 1' }, { k: 'x0', l: 'x from', v: -2, r: 0 }, { k: 'x1', l: 'to', v: 2, r: 0 }],
    presets: [['x³+1', { gx_inverse_f: 'x^3 + 1' }], ['2x+1', { gx_inverse_f: '2x+1' }], ['e^x', { gx_inverse_f: 'exp(x)' }], ['√x', { gx_inverse_f: 'sqrt(x)' }], ['x²', { gx_inverse_f: 'x^2' }]],
    plot(v, W, H) {
      if (v.x0 >= v.x1) bad(t('graph_error_range'));
      const f = v.f, pts = samplePts(f, v.x0, v.x1, 400).filter(p => isFinite(p[1]) && Math.abs(p[1]) < 1e4);
      if (pts.length < 2) bad(tx('graph_x_noval', 'The function has no real values on this range.'));
      const inv = pts.map(p => [p[1], p[0]]), all = pts.concat(inv);
      const bx = box(all.map(p => p[0]), all.map(p => p[1]), { eq: true, pad: 0.1, zero: true, W, H }), tp = view(bx, W, H), acc = accentColor();
      const lo = Math.min(bx.x0, bx.y0), hi = Math.max(bx.x1, bx.y1);
      seg(tp, lo, lo, hi, hi, 'rgba(255,255,255,0.55)', true);
      poly(inv, tp, '#5a9ad8', bx, { brk: true }); poly(pts, tp, acc, bx, { brk: true });
      const mono = pts.every((p, i) => !i || p[1] >= pts[i - 1][1]) || pts.every((p, i) => !i || p[1] <= pts[i - 1][1]);
      return [{ color: acc, label: 'f(x) = ' + esc(v['f$']) }, { color: '#5a9ad8', label: 'f⁻¹(x) — mirror image of f in the line y = x' },
        { color: '#ffffff', label: mono ? 'f is one-to-one on this range, so the inverse is a function' : 'f is not one-to-one here (fails the horizontal line test) — restrict the range' }];
    }
  });

  /* ---------- Trigonometry & Waves ---------- */
  GX.push({
    id: 'sinewave', grp: 'trig', label: 'Sine / Cosine Wave Explorer',
    inputs: [{ k: 'fn', l: 'Wave', t: 's', v: 'sin', opts: [['sin', 'A·sin(B(x−C)) + D'], ['cos', 'A·cos(B(x−C)) + D']] },
      { k: 'A', l: 'A', v: 2, r: 0 }, { k: 'B', l: 'B', v: 1, r: 0 }, { k: 'C', l: 'C', v: 0, r: 1 }, { k: 'D', l: 'D', v: 0, r: 1 }],
    presets: [['Basic', { gx_sinewave_A: 1, gx_sinewave_B: 1, gx_sinewave_C: 0, gx_sinewave_D: 0 }], ['2sin(2x)', { gx_sinewave_A: 2, gx_sinewave_B: 2, gx_sinewave_C: 0, gx_sinewave_D: 0 }], ['Shifted', { gx_sinewave_A: 1.5, gx_sinewave_B: 1, gx_sinewave_C: 1, gx_sinewave_D: 1 }]],
    plot(v, W, H) {
      const { A, B, C, D } = v, F = v.fn === 'cos' ? Math.cos : Math.sin; if (B === 0) bad(tx('graph_x_b0', 'B cannot be 0.'));
      const P = 2 * Math.PI / Math.abs(B), x0 = C - 0.75 * P, x1 = C + 1.75 * P, f = x => A * F(B * (x - C)) + D;
      const ext = Math.abs(A) + Math.abs(D), bx = box([x0, x1], [-Math.max(ext, 1), Math.max(ext, 1)], { pad: 0.12, zero: true, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(F, bx.x0, bx.x1, 500), tp, 'rgba(255,255,255,0.4)', bx, { dash: true, lw: 1.5 });
      seg(tp, bx.x0, D, bx.x1, D, '#3fbf6f', true);
      poly(samplePts(f, bx.x0, bx.x1, 700), tp, acc, bx, { brk: true });
      return [{ color: acc, label: 'y = ' + fmtN(A) + '·' + v.fn + '(' + fmtN(B) + '(x ' + sg(-C).replace('+ ', '+ ') + ')) ' + sg(D) },
        { color: '#5a9ad8', label: 'Amplitude |A| = ' + fmtN(Math.abs(A), 4) + ' · Period 2π/|B| = ' + fmtN(P, 4) + ' · Frequency = ' + fmtN(1 / P, 4) },
        { color: '#3fbf6f', label: 'Phase shift C = ' + fmtN(C, 4) + ' · midline y = ' + fmtN(D, 4) },
        { color: 'rgba(255,255,255,0.6)', label: 'Dashed white = basic ' + v.fn + '(x) for comparison', dashed: true }];
    }
  });

  GX.push({
    id: 'fourier', grp: 'trig', label: 'Fourier Series (square / saw / triangle)',
    inputs: [{ k: 'wave', l: 'Wave', t: 's', v: 'square', opts: [['square', 'Square wave'], ['saw', 'Sawtooth wave'], ['tri', 'Triangle wave']] }, { k: 'n', l: 'Terms N', v: 5, min: 1, max: 60, int: true }],
    presets: [['N = 1', { gx_fourier_n: 1 }], ['N = 3', { gx_fourier_n: 3 }], ['N = 10', { gx_fourier_n: 10 }], ['N = 40', { gx_fourier_n: 40 }]],
    plot(v, W, H) {
      const N = v.n, w = v.wave, pi = Math.PI;
      const ideal = x => w === 'square' ? Math.sign(Math.sin(x)) : w === 'saw' ? ((x + pi) % (2 * pi) + 2 * pi) % (2 * pi) / pi - 1 : 2 / pi * Math.asin(Math.sin(x));
      const approx = x => { let s = 0; for (let j = 1; j <= N; j++) {
        if (w === 'square') s += Math.sin((2 * j - 1) * x) / (2 * j - 1);
        else if (w === 'saw') s += (j % 2 ? 1 : -1) * Math.sin(j * x) / j;
        else s += ((j - 1) % 2 ? -1 : 1) * Math.sin((2 * j - 1) * x) / Math.pow(2 * j - 1, 2); }
        return s * (w === 'square' ? 4 / pi : w === 'saw' ? 2 / pi : 8 / (pi * pi)); };
      const bx = box([-2 * pi, 2 * pi], [-1.3, 1.3], { pad: 0.03, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(ideal, bx.x0, bx.x1, 800), tp, 'rgba(255,255,255,0.45)', bx, { dash: true, lw: 1.6 });
      poly(samplePts(approx, bx.x0, bx.x1, 900), tp, acc, bx, { brk: true });
      const term = w === 'square' ? '(4/π)·Σ sin((2k−1)x)/(2k−1)' : w === 'saw' ? '(2/π)·Σ (−1)^(k+1)·sin(kx)/k' : '(8/π²)·Σ (−1)^(k−1)·sin((2k−1)x)/(2k−1)²';
      return [{ color: acc, label: 'Sum of first ' + N + ' term' + (N > 1 ? 's' : '') + ': ' + term }, { color: 'rgba(255,255,255,0.6)', label: 'Ideal ' + (w === 'square' ? 'square' : w === 'saw' ? 'sawtooth' : 'triangle') + ' wave', dashed: true },
        { color: '#5a9ad8', label: w === 'square' ? 'Notice the overshoot near the jumps (Gibbs phenomenon) — about 9%, however large N is' : 'More terms → the sum hugs the ideal wave more closely' }];
    }
  });

  GX.push({
    id: 'damped', grp: 'trig', label: 'Damped Oscillation (SHM)',
    inputs: [{ k: 'A', l: 'Amplitude A', v: 5, r: 0, min: 0.01 }, { k: 'b', l: 'Damping b', v: 0.3, r: 0, min: 0 }, { k: 'w', l: 'ω (rad/s)', v: 3, r: 1, min: 0.01 }, { k: 'T', l: 'Time (s)', v: 15, r: 1, min: 0.5 }],
    presets: [['Light damping', { gx_damped_b: 0.15 }], ['Heavy damping', { gx_damped_b: 0.8 }], ['No damping (SHM)', { gx_damped_b: 0 }]],
    plot(v, W, H) {
      const { A, b, w, T } = v, f = t0 => A * Math.exp(-b * t0) * Math.cos(w * t0), env = t0 => A * Math.exp(-b * t0);
      const bx = box([0, T], [-A, A], { pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(env, 0, T, 200), tp, '#3fbf6f', bx, { dash: true }); poly(samplePts(t0 => -env(t0), 0, T, 200), tp, '#3fbf6f', bx, { dash: true });
      poly(samplePts(f, 0, T, Math.min(3000, Math.max(600, Math.ceil(T * w * 14)))), tp, acc, bx);
      return [{ color: acc, label: 'x(t) = ' + fmtN(A) + '·e^(−' + fmtN(b) + 't)·cos(' + fmtN(w) + 't)' },
        { color: '#3fbf6f', label: 'Envelope ±A·e^(−bt)' + (b > 0 ? ' · amplitude falls to 37% after 1/b = ' + fmtN(1 / b, 3) + ' s' : ' · no damping, amplitude stays constant'), dashed: true },
        { color: '#5a9ad8', label: 'Period T = 2π/ω = ' + fmtN(2 * Math.PI / w, 4) + ' s · frequency f = ' + fmtN(w / (2 * Math.PI), 4) + ' Hz' }];
    }
  });

  /* ---------- Calculus Tools ---------- */
  GX.push({
    id: 'tangent', grp: 'calc', label: 'Tangent & Normal at a Point',
    inputs: [{ k: 'f', l: 'f(x)', t: 'f', v: 'x^2' }, { k: 'p', l: 'x₀', v: 1, r: 0 }, { k: 'x0', l: 'View x from', v: -4, r: 1 }, { k: 'x1', l: 'to', v: 4, r: 1 }],
    presets: [['x² at 1', { gx_tangent_f: 'x^2', gx_tangent_p: 1 }], ['sin x at 1', { gx_tangent_f: 'sin(x)', gx_tangent_p: 1 }], ['x³ at 0.5', { gx_tangent_f: 'x^3', gx_tangent_p: 0.5 }], ['eˣ at 0', { gx_tangent_f: 'exp(x)', gx_tangent_p: 0 }]],
    plot(v, W, H) {
      if (v.x0 >= v.x1) bad(t('graph_error_range'));
      const f = v.f, p = v.p, y0 = f(p), m = numericDeriv(f, p, 1e-5 * Math.max(1, Math.abs(p)));
      if (!isFinite(y0) || !isFinite(m)) bad(tx('graph_x_undef', 'f(x) is not defined or not differentiable at x₀.'));
      const pts = samplePts(f, v.x0, v.x1, 500), yr = autoY([pts], v.x1 - v.x0, [y0]), bx = box([v.x0, v.x1], yr, { pad: 0.06, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(pts, tp, acc, bx, { brk: true });
      seg(tp, bx.x0, y0 + m * (bx.x0 - p), bx.x1, y0 + m * (bx.x1 - p), '#5a9ad8', false, 2.2);
      if (Math.abs(m) < 1e-9) seg(tp, p, bx.y0, p, bx.y1, '#3fbf6f', true); else seg(tp, bx.x0, y0 - (bx.x0 - p) / m, bx.x1, y0 - (bx.x1 - p) / m, '#3fbf6f', true);
      dot(tp, p, y0, '#ffffff', '(' + fmtN(p, 3) + ', ' + fmtN(y0, 3) + ')');
      return [{ color: acc, label: 'f(x) = ' + esc(v['f$']) }, { color: '#5a9ad8', label: "Tangent: y = " + fmtN(m, 4) + '(x ' + sg(-p) + ') ' + sg(y0) + " · slope f′(x₀) = " + fmtN(m, 4) },
        { color: '#3fbf6f', label: Math.abs(m) < 1e-9 ? 'Normal: the vertical line x = ' + fmtN(p, 3) : 'Normal slope = −1/f′ = ' + fmtN(-1 / m, 4), dashed: true }];
    }
  });

  GX.push({
    id: 'riemann', grp: 'calc', label: 'Riemann Sum (area by rectangles)',
    inputs: [{ k: 'f', l: 'f(x)', t: 'f', v: 'x^2' }, { k: 'a', l: 'a', v: 0, r: 0 }, { k: 'b', l: 'b', v: 3, r: 0 }, { k: 'n', l: 'n', v: 6, r: 0, min: 1, max: 200, int: true },
      { k: 'm', l: 'Method', t: 's', v: 'left', opts: [['left', 'Left rectangles'], ['right', 'Right rectangles'], ['mid', 'Midpoint rectangles'], ['trap', 'Trapezoids']] }],
    presets: [['x², n=6', { gx_riemann_f: 'x^2', gx_riemann_a: 0, gx_riemann_b: 3, gx_riemann_n: 6 }], ['sin x, n=10', { gx_riemann_f: 'sin(x)', gx_riemann_a: 0, gx_riemann_b: 3.1416, gx_riemann_n: 10 }], ['√x, n=20', { gx_riemann_f: 'sqrt(x)', gx_riemann_a: 0, gx_riemann_b: 4, gx_riemann_n: 20 }]],
    plot(v, W, H) {
      const { f, a, b, n, m } = v; if (a >= b) bad(t('graph_error_range'));
      const dx = (b - a) / n, rects = []; let sum = 0;
      for (let i = 0; i < n; i++) { const xl = a + i * dx, xr = xl + dx, yl = f(xl), yr = f(xr), ym = f((xl + xr) / 2);
        if (![yl, yr, ym].every(isFinite)) bad(tx('graph_x_noval', 'The function has no real values on this range.'));
        const hh = m === 'left' ? yl : m === 'right' ? yr : ym; sum += (m === 'trap' ? (yl + yr) / 2 : hh) * dx; rects.push([xl, xr, yl, yr, hh]); }
      const pad = (b - a) * 0.12, pts = samplePts(f, a - pad, b + pad, 400), yr2 = autoY([pts], (b - a) * 1.3, rects.map(r => r[4]).concat([0]));
      const bx = box([a - pad, b + pad], yr2.concat([0]), { pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      rects.forEach(r => { const q = m === 'trap' ? [[r[0], 0], [r[0], r[2]], [r[1], r[3]], [r[1], 0]] : [[r[0], 0], [r[0], r[4]], [r[1], r[4]], [r[1], 0]];
        fillPoly(q, tp, 'rgba(255,138,31,0.22)'); poly(q.concat([q[0]]), tp, 'rgba(255,138,31,0.8)', bx, { lw: 1.2 }); });
      poly(pts, tp, '#ffffff', bx, { brk: true, lw: 2.2 });
      const exact = numericIntegral(f, a, b, 2000);
      return [{ color: acc, label: (m === 'left' ? 'Left' : m === 'right' ? 'Right' : m === 'mid' ? 'Midpoint' : 'Trapezoid') + ' sum with n = ' + n + ': ' + fmtN(sum, 5) },
        { color: '#ffffff', label: 'Exact area ∫ f(x) dx from ' + fmtN(a, 3) + ' to ' + fmtN(b, 3) + ' ≈ ' + fmtN(exact, 5) },
        { color: '#5a9ad8', label: 'Error = ' + fmtN(Math.abs(sum - exact), 5) + ' — raise n to make it smaller' }];
    }
  });

  GX.push({
    id: 'areabetween', grp: 'calc', label: 'Area Between Two Curves',
    inputs: [{ k: 'f', l: 'f(x)', t: 'f', v: 'x + 2' }, { k: 'g', l: 'g(x)', t: 'f', v: 'x^2' }, { k: 'a', l: 'a', v: -1, r: 0 }, { k: 'b', l: 'b', v: 2, r: 0 }],
    presets: [['x+2 & x²', { gx_areabetween_f: 'x + 2', gx_areabetween_g: 'x^2', gx_areabetween_a: -1, gx_areabetween_b: 2 }], ['sin & cos', { gx_areabetween_f: 'sin(x)', gx_areabetween_g: 'cos(x)', gx_areabetween_a: 0.7854, gx_areabetween_b: 3.927 }], ['√x & x', { gx_areabetween_f: 'sqrt(x)', gx_areabetween_g: 'x', gx_areabetween_a: 0, gx_areabetween_b: 1 }]],
    plot(v, W, H) {
      const { f, g, a, b } = v; if (a >= b) bad(t('graph_error_range'));
      const pad = (b - a) * 0.2, pf = samplePts(f, a - pad, b + pad, 400), pg = samplePts(g, a - pad, b + pad, 400), yr = autoY([pf, pg], (b - a) * 1.4);
      const bx = box([a - pad, b + pad], yr, { pad: 0.06, W, H }), tp = view(bx, W, H), acc = accentColor();
      const up = [], dn = []; for (let i = 0; i <= 200; i++) { const x = a + (b - a) * i / 200, yf = f(x), yg = g(x); if (isFinite(yf) && isFinite(yg)) { up.push([x, yf]); dn.unshift([x, yg]); } }
      if (up.length > 2) fillPoly(up.concat(dn), tp, 'rgba(90,154,216,0.28)');
      poly(pf, tp, acc, bx, { brk: true }); poly(pg, tp, '#5a9ad8', bx, { brk: true });
      let area = 0; const N = 4000, dx = (b - a) / N, cross = [];
      for (let i = 0; i < N; i++) { const x = a + (i + 0.5) * dx; area += Math.abs(f(x) - g(x)) * dx;
        const d0 = f(a + i * dx) - g(a + i * dx), d1 = f(a + (i + 1) * dx) - g(a + (i + 1) * dx);
        if (isFinite(d0) && isFinite(d1) && d0 * d1 < 0 && cross.length < 4) cross.push(a + i * dx + dx * d0 / (d0 - d1)); }
      if (!isFinite(area)) bad(tx('graph_x_noval', 'The function has no real values on this range.'));
      cross.forEach(x => dot(tp, x, f(x), '#ffffff', '', 8, 0));
      return [{ color: acc, label: 'f(x) = ' + esc(v['f$']) }, { color: '#5a9ad8', label: 'g(x) = ' + esc(v['g$']) },
        { color: 'rgba(90,154,216,0.6)', label: 'Area between them from ' + fmtN(a, 3) + ' to ' + fmtN(b, 3) + ' ≈ ' + fmtN(area, 5) },
        { color: '#ffffff', label: cross.length ? 'Curves cross at x ≈ ' + cross.map(x => fmtN(x, 3)).join(', ') : 'The curves do not cross inside [a, b]' }];
    }
  });

  GX.push({
    id: 'newton', grp: 'calc', label: "Newton's Method (root finding)",
    inputs: [{ k: 'f', l: 'f(x)', t: 'f', v: 'x^2 - 2' }, { k: 'x0', l: 'Start x₀', v: 3, r: 0 }, { k: 'n', l: 'Steps', v: 5, r: 0, min: 1, max: 12, int: true }],
    presets: [['√2', { gx_newton_f: 'x^2 - 2', gx_newton_x0: 3, gx_newton_n: 5 }], ['x³−x−2', { gx_newton_f: 'x^3 - x - 2', gx_newton_x0: 2, gx_newton_n: 5 }], ['cos x − x', { gx_newton_f: 'cos(x) - x', gx_newton_x0: 2, gx_newton_n: 5 }]],
    plot(v, W, H) {
      const f = v.f; let x = v.x0; const its = [x], st = [];
      for (let i = 0; i < v.n; i++) { const fx = f(x), d = numericDeriv(f, x, 1e-6 * Math.max(1, Math.abs(x)));
        if (!isFinite(fx) || !isFinite(d) || Math.abs(d) < 1e-10) bad(tx('graph_x_flat', 'f′(x) is zero or undefined at x = ') + fmtN(x, 4) + ' — ' + tx('graph_x_trystart', 'try another start.'));
        const xn = x - fx / d; st.push([x, fx, xn]); x = xn; its.push(x); if (Math.abs(x) > 1e6) bad(tx('graph_x_diverge', 'The iteration runs away — try another start.')); }
      const lo = Math.min.apply(null, its), hi = Math.max.apply(null, its), pad = Math.max(hi - lo, 1) * 0.35, x0 = lo - pad, x1 = hi + pad;
      const pts = samplePts(f, x0, x1, 500), yr = autoY([pts], x1 - x0, [0].concat(st.map(s => s[1]))), bx = box([x0, x1], yr, { pad: 0.06, zero: true, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(pts, tp, acc, bx, { brk: true });
      st.forEach((s, i) => { const c = PIE_COLORS[(i + 1) % PIE_COLORS.length]; seg(tp, s[0], 0, s[0], s[1], c, true, 1.3); seg(tp, s[0], s[1], s[2], 0, c, false, 1.8); });
      its.forEach((xi, i) => { if (i < 7) dot(tp, xi, 0, '#ffffff', 'x' + String(i).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[d]), 0, 14); });
      const last = its[its.length - 1];
      return [{ color: acc, label: 'f(x) = ' + esc(v['f$']) + ' · xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ)' }, { color: '#ffffff', label: 'Estimate after ' + v.n + ' step' + (v.n > 1 ? 's' : '') + ': x ≈ ' + fmtN(last, 8) },
        { color: '#5a9ad8', label: '|f(x)| at the estimate = ' + fmtN(Math.abs(f(last)), 8) + (Math.abs(f(last)) < 1e-6 ? ' — converged' : '') }];
    }
  });

  const TAYLOR = {
    sin: { name: 'sin x', f: Math.sin, c: k => k % 2 ? (((k - 1) / 2) % 2 ? -1 : 1) / fact(k) : 0, x: [-7, 7], y: [-3, 3] },
    cos: { name: 'cos x', f: Math.cos, c: k => k % 2 ? 0 : ((k / 2) % 2 ? -1 : 1) / fact(k), x: [-7, 7], y: [-3, 3] },
    exp: { name: 'eˣ', f: Math.exp, c: k => 1 / fact(k), x: [-3, 3], y: [-2, 15] },
    ln: { name: 'ln(1+x)', f: x => Math.log(1 + x), c: k => k === 0 ? 0 : (k % 2 ? 1 : -1) / k, x: [-0.95, 4], y: [-4, 3] },
    atan: { name: 'tan⁻¹x', f: Math.atan, c: k => k % 2 ? (((k - 1) / 2) % 2 ? -1 : 1) / k : 0, x: [-4, 4], y: [-3, 3] },
    geo: { name: '1/(1−x)', f: x => 1 / (1 - x), c: () => 1, x: [-2, 0.95], y: [-3, 7] }
  };
  GX.push({
    id: 'taylor', grp: 'calc', label: 'Taylor / Maclaurin Series',
    inputs: [{ k: 'fn', l: 'Function', t: 's', v: 'sin', opts: [['sin', 'sin x'], ['cos', 'cos x'], ['exp', 'eˣ'], ['ln', 'ln(1+x)'], ['atan', 'tan⁻¹ x'], ['geo', '1/(1−x)']] }, { k: 'n', l: 'Degree n', v: 5, min: 0, max: 15, int: true }],
    presets: [['n = 1', { gx_taylor_n: 1 }], ['n = 3', { gx_taylor_n: 3 }], ['n = 7', { gx_taylor_n: 7 }], ['n = 13', { gx_taylor_n: 13 }]],
    plot(v, W, H) {
      const T = TAYLOR[v.fn], n = v.n, P = x => { let s = 0, p = 1; for (let k = 0; k <= n; k++) { s += T.c(k) * p; p *= x; } return s; };
      const bx = { x0: T.x[0], x1: T.x[1], y0: T.y[0], y1: T.y[1] }, tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(T.f, bx.x0, bx.x1, 500), tp, acc, bx, { brk: true, lw: 2.8 }); poly(samplePts(P, bx.x0, bx.x1, 500), tp, '#5a9ad8', bx, { brk: true });
      const terms = []; for (let k = 0; k <= n && terms.length < 6; k++) { const c = T.c(k); if (!c) continue; const ca = Math.abs(c), cs = (ca === 1 && k > 0) ? '' : fmtN(ca, 5), xs = k === 0 ? '' : k === 1 ? 'x' : 'x' + supNum(k); terms.push((terms.length ? (c < 0 ? ' − ' : ' + ') : (c < 0 ? '−' : '')) + cs + xs); }
      return [{ color: acc, label: 'f(x) = ' + T.name }, { color: '#5a9ad8', label: 'Pₙ(x), n = ' + n + ':  ' + terms.join('') + (n >= 1 && terms.length >= 6 ? ' …' : '') },
        { color: '#ffffff', label: 'Higher degree → the polynomial matches f over a wider interval around x = 0' }];
    }
  });

  /* ---------- Physics & Science ---------- */
  GX.push({
    id: 'projectile', grp: 'phys', label: 'Projectile Trajectory',
    inputs: [{ k: 'v0', l: 'v₀ (m/s)', v: 20, r: 0, min: 0.1 }, { k: 'ang', l: 'Angle (°)', v: 45, r: 0, min: -89, max: 90 }, { k: 'h0', l: 'Height h₀ (m)', v: 0, r: 1, min: 0 }, { k: 'g', l: 'g (m/s²)', v: 9.8, r: 1, min: 0.1 }],
    presets: [['45° ground', { gx_projectile_ang: 45, gx_projectile_h0: 0 }], ['30°', { gx_projectile_ang: 30, gx_projectile_h0: 0 }], ['60°', { gx_projectile_ang: 60, gx_projectile_h0: 0 }], ['From a 20 m cliff', { gx_projectile_ang: 20, gx_projectile_h0: 20 }]],
    plot(v, W, H) {
      const { v0, ang, h0, g } = v, th = ang * Math.PI / 180, vx = v0 * Math.cos(th), vy = v0 * Math.sin(th);
      const T = (vy + Math.sqrt(vy * vy + 2 * g * h0)) / g, R = vx * T, Hm = h0 + (vy > 0 ? vy * vy / (2 * g) : 0), pts = [];
      for (let i = 0; i <= 200; i++) { const t0 = T * i / 200; pts.push([vx * t0, h0 + vy * t0 - 0.5 * g * t0 * t0]); }
      const bx = box([0, R], [0, Hm], { eq: true, pad: 0.15, minSpan: 1, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(pts, tp, acc, bx, { lw: 2.8 });
      const s = tp(0, h0); drawArrow(s[0], s[1], s[0] + 38 * Math.cos(th), s[1] - 38 * Math.sin(th), '#5a9ad8', 2.2);
      if (vy > 0) { const tp2 = vy / g; dot(tp, vx * tp2, Hm, '#ffffff', 'peak'); }
      dot(tp, R, 0, '#3fbf6f', 'lands', -8, -10);
      const vyEnd = vy - g * T;
      return [{ color: acc, label: 'x = v₀cosθ·t , y = h₀ + v₀sinθ·t − ½gt²' }, { color: '#5a9ad8', label: 'Time of flight = ' + fmtN(T, 3) + ' s · Range = ' + fmtN(R, 3) + ' m' },
        { color: '#ffffff', label: 'Maximum height = ' + fmtN(Hm, 3) + ' m' + (vy > 0 ? ' at t = ' + fmtN(vy / g, 3) + ' s' : '') }, { color: '#3fbf6f', label: 'Impact speed = ' + fmtN(Math.hypot(vx, vyEnd), 3) + ' m/s' }];
    }
  });

  GX.push({
    id: 'vtgraph', grp: 'phys', label: 'Velocity–Time Graph',
    inputs: [{ k: 'u', l: 'u (m/s)', v: 5, r: 0 }, { k: 'a', l: 'a (m/s²)', v: 2, r: 0 }, { k: 'T', l: 'Time (s)', v: 6, r: 0, min: 0.1 }],
    presets: [['Speeding up', { gx_vtgraph_u: 5, gx_vtgraph_a: 2, gx_vtgraph_T: 6 }], ['Braking', { gx_vtgraph_u: 20, gx_vtgraph_a: -4, gx_vtgraph_T: 8 }], ['Constant speed', { gx_vtgraph_u: 10, gx_vtgraph_a: 0, gx_vtgraph_T: 5 }]],
    plot(v, W, H) {
      const { u, a, T } = v, vT = u + a * T, s = u * T + 0.5 * a * T * T, tz = a !== 0 ? -u / a : null, rev = tz !== null && tz > 0 && tz < T;
      const bx = box([0, T], [u, vT], { zero: true, pad: 0.15, W, H }), tp = view(bx, W, H), acc = accentColor();
      fillPoly(rev ? [[0, 0], [0, u], [tz, 0]] : [[0, 0], [0, u], [T, vT], [T, 0]], tp, 'rgba(255,138,31,0.25)');
      if (rev) fillPoly([[tz, 0], [T, vT], [T, 0]], tp, 'rgba(90,154,216,0.25)');
      seg(tp, 0, u, T, vT, acc, false, 3); dot(tp, 0, u, '#ffffff', 'u = ' + fmtN(u, 3), 8, -10); dot(tp, T, vT, '#ffffff', 'v = ' + fmtN(vT, 3), -8, -10);
      const dist = rev ? Math.abs(0.5 * u * tz) + Math.abs(0.5 * vT * (T - tz)) : Math.abs(s);
      return [{ color: acc, label: 'v = u + at = ' + fmtN(u) + ' ' + sg(a) + 't · slope = acceleration = ' + fmtN(a, 4) + ' m/s²' },
        { color: 'rgba(255,138,31,0.8)', label: 'Area under the graph = displacement s = ut + ½at² = ' + fmtN(s, 4) + ' m' },
        { color: '#5a9ad8', label: 'Final velocity = ' + fmtN(vT, 4) + ' m/s · average velocity = ' + fmtN(s / T, 4) + ' m/s' + (rev ? ' · direction reverses at t = ' + fmtN(tz, 3) + ' s, distance travelled = ' + fmtN(dist, 4) + ' m' : '') }];
    }
  });

  GX.push({
    id: 'ohm', grp: 'phys', label: "Ohm's Law (V–I graph)",
    inputs: [{ k: 'r1', l: 'R₁ (Ω)', v: 10, r: 0, min: 0.01 }, { k: 'r2', l: 'R₂ (Ω)', v: 20, r: 0, min: 0.01 }, { k: 'V', l: 'Max V (volts)', v: 12, r: 1, min: 0.1 }],
    presets: [['10 Ω & 20 Ω', { gx_ohm_r1: 10, gx_ohm_r2: 20 }], ['Equal 15 Ω', { gx_ohm_r1: 15, gx_ohm_r2: 15 }], ['5 Ω & 50 Ω', { gx_ohm_r1: 5, gx_ohm_r2: 50 }]],
    plot(v, W, H) {
      const { r1, r2, V } = v, rs = r1 + r2, rp = r1 * r2 / (r1 + r2), lines = [[r1, 'R₁', accentColor()], [r2, 'R₂', '#5a9ad8'], [rs, 'Series', '#e8548b'], [rp, 'Parallel', '#3fbf6f']];
      const imax = V / Math.min(r1, r2, rp), bx = box([0, V], [0, imax], { zero: true, pad: 0.06, W, H }), tp = view(bx, W, H);
      lines.forEach(l => { seg(tp, 0, 0, V, V / l[0], l[2], false, 2.6); dot(tp, V, V / l[0], l[2], l[1], -8, -9); });
      return lines.map(l => ({ color: l[2], label: l[1] + ' = ' + fmtN(l[0], 4) + ' Ω → I at ' + fmtN(V, 3) + ' V = ' + fmtN(V / l[0], 4) + ' A (slope = 1/R)' }));
    }
  });

  GX.push({
    id: 'decay', grp: 'phys', label: 'Radioactive Decay (half-life)',
    inputs: [{ k: 'N0', l: 'N₀', v: 1000, r: 0, min: 0.01 }, { k: 'th', l: 'Half-life T½', v: 5, r: 0, min: 0.01 }, { k: 'T', l: 'Time', v: 25, r: 1, min: 0.1 }],
    presets: [['Carbon-14 (5730 y)', { gx_decay_N0: 100, gx_decay_th: 5730, gx_decay_T: 28650 }], ['Short (T½ = 2)', { gx_decay_N0: 1000, gx_decay_th: 2, gx_decay_T: 12 }], ['Default', { gx_decay_N0: 1000, gx_decay_th: 5, gx_decay_T: 25 }]],
    plot(v, W, H) {
      const { N0, th, T } = v, f = t0 => N0 * Math.pow(0.5, t0 / th), lam = Math.LN2 / th, bx = box([0, T], [0, N0], { zero: true, pad: 0.07, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(f, 0, T, 400), tp, acc, bx, { lw: 2.8 });
      for (let k = 1; k <= 6 && k * th <= T; k++) { seg(tp, k * th, 0, k * th, f(k * th), 'rgba(255,255,255,0.35)', true, 1.2); seg(tp, 0, f(k * th), k * th, f(k * th), 'rgba(255,255,255,0.35)', true, 1.2); dot(tp, k * th, f(k * th), '#ffffff', k === 1 ? 'N₀/2' : k === 2 ? 'N₀/4' : k === 3 ? 'N₀/8' : '', 8, -10); }
      return [{ color: acc, label: 'N(t) = N₀·(½)^(t/T½) = N₀·e^(−λt)' }, { color: '#5a9ad8', label: 'Decay constant λ = ln2 / T½ = ' + fmtN(lam, 6) + ' · mean life τ = 1/λ = ' + fmtN(1 / lam, 4) },
        { color: '#ffffff', label: 'After ' + fmtN(T / th, 3) + ' half-lives: N = ' + fmtN(f(T), 4) + ' (' + fmtN(100 * f(T) / N0, 3) + '% left)' }];
    }
  });

  /* ---------- Physics & Science: 21 more graphs ---------- */
  const axT = (W, H, xl, yl) => {
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '600 10px Inter, sans-serif'; ctx.textBaseline = 'alphabetic';
    if (xl) { ctx.textAlign = 'right'; ctx.fillText(xl, W - 6, H - 5); }
    if (yl) { ctx.textAlign = 'left'; ctx.fillText(yl, 6, 12); }
    ctx.restore();
  };

  GX.push({
    id: 'shm', grp: 'phys', label: 'Simple Harmonic Motion (x, v, a)',
    inputs: [{ k: 'A', l: 'Amplitude A (m)', v: 2, r: 0, min: 0.001 }, { k: 'T', l: 'Period T (s)', v: 2, r: 0, min: 0.01 }, { k: 'phi', l: 'Phase φ (°)', v: 0, r: 1 }, { k: 'n', l: 'Cycles', v: 2, r: 1, min: 0.25, max: 10 }],
    presets: [['Start at maximum', { gx_shm_phi: 0 }], ['Start at centre', { gx_shm_phi: -90 }], ['Fast (T = 1 s)', { gx_shm_T: 1 }], ['Slow (T = 4 s)', { gx_shm_T: 4 }]],
    plot(v, W, H) {
      const { A, T, phi, n } = v, w = 2 * Math.PI / T, p = phi * Math.PI / 180, tm = n * T;
      const fx = t => A * Math.cos(w * t + p), fv = t => -A * w * Math.sin(w * t + p), fa = t => -A * w * w * Math.cos(w * t + p);
      const bx = box([0, tm], [A * w * w, -A * w * w], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(fa, 0, tm, 500), tp, '#e8548b', bx, { lw: 2 }); poly(samplePts(fv, 0, tm, 500), tp, '#5a9ad8', bx, { lw: 2 }); poly(samplePts(fx, 0, tm, 500), tp, acc, bx, { lw: 2.8 });
      axT(W, H, 't (s)', '');
      return [{ color: acc, label: 'Displacement x = A cos(ωt + φ) · amplitude ' + fmtN(A, 4) + ' m · ω = 2π/T = ' + fmtN(w, 4) + ' rad/s' },
        { color: '#5a9ad8', label: 'Velocity v = −Aω sin(ωt + φ) · maximum ' + fmtN(A * w, 4) + ' m/s (at the centre)' },
        { color: '#e8548b', label: 'Acceleration a = −ω²x · maximum ' + fmtN(A * w * w, 4) + ' m/s² (at the ends)' },
        { color: '#ffffff', label: 'Frequency f = 1/T = ' + fmtN(1 / T, 4) + ' Hz · v is 90° ahead of x, a is opposite to x' }];
    }
  });

  GX.push({
    id: 'freefall', grp: 'phys', label: 'Free Fall (height & speed)',
    inputs: [{ k: 'h0', l: 'Height h₀ (m)', v: 80, r: 0, min: 0.1 }, { k: 'v0', l: 'Downward speed v₀ (m/s)', v: 0, r: 0, min: 0 }, { k: 'g', l: 'g (m/s²)', v: 9.8, r: 1, min: 0.1 }],
    presets: [['Dropped from 80 m', { gx_freefall_h0: 80, gx_freefall_v0: 0 }], ['Thrown down 10 m/s', { gx_freefall_h0: 80, gx_freefall_v0: 10 }], ['On the Moon (1.62)', { gx_freefall_h0: 80, gx_freefall_v0: 0, gx_freefall_g: 1.62 }]],
    plot(v, W, H) {
      const { h0, v0, g } = v, T = (-v0 + Math.sqrt(v0 * v0 + 2 * g * h0)) / g, h = t => h0 - v0 * t - 0.5 * g * t * t, sp = t => v0 + g * t, vEnd = sp(T);
      const bx = box([0, T], [0, h0, vEnd], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(sp, 0, T, 300), tp, '#5a9ad8', bx, { lw: 2.4 }); poly(samplePts(h, 0, T, 300), tp, acc, bx, { lw: 2.8 });
      dot(tp, 0, h0, '#ffffff', 'h₀', 8, -10); dot(tp, T, 0, '#3fbf6f', 'lands', -8, -10); dot(tp, T, vEnd, '#ffffff', 'v', -8, -10);
      axT(W, H, 't (s)', 'm  ·  m/s');
      const out = [{ color: acc, label: 'Height h = h₀ − v₀t − ½gt²' }, { color: '#5a9ad8', label: 'Speed v = v₀ + gt (slope = g = ' + fmtN(g, 3) + ' m/s²)' },
        { color: '#3fbf6f', label: 'Time to reach the ground = ' + fmtN(T, 4) + ' s · impact speed = ' + fmtN(vEnd, 4) + ' m/s' }];
      if (v0 === 0) out.push({ color: '#ffffff', label: 'Dropped from rest: distances in equal seconds are in the ratio 1 : 3 : 5 … (total ∝ t²)' });
      return out;
    }
  });

  GX.push({
    id: 'pendulum', grp: 'phys', label: 'Simple Pendulum (angle vs time)',
    inputs: [{ k: 'L', l: 'Length L (m)', v: 1, r: 0, min: 0.01 }, { k: 'th0', l: 'Start angle (°)', v: 30, r: 0, min: 0.1, max: 170 }, { k: 'g', l: 'g (m/s²)', v: 9.8, r: 1, min: 0.1 }, { k: 'n', l: 'Cycles', v: 3, r: 1, min: 1, max: 8 }],
    presets: [['Small swing (10°)', { gx_pendulum_th0: 10 }], ['30°', { gx_pendulum_th0: 30 }], ['Big swing (90°)', { gx_pendulum_th0: 90 }], ['Very big (150°)', { gx_pendulum_th0: 150 }]],
    plot(v, W, H) {
      const { L, th0, g, n } = v, w0 = Math.sqrt(g / L), T0 = 2 * Math.PI / w0, a0 = th0 * Math.PI / 180;
      let a = 1, b = Math.cos(a0 / 2); for (let i = 0; i < 30; i++) { const an = (a + b) / 2, bn = Math.sqrt(a * b); a = an; b = bn; }
      const Tex = T0 / a, tm = n * Tex, N = Math.max(600, Math.ceil(n * 160)), dt = tm / N, acc = accentColor(), ex = [];
      let th = a0, om = 0; const acc2 = (x) => -w0 * w0 * Math.sin(x);
      for (let i = 0; i <= N; i++) {
        ex.push([i * dt, th * 180 / Math.PI]);
        const k1t = om, k1o = acc2(th), k2t = om + 0.5 * dt * k1o, k2o = acc2(th + 0.5 * dt * k1t), k3t = om + 0.5 * dt * k2o, k3o = acc2(th + 0.5 * dt * k2t), k4t = om + dt * k3o, k4o = acc2(th + dt * k3t);
        th += dt / 6 * (k1t + 2 * k2t + 2 * k3t + k4t); om += dt / 6 * (k1o + 2 * k2o + 2 * k3o + k4o);
      }
      const bx = box([0, tm], [th0, -th0], { zero: true, pad: 0.12, W, H }), tp = view(bx, W, H);
      poly(samplePts(t0 => th0 * Math.cos(w0 * t0), 0, tm, 500), tp, '#5a9ad8', bx, { lw: 2, dash: true }); poly(ex, tp, acc, bx, { lw: 2.8 });
      axT(W, H, 't (s)', 'angle (°)');
      return [{ color: acc, label: 'Exact motion (numerical) · period T = ' + fmtN(Tex, 4) + ' s' },
        { color: '#5a9ad8', label: 'Small-angle formula θ = θ₀cos(ωt) · T₀ = 2π√(L/g) = ' + fmtN(T0, 4) + ' s', dashed: true },
        { color: '#ffffff', label: 'Big swings take longer: T is ' + fmtN((Tex / T0 - 1) * 100, 3) + '% more than T₀ at ' + fmtN(th0, 3) + '° (the formula T₀ is only accurate below ~15°)' },
        { color: '#3fbf6f', label: 'T does not depend on the mass · frequency f = ' + fmtN(1 / Tex, 4) + ' Hz' }];
    }
  });

  GX.push({
    id: 'spring', grp: 'phys', label: "Hooke's Law (spring F–x)",
    inputs: [{ k: 'k', l: 'k (N/m)', v: 50, r: 0, min: 0.01 }, { k: 'xm', l: 'Max stretch (m)', v: 0.4, r: 0, min: 0.001 }, { k: 'xp', l: 'Stretch x (m)', v: 0.25, r: 1, min: 0 }],
    presets: [['Soft spring (20)', { gx_spring_k: 20 }], ['Stiff spring (200)', { gx_spring_k: 200 }], ['Default', { gx_spring_k: 50, gx_spring_xm: 0.4, gx_spring_xp: 0.25 }]],
    plot(v, W, H) {
      const { k, xm, xp } = v; if (xp > xm) bad(tx('graph_x_spring_x', 'Stretch x must not be more than the maximum stretch.'));
      const bx = box([0, xm], [0, k * xm], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      fillPoly([[0, 0], [xp, 0], [xp, k * xp]], tp, 'rgba(255,138,31,0.28)'); seg(tp, 0, 0, xm, k * xm, acc, false, 3);
      seg(tp, xp, 0, xp, k * xp, 'rgba(255,255,255,0.4)', true, 1.2); seg(tp, 0, k * xp, xp, k * xp, 'rgba(255,255,255,0.4)', true, 1.2); dot(tp, xp, k * xp, '#ffffff', 'F = ' + fmtN(k * xp, 3) + ' N', -8, -10);
      axT(W, H, 'x (m)', 'F (N)');
      return [{ color: acc, label: 'F = kx · slope = spring constant k = ' + fmtN(k, 4) + ' N/m (a straight line through the origin)' },
        { color: 'rgba(255,138,31,0.8)', label: 'Shaded triangle = work done = stored energy = ½kx² = ' + fmtN(0.5 * k * xp * xp, 4) + ' J' },
        { color: '#ffffff', label: 'At x = ' + fmtN(xp, 4) + ' m the force is ' + fmtN(k * xp, 4) + ' N · doubling x doubles F but quadruples the energy' }];
    }
  });

  GX.push({
    id: 'incline', grp: 'phys', label: 'Inclined Plane (forces vs angle)',
    inputs: [{ k: 'm', l: 'Mass (kg)', v: 10, r: 0, min: 0.01 }, { k: 'mu', l: 'Friction μ', v: 0.3, r: 0, min: 0 }, { k: 'g', l: 'g (m/s²)', v: 9.8, r: 1, min: 0.1 }, { k: 'th', l: 'Angle (°)', v: 30, r: 1, min: 0, max: 89 }],
    presets: [['Smooth (μ = 0)', { gx_incline_mu: 0 }], ['Wood (μ = 0.3)', { gx_incline_mu: 0.3 }], ['Rough (μ = 0.7)', { gx_incline_mu: 0.7 }]],
    plot(v, W, H) {
      const { m, mu, g, th } = v, r = Math.PI / 180, W0 = m * g, thS = Math.atan(mu) / r;
      const bx = box([0, 90], [0, W0], { zero: true, pad: 0.06, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(x => W0 * Math.cos(x * r), 0, 90, 180), tp, '#5a9ad8', bx, { lw: 2.4 }); poly(samplePts(x => mu * W0 * Math.cos(x * r), 0, 90, 180), tp, '#e8548b', bx, { lw: 2.4, dash: true }); poly(samplePts(x => W0 * Math.sin(x * r), 0, 90, 180), tp, acc, bx, { lw: 2.8 });
      if (mu > 0) dot(tp, thS, W0 * Math.sin(thS * r), '#3fbf6f', 'slips ' + fmtN(thS, 3) + '°', 8, 12);
      dot(tp, th, W0 * Math.sin(th * r), '#ffffff', '', 8, 0); seg(tp, th, 0, th, W0 * Math.sin(th * r), 'rgba(255,255,255,0.35)', true, 1.2);
      axT(W, H, 'angle θ (°)', 'force (N)');
      const net = g * (Math.sin(th * r) - mu * Math.cos(th * r));
      return [{ color: acc, label: 'Pull down the slope mg sinθ = ' + fmtN(W0 * Math.sin(th * r), 4) + ' N at ' + fmtN(th, 3) + '°' }, { color: '#5a9ad8', label: 'Normal force N = mg cosθ = ' + fmtN(W0 * Math.cos(th * r), 4) + ' N' },
        { color: '#e8548b', label: 'Maximum friction μN = ' + fmtN(mu * W0 * Math.cos(th * r), 4) + ' N', dashed: true },
        { color: '#3fbf6f', label: mu > 0 ? 'The block starts to slide when tanθ > μ → θ > ' + fmtN(thS, 4) + '°' : 'No friction: it always slides, a = g sinθ' },
        { color: '#ffffff', label: net > 0 ? 'At ' + fmtN(th, 3) + '° it slides with a = g(sinθ − μcosθ) = ' + fmtN(net, 4) + ' m/s²' : 'At ' + fmtN(th, 3) + '° friction holds the block at rest (a = 0)' }];
    }
  });

  GX.push({
    id: 'wave', grp: 'phys', label: 'Travelling Wave (y vs x)',
    inputs: [{ k: 'A', l: 'Amplitude A', v: 2, r: 0, min: 0.001 }, { k: 'lam', l: 'Wavelength λ', v: 4, r: 0, min: 0.01 }, { k: 'f', l: 'Frequency f (Hz)', v: 1, r: 1, min: 0.01 }, { k: 't', l: 'Time t (s)', v: 0.25, r: 1, min: 0 }],
    presets: [['t = 0', { gx_wave_t: 0 }], ['Quarter period', { gx_wave_f: 1, gx_wave_t: 0.25 }], ['Half period', { gx_wave_f: 1, gx_wave_t: 0.5 }], ['Short wavelength', { gx_wave_lam: 1.5, gx_wave_t: 0.25 }]],
    plot(v, W, H) {
      const { A, lam, f, t } = v, k = 2 * Math.PI / lam, w = 2 * Math.PI * f, xm = 2 * lam;
      const bx = box([0, xm], [A, -A], { zero: true, pad: 0.15, W, H }), tp = view(bx, W, H), acc = accentColor();
      if (t > 0) poly(samplePts(x => A * Math.sin(k * x), 0, xm, 400), tp, 'rgba(255,255,255,0.45)', bx, { lw: 1.8, dash: true });
      poly(samplePts(x => A * Math.sin(k * x - w * t), 0, xm, 400), tp, acc, bx, { lw: 2.8 });
      seg(tp, 0, 0, lam, 0, '#5a9ad8', false, 2); dot(tp, 0, 0, '#5a9ad8', '', 0, 0); dot(tp, lam, 0, '#5a9ad8', 'λ', -6, 12);
      axT(W, H, 'x', 'y');
      return [{ color: acc, label: 'y = A sin(kx − ωt) at t = ' + fmtN(t, 4) + ' s' + (t > 0 ? ' · the dashed grey curve is the same wave at t = 0 — the pattern has moved right' : '') },
        { color: '#5a9ad8', label: 'Wavelength λ = ' + fmtN(lam, 4) + ' · wave number k = 2π/λ = ' + fmtN(k, 4) }, { color: '#ffffff', label: 'Period T = 1/f = ' + fmtN(1 / f, 4) + ' s · ω = 2πf = ' + fmtN(w, 4) + ' rad/s' },
        { color: '#3fbf6f', label: 'Wave speed v = fλ = ' + fmtN(f * lam, 4) + ' (the pattern moves ' + fmtN(f * lam * t, 4) + ' in ' + fmtN(t, 3) + ' s)' }];
    }
  });

  GX.push({
    id: 'standing', grp: 'phys', label: 'Standing Waves (harmonics)',
    inputs: [{ k: 'L', l: 'String length L (m)', v: 1, r: 0, min: 0.01 }, { k: 'n', l: 'Harmonic n', v: 3, r: 0, min: 1, max: 10, int: true }, { k: 'vw', l: 'Wave speed (m/s)', v: 340, r: 1, min: 0.1 }],
    presets: [['Fundamental n = 1', { gx_standing_n: 1 }], ['2nd harmonic', { gx_standing_n: 2 }], ['3rd harmonic', { gx_standing_n: 3 }], ['5th harmonic', { gx_standing_n: 5 }]],
    plot(v, W, H) {
      const { L, n, vw } = v, acc = accentColor(), bx = box([0, L], [1, -1], { zero: true, pad: 0.1, W, H }), tp = view(bx, W, H), env = c => x => c * Math.sin(n * Math.PI * x / L);
      [0.5, -0.5].forEach(c => poly(samplePts(env(c), 0, L, 400), tp, 'rgba(90,154,216,0.8)', bx, { lw: 1.8, dash: true }));
      [1, -1].forEach(c => poly(samplePts(env(c), 0, L, 400), tp, acc, bx, { lw: 2.8 }));
      for (let i = 0; i <= n; i++) dot(tp, i * L / n, 0, '#ffffff', i === 0 || i === n ? '' : 'N', 0, 12);
      for (let i = 0; i < n; i++) dot(tp, (i + 0.5) * L / n, 0, '#3fbf6f', i === 0 ? 'A' : '', 0, -12);
      axT(W, H, 'x along the string (m)', '');
      return [{ color: acc, label: 'Envelope y = 2A sin(nπx/L): the string swings between the two solid curves' }, { color: '#5a9ad8', label: 'Dashed curves = the string at other moments of the cycle', dashed: true },
        { color: '#ffffff', label: n + ' loop' + (n > 1 ? 's' : '') + ' · ' + (n + 1) + ' nodes N (white, including both fixed ends) · ' + n + ' antinodes A (green)' },
        { color: '#3fbf6f', label: 'Wavelength λ = 2L/n = ' + fmtN(2 * L / n, 4) + ' m · frequency fₙ = nv/2L = ' + fmtN(n * vw / (2 * L), 4) + ' Hz' }, { color: '#e8548b', label: 'Fundamental f₁ = v/2L = ' + fmtN(vw / (2 * L), 4) + ' Hz · fₙ = n·f₁' }];
    }
  });

  GX.push({
    id: 'doppler', grp: 'phys', label: 'Doppler Effect (frequency vs speed)',
    inputs: [{ k: 'f0', l: 'Source f₀ (Hz)', v: 500, r: 0, min: 0.1 }, { k: 'vs', l: 'Sound speed (m/s)', v: 343, r: 0, min: 1 }, { k: 'vm', l: 'Max source speed (m/s)', v: 150, r: 1, min: 0.1 }, { k: 'vp', l: 'Mark speed (m/s)', v: 40, r: 1, min: 0 }],
    presets: [['Ambulance 40 m/s', { gx_doppler_vp: 40 }], ['Car 20 m/s', { gx_doppler_vp: 20 }], ['Jet 250 m/s', { gx_doppler_vm: 300, gx_doppler_vp: 250 }]],
    plot(v, W, H) {
      const { f0, vs, vm, vp } = v; if (vm >= vs) bad(tx('graph_x_doppler_max', 'Max source speed must be less than the speed of sound.')); if (vp > vm) bad(tx('graph_x_doppler_mark', 'Mark speed must not be more than the max speed.'));
      const f = s => f0 * vs / (vs - s), bx = box([-vm, vm], [f(-vm), f(vm), f0], { pad: 0.1, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, bx.x0, f0, bx.x1, f0, 'rgba(255,255,255,0.35)', true, 1.2); poly(samplePts(f, -vm, vm, 400), tp, acc, bx, { lw: 2.8 });
      dot(tp, 0, f0, '#ffffff', 'f₀', 8, -10); dot(tp, vp, f(vp), '#3fbf6f', fmtN(f(vp), 4) + ' Hz', -8, -10); dot(tp, -vp, f(-vp), '#5a9ad8', fmtN(f(-vp), 4) + ' Hz', 8, 12);
      axT(W, H, 'source speed (m/s): + towards you, − away', 'f′ (Hz)');
      return [{ color: acc, label: "Heard frequency f′ = f₀·v/(v − vₛ) for a source moving at vₛ (observer at rest)" }, { color: '#3fbf6f', label: 'Approaching at ' + fmtN(vp, 4) + ' m/s: f′ = ' + fmtN(f(vp), 4) + ' Hz (higher pitch)' },
        { color: '#5a9ad8', label: 'Moving away at ' + fmtN(vp, 4) + ' m/s: f′ = ' + fmtN(f(-vp), 4) + ' Hz (lower pitch)' }, { color: '#ffffff', label: 'Pitch jump while it passes you = ' + fmtN(f(vp) - f(-vp), 4) + ' Hz · as vₛ → v the frequency → ∞ (sound barrier)' }];
    }
  });

  GX.push({
    id: 'lens', grp: 'phys', label: 'Thin Lens (ray diagram)',
    inputs: [{ k: 'f', l: 'Focal length f (cm, − = concave)', v: 10, r: 0 }, { k: 'u', l: 'Object distance u (cm)', v: 25, r: 1, min: 0.01 }, { k: 'h', l: 'Object height (cm)', v: 3, r: 1, min: 0.01 }],
    presets: [['u beyond 2f', { gx_lens_f: 10, gx_lens_u: 30 }], ['u = 2f', { gx_lens_f: 10, gx_lens_u: 20 }], ['Between f and 2f', { gx_lens_f: 10, gx_lens_u: 15 }], ['Inside f (magnifier)', { gx_lens_f: 10, gx_lens_u: 6 }], ['Concave lens', { gx_lens_f: -10, gx_lens_u: 20 }]],
    plot(v, W, H) {
      const { f, u, h } = v; if (f === 0) bad(tx('graph_x_lens_f0', 'Focal length cannot be 0.'));
      if (f > 0 && Math.abs(u - f) < 1e-9 * Math.max(1, u)) bad(tx('graph_x_lens_focus', 'Object at the focus: the image forms at infinity (rays leave parallel).'));
      const vv = 1 / (1 / f - 1 / u), m = -vv / u, hi = m * h, cap = Math.max(u, Math.abs(f)) * 4, vc = Math.max(-cap, Math.min(cap, vv)), hc = Math.max(-cap, Math.min(cap, hi));
      const bx = box([-u, vc, Math.abs(f) * 1.4, -Math.abs(f) * 1.4], [h, -h, hc, -hc], { eq: true, pad: 0.12, W, H }), tp = view(bx, W, H), acc = accentColor(), x1 = bx.x1;
      seg(tp, 0, bx.y0, 0, bx.y1, '#9ad0ff', false, 3);
      dot(tp, f, 0, '#f2c14e', 'F', 0, 12); dot(tp, -f, 0, '#f2c14e', 'F′', 0, 12);
      seg(tp, -u, h, 0, h, acc, false, 2.2); seg(tp, 0, h, x1, h - (h / f) * x1, acc, false, 2.2); if (vv < 0) seg(tp, 0, h, vv, h - (h / f) * vv, acc, true, 1.6);
      seg(tp, -u, h, x1, -h * x1 / u, '#e8548b', false, 2.2);
      const o0 = tp(-u, 0), o1 = tp(-u, h), i0 = tp(vc, 0), i1 = tp(vc, hc); drawArrow(o0[0], o0[1], o1[0], o1[1], '#ffffff', 3); drawArrow(i0[0], i0[1], i1[0], i1[1], '#5a9ad8', 3);
      axT(W, H, 'cm', 'cm');
      const real = vv > 0, size = Math.abs(Math.abs(m) - 1) < 1e-6 ? 'same size' : (Math.abs(m) > 1 ? 'enlarged' : 'diminished');
      return [{ color: '#ffffff', label: 'Object: ' + fmtN(h, 3) + ' cm tall at u = ' + fmtN(u, 4) + ' cm · ' + (f > 0 ? 'convex (converging)' : 'concave (diverging)') + ' lens, f = ' + fmtN(f, 4) + ' cm' },
        { color: acc, label: 'Ray 1: parallel to the axis, then through (or away from) the focus' }, { color: '#e8548b', label: 'Ray 2: straight through the centre of the lens' },
        { color: '#5a9ad8', label: 'Image: v = ' + fmtN(vv, 4) + ' cm (1/v = 1/f − 1/u) · magnification m = ' + fmtN(m, 4) + ' · height ' + fmtN(Math.abs(hi), 4) + ' cm' },
        { color: '#3fbf6f', label: 'The image is ' + (real ? 'real' : 'virtual (dashed rays, same side as the object)') + ', ' + (m < 0 ? 'inverted' : 'erect') + ', ' + size }];
    }
  });

  GX.push({
    id: 'snell', grp: 'phys', label: "Refraction (Snell's law)",
    inputs: [{ k: 'n1', l: 'n₁ (top)', v: 1, r: 0, min: 1 }, { k: 'n2', l: 'n₂ (bottom)', v: 1.5, r: 0, min: 1 }, { k: 'a1', l: 'Incident angle θ₁ (°)', v: 40, r: 1, min: 0, max: 89.9 }],
    presets: [['Air → glass', { gx_snell_n1: 1, gx_snell_n2: 1.5, gx_snell_a1: 40 }], ['Air → water', { gx_snell_n1: 1, gx_snell_n2: 1.33, gx_snell_a1: 50 }], ['Glass → air', { gx_snell_n1: 1.5, gx_snell_n2: 1, gx_snell_a1: 30 }], ['Total internal reflection', { gx_snell_n1: 1.5, gx_snell_n2: 1, gx_snell_a1: 60 }], ['Water → air (critical)', { gx_snell_n1: 1.33, gx_snell_n2: 1, gx_snell_a1: 48.75 }]],
    plot(v, W, H) {
      const { n1, n2, a1 } = v, r = Math.PI / 180, s1 = Math.sin(a1 * r), c1 = Math.cos(a1 * r), s2 = n1 * s1 / n2, tir = s2 > 1;
      const bx = box([-1.3, 1.3], [-1, 1], { eq: true, pad: 0, W, H }), tp = view(bx, W, H), acc = accentColor();
      fillPoly([[bx.x0, 0], [bx.x1, 0], [bx.x1, bx.y1], [bx.x0, bx.y1]], tp, 'rgba(90,154,216,' + (0.04 + 0.05 * (n1 - 1)) + ')'); fillPoly([[bx.x0, 0], [bx.x1, 0], [bx.x1, bx.y0], [bx.x0, bx.y0]], tp, 'rgba(90,154,216,' + (0.04 + 0.05 * (n2 - 1)) + ')');
      seg(tp, bx.x0, 0, bx.x1, 0, '#ffffff', false, 2); seg(tp, 0, -1, 0, 1, 'rgba(255,255,255,0.5)', true, 1.4);
      seg(tp, -s1, c1, 0, 0, acc, false, 2.8); seg(tp, 0, 0, s1, c1, '#e8548b', !!(!tir), tir ? 2.8 : 1.6);
      dot(tp, -s1, c1, acc, 'θ₁ = ' + fmtN(a1, 4) + '°', 8, -2);
      const out = [{ color: acc, label: 'Incident ray in n₁ = ' + fmtN(n1, 4) + ' at θ₁ = ' + fmtN(a1, 4) + '° to the normal (dashed vertical line)' }];
      if (tir) out.push({ color: '#e8548b', label: 'Total internal reflection: n₁ sinθ₁ / n₂ = ' + fmtN(s2, 4) + ' > 1, so no refracted ray exists · reflected angle = ' + fmtN(a1, 4) + '°' });
      else {
        const a2 = Math.asin(s2) / r; seg(tp, 0, 0, s2, -Math.sqrt(1 - s2 * s2), '#3fbf6f', false, 2.8); dot(tp, s2, -Math.sqrt(1 - s2 * s2), '#3fbf6f', 'θ₂ = ' + fmtN(a2, 4) + '°', -8, 10);
        out.push({ color: '#3fbf6f', label: 'Refracted ray in n₂ = ' + fmtN(n2, 4) + ': n₁ sinθ₁ = n₂ sinθ₂ → θ₂ = ' + fmtN(a2, 4) + '° (' + (n2 > n1 ? 'bends towards the normal' : n2 < n1 ? 'bends away from the normal' : 'no bending') + ')' },
          { color: '#e8548b', label: 'Reflected ray (dashed, weak): angle of reflection = ' + fmtN(a1, 4) + '°', dashed: true });
      }
      out.push({ color: '#ffffff', label: n1 > n2 ? 'Critical angle θc = sin⁻¹(n₂/n₁) = ' + fmtN(Math.asin(n2 / n1) / r, 4) + '° — above this the light cannot leave' : 'Light goes into a denser medium: total internal reflection is not possible' }, { color: '#5a9ad8', label: 'Speed of light in n₁ = c/' + fmtN(n1, 4) + ' · in n₂ = c/' + fmtN(n2, 4) });
      return out;
    }
  });

  GX.push({
    id: 'rc', grp: 'phys', label: 'RC Circuit (charging & discharging)',
    inputs: [{ k: 'V0', l: 'Supply V₀ (V)', v: 10, r: 0, min: 0.01 }, { k: 'R', l: 'R (kΩ)', v: 10, r: 0, min: 0.001 }, { k: 'C', l: 'C (µF)', v: 100, r: 1, min: 0.001 }],
    presets: [['10 kΩ, 100 µF', { gx_rc_R: 10, gx_rc_C: 100 }], ['Faster (1 kΩ, 100 µF)', { gx_rc_R: 1, gx_rc_C: 100 }], ['Slower (100 kΩ, 100 µF)', { gx_rc_R: 100, gx_rc_C: 100 }]],
    plot(v, W, H) {
      const { V0, R, C } = v, tau = R * C, tm = 5 * tau, ch = t => V0 * (1 - Math.exp(-t / tau)), dc = t => V0 * Math.exp(-t / tau);
      const bx = box([0, tm], [0, V0], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, 0, V0, tm, V0, 'rgba(255,255,255,0.3)', true, 1.2); poly(samplePts(dc, 0, tm, 300), tp, '#5a9ad8', bx, { lw: 2.8 }); poly(samplePts(ch, 0, tm, 300), tp, acc, bx, { lw: 2.8 });
      dot(tp, tau, ch(tau), '#ffffff', '63.2%', 8, 12); dot(tp, tau, dc(tau), '#ffffff', '36.8%', 8, -10); seg(tp, tau, 0, tau, V0, 'rgba(255,255,255,0.3)', true, 1.2);
      axT(W, H, 't (ms)', 'Vc (V)');
      return [{ color: acc, label: 'Charging: Vc = V₀(1 − e^(−t/RC))' }, { color: '#5a9ad8', label: 'Discharging: Vc = V₀e^(−t/RC)' }, { color: '#ffffff', label: 'Time constant τ = RC = ' + fmtN(tau, 4) + ' ms · after one τ the capacitor has reached 63.2% (charging) or fallen to 36.8% (discharging)' },
        { color: '#3fbf6f', label: 'Starting current I₀ = V₀/R = ' + fmtN(V0 / R, 4) + ' mA · fully charged (99.3%) after about 5τ = ' + fmtN(tm, 4) + ' ms' }, { color: '#f2c14e', label: 'Energy stored at the end = ½CV₀² = ' + fmtN(0.5 * C * V0 * V0 / 1000, 4) + ' mJ' }];
    }
  });

  GX.push({
    id: 'acsig', grp: 'phys', label: 'AC Voltage, Current & Power (phase)',
    inputs: [{ k: 'V0', l: 'V peak (V)', v: 10, r: 0, min: 0.01 }, { k: 'I0', l: 'I peak (A)', v: 2, r: 0, min: 0.001 }, { k: 'f', l: 'f (Hz)', v: 50, r: 1, min: 0.1 }, { k: 'phi', l: 'Current lags by φ (°)', v: 30, r: 1, min: -90, max: 90 }],
    presets: [['Resistor (φ = 0)', { gx_acsig_phi: 0 }], ['Inductor (φ = 90)', { gx_acsig_phi: 90 }], ['Capacitor (φ = −90)', { gx_acsig_phi: -90 }], ['Mixed (φ = 45)', { gx_acsig_phi: 45 }]],
    plot(v, W, H) {
      const { V0, I0, f, phi } = v, p = phi * Math.PI / 180, tm = 2000 / f, w = 2 * Math.PI * f / 1000;
      const fv = t => V0 * Math.sin(w * t), fi = t => I0 * Math.sin(w * t - p), fp = t => fv(t) * fi(t), ext = Math.max(V0, I0, V0 * I0);
      const bx = box([0, tm], [ext, -V0 * I0 * 0.2, -V0, -I0], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(fp, 0, tm, 600), tp, '#3fbf6f', bx, { lw: 2 }); poly(samplePts(fi, 0, tm, 600), tp, '#5a9ad8', bx, { lw: 2.6 }); poly(samplePts(fv, 0, tm, 600), tp, acc, bx, { lw: 2.8 });
      const Pav = 0.5 * V0 * I0 * Math.cos(p); seg(tp, 0, Pav, tm, Pav, '#ffffff', true, 1.6);
      axT(W, H, 't (ms)', 'V · I · p');
      return [{ color: acc, label: 'Voltage V = V₀ sin ωt · rms = V₀/√2 = ' + fmtN(V0 / Math.SQRT2, 4) + ' V' }, { color: '#5a9ad8', label: 'Current I = I₀ sin(ωt − φ) · rms = ' + fmtN(I0 / Math.SQRT2, 4) + ' A · ' + (phi > 0 ? 'lags the voltage (inductive)' : phi < 0 ? 'leads the voltage (capacitive)' : 'in phase with the voltage (resistive)') },
        { color: '#3fbf6f', label: 'Instantaneous power p = VI (dips below zero when V and I have opposite signs)' }, { color: '#ffffff', label: 'Average power P = ½V₀I₀cosφ = ' + fmtN(Pav, 4) + ' W (dashed) · power factor cosφ = ' + fmtN(Math.cos(p), 4), dashed: true }];
    }
  });

  GX.push({
    id: 'boyle', grp: 'phys', label: "Gas Law: P–V isotherms (Boyle)",
    inputs: [{ k: 'n', l: 'Moles n', v: 1, r: 0, min: 0.001 }, { k: 'T1', l: 'T₁ (K)', v: 250, r: 1, min: 1 }, { k: 'T2', l: 'T₂ (K)', v: 300, r: 1, min: 1 }, { k: 'T3', l: 'T₃ (K)', v: 400, r: 1, min: 1 }, { k: 'V1', l: 'V from (L)', v: 5, r: 2, min: 0.1 }, { k: 'V2', l: 'to (L)', v: 50, r: 2, min: 0.2 }],
    presets: [['1 mol, 250/300/400 K', { gx_boyle_n: 1, gx_boyle_T1: 250, gx_boyle_T2: 300, gx_boyle_T3: 400 }], ['2 mol', { gx_boyle_n: 2 }], ['Cold gases', { gx_boyle_T1: 100, gx_boyle_T2: 200, gx_boyle_T3: 300 }]],
    plot(v, W, H) {
      const { n, T1, T2, T3, V1, V2 } = v; if (V1 >= V2) bad(t('graph_error_range')); const R = 8.314, Ts = [T1, T2, T3], cols = ['#5a9ad8', accentColor(), '#e8548b'], P = (T, V) => n * R * T / V;
      const bx = box([V1, V2], [0, P(Math.max.apply(null, Ts), V1)], { pad: 0.06, W, H }), tp = view(bx, W, H);
      Ts.forEach((T, i) => poly(samplePts(V => P(T, V), V1, V2, 300), tp, cols[i], bx, { lw: 2.8 }));
      const Vm = (V1 + V2) / 2; Ts.forEach((T, i) => dot(tp, Vm, P(T, Vm), cols[i], '', 0, 0));
      axT(W, H, 'V (litres)', 'P (kPa)');
      return Ts.map((T, i) => ({ color: cols[i], label: 'T = ' + fmtN(T, 4) + ' K: PV = nRT = ' + fmtN(n * R * T, 5) + ' kPa·L (constant) · at V = ' + fmtN(Vm, 3) + ' L, P = ' + fmtN(P(T, Vm), 4) + ' kPa' })).concat([{ color: '#ffffff', label: 'Boyle: at constant temperature P ∝ 1/V (halve the volume, double the pressure) · hotter gas = curve further from the axes' }]);
    }
  });

  GX.push({
    id: 'charles', grp: 'phys', label: "Gas Law: V–T lines (Charles)",
    inputs: [{ k: 'n', l: 'Moles n', v: 1, r: 0, min: 0.001 }, { k: 'P1', l: 'P₁ (kPa)', v: 50, r: 1, min: 1 }, { k: 'P2', l: 'P₂ (kPa)', v: 100, r: 1, min: 1 }, { k: 'P3', l: 'P₃ (kPa)', v: 200, r: 1, min: 1 }, { k: 'Tm', l: 'Max T (°C)', v: 200, r: 2, min: 10, max: 1000 }],
    presets: [['1 mol, 50/100/200 kPa', { gx_charles_n: 1, gx_charles_P1: 50, gx_charles_P2: 100, gx_charles_P3: 200 }], ['0.5 mol', { gx_charles_n: 0.5 }], ['High range (500 °C)', { gx_charles_Tm: 500 }]],
    plot(v, W, H) {
      const { n, P1, P2, P3, Tm } = v, R = 8.314, Ps = [P1, P2, P3], cols = ['#5a9ad8', accentColor(), '#e8548b'], Vf = (P, tc) => n * R * (tc + 273.15) / P;
      const bx = box([-300, Tm], [0, Vf(Math.min.apply(null, Ps), Tm)], { pad: 0.06, W, H }), tp = view(bx, W, H);
      Ps.forEach((P, i) => { poly([[-273.15, 0], [0, Vf(P, 0)]], tp, cols[i], bx, { lw: 2, dash: true }); poly([[0, Vf(P, 0)], [Tm, Vf(P, Tm)]], tp, cols[i], bx, { lw: 2.8 }); });
      dot(tp, -273.15, 0, '#ffffff', '−273.15 °C', 8, -10); seg(tp, -273.15, 0, -273.15, bx.y1, 'rgba(255,255,255,0.35)', true, 1.2);
      axT(W, H, 'T (°C)', 'V (litres)');
      return Ps.map((P, i) => ({ color: cols[i], label: 'P = ' + fmtN(P, 4) + ' kPa: V = ' + fmtN(Vf(P, 0), 4) + ' L at 0 °C and ' + fmtN(Vf(P, 100), 4) + ' L at 100 °C' })).concat([{ color: '#ffffff', label: 'Every line, extended back (dashed), reaches V = 0 at −273.15 °C = 0 K: absolute zero · V/T is constant at constant P' }, { color: '#3fbf6f', label: 'Real gases turn liquid before reaching it, so the dashed part is only an extrapolation' }]);
    }
  });

  GX.push({
    id: 'heating', grp: 'phys', label: 'Heating Curve of Water (ice → steam)',
    inputs: [{ k: 'm', l: 'Mass (g)', v: 100, r: 0, min: 0.01 }, { k: 'T0', l: 'Start T (°C)', v: -20, r: 0, min: -100, max: 100 }, { k: 'Tf', l: 'End T (°C)', v: 130, r: 1, min: -90, max: 300 }],
    presets: [['−20 °C → 130 °C', { gx_heating_T0: -20, gx_heating_Tf: 130 }], ['Ice → water (−10 → 60)', { gx_heating_T0: -10, gx_heating_Tf: 60 }], ['Water → steam (20 → 120)', { gx_heating_T0: 20, gx_heating_Tf: 120 }]],
    plot(v, W, H) {
      const { m, T0, Tf } = v; if (Tf <= T0) bad(tx('graph_x_heating_range', 'End temperature must be higher than the start temperature.'));
      const ci = 2.09, cw = 4.18, cs = 2.01, Lf = 334, Lv = 2260; let T = T0, Q = 0; const pts = [[0, T0]], parts = [], plat = [];
      if (T < 0) { const tg = Math.min(0, Tf), q = m * ci * (tg - T) / 1000; Q += q; T = tg; pts.push([Q, T]); parts.push(['Heating ice ' + fmtN(T0, 3) + ' → ' + fmtN(tg, 3) + ' °C', q]); }
      if (T === 0 && Tf > 0 && T0 <= 0) { const q = m * Lf / 1000; plat.push([Q + q / 2, 0, 'melting']); Q += q; pts.push([Q, 0]); parts.push(['Melting ice at 0 °C', q]); }
      if (T < 100 && Tf > T) { const tg = Math.min(100, Tf), q = m * cw * (tg - T) / 1000; Q += q; pts.push([Q, tg]); parts.push(['Heating water ' + fmtN(T, 3) + ' → ' + fmtN(tg, 3) + ' °C', q]); T = tg; }
      if (T === 100 && Tf > 100) { const q = m * Lv / 1000; plat.push([Q + q / 2, 100, 'boiling']); Q += q; pts.push([Q, 100]); parts.push(['Boiling water at 100 °C', q]); const q2 = m * cs * (Tf - 100) / 1000; Q += q2; pts.push([Q, Tf]); parts.push(['Heating steam 100 → ' + fmtN(Tf, 3) + ' °C', q2]); }
      const bx = box([0, Q], [T0, Tf], { pad: 0.1, W, H }), tp = view(bx, W, H), acc = accentColor(), cols = ['#5a9ad8', '#e8548b', acc, '#3fbf6f', '#f2c14e'];
      for (let i = 1; i < pts.length; i++) seg(tp, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], cols[(i - 1) % cols.length], false, 3.2);
      pts.forEach(p => dot(tp, p[0], p[1], '#ffffff', '', 0, 0)); plat.forEach(p => dot(tp, p[0], p[1], '#ffffff', p[2], 0, -12));
      axT(W, H, 'heat added Q (kJ)', 'T (°C)');
      return parts.map((p, i) => ({ color: cols[i % cols.length], label: p[0] + ': ' + fmtN(p[1], 4) + ' kJ' })).concat([{ color: '#ffffff', label: 'Total heat = ' + fmtN(Q, 4) + ' kJ for ' + fmtN(m, 4) + ' g · flat parts: temperature stays fixed while the heat breaks bonds (latent heat 334 and 2260 J/g)' }]);
    }
  });

  GX.push({
    id: 'energy', grp: 'phys', label: 'Energy Conversion (KE & PE)',
    inputs: [{ k: 'm', l: 'Mass (kg)', v: 2, r: 0, min: 0.001 }, { k: 'h0', l: 'Start height (m)', v: 20, r: 0, min: 0.01 }, { k: 'g', l: 'g (m/s²)', v: 9.8, r: 1, min: 0.1 }, { k: 'h', l: 'Mark height (m)', v: 5, r: 1, min: 0 }],
    presets: [['2 kg from 20 m', { gx_energy_m: 2, gx_energy_h0: 20, gx_energy_h: 5 }], ['Halfway', { gx_energy_h: 10 }], ['Just before landing', { gx_energy_h: 1 }]],
    plot(v, W, H) {
      const { m, h0, g, h } = v; if (h > h0) bad(tx('graph_x_energy_h', 'Mark height must not be above the start height.'));
      const E = m * g * h0, bx = box([0, h0], [0, E], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, 0, E, h0, E, '#ffffff', true, 1.8); seg(tp, 0, E, h0, 0, '#5a9ad8', false, 3); seg(tp, 0, 0, h0, E, acc, false, 3);
      dot(tp, h, m * g * h, '#5a9ad8', '', 0, 0); dot(tp, h, E - m * g * h, acc, '', 0, 0); seg(tp, h, 0, h, E, 'rgba(255,255,255,0.35)', true, 1.2); dot(tp, h0 / 2, E / 2, '#3fbf6f', 'equal', 8, -10);
      axT(W, H, 'height h (m) — falling from right to left', 'energy (J)');
      return [{ color: '#5a9ad8', label: 'Potential energy PE = mgh · ' + fmtN(m * g * h, 4) + ' J at h = ' + fmtN(h, 4) + ' m' }, { color: acc, label: 'Kinetic energy KE = mg(h₀ − h) · ' + fmtN(E - m * g * h, 4) + ' J at h = ' + fmtN(h, 4) + ' m' },
        { color: '#ffffff', label: 'Total mechanical energy E = mgh₀ = ' + fmtN(E, 4) + ' J (constant, no air resistance)', dashed: true }, { color: '#3fbf6f', label: 'Speed at h = ' + fmtN(h, 4) + ' m: v = √(2g(h₀ − h)) = ' + fmtN(Math.sqrt(2 * g * (h0 - h)), 4) + ' m/s · KE = PE at h = h₀/2 = ' + fmtN(h0 / 2, 4) + ' m' },
        { color: '#f2c14e', label: 'Speed on reaching the ground = √(2gh₀) = ' + fmtN(Math.sqrt(2 * g * h0), 4) + ' m/s' }];
    }
  });

  GX.push({
    id: 'gravity', grp: 'phys', label: 'Gravity g vs Distance (inside & outside)',
    inputs: [{ k: 'M', l: 'Mass (Earths)', v: 1, r: 0, min: 0.0001 }, { k: 'R', l: 'Radius (Earths)', v: 1, r: 0, min: 0.001 }, { k: 'rm', l: 'Plot to (× radius)', v: 4, r: 1, min: 1.5, max: 20 }],
    presets: [['Earth', { gx_gravity_M: 1, gx_gravity_R: 1 }], ['Moon', { gx_gravity_M: 0.0123, gx_gravity_R: 0.2727 }], ['Mars', { gx_gravity_M: 0.107, gx_gravity_R: 0.532 }], ['Jupiter', { gx_gravity_M: 317.8, gx_gravity_R: 10.97 }]],
    plot(v, W, H) {
      const { M, R, rm } = v, GM = 6.674e-11 * M * 5.972e24, Rm = R * 6.371e6, g0 = GM / (Rm * Rm), gf = x => x < 1 ? g0 * x : g0 / (x * x);
      const bx = box([0, rm], [0, g0], { zero: true, pad: 0.1, W, H }), tp = view(bx, W, H), acc = accentColor();
      fillPoly([[0, 0], [1, 0], [1, bx.y1], [0, bx.y1]], tp, 'rgba(90,154,216,0.12)'); poly(samplePts(gf, 0, rm, 500), tp, acc, bx, { lw: 2.8 });
      dot(tp, 1, g0, '#ffffff', 'surface g = ' + fmtN(g0, 4), 8, -10); dot(tp, 2, gf(2), '#3fbf6f', 'g/4 at 2R', 8, -10);
      axT(W, H, 'distance from the centre (in radii R)', 'g (m/s²)');
      return [{ color: acc, label: 'Inside the planet (shaded): g grows in a straight line from 0 at the centre · outside: g = GM/r² falls off as 1/r²' }, { color: '#ffffff', label: 'Surface gravity g = GM/R² = ' + fmtN(g0, 4) + ' m/s² (' + fmtN(g0 / 9.80665, 4) + ' × Earth)' },
        { color: '#3fbf6f', label: 'Double the distance from the centre → gravity falls to one quarter (' + fmtN(g0 / 4, 4) + ' m/s²)' }, { color: '#5a9ad8', label: 'Escape speed = √(2GM/R) = ' + fmtN(Math.sqrt(2 * GM / Rm) / 1000, 4) + ' km/s · low-orbit speed = ' + fmtN(Math.sqrt(GM / Rm) / 1000, 4) + ' km/s' }];
    }
  });

  GX.push({
    id: 'coulomb', grp: 'phys', label: "Coulomb's Law (force vs distance)",
    inputs: [{ k: 'q1', l: 'q₁ (µC)', v: 5, r: 0 }, { k: 'q2', l: 'q₂ (µC)', v: -3, r: 0 }, { k: 'r1', l: 'r from (m)', v: 0.1, r: 1, min: 0.001 }, { k: 'r2', l: 'to (m)', v: 2, r: 1, min: 0.002 }],
    presets: [['Unlike charges (attract)', { gx_coulomb_q1: 5, gx_coulomb_q2: -3 }], ['Like charges (repel)', { gx_coulomb_q1: 5, gx_coulomb_q2: 3 }], ['Strong (20 µC, 20 µC)', { gx_coulomb_q1: 20, gx_coulomb_q2: 20 }]],
    plot(v, W, H) {
      const { q1, q2, r1, r2 } = v; if (q1 === 0 || q2 === 0) bad(tx('graph_x_coulomb_q', 'Both charges must be non-zero.')); if (r1 >= r2) bad(t('graph_error_range'));
      const k = 8.988e9, F = r => k * q1 * q2 * 1e-12 / (r * r), bx = box([r1, r2], [0, F(r1)], { pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(F, r1, r2, 500), tp, acc, bx, { lw: 2.8 }); dot(tp, r1, F(r1), '#ffffff', fmtN(F(r1), 3) + ' N', 8, 10);
      if (2 * r1 <= r2) { dot(tp, 2 * r1, F(2 * r1), '#3fbf6f', fmtN(F(2 * r1), 3) + ' N (¼)', 8, -10); dot(tp, 3 * r1 <= r2 ? 3 * r1 : 2 * r1, F(3 * r1 <= r2 ? 3 * r1 : 2 * r1), '#5a9ad8', '', 0, 0); }
      axT(W, H, 'distance r (m)', 'force F (N)');
      const att = q1 * q2 < 0;
      return [{ color: acc, label: 'F = k q₁q₂ / r² with k = 8.988 × 10⁹ N·m²/C² · ' + (att ? 'unlike charges attract (negative force)' : 'like charges repel (positive force)') },
        { color: '#ffffff', label: 'At r = ' + fmtN(r1, 4) + ' m the force is ' + fmtN(Math.abs(F(r1)), 5) + ' N' }, { color: '#3fbf6f', label: 'Inverse-square law: double the distance → ¼ of the force, triple → 1/9' },
        { color: '#5a9ad8', label: 'Electric field of q₁ at r = ' + fmtN(r1, 4) + ' m: E = kq₁/r² = ' + fmtN(k * q1 * 1e-6 / (r1 * r1), 4) + ' N/C' }];
    }
  });

  GX.push({
    id: 'magcirc', grp: 'phys', label: 'Charge in a Magnetic Field (circle)',
    inputs: [{ k: 'm', l: 'Mass (10⁻²⁷ kg)', v: 1.67, r: 0, min: 0.0001 }, { k: 'q', l: 'Charge (10⁻¹⁹ C)', v: 1.6, r: 0 }, { k: 'sp', l: 'Speed (10⁵ m/s)', v: 1, r: 1, min: 0.001 }, { k: 'B', l: 'B (mT)', v: 100, r: 1, min: 0.001 }],
    presets: [['Proton', { gx_magcirc_m: 1.67, gx_magcirc_q: 1.6, gx_magcirc_sp: 1, gx_magcirc_B: 100 }], ['Electron', { gx_magcirc_m: 0.000911, gx_magcirc_q: -1.6, gx_magcirc_sp: 10, gx_magcirc_B: 10 }], ['Alpha particle', { gx_magcirc_m: 6.64, gx_magcirc_q: 3.2, gx_magcirc_sp: 1, gx_magcirc_B: 100 }]],
    plot(v, W, H) {
      const { m, q, sp, B } = v; if (q === 0) bad(tx('graph_x_magcirc_q', 'Charge cannot be 0 (a neutral particle is not bent).'));
      const mm = m * 1e-27, qq = Math.abs(q) * 1e-19, vel = sp * 1e5, BB = B * 1e-3, r = mm * vel / (qq * BB), Tp = 2 * Math.PI * mm / (qq * BB), s = q > 0 ? 1 : -1, rc = r * 100;
      const bx = box([-rc, rc], [s * rc - rc, s * rc + rc], { eq: true, pad: 0.3, W, H }), tp = view(bx, W, H), acc = accentColor();
      ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.font = '700 16px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let px = 26; px < W; px += 46) for (let py = 26; py < H; py += 46) ctx.fillText('×', px, py); ctx.restore();
      poly(circPts(0, s * rc, rc), tp, acc, bx, { lw: 2.8 });
      const o = tp(0, 0), c = tp(0, s * rc); drawArrow(o[0], o[1], o[0] + 44, o[1], '#ffffff', 2.6);
      const dx = c[0] - o[0], dy = c[1] - o[1], dl = Math.hypot(dx, dy) || 1; drawArrow(o[0], o[1], o[0] + dx / dl * 38, o[1] + dy / dl * 38, '#e8548b', 2.6);
      dot(tp, 0, s * rc, '#ffffff', 'centre', 8, 0);
      axT(W, H, 'cm  (× = magnetic field into the page)', '');
      return [{ color: acc, label: 'Path: a circle of radius r = mv/(|q|B) = ' + fmtN(rc, 4) + ' cm' }, { color: '#ffffff', label: 'White arrow: velocity (sideways at the start) · pink arrow: magnetic force, always towards the centre' },
        { color: '#5a9ad8', label: 'Period T = 2πm/(|q|B) = ' + fmtN(Tp * 1e6, 4) + ' µs · frequency f = ' + fmtN(1 / Tp / 1e6, 4) + ' MHz — independent of the speed' }, { color: '#3fbf6f', label: (q > 0 ? 'Positive' : 'Negative') + ' charge turns ' + (q > 0 ? 'anticlockwise' : 'clockwise') + ' here · speed stays constant (the magnetic force does no work)' },
        { color: '#f2c14e', label: 'Kinetic energy = ½mv² = ' + fmtN(0.5 * mm * vel * vel / 1.602e-19, 4) + ' eV' }];
    }
  });

  GX.push({
    id: 'planck', grp: 'phys', label: 'Black-body Radiation (Planck curves)',
    inputs: [{ k: 'T1', l: 'T₁ (K)', v: 3000, r: 0, min: 300 }, { k: 'T2', l: 'T₂ (K)', v: 4500, r: 0, min: 300 }, { k: 'T3', l: 'T₃ (K)', v: 6000, r: 1, min: 300 }, { k: 'lm', l: 'Up to λ (nm)', v: 3000, r: 1, min: 500, max: 20000 }],
    presets: [['3000 / 4500 / 6000 K', { gx_planck_T1: 3000, gx_planck_T2: 4500, gx_planck_T3: 6000 }], ['Sun (5778 K) & cooler stars', { gx_planck_T1: 3500, gx_planck_T2: 5778, gx_planck_T3: 8000 }], ['Hot objects (800–1500 K)', { gx_planck_T1: 800, gx_planck_T2: 1100, gx_planck_T3: 1500, gx_planck_lm: 6000 }]],
    plot(v, W, H) {
      const { T1, T2, T3, lm } = v, Ts = [T1, T2, T3], cols = ['#e8548b', accentColor(), '#5a9ad8'], c2 = 1.438777e7;
      const B = (l, T) => { const x = c2 / (l * T), d = Math.expm1(x); return isFinite(d) ? Math.pow(l, -5) / d : 0; };
      let pk = 0; Ts.forEach(T => { const lp = 2.897772e6 / T; pk = Math.max(pk, B(lp, T)); });
      const y = (l, T) => B(l, T) / pk, bx = box([0, lm], [0, 1], { pad: 0.05, W, H }), tp = view(bx, W, H);
      if (lm > 380) fillPoly([[380, 0], [Math.min(750, lm), 0], [Math.min(750, lm), 1], [380, 1]], tp, 'rgba(255,255,255,0.08)');
      Ts.forEach((T, i) => { poly(samplePts(l => y(l, T), 20, lm, 600), tp, cols[i], bx, { lw: 2.8 }); const lp = 2.897772e6 / T; if (lp <= lm) dot(tp, lp, y(lp, T), cols[i], fmtN(lp, 4) + ' nm', 8, -10); });
      axT(W, H, 'wavelength λ (nm)', 'relative intensity');
      return Ts.map((T, i) => ({ color: cols[i], label: 'T = ' + fmtN(T, 5) + ' K: peak at λmax = b/T = ' + fmtN(2.897772e6 / T, 5) + ' nm (Wien) · total power ∝ T⁴ = ' + fmtN(Math.pow(T / Ts[0], 4), 4) + ' × the first curve' })).concat([{ color: 'rgba(255,255,255,0.6)', label: 'Light grey band = visible light (380–750 nm) · hotter body → higher peak, shifted to shorter (bluer) wavelengths' }]);
    }
  });

  GX.push({
    id: 'photoelectric', grp: 'phys', label: 'Photoelectric Effect (KE vs frequency)',
    inputs: [{ k: 'phi', l: 'Work function φ (eV)', v: 2.3, r: 0, min: 0.1, max: 10 }, { k: 'f', l: 'Light f (10¹⁴ Hz)', v: 8, r: 0, min: 0.1 }, { k: 'fm', l: 'Plot to (10¹⁴ Hz)', v: 15, r: 1, min: 2, max: 40 }],
    presets: [['Sodium (2.3 eV)', { gx_photoelectric_phi: 2.3 }], ['Zinc (4.3 eV)', { gx_photoelectric_phi: 4.3 }], ['Caesium (2.1 eV)', { gx_photoelectric_phi: 2.1 }], ['Platinum (5.6 eV)', { gx_photoelectric_phi: 5.6 }]],
    plot(v, W, H) {
      const { phi, f, fm } = v, he = 0.413567, f0 = phi / he, ke = x => he * x - phi, top = Math.max(0.5, ke(Math.max(fm, f)));
      const bx = box([0, Math.max(fm, f)], [-phi, top], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly([[0, -phi], [f0, 0]], tp, 'rgba(255,255,255,0.45)', bx, { lw: 1.8, dash: true }); seg(tp, 0, 0, Math.min(f0, bx.x1), 0, '#e8548b', false, 3);
      if (f0 < bx.x1) seg(tp, f0, 0, bx.x1, ke(bx.x1), acc, false, 3);
      dot(tp, f0, 0, '#ffffff', 'f₀ = ' + fmtN(f0, 4), 8, -12); dot(tp, 0, -phi, '#ffffff', '−φ', 8, -10);
      dot(tp, f, Math.max(0, ke(f)), f > f0 ? '#3fbf6f' : '#e8548b', f > f0 ? 'KEmax = ' + fmtN(ke(f), 4) + ' eV' : 'no emission', -8, -12);
      axT(W, H, 'frequency f (10¹⁴ Hz)', 'KEmax (eV)');
      return [{ color: acc, label: "Einstein: KEmax = hf − φ — a straight line of slope h/e = 0.4136 eV per 10¹⁴ Hz (the same for every metal)" }, { color: '#ffffff', label: 'Threshold frequency f₀ = φ/h = ' + fmtN(f0, 4) + ' × 10¹⁴ Hz · cut-off wavelength λ₀ = hc/φ = ' + fmtN(1239.84 / phi, 4) + ' nm' },
        { color: '#e8548b', label: 'Below f₀ no electrons come out, however bright the light is (flat red line)' }, { color: '#3fbf6f', label: 'Light at ' + fmtN(f, 4) + ' × 10¹⁴ Hz: photon energy hf = ' + fmtN(he * f, 4) + ' eV → ' + (f > f0 ? 'KEmax = ' + fmtN(ke(f), 4) + ' eV, stopping potential = ' + fmtN(ke(f), 4) + ' V' : 'not enough energy to free an electron') },
        { color: 'rgba(255,255,255,0.6)', label: 'Dashed extension meets the vertical axis at −φ = −' + fmtN(phi, 4) + ' eV', dashed: true }];
    }
  });

  /* ---------- More Statistics ---------- */
  GX.push({
    id: 'poisson', grp: 'stat', label: 'Poisson Distribution',
    inputs: [{ k: 'lam', l: 'Mean λ', v: 4, min: 0.1, max: 100 }],
    presets: [['λ = 1', { gx_poisson_lam: 1 }], ['λ = 4', { gx_poisson_lam: 4 }], ['λ = 10', { gx_poisson_lam: 10 }], ['λ = 30', { gx_poisson_lam: 30 }]],
    plot(v, W, H) {
      const lam = v.lam, K = Math.min(160, Math.ceil(lam + 6 * Math.sqrt(lam) + 6)), pr = [Math.exp(-lam)]; for (let k = 1; k <= K; k++) pr.push(pr[k - 1] * lam / k);
      const pmax = Math.max.apply(null, pr), bx = { x0: -0.8, x1: K + 0.8, y0: -pmax * 0.06, y1: pmax * 1.2 }, tp = view(bx, W, H), acc = accentColor(), mode = Math.floor(lam);
      ctx.save(); ctx.font = '600 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      pr.forEach((p, k) => { const a = tp(k - 0.4, p), z = tp(k + 0.4, 0); ctx.fillStyle = k === mode ? '#ffffff' : 'rgba(255,138,31,0.8)'; ctx.fillRect(a[0], a[1], Math.max(1, z[0] - a[0]), z[1] - a[1]);
        if (K <= 20 && p > 0.0005) { ctx.fillStyle = '#ddd'; ctx.fillText(p.toFixed(3), (a[0] + z[0]) / 2, a[1] - 2); } });
      ctx.restore();
      let cum = 0; for (let k = 0; k <= mode; k++) cum += pr[k];
      return [{ color: acc, label: 'Poisson(λ = ' + fmtN(lam, 3) + '): P(X = k) = e^(−λ)·λᵏ / k!' }, { color: '#ffffff', label: 'Most likely value k = ' + mode + ' with P = ' + fmtN(pr[mode], 4) + ' · P(X ≤ ' + mode + ') = ' + fmtN(cum, 4) },
        { color: '#5a9ad8', label: 'Mean = variance = λ = ' + fmtN(lam, 3) + ' · standard deviation = ' + fmtN(Math.sqrt(lam), 4) }];
    }
  });

  GX.push({
    id: 'ogive', grp: 'stat', label: 'Cumulative Frequency (Ogive)',
    inputs: [{ k: 'xs', l: 'Data', t: 'xs', v: '12, 15, 15, 18, 20, 22, 22, 23, 25, 27, 28, 30, 31, 35, 41, 44, 47, 52', min: 2 }, { k: 'bins', l: 'Classes', v: 5, r: 0, min: 1, max: 30, int: true }],
    presets: [['3 classes', { gx_ogive_bins: 3 }], ['5 classes', { gx_ogive_bins: 5 }], ['8 classes', { gx_ogive_bins: 8 }]],
    plot(v, W, H) {
      const d = v.xs, n = d.length, lo = Math.min.apply(null, d), hi = Math.max.apply(null, d); if (hi === lo) bad(tx('graph_x_samedata', 'The data values must not all be equal.'));
      const nb = v.bins, w = (hi - lo) / nb, cnt = new Array(nb).fill(0); d.forEach(x => { cnt[Math.min(nb - 1, Math.floor((x - lo) / w))]++; });
      const cf = []; let c = 0; cnt.forEach(k => { c += k; cf.push(c); });
      const pts = [[lo, 0]].concat(cf.map((q, i) => [lo + (i + 1) * w, q])), bx = box([lo - w * 0.4, hi + w * 0.4], [0, n], { pad: 0.06, W, H }), tp = view(bx, W, H), acc = accentColor();
      const inv = tg => { for (let i = 0; i < nb; i++) if (cf[i] >= tg) { const pv = i ? cf[i - 1] : 0; return lo + i * w + (tg - pv) / (cf[i] - pv) * w; } return hi; };
      const qs = [[0.5, '#ffffff', 'Median'], [0.25, '#3fbf6f', 'Q₁'], [0.75, '#5a9ad8', 'Q₃']].map(q => ({ x: inv(n * q[0]), y: n * q[0], c: q[1], n: q[2] }));
      qs.forEach(q => { seg(tp, bx.x0, q.y, q.x, q.y, q.c, true); seg(tp, q.x, q.y, q.x, 0, q.c, true); });
      poly(pts, tp, acc, bx, { lw: 2.6 }); pts.forEach(p => dot(tp, p[0], p[1], acc, '', 8, 0)); qs.forEach(q => dot(tp, q.x, q.y, q.c, q.n, 8, -10));
      return [{ color: acc, label: 'Ogive ("less than" cumulative frequency) — ' + n + ' values in ' + nb + ' classes of width ' + fmtN(w, 4) },
        { color: '#ffffff', label: 'Median ≈ ' + fmtN(qs[0].x, 4) + ' (read at ' + fmtN(n / 2, 3) + ' on the vertical axis)' }, { color: '#3fbf6f', label: 'Q₁ ≈ ' + fmtN(qs[1].x, 4) }, { color: '#5a9ad8', label: 'Q₃ ≈ ' + fmtN(qs[2].x, 4) + ' · IQR ≈ ' + fmtN(qs[2].x - qs[1].x, 4) }];
    }
  });

  /* ====== 18 MORE STATISTICS GRAPHS ====== */
  const stErf = x => { const s = x < 0 ? -1 : 1; x = Math.abs(x); const t = 1 / (1 + 0.3275911 * x); return s * (1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x)); };
  const stNCdf = x => 0.5 * (1 + stErf(x / Math.SQRT2)), stNPdf = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const stInvN = p => {
    if (p <= 0) return -Infinity; if (p >= 1) return Infinity;
    const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00], b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01],
      c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00], d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    let q, r;
    if (p < 0.02425) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - 0.02425) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  const stLg = x => {
    const g = [676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - stLg(1 - x);
    x -= 1; let a = 0.99999999999980993; const t = x + 7.5; for (let i = 0; i < 8; i++) a += g[i] / (x + i + 1);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  };
  const stGP = (a, x) => {
    if (x <= 0) return 0;
    if (x < a + 1) { let s = 1 / a, term = s; for (let n = 1; n < 500; n++) { term *= x / (a + n); s += term; if (Math.abs(term) < Math.abs(s) * 1e-14) break; } return s * Math.exp(-x + a * Math.log(x) - stLg(a)); }
    let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 500; i++) { const an = -i * (i - a); b += 2; d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300; c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break; }
    return 1 - Math.exp(-x + a * Math.log(x) - stLg(a)) * h;
  };
  const stBI = (x, a, b) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    const bt = Math.exp(stLg(a + b) - stLg(a) - stLg(b) + a * Math.log(x) + b * Math.log(1 - x));
    const cf = (x, a, b) => {
      const qab = a + b, qap = a + 1, qam = a - 1; let c = 1, d = 1 - qab * x / qap; if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; let h = d;
      for (let m = 1; m < 300; m++) {
        const m2 = 2 * m; let aa = m * (b - m) * x / ((qam + m2) * (a + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
        aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2)); d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; const del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break;
      }
      return h;
    };
    return x < (a + 1) / (a + b + 2) ? bt * cf(x, a, b) / a : 1 - bt * cf(1 - x, b, a) / b;
  };
  const stTCdf = (t0, df) => { const p = 0.5 * stBI(df / (df + t0 * t0), df / 2, 0.5); return t0 > 0 ? 1 - p : p; };
  const stTPdf = (x, df) => Math.exp(stLg((df + 1) / 2) - stLg(df / 2)) / Math.sqrt(df * Math.PI) * Math.pow(1 + x * x / df, -(df + 1) / 2);
  const stBis = (F, target, lo, hi) => { for (let i = 0; i < 100; i++) { const mid = (lo + hi) / 2; if (F(mid) < target) lo = mid; else hi = mid; } return (lo + hi) / 2; };
  const stTInv = (p, df) => stBis(x => stTCdf(x, df), p, -1e5, 1e5);
  const stRng = seed => { let a = (Math.floor(seed) >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const stStat = d => {
    const n = d.length, s = d.slice().sort((p, q) => p - q), mean = d.reduce((a, b) => a + b, 0) / n, sd = n > 1 ? Math.sqrt(d.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (n - 1)) : 0;
    const q = p => { const h = (n - 1) * p, i = Math.floor(h); return i + 1 < n ? s[i] + (h - i) * (s[i + 1] - s[i]) : s[n - 1]; };
    return { n, s, mean, sd, q };
  };
  // bars at x0, x0+1, ... (lab = print the value above each bar)
  const stBars = (tp, ps, x0, color, hl, lab) => {
    ctx.save(); ctx.font = '600 10px Inter, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ps.forEach((p, i) => { const a = tp(x0 + i - 0.4, p), z = tp(x0 + i + 0.4, 0); ctx.fillStyle = i === hl ? '#ffffff' : color; ctx.fillRect(a[0], a[1], Math.max(1, z[0] - a[0]), z[1] - a[1]); if (lab && p > 0.0005) { ctx.fillStyle = '#ddd'; ctx.fillText(p < 1 ? p.toFixed(3) : fmtN(p, 3), (a[0] + z[0]) / 2, a[1] - 2); } });
    ctx.restore();
  };
  const stShade = (tp, f, a, b, color, n) => { n = n || 80; const pts = [[a, 0]]; for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pts.push([x, f(x)]); } pts.push([b, 0]); fillPoly(pts, tp, color); };
  const stLC = (a, b) => stLg(a + 1) - stLg(b + 1) - stLg(a - b + 1);

  GX.push({
    id: 'geometric', grp: 'stat', label: 'Geometric Distribution',
    inputs: [{ k: 'p', l: 'Success probability p', v: 0.3, min: 0.01, max: 0.99 }],
    presets: [['p = 0.1', { gx_geometric_p: 0.1 }], ['p = 0.3', { gx_geometric_p: 0.3 }], ['p = 0.5 (coin)', { gx_geometric_p: 0.5 }], ['p = 0.8', { gx_geometric_p: 0.8 }]],
    plot(v, W, H) {
      const p = v.p, q = 1 - p, K = Math.min(80, Math.max(6, Math.ceil(Math.log(0.001) / Math.log(q)) + 1)), pr = []; for (let k = 1; k <= K; k++) pr.push(Math.pow(q, k - 1) * p);
      const bx = { x0: 0.2, x1: K + 0.8, y0: -p * 0.06, y1: p * 1.2 }, tp = view(bx, W, H), acc = accentColor();
      stBars(tp, pr, 1, 'rgba(255,138,31,0.8)', 0, K <= 14); seg(tp, 1 / p, 0, 1 / p, p, '#5a9ad8', true, 1.8); axT(W, H, 'k (trial of the first success)', 'P(X = k)');
      return [{ color: acc, label: 'Geometric(p = ' + fmtN(p, 3) + '): P(X = k) = (1 − p)^(k−1) · p — the first success happens on trial k' }, { color: '#5a9ad8', label: 'Mean = 1/p = ' + fmtN(1 / p, 4) + ' trials (dashed line) · variance = (1 − p)/p² = ' + fmtN(q / (p * p), 4) },
        { color: '#ffffff', label: 'Most likely: success on the very first trial, P = p = ' + fmtN(p, 4) + ' · P(X ≤ 3) = ' + fmtN(1 - Math.pow(q, 3), 4) }, { color: '#3fbf6f', label: 'Memoryless: the chance of waiting longer does not depend on how long you have already waited' }];
    }
  });

  GX.push({
    id: 'exponential', grp: 'stat', label: 'Exponential Distribution',
    inputs: [{ k: 'lam', l: 'Rate λ', v: 1, r: 0, min: 0.01 }, { k: 'x', l: 'Mark x', v: 1, r: 0, min: 0 }],
    presets: [['λ = 0.5', { gx_exponential_lam: 0.5, gx_exponential_x: 2 }], ['λ = 1', { gx_exponential_lam: 1, gx_exponential_x: 1 }], ['λ = 2', { gx_exponential_lam: 2, gx_exponential_x: 0.5 }], ['λ = 0.1', { gx_exponential_lam: 0.1, gx_exponential_x: 10 }]],
    plot(v, W, H) {
      const { lam, x } = v, xm = Math.max(5 / lam, x * 1.3), f = t => lam * Math.exp(-lam * t), F = t => 1 - Math.exp(-lam * t);
      const bx = box([0, xm], [0, Math.max(lam, 1)], { zero: true, pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      stShade(tp, f, 0, Math.min(x, xm), 'rgba(255,138,31,0.28)'); poly(samplePts(F, 0, xm, 300), tp, '#5a9ad8', bx, { lw: 2.4 }); poly(samplePts(f, 0, xm, 300), tp, acc, bx, { lw: 2.8 });
      seg(tp, x, 0, x, F(x), 'rgba(255,255,255,0.4)', true, 1.2); dot(tp, x, F(x), '#ffffff', 'P = ' + fmtN(F(x), 3), 8, -10); axT(W, H, 'x', 'f(x)  ·  F(x)');
      return [{ color: acc, label: 'Density f(x) = λe^(−λx) · shaded area = P(X ≤ x)' }, { color: '#5a9ad8', label: 'Cumulative F(x) = 1 − e^(−λx) (rises towards 1)' },
        { color: '#ffffff', label: 'P(X ≤ ' + fmtN(x, 4) + ') = ' + fmtN(F(x), 5) + ' · P(X > ' + fmtN(x, 4) + ') = ' + fmtN(1 - F(x), 5) }, { color: '#3fbf6f', label: 'Mean = SD = 1/λ = ' + fmtN(1 / lam, 4) + ' · median = ln2/λ = ' + fmtN(Math.LN2 / lam, 4) + ' · memoryless (waiting times, lifetimes)' }];
    }
  });

  GX.push({
    id: 'uniform', grp: 'stat', label: 'Continuous Uniform Distribution',
    inputs: [{ k: 'a', l: 'a (min)', v: 0, r: 0 }, { k: 'b', l: 'b (max)', v: 10, r: 0 }, { k: 'c', l: 'P( c <', v: 2, r: 1 }, { k: 'd', l: 'X < d )', v: 7, r: 1 }],
    presets: [['U(0, 10)', { gx_uniform_a: 0, gx_uniform_b: 10, gx_uniform_c: 2, gx_uniform_d: 7 }], ['U(0, 1)', { gx_uniform_a: 0, gx_uniform_b: 1, gx_uniform_c: 0.25, gx_uniform_d: 0.6 }], ['U(−5, 5)', { gx_uniform_a: -5, gx_uniform_b: 5, gx_uniform_c: -1, gx_uniform_d: 3 }]],
    plot(v, W, H) {
      const { a, b, c, d } = v; if (a >= b) bad(tx('graph_x_uni_ab', 'b must be larger than a.')); if (c >= d) bad(tx('graph_x_uni_cd', 'd must be larger than c.'));
      const h = 1 / (b - a), w = b - a, bx = { x0: a - 0.25 * w, x1: b + 0.25 * w, y0: -h * 0.08, y1: h * 1.35 }, tp = view(bx, W, H), acc = accentColor(), lo = Math.max(a, c), hi = Math.min(b, d), P = Math.max(0, hi - lo) / w;
      if (hi > lo) fillPoly([[lo, 0], [lo, h], [hi, h], [hi, 0]], tp, 'rgba(255,138,31,0.3)');
      seg(tp, bx.x0, 0, a, 0, acc, false, 3); seg(tp, a, 0, a, h, acc, false, 3); seg(tp, a, h, b, h, acc, false, 3); seg(tp, b, h, b, 0, acc, false, 3); seg(tp, b, 0, bx.x1, 0, acc, false, 3);
      axT(W, H, 'x', 'f(x)');
      return [{ color: acc, label: 'Uniform(' + fmtN(a, 4) + ', ' + fmtN(b, 4) + '): every value equally likely · height f = 1/(b − a) = ' + fmtN(h, 5) }, { color: 'rgba(255,138,31,0.85)', label: 'P(' + fmtN(c, 4) + ' < X < ' + fmtN(d, 4) + ') = shaded area = ' + fmtN(P, 5) + ' (' + fmtN(P * 100, 4) + '%)' },
        { color: '#5a9ad8', label: 'Mean = (a + b)/2 = ' + fmtN((a + b) / 2, 4) + ' · SD = (b − a)/√12 = ' + fmtN(w / Math.sqrt(12), 4) }, { color: '#ffffff', label: 'Area of the whole rectangle = (b − a) × 1/(b − a) = 1' }];
    }
  });

  GX.push({
    id: 'hypergeo', grp: 'stat', label: 'Hypergeometric Distribution',
    inputs: [{ k: 'N', l: 'Population N', v: 50, r: 0, min: 2, max: 2000, int: true }, { k: 'K', l: 'Successes K', v: 20, r: 0, min: 0, max: 2000, int: true }, { k: 'n', l: 'Draws n', v: 10, r: 1, min: 1, max: 2000, int: true }],
    presets: [['Cards: 5 from 52, 13 hearts', { gx_hypergeo_N: 52, gx_hypergeo_K: 13, gx_hypergeo_n: 5 }], ['Default', { gx_hypergeo_N: 50, gx_hypergeo_K: 20, gx_hypergeo_n: 10 }], ['Small pond (N = 20)', { gx_hypergeo_N: 20, gx_hypergeo_K: 8, gx_hypergeo_n: 10 }]],
    plot(v, W, H) {
      const { N, K, n } = v; if (K > N) bad(tx('graph_x_hg_K', 'K cannot be larger than N.')); if (n > N) bad(tx('graph_x_hg_n', 'n cannot be larger than N.'));
      const k0 = Math.max(0, n - (N - K)), k1 = Math.min(n, K), pr = [], pb = [], pp = K / N; for (let k = k0; k <= k1; k++) { pr.push(Math.exp(stLC(K, k) + stLC(N - K, n - k) - stLC(N, n))); pb.push(pp > 0 && pp < 1 ? Math.exp(stLC(n, k) + k * Math.log(pp) + (n - k) * Math.log(1 - pp)) : (pp === 0 ? (k === 0 ? 1 : 0) : (k === n ? 1 : 0))); }
      const pm = Math.max.apply(null, pr.concat(pb)), bx = { x0: k0 - 0.8, x1: k1 + 0.8, y0: -pm * 0.06, y1: pm * 1.2 }, tp = view(bx, W, H), acc = accentColor(), mi = pr.indexOf(Math.max.apply(null, pr));
      stBars(tp, pr, k0, 'rgba(255,138,31,0.8)', mi, pr.length <= 16); pb.forEach((p, i) => dot(tp, k0 + i, p, '#5a9ad8', '', 0, 0)); axT(W, H, 'k (successes in the sample)', 'P(X = k)');
      const mean = n * K / N, varr = n * pp * (1 - pp) * (N - n) / (N - 1);
      return [{ color: acc, label: 'Hypergeometric(N = ' + N + ', K = ' + K + ', n = ' + n + '): draws WITHOUT replacement · P(X = k) = C(K,k)·C(N−K,n−k) / C(N,n)' }, { color: '#5a9ad8', label: 'Blue dots: the binomial (draws WITH replacement) for comparison — close when N is large compared with n' },
        { color: '#ffffff', label: 'Mean = nK/N = ' + fmtN(mean, 4) + ' · variance = ' + fmtN(varr, 4) + ' (smaller than binomial by the factor (N − n)/(N − 1))' }, { color: '#3fbf6f', label: 'Most likely value k = ' + (k0 + mi) + ' with P = ' + fmtN(pr[mi], 4) }];
    }
  });

  GX.push({
    id: 'tdist', grp: 'stat', label: "Student's t Distribution",
    inputs: [{ k: 'df', l: 'Degrees of freedom', v: 5, r: 0, min: 1, max: 500, int: true }, { k: 'conf', l: 'Confidence (%)', v: 95, r: 0, min: 50, max: 99.9 }],
    presets: [['df = 1 (Cauchy)', { gx_tdist_df: 1 }], ['df = 5', { gx_tdist_df: 5 }], ['df = 10', { gx_tdist_df: 10 }], ['df = 30', { gx_tdist_df: 30 }], ['df = 200', { gx_tdist_df: 200 }]],
    plot(v, W, H) {
      const { df, conf } = v, a = 1 - conf / 100, tc = stTInv(1 - a / 2, df), zc = stInvN(1 - a / 2), xm = 5;
      const bx = { x0: -xm, x1: xm, y0: -0.02, y1: 0.43 }, tp = view(bx, W, H), acc = accentColor(), f = x => stTPdf(x, df);
      if (tc < xm) { stShade(tp, f, tc, xm, 'rgba(232,84,139,0.35)'); stShade(tp, f, -xm, -tc, 'rgba(232,84,139,0.35)'); seg(tp, tc, 0, tc, f(tc), '#e8548b', true, 1.4); seg(tp, -tc, 0, -tc, f(tc), '#e8548b', true, 1.4); }
      poly(samplePts(stNPdf, -xm, xm, 300), tp, 'rgba(255,255,255,0.6)', bx, { lw: 2, dash: true }); poly(samplePts(f, -xm, xm, 300), tp, acc, bx, { lw: 2.8 }); axT(W, H, 't', 'density');
      return [{ color: acc, label: 't distribution with ' + df + ' degrees of freedom — bell-shaped but with heavier tails' }, { color: 'rgba(255,255,255,0.7)', label: 'Dashed white: the standard normal curve for comparison', dashed: true },
        { color: '#e8548b', label: fmtN(conf, 4) + '% two-sided critical value: t* = ±' + fmtN(tc, 4) + (tc < xm ? ' (pink tails = ' + fmtN(a * 100, 3) + '% in total)' : ' (beyond the plotted range)') + ' vs z* = ±' + fmtN(zc, 4) },
        { color: '#3fbf6f', label: df > 2 ? 'Variance = df/(df − 2) = ' + fmtN(df / (df - 2), 4) + ' (larger than the normal\'s 1) · as df grows, t → normal' : 'Variance is infinite or undefined for df ≤ 2' }];
    }
  });

  GX.push({
    id: 'chisq', grp: 'stat', label: 'Chi-square Distribution',
    inputs: [{ k: 'df', l: 'Degrees of freedom', v: 4, r: 0, min: 1, max: 100, int: true }, { k: 'al', l: 'Significance α (%)', v: 5, r: 0, min: 0.1, max: 50 }],
    presets: [['df = 1', { gx_chisq_df: 1 }], ['df = 2', { gx_chisq_df: 2 }], ['df = 4', { gx_chisq_df: 4 }], ['df = 10', { gx_chisq_df: 10 }], ['df = 30', { gx_chisq_df: 30 }]],
    plot(v, W, H) {
      const { df, al } = v, k = df / 2, xm = df + 5 * Math.sqrt(2 * df) + 5, f = x => x <= 0 ? 0 : Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.LN2 - stLg(k)), crit = stBis(x => stGP(k, x / 2), 1 - al / 100, 0, xm * 6);
      let top = 0; for (let i = 1; i <= 400; i++) top = Math.max(top, f(xm * i / 400)); top = df <= 2 ? Math.min(0.6, Math.max(top, 0.5)) : top;
      const bx = box([0, xm], [0, top], { pad: 0.1, W, H }), tp = view(bx, W, H), acc = accentColor();
      if (crit < xm) { stShade(tp, f, Math.max(crit, 0.0001), xm, 'rgba(232,84,139,0.35)'); seg(tp, crit, 0, crit, f(crit), '#e8548b', true, 1.6); dot(tp, crit, 0, '#e8548b', 'χ² = ' + fmtN(crit, 4), 8, -12); }
      poly(samplePts(f, xm / 800, xm, 400), tp, acc, bx, { lw: 2.8 }); axT(W, H, 'χ²', 'density');
      return [{ color: acc, label: 'χ² distribution with ' + df + ' degrees of freedom (sum of ' + df + ' squared standard normals) · always ≥ 0, skewed right' }, { color: '#e8548b', label: 'Upper ' + fmtN(al, 3) + '% tail starts at χ² = ' + fmtN(crit, 5) + ' — reject H₀ in a test if the statistic is larger' },
        { color: '#5a9ad8', label: 'Mean = df = ' + df + ' · variance = 2·df = ' + (2 * df) + ' · mode = ' + Math.max(df - 2, 0) }, { color: '#3fbf6f', label: 'For large df the shape becomes close to a normal curve' }];
    }
  });

  GX.push({
    id: 'beta', grp: 'stat', label: 'Beta Distribution',
    inputs: [{ k: 'a', l: 'α', v: 2, r: 0, min: 0.1, max: 50 }, { k: 'b', l: 'β', v: 5, r: 0, min: 0.1, max: 50 }],
    presets: [['Uniform (1, 1)', { gx_beta_a: 1, gx_beta_b: 1 }], ['U-shape (0.5, 0.5)', { gx_beta_a: 0.5, gx_beta_b: 0.5 }], ['Symmetric (5, 5)', { gx_beta_a: 5, gx_beta_b: 5 }], ['Right-skew (2, 5)', { gx_beta_a: 2, gx_beta_b: 5 }], ['Left-skew (5, 2)', { gx_beta_a: 5, gx_beta_b: 2 }]],
    plot(v, W, H) {
      const { a, b } = v, lB = stLg(a) + stLg(b) - stLg(a + b), f = x => (x <= 0 || x >= 1) ? NaN : Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - lB);
      let top = 0; for (let i = 1; i < 400; i++) top = Math.max(top, f(i / 400)); top = Math.min(top, 6);
      const bx = box([0, 1], [0, top], { pad: 0.1, W, H }), tp = view(bx, W, H), acc = accentColor(), mean = a / (a + b);
      stShade(tp, x => Math.min(f(x), top * 1.5), 0.001, 0.999, 'rgba(255,138,31,0.18)', 200); poly(samplePts(f, 0.0005, 0.9995, 500), tp, acc, bx, { lw: 2.8 }); seg(tp, mean, 0, mean, top, '#5a9ad8', true, 1.6); axT(W, H, 'x (between 0 and 1)', 'density');
      return [{ color: acc, label: 'Beta(α = ' + fmtN(a, 3) + ', β = ' + fmtN(b, 3) + ') — a distribution for proportions and probabilities between 0 and 1' }, { color: '#5a9ad8', label: 'Mean = α/(α + β) = ' + fmtN(mean, 4) + ' (dashed) · SD = ' + fmtN(Math.sqrt(a * b / ((a + b) * (a + b) * (a + b + 1))), 4) },
        { color: '#ffffff', label: a > 1 && b > 1 ? 'Mode = (α − 1)/(α + β − 2) = ' + fmtN((a - 1) / (a + b - 2), 4) : (a < 1 && b < 1 ? 'U-shaped: most weight near 0 and 1' : 'The density piles up at an end — no interior peak') }, { color: '#3fbf6f', label: a === b ? 'α = β: symmetric about 0.5' : (a < b ? 'α < β: skewed towards 0 (small proportions)' : 'α > β: skewed towards 1 (large proportions)') }];
    }
  });

  GX.push({
    id: 'dice', grp: 'stat', label: 'Sum of Dice (distribution)',
    inputs: [{ k: 'n', l: 'Number of dice', v: 2, r: 0, min: 1, max: 8, int: true }, { k: 's', l: 'Sides per die', v: 6, r: 0, min: 2, max: 20, int: true }],
    presets: [['1 die', { gx_dice_n: 1, gx_dice_s: 6 }], ['2 dice', { gx_dice_n: 2, gx_dice_s: 6 }], ['3 dice', { gx_dice_n: 3, gx_dice_s: 6 }], ['6 dice', { gx_dice_n: 6, gx_dice_s: 6 }], ['2 × d20', { gx_dice_n: 2, gx_dice_s: 20 }]],
    plot(v, W, H) {
      const { n, s } = v; let cnt = [1]; for (let i = 0; i < n; i++) { const nx = new Array(cnt.length + s - 1).fill(0); cnt.forEach((c, j) => { for (let q = 0; q < s; q++) nx[j + q] += c; }); cnt = nx; }
      const tot = Math.pow(s, n), pr = cnt.map(c => c / tot), mean = n * (s + 1) / 2, sd = Math.sqrt(n * (s * s - 1) / 12), pm = Math.max.apply(null, pr), mi = pr.indexOf(pm);
      const bx = { x0: n - 0.8, x1: n * s + 0.8, y0: -pm * 0.06, y1: pm * 1.2 }, tp = view(bx, W, H), acc = accentColor();
      stBars(tp, pr, n, 'rgba(255,138,31,0.8)', mi, pr.length <= 17); if (n > 1) poly(samplePts(x => stNPdf((x - mean) / sd) / sd, n, n * s, 300), tp, '#5a9ad8', bx, { lw: 2.2, dash: true }); axT(W, H, 'sum of the dice', 'probability');
      return [{ color: acc, label: n + ' × d' + s + ': ' + fmtN(tot, 12) + ' equally likely outcomes — bars show P(sum)' }, { color: '#ffffff', label: 'Most likely sum = ' + (n + mi) + ' with P = ' + fmtN(pm, 4) + (n > 1 ? ' (' + fmtN(pm * tot, 12) + ' ways)' : '') },
        { color: '#5a9ad8', label: 'Mean = n(s + 1)/2 = ' + fmtN(mean, 4) + ' · SD = ' + fmtN(sd, 4) + (n > 1 ? ' · dashed curve = normal approximation (more dice → closer fit)' : ''), dashed: n > 1 }, { color: '#3fbf6f', label: 'Sum can range from ' + n + ' to ' + (n * s) + ' · P(sum ≥ mean) = ' + fmtN(pr.reduce((q, p, i) => q + (n + i >= mean ? p : 0), 0), 4) }];
    }
  });

  GX.push({
    id: 'birthday', grp: 'stat', label: 'Birthday Paradox',
    inputs: [{ k: 'days', l: 'Days in a year', v: 365, r: 0, min: 2, max: 1000, int: true }, { k: 'km', l: 'Plot up to people', v: 60, r: 0, min: 5, max: 300, int: true }, { k: 'k', l: 'Group size', v: 23, r: 1, min: 1, max: 300, int: true }],
    presets: [['Classic: 23 people', { gx_birthday_days: 365, gx_birthday_k: 23, gx_birthday_km: 60 }], ['Class of 40', { gx_birthday_days: 365, gx_birthday_k: 40, gx_birthday_km: 80 }], ['100 people', { gx_birthday_days: 365, gx_birthday_k: 70, gx_birthday_km: 100 }]],
    plot(v, W, H) {
      const { days, km, k } = v, P = []; let q = 1; P.push(0); for (let i = 1; i <= Math.max(km, k); i++) { q *= Math.max(0, (days - (i - 1)) / days); P.push(1 - q); }
      const first = tg => { for (let i = 1; i < P.length; i++) if (P[i] >= tg) return i; return null; }, bx = box([1, km], [0, 1], { pad: 0.05, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, 1, 0.5, km, 0.5, 'rgba(255,255,255,0.35)', true, 1.2); poly(P.slice(1, km + 1).map((p, i) => [i + 1, p]), tp, acc, bx, { lw: 2.8 });
      const f50 = first(0.5); if (f50 && f50 <= km) { dot(tp, f50, P[f50], '#ffffff', f50 + ' people → ' + fmtN(P[f50] * 100, 3) + '%', 8, 12); }
      if (k <= km) dot(tp, k, P[k], '#3fbf6f', 'k = ' + k, 8, -10); axT(W, H, 'people in the room', 'P(two share a birthday)');
      return [{ color: acc, label: 'P(at least two share a birthday) = 1 − (d/d)·((d−1)/d)·…·((d−k+1)/d) with d = ' + days + ' days' }, { color: '#3fbf6f', label: 'With ' + k + ' people: ' + fmtN(P[k] * 100, 4) + '% (' + fmtN(P[k], 5) + ')' },
        { color: '#ffffff', label: 'Passes 50% at just ' + f50 + ' people' + (first(0.99) ? ' · passes 99% at ' + first(0.99) + ' people' : '') }, { color: '#5a9ad8', label: 'Surprising because the number of PAIRS grows fast: ' + k + ' people make ' + fmtN(k * (k - 1) / 2, 6) + ' pairs' }];
    }
  });

  GX.push({
    id: 'clt', grp: 'stat', label: 'Central Limit Theorem (simulation)',
    inputs: [{ k: 'pop', l: 'Population', t: 's', v: 'exp', opts: [['unif', 'Uniform (0 – 1)'], ['exp', 'Exponential (skewed)'], ['die', 'Fair die'], ['bern', 'Coin flip (0 / 1)']] }, { k: 'n', l: 'Sample size n', v: 5, r: 0, min: 1, max: 200, int: true }, { k: 'm', l: 'Samples', v: 3000, r: 0, min: 100, max: 20000, int: true }, { k: 'seed', l: 'Seed', v: 1, r: 1, int: true }],
    presets: [['Skewed, n = 1', { gx_clt_pop: 'exp', gx_clt_n: 1 }], ['Skewed, n = 5', { gx_clt_pop: 'exp', gx_clt_n: 5 }], ['Skewed, n = 30', { gx_clt_pop: 'exp', gx_clt_n: 30 }], ['Dice, n = 10', { gx_clt_pop: 'die', gx_clt_n: 10 }], ['Coin, n = 30', { gx_clt_pop: 'bern', gx_clt_n: 30 }]],
    plot(v, W, H) {
      const { pop, n, m, seed } = v, rnd = stRng(seed), D = { unif: [0.5, Math.sqrt(1 / 12), () => rnd(), 'Uniform(0, 1)'], exp: [1, 1, () => -Math.log(1 - rnd()), 'Exponential(1)'], die: [3.5, Math.sqrt(35 / 12), () => 1 + Math.floor(rnd() * 6), 'a fair die'], bern: [0.5, 0.5, () => rnd() < 0.5 ? 1 : 0, 'coin flips'] }[pop] || [0.5, 0.29, () => rnd(), 'Uniform'];
      const mu = D[0], sg0 = D[1], draw = D[2], means = []; for (let i = 0; i < m; i++) { let s = 0; for (let j = 0; j < n; j++) s += draw(); means.push(s / n); }
      const se = sg0 / Math.sqrt(n), lo = Math.min.apply(null, means), hi = Math.max.apply(null, means), nb = 30, w = (hi - lo) / nb || 1, dens = new Array(nb).fill(0); means.forEach(x => { dens[Math.min(nb - 1, Math.floor((x - lo) / w))] += 1 / (m * w); });
      const top = Math.max(Math.max.apply(null, dens), stNPdf(0) / se), bx = { x0: lo - w, x1: hi + w, y0: 0, y1: top * 1.15 }, tp = view(bx, W, H), acc = accentColor();
      ctx.save(); ctx.fillStyle = 'rgba(255,138,31,0.55)'; dens.forEach((d, i) => { const a = tp(lo + i * w, d), z = tp(lo + (i + 1) * w, 0); ctx.fillRect(a[0] + 0.5, a[1], Math.max(1, z[0] - a[0] - 1), z[1] - a[1]); }); ctx.restore();
      poly(samplePts(x => stNPdf((x - mu) / se) / se, lo - w, hi + w, 300), tp, '#5a9ad8', bx, { lw: 2.8 }); axT(W, H, 'sample mean', 'density');
      const om = means.reduce((a, b) => a + b, 0) / m, os = Math.sqrt(means.reduce((a, b) => a + (b - om) * (b - om), 0) / (m - 1));
      return [{ color: acc, label: 'Histogram of ' + m + ' sample means, each from ' + n + ' draws of ' + D[3] + ' (seed ' + seed + ')' }, { color: '#5a9ad8', label: 'Blue curve: normal with mean μ = ' + fmtN(mu, 4) + ' and SD σ/√n = ' + fmtN(se, 4) + ' predicted by the theorem' },
        { color: '#ffffff', label: 'Observed: mean of means = ' + fmtN(om, 4) + ' · SD of means = ' + fmtN(os, 4) }, { color: '#3fbf6f', label: n < 5 ? 'Small n: the shape still looks like the population — raise n and watch it turn into a bell' : 'The bigger n is, the closer to a bell curve — and the narrower it gets (SD shrinks by √n)' }];
    }
  });

  GX.push({
    id: 'lln', grp: 'stat', label: 'Law of Large Numbers (coin flips)',
    inputs: [{ k: 'p', l: 'P(heads) p', v: 0.5, r: 0, min: 0.01, max: 0.99 }, { k: 'N', l: 'Flips', v: 1000, r: 0, min: 10, max: 20000, int: true }, { k: 'seed', l: 'Seed', v: 3, r: 1, int: true }],
    presets: [['Fair coin, 1000', { gx_lln_p: 0.5, gx_lln_N: 1000 }], ['Fair coin, 100', { gx_lln_p: 0.5, gx_lln_N: 100 }], ['Biased (0.3)', { gx_lln_p: 0.3, gx_lln_N: 1000 }], ['Another run', { gx_lln_seed: 11 }]],
    plot(v, W, H) {
      const { p, N, seed } = v, rnd = stRng(seed), pts = []; let h = 0; for (let i = 1; i <= N; i++) { if (rnd() < p) h++; pts.push([i, h / i]); }
      const bx = box([1, N], [0, 1], { pad: 0.04, W, H }), tp = view(bx, W, H), acc = accentColor(), sd = n => 3 * Math.sqrt(p * (1 - p) / n);
      [1, -1].forEach(sgn => poly(samplePts(n => p + sgn * sd(n), 1, N, 300), tp, 'rgba(90,154,216,0.8)', bx, { lw: 1.6, dash: true })); seg(tp, 1, p, N, p, '#ffffff', true, 1.6); poly(pts, tp, acc, bx, { lw: 2.2 }); axT(W, H, 'number of flips', 'proportion of heads');
      const fin = pts[N - 1][1];
      return [{ color: acc, label: 'Running proportion of heads after each flip (seed ' + seed + ')' }, { color: '#ffffff', label: 'True probability p = ' + fmtN(p, 3) + ' (white line) · after ' + N + ' flips the proportion is ' + fmtN(fin, 5) + ' (off by ' + fmtN(Math.abs(fin - p), 4) + ')' },
        { color: '#5a9ad8', label: 'Dashed funnel = p ± 3√(p(1 − p)/n): it narrows as n grows', dashed: true }, { color: '#3fbf6f', label: 'Heads: ' + Math.round(fin * N) + ' (expected ' + fmtN(p * N, 5) + ') — the PROPORTION settles down, but the raw gap |heads − Np| can keep growing' }];
    }
  });

  GX.push({
    id: 'ci', grp: 'stat', label: 'Confidence Interval for a Mean',
    inputs: [{ k: 'xb', l: 'Sample mean x̄', v: 50, r: 0 }, { k: 's', l: 'Sample SD s', v: 10, r: 0, min: 0.0001 }, { k: 'n', l: 'n', v: 25, r: 1, min: 2, max: 100000, int: true }, { k: 'lv', l: 'Confidence (%)', v: 95, r: 1, min: 50, max: 99.9 }],
    presets: [['95%, n = 25', { gx_ci_n: 25, gx_ci_lv: 95 }], ['99%', { gx_ci_n: 25, gx_ci_lv: 99 }], ['90%', { gx_ci_n: 25, gx_ci_lv: 90 }], ['Small sample n = 5', { gx_ci_n: 5, gx_ci_lv: 95 }], ['Big sample n = 400', { gx_ci_n: 400, gx_ci_lv: 95 }]],
    plot(v, W, H) {
      const { xb, s, n, lv } = v, se = s / Math.sqrt(n), df = n - 1, a = 1 - lv / 100, tc = stTInv(1 - a / 2, df), zc = stInvN(1 - a / 2), me = tc * se, lo = xb - me, hi = xb + me;
      const f = x => stTPdf((x - xb) / se, df) / se, ext = Math.max(4.5 * se, me * 1.25), bx = { x0: xb - ext, x1: xb + ext, y0: -f(xb) * 0.05, y1: f(xb) * 1.2 }, tp = view(bx, W, H), acc = accentColor();
      stShade(tp, f, lo, hi, 'rgba(63,191,111,0.28)'); poly(samplePts(f, bx.x0, bx.x1, 400), tp, acc, bx, { lw: 2.8 }); seg(tp, xb, 0, xb, f(xb), '#ffffff', true, 1.6);
      dot(tp, lo, 0, '#3fbf6f', fmtN(lo, 4), 0, -12); dot(tp, hi, 0, '#3fbf6f', fmtN(hi, 4), 0, -12); axT(W, H, 'possible values of the true mean μ', '');
      return [{ color: acc, label: 'Sampling distribution of the mean (t-curve, df = ' + df + ') centred at x̄ = ' + fmtN(xb, 4) + ' with standard error s/√n = ' + fmtN(se, 4) }, { color: '#3fbf6f', label: fmtN(lv, 4) + '% confidence interval: ( ' + fmtN(lo, 5) + ' , ' + fmtN(hi, 5) + ' ) — the green area is ' + fmtN(lv, 4) + '% of the curve' },
        { color: '#ffffff', label: 'Margin of error = t* × s/√n = ' + fmtN(tc, 4) + ' × ' + fmtN(se, 4) + ' = ±' + fmtN(me, 4) }, { color: '#5a9ad8', label: 'Using z* = ' + fmtN(zc, 4) + ' instead would give ±' + fmtN(zc * se, 4) + ' — too narrow for small samples · more data or lower confidence → narrower interval' }];
    }
  });

  GX.push({
    id: 'ztest', grp: 'stat', label: 'Hypothesis Test (z-test, rejection region)',
    inputs: [{ k: 'mu0', l: 'H₀: μ =', v: 100, r: 0 }, { k: 'xb', l: 'Sample mean x̄', v: 103, r: 0 }, { k: 'sg', l: 'σ', v: 10, r: 1, min: 0.0001 }, { k: 'n', l: 'n', v: 25, r: 1, min: 1, max: 100000, int: true }, { k: 'al', l: 'α (%)', v: 5, r: 2, min: 0.1, max: 50 }, { k: 'tail', l: 'H₁', t: 's', v: 'two', opts: [['two', 'μ ≠ μ₀ (two-tailed)'], ['right', 'μ > μ₀ (right-tailed)'], ['left', 'μ < μ₀ (left-tailed)']] }],
    presets: [['Reject (two-tailed)', { gx_ztest_xb: 104, gx_ztest_tail: 'two' }], ['Fail to reject', { gx_ztest_xb: 101, gx_ztest_tail: 'two' }], ['Right-tailed', { gx_ztest_xb: 103.5, gx_ztest_tail: 'right' }], ['Left-tailed', { gx_ztest_xb: 96, gx_ztest_tail: 'left' }]],
    plot(v, W, H) {
      const { mu0, xb, sg, n, al, tail } = v, a = al / 100, se = sg / Math.sqrt(n), z = (xb - mu0) / se, xm = Math.max(4, Math.abs(z) + 0.8);
      const bx = { x0: -xm, x1: xm, y0: -0.02, y1: 0.45 }, tp = view(bx, W, H), acc = accentColor(), rej = 'rgba(232,84,139,0.38)'; let crit, p;
      if (tail === 'two') { crit = stInvN(1 - a / 2); p = 2 * (1 - stNCdf(Math.abs(z))); stShade(tp, stNPdf, crit, xm, rej); stShade(tp, stNPdf, -xm, -crit, rej); }
      else if (tail === 'right') { crit = stInvN(1 - a); p = 1 - stNCdf(z); stShade(tp, stNPdf, crit, xm, rej); }
      else { crit = -stInvN(1 - a); p = stNCdf(z); stShade(tp, stNPdf, -xm, crit, rej); }
      poly(samplePts(stNPdf, -xm, xm, 300), tp, acc, bx, { lw: 2.8 }); const zc = z > xm ? xm : (z < -xm ? -xm : z); seg(tp, zc, 0, zc, 0.42, '#ffffff', false, 2.6); dot(tp, zc, 0.42, '#ffffff', 'z = ' + fmtN(z, 4), zc > 0 ? -8 : 8, 0); axT(W, H, 'z (standard units under H₀)', '');
      const reject = p < a;
      return [{ color: acc, label: 'Standard normal curve (distribution of z if H₀ is true) · z = (x̄ − μ₀)/(σ/√n) = ' + fmtN(z, 4) + ' with SE = ' + fmtN(se, 4) }, { color: '#e8548b', label: 'Rejection region (pink, total area α = ' + fmtN(al, 3) + '%): ' + (tail === 'two' ? '|z| > ' + fmtN(crit, 4) : tail === 'right' ? 'z > ' + fmtN(crit, 4) : 'z < ' + fmtN(crit, 4)) },
        { color: '#ffffff', label: 'p-value = ' + fmtN(p, 5) + (reject ? ' < α → z falls in the rejection region' : ' ≥ α → z is outside the rejection region') }, { color: reject ? '#e8548b' : '#3fbf6f', label: reject ? 'Decision: REJECT H₀ — evidence that the mean differs as H₁ states' : 'Decision: FAIL TO REJECT H₀ — not enough evidence (this does not prove H₀ true)' }];
    }
  });

  GX.push({
    id: 'bayes', grp: 'stat', label: "Bayes' Theorem (medical test)",
    inputs: [{ k: 'pv', l: 'Prevalence (%)', v: 1, r: 0, min: 0.001, max: 99.999 }, { k: 'se', l: 'Sensitivity (%)', v: 95, r: 0, min: 0, max: 100 }, { k: 'sp', l: 'Specificity (%)', v: 95, r: 1, min: 0, max: 100 }],
    presets: [['Rare disease (1%)', { gx_bayes_pv: 1, gx_bayes_se: 95, gx_bayes_sp: 95 }], ['Common (20%)', { gx_bayes_pv: 20, gx_bayes_se: 95, gx_bayes_sp: 95 }], ['Excellent test (99.9%)', { gx_bayes_pv: 1, gx_bayes_se: 99.9, gx_bayes_sp: 99.9 }], ['Very rare (0.1%)', { gx_bayes_pv: 0.1, gx_bayes_se: 99, gx_bayes_sp: 99 }]],
    plot(v, W, H) {
      const { pv, se, sp } = v, N = 10000, sick = N * pv / 100, well = N - sick, TP = sick * se / 100, FN = sick - TP, FP = well * (1 - sp / 100), TN = well - FP, ymax = Math.max(TP, FP, FN, TN, 1);
      const bx = { x0: 0.3, x1: 4.7, y0: -ymax * 0.16, y1: ymax * 1.18 }, tp = drawAxes(W, H, bx.x0, bx.x1, bx.y0, bx.y1), cols = ['#3fbf6f', '#e8548b', '#f2c14e', '#5a9ad8'], names = ['True +', 'False +', 'False −', 'True −'], vals = [TP, FP, FN, TN];
      ctx.save(); vals.forEach((val, i) => { const a = tp(i + 0.6, val), z = tp(i + 1.4, 0); ctx.fillStyle = cols[i]; ctx.fillRect(a[0], a[1], z[0] - a[0], Math.max(1, z[1] - a[1])); }); ctx.restore();
      vals.forEach((val, i) => { txt(tp, i + 1, val, fmtN(val, 5), '#ffffff', 0, -10, 11); txt(tp, i + 1, -ymax * 0.08, names[i], cols[i], 0, 0, 11); });
      const post = TP / (TP + FP), npv = TN / (TN + FN);
      return [{ color: '#ffffff', label: 'Imagine ' + N + ' people: ' + fmtN(sick, 5) + ' have the disease (' + fmtN(pv, 4) + '%), ' + fmtN(well, 6) + ' do not' }, { color: '#3fbf6f', label: 'True positives ' + fmtN(TP, 5) + ' (sick, test +) · false negatives ' + fmtN(FN, 5) + ' (sick, test −)' },
        { color: '#e8548b', label: 'False positives ' + fmtN(FP, 5) + ' (healthy, test +) · true negatives ' + fmtN(TN, 6) + ' (healthy, test −)' }, { color: '#f2c14e', label: 'P(disease | positive test) = TP/(TP + FP) = ' + fmtN(post * 100, 4) + '%' + (post < 0.5 && se > 90 ? ' — much lower than the test’s accuracy, because most people are healthy' : '') },
        { color: '#5a9ad8', label: 'P(healthy | negative test) = ' + fmtN(npv * 100, 5) + '% · Bayes: P(D|+) = P(+|D)P(D) / [P(+|D)P(D) + P(+|not D)P(not D)]' }];
    }
  });

  GX.push({
    id: 'ecdf', grp: 'stat', label: 'Empirical CDF (step graph)',
    inputs: [{ k: 'xs', l: 'Data', t: 'xs', v: '12, 15, 15, 18, 20, 22, 22, 23, 25, 27, 28, 30, 31, 35, 41', min: 2 }],
    presets: [['Test scores', { gx_ecdf_xs: '45, 52, 58, 60, 61, 64, 67, 70, 72, 75, 78, 81, 85, 90, 96' }], ['Ages', { gx_ecdf_xs: '12, 15, 15, 18, 20, 22, 22, 23, 25, 27, 28, 30, 31, 35, 41' }], ['Small set', { gx_ecdf_xs: '2, 4, 4, 7, 9' }]],
    plot(v, W, H) {
      const S = stStat(v.xs), s = S.s, n = S.n, lo = s[0], hi = s[n - 1], pad = Math.max((hi - lo) * 0.12, 0.5), bx = { x0: lo - pad, x1: hi + pad, y0: -0.05, y1: 1.08 }, tp = view(bx, W, H), acc = accentColor();
      [0.25, 0.5, 0.75].forEach(q => seg(tp, bx.x0, q, bx.x1, q, 'rgba(255,255,255,0.25)', true, 1));
      const pts = [[bx.x0, 0]]; let i = 0; while (i < n) { let j = i; while (j + 1 < n && s[j + 1] === s[i]) j++; pts.push([s[i], i / n]); pts.push([s[i], (j + 1) / n]); i = j + 1; } pts.push([bx.x1, 1]);
      poly(pts, tp, acc, bx, { lw: 2.8 }); axT(W, H, 'value', 'proportion ≤ x');
      const med = S.q(0.5); dot(tp, med, 0.5, '#ffffff', 'median ' + fmtN(med, 4), 8, -10);
      return [{ color: acc, label: 'Empirical cumulative distribution: F(x) = fraction of the ' + n + ' values that are ≤ x (jumps by 1/n at each value, more for repeats)' }, { color: '#ffffff', label: 'Median = ' + fmtN(med, 4) + ' · Q₁ = ' + fmtN(S.q(0.25), 4) + ' · Q₃ = ' + fmtN(S.q(0.75), 4) + ' (where the curve crosses 0.25, 0.5, 0.75)' },
        { color: '#5a9ad8', label: 'Min = ' + fmtN(lo, 4) + ' · max = ' + fmtN(hi, 4) + ' · mean = ' + fmtN(S.mean, 4) + ' · sample SD = ' + fmtN(S.sd, 4) }, { color: '#3fbf6f', label: 'Steep parts = values bunched together · flat parts = gaps in the data' }];
    }
  });

  GX.push({
    id: 'qq', grp: 'stat', label: 'Normal Q–Q Plot (is it normal?)',
    inputs: [{ k: 'xs', l: 'Data (at least 4 values)', t: 'xs', v: '48, 52, 50, 47, 55, 51, 49, 53, 50, 46, 54, 52, 51, 49, 50, 56, 45, 51, 52, 48', min: 4 }],
    presets: [['Roughly normal', { gx_qq_xs: '48, 52, 50, 47, 55, 51, 49, 53, 50, 46, 54, 52, 51, 49, 50, 56, 45, 51, 52, 48' }], ['Right-skewed', { gx_qq_xs: '1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 5, 6, 8, 11, 15, 22, 35' }], ['Uniform-like', { gx_qq_xs: '1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20' }]],
    plot(v, W, H) {
      const S = stStat(v.xs), n = S.n, s = S.s; if (S.sd === 0) bad(tx('graph_x_samedata', 'The data values must not all be equal.'));
      const z = s.map((_, i) => stInvN((i + 1 - 0.375) / (n + 0.25))), zm = z.reduce((a, b) => a + b, 0) / n; let sxy = 0, sxx = 0, syy = 0; z.forEach((q, i) => { sxy += (q - zm) * (s[i] - S.mean); sxx += (q - zm) * (q - zm); syy += (s[i] - S.mean) * (s[i] - S.mean); }); const r = sxy / Math.sqrt(sxx * syy);
      const bx = box([z[0], z[n - 1]], [s[0], s[n - 1]], { pad: 0.12, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, bx.x0, S.mean + S.sd * bx.x0, bx.x1, S.mean + S.sd * bx.x1, '#5a9ad8', true, 2); z.forEach((q, i) => dot(tp, q, s[i], acc, '', 0, 0)); axT(W, H, 'theoretical normal quantile (z)', 'sample value');
      return [{ color: acc, label: 'Each dot pairs a sorted data value with the z-score it would have if the data were normal (n = ' + n + ')' }, { color: '#5a9ad8', label: 'Dashed line: perfect normal with the same mean ' + fmtN(S.mean, 4) + ' and SD ' + fmtN(S.sd, 4), dashed: true },
        { color: '#ffffff', label: 'Correlation of the dots r = ' + fmtN(r, 5) + (r > 0.98 ? ' → very close to a straight line: consistent with normal data' : r > 0.95 ? ' → fairly straight: roughly normal' : ' → clearly curved: probably NOT normal') }, { color: '#3fbf6f', label: 'Curved up at the right end = right skew · S-shape = heavy or light tails' }];
    }
  });

  GX.push({
    id: 'control', grp: 'stat', label: 'Control Chart (process monitoring)',
    inputs: [{ k: 'xs', l: 'Measurements in order (at least 5)', t: 'xs', v: '50.1, 49.8, 50.4, 50.0, 49.7, 50.3, 50.2, 49.9, 50.5, 49.6, 50.1, 50.0, 53.4, 49.8, 50.2, 50.3, 49.9, 50.1, 49.5, 50.4', min: 5 }],
    presets: [['One bad point', { gx_control_xs: '50.1, 49.8, 50.4, 50.0, 49.7, 50.3, 50.2, 49.9, 50.5, 49.6, 50.1, 50.0, 53.4, 49.8, 50.2, 50.3, 49.9, 50.1, 49.5, 50.4' }], ['Stable process', { gx_control_xs: '50.1, 49.8, 50.4, 50.0, 49.7, 50.3, 50.2, 49.9, 50.5, 49.6, 50.1, 50.0, 49.8, 50.2, 50.3, 49.9, 50.1, 49.5, 50.4, 50.0' }], ['Drifting upward', { gx_control_xs: '49.5, 49.6, 49.6, 49.8, 49.9, 50.0, 50.1, 50.3, 50.4, 50.5, 50.7, 50.8, 51.0, 51.1, 51.3, 51.4, 51.6, 51.7, 51.9, 52.1' }]],
    plot(v, W, H) {
      const d = v.xs, n = d.length, mean = d.reduce((a, b) => a + b, 0) / n; let mr = 0; for (let i = 1; i < n; i++) mr += Math.abs(d[i] - d[i - 1]); mr /= (n - 1); if (mr === 0) bad(tx('graph_x_samedata', 'The data values must not all be equal.'));
      const sg = mr / 1.128, ucl = mean + 3 * sg, lcl = mean - 3 * sg, out = []; d.forEach((x, i) => { if (x > ucl || x < lcl) out.push(i + 1); });
      const bx = box([1, n], d.concat([ucl, lcl]), { pad: 0.1, W, H }), tp = view(bx, W, H), acc = accentColor();
      [1, 2].forEach(k => [1, -1].forEach(sgn => seg(tp, 1, mean + sgn * k * sg, n, mean + sgn * k * sg, 'rgba(255,255,255,0.22)', true, 1)));
      seg(tp, 1, mean, n, mean, '#3fbf6f', false, 2); seg(tp, 1, ucl, n, ucl, '#e8548b', true, 2.2); seg(tp, 1, lcl, n, lcl, '#e8548b', true, 2.2);
      poly(d.map((x, i) => [i + 1, x]), tp, acc, bx, { lw: 2 }); d.forEach((x, i) => dot(tp, i + 1, x, (x > ucl || x < lcl) ? '#e8548b' : acc, (x > ucl || x < lcl) ? '#' + (i + 1) : '', 8, -10)); axT(W, H, 'sample number', 'measurement');
      return [{ color: acc, label: n + ' measurements in time order · centre line (green) = mean = ' + fmtN(mean, 5) }, { color: '#e8548b', label: 'Control limits (dashed red): UCL = ' + fmtN(ucl, 5) + ' · LCL = ' + fmtN(lcl, 5) + ' = mean ± 3σ, with σ estimated as average moving range / 1.128 = ' + fmtN(sg, 4), dashed: true },
        { color: out.length ? '#e8548b' : '#3fbf6f', label: out.length ? 'OUT OF CONTROL: point' + (out.length > 1 ? 's ' : ' ') + out.join(', ') + ' outside the limits — look for a special cause' : 'No point outside the 3σ limits: the process looks in control' }, { color: '#ffffff', label: 'Faint lines mark ±1σ and ±2σ · a long run on one side of the centre line also signals a shift' }];
    }
  });

  GX.push({
    id: 'movavg', grp: 'stat', label: 'Moving Average (trend smoothing)',
    inputs: [{ k: 'xs', l: 'Data in order (at least 4)', t: 'xs', v: '12, 15, 14, 18, 20, 19, 24, 26, 25, 30, 29, 33, 35, 34, 38', min: 4 }, { k: 'w', l: 'Window size', v: 3, r: 0, min: 2, max: 60, int: true }],
    presets: [['Window 3', { gx_movavg_w: 3 }], ['Window 5', { gx_movavg_w: 5 }], ['Window 7', { gx_movavg_w: 7 }], ['Noisy sales', { gx_movavg_xs: '20, 35, 18, 40, 25, 45, 30, 52, 28, 55, 36, 60, 33, 64, 41, 68', gx_movavg_w: 4 }]],
    plot(v, W, H) {
      const d = v.xs, n = d.length, w = v.w; if (w > n) bad(tx('graph_x_ma_w', 'The window cannot be larger than the number of values.'));
      const ma = []; for (let i = w - 1; i < n; i++) { let s = 0; for (let j = i - w + 1; j <= i; j++) s += d[j]; ma.push([i + 1, s / w]); }
      const bx = box([1, n], d, { pad: 0.1, minSpan: 1, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(d.map((x, i) => [i + 1, x]), tp, '#5a9ad8', bx, { lw: 1.8, dash: true }); d.forEach((x, i) => dot(tp, i + 1, x, '#5a9ad8', '', 0, 0)); poly(ma, tp, acc, bx, { lw: 3 }); dot(tp, ma[ma.length - 1][0], ma[ma.length - 1][1], '#ffffff', fmtN(ma[ma.length - 1][1], 4), 8, -10); axT(W, H, 'time / position', 'value');
      const slope = (ma[ma.length - 1][1] - ma[0][1]) / (ma.length > 1 ? ma[ma.length - 1][0] - ma[0][0] : 1);
      return [{ color: '#5a9ad8', label: 'Raw data (' + n + ' points, dashed blue)', dashed: true }, { color: acc, label: w + '-point moving average: each point is the mean of the latest ' + w + ' values — it starts at point ' + w + ' (the first ' + (w - 1) + ' have no average)' },
        { color: '#ffffff', label: 'Latest average = ' + fmtN(ma[ma.length - 1][1], 5) + ' · average change per step = ' + fmtN(slope, 4) + (slope > 0 ? ' (rising trend)' : slope < 0 ? ' (falling trend)' : ' (flat)') }, { color: '#3fbf6f', label: 'A bigger window gives a smoother line but reacts later to changes — a simple naive forecast for the next value is the latest average' }];
    }
  });

  /* ====== 15 MORE MATH TOOLS GRAPHS (listed under the existing "Math Tools" group) ====== */
  function txt(tp, x, y, s, color, dx, dy, size) {
    const q = tp(x, y); ctx.save(); ctx.fillStyle = color || '#ddd'; ctx.font = '700 ' + (size || 11) + 'px Inter, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, q[0] + (dx || 0), q[1] + (dy || 0)); ctx.restore();
  }
  const arrowTo = (tp, x, y, color, label, w) => { const o = tp(0, 0), e = tp(x, y); drawArrow(o[0], o[1], e[0], e[1], color, w || 2.6); if (label) txt(tp, x, y, label, color, e[0] >= o[0] ? 10 : -10, e[1] > o[1] ? 10 : -10); };

  GX.push({
    id: 'matrix', grp: 'math', label: 'Matrix Transformation (2×2)',
    inputs: [{ k: 'a', l: 'a', v: 1, r: 0 }, { k: 'b', l: 'b', v: 1, r: 0 }, { k: 'c', l: 'c', v: 0, r: 1 }, { k: 'd', l: 'd', v: 1, r: 1 }],
    presets: [['Shear', { a: 1, b: 1, c: 0, d: 1 }], ['Rotate 90°', { a: 0, b: -1, c: 1, d: 0 }], ['Scale ×2', { a: 2, b: 0, c: 0, d: 2 }], ['Reflect in x-axis', { a: 1, b: 0, c: 0, d: -1 }], ['Squash', { a: 2, b: 1, c: 1, d: 1 }]],
    plot(v, W, H) {
      const { a, b, c, d } = v, T = p => [a * p[0] + b * p[1], c * p[0] + d * p[1]], sq = [[0, 0], [1, 0], [1, 1], [0, 1]], ts = sq.map(T), all = sq.concat(ts);
      const bx = box(all.map(p => p[0]), all.map(p => p[1]), { eq: true, zero: true, pad: 0.3, W, H }), tp = view(bx, W, H), acc = accentColor();
      fillPoly(sq, tp, 'rgba(255,255,255,0.10)'); poly(sq.concat([sq[0]]), tp, 'rgba(255,255,255,0.5)', bx, { dash: true, lw: 1.5 });
      fillPoly(ts, tp, 'rgba(255,138,31,0.28)'); poly(ts.concat([ts[0]]), tp, acc, bx, { lw: 2.4 });
      arrowTo(tp, a, c, '#e8548b', 'î′'); arrowTo(tp, b, d, '#5a9ad8', 'ĵ′');
      const tr = a + d, det = a * d - b * c, disc = tr * tr - 4 * det;
      const eig = disc >= 0 ? 'Eigenvalues λ = ' + fmtN((tr + Math.sqrt(disc)) / 2, 4) + ', ' + fmtN((tr - Math.sqrt(disc)) / 2, 4) : 'Eigenvalues are complex: ' + fmtN(tr / 2, 3) + ' ± ' + fmtN(Math.sqrt(-disc) / 2, 3) + 'i (a rotation-like map)';
      return [{ color: acc, label: 'Unit square → parallelogram under [[' + fmtN(a, 3) + ', ' + fmtN(b, 3) + '], [' + fmtN(c, 3) + ', ' + fmtN(d, 3) + ']]' },
        { color: '#e8548b', label: 'î = (1,0) → (' + fmtN(a, 3) + ', ' + fmtN(c, 3) + ') · ĵ = (0,1) → (' + fmtN(b, 3) + ', ' + fmtN(d, 3) + ')' },
        { color: '#ffffff', label: 'Determinant = ' + fmtN(det, 4) + ' (area scale' + (det < 0 ? ', orientation flipped' : det === 0 ? ', collapses to a line' : '') + ') · trace = ' + fmtN(tr, 4) }, { color: '#5a9ad8', label: eig }];
    }
  });

  GX.push({
    id: 'dotcross', grp: 'math', label: 'Dot & Cross Product (2D)',
    inputs: [{ k: 'ax', l: 'a = (', v: 4, r: 0 }, { k: 'ay', l: ',', v: 1, r: 0 }, { k: 'bx', l: 'b = (', v: 2, r: 1 }, { k: 'by', l: ',', v: 3, r: 1 }],
    presets: [['Acute angle', { ax: 4, ay: 1, bx: 2, by: 3 }], ['Perpendicular', { ax: 3, ay: 0, bx: 0, by: 2 }], ['Obtuse', { ax: 3, ay: 1, bx: -2, by: 2 }], ['Parallel', { ax: 2, ay: 1, bx: 4, by: 2 }]],
    plot(v, W, H) {
      const { ax, ay, bx: bxx, by } = v, la = Math.hypot(ax, ay), lb = Math.hypot(bxx, by); if (!la || !lb) bad(tx('graph_x_zerovec', 'Vectors must not be the zero vector.'));
      const dt = ax * bxx + ay * by, cr = ax * by - ay * bxx, ang = Math.acos(Math.max(-1, Math.min(1, dt / (la * lb)))) * 180 / Math.PI, k = dt / (lb * lb), px = k * bxx, py = k * by;
      const b = box([0, ax, bxx, ax + bxx], [0, ay, by, ay + by], { eq: true, zero: true, pad: 0.25, W, H }), tp = view(b, W, H);
      fillPoly([[0, 0], [ax, ay], [ax + bxx, ay + by], [bxx, by]], tp, 'rgba(255,255,255,0.08)');
      seg(tp, 0, 0, px, py, '#3fbf6f', true, 2.4); seg(tp, ax, ay, px, py, '#3fbf6f', true, 1.2);
      arrowTo(tp, ax, ay, accentColor(), 'a'); arrowTo(tp, bxx, by, '#5a9ad8', 'b');
      return [{ color: accentColor(), label: 'a · b = ' + fmtN(dt, 4) + ' · angle θ = ' + fmtN(ang, 3) + '°' + (Math.abs(dt) < 1e-9 ? ' (perpendicular)' : '') },
        { color: '#5a9ad8', label: 'a × b = ax·by − ay·bx = ' + fmtN(cr, 4) + ' = area of the parallelogram' + (Math.abs(cr) < 1e-9 ? ' (parallel vectors)' : '') },
        { color: '#3fbf6f', label: 'Projection of a on b = ' + fmtN(dt / lb, 4) + ' → vector (' + fmtN(px, 3) + ', ' + fmtN(py, 3) + ')' }, { color: '#ffffff', label: '|a| = ' + fmtN(la, 4) + ' · |b| = ' + fmtN(lb, 4) }];
    }
  });

  GX.push({
    id: 'cmul', grp: 'math', label: 'Complex Multiply & Divide',
    inputs: [{ k: 'r1', l: 'z₁ = ', v: 2, r: 0 }, { k: 'i1', l: '+ i·', v: 1, r: 0 }, { k: 'r2', l: 'z₂ = ', v: 1, r: 1 }, { k: 'i2', l: '+ i·', v: 2, r: 1 }],
    presets: [['(2+i)(1+2i)', { r1: 2, i1: 1, r2: 1, i2: 2 }], ['Times i (rotate 90°)', { r1: 3, i1: 1, r2: 0, i2: 1 }], ['Conjugates', { r1: 2, i1: 3, r2: 2, i2: -3 }]],
    plot(v, W, H) {
      const { r1, i1, r2, i2 } = v, m2 = r2 * r2 + i2 * i2; if (!m2) bad(tx('graph_x_z0', 'z₂ must not be 0 (division).'));
      const p = [r1 * r2 - i1 * i2, r1 * i2 + i1 * r2], q = [(r1 * r2 + i1 * i2) / m2, (i1 * r2 - r1 * i2) / m2], zs = [[r1, i1], [r2, i2], p, q];
      const b = box(zs.map(z => z[0]), zs.map(z => z[1]), { eq: true, zero: true, pad: 0.3, W, H }), tp = view(b, W, H), acc = accentColor();
      arrowTo(tp, r1, i1, acc, 'z₁'); arrowTo(tp, r2, i2, '#5a9ad8', 'z₂'); arrowTo(tp, p[0], p[1], '#ffffff', 'z₁z₂', 3.2); arrowTo(tp, q[0], q[1], '#3fbf6f', 'z₁/z₂');
      const ar = z => Math.atan2(z[1], z[0]) * 180 / Math.PI, md = z => Math.hypot(z[0], z[1]);
      return [{ color: acc, label: 'z₁ = ' + fmtComplexStr(r1, i1) + ' (|z| = ' + fmtN(md([r1, i1]), 3) + ', arg = ' + fmtN(ar([r1, i1]), 2) + '°)' }, { color: '#5a9ad8', label: 'z₂ = ' + fmtComplexStr(r2, i2) + ' (|z| = ' + fmtN(md([r2, i2]), 3) + ', arg = ' + fmtN(ar([r2, i2]), 2) + '°)' },
        { color: '#ffffff', label: 'z₁·z₂ = ' + fmtComplexStr(p[0], p[1]) + ' — moduli multiply, arguments add' }, { color: '#3fbf6f', label: 'z₁ ÷ z₂ = ' + fmtComplexStr(q[0], q[1]) + ' — moduli divide, arguments subtract' }];
    }
  });

  GX.push({
    id: 'cpow', grp: 'math', label: 'Powers of a Complex Number',
    inputs: [{ k: 're', l: 'z = ', v: 0.8, r: 0 }, { k: 'im', l: '+ i·', v: 0.5, r: 0 }, { k: 'n', l: 'Powers n', v: 8, r: 1, min: 1, max: 24, int: true }],
    presets: [['Spiral in (|z|<1)', { re: 0.8, im: 0.5, n: 12 }], ['Spiral out (|z|>1)', { re: 1, im: 0.4, n: 10 }], ['On unit circle', { re: 0.6, im: 0.8, n: 10 }], ['(1+i)ⁿ', { re: 1, im: 1, n: 8 }]],
    plot(v, W, H) {
      const { re, im, n } = v, pts = [[1, 0]]; let cr = 1, ci = 0; for (let k = 1; k <= n; k++) { const nr = cr * re - ci * im; ci = cr * im + ci * re; cr = nr; pts.push([cr, ci]); }
      const b = box(pts.map(p => p[0]).concat([-1, 1]), pts.map(p => p[1]).concat([-1, 1]), { eq: true, zero: true, pad: 0.2, W, H }), tp = view(b, W, H), acc = accentColor(), ring = [];
      for (let i = 0; i <= 200; i++) ring.push([Math.cos(i / 200 * 2 * Math.PI), Math.sin(i / 200 * 2 * Math.PI)]);
      poly(ring, tp, 'rgba(255,255,255,0.3)', b, { dash: true, lw: 1.3 }); poly(pts, tp, acc, b, { lw: 1.8 });
      pts.forEach((p, k) => dot(tp, p[0], p[1], PIE_COLORS[k % PIE_COLORS.length], k && k <= 10 ? 'z' + supNum(k) : '', 7, -8));
      const mod = Math.hypot(re, im), arg = Math.atan2(im, re) * 180 / Math.PI, last = pts[n];
      return [{ color: acc, label: 'z = ' + fmtComplexStr(re, im) + ' · |z| = ' + fmtN(mod, 4) + ' · arg = ' + fmtN(arg, 3) + '°' },
        { color: '#5a9ad8', label: 'De Moivre: zⁿ = |z|ⁿ (cos nθ + i sin nθ) → each power turns by ' + fmtN(arg, 3) + '° and scales by ' + fmtN(mod, 4) },
        { color: '#ffffff', label: 'z' + supNum(n) + ' = ' + fmtComplexStr(last[0], last[1]) + (Math.abs(mod - 1) < 1e-9 ? ' — |z| = 1, so all powers stay on the unit circle' : mod < 1 ? ' — |z| < 1: spirals inward' : ' — |z| > 1: spirals outward') }];
    }
  });

  GX.push({
    id: 'tri3', grp: 'math', label: 'Triangle from 3 Sides (SSS)',
    inputs: [{ k: 'a', l: 'a', v: 5, r: 0, min: 0.01 }, { k: 'b', l: 'b', v: 6, r: 0, min: 0.01 }, { k: 'c', l: 'c', v: 7, r: 0, min: 0.01 }],
    presets: [['3-4-5 (right)', { a: 3, b: 4, c: 5 }], ['Equilateral', { a: 6, b: 6, c: 6 }], ['5-6-7', { a: 5, b: 6, c: 7 }], ['Obtuse 4-5-8', { a: 4, b: 5, c: 8 }]],
    plot(v, W, H) {
      const { a, b, c } = v; if (a + b <= c || a + c <= b || b + c <= a) bad(tx('graph_x_tri', 'These sides cannot form a triangle (the two shorter sides must add to more than the longest).'));
      const cx = (b * b + c * c - a * a) / (2 * c), cy = Math.sqrt(Math.max(0, b * b - cx * cx)), A = [0, 0], B = [c, 0], C = [cx, cy];
      const s = (a + b + c) / 2, area = Math.sqrt(s * (s - a) * (s - b) * (s - c)), rin = area / s, R = a * b * c / (4 * area), deg = r => r * 180 / Math.PI;
      const angA = Math.acos((b * b + c * c - a * a) / (2 * b * c)), angB = Math.acos((a * a + c * c - b * b) / (2 * a * c)), angC = Math.PI - angA - angB;
      const I = [(a * A[0] + b * B[0] + c * C[0]) / (2 * s), (a * A[1] + b * B[1] + c * C[1]) / (2 * s)], O = [c / 2, (cx * cx + cy * cy - c * cx) / (2 * cy)];
      const bb = box([O[0] - R, O[0] + R, 0, c], [O[1] - R, O[1] + R, 0, cy], { eq: true, pad: 0.12, W, H }), tp = view(bb, W, H), acc = accentColor(), circ = (o, r) => { const q = []; for (let i = 0; i <= 120; i++) q.push([o[0] + r * Math.cos(i / 120 * 2 * Math.PI), o[1] + r * Math.sin(i / 120 * 2 * Math.PI)]); return q; };
      poly(circ(O, R), tp, 'rgba(90,154,216,0.7)', bb, { dash: true, lw: 1.4 }); poly(circ(I, rin), tp, 'rgba(63,191,111,0.9)', bb, { lw: 1.6 });
      fillPoly([A, B, C], tp, 'rgba(255,138,31,0.2)'); poly([A, B, C, A], tp, acc, bb, { lw: 2.6 });
      dot(tp, A[0], A[1], '#fff', 'A', -8, 10); dot(tp, B[0], B[1], '#fff', 'B', 8, 10); dot(tp, C[0], C[1], '#fff', 'C', 8, -8);
      txt(tp, (B[0] + C[0]) / 2, (B[1] + C[1]) / 2, 'a=' + fmtN(a, 3), '#ddd', 18, 0); txt(tp, (A[0] + C[0]) / 2, (A[1] + C[1]) / 2, 'b=' + fmtN(b, 3), '#ddd', -18, 0); txt(tp, c / 2, 0, 'c=' + fmtN(c, 3), '#ddd', 0, 14);
      const mx = Math.max(angA, angB, angC), kind = Math.abs(mx - Math.PI / 2) < 1e-9 ? 'right' : mx > Math.PI / 2 ? 'obtuse' : 'acute', side = (a === b && b === c) ? 'equilateral' : (a === b || b === c || a === c) ? 'isosceles' : 'scalene';
      return [{ color: acc, label: 'Angles: A = ' + fmtN(deg(angA), 3) + '°, B = ' + fmtN(deg(angB), 3) + '°, C = ' + fmtN(deg(angC), 3) + '° (' + side + ', ' + kind + ')' },
        { color: '#ffffff', label: 'Area (Heron) = ' + fmtN(area, 4) + ' · perimeter = ' + fmtN(2 * s, 4) + ' · s = ' + fmtN(s, 4) }, { color: '#3fbf6f', label: 'Inradius r = ' + fmtN(rin, 4) + ' (green circle)' }, { color: '#5a9ad8', label: 'Circumradius R = ' + fmtN(R, 4) + ' (dashed circle)', dashed: true }];
    }
  });

  GX.push({
    id: 'polyarea', grp: 'math', label: 'Polygon Area (Shoelace)',
    inputs: [{ k: 'xs', l: 'Vertices x,y — one per line', t: 'xs', v: '0,0\n6,0\n7,4\n3,6\n-1,3', min: 6 }],
    presets: [['Rectangle', { xs: '0,0\n5,0\n5,3\n0,3' }], ['Triangle', { xs: '0,0\n6,0\n2,5' }], ['Pentagon', { xs: '0,0\n6,0\n7,4\n3,6\n-1,3' }], ['L-shape', { xs: '0,0\n4,0\n4,2\n2,2\n2,5\n0,5' }]],
    plot(v, W, H) {
      const d = v.xs; if (d.length % 2) bad(tx('graph_x_pairs', 'Give vertices as pairs: x,y on each line.')); const P = []; for (let i = 0; i < d.length; i += 2) P.push([d[i], d[i + 1]]); const n = P.length;
      let A2 = 0, cx = 0, cy = 0, per = 0; for (let i = 0; i < n; i++) { const p = P[i], q = P[(i + 1) % n], cr = p[0] * q[1] - q[0] * p[1]; A2 += cr; cx += (p[0] + q[0]) * cr; cy += (p[1] + q[1]) * cr; per += Math.hypot(q[0] - p[0], q[1] - p[1]); }
      if (Math.abs(A2) < 1e-12) bad(tx('graph_x_flat2', 'These points have zero area — they lie on one line.')); const A = A2 / 2; cx /= 6 * A; cy /= 6 * A;
      const b = box(P.map(p => p[0]), P.map(p => p[1]), { eq: true, zero: true, pad: 0.2, W, H }), tp = view(b, W, H), acc = accentColor();
      fillPoly(P, tp, 'rgba(255,138,31,0.25)'); poly(P.concat([P[0]]), tp, acc, b, { lw: 2.6 }); P.forEach((p, i) => dot(tp, p[0], p[1], '#fff', 'P' + (i + 1), 8, -9)); dot(tp, cx, cy, '#3fbf6f', 'centroid', 8, 10);
      return [{ color: acc, label: n + ' vertices · Area = ½|Σ(xᵢyᵢ₊₁ − xᵢ₊₁yᵢ)| = ' + fmtN(Math.abs(A), 5) }, { color: '#5a9ad8', label: 'Perimeter = ' + fmtN(per, 4) + ' · vertices go ' + (A > 0 ? 'anticlockwise' : 'clockwise') }, { color: '#3fbf6f', label: 'Centroid = (' + fmtN(cx, 3) + ', ' + fmtN(cy, 3) + ')' }];
    }
  });

  GX.push({
    id: 'linprog', grp: 'math', label: 'Linear Programming (feasible region)',
    inputs: [{ k: 'cons', l: 'Conditions — one per line (use <=, >=, <, >)', t: 'ta', v: 'x + y <= 6\nx - y >= -2\nx >= 0\ny >= 0' }, { k: 'obj', l: 'Objective  P(x, y)', t: 'g', v: '3x + 2y' }, { k: 'lo', l: 'View from', v: -1, r: 0 }, { k: 'hi', l: 'to', v: 9, r: 0 }],
    presets: [['Triangle', { cons: 'x + y <= 6\nx >= 0\ny >= 0' }], ['Four lines', { cons: 'x + y <= 6\nx - y >= -2\nx >= 0\ny >= 0' }], ['Factory', { cons: '2x + y <= 10\nx + 2y <= 8\nx >= 0\ny >= 0', obj: '40x + 30y' }]],
    plot(v, W, H) {
      const lo = v.lo, hi = v.hi; if (lo >= hi) bad(t('graph_error_range'));
      const lines = v.cons.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 6); if (!lines.length) bad(tx('graph_x_cons', 'Write at least one condition, e.g. x + y <= 6'));
      const C = lines.map(s => { const m = s.match(/^(.*?)(<=|>=|<|>)(.*)$/); if (!m || !m[1].trim() || !m[3].trim()) bad(tx('graph_x_consfmt', 'Write each condition like  x + y <= 6')); const fn = compileFn3D('(' + m[1] + ')-(' + m[3] + ')'); if (!fn) bad(tx('graph_x_consfmt', 'Write each condition like  x + y <= 6')); return { fn, le: m[2][0] === '<', s }; });
      const yspan = (hi - lo) * H / W, b = { x0: lo, x1: hi, y0: lo, y1: lo + yspan }, tp = view(b, W, H), nx = Math.max(20, Math.floor(W / 4)), ny = Math.max(20, Math.floor(H / 4)), stride = nx + 1;
      const ok = (x, y, eps) => C.every(c => { const f = c.fn(x, y); return isFinite(f) && (c.le ? f <= eps : f >= -eps); });
      ctx.save(); ctx.fillStyle = 'rgba(63,191,111,0.30)';
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) if (ok(lo + (hi - lo) * (i + 0.5) / nx, b.y1 - yspan * (j + 0.5) / ny, 0)) ctx.fillRect(i * W / nx, j * H / ny, W / nx + 1, H / ny + 1);
      ctx.restore();
      ctx.save(); ctx.lineWidth = 2.2;
      C.forEach((c, k) => { const vals = new Float64Array(stride * (ny + 1)); for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) { const f = c.fn(lo + (hi - lo) * i / nx, b.y1 - yspan * j / ny); vals[j * stride + i] = isFinite(f) ? f : NaN; } ctx.strokeStyle = PIE_COLORS[k % PIE_COLORS.length]; marchLevel(vals, stride, nx, ny, W, H, 0); });
      ctx.restore();
      const co = C.map(c => { const f0 = c.fn(0, 0), A = c.fn(1, 0) - f0, B = c.fn(0, 1) - f0; return { A, B, C: f0, lin: Math.abs(c.fn(1, 1) - (A + B + f0)) < 1e-9 && Math.abs(c.fn(-2, 3) - (-2 * A + 3 * B + f0)) < 1e-9 }; });
      const corners = [], lg = C.map((c, k) => ({ color: PIE_COLORS[k % PIE_COLORS.length], label: esc(c.s) })); lg.push({ color: '#3fbf6f', label: 'Green area = feasible region (all conditions true)' });
      if (co.every(q => q.lin)) {
        for (let i = 0; i < co.length; i++) for (let j = i + 1; j < co.length; j++) { const p = co[i], q = co[j], det = p.A * q.B - q.A * p.B; if (Math.abs(det) < 1e-12) continue; const x = (-p.C * q.B + q.C * p.B) / det, y = (-p.A * q.C + q.A * p.C) / det; if (ok(x, y, 1e-7) && !corners.some(z => Math.abs(z[0] - x) < 1e-6 && Math.abs(z[1] - y) < 1e-6)) corners.push([x, y]); }
        corners.forEach(z => dot(tp, z[0], z[1], '#ffffff', corners.length <= 10 ? '(' + fmtN(z[0], 2) + ', ' + fmtN(z[1], 2) + ')' : '', 8, -9));
        if (corners.length) { const vals = corners.map(z => v.obj(z[0], z[1])), mx = Math.max.apply(null, vals), mn = Math.min.apply(null, vals), zm = corners[vals.indexOf(mx)], zn = corners[vals.indexOf(mn)];
          lg.push({ color: '#ffffff', label: 'Corner points: ' + corners.length + ' · P = ' + esc(v['obj$']) }, { color: '#f2c14e', label: 'Maximum P = ' + fmtN(mx, 4) + ' at (' + fmtN(zm[0], 3) + ', ' + fmtN(zm[1], 3) + ') · minimum P = ' + fmtN(mn, 4) + ' at (' + fmtN(zn[0], 3) + ', ' + fmtN(zn[1], 3) + ')' }); }
        else lg.push({ color: '#ff9494', label: 'No corner points inside the region — it may be empty or unbounded in this view' });
      } else lg.push({ color: '#aaa', label: 'Corner points and optimum are shown for straight-line conditions only' });
      return lg;
    }
  });

  GX.push({
    id: 'venn', grp: 'math', label: 'Venn Diagram (2 sets)',
    inputs: [{ k: 'A', l: 'n(A)', v: 25, r: 0, min: 0, int: true }, { k: 'B', l: 'n(B)', v: 18, r: 0, min: 0, int: true }, { k: 'AB', l: 'n(A∩B)', v: 8, r: 1, min: 0, int: true }, { k: 'U', l: 'n(U) (0 = skip)', v: 40, r: 1, min: 0, int: true }],
    presets: [['Class survey', { A: 25, B: 18, AB: 8, U: 40 }], ['Disjoint sets', { A: 10, B: 12, AB: 0, U: 30 }], ['Subset', { A: 20, B: 8, AB: 8, U: 30 }]],
    plot(v, W, H) {
      const { A, B, AB, U } = v; if (AB > Math.min(A, B)) bad(tx('graph_x_vennI', 'n(A∩B) cannot be bigger than n(A) or n(B).')); const uni = A + B - AB; if (U > 0 && uni > U) bad(tx('graph_x_vennU', 'n(A∪B) is bigger than n(U) — check the numbers.'));
      ctx.clearRect(0, 0, W, H); const acc = accentColor(), r = Math.min(H * 0.3, W * 0.22), cy = H / 2 + (U > 0 ? 6 : 0), d = r * 1.05, ax = W / 2 - d / 2, bxx = W / 2 + d / 2;
      ctx.save(); if (U > 0) { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.6; ctx.strokeRect(10, 10, W - 20, H - 20); ctx.fillStyle = '#ddd'; ctx.font = '700 12px Inter, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('U = ' + U, 18, 26); }
      ctx.globalAlpha = 0.45; ctx.fillStyle = acc; ctx.beginPath(); ctx.arc(ax, cy, r, 0, 7); ctx.fill(); ctx.fillStyle = '#5a9ad8'; ctx.beginPath(); ctx.arc(bxx, cy, r, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
      ctx.strokeStyle = acc; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(ax, cy, r, 0, 7); ctx.stroke(); ctx.strokeStyle = '#5a9ad8'; ctx.beginPath(); ctx.arc(bxx, cy, r, 0, 7); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = '800 ' + Math.max(13, r * 0.28) + 'px Inter, sans-serif';
      ctx.fillText(A - AB, ax - r * 0.55, cy); ctx.fillText(AB, W / 2, cy); ctx.fillText(B - AB, bxx + r * 0.55, cy); ctx.font = '800 13px Inter, sans-serif'; ctx.fillText('A', ax - r * 0.7, cy - r - 12); ctx.fillText('B', bxx + r * 0.7, cy - r - 12);
      if (U > 0) { ctx.font = '700 13px Inter, sans-serif'; ctx.fillText('neither: ' + (U - uni), W - 70, H - 26); } ctx.restore();
      const lg = [{ color: acc, label: 'Only A = ' + (A - AB) + ' · Only B = ' + (B - AB) + ' · Both = ' + AB }, { color: '#ffffff', label: 'n(A ∪ B) = n(A) + n(B) − n(A ∩ B) = ' + A + ' + ' + B + ' − ' + AB + ' = ' + uni }];
      if (U > 0) lg.push({ color: '#5a9ad8', label: 'P(A) = ' + fmtN(A / U, 4) + ' · P(B) = ' + fmtN(B / U, 4) + ' · P(A∩B) = ' + fmtN(AB / U, 4) + ' · P(A∪B) = ' + fmtN(uni / U, 4) }); return lg;
    }
  });

  GX.push({
    id: 'sequence', grp: 'math', label: 'Sequences (AP / GP / Fibonacci)',
    inputs: [{ k: 'ty', l: 'Type', t: 's', v: 'ap', opts: [['ap', 'Arithmetic (AP)'], ['gp', 'Geometric (GP)'], ['fib', 'Fibonacci']] }, { k: 'a1', l: 'First term a₁', v: 2, r: 0 }, { k: 'd', l: 'd or r', v: 3, r: 0 }, { k: 'n', l: 'Terms n', v: 12, r: 0, min: 1, max: 40, int: true }],
    presets: [['AP 2,5,8…', { ty: 'ap', a1: 2, d: 3, n: 12 }], ['GP ×2', { ty: 'gp', a1: 1, d: 2, n: 10 }], ['GP ×½', { ty: 'gp', a1: 16, d: 0.5, n: 14 }], ['Fibonacci', { ty: 'fib', a1: 1, d: 1, n: 15 }], ['Alternating GP', { ty: 'gp', a1: 1, d: -1.5, n: 10 }]],
    plot(v, W, H) {
      const { ty, a1, d, n } = v, a = []; for (let k = 1; k <= n; k++) a.push(ty === 'ap' ? a1 + (k - 1) * d : ty === 'gp' ? a1 * Math.pow(d, k - 1) : (k < 3 ? 1 : a[k - 2] + a[k - 3]));
      const pts = a.map((y, i) => [i + 1, y]), b = box([0.3, n + 0.7], a, { zero: true, pad: 0.12, W, H }), tp = view(b, W, H), acc = accentColor();
      pts.forEach(p => seg(tp, p[0], 0, p[0], p[1], 'rgba(255,138,31,0.35)', false, 1.4)); poly(pts, tp, 'rgba(255,255,255,0.35)', b, { dash: true, lw: 1.3 }); pts.forEach(p => dot(tp, p[0], p[1], acc, n <= 12 ? fmtN(p[1], 3) : '', 0, -11));
      const S = a.reduce((x, y) => x + y, 0), lg = [{ color: acc, label: ty === 'ap' ? 'aₙ = a₁ + (n−1)d = ' + fmtN(a1) + ' + (n−1)(' + fmtN(d) + ') → a' + n + ' = ' + fmtN(a[n - 1], 5) : ty === 'gp' ? 'aₙ = a₁·rⁿ⁻¹ = ' + fmtN(a1) + '·(' + fmtN(d) + ')ⁿ⁻¹ → a' + n + ' = ' + fmtN(a[n - 1], 5) : 'Fibonacci: aₙ = aₙ₋₁ + aₙ₋₂ → a' + n + ' = ' + a[n - 1] }, { color: '#ffffff', label: 'Sum of first ' + n + ' terms Sₙ = ' + fmtN(S, 6) }];
      if (ty === 'gp') lg.push({ color: '#5a9ad8', label: Math.abs(d) < 1 ? 'Converges: infinite sum a₁/(1−r) = ' + fmtN(a1 / (1 - d), 5) : 'Diverges since |r| ≥ 1' });
      if (ty === 'fib' && n > 2) lg.push({ color: '#5a9ad8', label: 'Ratio aₙ/aₙ₋₁ = ' + fmtN(a[n - 1] / a[n - 2], 6) + ' → golden ratio 1.618034…' }); return lg;
    }
  });

  GX.push({
    id: 'pascal', grp: 'math', label: "Pascal's Triangle",
    inputs: [{ k: 'n', l: 'Rows', v: 8, r: 0, min: 1, max: 24, int: true }, { k: 'md', l: 'Show', t: 's', v: 'num', opts: [['num', 'Numbers'], ['oe', 'Odd / even pattern']] }],
    presets: [['6 rows', { n: 6, md: 'num' }], ['10 rows', { n: 10, md: 'num' }], ['Sierpinski (odd/even)', { n: 24, md: 'oe' }]],
    plot(v, W, H) {
      const n = v.n, rows = [[1]]; for (let r = 1; r < n; r++) { const p = rows[r - 1], q = [1]; for (let i = 1; i < r; i++) q.push(p[i - 1] + p[i]); q.push(1); rows.push(q); }
      ctx.clearRect(0, 0, W, H); const rh = (H - 16) / n, cw = Math.min(W / (n + 1), 52), rad = Math.min(rh, cw) * 0.46, showNum = v.md === 'num' && n <= 12, acc = accentColor();
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      rows.forEach((row, r) => row.forEach((val, i) => { const x = W / 2 + (i - r / 2) * cw, y = 8 + rh * (r + 0.5);
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.fillStyle = v.md === 'oe' ? (val % 2 ? acc : 'rgba(255,255,255,0.08)') : 'rgba(255,138,31,0.22)'; ctx.fill(); ctx.strokeStyle = acc; ctx.lineWidth = 1.2; ctx.stroke();
        if (showNum) { const s = String(val); ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.max(8, Math.min(rad * (s.length > 3 ? 0.7 : 1), 15)) + 'px Inter, sans-serif'; ctx.fillText(s, x, y); } }));
      ctx.restore(); const last = rows[n - 1];
      return [{ color: acc, label: 'Each number = the sum of the two above it · row ' + (n - 1) + ' gives the coefficients of (a + b)^' + (n - 1) }, { color: '#ffffff', label: 'Row ' + (n - 1) + ': ' + (n <= 14 ? last.join(', ') : 'sum = 2^' + (n - 1)) + ' · row sum = 2^' + (n - 1) + ' = ' + Math.pow(2, n - 1) },
        { color: '#5a9ad8', label: v.md === 'oe' ? 'Orange = odd numbers → they form the Sierpiński triangle fractal' : n > 12 ? 'Numbers are hidden above 12 rows — switch to fewer rows to read them' : 'C(n, k) = n! / (k!(n−k)!)' }];
    }
  });

  GX.push({
    id: 'logs', grp: 'math', label: 'Logarithm Graphs (different bases)',
    inputs: [{ k: 'b1', l: 'Base 1', v: 2, r: 0, min: 0.01 }, { k: 'b2', l: 'Base 2', v: 2.71828, r: 0, min: 0.01 }, { k: 'b3', l: 'Base 3', v: 10, r: 0, min: 0.01 }],
    presets: [['2, e, 10', { b1: 2, b2: 2.71828, b3: 10 }], ['Fractions ½, ⅓, ¼', { b1: 0.5, b2: 0.3333, b3: 0.25 }], ['2, 3, 5', { b1: 2, b2: 3, b3: 5 }]],
    plot(v, W, H) {
      const bs = [v.b1, v.b2, v.b3]; if (bs.some(q => q === 1)) bad(tx('graph_x_base1', 'A logarithm base cannot be 1.')); const bx = { x0: -1, x1: 10, y0: -4, y1: 4 }, tp = view(bx, W, H), cols = [accentColor(), '#5a9ad8', '#3fbf6f'];
      seg(tp, 1, bx.y0, 1, bx.y1, 'rgba(255,255,255,0.25)', true, 1); seg(tp, bx.x0, 1, bx.x1, 1, 'rgba(255,255,255,0.25)', true, 1);
      bs.forEach((q, k) => { poly(samplePts(x => x > 0 ? Math.log(x) / Math.log(q) : NaN, 0.001, 10, 700), tp, cols[k], bx, { brk: true }); dot(tp, q, 1, cols[k], '(' + fmtN(q, 3) + ', 1)', 6, -9); });
      dot(tp, 1, 0, '#ffffff', '(1, 0)', 6, 10);
      return bs.map((q, k) => ({ color: cols[k], label: 'y = log₍' + fmtN(q, 4) + '₎(x) = ln x / ln ' + fmtN(q, 4) + (q > 1 ? ' — increasing' : ' — decreasing') })).concat([{ color: '#ffffff', label: 'Every log graph passes through (1, 0) and (base, 1); x must be positive' }]);
    }
  });

  GX.push({
    id: 'trig6', grp: 'math', label: 'Trigonometric Functions (all 6)',
    inputs: [{ k: 'kind', l: 'Graph', t: 's', v: 'sc', opts: [['sc', 'sin & cos'], ['tan', 'tan'], ['cot', 'cot'], ['sec', 'sec (with cos)'], ['csc', 'csc (with sin)']] }, { k: 'u', l: 'Angle in', t: 's', v: 'deg', opts: [['deg', 'Degrees'], ['rad', 'Radians']] }],
    presets: [['sin & cos', { kind: 'sc' }], ['tan', { kind: 'tan' }], ['sec', { kind: 'sec' }], ['csc', { kind: 'csc' }], ['cot', { kind: 'cot' }]],
    plot(v, W, H) {
      const deg = v.u === 'deg', k = deg ? Math.PI / 180 : 1, L = deg ? 360 : 2 * Math.PI, F = { sin: x => Math.sin(x * k), cos: x => Math.cos(x * k), tan: x => Math.tan(x * k), cot: x => 1 / Math.tan(x * k), sec: x => 1 / Math.cos(x * k), csc: x => 1 / Math.sin(x * k) };
      const wide = v.kind !== 'sc', bx = { x0: -L, x1: L, y0: wide ? -4 : -1.5, y1: wide ? 4 : 1.5 }, tp = view(bx, W, H), acc = accentColor(), draw = (f, c, dash) => poly(samplePts(f, bx.x0, bx.x1, 900), tp, c, bx, { brk: true, dash, lw: dash ? 1.4 : 2.6 });
      const pairs = { sc: [['sin', acc], ['cos', '#5a9ad8']], tan: [['tan', acc]], cot: [['cot', acc]], sec: [['cos', 'rgba(255,255,255,0.4)', 1], ['sec', acc]], csc: [['sin', 'rgba(255,255,255,0.4)', 1], ['csc', acc]] }[v.kind];
      pairs.forEach(q => draw(F[q[0]], q[1], q[2])); const per = (v.kind === 'tan' || v.kind === 'cot') ? (deg ? '180°' : 'π') : (deg ? '360°' : '2π');
      const info = { sc: 'Range −1 to 1 · sin is odd, cos is even · sin² + cos² = 1', tan: 'tan = sin/cos · undefined at 90°, 270° … (vertical asymptotes) · range all real numbers', cot: 'cot = cos/sin · undefined at 0°, 180° … · range all real numbers', sec: 'sec = 1/cos · never between −1 and 1 · asymptotes where cos = 0', csc: 'csc = 1/sin · never between −1 and 1 · asymptotes where sin = 0' }[v.kind];
      return pairs.map(q => ({ color: q[1], label: q[0] + '(x)' + (q[2] ? ' (reference)' : ''), dashed: !!q[2] })).concat([{ color: '#ffffff', label: 'Period = ' + per }, { color: '#5a9ad8', label: info }]);
    }
  });

  GX.push({
    id: 'transform', grp: 'math', label: 'Function Transformations',
    inputs: [{ k: 'fn', l: 'Base f(x)', t: 's', v: 'sq', opts: [['sq', 'x²'], ['cu', 'x³'], ['abs', '|x|'], ['sqrt', '√x'], ['sin', 'sin x'], ['exp', 'eˣ'], ['inv', '1/x'], ['ln', 'ln x']] },
      { k: 'a', l: 'a', v: 2, r: 0 }, { k: 'b', l: 'b', v: 1, r: 0 }, { k: 'h', l: 'h', v: 1, r: 1 }, { k: 'k', l: 'k', v: -2, r: 1 }],
    presets: [['Shift only', { a: 1, b: 1, h: 2, k: 1 }], ['Stretch ×2', { a: 2, b: 1, h: 0, k: 0 }], ['Reflect in x-axis', { a: -1, b: 1, h: 0, k: 0 }], ['Compress horizontally', { a: 1, b: 2, h: 0, k: 0 }], ['Reflect in y-axis', { a: 1, b: -1, h: 0, k: 0 }]],
    plot(v, W, H) {
      const f = { sq: x => x * x, cu: x => x * x * x, abs: Math.abs, sqrt: x => x >= 0 ? Math.sqrt(x) : NaN, sin: Math.sin, exp: Math.exp, inv: x => 1 / x, ln: x => x > 0 ? Math.log(x) : NaN }[v.fn], { a, b, h, k } = v, g = x => a * f(b * (x - h)) + k;
      const bx = { x0: -6, x1: 6, y0: -4.5, y1: 4.5 }, tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(f, -6, 6, 800), tp, 'rgba(255,255,255,0.45)', bx, { brk: true, dash: true, lw: 1.8 }); poly(samplePts(g, -6, 6, 800), tp, acc, bx, { brk: true });
      const parts = []; if (a < 0) parts.push('reflected in the x-axis'); if (Math.abs(a) !== 1) parts.push((Math.abs(a) > 1 ? 'stretched' : 'compressed') + ' vertically ×' + fmtN(Math.abs(a), 3)); if (b < 0) parts.push('reflected in the y-axis'); if (Math.abs(b) !== 1) parts.push((Math.abs(b) > 1 ? 'compressed' : 'stretched') + ' horizontally ×' + fmtN(1 / Math.abs(b), 3)); if (h) parts.push('shifted ' + fmtN(Math.abs(h), 3) + (h > 0 ? ' right' : ' left')); if (k) parts.push('shifted ' + fmtN(Math.abs(k), 3) + (k > 0 ? ' up' : ' down'));
      return [{ color: acc, label: 'g(x) = ' + fmtN(a) + '·f(' + fmtN(b) + '(x ' + sg(-h) + ')) ' + sg(k) }, { color: 'rgba(255,255,255,0.6)', label: 'Dashed white = original f(x)', dashed: true }, { color: '#5a9ad8', label: parts.filter(Boolean).join(', ') || 'No change — g(x) = f(x)' }];
    }
  });

  GX.push({
    id: 'fractal', grp: 'math', label: 'Mandelbrot & Julia Sets',
    inputs: [{ k: 'ty', l: 'Set', t: 's', v: 'man', opts: [['man', 'Mandelbrot set'], ['jul', 'Julia set']] }, { k: 'cr', l: 'c = ', v: -0.8, r: 0 }, { k: 'ci', l: '+ i·', v: 0.156, r: 0 }, { k: 'it', l: 'Detail', v: 60, r: 1, min: 10, max: 150, int: true }],
    presets: [['Mandelbrot', { ty: 'man' }], ['Julia (−0.8+0.156i)', { ty: 'jul', cr: -0.8, ci: 0.156 }], ['Dendrite (i)', { ty: 'jul', cr: 0, ci: 1 }], ['Rabbit', { ty: 'jul', cr: -0.123, ci: 0.745 }]],
    plot(v, W, H) {
      const jul = v.ty === 'jul', xs = jul ? 3.4 : 3.5, x0 = jul ? -1.7 : -2.4, ys = xs * H / W, y1 = ys / 2, cs = 3, nx = Math.floor(W / cs), ny = Math.floor(H / cs), M = v.it;
      ctx.clearRect(0, 0, W, H);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const px = x0 + xs * (i + 0.5) / nx, py = y1 - ys * (j + 0.5) / ny; let zr = jul ? px : 0, zi = jul ? py : 0, n = 0; const cr = jul ? v.cr : px, ci = jul ? v.ci : py;
        while (n < M && zr * zr + zi * zi <= 4) { const t0 = zr * zr - zi * zi + cr; zi = 2 * zr * zi + ci; zr = t0; n++; }
        ctx.fillStyle = n === M ? '#000' : 'hsl(' + ((n * 11 + 20) % 360) + ',85%,' + (28 + Math.min(30, n * 1.2)) + '%)'; ctx.fillRect(i * W / nx, j * H / ny, W / nx + 1, H / ny + 1); }
      return [{ color: accentColor(), label: jul ? 'Julia set for c = ' + fmtComplexStr(v.cr, v.ci) + ': iterate z → z² + c starting from each point z' : 'Mandelbrot set: iterate z → z² + c from z = 0 for each point c' }, { color: '#000000', label: 'Black = stays bounded (|z| ≤ 2) for ' + M + ' steps; colours = how fast it escapes' }];
    }
  });

  GX.push({
    id: 'numline', grp: 'math', label: 'Number Line (interval)',
    inputs: [{ k: 'ty', l: 'Show', t: 's', v: 'in', opts: [['in', 'Between  (a  x  b)'], ['out', 'Outside (x < a or x > b)']] }, { k: 'a', l: 'a', v: -2, r: 0 }, { k: 'b', l: 'b', v: 5, r: 0 }, { k: 'lc', l: 'a is', t: 's', v: 'o', r: 1, opts: [['o', 'open ○'], ['c', 'included ●']] }, { k: 'rc', l: 'b is', t: 's', v: 'c', r: 1, opts: [['o', 'open ○'], ['c', 'included ●']] }],
    presets: [['−2 < x ≤ 5', { ty: 'in', a: -2, b: 5, lc: 'o', rc: 'c' }], ['|x| < 3', { ty: 'in', a: -3, b: 3, lc: 'o', rc: 'o' }], ['|x| ≥ 3', { ty: 'out', a: -3, b: 3, lc: 'c', rc: 'c' }], ['0 ≤ x ≤ 10', { ty: 'in', a: 0, b: 10, lc: 'c', rc: 'c' }]],
    plot(v, W, H) {
      const { a, b } = v, inn = v.ty === 'in'; if (a >= b) bad(tx('graph_x_ab', 'a must be smaller than b.')); const sp = Math.max(b - a, 2), lo = a - sp * 0.7, hi = b + sp * 0.7, X = x => 16 + (x - lo) / (hi - lo) * (W - 32), y = H / 2, acc = accentColor(), st = niceStep(hi - lo);
      ctx.clearRect(0, 0, W, H); ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(W - 8, y); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
      for (let i = Math.ceil(lo / st); i <= Math.floor(hi / st); i++) { const px = X(i * st); ctx.beginPath(); ctx.moveTo(px, y - 6); ctx.lineTo(px, y + 6); ctx.stroke(); ctx.fillText(fmtN(i * st, 3), px, y + 22); }
      ctx.strokeStyle = acc; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath();
      if (inn) { ctx.moveTo(X(a), y); ctx.lineTo(X(b), y); } else { ctx.moveTo(8, y); ctx.lineTo(X(a), y); ctx.moveTo(X(b), y); ctx.lineTo(W - 8, y); } ctx.stroke();
      [[a, v.lc], [b, v.rc]].forEach(q => { ctx.beginPath(); ctx.arc(X(q[0]), y, 8, 0, 7); ctx.fillStyle = q[1] === 'c' ? acc : '#17171a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = acc; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.font = '800 13px Inter, sans-serif'; ctx.fillText(fmtN(q[0], 4), X(q[0]), y - 20); });
      ctx.restore(); const lc = v.lc === 'c', rc = v.rc === 'c', A = fmtN(a, 4), B = fmtN(b, 4);
      return inn ? [{ color: acc, label: A + (lc ? ' ≤ ' : ' < ') + 'x' + (rc ? ' ≤ ' : ' < ') + B }, { color: '#ffffff', label: 'Interval notation: ' + (lc ? '[' : '(') + A + ', ' + B + (rc ? ']' : ')') + ' · length = ' + fmtN(b - a, 4) }, { color: '#5a9ad8', label: 'Filled dot = value included · empty dot = value not included' }]
        : [{ color: acc, label: 'x ' + (lc ? '≤ ' : '< ') + A + '  or  x ' + (rc ? '≥ ' : '> ') + B }, { color: '#ffffff', label: 'Interval notation: (−∞, ' + A + (lc ? ']' : ')') + ' ∪ ' + (rc ? '[' : '(') + B + ', ∞)' }, { color: '#5a9ad8', label: 'Filled dot = value included · empty dot = value not included' }];
    }
  });

  /* ====== 11 MORE ALGEBRA & GEOMETRY GRAPHS ====== */
  const circPts = (h, k, r) => { const q = []; for (let i = 0; i <= 200; i++) q.push([h + r * Math.cos(i / 200 * 2 * Math.PI), k + r * Math.sin(i / 200 * 2 * Math.PI)]); return q; };
  const eqStr = (a, b, c) => fmtN(a) + 'x ' + sg(b) + 'y ' + sg(c) + ' = 0';

  GX.push({
    id: 'cubic', grp: 'alg', label: 'Cubic Polynomial (ax³+bx²+cx+d)',
    inputs: [{ k: 'a', l: 'a', v: 1, r: 0 }, { k: 'b', l: 'b', v: -2, r: 0 }, { k: 'c', l: 'c', v: -5, r: 1 }, { k: 'd', l: 'd', v: 6, r: 1 }],
    presets: [['3 real roots', { a: 1, b: -2, c: -5, d: 6 }], ['One real root', { a: 1, b: 0, c: 1, d: -2 }], ['Double root', { a: 1, b: 0, c: -3, d: 2 }], ['−x³+3x', { a: -1, b: 0, c: 3, d: 0 }]],
    plot(v, W, H) {
      const { a, b, c, d } = v; if (a === 0) bad(tx('graph_x_a0', 'a cannot be 0 — that would be a straight line.'));
      const f = x => ((a * x + b) * x + c) * x + d, R = 1 + Math.max(Math.abs(b / a), Math.abs(c / a), Math.abs(d / a)), D2 = 4 * b * b - 12 * a * c;
      const crit = D2 > 1e-12 ? [(-2 * b - Math.sqrt(D2)) / (6 * a), (-2 * b + Math.sqrt(D2)) / (6 * a)].sort((p, q) => p - q) : D2 > -1e-12 ? [-b / (3 * a)] : [];
      const edges = [-R].concat(crit, [R]), roots = [];
      for (let i = 0; i < edges.length - 1; i++) { let lo = edges[i], hi = edges[i + 1], fl = f(lo), fh = f(hi); if (fl === 0) { roots.push(lo); continue; } if (fl * fh < 0) { for (let it = 0; it < 80; it++) { const m = (lo + hi) / 2; if (f(m) * fl > 0) lo = m; else hi = m; } roots.push((lo + hi) / 2); } }
      crit.forEach(x => { if (Math.abs(f(x)) < 1e-9) roots.push(x); }); roots.sort((p, q) => p - q); const rr = roots.filter((x, i) => !i || Math.abs(x - roots[i - 1]) > 1e-6);
      const xs = [0].concat(crit, rr), lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs), pad = Math.max(hi - lo, 2) * 0.55, x0 = lo - pad, x1 = hi + pad;
      const bx = box([x0, x1], (crit.length ? [d, 0] : [f(x0), f(x1), d, 0]).concat(crit.map(f)), { pad: 0.3, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(samplePts(f, bx.x0, bx.x1, 500), tp, acc, bx, { brk: true }); rr.forEach(x => dot(tp, x, 0, '#3fbf6f', fmtN(x, 3), 8, 12));
      if (D2 > 1e-12) crit.forEach((x, i) => dot(tp, x, f(x), '#ffffff', (a > 0) === (i === 1) ? 'min' : 'max', 8, -9)); dot(tp, 0, d, '#f2c14e', '', 8, 0);
      const inf = -b / (3 * a);
      return [{ color: acc, label: 'y = ' + fmtN(a) + 'x³ ' + sg(b) + 'x² ' + sg(c) + 'x ' + sg(d) }, { color: '#3fbf6f', label: rr.length ? 'Real roots: x = ' + rr.map(x => fmtN(x, 4)).join(', ') : 'No real roots found in range' },
        { color: '#ffffff', label: D2 > 1e-12 ? 'Turning points: ' + crit.map(x => '(' + fmtN(x, 3) + ', ' + fmtN(f(x), 3) + ')').join(' and ') : 'No turning points (always ' + (a > 0 ? 'increasing' : 'decreasing') + ')' },
        { color: '#5a9ad8', label: 'Inflection point at x = ' + fmtN(inf, 4) + ' · y-intercept (0, ' + fmtN(d, 3) + ') · ' + (a > 0 ? 'rises to the right' : 'falls to the right') }];
    }
  });

  GX.push({
    id: 'parabolafd', grp: 'alg', label: 'Parabola (focus & directrix)',
    inputs: [{ k: 'a', l: 'a', v: 0.25, r: 0 }, { k: 'h', l: 'h', v: 0, r: 0 }, { k: 'k', l: 'k', v: 0, r: 0 }],
    presets: [['y = x²/4', { a: 0.25, h: 0, k: 0 }], ['y = x²', { a: 1, h: 0, k: 0 }], ['Opens down', { a: -0.5, h: 1, k: 3 }], ['Shifted', { a: 0.5, h: -2, k: 1 }]],
    plot(v, W, H) {
      const { a, h, k } = v; if (a === 0) bad(tx('graph_x_a0', 'a cannot be 0 — that would be a straight line.'));
      const p = 1 / (4 * a), F = [h, k + p], dirY = k - p, xp = h + 2 * Math.abs(p) + 1, P = [xp, a * (xp - h) * (xp - h) + k], w2 = Math.max(Math.abs(P[0] - h), 2) * 1.25;
      const bx = box([h - w2, h + w2], [k, F[1], dirY, P[1]], { eq: true, pad: 0.2, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, bx.x0, dirY, bx.x1, dirY, '#e8548b', true, 2); seg(tp, h, bx.y0, h, bx.y1, 'rgba(255,255,255,0.3)', true, 1.2);
      poly(samplePts(x => a * (x - h) * (x - h) + k, bx.x0, bx.x1, 500), tp, acc, bx, { brk: true });
      seg(tp, P[0], P[1], F[0], F[1], '#3fbf6f', false, 1.6); seg(tp, P[0], P[1], P[0], dirY, '#3fbf6f', false, 1.6);
      dot(tp, h, k, '#fff', 'V', 8, 10); dot(tp, F[0], F[1], '#f2c14e', 'F', 8, -9); dot(tp, P[0], P[1], '#3fbf6f', 'P');
      return [{ color: acc, label: 'y = ' + fmtN(a) + '(x ' + sg(-h) + ')² ' + sg(k) + ' ⇔ (x − h)² = 4p(y − k), p = 1/(4a) = ' + fmtN(p, 4) },
        { color: '#f2c14e', label: 'Focus F = (' + fmtN(F[0], 3) + ', ' + fmtN(F[1], 3) + ') · vertex V = (' + fmtN(h, 3) + ', ' + fmtN(k, 3) + ')' }, { color: '#e8548b', label: 'Directrix: y = ' + fmtN(dirY, 4) + ' · axis: x = ' + fmtN(h, 3), dashed: true },
        { color: '#3fbf6f', label: 'Every point P is equally far from F and the directrix (green lines are equal) · latus rectum = ' + fmtN(Math.abs(4 * p), 4) }];
    }
  });

  GX.push({
    id: 'hyperbola', grp: 'alg', label: 'Hyperbola (asymptotes & foci)',
    inputs: [{ k: 'o', l: 'Opens', t: 's', v: 'h', opts: [['h', 'Left & right'], ['v', 'Up & down']] }, { k: 'a', l: 'a', v: 3, r: 0, min: 0.01 }, { k: 'b', l: 'b', v: 2, r: 0, min: 0.01 }, { k: 'h', l: 'h', v: 0, r: 1 }, { k: 'k', l: 'k', v: 0, r: 1 }],
    presets: [['x²/9 − y²/4 = 1', { o: 'h', a: 3, b: 2, h: 0, k: 0 }], ['Up & down', { o: 'v', a: 3, b: 2, h: 0, k: 0 }], ['Rectangular (a=b)', { o: 'h', a: 2, b: 2, h: 0, k: 0 }], ['Shifted', { o: 'h', a: 2, b: 1, h: 1, k: -1 }]],
    plot(v, W, H) {
      const { a, b, h, k } = v, hz = v.o === 'h', c = Math.sqrt(a * a + b * b), br = [[], []]; for (let i = 0; i <= 160; i++) { const t0 = -1.7 + 3.4 * i / 160, ch = Math.cosh(t0), sh = Math.sinh(t0);
        if (hz) { br[0].push([h + a * ch, k + b * sh]); br[1].push([h - a * ch, k + b * sh]); } else { br[0].push([h + b * sh, k + a * ch]); br[1].push([h + b * sh, k - a * ch]); } }
      const all = br[0].concat(br[1]), bx = box(all.map(p => p[0]), all.map(p => p[1]), { eq: true, pad: 0.12, W, H }), tp = view(bx, W, H), acc = accentColor(), sl = hz ? b / a : a / b;
      seg(tp, bx.x0, k + sl * (bx.x0 - h), bx.x1, k + sl * (bx.x1 - h), '#5a9ad8', true, 1.5); seg(tp, bx.x0, k - sl * (bx.x0 - h), bx.x1, k - sl * (bx.x1 - h), '#5a9ad8', true, 1.5);
      br.forEach(q => poly(q, tp, acc, bx, { lw: 2.6 })); dot(tp, h, k, '#fff', 'C', 8, 10);
      [-1, 1].forEach(s => { dot(tp, hz ? h + s * c : h, hz ? k : k + s * c, '#f2c14e', 'F', 8, -9); dot(tp, hz ? h + s * a : h, hz ? k : k + s * a, '#3fbf6f', '', 8, 0); });
      return [{ color: acc, label: hz ? '(x−' + fmtN(h, 3) + ')²/' + fmtN(a * a, 3) + ' − (y−' + fmtN(k, 3) + ')²/' + fmtN(b * b, 3) + ' = 1' : '(y−' + fmtN(k, 3) + ')²/' + fmtN(a * a, 3) + ' − (x−' + fmtN(h, 3) + ')²/' + fmtN(b * b, 3) + ' = 1' },
        { color: '#5a9ad8', label: 'Asymptotes: y − ' + fmtN(k, 3) + ' = ±' + fmtN(sl, 4) + '(x − ' + fmtN(h, 3) + ')', dashed: true }, { color: '#f2c14e', label: 'Foci at distance c = √(a²+b²) = ' + fmtN(c, 4) + ' from the centre · eccentricity e = c/a = ' + fmtN(c / a, 4) },
        { color: '#3fbf6f', label: 'Vertices at distance a = ' + fmtN(a, 3) + (Math.abs(a - b) < 1e-9 ? ' · rectangular hyperbola (asymptotes ⟂)' : '') }];
    }
  });

  GX.push({
    id: 'circle3', grp: 'alg', label: 'Circle through 3 Points',
    inputs: [{ k: 'x1', l: 'A (', v: 0, r: 0 }, { k: 'y1', l: ',', v: 0, r: 0 }, { k: 'x2', l: 'B (', v: 4, r: 1 }, { k: 'y2', l: ',', v: 0, r: 1 }, { k: 'x3', l: 'C (', v: 0, r: 2 }, { k: 'y3', l: ',', v: 3, r: 2 }],
    presets: [['Right triangle', { x1: 0, y1: 0, x2: 4, y2: 0, x3: 0, y3: 3 }], ['Any 3 points', { x1: -2, y1: 1, x2: 3, y2: 4, x3: 5, y3: -1 }], ['Unit circle', { x1: 1, y1: 0, x2: 0, y2: 1, x3: -1, y3: 0 }]],
    plot(v, W, H) {
      const { x1, y1, x2, y2, x3, y3 } = v, D = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)); if (Math.abs(D) < 1e-12) bad(tx('graph_x_collinear', 'The three points lie on one line — no circle passes through them.'));
      const s1 = x1 * x1 + y1 * y1, s2 = x2 * x2 + y2 * y2, s3 = x3 * x3 + y3 * y3, ux = (s1 * (y2 - y3) + s2 * (y3 - y1) + s3 * (y1 - y2)) / D, uy = (s1 * (x3 - x2) + s2 * (x1 - x3) + s3 * (x2 - x1)) / D, r = Math.hypot(x1 - ux, y1 - uy);
      const bx = box([ux - r, ux + r, x1, x2, x3], [uy - r, uy + r, y1, y2, y3], { eq: true, zero: true, pad: 0.15, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(circPts(ux, uy, r), tp, acc, bx, { lw: 2.6 }); poly([[x1, y1], [x2, y2], [x3, y3], [x1, y1]], tp, 'rgba(255,255,255,0.4)', bx, { dash: true, lw: 1.3 });
      [[x1, y1, 'A'], [x2, y2, 'B'], [x3, y3, 'C']].forEach(q => dot(tp, q[0], q[1], '#fff', q[2])); dot(tp, ux, uy, '#3fbf6f', 'O', 8, 10);
      return [{ color: acc, label: '(x ' + sg(-ux) + ')² + (y ' + sg(-uy) + ')² = ' + fmtN(r * r, 4) }, { color: '#3fbf6f', label: 'Centre O = (' + fmtN(ux, 4) + ', ' + fmtN(uy, 4) + ') · radius = ' + fmtN(r, 4) },
        { color: '#ffffff', label: 'General form: x² + y² ' + sg(-2 * ux) + 'x ' + sg(-2 * uy) + 'y ' + sg(ux * ux + uy * uy - r * r) + ' = 0' }, { color: '#5a9ad8', label: 'Area = ' + fmtN(Math.PI * r * r, 4) + ' · circumference = ' + fmtN(2 * Math.PI * r, 4) }];
    }
  });

  GX.push({
    id: 'distline', grp: 'alg', label: 'Distance from Point to Line',
    inputs: [{ k: 'a', l: 'ax + by + c = 0 :  a', v: 3, r: 0 }, { k: 'b', l: 'b', v: 4, r: 0 }, { k: 'c', l: 'c', v: -12, r: 0 }, { k: 'px', l: 'P (', v: 4, r: 1 }, { k: 'py', l: ',', v: 5, r: 1 }],
    presets: [['3x+4y−12=0, P(4,5)', { a: 3, b: 4, c: -12, px: 4, py: 5 }], ['x−y+1=0, P(3,0)', { a: 1, b: -1, c: 1, px: 3, py: 0 }], ['y = 2 (b only), P(1,5)', { a: 0, b: 1, c: -2, px: 1, py: 5 }]],
    plot(v, W, H) {
      const { a, b, c, px, py } = v, n2 = a * a + b * b; if (n2 === 0) bad(tx('graph_x_ab0', 'In each equation a and b cannot both be 0.'));
      const val = a * px + b * py + c, dist = Math.abs(val) / Math.sqrt(n2), tt = val / n2, F = [px - a * tt, py - b * tt], ln = Math.sqrt(n2), ex = [F[0] - b / ln * dist, F[1] + a / ln * dist, F[0] + b / ln * dist, F[1] - a / ln * dist];
      const bx = box([px, F[0], ex[0], ex[2]], [py, F[1], ex[1], ex[3]], { eq: true, zero: false, pad: 0.45, W, H }), tp = view(bx, W, H), acc = accentColor();
      lineABC(tp, a, b, -c, bx, acc); seg(tp, px, py, F[0], F[1], '#3fbf6f', true, 2.2); dot(tp, px, py, '#fff', 'P(' + fmtN(px, 3) + ', ' + fmtN(py, 3) + ')'); dot(tp, F[0], F[1], '#f2c14e', 'foot (' + fmtN(F[0], 3) + ', ' + fmtN(F[1], 3) + ')', 8, 12);
      return [{ color: acc, label: eqStr(a, b, c) }, { color: '#3fbf6f', label: 'Distance d = |a·x₀ + b·y₀ + c| / √(a² + b²) = ' + fmtN(Math.abs(val), 4) + ' / ' + fmtN(Math.sqrt(n2), 4) + ' = ' + fmtN(dist, 5) },
        { color: '#f2c14e', label: 'Foot of the perpendicular = (' + fmtN(F[0], 4) + ', ' + fmtN(F[1], 4) + ')' + (dist < 1e-9 ? ' — P lies on the line' : '') }];
    }
  });

  GX.push({
    id: 'parperp', grp: 'alg', label: 'Parallel & Perpendicular Lines',
    inputs: [{ k: 'm', l: 'Line  y = mx + c :  m', v: 2, r: 0 }, { k: 'c', l: 'c', v: 1, r: 0 }, { k: 'px', l: 'Point (', v: 3, r: 1 }, { k: 'py', l: ',', v: -1, r: 1 }],
    presets: [['y = 2x + 1 via (3, −1)', { m: 2, c: 1, px: 3, py: -1 }], ['y = −x/2 via (0, 4)', { m: -0.5, c: 0, px: 0, py: 4 }], ['Horizontal y = 3', { m: 0, c: 3, px: 2, py: -2 }]],
    plot(v, W, H) {
      const { m, c, px, py } = v, perpV = m === 0, F = perpV ? [px, c] : (() => { const x = (px / m + py - c) / (m + 1 / m); return [x, m * x + c]; })();
      const bx = box([px, F[0], 0], [py, F[1], c], { eq: true, pad: 0.6, minSpan: 6, W, H }), tp = view(bx, W, H), acc = accentColor();
      lineABC(tp, -m, 1, c, bx, acc); lineABC(tp, -m, 1, py - m * px, bx, '#5a9ad8', true);
      if (perpV) seg(tp, px, bx.y0, px, bx.y1, '#3fbf6f', true, 2.2); else lineABC(tp, 1 / m, 1, py + px / m, bx, '#3fbf6f', true);
      dot(tp, px, py, '#fff', 'P'); dot(tp, F[0], F[1], '#f2c14e', '', 8, 0);
      return [{ color: acc, label: 'Given line: y = ' + fmtN(m, 4) + 'x ' + sg(c) }, { color: '#5a9ad8', label: 'Parallel through P: y = ' + fmtN(m, 4) + 'x ' + sg(py - m * px) + ' (same slope ' + fmtN(m, 4) + ')', dashed: true },
        { color: '#3fbf6f', label: perpV ? 'Perpendicular through P: x = ' + fmtN(px, 4) + ' (vertical)' : 'Perpendicular through P: slope −1/m = ' + fmtN(-1 / m, 4) + ' → y = ' + fmtN(-1 / m, 4) + 'x ' + sg(py + px / m), dashed: true },
        { color: '#f2c14e', label: 'Perpendicular meets the line at (' + fmtN(F[0], 4) + ', ' + fmtN(F[1], 4) + ') · distance from P = ' + fmtN(Math.hypot(px - F[0], py - F[1]), 4) }];
    }
  });

  GX.push({
    id: 'absval', grp: 'alg', label: 'Absolute Value  a|x−h|+k = c',
    inputs: [{ k: 'a', l: 'a', v: 2, r: 0 }, { k: 'h', l: 'h', v: 1, r: 0 }, { k: 'k', l: 'k', v: -1, r: 0 }, { k: 'c', l: 'c', v: 3, r: 0 }],
    presets: [['2|x−1|−1 = 3', { a: 2, h: 1, k: -1, c: 3 }], ['|x| = 4', { a: 1, h: 0, k: 0, c: 4 }], ['No solution', { a: 1, h: 0, k: 2, c: 1 }], ['Opens down', { a: -1, h: 2, k: 4, c: 1 }]],
    plot(v, W, H) {
      const { a, h, k, c } = v; if (a === 0) bad(tx('graph_x_a0', 'a cannot be 0.')); const q = (c - k) / a, sol = q > 0 ? [h - q, h + q] : q === 0 ? [h] : [], f = x => a * Math.abs(x - h) + k, span = Math.max(4, Math.abs(q) * 1.6, 3);
      const bx = box([h - span, h + span], [k, c, f(h - span), f(h + span)], { pad: 0.1, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, bx.x0, c, bx.x1, c, '#5a9ad8', true, 1.8); poly(samplePts(f, bx.x0, bx.x1, 400), tp, acc, bx, { lw: 2.8 }); dot(tp, h, k, '#fff', 'V', 8, 10); sol.forEach(x => { dot(tp, x, c, '#3fbf6f', 'x = ' + fmtN(x, 3), 8, -10); seg(tp, x, c, x, 0, '#3fbf6f', true, 1.2); });
      return [{ color: acc, label: 'y = ' + fmtN(a) + '|x ' + sg(-h) + '| ' + sg(k) + ' · vertex (' + fmtN(h, 3) + ', ' + fmtN(k, 3) + ')' }, { color: '#5a9ad8', label: 'Line y = ' + fmtN(c, 4), dashed: true },
        { color: '#3fbf6f', label: sol.length === 2 ? 'Two solutions: x = ' + fmtN(sol[0], 4) + ' and x = ' + fmtN(sol[1], 4) : sol.length === 1 ? 'One solution: x = ' + fmtN(sol[0], 4) + ' (the vertex)' : 'No solution — |x − h| cannot be negative' }, { color: '#ffffff', label: 'Range: y ' + (a > 0 ? '≥ ' : '≤ ') + fmtN(k, 4) + ' · slopes ±' + fmtN(Math.abs(a), 4) }];
    }
  });

  GX.push({
    id: 'expgrowth', grp: 'alg', label: 'Exponential Growth & Decay (a·bˣ)',
    inputs: [{ k: 'a', l: 'a', v: 2, r: 0 }, { k: 'b', l: 'b (base)', v: 1.5, r: 0, min: 0.01 }, { k: 'x0', l: 'x from', v: -4, r: 1 }, { k: 'x1', l: 'to', v: 4, r: 1 }],
    presets: [['Growth ×2', { a: 1, b: 2, x0: -4, x1: 5 }], ['Decay ×½', { a: 8, b: 0.5, x0: -3, x1: 6 }], ['Slow growth 1.1', { a: 100, b: 1.1, x0: 0, x1: 30 }], ['Slow decay 0.8', { a: 50, b: 0.8, x0: 0, x1: 15 }]],
    plot(v, W, H) {
      const { a, b, x0, x1 } = v; if (b === 1) bad(tx('graph_x_base1', 'Base 1 is a constant — choose a base different from 1.')); if (x0 >= x1) bad(t('graph_error_range')); if (a === 0) bad(tx('graph_x_a0b', 'a cannot be 0.'));
      const f = x => a * Math.pow(b, x), pts = samplePts(f, x0, x1, 400), yr = autoY([pts], x1 - x0, [0, a]), bx = box([x0, x1], yr, { pad: 0.06, W, H }), tp = view(bx, W, H), acc = accentColor();
      seg(tp, bx.x0, 0, bx.x1, 0, '#e8548b', true, 1.8); poly(pts, tp, acc, bx, { brk: true }); if (0 >= x0 && 0 <= x1) dot(tp, 0, a, '#f2c14e', '(0, ' + fmtN(a, 3) + ')'); if (1 >= x0 && 1 <= x1) dot(tp, 1, f(1), '#fff', '(1, ' + fmtN(f(1), 3) + ')');
      return [{ color: acc, label: 'y = ' + fmtN(a) + '·(' + fmtN(b) + ')ˣ — ' + (b > 1 ? 'exponential growth' : 'exponential decay') + ' (factor ' + fmtN(b, 4) + ' per unit, ' + (b > 1 ? '+' : '−') + fmtN(Math.abs(b - 1) * 100, 3) + '% each step)' },
        { color: '#e8548b', label: 'Horizontal asymptote y = 0 (the curve never touches the x-axis)', dashed: true }, { color: '#f2c14e', label: 'y-intercept = a = ' + fmtN(a, 4) },
        { color: '#5a9ad8', label: b > 1 ? 'Doubling time = ln 2 / ln b = ' + fmtN(Math.LN2 / Math.log(b), 4) : 'Half-life = ln 0.5 / ln b = ' + fmtN(Math.log(0.5) / Math.log(b), 4) }];
    }
  });

  GX.push({
    id: 'rational', grp: 'alg', label: 'Rational Function (ax+b)/(cx+d)',
    inputs: [{ k: 'a', l: 'a', v: 2, r: 0 }, { k: 'b', l: 'b', v: 1, r: 0 }, { k: 'c', l: 'c', v: 1, r: 1 }, { k: 'd', l: 'd', v: -2, r: 1 }],
    presets: [['(2x+1)/(x−2)', { a: 2, b: 1, c: 1, d: -2 }], ['1/x', { a: 0, b: 1, c: 1, d: 0 }], ['(x+3)/(x+1)', { a: 1, b: 3, c: 1, d: 1 }], ['(−x+4)/(2x−2)', { a: -1, b: 4, c: 2, d: -2 }]],
    plot(v, W, H) {
      const { a, b, c, d } = v; if (c === 0) bad(tx('graph_x_c0', 'c cannot be 0 (then it is a straight line).')); const det = a * d - b * c; if (det === 0) bad(tx('graph_x_deg', 'ad − bc = 0: the fraction simplifies to a constant.'));
      const VA = -d / c, HA = a / c, f = x => (a * x + b) / (c * x + d), bx = { x0: VA - 7, x1: VA + 7, y0: HA - 5, y1: HA + 5 }, tp = view(bx, W, H), acc = accentColor();
      seg(tp, VA, bx.y0, VA, bx.y1, '#e8548b', true, 1.8); seg(tp, bx.x0, HA, bx.x1, HA, '#5a9ad8', true, 1.8); poly(samplePts(f, bx.x0, bx.x1, 900), tp, acc, bx, { brk: true, lw: 2.8 });
      if (a !== 0) dot(tp, -b / a, 0, '#3fbf6f', '', 8, 0); if (d !== 0) dot(tp, 0, b / d, '#f2c14e', '', 8, 0);
      return [{ color: acc, label: 'y = (' + fmtN(a) + 'x ' + sg(b) + ') / (' + fmtN(c) + 'x ' + sg(d) + ')' }, { color: '#e8548b', label: 'Vertical asymptote x = ' + fmtN(VA, 4) + ' · domain: all x ≠ ' + fmtN(VA, 4), dashed: true },
        { color: '#5a9ad8', label: 'Horizontal asymptote y = a/c = ' + fmtN(HA, 4) + ' · range: all y ≠ ' + fmtN(HA, 4), dashed: true }, { color: '#3fbf6f', label: (a !== 0 ? 'x-intercept (' + fmtN(-b / a, 4) + ', 0)' : 'No x-intercept') + ' · ' + (d !== 0 ? 'y-intercept (0, ' + fmtN(b / d, 4) + ')' : 'No y-intercept') },
        { color: '#ffffff', label: det > 0 ? 'Increasing on each branch (ad − bc > 0)' : 'Decreasing on each branch (ad − bc < 0)' }];
    }
  });

  GX.push({
    id: 'quadineq', grp: 'alg', label: 'Quadratic Inequality',
    inputs: [{ k: 'a', l: 'a', v: 1, r: 0 }, { k: 'b', l: 'b', v: -1, r: 0 }, { k: 'c', l: 'c', v: -6, r: 0 }, { k: 'op', l: 'Solve', t: 's', v: '>', opts: [['>', 'ax²+bx+c > 0'], ['>=', 'ax²+bx+c ≥ 0'], ['<', 'ax²+bx+c < 0'], ['<=', 'ax²+bx+c ≤ 0']] }],
    presets: [['x²−x−6 > 0', { a: 1, b: -1, c: -6, op: '>' }], ['x²−x−6 ≤ 0', { a: 1, b: -1, c: -6, op: '<=' }], ['x²+1 > 0', { a: 1, b: 0, c: 1, op: '>' }], ['−x²+4 ≥ 0', { a: -1, b: 0, c: 4, op: '>=' }]],
    plot(v, W, H) {
      const { a, b, c, op } = v; if (a === 0) bad(tx('graph_x_a0', 'a cannot be 0 — that would be a straight line.')); const f = x => a * x * x + b * x + c, D = b * b - 4 * a * c, incl = op.length === 2, gt = op[0] === '>', test = x => gt ? f(x) > 0 : f(x) < 0;
      const roots = D > 0 ? [(-b - Math.sqrt(D)) / (2 * a), (-b + Math.sqrt(D)) / (2 * a)].sort((p, q) => p - q) : D === 0 ? [-b / (2 * a)] : [];
      const items = []; if (!roots.length) items.push({ iv: 1, t: test(0) }); else { items.push({ iv: 1, t: test(roots[0] - 1) }); roots.forEach((r, i) => { items.push({ iv: 0, r, t: incl }); items.push({ iv: 1, t: test(i + 1 < roots.length ? (r + roots[i + 1]) / 2 : r + 1) }); }); }
      const runs = []; let st = -1;
      const close = e => { const s0 = items[st], en = items[e]; runs.push({ lo: st === 0 ? -Infinity : (s0.iv ? items[st - 1].r : s0.r), loC: st > 0 && !s0.iv, hi: e === items.length - 1 ? Infinity : (en.iv ? items[e + 1].r : en.r), hiC: !en.iv }); };
      items.forEach((it, idx) => { if (it.t) { if (st < 0) st = idx; } else if (st >= 0) { close(idx - 1); st = -1; } }); if (st >= 0) close(items.length - 1);
      const all = [0].concat(roots, [-b / (2 * a)]), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), pad = Math.max(hi - lo, 2) * 0.7, x0 = lo - pad, x1 = hi + pad, vy = f(-b / (2 * a));
      const bx = box([x0, x1], [0, vy, f(x0), f(x1)], { pad: 0.08, W, H }), tp = view(bx, W, H), acc = accentColor();
      runs.forEach(r => { const A = Math.max(r.lo, bx.x0), B = Math.min(r.hi, bx.x1); if (B > A) { fillPoly([[A, 0], [A, bx.y1], [B, bx.y1], [B, 0]], tp, 'rgba(63,191,111,0.12)'); seg(tp, A, 0, B, 0, '#3fbf6f', false, 6); } });
      poly(samplePts(f, bx.x0, bx.x1, 500), tp, acc, bx, { brk: true }); roots.forEach(r => { ctx.save(); const q = tp(r, 0); ctx.beginPath(); ctx.arc(q[0], q[1], 6, 0, 7); ctx.fillStyle = incl ? '#fff' : '#17171a'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.restore(); txt(tp, r, 0, fmtN(r, 3), '#fff', 0, 20); });
      const S = x => x === Infinity ? '∞' : x === -Infinity ? '−∞' : fmtN(x, 4), txtSol = runs.length ? runs.map(r => (r.lo === -Infinity || !r.loC ? '(' : '[') + S(r.lo) + ', ' + S(r.hi) + (r.hi === Infinity || !r.hiC ? ')' : ']')).join(' ∪ ') : 'No solution (empty set)';
      return [{ color: acc, label: 'y = ' + fmtN(a) + 'x² ' + sg(b) + 'x ' + sg(c) + ' ' + op.replace('>=', '≥').replace('<=', '≤') + ' 0' }, { color: '#3fbf6f', label: 'Solution (green on the x-axis): ' + txtSol }, { color: '#ffffff', label: roots.length ? 'Boundary points: x = ' + roots.map(r => fmtN(r, 4)).join(', ') + (incl ? ' (included — filled dots)' : ' (not included — empty dots)') : 'D < 0: the parabola never meets the x-axis' }];
    }
  });

  GX.push({
    id: 'circleline', grp: 'alg', label: 'Circle & Line (secant / tangent)',
    inputs: [{ k: 'h', l: 'Circle centre (', v: 0, r: 0 }, { k: 'k', l: ',', v: 0, r: 0 }, { k: 'r', l: 'r', v: 5, r: 0, min: 0.01 }, { k: 'm', l: 'Line y = mx + c :  m', v: 1, r: 1 }, { k: 'c', l: 'c', v: 1, r: 1 }],
    presets: [['Secant', { h: 0, k: 0, r: 5, m: 1, c: 1 }], ['Tangent', { h: 0, k: 0, r: 5, m: 0, c: 5 }], ['Misses the circle', { h: 0, k: 0, r: 3, m: 1, c: 6 }], ['Tangent slanted', { h: 0, k: 0, r: 2, m: 1, c: 2.828427 }]],
    plot(v, W, H) {
      const { h, k, r, m, c } = v, A = 1 + m * m, B = 2 * (m * (c - k) - h), C = h * h + (c - k) * (c - k) - r * r, D = B * B - 4 * A * C, dist = Math.abs(m * h - k + c) / Math.sqrt(A), eps = 1e-4 * Math.max(1, r * r);
      const xs = D > eps ? [(-B - Math.sqrt(D)) / (2 * A), (-B + Math.sqrt(D)) / (2 * A)] : Math.abs(D) <= eps ? [-B / (2 * A)] : [], bx = box([h - r, h + r], [k - r, k + r], { eq: true, pad: 0.25, W, H }), tp = view(bx, W, H), acc = accentColor();
      poly(circPts(h, k, r), tp, acc, bx, { lw: 2.6 }); lineABC(tp, -m, 1, c, bx, '#5a9ad8'); dot(tp, h, k, '#fff', 'O', 8, 10);
      xs.forEach(x => dot(tp, x, m * x + c, '#3fbf6f', '(' + fmtN(x, 3) + ', ' + fmtN(m * x + c, 3) + ')', 8, -10));
      return [{ color: acc, label: '(x ' + sg(-h) + ')² + (y ' + sg(-k) + ')² = ' + fmtN(r * r, 4) }, { color: '#5a9ad8', label: 'Line: y = ' + fmtN(m, 4) + 'x ' + sg(c) },
        { color: '#3fbf6f', label: xs.length === 2 ? 'Secant: meets the circle at two points' : xs.length === 1 ? 'Tangent: touches the circle at one point' : 'The line does not meet the circle' }, { color: '#ffffff', label: 'Distance from centre to line = ' + fmtN(dist, 4) + (dist < r - 1e-9 ? ' < r' : Math.abs(dist - r) <= 1e-6 ? ' = r' : ' > r') + ' = ' + fmtN(r, 4) + ' · discriminant D = ' + fmtN(D, 4) }];
    }
  });

  // ---- build the step-2 panels + step-1 buttons, and register every graph in EXTRA ----
  const NEW_EXTRA = {};
  (function buildNewGraphs() {
    const showBtn = gEl('graphShowBtn'), list = gEl('graphTypeList'); if (!showBtn || !list) return;
    const readInputs = (g) => {
      const out = {};
      g.inputs.forEach(inp => {
        const el = gEl('gx_' + g.id + '_' + inp.k), raw = el ? el.value : String(inp.v), lab = inp.l;
        if (inp.t === 'f') { const fn = compileFn(raw); if (!fn) bad(tx('graph_error_expr', 'Write f(x) using x, e.g. x^2 + 1.')); out[inp.k] = fn; out[inp.k + '$'] = raw.trim(); }
        else if (inp.t === 'xs') { const arr = parseNumList(raw); if (arr.length < (inp.min || 1)) bad(tx('graph_x_needdata', 'Enter at least ') + (inp.min || 1) + tx('graph_x_numbers', ' numbers (commas or new lines).')); out[inp.k] = arr; }
        else if (inp.t === 's' || inp.t === 'ta') out[inp.k] = raw;
        else if (inp.t === 'g') { const fn = compileFn3D(raw); if (!fn) bad(tx('graph_x_gexpr', 'Write it using x and y, e.g. 3x + 2y.')); out[inp.k] = fn; out[inp.k + '$'] = raw.trim(); }
        else {
          let n = parseFloat(raw); if (!isFinite(n)) bad(tx('graph_x_num', 'Enter a number in every box.')); if (inp.int) n = Math.round(n);
          if ((inp.min != null && n < inp.min) || (inp.max != null && n > inp.max)) bad(lab + ' ' + tx('graph_x_between', 'must be between') + ' ' + (inp.min != null ? inp.min : '−∞') + ' ' + tx('graph_x_and', 'and') + ' ' + (inp.max != null ? inp.max : '∞') + '.');
          out[inp.k] = n;
        }
      });
      return out;
    };
    GROUPS.forEach(gr => {
      let anchor = gr.after ? gEl(gr.after) : null;
      if (!anchor) { const lab = document.createElement('div'); lab.className = 'graph-group-label'; lab.dataset.i18n = gr.key; lab.textContent = tx(gr.key, gr.label); list.appendChild(lab); }
      GX.filter(g => g.grp === gr.id).forEach(g => {
        const pid = 'gx_' + g.id, key = 'graph_x_' + g.id;
        const btn = document.createElement('button'); btn.className = 'subject-pill graph-type-btn'; btn.dataset.graphmode = 'x_' + g.id; btn.dataset.i18n = key; btn.textContent = tx(key, g.label); if (anchor) { anchor.parentNode.insertBefore(btn, anchor.nextSibling); anchor = btn; } else list.appendChild(btn);
        let html = '', row = [], rowId = null;
        const flush = () => { if (row.length) html += '<div class="graph-range-row">' + row.join('') + '</div>'; row = []; rowId = null; };
        g.inputs.forEach(inp => {
          const id = pid + '_' + inp.k;
          if (inp.t === 'f' || inp.t === 'g') { flush(); html += '<div class="graph-range-sep" style="margin:2px 0 4px">' + esc(inp.l) + '</div><input type="text" class="formula-search convert-input" id="' + id + '" value="' + esc(inp.v) + '" placeholder="e.g. x^2 + 1">'; }
          else if (inp.t === 'xs' || inp.t === 'ta') { flush(); html += '<div class="graph-range-sep" style="margin:2px 0 4px">' + esc(inp.l) + '</div><textarea class="formula-search convert-input graph-data-textarea" id="' + id + '" rows="4">' + esc(inp.v) + '</textarea>'; }
          else {
            if (inp.r !== rowId) { flush(); rowId = inp.r; }
            const ctl = inp.t === 's' ? '<select class="formula-search convert-input" id="' + id + '">' + inp.opts.map(o => '<option value="' + esc(o[0]) + '"' + (o[0] === inp.v ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>'
              : '<input type="number" step="any" class="formula-search convert-input" id="' + id + '" value="' + esc(inp.v) + '">';
            row.push('<span class="graph-range-sep">' + esc(inp.l) + '</span>' + ctl);
          }
        });
        flush();
        if (g.presets) html += '<div class="graph-quick-row" style="margin-top:8px">' + g.presets.map(p => '<button type="button" class="pill-btn small" data-set="' + esc(JSON.stringify(Object.keys(p[1]).reduce((o, k) => { o[k.indexOf('gx_') === 0 ? k : pid + '_' + k] = p[1][k]; return o; }, {}))) + '">' + esc(p[0]) + '</button>').join('') + '</div>';
        html += '<div class="graph-error" id="' + pid + '_err"></div>';
        const panel = document.createElement('div'); panel.id = pid + '_panel'; panel.style.display = 'none'; panel.innerHTML = html;
        showBtn.parentNode.insertBefore(panel, showBtn);
        NEW_EXTRA['x_' + g.id] = { panel: pid + '_panel', err: pid + '_err', plot() {
          const W = canvas.__w || canvas.width, H = canvas.__h || canvas.height, errEl = gEl(pid + '_err'); errEl.textContent = '';
          try { renderLegend(g.plot(readInputs(g), W, H) || []); }
          catch (e) { errEl.textContent = (e && e.gx) || tx('graph_x_error', 'Could not draw this graph — check your values.'); ctx.clearRect(0, 0, W, H); renderLegend([]); }
        } };
      });
    });
  })();

  // mode -> its step-2 panel, error element and plot function
  const EXTRA = {
    slopefield: { panel: 'graphSlopePanel', err: 'graphSlopeError', plot: plotSlopeField },
    contour: { panel: 'graphContourPanel', err: 'graphContourError', plot: plotContour },
    histogram: { panel: 'graphHistPanel', err: 'graphHistError', plot: plotHistogram },
    boxplot: { panel: 'graphBoxPanel', err: 'graphBoxError', plot: plotBoxPlot },
    normal: { panel: 'graphNormalPanel', err: 'graphNormError', plot: plotNormal },
    binomial: { panel: 'graphBinomialPanel', err: 'graphBinError', plot: plotBinomial },
    regression: { panel: 'graphRegressionPanel', err: 'graphRegError', plot: plotRegression },
    argand: { panel: 'graphArgandPanel', err: 'graphArgError', plot: plotArgand },
    vectors: { panel: 'graphVectorsPanel', err: 'graphVecError', plot: plotVectors }
  };
  Object.assign(EXTRA, NEW_EXTRA);
  Object.keys(EXTRA).forEach(k => { EXTRA[k].panelEl = gEl(EXTRA[k].panel); EXTRA[k].errEl = gEl(EXTRA[k].err); });

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

  /* ---- 3D SURFACE PLOTTER (pure canvas, no external library) ---- */
  function compileFn3D(exprRaw) {
    let expr = (exprRaw || '').trim();
    if (!expr) return null;
    expr = expr.replace(/(\d)(x|y)/gi, '$1*$2');
    expr = expr.replace(/\)(\s*)(x|y|\()/gi, ')*$2');
    // skip the digit-before-paren rule when it's actually part of log10( / log2(
    expr = expr.replace(/(?<!log1)(?<!log)(\d)(\()/g, '$1*$2');
    expr = expr.replace(/\^/g, '**');
    expr = expr.replace(/\bln\(/g, 'log(');
    const safety = expr
      .replace(/\b(sin|cos|tan|cot|sec|csc|asin|acos|atan|acot|asec|acsc|sinh|cosh|tanh|asinh|acosh|atanh|sqrt|cbrt|abs|log10|log2|log|exp|pow|min|max|floor|ceil|round|trunc|sign|pi|PI)\b/g, '')
      .replace(/[xy\d\s+\-*/().,]/g, '');
    if (safety.length > 0) return null;
    const body = expr
      .replace(/\bsin\(/g, 'Math.sin(').replace(/\bcos\(/g, 'Math.cos(')
      .replace(/\btan\(/g, 'Math.tan(').replace(/\basin\(/g, 'Math.asin(')
      .replace(/\bacos\(/g, 'Math.acos(').replace(/\batan\(/g, 'Math.atan(')
      .replace(/\bsinh\(/g, 'Math.sinh(').replace(/\bcosh\(/g, 'Math.cosh(')
      .replace(/\btanh\(/g, 'Math.tanh(').replace(/\basinh\(/g, 'Math.asinh(')
      .replace(/\bacosh\(/g, 'Math.acosh(').replace(/\batanh\(/g, 'Math.atanh(')
      .replace(/\bsqrt\(/g, 'Math.sqrt(').replace(/\bcbrt\(/g, 'Math.cbrt(')
      .replace(/\babs\(/g, 'Math.abs(')
      .replace(/\blog10\(/g, 'Math.log10(').replace(/\blog2\(/g, 'Math.log2(')
      .replace(/\blog\(/g, 'Math.log(').replace(/\bexp\(/g, 'Math.exp(')
      .replace(/\bpow\(/g, 'Math.pow(').replace(/\bmin\(/g, 'Math.min(')
      .replace(/\bmax\(/g, 'Math.max(')
      .replace(/\bfloor\(/g, 'Math.floor(').replace(/\bceil\(/g, 'Math.ceil(')
      .replace(/\bround\(/g, 'Math.round(').replace(/\btrunc\(/g, 'Math.trunc(')
      .replace(/\bsign\(/g, 'Math.sign(')
      .replace(/\bpi\b/gi, 'Math.PI');
    try {
      const fn = new Function('x', 'y', FN_HELPERS + ' return (' + body + ');');
      fn(1, 1);
      return fn;
    } catch (e) { return null; }
  }

  let rot3D = { x: 0.55, y: 0.8 }; // radians
  let dragging3D = false, lastDrag = { x: 0, y: 0 };

  function project3D(px, py, pz, w, h, scale) {
    // rotate around Y then X, then simple orthographic projection
    const cosY = Math.cos(rot3D.y), sinY = Math.sin(rot3D.y);
    const x1 = px * cosY - pz * sinY;
    const z1 = px * sinY + pz * cosY;
    const cosX = Math.cos(rot3D.x), sinX = Math.sin(rot3D.x);
    const y2 = py * cosX - z1 * sinX;
    const z2 = py * sinX + z1 * cosX;
    return [w / 2 + x1 * scale, h / 2 - y2 * scale, z2];
  }

  function draw3DSurface() {
    if (!ctx3D) return;
    const w = canvas3D.__w || canvas3D.width, h = canvas3D.__h || canvas3D.height;
    ctx3D.clearRect(0, 0, w, h);
    if (error3D) error3D.textContent = '';

    const fn = compileFn3D(fn3DInput.value);
    if (!fn) {
      if (error3D) error3D.textContent = t('graph_3d_error_expr');
      return;
    }

    const range = 3, steps = 26;
    const step = (range * 2) / steps;
    let zMin = Infinity, zMax = -Infinity;
    const grid = [];
    for (let i = 0; i <= steps; i++) {
      const row = [];
      const gx = -range + i * step;
      for (let j = 0; j <= steps; j++) {
        const gy = -range + j * step;
        let gz;
        try { gz = fn(gx, gy); } catch (e) { gz = 0; }
        if (!isFinite(gz)) gz = 0;
        gz = Math.max(-6, Math.min(6, gz));
        row.push(gz);
        if (gz < zMin) zMin = gz;
        if (gz > zMax) zMax = gz;
      }
      grid.push(row);
    }
    if (zMax === zMin) { zMax += 1; zMin -= 1; }

    const scale = Math.min(w, h) / (range * 3.2);
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#ff8a1f';

    // collect quads with average depth for painter's-algorithm sorting
    const quads = [];
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const gx0 = -range + i * step, gx1 = -range + (i + 1) * step;
        const gy0 = -range + j * step, gy1 = -range + (j + 1) * step;
        const corners = [
          [gx0, gy0, grid[i][j]], [gx1, gy0, grid[i + 1][j]],
          [gx1, gy1, grid[i + 1][j + 1]], [gx0, gy1, grid[i][j + 1]],
        ].map(([px, py, pz]) => project3D(px, pz, py, w, h, scale));
        const avgDepth = corners.reduce((s, c) => s + c[2], 0) / 4;
        const avgZ = (grid[i][j] + grid[i + 1][j] + grid[i + 1][j + 1] + grid[i][j + 1]) / 4;
        quads.push({ corners, avgDepth, avgZ });
      }
    }
    quads.sort((a, b) => a.avgDepth - b.avgDepth);

    quads.forEach(q => {
      const t2 = (q.avgZ - zMin) / (zMax - zMin);
      // color ramp from cool blue (low) to accent orange (high)
      const r = Math.round(60 + t2 * 195);
      const g = Math.round(110 - t2 * 40);
      const b = Math.round(200 - t2 * 160);
      ctx3D.fillStyle = `rgba(${r},${g},${b},0.85)`;
      ctx3D.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx3D.lineWidth = 1;
      ctx3D.beginPath();
      q.corners.forEach(([px, py], idx) => idx === 0 ? ctx3D.moveTo(px, py) : ctx3D.lineTo(px, py));
      ctx3D.closePath();
      ctx3D.fill();
      ctx3D.stroke();
    });

    // simple axis indicator at origin
    ctx3D.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx3D.lineWidth = 1.5;
    [[range, 0, 0], [0, range, 0], [0, 0, range]].forEach(([ax, ay, az], idx) => {
      const [ox, oy] = project3D(0, 0, 0, w, h, scale);
      const [ex, ey] = project3D(ax, az, ay, w, h, scale);
      ctx3D.beginPath(); ctx3D.moveTo(ox, oy); ctx3D.lineTo(ex, ey); ctx3D.stroke();
    });
  }

  function draw3DSized(w, h) { canvas3D.__w = w; canvas3D.__h = h; draw3DSurface(); }

  if (canvas3D) {
    const startDrag = (x, y) => { dragging3D = true; lastDrag = { x, y }; };
    const moveDrag = (x, y) => {
      if (!dragging3D) return;
      rot3D.y += (x - lastDrag.x) * 0.01;
      rot3D.x += (y - lastDrag.y) * -0.01;
      rot3D.x = Math.max(-1.4, Math.min(1.4, rot3D.x));
      lastDrag = { x, y };
      draw3DSurface();
    };
    const endDrag = () => { dragging3D = false; };
    canvas3D.addEventListener('mousedown', (e) => startDrag(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);
    canvas3D.addEventListener('touchstart', (e) => { const t2 = e.touches[0]; startDrag(t2.clientX, t2.clientY); }, { passive: true });
    canvas3D.addEventListener('touchmove', (e) => { const t2 = e.touches[0]; moveDrag(t2.clientX, t2.clientY); }, { passive: true });
    canvas3D.addEventListener('touchend', endDrag);
    fn3DInput.addEventListener('input', () => { clearTimeout(debounceTimer); debounceTimer = setTimeout(draw3DSurface, 150); });
    quick3DBtns.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-fn3d]');
      if (!btn) return;
      fn3DInput.value = btn.dataset.fn3d;
      draw3DSurface();
    });
  }

  function redraw() {
    if (graphStep !== 3) return;   // only draw while the graph page (step 3) is visible
    // resize canvas to actual displayed size for crispness
    const wrapRect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (wrapRect.width > 0 && wrapRect.height > 0) {
      canvas.width = Math.round(wrapRect.width * dpr);
      canvas.height = Math.round(wrapRect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (canvas3D) {
        canvas3D.width = Math.round(wrapRect.width * dpr);
        canvas3D.height = Math.round(wrapRect.height * dpr);
        if (ctx3D) ctx3D.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    const w = wrapRect.width || 600, h = wrapRect.height || 380;
    if (graphMode === 'function') {
      plotFunctionSized(w, h);
    } else if (graphMode === 'surface3d') {
      draw3DSized(w, h);
    } else if (graphMode === 'polar') {
      plotPolarSized(w, h);
    } else if (graphMode === 'parametric') {
      plotParametricSized(w, h);
    } else if (graphMode === 'inequality') {
      plotInequalitySized(w, h);
    } else if (graphMode === 'data') {
      plotDataChartSized(w, h);
    } else if (graphMode === 'implicit') {
      canvas.__w = w; canvas.__h = h; plotImplicit();
    } else if (graphMode === 'pie') {
      canvas.__w = w; canvas.__h = h; plotPie();
    } else if (EXTRA[graphMode]) {
      canvas.__w = w; canvas.__h = h; EXTRA[graphMode].plot();
    } else {
      drawUnitCircleSized(w, h, parseFloat(angleSlider.value));
    }
    // show whatever error the active graph reported on the graph page too
    const errEl = ({ 'function': graphError, surface3d: error3D, polar: polarError, parametric: paramError,
      inequality: ineqError, data: dataError, implicit: implicitError, pie: pieError })[graphMode];
    const errShown = errEl || (EXTRA[graphMode] && EXTRA[graphMode].errEl);
    if (step3Error) step3Error.textContent = errShown ? errShown.textContent : '';
  }

  // re-bind sized versions so canvas.width/height (CSS px via transform) match
  function plotFunctionSized(w, h) { canvas.__w = w; canvas.__h = h; plotFunction(); }
  function drawUnitCircleSized(w, h, a) { canvas.__w = w; canvas.__h = h; drawUnitCircle(a); }
  function plotPolarSized(w, h) { canvas.__w = w; canvas.__h = h; plotPolar(); }
  function plotParametricSized(w, h) { canvas.__w = w; canvas.__h = h; plotParametric(); }
  function plotInequalitySized(w, h) { canvas.__w = w; canvas.__h = h; plotInequality(); }
  function plotDataChartSized(w, h) { canvas.__w = w; canvas.__h = h; plotDataChart(); }

  function setDataType(type) {
    dataChartType = type;
    if (dataBarBtn) dataBarBtn.classList.toggle('active', type === 'bar');
    if (dataScatterBtn) dataScatterBtn.classList.toggle('active', type === 'scatter');
    if (dataLineBtn) dataLineBtn.classList.toggle('active', type === 'line');
    if (dataAreaBtn) dataAreaBtn.classList.toggle('active', type === 'area');
  }

  function showStep(n) {
    graphStep = n;
    step1El.style.display = n === 1 ? 'block' : 'none';
    step2El.style.display = n === 2 ? 'block' : 'none';
    step3El.style.display = n === 3 ? 'block' : 'none';
    if (n === 2) {
      // clear stale error text while the person is editing
      [graphError, error3D, polarError, paramError, ineqError, dataError, implicitError, pieError]
        .forEach(el => { if (el) el.textContent = ''; });
      Object.keys(EXTRA).forEach(k => { if (EXTRA[k].errEl) EXTRA[k].errEl.textContent = ''; });
    }
    if (n === 3) redraw();   // step 3 is now visible, so the canvas has its real size
    // Reset every scroller back to the top (do NOT use scrollIntoView here: html/body/panel are
    // overflow:hidden, and scrollIntoView still scrolls them, which pushes the "All tools"
    // button up underneath the fixed navbar).
    const card = document.getElementById('graphCard');
    if (card) {
      card.scrollTop = 0;
      const gPanel = card.closest('.tab-panel');
      const gWrap = card.closest('.formulas-wrap');
      if (gWrap) gWrap.scrollTop = 0;
      if (gPanel) gPanel.scrollTop = 0;
    }
    window.scrollTo(0, 0);
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }

  function setGraphMode(mode) {
    graphMode = mode;
    if (step3El) step3El.dataset.gmode = mode;   // CSS sizes the canvas per graph so the page fits the screen
    fnPanel.style.display = mode === 'function' ? 'block' : 'none';
    if (circleStartPanel) circleStartPanel.style.display = mode === 'unitcircle' ? 'block' : 'none';
    circlePanel.style.display = mode === 'unitcircle' ? 'block' : 'none';   // slider sits under the graph (step 3)
    if (panel3D) panel3D.style.display = mode === 'surface3d' ? 'block' : 'none';
    if (hint3D) hint3D.style.display = mode === 'surface3d' ? 'block' : 'none';
    if (polarPanel) polarPanel.style.display = mode === 'polar' ? 'block' : 'none';
    if (paramPanel) paramPanel.style.display = mode === 'parametric' ? 'block' : 'none';
    if (ineqPanel) ineqPanel.style.display = mode === 'inequality' ? 'block' : 'none';
    if (implicitPanel) implicitPanel.style.display = mode === 'implicit' ? 'block' : 'none';
    if (dataPanel) dataPanel.style.display = mode === 'data' ? 'block' : 'none';
    if (piePanel) piePanel.style.display = mode === 'pie' ? 'block' : 'none';
    Object.keys(EXTRA).forEach(k => { if (EXTRA[k].panelEl) EXTRA[k].panelEl.style.display = mode === k ? 'block' : 'none'; });
    canvas.style.display = mode === 'surface3d' ? 'none' : 'block';
    if (canvas3D) canvas3D.style.display = mode === 'surface3d' ? 'block' : 'none';
    renderLegend([]);
    if (intValueSpan) intValueSpan.textContent = '';
    if (tableWrap && mode !== 'function') tableWrap.style.display = 'none';
  }

  // Step 1 -> Step 2: tap a graph name
  if (typeList) typeList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-graphmode]');
    if (!btn) return;
    setGraphMode(btn.dataset.graphmode);
    if (btn.dataset.datatype) setDataType(btn.dataset.datatype);
    const label = btn.textContent.trim();
    if (step2Title) step2Title.textContent = label;
    if (step3Title) step3Title.textContent = label;
    showStep(2);
  });
  // Step 2 -> Step 3: show the graph
  if (showGraphBtn) showGraphBtn.addEventListener('click', () => showStep(3));
  // back buttons
  if (backToInputBtn) backToInputBtn.addEventListener('click', () => showStep(2));
  if (backToListBtn) backToListBtn.addEventListener('click', () => showStep(1));

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

  if (showSecondCb) showSecondCb.addEventListener('change', () => {
    fn2Input.style.display = showSecondCb.checked ? 'block' : 'none';
    redraw();
  });
  if (fn2Input) fn2Input.addEventListener('input', debounceRedraw);
  if (showDerivCb) showDerivCb.addEventListener('change', redraw);
  if (showIntegralCb) showIntegralCb.addEventListener('change', () => {
    if (integralRow) integralRow.style.display = showIntegralCb.checked ? 'flex' : 'none';
    redraw();
  });
  if (intAInput) intAInput.addEventListener('input', debounceRedraw);
  if (intBInput) intBInput.addEventListener('input', debounceRedraw);
  if (tableBtn) tableBtn.addEventListener('click', () => {
    const isOpen = !!tableWrap.dataset.open;
    if (isOpen) { delete tableWrap.dataset.open; tableWrap.style.display = 'none'; }
    else { tableWrap.dataset.open = '1'; redraw(); }
    tableBtn.classList.toggle('active', !!tableWrap.dataset.open);
  });
  if (polarFnInput) polarFnInput.addEventListener('input', debounceRedraw);
  if (polarThetaMaxInput) polarThetaMaxInput.addEventListener('input', debounceRedraw);
  if (quickPolarBtns) quickPolarBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fnpolar]');
    if (!btn) return;
    polarFnInput.value = btn.dataset.fnpolar;
    if (btn.dataset.thetamax) polarThetaMaxInput.value = btn.dataset.thetamax;
    redraw();
  });
  angleSlider.addEventListener('input', () => {
    drawUnitCircle(parseFloat(angleSlider.value));
  });

  if (paramXInput) paramXInput.addEventListener('input', debounceRedraw);
  if (paramYInput) paramYInput.addEventListener('input', debounceRedraw);
  if (paramTMinInput) paramTMinInput.addEventListener('input', debounceRedraw);
  if (paramTMaxInput) paramTMaxInput.addEventListener('input', debounceRedraw);
  if (paramQuickBtns) paramQuickBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-fnx]');
    if (!btn) return;
    paramXInput.value = btn.dataset.fnx;
    paramYInput.value = btn.dataset.fny;
    if (btn.dataset.tmax) paramTMaxInput.value = btn.dataset.tmax;
    redraw();
  });

  if (ineqInput) ineqInput.addEventListener('input', debounceRedraw);
  if (ineqXMinInput) ineqXMinInput.addEventListener('input', debounceRedraw);
  if (ineqXMaxInput) ineqXMaxInput.addEventListener('input', debounceRedraw);
  if (ineqQuickBtns) ineqQuickBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ineq]');
    if (!btn) return;
    ineqInput.value = btn.dataset.ineq;
    redraw();
  });

  if (dataInput) dataInput.addEventListener('input', debounceRedraw);
  if (dataBarBtn) dataBarBtn.addEventListener('click', () => { setDataType('bar'); redraw(); });
  if (dataScatterBtn) dataScatterBtn.addEventListener('click', () => { setDataType('scatter'); redraw(); });
  if (dataLineBtn) dataLineBtn.addEventListener('click', () => { setDataType('line'); redraw(); });
  if (dataAreaBtn) dataAreaBtn.addEventListener('click', () => { setDataType('area'); redraw(); });

  if (implicitInput) implicitInput.addEventListener('input', debounceRedraw);
  if (implicitMinInput) implicitMinInput.addEventListener('input', debounceRedraw);
  if (implicitMaxInput) implicitMaxInput.addEventListener('input', debounceRedraw);
  if (implicitQuickBtns) implicitQuickBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-impl]');
    if (!btn) return;
    implicitInput.value = btn.dataset.impl;
    const lim = parseFloat(btn.dataset.lim);
    if (isFinite(lim)) { implicitMinInput.value = -lim; implicitMaxInput.value = lim; }
    redraw();
  });
  if (pieInput) pieInput.addEventListener('input', debounceRedraw);
  Object.keys(EXTRA).forEach(k => {
    const pe = EXTRA[k].panelEl;
    if (!pe) return;
    pe.querySelectorAll('input, textarea').forEach(el => el.addEventListener('input', debounceRedraw));
    // quick buttons: data-set='{"inputId":"value", ...}'
    pe.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-set]');
      if (!btn) return;
      try {
        const map = JSON.parse(btn.dataset.set);
        Object.keys(map).forEach(id => { const el = gEl(id); if (el) el.value = map[id]; });
      } catch (err) {}
      redraw();
    });
  });
  if (circleQuickBtns) circleQuickBtns.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-angle]');
    if (!btn) return;
    angleSlider.value = btn.dataset.angle;
    circleQuickBtns.querySelectorAll('[data-angle]').forEach(b => b.classList.toggle('active', b === btn));
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
  const eqModePills = document.getElementById('eqModePills');
  const eqListView = document.getElementById('eqListView');
  const eqDetailView = document.getElementById('eqDetailView');
  const eqDetailTitle = document.getElementById('eqDetailTitle');
  const eqDetailBackBtn = document.getElementById('eqDetailBackBtn');
  const eqDynamicInputs = document.getElementById('eqDynamicInputs');
  const eqSolveBtn = document.getElementById('eqSolveBtn');
  const eqStepsBox = document.getElementById('eqStepsBox');
  if (!eqSolveBtn) return;

  let eqMode = 'linear';

  function fmt(n) {
    if (!isFinite(n)) return '—';
    const r = Math.round(n * 1e6) / 1e6;
    return Number.isInteger(r) ? String(r) : String(r);
  }
  function fmtComplex(re, im) {
    im = Math.round(im * 1e6) / 1e6;
    if (im === 0) return fmt(re);
    return fmt(re) + (im > 0 ? ' + ' : ' − ') + Math.abs(im) + 'i';
  }
  function stepHtml(label, content, isFinal) {
    return '<div class="eq-step' + (isFinal ? ' eq-final' : '') + '">'
      + '<span class="eq-step-label">' + label + '</span>' + content + '</div>';
  }
  function errorHtml(msg) { return '<div class="eq-error">' + msg + '</div>'; }
  function renderStepsHtml(html) { eqStepsBox.innerHTML = html; }

  /* ---- Field layouts per mode. Plain 3-coefficient modes just list
     their fields; the two systems-of-equations modes are grouped into
     one visual row per equation for readability. ---- */
  const EQ_FIELDS = {
    linear:      [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 0 }],
    quadratic:   [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 0 }],
    cubic:       [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 0 }, { k: 'd', l: 'd', d: 0 }],
    biquadratic: [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 0 }],
    sys2: [
      [{ k: 'a1', l: 'a₁', d: 1 }, { k: 'b1', l: 'b₁', d: 1 }, { k: 'c1', l: 'c₁', d: 0 }],
      [{ k: 'a2', l: 'a₂', d: 1 }, { k: 'b2', l: 'b₂', d: -1 }, { k: 'c2', l: 'c₂', d: 0 }],
    ],
    sys3: [
      [{ k: 'a1', l: 'a₁', d: 1 }, { k: 'b1', l: 'b₁', d: 0 }, { k: 'c1', l: 'c₁', d: 0 }, { k: 'd1', l: 'd₁', d: 0 }],
      [{ k: 'a2', l: 'a₂', d: 0 }, { k: 'b2', l: 'b₂', d: 1 }, { k: 'c2', l: 'c₂', d: 0 }, { k: 'd2', l: 'd₂', d: 0 }],
      [{ k: 'a3', l: 'a₃', d: 0 }, { k: 'b3', l: 'b₃', d: 0 }, { k: 'c3', l: 'c₃', d: 1 }, { k: 'd3', l: 'd₃', d: 0 }],
    ],
    exponential: [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 2 }, { k: 'c', l: 'c', d: 8 }],
    logarithmic: [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b (base)', d: 2 }, { k: 'c', l: 'c', d: 3 }],
    absolute:    [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 5 }],
    radical:     [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 3 }],
    rational:    [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 2 }],
    trig:        [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0.5 }],
    quartic:     [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: -5 }, { k: 'd', l: 'd', d: 0 }, { k: 'e', l: 'e', d: 4 }],
    cosine:      [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0.5 }],
    tangent:     [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 1 }],
    reciprocal:  [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 2 }, { k: 'c', l: 'c', d: 3 }],
    cuberoot:    [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 0 }, { k: 'c', l: 'c', d: 2 }],
    proportion:  [{ k: 'a', l: 'a', d: 2 }, { k: 'b', l: 'b', d: 3 }, { k: 'c', l: 'c', d: 4 }],
    linearboth:  [{ k: 'a', l: 'a', d: 2 }, { k: 'b', l: 'b', d: 3 }, { k: 'c', l: 'c', d: 1 }, { k: 'd', l: 'd', d: 5 }],
    rationalcross: [{ k: 'a', l: 'a', d: 2 }, { k: 'b', l: 'b', d: 1 }, { k: 'c', l: 'c', d: 3 }, { k: 'd', l: 'd', d: 4 }],
    directvar:   [{ k: 'y', l: 'y', d: '', ph: 'blank = solve' }, { k: 'k', l: 'k', d: 2 }, { k: 'x', l: 'x', d: 5 }],
    inversevar:  [{ k: 'y', l: 'y', d: '', ph: 'blank = solve' }, { k: 'k', l: 'k', d: 12 }, { k: 'x', l: 'x', d: 4 }],
    arithseq:    [{ k: 'a1', l: 'a₁', d: 2 }, { k: 'd', l: 'd', d: 3 }, { k: 'n', l: 'n', d: 5 }, { k: 'an', l: 'aₙ', d: '', ph: 'blank = solve' }],
    geomseq:     [{ k: 'a1', l: 'a₁', d: 3 }, { k: 'r', l: 'r', d: 2 }, { k: 'n', l: 'n', d: 4 }, { k: 'an', l: 'aₙ', d: '', ph: 'blank = solve' }],
    sincos:      [{ k: 'a', l: 'a', d: 1 }, { k: 'b', l: 'b', d: 1 }, { k: 'c', l: 'c', d: 1 }],
    pythagorean:      [{ k: 'a', l: 'a', d: 3 }, { k: 'b', l: 'b', d: 4 }, { k: 'c', l: 'c', d: '', ph: 'blank = solve' }],
    slopeintercept:   [{ k: 'y', l: 'y', d: '', ph: 'blank = solve' }, { k: 'm', l: 'm', d: 2 }, { k: 'x', l: 'x', d: 3 }, { k: 'c', l: 'c', d: 1 }],
    percentage:       [{ k: 'p', l: 'p (%)', d: 20 }, { k: 'x', l: 'x', d: 50 }, { k: 'y', l: 'y', d: '', ph: 'blank = solve' }],
    simpleinterest:   [{ k: 'I', l: 'I', d: '', ph: 'blank = solve' }, { k: 'P', l: 'P', d: 1000 }, { k: 'R', l: 'R (%)', d: 5 }, { k: 'T', l: 'T (yrs)', d: 2 }],
    compoundinterest: [{ k: 'A', l: 'A', d: '', ph: 'blank = solve' }, { k: 'P', l: 'P', d: 1000 }, { k: 'r', l: 'r (%)', d: 10 }, { k: 't', l: 't (yrs)', d: 2 }],
    ohmslaw:      [{ k: 'V', l: 'V', d: '', ph: 'blank = solve' }, { k: 'I', l: 'I', d: 2 }, { k: 'R', l: 'R', d: 5 }],
    electricpower:[{ k: 'P', l: 'P', d: '', ph: 'blank = solve' }, { k: 'I', l: 'I', d: 2 }, { k: 'R', l: 'R', d: 10 }],
    workdone:     [{ k: 'W', l: 'W', d: '', ph: 'blank = solve' }, { k: 'F', l: 'F', d: 10 }, { k: 'd', l: 'd', d: 5 }],
    power:        [{ k: 'P', l: 'P', d: '', ph: 'blank = solve' }, { k: 'W', l: 'W', d: 100 }, { k: 't', l: 't', d: 20 }],
    newton2:      [{ k: 'F', l: 'F', d: '', ph: 'blank = solve' }, { k: 'm', l: 'm', d: 5 }, { k: 'a', l: 'a', d: 2 }],
    density:      [{ k: 'rho', l: 'ρ', d: '', ph: 'blank = solve' }, { k: 'm', l: 'm', d: 50 }, { k: 'V', l: 'V', d: 10 }],
    kinematicsv:  [{ k: 'v', l: 'v', d: '', ph: 'blank = solve' }, { k: 'u', l: 'u', d: 0 }, { k: 'a', l: 'a', d: 9.8 }, { k: 't', l: 't', d: 2 }],
    kinematicss:  [{ k: 's', l: 's', d: '', ph: 'blank = solve' }, { k: 'u', l: 'u', d: 0 }, { k: 'a', l: 'a', d: 9.8 }, { k: 't', l: 't', d: 2 }],
    kinematicsvs: [{ k: 'v', l: 'v', d: '', ph: 'blank = solve' }, { k: 'u', l: 'u', d: 0 }, { k: 'a', l: 'a', d: 9.8 }, { k: 's', l: 's', d: 20 }],
    idealgas:     [{ k: 'P', l: 'P', d: 1 }, { k: 'V', l: 'V', d: 22.4 }, { k: 'n', l: 'n', d: 1 }, { k: 'R', l: 'R', d: 0.0821 }, { k: 'T', l: 'T', d: '', ph: 'blank = solve' }],
    molarity:     [{ k: 'M', l: 'M', d: '', ph: 'blank = solve' }, { k: 'n', l: 'n', d: 2 }, { k: 'V', l: 'V', d: 4 }],
    circlearea:   [{ k: 'A', l: 'A', d: '', ph: 'blank = solve' }, { k: 'r', l: 'r', d: 7 }],
    circumference:[{ k: 'C', l: 'C', d: '', ph: 'blank = solve' }, { k: 'r', l: 'r', d: 7 }],
    spherevolume: [{ k: 'V', l: 'V', d: '', ph: 'blank = solve' }, { k: 'r', l: 'r', d: 3 }],
    lawofcosines: [{ k: 'a', l: 'a', d: 5 }, { k: 'b', l: 'b', d: 7 }, { k: 'C', l: 'C (°)', d: 60 }, { k: 'c', l: 'c', d: '', ph: 'blank = solve' }],
    radioactivedecay: [{ k: 'N', l: 'N', d: '', ph: 'blank = solve' }, { k: 'N0', l: 'N₀', d: 100 }, { k: 'k', l: 'k', d: 0.1 }, { k: 't', l: 't', d: 5 }],
    halflife:     [{ k: 'N', l: 'N', d: '', ph: 'blank = solve' }, { k: 'N0', l: 'N₀', d: 80 }, { k: 't', l: 't', d: 10 }, { k: 'T', l: 'T (half-life)', d: 5 }],
    freefall:     [{ k: 'h', l: 'h', d: '', ph: 'blank = solve' }, { k: 'g', l: 'g', d: 9.8 }, { k: 't', l: 't', d: 3 }],
    waveeq:       [{ k: 'v', l: 'v', d: '', ph: 'blank = solve' }, { k: 'f', l: 'f', d: 50 }, { k: 'lambda', l: 'λ', d: 2 }],
    lensformula:  [{ k: 'f', l: 'f', d: '', ph: 'blank = solve' }, { k: 'u', l: 'u', d: 30 }, { k: 'v', l: 'v', d: 60 }],
  };

  function buildFieldGroup(f) {
    const valAttr = (f.d === '' || f.d === undefined || f.d === null) ? '' : f.d;
    const placeholderAttr = f.ph ? ' placeholder="' + f.ph + '"' : '';
    return '<div class="eq-input-group"><label>' + f.l + '</label>'
      + '<input type="number" class="formula-search convert-input" id="eqF_' + f.k + '" value="' + valAttr + '"' + placeholderAttr + '></div>';
  }

  function renderFields() {
    const cfg = EQ_FIELDS[eqMode];
    if (Array.isArray(cfg[0])) {
      eqDynamicInputs.innerHTML = cfg.map(row =>
        '<div class="eq-sys-row">' + row.map(buildFieldGroup).join('') + '</div>'
      ).join('');
    } else {
      eqDynamicInputs.innerHTML = cfg.map(buildFieldGroup).join('');
    }
    renderStepsHtml('');
  }

  function val(key) {
    const el = document.getElementById('eqF_' + key);
    return el ? parseFloat(el.value) : NaN;
  }
  function allFinite(...vals) { return vals.every(v => isFinite(v)); }

  function setEqMode(mode, label) {
    eqMode = mode;
    eqDetailTitle.textContent = label || mode;
    eqListView.style.display = 'none';
    eqDetailView.style.display = '';
    renderFields();
  }

  if (eqDetailBackBtn) {
    eqDetailBackBtn.addEventListener('click', () => {
      eqDetailView.style.display = 'none';
      eqListView.style.display = '';
    });
  }

  /* ---------- 1. Linear: ax + b = c ---------- */
  function solveLinear() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml(t('eq_step_original'), a + 'x + ' + b + ' = ' + c);
    html += stepHtml(t('eq_step_isolate'), a + 'x = ' + c + ' − (' + b + ') = ' + fmt(c - b));
    const x = (c - b) / a;
    html += stepHtml(t('eq_step_divide'), 'x = ' + fmt(c - b) + ' / ' + a);
    html += stepHtml(t('eq_step_answer'), 'x = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---------- 2. Quadratic: ax² + bx + c = 0 ---------- */
  function solveQuadratic() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
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
    renderStepsHtml(html);
  }

  /* ---------- 3. Cubic: ax³ + bx² + cx + d = 0 (depressed-cubic / Cardano method) ---------- */
  function solveCubic() {
    const a = val('a'), b = val('b'), c = val('c'), d = val('d');
    if (!allFinite(a, b, c, d)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + 'x³ + ' + b + 'x² + ' + c + 'x + ' + d + ' = 0');

    const B = b / a, C = c / a, D0 = d / a;
    html += stepHtml('Normalize (÷a)', 'x³ + ' + fmt(B) + 'x² + ' + fmt(C) + 'x + ' + fmt(D0) + ' = 0');

    const p = C - (B * B) / 3;
    const q = (2 * B * B * B) / 27 - (B * C) / 3 + D0;
    html += stepHtml('Depressed cubic (x = t − B/3)', 't³ + (' + fmt(p) + ')t + (' + fmt(q) + ') = 0');

    const disc = -4 * p * p * p - 27 * q * q;
    html += stepHtml('Discriminant', 'Δ = −4p³ − 27q² = ' + fmt(disc));

    const shift = B / 3;
    let roots = [];
    if (disc >= 0) {
      // Three real roots — trigonometric method
      const m = 2 * Math.sqrt(-p / 3);
      for (let k = 0; k < 3; k++) {
        const theta = Math.acos((3 * q) / (p * m)) / 3 - (2 * Math.PI * k) / 3;
        const t_k = m * Math.cos(theta);
        roots.push({ re: t_k - shift, im: 0 });
      }
      html += stepHtml('Three real roots (trigonometric formula)',
        'x₁ = ' + fmt(roots[0].re) + ',  x₂ = ' + fmt(roots[1].re) + ',  x₃ = ' + fmt(roots[2].re), true);
    } else {
      // One real root, one complex-conjugate pair — Cardano's formula
      const inner = Math.sqrt((q * q) / 4 + (p * p * p) / 27);
      const u = Math.cbrt(-q / 2 + inner);
      const v = Math.cbrt(-q / 2 - inner);
      const t1 = u + v;
      roots.push({ re: t1 - shift, im: 0 });
      roots.push({ re: -t1 / 2 - shift, im: (u - v) * Math.sqrt(3) / 2 });
      roots.push({ re: -t1 / 2 - shift, im: -(u - v) * Math.sqrt(3) / 2 });
      html += stepHtml('One real root + a complex-conjugate pair (Cardano)',
        'x₁ = ' + fmt(roots[0].re) + ',  x₂ = ' + fmtComplex(roots[1].re, roots[1].im) + ',  x₃ = ' + fmtComplex(roots[2].re, roots[2].im), true);
    }
    renderStepsHtml(html);
  }

  /* ---------- 4. Biquadratic: ax⁴ + bx² + c = 0 (substitute y = x²) ---------- */
  function solveBiquadratic() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + 'x⁴ + ' + b + 'x² + ' + c + ' = 0');
    html += stepHtml('Substitute y = x²', a + 'y² + ' + b + 'y + ' + c + ' = 0');
    const D = b * b - 4 * a * c;
    html += stepHtml('Discriminant', 'D = b² − 4ac = ' + fmt(D));
    if (D < 0) {
      renderStepsHtml(html + errorHtml('No real value of y (discriminant is negative) → no real roots for x.'));
      return;
    }
    const sqrtD = Math.sqrt(D);
    const y1 = (-b + sqrtD) / (2 * a);
    const y2 = (-b - sqrtD) / (2 * a);
    html += stepHtml('Solve for y', 'y₁ = ' + fmt(y1) + ',  y₂ = ' + fmt(y2));

    const rootsOf = (y) => {
      if (y > 0) return fmt(Math.sqrt(y)) + ',  ' + fmt(-Math.sqrt(y));
      if (y === 0) return '0 (double root)';
      return fmtComplex(0, Math.sqrt(-y)) + ',  ' + fmtComplex(0, -Math.sqrt(-y));
    };
    html += stepHtml('x = ±√y for each y', 'From y₁: x = ' + rootsOf(y1) + '<br>From y₂: x = ' + rootsOf(y2), true);
    renderStepsHtml(html);
  }

  /* ---------- 5. System of 2 linear equations (Cramer's rule) ---------- */
  function solveSys2() {
    const a1 = val('a1'), b1 = val('b1'), c1 = val('c1');
    const a2 = val('a2'), b2 = val('b2'), c2 = val('c2');
    if (!allFinite(a1, b1, c1, a2, b2, c2)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    let html = '';
    html += stepHtml('System', a1 + 'x + ' + b1 + 'y = ' + c1 + '<br>' + a2 + 'x + ' + b2 + 'y = ' + c2);
    const D = a1 * b2 - a2 * b1;
    const Dx = c1 * b2 - c2 * b1;
    const Dy = a1 * c2 - a2 * c1;
    html += stepHtml('Determinants (Cramer\'s rule)', 'D = ' + fmt(D) + ',  Dx = ' + fmt(Dx) + ',  Dy = ' + fmt(Dy));
    if (D === 0) {
      if (Dx === 0 && Dy === 0) renderStepsHtml(html + errorHtml('D = 0 and Dx = Dy = 0 → infinitely many solutions (the two lines coincide).'));
      else renderStepsHtml(html + errorHtml('D = 0 but Dx or Dy ≠ 0 → no solution (the lines are parallel).'));
      return;
    }
    const x = Dx / D, y = Dy / D;
    html += stepHtml('Solve', 'x = Dx/D = ' + fmt(x) + ',  y = Dy/D = ' + fmt(y), true);
    renderStepsHtml(html);
  }

  /* ---------- 6. System of 3 linear equations (Cramer's rule, 3×3 determinants) ---------- */
  function det3(m) {
    return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
         - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
         + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  }
  function solveSys3() {
    const keys = ['a1','b1','c1','d1','a2','b2','c2','d2','a3','b3','c3','d3'];
    const v = {}; keys.forEach(k => v[k] = val(k));
    if (!allFinite(...keys.map(k => v[k]))) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    let html = '';
    html += stepHtml('System',
      v.a1 + 'x + ' + v.b1 + 'y + ' + v.c1 + 'z = ' + v.d1 + '<br>' +
      v.a2 + 'x + ' + v.b2 + 'y + ' + v.c2 + 'z = ' + v.d2 + '<br>' +
      v.a3 + 'x + ' + v.b3 + 'y + ' + v.c3 + 'z = ' + v.d3);

    const M = [[v.a1, v.b1, v.c1], [v.a2, v.b2, v.c2], [v.a3, v.b3, v.c3]];
    const D = det3(M);
    const Mx = [[v.d1, v.b1, v.c1], [v.d2, v.b2, v.c2], [v.d3, v.b3, v.c3]];
    const My = [[v.a1, v.d1, v.c1], [v.a2, v.d2, v.c2], [v.a3, v.d3, v.c3]];
    const Mz = [[v.a1, v.b1, v.d1], [v.a2, v.b2, v.d2], [v.a3, v.b3, v.d3]];
    const Dx = det3(Mx), Dy = det3(My), Dz = det3(Mz);
    html += stepHtml('Determinants (Cramer\'s rule)', 'D = ' + fmt(D) + ',  Dx = ' + fmt(Dx) + ',  Dy = ' + fmt(Dy) + ',  Dz = ' + fmt(Dz));
    if (D === 0) {
      renderStepsHtml(html + errorHtml('D = 0 → the system has no unique solution (no solution or infinitely many).'));
      return;
    }
    const x = Dx / D, y = Dy / D, z = Dz / D;
    html += stepHtml('Solve', 'x = ' + fmt(x) + ',  y = ' + fmt(y) + ',  z = ' + fmt(z), true);
    renderStepsHtml(html);
  }

  /* ---------- 7. Exponential: a·bˣ = c ---------- */
  function solveExponential() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + ' · ' + b + '^x = ' + c);
    if (a === 0) { renderStepsHtml(html + errorHtml('a cannot be 0.')); return; }
    if (b <= 0 || b === 1) { renderStepsHtml(html + errorHtml('Base b must be positive and not equal to 1.')); return; }
    const ratio = c / a;
    html += stepHtml('Isolate the power', 'b^x = c/a = ' + fmt(ratio));
    if (ratio <= 0) { renderStepsHtml(html + errorHtml('c/a must be positive — no real solution.')); return; }
    const x = Math.log(ratio) / Math.log(b);
    html += stepHtml('Take log of both sides', 'x = ln(c/a) / ln(b) = ln(' + fmt(ratio) + ') / ln(' + b + ')');
    html += stepHtml('Answer', 'x = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---------- 8. Logarithmic: a·log_b(x) = c ---------- */
  function solveLogarithmic() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + ' · log_' + b + '(x) = ' + c);
    if (a === 0) { renderStepsHtml(html + errorHtml('a cannot be 0.')); return; }
    if (b <= 0 || b === 1) { renderStepsHtml(html + errorHtml('Base b must be positive and not equal to 1.')); return; }
    const rhs = c / a;
    html += stepHtml('Isolate the log', 'log_' + b + '(x) = c/a = ' + fmt(rhs));
    const x = Math.pow(b, rhs);
    html += stepHtml('Rewrite in exponential form', 'x = b^(c/a) = ' + b + '^' + fmt(rhs));
    html += stepHtml('Answer', 'x = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---------- 9. Absolute value: a|x| + b = c ---------- */
  function solveAbsolute() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '|x| + ' + b + ' = ' + c);
    const rhs = (c - b) / a;
    html += stepHtml('Isolate |x|', '|x| = (c − b)/a = ' + fmt(rhs));
    if (rhs < 0) { renderStepsHtml(html + errorHtml('|x| cannot be negative → no solution.')); return; }
    if (rhs === 0) { renderStepsHtml(html + stepHtml('Answer', 'x = 0', true)); return; }
    html += stepHtml('Answer', 'x = ' + fmt(rhs) + '  or  x = ' + fmt(-rhs), true);
    renderStepsHtml(html);
  }

  /* ---------- 10. Radical: a·√x + b = c ---------- */
  function solveRadical() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '·√x + ' + b + ' = ' + c);
    const rhs = (c - b) / a;
    html += stepHtml('Isolate √x', '√x = (c − b)/a = ' + fmt(rhs));
    if (rhs < 0) { renderStepsHtml(html + errorHtml('√x cannot be negative → no real solution.')); return; }
    const x = rhs * rhs;
    html += stepHtml('Square both sides', 'x = (' + fmt(rhs) + ')²');
    html += stepHtml('Answer', 'x = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---------- 11. Rational: a/x + b = c ---------- */
  function solveRational() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '/x + ' + b + ' = ' + c);
    const denom = c - b;
    html += stepHtml('Isolate a/x', 'a/x = c − b = ' + fmt(denom));
    if (denom === 0) { renderStepsHtml(html + errorHtml('c − b cannot be 0 (would need x to be infinite) → no solution.')); return; }
    const x = a / denom;
    html += stepHtml('Solve for x', 'x = a / (c − b) = ' + a + ' / ' + fmt(denom));
    html += stepHtml('Answer', 'x = ' + fmt(x) + '  (x ≠ 0)', true);
    renderStepsHtml(html);
  }

  /* ---------- 12. Trigonometric: a·sin(x) = b, x in [0°, 360°) ---------- */
  function solveTrig() {
    const a = val('a'), b = val('b');
    if (!allFinite(a, b)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '·sin(x) = ' + b);
    const ratio = b / a;
    html += stepHtml('Isolate sin(x)', 'sin(x) = b/a = ' + fmt(ratio));
    if (ratio < -1 || ratio > 1) { renderStepsHtml(html + errorHtml('sin(x) must be between −1 and 1 → no solution.')); return; }
    const x1 = Math.asin(ratio) * 180 / Math.PI;
    const x1n = x1 < 0 ? x1 + 360 : x1;
    let x2 = 180 - x1;
    if (x2 < 0) x2 += 360; if (x2 >= 360) x2 -= 360;
    html += stepHtml('Solve within [0°, 360°)', 'x₁ = ' + fmt(x1n) + '°,  x₂ = 180° − x₁ = ' + fmt(x2) + '°', true);
    renderStepsHtml(html);
  }

  /* ---- Small complex-number helpers, used only by the numeric quartic solver ---- */
  function cAdd(a, b) { return { re: a.re + b.re, im: a.im + b.im }; }
  function cSub(a, b) { return { re: a.re - b.re, im: a.im - b.im }; }
  function cMul(a, b) { return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }; }
  function cDiv(a, b) { const dnm = b.re * b.re + b.im * b.im; return { re: (a.re * b.re + a.im * b.im) / dnm, im: (a.im * b.re - a.re * b.im) / dnm }; }
  function cAbs(a) { return Math.sqrt(a.re * a.re + a.im * a.im); }
  function subscript(n) {
    const digits = ['₀','₁','₂','₃','₄','₅','₆','₇','₈','₉'];
    return String(n).split('').map(ch => digits[+ch] || ch).join('');
  }
  /* Durand-Kerner method: finds all `degree` roots of a monic polynomial at once,
     without needing a closed-form formula — used for the general quartic. */
  function durandKerner(monicCoeffs, degree) {
    function evalPoly(z) {
      let result = { re: 0, im: 0 };
      for (let i = 0; i < monicCoeffs.length; i++) {
        result = cAdd(cMul(result, z), { re: monicCoeffs[i], im: 0 });
      }
      return result;
    }
    let roots = [];
    let p = { re: 1, im: 0 };
    const base = { re: 0.4, im: 0.9 };
    for (let k = 0; k < degree; k++) { roots.push(p); p = cMul(p, base); }
    for (let iter = 0; iter < 300; iter++) {
      const next = roots.slice();
      let maxDelta = 0;
      for (let i = 0; i < degree; i++) {
        let denom = { re: 1, im: 0 };
        for (let j = 0; j < degree; j++) { if (j !== i) denom = cMul(denom, cSub(roots[i], roots[j])); }
        const delta = cDiv(evalPoly(roots[i]), denom);
        next[i] = cSub(roots[i], delta);
        maxDelta = Math.max(maxDelta, cAbs(delta));
      }
      roots = next;
      if (maxDelta < 1e-10) break;
    }
    return roots;
  }

  /* ---------- 13. Quartic: ax⁴ + bx³ + cx² + dx + e = 0 (numeric, Durand-Kerner) ---------- */
  function solveQuartic() {
    const a = val('a'), b = val('b'), c = val('c'), d = val('d'), e = val('e');
    if (!allFinite(a, b, c, d, e)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + 'x⁴ + ' + b + 'x³ + ' + c + 'x² + ' + d + 'x + ' + e + ' = 0');
    const B = b / a, C = c / a, D = d / a, E = e / a;
    html += stepHtml('Normalize (÷a)', 'x⁴ + ' + fmt(B) + 'x³ + ' + fmt(C) + 'x² + ' + fmt(D) + 'x + ' + fmt(E) + ' = 0');
    const roots = durandKerner([1, B, C, D, E], 4).map(r => ({
      re: Math.abs(r.re) < 1e-9 ? 0 : r.re,
      im: Math.abs(r.im) < 1e-9 ? 0 : r.im,
    }));
    const rootsStr = roots.map((r, i) => 'x' + subscript(i + 1) + ' = ' + fmtComplex(r.re, r.im)).join(',  ');
    html += stepHtml('Solved numerically (iterative method)', rootsStr, true);
    renderStepsHtml(html);
  }

  /* ---------- 14. Cosine: a·cos(x) = b, x in [0°, 360°) ---------- */
  function solveCosine() {
    const a = val('a'), b = val('b');
    if (!allFinite(a, b)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '·cos(x) = ' + b);
    const ratio = b / a;
    html += stepHtml('Isolate cos(x)', 'cos(x) = b/a = ' + fmt(ratio));
    if (ratio < -1 || ratio > 1) { renderStepsHtml(html + errorHtml('cos(x) must be between −1 and 1 → no solution.')); return; }
    const x1 = Math.acos(ratio) * 180 / Math.PI;
    const x2 = 360 - x1;
    html += stepHtml('Solve within [0°, 360°)', 'x₁ = ' + fmt(x1) + '°,  x₂ = 360° − x₁ = ' + fmt(x2) + '°', true);
    renderStepsHtml(html);
  }

  /* ---------- 15. Tangent: a·tan(x) = b, x in [0°, 360°) ---------- */
  function solveTangent() {
    const a = val('a'), b = val('b');
    if (!allFinite(a, b)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '·tan(x) = ' + b);
    const ratio = b / a;
    html += stepHtml('Isolate tan(x)', 'tan(x) = b/a = ' + fmt(ratio));
    let x1 = Math.atan(ratio) * 180 / Math.PI;
    if (x1 < 0) x1 += 180;
    const x2 = x1 + 180;
    html += stepHtml('Solve within [0°, 360°) (period 180°)', 'x₁ = ' + fmt(x1) + '°,  x₂ = x₁ + 180° = ' + fmt(x2) + '°', true);
    renderStepsHtml(html);
  }

  /* ---------- 16. Reciprocal quadratic: ax + b/x = c ---------- */
  function solveReciprocal() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + 'x + ' + b + '/x = ' + c);
    html += stepHtml('Multiply through by x', a + 'x² + ' + b + ' = ' + c + 'x  (x ≠ 0)');
    const A = a, Bc = -c, C = b;
    html += stepHtml('Standard quadratic form', A + 'x² + (' + Bc + ')x + ' + C + ' = 0');
    const D = Bc * Bc - 4 * A * C;
    html += stepHtml('Discriminant', 'D = ' + fmt(D));
    if (D < 0) { renderStepsHtml(html + errorHtml('D < 0 → no real solution.')); return; }
    const sqrtD = Math.sqrt(D);
    const x1 = (-Bc + sqrtD) / (2 * A), x2 = (-Bc - sqrtD) / (2 * A);
    html += stepHtml('Answer', 'x₁ = ' + fmt(x1) + ',  x₂ = ' + fmt(x2), true);
    renderStepsHtml(html);
  }

  /* ---------- 17. Cube root: a·∛x + b = c ---------- */
  function solveCubeRoot() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '·∛x + ' + b + ' = ' + c);
    const ratio = (c - b) / a;
    html += stepHtml('Isolate ∛x', '∛x = (c − b)/a = ' + fmt(ratio));
    const x = ratio * ratio * ratio;
    html += stepHtml('Cube both sides', 'x = (' + fmt(ratio) + ')³');
    html += stepHtml('Answer', 'x = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---------- 18. Proportion: a/b = c/x ---------- */
  function solveProportion() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0) { renderStepsHtml(errorHtml(t('eq_error_a_zero'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '/' + b + ' = ' + c + '/x');
    html += stepHtml('Cross-multiply', a + 'x = ' + b + ' × ' + c + ' = ' + fmt(b * c));
    const x = (b * c) / a;
    html += stepHtml('Answer', 'x = (b × c)/a = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---------- 19. Linear, variables on both sides: a(x+b) = c(x+d) ---------- */
  function solveLinearBoth() {
    const a = val('a'), b = val('b'), c = val('c'), d = val('d');
    if (!allFinite(a, b, c, d)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '(x + ' + b + ') = ' + c + '(x + ' + d + ')');
    html += stepHtml('Distribute', a + 'x + ' + fmt(a * b) + ' = ' + c + 'x + ' + fmt(c * d));
    const coeff = a - c;
    if (coeff === 0) {
      const eq = Math.abs(a * b - c * d) < 1e-9;
      renderStepsHtml(html + errorHtml(eq ? 'a = c and both sides match → infinitely many solutions.' : 'a = c but the constants differ → no solution.'));
      return;
    }
    html += stepHtml('Collect x terms', '(' + a + ' − ' + c + ')x = ' + fmt(c * d) + ' − ' + fmt(a * b));
    const x = (c * d - a * b) / coeff;
    html += stepHtml('Answer', 'x = (cd − ab)/(a − c) = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---------- 20. Rational cross-multiply: a/(x+b) = c/(x+d) ---------- */
  function solveRationalCross() {
    const a = val('a'), b = val('b'), c = val('c'), d = val('d');
    if (!allFinite(a, b, c, d)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    let html = '';
    html += stepHtml('Original equation', a + '/(x + ' + b + ') = ' + c + '/(x + ' + d + ')');
    html += stepHtml('Cross-multiply', a + '(x + ' + d + ') = ' + c + '(x + ' + b + ')');
    const coeff = a - c;
    if (coeff === 0) { renderStepsHtml(html + errorHtml('a = c → no unique solution (either no solution or identical fractions).')); return; }
    const x = (c * b - a * d) / coeff;
    if (Math.abs(x + b) < 1e-9 || Math.abs(x + d) < 1e-9) {
      renderStepsHtml(html + errorHtml('The result makes a denominator zero → no valid solution.'));
      return;
    }
    html += stepHtml('Answer', 'x = (cb − ad)/(a − c) = ' + fmt(x), true);
    renderStepsHtml(html);
  }

  /* ---- Shared helper for direct/inverse variation & the two sequence solvers:
     exactly one field must be left blank; that's the one solved for. ---- */
  function countBlanks(vals) { return vals.filter(v => !isFinite(v)).length; }

  /* ---------- 21. Direct variation: y = kx ---------- */
  function solveDirectVar() {
    const y = val('y'), k = val('k'), x = val('x');
    if (countBlanks([y, k, x]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = '';
    html += stepHtml('Direct variation', 'y = kx');
    if (!isFinite(y)) { const ans = k * x; html += stepHtml('Solve for y', 'y = ' + k + ' × ' + x + ' = ' + fmt(ans), true); }
    else if (!isFinite(k)) { if (x === 0) { renderStepsHtml(html + errorHtml('x cannot be 0 when solving for k.')); return; } const ans = y / x; html += stepHtml('Solve for k', 'k = y/x = ' + y + '/' + x + ' = ' + fmt(ans), true); }
    else { if (k === 0) { renderStepsHtml(html + errorHtml('k cannot be 0 when solving for x.')); return; } const ans = y / k; html += stepHtml('Solve for x', 'x = y/k = ' + y + '/' + k + ' = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 22. Inverse variation: y = k/x ---------- */
  function solveInverseVar() {
    const y = val('y'), k = val('k'), x = val('x');
    if (countBlanks([y, k, x]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = '';
    html += stepHtml('Inverse variation', 'y = k/x');
    if (!isFinite(y)) { if (x === 0) { renderStepsHtml(html + errorHtml('x cannot be 0.')); return; } const ans = k / x; html += stepHtml('Solve for y', 'y = k/x = ' + k + '/' + x + ' = ' + fmt(ans), true); }
    else if (!isFinite(k)) { const ans = y * x; html += stepHtml('Solve for k', 'k = y × x = ' + y + ' × ' + x + ' = ' + fmt(ans), true); }
    else { if (y === 0) { renderStepsHtml(html + errorHtml('y cannot be 0 when solving for x.')); return; } const ans = k / y; html += stepHtml('Solve for x', 'x = k/y = ' + k + '/' + y + ' = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 23. Arithmetic sequence: aₙ = a₁ + (n−1)d ---------- */
  function solveArithSeq() {
    const a1 = val('a1'), d = val('d'), n = val('n'), an = val('an');
    if (countBlanks([a1, d, n, an]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = '';
    html += stepHtml('Arithmetic sequence', 'aₙ = a₁ + (n − 1)d');
    if (!isFinite(an)) { const ans = a1 + (n - 1) * d; html += stepHtml('Solve for aₙ', 'aₙ = ' + a1 + ' + (' + n + ' − 1)(' + d + ') = ' + fmt(ans), true); }
    else if (!isFinite(a1)) { const ans = an - (n - 1) * d; html += stepHtml('Solve for a₁', 'a₁ = aₙ − (n − 1)d = ' + fmt(ans), true); }
    else if (!isFinite(d)) { if (n === 1) { renderStepsHtml(html + errorHtml('n cannot be 1 when solving for d.')); return; } const ans = (an - a1) / (n - 1); html += stepHtml('Solve for d', 'd = (aₙ − a₁)/(n − 1) = ' + fmt(ans), true); }
    else { if (d === 0) { renderStepsHtml(html + errorHtml('d cannot be 0 when solving for n.')); return; } const ans = (an - a1) / d + 1; html += stepHtml('Solve for n', 'n = (aₙ − a₁)/d + 1 = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 24. Geometric sequence: aₙ = a₁·r^(n−1) ---------- */
  function solveGeomSeq() {
    const a1 = val('a1'), r = val('r'), n = val('n'), an = val('an');
    if (countBlanks([a1, r, n, an]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = '';
    html += stepHtml('Geometric sequence', 'aₙ = a₁ · r^(n − 1)');
    if (!isFinite(an)) { const ans = a1 * Math.pow(r, n - 1); html += stepHtml('Solve for aₙ', 'aₙ = ' + a1 + ' × ' + r + '^(' + n + '−1) = ' + fmt(ans), true); }
    else if (!isFinite(a1)) { const ans = an / Math.pow(r, n - 1); html += stepHtml('Solve for a₁', 'a₁ = aₙ / r^(n−1) = ' + fmt(ans), true); }
    else if (!isFinite(r)) {
      if (n === 1) { renderStepsHtml(html + errorHtml('n cannot be 1 when solving for r.')); return; }
      const ratio = an / a1;
      if (ratio < 0 && (n - 1) % 2 === 0) { renderStepsHtml(html + errorHtml('No real r satisfies this (even root of a negative number).')); return; }
      const ans = Math.sign(ratio) * Math.pow(Math.abs(ratio), 1 / (n - 1));
      html += stepHtml('Solve for r', 'r = (aₙ/a₁)^(1/(n−1)) = ' + fmt(ans), true);
    } else {
      if (r === 0 || r === 1) { renderStepsHtml(html + errorHtml('r must not be 0 or 1 when solving for n.')); return; }
      const ratio = an / a1;
      if (ratio <= 0) { renderStepsHtml(html + errorHtml('aₙ/a₁ must be positive to solve for n this way.')); return; }
      const ans = Math.log(ratio) / Math.log(r) + 1;
      html += stepHtml('Solve for n', 'n = log(aₙ/a₁)/log(r) + 1 = ' + fmt(ans), true);
    }
    renderStepsHtml(html);
  }

  /* ---------- 25. Sine + Cosine combined: a·sin(x) + b·cos(x) = c ---------- */
  function solveSinCos() {
    const a = val('a'), b = val('b'), c = val('c');
    if (!allFinite(a, b, c)) { renderStepsHtml(errorHtml(t('eq_error_input'))); return; }
    if (a === 0 && b === 0) { renderStepsHtml(errorHtml('a and b cannot both be 0.')); return; }
    let html = '';
    html += stepHtml('Original equation', a + '·sin(x) + ' + b + '·cos(x) = ' + c);
    const R = Math.sqrt(a * a + b * b);
    const phi = Math.atan2(b, a) * 180 / Math.PI;
    html += stepHtml('Rewrite as R·sin(x + φ)', 'R = √(a² + b²) = ' + fmt(R) + ',  φ = atan2(b, a) = ' + fmt(phi) + '°');
    const ratio = c / R;
    if (ratio < -1 || ratio > 1) { renderStepsHtml(html + errorHtml('c/R must be between −1 and 1 → no solution.')); return; }
    const theta = Math.asin(ratio) * 180 / Math.PI;
    const norm = (v) => ((v % 360) + 360) % 360;
    const x1 = norm(theta - phi);
    const x2 = norm((180 - theta) - phi);
    html += stepHtml('Solve within [0°, 360°)', 'x₁ = ' + fmt(x1) + '°,  x₂ = ' + fmt(x2) + '°', true);
    renderStepsHtml(html);
  }

  /* ---------- 26. Pythagorean Theorem: c² = a² + b² ---------- */
  function solvePythagorean() {
    const a = val('a'), b = val('b'), c = val('c');
    if (countBlanks([a, b, c]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'c² = a² + b²');
    if (!isFinite(c)) { const ans = Math.sqrt(a * a + b * b); html += stepHtml('Solve for c', 'c = √(a² + b²) = ' + fmt(ans), true); }
    else if (!isFinite(a)) { if (c * c < b * b) { renderStepsHtml(html + errorHtml('c must be larger than b.')); return; } const ans = Math.sqrt(c * c - b * b); html += stepHtml('Solve for a', 'a = √(c² − b²) = ' + fmt(ans), true); }
    else { if (c * c < a * a) { renderStepsHtml(html + errorHtml('c must be larger than a.')); return; } const ans = Math.sqrt(c * c - a * a); html += stepHtml('Solve for b', 'b = √(c² − a²) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 27. Slope-Intercept: y = mx + c ---------- */
  function solveSlopeIntercept() {
    const y = val('y'), m = val('m'), x = val('x'), c = val('c');
    if (countBlanks([y, m, x, c]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'y = mx + c');
    if (!isFinite(y)) { const ans = m * x + c; html += stepHtml('Solve for y', 'y = ' + m + '×' + x + ' + ' + c + ' = ' + fmt(ans), true); }
    else if (!isFinite(m)) { if (x === 0) { renderStepsHtml(html + errorHtml('x cannot be 0.')); return; } const ans = (y - c) / x; html += stepHtml('Solve for m', 'm = (y − c)/x = ' + fmt(ans), true); }
    else if (!isFinite(x)) { if (m === 0) { renderStepsHtml(html + errorHtml('m cannot be 0.')); return; } const ans = (y - c) / m; html += stepHtml('Solve for x', 'x = (y − c)/m = ' + fmt(ans), true); }
    else { const ans = y - m * x; html += stepHtml('Solve for c', 'c = y − mx = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 28. Percentage: p% of x = y ---------- */
  function solvePercentage() {
    const p = val('p'), x = val('x'), y = val('y');
    if (countBlanks([p, x, y]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'y = (p/100) × x');
    if (!isFinite(y)) { const ans = (p * x) / 100; html += stepHtml('Solve for y', 'y = (' + p + '/100) × ' + x + ' = ' + fmt(ans), true); }
    else if (!isFinite(p)) { if (x === 0) { renderStepsHtml(html + errorHtml('x cannot be 0.')); return; } const ans = (y * 100) / x; html += stepHtml('Solve for p', 'p = (y × 100)/x = ' + fmt(ans) + '%', true); }
    else { if (p === 0) { renderStepsHtml(html + errorHtml('p cannot be 0.')); return; } const ans = (y * 100) / p; html += stepHtml('Solve for x', 'x = (y × 100)/p = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 29. Simple Interest: I = PRT/100 ---------- */
  function solveSimpleInterest() {
    const I = val('I'), P = val('P'), R = val('R'), T = val('T');
    if (countBlanks([I, P, R, T]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'I = PRT / 100');
    if (!isFinite(I)) { const ans = (P * R * T) / 100; html += stepHtml('Solve for I', 'I = (' + P + '×' + R + '×' + T + ')/100 = ' + fmt(ans), true); }
    else if (!isFinite(P)) { if (R === 0 || T === 0) { renderStepsHtml(html + errorHtml('R and T cannot be 0.')); return; } const ans = (I * 100) / (R * T); html += stepHtml('Solve for P', 'P = (I×100)/(RT) = ' + fmt(ans), true); }
    else if (!isFinite(R)) { if (P === 0 || T === 0) { renderStepsHtml(html + errorHtml('P and T cannot be 0.')); return; } const ans = (I * 100) / (P * T); html += stepHtml('Solve for R', 'R = (I×100)/(PT) = ' + fmt(ans) + '%', true); }
    else { if (P === 0 || R === 0) { renderStepsHtml(html + errorHtml('P and R cannot be 0.')); return; } const ans = (I * 100) / (P * R); html += stepHtml('Solve for T', 'T = (I×100)/(PR) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 30. Compound Interest: A = P(1 + r/100)^t ---------- */
  function solveCompoundInterest() {
    const A = val('A'), P = val('P'), r = val('r'), t = val('t');
    if (countBlanks([A, P, r, t]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'A = P(1 + r/100)ᵗ');
    const base = (rr) => 1 + rr / 100;
    if (!isFinite(A)) { const ans = P * Math.pow(base(r), t); html += stepHtml('Solve for A', 'A = ' + P + '×(1+' + r + '/100)^' + t + ' = ' + fmt(ans), true); }
    else if (!isFinite(P)) { const ans = A / Math.pow(base(r), t); html += stepHtml('Solve for P', 'P = A / (1+r/100)ᵗ = ' + fmt(ans), true); }
    else if (!isFinite(t)) { if (P === 0 || A / P <= 0 || base(r) <= 0 || base(r) === 1) { renderStepsHtml(html + errorHtml('Cannot solve for t with these values.')); return; } const ans = Math.log(A / P) / Math.log(base(r)); html += stepHtml('Solve for t', 't = ln(A/P) / ln(1+r/100) = ' + fmt(ans), true); }
    else { if (P === 0 || A / P <= 0 || t === 0) { renderStepsHtml(html + errorHtml('Cannot solve for r with these values.')); return; } const ans = 100 * (Math.pow(A / P, 1 / t) - 1); html += stepHtml('Solve for r', 'r = 100×((A/P)^(1/t) − 1) = ' + fmt(ans) + '%', true); }
    renderStepsHtml(html);
  }

  /* ---------- 31. Ohm's Law: V = IR ---------- */
  function solveOhmsLaw() {
    const V = val('V'), I = val('I'), R = val('R');
    if (countBlanks([V, I, R]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'V = IR');
    if (!isFinite(V)) { const ans = I * R; html += stepHtml('Solve for V', 'V = ' + I + ' × ' + R + ' = ' + fmt(ans), true); }
    else if (!isFinite(I)) { if (R === 0) { renderStepsHtml(html + errorHtml('R cannot be 0.')); return; } const ans = V / R; html += stepHtml('Solve for I', 'I = V/R = ' + fmt(ans), true); }
    else { if (I === 0) { renderStepsHtml(html + errorHtml('I cannot be 0.')); return; } const ans = V / I; html += stepHtml('Solve for R', 'R = V/I = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 32. Electric Power: P = I²R ---------- */
  function solveElectricPower() {
    const P = val('P'), I = val('I'), R = val('R');
    if (countBlanks([P, I, R]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'P = I²R');
    if (!isFinite(P)) { const ans = I * I * R; html += stepHtml('Solve for P', 'P = ' + I + '² × ' + R + ' = ' + fmt(ans), true); }
    else if (!isFinite(I)) { if (R === 0 || P / R < 0) { renderStepsHtml(html + errorHtml('Cannot solve for I with these values.')); return; } const ans = Math.sqrt(P / R); html += stepHtml('Solve for I', 'I = √(P/R) = ' + fmt(ans), true); }
    else { if (I === 0) { renderStepsHtml(html + errorHtml('I cannot be 0.')); return; } const ans = P / (I * I); html += stepHtml('Solve for R', 'R = P/I² = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 33. Work Done: W = F·d ---------- */
  function solveWorkDone() {
    const W = val('W'), F = val('F'), d = val('d');
    if (countBlanks([W, F, d]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'W = F × d');
    if (!isFinite(W)) { const ans = F * d; html += stepHtml('Solve for W', 'W = ' + F + ' × ' + d + ' = ' + fmt(ans), true); }
    else if (!isFinite(F)) { if (d === 0) { renderStepsHtml(html + errorHtml('d cannot be 0.')); return; } const ans = W / d; html += stepHtml('Solve for F', 'F = W/d = ' + fmt(ans), true); }
    else { if (F === 0) { renderStepsHtml(html + errorHtml('F cannot be 0.')); return; } const ans = W / F; html += stepHtml('Solve for d', 'd = W/F = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 34. Power: P = W/t ---------- */
  function solvePower() {
    const P = val('P'), W = val('W'), t = val('t');
    if (countBlanks([P, W, t]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'P = W/t');
    if (!isFinite(P)) { if (t === 0) { renderStepsHtml(html + errorHtml('t cannot be 0.')); return; } const ans = W / t; html += stepHtml('Solve for P', 'P = W/t = ' + fmt(ans), true); }
    else if (!isFinite(W)) { const ans = P * t; html += stepHtml('Solve for W', 'W = P × t = ' + fmt(ans), true); }
    else { if (P === 0) { renderStepsHtml(html + errorHtml('P cannot be 0.')); return; } const ans = W / P; html += stepHtml('Solve for t', 't = W/P = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 35. Newton's Second Law: F = ma ---------- */
  function solveNewton2() {
    const F = val('F'), m = val('m'), a = val('a');
    if (countBlanks([F, m, a]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'F = ma');
    if (!isFinite(F)) { const ans = m * a; html += stepHtml('Solve for F', 'F = ' + m + ' × ' + a + ' = ' + fmt(ans), true); }
    else if (!isFinite(m)) { if (a === 0) { renderStepsHtml(html + errorHtml('a cannot be 0.')); return; } const ans = F / a; html += stepHtml('Solve for m', 'm = F/a = ' + fmt(ans), true); }
    else { if (m === 0) { renderStepsHtml(html + errorHtml('m cannot be 0.')); return; } const ans = F / m; html += stepHtml('Solve for a', 'a = F/m = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 36. Density: ρ = m/V ---------- */
  function solveDensity() {
    const rho = val('rho'), m = val('m'), V = val('V');
    if (countBlanks([rho, m, V]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'ρ = m/V');
    if (!isFinite(rho)) { if (V === 0) { renderStepsHtml(html + errorHtml('V cannot be 0.')); return; } const ans = m / V; html += stepHtml('Solve for ρ', 'ρ = m/V = ' + fmt(ans), true); }
    else if (!isFinite(m)) { const ans = rho * V; html += stepHtml('Solve for m', 'm = ρ × V = ' + fmt(ans), true); }
    else { if (rho === 0) { renderStepsHtml(html + errorHtml('ρ cannot be 0.')); return; } const ans = m / rho; html += stepHtml('Solve for V', 'V = m/ρ = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 37. Kinematics: v = u + at ---------- */
  function solveKinematicsV() {
    const v = val('v'), u = val('u'), a = val('a'), t = val('t');
    if (countBlanks([v, u, a, t]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'v = u + at');
    if (!isFinite(v)) { const ans = u + a * t; html += stepHtml('Solve for v', 'v = ' + u + ' + ' + a + '×' + t + ' = ' + fmt(ans), true); }
    else if (!isFinite(u)) { const ans = v - a * t; html += stepHtml('Solve for u', 'u = v − at = ' + fmt(ans), true); }
    else if (!isFinite(a)) { if (t === 0) { renderStepsHtml(html + errorHtml('t cannot be 0.')); return; } const ans = (v - u) / t; html += stepHtml('Solve for a', 'a = (v − u)/t = ' + fmt(ans), true); }
    else { if (a === 0) { renderStepsHtml(html + errorHtml('a cannot be 0.')); return; } const ans = (v - u) / a; html += stepHtml('Solve for t', 't = (v − u)/a = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 38. Kinematics: s = ut + ½at² ---------- */
  function solveKinematicsS() {
    const s = val('s'), u = val('u'), a = val('a'), t = val('t');
    if (countBlanks([s, u, a, t]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 's = ut + ½at²');
    if (!isFinite(s)) { const ans = u * t + 0.5 * a * t * t; html += stepHtml('Solve for s', 's = ' + u + '×' + t + ' + ½×' + a + '×' + t + '² = ' + fmt(ans), true); }
    else if (!isFinite(u)) { if (t === 0) { renderStepsHtml(html + errorHtml('t cannot be 0.')); return; } const ans = (s - 0.5 * a * t * t) / t; html += stepHtml('Solve for u', 'u = (s − ½at²)/t = ' + fmt(ans), true); }
    else if (!isFinite(a)) { if (t === 0) { renderStepsHtml(html + errorHtml('t cannot be 0.')); return; } const ans = 2 * (s - u * t) / (t * t); html += stepHtml('Solve for a', 'a = 2(s − ut)/t² = ' + fmt(ans), true); }
    else {
      if (a === 0) { if (u === 0) { renderStepsHtml(html + errorHtml('Cannot solve for t: u and a are both 0.')); return; } const ans = s / u; html += stepHtml('Solve for t (a = 0)', 't = s/u = ' + fmt(ans), true); renderStepsHtml(html); return; }
      const A = 0.5 * a, B = u, C = -s;
      const D = B * B - 4 * A * C;
      html += stepHtml('Rearrange as a quadratic in t', '½at² + ut − s = 0');
      if (D < 0) { renderStepsHtml(html + errorHtml('No real solution for t.')); return; }
      const t1 = (-B + Math.sqrt(D)) / (2 * A), t2 = (-B - Math.sqrt(D)) / (2 * A);
      html += stepHtml('Solve for t', 't₁ = ' + fmt(t1) + ',  t₂ = ' + fmt(t2) + '  (take the positive, physically valid one)', true);
    }
    renderStepsHtml(html);
  }

  /* ---------- 39. Kinematics: v² = u² + 2as ---------- */
  function solveKinematicsVS() {
    const v = val('v'), u = val('u'), a = val('a'), s = val('s');
    if (countBlanks([v, u, a, s]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'v² = u² + 2as');
    if (!isFinite(v)) { const sq = u * u + 2 * a * s; if (sq < 0) { renderStepsHtml(html + errorHtml('No real solution (negative under the root).')); return; } const ans = Math.sqrt(sq); html += stepHtml('Solve for v', 'v = √(u² + 2as) = ' + fmt(ans) + '  (± possible)', true); }
    else if (!isFinite(u)) { const sq = v * v - 2 * a * s; if (sq < 0) { renderStepsHtml(html + errorHtml('No real solution (negative under the root).')); return; } const ans = Math.sqrt(sq); html += stepHtml('Solve for u', 'u = √(v² − 2as) = ' + fmt(ans) + '  (± possible)', true); }
    else if (!isFinite(a)) { if (s === 0) { renderStepsHtml(html + errorHtml('s cannot be 0.')); return; } const ans = (v * v - u * u) / (2 * s); html += stepHtml('Solve for a', 'a = (v² − u²)/2s = ' + fmt(ans), true); }
    else { if (a === 0) { renderStepsHtml(html + errorHtml('a cannot be 0.')); return; } const ans = (v * v - u * u) / (2 * a); html += stepHtml('Solve for s', 's = (v² − u²)/2a = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 40. Ideal Gas Law: PV = nRT ---------- */
  function solveIdealGas() {
    const P = val('P'), V = val('V'), n = val('n'), R = val('R'), T = val('T');
    if (countBlanks([P, V, n, R, T]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'PV = nRT');
    if (!isFinite(P)) { if (V === 0) { renderStepsHtml(html + errorHtml('V cannot be 0.')); return; } const ans = (n * R * T) / V; html += stepHtml('Solve for P', 'P = nRT/V = ' + fmt(ans), true); }
    else if (!isFinite(V)) { if (P === 0) { renderStepsHtml(html + errorHtml('P cannot be 0.')); return; } const ans = (n * R * T) / P; html += stepHtml('Solve for V', 'V = nRT/P = ' + fmt(ans), true); }
    else if (!isFinite(n)) { if (R === 0 || T === 0) { renderStepsHtml(html + errorHtml('R and T cannot be 0.')); return; } const ans = (P * V) / (R * T); html += stepHtml('Solve for n', 'n = PV/RT = ' + fmt(ans), true); }
    else if (!isFinite(R)) { if (n === 0 || T === 0) { renderStepsHtml(html + errorHtml('n and T cannot be 0.')); return; } const ans = (P * V) / (n * T); html += stepHtml('Solve for R', 'R = PV/nT = ' + fmt(ans), true); }
    else { if (n === 0 || R === 0) { renderStepsHtml(html + errorHtml('n and R cannot be 0.')); return; } const ans = (P * V) / (n * R); html += stepHtml('Solve for T', 'T = PV/nR = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 41. Molarity: M = n/V ---------- */
  function solveMolarity() {
    const M = val('M'), n = val('n'), V = val('V');
    if (countBlanks([M, n, V]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'M = n/V');
    if (!isFinite(M)) { if (V === 0) { renderStepsHtml(html + errorHtml('V cannot be 0.')); return; } const ans = n / V; html += stepHtml('Solve for M', 'M = n/V = ' + fmt(ans), true); }
    else if (!isFinite(n)) { const ans = M * V; html += stepHtml('Solve for n', 'n = M × V = ' + fmt(ans), true); }
    else { if (M === 0) { renderStepsHtml(html + errorHtml('M cannot be 0.')); return; } const ans = n / M; html += stepHtml('Solve for V', 'V = n/M = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 42. Circle Area: A = πr² ---------- */
  function solveCircleArea() {
    const A = val('A'), r = val('r');
    if (countBlanks([A, r]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'A = πr²');
    if (!isFinite(A)) { const ans = Math.PI * r * r; html += stepHtml('Solve for A', 'A = π × ' + r + '² = ' + fmt(ans), true); }
    else { if (A < 0) { renderStepsHtml(html + errorHtml('A cannot be negative.')); return; } const ans = Math.sqrt(A / Math.PI); html += stepHtml('Solve for r', 'r = √(A/π) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 43. Circumference: C = 2πr ---------- */
  function solveCircumference() {
    const C = val('C'), r = val('r');
    if (countBlanks([C, r]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'C = 2πr');
    if (!isFinite(C)) { const ans = 2 * Math.PI * r; html += stepHtml('Solve for C', 'C = 2π × ' + r + ' = ' + fmt(ans), true); }
    else { const ans = C / (2 * Math.PI); html += stepHtml('Solve for r', 'r = C/(2π) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 44. Sphere Volume: V = (4/3)πr³ ---------- */
  function solveSphereVolume() {
    const V = val('V'), r = val('r');
    if (countBlanks([V, r]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'V = (4/3)πr³');
    if (!isFinite(V)) { const ans = (4 / 3) * Math.PI * r * r * r; html += stepHtml('Solve for V', 'V = (4/3)π × ' + r + '³ = ' + fmt(ans), true); }
    else { const ans = Math.cbrt(V / ((4 / 3) * Math.PI)); html += stepHtml('Solve for r', 'r = ∛(V / ((4/3)π)) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 45. Law of Cosines: c² = a² + b² − 2ab·cos(C) ---------- */
  function solveLawOfCosines() {
    const a = val('a'), b = val('b'), C = val('C'), c = val('c');
    if (!allFinite(a, b) || countBlanks([c, C]) !== 1) {
      renderStepsHtml(errorHtml('Fill in a and b, and leave exactly one of C or c blank to solve for it.'));
      return;
    }
    let html = stepHtml('Formula', 'c² = a² + b² − 2ab·cos(C)');
    if (!isFinite(c)) {
      const cRad = C * Math.PI / 180;
      const sq = a * a + b * b - 2 * a * b * Math.cos(cRad);
      if (sq < 0) { renderStepsHtml(html + errorHtml('No real solution for these inputs.')); return; }
      const ans = Math.sqrt(sq);
      html += stepHtml('Solve for c', 'c = √(a² + b² − 2ab·cos(C)) = ' + fmt(ans), true);
    } else {
      const cosC = (a * a + b * b - c * c) / (2 * a * b);
      if (cosC < -1 || cosC > 1) { renderStepsHtml(html + errorHtml('These side lengths cannot form a valid triangle.')); return; }
      const ans = Math.acos(cosC) * 180 / Math.PI;
      html += stepHtml('Solve for C', 'cos(C) = (a² + b² − c²)/2ab → C = ' + fmt(ans) + '°', true);
    }
    renderStepsHtml(html);
  }

  /* ---------- 46. Radioactive Decay: N = N₀·e^(−kt) ---------- */
  function solveRadioactiveDecay() {
    const N = val('N'), N0 = val('N0'), k = val('k'), t = val('t');
    if (countBlanks([N, N0, k, t]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'N = N₀ · e^(−kt)');
    if (!isFinite(N)) { const ans = N0 * Math.exp(-k * t); html += stepHtml('Solve for N', 'N = ' + N0 + ' × e^(−' + k + '×' + t + ') = ' + fmt(ans), true); }
    else if (!isFinite(N0)) { const ans = N * Math.exp(k * t); html += stepHtml('Solve for N₀', 'N₀ = N × e^(kt) = ' + fmt(ans), true); }
    else if (!isFinite(k)) { if (t === 0 || N / N0 <= 0) { renderStepsHtml(html + errorHtml('Cannot solve for k with these values.')); return; } const ans = -Math.log(N / N0) / t; html += stepHtml('Solve for k', 'k = −ln(N/N₀)/t = ' + fmt(ans), true); }
    else { if (k === 0 || N / N0 <= 0) { renderStepsHtml(html + errorHtml('Cannot solve for t with these values.')); return; } const ans = -Math.log(N / N0) / k; html += stepHtml('Solve for t', 't = −ln(N/N₀)/k = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 47. Half-Life: N = N₀·(1/2)^(t/T) ---------- */
  function solveHalfLife() {
    const N = val('N'), N0 = val('N0'), t = val('t'), T = val('T');
    if (countBlanks([N, N0, t, T]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'N = N₀ · (1/2)^(t/T)');
    if (!isFinite(N)) { if (T === 0) { renderStepsHtml(html + errorHtml('T cannot be 0.')); return; } const ans = N0 * Math.pow(0.5, t / T); html += stepHtml('Solve for N', 'N = ' + N0 + ' × (0.5)^(' + t + '/' + T + ') = ' + fmt(ans), true); }
    else if (!isFinite(N0)) { if (T === 0) { renderStepsHtml(html + errorHtml('T cannot be 0.')); return; } const ans = N / Math.pow(0.5, t / T); html += stepHtml('Solve for N₀', 'N₀ = N / (0.5)^(t/T) = ' + fmt(ans), true); }
    else if (!isFinite(t)) { if (N / N0 <= 0) { renderStepsHtml(html + errorHtml('Cannot solve for t with these values.')); return; } const ans = T * Math.log(N / N0) / Math.log(0.5); html += stepHtml('Solve for t', 't = T·log(N/N₀)/log(0.5) = ' + fmt(ans), true); }
    else { if (N / N0 <= 0 || N === N0) { renderStepsHtml(html + errorHtml('Cannot solve for T with these values.')); return; } const ans = t * Math.log(0.5) / Math.log(N / N0); html += stepHtml('Solve for T', 'T = t·log(0.5)/log(N/N₀) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 48. Free Fall: h = ½gt² ---------- */
  function solveFreeFall() {
    const h = val('h'), g = val('g'), t = val('t');
    if (countBlanks([h, g, t]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'h = ½gt²');
    if (!isFinite(h)) { const ans = 0.5 * g * t * t; html += stepHtml('Solve for h', 'h = ½×' + g + '×' + t + '² = ' + fmt(ans), true); }
    else if (!isFinite(g)) { if (t === 0) { renderStepsHtml(html + errorHtml('t cannot be 0.')); return; } const ans = (2 * h) / (t * t); html += stepHtml('Solve for g', 'g = 2h/t² = ' + fmt(ans), true); }
    else { if (g === 0 || h / g < 0) { renderStepsHtml(html + errorHtml('Cannot solve for t with these values.')); return; } const ans = Math.sqrt((2 * h) / g); html += stepHtml('Solve for t', 't = √(2h/g) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 49. Wave Equation: v = fλ ---------- */
  function solveWaveEq() {
    const v = val('v'), f = val('f'), lambda = val('lambda');
    if (countBlanks([v, f, lambda]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', 'v = f × λ');
    if (!isFinite(v)) { const ans = f * lambda; html += stepHtml('Solve for v', 'v = ' + f + ' × ' + lambda + ' = ' + fmt(ans), true); }
    else if (!isFinite(f)) { if (lambda === 0) { renderStepsHtml(html + errorHtml('λ cannot be 0.')); return; } const ans = v / lambda; html += stepHtml('Solve for f', 'f = v/λ = ' + fmt(ans), true); }
    else { if (f === 0) { renderStepsHtml(html + errorHtml('f cannot be 0.')); return; } const ans = v / f; html += stepHtml('Solve for λ', 'λ = v/f = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  /* ---------- 50. Lens Formula: 1/f = 1/u + 1/v ---------- */
  function solveLensFormula() {
    const f = val('f'), u = val('u'), v = val('v');
    if (countBlanks([f, u, v]) !== 1) { renderStepsHtml(errorHtml('Leave exactly one field blank — that\'s the value that gets solved for.')); return; }
    let html = stepHtml('Formula', '1/f = 1/u + 1/v');
    if (!isFinite(f)) { if (u + v === 0 || u === 0 || v === 0) { renderStepsHtml(html + errorHtml('Cannot solve for f with these values.')); return; } const ans = (u * v) / (u + v); html += stepHtml('Solve for f', 'f = uv/(u+v) = ' + fmt(ans), true); }
    else if (!isFinite(u)) { if (v === f || f === 0 || v === 0) { renderStepsHtml(html + errorHtml('Cannot solve for u with these values.')); return; } const ans = (f * v) / (v - f); html += stepHtml('Solve for u', 'u = fv/(v−f) = ' + fmt(ans), true); }
    else { if (u === f || f === 0 || u === 0) { renderStepsHtml(html + errorHtml('Cannot solve for v with these values.')); return; } const ans = (f * u) / (u - f); html += stepHtml('Solve for v', 'v = fu/(u−f) = ' + fmt(ans), true); }
    renderStepsHtml(html);
  }

  const SOLVERS = {
    linear: solveLinear, quadratic: solveQuadratic, cubic: solveCubic, biquadratic: solveBiquadratic,
    sys2: solveSys2, sys3: solveSys3, exponential: solveExponential, logarithmic: solveLogarithmic,
    absolute: solveAbsolute, radical: solveRadical, rational: solveRational, trig: solveTrig,
    quartic: solveQuartic, cosine: solveCosine, tangent: solveTangent, reciprocal: solveReciprocal,
    cuberoot: solveCubeRoot, proportion: solveProportion, linearboth: solveLinearBoth,
    rationalcross: solveRationalCross, directvar: solveDirectVar, inversevar: solveInverseVar,
    arithseq: solveArithSeq, geomseq: solveGeomSeq, sincos: solveSinCos,
    pythagorean: solvePythagorean, slopeintercept: solveSlopeIntercept, percentage: solvePercentage,
    simpleinterest: solveSimpleInterest, compoundinterest: solveCompoundInterest, ohmslaw: solveOhmsLaw,
    electricpower: solveElectricPower, workdone: solveWorkDone, power: solvePower, newton2: solveNewton2,
    density: solveDensity, kinematicsv: solveKinematicsV, kinematicss: solveKinematicsS,
    kinematicsvs: solveKinematicsVS, idealgas: solveIdealGas, molarity: solveMolarity,
    circlearea: solveCircleArea, circumference: solveCircumference, spherevolume: solveSphereVolume,
    lawofcosines: solveLawOfCosines, radioactivedecay: solveRadioactiveDecay, halflife: solveHalfLife,
    freefall: solveFreeFall, waveeq: solveWaveEq, lensformula: solveLensFormula,
  };

  eqModePills.querySelectorAll('.subject-pill').forEach(btn => {
    btn.addEventListener('click', () => setEqMode(btn.dataset.eqmode, btn.textContent));
  });
  eqSolveBtn.addEventListener('click', () => {
    const solver = SOLVERS[eqMode];
    if (solver) solver();
  });

  renderFields();
})();

/* ============================================
   MATRIX CALCULATOR
   ============================================ */
(function () {
  const gridA = document.getElementById('matrixGridA');
  const gridB = document.getElementById('matrixGridB');
  const bBlock = document.getElementById('matrixBBlock');
  const sizeBtns = document.querySelectorAll('[data-msize]');
  const calcBtn = document.getElementById('matrixCalcBtn');
  const resultBox = document.getElementById('matrixResultBox');
  const scalarBlock = document.getElementById('matrixScalarBlock');
  const scalarInput = document.getElementById('matrixScalarInput');
  const powerBlock = document.getElementById('matrixPowerBlock');
  const powerInput = document.getElementById('matrixPowerInput');
  const listView = document.getElementById('matrixListView');
  const detailView = document.getElementById('matrixDetailView');
  const toolListEl = document.getElementById('matrixToolList');
  const detailTitle = document.getElementById('matrixDetailTitle');
  const detailBackBtn = document.getElementById('matrixDetailBackBtn');
  if (!gridA) return;

  let mSize = 2;
  let mOp = 'add';

  /* Every function, one per line on the list page; clicking a row opens
     its own detail page where the matrix inputs + Calculate button live. */
  const MATRIX_OPS = [
    { id: 'add', label: 'matrix_op_add' },
    { id: 'sub', label: 'matrix_op_sub' },
    { id: 'mul', label: 'matrix_op_mul' },
    { id: 'det', label: 'matrix_op_det' },
    { id: 'inv', label: 'matrix_op_inv' },
    { id: 'transpose', label: 'matrix_op_transpose' },
    { id: 'trace', label: 'matrix_op_trace' },
    { id: 'scalar', label: 'matrix_op_scalar' },
    { id: 'power', label: 'matrix_op_power' },
    { id: 'rank', label: 'matrix_op_rank' },
    { id: 'adjoint', label: 'matrix_op_adjoint' },
    { id: 'cofactor', label: 'matrix_op_cofactor' },
    { id: 'ref', label: 'matrix_op_ref' },
    { id: 'norm', label: 'matrix_op_norm' },
    { id: 'properties', label: 'matrix_op_properties' },
    { id: 'solve', label: 'matrix_op_solve' },
    { id: 'div', label: 'matrix_op_div' },
    { id: 'lu', label: 'matrix_op_lu' },
    { id: 'charpoly', label: 'matrix_op_charpoly' },
    { id: 'eigen', label: 'matrix_op_eigen' },
    { id: 'diag', label: 'matrix_op_diag' },
    { id: 'sum', label: 'matrix_op_sum' },
    { id: 'mean', label: 'matrix_op_mean' },
    { id: 'hadamard', label: 'matrix_op_hadamard' },
    { id: 'dsum', label: 'matrix_op_dsum' },
    { id: 'rowsum', label: 'matrix_op_rowsum' },
    { id: 'colsum', label: 'matrix_op_colsum' },
    { id: 'min', label: 'matrix_op_min' },
    { id: 'max', label: 'matrix_op_max' },
    { id: 'permanent', label: 'matrix_op_permanent' },
    { id: 'nullspace', label: 'matrix_op_nullspace' },
    { id: 'expm', label: 'matrix_op_expm' },
    { id: 'idempotent', label: 'matrix_op_idempotent' },
    { id: 'nilpotent', label: 'matrix_op_nilpotent' },
    { id: 'involutory', label: 'matrix_op_involutory' },
  ];

  function renderMatrixList() {
    toolListEl.innerHTML = MATRIX_OPS.map(op =>
      '<div class="subject-tool-row" data-mop="' + op.id + '">' +
        '<span class="subject-tool-row-name">' + t(op.label) + '</span>' +
        '<span class="subject-tool-row-arrow">&rarr;</span>' +
      '</div>'
    ).join('');
    toolListEl.querySelectorAll('.subject-tool-row').forEach(row => {
      row.addEventListener('click', () => openMatrixDetail(row.dataset.mop));
    });
  }

  // STEP 1 -> STEP 2: clicking a function's line opens its own page,
  // where the matrix inputs and Calculate button live.
  function openMatrixDetail(op) {
    const meta = MATRIX_OPS.find(o => o.id === op);
    detailTitle.textContent = meta ? t(meta.label) : '';
    listView.style.display = 'none';
    detailView.style.display = '';
    setOp(op);
    buildGrid(gridA, mSize);
    buildGrid(gridB, mSize);
  }

  if (detailBackBtn) {
    detailBackBtn.addEventListener('click', () => {
      detailView.style.display = 'none';
      listView.style.display = '';
    });
  }

  function buildGrid(container, size, seed) {
    container.dataset.size = size;
    container.style.gridTemplateColumns = 'repeat(' + size + ', ' + (size === 4 ? '44px' : '52px') + ')';
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
    sizeBtns.forEach(b => b.classList.toggle('active', parseInt(b.dataset.msize, 10) === size));
    buildGrid(gridA, size);
    buildGrid(gridB, size);
    resultBox.innerHTML = '';
  }

  const UNARY_OPS = ['det', 'inv', 'transpose', 'trace', 'scalar', 'power', 'rank', 'adjoint', 'cofactor', 'ref', 'norm', 'properties', 'lu', 'charpoly', 'eigen', 'diag', 'sum', 'mean', 'rowsum', 'colsum', 'min', 'max', 'permanent', 'nullspace', 'expm', 'idempotent', 'nilpotent', 'involutory'];

  function setOp(op) {
    mOp = op;
    bBlock.style.display = UNARY_OPS.includes(op) ? 'none' : 'block';
    scalarBlock.style.display = (op === 'scalar') ? 'flex' : 'none';
    powerBlock.style.display = (op === 'power') ? 'flex' : 'none';
    resultBox.innerHTML = '';
  }

  /* ---- core matrix ops (generic, work for any n×n up to 4×4) ---- */
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
  function minorOf(M, rowIdx, colIdx) {
    return M.filter((_, r) => r !== rowIdx).map(row => row.filter((_, c) => c !== colIdx));
  }
  function detN(M) {
    const n = M.length;
    if (n === 1) return M[0][0];
    if (n === 2) return det2(M);
    let d = 0;
    for (let c = 0; c < n; c++) {
      const sign = (c % 2 === 0) ? 1 : -1;
      d += sign * M[0][c] * detN(minorOf(M, 0, c));
    }
    return d;
  }
  function cofactorMatrix(M) {
    const n = M.length;
    const C = [];
    for (let r = 0; r < n; r++) {
      C.push([]);
      for (let c = 0; c < n; c++) {
        const sign = ((r + c) % 2 === 0) ? 1 : -1;
        C[r].push(sign * detN(minorOf(M, r, c)));
      }
    }
    return C;
  }
  function transpose(M) {
    return M[0].map((_, c) => M.map(row => row[c]));
  }
  function adjugate(M) {
    return transpose(cofactorMatrix(M));
  }
  function invN(M) {
    const d = detN(M);
    if (Math.abs(d) < 1e-9) return null;
    const adj = adjugate(M);
    return adj.map(row => row.map(v => v / d));
  }
  function trace(M) {
    let s = 0;
    for (let i = 0; i < M.length; i++) s += M[i][i];
    return s;
  }
  function scalarMul(M, k) {
    return M.map(row => row.map(v => v * k));
  }
  function identity(size) {
    const I = [];
    for (let r = 0; r < size; r++) {
      I.push([]);
      for (let c = 0; c < size; c++) I[r].push(r === c ? 1 : 0);
    }
    return I;
  }
  function matPow(A, p, size) {
    let base = A;
    if (p < 0) {
      const inv = invN(A);
      if (!inv) return null;
      base = inv;
    }
    let result = identity(size);
    let exp = Math.abs(p);
    for (let i = 0; i < exp; i++) result = matMul(result, base, size);
    return result;
  }
  function rankOf(M) {
    const A = M.map(row => row.slice());
    const n = A.length, m = A[0].length;
    let rank = 0;
    for (let col = 0; col < m && rank < n; col++) {
      let pivot = -1;
      for (let r = rank; r < n; r++) {
        if (Math.abs(A[r][col]) > 1e-9) { pivot = r; break; }
      }
      if (pivot === -1) continue;
      [A[rank], A[pivot]] = [A[pivot], A[rank]];
      for (let r = 0; r < n; r++) {
        if (r === rank) continue;
        const factor = A[r][col] / A[rank][col];
        for (let c = col; c < m; c++) A[r][c] -= factor * A[rank][c];
      }
      rank++;
    }
    return rank;
  }
  function rrefMatrix(M) {
    const A = M.map(row => row.slice());
    const n = A.length, m = A[0].length;
    let lead = 0;
    for (let r = 0; r < n; r++) {
      if (lead >= m) break;
      let i = r;
      while (Math.abs(A[i][lead]) < 1e-9) {
        i++;
        if (i === n) { i = r; lead++; if (lead === m) return A; }
      }
      [A[i], A[r]] = [A[r], A[i]];
      const div = A[r][lead];
      if (Math.abs(div) > 1e-9) A[r] = A[r].map(v => v / div);
      for (let k = 0; k < n; k++) {
        if (k === r) continue;
        const factor = A[k][lead];
        A[k] = A[k].map((v, c) => v - factor * A[r][c]);
      }
      lead++;
    }
    return A;
  }
  function frobeniusNorm(M) {
    let s = 0;
    M.forEach(row => row.forEach(v => { s += v * v; }));
    return Math.sqrt(s);
  }
  function matEqual(A, B, eps) {
    eps = eps || 1e-6;
    return A.every((row, r) => row.every((v, c) => Math.abs(v - B[r][c]) < eps));
  }
  function propertiesOf(M, size) {
    const d = detN(M);
    const facts = [
      [t('matrix_prop_symmetric'), matEqual(M, transpose(M))],
      [t('matrix_prop_skew'), matEqual(M, scalarMul(transpose(M), -1))],
      [t('matrix_prop_diagonal'), M.every((row, r) => row.every((v, c) => r === c || Math.abs(v) < 1e-6))],
      [t('matrix_prop_identity'), matEqual(M, identity(size))],
      [t('matrix_prop_singular'), Math.abs(d) < 1e-6],
      [t('matrix_prop_orthogonal'), matEqual(matMul(M, transpose(M), size), identity(size))],
    ];
    return facts;
  }

  function zeroMatrix(n) {
    const Z = [];
    for (let r = 0; r < n; r++) Z.push(new Array(n).fill(0));
    return Z;
  }

  /* Solve A·X = B via X = A⁻¹B */
  function solveSystem(A, B, size) {
    const inv = invN(A);
    if (!inv) return null;
    return matMul(inv, B, size);
  }

  /* A ÷ B := A · B⁻¹ */
  function matDivide(A, B, size) {
    const inv = invN(B);
    if (!inv) return null;
    return matMul(A, inv, size);
  }

  /* LU decomposition with partial pivoting: PA = LU */
  function luDecompose(A, n) {
    const U = A.map(row => row.slice());
    const L = identity(n);
    const P = identity(n);
    for (let k = 0; k < n; k++) {
      let maxRow = k, maxVal = Math.abs(U[k][k]);
      for (let r = k + 1; r < n; r++) {
        if (Math.abs(U[r][k]) > maxVal) { maxVal = Math.abs(U[r][k]); maxRow = r; }
      }
      if (maxVal < 1e-10) continue;
      if (maxRow !== k) {
        [U[k], U[maxRow]] = [U[maxRow], U[k]];
        [P[k], P[maxRow]] = [P[maxRow], P[k]];
        for (let c = 0; c < k; c++) { const tmp = L[k][c]; L[k][c] = L[maxRow][c]; L[maxRow][c] = tmp; }
      }
      for (let r = k + 1; r < n; r++) {
        const factor = U[r][k] / U[k][k];
        L[r][k] = factor;
        for (let c = k; c < n; c++) U[r][c] -= factor * U[k][c];
      }
    }
    return { L, U };
  }

  /* Characteristic polynomial coefficients via Faddeev–LeVerrier:
     returns [1, c1, ..., cn] such that det(xI - A) = x^n + c1 x^(n-1) + ... + cn */
  function charPolyCoeffs(A, n) {
    const coeffs = new Array(n + 1).fill(0);
    coeffs[0] = 1;
    let M = zeroMatrix(n);
    for (let k = 1; k <= n; k++) {
      M = matAdd(matMul(A, M, n), scalarMul(identity(n), coeffs[k - 1]), 1);
      const tr = trace(matMul(A, M, n));
      coeffs[k] = -tr / k;
    }
    return coeffs;
  }

  const SUP_DIGITS = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  const SUB_DIGITS = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉' };
  function toSuperscript(num) {
    return String(num).split('').map(ch => SUP_DIGITS[ch] || ch).join('');
  }
  function toSubscript(num) {
    return String(num).split('').map(ch => SUB_DIGITS[ch] || ch).join('');
  }
  function formatCharPoly(coeffs, n) {
    let str = 'p(λ) = ';
    let first = true;
    for (let i = 0; i <= n; i++) {
      const power = n - i;
      let c = Math.round(coeffs[i] * 1e6) / 1e6;
      if (Math.abs(c) < 1e-9) continue;
      const sign = c < 0 ? '−' : (first ? '' : '+');
      const absC = Math.abs(c);
      const coefStr = (absC === 1 && power !== 0) ? '' : fmtNum(absC);
      let term;
      if (power === 0) term = fmtNum(absC);
      else if (power === 1) term = coefStr + 'λ';
      else term = coefStr + 'λ' + toSuperscript(power);
      str += (first ? sign : ' ' + sign + ' ') + term;
      first = false;
    }
    if (first) str += '0';
    return str;
  }

  /* Eigenvalues via unshifted QR algorithm (real approx; best for symmetric matrices) */
  function qrDecompose(A, n) {
    const cols = [];
    for (let c = 0; c < n; c++) cols.push(A.map(row => row[c]));
    const qCols = [];
    const R = zeroMatrix(n);
    for (let j = 0; j < n; j++) {
      let v = cols[j].slice();
      for (let i = 0; i < j; i++) {
        const q = qCols[i];
        const dot = v.reduce((s, val, idx) => s + val * q[idx], 0);
        R[i][j] = dot;
        v = v.map((val, idx) => val - dot * q[idx]);
      }
      const norm = Math.sqrt(v.reduce((s, val) => s + val * val, 0));
      R[j][j] = norm;
      const q = norm > 1e-10 ? v.map(val => val / norm) : v.map(() => 0);
      qCols.push(q);
    }
    const Qm = [];
    for (let r = 0; r < n; r++) Qm.push(qCols.map(q => q[r]));
    return { Q: Qm, R };
  }
  function eigenApprox(A, n) {
    let Ak = A.map(row => row.slice());
    for (let iter = 0; iter < 300; iter++) {
      const { Q, R } = qrDecompose(Ak, n);
      Ak = matMul(R, Q, n);
    }
    const vals = [];
    for (let i = 0; i < n; i++) vals.push(Ak[i][i]);
    return vals;
  }

  /* Hadamard (element-wise) product */
  function hadamard(A, B) {
    return A.map((row, r) => row.map((v, c) => v * B[r][c]));
  }

  /* Direct sum: block-diagonal combination of A and B into a 2n×2n matrix */
  function directSum(A, B, n) {
    const size = 2 * n;
    const R = [];
    for (let r = 0; r < size; r++) R.push(new Array(size).fill(0));
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) R[r][c] = A[r][c];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) R[n + r][n + c] = B[r][c];
    return R;
  }

  function rowSums(A) {
    return A.map(row => [row.reduce((s, v) => s + v, 0)]);
  }
  function colSums(A, n) {
    const s = new Array(n).fill(0);
    A.forEach(row => row.forEach((v, c) => { s[c] += v; }));
    return [s];
  }
  function minElement(A) {
    let m = Infinity;
    A.forEach(row => row.forEach(v => { if (v < m) m = v; }));
    return m;
  }
  function maxElement(A) {
    let m = -Infinity;
    A.forEach(row => row.forEach(v => { if (v > m) m = v; }));
    return m;
  }

  /* Permanent: like the determinant's cofactor expansion, but without alternating signs */
  function permN(M) {
    const n = M.length;
    if (n === 1) return M[0][0];
    if (n === 2) return M[0][0] * M[1][1] + M[0][1] * M[1][0];
    let p = 0;
    for (let c = 0; c < n; c++) p += M[0][c] * permN(minorOf(M, 0, c));
    return p;
  }

  /* Null space (kernel) basis via RREF: free-variable back-substitution */
  function nullSpaceBasis(A) {
    const R = rrefMatrix(A);
    const m = R[0].length;
    const pivotCols = [];
    for (let r = 0; r < R.length; r++) {
      let pc = -1;
      for (let c = 0; c < m; c++) { if (Math.abs(R[r][c]) > 1e-9) { pc = c; break; } }
      if (pc !== -1) pivotCols.push(pc);
    }
    const freeCols = [];
    for (let c = 0; c < m; c++) if (!pivotCols.includes(c)) freeCols.push(c);
    if (freeCols.length === 0) return [];
    const basis = [];
    freeCols.forEach(fc => {
      const vec = new Array(m).fill(0);
      vec[fc] = 1;
      pivotCols.forEach((pc, idx) => { vec[pc] = -R[idx][fc]; });
      basis.push(vec);
    });
    return basis;
  }

  /* Matrix exponential via Taylor series: e^A = Σ A^k / k! */
  function matExp(A, n, terms) {
    terms = terms || 60;
    let term = identity(n), result = identity(n);
    for (let k = 1; k <= terms; k++) {
      term = matMul(term, A, n);
      term = term.map(row => row.map(v => v / k));
      result = matAdd(result, term, 1);
    }
    return result;
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

  function renderProperties(facts) {
    let html = '<div class="matrix-prop-list">';
    facts.forEach(([label, val]) => {
      html += '<div class="matrix-prop-row"><span>' + label + '</span><span class="matrix-prop-badge ' +
        (val ? 'yes">' + t('matrix_prop_yes') : 'no">' + t('matrix_prop_no')) + '</span></div>';
    });
    html += '</div>';
    resultBox.innerHTML = html;
  }

  function renderLU(L, U) {
    const grid = (M, label) => {
      let g = '<div class="matrix-lu-block"><div class="matrix-block-label">' + label + '</div>' +
        '<div class="matrix-result-grid" style="grid-template-columns:repeat(' + M[0].length + ', 56px);">';
      M.forEach(row => row.forEach(v => { g += '<div class="matrix-result-cell">' + fmtNum(v) + '</div>'; }));
      g += '</div></div>';
      return g;
    };
    let html = '<div class="matrix-lu-wrap">' + grid(L, t('matrix_l_label')) + grid(U, t('matrix_u_label')) + '</div>';
    html += '<div class="matrix-lu-note">' + t('matrix_lu_note') + '</div>';
    resultBox.innerHTML = html;
  }

  function renderPoly(coeffs, n) {
    resultBox.innerHTML = '<div class="matrix-poly-box">' + formatCharPoly(coeffs, n) + '</div>';
  }

  function renderEigen(vals) {
    let html = '<div class="matrix-eigen-wrap">';
    vals.forEach((v, i) => {
      html += '<div class="matrix-eigen-chip">λ' + toSubscript(i + 1) + ' = ' + fmtNum(v) + '</div>';
    });
    html += '</div><div class="matrix-eigen-note">' + t('matrix_eigen_note') + '</div>';
    resultBox.innerHTML = html;
  }

  function renderNullSpace(vectors) {
    if (vectors.length === 0) {
      resultBox.innerHTML = '<div class="matrix-poly-box">' + t('matrix_nullspace_trivial') + '</div>';
      return;
    }
    let html = '<div class="matrix-eigen-wrap">';
    vectors.forEach((v, i) => {
      html += '<div class="matrix-eigen-chip">v' + toSubscript(i + 1) + ' = (' + v.map(fmtNum).join(', ') + ')</div>';
    });
    html += '</div><div class="matrix-eigen-note">' + t('matrix_nullspace_dim_label') + ' = ' + vectors.length + '</div>';
    resultBox.innerHTML = html;
  }

  function renderSingleCheck(label, bool) {
    resultBox.innerHTML = '<div class="matrix-prop-list"><div class="matrix-prop-row"><span>' + label +
      '</span><span class="matrix-prop-badge ' + (bool ? 'yes">' + t('matrix_prop_yes') : 'no">' + t('matrix_prop_no')) + '</span></div></div>';
  }

  function calculate() {
    const A = readMatrix(gridA, mSize);
    const B = readMatrix(gridB, mSize);
    if (mOp === 'add') { renderMatrixResult(matAdd(A, B, 1)); return; }
    if (mOp === 'sub') { renderMatrixResult(matAdd(A, B, -1)); return; }
    if (mOp === 'mul') { renderMatrixResult(matMul(A, B, mSize)); return; }
    if (mOp === 'det') {
      resultBox.innerHTML = '<div class="matrix-result-scalar">det(A) = ' + fmtNum(detN(A)) + '</div>';
      return;
    }
    if (mOp === 'inv') {
      const inv = invN(A);
      if (!inv) {
        resultBox.innerHTML = '<div class="eq-error">' + t('matrix_error_singular') + '</div>';
        return;
      }
      renderMatrixResult(inv);
      return;
    }
    if (mOp === 'transpose') { renderMatrixResult(transpose(A)); return; }
    if (mOp === 'trace') {
      resultBox.innerHTML = '<div class="matrix-result-scalar">tr(A) = ' + fmtNum(trace(A)) + '</div>';
      return;
    }
    if (mOp === 'scalar') {
      const k = parseFloat(scalarInput.value) || 0;
      renderMatrixResult(scalarMul(A, k));
      return;
    }
    if (mOp === 'power') {
      const p = Math.round(parseFloat(powerInput.value)) || 0;
      const res = matPow(A, p, mSize);
      if (!res) {
        resultBox.innerHTML = '<div class="eq-error">' + t('matrix_error_singular') + '</div>';
        return;
      }
      renderMatrixResult(res);
      return;
    }
    if (mOp === 'rank') {
      resultBox.innerHTML = '<div class="matrix-result-scalar">rank(A) = ' + rankOf(A) + '</div>';
      return;
    }
    if (mOp === 'adjoint') { renderMatrixResult(adjugate(A)); return; }
    if (mOp === 'cofactor') { renderMatrixResult(cofactorMatrix(A)); return; }
    if (mOp === 'ref') { renderMatrixResult(rrefMatrix(A)); return; }
    if (mOp === 'norm') {
      resultBox.innerHTML = '<div class="matrix-result-scalar">‖A‖ = ' + fmtNum(frobeniusNorm(A)) + '</div>';
      return;
    }
    if (mOp === 'properties') { renderProperties(propertiesOf(A, mSize)); return; }
    if (mOp === 'solve') {
      const X = solveSystem(A, B, mSize);
      if (!X) {
        resultBox.innerHTML = '<div class="eq-error">' + t('matrix_error_solve_singular') + '</div>';
        return;
      }
      renderMatrixResult(X);
      return;
    }
    if (mOp === 'div') {
      const res = matDivide(A, B, mSize);
      if (!res) {
        resultBox.innerHTML = '<div class="eq-error">' + t('matrix_error_div_singular') + '</div>';
        return;
      }
      renderMatrixResult(res);
      return;
    }
    if (mOp === 'lu') {
      const { L, U } = luDecompose(A, mSize);
      renderLU(L, U);
      return;
    }
    if (mOp === 'charpoly') {
      renderPoly(charPolyCoeffs(A, mSize), mSize);
      return;
    }
    if (mOp === 'eigen') {
      renderEigen(eigenApprox(A, mSize));
      return;
    }
    if (mOp === 'diag') {
      const d = [];
      for (let i = 0; i < mSize; i++) d.push(A[i][i]);
      renderMatrixResult([d]);
      return;
    }
    if (mOp === 'sum') {
      let s = 0;
      A.forEach(row => row.forEach(v => { s += v; }));
      resultBox.innerHTML = '<div class="matrix-result-scalar">Σ A = ' + fmtNum(s) + '</div>';
      return;
    }
    if (mOp === 'mean') {
      let s = 0;
      A.forEach(row => row.forEach(v => { s += v; }));
      resultBox.innerHTML = '<div class="matrix-result-scalar">mean(A) = ' + fmtNum(s / (mSize * mSize)) + '</div>';
      return;
    }
    if (mOp === 'hadamard') { renderMatrixResult(hadamard(A, B)); return; }
    if (mOp === 'dsum') { renderMatrixResult(directSum(A, B, mSize)); return; }
    if (mOp === 'rowsum') { renderMatrixResult(rowSums(A)); return; }
    if (mOp === 'colsum') { renderMatrixResult(colSums(A, mSize)); return; }
    if (mOp === 'min') {
      resultBox.innerHTML = '<div class="matrix-result-scalar">min(A) = ' + fmtNum(minElement(A)) + '</div>';
      return;
    }
    if (mOp === 'max') {
      resultBox.innerHTML = '<div class="matrix-result-scalar">max(A) = ' + fmtNum(maxElement(A)) + '</div>';
      return;
    }
    if (mOp === 'permanent') {
      resultBox.innerHTML = '<div class="matrix-result-scalar">perm(A) = ' + fmtNum(permN(A)) + '</div>';
      return;
    }
    if (mOp === 'nullspace') { renderNullSpace(nullSpaceBasis(A)); return; }
    if (mOp === 'expm') { renderMatrixResult(matExp(A, mSize, 60)); return; }
    if (mOp === 'idempotent') {
      renderSingleCheck(t('matrix_check_idempotent'), matEqual(matMul(A, A, mSize), A));
      return;
    }
    if (mOp === 'nilpotent') {
      renderSingleCheck(t('matrix_check_nilpotent'), matEqual(matPow(A, mSize, mSize), zeroMatrix(mSize)));
      return;
    }
    if (mOp === 'involutory') {
      renderSingleCheck(t('matrix_check_involutory'), matEqual(matMul(A, A, mSize), identity(mSize)));
      return;
    }
  }

  sizeBtns.forEach(btn => btn.addEventListener('click', () => setSize(parseInt(btn.dataset.msize, 10))));
  calcBtn.addEventListener('click', calculate);

  setSize(2);
  renderMatrixList();

  window.refreshMatrixI18n = function () {
    if (listView.style.display !== 'none') {
      renderMatrixList();
    }
    if (detailView.style.display !== 'none') {
      const meta = MATRIX_OPS.find(o => o.id === mOp);
      detailTitle.textContent = meta ? t(meta.label) : '';
    }
  };
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
  const widthPills = document.getElementById('progWidthPills');
  const toolPills = document.getElementById('progToolPills');
  const toolResult = document.getElementById('progToolResult');
  const bitPosN = document.getElementById('progBitPosN');
  const bitPosPills = document.getElementById('progBitPosPills');
  const bitPosResult = document.getElementById('progBitPosResult');
  const toolParamRow = document.getElementById('progToolParamRow');
  const toolParamLabel = document.getElementById('progToolParamLabel');
  const toolParam = document.getElementById('progToolParam');
  if (!decInput) return;

  let progOp = 'AND';
  let progWidth = 16;
  let progTool = 'popcount';
  let progBitOp = 'SET';

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

  // Mask a signed 32-bit JS int result down to the selected bit width (two's complement)
  function toWidth(n) {
    const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
    const masked = n & mask;
    const signBit = Math.pow(2, progWidth - 1);
    return masked >= signBit ? masked - Math.pow(2, progWidth) : masked;
  }

  function binStr(n) {
    const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
    return ((n & mask) >>> 0).toString(2).padStart(progWidth, '0');
  }

  function popcount(n) {
    let x = (n >>> 0), count = 0;
    while (x) { count += x & 1; x >>>= 1; }
    return count;
  }

  function clz(n, width) {
    const mask = width >= 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1);
    const u = (n & mask) >>> 0;
    if (u === 0) return width;
    let count = 0;
    for (let i = width - 1; i >= 0; i--) {
      if ((u >>> i) & 1) break;
      count++;
    }
    return count;
  }

  function ctz(n, width) {
    const mask = width >= 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1);
    const u = (n & mask) >>> 0;
    if (u === 0) return width;
    let count = 0;
    for (let i = 0; i < width; i++) {
      if ((u >>> i) & 1) break;
      count++;
    }
    return count;
  }

  function bitReverseFn(n, width) {
    const mask = width >= 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1);
    let u = (n & mask) >>> 0;
    let result = 0;
    for (let i = 0; i < width; i++) {
      result = ((result << 1) | (u & 1)) >>> 0;
      u >>>= 1;
    }
    return result >>> 0;
  }

  function nibbleSwapFn(n, width) {
    const mask = width >= 32 ? 0xFFFFFFFF : (Math.pow(2, width) - 1);
    const bytesCount = width / 8;
    const u = (n & mask) >>> 0;
    let result = 0;
    for (let i = 0; i < bytesCount; i++) {
      const byteVal = (u >>> (8 * i)) & 0xFF;
      const swappedByte = ((byteVal & 0x0F) << 4) | ((byteVal & 0xF0) >>> 4);
      result |= swappedByte << (8 * i);
    }
    return result >>> 0;
  }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; }
  function lcm(a, b) { if (a === 0 || b === 0) return 0; return Math.abs(a * b) / gcd(a, b); }

  function computeBitwise() {
    const a = parseInt(opA.value, 10) || 0;
    const b = parseInt(opB.value, 10) || 0;
    let result, label;
    switch (progOp) {
      case 'AND': result = toWidth(a & b); label = 'A AND B'; break;
      case 'OR': result = toWidth(a | b); label = 'A OR B'; break;
      case 'XOR': result = toWidth(a ^ b); label = 'A XOR B'; break;
      case 'NAND': result = toWidth(~(a & b)); label = 'A NAND B'; break;
      case 'NOR': result = toWidth(~(a | b)); label = 'A NOR B'; break;
      case 'XNOR': result = toWidth(~(a ^ b)); label = 'A XNOR B'; break;
      case 'NOT': result = toWidth(~a); label = 'NOT A'; break;
      case 'SHL': result = toWidth(a << b); label = 'A << B'; break;
      case 'SHR': result = toWidth(a >> b); label = 'A >> B'; break;
      case 'ROL': {
        const bits = ((b % progWidth) + progWidth) % progWidth;
        const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
        const ua = (a & mask) >>> 0;
        const rotated = (((ua << bits) | (ua >>> (progWidth - bits))) & mask) >>> 0;
        result = toWidth(rotated); label = 'ROL(A, B)'; break;
      }
      case 'ROR': {
        const bits = ((b % progWidth) + progWidth) % progWidth;
        const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
        const ua = (a & mask) >>> 0;
        const rotated = (((ua >>> bits) | (ua << (progWidth - bits))) & mask) >>> 0;
        result = toWidth(rotated); label = 'ROR(A, B)'; break;
      }
      case 'MOD': result = b !== 0 ? toWidth(a % b) : 0; label = 'A MOD B'; break;
      default: result = 0; label = '';
    }
    bitwiseResult.innerHTML = label + ' = ' + result
      + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(result) + '</span>';
  }

  opPills.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bop]');
    if (!btn) return;
    progOp = btn.dataset.bop;
    opPills.querySelectorAll('.subject-pill').forEach(p => p.classList.toggle('active', p === btn));
    computeBitwise();
  });

  if (widthPills) {
    widthPills.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-width]');
      if (!btn) return;
      progWidth = parseInt(btn.dataset.width, 10);
      widthPills.querySelectorAll('.subject-pill').forEach(p => p.classList.toggle('active', p === btn));
      computeBitwise();
      computeTool();
    });
  }

  function computeBitPos() {
    if (!bitPosResult) return;
    const a = parseInt(opA.value, 10) || 0;
    const n = parseInt(bitPosN.value, 10);
    if (!Number.isInteger(n) || n < 0 || n >= progWidth) {
      bitPosResult.textContent = t('prog_bitpos_error');
      return;
    }
    const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
    const ua = (a & mask) >>> 0;
    let result, label;
    switch (progBitOp) {
      case 'SET': result = toWidth((ua | (1 << n)) >>> 0); label = 'SET bit ' + n; break;
      case 'CLEAR': result = toWidth((ua & ~(1 << n)) >>> 0); label = 'CLEAR bit ' + n; break;
      case 'TOGGLE': result = toWidth((ua ^ (1 << n)) >>> 0); label = 'TOGGLE bit ' + n; break;
      case 'TEST': {
        const bitVal = (ua >>> n) & 1;
        bitPosResult.innerHTML = 'TEST bit ' + n + ' = ' + bitVal
          + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(a) + '</span>';
        return;
      }
      default: result = a; label = '';
    }
    bitPosResult.innerHTML = label + ' = ' + result
      + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(result) + '</span>';
  }

  if (bitPosPills) {
    bitPosPills.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-bitop]');
      if (!btn) return;
      progBitOp = btn.dataset.bitop;
      bitPosPills.querySelectorAll('.subject-pill').forEach(p => p.classList.toggle('active', p === btn));
      computeBitPos();
    });
  }
  if (bitPosN) bitPosN.addEventListener('input', computeBitPos);

  function computeTool() {
    if (!toolResult) return;
    const a = parseInt(opA.value, 10) || 0;
    const b = parseInt(opB.value, 10) || 0;
    switch (progTool) {
      case 'popcount': {
        const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
        const bits = popcount(a & mask);
        toolResult.innerHTML = t('prog_tool_popcount') + ' <b>' + bits + '</b>'
          + '<span class="prog-result-sub">' + binStr(a) + '</span>';
        break;
      }
      case 'twos': {
        toolResult.innerHTML = t('prog_tool_twos') + ' <b>' + binStr(a) + '</b>'
          + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + toWidth(a) + ' (' + progWidth + '-bit)</span>';
        break;
      }
      case 'gcdlcm': {
        toolResult.innerHTML = t('prog_tool_gcdlcm') + ' GCD = <b>' + gcd(a, b) + '</b>, LCM = <b>' + lcm(a, b) + '</b>';
        break;
      }
      case 'ascii': {
        if (a < 0 || a > 1114111 || !Number.isInteger(a)) {
          toolResult.innerHTML = t('prog_tool_ascii_invalid');
        } else {
          let ch = '';
          try { ch = String.fromCodePoint(a); } catch (e) { ch = ''; }
          toolResult.innerHTML = t('prog_tool_ascii') + ' <b>' + (ch || '&mdash;') + '</b>'
            + '<span class="prog-result-sub">U+' + a.toString(16).toUpperCase().padStart(4, '0') + '</span>';
        }
        break;
      }
      case 'byteswap': {
        const bytesCount = progWidth / 8;
        const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
        const ua = (a & mask) >>> 0;
        let swapped = 0;
        for (let i = 0; i < bytesCount; i++) {
          const byteVal = (ua >>> (8 * i)) & 0xFF;
          swapped |= byteVal << (8 * (bytesCount - 1 - i));
        }
        swapped = swapped >>> 0;
        const result = toWidth(swapped);
        toolResult.innerHTML = t('prog_tool_byteswap') + ' <b>' + result + '</b>'
          + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(result) + '</span>';
        break;
      }
      case 'pow2': {
        const isPow2 = a > 0 && (a & (a - 1)) === 0;
        toolResult.innerHTML = t('prog_tool_pow2') + ' <b>' + (isPow2 ? 'YES' : 'NO') + '</b>';
        break;
      }
      case 'hamming': {
        const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
        const dist = popcount((a ^ b) & mask);
        toolResult.innerHTML = t('prog_tool_hamming') + ' <b>' + dist + '</b>'
          + '<span class="prog-result-sub">' + binStr(a ^ b) + '</span>';
        break;
      }
      case 'range': {
        const signedMin = -Math.pow(2, progWidth - 1);
        const signedMax = Math.pow(2, progWidth - 1) - 1;
        const unsignedMax = Math.pow(2, progWidth) - 1;
        toolResult.innerHTML = t('prog_tool_range')
          + '<span class="prog-result-sub">Signed: ' + signedMin + ' to ' + signedMax
          + ' &middot; Unsigned: 0 to ' + unsignedMax + '</span>';
        break;
      }
      case 'clz': {
        const bits = clz(a, progWidth);
        toolResult.innerHTML = t('prog_tool_clz') + ' <b>' + bits + '</b>'
          + '<span class="prog-result-sub">' + binStr(a) + '</span>';
        break;
      }
      case 'ctz': {
        const bits = ctz(a, progWidth);
        toolResult.innerHTML = t('prog_tool_ctz') + ' <b>' + bits + '</b>'
          + '<span class="prog-result-sub">' + binStr(a) + '</span>';
        break;
      }
      case 'bitreverse': {
        const result = toWidth(bitReverseFn(a, progWidth));
        toolResult.innerHTML = t('prog_tool_bitreverse') + ' <b>' + result + '</b>'
          + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(result) + '</span>';
        break;
      }
      case 'nibbleswap': {
        const result = toWidth(nibbleSwapFn(a, progWidth));
        toolResult.innerHTML = t('prog_tool_nibbleswap') + ' <b>' + result + '</b>'
          + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(result) + '</span>';
        break;
      }
      case 'parity': {
        const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
        const bits = popcount(a & mask);
        const parityLabel = bits % 2 === 0 ? 'Even' : 'Odd';
        toolResult.innerHTML = t('prog_tool_parity') + ' <b>' + parityLabel + '</b>'
          + '<span class="prog-result-sub">' + bits + ' set bits</span>';
        break;
      }
      case 'nextpow2': {
        let result = a <= 1 ? 1 : Math.pow(2, Math.ceil(Math.log2(a)));
        toolResult.innerHTML = t('prog_tool_nextpow2') + ' <b>' + result + '</b>';
        break;
      }
      case 'overflow': {
        const sum = a + b;
        const min = -Math.pow(2, progWidth - 1), max = Math.pow(2, progWidth - 1) - 1;
        const overflows = sum < min || sum > max;
        toolResult.innerHTML = t('prog_tool_overflow') + ' <b>' + (overflows ? 'YES' : 'NO') + '</b>'
          + '<span class="prog-result-sub">A + B = ' + sum + '</span>';
        break;
      }
      case 'graycode': {
        const mask = progWidth >= 32 ? 0xFFFFFFFF : (Math.pow(2, progWidth) - 1);
        const ua = (a & mask) >>> 0;
        const result = (ua ^ (ua >>> 1)) >>> 0;
        toolResult.innerHTML = t('prog_tool_graycode') + ' <b>' + result + '</b>'
          + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(result) + '</span>';
        break;
      }
      case 'signextend': {
        const fromWidth = parseInt(toolParam.value, 10);
        if (!Number.isInteger(fromWidth) || fromWidth < 1 || fromWidth > progWidth) {
          toolResult.textContent = t('prog_param_error');
          break;
        }
        const signBit = Math.pow(2, fromWidth - 1);
        const rawMask = Math.pow(2, fromWidth) - 1;
        const x = a & rawMask;
        const extended = (x ^ signBit) - signBit;
        const result = toWidth(extended);
        toolResult.innerHTML = t('prog_tool_signextend') + ' <b>' + result + '</b>'
          + '<span class="prog-result-sub">' + t('prog_binary_label') + ' ' + binStr(result) + '</span>';
        break;
      }
      case 'custombase': {
        const base = parseInt(toolParam.value, 10);
        if (!Number.isInteger(base) || base < 2 || base > 36) {
          toolResult.textContent = t('prog_param_error');
          break;
        }
        const neg = a < 0;
        const converted = (neg ? '-' : '') + Math.abs(a).toString(base).toUpperCase();
        toolResult.innerHTML = t('prog_tool_custombase') + ' <b>' + converted + '</b>'
          + '<span class="prog-result-sub">Base ' + base + '</span>';
        break;
      }
    }
  }

  if (toolParamRow) {
    toolParamRow.addEventListener('input', computeTool);
  }

  if (toolPills) {
    toolPills.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-tool]');
      if (!btn) return;
      progTool = btn.dataset.tool;
      toolPills.querySelectorAll('.subject-pill').forEach(p => p.classList.toggle('active', p === btn));
      if (toolParamRow) {
        if (progTool === 'signextend') {
          toolParamRow.style.display = 'flex';
          toolParamLabel.setAttribute('data-i18n', 'prog_param_from_width');
          toolParamLabel.textContent = t('prog_param_from_width');
          if (!toolParam.dataset.userSet) toolParam.value = 8;
        } else if (progTool === 'custombase') {
          toolParamRow.style.display = 'flex';
          toolParamLabel.setAttribute('data-i18n', 'prog_param_base');
          toolParamLabel.textContent = t('prog_param_base');
          if (!toolParam.dataset.userSet) toolParam.value = 16;
        } else {
          toolParamRow.style.display = 'none';
        }
      }
      computeTool();
    });
  }

  [opA, opB].forEach(inp => inp.addEventListener('input', () => { computeBitwise(); computeTool(); computeBitPos(); }));

  computeBitwise();
  computeTool();
  computeBitPos();
})();

/* ============================================
   STATISTICS MODE
   ============================================ */
(function () {
  const dataInput = document.getElementById('statsDataInput');
  const fnSelect = document.getElementById('statsFunctionSelect');
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
    const selected = fnSelect ? fnSelect.value : 'all';
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

    // Geometric Mean — only defined for strictly positive values
    const allPositive = nums.every(v => v > 0);
    const geoMean = allPositive ? Math.exp(nums.reduce((a, v) => a + Math.log(v), 0) / n) : null;

    // Harmonic Mean — only defined when no value is zero
    const noZero = nums.every(v => v !== 0);
    const harmMean = noZero ? n / nums.reduce((a, v) => a + 1 / v, 0) : null;

    // Midrange — average of the smallest and largest values
    const midrange = (min + max) / 2;

    // Mean Absolute Deviation — average distance of each value from the mean
    const meanAbsDev = nums.reduce((a, v) => a + Math.abs(v - mean), 0) / n;

    // Median Absolute Deviation — average distance of each value from the median (more outlier-resistant)
    const medianAbsDev = nums.reduce((a, v) => a + Math.abs(v - median), 0) / n;

    // Skewness (sample, Fisher-Pearson adjusted) — needs at least 3 points and non-zero spread
    let skewness = null;
    if (n >= 3 && stdSample > 0) {
      const m3 = nums.reduce((a, v) => a + Math.pow(v - mean, 3), 0) / n;
      const g1 = m3 / Math.pow(stdPop, 3);
      skewness = (Math.sqrt(n * (n - 1)) / (n - 2)) * g1;
    }

    // Excess Kurtosis (sample) — needs at least 4 points and non-zero spread
    let kurtosis = null;
    if (n >= 4 && stdSample > 0) {
      const m4 = nums.reduce((a, v) => a + Math.pow(v - mean, 4), 0) / n;
      kurtosis = (m4 / Math.pow(stdPop, 4)) - 3;
    }

    // Standard Error of the Mean — how much the sample mean is expected to vary
    const sem = n > 1 ? stdSample / Math.sqrt(n) : null;

    // Sum of Squares of the raw values (Σx²) — distinct from the sum of squared deviations above
    const sumSqValues = nums.reduce((a, v) => a + v * v, 0);

    // Root Mean Square — quadratic mean of the values
    const rms = Math.sqrt(sumSqValues / n);

    // 95% Confidence Interval for the mean, using the sample std dev (z ≈ 1.96)
    let ciLow = null, ciHigh = null;
    if (sem !== null) {
      ciLow = mean - 1.96 * sem;
      ciHigh = mean + 1.96 * sem;
    }

    // Percentile via linear interpolation (distinct method from the median-of-halves Q1/Q3 above)
    function percentile(sortedArr, p) {
      const len = sortedArr.length;
      if (len === 0) return NaN;
      const idx = (p / 100) * (len - 1);
      const lo = Math.floor(idx), hi = Math.ceil(idx);
      if (lo === hi) return sortedArr[lo];
      return sortedArr[lo] + (sortedArr[hi] - sortedArr[lo]) * (idx - lo);
    }
    const p10 = percentile(sorted, 10);
    const p90 = percentile(sorted, 90);

    // Outlier count using the 1.5×IQR rule
    let outlierCount = null;
    if (n >= 4 && !isNaN(iqr)) {
      const lowerFence = q1 - 1.5 * iqr, upperFence = q3 + 1.5 * iqr;
      outlierCount = nums.filter(v => v < lowerFence || v > upperFence).length;
    }

    const round = (x) => Math.round(x * 1e4) / 1e4;

    // Each entry maps a dropdown value to the markup it produces. `ok` is false
    // when the dataset doesn't have enough points for that stat (e.g. quartiles need n>=4).
    const entries = {
      count: { ok: true, html: statCell(t('stats_count'), n) },
      sum: { ok: true, html: statCell(t('stats_sum'), round(sum)) },
      mean: { ok: true, html: statCell(t('stats_mean'), round(mean)) },
      median: { ok: true, html: statCell(t('stats_median'), round(median)) },
      mode: { ok: true, html: statCell(t('stats_mode'), modeStr) },
      range: { ok: true, html: statCell(t('stats_range'), round(range)) },
      minmax: { ok: true, html: statCell(t('stats_min'), min) + statCell(t('stats_max'), max) },
      stdPop: { ok: true, html: statCell(t('stats_std_pop'), round(stdPop)) },
      stdSample: { ok: true, html: statCell(t('stats_std_sample'), round(stdSample)) },
      varPop: { ok: true, html: statCell(t('stats_var_pop'), round(variancePop)) },
      varSample: { ok: true, html: statCell(t('stats_var_sample'), round(varianceSample)) },
      cv: { ok: true, html: statCell(t('stats_cv'), round(coefVar) + '%') },
      quartiles: {
        ok: n >= 4,
        html: n >= 4
          ? statCell(t('stats_q1'), round(q1)) + statCell(t('stats_q3'), round(q3)) + statCell(t('stats_iqr'), round(iqr))
          : ''
      },
      sumSquares: { ok: true, html: statCell(t('stats_sum_squares'), round(sumOfSquares)) },
      geoMean: { ok: geoMean !== null, html: statCell(t('stats_geo_mean'), geoMean !== null ? round(geoMean) : t('stats_na')) },
      harmMean: { ok: harmMean !== null, html: statCell(t('stats_harm_mean'), harmMean !== null ? round(harmMean) : t('stats_na')) },
      midrange: { ok: true, html: statCell(t('stats_midrange'), round(midrange)) },
      meanAbsDev: { ok: true, html: statCell(t('stats_mean_abs_dev'), round(meanAbsDev)) },
      medianAbsDev: { ok: true, html: statCell(t('stats_median_abs_dev'), round(medianAbsDev)) },
      skewness: { ok: skewness !== null, html: statCell(t('stats_skewness'), skewness !== null ? round(skewness) : t('stats_na')) },
      kurtosis: { ok: kurtosis !== null, html: statCell(t('stats_kurtosis'), kurtosis !== null ? round(kurtosis) : t('stats_na')) },
      sem: { ok: sem !== null, html: statCell(t('stats_sem'), sem !== null ? round(sem) : t('stats_na')) },
      sumSqValues: { ok: true, html: statCell(t('stats_sum_sq_values'), round(sumSqValues)) },
      rms: { ok: true, html: statCell(t('stats_rms'), round(rms)) },
      ci95: { ok: ciLow !== null, html: statCell(t('stats_ci95'), ciLow !== null ? (round(ciLow) + ' – ' + round(ciHigh)) : t('stats_na')) },
      p10: { ok: true, html: statCell(t('stats_p10'), round(p10)) },
      p90: { ok: true, html: statCell(t('stats_p90'), round(p90)) },
      outlierCount: { ok: outlierCount !== null, html: statCell(t('stats_outlier_count'), outlierCount !== null ? outlierCount : t('stats_na')) }
    };

    const order = ['count', 'sum', 'mean', 'median', 'mode', 'range', 'minmax', 'stdPop', 'stdSample',
      'varPop', 'varSample', 'cv', 'quartiles', 'sumSquares', 'geoMean', 'harmMean', 'midrange',
      'meanAbsDev', 'medianAbsDev', 'skewness', 'kurtosis', 'sem', 'sumSqValues', 'rms', 'ci95',
      'p10', 'p90', 'outlierCount'];

    let html = '';
    if (selected === 'all') {
      order.forEach(key => { html += entries[key].html; });
    } else if (entries[selected]) {
      const entry = entries[selected];
      html = entry.ok ? entry.html : statCell(t(selected === 'quartiles' ? 'stats_fn_quartiles' : 'stats_' + selected), t('stats_err_min_n'));
    }
    resultGrid.innerHTML = html;
  }

  calcBtn.addEventListener('click', computeStats);
  if (fnSelect) {
    fnSelect.addEventListener('change', () => {
      if (dataInput.value.trim() !== '') computeStats();
    });
  }
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

/* ============================================
   PULL-TO-REFRESH (phone / installed app)
   The page is locked to the screen (html/body overflow:hidden) and each tool
   scrolls inside its own panel, so the browser's built-in pull-to-refresh
   often never fires. This adds our own: at the very top of a screen, pull
   down ~130px and let go to reload. Not active on the Calculator, Graph,
   Timer, Quiz or Programmer screens (a slip there would lose work).
   ============================================ */
(function () {
  try {
    const touchCapable = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
    if (!touchCapable) return;
    const NO_PULL = ['calc', 'graph', 'timer', 'quiz', 'programmer'];
    const THRESHOLD = 130;
    let startY = 0, startX = 0, pulling = false, dist = 0, ind = null;

    function makeIndicator() {
      ind = document.createElement('div');
      ind.setAttribute('aria-hidden', 'true');
      ind.style.cssText = 'position:fixed;top:60px;left:50%;width:38px;height:38px;margin-left:-19px;border-radius:50%;' +
        'background:#1c1c20;border:2px solid #ff9500;color:#ff9500;font-size:20px;line-height:34px;text-align:center;' +
        'z-index:99999;pointer-events:none;opacity:0;transform:translateY(-60px);transition:opacity .15s;box-shadow:0 4px 14px rgba(0,0,0,.45);';
      ind.textContent = '\u21BB';
      document.body.appendChild(ind);
    }
    function hideIndicator() {
      if (!ind) return;
      ind.style.transition = 'opacity .15s, transform .2s';
      ind.style.opacity = '0';
      ind.style.transform = 'translateY(-60px)';
    }
    function popupOpen() {
      return !!document.querySelector('.app-modal-overlay.open, .more-pop.open, #morePop.open, .ai-crop-overlay.open');
    }

    document.addEventListener('touchstart', (e) => {
      pulling = false; dist = 0;
      if (e.touches.length !== 1 || popupOpen()) return;
      const panel = document.querySelector('.tab-panel.active');
      if (!panel) return;
      if (NO_PULL.indexOf(panel.id.replace('tab-', '')) !== -1) return;
      const t = e.target;
      if (t.closest && t.closest('input, textarea, select, canvas, [contenteditable="true"]')) return;
      // Every scrollable parent must already be at its very top.
      for (let el = t; el && el !== document.documentElement; el = el.parentElement) {
        if (el.scrollTop > 0) return;
      }
      startY = e.touches[0].clientY;
      startX = e.touches[0].clientX;
      pulling = true;
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!pulling) return;
      const dy = e.touches[0].clientY - startY;
      const dx = Math.abs(e.touches[0].clientX - startX);
      if (dy <= 0 || dx > dy) { dist = 0; hideIndicator(); return; }
      dist = dy;
      if (!ind) makeIndicator();
      const shift = Math.min(dy * 0.5, 80) - 60;
      ind.style.transition = 'none';
      ind.style.opacity = String(Math.min(dy / THRESHOLD, 1));
      ind.style.transform = 'translateY(' + (shift + 60) + 'px) rotate(' + Math.round(dy * 3) + 'deg)';
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (!pulling) return;
      pulling = false;
      if (dist >= THRESHOLD) {
        if (ind) { ind.style.transition = 'transform .6s linear'; ind.style.transform = 'translateY(60px) rotate(720deg)'; }
        setTimeout(() => location.reload(), 150);
      } else {
        hideIndicator();
      }
      dist = 0;
    }, { passive: true });
    document.addEventListener('touchcancel', () => { pulling = false; hideIndicator(); }, { passive: true });
  } catch (err) { /* pull-to-refresh is optional */ }
})();

/* ---------- 3D tilt: cards lean toward the mouse on desktop (touch/reduced-motion untouched) ---------- */
(function () {
  if (!window.matchMedia || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const SEL = '.home-big, .subject-tile';
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest && e.target.closest(SEL);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty('--ry', (x * 9).toFixed(2) + 'deg');
    el.style.setProperty('--rx', (-y * 9).toFixed(2) + 'deg');
  }, { passive: true });
  document.addEventListener('pointerout', (e) => {
    const el = e.target.closest && e.target.closest(SEL);
    if (!el || el.contains(e.relatedTarget)) return;
    el.style.removeProperty('--rx');
    el.style.removeProperty('--ry');
  }, { passive: true });
})();
