function getComposeMetadata(form) {
  const getRecipients = (name) => Array.from(form.querySelectorAll(`div[name="${name}"] [email], div[name="${name}"] [data-hovercard-id]`))
    .map(el => el.getAttribute('email') || el.getAttribute('data-hovercard-id'))
    .filter(Boolean);

  return {
    subject: form.querySelector('input[name="subjectbox"]')?.value || "",
    to: getRecipients('to'),
    cc: getRecipients('cc'),
    bcc: getRecipients('bcc')
  };
}

function processGmailActivity() {
  const hash = window.location.hash;

  // 1. COMPOSING (High Priority)
  // Find all compose dialogs
  const forms = Array.from(document.querySelectorAll('div[role="dialog"] form, form.aoD'));

  // Filter for those that are "open" (not minimized)
  // Minimized Gmail dialogs are usually around 30-40px high.
  const activeForms = forms.filter(f => {
    const rect = f.getBoundingClientRect();
    return rect.height > 100; // Open dialogs are much taller than minimized ones
  });

  if (activeForms.length > 0) {
    // Prioritize the focused one, otherwise take the first open one
    const focusedForm = activeForms.find(f => f.matches(':focus-within'));
    const targetForm = focusedForm || activeForms[0];

    const meta = getComposeMetadata(targetForm);
    return {
      activity: "composing_email",
      ...meta
    };
  }

  // 2. READING EMAIL
  if (hash.includes('inbox/') || hash.includes('sent/') || hash.includes('all/')) {
    const fromEl = document.querySelector('span.gD');
    const from = fromEl?.getAttribute('email') || fromEl?.getAttribute('data-hovercard-id') || fromEl?.innerText || "";
    const participants = Array.from(document.querySelectorAll('.gE [email], .gE [data-hovercard-id]'))
      .map(el => el.getAttribute('email') || el.getAttribute('data-hovercard-id'))
      .filter(e => e && e !== from);

    return {
      activity: "reading_email",
      subject: document.querySelector('h2.hP')?.innerText || "",
      from,
      to: [...new Set(participants)]
    };
  }

  if (['#inbox', '#all', '#sent', '#', '', '#priority'].includes(hash) || hash.startsWith('#label/')) {
    return { activity: "reading_inbox" };
  }

  return { activity: "browsing_gmail" };
}

setInterval(() => {
  try {
    const data = processGmailActivity();
    data.url = window.location.href;
    data.title = document.title;

    chrome.runtime.sendMessage({ type: "aw_heartbeat", data }, (response) => {
      if (chrome.runtime.lastError) {
        // Service worker might be asleep
      }
    });
  } catch (err) {
    console.error("[AW-Gmail] Error:", err);
  }
}, 5000);
