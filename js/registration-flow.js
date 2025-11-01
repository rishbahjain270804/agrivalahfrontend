// Registration + Payment Flow with OTP Verification
(() => {
  const OTP_LENGTH = 4;
  const RESEND_COOLDOWN_SECONDS = 60;
  const PHONE_REGEX = /^[6-9]\d{9}$/;

  const elements = {
    form: document.getElementById('registration-form'),
    message: document.getElementById('registration-message'),
    couponInput: document.getElementById('coupon-code'),
    couponStatus: document.getElementById('coupon-status'),
    amountDisplay: document.getElementById('due-amount'),
    phoneInput: document.getElementById('contact-number'),
    phoneStatus: document.getElementById('phone-status'),
    sendOtpBtn: document.getElementById('send-otp-btn'),
    otpSection: document.getElementById('otpSection'),
    otpInput: document.getElementById('otp-code'),
    otpStatus: document.getElementById('otp-status'),
    verifyOtpBtn: document.getElementById('verify-otp-btn'),
    submitBtn: document.querySelector('#registration-form button[type="submit"]'),
    scrollButton: document.getElementById('scroll-to-registration')
  };

  if (!elements.form) {
    console.error('Registration form not found');
    return;
  }

  const state = {
    otpLength: OTP_LENGTH,
    amount: 324,
    couponCode: '',
    otpToken: null,
    referenceId: null,
    sessionExpiresAt: null,
    lastOtpHint: null,
    isSaving: false,
    resendTimer: null,
    resendRemaining: 0,
    otpTimer: null,
    otpExpiresAt: null
  };

  function getRadioValue(name) {
    const checked = elements.form.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : '';
  }

  function showMessage(type, text) {
    if (!elements.message) {
      return;
    }
    const classMap = {
      success: 'alert alert-success',
      error: 'alert alert-danger',
      warning: 'alert alert-warning',
      info: 'alert alert-info'
    };
    const className = classMap[type] || classMap.info;
    elements.message.innerHTML = `<div class="${className}">${text}</div>`;
  }

  function setStatusMessage(target, text, kind) {
    if (!target) return;
    target.textContent = text || '';
    target.className = 'form-text';
    if (!text) return;
    if (kind === 'success') target.classList.add('text-success');
    else if (kind === 'error') target.classList.add('text-danger');
    else target.classList.add('text-muted');
  }

  function updateAmountDisplay(amount, gstInfo = null) {
    state.amount = amount;
    if (elements.amountDisplay) {
      if (gstInfo && gstInfo.gst) {
        elements.amountDisplay.innerHTML = `₹${amount} <small class="text-muted">(incl. ₹${gstInfo.gst} GST)</small>`;
      } else {
        elements.amountDisplay.textContent = `₹${amount}`;
      }
    }
    if (elements.submitBtn) {
      elements.submitBtn.innerHTML = `<i class="fa fa-check me-2"></i> Pay ₹${amount} & Submit`;
    }
  }

  function toggleSubmitLoading(isLoading) {
    state.isSaving = isLoading;
    if (!elements.submitBtn) return;
    elements.submitBtn.disabled = isLoading;
    if (isLoading) {
      elements.submitBtn.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Processing...';
    } else {
      updateAmountDisplay(state.amount);
    }
  }

  function startResendCountdown(seconds) {
    if (!elements.sendOtpBtn) return;
    const duration = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
    if (state.resendTimer) window.clearInterval(state.resendTimer);
    state.resendTimer = null;
    state.resendRemaining = duration;

    if (duration === 0) {
      elements.sendOtpBtn.disabled = false;
      elements.sendOtpBtn.textContent = 'Send OTP';
      return;
    }

    elements.sendOtpBtn.disabled = true;
    elements.sendOtpBtn.textContent = `Resend in ${duration}s`;

    state.resendTimer = window.setInterval(() => {
      state.resendRemaining -= 1;
      if (state.resendRemaining <= 0) {
        window.clearInterval(state.resendTimer);
        state.resendTimer = null;
        elements.sendOtpBtn.disabled = false;
        elements.sendOtpBtn.textContent = 'Send OTP';
        return;
      }
      elements.sendOtpBtn.textContent = `Resend in ${state.resendRemaining}s`;
    }, 1000);
  }

  function clearOtpCountdown() {
    if (state.otpTimer) {
      window.clearInterval(state.otpTimer);
      state.otpTimer = null;
    }
    state.otpExpiresAt = null;
  }

  function startOtpCountdown(expiresInSeconds) {
    if (!elements.otpStatus) return;
    clearOtpCountdown();

    state.otpExpiresAt = Date.now() + (expiresInSeconds * 1000);

    const update = () => {
      const diff = state.otpExpiresAt - Date.now();
      if (diff <= 0) {
        clearOtpCountdown();
        setStatusMessage(elements.otpStatus, 'OTP expired. Request a new code.', 'error');
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      setStatusMessage(
        elements.otpStatus,
        `OTP expires in ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`,
        'muted'
      );
    };

    update();
    state.otpTimer = window.setInterval(update, 1000);
  }

  async function apiRequest(url, options = {}) {
    // Use config.js helper if available, otherwise use HTTPS API subdomain
    const API_BACKEND = 'https://api.agrivalah.in';
    const fullUrl = typeof getApiUrl === 'function' ? getApiUrl(url) : `${API_BACKEND}${url}`;
    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data && data.message ? data.message : 'Request failed';
      throw new Error(message);
    }
    return data;
  }

  async function sendOtp() {
    const phone = elements.phoneInput?.value.trim() || '';

    if (!PHONE_REGEX.test(phone)) {
      setStatusMessage(elements.phoneStatus, 'Enter a valid 10-digit mobile number starting with 6-9.', 'error');
      return;
    }

    if (elements.sendOtpBtn) {
      elements.sendOtpBtn.disabled = true;
      elements.sendOtpBtn.textContent = 'Sending...';
    }
    setStatusMessage(elements.phoneStatus, 'Sending OTP...', 'muted');

    try {
      const result = await apiRequest('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone })
      });

      state.lastOtpHint = result.testOtp || null;
      const cooldown = result.cooldown || RESEND_COOLDOWN_SECONDS;
      const expiresIn = result.expiresIn || 300;

      setStatusMessage(elements.phoneStatus, 'OTP sent successfully.', 'success');
      if (elements.otpSection) {
        elements.otpSection.style.display = 'block';
      }

      startResendCountdown(cooldown);
      startOtpCountdown(expiresIn);

      // Always show success message, never display test OTP
      showMessage('success', `OTP sent to ${phone}. Please check your messages.`);
    } catch (error) {
      setStatusMessage(elements.phoneStatus, error.message, 'error');
      if (elements.sendOtpBtn) {
        elements.sendOtpBtn.disabled = false;
        elements.sendOtpBtn.textContent = 'Send OTP';
      }
    }
  }

  async function verifyOtp() {
    const phone = elements.phoneInput?.value.trim() || '';
    const code = elements.otpInput?.value.trim() || '';

    if (!PHONE_REGEX.test(phone)) {
      setStatusMessage(elements.phoneStatus, 'Enter a valid mobile number before verifying.', 'error');
      return;
    }

    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(code)) {
      setStatusMessage(elements.otpStatus, `Enter the ${OTP_LENGTH}-digit OTP sent to your number.`, 'error');
      return;
    }

    if (elements.verifyOtpBtn) {
      elements.verifyOtpBtn.disabled = true;
      elements.verifyOtpBtn.textContent = 'Verifying...';
    }
    setStatusMessage(elements.otpStatus, 'Verifying OTP...', 'muted');

    try {
      const result = await apiRequest('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otpCode: code })
      });

      state.otpToken = result.otpToken || null;
      state.sessionExpiresAt = result.expiresIn
        ? Date.now() + (Number(result.expiresIn) * 1000)
        : null;

      clearOtpCountdown();
      setStatusMessage(elements.otpStatus, 'OTP verified successfully.', 'success');
      showMessage('success', 'Mobile number verified. You can continue with the registration.');

      if (state.resendTimer) {
        window.clearInterval(state.resendTimer);
        state.resendTimer = null;
      }
      state.resendRemaining = 0;

      if (elements.sendOtpBtn) {
        elements.sendOtpBtn.disabled = true;
        elements.sendOtpBtn.textContent = 'Verified';
      }
      if (elements.otpInput) elements.otpInput.value = '';
    } catch (error) {
      setStatusMessage(elements.otpStatus, error.message, 'error');
      if (elements.verifyOtpBtn) elements.verifyOtpBtn.disabled = false;
    } finally {
      if (elements.verifyOtpBtn) {
        elements.verifyOtpBtn.textContent = 'Verify OTP';
      }
    }
  }

  function collectCrops() {
    const crops = [];
    document.querySelectorAll('.crop-item').forEach(item => {
      const name = item.querySelector('.crop-name').value.trim();
      const area = item.querySelector('.crop-area').value.trim();
      const variety = item.querySelector('.crop-variety').value.trim();
      
      if (name) {
        crops.push({ name, area, variety });
      }
    });
    return crops;
  }

  function collectFormData() {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };
    const getChecklistValues = (selector) => {
      return Array.from(elements.form.querySelectorAll(`${selector}:checked`)).map((el) => el.value).join(', ');
    };

    return {
      registrationDate: getValue('registration-date'),
      farmerName: getValue('farmer-name'),
      fatherSpouseName: getValue('father-spouse-name'),
      contactNumber: getValue('contact-number'),
      emailId: getValue('email-id'),
      aadhaarFarmerId: getValue('aadhaar-farmer-id'),
      villagePanchayat: getValue('village-panchayat'),
      mandalBlock: getValue('mandal-block'),
      district: getValue('district'),
      state: getValue('state'),
      khasraPassbook: getValue('khasra-passbook'),
      plotNo: getValue('plot-no'),
      totalLand: getValue('total-land'),
      landUnit: getValue('land-unit'),
      areaNaturalFarming: getValue('area-natural-farming'),
      presentCrop: getValue('present-crop'),
      sowingDate: getValue('sowing-date'),
      harvestingDate: getValue('harvesting-date'),
      cropTypes: getValue('crop-types'),
      crops: collectCrops(),
      farmingPractice: getRadioValue('farming-practice'),
      farmingExperience: getValue('farming-experience'),
      irrigationSource: getRadioValue('irrigation-source'),
      livestock: getChecklistValues('input[name="livestock"]'),
      willingToAdopt: getRadioValue('natural-inputs'),
      trainingRequired: getRadioValue('training-required'),
      localGroupName: getValue('local-group-name'),
      preferredCroppingSeason: getRadioValue('cropping-season'),
      remarks: getValue('remarks-comments'),
      termsAgreement: document.getElementById('terms-agreement')?.checked || false,
      naturalInputs: getRadioValue('natural-inputs')
    };
  }

  function validateFormData(data) {
    const required = [
      { key: 'registrationDate', label: 'Registration Date' },
      { key: 'farmerName', label: 'Farmer Name' },
      { key: 'fatherSpouseName', label: 'Father / Spouse Name' },
      { key: 'contactNumber', label: 'Contact Number' },
      { key: 'villagePanchayat', label: 'Village / Panchayat' },
      { key: 'mandalBlock', label: 'Mandal / Block' },
      { key: 'district', label: 'District' },
      { key: 'state', label: 'State' },
      { key: 'totalLand', label: 'Total Land' },
      { key: 'areaNaturalFarming', label: 'Area Under Natural Farming' },
      { key: 'sowingDate', label: 'Sowing Date' },
      { key: 'cropTypes', label: 'Crop Types' },
      { key: 'farmingPractice', label: 'Farming Practice' },
      { key: 'farmingExperience', label: 'Farming Experience' },
      { key: 'irrigationSource', label: 'Irrigation Source' }
    ];

    const missing = required
      .filter(({ key }) => !data[key] || String(data[key]).trim() === '')
      .map(({ label }) => label);

    if (!PHONE_REGEX.test(data.contactNumber)) {
      missing.push('Valid 10-digit mobile number');
    }

    if (!data.termsAgreement) {
      missing.push('Accept the terms and conditions');
    }

    return missing;
  }

  async function handleCouponInput(value) {
    const trimmed = value.trim();
    if (!trimmed) {
      state.couponCode = '';
      updateAmountDisplay(324);
      setStatusMessage(elements.couponStatus, '');
      return;
    }

    setStatusMessage(elements.couponStatus, 'Validating coupon...', 'muted');
    try {
      const couponUrl = typeof getApiUrl === 'function' 
        ? getApiUrl(`/api/validate-coupon?code=${encodeURIComponent(trimmed)}`)
        : `/api/validate-coupon?code=${encodeURIComponent(trimmed)}`;
      const result = await fetch(couponUrl, { credentials: 'include' }).then((res) => res.json());
      if (result && result.valid) {
        state.couponCode = trimmed;
        const amount = result.amount || 270;
        updateAmountDisplay(amount, { gst: result.gst, baseAmount: result.baseAmount });
        const discountText = result.discount ? ` (₹${result.discount} off)` : '';
        const label = result.influencerName ? `✓ Coupon applied${discountText}. Influencer: ${result.influencerName}` : 'Coupon applied.';
        setStatusMessage(elements.couponStatus, label, 'success');
      } else {
        state.couponCode = '';
        updateAmountDisplay(324);
        setStatusMessage(elements.couponStatus, 'Invalid referral code.', 'error');
      }
    } catch (error) {
      state.couponCode = '';
      updateAmountDisplay(324);
      setStatusMessage(elements.couponStatus, error.message || 'Unable to validate coupon.', 'error');
    }
  }

  async function saveRegistration(formData) {
    const payload = {
      otpToken: state.otpToken,
      referenceId: state.referenceId,
      couponCode: state.couponCode,
      form: formData
    };

    const result = await apiRequest('/api/registration/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    state.referenceId = result.referenceId;
    if (result.amount) {
      updateAmountDisplay(result.amount);
    }
    if (result.otpToken) {
      state.otpToken = result.otpToken;
    }
    return result;
  }

  async function createOrder(amountPaise) {
    const payload = {
      amount: amountPaise,
      farmerName: document.getElementById('farmer-name')?.value.trim() || '',
      emailId: document.getElementById('email-id')?.value.trim() || '',
      registrationReference: state.referenceId
    };

    return apiRequest('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  function ensureRazorpay() {
    return new Promise((resolve, reject) => {
      if (typeof Razorpay !== 'undefined') {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout library'));
      document.head.appendChild(script);
    });
  }

  async function openPayment(orderData) {
    await ensureRazorpay();
    return new Promise((resolve, reject) => {
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Cyano Veda Natural Farming',
        description: 'Natural Farming Certification Fee',
        order_id: orderData.order_id,
        prefill: {
          name: document.getElementById('farmer-name')?.value.trim() || '',
          email: document.getElementById('email-id')?.value.trim() || ''
        },
        theme: { color: '#10b981' },
        handler: resolve,
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled. Please try again.'))
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (failure) => {
        const message = failure?.error?.description || 'Payment failed. Please try again.';
        reject(new Error(message));
      });
      rzp.open();
    });
  }

  async function verifyPayment(orderId, paymentId, signature, amountPaise) {
    try {
      await apiRequest('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature,
          amount: amountPaise,
          registration_reference: state.referenceId
        })
      });
    } catch (error) {
      console.warn('Payment verification warning:', error.message);
    }
  }

  async function finalizeRegistration(paymentResponse) {
    const payload = {
      referenceId: state.referenceId,
      otpToken: state.otpToken,
      paymentId: paymentResponse.razorpay_payment_id,
      orderId: paymentResponse.razorpay_order_id,
      paymentAmount: state.amount,
      paymentSignature: paymentResponse.razorpay_signature
    };

    return apiRequest('/api/registration/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  }

  function resetFlow() {
    elements.form.reset();
    state.referenceId = null;
    state.otpToken = null;
    state.couponCode = '';
    state.sessionExpiresAt = null;
    state.lastOtpHint = null;
    updateAmountDisplay(324);
    showMessage('success', 'Registration completed successfully! Our team will contact you shortly.');
    setStatusMessage(elements.couponStatus, '');
    setStatusMessage(elements.otpStatus, '');
    clearOtpCountdown();
    startResendCountdown(0);
    if (elements.otpSection) elements.otpSection.style.display = 'none';
    if (elements.verifyOtpBtn) {
      elements.verifyOtpBtn.disabled = false;
      elements.verifyOtpBtn.textContent = 'Verify OTP';
    }
    if (elements.sendOtpBtn) {
      elements.sendOtpBtn.disabled = false;
      elements.sendOtpBtn.textContent = 'Send OTP';
    }
    if (elements.otpInput) elements.otpInput.value = '';
    setStatusMessage(elements.phoneStatus, '');
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!state.otpToken) {
      setStatusMessage(elements.otpStatus, 'Verify your mobile number with OTP before submitting.', 'error');
      showMessage('error', 'OTP verification is required before you can continue.');
      return;
    }

    const formData = collectFormData();
    const missing = validateFormData(formData);
    if (missing.length) {
      const message = `Please fix the following issues:<br>${missing.map((item) => `<span>&bull; ${item}</span>`).join('<br>')}`;
      showMessage('error', message);
      return;
    }

    toggleSubmitLoading(true);

    try {
      const saveResult = await saveRegistration(formData);
      const orderData = await createOrder(saveResult.amountPaise || (state.amount * 100));
      const paymentResponse = await openPayment(orderData);
      await verifyPayment(paymentResponse.razorpay_order_id, paymentResponse.razorpay_payment_id, paymentResponse.razorpay_signature, orderData.amount);
      await finalizeRegistration(paymentResponse);
      resetFlow();
    } catch (error) {
      const fallback = error.message && error.message.includes('We are facing some trouble')
        ? 'Razorpay could not process the transaction right now. Please retry after a moment or use the Razorpay test card 4111 1111 1111 1111 / CVV 111 / any future expiry.'
        : error.message;
      showMessage('error', fallback || 'Something went wrong. Please try again.');
    } finally {
      toggleSubmitLoading(false);
    }
  }

  // Event Listeners
  if (elements.sendOtpBtn) {
    elements.sendOtpBtn.addEventListener('click', sendOtp);
  }
  if (elements.verifyOtpBtn) {
    elements.verifyOtpBtn.addEventListener('click', verifyOtp);
  }
  if (elements.form) {
    elements.form.addEventListener('submit', handleSubmit);
  }
  if (elements.couponInput) {
    let debounceTimer = null;
    elements.couponInput.addEventListener('input', (event) => {
      const value = event.target.value;
      if (debounceTimer) {
        window.clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => handleCouponInput(value), 350);
    });
  }
  if (elements.phoneInput) {
    elements.phoneInput.addEventListener('input', () => {
      setStatusMessage(elements.phoneStatus, '');
      state.otpToken = null;
      state.sessionExpiresAt = null;
      state.lastOtpHint = null;
      clearOtpCountdown();
      startResendCountdown(0);
      if (elements.verifyOtpBtn) {
        elements.verifyOtpBtn.disabled = false;
        elements.verifyOtpBtn.textContent = 'Verify OTP';
      }
      if (elements.sendOtpBtn) {
        elements.sendOtpBtn.disabled = false;
        elements.sendOtpBtn.textContent = 'Send OTP';
      }
      if (elements.otpInput) elements.otpInput.value = '';
      if (elements.otpSection) elements.otpSection.style.display = 'none';
    });
  }
  if (elements.scrollButton) {
    elements.scrollButton.addEventListener('click', (event) => {
      event.preventDefault();
      elements.form.scrollIntoView({ behavior: 'smooth' });
    });
  }

  updateAmountDisplay(state.amount);

  // Multiple Crops Management
  const cropsContainer = document.getElementById('crops-container');
  const addCropBtn = document.getElementById('addCropBtn');
  const cropTemplate = document.getElementById('crop-template');

  if (addCropBtn && cropTemplate && cropsContainer) {
    addCropBtn.addEventListener('click', () => {
      const clone = cropTemplate.content.cloneNode(true);
      const cropItem = clone.querySelector('.crop-item');
      
      // Add remove button handler
      const removeBtn = cropItem.querySelector('.remove-crop-btn');
      removeBtn.addEventListener('click', function() {
        cropItem.remove();
      });
      
      cropsContainer.appendChild(cropItem);
    });
  }
})();
