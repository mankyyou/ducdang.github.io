// Set this to your backend base URL. For local dev: 'http://localhost:4000'
const API_BASE = 'https://ducdanggithubio-production.up.railway.app';

function $(id){ return document.getElementById(id); }
function log(obj){ $('out').textContent = JSON.stringify(obj, null, 2); }
function setStatus(msg, ok=true){ $('status').textContent = msg; $('status').className = ok ? 'ok' : 'err'; }

async function register(){
  const email = $('email').value.trim();
  const password = $('password').value;
  try{
    const res = await fetch(API_BASE + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'Register failed');
    setStatus('Registered ✓', true);
    log(data);
  }catch(err){
    setStatus(err.message, false);
  }
}

async function login(){
  const email = $('email').value.trim();
  const password = $('password').value;
  try{
    const res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'Login failed');

    // store token for demo
    localStorage.setItem('token', data.token);
    setStatus('Logged in ✓ (token saved)', true);
    window.location.href = 'dashboard.html'; // redirect to dashboard
    log({ token: data.token });
  }catch(err){
    setStatus(err.message, false);
  }
}

async function me(){
  const token = localStorage.getItem('token');
  if(!token){ setStatus('No token saved. Login first.', false); return; }
  try{
    const res = await fetch(API_BASE + '/api/auth/me', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const data = await res.json();
    if(!res.ok) throw new Error(data.message || 'Failed');
    setStatus('Fetched /me ✓', true);
    log(data);
  }catch(err){
    setStatus(err.message, false);
  }
}
