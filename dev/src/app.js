// 1. Initialize the Grayscale Map (Centered on Norwich)
const map = L.map("map", { zoomControl: false }).setView([52.6293, 1.2979], 14);

L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  maxZoom: 19,
  attribution: "&copy; OpenStreetMap &copy; CARTO",
}).addTo(map);

// 2. Create Map Layers
const landmarkPins = L.layerGroup().addTo(map); // Visible by default
const businessPins = L.layerGroup();

// Track current view state
let currentView = "map"; // 'map' or 'box'
let currentCategory = "landmarks"; // 'landmarks' or 'businesses'
let landmarksData = [];
let businessesData = [];
let currentPanelTitle = null; // tracks which location panel is open

// Local economy percentage (team to update with real figure)
const LOCAL_ECONOMY_PERCENT = 60;

// 3. --- BULLETPROOF INFO PANEL LOGIC ---
function openInfoPanel(title, description, imageUrl, address, hours) {
  currentPanelTitle = title;

  document.getElementById("panel-title").innerText = title;
  document.getElementById("panel-description").innerText = description;

  // Safely handle Address (won't crash if the HTML tag is missing)
  const addressEl = document.getElementById("panel-address");
  if (addressEl) {
    if (address) {
      addressEl.innerText = "📍 " + address;
      addressEl.style.display = "block";
    } else {
      addressEl.style.display = "none";
    }
  }

  // Safely handle Hours
  const hoursEl = document.getElementById("panel-hours");
  if (hoursEl) {
    if (hours) {
      hoursEl.innerText = "🕒 " + hours;
      hoursEl.style.display = "block";
    } else {
      hoursEl.style.display = "none";
    }
  }

  // Safely handle Image
  const imageElement = document.getElementById("panel-image");
  if (imageElement) {
    if (imageUrl) {
      imageElement.src = imageUrl;
      imageElement.style.display = "block";
    } else {
      imageElement.style.display = "none";
    }
  }

  // Show spend section for all locations
  const spendSection = document.getElementById("panel-spend");
  if (spendSection) {
    spendSection.style.display = "block";
    document.getElementById("spend-input").value = "";
    document.getElementById("spend-confirm").style.display = "none";
  }

  // Show per-location purchase history
  renderPanelHistory(title);

  document.getElementById("info-panel").style.display = "block";
}

function closeInfoPanel() {
  document.getElementById("info-panel").style.display = "none";
}

map.on("click", closeInfoPanel);

// 4. --- DEFINE CUSTOM EMOJI ICONS ---
const landmarkIcon = L.divIcon({
  html: '<div class="custom-pin landmark-pin">🏛️</div>',
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const businessIcon = L.divIcon({
  html: '<div class="custom-pin business-pin">☕</div>',
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// 5. Load Landmarks from JSON
function loadLandmarks() {
  fetch("/landmarks.json")
    .then((response) => response.json())
    .then((data) => {
      landmarksData = data;
      data.forEach((location) => {
        L.marker([location.lat, location.lng], { icon: landmarkIcon })
          .addTo(landmarkPins)
          .on("click", function (e) {
            // STOP THE CLICK FROM HITTING THE MAP
            L.DomEvent.stopPropagation(e);
            openInfoPanel(
              location.title,
              location.description,
              location.image,
              location.address,
              location.hours,
            );
          });
      });
    })
    .catch((error) => console.error("Error loading landmarks:", error));
}
loadLandmarks();

// 6. Load Businesses from JSON
function loadBusinesses() {
  fetch("/businesses.json")
    .then((response) => response.json())
    .then((data) => {
      businessesData = data;
      data.forEach((location) => {
        L.marker([location.lat, location.lng], { icon: businessIcon })
          .addTo(businessPins)
          .on("click", function (e) {
            // STOP THE CLICK FROM HITTING THE MAP
            L.DomEvent.stopPropagation(e);
            openInfoPanel(
              location.title,
              location.description,
              location.image,
              location.address,
              location.hours,
            );
          });
      });
    })
    .catch((error) => console.error("Error loading businesses:", error));
}
loadBusinesses();

// 7. Navigation Logic
function switchTab(tabName) {
  const mapPage = document.getElementById("map-page");
  const profilePage = document.getElementById("profile-page");

  closeInfoPanel();

  if (tabName === "landmarks") {
    currentCategory = "landmarks";
    profilePage.classList.remove("active-page");
    mapPage.classList.add("active-page");
    map.removeLayer(businessPins);
    map.addLayer(landmarkPins);
    setTimeout(() => map.invalidateSize(), 10);
    if (currentView === "box") renderBoxView();
  } else if (tabName === "businesses") {
    currentCategory = "businesses";
    profilePage.classList.remove("active-page");
    mapPage.classList.add("active-page");
    map.removeLayer(landmarkPins);
    map.addLayer(businessPins);
    setTimeout(() => map.invalidateSize(), 10);
    if (currentView === "box") renderBoxView();
  } else if (tabName === "profile") {
    mapPage.classList.remove("active-page");
    profilePage.classList.add("active-page");
    updateSpendingDashboard();
  }
}

document
  .getElementById("toggle-view-btn")
  .addEventListener("click", toggleView);
document
  .getElementById("landmarksButton")
  .addEventListener("click", () => switchTab("landmarks"));
document
  .getElementById("businessesButton")
  .addEventListener("click", () => switchTab("businesses"));
document
  .getElementById("profileButton")
  .addEventListener("click", () => switchTab("profile"));
document.getElementById("login-btn").addEventListener("click", loginUser);
document
  .getElementById("close-panel-btn")
  .addEventListener("click", closeInfoPanel);
document.getElementById("logout-btn").addEventListener("click", logoutUser);
document.getElementById("close-box-view").addEventListener("click", toggleView);
document
  .getElementById("order-select")
  .addEventListener("change", renderBoxView);
document.getElementById("signup-link").addEventListener("click", function (e) {
  e.preventDefault();
  const notice = document.getElementById("signup-notice");
  notice.style.display = notice.style.display === "none" ? "block" : "none";
});

// --- SPENDING TRACKER (localStorage) ---
function renderPanelHistory(title) {
  const historyEl = document.getElementById("panel-history");
  if (!historyEl) return;
  const purchases = getPurchases().filter((p) => p.landmark === title);
  if (purchases.length === 0) {
    historyEl.style.display = "none";
    historyEl.innerHTML = "";
    return;
  }
  const total = purchases.reduce((s, p) => s + p.amount, 0);
  historyEl.style.display = "block";
  historyEl.innerHTML =
    `<div class="panel-history-header">Spent here: <strong>£${total.toFixed(2)}</strong></div>` +
    purchases
      .slice()
      .reverse()
      .map((p) => {
        const d = new Date(p.date);
        const dateStr = d.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        });
        return `<div class="panel-history-row"><span>${dateStr}</span><span>£${p.amount.toFixed(2)}</span></div>`;
      })
      .join("");
}

function getPurchases() {
  try {
    return JSON.parse(localStorage.getItem("purchases")) || [];
  } catch (e) {
    return [];
  }
}

function savePurchase(landmark, amount) {
  const purchases = getPurchases();
  purchases.push({ landmark, amount, date: new Date().toISOString() });
  localStorage.setItem("purchases", JSON.stringify(purchases));
}

function updateSpendingDashboard() {
  const purchases = getPurchases();
  const total = purchases.reduce((sum, p) => sum + p.amount, 0);
  const localEcon = total * (LOCAL_ECONOMY_PERCENT / 100);

  const totalEl = document.getElementById("total-spent");
  const localEl = document.getElementById("local-economy");
  if (totalEl) totalEl.textContent = "£" + total.toFixed(2);
  if (localEl) localEl.textContent = "£" + localEcon.toFixed(2);

  // Render purchase list
  const listEl = document.getElementById("purchase-list");
  if (listEl) {
    if (purchases.length === 0) {
      listEl.innerHTML =
        '<p style="font-size:13px; color:#999;">No purchases yet. Visit a landmark or business to log spending!</p>';
    } else {
      listEl.innerHTML = purchases
        .slice()
        .reverse()
        .map(
          (p) =>
            `<div style="display:flex; justify-content:space-between; padding:4px 0; font-size:13px; color:#444;">
                    <span>${p.landmark}</span>
                    <span style="font-weight:bold;">£${p.amount.toFixed(2)}</span>
                </div>`,
        )
        .join("");
    }
  }
}

document.getElementById("spend-btn").addEventListener("click", function () {
  const input = document.getElementById("spend-input");
  const amount = parseFloat(input.value);
  if (!amount || amount <= 0 || !currentPanelTitle) return;

  savePurchase(currentPanelTitle, amount);
  input.value = "";

  const confirm = document.getElementById("spend-confirm");
  confirm.textContent =
    "£" + amount.toFixed(2) + " logged at " + currentPanelTitle;
  confirm.style.display = "block";
  setTimeout(() => {
    confirm.style.display = "none";
  }, 2500);

  renderPanelHistory(currentPanelTitle);
  updateSpendingDashboard();
});

// Update dashboard on load
updateSpendingDashboard();

// 8. Mock Login Logic
function loginUser() {
  document.getElementById("login-section").style.display = "none";
  document.getElementById("user-dashboard").style.display = "block";
}

function logoutUser() {
  document.getElementById("user-dashboard").style.display = "none";
  document.getElementById("login-section").style.display = "block";
  document.getElementById("email-input").value = "";
  document.getElementById("password-input").value = "";
}

// 9. Toggle between Map and Box Views
function toggleView() {
  const boxView = document.getElementById("box-view");
  const mapEl = document.getElementById("map");

  if (currentView === "map") {
    // Switch to box view
    currentView = "box";
    mapEl.style.display = "none";
    boxView.classList.remove("hidden");
    renderBoxView();
  } else {
    // Switch back to map view
    currentView = "map";
    mapEl.style.display = "block";
    boxView.classList.add("hidden");
    setTimeout(() => map.invalidateSize(), 50);
  }
}

// Render items in box view
function renderBoxView() {
  const boxContainer = document.getElementById("box-container");
  const boxViewTitle = document.getElementById("box-view-title");
  const sortOrder = document.getElementById("order-select").value;
  const data = (
    currentCategory === "landmarks" ? landmarksData : businessesData
  ).slice();

  // Sort by title
  data.sort((a, b) => {
    const cmp = a.title.localeCompare(b.title);
    return sortOrder === "desc" ? -cmp : cmp;
  });

  // Set the title
  boxViewTitle.textContent =
    currentCategory === "landmarks" ? "Landmarks" : "Businesses";

  // Clear container
  boxContainer.innerHTML = "";

  // Create boxes for each item
  data.forEach((item) => {
    const box = document.createElement("div");
    box.className = "location-box";

    box.innerHTML = `
            <img src="${item.image || "placeholder.jpg"}" alt="${item.title}" class="location-box-image">
            <div class="location-box-content">
                <div class="location-box-title">${item.title}</div>
                ${item.address ? `<div class="location-box-address">📍 ${item.address}</div>` : ""}
                ${item.hours ? `<div class="location-box-hours">🕒 ${item.hours}</div>` : ""}
                <div class="location-box-description">${item.description}</div>
            </div>
        `;

    boxContainer.appendChild(box);
  });
}
