// Comprehensive Influencer Dashboard
console.log('[Influencer Dashboard] Script loaded');

(() => {
  console.log('[Influencer Dashboard] Initializing...');
  
  let currentUser = null;
  let autoRefreshInterval = null;
  let lastUpdateTime = null;

  // Utility Functions
  const showAlert = (message, type = 'info') => {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  };

  const formatRupees = (value) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR', 
      maximumFractionDigits: 0 
    }).format(value || 0);
  };

  const updateLastRefreshTime = () => {
    lastUpdateTime = new Date();
    const timeStr = lastUpdateTime.toLocaleTimeString();
    const elem = document.getElementById('lastUpdated');
    if (elem) {
      elem.textContent = `Last updated: ${timeStr}`;
    }
  };

  // Authentication
  async function ensureInfluencerSession() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) {
        throw new Error('not authenticated');
      }
      const data = await res.json();
      if (!data.user || data.user.role !== 'influencer') {
        throw new Error('not influencer');
      }
      currentUser = data.user;
      return currentUser;
    } catch (error) {
      window.location.href = '/influencer/login';
      throw error;
    }
  }


  // Render Profile
  function renderProfile(profile) {
    const profileDiv = document.getElementById('influencerProfile');
    const statusClass = profile.approvalStatus === 'approved' ? 'success' : 'warning';
    
    profileDiv.innerHTML = `
      <div class="text-center mb-3">
        <i class="fas fa-user-circle" style="font-size: 4rem;"></i>
        <h4 class="mt-2 mb-0">${profile.name}</h4>
        <p class="mb-0 opacity-75">${profile.type}</p>
      </div>
      
      <div class="referral-code">
        ${profile.couponCode || 'Not Assigned'}
      </div>
      
      <div class="text-center mb-3">
        <button class="btn copy-btn btn-sm copy-referral-code-btn" data-code="${profile.couponCode}">
          <i class="fas fa-copy me-1"></i>Copy Code
        </button>
      </div>
      
      <hr style="border-color: rgba(255,255,255,0.3);">
      
      <div class="small">
        <p class="mb-2"><i class="fas fa-phone me-2"></i>${profile.contactNumber}</p>
        <p class="mb-2"><i class="fas fa-envelope me-2"></i>${profile.email || 'Not provided'}</p>
        <p class="mb-2"><i class="fas fa-map-marker-alt me-2"></i>${profile.region || 'Not specified'}</p>
        <p class="mb-2">
          <i class="fas fa-check-circle me-2"></i>
          <span class="status-badge bg-${statusClass}">${profile.approvalStatus}</span>
        </p>
      </div>
    `;

    // Attach copy button listener
    attachCopyButtonListeners();
  }

  // Copy referral code
  const copyReferralCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      showAlert('Referral code copied to clipboard!', 'success');
    }).catch(() => {
      showAlert('Failed to copy code', 'error');
    });
  };

  // Attach copy button listener to profile
  const attachCopyButtonListeners = () => {
    document.querySelectorAll('.copy-referral-code-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const code = btn.getAttribute('data-code');
        copyReferralCode(code);
      });
    });
  };

  // Render Statistics
  function renderStatistics(stats) {
    const totals = stats.totals || {};
    const payments = stats.payments || {};

    document.getElementById('statTotalReferrals').textContent = totals.totalRegistrations || 0;
    document.getElementById('statCompleted').textContent = totals.completed || 0;
    document.getElementById('statPending').textContent = totals.pending || 0;
    document.getElementById('statEarnings').textContent = formatRupees(payments.totalCommission);
    document.getElementById('statRevenue').textContent = formatRupees(totals.totalRevenue);
    document.getElementById('statCommission').textContent = formatRupees(payments.totalCommission);
    document.getElementById('statCouponUsage').textContent = totals.totalRegistrations || 0;
  }

  // Render Performance
  function renderPerformance(stats) {
    const totals = stats.totals || {};
    const payments = stats.payments || {};

    const statusBreakdown = document.getElementById('statusBreakdown');
    statusBreakdown.innerHTML = `
      <ul class="list-group">
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-users text-primary me-2"></i>Total Registrations</span>
          <strong>${totals.totalRegistrations || 0}</strong>
        </li>
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-check-circle text-success me-2"></i>Completed</span>
          <strong>${totals.completed || 0}</strong>
        </li>
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-clock text-warning me-2"></i>Pending</span>
          <strong>${totals.pending || 0}</strong>
        </li>
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-times-circle text-danger me-2"></i>Failed</span>
          <strong>${totals.failed || 0}</strong>
        </li>
      </ul>
    `;

    const paymentInfo = document.getElementById('paymentInfo');
    paymentInfo.innerHTML = `
      <ul class="list-group">
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-rupee-sign text-success me-2"></i>Total Revenue</span>
          <strong>${formatRupees(totals.totalRevenue)}</strong>
        </li>
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-hand-holding-usd text-info me-2"></i>Commission Earned</span>
          <strong>${formatRupees(payments.totalCommission)}</strong>
        </li>
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-credit-card text-primary me-2"></i>Total Payments</span>
          <strong>${payments.paymentCount || 0}</strong>
        </li>
        <li class="list-group-item d-flex justify-content-between">
          <span><i class="fas fa-chart-line text-warning me-2"></i>Avg. Commission</span>
          <strong>${formatRupees((payments.totalCommission || 0) / (payments.paymentCount || 1))}</strong>
        </li>
      </ul>
    `;
  }

  // Render Recent Registrations
  function renderRecentRegistrations(registrations) {
    const container = document.getElementById('influencerRecentRegistrations');
    
    if (!registrations || registrations.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info">
          <i class="fas fa-info-circle me-2"></i>
          No referrals yet. Share your referral code to start earning!
        </div>
      `;
      return;
    }

    let html = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Date</th>
              <th>Farmer Name</th>
              <th>Contact</th>
              <th>District</th>
              <th>Amount</th>
              <th>Payment Status</th>
              <th>Commission</th>
            </tr>
          </thead>
          <tbody>
    `;

    registrations.forEach((item) => {
      const statusClass = {
        completed: 'success',
        pending: 'warning',
        failed: 'danger'
      }[item.payment_status || item.paymentStatus] || 'secondary';

      html += `
        <tr>
          <td>${new Date(item.registration_date || item.registrationDate).toLocaleDateString()}</td>
          <td>${item.farmer_name || item.farmerName}</td>
          <td>${item.contact_number || item.contactNumber || '-'}</td>
          <td>${item.district || '-'}</td>
          <td>${formatRupees(item.payment_amount || item.paymentAmount)}</td>
          <td><span class="badge bg-${statusClass}">${item.payment_status || item.paymentStatus}</span></td>
          <td>${formatRupees(item.commission_amount || item.commissionAmount || 0)}</td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  // Render Coupons
  function renderCoupons(coupons) {
    const container = document.getElementById('influencerCoupons');
    
    if (!coupons || coupons.length === 0) {
      container.innerHTML = `
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          No referral codes assigned yet. Contact admin for assistance.
        </div>
      `;
      return;
    }

    let html = '<div class="row g-3">';

    coupons.forEach((coupon) => {
      const usage = coupon.usageLimit !== null
        ? `${coupon.usageCount || 0} / ${coupon.usageLimit}`
        : `${coupon.usageCount || 0} (Unlimited)`;
      
      const discountLabel = coupon.discountType === 'percent'
        ? `${coupon.discountValue}% OFF`
        : `${formatRupees(coupon.discountValue)} OFF`;

      const statusClass = coupon.active ? 'success' : 'secondary';
      const statusText = coupon.active ? 'Active' : 'Inactive';

      html += `
        <div class="col-md-6">
          <div class="card">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-start mb-3">
                <div>
                  <h5 class="mb-1">
                    <span class="badge bg-primary">${coupon.code}</span>
                  </h5>
                  <small class="text-muted">Referral Code</small>
                </div>
                <span class="badge bg-${statusClass}">${statusText}</span>
              </div>
              
              <div class="row text-center">
                <div class="col-4">
                  <h6 class="mb-0">${discountLabel}</h6>
                  <small class="text-muted">Discount</small>
                </div>
                <div class="col-4">
                  <h6 class="mb-0">${formatRupees(coupon.commissionAmount || 0)}</h6>
                  <small class="text-muted">Commission</small>
                </div>
                <div class="col-4">
                  <h6 class="mb-0">${usage}</h6>
                  <small class="text-muted">Usage</small>
                </div>
              </div>
              
              <div class="mt-3">
                <small class="text-muted">
                  <i class="fas fa-chart-line me-1"></i>
                  Revenue: ${formatRupees(coupon.totalRevenue || 0)}
                </small>
              </div>
              
              <button class="btn btn-sm btn-outline-primary w-100 mt-2 copy-referral-code-btn" data-code="${coupon.code}">
                <i class="fas fa-copy me-1"></i>Copy Code
              </button>
            </div>
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;

    // Attach copy button listeners
    attachCopyButtonListeners();
  }


  // Load Dashboard Data
  async function loadInfluencerDashboard() {
    try {
      await ensureInfluencerSession();

      const [profileRes, statsRes, recentRes, couponsRes] = await Promise.all([
        fetch('/api/influencer/profile', { credentials: 'include' }),
        fetch('/api/influencer/dashboard', { credentials: 'include' }),
        fetch('/api/influencer/registrations?limit=20', { credentials: 'include' }),
        fetch('/api/influencer/coupons', { credentials: 'include' })
      ]);

      const profileData = await profileRes.json();
      const statsData = await statsRes.json();
      const recentData = await recentRes.json();
      const couponsData = await couponsRes.json();

      if (!profileData.success) {
        throw new Error(profileData.message || 'Failed to load profile');
      }
      if (!statsData.success) {
        throw new Error(statsData.message || 'Failed to load stats');
      }
      if (!recentData.success) {
        throw new Error(recentData.message || 'Failed to load registrations');
      }
      if (!couponsData.success) {
        throw new Error(couponsData.message || 'Failed to load coupons');
      }

      renderProfile(profileData.influencer);
      renderStatistics(statsData.stats);
      renderPerformance(statsData.stats);
      renderRecentRegistrations(recentData.registrations);
      renderCoupons(couponsData.coupons);

      updateLastRefreshTime();
    } catch (error) {
      showAlert('Failed to load dashboard: ' + error.message, 'error');
    }
  }

  // Export Referrals
  const exportReferrals = async () => {
    try {
      const res = await fetch('/api/influencer/registrations?limit=1000', { credentials: 'include' });
      const data = await res.json();
      
      if (!data.success || !data.registrations) {
        throw new Error('Failed to fetch referrals');
      }

      const exportData = data.registrations.map(reg => ({
        'Date': new Date(reg.registration_date || reg.registrationDate).toLocaleDateString(),
        'Farmer Name': reg.farmer_name || reg.farmerName,
        'Contact': reg.contact_number || reg.contactNumber,
        'District': reg.district,
        'State': reg.state,
        'Amount': reg.payment_amount || reg.paymentAmount,
        'Payment Status': reg.payment_status || reg.paymentStatus,
        'Commission': reg.commission_amount || reg.commissionAmount || 0,
        'Coupon Code': reg.coupon_code || reg.couponCode
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Referrals');
      XLSX.writeFile(wb, `my_referrals_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      showAlert('Referrals exported successfully!', 'success');
    } catch (error) {
      showAlert('Failed to export: ' + error.message, 'error');
    }
  };

  // Auto-refresh
  const startAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(() => {
      loadInfluencerDashboard();
    }, 30000); // 30 seconds
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  };

  // Event Listeners
  document.addEventListener('DOMContentLoaded', () => {
    console.log('[Influencer Dashboard] DOM Content Loaded');
    
    // Load dashboard
    console.log('[Influencer Dashboard] Loading dashboard data');
    loadInfluencerDashboard();
    startAutoRefresh();

    // Logout
    console.log('[Influencer Dashboard] Attaching logout listener');
    const logoutBtn = document.getElementById('influencerLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        console.log('[Influencer Dashboard] Logout clicked');
        try {
          await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (error) {
          console.warn('Logout failed', error);
        } finally {
          window.location.href = '/influencer/login';
        }
      });
    }

    // Refresh button
    console.log('[Influencer Dashboard] Attaching refresh listener');
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[Influencer Dashboard] Refresh clicked');
        const icon = refreshBtn.querySelector('i');
        icon.classList.add('fa-spin');
        loadInfluencerDashboard().finally(() => {
          icon.classList.remove('fa-spin');
        });
      });
    }

    // Auto-refresh toggle
    const autoRefreshToggle = document.getElementById('autoRefreshToggle');
    if (autoRefreshToggle) {
      autoRefreshToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          startAutoRefresh();
          showAlert('Auto-refresh enabled (30s interval)', 'info');
        } else {
          stopAutoRefresh();
          showAlert('Auto-refresh disabled', 'info');
        }
      });
    }

    // Export button
    console.log('[Influencer Dashboard] Attaching export listener');
    const exportBtn = document.getElementById('exportReferralsBtn');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        console.log('[Influencer Dashboard] Export clicked');
        exportReferrals();
      });
    }
  });
})();
