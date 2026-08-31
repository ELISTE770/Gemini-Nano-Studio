// Gemini Nano Studio Extension - Background Service Worker

// Enable Side Panel opening when extension action icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error(error));

// Initialize Context Menus
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // 1. Explain selected text
    chrome.contextMenus.create({
      id: 'explain_selection',
      title: '🔍 הסבר טקסט זה עם Gemini Nano',
      contexts: ['selection']
    });

    // 2. Summarize selected text
    chrome.contextMenus.create({
      id: 'summarize_selection',
      title: '📑 סכם טקסט מסומן',
      contexts: ['selection']
    });

    // 3. Translate to Hebrew
    chrome.contextMenus.create({
      id: 'translate_hebrew',
      title: '🌐 תרגם לעברית עם Gemini Nano',
      contexts: ['selection']
    });

    // 4. Rewrite & improve
    chrome.contextMenus.create({
      id: 'rewrite_text',
      title: '✍️ שכתב ושפר ניסוח',
      contexts: ['selection']
    });

    // 5. Summarize entire page
    chrome.contextMenus.create({
      id: 'summarize_page',
      title: '📄 סכם את כל העמוד הנוכחי',
      contexts: ['page']
    });

    // 6. Open full studio
    chrome.contextMenus.create({
      id: 'open_full_studio',
      title: '🚀 פתח את Gemini Nano Studio המלא',
      contexts: ['action']
    });
  });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'open_full_studio') {
    chrome.tabs.create({ url: 'http://127.0.0.1:8765/gemini_nano_chat.html' });
    return;
  }

  // Open side panel in the active window
  if (tab?.windowId) {
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (e) {
      console.warn('Could not open side panel:', e);
    }
  }

  // Store pending action for side panel to pick up
  const payload = {
    action: info.menuItemId,
    selectionText: info.selectionText || '',
    pageUrl: tab?.url || '',
    pageTitle: tab?.title || '',
    timestamp: Date.now()
  };

  await chrome.storage.local.set({ pendingAction: payload });

  // Also try broadcasting directly via message if panel is already open
  chrome.runtime.sendMessage(payload).catch(() => {});
});
