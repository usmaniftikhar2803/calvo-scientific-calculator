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
  const aiResultBox = document.getElementById('aiResultBox');
  const aiSavedList = document.getElementById('aiSavedList');
  const aiClearSavedBtn = document.getElementById('aiClearSavedBtn');

  if (!aiApiKeyInput) return; // AI Solver tab not present

  let aiImageBase64 = null;
  let aiImageMimeType = null;
  let aiKeyVisible = false;

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
        aiImageBase64 = String(reader.result).split(',')[1] || null;
        aiImagePreview.src = String(reader.result);
        aiImagePreview.style.display = 'block';
        aiImageFilename.textContent = file.name;
        aiImageClearBtn.style.display = 'inline-flex';
      };
      reader.readAsDataURL(file);
    });
  }

  function clearImage() {
    aiImageBase64 = null;
    aiImageMimeType = null;
    aiImageInput.value = '';
    aiImagePreview.removeAttribute('src');
    aiImagePreview.style.display = 'none';
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
        if (event.results[i].isFinal) finalTranscript += transcript;
        else interim += transcript;
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
    const list = loadSavedList();
    aiSavedList.innerHTML = '';
    if (list.length === 0) {
      aiSavedList.innerHTML = `<div class="formula-empty">${escapeHtml(tr('ai_no_saved'))}</div>`;
      return;
    }
    list.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'ai-saved-item';
      div.innerHTML =
        `<button class="ai-saved-delete" type="button" title="&#10005;">&#10005;</button>` +
        `<div class="ai-saved-question">${escapeHtml(item.question)}</div>` +
        (item.answerText ? `<div class="ai-saved-answer">${escapeHtml(item.answerText)}</div>` : '') +
        `<div class="ai-saved-time">${escapeHtml(formatSavedTime(item.time))}</div>`;
      div.querySelector('.ai-saved-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        const current = loadSavedList();
        current.splice(idx, 1);
        persistSavedList(current);
        renderSavedList();
      });
      aiSavedList.appendChild(div);
    });
  }

  function saveCurrentSolve() {
    if (!lastSolved) return;
    const list = loadSavedList();
    list.unshift(lastSolved);
    persistSavedList(list);
    renderSavedList();
    if (aiSaveBtn) {
      const original = aiSaveBtn.textContent;
      aiSaveBtn.disabled = true;
      aiSaveBtn.textContent = '\u2713';
      setTimeout(() => {
        aiSaveBtn.disabled = false;
        aiSaveBtn.textContent = original;
      }, 900);
    }
  }

  function resetSolver() {
    aiQuestionInput.value = '';
    clearImage();
    renderResult('');
    lastSolved = null;
    if (aiSaveBtn) aiSaveBtn.style.display = 'none';
  }

  if (aiSaveBtn) {
    aiSaveBtn.addEventListener('click', saveCurrentSolve);
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
    lastSolved = null;

    const lang = (typeof currentLang !== 'undefined' && currentLang) ? currentLang : 'en';
    const langName = AI_LANG_NAMES[lang] || 'English';

    const promptText =
      (question || 'Solve the problem shown in the attached photo.') +
      `\n\nFirst, decide whether this is a CALCULATION question (math, physics, or chemistry problem that involves computing a numeric or symbolic result, an equation, or a formula) ` +
      `or a THEORY question (a definition, explanation, comparison, "why/what/describe" question, or any conceptual answer from a subject like Biology, Commerce, Statistics, etc. that is not a numeric computation).\n\n` +
      `If it is a CALCULATION question:\n` +
      `- Solve it step by step. Show only the working, no long explanations or teaching commentary.\n` +
      `- Label each step plainly as "Step 1", "Step 2", etc., with only the calculation on that line — keep each step short, one line if possible.\n` +
      `- Then give the final answer on its own line starting with "Answer:".\n\n` +
      `If it is a THEORY question:\n` +
      `- Do NOT use "Step 1", "Step 2" labels. Instead answer directly in clear, well-organized plain language.\n` +
      `- Use short paragraphs, and use bullet points (each starting with "-") for lists, features, differences, or multi-part answers.\n` +
      `- Keep it concise and exam-ready — no filler or repetition.\n` +
      `- If a short direct definition/answer fits, you may end with one line starting with "Answer:" as a one-line summary — this is optional for theory questions.\n\n` +
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

      // Pull out the "Answer:" line (if any) for a short preview in the
      // saved list, and remember everything needed to save this solve.
      const answerLineMatch = textOut.match(/^\s*answer\s*[:.\-]?\s*(.*)$/im);
      lastSolved = {
        question: question || tr('ai_add_photo'),
        hadImage: !!aiImageBase64,
        answerText: answerLineMatch ? answerLineMatch[1].trim() : '',
        time: Date.now(),
      };
      if (aiSaveBtn) aiSaveBtn.style.display = '';
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
