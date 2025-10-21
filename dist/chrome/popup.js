const api = typeof browser !== "undefined" ? browser : chrome;

const AW_BASE_URL = "http://localhost:5600/api/0";
const AW_HOME_URL = "http://127.0.0.1:5600/#/home";
const BUCKET_ID = "aw-watcher-gmail";

async function checkConnection() {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  try {
    const res = await fetch(`${AW_BASE_URL}/buckets/${BUCKET_ID}`);
    if (res.ok) {
      dot.classList.add("connected");
      text.textContent = "ActivityWatch connected";
    } else {
      text.textContent = "Bucket not found";
    }
  } catch {
    text.textContent = "ActivityWatch offline";
  }
}

document.getElementById("openAW").addEventListener("click", () => {
  api.tabs.create({ url: AW_HOME_URL });
});

checkConnection();
