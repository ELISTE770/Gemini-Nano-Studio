// Gemini Nano Studio - Chrome Extension Side Panel Logic

let currentSession = null;
let currentLanguage = 'he'; // 'he' or 'en'
let currentTheme = 'dark';   // 'dark' or 'light'
let openMode = 'sidepanel';  // 'sidepanel', 'tab', 'popup'
let isContextLinked = true;  // Linked to active tab content
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
  const personaSelect = document.getElementById('personaSelect');
  const voiceBtn = document.getElementById('voiceBtn');
  const contextLinkBtn = document.getElementById('contextLinkBtn');

  // History Controls
  const historyBtn = document.getElementById('historyBtn');
  const historyChipBtn = document.getElementById('historyChipBtn');
  const closeHistoryBtn = document.getElementById('closeHistoryBtn');
  const historyModal = document.getElementById('historyModal');
  const historySearchInput = document.getElementById('historySearchInput');
  const historyNewChatBtn = document.getElementById('historyNewChatBtn');
  const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');

  // Settings Modal Controls
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const settingOpenMode = document.getElementById('settingOpenMode');
  const settingContextAware = document.getElementById('settingContextAware');
  const settingTheme = document.getElementById('settingTheme');
  const settingLang = document.getElementById('settingLang');
  const openFullTabBtn = document.getElementById('openFullTabBtn');
  const modalExportBtn = document.getElementById('modalExportBtn');
  const modalClearBtn = document.getElementById('modalClearBtn');
  const modalRefreshBtn = document.getElementById('modalRefreshBtn');

  // Quick tool chips
  document.getElementById('toolSummarizePage').addEventListener('click', handleSummarizePage);
  document.getElementById('toolExplainSelection').addEventListener('click', handleExplainSelection);
  document.getElementById('toolTranslate').addEventListener('click', handleTranslateSelection);
  document.getElementById('toolRewrite').addEventListener('click', handleRewriteSelection);

  // Toggle Context Link Button (Pill in header)
  if (contextLinkBtn) {
    contextLinkBtn.addEventListener('click', toggleContextLink);
  }

  // History Open Handlers
  const openHistory = () => {
    renderHistoryList();
    if (historyModal) historyModal.classList.remove('hidden');
  };

  if (historyBtn) historyBtn.addEventListener('click', openHistory);
  if (historyChipBtn) historyChipBtn.addEventListener('click', openHistory);

  if (closeHistoryBtn) {
    closeHistoryBtn.addEventListener('click', () => historyModal.classList.add('hidden'));
  }
  if (historyModal) {
    historyModal.addEventListener('click', (e) => {
      if (e.target === historyModal) historyModal.classList.add('hidden');
    });
  }
  if (historySearchInput) {
    historySearchInput.addEventListener('input', (e) => {
      renderHistoryList(e.target.value);
    });
  }
  if (historyNewChatBtn) {
    historyNewChatBtn.addEventListener('click', () => {
      startNewChat();
      if (historyModal) historyModal.classList.add('hidden');
    });
  }
  if (clearAllHistoryBtn) {
    clearAllHistoryBtn.addEventListener('click', clearAllHistory);
  }

  // Settings Modal Handlers
  if (openSettingsBtn) {
    openSettingsBtn.addEventListener('click', () => settingsModal.classList.remove('hidden'));
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => settingsModal.classList.add('hidden'));
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) settingsModal.classList.add('hidden');
    });
  }

  // Open Mode Setting
  if (settingOpenMode) {
    settingOpenMode.addEventListener('change', (e) => {
      openMode = e.target.value;
      chrome.storage.local.set({ open_mode: openMode });
      showToast(currentLanguage === 'en' ? 'Open mode saved' : 'אופן הפתיחה נשמר');
    });
  }

  if (openFullTabBtn) {
    openFullTabBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'http://127.0.0.1:8765/gemini_nano_chat.html' });
    });
  }

  if (settingContextAware) {
    settingContextAware.addEventListener('change', (e) => {
      setContextLink(e.target.checked);
    });
  }

  if (settingTheme) {
    settingTheme.addEventListener('change', (e) => {
      currentTheme = e.target.value;
      applyTheme(currentTheme);
      chrome.storage.local.set({ sidepanel_theme: currentTheme });
    });
  }

  if (settingLang) {
    settingLang.addEventListener('change', (e) => {
      setLanguage(e.target.value);
    });
  }

  if (modalExportBtn) modalExportBtn.addEventListener('click', exportChatHistory);
  if (modalClearBtn) modalClearBtn.addEventListener('click', startNewChat);
  if (modalRefreshBtn) modalRefreshBtn.addEventListener('click', handleRefresh);

  // Voice Dictation Click
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
      if (isGenerating) {
        stopGeneration();
      } else {
        sendMessage();
      }
    }
  });

  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  newChatBtn.addEventListener('click', startNewChat);
  clearChatBtn.addEventListener('click', startNewChat);

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

// Find the real active tab across all contexts
async function getActiveWebTab() {
  try {
    const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0]) return tabs[0];
  } catch (e) {}

  try {
    const currentTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (currentTabs && currentTabs[0]) return currentTabs[0];
  } catch (e) {}

  try {
    const allActive = await chrome.tabs.query({ active: true });
    return allActive?.[0] || null;
  } catch (e) {}

  return null;
}

// Robust Active Tab Information Extractor
async function getActiveTabInfo() {
  try {
    const tab = await getActiveWebTab();
    if (!tab || !tab.id) return null;

    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:'))) {
      return { isInternal: true, title: tab.title || 'עמוד מערכת', url: tab.url, text: '' };
    }

    // Attempt 1: Direct Content Script Message
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_DATA' });
      if (response && response.text && response.text.length > 20) {
        return response;
      }
    } catch (e) {}

    // Attempt 2: Direct Scripting Injection
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = window.getSelection() ? window.getSelection().toString().trim() : '';
        const container = document.querySelector('article, main, [role="main"], .mw-parser-output, .article-content, .post-content, #content') || document.body;
        const nodes = container.querySelectorAll('h1, h2, h3, h4, p, li, blockquote');
        let lines = [];
        if (nodes && nodes.length >= 3) {
          nodes.forEach(n => {
            if (n.closest('script, style, noscript, nav, footer, header, aside, .ad, .ads, .comments')) return;
            const t = n.textContent ? n.textContent.trim() : '';
            if (t.length > 5) lines.push(t);
          });
        }
        let fullText = lines.join('\n\n');
        if (!fullText || fullText.length < 80) {
          fullText = (container.textContent || document.body.textContent || '').replace(/\s+/g, ' ').trim();
        }
        return {
          title: document.title || 'עמוד אינטרנט',
          url: window.location.href,
          text: fullText.substring(0, 12000),
          selectedText: sel
        };
      }
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
  } catch (err) {
    console.warn('getActiveTabInfo error:', err);
  }
  return null;
}

// Robust Active Tab Selection Extractor
async function getActiveTabSelection() {
  try {
    const tab = await getActiveWebTab();
    if (!tab || !tab.id || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
      return '';
    }

    // Attempt 1: Query Content Script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'GET_SELECTION' });
      if (response && response.selectedText) {
        return response.selectedText.trim();
      }
    } catch (e) {}

    // Attempt 2: Fallback via Scripting
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection() ? window.getSelection().toString().trim() : ''
    });

    if (results && results[0] && results[0].result) {
      return results[0].result.trim();
    }
  } catch (err) {
    console.warn('getActiveTabSelection error:', err);
  }
  return '';
}

// Page Context Actions
async function handleSummarizePage() {
  showToast(currentLanguage === 'en' ? 'Reading webpage...' : 'קורא את תוכן העמוד...');
  const pageData = await getActiveTabInfo();

  if (!pageData || pageData.isInternal) {
    showToast(currentLanguage === 'en' ? 'Cannot summarize Chrome internal pages' : 'לא ניתן לסכם עמודי מערכת פנימיים. פתח אתר אינטרנט רגיל.');
    return;
  }

  if (!pageData.text || pageData.text.length < 30) {
    showToast(currentLanguage === 'en' ? 'No readable content found on page' : 'לא נמצא תוכן טקסטואלי לקריאה בעמוד זה');
    return;
  }

  const userDisplay = `📑 סכם את העמוד: "${pageData.title}"`;
  const actualPrompt = `[הוראה]: סכם את תוכן המאמר/העמוד הבא בצורה תמציתית ומובנית בעברית: כותרת, 3-5 נקודות מפתח מרכזיות, ומסקנה סופית.\n\n[כותרת העמוד]: ${pageData.title}\n[קישור]: ${pageData.url}\n\n[תוכן המאמר לסיכום]:\n${pageData.text}`;
  
  sendMessage(userDisplay, actualPrompt);
}

async function handleExplainSelection() {
  const sel = await getActiveTabSelection();
  if (!sel) {
    showToast(currentLanguage === 'en' ? 'Please highlight text on the webpage first' : '⚠️ סמן טקסט בעמוד האינטרנט תחילה');
    return;
  }

  const preview = sel.length > 60 ? sel.substring(0, 60) + '...' : sel;
  const userDisplay = `🔍 הסבר את הטקסט המסומן: "${preview}"`;
  const actualPrompt = `[הוראה]: הסבר בצורה ברורה, מעמיקה ומובנת את הקטע הבא שסומן בעמוד האינטרנט:\n\n"${sel}"`;

  sendMessage(userDisplay, actualPrompt);
}

async function handleTranslateSelection() {
  const sel = await getActiveTabSelection();
  if (!sel) {
    showToast(currentLanguage === 'en' ? 'Please highlight text on the webpage first' : '⚠️ סמן טקסט בעמוד האינטרנט תחילה');
    return;
  }

  const preview = sel.length > 60 ? sel.substring(0, 60) + '...' : sel;
  const userDisplay = `🌐 תרגם לעברית: "${preview}"`;
  const actualPrompt = `[הוראה]: תרגם את הטקסט הבא לעברית בצורה טבעית, רהוטה ונאמנה למקור:\n\n"${sel}"`;

  sendMessage(userDisplay, actualPrompt);
}

async function handleRewriteSelection() {
  const sel = await getActiveTabSelection();
  if (!sel) {
    showToast(currentLanguage === 'en' ? 'Please highlight text on the webpage first' : '⚠️ סמן טקסט בעמוד האינטרנט תחילה');
    return;
  }

  const preview = sel.length > 60 ? sel.substring(0, 60) + '...' : sel;
  const userDisplay = `✍️ שכתב ושפר: "${preview}"`;
  const actualPrompt = `[הוראה]: שכתב ושפר את ניסוח הטקסט הבא במשלב מקצועי, בהיר ומשכנע:\n\n"${sel}"`;

  sendMessage(userDisplay, actualPrompt);
}

// Render Saved Conversation History List
async function renderHistoryList(filterText = '') {
  const container = document.getElementById('historyListContainer');
  if (!container) return;

  const { gemini_nano_conversations } = await chrome.storage.local.get('gemini_nano_conversations');
  let list = gemini_nano_conversations || [];

  if (filterText.trim()) {
    const q = filterText.toLowerCase();
    list = list.filter(c => (c.title || '').toLowerCase().includes(q) || (c.messages || []).some(m => m.content.toLowerCase().includes(q)));
  }

  if (list.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding: 24px 0; color: var(--text-muted); font-size: 11.5px;">${currentLanguage === 'en' ? 'No saved conversations yet' : 'עדיין אין שיחות שמורות'}</div>`;
    return;
  }

  container.innerHTML = '';
  list.forEach(c => {
    const item = document.createElement('div');
    const isActive = c.id === activeChatId;
    item.className = 'history-item' + (isActive ? ' active' : '');
    if (isActive) item.style.borderColor = 'rgba(59, 130, 246, 0.6)';

    const dateStr = new Date(c.updatedAt || c.createdAt || Date.now()).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const msgCount = (c.messages || []).length;

    item.innerHTML = `
      <div class="history-item-info">
        <div class="history-item-title">${c.title || 'שיחה ללא כותרת'}</div>
        <div class="history-item-meta">${dateStr} • ${msgCount} הודעות</div>
      </div>
      <button class="history-delete-btn" title="מחק שיחה">🗑️</button>
    `;

    item.addEventListener('click', (e) => {
      if (e.target.closest('.history-delete-btn')) return;
      loadConversation(c);
      document.getElementById('historyModal').classList.add('hidden');
    });

    const delBtn = item.querySelector('.history-delete-btn');
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteConversation(c.id);
    });

    container.appendChild(item);
  });
}

function loadConversation(conv) {
  destroySession();
  activeChatId = conv.id;
  conversationHistory = conv.messages || [];

  const feed = document.getElementById('chatFeed');
  feed.innerHTML = '';

  if (conversationHistory.length === 0) {
    feed.innerHTML = `
      <div id="emptyState" class="empty-state">
        <div class="empty-icon">✨</div>
        <h3 class="empty-title">${currentLanguage === 'en' ? 'Gemini Nano in Browser' : 'Gemini Nano בסרגל הצד'}</h3>
        <p class="empty-desc">${currentLanguage === 'en' ? '100% private, on-device AI assistant. Summarize pages, explain code, and chat.' : 'עוזר בינה מלאכותית מקומי ופרטי ב-100%. שאל שאלות, סכם עמודים ותרגם טקסטים ללא צורך בענן.'}</p>
      </div>
    `;
    return;
  }

  conversationHistory.forEach(msg => {
    appendMessage(msg.role === 'user' ? 'user' : 'ai', msg.content);
  });

  showToast(currentLanguage === 'en' ? 'Conversation loaded' : 'השיחה נטענה בהצלחה');
}

async function deleteConversation(chatId) {
  const { gemini_nano_conversations } = await chrome.storage.local.get('gemini_nano_conversations');
  let list = gemini_nano_conversations || [];
  list = list.filter(c => c.id !== chatId);
  await chrome.storage.local.set({ gemini_nano_conversations: list });

  if (activeChatId === chatId) {
    startNewChat();
  } else {
    renderHistoryList();
  }
  showToast(currentLanguage === 'en' ? 'Conversation deleted' : 'השיחה נמחקה');
}

async function clearAllHistory() {
  if (confirm(currentLanguage === 'en' ? 'Delete all saved conversations?' : 'האם למחוק את כל היסטוריית השיחות?')) {
    await chrome.storage.local.remove(['gemini_nano_conversations', 'sidepanel_history']);
    startNewChat();
    renderHistoryList();
    document.getElementById('historyModal').classList.add('hidden');
    showToast(currentLanguage === 'en' ? 'All history cleared' : 'כל היסטוריית השיחות נמחקה');
  }
}

// Toggle Context Link (Linked vs Standalone)
function toggleContextLink() {
  setContextLink(!isContextLinked);
}

function setContextLink(enabled) {
  isContextLinked = enabled;
  chrome.storage.local.set({ sidepanel_context_linked: isContextLinked });

  const btn = document.getElementById('contextLinkBtn');
  const icon = document.getElementById('contextLinkIcon');
  const text = document.getElementById('contextLinkText');
  const chk = document.getElementById('settingContextAware');

  if (chk) chk.checked = isContextLinked;

  if (isContextLinked) {
    if (btn) {
      btn.className = 'context-pill linked';
      btn.title = 'מחובר לאתר הפתוח: מידע מהעמוד ישמש כהקשר לתשובות';
    }
    if (icon) icon.textContent = '🔗';
    if (text) text.textContent = currentLanguage === 'en' ? 'Linked' : 'קשור לאתר';
    showToast(currentLanguage === 'en' ? 'Context linked to active page' : 'התוסף קשור לתוכן האתר הפעיל');
  } else {
    if (btn) {
      btn.className = 'context-pill standalone';
      btn.title = 'מצב עצמאי: שאלות כלליות ללא תלות באתר הפתוח';
    }
    if (icon) icon.textContent = '⚡';
    if (text) text.textContent = currentLanguage === 'en' ? 'Standalone' : 'עצמאי';
    showToast(currentLanguage === 'en' ? 'Standalone mode (no page context)' : 'מצב עצמאי ללא הקשר מהאתר');
  }
}

// Handle Refresh Action
function handleRefresh() {
  const icon = document.getElementById('modalRefreshSvg');
  if (icon) icon.classList.add('rotating');

  stopGeneration();
  destroySession();
  initEngineStatus();

  setTimeout(() => {
    if (icon) icon.classList.remove('rotating');
    showToast(currentLanguage === 'en' ? 'Refreshed & Ready!' : 'המערכת רועננה בהצלחה!');
  }, 600);
}

// Theme Switcher (Dark / Light)
function applyTheme(theme) {
  if (theme === 'light') {
    document.body.classList.add('theme-light');
  } else {
    document.body.classList.remove('theme-light');
  }
  const sel = document.getElementById('settingTheme');
  if (sel) sel.value = theme;
}

// Language Switcher & Footer Attribution Link
function setLanguage(lang) {
  currentLanguage = lang;
  document.documentElement.setAttribute('dir', currentLanguage === 'he' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('lang', currentLanguage);

  const input = document.getElementById('userInput');
  if (input) {
    input.placeholder = currentLanguage === 'en' 
      ? 'Ask Gemini Nano or summarize this page...' 
      : 'שאל את Gemini Nano או סכם את העמוד...';
  }

  const sel = document.getElementById('settingLang');
  if (sel) sel.value = currentLanguage;

  const footerCredit = document.getElementById('extFooterCredit');
  if (footerCredit) {
    if (currentLanguage === 'en') {
      footerCredit.innerHTML = 'Built by <a href="https://smartbinary.org" target="_blank" rel="noopener noreferrer">Smart Binary</a>';
    } else {
      footerCredit.innerHTML = 'נבנה על ידי <a href="https://ivrit.smartbinary.org" target="_blank" rel="noopener noreferrer">בינארי חכם</a> (Smart Binary)';
    }
  }

  setContextLink(isContextLinked);
  chrome.storage.local.set({ sidepanel_lang: currentLanguage });
  destroySession();
}

// Export Chat History to Markdown (.md)
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

// Voice Dictation (Web Speech API)
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
  // Ready
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
  if (abortController?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  const selectedPersona = document.getElementById('personaSelect').value || 'general';
  const systemPrompt = PERSONAS[selectedPersona].prompt;

  // Path 1: Direct in-extension engine
  try {
    const session = await getOrCreateSession(systemPrompt);
    if (session) {
      if (typeof session.promptStreaming === 'function') {
        const stream = session.promptStreaming(promptText, { signal: abortController?.signal });
        let accumulated = '';
        for await (const chunk of stream) {
          if (abortController?.signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
          }
          if (chunk.startsWith(accumulated)) {
            accumulated = chunk;
          } else {
            accumulated += chunk;
          }
          onChunk(accumulated);
        }
        return accumulated;
      } else if (typeof session.prompt === 'function') {
        const res = await session.prompt(promptText, { signal: abortController?.signal });
        onChunk(res);
        return res;
      }
    }
  } catch (err) {
    if (err.name === 'AbortError' || abortController?.signal?.aborted) {
      throw err;
    }
    console.warn('Direct extension prompt exception:', err);
    destroySession();
  }

  if (abortController?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // Path 2: Execution via Active Web Tab
  try {
    const tab = await getActiveWebTab();
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

      if (abortController?.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      if (results && results[0] && results[0].result) {
        const resultText = results[0].result;
        onChunk(resultText);
        return resultText;
      }
    }
  } catch (tabErr) {
    if (tabErr.name === 'AbortError' || abortController?.signal?.aborted) {
      throw tabErr;
    }
    console.warn('Active tab prompt exception:', tabErr);
  }

  if (abortController?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // Path 3: Local Server Gateway (http://127.0.0.1:8765)
  try {
    const res = await fetch('http://127.0.0.1:8765/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer gn-local-dev' },
      body: JSON.stringify({
        model: 'gemini-nano',
        messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: promptText }]
      }),
      signal: abortController?.signal
    });
    if (res.ok) {
      const data = await res.json();
      if (data.choices && data.choices[0]?.message?.content) {
        const serverText = data.choices[0].message.content;
        onChunk(serverText);
        return serverText;
      }
    }
  } catch (serverErr) {
    if (serverErr.name === 'AbortError' || abortController?.signal?.aborted) {
      throw serverErr;
    }
  }

  if (abortController?.signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  throw new Error('לא ניתן להריץ את המודל בסרגל הצד כרגע. פתח עמוד אינטרנט רגיל בדפדפן (למשל Google, ויקיפדיה וכד\') כדי לסכם או להפעיל את המודל.');
}

// Send user message and stream assistant response
// userDisplayText: what shows in the user bubble in chat
// promptToSend: full prompt with page context sent to AI
async function sendMessage(userDisplayText = null, promptToSend = null) {
  if (isGenerating) {
    stopGeneration();
    return;
  }

  const input = document.getElementById('userInput');
  let text = userDisplayText || input.value.trim();
  if (!text) return;

  if (!userDisplayText) {
    input.value = '';
    input.style.height = 'auto';
  }

  // Remove empty state if visible
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.remove();

  // Append user message to UI
  appendMessage('user', text);
  conversationHistory.push({ role: 'user', content: text });
  saveConversationHistory();

  // Prepare assistant message placeholder
  const aiBubble = appendMessage('ai', '', true);
  const contentElem = aiBubble.querySelector('.msg-content');

  setGeneratingState(true);
  abortController = new AbortController();

  let finalPrompt = promptToSend || text;

  // Inject active tab context if Linked Mode is enabled (and not already an explicit tool action with its own prompt)
  if (isContextLinked && !promptToSend) {
    const pageData = await getActiveTabInfo();
    if (pageData && pageData.text && !pageData.isInternal) {
      const snippet = pageData.text.substring(0, 3500);
      finalPrompt = `[הקשר מתוך האתר שפתוח בדפדפן - "${pageData.title}" (${pageData.url})]:\n${snippet}\n\n[שאלת המשתמש]:\n${text}`;
    }
  }

  let accumulatedText = '';

  try {
    accumulatedText = await executeNanoPrompt(finalPrompt, (chunk) => {
      accumulatedText = chunk;
      contentElem.innerHTML = renderMarkdown(accumulatedText);
      attachCodeCopyListeners(contentElem);
      scrollChatToBottom();
    });

    conversationHistory.push({ role: 'assistant', content: accumulatedText });
    saveConversationHistory();

  } catch (err) {
    if (err.name === 'AbortError' || err.message?.includes('Aborted') || abortController?.signal?.aborted) {
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
    try { abortController.abort(); } catch (e) {}
    abortController = null;
  }
  destroySession();
  setGeneratingState(false);
  document.querySelectorAll('.typing-cursor').forEach(el => el.classList.remove('typing-cursor'));
}

// Append message bubble to chat feed with Copy button
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

// Attach Copy Button to individual code blocks
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
    const preview = selectionText.length > 60 ? selectionText.substring(0, 60) + '...' : selectionText;
    sendMessage(`🔍 הסבר: "${preview}"`, `[הסבר בצורה ברורה את הקטע הבא]:\n\n"${selectionText}"`);
  } else if (action === 'summarize_selection' && selectionText) {
    const preview = selectionText.length > 60 ? selectionText.substring(0, 60) + '...' : selectionText;
    sendMessage(`📑 סכם: "${preview}"`, `[סכם את הקטע הבא בנקודות מרכזיות]:\n\n"${selectionText}"`);
  } else if (action === 'translate_hebrew' && selectionText) {
    const preview = selectionText.length > 60 ? selectionText.substring(0, 60) + '...' : selectionText;
    sendMessage(`🌐 תרגם: "${preview}"`, `[תרגם לעברית בצורה שוטפת ואיכותית]:\n\n"${selectionText}"`);
  } else if (action === 'rewrite_text' && selectionText) {
    const preview = selectionText.length > 60 ? selectionText.substring(0, 60) + '...' : selectionText;
    sendMessage(`✍️ שכתב: "${preview}"`, `[שכתב ושפר את הניסוח של הטקסט הבא]:\n\n"${selectionText}"`);
  } else if (action === 'summarize_page') {
    handleSummarizePage();
  }
}

async function loadSavedSettings() {
  const { sidepanel_lang, sidepanel_history, sidepanel_active_chat_id, sidepanel_theme, sidepanel_context_linked, open_mode } = await chrome.storage.local.get(['sidepanel_lang', 'sidepanel_history', 'sidepanel_active_chat_id', 'sidepanel_theme', 'sidepanel_context_linked', 'open_mode']);
  
  if (open_mode) {
    openMode = open_mode;
    const sel = document.getElementById('settingOpenMode');
    if (sel) sel.value = openMode;
  }

  if (sidepanel_context_linked !== undefined) {
    setContextLink(sidepanel_context_linked);
  } else {
    setContextLink(true);
  }

  if (sidepanel_theme) {
    currentTheme = sidepanel_theme;
    applyTheme(currentTheme);
  }

  if (sidepanel_lang) {
    setLanguage(sidepanel_lang);
  } else {
    setLanguage('he');
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

  const firstUserMsg = conversationHistory.find(m => m.role === 'user');
  const chatTitle = firstUserMsg ? firstUserMsg.content.substring(0, 32) : 'שיחת סרגל צד';

  const sharedConversation = {
    id: activeChatId,
    title: chatTitle,
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
  setTimeout(() => toast.remove(), 2400);
}

// Lightweight Markdown Formatter with Code Box & Copy button support
function renderMarkdown(md) {
  if (!md) return '';
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

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

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^## (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^# (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/^\s*[\-\*]\s+(.*$)/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>');
  html = html.replace(/^>\s+(.*$)/gim, '<blockquote style="border-right: 3px solid #3b82f6; padding-right: 8px; color: #94a3b8;">$1</blockquote>');
  html = html.replace(/\n\n/g, '<p></p>');
  html = html.replace(/\n/g, '<br>');

  return html;
}
