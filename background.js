const api = typeof browser !== "undefined" ? browser : chrome;

const AW_BASE_URL = "http://localhost:5600/api/0";
const BUCKET_ID = "aw-watcher-gmail";

async function init() {
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
  } catch {
    console.warn("[AW-Gmail] Server unreachable during init");
  }
}

api.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== api.runtime.id) return;

  if (msg.type === "aw_event_finished") {
    sendEvent(msg.data);
    return true;
  }
});

async function sendEvent(data) {
  const event = {
    timestamp: new Date(Date.now() - (data.duration * 1000)).toISOString(),
    duration: data.duration,
    data,
  };

  try {
    const res = await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([event]),
    });
    if (!res.ok) {
      console.warn("[AW-Gmail] Failed to send event — server returned", res.status);
    }
  } catch {
    console.warn("[AW-Gmail] Failed to send event to AW");
  }
}

init();
