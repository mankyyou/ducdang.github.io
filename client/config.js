// Shared Configuration
// Auto-select backend base URL for local dev vs production hosting
// Local dev uses http://localhost:4000; production defaults to your hosted server
// Adjust the production URL if your backend host changes
const API_BASE = (typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
))
  ? 'http://localhost:4000'
  : 'https://ducdang-github-io.onrender.com';
