// Gemini Nano Studio Extension - Content Script for Reliable Page & Selection Extraction

let lastSelectedText = '';

// Continuously keep track of user selection even when focus moves to Side Panel
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection().toString().trim();
  if (sel) {
    lastSelectedText = sel;
  }
});

document.addEventListener('mouseup', () => {
  const sel = window.getSelection().toString().trim();
  if (sel) {
    lastSelectedText = sel;
  }
});

// Extract clean, readable article or webpage text
function extractCleanPageText() {
  const currentSel = window.getSelection().toString().trim();
  const effectiveSelection = currentSel || lastSelectedText;

  // Try to find the most relevant main article container first
  const mainArticle = document.querySelector('article, main, [role=""main""], .post-content, .article-content, #content');
  const targetElement = mainArticle ? mainArticle.cloneNode(true) : document.body.cloneNode(true);

  // Remove noise elements (scripts, styles, ads, nav, footer, sidebars)
  const selectorsToRemove = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
    'nav', 'footer', 'header', 'aside',
    '.ad', '.ads', '.advertisement', '.social-share', '.cookie-banner',
    '#comments', '.comments', '.sidebar', '.menu', '.nav'
  ];

  selectorsToRemove.forEach(sel => {
    targetElement.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Extract and normalize text whitespace
  let text = targetElement.innerText || targetElement.textContent || '';
  text = text.replace(/\r\n/g, '\n').replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  // Limit to reasonable context size (~12,000 chars)
  if (text.length > 12000) {
    text = text.substring(0, 12000) + '\n\n[הטקסט קוצר עקב מגבלת אורך...]';
  }

  return {
    title: document.title || '',
    url: window.location.href,
    text: text,
    selectedText: effectiveSelection
  };
}

// Listen for direct queries from Side Panel or Background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PAGE_DATA' || request.action === 'EXTRACT_PAGE_CONTENT' || request.type === 'EXTRACT_PAGE_CONTENT') {
    const data = extractCleanPageText();
    sendResponse(data);
  } else if (request.action === 'GET_SELECTION') {
    const currentSel = window.getSelection().toString().trim();
    sendResponse({ selectedText: currentSel || lastSelectedText });
  }
  return true;
});
