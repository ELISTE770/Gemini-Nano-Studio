// Gemini Nano Studio Extension - Content Script for Reliable Page & Selection Extraction

let lastUserSelection = '';

// Track user selection in real-time
document.addEventListener('selectionchange', () => {
  const sel = window.getSelection() ? window.getSelection().toString().trim() : '';
  if (sel) {
    lastUserSelection = sel;
  }
});

document.addEventListener('mouseup', () => {
  const sel = window.getSelection() ? window.getSelection().toString().trim() : '';
  if (sel) {
    lastUserSelection = sel;
  }
});

// Robust text extractor that doesn't rely on detached DOM innerText
function getPageExtraction() {
  const sel = (window.getSelection() ? window.getSelection().toString().trim() : '') || lastUserSelection;
  
  // Find main content container if available
  const container = document.querySelector('article, main, [role=""main""], .mw-parser-output, .article-content, .post-content, #content, #main-content') || document.body;

  // Extract from paragraphs and headings
  const nodes = container.querySelectorAll('h1, h2, h3, h4, p, li, blockquote');
  let extractedLines = [];

  if (nodes && nodes.length >= 3) {
    nodes.forEach(node => {
      // Ignore hidden or script/ad nodes
      if (node.closest('script, style, noscript, nav, footer, header, aside, .ad, .ads, .comments, #comments')) return;
      const text = node.textContent ? node.textContent.trim() : '';
      if (text.length > 5) {
        extractedLines.push(text);
      }
    });
  }

  let fullText = extractedLines.join('\n\n');

  // Fallback to body textContent if paragraph extraction was too sparse
  if (!fullText || fullText.length < 100) {
    fullText = (container.textContent || document.body.textContent || '').replace(/\s+/g, ' ').trim();
  }

  // Trim to 12,000 characters max
  if (fullText.length > 12000) {
    fullText = fullText.substring(0, 12000) + '\n\n[הטקסט קוצר עקב מגבלת אורך...]';
  }

  return {
    title: document.title || 'עמוד אינטרנט',
    url: window.location.href,
    text: fullText,
    selectedText: sel
  };
}

// Handle messages from Side Panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_PAGE_DATA' || request.action === 'EXTRACT_PAGE_CONTENT' || request.type === 'EXTRACT_PAGE_CONTENT') {
    const res = getPageExtraction();
    sendResponse(res);
  } else if (request.action === 'GET_SELECTION') {
    const sel = (window.getSelection() ? window.getSelection().toString().trim() : '') || lastUserSelection;
    sendResponse({ selectedText: sel });
  }
  return true;
});
