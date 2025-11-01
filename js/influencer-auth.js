// Enhanced Influencer Authentication Logic
console.log('[Influencer Auth] Script loaded');

(() => {
  console.log('[Influencer Auth] Initializing...');
  
  const form = document.getElementById('influencerLoginForm');
  const messageDiv = document.getElementById('influencerLoginMessage');
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('influencerPassword');
  
  if (!form) {
    console.error('[Influencer Auth] Form not found!');
    return;
  }
  
  console.log('[Influencer Auth] Form found, attaching listeners');

  const showMessage = (message, type = 'info') => {
    const alertClass = {
      success: 'alert-success',
      error: 'alert-danger',
      warning: 'alert-warning',
      info: 'alert-info'
    }[type] || 'alert-info';

    messageDiv.innerHTML = `
      <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
  };

  // Toggle password visibility
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const type = passwordInput.type === 'password' ? 'text' : 'password';
      passwordInput.type = type;
      const icon = togglePasswordBtn.querySelector('i');
      icon.classList.toggle('fa-eye');
      icon.classList.toggle('fa-eye-slash');
    });
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const mobile = document.getElementById('influencerMobile').value.trim();
    const password = document.getElementById('influencerPassword').value;

    if (!mobile || !password) {
      showMessage('Mobile number and password are required.', 'warning');
      return;
    }

    const phoneRegex = /^[6-9][0-9]{9}$/;
    if (!phoneRegex.test(mobile)) {
      showMessage('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Signing in...';

    showMessage('Signing in...', 'info');

    try {
      // Use VPS backend directly as fallback
      const VPS_BACKEND = 'http://89.116.20.62:3002';
      const loginUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/auth/influencer-login') : `${VPS_BACKEND}/api/auth/influencer-login`;
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contactNumber: mobile, password })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        showMessage(result.message || 'Invalid credentials. Please check your email and password.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
      }

      // Success - user is already verified as influencer by backend
      if (!result.success) {
        showMessage(result.message || 'Login failed. Please check your credentials.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        return;
      }

      showMessage('Login successful! Redirecting to your dashboard...', 'success');
      
      setTimeout(() => {
        window.location.href = '/influencer/dashboard';
      }, 1000);
    } catch (error) {
      showMessage(`Error: ${error.message}. Please check your internet connection.`, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  // Enter key support
  passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      form.dispatchEvent(new Event('submit'));
    }
  });
})();
