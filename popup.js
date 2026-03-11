const _browser = globalThis.browser || globalThis.chrome;
let AW_BASE_URL = "http://localhost:5600/api/0";
const BUCKET_ID = "aw-watcher-gmail";
let CURRENT_PORT = "5600";

// ── Load Port Settings & Status ─────────────────────────────────────────────
async function initSettings() {
  const settings = await _browser.storage.local.get("aw_port");
  CURRENT_PORT = settings.aw_port || "5600";
  document.getElementById("portInput").value = CURRENT_PORT;
  AW_BASE_URL = `http://localhost:${CURRENT_PORT}/api/0`;

  checkConnection();
  loadEvents();
}

// ── Settings Logic ─────────────────────────────────────────────────────────
const portInput = document.getElementById("portInput");
const saveBtn = document.getElementById("savePort");

const triggerSave = async () => {
  const port = portInput.value.trim();
  if (port && port !== CURRENT_PORT) {
    await _browser.storage.local.set({ aw_port: port });
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

document.getElementById("clearAll").addEventListener("click", async () => {
  if (confirm("Clear all local history and active caches?")) {
    await _browser.storage.local.remove(["event_history", "compose_cache", "reading_cache"]);
    location.reload();
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

// ── Load events and active sessions ─────────────────────────────────────────
async function loadEvents() {
  const listEl = document.getElementById("eventList");
  const countEl = document.getElementById("eventCount");
  const emptyEl = document.getElementById("emptyState");

  const { compose_cache = null, reading_cache = null, event_history = [] } = 
    await _browser.storage.local.get(["compose_cache", "reading_cache", "event_history"]);

  listEl.innerHTML = "";
  let totalCount = 0;

  // 1. Render Active Sessions (In Progress)
  const activeEvents = [];
  if (reading_cache) activeEvents.push({ ...reading_cache, status: "In Progress" });
  if (compose_cache) activeEvents.push({ ...compose_cache, status: "In Progress" });

  if (activeEvents.length > 0) {
    const div = document.createElement("div");
    div.className = "date-divider";
    div.textContent = "Active Sessions";
    listEl.appendChild(div);

    activeEvents.forEach(data => {
      totalCount++;
      listEl.appendChild(createEventCard(data, null, true));
    });
  }

  // 2. Render History
  if (event_history.length > 0) {
    const div = document.createElement("div");
    div.className = "date-divider";
    div.textContent = "Recently Finished";
    listEl.appendChild(div);

    let lastDate = "";
    event_history.forEach(ev => {
      totalCount++;
      const dateObj = new Date(ev.timestamp);
      const dateStr = dateObj.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

      if (dateStr !== lastDate && lastDate !== "") {
          const subDiv = document.createElement("div");
          subDiv.className = "date-divider";
          subDiv.style.borderTop = "0";
          subDiv.style.marginTop = "8px";
          subDiv.textContent = dateStr;
          listEl.appendChild(subDiv);
      }
      lastDate = dateStr;

      listEl.appendChild(createEventCard(ev.data, ev.timestamp, false, ev.duration));
    });
  }

  countEl.textContent = totalCount;
  if (totalCount === 0) {
    emptyEl.style.display = "flex";
  } else {
    emptyEl.style.display = "none";
  }
}

function createEventCard(data, timestamp, isInProgress, duration) {
  const card = document.createElement("div");
  card.className = "event-card";
  if (isInProgress) card.style.borderLeft = "3px solid var(--accent)";

  const time = timestamp ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Now";
  const durationStr = isInProgress ? "Recording..." : formatDuration(duration);

  let contentHtml = "";
  if (data.subject || data.title) {
    contentHtml += `<div class="subject">${data.subject || data.title}</div>`;
  }
  if (data.from) contentHtml += `<div class="detail-row"><span>From:</span> ${data.from}</div>`;
  if (data.to?.length) contentHtml += `<div class="detail-row"><span>To:</span> ${data.to.join(", ")}</div>`;
  if (data.cc?.length) contentHtml += `<div class="detail-row"><span>Cc:</span> ${data.cc.join(", ")}</div>`;
  if (data.bcc?.length) contentHtml += `<div class="detail-row"><span>Bcc:</span> ${data.bcc.join(", ")}</div>`;

  card.innerHTML = `
    <div class="row">
      <div>
        <span class="pill ${getPillClass(data.activity || "")}">${formatActivity(data.activity || "")}</span>
        <span class="time-stamp">${time}</span>
      </div>
      <div class="duration">${durationStr}</div>
    </div>
    <div class="content-body">${contentHtml || '<div class="meta">No extra data</div>'}</div>
  `;
  return card;
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
