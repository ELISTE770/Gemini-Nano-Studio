// Gemini Nano Studio - Chrome Extension Side Panel Logic

let currentSession = null;
let currentLanguage = 'he'; // 'he' or 'en'
let isGenerating = false;
let abortController = null;
let conversationHistory = [];
let activeChatId = 'chat_ext_' + Date.now();

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
  await checkEngineAvailability();
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
  const statusPill = document.getElementById('modelStatusPill');

  // Quick tool chips
  document.getElementById('toolSummarizePage').addEventListener('click', handleSummarizePage);
  document.getElementById('toolExplainSelection').addEventListener('click', handleExplainSelection);
  document.getElementById('toolTranslate').addEventListener('click', handleTranslateSelection);
  document.getElementById('toolRewrite').addEventListener('click', handleRewriteSelection);

  // Click on status pill to re-check
  if (statusPill) {
    statusPill.style.cursor = 'pointer';
    statusPill.addEventListener('click', () => {
      checkEngineAvailability(true);
    });
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

// Universal AI Engine Finder
function getAIEngine() {
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

// Check if Chrome Prompt API is available (in extension page or via active tab)
async function checkEngineAvailability(isManual = false) {
  const statusText = document.getElementById('modelStatusText');
  const statusPill = document.getElementById('modelStatusPill');
  const diagBanner = document.getElementById('diagBanner');

  if (isManual) statusText.textContent = 'בודק...';

  // 1. Check direct extension context engine
  let engine = getAIEngine();

  if (engine) {
    try {
      let isReady = false;
      if (typeof engine.capabilities === 'function') {
        const caps = await engine.capabilities();
        if (caps.available === 'readily' || caps.available === 'yes') isReady = true;
        else if (caps.available === 'after-download') {
          statusText.textContent = 'מוריד מודל...';
          statusPill.style.background = 'rgba(245, 158, 11, 0.15)';
          statusPill.style.color = '#fbbf24';
          return true;
        }
      } else if (typeof engine.availability === 'function') {
        const avail = await engine.availability();
        if (avail === 'readily' || avail === 'yes') isReady = true;
      } else if (typeof engine.create === 'function') {
        isReady = true;
      }

      if (isReady) {
        statusText.textContent = 'Nano Ready';
        statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
        statusPill.style.color = '#34d399';
        statusPill.title = 'מנוע Gemini Nano המקומי פועל ב-100% אופליין (לחץ לבדיקה מחדש)';
        diagBanner.style.display = 'none';
        return true;
      }
    } catch (e) {
      console.warn('Capability check exception:', e);
      // Even if capability check errored, engine exists
      statusText.textContent = 'Nano Ready';
      statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
      statusPill.style.color = '#34d399';
      diagBanner.style.display = 'none';
      return true;
    }
  }

  // 2. Check if engine is available in active web page via scripting
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id && !tab.url.startsWith('chrome://')) {
      const tabCheck = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const eng = (typeof LanguageModel !== 'undefined') ? LanguageModel : (window.ai ? (window.ai.languageModel || window.ai) : null);
          return !!eng;
        }
      });
      if (tabCheck && tabCheck[0] && tabCheck[0].result) {
        statusText.textContent = 'Nano Ready (Tab)';
        statusPill.style.background = 'rgba(16, 185, 129, 0.15)';
        statusPill.style.color = '#34d399';
        diagBanner.style.display = 'none';
        return true;
      }
    }
  } catch (e) {}

  // 3. Fallback: Check if local Python server is running (Port 8765)
  try {
    const controller = new AbortController();
    const tId = setTimeout(() => controller.abort(), 800);
    const res = await fetch('http://127.0.0.1:8765/heartbeat', { signal: controller.signal });
    clearTimeout(tId);
    if (res.ok) {
      statusText.textContent = 'Server Online';
      statusPill.style.background = 'rgba(59, 130, 246, 0.15)';
      statusPill.style.color = '#60a5fa';
      statusPill.title = 'מחובר לשרת המקומי (פורט 8765)';
      diagBanner.style.display = 'none';
      return true;
    }
  } catch (e) {}

  // If none matched, mark as Nano Ready anyway if flags were set or prompt
  statusText.textContent = 'לחץ לבדיקה';
  statusPill.style.background = 'rgba(245, 158, 11, 0.15)';
  statusPill.style.color = '#fbbf24';
  statusPill.title = 'לחץ כאן לרענון ובדיקת חיבור המודל';
  diagBanner.style.display = 'none';
  return false;
}

// Create or get active AI session
async function getOrCreateSession() {
  if (currentSession) return currentSession;

  const engine = getAIEngine();
  const selectedPersona = document.getElementById('personaSelect').value || 'general';
  const persona = PERSONAS[selectedPersona] || PERSONAS.general;
  const sysPrompt = persona.prompt;

  if (engine) {
    try {
      currentSession = await engine.create({
        systemPrompt: sysPrompt,
        temperature: 0.7,
        topK: 3
      });
      return currentSession;
    } catch (e) {
      try {
        currentSession = await engine.create({ systemPrompt: sysPrompt });
        return currentSession;
      } catch (inner) {
        currentSession = await engine.create();
        return currentSession;
      }
    }
  }

  throw new Error('מנוע Prompt API לא זוהה בסרגל הצד. יש לוודא שהדגלים ב-chrome://flags מופעלים, או לרענן את הדף.');
}

function destroySession() {
  if (currentSession) {
    try { if (typeof currentSession.destroy === 'function') currentSession.destroy(); } catch (e) {}
    currentSession = null;
  }
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
    // Check if we can prompt via extension session
    let session = null;
    try {
      session = await getOrCreateSession();
    } catch (e) {
      session = null;
    }

    if (session) {
      if (typeof session.promptStreaming === 'function') {
        const stream = session.promptStreaming(text, { signal: abortController.signal });
        for await (const chunk of stream) {
          if (chunk.startsWith(accumulatedText)) {
            accumulatedText = chunk;
          } else {
            accumulatedText += chunk;
          }
          contentElem.innerHTML = renderMarkdown(accumulatedText);
          scrollChatToBottom();
        }
      } else if (typeof session.prompt === 'function') {
        const res = await session.prompt(text, { signal: abortController.signal });
        accumulatedText = res;
        contentElem.innerHTML = renderMarkdown(accumulatedText);
      }
    } else {
      // Fallback 1: Try executing Prompt API in the active web page tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id && !tab.url.startsWith('chrome://')) {
        const result = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          args: [text, PERSONAS[document.getElementById('personaSelect').value || 'general'].prompt],
          func: async (promptText, systemDirective) => {
            const eng = (typeof LanguageModel !== 'undefined') ? LanguageModel : (window.ai ? (window.ai.languageModel || window.ai) : null);
            if (!eng) throw new Error('Prompt API is not available on active tab.');
            const s = await eng.create({ systemPrompt: systemDirective }).catch(() => eng.create());
            return await s.prompt(promptText);
          }
        });
        if (result && result[0] && result[0].result) {
          accumulatedText = result[0].result;
          contentElem.innerHTML = renderMarkdown(accumulatedText);
        } else {
          throw new Error('לא התקבלה תשובה מ-Gemini Nano.');
        }
      } else {
        throw new Error('מנוע Prompt API אינו זמין. פתח דף אינטרנט רגיל או הפעל את הדגלים ב-chrome://flags.');
      }
    }

    conversationHistory.push({ role: 'assistant', content: accumulatedText });
    saveConversationHistory();

  } catch (err) {
    if (err.name === 'AbortError') {
      accumulatedText += '\n\n*[התשובה נעצרה]*';
    } else {
      accumulatedText = '⚠️ **שגיאה:** ' + (err.message || String(err));
    }
    contentElem.innerHTML = renderMarkdown(accumulatedText);
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

// Append message bubble to chat feed
function appendMessage(role, content, isLive = false) {
  const feed = document.getElementById('chatFeed');
  const row = document.createElement('div');
  row.className = 'message-row ' + role;

  const avatar = document.createElement('div');
  avatar.className = 'msg-avatar ' + role;
  avatar.textContent = role === 'user' ? '🧑' : '✨';

  const bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'msg-content';
  if (isLive) contentDiv.classList.add('typing-cursor');
  contentDiv.innerHTML = renderMarkdown(content);

  bubble.appendChild(contentDiv);
  row.appendChild(avatar);
  row.appendChild(bubble);

  feed.appendChild(row);
  scrollChatToBottom();

  return row;
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
  const title = currentLanguage === 'en' ? 'Gemini Nano in Browser' : 'Gemini Nano בתוך הדפדפן';
  const desc = currentLanguage === 'en' ? '100% private, on-device AI assistant. Summarize pages, explain code, and chat.' : 'עוזר בינה מלאכותית מקומי ופרטי ב-100%. שאל שאלות, סכם עמודים ותרגם טקסטים ללא צורך בענן.';
  feed.innerHTML = `
    <div id="emptyState" class="empty-state">
      <div class="empty-icon">✨</div>
      <h3 class="empty-title">${title}</h3>
      <p class="empty-desc">${desc}</p>
    </div>
  `;
}

// Page Context Actions
async function handleSummarizePage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;

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
    if (!tab || !tab.id) return;

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
    if (!tab || !tab.id) return;

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
    if (!tab || !tab.id) return;

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

// Handle Context Menu triggers
async function checkPendingAction() {
  const { pendingAction } = await chrome.storage.local.get('pendingAction');
  if (pendingAction && (Date.now() - pendingAction.timestamp < 30000)) {
    await chrome.storage.local.remove('pendingAction');
    handleIncomingAction(pendingAction);
  }
}

function handleIncomingAction(data) {
  const { action, selectionText, pageTitle } = data;
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
  const { sidepanel_lang, sidepanel_history, sidepanel_active_chat_id } = await chrome.storage.local.get(['sidepanel_lang', 'sidepanel_history', 'sidepanel_active_chat_id']);
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

// Lightweight Markdown Formatter for Extension Context (Safe & Offline)
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks
  html = html.replace(/```([a-z0-9]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
    return '<pre><code>' + code.trim() + '</code></pre>';
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
