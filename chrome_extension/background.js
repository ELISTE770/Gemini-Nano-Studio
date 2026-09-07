// Gemini Nano Studio Extension - Background Service Worker

// Enable Side Panel opening natively when extension icon is clicked
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error) => console.error('SidePanel behavior error:', error));

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

  // Initialize Context Menus
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
    } catch (e) {}
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
  chrome.runtime.sendMessage(payload).catch(() => {});
});

// GitHub Release Checker & Notification Badge
async function checkGithubReleaseBadge() {
  try {
    const res = await fetch('https://api.github.com/repos/ELISTE770/Gemini-Nano-Studio/releases/latest');
    if (res.ok) {
      const data = await res.json();
      const tag = data.tag_name || '';
      const remoteVer = tag.replace(/^v/, '').trim();
      const currentVer = chrome.runtime.getManifest().version;

      if (remoteVer.localeCompare(currentVer, undefined, { numeric: true, sensitivity: 'base' }) > 0) {
        chrome.action.setBadgeText({ text: 'NEW' });
        chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
        chrome.action.setTitle({ title: `Gemini Nano Studio - גרסה חדשה זמינה (${tag})!` });
      } else {
        chrome.action.setBadgeText({ text: '' });
      }
    }
  } catch (e) {}
}

chrome.runtime.onStartup.addListener(() => {
  checkGithubReleaseBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'check_release_alarm') {
    checkGithubReleaseBadge();
  }
});
