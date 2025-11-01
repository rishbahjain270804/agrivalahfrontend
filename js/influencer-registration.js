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

  // Show field-specific validation message
  const showFieldMessage = (fieldId, message, type = 'error') => {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Remove existing message
    const existingMsg = field.parentElement.querySelector('.field-validation-message');
    if (existingMsg) existingMsg.remove();

    // Create new message
    const msgDiv = document.createElement('div');
    const colorClass = type === 'success' ? 'text-success' : type === 'info' ? 'text-info' : 'text-danger';
    const icon = type === 'success' ? 'check-circle' : type === 'info' ? 'spinner fa-spin' : 'exclamation-circle';
    
    msgDiv.className = `field-validation-message mt-2 small ${colorClass}`;
    msgDiv.innerHTML = `<i class="fas fa-${icon} me-1"></i>${message}`;
    
    // Insert after input group or input
    const inputGroup = field.closest('.input-group');
    if (inputGroup) {
      inputGroup.parentElement.appendChild(msgDiv);
    } else {
      field.parentElement.appendChild(msgDiv);
    }

    // Add border color
    field.classList.remove('border-success', 'border-danger', 'border-info');
    if (type === 'success') {
      field.classList.add('border-success');
    } else if (type === 'error') {
      field.classList.add('border-danger');
    }
  };

  // Clear field message
  const clearFieldMessage = (fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Check in input group parent first
    const inputGroup = field.closest('.input-group');
    if (inputGroup && inputGroup.parentElement) {
      const existingMsg = inputGroup.parentElement.querySelector('.field-validation-message');
      if (existingMsg) existingMsg.remove();
    }
    
    // Also check in direct parent
    const existingMsg = field.parentElement.querySelector('.field-validation-message');
    if (existingMsg) existingMsg.remove();

    field.classList.remove('border-success', 'border-danger', 'border-info');
  };

  // Check if phone number already exists
  const checkPhoneExists = async (phone) => {
    try {
      const checkUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/influencers/check-phone') : '/api/influencers/check-phone';
      const res = await fetch(checkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: phone })
      });

      // If endpoint doesn't exist (404), skip validation
      if (res.status === 404) {
        console.warn('[Validation] Check-phone endpoint not available, skipping validation');
        return false; // Assume available if endpoint doesn't exist
      }

      const result = await res.json();
      return result.exists || false;
    } catch (error) {
      console.error('[Validation] Error checking phone:', error);
      return false; // Assume available on error
    }
  };

  // Check if UPI ID already exists
  const checkUpiExists = async (upiId) => {
    try {
      const checkUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/influencers/check-upi') : '/api/influencers/check-upi';
      const res = await fetch(checkUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ upiId: upiId })
      });

      // If endpoint doesn't exist (404), skip validation
      if (res.status === 404) {
        console.warn('[Validation] Check-upi endpoint not available, skipping validation');
        return false; // Assume available if endpoint doesn't exist
      }

      const result = await res.json();
      return result.exists || false;
    } catch (error) {
      console.error('[Validation] Error checking UPI:', error);
      return false; // Assume available on error
    }
  };

  // Debounce function
  const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
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
    console.log('[OTP] Send OTP button clicked');
    const phone = document.getElementById('contact_number').value.trim();
    console.log('[OTP] Phone number:', phone);
    
    const phoneRegex = /^[6-9][0-9]{9}$/;
    
    if (!phoneRegex.test(phone)) {
      console.log('[OTP] Invalid phone format');
      showMessage('Please enter a valid 10-digit mobile number starting with 6-9', 'error');
      return;
    }

    const sendBtn = document.getElementById('sendOtpBtn');
    if (!sendBtn) {
      console.error('[OTP] Send button not found!');
      return;
    }
    
    sendBtn.disabled = true;
    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
      // Use VPS backend directly
      const VPS_BACKEND = 'http://89.116.20.62:3002';
      const otpUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/otp/send') : `${VPS_BACKEND}/api/otp/send`;
      console.log('[OTP] Sending request to:', otpUrl);
      
      const res = await fetch(otpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: phone })
      });

      console.log('[OTP] Response status:', res.status);
      const result = await res.json();
      console.log('[OTP] Response data:', result);

      if (res.ok && result.success) {
        showMessage('OTP sent successfully! Check your mobile.', 'success');
        otpSent = true;
        
        // Show OTP field
        const otpSection = document.getElementById('otpSection');
        console.log('[OTP] OTP section element:', otpSection);
        if (otpSection) {
          otpSection.classList.add('show');
          otpSection.style.display = 'block';
          console.log('[OTP] OTP section shown');
        } else {
          console.error('[OTP] OTP section not found!');
        }
        
        document.getElementById('contact_number').readOnly = true;
        sendBtn.innerHTML = '<i class="fas fa-redo me-1"></i>Resend OTP';
        
        // Show test OTP if in development
        if (result.testOtp) {
          showMessage(`Test Mode: Your OTP is ${result.testOtp}`, 'info');
          console.log('[OTP] Test OTP:', result.testOtp);
        }
        
        // Start timer
        let timeLeft = result.expiresIn || 300;
        const timer = setInterval(() => {
          timeLeft--;
          const otpTimer = document.getElementById('otpTimer');
          if (otpTimer) {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            otpTimer.textContent = `OTP expires in ${minutes}:${seconds.toString().padStart(2, '0')}`;
          }
          if (timeLeft <= 0) {
            clearInterval(timer);
            sendBtn.disabled = false;
          }
        }, 1000);
        
        setTimeout(() => {
          sendBtn.disabled = false;
        }, (result.cooldown || 60) * 1000);
      } else {
        throw new Error(result.message || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('[OTP] Error:', error);
      showMessage('Error: ' + error.message, 'error');
      sendBtn.disabled = false;
      sendBtn.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Send OTP';
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
      // Use VPS backend directly
      const VPS_BACKEND = 'http://89.116.20.62:3002';
      const verifyUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/otp/verify') : `${VPS_BACKEND}/api/otp/verify`;
      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ phoneNumber: phone, otpCode: otp })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        showMessage('Mobile number verified successfully!', 'success');
        otpVerified = true;
        
        // Hide OTP section
        const otpSection = document.getElementById('otpSection');
        if (otpSection) {
          otpSection.style.display = 'none';
        }
        
        // Show verified badge
        const verifiedBadge = document.getElementById('phoneVerified');
        if (verifiedBadge) {
          verifiedBadge.classList.add('show');
        }
        
        // Update send button
        const sendBtn = document.getElementById('sendOtpBtn');
        sendBtn.innerHTML = '<i class="fas fa-check-circle"></i> Verified';
        sendBtn.classList.remove('btn-primary');
        sendBtn.classList.add('btn-success');
        sendBtn.disabled = true;
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
  console.log('[Init] Looking for OTP buttons...');
  const sendOtpButton = document.getElementById('sendOtpBtn');
  const verifyOtpButton = document.getElementById('verifyOtpBtn');
  
  console.log('[Init] Send OTP button:', sendOtpButton ? 'FOUND' : 'NOT FOUND');
  console.log('[Init] Verify OTP button:', verifyOtpButton ? 'FOUND' : 'NOT FOUND');
  
  if (sendOtpButton) {
    console.log('[Init] Attaching click listener to Send OTP button');
    sendOtpButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Click] Send OTP button clicked!');
      sendOtp();
    });
    console.log('[Init] Send OTP listener attached successfully');
  } else {
    console.error('[Init] ERROR: Send OTP button NOT found in DOM!');
  }
  
  if (verifyOtpButton) {
    console.log('[Init] Attaching click listener to Verify OTP button');
    verifyOtpButton.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('[Click] Verify OTP button clicked!');
      verifyOtp();
    });
    console.log('[Init] Verify OTP listener attached successfully');
  } else {
    console.error('[Init] ERROR: Verify OTP button NOT found in DOM!');
  }

  // Real-time validation for phone number
  const phoneInput = document.getElementById('contact_number');
  if (phoneInput) {
    let isCheckingPhone = false;
    
    const validatePhone = async () => {
      const phone = phoneInput.value.trim();
      const phoneRegex = /^[6-9][0-9]{9}$/;
      
      // Clear any existing message first
      clearFieldMessage('contact_number');
      
      if (!phone) {
        return;
      }
      
      if (!phoneRegex.test(phone)) {
        showFieldMessage('contact_number', 'Please enter a valid 10-digit mobile number starting with 6-9', 'error');
        return;
      }

      // Prevent multiple simultaneous checks
      if (isCheckingPhone) return;
      isCheckingPhone = true;

      // Show checking message with spinner
      showFieldMessage('contact_number', 'Checking availability...', 'info');
      
      try {
        // Check if phone already exists
        const exists = await checkPhoneExists(phone);
        
        // Clear the checking message
        clearFieldMessage('contact_number');
        
        if (exists) {
          showFieldMessage('contact_number', '❌ Sorry, this mobile number is already registered in our database. Please use a different number or login.', 'error');
        } else {
          // Don't show success message if validation is skipped (endpoint not available)
          // Just clear the field to allow user to proceed
          console.log('[Validation] Phone validation passed or skipped');
        }
      } catch (error) {
        clearFieldMessage('contact_number');
        console.error('[Validation] Phone check error:', error);
      } finally {
        isCheckingPhone = false;
      }
    };

    // Debounce the validation
    const debouncedValidatePhone = debounce(validatePhone, 800);
    
    phoneInput.addEventListener('blur', debouncedValidatePhone);
    phoneInput.addEventListener('input', () => {
      // Clear message immediately when user starts typing
      clearFieldMessage('contact_number');
    });
  }

  // Real-time validation for UPI ID
  const upiInput = document.getElementById('upi_id');
  if (upiInput) {
    let isCheckingUpi = false;
    
    const validateUpi = async () => {
      const upiId = upiInput.value.trim();
      
      // Clear any existing message first
      clearFieldMessage('upi_id');
      
      if (!upiId) {
        return;
      }

      // Prevent multiple simultaneous checks
      if (isCheckingUpi) return;
      isCheckingUpi = true;

      // Show checking message with spinner
      showFieldMessage('upi_id', 'Checking availability...', 'info');

      try {
        // Check if UPI already exists
        const exists = await checkUpiExists(upiId);
        
        // Clear the checking message
        clearFieldMessage('upi_id');
        
        if (exists) {
          showFieldMessage('upi_id', '❌ Sorry, this UPI ID is already registered with another account. Please use a different UPI ID.', 'error');
        } else {
          // Don't show success message if validation is skipped (endpoint not available)
          // Just clear the field to allow user to proceed
          console.log('[Validation] UPI validation passed or skipped');
        }
      } catch (error) {
        clearFieldMessage('upi_id');
        console.error('[Validation] UPI check error:', error);
      } finally {
        isCheckingUpi = false;
      }
    };

    // Debounce the validation
    const debouncedValidateUpi = debounce(validateUpi, 800);
    
    upiInput.addEventListener('blur', debouncedValidateUpi);
    upiInput.addEventListener('input', () => {
      // Clear message immediately when user starts typing
      clearFieldMessage('upi_id');
    });
  }

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
      // Use VPS backend directly
      const VPS_BACKEND = 'http://89.116.20.62:3002';
      const registerUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/influencers/register') : `${VPS_BACKEND}/api/influencers/register`;
      const res = await fetch(registerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
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
