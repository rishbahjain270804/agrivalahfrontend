// Enhanced Influencer Registration Form Logic
console.log('[Influencer Registration] Script loaded');

(() => {
  console.log('[Influencer Registration] Initializing...');
  
  const form = document.getElementById('influencerRegistrationForm');
  const messageDiv = document.getElementById('influencerRegistrationMessage');
  
  if (!form) {
    console.error('[Influencer Registration] Form not found!');
    return;
  }
  
  console.log('[Influencer Registration] Form found, attaching listeners');

  let otpVerified = false;
  let otpSent = false;

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

    // Scroll to message
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const validateForm = () => {
    const phone = document.getElementById('contact_number').value.trim();
    const phoneRegex = /^[6-9][0-9]{9}$/;
    
    if (!phoneRegex.test(phone)) {
      showMessage('Please enter a valid 10-digit mobile number starting with 6-9', 'error');
      return false;
    }

    if (!otpVerified) {
      showMessage('Please verify your mobile number with OTP', 'error');
      return false;
    }

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters long', 'error');
      return false;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match', 'error');
      return false;
    }

    const email = document.getElementById('email').value.trim();
    if (email && !email.includes('@')) {
      showMessage('Please enter a valid email address', 'error');
      return false;
    }

    const upiId = document.getElementById('upi_id').value.trim();
    if (!upiId) {
      showMessage('UPI ID is required for commission payouts', 'error');
      return false;
    }

    return true;
  };

  // Send OTP
  const sendOtp = async () => {
    const phone = document.getElementById('contact_number').value.trim();
    const phoneRegex = /^[6-9][0-9]{9}$/;
    
    if (!phoneRegex.test(phone)) {
      showMessage('Please enter a valid 10-digit mobile number', 'error');
      return;
    }

    const sendBtn = document.getElementById('sendOtpBtn');
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactNumber: phone })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showMessage('OTP sent to your mobile number', 'success');
        otpSent = true;
        document.getElementById('otpFieldContainer').style.display = 'block';
        document.getElementById('contact_number').readOnly = true;
        sendBtn.innerHTML = 'Resend OTP';
        
        // Start timer
        let timeLeft = 120;
        const timer = setInterval(() => {
          timeLeft--;
          document.getElementById('otpTimer').textContent = `OTP valid for ${timeLeft}s`;
          if (timeLeft <= 0) {
            clearInterval(timer);
            sendBtn.disabled = false;
          }
        }, 1000);
        
        setTimeout(() => sendBtn.disabled = false, 120000);
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
      sendBtn.disabled = false;
      sendBtn.innerHTML = 'Send OTP';
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    const phone = document.getElementById('contact_number').value.trim();
    const otp = document.getElementById('otp').value.trim();

    if (!otp || otp.length !== 4) {
      showMessage('Please enter a valid 4-digit OTP', 'error');
      return;
    }

    const verifyBtn = document.getElementById('verifyOtpBtn');
    verifyBtn.disabled = true;
    verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactNumber: phone, otp })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showMessage('Mobile number verified successfully!', 'success');
        otpVerified = true;
        document.getElementById('otpFieldContainer').style.display = 'none';
        document.getElementById('sendOtpBtn').innerHTML = '<i class="fas fa-check-circle"></i> Verified';
        document.getElementById('sendOtpBtn').classList.remove('btn-outline-primary');
        document.getElementById('sendOtpBtn').classList.add('btn-success');
        document.getElementById('sendOtpBtn').disabled = true;
      } else {
        throw new Error(result.message || 'Invalid OTP');
      }
    } catch (error) {
      showMessage('Error: ' + error.message, 'error');
      verifyBtn.disabled = false;
      verifyBtn.innerHTML = 'Verify';
    }
  };

  // Attach OTP button listeners
  document.getElementById('sendOtpBtn')?.addEventListener('click', sendOtp);
  document.getElementById('verifyOtpBtn')?.addEventListener('click', verifyOtp);

  // Password toggle
  document.getElementById('togglePasswordReg')?.addEventListener('click', () => {
    const passwordInput = document.getElementById('password');
    const icon = document.querySelector('#togglePasswordReg i');
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Disable submit button
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Submitting...';

    showMessage('Submitting your application...', 'info');

    const data = {
      name: document.getElementById('name').value.trim(),
      contactNumber: document.getElementById('contact_number').value.trim(),
      password: document.getElementById('password').value,
      email: document.getElementById('email').value.trim() || null,
      type: document.getElementById('type').value,
      socialLink: document.getElementById('social_link').value.trim() || null,
      region: document.getElementById('region').value.trim(),
      upiId: document.getElementById('upi_id').value.trim(),
      bankDetails: document.getElementById('bank_details').value.trim() || null,
      notes: document.getElementById('notes').value.trim() || null
    };

    console.log('[Influencer Registration] Submitting data:', {
      name: data.name,
      contactNumber: data.contactNumber,
      type: data.type,
      region: data.region
    });

    try {
      const res = await fetch('/api/influencers/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      console.log('[Influencer Registration] Response status:', res.status);

      let result;
      try {
        result = await res.json();
        console.log('[Influencer Registration] Response data:', result);
      } catch (parseError) {
        console.error('[Influencer Registration] Failed to parse response:', parseError);
        throw new Error('Invalid response from server. Please try again.');
      }

      if (res.ok && result.success) {
        showMessage(`
          <strong>Application Submitted Successfully!</strong><br>
          <p class="mb-2 mt-2">Your application reference: <strong>${result.influencerId}</strong></p>
          <p class="mb-0">Our team will review your application and notify you via email/SMS once approved. You'll receive your unique referral code and login credentials.</p>
        `, 'success');
        form.reset();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const errorMessage = result.message || 'Registration failed. Please try again.';
        console.error('[Influencer Registration] Error:', errorMessage);
        showMessage(errorMessage, 'error');
      }
    } catch (err) {
      console.error('[Influencer Registration] Exception:', err);
      showMessage(`Error: ${err.message}. Please check your internet connection and try again.`, 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });

  // Phone number validation on input
  document.getElementById('contact_number').addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
  });

  // UPI ID validation
  document.getElementById('upi_id').addEventListener('blur', (e) => {
    const upiId = e.target.value.trim();
    if (upiId && !upiId.includes('@')) {
      e.target.classList.add('is-invalid');
    } else {
      e.target.classList.remove('is-invalid');
    }
  });
})();
