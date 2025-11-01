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
      // Use VPS backend directly as fallback
      const VPS_BACKEND = 'http://89.116.20.62:3002';
      const getUrl = (endpoint) => typeof getApiUrl === 'function' ? getApiUrl(endpoint) : `${VPS_BACKEND}${endpoint}`;

      console.log('[Dashboard] Loading data...');

      const [profileRes, statsRes, registrationsRes, couponsRes] = await Promise.all([
        fetch(getUrl('/api/influencer/profile'), { credentials: 'include' }),
        fetch(getUrl('/api/influencer/dashboard'), { credentials: 'include' }),
        fetch(getUrl('/api/influencer/registrations?limit=10'), { credentials: 'include' }),
        fetch(getUrl('/api/influencer/coupons'), { credentials: 'include' })
      ]);

      console.log('[Dashboard] Responses received:', {
        profile: profileRes.status,
        stats: statsRes.status,
        registrations: registrationsRes.status,
        coupons: couponsRes.status
      });

      const profile = await profileRes.json();
      console.log('[Dashboard] Profile data:', profile);
      
      const stats = await statsRes.json();
      console.log('[Dashboard] Stats data:', stats);
      
      const registrations = await registrationsRes.json();
      console.log('[Dashboard] Registrations data:', registrations);
      
      const coupons = await couponsRes.json();
      console.log('[Dashboard] Coupons data:', coupons);

      console.log('[Dashboard] Data parsed:', {
        profile: profile.success,
        stats: stats.success,
        registrations: registrations.success,
        coupons: coupons.success
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

      dashboardData = {
        profile: profile.influencer,
        stats: stats.stats,
        registrations: registrations.registrations,
        coupons: coupons.coupons
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
    renderActivity();
  }

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
    const shareText = `Join Agrivalah Natural Farming! Use my referral code: ${mainCoupon.code}`;
    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

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
        <button class="share-btn whatsapp" onclick="window.open('${whatsappLink}', '_blank')">
          <i class="fab fa-whatsapp"></i> Share on WhatsApp
        </button>
        <button class="share-btn" onclick="copyCode('${mainCoupon.code}')">
          <i class="fas fa-copy"></i> Copy Code
        </button>
      </div>
    `;
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
