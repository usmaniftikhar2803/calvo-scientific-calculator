/* ============================================
   CALVO — AI MATH SOLVER
   Uses the user's own free Google Gemini API key
   (from https://aistudio.google.com/apikey).
   The key is stored only in this browser's
   localStorage and sent directly to Google's
   API — never to any server of ours.
   ============================================ */

(function () {
  const GEMINI_MODELS = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'];
  const GEMINI_ENDPOINT_FOR = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const STORAGE_KEY = 'calvo_gemini_api_key';
  const SAVED_KEY = 'calvo_ai_saved';

  const aiApiKeyInput = document.getElementById('aiApiKeyInput');
  const aiKeyToggleBtn = document.getElementById('aiKeyToggleBtn');
  const aiKeyStatus = document.getElementById('aiKeyStatus');

  const aiQuestionInput = document.getElementById('aiQuestionInput');
  const aiImageInput = document.getElementById('aiImageInput');
  const aiImagePickBtn = document.getElementById('aiImagePickBtn');
  const aiVoiceBtn = document.getElementById('aiVoiceBtn');
  const aiImageFilename = document.getElementById('aiImageFilename');
  const aiImageClearBtn = document.getElementById('aiImageClearBtn');
  const aiImagePreview = document.getElementById('aiImagePreview');
  const aiSolveBtn = document.getElementById('aiSolveBtn');
  const aiRefreshBtn = document.getElementById('aiRefreshBtn');
  const aiSaveBtn = document.getElementById('aiSaveBtn');
  const aiExplainSimpleBtn = document.getElementById('aiExplainSimpleBtn');
  const aiSimpleExplainBox = document.getElementById('aiSimpleExplainBox');
  const aiResultBox = document.getElementById('aiResultBox');
  const aiSavedList = document.getElementById('aiSavedList');
  const aiClearSavedBtn = document.getElementById('aiClearSavedBtn');

  const aiImagePreviewWrap = document.getElementById('aiImagePreviewWrap');
  const aiEditPhotoBtn = document.getElementById('aiEditPhotoBtn');
  const aiSavedSearchInput = document.getElementById('aiSavedSearchInput');
  const aiModeQuickBtn = document.getElementById('aiModeQuickBtn');
  const aiModeDetailedBtn = document.getElementById('aiModeDetailedBtn');

  if (!aiApiKeyInput) return; // AI Solver tab not present

  let aiImageBase64 = null;
  let aiImageMimeType = null;
  let aiKeyVisible = false;
  let aiOriginalImageDataUrl = null; // pristine picked photo, used when re-opening the crop editor
  let aiSavedSearchQuery = '';

  /* ---- Quick Answer vs Detailed Explanation mode ---- */
  const AI_MODE_KEY = 'calvo_ai_solve_mode';
  let aiSolveMode = 'quick';
  try { aiSolveMode = localStorage.getItem(AI_MODE_KEY) || 'quick'; } catch (e) {}

  function applyAiModeUI() {
    if (!aiModeQuickBtn || !aiModeDetailedBtn) return;
    aiModeQuickBtn.classList.toggle('active', aiSolveMode === 'quick');
    aiModeDetailedBtn.classList.toggle('active', aiSolveMode === 'detailed');
  }
  if (aiModeQuickBtn && aiModeDetailedBtn) {
    applyAiModeUI();
    aiModeQuickBtn.addEventListener('click', () => {
      aiSolveMode = 'quick';
      try { localStorage.setItem(AI_MODE_KEY, aiSolveMode); } catch (e) {}
      applyAiModeUI();
    });
    aiModeDetailedBtn.addEventListener('click', () => {
      aiSolveMode = 'detailed';
      try { localStorage.setItem(AI_MODE_KEY, aiSolveMode); } catch (e) {}
      applyAiModeUI();
    });
  }

  // Holds the most recently solved question/answer so the Save button
  // knows what to store.
  let lastSolved = null; // { question, hadImage, answerText, time }

  function tr(key) {
    return (typeof t === 'function') ? t(key) : key;
  }

  function getSavedKey() {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch (e) { return ''; }
  }

  function setSavedKey(key) {
    try { localStorage.setItem(STORAGE_KEY, key); } catch (e) {}
  }

  /* ---- Load any previously saved key straight into the field ---- */
  const existingKey = getSavedKey();
  if (existingKey) aiApiKeyInput.value = existingKey;

  /* ---- Auto-save the key silently as the user types/pastes it ---- */
  aiApiKeyInput.addEventListener('input', () => {
    setSavedKey(aiApiKeyInput.value.trim());
    aiKeyStatus.textContent = '';
    aiKeyStatus.classList.remove('ok', 'err');
  });

  /* ---- Show / hide the API key text ---- */
  if (aiKeyToggleBtn) {
    aiKeyToggleBtn.addEventListener('click', () => {
      aiKeyVisible = !aiKeyVisible;
      aiApiKeyInput.type = aiKeyVisible ? 'text' : 'password';
      aiKeyToggleBtn.textContent = tr(aiKeyVisible ? 'ai_key_hide' : 'ai_key_show');
    });
  }

  /* ---- Photo picker ---- */
  if (aiImagePickBtn) {
    aiImagePickBtn.addEventListener('click', () => aiImageInput.click());
  }

  if (aiImageInput) {
    aiImageInput.addEventListener('change', () => {
      const file = aiImageInput.files && aiImageInput.files[0];
      if (!file) return;
      aiImageMimeType = file.type || 'image/jpeg';
      const reader = new FileReader();
      reader.onload = () => {
        aiOriginalImageDataUrl = String(reader.result);
        aiImageFilename.textContent = file.name;
        if (typeof window.openAiCropModal === 'function') {
          window.openAiCropModal(aiOriginalImageDataUrl);
        } else {
          // Fallback if the crop tool failed to init for some reason —
          // use the photo as-is, uncropped.
          aiImageBase64 = aiOriginalImageDataUrl.split(',')[1] || null;
          setAiImagePreview(aiOriginalImageDataUrl);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  function setAiImagePreview(dataUrl) {
    aiImagePreview.src = dataUrl;
    aiImagePreviewWrap.style.display = 'inline-block';
    aiImageClearBtn.style.display = 'inline-flex';
  }

  if (aiEditPhotoBtn) {
    aiEditPhotoBtn.addEventListener('click', () => {
      if (aiOriginalImageDataUrl && typeof window.openAiCropModal === 'function') {
        window.openAiCropModal(aiOriginalImageDataUrl);
      }
    });
  }

  // Called by the crop tool once the user taps "Apply".
  window.onAiCropApplied = function (croppedDataUrl) {
    aiImageMimeType = 'image/jpeg';
    aiImageBase64 = croppedDataUrl.split(',')[1] || null;
    setAiImagePreview(croppedDataUrl);
  };

  function clearImage() {
    aiImageBase64 = null;
    aiImageMimeType = null;
    aiOriginalImageDataUrl = null;
    aiImageInput.value = '';
    aiImagePreview.removeAttribute('src');
    aiImagePreviewWrap.style.display = 'none';
    aiImageFilename.textContent = '';
    aiImageClearBtn.style.display = 'none';
  }

  if (aiImageClearBtn) {
    aiImageClearBtn.addEventListener('click', clearImage);
  }

  /* ============================================
     VOICE INPUT — speak the question instead of typing it,
     via the browser's built-in SpeechRecognition (Web Speech API).
     Nothing is sent anywhere except locally to the browser's own
     speech engine; no audio is uploaded to Calvo or Google by this step.
     ============================================ */
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognition = null;
  let isListening = false;
  let voiceBaseText = '';

  function getSpeechLang() {
    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
    return (typeof LOCALE_MAP !== 'undefined' && LOCALE_MAP[lang]) || 'en-US';
  }

  function setVoiceButtonState(listening) {
    if (!aiVoiceBtn) return;
    aiVoiceBtn.classList.toggle('listening', listening);
    aiVoiceBtn.innerHTML = listening
      ? '&#128308; ' + escapeHtml(tr('ai_voice_listening'))
      : escapeHtml(tr('ai_voice_btn'));
  }

  function stopVoiceInput() {
    if (recognition) {
      try { recognition.stop(); } catch (e) {}
    }
  }

  function startVoiceInput() {
    if (!SpeechRecognitionCtor) {
      if (typeof showToast === 'function') showToast(tr('ai_voice_not_supported'));
      return;
    }

    voiceBaseText = (aiQuestionInput.value || '').replace(/\s+$/, '');
    let finalTranscript = '';
    let gotFinalResult = false;

    recognition = new SpeechRecognitionCtor();
    recognition.lang = getSpeechLang();
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListening = true;
      setVoiceButtonState(true);
    };

    recognition.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          gotFinalResult = true;
        } else {
          interim += transcript;
        }
      }
      const spoken = (finalTranscript + interim).trim();
      aiQuestionInput.value = voiceBaseText ? (voiceBaseText + ' ' + spoken) : spoken;
    };

    recognition.onerror = (event) => {
      isListening = false;
      setVoiceButtonState(false);
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      const msgKey = (event.error === 'not-allowed' || event.error === 'service-not-allowed')
        ? 'ai_voice_mic_denied' : 'ai_voice_error';
      if (typeof showToast === 'function') showToast(tr(msgKey));
    };

    recognition.onend = () => {
      isListening = false;
      setVoiceButtonState(false);
      recognition = null;

      // Auto-solve: once speech finishes and we actually captured a
      // final (non-interim) transcript, kick off the solve automatically
      // instead of waiting for the user to press the Solve button.
      if (gotFinalResult && (aiQuestionInput.value || '').trim()) {
        solveWithGemini();
      }
    };

    try {
      recognition.start();
    } catch (e) {
      isListening = false;
      setVoiceButtonState(false);
    }
  }

  if (aiVoiceBtn) {
    if (!SpeechRecognitionCtor) {
      // Hide the button entirely on browsers with no speech support
      // (e.g. some in-app browsers) instead of showing a dead control.
      aiVoiceBtn.style.display = 'none';
    } else {
      aiVoiceBtn.addEventListener('click', () => {
        if (isListening) stopVoiceInput();
        else startVoiceInput();
      });
    }
  }

  /* ---- Language name for asking Gemini to answer in the UI language ---- */
  const AI_LANG_NAMES = {
    en: 'English', ur: 'Urdu', ar: 'Arabic', fr: 'French',
    es: 'Spanish', hi: 'Hindi', zh: 'Chinese (Simplified)',
    tr: 'Turkish', de: 'German', ru: 'Russian',
  };

  function renderResult(html) {
    aiResultBox.innerHTML = html;
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /* Turn the model's plain-text answer into a structured layout:
     - "Step 1", "Step 2", ... are pulled onto their own green heading line
     - the working for that step is shown on the line(s) below it
     - the final "Answer:" line gets its own highlighted block */
  function formatAnswer(text) {
    const lines = text.trim().split(/\n/);
    const stepRe = /^\s*(step\s*\d+)\s*[:.\-]?\s*(.*)$/i;
    const answerRe = /^\s*(answer)\s*[:.\-]?\s*(.*)$/i;
    const bulletRe = /^\s*[-•*]\s+(.*)$/;

    let html = '';
    let introBuf = [];
    let listBuf = [];
    let currentStep = null; // { label, contentLines: [] }

    function flushIntro() {
      if (introBuf.length) {
        html += `<p>${escapeHtml(introBuf.join('\n')).replace(/\n/g, '<br>')}</p>`;
        introBuf = [];
      }
    }
    function flushList() {
      if (listBuf.length) {
        html += '<ul class="ai-list">' + listBuf.map(li => `<li>${escapeHtml(li)}</li>`).join('') + '</ul>';
        listBuf = [];
      }
    }
    function flushStep() {
      if (currentStep) {
        const body = currentStep.contentLines.join('\n').trim();
        html += '<div class="ai-step">' +
          `<div class="ai-step-label">${escapeHtml(currentStep.label)}</div>` +
          (body ? `<div class="ai-step-body">${escapeHtml(body).replace(/\n/g, '<br>')}</div>` : '') +
          '</div>';
        currentStep = null;
      }
    }

    lines.forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) return;

      const stepMatch = line.match(stepRe);
      const answerMatch = line.match(answerRe);
      const bulletMatch = !currentStep ? line.match(bulletRe) : null;

      if (stepMatch) {
        flushIntro();
        flushList();
        flushStep();
        currentStep = { label: stepMatch[1].replace(/\s+/g, ' '), contentLines: [] };
        if (stepMatch[2]) currentStep.contentLines.push(stepMatch[2]);
      } else if (answerMatch) {
        flushIntro();
        flushList();
        flushStep();
        html += `<div class="ai-answer"><span class="ai-answer-label">${escapeHtml(tr('ai_answer_label'))}:</span> ${escapeHtml(answerMatch[2])}</div>`;
      } else if (currentStep) {
        currentStep.contentLines.push(line);
      } else if (bulletMatch) {
        flushIntro();
        listBuf.push(bulletMatch[1]);
      } else {
        flushList();
        introBuf.push(line);
      }
    });

    flushIntro();
    flushList();
    flushStep();

    return `<div class="ai-result-card">${html}</div>`;
  }

  /* ============================================
     SAVE / REFRESH
     ============================================ */

  function loadSavedList() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || '[]'); } catch (e) { return []; }
  }
  function persistSavedList(list) {
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function formatSavedTime(ts) {
    try {
      const d = new Date(ts);
      const locale = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : undefined;
      return d.toLocaleDateString(locale) + ' ' + d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    } catch (e) { return ''; }
  }

  function renderSavedList() {
    if (!aiSavedList) return;
    let list = loadSavedList();
    if (aiSavedSearchQuery) {
      const q = aiSavedSearchQuery.toLowerCase();
      list = list.filter(item =>
        (item.question || '').toLowerCase().includes(q) ||
        (item.answerText || '').toLowerCase().includes(q)
      );
    }
    aiSavedList.innerHTML = '';
    if (list.length === 0) {
      const emptyKey = aiSavedSearchQuery ? 'ai_saved_search_empty' : 'ai_no_saved';
      aiSavedList.innerHTML = `<div class="formula-empty">${escapeHtml(tr(emptyKey))}</div>`;
      return;
    }
    list.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'ai-saved-item';
      div.innerHTML =
        `<button class="ai-saved-delete" type="button" title="&#10005;">&#10005;</button>` +
        `<div class="ai-saved-question">${escapeHtml(item.question)}</div>` +
        (item.answerText ? `<div class="ai-saved-answer">${escapeHtml(item.answerText)}</div>` : '') +
        `<div class="ai-saved-time">${escapeHtml(formatSavedTime(item.time))}</div>` +
        (item.answerHtml ? `<div class="ai-saved-full-steps" style="display:none;">${item.answerHtml}</div>` : '');
      div.querySelector('.ai-saved-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        // Delete by identity (time+question) rather than filtered index,
        // since `list` here may be a search-filtered subset.
        const current = loadSavedList();
        const idx = current.findIndex(x => x.time === item.time && x.question === item.question);
        if (idx > -1) current.splice(idx, 1);
        persistSavedList(current);
        renderSavedList();
      });
      // Tapping the card (but not the delete button) expands the full
      // step-by-step solution saved at the time it was solved.
      if (item.answerHtml) {
        div.classList.add('ai-saved-expandable');
        div.addEventListener('click', () => {
          const full = div.querySelector('.ai-saved-full-steps');
          if (!full) return;
          const open = full.style.display !== 'none';
          full.style.display = open ? 'none' : 'block';
          div.classList.toggle('expanded', !open);
        });
      }
      aiSavedList.appendChild(div);
    });
  }

  if (aiSavedSearchInput) {
    aiSavedSearchInput.addEventListener('input', () => {
      aiSavedSearchQuery = aiSavedSearchInput.value.trim();
      renderSavedList();
    });
  }

  const MAX_HISTORY = 200;

  function autoSaveSolve(item) {
    const list = loadSavedList();
    list.unshift(item);
    if (list.length > MAX_HISTORY) list.length = MAX_HISTORY;
    persistSavedList(list);
    renderSavedList();
  }

  function resetSolver() {
    aiQuestionInput.value = '';
    clearImage();
    renderResult('');
    lastSolved = null;
    if (aiSaveBtn) aiSaveBtn.style.display = 'none';
  }

  if (aiSaveBtn) {
    // Saving is now automatic on every solve — hide the old manual button
    // entirely rather than leaving a dead control in the UI.
    aiSaveBtn.style.display = 'none';
  }
  if (aiRefreshBtn) {
    aiRefreshBtn.addEventListener('click', resetSolver);
  }
  if (aiClearSavedBtn) {
    let clearArmed = false;
    let clearArmTimer = null;
    const clearOriginalLabel = aiClearSavedBtn.textContent;
    aiClearSavedBtn.addEventListener('click', () => {
      if (!clearArmed) {
        clearArmed = true;
        aiClearSavedBtn.textContent = tr('ai_tap_again_confirm') || clearOriginalLabel;
        aiClearSavedBtn.classList.add('confirm-armed');
        clearArmTimer = setTimeout(() => {
          clearArmed = false;
          aiClearSavedBtn.textContent = clearOriginalLabel;
          aiClearSavedBtn.classList.remove('confirm-armed');
        }, 2500);
        return;
      }
      clearTimeout(clearArmTimer);
      clearArmed = false;
      aiClearSavedBtn.textContent = clearOriginalLabel;
      aiClearSavedBtn.classList.remove('confirm-armed');
      persistSavedList([]);
      renderSavedList();
    });
  }

  renderSavedList();

  /* ============================================
     FORMULA LIBRARY: "Explain this formula"
     Exposed globally so the Formula Library code
     in script.js can call it without duplicating
     the Gemini request logic. Uses the same saved
     API key as the AI Solver tab.
     ============================================ */
  window.calvoExplainFormula = async function (name, expr, onChunkOrDone) {
    const apiKey = getSavedKey();
    if (!apiKey) {
      onChunkOrDone({ error: tr('ai_key_status_empty') });
      return;
    }
    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
    const langName = AI_LANG_NAMES[lang] || 'English';
    const promptText =
      `Explain the following formula to a student in a clear, exam-ready way: "${name}" — ${expr}\n\n` +
      `Cover, briefly: (1) what it's used for, (2) what each symbol/variable means, (3) one short worked example with numbers.\n` +
      `Keep it concise — a few short paragraphs at most. Do NOT use LaTeX, the $ symbol, or Markdown formatting (no **, no #, no backticks). ` +
      `Write math using plain symbols (x^2, sqrt(x), 3/4, ×, ÷, π). Reply in ${langName}.`;

    try {
      let response = null, data = null, lastErrText = '';
      for (let i = 0; i < GEMINI_MODELS.length; i++) {
        response = await fetch(GEMINI_ENDPOINT_FOR(GEMINI_MODELS[i]), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptText }] }] }),
        });
        data = await response.json().catch(() => null);
        if (response.ok) break;
        const serverMsg = (data && data.error && data.error.message) || '';
        lastErrText = serverMsg;
        const isModelGone = response.status === 404 && /no longer available|not found/i.test(serverMsg);
        if (!isModelGone) break;
      }
      if (!response || !response.ok) {
        const status = response ? response.status : 0;
        if (status === 400 || status === 401 || status === 403) {
          onChunkOrDone({ error: tr('ai_error_invalid_key') });
        } else {
          onChunkOrDone({ error: lastErrText || tr('ai_error_request') });
        }
        return;
      }
      const candidate = data && data.candidates && data.candidates[0];
      const textOut = candidate && candidate.content && candidate.content.parts
        ? candidate.content.parts.map(p => p.text || '').join('\n')
        : '';
      if (!textOut) {
        onChunkOrDone({ error: tr('ai_error_request') });
        return;
      }
      onChunkOrDone({ html: formatAnswer(textOut) });
    } catch (err) {
      onChunkOrDone({ error: tr('ai_error_request') });
    }
  };

  /* ============================================
     SOLVE
     ============================================ */

  async function solveWithGemini() {
    stopVoiceInput();
    const apiKey = (aiApiKeyInput.value || '').trim();
    const question = (aiQuestionInput.value || '').trim();

    aiKeyStatus.textContent = '';
    aiKeyStatus.classList.remove('ok', 'err');

    if (!apiKey) {
      aiKeyStatus.textContent = tr('ai_key_status_empty');
      aiKeyStatus.classList.add('err');
      aiApiKeyInput.focus();
      return;
    }
    if (!question && !aiImageBase64) {
      renderResult(`<div class="ai-result-card"><span class="ai-error">${escapeHtml(tr('ai_error_no_input'))}</span></div>`);
      return;
    }

    setSavedKey(apiKey);

    if (aiSaveBtn) aiSaveBtn.style.display = 'none';
    if (aiExplainSimpleBtn) aiExplainSimpleBtn.style.display = 'none';
    if (aiSimpleExplainBox) { aiSimpleExplainBox.style.display = 'none'; aiSimpleExplainBox.innerHTML = ''; }
    lastSolved = null;

    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
    const langName = AI_LANG_NAMES[lang] || 'English';

    const promptText =
      (question || 'Solve the problem shown in the attached photo.') +
      `\n\nFirst, decide whether this is a CALCULATION question (math, physics, or chemistry problem that involves computing a numeric or symbolic result, an equation, or a formula) ` +
      `or a THEORY question (a definition, explanation, comparison, "why/what/describe" question, or any conceptual answer from a subject like Biology, Commerce, Statistics, etc. that is not a numeric computation).\n\n` +
      (aiSolveMode === 'detailed'
        ? (
          `If it is a CALCULATION question:\n` +
          `- Solve it step by step, and for each step also briefly explain WHY that step is done (the reasoning/rule/concept behind it), not just the raw calculation.\n` +
          `- Label each step plainly as "Step 1", "Step 2", etc.\n` +
          `- Then give the final answer on its own line starting with "Answer:".\n\n` +
          `If it is a THEORY question:\n` +
          `- Do NOT use "Step 1", "Step 2" labels. Answer thoroughly: give background/context, explain the concept in depth, and include an example if it helps understanding.\n` +
          `- Use short paragraphs, and use bullet points (each starting with "-") for lists, features, differences, or multi-part answers.\n` +
          `- Prioritize genuine understanding over brevity — this is a detailed, teaching-style explanation, like a tutor walking a student through it.\n` +
          `- If a short direct definition/answer fits, you may end with one line starting with "Answer:" as a one-line summary — this is optional for theory questions.\n\n`
        )
        : (
          `If it is a CALCULATION question:\n` +
          `- Solve it step by step. Show only the working, no long explanations or teaching commentary.\n` +
          `- Label each step plainly as "Step 1", "Step 2", etc., with only the calculation on that line — keep each step short, one line if possible.\n` +
          `- Then give the final answer on its own line starting with "Answer:".\n\n` +
          `If it is a THEORY question:\n` +
          `- Do NOT use "Step 1", "Step 2" labels. Instead answer directly in clear, well-organized plain language.\n` +
          `- Use short paragraphs, and use bullet points (each starting with "-") for lists, features, differences, or multi-part answers.\n` +
          `- Keep it concise and exam-ready — no filler or repetition.\n` +
          `- If a short direct definition/answer fits, you may end with one line starting with "Answer:" as a one-line summary — this is optional for theory questions.\n\n`
        )
      ) +
      `In both cases:\n` +
      `- Do NOT use LaTeX or the $ symbol anywhere, and do NOT use Markdown formatting (no **, no #, no backticks).\n` +
      `- Write all math using plain standard symbols only (like x^2, sqrt(x), 3/4, ×, ÷, π).\n` +
      `- Reply in ${langName}.`;

    const parts = [{ text: promptText }];
    if (aiImageBase64) {
      parts.push({ inline_data: { mime_type: aiImageMimeType || 'image/jpeg', data: aiImageBase64 } });
    }

    aiSolveBtn.disabled = true;
    const originalLabel = aiSolveBtn.textContent;
    aiSolveBtn.textContent = tr('ai_solving');
    renderResult(`<div class="ai-result-card"><span class="ai-loading">${escapeHtml(tr('ai_solving'))}</span></div>`);

    try {
      let response = null;
      let data = null;
      let lastErrText = '';

      for (let i = 0; i < GEMINI_MODELS.length; i++) {
        response = await fetch(GEMINI_ENDPOINT_FOR(GEMINI_MODELS[i]), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
        });

        data = await response.json().catch(() => null);

        if (response.ok) break;

        const serverMsg = (data && data.error && data.error.message) || '';
        lastErrText = serverMsg;
        const isModelGone = response.status === 404 && /no longer available|not found/i.test(serverMsg);

        // Only move to the next model if this one is gone; any other
        // error (bad key, quota, etc.) applies to every model equally.
        if (!isModelGone || i === GEMINI_MODELS.length - 1) break;
      }

      if (!response.ok) {
        const status = response.status;
        if (status === 400 || status === 401 || status === 403) {
          renderResult(`<div class="ai-result-card"><span class="ai-error">${escapeHtml(tr('ai_error_invalid_key'))}</span></div>`);
          aiKeyStatus.textContent = tr('ai_error_invalid_key');
          aiKeyStatus.classList.add('err');
        } else {
          renderResult(`<div class="ai-result-card"><span class="ai-error">${escapeHtml(lastErrText || tr('ai_error_request'))}</span></div>`);
        }
        return;
      }

      const candidate = data && data.candidates && data.candidates[0];
      const textOut = candidate && candidate.content && candidate.content.parts
        ? candidate.content.parts.map(p => p.text || '').join('\n')
        : '';

      if (!textOut) {
        renderResult(`<div class="ai-result-card"><span class="ai-error">${escapeHtml(tr('ai_error_request'))}</span></div>`);
        return;
      }

      renderResult(formatAnswer(textOut));

      // Auto-save every solve to history (full step-by-step answer included)
      // so past solves can be revisited for revision without needing to
      // remember to press a separate Save button.
      const answerLineMatch = textOut.match(/^\s*answer\s*[:.\-]?\s*(.*)$/im);
      lastSolved = {
        question: question || tr('ai_add_photo'),
        hadImage: !!aiImageBase64,
        answerText: answerLineMatch ? answerLineMatch[1].trim() : '',
        answerHtml: formatAnswer(textOut),
        rawText: textOut,
        time: Date.now(),
      };
      autoSaveSolve(lastSolved);
      if (aiSaveBtn) aiSaveBtn.style.display = 'none';
      if (aiExplainSimpleBtn) aiExplainSimpleBtn.style.display = 'inline-block';
    } catch (err) {
      renderResult(`<div class="ai-result-card"><span class="ai-error">${escapeHtml(tr('ai_error_request'))}</span></div>`);
    } finally {
      aiSolveBtn.disabled = false;
      aiSolveBtn.textContent = originalLabel;
    }
  }

  if (aiSolveBtn) {
    aiSolveBtn.addEventListener('click', solveWithGemini);
  }

  /* ============================================
     "EXPLAIN LIKE I'M CONFUSED" — takes the last
     solved question + solution and asks Gemini to
     re-explain the core idea with one simple,
     everyday-life analogy instead of raw steps.
     ============================================ */
  async function explainLastSolvedSimply() {
    if (!lastSolved || !aiSimpleExplainBox) return;
    const apiKey = getSavedKey();
    if (!apiKey) {
      aiKeyStatus.textContent = tr('ai_key_status_empty');
      aiKeyStatus.classList.add('err');
      aiApiKeyInput.focus();
      return;
    }

    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
    const langName = AI_LANG_NAMES[lang] || 'English';

    const promptText =
      `A student looked at the solution below and is still confused. Re-explain just the core idea/concept ` +
      `behind it in a simple, friendly way using ONE relatable everyday-life analogy (e.g. cooking, sports, money, travel, games) ` +
      `so a beginner can intuitively understand it. Do not repeat the full step-by-step math or redo the calculation.\n\n` +
      `Keep it short: 3-5 short sentences, warm conversational tone, like explaining to a friend.\n` +
      `Do NOT use LaTeX, the $ symbol, or Markdown formatting (no **, no #, no backticks). Use plain math symbols only if needed. ` +
      `Reply in ${langName}.\n\n` +
      `Question: ${lastSolved.question}\n\n` +
      `Original solution:\n${lastSolved.rawText || lastSolved.answerText || ''}`;

    aiExplainSimpleBtn.disabled = true;
    const originalLabel = aiExplainSimpleBtn.textContent;
    aiExplainSimpleBtn.textContent = tr('ai_explain_simple_loading');
    aiSimpleExplainBox.style.display = 'block';
    aiSimpleExplainBox.innerHTML = `<span class="ai-loading">${escapeHtml(tr('ai_explain_simple_loading'))}</span>`;

    try {
      let response = null, data = null, lastErrText = '';
      for (let i = 0; i < GEMINI_MODELS.length; i++) {
        response = await fetch(GEMINI_ENDPOINT_FOR(GEMINI_MODELS[i]), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: promptText }] }] }),
        });
        data = await response.json().catch(() => null);
        if (response.ok) break;
        const serverMsg = (data && data.error && data.error.message) || '';
        lastErrText = serverMsg;
        const isModelGone = response.status === 404 && /no longer available|not found/i.test(serverMsg);
        if (!isModelGone || i === GEMINI_MODELS.length - 1) break;
      }

      if (!response || !response.ok) {
        const status = response ? response.status : 0;
        const errMsg = (status === 400 || status === 401 || status === 403)
          ? tr('ai_error_invalid_key')
          : (lastErrText || tr('ai_explain_simple_error'));
        aiSimpleExplainBox.innerHTML = `<span class="ai-error">${escapeHtml(errMsg)}</span>`;
        return;
      }

      const candidate = data && data.candidates && data.candidates[0];
      const textOut = candidate && candidate.content && candidate.content.parts
        ? candidate.content.parts.map(p => p.text || '').join('\n')
        : '';

      if (!textOut) {
        aiSimpleExplainBox.innerHTML = `<span class="ai-error">${escapeHtml(tr('ai_explain_simple_error'))}</span>`;
        return;
      }

      aiSimpleExplainBox.innerHTML =
        `<div class="ai-simple-explain-label">&#129513; ${escapeHtml(tr('ai_explain_simple_label'))}</div>` +
        formatAnswer(textOut);
    } catch (err) {
      aiSimpleExplainBox.innerHTML = `<span class="ai-error">${escapeHtml(tr('ai_explain_simple_error'))}</span>`;
    } finally {
      aiExplainSimpleBtn.disabled = false;
      aiExplainSimpleBtn.textContent = originalLabel;
    }
  }

  if (aiExplainSimpleBtn) {
    aiExplainSimpleBtn.addEventListener('click', explainLastSolvedSimply);
  }

  /* Re-apply labels when the UI language changes (hooks into the same
     mechanism script.js uses, without overwriting an existing handler). */
  const previousOnLanguageChange = (typeof window.onLanguageChange === 'function') ? window.onLanguageChange : null;
  window.onLanguageChange = function () {
    if (previousOnLanguageChange) previousOnLanguageChange();
    if (aiKeyToggleBtn) aiKeyToggleBtn.textContent = tr(aiKeyVisible ? 'ai_key_hide' : 'ai_key_show');
    if (aiVoiceBtn && SpeechRecognitionCtor) setVoiceButtonState(isListening);
    renderSavedList();
  };
})();
/* ============================================
   AI SOLVER: PHOTO CROP / ROTATE TOOL
   Pure client-side canvas cropping — nothing is
   uploaded anywhere until "Apply" is pressed and
   the user hits Solve.
   ============================================ */
(function () {
  const overlay = document.getElementById('aiCropOverlay');
  const stage = document.getElementById('aiCropStage');
  const img = document.getElementById('aiCropImg');
  const box = document.getElementById('aiCropBox');
  const closeBtn = document.getElementById('aiCropCloseBtn');
  const cancelBtn = document.getElementById('aiCropCancelBtn');
  const applyBtn = document.getElementById('aiCropApplyBtn');
  const resetBtn = document.getElementById('aiCropResetBtn');
  const rotateLeftBtn = document.getElementById('aiCropRotateLeftBtn');
  const rotateRightBtn = document.getElementById('aiCropRotateRightBtn');
  if (!overlay || !img || !box) return;

  let rotation = 0; // 0, 90, 180, 270
  let rotatedDataUrl = null; // current image after rotation, before crop
  let cropRect = { x: 0, y: 0, w: 0, h: 0 }; // in CSS px, relative to stage's image box

  function rotateImageDataUrl(dataUrl, deg) {
    return new Promise((resolve) => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        const rad = deg * Math.PI / 180;
        const swap = deg % 180 !== 0;
        canvas.width = swap ? image.height : image.width;
        canvas.height = swap ? image.width : image.height;
        const c = canvas.getContext('2d');
        c.translate(canvas.width / 2, canvas.height / 2);
        c.rotate(rad);
        c.drawImage(image, -image.width / 2, -image.height / 2);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      };
      image.src = dataUrl;
    });
  }

  function resetCropBoxToDefault() {
    // Centered box covering 80% of the displayed image.
    const iw = img.clientWidth, ih = img.clientHeight;
    const w = iw * 0.8, h = ih * 0.8;
    cropRect = { x: (iw - w) / 2, y: (ih - h) / 2, w, h };
    paintCropBox();
  }

  function paintCropBox() {
    const imgLeft = img.offsetLeft, imgTop = img.offsetTop;
    box.style.left = (imgLeft + cropRect.x) + 'px';
    box.style.top = (imgTop + cropRect.y) + 'px';
    box.style.width = cropRect.w + 'px';
    box.style.height = cropRect.h + 'px';
  }

  window.openAiCropModal = async function (originalDataUrl) {
    rotation = 0;
    rotatedDataUrl = originalDataUrl;
    img.src = rotatedDataUrl;
    overlay.classList.add('open');
    await new Promise(r => { img.onload = r; if (img.complete) r(); });
    resetCropBoxToDefault();
  };

  function closeModal() { overlay.classList.remove('open'); }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  resetBtn.addEventListener('click', resetCropBoxToDefault);

  async function rotate(deg) {
    rotation = (rotation + deg + 360) % 360;
    rotatedDataUrl = await rotateImageDataUrl(rotatedDataUrl, deg);
    img.src = rotatedDataUrl;
    await new Promise(r => { img.onload = r; if (img.complete) r(); });
    resetCropBoxToDefault();
  }
  rotateLeftBtn.addEventListener('click', () => rotate(-90));
  rotateRightBtn.addEventListener('click', () => rotate(90));

  /* ---- Drag to move / resize the crop box ---- */
  let dragMode = null; // 'move' | 'nw' | 'ne' | 'sw' | 'se'
  let dragStart = null;

  function pointerPos(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function onDragStart(e, mode) {
    dragMode = mode;
    const p = pointerPos(e);
    dragStart = { x: p.x, y: p.y, rect: Object.assign({}, cropRect) };
    e.preventDefault();
    e.stopPropagation();
  }

  box.addEventListener('mousedown', (e) => { if (e.target === box) onDragStart(e, 'move'); });
  box.addEventListener('touchstart', (e) => { if (e.target === box) onDragStart(e, 'move'); }, { passive: false });
  box.querySelectorAll('.ai-crop-handle').forEach(h => {
    h.addEventListener('mousedown', (e) => onDragStart(e, h.dataset.handle));
    h.addEventListener('touchstart', (e) => onDragStart(e, h.dataset.handle), { passive: false });
  });

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  function onDragMove(e) {
    if (!dragMode) return;
    const p = pointerPos(e);
    const dx = p.x - dragStart.x, dy = p.y - dragStart.y;
    const iw = img.clientWidth, ih = img.clientHeight;
    const MIN = 30;
    let r = Object.assign({}, dragStart.rect);

    if (dragMode === 'move') {
      r.x = clamp(dragStart.rect.x + dx, 0, iw - r.w);
      r.y = clamp(dragStart.rect.y + dy, 0, ih - r.h);
    } else {
      if (dragMode.includes('w')) {
        const newX = clamp(dragStart.rect.x + dx, 0, dragStart.rect.x + dragStart.rect.w - MIN);
        r.w = dragStart.rect.w - (newX - dragStart.rect.x);
        r.x = newX;
      }
      if (dragMode.includes('e')) {
        r.w = clamp(dragStart.rect.w + dx, MIN, iw - dragStart.rect.x);
      }
      if (dragMode.includes('n')) {
        const newY = clamp(dragStart.rect.y + dy, 0, dragStart.rect.y + dragStart.rect.h - MIN);
        r.h = dragStart.rect.h - (newY - dragStart.rect.y);
        r.y = newY;
      }
      if (dragMode.includes('s')) {
        r.h = clamp(dragStart.rect.h + dy, MIN, ih - dragStart.rect.y);
      }
    }
    cropRect = r;
    paintCropBox();
    e.preventDefault();
  }

  function onDragEnd() { dragMode = null; dragStart = null; }

  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('mouseup', onDragEnd);
  window.addEventListener('touchend', onDragEnd);

  applyBtn.addEventListener('click', () => {
    // Map the on-screen crop box (CSS px, relative to the displayed image)
    // to the rotated image's natural pixel dimensions.
    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;
    const sx = cropRect.x * scaleX;
    const sy = cropRect.y * scaleY;
    const sw = cropRect.w * scaleX;
    const sh = cropRect.h * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sw));
    canvas.height = Math.max(1, Math.round(sh));
    const c = canvas.getContext('2d');
    c.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const outDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    if (typeof window.onAiCropApplied === 'function') window.onAiCropApplied(outDataUrl);
    closeModal();
  });

  window.addEventListener('resize', () => {
    if (overlay.classList.contains('open')) resetCropBoxToDefault();
  });
})();
