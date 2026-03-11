const _browser = globalThis.browser || globalThis.chrome;
const activeSessions = {
  composing: null, // { startTime, lastMeta }
  reading: null,   // { type, key, startTime, lastMeta }
};

function getComposeMetadata(form) {
  const getRecipients = (name) => Array.from(
    form.querySelectorAll(`div[name="${name}"] [data-hovercard-id]`)).map(
      el => el.getAttribute('data-hovercard-id')).filter(
        Boolean
      );

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
  const form = document.querySelector('div[role="dialog"] form');
  
  if (form) {
    const meta = getComposeMetadata(form);
    
    if (!activeSessions.composing) {
        if (activeSessions.reading) {
            finishSession(activeSessions.reading.type, activeSessions.reading);
            activeSessions.reading = null;
        }
        activeSessions.composing = { startTime: Date.now(), lastMeta: meta };
    } else {
        activeSessions.composing.lastMeta = meta;
    }
    
    updateBackgroundCache("composing_email", meta);
    return;
  } else {
    if (activeSessions.composing) {
        finishSession("composing_email", activeSessions.composing);
        activeSessions.composing = null;
    }

    // 2. MAIN PAGE ACTIVITY (Reading/Browsing)
    let activity = "reading_inbox";
    let meta = {};

    if (hash.includes('inbox/') || hash.includes('sent/') || hash.includes('all/')) {
      const fromEl = document.querySelector('span.gD');
      const from = fromEl?.getAttribute('email') || fromEl?.getAttribute('data-hovercard-id') || fromEl?.innerText || "";
      const to = Array.from(document.querySelectorAll('.gE [email], .gE [data-hovercard-id]'))
        .map(el => el.getAttribute('email') || el.getAttribute('data-hovercard-id'))
        .filter(e => e && e !== from);

      activity = "reading_email";
      meta = {
        subject: document.querySelector('h2.hP')?.innerText || "",
        from,
        to,
      };
    }

    if (!activeSessions.reading || activeSessions.reading.key !== hash) {
        if (activeSessions.reading) {
          finishSession(activeSessions.reading.type, activeSessions.reading);
        }
        activeSessions.reading = { 
          type: activity,
          key: hash,
          startTime: Date.now(),
          lastMeta: meta 
        };
    } else {
      activeSessions.reading.lastMeta = meta;
    }

    updateBackgroundCache(activity, meta);
  }
}

function updateBackgroundCache(type, meta) {
    if (typeof _browser !== "undefined" && _browser.runtime?.id) {
        _browser.runtime.sendMessage({ type: "aw_cache_update", data: { activity: type, ...meta } });
    }
}

function finishSession(type, session) {
  const data = {
    activity: type,
    ...session.lastMeta,
    url: window.location.href,
    title: document.title,
    duration: (Date.now() - session.startTime) / 1000,
    finished_at: new Date().toISOString()
  };

  _browser.runtime.sendMessage({ type: "aw_event_finished", data });
}

setInterval(() => {
  try {
    processGmailActivity();
  } catch (err) {
    console.error("[AW-Gmail] Activity loop error:", err);
  }
}, 2000);
