let AW_BASE_URL = "http://localhost:5600/api/0";
const BUCKET_ID = "aw-watcher-gmail";
let CURRENT_PORT = "5600";

// ── Load Port Settings & Status ─────────────────────────────────────────────
async function initSettings() {
  const settings = await chrome.storage.local.get(["aw_port", "offline_events"]);
  CURRENT_PORT = settings.aw_port || "5600";
  document.getElementById("portInput").value = CURRENT_PORT;
  AW_BASE_URL = `http://localhost:${CURRENT_PORT}/api/0`;

  checkSyncStatus(settings.offline_events || []);
  checkConnection();
  loadEvents();
}

function checkSyncStatus(events) {
  const badgeEl = document.getElementById("unsyncedBadge");
  const countEl = document.getElementById("unsyncedCount");
  if (events.length > 0) {
    badgeEl.style.display = "block";
    countEl.textContent = events.length;
  } else {
    badgeEl.style.display = "none";
  }
}

// ── Settings Logic ─────────────────────────────────────────────────────────
const portInput = document.getElementById("portInput");
const saveBtn = document.getElementById("savePort");

const triggerSave = async () => {
  const port = portInput.value.trim();
  if (port && port !== CURRENT_PORT) {
    await chrome.storage.local.set({ aw_port: port });
    location.reload();
  }
};

portInput.addEventListener("input", () => {
  saveBtn.style.display = portInput.value.trim() !== CURRENT_PORT ? "block" : "none";
});

portInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") triggerSave();
});

saveBtn.addEventListener("click", triggerSave);

document.getElementById("unsyncedBadge").addEventListener("click", async () => {
  const badge = document.getElementById("unsyncedBadge");
  const { offline_events = [] } = await chrome.storage.local.get("offline_events");
  if (!offline_events.length) return;

  const originalText = badge.innerHTML;
  badge.innerHTML = "Syncing...";
  badge.style.pointerEvents = "none";

  try {
    const res = await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(offline_events),
    });

    if (res.ok) {
      await chrome.storage.local.set({ offline_events: [] });
      badge.innerHTML = "Done!";
      setTimeout(() => location.reload(), 1000);
    } else {
      alert("Sync failed: Server error");
      badge.innerHTML = originalText;
      badge.style.pointerEvents = "auto";
    }
  } catch (err) {
    alert("Sync failed: ActivityWatch unreachable");
    badge.innerHTML = originalText;
    badge.style.pointerEvents = "auto";
  }
});

// ── Check ActivityWatch connection ──────────────────────────────────────────
async function checkConnection() {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  try {
    const res = await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}`);
    if (res.ok) {
      dot.classList.add("connected");
      text.textContent = "ActivityWatch";
    } else {
      dot.classList.remove("connected");
      text.textContent = "Bucket missing";
    }
  } catch {
    dot.classList.remove("connected");
    text.textContent = "AW offline";
  }
}

// ── Load recent events from ActivityWatch ───────────────────────────────────
async function loadEvents() {
  const listEl = document.getElementById("eventList");
  const countEl = document.getElementById("eventCount");
  const emptyEl = document.getElementById("emptyState");

  try {
    const res = await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}/events?limit=50`);
    if (!res.ok) throw new Error();

    const events = await res.json();
    countEl.textContent = events.length;

    if (!events.length) {
      emptyEl.style.display = "block";
      return;
    }

    emptyEl.style.display = "none";
    listEl.innerHTML = "";
    let lastDate = "";

    events.forEach(ev => {
      const dateObj = new Date(ev.timestamp);
      const dateStr = dateObj.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

      if (dateStr !== lastDate) {
        const div = document.createElement("div");
        div.className = "date-divider";
        div.textContent = dateStr;
        listEl.appendChild(div);
        lastDate = dateStr;
      }

      const card = document.createElement("div");
      card.className = "event-card";
      const data = ev.data || {};
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let contentHtml = "";
      if (data.subject) contentHtml += `<div class="subject">${data.subject}</div>`;
      if (data.from) contentHtml += `<div class="detail-row"><span>From:</span> ${data.from}</div>`;
      if (data.to?.length) contentHtml += `<div class="detail-row"><span>To:</span> ${data.to.join(", ")}</div>`;
      if (data.cc?.length) contentHtml += `<div class="detail-row"><span>CC:</span> ${data.cc.join(", ")}</div>`;

      card.innerHTML = `
        <div class="row">
          <div>
            <span class="pill ${getPillClass(data.activity || "")}">${formatActivity(data.activity || "")}</span>
            <span class="time-stamp">${time}</span>
          </div>
          <div class="duration">${formatDuration(ev.duration)}</div>
        </div>
        <div class="content-body">${contentHtml || '<div class="meta">No extra data</div>'}</div>
      `;

      listEl.appendChild(card);
    });
  } catch (err) {
    emptyEl.style.display = "flex";
    emptyEl.innerHTML = `
      <div class="icon">🔌</div>
      <div style="text-align: center;">
        Server unreachable.<br>
        Check your AW Port below.
      </div>
    `;
  }
}

function getPillClass(act) {
  if (act.includes("read")) return "reading";
  if (act.includes("comp")) return "compose";
  return "browse";
}

function formatActivity(act) {
  return act.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function formatDuration(sec) {
  if (!sec || sec < 1) return "<1s";
  return sec < 60 ? `${Math.round(sec)}s` : `${Math.floor(sec / 60)}m ${Math.round(sec % 60)}s`;
}

initSettings();
