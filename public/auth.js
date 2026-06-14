// auth.js — підключається на кожній сторінці, оновлює шапку
async function initNav() {
  const usernameEl = document.getElementById('nav-username');
  const loginEl    = document.getElementById('btn-login');
  const registerEl = document.getElementById('btn-register');
  const logoutEl   = document.getElementById('btn-logout');

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      if (usernameEl) usernameEl.textContent = user.username;
      if (loginEl)    loginEl.style.display    = 'none';
      if (registerEl) registerEl.style.display = 'none';
      if (logoutEl)   logoutEl.style.display   = 'inline-block';

      // Викликаємо колбек якщо сторінка його визначила
      if (typeof window.onUserLoaded === 'function') {
        window.onUserLoaded(user);
      }
    }
  } catch {}

  if (logoutEl) {
    logoutEl.addEventListener('click', async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
      location.reload();
    });
  }
}

initNav();