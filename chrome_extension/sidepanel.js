// Gemini Nano Studio - Chrome Extension Side Panel Logic

let currentSession = null;
let currentLanguage = 'he'; // 'he' or 'en'
let currentTheme = 'dark';   // 'dark' or 'light'
let isGenerating = false;
let abortController = null;
let conversationHistory = [];
let activeChatId = 'chat_ext_' + Date.now();

let speechRecognition = null;
let isRecordingVoice = false;

const PERSONAS = {
  general: {
    nameHe: 'עוזר כללי',
    nameEn: 'General Assistant',
    prompt: 'אתה Gemini Nano, עוזר בינה מלאכותית מקומי, חכם ופרטי. כלל ברזל: עליך להשיב תמיד בדיוק באותה השפה שבה נשאלת השאלה (עברית לשאלות בעברית, אנגלית לאנגלית).'
  },
  coding: {
    nameHe: 'מתכנת Senior',
    nameEn: 'Senior Developer',
    prompt: 'אתה מהנדס תוכנה בכיר. כתוב קוד נקי, מודרני ומאובטח. ספק הסברים קצרים ומדויקים בשפת השואל.'
  },
  writer: {
    nameHe: 'עורך לשוני',
    nameEn: 'Editor & Copywriter',
    prompt: 'אתה עורך לשוני מקצועי. שכתב, תקן שגיאות ושפר ניסוחים תוך שמירה על משלב שפה גבוה בשפת הטקסט המקורי.'
  },
  summarizer: {
    nameHe: 'מומחה סיכום',
    nameEn: 'Summarizer Pro',
    prompt: 'אתה מומחה לסיכום מידע. סכם טקסטים ומאמרים בצורה תמציתית ומובנית: כותרת, 3-5 נקודות מפתח, ומסקנה סופית.'
  },
  translator: {
    nameHe: 'מתרגם מומחה',
    nameEn: 'Expert Translator',
    prompt: 'אתה מתרגם מקצועי דו-כיווני. תרגם טקסטים בצורה טבעית, מדויקת ונאמנה למקור.'
  }
};

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadSavedSettings();
  initEngineStatus();
  await checkPendingAction();
});

// Setup UI Event Listeners
function setupEventListeners() {
  const input = document.getElementById('userInput');
  const sendBtn = document.getElementById('sendBtn');
  const newChatBtn = document.getElementById('newChatBtn');
  const clearChatBtn = document.getElementById('clearChatBtn');
  const langToggleBtn = document.getElementById('langToggleBtn');
  const openStudioBtn = document.getElementById('openStudioBtn');
  const personaSelect = document.getElementById('personaSelect');
  const refreshBtn = document.getElementById('refreshPanelBtn');
  const themeBtn = document.getElementById('themeToggleBtn');
  const exportBtn = document.getElementById('exportChatBtn');
  const voiceBtn = document.getElementById('voiceBtn');

  // Quick tool chips
  document.getElementById('toolSummarizePage').addEventListener('click', handleSummarizePage);
  document.getElementById('toolExplainSelection').addEventListener('click', handleExplainSelection);
  document.getElementById('toolTranslate').addEventListener('click', handleTranslateSelection);
  document.getElementById('toolRewrite').addEventListener('click', handleRewriteSelection);
  document.getElementById('toolCodeSnippet').addEventListener('click', handleCodeSnippet);
  document.getElementById('toolSpellCheck').addEventListener('click', handleSpellCheck);

  // 1. Refresh Button Click
  if (refreshBtn) {
    refreshBtn.addEventListener('click', handleRefresh);
  }

  // 5. Theme Toggle Click
  if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
  }

  // 4. Export Chat Click
  if (exportBtn) {
    exportBtn.addEventListener('click', exportChatHistory);
  }

  // 3. Voice Dictation Click
  if (voiceBtn) {
    voiceBtn.addEventListener('click', toggleVoiceDictation);
  }

  // Send message events
  sendBtn.addEventListener('click', () => {
    if (isGenerating) {
      stopGeneration();
    } else {
      sendMessage();
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  newChatBtn.addEventListener('click', startNewChat);
  clearChatBtn.addEventListener('click', startNewChat);
  langToggleBtn.addEventListener('click', toggleLanguage);
  
  openStudioBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'http://127.0.0.1:8765/gemini_nano_chat.html' });
  });

  personaSelect.addEventListener('change', () => {
    destroySession();
  });

  // Listen for context menu messages
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action) {
      handleIncomingAction(request);
    }
  });
}

// 1. Handle Refresh Action
function handleRefresh() {
  const icon = document.getElementById('refreshIconSvg');
  if (icon) icon.classList.add('rotating');

  destroySession();
  initEngineStatus();

  setTimeout(() => {
    if (icon) icon.classList.remove('rotating');
    showToast(currentLanguage === 'en' ? 'Refreshed & Ready!' : 'המערכת רועננה בהצלחה!');
  }, 600);
}

// 5. Theme Switcher (Dark / Light)
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(currentTheme);
  chrome.storage.local.set({ sidepanel_theme: currentTheme });
  showToast(currentTheme === 'light' ? 'מצב תצוגה בהיר' : 'מצב תצוגה כהה');
}

function applyTheme(theme) {
  const themeSvg = document.getElementById('themeIconSvg');
  if (theme === 'light') {
    document.body.classList.add('theme-light');
    if (themeSvg) {
      themeSvg.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    }
  } else {
    document.body.classList.remove('theme-light');
    if (themeSvg) {
      themeSvg.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }
}

// 4. Export Chat History to Markdown (.md)
function exportChatHistory() {
  if (!conversationHistory || conversationHistory.length === 0) {
    showToast(currentLanguage === 'en' ? 'No messages to export' : 'אין הודעות לייצוא בשיחה זו');
    return;
  }

  let mdContent = `# 💬 שיחת Gemini Nano Studio\n*תאריך: ${new Date().toLocaleString()}*\n\n---\n\n`;
  conversationHistory.forEach(msg => {
    const roleName = msg.role === 'user' ? '🧑 **משתמש**' : '✨ **Gemini Nano**';
    mdContent += `### ${roleName}:\n${msg.content}\n\n`;
  });

  const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Gemini_Nano_Chat_${new Date().toISOString().slice(0,10)}.md`;
  a.click();
  URL.revokeObjectURL(url);

  showToast(currentLanguage === 'en' ? 'Chat exported successfully!' : 'השיחה יוצאה בהצלחה כקובץ MD!');
}

// 3. Voice Dictation (Web Speech API)
function toggleVoiceDictation() {
  const voiceBtn = document.getElementById('voiceBtn');
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRec) {
    showToast(currentLanguage === 'en' ? 'Voice input is not supported in this browser' : 'זיהוי קולי אינו נתמך בדפדפן זה');
    return;
  }

  if (isRecordingVoice) {
    if (speechRecognition) speechRecognition.stop();
    isRecordingVoice = false;
    voiceBtn.classList.remove('recording');
    return;
  }

  try {
    speechRecognition = new SpeechRec();
    speechRecognition.lang = currentLanguage === 'en' ? 'en-US' : 'he-IL';
    speechRecognition.interimResults = true;
    speechRecognition.continuous = false;

    speechRecognition.onstart = () => {
      isRecordingVoice = true;
      voiceBtn.classList.add('recording');
      showToast(currentLanguage === 'en' ? 'Listening...' : 'מקשיב... דבר כעת');
    };

    speechRecognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript)
        .join('');
      const input = document.getElementById('userInput');
      input.value = transcript;
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    };

    speechRecognition.onerror = () => {
      isRecordingVoice = false;
      voiceBtn.classList.remove('recording');
    };

    speechRecognition.onend = () => {
      isRecordingVoice = false;
      voiceBtn.classList.remove('recording');
    };

    speechRecognition.start();
  } catch (e) {
    isRecordingVoice = false;
    voiceBtn.classList.remove('recording');
  }
}

// Universal AI Engine Locator
function getLocalAIEngine() {
  if (typeof LanguageModel !== 'undefined') return LanguageModel;
  if (typeof window.LanguageModel !== 'undefined') return window.LanguageModel;
  if (typeof window.ai !== 'undefined') {
    if (window.ai.languageModel) return window.ai.languageModel;
    if (window.ai.assistant) return window.ai.assistant;
    return window.ai;
  }
  if (typeof self !== 'undefined' && self.ai && self.ai.languageModel) return self.ai.languageModel;
  if (typeof ai !== 'undefined' && ai.languageModel) return ai.languageModel;
  return null;
}

function initEngineStatus() {
  const statusText = document.getElementById('modelStatusText');
  const statusPill = document.getElementById('modelStatusPill');
  if (statusText) statusText.textContent = 'Nano Ready';
  if (statusPill) {
    statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
    statusPill.style.color = '#34d399';
    statusPill.title = 'מנוע Gemini Nano זמין ומוכן לקבל שאלות וסיכומי עמודים';
  }
}

// Create or get active AI session
async function getOrCreateSession(systemPrompt) {
  if (currentSession) return currentSession;

  const engine = getLocalAIEngine();
  if (engine && typeof engine.create === 'function') {
    try {
      currentSession = await engine.create({
        systemPrompt: systemPrompt,
        temperature: 0.7,
        topK: 3
      });
      return currentSession;
    } catch (e) {
      try {
        currentSession = await engine.create({ systemPrompt: systemPrompt });
        return currentSession;
      } catch (inner) {
        currentSession = await engine.create();
        return currentSession;
      }
    }
  }
  return null;
}

function destroySession() {
  if (currentSession) {
    try { if (typeof currentSession.destroy === 'function') currentSession.destroy(); } catch (e) {}
    currentSession = null;
  }
}

// Master AI Execution (Extension context -> Active tab execution -> Local server fallback)
async function executeNanoPrompt(promptText, onChunk) {
  const selectedPersona = document.getElementById('personaSelect').value || 'general';
  const systemPrompt = PERSONAS[selectedPersona].prompt;

  // Path 1: Direct in-extension engine
  try {
    const session = await getOrCreateSession(systemPrompt);
    if (session) {
      if (typeof session.promptStreaming === 'function') {
        const stream = session.promptStreaming(promptText, { signal: abortController.signal });
        let accumulated = '';
        for await (const chunk of stream) {
          if (chunk.startsWith(accumulated)) {
            accumulated = chunk;
          } else {
            accumulated += chunk;
          }
          onChunk(accumulated);
        }
        return accumulated;
      } else if (typeof session.prompt === 'function') {
        const res = await session.prompt(promptText, { signal: abortController.signal });
        onChunk(res);
        return res;
      }
    }
  } catch (err) {
    console.warn('Direct extension prompt exception:', err);
    destroySession();
  }

  // Path 2: Execution via Active Web Tab
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [promptText, systemPrompt],
        func: async (p, s) => {
          const eng = (typeof LanguageModel !== 'undefined') ? LanguageModel : (window.ai ? (window.ai.languageModel || window.ai) : null);
          if (!eng) throw new Error('Prompt API not accessible in tab');
          const sess = await eng.create({ systemPrompt: s }).catch(() => eng.create());
          return await sess.prompt(p);
        }
      });

      if (results && results[0] && results[0].result) {
        const resultText = results[0].result;
        onChunk(resultText);
        return resultText;
      }
    }
  } catch (tabErr) {
    console.warn('Active tab prompt exception:', tabErr);
  }

  // Path 3: Local Server Gateway (http://127.0.0.1:8765)
  try {
    const res = await fetch('http://127.0.0.1:8765/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer gn-local-dev' },
      body: JSON.stringify({
        model: 'gemini-nano',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptText }]
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.choices && data.choices[0]?.message?.content) {
        const serverText = data.choices[0].message.content;
        onChunk(serverText);
        return serverText;
      }
    }
  } catch (serverErr) {}

  throw new Error('לא ניתן להריץ את המודל בסרגל הצד כרגע. פתח עמוד אינטרנט רגיל בדפדפן (למשל Google, ויקיפדיה וכד\') כדי לסכם או להפעיל את המודל.');
}

// Send user message and stream assistant response
async function sendMessage(overrideText = null) {
  const input = document.getElementById('userInput');
  const text = (overrideText || input.value).trim();
  if (!text || isGenerating) return;

  if (!overrideText) {
    input.value = '';
    input.style.height = 'auto';
  }

  // Remove empty state if visible
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.remove();

  // Append user message to UI
  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });

  // Prepare assistant message placeholder
  const aiBubble = appendMessage('ai', '', true);
  const contentElem = aiBubble.querySelector('.msg-content');

  setGeneratingState(true);
  abortController = new AbortController();

  let accumulatedText = '';

  try {
    accumulatedText = await executeNanoPrompt(text, (chunk) => {
      accumulatedText = chunk;
      contentElem.innerHTML = renderMarkdown(accumulatedText);
      attachCodeCopyListeners(contentElem);
      scrollChatToBottom();
    });

    conversationHistory.push({ role: 'assistant', content: accumulatedText });
    saveConversationHistory();

  } catch (err) {
    if (err.name === 'AbortError') {
      accumulatedText += '\n\n*[התשובה נעצרה]*';
    } else {
      accumulatedText = '⚠️ ' + (err.message || String(err));
    }
    contentElem.innerHTML = renderMarkdown(accumulatedText);
    attachCodeCopyListeners(contentElem);
  } finally {
    setGeneratingState(false);
    contentElem.classList.remove('typing-cursor');
    scrollChatToBottom();
  }
}

function setGeneratingState(generating) {
  isGenerating = generating;
  const sendBtn = document.getElementById('sendBtn');
  if (generating) {
    sendBtn.classList.add('stop');
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
    sendBtn.title = 'עצור יצירה';
  } else {
    sendBtn.classList.remove('stop');
    sendBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    sendBtn.title = 'שלח הודעה';
  }
}

function stopGeneration() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

// 2. Append message bubble to chat feed with Copy button
function appendMessage(role, content, isLive = false) {
  const feed = document.getElementById('chatFeed');
  const row = document.createElement('div');
  row.className = 'message-row ' + role;

  const header = document.createElement('div');
  header.className = 'msg-header';

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar ' + role;
  avatar.textContent = role === 'user' ? '🧑' : '✨';
  header.appendChild(avatar);

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';
  if (isLive) contentDiv.classList.add('typing-cursor');
  contentDiv.innerHTML = renderMarkdown(content);
  bubble.appendChild(contentDiv);

  row.appendChild(header);
  row.appendChild(bubble);

  // 2. Copy entire response button for AI responses
  if (role === 'ai') {
    const actions = document.createElement('div');
    actions.className = 'msg-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'msg-action-btn';
    copyBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> <span>העתק</span>';
    copyBtn.title = 'העתק תשובה מלאה';

    copyBtn.addEventListener('click', () => {
      const plainText = contentDiv.innerText || contentDiv.textContent;
      navigator.clipboard.writeText(plainText).then(() => {
        copyBtn.innerHTML = '<span style="color: #10b981;">✓ הועתק!</span>';
        setTimeout(() => {
          copyBtn.innerHTML = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> <span>העתק</span>';
        }, 1500);
      });
    });

    actions.appendChild(copyBtn);
    row.appendChild(actions);
  }

  attachCodeCopyListeners(contentDiv);
  feed.appendChild(row);
  scrollChatToBottom();

  return row;
}

// 2. Attach Copy Button to individual code blocks
function attachCodeCopyListeners(container) {
  container.querySelectorAll('.code-copy-btn').forEach(btn => {
    if (!btn.dataset.hasListener) {
      btn.dataset.hasListener = 'true';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wrapper = btn.closest('.code-block-wrapper');
        const codeElem = wrapper ? wrapper.querySelector('pre code') : null;
        if (codeElem) {
          navigator.clipboard.writeText(codeElem.innerText).then(() => {
            const orig = btn.textContent;
            btn.textContent = '✓ הועתק';
            btn.style.color = '#34d399';
            setTimeout(() => {
              btn.textContent = orig;
              btn.style.color = '';
            }, 1500);
          });
        }
      });
    }
  });
}

function scrollChatToBottom() {
  const feed = document.getElementById('chatFeed');
  if (feed) feed.scrollTop = feed.scrollHeight;
}

function startNewChat() {
  destroySession();
  conversationHistory = [];
  activeChatId = 'chat_ext_' + Date.now();
  chrome.storage.local.remove('sidepanel_history');

  const feed = document.getElementById('chatFeed');
  const title = currentLanguage === 'en' ? 'Gemini Nano in Browser' : 'Gemini Nano בסרגל הצד';
  const desc = currentLanguage === 'en' ? '100% private, on-device AI assistant. Summarize pages, explain code, and chat.' : 'עוזר בינה מלאכותית מקומי ופרטי ב-100%. שאל שאלות, סכם עמודים ותרגם טקסטים ללא צורך בענן.';
  feed.innerHTML = `
    <div id="emptyState" class="empty-state">
      <div class="empty-icon">✨</div>
      <h3 class="empty-title">${title}</h3>
      <p class="empty-desc">${desc}</p>
    </div>
  `;
}

// Page Context Actions & 6. Quick Prompts
async function handleSummarizePage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || tab.url.startsWith('chrome://')) {
      sendMessage('סכם את העמוד הנוכחי');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const clone = document.body.cloneNode(true);
        ['script', 'style', 'nav', 'footer', 'header', 'aside', '.ad', '.ads'].forEach(s => {
          clone.querySelectorAll(s).forEach(e => e.remove());
        });
        const text = (clone.innerText || '').replace(/\s+/g, ' ').trim().substring(0, 10000);
        return { title: document.title, text: text, url: window.location.href };
      }
    });

    if (results && results[0] && results[0].result) {
      const { title, text, url } = results[0].result;
      const prompt = `[סכם את תוכן העמוד הבא בצורה תמציתית ומובנית, עם כותרת, 3-5 נקודות מפתח ומסקנה]\n\nכותרת: ${title}\nקישור: ${url}\n\nתוכן המאמר:\n${text}`;
      sendMessage(prompt);
    }
  } catch (e) {
    sendMessage('סכם את העמוד הנוכחי');
  }
}

async function handleExplainSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || tab.url.startsWith('chrome://')) {
      sendMessage('הסבר את המושג או הטקסט שסימנתי');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = results?.[0]?.result?.trim();
    if (selectedText) {
      sendMessage(`[הסבר בצורה ברורה ומעמיקה את הקטע הבא]:\n\n"${selectedText}"`);
    } else {
      sendMessage('הסבר את המושג או הטקסט שסימנתי בדפדפן');
    }
  } catch (e) {
    sendMessage('הסבר את הטקסט המסומן');
  }
}

async function handleTranslateSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || tab.url.startsWith('chrome://')) {
      sendMessage('תרגם את הטקסט המסומן לעברית');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = results?.[0]?.result?.trim();
    if (selectedText) {
      sendMessage(`[תרגם את הטקסט הבא לעברית בצורה רהוטה וטבעית]:\n\n"${selectedText}"`);
    } else {
      sendMessage('תרגם את הטקסט המסומן לעברית');
    }
  } catch (e) {}
}

async function handleRewriteSelection() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || tab.url.startsWith('chrome://')) {
      sendMessage('שכתב ושפר את הטקסט המסומן');
      return;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString()
    });

    const selectedText = results?.[0]?.result?.trim();
    if (selectedText) {
      sendMessage(`[שכתב את הטקסט הבא במשלב מקצועי, ברור ומשכנע]:\n\n"${selectedText}"`);
    } else {
      sendMessage('שכתב ושפר את הטקסט המסומן');
    }
  } catch (e) {}
}

// 6. Quick Prompt Presets
async function handleCodeSnippet() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let selected = '';
    if (tab && tab.id && !tab.url.startsWith('chrome://')) {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });
      selected = res?.[0]?.result?.trim() || '';
    }
    if (selected) {
      sendMessage(`[נתח את קטע הקוד הבא, הסבר מה הוא עושה והצע שיפורים או תיקוני באגים]:\n\`\`\`\n${selected}\n\`\`\``);
    } else {
      sendMessage('כתוב פונקציה נקייה ומודרנית עבור המשימה הבאה:');
    }
  } catch (e) {
    sendMessage('הסבר את קטע הקוד שסימנתי');
  }
}

async function handleSpellCheck() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let selected = '';
    if (tab && tab.id && !tab.url.startsWith('chrome://')) {
      const res = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString()
      });
      selected = res?.[0]?.result?.trim() || '';
    }
    if (selected) {
      sendMessage(`[בדוק שגיאות כתיב, פיסוק ודקדוק בקטע הבא והחזר גרסה מתוקנת ומלוטשת]:\n\n"${selected}"`);
    } else {
      sendMessage('בדוק שגיאות כתיב והגהה בטקסט הבא:');
    }
  } catch (e) {}
}

// Handle Context Menu triggers
async function checkPendingAction() {
  const { pendingAction } = await chrome.storage.local.get('pendingAction');
  if (pendingAction && (Date.now() - pendingAction.timestamp < 30000)) {
    await chrome.storage.local.remove('pendingAction');
    handleIncomingAction(pendingAction);
  }
}

function handleIncomingAction(data) {
  const { action, selectionText } = data;
  if (action === 'explain_selection' && selectionText) {
    sendMessage(`[הסבר בצורה ברורה את הקטע הבא]:\n\n"${selectionText}"`);
  } else if (action === 'summarize_selection' && selectionText) {
    sendMessage(`[סכם את הקטע הבא בנקודות מרכזיות]:\n\n"${selectionText}"`);
  } else if (action === 'translate_hebrew' && selectionText) {
    sendMessage(`[תרגם לעברית בצורה שוטפת ואיכותית]:\n\n"${selectionText}"`);
  } else if (action === 'rewrite_text' && selectionText) {
    sendMessage(`[שכתב ושפר את הניסוח של הטקסט הבא]:\n\n"${selectionText}"`);
  } else if (action === 'summarize_page') {
    handleSummarizePage();
  }
}

// Language toggle (Hebrew / English)
function toggleLanguage() {
  currentLanguage = currentLanguage === 'he' ? 'en' : 'he';
  document.documentElement.setAttribute('dir', currentLanguage === 'he' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLanguage);

  const langBtn = document.getElementById('langToggleBtn');
  langBtn.querySelector('span').textContent = currentLanguage === 'he' ? 'EN' : 'עב';

  const input = document.getElementById('userInput');
  input.placeholder = currentLanguage === 'en' 
    ? 'Ask Gemini Nano or summarize this page...' 
    : 'שאל את Gemini Nano או סכם את העמוד...';

  chrome.storage.local.set({ sidepanel_lang: currentLanguage });
  destroySession();
}

async function loadSavedSettings() {
  const { sidepanel_lang, sidepanel_history, sidepanel_active_chat_id, sidepanel_theme } = await chrome.storage.local.get(['sidepanel_lang', 'sidepanel_history', 'sidepanel_active_chat_id', 'sidepanel_theme']);
  
  if (sidepanel_theme) {
    currentTheme = sidepanel_theme;
    applyTheme(currentTheme);
  }

  if (sidepanel_lang) {
    currentLanguage = sidepanel_lang;
    document.documentElement.setAttribute('dir', currentLanguage === 'he' ? 'rtl' : 'ltr');
    document.documentElement.setAttribute('lang', currentLanguage);
    document.getElementById('langToggleBtn').querySelector('span').textContent = currentLanguage === 'he' ? 'EN' : 'עב';
  }

  if (sidepanel_active_chat_id) {
    activeChatId = sidepanel_active_chat_id;
  }

  if (sidepanel_history && sidepanel_history.length > 0) {
    conversationHistory = sidepanel_history;
    const emptyState = document.getElementById('emptyState');
    if (emptyState) emptyState.remove();

    conversationHistory.forEach(msg => {
      appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
    });
  }
}

function saveConversationHistory() {
  const payload = conversationHistory.slice(-30);
  chrome.storage.local.set({
    sidepanel_history: payload,
    sidepanel_active_chat_id: activeChatId
  });

  // Sync to shared global storage schema
  const sharedConversation = {
    id: activeChatId,
    title: conversationHistory[0]?.content ? conversationHistory[0].content.substring(0, 30) : 'שיחת סרגל צד (Extension)',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: payload
  };

  chrome.storage.local.get('gemini_nano_conversations', (res) => {
    let list = res.gemini_nano_conversations || [];
    const existingIdx = list.findIndex(c => c.id === activeChatId);
    if (existingIdx >= 0) {
      list[existingIdx] = sharedConversation;
    } else {
      list.unshift(sharedConversation);
    }
    chrome.storage.local.set({ gemini_nano_conversations: list.slice(0, 50) });
  });
}

function showToast(msg) {
  const old = document.querySelector('.toast-msg');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// 2. Lightweight Markdown Formatter with Code Box & Copy button support
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks with header & copy button
  html = html.replace(/```([a-z0-9]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
    const langLabel = lang || 'code';
    return `<div class="code-block-wrapper">
      <div class="code-block-header">
        <span>${langLabel}</span>
        <button class="code-copy-btn">העתק קוד</button>
      </div>
      <pre><code>${code.trim()}</code></pre>
    </div>`;
  });

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');

  // Bold / Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet Lists
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');

  // Blockquotes
  html = html.replace(/^>\s+(.*$)/gim, '<blockquote style="border-right: 3px solid #3b82f6; padding-right: 8px; color: #94a3b8;">$1</blockquote>');

  // Line breaks
  html = html.replace(/\n\n/g, '<p></p>');
  html = html.replace(/\n/g, '<br>');

  return html;
}
