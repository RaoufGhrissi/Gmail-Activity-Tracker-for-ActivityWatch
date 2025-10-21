let AW_BASE_URL = "http://localhost:5600/api/0";
const BUCKET_ID = "aw-watcher-gmail";
const HEARTBEAT_PULSETIME = 60;

async function init() {
  const settings = await chrome.storage.local.get("aw_port");
  const port = settings.aw_port || "5600";
  if (!settings.aw_port) await chrome.storage.local.set({ aw_port: port });

  AW_BASE_URL = `http://localhost:${port}/api/0`;

  try {
    await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: "aw-watcher-gmail",
        type: "gmail.activity",
        hostname: "browser"
      }),
    });
  } catch (err) {
    console.warn("[AW-Gmail] Server unreachable during init");
  }
}

chrome.storage.onChanged.addListener(init);

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "aw_event_finished") {
    handleFinishedEvent(msg.data).then(() => {
      // Clear the specific cache when finished
      if (msg.data.activity === "composing_email") {
        chrome.storage.local.remove("compose_cache");
      } else {
        chrome.storage.local.remove("reading_cache");
      }
    });
    return true;
  }
  if (msg.type === "aw_cache_update") {
    updateCache(msg.data);
    return true;
  }
});

async function updateCache(data) {
  const timestamp = new Date().toISOString();
  if (data.activity === "composing_email") {
    // Single compose session at a time
    await chrome.storage.local.set({ compose_cache: { ...data, updated_at: timestamp } });
  } else {
    // Single reading session at a time
    await chrome.storage.local.set({ reading_cache: { ...data, updated_at: timestamp } });
  }
}

async function handleFinishedEvent(data) {
  const event = {
    timestamp: new Date(Date.now() - (data.duration * 1000)).toISOString(),
    duration: data.duration,
    data,
  };

  // 1. Try to send to AW
  try {
    const res = await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([event]),
    });
    if (!res.ok) {
      throw new Error();
    } else {
      const { event_history = [] } = await chrome.storage.local.get("event_history");
      event_history.unshift(event);
      if (event_history.length > 50) {
        event_history.pop();
      }
      await chrome.storage.local.set({ event_history });
    }
  } catch (err) {
    console.warn("[AW-Gmail] Failed to send event to AW");
  }
}

init();
