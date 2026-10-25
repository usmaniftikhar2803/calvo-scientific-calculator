/* Calvo — Voice features for the AI Solver.
   1) "Listen"  : reads the written solution aloud.
   2) "Samjhao" : an AI teacher explains the solution to the student in
                  Urdu, step by step, shown as text AND spoken aloud.
   Uses the browser's built-in speech engine (free) and the student's own
   Gemini key already saved by the solver. */
(function () {
  'use strict';
  var synth = window.speechSynthesis;
  var listenBtn = document.getElementById('aiListenBtn');
  var teachBtn = document.getElementById('aiTeachBtn');
  var resultBox = document.getElementById('aiResultBox');
  var simpleBox = document.getElementById('aiSimpleExplainBox');
  var questionInput = document.getElementById('aiQuestionInput');
  if (!resultBox || !listenBtn) return;
  if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
    listenBtn.remove(); if (teachBtn) teachBtn.remove(); return;
  }

  var GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  var ENDPOINT = function (m) { return 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent'; };
  var KEY_STORAGE = 'calvo_gemini_api_key';

  var UR = {
    listen: '\uD83D\uDD0A \u0633\u0646\u06CC\u06BA',
    stop: '\u23F9 \u0631\u0648\u06A9\u06CC\u06BA',
    teach: '\uD83C\uDF93 \u0627\u0631\u062F\u0648 \u0645\u06CC\u06BA \u0633\u0645\u062C\u06BE\u0627\u0626\u06CC\u06BA',
    teaching: '\u0679\u06CC\u0686\u0631 \u0633\u0645\u062C\u06BE\u0627 \u0631\u06C1\u0627 \u06C1\u06D2...',
    teacherLabel: '\uD83C\uDF93 \u0679\u06CC\u0686\u0631 \u06A9\u06CC \u0622\u0648\u0627\u0632',
    noKey: '\u067E\u06C1\u0644\u06D2 \u0627\u067E\u0646\u06CC Gemini API Key \u0633\u06CC\u0648 \u06A9\u0631\u06CC\u06BA\u06D4',
    badKey: 'API Key \u062F\u0631\u0633\u062A \u0646\u06C1\u06CC\u06BA \u06CC\u0627 \u0644\u0645\u0679 \u062E\u062A\u0645 \u06C1\u0648 \u06AF\u0626\u06CC \u06C1\u06D2\u06D4',
    err: '\u0627\u0628 \u0633\u0645\u062C\u06BE\u0627 \u0646\u06C1\u06CC\u06BA \u0633\u06A9\u0627\u060C \u062F\u0648\u0628\u0627\u0631\u06C1 \u06A9\u0648\u0634\u0634 \u06A9\u0631\u06CC\u06BA\u06D4',
    noVoice: '\u0622\u067E \u06A9\u06D2 \u0641\u0648\u0646/\u06A9\u0645\u067E\u06CC\u0648\u0679\u0631 \u0645\u06CC\u06BA \u0627\u0631\u062F\u0648 \u0622\u0648\u0627\u0632 \u0645\u0648\u062C\u0648\u062F \u0646\u06C1\u06CC\u06BA\u060C \u0627\u0633 \u0644\u06CC\u06D2 \u0635\u0631\u0641 \u0644\u06A9\u06BE\u06CC \u06C1\u0648\u0626\u06CC \u0648\u0636\u0627\u062D\u062A \u062F\u06CC \u06AF\u0626\u06CC \u06C1\u06D2\u06D4'
  };
  var EN = { listen: '\uD83D\uDD0A Listen', stop: '\u23F9 Stop', novoice: 'No voice for this language is installed on your device.' };
  var LOCALES = { en: 'en-US', ur: 'ur-PK', ar: 'ar-SA', fr: 'fr-FR', es: 'es-ES', hi: 'hi-IN', zh: 'zh-CN', tr: 'tr-TR', de: 'de-DE', ru: 'ru-RU', bn: 'bn-BD', id: 'id-ID', pt: 'pt-BR', ja: 'ja-JP', ko: 'ko-KR', vi: 'vi-VN', sw: 'sw-KE', fa: 'fa-IR', pa: 'pa-IN' };
  var MATH_EN = [[/\^2/g, ' squared'], [/\^3/g, ' cubed'], [/\^\(?(-?\w+)\)?/g, ' to the power $1'], [/sqrt\(?/gi, ' square root of '], [/\u221A/g, ' square root of '], [/\u00D7/g, ' times '], [/\u00F7/g, ' divided by '], [/\u03C0/g, ' pi '], [/=/g, ' equals '], [/\+/g, ' plus '], [/\u2212/g, ' minus '], [/\//g, ' over ']];
  var MATH_UR = [[/\^2/g, ' \u0645\u0631\u0628\u0639 '], [/\^3/g, ' \u0645\u06A9\u0639\u0628 '], [/\^\(?(-?\w+)\)?/g, ' \u067E\u0627\u0648\u0631 $1 '], [/sqrt\(?/gi, ' \u062C\u0630\u0631 '], [/\u221A/g, ' \u062C\u0630\u0631 '], [/\u00D7/g, ' \u0636\u0631\u0628 '], [/\u00F7/g, ' \u062A\u0642\u0633\u06CC\u0645 '], [/\u03C0/g, ' \u067E\u0627\u0626\u06CC '], [/=/g, ' \u0628\u0631\u0627\u0628\u0631 '], [/\+/g, ' \u0645\u0632\u06CC\u062F '], [/\u2212/g, ' \u0645\u0646\u06C1\u0627 '], [/\//g, ' \u0628\u0631 ']];

  var token = 0;
  var active = null; // 'listen' | 'teach' | null
  var teacherCache = { key: '', text: '' };

  // Box that shows the teacher's written explanation.
  var teachBox = document.createElement('div');
  teachBox.id = 'aiTeachBox';
  teachBox.className = 'ai-simple-explain-box';
  teachBox.style.display = 'none';
  teachBox.setAttribute('dir', 'rtl');
  teachBox.style.textAlign = 'right';
  if (simpleBox && simpleBox.parentNode) simpleBox.parentNode.insertBefore(teachBox, simpleBox.nextSibling);
  else resultBox.parentNode.insertBefore(teachBox, resultBox.nextSibling);

  function siteLang() { return (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function setButtons() {
    var ur = siteLang() === 'ur';
    listenBtn.textContent = active === 'listen' ? (ur ? UR.stop : EN.stop) : (ur ? UR.listen : EN.listen);
    listenBtn.classList.toggle('listening', active === 'listen');
    if (teachBtn) {
      teachBtn.textContent = active === 'teach' ? UR.stop : UR.teach;
      teachBtn.classList.toggle('listening', active === 'teach');
    }
  }

  function pickVoice(locale) {
    var voices = synth.getVoices() || [];
    var l = locale.toLowerCase(), base = l.split('-')[0], best = null;
    for (var i = 0; i < voices.length; i++) {
      var vl = (voices[i].lang || '').toLowerCase().replace('_', '-');
      if (vl === l) return voices[i];
      if (!best && vl.split('-')[0] === base) best = voices[i];
    }
    return best;
  }

  function cleanText(raw, lang, withMath) {
    var t = raw.replace(/[*_`#>$]+/g, ' ');
    if (withMath) {
      var rules = lang === 'ur' ? MATH_UR : MATH_EN;
      for (var i = 0; i < rules.length; i++) t = t.replace(rules[i][0], rules[i][1]);
    }
    return t.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function chunks(text) {
    var parts = text.match(/[^.!?\u06D4\u061F\n]+[.!?\u06D4\u061F]?/g) || [text];
    var out = [], cur = '';
    parts.forEach(function (p) {
      if ((cur + p).length > 180 && cur) { out.push(cur); cur = p; } else { cur += p; }
    });
    if (cur.trim()) out.push(cur);
    return out;
  }

  function stop() { token++; synth.cancel(); active = null; setButtons(); }

  // Speak text with the best voice for `lang`. Never blocks: if the voice list
  // has no match we still ask the engine for that language and report if it fails.
  function unlockSpeech() {   // lets mobile browsers speak later, after an async step
    try { var u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch (e) {}
  }
  function speak(text, lang, who, onFail) {
    var locale = LOCALES[lang] || 'en-US';
    var voice = pickVoice(locale);
    var list = chunks(text);
    if (!list.length) return !!voice || lang === 'en';
    var my = ++token, idx = 0;
    synth.cancel();
    active = who; setButtons();
    (function next() {
      if (my !== token) return;
      if (idx >= list.length) { active = null; setButtons(); return; }
      var u = new SpeechSynthesisUtterance(list[idx++]);
      u.lang = voice ? voice.lang : locale;
      if (voice) u.voice = voice;
      u.rate = 0.9;
      u.onend = next;
      u.onerror = function (ev) {
        if (my !== token) return;
        active = null; setButtons();
        if (ev && ev.error && ev.error !== 'canceled' && ev.error !== 'interrupted' && onFail) onFail();
      };
      synth.speak(u);
    })();
    return !!voice || lang === 'en';
  }
  function whenVoicesReady(cb) {
    var v = synth.getVoices();
    if (v && v.length) return cb();
    var done = false;
    function fin() { if (done) return; done = true; cb(); }
    if (synth.addEventListener) synth.addEventListener('voiceschanged', fin);
    setTimeout(fin, 1500);
  }

  function solutionText() { return (resultBox.innerText || '').trim(); }

  /* ---------- Listen: read the written solution ---------- */
  listenBtn.addEventListener('click', function () {
    if (active === 'listen') return stop();
    var lang = siteLang();
    var txt = solutionText();
    if (simpleBox && simpleBox.style.display !== 'none' && simpleBox.innerText.trim()) txt += '. ' + simpleBox.innerText;
    txt = cleanText(txt, lang, true);
    unlockSpeech();
    whenVoicesReady(function () {
      var warn = function () { alert(lang === 'ur' ? UR.noVoice : EN.novoice); };
      if (!speak(txt, lang, 'listen', warn)) warn();
    });
  });

  /* ---------- Samjhao: AI teacher explains in Urdu ---------- */
  function getKey() { try { return localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { return ''; } }

  function showTeach(html) { teachBox.style.display = 'block'; teachBox.innerHTML = html; }

  async function askTeacher(question, solution, key) {
    var prompt =
      'You are a kind, patient Pakistani school teacher explaining a solved problem to a student by VOICE, in URDU (Urdu script).\n' +
      'Explain it the way a teacher speaks in class: first say what the question is asking, then walk through each step slowly and say WHY we do it, ' +
      'and finish with the final answer and one tip to remember. Use simple everyday Urdu (English technical words like formula names are fine in Urdu script).\n' +
      'IMPORTANT because this will be read aloud by a speech engine:\n' +
      '- Write every math expression in WORDS in Urdu (for example: x مربع، دو ضرب تین، جذر، برابر). No symbols like ^, /, =, *, no LaTeX, no $, no Markdown, no bullet points.\n' +
      '- Short sentences. Separate steps with a full stop (\u06D4). Write numbers as digits.\n' +
      '- Length: about 8 to 14 sentences.\n\n' +
      'Question: ' + (question || '(see solution)') + '\n\nSolution:\n' + solution;
    var resp = null, data = null, errText = '';
    for (var i = 0; i < GEMINI_MODELS.length; i++) {
      resp = await fetch(ENDPOINT(GEMINI_MODELS[i]), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
      });
      data = await resp.json().catch(function () { return null; });
      if (resp.ok) break;
      errText = (data && data.error && data.error.message) || '';
      var gone = resp.status === 404 && /no longer available|not found/i.test(errText);
      if (!gone || i === GEMINI_MODELS.length - 1) break;
    }
    if (!resp.ok) {
      var e = new Error(errText); e.status = resp.status; throw e;
    }
    var c = data && data.candidates && data.candidates[0];
    var out = c && c.content && c.content.parts ? c.content.parts.map(function (p) { return p.text || ''; }).join('\n') : '';
    if (!out) throw new Error('empty');
    return out;
  }

  if (teachBtn) teachBtn.addEventListener('click', async function () {
    if (active === 'teach') return stop();
    unlockSpeech();
    try {
      var solution = solutionText();
      if (!solution) { showTeach('<span class="ai-error">Pehle koi sawal solve karein.</span>'); return; }
      var key = getKey();
      if (!key) {
        showTeach('<span class="ai-error">' + esc(UR.noKey) + '</span>');
        var ki = document.getElementById('aiApiKeyInput'); if (ki) ki.focus();
        return;
      }
      var question = questionInput ? questionInput.value.trim() : '';
      var cacheKey = question + '||' + solution;
      var text = teacherCache.key === cacheKey ? teacherCache.text : '';

      if (!text) {
        teachBtn.disabled = true;
        showTeach('<span class="ai-loading">' + esc(UR.teaching) + '</span>');
        try {
          text = cleanText(await askTeacher(question, solution, key), 'ur', false);
          teacherCache = { key: cacheKey, text: text };
        } catch (err) {
          var bad = err && (err.status === 400 || err.status === 401 || err.status === 403);
          var detail = err && err.message ? ' <div dir="ltr" style="font-size:.75em;opacity:.7;margin-top:6px;text-align:left;">' + esc(String(err.message).slice(0, 160)) + '</div>' : '';
          showTeach('<span class="ai-error">' + esc(bad ? UR.badKey : UR.err) + '</span>' + detail);
          return;
        } finally { teachBtn.disabled = false; }
      }

      var html = '<div class="ai-simple-explain-label">' + esc(UR.teacherLabel) + '</div><div style="line-height:2;font-size:1.05em;">' + esc(text).replace(/\u06D4\s*/g, '\u06D4<br>') + '</div>';
      showTeach(html);   // student can read it...
      var note = function () { showTeach(html + '<div class="ai-error" style="margin-top:8px;">' + esc(UR.noVoice) + '</div>'); };
      whenVoicesReady(function () { if (!speak(text, 'ur', 'teach', note)) note(); });  // ...and hear it
    } catch (e) {
      teachBtn.disabled = false;
      showTeach('<span class="ai-error">' + esc(UR.err) + '</span><div dir="ltr" style="font-size:.75em;opacity:.7;text-align:left;">' + esc(String(e && e.message || e)) + '</div>');
    }
  });

  /* ---------- Show buttons only when a finished answer is on screen ---------- */
  var lastSolution = '';
  function refresh() {
    var cur = solutionText();
    var ok = cur && !resultBox.querySelector('.ai-loading, .ai-error');
    listenBtn.style.display = ok ? 'inline-block' : 'none';
    if (teachBtn) teachBtn.style.display = ok ? 'inline-block' : 'none';
    if (cur !== lastSolution) {          // new question solved -> clear old teacher text
      lastSolution = cur;
      teachBox.style.display = 'none'; teachBox.innerHTML = '';
    }
    if (!ok && active) stop();
    setButtons();
  }
  new MutationObserver(refresh).observe(resultBox, { childList: true, subtree: true, characterData: true });
  refresh();
  window.addEventListener('beforeunload', function () { synth.cancel(); });
})();
