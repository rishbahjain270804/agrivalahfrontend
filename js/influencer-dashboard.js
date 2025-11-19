// Clean Influencer Dashboard
(function() {
  'use strict';

  let currentUser = null;
  let dashboardData = null;

  // Utility: Format currency
  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Utility: Format date
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Utility: Get initials
  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Check authentication
  async function checkAuth() {
    try {
      const apiUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/auth/me') : '/api/auth/me';
      const res = await fetch(apiUrl, { credentials: 'include' });
      
      if (!res.ok) throw new Error('Not authenticated');
      
      const data = await res.json();
      
      if (!data.user || data.user.role !== 'influencer') {
        throw new Error('Not an influencer');
      }
      
      currentUser = data.user;
      return true;
    } catch (error) {
      window.location.href = '/influencer';
      return false;
    }
  }

  // Load all dashboard data
  async function loadDashboard() {
    try {
      // Use HTTPS API subdomain as fallback
      const API_BACKEND = 'https://agrivalahbackend.vercel.app';      const getUrl = (endpoint) => typeof getApiUrl === 'function' ? getApiUrl(endpoint) : `${API_BACKEND}${endpoint}`;

      console.log('[Dashboard] Loading data...');

      const [profileRes, statsRes, registrationsRes, couponsRes, messagesRes] = await Promise.all([
        fetch(getUrl('/api/influencer/profile'), { credentials: 'include' }),
        fetch(getUrl('/api/influencer/dashboard'), { credentials: 'include' }),
        fetch(getUrl('/api/influencer/registrations?limit=10'), { credentials: 'include' }),
        fetch(getUrl('/api/influencer/coupons'), { credentials: 'include' }),
        fetch(getUrl('/api/influencer/messages'), { credentials: 'include' })
      ]);

      console.log('[Dashboard] Responses received:', {
        profile: profileRes.status,
        stats: statsRes.status,
        registrations: registrationsRes.status,
        coupons: couponsRes.status,
        messages: messagesRes.status
      });

      const profile = await profileRes.json();
      console.log('[Dashboard] Profile data:', profile);
      
      const stats = await statsRes.json();
      console.log('[Dashboard] Stats data:', stats);
      
      const registrations = await registrationsRes.json();
      console.log('[Dashboard] Registrations data:', registrations);
      
      const coupons = await couponsRes.json();
      console.log('[Dashboard] Coupons data:', coupons);

      const messages = await messagesRes.json();
      console.log('[Dashboard] Messages data:', messages);

      console.log('[Dashboard] Data parsed:', {
        profile: profile.success,
        stats: stats.success,
        registrations: registrations.success,
        coupons: coupons.success,
        messages: messages.success
      });

      if (!profile.success) {
        console.error('[Dashboard] Profile error:', profile.message);
        throw new Error('Profile: ' + (profile.message || 'Failed'));
      }
      if (!stats.success) {
        console.error('[Dashboard] Stats error:', stats.message);
        throw new Error('Stats: ' + (stats.message || 'Failed'));
      }
      if (!registrations.success) {
        console.error('[Dashboard] Registrations error:', registrations.message);
        throw new Error('Registrations: ' + (registrations.message || 'Failed'));
      }
      if (!coupons.success) {
        console.error('[Dashboard] Coupons error:', coupons.message);
        throw new Error('Coupons: ' + (coupons.message || 'Failed'));
      }
      if (!messages.success) {
        console.error('[Dashboard] Messages error:', messages.message);
        // Don't throw error for messages, just log it
        console.warn('[Dashboard] Messages failed to load, continuing anyway');
      }

      dashboardData = {
        profile: profile.influencer,
        stats: stats.stats,
        registrations: registrations.registrations,
        coupons: coupons.coupons,
        messages: messages.success ? messages.messages : [],
        unreadCount: messages.success ? messages.unreadCount : 0
      };

      console.log('[Dashboard] Data loaded successfully');
      renderDashboard();
      updateLastRefreshTime();
    } catch (error) {
      console.error('[Dashboard] Load error:', error);
      alert('Failed to load dashboard: ' + error.message + '\n\nCheck browser console for details.');
    }
  }

  // Render complete dashboard
  function renderDashboard() {
    renderProfile();
    renderEarnings();
    renderReferralCode();
    renderStats();
    renderMessages();
    renderActivity();
  }

  // Render messages
  function renderMessages() {
    const messages = dashboardData.messages || [];
    const unreadCount = dashboardData.unreadCount || 0;
    const messagesContainer = document.getElementById('messagesContainer');
    const unreadBadge = document.getElementById('unreadCount');

    // Update unread count
    if (unreadCount > 0) {
      unreadBadge.textContent = unreadCount;
      unreadBadge.style.display = 'inline-block';
      document.title = `(${unreadCount}) Agrivalah - Influencer Dashboard`;
    } else {
      unreadBadge.style.display = 'none';
      document.title = 'Agrivalah - Influencer Dashboard';
    }

    if (!messages || messages.length === 0) {
      messagesContainer.innerHTML = `
        <p style="text-align: center; padding: 20px; color: #6b7280;">
          <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 10px; opacity: 0.3; display: block;"></i>
          No messages yet
        </p>
      `;
      return;
    }

    messagesContainer.innerHTML = messages.map(msg => {
      const isUnread = !msg.read;
      return `
        <div class="message-item" style="padding: 16px; 
             border-left: 4px solid ${isUnread ? '#10b981' : '#e2e8f0'}; 
             margin-bottom: 12px; 
             background: ${isUnread ? '#f0fdf4' : '#f9fafb'};
             border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items-start;">
            <div style="flex: 1;">
              <p style="margin: 0; color: #1a202c; font-size: 15px;">${escapeHtml(msg.message)}</p>
              <small style="color: #6b7280; margin-top: 6px; display: block;">
                <i class="far fa-clock"></i> ${formatDate(msg.sent_at || msg.sentAt)}
              </small>
            </div>
            ${isUnread ? `
              <button class="btn btn-sm" onclick="markAsRead('${msg._id}')" 
                      style="background: #10b981; color: white; padding: 6px 12px; border-radius: 6px; border: none; cursor: pointer;">
                <i class="fas fa-check"></i> Mark as Read
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // Helper function to escape HTML
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Mark Message as Read
  window.markAsRead = async function(messageId) {
    try {
      const API_BACKEND = 'https://agrivalahbackend.vercel.app';      const apiUrl = typeof getApiUrl === 'function' 
        ? getApiUrl(`/api/influencer/messages/${messageId}/read`) 
        : `${API_BACKEND}/api/influencer/messages/${messageId}/read`;
      
      const res = await fetch(apiUrl, {
        method: 'POST',
        credentials: 'include'
      });
      
      if (res.ok) {
        await loadDashboard(); // Refresh messages
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Render profile card
  function renderProfile() {
    const profile = dashboardData.profile;
    const profileCard = document.getElementById('profileCard');

    profileCard.innerHTML = `
      <div class="profile-avatar">
        ${getInitials(profile.name)}
      </div>
      <div class="profile-name">${profile.name}</div>
      <div class="profile-type">${profile.type}</div>
      <span class="status-badge status-approved">${profile.approvalStatus}</span>
      
      <div class="profile-details">
        <div class="profile-detail-item">
          <i class="fas fa-phone"></i>
          <span>${profile.contactNumber}</span>
        </div>
        <div class="profile-detail-item">
          <i class="fas fa-envelope"></i>
          <span>${profile.email || 'Not provided'}</span>
        </div>
        <div class="profile-detail-item">
          <i class="fas fa-map-marker-alt"></i>
          <span>${profile.region || 'Not specified'}</span>
        </div>
        <div class="profile-detail-item">
          <i class="fas fa-wallet"></i>
          <span>${profile.upiId || 'UPI not set'}</span>
        </div>
      </div>
    `;
  }

  // Render earnings cards
  function renderEarnings() {
    const stats = dashboardData.stats;
    const payments = stats.payments || {};
    const totals = stats.totals || {};
    
    const totalEarnings = payments.totalCommission || 0;
    const currentBalance = totalEarnings; // In real app, subtract paid amount
    
    const earningsGrid = document.getElementById('earningsGrid');

    earningsGrid.innerHTML = `
      <div class="earning-card">
        <div class="earning-label">💰 Total Lifetime Earnings</div>
        <div class="earning-value">${formatMoney(totalEarnings)}</div>
        <div class="earning-change">
          <i class="fas fa-arrow-up"></i> From ${totals.completed || 0} successful referrals
        </div>
      </div>
      
      <div class="earning-card">
        <div class="earning-label">💵 Current Balance</div>
        <div class="earning-value">${formatMoney(currentBalance)}</div>
        <div class="earning-change">
          <i class="fas fa-info-circle"></i> Available for transfer
        </div>
      </div>
    `;
  }

  // Render referral code section
  function renderReferralCode() {
    const profile = dashboardData.profile;
    const coupons = dashboardData.coupons;
    const mainCoupon = coupons[0] || { code: profile.couponCode };
    
    const referralSection = document.getElementById('referralSection');

    referralSection.innerHTML = `
      <h3 class="section-title">
        <i class="fas fa-ticket-alt"></i>
        Your Referral Code
      </h3>
      
      <div class="referral-code-box">
        <div class="referral-code-label">Share this code with farmers</div>
        <div class="referral-code">${mainCoupon.code}</div>
        <button class="copy-code-btn" onclick="copyCode('${mainCoupon.code}')">
          <i class="fas fa-copy"></i> Copy Code
        </button>
      </div>
      
      <div class="share-buttons">
        <button class="share-btn whatsapp" id="openWhatsappModalBtn">
          <i class="fab fa-whatsapp"></i> Share on WhatsApp
        </button>
        <button class="share-btn" onclick="copyCode('${mainCoupon.code}')">
          <i class="fas fa-copy"></i> Copy Code
        </button>
      </div>
    `;

    // Add WhatsApp modal handler
    setTimeout(() => {
      document.getElementById('openWhatsappModalBtn')?.addEventListener('click', async () => {
        const whatsappModal = new bootstrap.Modal(document.getElementById('whatsappShareModal'));
        
        try {
          const API_BACKEND = 'https://agrivalahbackend.vercel.app';
          const getUrl = (endpoint) => typeof getApiUrl === 'function' ? getApiUrl(endpoint) : `${API_BACKEND}${endpoint}`;

          const response = await fetch(getUrl(`/api/partner/whatsapp-share/${mainCoupon.code}`), {
            credentials: 'include'
          });

          const data = await response.json();

          if (data.success) {
            document.getElementById('whatsappShareLink').value = data.registrationUrl;
            document.getElementById('whatsappMessage').value = decodeURIComponent(
              data.whatsappUrl.split('text=')[1]
            );

            // Copy link button
            document.getElementById('copyLinkBtn').onclick = () => {
              navigator.clipboard.writeText(data.registrationUrl);
              const btn = document.getElementById('copyLinkBtn');
              btn.innerHTML = '<i class="fas fa-check"></i>';
              setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-copy"></i>';
              }, 2000);
            };

            // Open WhatsApp button
            document.getElementById('shareOnWhatsappBtn').onclick = () => {
              window.open(data.whatsappUrl, '_blank');
            };

            whatsappModal.show();
          } else {
            alert(data.message || 'Failed to generate share link');
          }
        } catch (error) {
          console.error('Error generating WhatsApp link:', error);
          alert('Failed to generate share link. Please try again.');
        }
      });
    }, 100);
  }

  // Render statistics
  function renderStats() {
    const stats = dashboardData.stats;
    const totals = stats.totals || {};
    const payments = stats.payments || {};
    
    const conversionRate = totals.totalRegistrations > 0 
      ? Math.round((totals.completed / totals.totalRegistrations) * 100) 
      : 0;

    const statsGrid = document.getElementById('statsGrid');

    statsGrid.innerHTML = `
      <div class="stat-card">
        <div class="stat-icon primary">
          <i class="fas fa-users"></i>
        </div>
        <div class="stat-value">${totals.totalRegistrations || 0}</div>
        <div class="stat-label">Total Referrals</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon success">
          <i class="fas fa-check-circle"></i>
        </div>
        <div class="stat-value">${totals.completed || 0}</div>
        <div class="stat-label">Successful</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon warning">
          <i class="fas fa-clock"></i>
        </div>
        <div class="stat-value">${totals.pending || 0}</div>
        <div class="stat-label">Pending</div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon info">
          <i class="fas fa-percentage"></i>
        </div>
        <div class="stat-value">${conversionRate}%</div>
        <div class="stat-label">Conversion Rate</div>
      </div>
    `;
  }

  // Render recent activity
  function renderActivity() {
    const registrations = dashboardData.registrations;
    const activityList = document.getElementById('activityList');

    if (!registrations || registrations.length === 0) {
      activityList.innerHTML = `
        <li style="text-align: center; padding: 40px; color: #6b7280;">
          <i class="fas fa-inbox" style="font-size: 48px; margin-bottom: 10px; opacity: 0.3;"></i>
          <p>No referrals yet. Start sharing your code!</p>
        </li>
      `;
      return;
    }

    activityList.innerHTML = registrations.map(reg => {
      // Handle both snake_case and camelCase field names
      const farmerName = reg.farmer_name || reg.farmerName || 'Unknown Farmer';
      const registrationDate = reg.registration_date || reg.registrationDate || new Date();
      const district = reg.district || 'Unknown';
      const commissionAmount = reg.commission_amount || reg.commissionAmount || 0;
      const paymentStatus = reg.payment_status || reg.paymentStatus || 'pending';
      
      const statusClass = paymentStatus === 'completed' ? 'completed' : 'pending';
      const statusText = paymentStatus === 'completed' ? 'Completed' : 'Pending';
      
      return `
        <li class="activity-item">
          <div class="activity-info">
            <h4>${farmerName}</h4>
            <p>${formatDate(registrationDate)} • ${district}</p>
          </div>
          <div class="activity-amount">
            <div class="amount">${formatMoney(commissionAmount)}</div>
            <span class="status status-${statusClass}">${statusText}</span>
          </div>
        </li>
      `;
    }).join('');
  }

  // Copy code to clipboard
  window.copyCode = function(code) {
    navigator.clipboard.writeText(code).then(() => {
      alert('✅ Code copied to clipboard!');
    }).catch(() => {
      alert('❌ Failed to copy code');
    });
  };

  // Update last refresh time
  function updateLastRefreshTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN');
    document.getElementById('lastUpdated').textContent = `Last updated: ${timeStr}`;
  }

  // Logout
  async function logout() {
    try {
      const apiUrl = typeof getApiUrl === 'function' ? getApiUrl('/api/auth/logout') : '/api/auth/logout';
      await fetch(apiUrl, { method: 'POST', credentials: 'include' });
    } catch (error) {
      console.warn('Logout error:', error);
    } finally {
      window.location.href = '/influencer';
    }
  }

  // Initialize dashboard
  async function init() {
    const authenticated = await checkAuth();
    if (!authenticated) return;

    await loadDashboard();

    // Event listeners
    document.getElementById('refreshBtn').addEventListener('click', async () => {
      const btn = document.getElementById('refreshBtn');
      const icon = btn.querySelector('i');
      icon.classList.add('fa-spin');
      await loadDashboard();
      icon.classList.remove('fa-spin');
    });

    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Password Reset Modal
    const passwordResetModal = new bootstrap.Modal(document.getElementById('passwordResetModal'));
    document.getElementById('changePasswordBtn')?.addEventListener('click', () => {
      // Pre-fill phone number
      if (dashboardData?.profile?.phone_number) {
        document.getElementById('passwordResetPhone').value = dashboardData.profile.phone_number;
      }
      // Reset modal state
      document.getElementById('passwordResetStep1').style.display = 'block';
      document.getElementById('passwordResetStep2').style.display = 'none';
      document.getElementById('passwordResetSuccess').style.display = 'none';
      document.getElementById('passwordResetOtp').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmNewPassword').value = '';
      passwordResetModal.show();
    });

    // Request Password Reset OTP
    document.getElementById('requestPasswordOtpBtn')?.addEventListener('click', async () => {
      const phone = document.getElementById('passwordResetPhone').value;
      const btn = document.getElementById('requestPasswordOtpBtn');
      const originalText = btn.innerHTML;

      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending OTP...';

      try {
        const API_BACKEND = 'https://agrivalahbackend.vercel.app';
        const getUrl = (endpoint) => typeof getApiUrl === 'function' ? getApiUrl(endpoint) : `${API_BACKEND}${endpoint}`;

        const response = await fetch(getUrl('/api/partner/password-reset/request'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ phone })
        });

        const data = await response.json();

        if (data.success) {
          document.getElementById('passwordResetStep1').style.display = 'none';
          document.getElementById('passwordResetStep2').style.display = 'block';
        } else {
          alert(data.message || 'Failed to send OTP');
        }
      } catch (error) {
        console.error('Error requesting OTP:', error);
        alert('Failed to send OTP. Please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });

    // Reset Password with OTP
    document.getElementById('resetPasswordBtn')?.addEventListener('click', async () => {
      const phone = document.getElementById('passwordResetPhone').value;
      const otp = document.getElementById('passwordResetOtp').value;
      const newPassword = document.getElementById('newPassword').value;
      const confirmPassword = document.getElementById('confirmNewPassword').value;

      if (!otp || otp.length !== 4) {
        alert('Please enter a valid 4-digit OTP');
        return;
      }

      if (newPassword.length < 8) {
        alert('Password must be at least 8 characters long');
        return;
      }

      if (newPassword !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      const btn = document.getElementById('resetPasswordBtn');
      const originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Resetting...';

      try {
        const API_BACKEND = 'https://agrivalahbackend.vercel.app';
        const getUrl = (endpoint) => typeof getApiUrl === 'function' ? getApiUrl(endpoint) : `${API_BACKEND}${endpoint}`;

        const response = await fetch(getUrl('/api/partner/password-reset/verify'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ phone, otp, newPassword })
        });

        const data = await response.json();

        if (data.success) {
          document.getElementById('passwordResetStep2').style.display = 'none';
          document.getElementById('passwordResetSuccess').style.display = 'block';
        } else {
          alert(data.message || 'Failed to reset password');
        }
      } catch (error) {
        console.error('Error resetting password:', error);
        alert('Failed to reset password. Please try again.');
      } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    });

    // Resend OTP
    document.getElementById('resendPasswordOtpBtn')?.addEventListener('click', () => {
      document.getElementById('passwordResetStep2').style.display = 'none';
      document.getElementById('passwordResetStep1').style.display = 'block';
    });

    // Auto-refresh every 30 seconds
    setInterval(loadDashboard, 30000);
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
