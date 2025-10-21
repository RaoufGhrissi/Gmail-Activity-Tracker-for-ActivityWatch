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
  if (msg.type === "aw_heartbeat") {
    handleHeartbeat(msg.data).then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function handleHeartbeat(data) {
  const heartbeat = {
    timestamp: new Date().toISOString(),
    duration: 0,
    data: data
  };
  try {
    await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}/heartbeat?pulsetime=${HEARTBEAT_PULSETIME}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(heartbeat),
    });
  } catch (err) {
    const { offline_events = [] } = await chrome.storage.local.get("offline_events");
    offline_events.push(heartbeat);
    await chrome.storage.local.set({ offline_events: offline_events.slice(-500) });
  }
}

init();
