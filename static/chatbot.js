// --- Constants ---
const BOT_AVATAR = "🤖";
const USER_AVATAR = "👤";

// --- DOM Elements ---
const chatBox = document.getElementById("chat");
const sendSound = document.getElementById("messageSound");
const receiveSound = document.getElementById("messageSound");
const form = document.getElementById("chatForm");
const msgInput = document.getElementById("msgInput");
const themeToggle = document.getElementById("themeToggle");
const languageToggle = document.getElementById("languageToggle");
const clearBtn = document.getElementById("clearBtn");
const downloadBtn = document.getElementById("downloadBtn");

// --- Language Setup ---
let lang = localStorage.getItem("chat_lang") || "en";
languageToggle.value = lang;

const welcomeMessages = {
  en: ["👋 Welcome! I'm your cybercrime assistant."],
  ur: ["👋 خوش آمدید! میں آپ کی سائبر کرائم اسسٹنٹ ہوں۔"],
  roman: ["👋 Khush Aamdeed! Main aap ki cybercrime assistant hoon."]
};

function getHistoryKey(language) {
  return `chat_history_${language}`;
}

let chatHistory = JSON.parse(localStorage.getItem(getHistoryKey(lang)) || "[]");

// --- Theme ---
function setTheme(light) {
  document.body.classList.toggle("light", light);
  themeToggle.checked = light;
  localStorage.setItem("chat_theme", light ? "light" : "dark");
}
setTheme(localStorage.getItem("chat_theme") === "light");
themeToggle.addEventListener("change", () => setTheme(themeToggle.checked));

// --- UI Localization ---
function localizeUI() {
  if (lang === "ur") {
    msgInput.placeholder = "سوال لکھیں، جیسے 'پیکا کیا ہے؟'";
    clearBtn.textContent = "چیٹ صاف کریں";
    downloadBtn.textContent = "پی ڈی ایف ڈاؤن لوڈ کریں";
    form.querySelector("button[type='submit']").textContent = "ارسال کریں";
  } else if (lang === "roman") {
    msgInput.placeholder = "Sawal likhain, jese 'PECA kya hai?'";
    clearBtn.textContent = "Chat saaf karein";
    downloadBtn.textContent = "PDF download karein";
    form.querySelector("button[type='submit']").textContent = "Bhejein";
  } else {
    msgInput.placeholder = "Ask about cybercrime, scams, PECA, reporting fraud...";
    clearBtn.textContent = "Clear Chat";
    downloadBtn.textContent = "Download PDF";
    form.querySelector("button[type='submit']").textContent = "Send";
  }
}

// --- Add Bubble to Chat ---
function addBubble(role, text, animated = false) {
  const row = document.createElement("div");
  row.className = "bubble-row " + role;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "bot" ? BOT_AVATAR : USER_AVATAR;

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role === "bot") {
    row.appendChild(avatar);
    row.appendChild(bubble);
    receiveSound.play();
    if (animated) {
      let i = 0;
      function type() {
        if (i <= text.length) {
          bubble.innerHTML = marked.parse(text.substring(0, i) + '<span class="typing">|</span>');
          i++;
          setTimeout(type, 14 + Math.random() * 20);
        } else {
          bubble.innerHTML = marked.parse(text);
        }
      }
      type();
    } else {
      bubble.innerHTML = marked.parse(text);
    }
  } else {
    sendSound.play();
    bubble.innerHTML = text;
    row.appendChild(bubble);
    row.appendChild(avatar);
  }

  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// --- Render Chat UI ---
function renderChat() {
  chatBox.innerHTML = "";
  if (chatHistory.length === 0) {
    const welcome = welcomeMessages[lang][0];
    chatHistory.push({ role: "bot", text: welcome });
    localStorage.setItem(getHistoryKey(lang), JSON.stringify(chatHistory));
  }
  chatHistory.forEach(({ role, text }) => addBubble(role, text));
}

// --- Form Submission ---
form.onsubmit = async (e) => {
  e.preventDefault();
  const msg = msgInput.value.trim();
  if (!msg) return;

  addBubble("user", msg);
  chatHistory.push({ role: "user", text: msg });
  localStorage.setItem(getHistoryKey(lang), JSON.stringify(chatHistory));
  msgInput.value = "";

  // Typing bubble
  const row = document.createElement("div");
  row.className = "bubble-row bot";
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = BOT_AVATAR;
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = `<span class="typing">Typing...</span>`;
  row.appendChild(avatar);
  row.appendChild(bubble);
  chatBox.appendChild(row);
  chatBox.scrollTop = chatBox.scrollHeight;

  const res = await fetch("/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({
      message: msg,
      lang,
      history: JSON.stringify(chatHistory.map(entry => ({
        role: entry.role === "bot" ? "assistant" : entry.role,
        text: entry.text
      })))
    }),
  });

  let reply = "⚠️ Something went wrong.";
  try {
    const data = await res.json();
    if (data.reply) reply = data.reply;
  } catch (err) {}

  setTimeout(() => {
    row.remove();
    addBubble("bot", reply, true);
    chatHistory.push({ role: "bot", text: reply });
    localStorage.setItem(getHistoryKey(lang), JSON.stringify(chatHistory));
  }, 400 + Math.random() * 300);
};

// --- Language Toggle ---
languageToggle.onchange = () => {
  const newLang = languageToggle.value;
  localStorage.setItem("chat_lang", newLang);
  localStorage.setItem(getHistoryKey(lang), JSON.stringify(chatHistory));
  lang = newLang;
  chatHistory = JSON.parse(localStorage.getItem(getHistoryKey(lang)) || "[]");
  const newWelcome = welcomeMessages[lang][0];
  if (chatHistory.length === 0 || (chatHistory.length === 1 && chatHistory[0].role === "bot")) {
    chatHistory = [{ role: "bot", text: newWelcome }];
  } else {
    chatHistory = chatHistory.map((entry, i) => {
      if (i === 0 && entry.role === "bot") return { role: "bot", text: newWelcome };
      return entry;
    });
  }
  localStorage.setItem(getHistoryKey(lang), JSON.stringify(chatHistory));
  localizeUI();
  renderChat();
};

// --- Clear Chat ---
clearBtn.onclick = () => {
  const confirmText =
    lang === "ur"
      ? "کیا آپ چیٹ صاف کرنا چاہتے ہیں؟"
      : lang === "roman"
      ? "Kya aap chat saaf karna chahte hain?"
      : "Clear all chat history?";
  if (confirm(confirmText)) {
    chatHistory = [];
    localStorage.removeItem(getHistoryKey(lang));
    renderChat();
  }
};

// --- Download Chat as PDF ---
downloadBtn.onclick = () => {
  const doc = new window.jspdf.jsPDF();
  doc.setFont("helvetica");
  doc.setFontSize(13);
  doc.text("ByteBack Chat History", 10, 10);
  let y = 20;
  chatHistory.forEach(({ role, text }) => {
    doc.setTextColor(role === "user" ? 0 : 30, role === "user" ? 150 : 30, role === "user" ? 60 : 150);
    doc.text((role === "user" ? "You: " : "Bot: ") + text, 10, y, { maxWidth: 180 });
    y += 12;
  });
  doc.save("chat_history.pdf");
};

// --- Initialize ---
localizeUI();
renderChat();