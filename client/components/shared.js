// Shared JavaScript Functions

let userData = null;

// Initialize shared components
function initializeSharedComponents(pageTitle, activeTab) {
  // Set page title
  document.getElementById('page-title').textContent = pageTitle;
  
  // Set active tab
  document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
  document.getElementById(activeTab).classList.add('active');
  
  // Load user data
  loadUserData();
  
  // Add event listeners
  setupEventListeners();
}

// Setup event listeners
function setupEventListeners() {
  // Close dropdown when clicking outside
  document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('user-dropdown');
    if (!dropdown.contains(event.target)) {
      dropdown.classList.remove('active');
    }
  });
}

// Toggle user dropdown
function toggleDropdown() {
  const dropdown = document.getElementById('user-dropdown');
  dropdown.classList.toggle('active');
}

// Load user data
async function loadUserData() {
  try {
    const response = await fetch(API_BASE + '/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      userData = data.user;
      updateUserDisplay();
    } else {
      throw new Error('Failed to load user data');
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    showError('Failed to load user data. Please try again.');
  }
}

// Update user display
function updateUserDisplay() {
  if (userData) {
    // Update avatar with first letter of email
    const firstLetter = userData.email ? userData.email.charAt(0).toUpperCase() : 'U';
    document.getElementById('user-avatar').textContent = firstLetter;
    
    // Update user info
    document.getElementById('user-name').textContent = userData.email || 'User';
    document.getElementById('user-email').textContent = userData.email || 'No email';
  }
}

// Navigation functions
function goToDashboard() {
  // Smooth transition without jerky animation
  const dashboardTab = document.getElementById('dashboard-tab');
  if (dashboardTab) {
    // Simple active state change
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    dashboardTab.classList.add('active');
  }
  
  // Immediate redirect without delay
  window.location.href = 'dashboard.html';
}

function goToMyNote() {
  // Smooth transition without jerky animation
  const notesTab = document.getElementById('notes-tab');
  if (notesTab) {
    // Simple active state change
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    notesTab.classList.add('active');
  }
  
  // Immediate redirect without delay
  window.location.href = 'mynote.html';
}

function goToLearnEnglish() {
  // Smooth transition without jerky animation
  const englishTab = document.getElementById('english-tab');
  if (englishTab) {
    // Simple active state change
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    englishTab.classList.add('active');
  }
  
  // Immediate redirect without delay
  window.location.href = 'learn-english.html';
}

function goToBills() {
  // Smooth transition without jerky animation
  const billsTab = document.getElementById('bills-tab');
  if (billsTab) {
    // Simple active state change
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    billsTab.classList.add('active');
  }
  
  // Immediate redirect without delay
  window.location.href = 'bills.html';
}

function goToDecentralization() {
  const tab = document.getElementById('decentralization-tab');
  if (tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  }
  window.location.href = 'decentralization.html';
}

// Tab animation function (simplified for smooth transitions)
function animateTabSwitch(targetTab) {
  if (!targetTab) return;
  
  // Remove active class from all tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Add active class to target tab
  targetTab.classList.add('active');
}

// Logout function
function logout() {
  localStorage.removeItem('token');
  window.location.href = 'index.html';
}

// Notification functions
function showSuccess(message) {
  showNotification(message, 'success');
}

function showError(message) {
  showNotification(message, 'error');
}

function showInfo(message) {
  showNotification(message, 'info');
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#17a2b8'};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    max-width: 300px;
    word-wrap: break-word;
    z-index: 99999;
    animation: slideIn 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Check authentication
function checkAuth() {
  if (!localStorage.getItem('token')) {
    window.location.href = 'index.html';
  }
}

// Get user data
function getUserData() {
  return userData;
}

// Inactivity timeout (30 minutes) -> redirect to 403 page
(function setupIdleTimeout() {
  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  let idleTimerId = null;

  function redirectToForbidden() {
    try { localStorage.removeItem('token'); } catch (_) {}
    window.location.href = '403.html';
  }

  function resetIdleTimer() {
    if (idleTimerId) clearTimeout(idleTimerId);
    idleTimerId = setTimeout(redirectToForbidden, THIRTY_MINUTES_MS);
  }

  function attachIdleListeners() {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetIdleTimer, { passive: true }));
  }

  if (typeof window !== 'undefined') {
    // Start timer only on authenticated pages (token present)
    document.addEventListener('DOMContentLoaded', () => {
      if (localStorage.getItem('token')) {
        attachIdleListeners();
        resetIdleTimer();
      }
    });
  }
})();