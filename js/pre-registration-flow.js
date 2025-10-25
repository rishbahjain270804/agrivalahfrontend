/**
 * Natural Farming Registration Flow
 * 
 * Flow: Pre-Registration → OTP Verification → Payment → Full Form → Success
 * 
 * @author Cyano Veda Natural Farming
 * @version 1.0.0
 */

(() => {
  'use strict';

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  const CONFIG = {
    OTP_LENGTH: 4,
    RESEND_COOLDOWN_SECONDS: 60,
    PHONE_REGEX: /^[6-9]\d{9}$/,
    DEFAULT_AMOUNT: 300,
    DISCOUNTED_AMOUNT: 250,
    COUPON_DEBOUNCE_MS: 500
  };

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================

  const preElements = {
    form: document.getElementById('pre-registration-form'),
    nameInput: document.getElementById('pre-farmer-name'),
    phoneInput: document.getElementById('pre-contact-number'),
    sendOtpBtn: document.getElementById('pre-send-otp-btn'),
    otpSection: document.getElementById('pre-otp-section'),
    otpInput: document.getElementById('pre-otp'),
    verifyOtpBtn: document.getElementById('pre-verify-otp-btn'),
    otpTimer: document.getElementById('pre-otp-timer'),
    couponInput: document.getElementById('pre-coupon-code'),
    couponStatus: document.getElementById('pre-coupon-status'),
    amountDisplay: document.getElementById('pre-amount-display'),
    buttonAmount: document.getElementById('pre-button-amount'),
    proceedBtn: document.getElementById('proceed-to-payment-btn'),
    preRegSection: document.getElementById('pre-registration-section'),
    fullFormSection: document.getElementById('registration-form-section'),
    successSection: document.getElementById('success-message-section')
  };

  const formElements = {
    form: document.getElementById('registration-form'),
    submitBtn: document.getElementById('submit-registration-btn')
  };

  // Exit if required forms not found
  if (!preElements.form || !formElements.form) {
    console.error('[Registration] Required forms not found');
    return;
  }

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const state = {
    otpToken: null,
    referenceId: null,
    farmerName: '',
    phoneNumber: '',
    couponCode: '',
    amount: CONFIG.DEFAULT_AMOUNT,
    paymentCompleted: false,
    paymentId: null,
    orderId: null,
    resendTimer: null,
    resendRemaining: 0,
    otpTimer: null,
    otpExpiresAt: null
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Show alert message to user
   * @param {string} message - Message to display
   */
  function showAlert(message) {
    alert(message);
  }

  /**
   * Update amount display in UI
   * @param {number} amount - Amount to display
   */
  function updateAmountDisplay(amount) {
    state.amount = amount;
    if (preElements.amountDisplay) {
      preElements.amountDisplay.textContent = `₹${amount}`;
    }
    if (preElements.buttonAmount) {
      preElements.buttonAmount.textContent = `₹${amount}`;
    }
  }

  /**
   * Set status message with styling
   * @param {HTMLElement} target - Target element
   * @param {string} text - Message text
   * @param {string} kind - Message type: 'success', 'error', 'muted'
   */
  function setStatusMessage(target, text, kind) {
    if (!target) return;

    target.textContent = text || '';
    target.className = 'form-text';

    if (!text) return;

    if (kind === 'success') {
      target.classList.add('text-success');
    } else if (kind === 'error') {
      target.classList.add('text-danger');
    } else {
      target.classList.add('text-muted');
    }
  }

  /**
   * Set button loading state
   * @param {HTMLElement} button - Button element
   * @param {boolean} isLoading - Loading state
   * @param {string} loadingText - Text to show when loading
   * @param {string} normalText - Text to show when not loading
   */
  function setButtonLoading(button, isLoading, loadingText, normalText) {
    if (!button) return;

    button.disabled = isLoading;
    button.innerHTML = isLoading
      ? `<i class="fa fa-spinner fa-spin me-2"></i>${loadingText}`
      : normalText;
  }

  /**
   * Generate unique reference ID
   * @returns {string} Reference ID
   */
  function generateReferenceId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11).toUpperCase();
    return `REG-${timestamp}-${random}`;
  }

  // ============================================================================
  // TIMER FUNCTIONS
  // ============================================================================

  /**
   * Start countdown for OTP resend button
   * @param {number} seconds - Countdown duration in seconds
   */
  function startResendCountdown(seconds) {
    if (!preElements.sendOtpBtn) return;

    // Clear existing timer
    if (state.resendTimer) {
      clearInterval(state.resendTimer);
      state.resendTimer = null;
    }

    state.resendRemaining = seconds;

    // If no cooldown, enable button immediately
    if (seconds === 0) {
      preElements.sendOtpBtn.disabled = false;
      preElements.sendOtpBtn.textContent = 'Resend OTP';
      return;
    }

    // Disable button and start countdown
    preElements.sendOtpBtn.disabled = true;
    preElements.sendOtpBtn.textContent = `Resend in ${seconds}s`;

    state.resendTimer = setInterval(() => {
      state.resendRemaining -= 1;

      if (state.resendRemaining <= 0) {
        clearInterval(state.resendTimer);
        state.resendTimer = null;
        preElements.sendOtpBtn.disabled = false;
        preElements.sendOtpBtn.textContent = 'Resend OTP';
      } else {
        preElements.sendOtpBtn.textContent = `Resend in ${state.resendRemaining}s`;
      }
    }, 1000);
  }

  /**
   * Start countdown for OTP expiry
   * @param {number} expiresInSeconds - OTP validity duration in seconds
   */
  function startOtpCountdown(expiresInSeconds) {
    if (!preElements.otpTimer) return;

    // Clear existing timer
    if (state.otpTimer) {
      clearInterval(state.otpTimer);
      state.otpTimer = null;
    }

    state.otpExpiresAt = Date.now() + (expiresInSeconds * 1000);

    const updateTimer = () => {
      const diff = state.otpExpiresAt - Date.now();

      if (diff <= 0) {
        clearInterval(state.otpTimer);
        state.otpTimer = null;
        preElements.otpTimer.textContent = 'OTP expired. Request a new code.';
        preElements.otpTimer.className = 'text-danger';
        return;
      }

      const totalSeconds = Math.floor(diff / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      preElements.otpTimer.textContent = `OTP expires in ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      preElements.otpTimer.className = 'text-muted';
    };

    updateTimer();
    state.otpTimer = setInterval(updateTimer, 1000);
  }

  // ============================================================================
  // API FUNCTIONS
  // ============================================================================

  /**
   * Make API request
   * @param {string} url - API endpoint
   * @param {object} options - Fetch options
   * @returns {Promise<object>} Response data
   */
  async function apiRequest(url, options = {}) {
    const fullUrl = typeof getApiUrl === 'function' ? getApiUrl(url) : url;

    const response = await fetch(fullUrl, {
      ...options,
      credentials: 'include'
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  /**
   * Validate coupon code
   * @param {string} code - Coupon code to validate
   */
  async function validateCoupon(code) {
    const trimmed = code.trim();

    // Reset if empty
    if (!trimmed) {
      state.couponCode = '';
      updateAmountDisplay(CONFIG.DEFAULT_AMOUNT);
      setStatusMessage(preElements.couponStatus, '');
      return;
    }

    setStatusMessage(preElements.couponStatus, 'Validating coupon...', 'muted');

    try {
      const couponUrl = typeof getApiUrl === 'function'
        ? getApiUrl(`/api/validate-coupon?code=${encodeURIComponent(trimmed)}`)
        : `/api/validate-coupon?code=${encodeURIComponent(trimmed)}`;

      const result = await fetch(couponUrl, { credentials: 'include' }).then(res => res.json());

      if (result && result.valid) {
        state.couponCode = trimmed;
        const amount = result.amount || CONFIG.DISCOUNTED_AMOUNT;
        updateAmountDisplay(amount);

        const label = result.influencerName
          ? `✓ Coupon applied! Influencer: ${result.influencerName}. You save ₹${CONFIG.DEFAULT_AMOUNT - amount}!`
          : `✓ Coupon applied! You save ₹${CONFIG.DEFAULT_AMOUNT - amount}!`;

        setStatusMessage(preElements.couponStatus, label, 'success');
      } else {
        state.couponCode = '';
        updateAmountDisplay(CONFIG.DEFAULT_AMOUNT);
        setStatusMessage(preElements.couponStatus, '✗ Invalid referral code', 'error');
      }
    } catch (error) {
      state.couponCode = '';
      updateAmountDisplay(CONFIG.DEFAULT_AMOUNT);
      setStatusMessage(preElements.couponStatus, 'Unable to validate coupon', 'error');
    }
  }

  // ============================================================================
  // OTP FUNCTIONS
  // ============================================================================

  /**
   * Send OTP to phone number
   */
  async function sendOtp() {
    const name = preElements.nameInput?.value.trim() || '';
    const phone = preElements.phoneInput?.value.trim() || '';

    // Validation
    if (!name) {
      showAlert('Please enter your full name');
      return;
    }

    if (!CONFIG.PHONE_REGEX.test(phone)) {
      showAlert('Please enter a valid 10-digit mobile number starting with 6-9');
      return;
    }

    // Store in state
    state.farmerName = name;
    state.phoneNumber = phone;

    setButtonLoading(preElements.sendOtpBtn, true, 'Sending...', 'Send OTP');

    try {
      const result = await apiRequest('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone })
      });

      const cooldown = result.cooldown || CONFIG.RESEND_COOLDOWN_SECONDS;
      const expiresIn = result.expiresIn || 300;

      // Show OTP section
      preElements.otpSection.style.display = 'block';
      startResendCountdown(cooldown);
      startOtpCountdown(expiresIn);

      // Show test OTP in development mode
      if (result.testOtp) {
        console.log(`[DEV] Test OTP: ${result.testOtp}`);
        showAlert(`Test Mode: OTP is ${result.testOtp}`);
      } else {
        showAlert(`OTP sent to ${phone}. Please check your messages.`);
      }
    } catch (error) {
      showAlert(error.message || 'Failed to send OTP');
      setButtonLoading(preElements.sendOtpBtn, false, '', 'Send OTP');
    }
  }

  /**
   * Verify OTP code
   */
  async function verifyOtp() {
    const phone = preElements.phoneInput?.value.trim() || '';
    const code = preElements.otpInput?.value.trim() || '';

    // Validation
    if (!CONFIG.PHONE_REGEX.test(phone)) {
      showAlert('Please enter a valid mobile number');
      return;
    }

    if (code.length !== CONFIG.OTP_LENGTH) {
      showAlert(`Please enter the ${CONFIG.OTP_LENGTH}-digit OTP`);
      return;
    }

    setButtonLoading(preElements.verifyOtpBtn, true, 'Verifying...', 'Verify');

    try {
      const result = await apiRequest('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otpCode: code })
      });

      state.otpToken = result.otpToken || null;

      // Clear timers
      if (state.otpTimer) clearInterval(state.otpTimer);
      if (state.resendTimer) clearInterval(state.resendTimer);

      // Update UI
      preElements.otpTimer.textContent = '✓ Verified';
      preElements.otpTimer.className = 'text-success';
      preElements.sendOtpBtn.disabled = true;
      preElements.sendOtpBtn.textContent = 'Verified';
      preElements.verifyOtpBtn.disabled = true;
      preElements.verifyOtpBtn.textContent = 'Verified';
      preElements.proceedBtn.disabled = false;

      showAlert('Mobile number verified successfully!');
    } catch (error) {
      showAlert(error.message || 'OTP verification failed');
      setButtonLoading(preElements.verifyOtpBtn, false, '', 'Verify');
    }
  }

  // ============================================================================
  // PAYMENT FUNCTIONS
  // ============================================================================

  /**
   * Load Razorpay script
   * @returns {Promise<void>}
   */
  function ensureRazorpay() {
    return new Promise((resolve, reject) => {
      if (typeof Razorpay !== 'undefined') {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load Razorpay'));
      document.head.appendChild(script);
    });
  }

  /**
   * Open Razorpay payment modal
   * @param {object} orderData - Order details from backend
   * @returns {Promise<object>} Payment response
   */
  function openPayment(orderData) {
    return new Promise((resolve, reject) => {
      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'Cyano Veda Natural Farming',
        description: 'Natural Farming Certification Fee',
        order_id: orderData.order_id,
        prefill: {
          name: state.farmerName,
          contact: state.phoneNumber
        },
        theme: { color: '#10b981' },
        handler: resolve,
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled'))
        }
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', (failure) => {
        reject(new Error(failure?.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  }

  /**
   * Proceed to payment
   */
  async function proceedToPayment() {
    // Validation
    if (!state.otpToken) {
      showAlert('Please verify your mobile number first');
      return;
    }

    const amountInPaise = state.amount * 100;
    setButtonLoading(preElements.proceedBtn, true, 'Processing...', `<i class="fa fa-credit-card me-2"></i>Proceed to Payment (₹${state.amount})`);

    try {
      // Generate reference ID
      if (!state.referenceId) {
        state.referenceId = generateReferenceId();
      }

      // Create order
      const orderData = await apiRequest('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amountInPaise,
          farmerName: state.farmerName,
          emailId: '',
          registrationReference: state.referenceId,
          couponCode: state.couponCode || undefined
        })
      });

      // Open Razorpay
      await ensureRazorpay();
      const paymentResponse = await openPayment(orderData);

      // Verify payment
      await apiRequest('/api/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          amount: orderData.amount,
          registration_reference: state.referenceId
        })
      });

      // Update state
      state.paymentCompleted = true;
      state.paymentId = paymentResponse.razorpay_payment_id;
      state.orderId = paymentResponse.razorpay_order_id;

      // Show full form
      showFullRegistrationForm();

      showAlert(`Payment of ₹${state.amount} successful! Please complete your registration details.`);
    } catch (error) {
      console.error('[Payment Error]', error);
      showAlert(error.message || 'Payment failed. Please try again.');
      setButtonLoading(preElements.proceedBtn, false, '', `<i class="fa fa-credit-card me-2"></i>Proceed to Payment (₹${state.amount})`);
    }
  }

  /**
   * Show full registration form after payment
   */
  function showFullRegistrationForm() {
    // Hide pre-registration section
    if (preElements.preRegSection) {
      preElements.preRegSection.style.display = 'none';
    }

    // Show full form section
    if (!preElements.fullFormSection) {
      showAlert('Error: Registration form not found. Please refresh the page.');
      return;
    }
    preElements.fullFormSection.style.display = 'block';

    // Pre-fill hidden fields
    const today = new Date().toISOString().split('T')[0];
    const fields = {
      'registration-date': today,
      'farmer-name': state.farmerName,
      'contact-number': state.phoneNumber,
      'farmer-name-display': state.farmerName,
      'contact-number-display': state.phoneNumber
    };

    Object.entries(fields).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.value = value;
    });

    // Display payment information
    const paymentInfo = {
      'payment-id-display': state.paymentId || 'N/A',
      'paid-amount-display': `₹${state.amount}`
    };

    Object.entries(paymentInfo).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });

    // Show/hide coupon section
    const couponAppliedSection = document.getElementById('coupon-applied-section');
    const noCouponSection = document.getElementById('no-coupon-section');
    const couponCodeDisplay = document.getElementById('coupon-code-display');

    if (state.couponCode) {
      if (couponCodeDisplay) couponCodeDisplay.textContent = state.couponCode;
      if (couponAppliedSection) couponAppliedSection.style.display = 'block';
      if (noCouponSection) noCouponSection.style.display = 'none';
    } else {
      if (couponAppliedSection) couponAppliedSection.style.display = 'none';
      if (noCouponSection) noCouponSection.style.display = 'block';
    }

    // Scroll to form
    preElements.fullFormSection.scrollIntoView({ behavior: 'smooth' });
  }

  // ============================================================================
  // FORM SUBMISSION
  // ============================================================================

  /**
   * Collect form data
   * @returns {object} Form data
   */
  function collectFormData() {
    const getValue = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : '';
    };

    const getRadioValue = (name) => {
      const checked = document.querySelector(`input[name="${name}"]:checked`);
      return checked ? checked.value : '';
    };

    const getChecklistValues = (selector) => {
      return Array.from(document.querySelectorAll(`${selector}:checked`))
        .map(el => el.value)
        .join(', ');
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
      farmingAreaUnit: getValue('farming-area-unit'),
      areaNaturalFarming: getValue('area-natural-farming'),
      presentCrop: getValue('present-crop'),
      sowingDate: getValue('sowing-date'),
      harvestingDate: getValue('harvesting-date'),
      cropTypes: getValue('crop-types'),
      otherCropType: getValue('other-crop-type'),
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

  /**
   * Handle full form submission
   * @param {Event} event - Submit event
   */
  async function handleFullFormSubmit(event) {
    event.preventDefault();

    // Validation
    if (!state.paymentCompleted) {
      showAlert('Payment must be completed before submitting the form');
      return;
    }

    if (!state.referenceId) {
      showAlert('Error: Registration reference is missing. Please refresh and try again.');
      return;
    }

    setButtonLoading(formElements.submitBtn, true, 'Submitting...', '<i class="fa fa-check me-2"></i>Complete Registration');

    try {
      const formData = collectFormData();

      // Validate OTP token exists
      if (!state.otpToken) {
        showAlert('OTP verification expired. Please refresh the page and start again.');
        setButtonLoading(formElements.submitBtn, false, '', '<i class="fa fa-check me-2"></i>Complete Registration');
        return;
      }

      // Ensure phone number matches
      if (formData.contactNumber !== state.phoneNumber) {
        console.error('[Form] Phone mismatch:', formData.contactNumber, 'vs', state.phoneNumber);
        showAlert('Phone number mismatch. Please refresh and try again.');
        setButtonLoading(formElements.submitBtn, false, '', '<i class="fa fa-check me-2"></i>Complete Registration');
        return;
      }

      console.log('[Form] Saving registration...');
      console.log('[Form] Reference ID:', state.referenceId);
      console.log('[Form] Phone Number:', state.phoneNumber);
      console.log('[Form] OTP Token:', state.otpToken ? 'Present' : 'Missing');

      // Step 1: Save registration details
      const saveResponse = await apiRequest('/api/registration/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          otpToken: state.otpToken,
          referenceId: state.referenceId,
          couponCode: state.couponCode || '',
          form: formData
        })
      });

      // Update reference ID from response (backend may generate new one)
      if (saveResponse.referenceId) {
        state.referenceId = saveResponse.referenceId;
        console.log('[Form] Updated Reference ID:', state.referenceId);
      }

      console.log('[Form] Registration saved successfully');

      console.log('[Form] Completing registration with payment info...');
      console.log('[Form] Payment ID:', state.paymentId);
      console.log('[Form] Order ID:', state.orderId);
      console.log('[Form] Amount:', state.amount);

      // Step 2: Complete registration with payment info
      await apiRequest('/api/registration/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referenceId: state.referenceId,
          otpToken: state.otpToken,
          paymentId: state.paymentId,
          orderId: state.orderId,
          paymentAmount: state.amount,
          couponCode: state.couponCode || undefined
        })
      });

      console.log('[Form] Registration completed successfully');

      // Show success message
      preElements.fullFormSection.style.display = 'none';
      preElements.successSection.style.display = 'block';

      // Update success message if discount applied
      const successMessage = preElements.successSection.querySelector('.lead');
      if (successMessage && state.amount < CONFIG.DEFAULT_AMOUNT) {
        const discount = CONFIG.DEFAULT_AMOUNT - state.amount;
        successMessage.innerHTML = `Thank you for your payment of ₹${state.amount} (with ₹${discount} discount). Your application has been submitted successfully.`;
      }

      preElements.successSection.scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
      showAlert(error.message || 'Failed to complete registration');
      setButtonLoading(formElements.submitBtn, false, '', '<i class="fa fa-check me-2"></i>Complete Registration');
    }
  }

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  // OTP buttons
  if (preElements.sendOtpBtn) {
    preElements.sendOtpBtn.addEventListener('click', sendOtp);
  }

  if (preElements.verifyOtpBtn) {
    preElements.verifyOtpBtn.addEventListener('click', verifyOtp);
  }

  // Payment button
  if (preElements.proceedBtn) {
    preElements.proceedBtn.addEventListener('click', proceedToPayment);
  }

  // Form submission
  if (formElements.form) {
    formElements.form.addEventListener('submit', handleFullFormSubmit);
  }

  // Coupon input with debounce
  if (preElements.couponInput) {
    let debounceTimer = null;
    preElements.couponInput.addEventListener('input', (event) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => validateCoupon(event.target.value), CONFIG.COUPON_DEBOUNCE_MS);
    });
  }

  // "Other" crop type visibility toggle
  const cropTypesSelect = document.getElementById('crop-types');
  const otherCropTypeDiv = document.getElementById('other-crop-container');
  const otherCropTypeInput = document.getElementById('other-crop-type');

  if (cropTypesSelect && otherCropTypeDiv && otherCropTypeInput) {
    cropTypesSelect.addEventListener('change', () => {
      const isOther = cropTypesSelect.value === 'other';
      otherCropTypeDiv.style.display = isOther ? 'block' : 'none';
      otherCropTypeInput.required = isOther;
      if (!isOther) otherCropTypeInput.value = '';
    });
  }

})();
