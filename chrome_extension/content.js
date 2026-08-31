// Gemini Nano Studio Extension - Content Script for Text Extraction

function extractCleanPageText() {
  const clone = document.body.cloneNode(true);

  // Remove elements that don't contain meaningful article text
  const selectorsToRemove = [
    'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
    'nav', 'footer', 'header', 'aside',
    '.ad', '.ads', '.advertisement', '.social-share', '.cookie-banner',
    '#comments', '.comments'
  ];

  selectorsToRemove.forEach(sel => {
    clone.querySelectorAll(sel).forEach(el => el.remove());
  });

  // Extract text and clean up whitespace
  let text = clone.innerText || clone.textContent || '';
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n').trim();

  // Limit to reasonable context size (~10,000 chars)
  if (text.length > 12000) {
    text = text.substring(0, 12000) + '\n\n[הטקסט קוצר עקב מגבלת אורך...]';
  }

  return {
    title: document.title || '',
    url: window.location.href,
    text: text
  };
}

// Listen for messages from Side Panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'EXTRACT_PAGE_CONTENT') {
    const data = extractCleanPageText();
    sendResponse(data);
  }
  return true;
});
