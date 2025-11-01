console.log('[Admin Auth] Script loaded');

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Admin Auth] DOM loaded');
  const form = document.getElementById('adminLoginForm');
  const messageDiv = document.getElementById('adminLoginMessage');

  if (!form) {
    console.error('[Admin Auth] Form not found!');
    return;
  }
  
  console.log('[Admin Auth] Form found, attaching listener');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;

    if (!email || !password) {
      messageDiv.innerHTML = "<div class='alert alert-warning'>Email and password are required.</div>";
      return;
    }

    messageDiv.innerHTML = "<div class='alert alert-info'>Signing in...</div>";

    try {
      // Use HTTPS API subdomain as fallback
      const API_BACKEND = 'https://api.agrivalah.in';
      const loginUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/auth/login') : `${API_BACKEND}/api/auth/login`;
      console.log('[Admin Auth] Login URL:', loginUrl);
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        messageDiv.innerHTML = `<div class='alert alert-danger'>${result.message || 'Invalid credentials.'}</div>`;
        return;
      }

      messageDiv.innerHTML = "<div class='alert alert-success'>Login successful. Redirecting...</div>";
      setTimeout(() => {
        window.location.href = '/admin/dashboard';
      }, 800);
    } catch (error) {
      messageDiv.innerHTML = `<div class='alert alert-danger'>${error.message}</div>`;
    }
  });
});
