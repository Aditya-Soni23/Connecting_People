// Firebase imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  get,
  push,
  onChildAdded,
  onValue,
  update
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-database.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCJQSRiOKjAscoqEig57zqgMvrYvb_bO00",
  authDomain: "connecting-people-25656.firebaseapp.com",
  databaseURL: "https://connecting-people-25656-default-rtdb.firebaseio.com/",
  projectId: "connecting-people-25656",
  storageBucket: "connecting-people-25656.firebasestorage.app",
  messagingSenderId: "669225824395",
  appId: "1:669225824395:web:aed6d9ec20708eb361a48e",
  measurementId: "G-FP5SH58CTH",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- NICKNAME HANDLING ---
let nickname;
const params = new URLSearchParams(window.location.search);
const nickFromUrl = params.get("nick");

if (nickFromUrl) {
  nickname = nickFromUrl;
  localStorage.setItem("nickname", nickname);
} else {
  nickname = localStorage.getItem("nickname");
}

if (!nickname || nickname.trim() === "") {
  window.location.href = "index.html";
}

// --- FIREBASE REFS ---
const usersRef = ref(db, "users");
const messagesRef = ref(db, "messages");
const userRef = ref(db, `users/${nickname}`);

// --- DOM ELEMENTS ---
const nicknameDisplay = document.getElementById("nicknameDisplay");
const onlineUsersList = document.getElementById("onlineUsers");
const chatMessages = document.getElementById("chatMessages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const coinCount = document.getElementById("coinCount");

// --- INIT ---
update(userRef, { online: true, lastSeen: Date.now() });

// Helper function → extract emoji from badge name
function getBadgeEmoji(badgeName) {
  if (!badgeName) return "";
  return badgeName.split(" ")[0];
}

// Show nickname + badge in real time
onValue(userRef, (snapshot) => {
  const data = snapshot.val() || {};
  const badgeEmoji = data.badge ? getBadgeEmoji(data.badge) : "";
  nicknameDisplay.innerHTML = `${nickname} ${badgeEmoji}`;
});

// Heartbeat system
setInterval(() => {
  update(userRef, { online: true, lastSeen: Date.now() });
}, 10000);

// Mark user offline when leaving
window.addEventListener("beforeunload", () => {
  update(userRef, { online: false, lastSeen: Date.now() });
});

// --- SHOW ONLINE USERS ---
onValue(usersRef, (snapshot) => {
  onlineUsersList.innerHTML = "";
  const now = Date.now();

  snapshot.forEach((userSnap) => {
    const user = userSnap.key;
    const data = userSnap.val();

    if (data.online && now - data.lastSeen < 20000) {
      const li = document.createElement("li");

      if (user === "Aditya Soni") {
        li.innerHTML = `<span style="background: linear-gradient(135deg, #00fff0 0%, #8b00ff 100%); -webkit-background-clip: text; color: transparent; font-weight: bold;">${user} 💎</span>`;
      } else if (user === "Admin Bot") {
        li.innerHTML = `<span style="background: linear-gradient(135deg, #00b09b, #96c93d); -webkit-background-clip: text; color: transparent; font-weight: bold;">${user} 🤖</span>`;
      } else {
        const badgeEmoji = data.badge ? getBadgeEmoji(data.badge) : "";
        li.innerHTML = `${user} ${badgeEmoji}`;
      }

      onlineUsersList.appendChild(li);
    }
  });
});

// --- SHOW MESSAGES IN REALTIME ---
onChildAdded(messagesRef, (snapshot) => {
  const msg = snapshot.val();
  const div = document.createElement("div");
  div.classList.add("message");

  const badgeEmoji = msg.badge ? getBadgeEmoji(msg.badge) : "";

  const date = new Date(msg.timestamp);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString([], { day: '2-digit', month: 'short', year: '2-digit' });
  const footer = `<div class="msg-time">${dateString} • ${timeString}</div>`;

  if (msg.sender === nickname) {
    div.classList.add("sent");
    div.innerHTML = `
      <div class="bubble mine">
        <strong>You ${badgeEmoji}:</strong> ${msg.text}
        ${footer}
      </div>`;
  } else if (msg.sender === "Aditya Soni") {
    div.classList.add("received");
    div.innerHTML = `
      <div class="bubble admin">
        <strong>${msg.sender} 💎:</strong> ${msg.text}
        ${footer}
      </div>`;
  } else if (msg.sender === "Admin Bot") {
    div.classList.add("received");
    div.innerHTML = `
      <div class="bubble bot">
        <strong>${msg.sender} 🤖:</strong> ${msg.text}
        ${footer}
      </div>`;
  } else {
    div.classList.add("received");
    div.innerHTML = `
      <div class="bubble others">
        <strong>${msg.sender} ${badgeEmoji}:</strong> ${msg.text}
        ${footer}
      </div>`;
  }

  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

// --- SEND MESSAGE ---
sendBtn.addEventListener("click", sendMessage);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") sendMessage();
});

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  const userSnap = await get(userRef);
  const badge = userSnap.exists() && userSnap.val().badge ? userSnap.val().badge : "";

  push(messagesRef, {
    sender: nickname,
    text: text,
    badge: badge,
    timestamp: Date.now(),
  });

  const currentCoins = userSnap.exists() && userSnap.val().coins ? userSnap.val().coins : 0;
  update(userRef, { coins: currentCoins + 1 });
  coinCount.textContent = currentCoins + 1;

  messageInput.value = "";
}

// --- SHOW COINS IN REALTIME ---
onValue(ref(db, `users/${nickname}/coins`), (snapshot) => {
  coinCount.textContent = snapshot.exists() ? snapshot.val() : 0;
});

// --- LOGOUT BUTTON ---
const auth = getAuth(app);
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth)
      .then(() => {
        localStorage.removeItem("nickname");
        window.location.href = "index.html";
      })
      .catch((error) => {
        console.error("Logout failed:", error);
      });
  });
}

// --- POPUP SYSTEM ---
function showPopup(message, color = "#28a745") {
  const popup = document.createElement("div");
  popup.textContent = message;
  popup.style.position = "fixed";
  popup.style.top = "50%";
  popup.style.left = "50%";
  popup.style.transform = "translate(-50%, -50%)";
  popup.style.background = color;
  popup.style.color = "white";
  popup.style.padding = "15px 25px";
  popup.style.borderRadius = "12px";
  popup.style.fontWeight = "600";
  popup.style.textAlign = "center";
  popup.style.zIndex = "9999";
  popup.style.fontFamily = "Poppins, sans-serif";
  popup.style.boxShadow = "0 0 20px rgba(0,0,0,0.4)";
  popup.style.opacity = "0";
  popup.style.transition = "opacity 0.3s ease";
  document.body.appendChild(popup);

  const audio = new Audio("coin.mp3");
  audio.play();

  setTimeout(() => (popup.style.opacity = "1"), 50);
  setTimeout(() => {
    popup.style.opacity = "0";
    setTimeout(() => popup.remove(), 500);
  }, 3000);
}

// --- SHOP LOGIC ---
const shopBtn = document.getElementById("shop");
const shopModal = document.getElementById("shopModal");
const closeShop = document.getElementById("closeShop");
const badgeGrid = document.getElementById("badgeGrid");

const badges = [
  { name: "⚡ Lightning", cost: 1000 },
  { name: "🔥 Inferno", cost: 1000 },
  { name: "👑 Royal", cost: 1000 },
  { name: "🌌 Galaxy", cost: 1000 },
  { name: "🚀 Astral", cost: 1000 },
  { name: "🌙 Eclipse", cost: 1000 },
  { name: "🧬 Quantum", cost: 1000 },
  { name: "🌠 Nebula", cost: 1000 },
  { name: "🪐 Orbit", cost: 1000 },
  { name: "⚔️ Legend", cost: 1000 },
  { name: "🦋 Mirage", cost: 1000 },
  { name: "🕶️ Shadow", cost: 1000 },
];

// Open/close shop
shopBtn.addEventListener("click", () => {
  shopModal.style.display = "flex";
});
closeShop.addEventListener("click", () => {
  shopModal.style.display = "none";
});
window.addEventListener("click", (e) => {
  if (e.target === shopModal) shopModal.style.display = "none";
});

// Generate badges dynamically
function loadBadges() {
  badgeGrid.innerHTML = "";
  badges.forEach((b) => {
    const div = document.createElement("div");
    div.classList.add("badge");
    div.textContent = `${b.name} - ${b.cost}💰`;
    div.addEventListener("click", () => purchaseBadge(b));
    badgeGrid.appendChild(div);
  });
}
loadBadges();

// Purchase badge logic
async function purchaseBadge(badge) {
  const snap = await get(userRef);
  if (!snap.exists()) return;
  const userData = snap.val();
  const coins = userData.coins || 0;

  if (coins < badge.cost) {
    showPopup("❌ Not enough coins!", "#e74c3c");
    return;
  }

  const newCoins = coins - badge.cost;
  await update(userRef, {
    coins: newCoins,
    badge: badge.name,
  });

  coinCount.textContent = newCoins;
  showPopup(`✅ Purchased ${badge.name}! (Previous badge replaced)`);
}

// --- VOICE CHAT BUTTON ---
const voiceChatBtn = document.getElementById("voiceChatBtn");
const meetLink = "https://meet.google.com/vrs-agqm-wqn"; 
voiceChatBtn.addEventListener("click", () => {
  window.open(meetLink, "_blank");
});

// --- MOBILE USERS PANEL TOGGLE ---
const toggleUsersBtn = document.getElementById("toggleUsersBtn");
const usersPanel = document.getElementById("usersPanel");

if (toggleUsersBtn && usersPanel) {
  toggleUsersBtn.addEventListener("click", () => {
    usersPanel.classList.toggle("show-users");
  });
}
const closeUsersBtn = document.getElementById("closeUsersBtn");

closeUsersBtn.addEventListener("click", () => {
  usersPanel.classList.remove("show-users");
});
