// import sqlite3 from "sqlite3"


// 1. Initialize the Grayscale Map (Centered on Norwich)
const map = L.map('map', { zoomControl: false }).setView([52.6293, 1.2979], 14);

L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap &copy; CARTO'
}).addTo(map);

// 2. Create Map Layers
const landmarkPins = L.layerGroup().addTo(map); // Visible by default
const businessPins = L.layerGroup();

// Track current view state
let currentView = 'map'; // 'map' or 'box'
let currentCategory = 'landmarks'; // 'landmarks' or 'businesses'
let landmarksData = [];
let businessesData = [];
 

// 3. --- BULLETPROOF INFO PANEL LOGIC ---
function openInfoPanel(title, description, imageUrl, address, hours) {
    document.getElementById('panel-title').innerText = title;
    document.getElementById('panel-description').innerText = description;
    
    // Safely handle Address (won't crash if the HTML tag is missing)
    const addressEl = document.getElementById('panel-address');
    if (addressEl) {
        if (address) {
            addressEl.innerText = "📍 " + address;
            addressEl.style.display = 'block';
        } else {
            addressEl.style.display = 'none';
        }
    }

    // Safely handle Hours
    const hoursEl = document.getElementById('panel-hours');
    if (hoursEl) {
        if (hours) {
            hoursEl.innerText = "🕒 " + hours;
            hoursEl.style.display = 'block';
        } else {
            hoursEl.style.display = 'none';
        }
    }
    
    // Safely handle Image
    const imageElement = document.getElementById('panel-image');
    if (imageElement) {
        if (imageUrl) {
             imageElement.src = imageUrl;
             imageElement.style.display = 'block';
        } else {
             imageElement.style.display = 'none'; 
        }
    }

    document.getElementById('info-panel').style.display = 'block';
}

function closeInfoPanel() {
    document.getElementById('info-panel').style.display = 'none';
}

map.on('click', closeInfoPanel);


// 4. --- DEFINE CUSTOM EMOJI ICONS ---
const landmarkIcon = L.divIcon({
    html: '<div class="custom-pin landmark-pin">🏛️</div>',
    className: '', 
    iconSize: [32, 32],
    iconAnchor: [16, 16] 
});

const businessIcon = L.divIcon({
    html: '<div class="custom-pin business-pin">☕</div>',
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
});


// 5. Load Landmarks from JSON
function loadLandmarks() {
    fetch('src/landmarks.json')
        .then(response => response.json())
        .then(data => {
            landmarksData = data;
            data.forEach(location => {
                L.marker([location.lat, location.lng], { icon: landmarkIcon })
                 .addTo(landmarkPins)
                 .on('click', function(e) {
                     // STOP THE CLICK FROM HITTING THE MAP
                     L.DomEvent.stopPropagation(e);
                     openInfoPanel(location.title, location.description, location.image, location.address, location.hours);
                 });
            });
        })
        .catch(error => console.error("Error loading landmarks:", error));
}
loadLandmarks();


// 6. Load Businesses from JSON
function loadBusinesses() {
    fetch('src/businesses.json')
        .then(response => response.json())
        .then(data => {
            businessesData = data;
            data.forEach(location => {
                L.marker([location.lat, location.lng], { icon: businessIcon })
                 .addTo(businessPins)
                 .on('click', function(e) {
                     // STOP THE CLICK FROM HITTING THE MAP
                     L.DomEvent.stopPropagation(e);
                     openInfoPanel(location.title, location.description, location.image, location.address, location.hours);
                 });
            });
        })
        .catch(error => console.error("Error loading businesses:", error));
}
loadBusinesses();


// 7. Navigation Logic
function switchTab(tabName) {
    const mapPage = document.getElementById('map-page');
    const profilePage = document.getElementById('profile-page');
    
    closeInfoPanel();

    if (tabName === 'landmarks') {
        currentCategory = 'landmarks';
        profilePage.classList.remove('active-page');
        mapPage.classList.add('active-page');
        map.removeLayer(businessPins);
        map.addLayer(landmarkPins);
        setTimeout(() => map.invalidateSize(), 10);
    } 
    else if (tabName === 'businesses') {
        currentCategory = 'businesses';
        profilePage.classList.remove('active-page');
        mapPage.classList.add('active-page');
        map.removeLayer(landmarkPins);
        map.addLayer(businessPins);
        setTimeout(() => map.invalidateSize(), 10);
    } 
    else if (tabName === 'profile') {
        mapPage.classList.remove('active-page');
        profilePage.classList.add('active-page');
    }
}

document.getElementById('toggle-view-btn').addEventListener('click', toggleView);
document.getElementById('landmarksButton').addEventListener('click', () => switchTab('landmarks'));
document.getElementById('businessesButton').addEventListener('click', () => switchTab('businesses'));
document.getElementById('profileButton').addEventListener('click', () => switchTab('profile'));
document.getElementById('login-btn').addEventListener('click', loginUser);
document.getElementById('close-panel-btn').addEventListener('click', closeInfoPanel);
document.getElementById('logout-btn').addEventListener('click', logoutUser);
document.getElementById('close-box-view').addEventListener('click', toggleView);

// 8. Mock Login Logic
function loginUser() {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('user-dashboard').style.display = 'block';
}

function logoutUser() {
    document.getElementById('user-dashboard').style.display = 'none';
    document.getElementById('login-section').style.display = 'block';
    document.getElementById('email-input').value = '';
    document.getElementById('password-input').value = '';
}

// 9. Toggle between Map and Box Views
function toggleView() {
    const boxView = document.getElementById('box-view');
    const map = document.getElementById('map');
    
    if (currentView === 'map') {
        // Switch to box view
        currentView = 'box';
        map.style.display = 'none';
        boxView.classList.remove('hidden');
        renderBoxView();
    } else {
        // Switch back to map view
        currentView = 'map';
        map.style.display = 'block';
        boxView.classList.add('hidden');
    }
}

// Render items in box view
function renderBoxView() {
    const boxContainer = document.getElementById('box-container');
    const boxViewTitle = document.getElementById('box-view-title');
    const data = currentCategory === 'landmarks' ? landmarksData : businessesData;
    
    // Set the title
    boxViewTitle.textContent = currentCategory === 'landmarks' ? 'Landmarks' : 'Businesses';
    
    // Clear container
    boxContainer.innerHTML = '';
    
    // Create boxes for each item
    data.forEach(item => {
        const box = document.createElement('div');
        box.className = 'location-box';
        
        box.innerHTML = `
            <img src="${item.image || 'placeholder.jpg'}" alt="${item.title}" class="location-box-image">
            <div class="location-box-content">
                <div class="location-box-title">${item.title}</div>
                ${item.address ? `<div class="location-box-address">📍 ${item.address}</div>` : ''}
                ${item.hours ? `<div class="location-box-hours">🕒 ${item.hours}</div>` : ''}
                <div class="location-box-description">${item.description}</div>
            </div>
        `;
        
        boxContainer.appendChild(box);
    });
}