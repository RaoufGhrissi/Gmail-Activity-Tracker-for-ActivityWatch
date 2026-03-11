const _browser = globalThis.browser || globalThis.chrome;
let AW_BASE_URL = "http://localhost:5600/api/0";
const BUCKET_ID = "aw-watcher-gmail";
const HEARTBEAT_PULSETIME = 60;

async function init() {
  const settings = await _browser.storage.local.get("aw_port");
  const port = settings.aw_port || "5600";
  if (!settings.aw_port) await _browser.storage.local.set({ aw_port: port });

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

_browser.storage.onChanged.addListener(init);

_browser.runtime.onMessage.addListener(async (msg, sendResponse) => {
  if (msg.type === "aw_event_finished") {
    await handleFinishedEvent(msg.data);    
    // Clear the specific cache when finished
    if (msg.data.activity === "composing_email") {
      await _browser.storage.local.remove("compose_cache");
    } else {
      await _browser.storage.local.remove("reading_cache");
    }
    return true;
  }
  if (msg.type === "aw_cache_update") {
    await updateCache(msg.data);
    return true;
  }
});

async function updateCache(data) {
  const timestamp = new Date().toISOString();
  if (data.activity === "composing_email") {
    // Single compose session at a time
    await _browser.storage.local.set({ compose_cache: { ...data, updated_at: timestamp } });
  } else {
    // Single reading session at a time
    await _browser.storage.local.set({ reading_cache: { ...data, updated_at: timestamp } });
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
      const { event_history = [] } = await _browser.storage.local.get("event_history");
      event_history.unshift(event);
      if (event_history.length > 50) {
        event_history.pop();
      }
      await _browser.storage.local.set({ event_history });
    }
  } catch (err) {
    console.warn("[AW-Gmail] Failed to send event to AW");
  }
}

init();
