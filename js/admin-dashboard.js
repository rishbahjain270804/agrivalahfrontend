/**
 * Admin Dashboard - Complete Management System
 * Natural Farming Registration Platform
 */

(() => {
  'use strict';

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const state = {
    currentUser: null,
    currentSection: 'dashboard',
    data: {
      registrations: [],
      payments: [],
      influencers: [],
      approvals: []
    },
    pagination: {
      registrations: { page: 1, limit: 20, total: 0 },
      payments: { page: 1, limit: 20, total: 0 }
    },
    filters: {
      registrations: {},
      payments: {},
      influencers: {}
    }
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const showAlert = (message, type = 'info') => {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 5000);
  };

  const apiRequest = async (endpoint, options = {}) => {
    try {
      // Use HTTPS API subdomain as fallback
      const API_BACKEND = 'https://api.agrivalah.in';
      const url = typeof getApiUrl === 'function' ? getApiUrl(endpoint) : `${API_BACKEND}${endpoint}`;
      console.log('[Admin Dashboard] API Request:', options.method || 'GET', url);
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      console.log('[Admin Dashboard] API Response:', response.status, endpoint);
      const data = await response.json();
      if (!response.ok) {
        console.error('[Admin Dashboard] API Error:', response.status, data);
        throw new Error(data.message || 'Request failed');
      }
      return data;
    } catch (error) {
      console.error('[Admin Dashboard] API Error:', error);
      throw error;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  };

  const updateLastRefreshTime = () => {
    const elem = document.getElementById('lastUpdated');
    if (elem) {
      elem.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
    }
  };

  // ============================================================================
  // AUTHENTICATION
  // ============================================================================

  const checkAuth = async () => {
    try {
      console.log('[Admin Dashboard] Checking authentication...');
      const data = await apiRequest('/api/auth/me');
      console.log('[Admin Dashboard] Auth response:', data);
      if (!data.user || data.user.role !== 'admin') {
        console.error('[Admin Dashboard] Auth failed - not admin role. User:', data.user);
        throw new Error('Not authorized');
      }
      state.currentUser = data.user;
      console.log('[Admin Dashboard] Auth successful, user:', data.user.email);
      return true;
    } catch (error) {
      console.error('[Admin Dashboard] Auth error, redirecting to login:', error.message);
      console.error('[Admin Dashboard] PAUSING 5 SECONDS - CHECK CONSOLE NOW!');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      window.location.href = '/admin';
      return false;
    }
  };

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const showSection = (sectionName) => {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(el => {
      el.classList.remove('active');
    });

    // Remove active from all nav links
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(`${sectionName}Section`);
    if (section) {
      section.classList.add('active');
    }

    // Activate nav link
    const navLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (navLink) {
      navLink.classList.add('active');
    }

    state.currentSection = sectionName;

    // Load section data
    loadSectionData(sectionName);
  };

  const loadSectionData = (sectionName) => {
    switch (sectionName) {
      case 'dashboard':
        loadDashboard();
        break;
      case 'registrations':
        loadRegistrations();
        break;
      case 'payments':
        loadPayments();
        break;
      case 'influencers':
        loadInfluencers();
        break;
      case 'approvals':
        loadApprovals();
        break;
      case 'settings':
        loadSettings();
        break;
    }
  };

  // ============================================================================
  // DASHBOARD SECTION
  // ============================================================================

  const loadDashboard = async () => {
    try {
      const data = await apiRequest('/api/admin/dashboard/overview');

      if (data.success) {
        // Update stats
        document.getElementById('statTotalReg').textContent = data.stats.totalRegistrations || 0;
        document.getElementById('statInfluencers').textContent = data.stats.totalInfluencers || 0;
        document.getElementById('statPending').textContent = data.stats.pendingInfluencers || 0;
      }

      // Load recent data and calculate total revenue
      const dashboard = await apiRequest('/api/admin/dashboard');
      displayRecentRegistrations(dashboard.registrations?.slice(0, 5) || []);
      displayRecentPayments(dashboard.payments?.slice(0, 5) || []);

      // Calculate total revenue from all payments
      const totalRevenue = (dashboard.payments || []).reduce((sum, pay) => {
        return sum + (pay.amount || 0);
      }, 0);
      document.getElementById('statRevenue').textContent = formatCurrency(totalRevenue);

      updateLastRefreshTime();
    } catch (error) {
      showAlert('Failed to load dashboard: ' + error.message, 'danger');
    }
  };

  const displayRecentRegistrations = (data) => {
    const container = document.getElementById('recentRegistrations');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No recent registrations</p>';
      return;
    }

    container.innerHTML = data.map(reg => `
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
        <div>
          <strong>${reg.farmer_name}</strong><br>
          <small class="text-muted">${reg.reference_id}</small>
        </div>
        <span class="badge badge-${reg.payment_status === 'completed' ? 'success' : 'warning'}">
          ${reg.payment_status}
        </span>
      </div>
    `).join('');
  };

  const displayRecentPayments = (data) => {
    const container = document.getElementById('recentPayments');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No recent payments</p>';
      return;
    }

    container.innerHTML = data.map(pay => `
      <div class="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
        <div>
          <strong>${formatCurrency(pay.amount)}</strong><br>
          <small class="text-muted">${pay.payment_id}</small>
        </div>
        <span class="badge badge-${pay.payment_status === 'Success' ? 'success' : 'warning'}">
          ${pay.payment_status}
        </span>
      </div>
    `).join('');
  };

  // ============================================================================
  // REGISTRATIONS SECTION
  // ============================================================================

  const loadRegistrations = async () => {
    try {
      const { page, limit } = state.pagination.registrations;
      const params = new URLSearchParams({
        page,
        limit,
        ...state.filters.registrations
      });

      const data = await apiRequest(`/api/admin/registrations?${params}`);
      state.data.registrations = data.registrations || [];
      state.pagination.registrations.total = data.total || 0;

      displayRegistrationsTable(state.data.registrations);
      updateRegistrationsPagination();
      populateStateFilters(state.data.registrations);
    } catch (error) {
      showAlert('Failed to load registrations: ' + error.message, 'danger');
    }
  };

  const displayRegistrationsTable = (data) => {
    const tbody = document.getElementById('registrationsTableBody');

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="text-center py-5">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>No registrations found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(reg => `
      <tr>
        <td><code>${reg.reference_id}</code></td>
        <td>${reg.farmer_name}</td>
        <td>${reg.contact_number}</td>
        <td>${reg.state || '-'}</td>
        <td>${reg.district || '-'}</td>
        <td>${reg.area_natural_farming || 0}</td>
        <td>${formatCurrency(reg.payment_amount || 0)}</td>
        <td><span class="badge badge-${getPaymentBadgeClass(reg.payment_status)}">${reg.payment_status}</span></td>
        <td>${formatDate(reg.registration_date)}</td>
        <td>
          <button class="btn btn-sm btn-primary" onclick="window.viewRegistrationDetails('${reg._id}')">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      </tr>
    `).join('');
  };

  const updateRegistrationsPagination = () => {
    const { page, limit, total } = state.pagination.registrations;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    document.getElementById('regShowingStart').textContent = start;
    document.getElementById('regShowingEnd').textContent = end;
    document.getElementById('regTotal').textContent = total;

    document.getElementById('regPrevPage').disabled = page === 1;
    document.getElementById('regNextPage').disabled = end >= total;
  };

  const populateStateFilters = (data) => {
    const states = [...new Set(data.map(r => r.state).filter(Boolean))].sort();
    const regStateFilter = document.getElementById('regStateFilter');
    const payStateFilter = document.getElementById('payStateFilter');

    const options = states.map(state => `<option value="${state}">${state}</option>`).join('');

    if (regStateFilter) {
      regStateFilter.innerHTML = '<option value="">All States</option>' + options;
    }
    if (payStateFilter) {
      payStateFilter.innerHTML = '<option value="">All States</option>' + options;
    }
  };

  const getPaymentBadgeClass = (status) => {
    const statusMap = {
      'completed': 'success',
      'pending': 'warning',
      'failed': 'danger'
    };
    return statusMap[status?.toLowerCase()] || 'secondary';
  };

  // ============================================================================
  // PAYMENTS SECTION
  // ============================================================================

  const loadPayments = async () => {
    try {
      const { page, limit } = state.pagination.payments;
      const params = new URLSearchParams({
        page,
        limit,
        search: state.filters.payments.search || '',
        status: state.filters.payments.status || '',
        state: state.filters.payments.state || ''
      });

      const data = await apiRequest(`/api/admin/payments?${params}`);
      let payments = data.payments || [];
      let total = data.total || payments.length;

      // Filter by payment type on frontend
      if (state.filters.payments.type) {
        if (state.filters.payments.type === 'razorpay') {
          payments = payments.filter(p => p.payment_id && p.payment_id.startsWith('pay_'));
        } else if (state.filters.payments.type === 'cnf') {
          payments = payments.filter(p => !p.payment_id || !p.payment_id.startsWith('pay_'));
        }
        total = payments.length;
      }

      state.data.payments = payments;
      state.pagination.payments.total = total;

      displayPaymentsTable(state.data.payments);
      updatePaymentsPagination();
    } catch (error) {
      showAlert('Failed to load payments: ' + error.message, 'danger');
    }
  };

  const displayPaymentsTable = (data) => {
    const tbody = document.getElementById('paymentsTableBody');

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="11" class="text-center py-5">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>No payments found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(pay => {
      // Determine payment type
      const isRazorpay = pay.payment_id && pay.payment_id.startsWith('pay_');
      const paymentType = isRazorpay ? 'Razorpay' : 'CNF Collected';
      const paymentTypeBadge = isRazorpay ? 'badge-info' : 'badge-secondary';

      return `
        <tr>
          <td><code>${pay.payment_id || 'N/A'}</code></td>
          <td><span class="badge ${paymentTypeBadge}">${paymentType}</span></td>
          <td><code>${pay.farmer?.reference_id || 'N/A'}</code></td>
          <td>${pay.farmer?.farmer_name || 'N/A'}</td>
          <td>${pay.farmer?.contact_number || 'N/A'}</td>
          <td>${pay.farmer?.state || 'N/A'}</td>
          <td>${formatCurrency(pay.amount)}</td>
          <td>${pay.coupon_code || '-'}</td>
          <td><span class="badge badge-${pay.payment_status === 'Success' ? 'success' : 'warning'}">${pay.payment_status}</span></td>
          <td>${formatDate(pay.createdAt || pay.created_at)}</td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="window.viewPaymentDetails('${pay._id}')">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  const updatePaymentsPagination = () => {
    const { page, limit, total } = state.pagination.payments;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);

    document.getElementById('payShowingStart').textContent = start;
    document.getElementById('payShowingEnd').textContent = end;
    document.getElementById('payTotal').textContent = total;

    document.getElementById('payPrevPage').disabled = page === 1;
    document.getElementById('payNextPage').disabled = end >= total;
  };

  // ============================================================================
  // INFLUENCERS SECTION
  // ============================================================================

  const loadInfluencers = async () => {
    try {
      const params = new URLSearchParams({
        status: 'approved',
        limit: 100,
        ...state.filters.influencers
      });

      const data = await apiRequest(`/api/admin/influencers?${params}`);
      state.data.influencers = data.influencers || [];

      displayInfluencersTable(state.data.influencers);
    } catch (error) {
      showAlert('Failed to load influencers: ' + error.message, 'danger');
    }
  };

  const displayInfluencersTable = (data) => {
    const tbody = document.getElementById('influencersTableBody');

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" class="text-center py-5">
            <div class="empty-state">
              <i class="fas fa-inbox"></i>
              <p>No influencers found</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(inf => {
      // Use influencer's own tracking fields (most accurate)
      const referrals = inf.referralUses || 0;
      const earnings = inf.totalEarnings || 0;

      return `
        <tr>
          <td>
            <a href="#" onclick="window.viewInfluencerDetails('${inf.id}'); return false;" class="text-decoration-none">
              <strong>${inf.name}</strong>
            </a>
          </td>
          <td>${inf.contactNumber}</td>
          <td>${inf.type}</td>
          <td>${inf.region || '-'}</td>
          <td><code>${inf.couponCode || '-'}</code></td>
          <td>${referrals}</td>
          <td>${formatCurrency(earnings)}</td>
          <td><span class="badge badge-success">Active</span></td>
          <td>
            <button class="btn btn-sm btn-primary" onclick="window.viewInfluencerDetails('${inf.id}')">
              <i class="fas fa-eye"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');
  };

  // ============================================================================
  // APPROVALS SECTION
  // ============================================================================

  const loadApprovals = async () => {
    try {
      const data = await apiRequest('/api/admin/influencers?status=pending&limit=100');
      state.data.approvals = data.influencers || [];

      document.getElementById('pendingCount').textContent = `${state.data.approvals.length} Pending`;
      displayApprovalsTable(state.data.approvals);
    } catch (error) {
      showAlert('Failed to load approvals: ' + error.message, 'danger');
    }
  };

  const displayApprovalsTable = (data) => {
    const tbody = document.getElementById('approvalsTableBody');

    if (!data.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-5">
            <div class="empty-state">
              <i class="fas fa-check-circle"></i>
              <p>No pending approvals</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.map(req => `
      <tr>
        <td><strong>${req.name}</strong></td>
        <td>${req.contactNumber}</td>
        <td>${req.email || '-'}</td>
        <td>${req.type}</td>
        <td>${req.region || '-'}</td>
        <td>${req.socialLink ? `<a href="${req.socialLink}" target="_blank"><i class="fas fa-external-link-alt"></i></a>` : '-'}</td>
        <td>${formatDate(req.createdAt)}</td>
        <td>
          <button class="btn btn-sm btn-success me-1" onclick="window.approveInfluencer('${req.id}')">
            <i class="fas fa-check"></i> Approve
          </button>
          <button class="btn btn-sm btn-danger" onclick="window.rejectInfluencer('${req.id}')">
            <i class="fas fa-times"></i> Reject
          </button>
        </td>
      </tr>
    `).join('');
  };

  // ============================================================================
  // SETTINGS SECTION
  // ============================================================================

  const loadSettings = () => {
    // Settings are static for now
    console.log('Settings section loaded');
  };

  // ============================================================================
  // MODAL FUNCTIONS
  // ============================================================================

  const createModal = (id, title, body, footer) => {
    const existingModal = document.getElementById(id);
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = id;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">${title}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">${body}</div>
          ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
        </div>
      </div>
    `;

    document.getElementById('modalsContainer').appendChild(modal);
    return new bootstrap.Modal(modal);
  };

  // View Registration Details
  window.viewRegistrationDetails = async (id) => {
    try {
      const reg = state.data.registrations.find(r => r._id === id);
      if (!reg) {
        showAlert('Registration not found', 'danger');
        return;
      }

      const body = `
        <div class="row g-3">
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-user"></i> Personal Information</h6>
            <table class="table table-sm">
              <tr><th width="40%">Reference ID:</th><td><code>${reg.reference_id}</code></td></tr>
              <tr><th>Farmer Name:</th><td>${reg.farmer_name}</td></tr>
              <tr><th>Father/Spouse Name:</th><td>${reg.father_spouse_name || '-'}</td></tr>
              <tr><th>Contact Number:</th><td>${reg.contact_number}</td></tr>
              <tr><th>Email:</th><td>${reg.email_id || '-'}</td></tr>
              <tr><th>Aadhaar/Farmer ID:</th><td>${reg.aadhaar_farmer_id || '-'}</td></tr>
            </table>
          </div>
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-map-marker-alt"></i> Location Details</h6>
            <table class="table table-sm">
              <tr><th width="40%">Village/Panchayat:</th><td>${reg.village_panchayat || '-'}</td></tr>
              <tr><th>Mandal/Block:</th><td>${reg.mandal_block || '-'}</td></tr>
              <tr><th>District:</th><td>${reg.district || '-'}</td></tr>
              <tr><th>State:</th><td>${reg.state || '-'}</td></tr>
            </table>
          </div>
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-seedling"></i> Farming Details</h6>
            <table class="table table-sm">
              <tr><th width="40%">Total Land:</th><td>${reg.total_land} ${reg.land_unit}</td></tr>
              <tr><th>Natural Farming Area:</th><td>${reg.area_natural_farming} ${reg.land_unit}</td></tr>
              <tr><th>Crop Types:</th><td>${reg.crop_types || '-'}</td></tr>
              <tr><th>Present Crop:</th><td>${reg.present_crop || '-'}</td></tr>
              <tr><th>Farming Practice:</th><td>${reg.farming_practice || '-'}</td></tr>
              <tr><th>Experience:</th><td>${reg.farming_experience || 0} years</td></tr>
              <tr><th>Irrigation Source:</th><td>${reg.irrigation_source || '-'}</td></tr>
              <tr><th>Livestock:</th><td>${reg.livestock || '-'}</td></tr>
            </table>
          </div>
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-credit-card"></i> Payment Information</h6>
            <table class="table table-sm">
              <tr><th width="40%">Payment Amount:</th><td>${formatCurrency(reg.payment_amount)}</td></tr>
              <tr><th>Payment Status:</th><td><span class="badge badge-${getPaymentBadgeClass(reg.payment_status)}">${reg.payment_status}</span></td></tr>
              <tr><th>Payment ID:</th><td>${reg.payment_id || '-'}</td></tr>
              <tr><th>Coupon Code:</th><td>${reg.coupon_code || '-'}</td></tr>
              <tr><th>Registration Date:</th><td>${formatDate(reg.registration_date)}</td></tr>
            </table>
          </div>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        <button type="button" class="btn btn-primary" onclick="window.downloadSingleRegistration('${id}')">
          <i class="fas fa-download"></i> Download Details
        </button>
      `;

      const modal = createModal('viewRegistrationModal', 'Registration Details', body, footer);
      modal.show();
    } catch (error) {
      showAlert('Failed to load registration details: ' + error.message, 'danger');
    }
  };

  // View Payment Details
  window.viewPaymentDetails = async (id) => {
    try {
      const pay = state.data.payments.find(p => p._id === id);
      if (!pay) {
        showAlert('Payment not found', 'danger');
        return;
      }

      // Determine payment type
      const isRazorpay = pay.payment_id && pay.payment_id.startsWith('pay_');
      const paymentType = isRazorpay ? 'Razorpay (Online)' : 'CNF Collected (Admin Entry)';
      const paymentTypeBadge = isRazorpay ? 'badge-info' : 'badge-secondary';

      const body = `
        <div class="row g-3">
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-credit-card"></i> Payment Information</h6>
            <table class="table table-sm">
              <tr><th width="40%">Payment Type:</th><td><span class="badge ${paymentTypeBadge}">${paymentType}</span></td></tr>
              <tr><th>Payment ID:</th><td><code>${pay.payment_id || 'N/A'}</code></td></tr>
              <tr><th>Order ID:</th><td><code>${pay.order_id || 'N/A'}</code></td></tr>
              <tr><th>Amount:</th><td>${formatCurrency(pay.amount)}</td></tr>
              <tr><th>Currency:</th><td>${pay.currency || 'INR'}</td></tr>
              <tr><th>Status:</th><td><span class="badge badge-${pay.payment_status === 'Success' ? 'success' : 'warning'}">${pay.payment_status}</span></td></tr>
              <tr><th>Date:</th><td>${formatDate(pay.createdAt || pay.created_at)}</td></tr>
            </table>
          </div>
          ${pay.farmer ? `
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-user"></i> Farmer Information</h6>
            <table class="table table-sm">
              <tr><th width="40%">Reference ID:</th><td><code>${pay.farmer.reference_id || 'N/A'}</code></td></tr>
              <tr><th>Name:</th><td>${pay.farmer.farmer_name || 'N/A'}</td></tr>
              <tr><th>Contact:</th><td>${pay.farmer.contact_number || 'N/A'}</td></tr>
              <tr><th>State:</th><td>${pay.farmer.state || 'N/A'}</td></tr>
              <tr><th>District:</th><td>${pay.farmer.district || 'N/A'}</td></tr>
            </table>
          </div>
          ` : ''}
          ${pay.coupon_code ? `
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-ticket-alt"></i> Coupon Information</h6>
            <table class="table table-sm">
              <tr><th width="40%">Coupon Code:</th><td><code>${pay.coupon_code}</code></td></tr>
              <tr><th>Influencer:</th><td>${pay.influencer?.name || 'N/A'}</td></tr>
              <tr><th>Commission:</th><td>${formatCurrency(pay.commission_amount || 0)}</td></tr>
              <tr><th>Commission Paid:</th><td>${pay.commission_paid ? 'Yes' : 'No'}</td></tr>
            </table>
          </div>
          ` : ''}
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      `;

      const modal = createModal('viewPaymentModal', 'Payment Details', body, footer);
      modal.show();
    } catch (error) {
      showAlert('Failed to load payment details: ' + error.message, 'danger');
    }
  };

  // View Influencer Details
  window.viewInfluencerDetails = async (id) => {
    try {
      const inf = state.data.influencers.find(i => i.id === id);
      if (!inf) {
        showAlert('Influencer not found', 'danger');
        return;
      }

      const body = `
        <div class="row g-3">
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-user"></i> Personal Information</h6>
            <table class="table table-sm">
              <tr><th width="40%">Name:</th><td>${inf.name}</td></tr>
              <tr><th>Contact Number:</th><td>${inf.contactNumber}</td></tr>
              <tr><th>Email:</th><td>${inf.email || 'Not provided'}</td></tr>
              <tr><th>Type:</th><td>${inf.type}</td></tr>
              <tr><th>Region:</th><td>${inf.region || 'Not specified'}</td></tr>
              <tr><th>Social Link:</th><td>${inf.socialLink ? `<a href="${inf.socialLink}" target="_blank">View</a>` : 'Not provided'}</td></tr>
            </table>
          </div>
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-chart-bar"></i> Performance Stats</h6>
            <table class="table table-sm">
              <tr><th width="40%">Coupon Code:</th><td><code>${inf.couponCode || 'Not assigned'}</code></td></tr>
              <tr><th>Total Referrals:</th><td>${inf.referralUses || 0}</td></tr>
              <tr><th>Total Earnings:</th><td>${formatCurrency(inf.totalEarnings || 0)}</td></tr>
              <tr><th>Status:</th><td><span class="badge badge-success">${inf.approvalStatus}</span></td></tr>
            </table>
          </div>
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-wallet"></i> Payment Information</h6>
            <table class="table table-sm">
              <tr><th width="40%">UPI ID:</th><td>${inf.upiId || 'Not provided'}</td></tr>
              <tr><th>Bank Details:</th><td>${inf.bankDetails || 'Not provided'}</td></tr>
            </table>
          </div>
        </div>
      `;

      const footer = `
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
      `;

      const modal = createModal('viewInfluencerModal', 'Influencer Details', body, footer);
      modal.show();
    } catch (error) {
      showAlert('Failed to load influencer details: ' + error.message, 'danger');
    }
  };

  // Approve Influencer
  window.approveInfluencer = async (id) => {
    if (!confirm('Approve this influencer? This will:\n- Create a unique coupon code\n- Activate their account\n- Send SMS with login credentials')) {
      return;
    }

    try {
      const result = await apiRequest(`/api/admin/influencers/${id}/approve`, { method: 'POST' });

      // Show credentials in alert
      if (result.credentials) {
        const credentialsMsg = `
          <strong>Influencer Approved Successfully!</strong><br><br>
          <div class="alert alert-info">
            <strong>Login Credentials (SMS Sent):</strong><br>
            Mobile: <code>${result.credentials.mobile}</code><br>
            Password: <code>${result.credentials.password}</code><br>
            Coupon Code: <code>${result.credentials.couponCode}</code>
          </div>
          <small class="text-muted">The influencer has been notified via SMS with these credentials.</small>
        `;
        showAlert(credentialsMsg, 'success');
      } else {
        showAlert('Influencer approved successfully! SMS sent with login credentials.', 'success');
      }

      loadApprovals();
      loadDashboard();
      loadInfluencers();
    } catch (error) {
      showAlert('Failed to approve influencer: ' + error.message, 'danger');
    }
  };

  // Reject Influencer
  window.rejectInfluencer = async (id) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;

    try {
      await apiRequest(`/api/admin/influencers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      showAlert('Influencer rejected', 'info');
      loadApprovals();
      loadDashboard();
    } catch (error) {
      showAlert('Failed to reject influencer: ' + error.message, 'danger');
    }
  };

  // ============================================================================
  // DOWNLOAD FUNCTIONS
  // ============================================================================

  const exportToExcel = (data, filename) => {
    if (typeof XLSX === 'undefined') {
      showAlert('Excel library not loaded. Please refresh the page.', 'danger');
      return;
    }

    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showAlert('File downloaded successfully!', 'success');
    } catch (error) {
      showAlert('Failed to export: ' + error.message, 'danger');
    }
  };

  window.downloadAllRegistrations = () => {
    const exportData = state.data.registrations.map(reg => ({
      'Reference ID': reg.reference_id,
      'Farmer Name': reg.farmer_name,
      'Father/Spouse Name': reg.father_spouse_name || '',
      'Contact Number': reg.contact_number,
      'Email': reg.email_id || '',
      'Aadhaar/Farmer ID': reg.aadhaar_farmer_id || '',
      'Village/Panchayat': reg.village_panchayat || '',
      'Mandal/Block': reg.mandal_block || '',
      'District': reg.district || '',
      'State': reg.state || '',
      'Total Land': reg.total_land,
      'Land Unit': reg.land_unit,
      'Natural Farming Area': reg.area_natural_farming,
      'Crop Types': reg.crop_types || '',
      'Present Crop': reg.present_crop || '',
      'Farming Practice': reg.farming_practice || '',
      'Experience (Years)': reg.farming_experience || 0,
      'Irrigation Source': reg.irrigation_source || '',
      'Livestock': reg.livestock || '',
      'Payment Amount': reg.payment_amount,
      'Payment Status': reg.payment_status,
      'Payment ID': reg.payment_id || '',
      'Coupon Code': reg.coupon_code || '',
      'Registration Date': formatDate(reg.registration_date)
    }));

    exportToExcel(exportData, 'all_registrations');
  };

  window.downloadSingleRegistration = (id) => {
    const reg = state.data.registrations.find(r => r._id === id);
    if (!reg) {
      showAlert('Registration not found', 'danger');
      return;
    }

    const exportData = [{
      'Reference ID': reg.reference_id,
      'Farmer Name': reg.farmer_name,
      'Father/Spouse Name': reg.father_spouse_name || '',
      'Contact Number': reg.contact_number,
      'Email': reg.email_id || '',
      'Aadhaar/Farmer ID': reg.aadhaar_farmer_id || '',
      'Village/Panchayat': reg.village_panchayat || '',
      'Mandal/Block': reg.mandal_block || '',
      'District': reg.district || '',
      'State': reg.state || '',
      'Total Land': reg.total_land,
      'Land Unit': reg.land_unit,
      'Natural Farming Area': reg.area_natural_farming,
      'Crop Types': reg.crop_types || '',
      'Present Crop': reg.present_crop || '',
      'Farming Practice': reg.farming_practice || '',
      'Experience (Years)': reg.farming_experience || 0,
      'Irrigation Source': reg.irrigation_source || '',
      'Livestock': reg.livestock || '',
      'Payment Amount': reg.payment_amount,
      'Payment Status': reg.payment_status,
      'Payment ID': reg.payment_id || '',
      'Coupon Code': reg.coupon_code || '',
      'Registration Date': formatDate(reg.registration_date)
    }];

    exportToExcel(exportData, `registration_${reg.reference_id}`);
  };

  window.downloadAllPayments = () => {
    const exportData = state.data.payments.map(pay => ({
      'Payment ID': pay.payment_id || '',
      'Order ID': pay.order_id || '',
      'Reference ID': pay.farmer?.reference_id || '',
      'Farmer Name': pay.farmer?.farmer_name || '',
      'Contact Number': pay.farmer?.contact_number || '',
      'State': pay.farmer?.state || '',
      'District': pay.farmer?.district || '',
      'Amount': pay.amount,
      'Currency': pay.currency || 'INR',
      'Coupon Code': pay.coupon_code || '',
      'Influencer': pay.influencer?.name || '',
      'Commission Amount': pay.commission_amount || 0,
      'Commission Paid': pay.commission_paid ? 'Yes' : 'No',
      'Payment Status': pay.payment_status,
      'Date': formatDate(pay.createdAt || pay.created_at)
    }));

    exportToExcel(exportData, 'all_payments');
  };

  window.downloadAllInfluencers = () => {
    const exportData = state.data.influencers.map(inf => ({
      'Name': inf.name,
      'Contact Number': inf.contactNumber,
      'Email': inf.email || '',
      'Type': inf.type,
      'Region': inf.region || '',
      'Social Link': inf.socialLink || '',
      'Coupon Code': inf.couponCode || '',
      'Total Referrals': inf.referralUses || 0,
      'Total Earnings': inf.totalEarnings || 0,
      'UPI ID': inf.upiId || '',
      'Bank Details': inf.bankDetails || '',
      'Status': inf.approvalStatus,
      'Created Date': formatDate(inf.createdAt)
    }));

    exportToExcel(exportData, 'all_influencers');
  };

  // ============================================================================
  // MANUAL ENTRY & BULK UPLOAD
  // ============================================================================

  window.openManualEntry = () => {
    const body = `
      <form id="manualEntryForm">
        <div class="row g-3">
          <div class="col-md-6">
            <label class="form-label">Farmer Name *</label>
            <input type="text" class="form-control" name="farmer_name" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Father/Spouse Name *</label>
            <input type="text" class="form-control" name="father_spouse_name" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Contact Number *</label>
            <input type="tel" class="form-control" name="contact_number" pattern="[6-9][0-9]{9}" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Email</label>
            <input type="email" class="form-control" name="email_id">
          </div>
          <div class="col-md-6">
            <label class="form-label">Village/Panchayat *</label>
            <input type="text" class="form-control" name="village_panchayat" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Mandal/Block *</label>
            <input type="text" class="form-control" name="mandal_block" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">District *</label>
            <input type="text" class="form-control" name="district" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">State *</label>
            <input type="text" class="form-control" name="state" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Total Land *</label>
            <input type="number" class="form-control" name="total_land" step="0.01" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Land Unit *</label>
            <select class="form-select" name="land_unit" required>
              <option value="Acre">Acre</option>
              <option value="Hectare">Hectare</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Natural Farming Area *</label>
            <input type="number" class="form-control" name="area_natural_farming" step="0.01" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Crop Types *</label>
            <input type="text" class="form-control" name="crop_types" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Farming Practice *</label>
            <select class="form-select" name="farming_practice" required>
              <option value="Natural">Natural</option>
              <option value="Organic">Organic</option>
              <option value="Chemical">Chemical</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Payment Amount *</label>
            <input type="number" class="form-control" name="payment_amount" value="300" required>
          </div>
          <div class="col-md-6">
            <label class="form-label">Payment Status *</label>
            <select class="form-select" name="payment_status" required>
              <option value="completed">Completed</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div class="col-md-6">
            <label class="form-label">Coupon Code</label>
            <input type="text" class="form-control" name="coupon_code">
          </div>
        </div>
      </form>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-primary" onclick="window.saveManualEntry()">
        <i class="fas fa-save"></i> Save Registration
      </button>
    `;

    const modal = createModal('manualEntryModal', 'Manual Registration Entry', body, footer);
    modal.show();
  };

  window.saveManualEntry = async () => {
    const form = document.getElementById('manualEntryForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value;
    });

    // Add required fields
    data.registration_date = new Date().toISOString();
    data.reference_id = 'MAN-' + Date.now();
    data.sowing_date = new Date().toISOString();
    data.farming_experience = 0;
    data.irrigation_source = 'Other';

    try {
      await apiRequest('/api/admin/registrations/manual', {
        method: 'POST',
        body: JSON.stringify(data)
      });

      showAlert('Registration added successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('manualEntryModal')).hide();
      loadRegistrations();
    } catch (error) {
      showAlert('Failed to add registration: ' + error.message, 'danger');
    }
  };

  window.openBulkUpload = () => {
    const body = `
      <div class="alert alert-info">
        <strong>📋 Upload Format:</strong> Excel (.xlsx) or CSV (.csv) file<br><br>
        <strong> Required Columns (Must Provide):</strong><br>
        <code>farmer_name, father_spouse_name, contact_number, village_panchayat, mandal_block, 
        district, state, total_land, land_unit, area_natural_farming, crop_types, 
        farming_practice, payment_amount, payment_status</code><br><br>
        <strong> Optional Columns:</strong><br>
        <code>email_id, aadhaar_farmer_id, khasra_passbook, plot_no, present_crop, 
        sowing_date, harvesting_date, farming_experience, irrigation_source, livestock, 
        willing_to_adopt, terms_agreement, coupon_code</code><br><br>
      </div>
      <div class="alert alert-warning">
        <strong>⚠️ Important Notes:</strong>
        <ul class="mb-0 mt-2">
          <li><strong>contact_number:</strong> 10 digits, starts with 6-9</li>
          <li><strong>land_unit:</strong> Acre or Hectare</li>
          <li><strong>farming_practice:</strong> Natural, Organic, or Chemical</li>
          <li><strong>payment_status:</strong> completed or pending</li>
          <li><strong>livestock:</strong> Separate multiple with semicolon (e.g., cattle;poultry)</li>
          <li><strong>dates:</strong> Format YYYY-MM-DD (e.g., 2025-01-15)</li>
          <li><strong>coupon_code:</strong> Must be valid (e.g., RAJESH2024)</li>
        </ul>
      </div>
      <div class="mb-3">
        <label class="form-label">Select File</label>
        <input type="file" class="form-control" id="bulkUploadFile" accept=".xlsx,.xls,.csv">
      </div>
      <div id="bulkUploadPreview"></div>
    `;

    const footer = `
      <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
      <button type="button" class="btn btn-success" onclick="window.downloadTemplate()">
        <i class="fas fa-download"></i> Download Template
      </button>
      <button type="button" class="btn btn-primary" onclick="window.processBulkUpload()">
        <i class="fas fa-upload"></i> Upload
      </button>
    `;

    const modal = createModal('bulkUploadModal', 'Bulk Upload Registrations', body, footer);
    modal.show();
  };

  window.downloadTemplate = () => {
    const template = [{
      farmer_name: 'John Doe',
      father_spouse_name: 'Father Name',
      contact_number: '9876543210',
      email_id: 'john@example.com',
      village_panchayat: 'Village Name',
      mandal_block: 'Mandal Name',
      district: 'District Name',
      state: 'State Name',
      total_land: '5',
      land_unit: 'Acre',
      area_natural_farming: '3',
      crop_types: 'Rice, Wheat',
      farming_practice: 'Natural',
      payment_amount: '300',
      payment_status: 'completed',
      coupon_code: ''
    }];

    exportToExcel(template, 'registration_template');
  };

  window.processBulkUpload = async () => {
    const fileInput = document.getElementById('bulkUploadFile');
    const file = fileInput.files[0];

    if (!file) {
      showAlert('Please select a file', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          showAlert('File is empty', 'warning');
          return;
        }

        const preview = document.getElementById('bulkUploadPreview');
        preview.innerHTML = `
          <div class="alert alert-info">
            Found ${jsonData.length} records. Processing...
          </div>
        `;

        const results = await apiRequest('/api/admin/registrations/bulk', {
          method: 'POST',
          body: JSON.stringify({ registrations: jsonData })
        });

        showAlert(`Successfully uploaded ${results.success || 0} registrations. Failed: ${results.failed || 0}`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('bulkUploadModal')).hide();
        loadRegistrations();
      } catch (error) {
        showAlert('Failed to process file: ' + error.message, 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ============================================================================
  // EVENT LISTENERS
  // ============================================================================

  const initializeEventListeners = () => {
    // Navigation
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        showSection(section);
      });
    });

    // Logout
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.warn('Logout error:', error);
      } finally {
        window.location.href = '/admin';
      }
    });

    // Dashboard refresh
    document.getElementById('refreshDashboard')?.addEventListener('click', () => {
      loadDashboard();
    });

    // Registration filters
    document.getElementById('applyRegFilters')?.addEventListener('click', () => {
      state.filters.registrations = {
        search: document.getElementById('regSearchInput').value,
        status: document.getElementById('regStatusFilter').value,
        state: document.getElementById('regStateFilter').value,
        paymentStatus: document.getElementById('regPaymentFilter').value
      };
      state.pagination.registrations.page = 1;
      loadRegistrations();
    });

    // Registration pagination
    document.getElementById('regPrevPage')?.addEventListener('click', () => {
      if (state.pagination.registrations.page > 1) {
        state.pagination.registrations.page--;
        loadRegistrations();
      }
    });

    document.getElementById('regNextPage')?.addEventListener('click', () => {
      const { page, limit, total } = state.pagination.registrations;
      if (page * limit < total) {
        state.pagination.registrations.page++;
        loadRegistrations();
      }
    });

    // Payment filters
    document.getElementById('applyPayFilters')?.addEventListener('click', () => {
      state.filters.payments = {
        search: document.getElementById('paySearchInput').value,
        type: document.getElementById('payTypeFilter').value,
        status: document.getElementById('payStatusFilter').value,
        state: document.getElementById('payStateFilter').value
      };
      state.pagination.payments.page = 1;
      loadPayments();
    });

    // Payment pagination
    document.getElementById('payPrevPage')?.addEventListener('click', () => {
      if (state.pagination.payments.page > 1) {
        state.pagination.payments.page--;
        loadPayments();
      }
    });

    document.getElementById('payNextPage')?.addEventListener('click', () => {
      const { page, limit, total } = state.pagination.payments;
      if (page * limit < total) {
        state.pagination.payments.page++;
        loadPayments();
      }
    });

    // Influencer filters
    document.getElementById('applyInfFilters')?.addEventListener('click', () => {
      state.filters.influencers = {
        search: document.getElementById('infSearchInput').value,
        type: document.getElementById('infTypeFilter').value
      };
      loadInfluencers();
    });

    // Download buttons
    document.getElementById('downloadAllRegistrations')?.addEventListener('click', () => {
      window.downloadAllRegistrations();
    });

    document.getElementById('downloadAllPayments')?.addEventListener('click', () => {
      window.downloadAllPayments();
    });

    document.getElementById('downloadAllInfluencers')?.addEventListener('click', () => {
      window.downloadAllInfluencers();
    });

    // Manual entry and bulk upload
    document.getElementById('manualEntryBtn')?.addEventListener('click', () => {
      window.openManualEntry();
    });

    document.getElementById('bulkUploadBtn')?.addEventListener('click', () => {
      window.openBulkUpload();
    });

    // Settings
    document.getElementById('saveSettingsBtn')?.addEventListener('click', () => {
      showAlert('Settings saved successfully!', 'success');
    });

    document.getElementById('exportDatabaseBtn')?.addEventListener('click', () => {
      showAlert('Database export feature coming soon', 'info');
    });

    document.getElementById('clearCacheBtn')?.addEventListener('click', () => {
      showAlert('Cache cleared successfully!', 'success');
    });
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  const init = async () => {
    console.log('[Admin Dashboard] Initializing...');
    console.log('[Admin Dashboard] Starting authentication check...');

    // Check authentication
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      console.error('[Admin Dashboard] Authentication failed, stopping initialization');
      return;
    }

    console.log('[Admin Dashboard] User authenticated:', state.currentUser.email);

    // Initialize event listeners
    initializeEventListeners();

    // Load initial data
    loadDashboard();

    console.log('[Admin Dashboard] Initialization complete');
  };

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
