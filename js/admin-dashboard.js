// Comprehensive Admin Dashboard
console.log('[Admin Dashboard] Script loaded');

(() => {
  console.log('[Admin Dashboard] Initializing...');
  
  let currentUser = null;
  let currentData = {
    registrations: [],
    payments: [],
    influencers: [],
    coupons: [],
    requests: []
  };

  // Utility Functions
  const showAlert = (message, type = 'info') => {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);
    setTimeout(() => alert.remove(), 5000);
  };

  const apiRequest = async (url, options = {}) => {
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }
      return data;
    } catch (error) {
      throw error;
    }
  };

  // Authentication
  const ensureAdminSession = async () => {
    try {
      const data = await apiRequest('/api/auth/me');
      if (!data.user || data.user.role !== 'admin') {
        throw new Error('Not authorized');
      }
      currentUser = data.user;
      document.getElementById('adminInfo').textContent = `Logged in as: ${currentUser.email}`;
      return currentUser;
    } catch (error) {
      window.location.href = '/admin/login';
      throw error;
    }
  };


  // Navigation
  const showSection = (sectionName) => {
    document.querySelectorAll('.content-section').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.sidebar .nav-link').forEach(el => el.classList.remove('active'));

    const section = document.getElementById(`${sectionName}Section`);
    if (section) section.style.display = 'block';

    const navLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (navLink) navLink.classList.add('active');

    const titles = {
      overview: 'Dashboard Overview',
      registrations: 'Farmer Registrations',
      payments: 'Payment Records',
      influencers: 'Influencer Management',
      'influencer-requests': 'Influencer Approval Requests',
      coupons: 'Coupon Management'
    };
    document.getElementById('sectionTitle').textContent = titles[sectionName] || 'Dashboard';
  };

  // Load Overview Stats
  const loadOverview = async () => {
    try {
      const data = await apiRequest('/api/admin/dashboard/overview');
      if (data.success) {
        document.getElementById('statTotalReg').textContent = data.stats.totalRegistrations || 0;
        document.getElementById('statRevenue').textContent = `₹${data.stats.totalRevenue || 0}`;
        document.getElementById('statInfluencers').textContent = data.stats.totalInfluencers || 0;
        document.getElementById('statPending').textContent = data.stats.pendingInfluencers || 0;
      }

      // Load recent data
      const dashboard = await apiRequest('/api/admin/dashboard');
      displayRecentRegistrations(dashboard.registrations?.slice(0, 5) || []);
      displayRecentPayments(dashboard.payments?.slice(0, 5) || []);
    } catch (error) {
      showAlert('Failed to load overview: ' + error.message, 'danger');
    }
  };

  const displayRecentRegistrations = (data) => {
    const container = document.getElementById('recentRegistrations');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted">No recent registrations</p>';
      return;
    }
    container.innerHTML = data.map(reg => `
      <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
        <div>
          <strong>${reg.farmer_name}</strong><br>
          <small class="text-muted">${reg.reference_id}</small>
        </div>
        <span class="status-badge status-${reg.payment_status}">${reg.payment_status}</span>
      </div>
    `).join('');
  };

  const displayRecentPayments = (data) => {
    const container = document.getElementById('recentPayments');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted">No recent payments</p>';
      return;
    }
    container.innerHTML = data.map(pay => `
      <div class="d-flex justify-content-between align-items-center mb-2 pb-2 border-bottom">
        <div>
          <strong>₹${pay.amount}</strong><br>
          <small class="text-muted">${pay.payment_id}</small>
        </div>
        <span class="status-badge status-${pay.payment_status?.toLowerCase()}">${pay.payment_status}</span>
      </div>
    `).join('');
  };


  // Load Registrations
  const loadRegistrations = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.paymentStatus) params.append('paymentStatus', filters.paymentStatus);

      const data = await apiRequest(`/api/admin/registrations?${params}`);
      currentData.registrations = data.registrations || [];
      displayRegistrationsTable(currentData.registrations);
    } catch (error) {
      showAlert('Failed to load registrations: ' + error.message, 'danger');
    }
  };

  const displayRegistrationsTable = (data) => {
    const container = document.getElementById('registrationsTable');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No registrations found</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Reference ID</th>
              <th>Farmer Name</th>
              <th>Contact</th>
              <th>District</th>
              <th>Amount</th>
              <th>Payment Status</th>
              <th>Coupon</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(reg => `
              <tr>
                <td><code>${reg.reference_id}</code></td>
                <td>${reg.farmer_name}</td>
                <td>${reg.contact_number}</td>
                <td>${reg.district}</td>
                <td>₹${reg.payment_amount || 0}</td>
                <td><span class="status-badge status-${reg.payment_status}">${reg.payment_status}</span></td>
                <td>${reg.coupon_code || '-'}</td>
                <td>${new Date(reg.registration_date).toLocaleDateString()}</td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-info view-registration-btn" data-id="${reg._id}">
                    <i class="fas fa-eye"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attach event listeners using event delegation
    container.querySelectorAll('.view-registration-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewRegistration(id);
      });
    });
  };


  // Load Payments
  const loadPayments = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);

      const data = await apiRequest(`/api/admin/payments?${params}`);
      currentData.payments = data.payments || [];
      displayPaymentsTable(currentData.payments);
    } catch (error) {
      showAlert('Failed to load payments: ' + error.message, 'danger');
    }
  };

  const displayPaymentsTable = (data) => {
    const container = document.getElementById('paymentsTable');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No payments found</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Payment ID</th>
              <th>Amount</th>
              <th>Coupon</th>
              <th>Influencer</th>
              <th>Commission</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(pay => `
              <tr>
                <td><code>${pay.payment_id}</code></td>
                <td>₹${pay.amount}</td>
                <td>${pay.coupon_code || '-'}</td>
                <td>${pay.influencer?.name || '-'}</td>
                <td>₹${pay.commission_amount || 0}</td>
                <td><span class="status-badge status-${pay.payment_status?.toLowerCase()}">${pay.payment_status}</span></td>
                <td>${new Date(pay.createdAt || pay.created_at).toLocaleDateString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };


  // Load Influencers
  const loadInfluencers = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      params.append('limit', '100');

      const data = await apiRequest(`/api/admin/influencers?${params}`);
      currentData.influencers = data.influencers || [];
      displayInfluencersTable(currentData.influencers);
    } catch (error) {
      showAlert('Failed to load influencers: ' + error.message, 'danger');
    }
  };

  const displayInfluencersTable = (data) => {
    const container = document.getElementById('influencersTable');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No influencers found</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Region</th>
              <th>Coupon Code</th>
              <th>Status</th>
              <th>Earnings</th>
              <th>Uses</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(inf => `
              <tr>
                <td>${inf.name}</td>
                <td>${inf.contactNumber}</td>
                <td>${inf.type}</td>
                <td>${inf.region || '-'}</td>
                <td><code>${inf.couponCode || '-'}</code></td>
                <td><span class="status-badge status-${inf.approvalStatus}">${inf.approvalStatus}</span></td>
                <td>₹${inf.totalEarnings || 0}</td>
                <td>${inf.referralUses || 0}</td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-info view-influencer-btn" data-id="${inf.id}">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-primary edit-influencer-btn" data-id="${inf.id}">
                    <i class="fas fa-edit"></i>
                  </button>
                  ${inf.approvalStatus === 'approved' ? `
                    <button class="btn btn-sm btn-warning disable-influencer-btn" data-id="${inf.id}">
                      <i class="fas fa-ban"></i>
                    </button>
                  ` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attach event listeners using event delegation
    container.querySelectorAll('.view-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewInfluencer(id);
      });
    });

    container.querySelectorAll('.edit-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        editInfluencer(id);
      });
    });

    container.querySelectorAll('.disable-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        disableInfluencer(id);
      });
    });
  };


  // Load Influencer Requests
  const loadInfluencerRequests = async () => {
    try {
      const data = await apiRequest('/api/admin/influencers?status=pending&limit=100');
      currentData.requests = data.influencers || [];
      displayInfluencerRequestsTable(currentData.requests);
    } catch (error) {
      showAlert('Failed to load requests: ' + error.message, 'danger');
    }
  };

  const displayInfluencerRequestsTable = (data) => {
    const container = document.getElementById('influencerRequestsTable');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No pending requests</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Email</th>
              <th>Type</th>
              <th>Region</th>
              <th>Social Link</th>
              <th>Applied Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(req => `
              <tr>
                <td>${req.name}</td>
                <td>${req.contactNumber}</td>
                <td>${req.email || '-'}</td>
                <td>${req.type}</td>
                <td>${req.region || '-'}</td>
                <td>${req.socialLink ? `<a href="${req.socialLink}" target="_blank"><i class="fas fa-external-link-alt"></i></a>` : '-'}</td>
                <td>${new Date(req.createdAt).toLocaleDateString()}</td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-success approve-influencer-btn" data-id="${req.id}">
                    <i class="fas fa-check"></i> Approve
                  </button>
                  <button class="btn btn-sm btn-danger reject-influencer-btn" data-id="${req.id}">
                    <i class="fas fa-times"></i> Reject
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attach event listeners using event delegation
    container.querySelectorAll('.approve-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        approveInfluencer(id);
      });
    });

    container.querySelectorAll('.reject-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        rejectInfluencer(id);
      });
    });
  };

  // Approve Influencer
  const approveInfluencer = async (id) => {
    if (!confirm('Approve this influencer? This will create a coupon code and enable their account.')) return;

    try {
      await apiRequest(`/api/admin/influencers/${id}/approve`, { method: 'POST' });
      showAlert('Influencer approved successfully!', 'success');
      loadInfluencerRequests();
      loadOverview();
    } catch (error) {
      showAlert('Failed to approve: ' + error.message, 'danger');
    }
  };

  // Reject Influencer
  const rejectInfluencer = async (id) => {
    const reason = prompt('Enter rejection reason (optional):');
    if (reason === null) return;

    try {
      await apiRequest(`/api/admin/influencers/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      showAlert('Influencer rejected', 'info');
      loadInfluencerRequests();
      loadOverview();
    } catch (error) {
      showAlert('Failed to reject: ' + error.message, 'danger');
    }
  };


  // Load Coupons
  const loadCoupons = async (filters = {}) => {
    try {
      const data = await apiRequest('/api/admin/coupons');
      let coupons = data.coupons || [];

      if (filters.search) {
        coupons = coupons.filter(c => c.code.toLowerCase().includes(filters.search.toLowerCase()));
      }
      if (filters.active !== undefined) {
        coupons = coupons.filter(c => c.active === (filters.active === 'true'));
      }

      currentData.coupons = coupons;
      displayCouponsTable(coupons);
    } catch (error) {
      showAlert('Failed to load coupons: ' + error.message, 'danger');
    }
  };

  const displayCouponsTable = (data) => {
    const container = document.getElementById('couponsTable');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No coupons found</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Code</th>
              <th>Influencer</th>
              <th>Discount</th>
              <th>Commission</th>
              <th>Usage</th>
              <th>Revenue</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(coupon => `
              <tr>
                <td><code>${coupon.code}</code></td>
                <td>${coupon.influencer?.name || '-'}</td>
                <td>${coupon.discountType === 'percent' ? coupon.discountValue + '%' : '₹' + coupon.discountValue}</td>
                <td>₹${coupon.commissionAmount || 0}</td>
                <td>${coupon.usageCount}${coupon.usageLimit ? '/' + coupon.usageLimit : ''}</td>
                <td>₹${coupon.totalRevenue || 0}</td>
                <td><span class="status-badge ${coupon.active ? 'status-approved' : 'status-rejected'}">${coupon.active ? 'Active' : 'Inactive'}</span></td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-primary edit-coupon-btn" data-id="${coupon._id}">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-${coupon.active ? 'warning' : 'success'} toggle-coupon-btn" data-id="${coupon._id}" data-active="${!coupon.active}">
                    <i class="fas fa-${coupon.active ? 'ban' : 'check'}"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attach event listeners using event delegation
    container.querySelectorAll('.edit-coupon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        editCoupon(id);
      });
    });

    container.querySelectorAll('.toggle-coupon-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const activate = btn.getAttribute('data-active') === 'true';
        toggleCoupon(id, activate);
      });
    });
  };

  const toggleCoupon = async (id, activate) => {
    try {
      await apiRequest(`/api/admin/coupons/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ active: activate })
      });
      showAlert(`Coupon ${activate ? 'activated' : 'deactivated'} successfully`, 'success');
      loadCoupons();
    } catch (error) {
      showAlert('Failed to update coupon: ' + error.message, 'danger');
    }
  };


  // Excel Export Functions
  const exportToExcel = (data, filename) => {
    if (typeof XLSX === 'undefined') {
      showAlert('Excel library not loaded. Please refresh the page.', 'error');
      console.error('XLSX library is not defined');
      return;
    }
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      showAlert('Failed to export: ' + error.message, 'error');
      console.error('Export error:', error);
    }
  };

  const exportRegistrations = () => {
    const exportData = currentData.registrations.map(reg => ({
      'Reference ID': reg.reference_id,
      'Farmer Name': reg.farmer_name,
      'Father/Spouse Name': reg.father_spouse_name,
      'Contact Number': reg.contact_number,
      'Email': reg.email_id || '',
      'Village': reg.village_panchayat,
      'Mandal': reg.mandal_block,
      'District': reg.district,
      'State': reg.state,
      'Total Land': reg.total_land,
      'Land Unit': reg.land_unit,
      'Natural Farming Area': reg.area_natural_farming,
      'Crop Types': reg.crop_types,
      'Farming Practice': reg.farming_practice,
      'Payment Amount': reg.payment_amount,
      'Payment Status': reg.payment_status,
      'Coupon Code': reg.coupon_code || '',
      'Registration Date': new Date(reg.registration_date).toLocaleDateString()
    }));
    exportToExcel(exportData, 'registrations');
    showAlert('Registrations exported successfully!', 'success');
  };

  const exportPayments = () => {
    const exportData = currentData.payments.map(pay => ({
      'Payment ID': pay.payment_id,
      'Order ID': pay.order_id || '',
      'Amount': pay.amount,
      'Currency': pay.currency,
      'Coupon Code': pay.coupon_code || '',
      'Influencer': pay.influencer?.name || '',
      'Commission Amount': pay.commission_amount || 0,
      'Payment Status': pay.payment_status,
      'Date': new Date(pay.createdAt || pay.created_at).toLocaleString()
    }));
    exportToExcel(exportData, 'payments');
    showAlert('Payments exported successfully!', 'success');
  };

  const exportInfluencers = () => {
    const exportData = currentData.influencers.map(inf => ({
      'Name': inf.name,
      'Contact Number': inf.contactNumber,
      'Email': inf.email || '',
      'Type': inf.type,
      'Region': inf.region || '',
      'Social Link': inf.socialLink || '',
      'Coupon Code': inf.couponCode || '',
      'Approval Status': inf.approvalStatus,
      'Total Earnings': inf.totalEarnings || 0,
      'Referral Uses': inf.referralUses || 0,
      'UPI ID': inf.upiId || '',
      'Bank Details': inf.bankDetails || '',
      'Created Date': new Date(inf.createdAt).toLocaleDateString()
    }));
    exportToExcel(exportData, 'influencers');
    showAlert('Influencers exported successfully!', 'success');
  };

  const exportRequests = () => {
    const exportData = currentData.requests.map(req => ({
      'Name': req.name,
      'Contact Number': req.contactNumber,
      'Email': req.email || '',
      'Type': req.type,
      'Region': req.region || '',
      'Social Link': req.socialLink || '',
      'Applied Date': new Date(req.createdAt).toLocaleDateString()
    }));
    exportToExcel(exportData, 'influencer_requests');
    showAlert('Requests exported successfully!', 'success');
  };

  const exportCoupons = () => {
    const exportData = currentData.coupons.map(coupon => ({
      'Code': coupon.code,
      'Influencer': coupon.influencer?.name || '',
      'Discount Type': coupon.discountType,
      'Discount Value': coupon.discountValue,
      'Commission Amount': coupon.commissionAmount || 0,
      'Usage Count': coupon.usageCount,
      'Usage Limit': coupon.usageLimit || 'Unlimited',
      'Total Revenue': coupon.totalRevenue || 0,
      'Active': coupon.active ? 'Yes' : 'No',
      'Valid From': coupon.validFrom ? new Date(coupon.validFrom).toLocaleDateString() : '',
      'Valid Until': coupon.validUntil ? new Date(coupon.validUntil).toLocaleDateString() : ''
    }));
    exportToExcel(exportData, 'coupons');
    showAlert('Coupons exported successfully!', 'success');
  };


  // Event Listeners
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('[Admin Dashboard] DOM Content Loaded');
    
    try {
      await ensureAdminSession();
      console.log('[Admin Dashboard] Admin session verified');
    } catch (error) {
      console.error('[Admin Dashboard] Session verification failed:', error);
      return;
    }

    // Navigation
    console.log('[Admin Dashboard] Attaching navigation listeners');
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = link.dataset.section;
        console.log('[Admin Dashboard] Navigation clicked:', section);
        showSection(section);

        // Load data for section
        switch (section) {
          case 'overview':
            loadOverview();
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
          case 'influencer-requests':
            loadInfluencerRequests();
            break;
          case 'coupons':
            loadCoupons();
            break;
        }
      });
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async () => {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      } catch (error) {
        console.warn('Logout error:', error);
      } finally {
        window.location.href = '/admin/login';
      }
    });

    // Filter buttons
    document.getElementById('regFilterBtn')?.addEventListener('click', () => {
      loadRegistrations({
        search: document.getElementById('regSearchInput').value,
        status: document.getElementById('regStatusFilter').value,
        paymentStatus: document.getElementById('regPaymentFilter').value
      });
    });

    document.getElementById('payFilterBtn')?.addEventListener('click', () => {
      loadPayments({
        search: document.getElementById('paySearchInput').value,
        status: document.getElementById('payStatusFilter').value
      });
    });

    document.getElementById('infFilterBtn')?.addEventListener('click', () => {
      loadInfluencers({
        search: document.getElementById('infSearchInput').value,
        status: document.getElementById('infStatusFilter').value
      });
    });

    document.getElementById('couponFilterBtn')?.addEventListener('click', () => {
      loadCoupons({
        search: document.getElementById('couponSearchInput').value,
        active: document.getElementById('couponActiveFilter').value
      });
    });

    // Export buttons
    console.log('[Admin Dashboard] Attaching export button listeners');
    document.getElementById('exportRegistrationsBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Export registrations clicked');
      exportRegistrations();
    });
    document.getElementById('exportPaymentsBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Export payments clicked');
      exportPayments();
    });
    document.getElementById('exportInfluencersBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Export influencers clicked');
      exportInfluencers();
    });
    document.getElementById('exportRequestsBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Export requests clicked');
      exportRequests();
    });
    document.getElementById('exportCouponsBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Export coupons clicked');
      exportCoupons();
    });

    // Manual registration and bulk upload
    console.log('[Admin Dashboard] Attaching registration button listeners');
    document.getElementById('addRegistrationBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Add registration clicked');
      openManualRegistrationModal();
    });
    document.getElementById('saveManualRegistration')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Save manual registration clicked');
      saveManualRegistration();
    });
    document.getElementById('bulkUploadBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Bulk upload clicked');
      openBulkUploadModal();
    });
    document.getElementById('downloadTemplateBtn')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Download template clicked');
      downloadTemplate();
    });
    document.getElementById('processBulkUpload')?.addEventListener('click', () => {
      console.log('[Admin Dashboard] Process bulk upload clicked');
      processBulkUpload();
    });

    // Refresh functionality
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      const currentSection = document.querySelector('.content-section:not([style*="display: none"])');
      if (currentSection) {
        const sectionId = currentSection.id.replace('Section', '');
        refreshCurrentSection(sectionId);
      }
    });

    // Auto-refresh toggle
    document.getElementById('autoRefreshToggle')?.addEventListener('change', (e) => {
      if (e.target.checked) {
        startAutoRefresh();
        showAlert('Auto-refresh enabled (30s interval)', 'info');
      } else {
        stopAutoRefresh();
        showAlert('Auto-refresh disabled', 'info');
      }
    });

    // Load initial overview
    loadOverview();
    updateLastRefreshTime();
    startAutoRefresh();
  });

  // Functions for button handlers (no longer need window.* since using event delegation)
  const viewRegistration = (id) => {
    showAlert('View registration details - Feature coming soon', 'info');
  };



  const editInfluencer = async (id) => {
    if (!confirm('Disable this influencer? They will not be able to use their coupon code.')) return;
    try {
      await apiRequest(`/api/admin/influencers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ approvalStatus: 'disabled' })
      });
      showAlert('Influencer disabled successfully', 'success');
      loadInfluencers();
    } catch (error) {
      showAlert('Failed to disable: ' + error.message, 'danger');
    }
  };

  const editCoupon = (id) => {
    showAlert('Edit coupon - Feature coming soon', 'info');
  };

  const disableInfluencer = async (id) => {
    if (!confirm('Disable this influencer? They will not be able to use their coupon code.')) return;
    try {
      await apiRequest(`/api/admin/influencers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ approvalStatus: 'disabled' })
      });
      showAlert('Influencer disabled successfully', 'success');
      loadInfluencers();
    } catch (error) {
      showAlert('Failed to disable: ' + error.message, 'danger');
    }
  };

  // Auto-refresh functionality
  let autoRefreshInterval = null;
  let lastUpdateTime = null;

  const updateLastRefreshTime = () => {
    lastUpdateTime = new Date();
    const timeStr = lastUpdateTime.toLocaleTimeString();
    const elem = document.getElementById('lastUpdated');
    if (elem) {
      elem.textContent = `Last updated: ${timeStr}`;
    }
  };

  const startAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
    autoRefreshInterval = setInterval(() => {
      const currentSection = document.querySelector('.content-section:not([style*="display: none"])');
      if (currentSection) {
        const sectionId = currentSection.id.replace('Section', '');
        refreshCurrentSection(sectionId);
      }
    }, 30000); // 30 seconds
  };

  const stopAutoRefresh = () => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
      autoRefreshInterval = null;
    }
  };

  const refreshCurrentSection = (sectionName) => {
    switch (sectionName) {
      case 'overview':
        loadOverview();
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
      case 'influencerRequests':
        loadInfluencerRequests();
        break;
      case 'coupons':
        loadCoupons();
        break;
    }
    updateLastRefreshTime();
  };

  // Manual Registration
  const openManualRegistrationModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('manualRegistrationModal'));
    modal.show();
  };

  const saveManualRegistration = async () => {
    const form = document.getElementById('manualRegistrationForm');
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
    data.reference_id = 'MAN' + Date.now();
    data.sewing_date = new Date().toISOString();
    data.farming_experience = 0;
    data.irrigation_source = 'Other';

    try {
      await apiRequest('/api/admin/registrations/manual', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showAlert('Registration added successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('manualRegistrationModal')).hide();
      form.reset();
      loadRegistrations();
    } catch (error) {
      showAlert('Failed to add registration: ' + error.message, 'danger');
    }
  };

  // Bulk Upload
  const openBulkUploadModal = () => {
    const modal = new bootstrap.Modal(document.getElementById('bulkUploadModal'));
    document.getElementById('bulkUploadPreview').innerHTML = '';
    document.getElementById('bulkUploadFile').value = '';
    modal.show();
  };

  const downloadTemplate = () => {
    const template = [
      {
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
      }
    ];
    exportToExcel(template, 'registration_template');
    showAlert('Template downloaded successfully!', 'success');
  };

  const processBulkUpload = async () => {
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

        // Show preview
        const preview = document.getElementById('bulkUploadPreview');
        preview.innerHTML = `
          <div class="alert alert-info">
            Found ${jsonData.length} records. Click Upload to process.
          </div>
        `;

        // Process upload
        const results = await apiRequest('/api/admin/registrations/bulk', {
          method: 'POST',
          body: JSON.stringify({ registrations: jsonData })
        });

        showAlert(`Successfully uploaded ${results.success} registrations. Failed: ${results.failed}`, 'success');
        bootstrap.Modal.getInstance(document.getElementById('bulkUploadModal')).hide();
        loadRegistrations();
      } catch (error) {
        showAlert('Failed to process file: ' + error.message, 'danger');
      }
    };
    reader.readAsArrayBuffer(file);
  };


  // Influencer Management Functions

  // Add New Influencer
  const openAddInfluencerModal = () => {
    document.getElementById('addInfluencerForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('addInfluencerModal'));
    modal.show();
  };

  const saveNewInfluencer = async () => {
    const form = document.getElementById('addInfluencerForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => {
      data[key] = value || null;
    });

    try {
      const result = await apiRequest('/api/admin/influencers', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      showAlert('Influencer added successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('addInfluencerModal')).hide();
      loadInfluencers();
      loadOverview();
    } catch (error) {
      showAlert('Failed to add influencer: ' + error.message, 'error');
    }
  };

  // View Influencer Details
  const viewInfluencer = async (id) => {
    const modal = new bootstrap.Modal(document.getElementById('viewInfluencerModal'));
    modal.show();

    const content = document.getElementById('viewInfluencerContent');
    content.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"></div></div>';

    try {
      const influencer = currentData.influencers.find(inf => inf.id === id);
      if (!influencer) {
        throw new Error('Influencer not found');
      }

      // Fetch detailed stats
      const statsRes = await apiRequest(`/api/admin/influencers/${id}/stats`);
      const stats = statsRes.stats || {};

      content.innerHTML = `
        <div class="row g-4">
          <div class="col-md-6">
            <h6 class="text-primary"><i class="fas fa-user me-2"></i>Personal Information</h6>
            <table class="table table-sm">
              <tr><th>Name:</th><td>${influencer.name}</td></tr>
              <tr><th>Contact:</th><td>${influencer.contactNumber}</td></tr>
              <tr><th>Email:</th><td>${influencer.email || 'Not provided'}</td></tr>
              <tr><th>Type:</th><td>${influencer.type}</td></tr>
              <tr><th>Region:</th><td>${influencer.region || 'Not specified'}</td></tr>
              <tr><th>Social Link:</th><td>${influencer.socialLink ? `<a href="${influencer.socialLink}" target="_blank">View</a>` : 'Not provided'}</td></tr>
            </table>
          </div>
          <div class="col-md-6">
            <h6 class="text-primary"><i class="fas fa-chart-bar me-2"></i>Performance Stats</h6>
            <table class="table table-sm">
              <tr><th>Status:</th><td><span class="badge bg-${influencer.approvalStatus === 'approved' ? 'success' : 'warning'}">${influencer.approvalStatus}</span></td></tr>
              <tr><th>Coupon Code:</th><td><code>${influencer.couponCode || 'Not assigned'}</code></td></tr>
              <tr><th>Total Referrals:</th><td>${stats.totalReferrals || 0}</td></tr>
              <tr><th>Completed:</th><td>${stats.completedReferrals || 0}</td></tr>
              <tr><th>Total Earnings:</th><td>₹${influencer.totalEarnings || 0}</td></tr>
              <tr><th>Total Revenue:</th><td>₹${stats.totalRevenue || 0}</td></tr>
            </table>
          </div>
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-wallet me-2"></i>Payment Information</h6>
            <table class="table table-sm">
              <tr><th>UPI ID:</th><td>${influencer.upiId || 'Not provided'}</td></tr>
              <tr><th>Bank Details:</th><td>${influencer.bankDetails || 'Not provided'}</td></tr>
            </table>
          </div>
          ${influencer.notes ? `
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-sticky-note me-2"></i>Notes</h6>
            <p class="mb-0">${influencer.notes}</p>
          </div>
          ` : ''}
          <div class="col-12">
            <h6 class="text-primary"><i class="fas fa-info-circle me-2"></i>System Information</h6>
            <table class="table table-sm">
              <tr><th>Login Enabled:</th><td>${influencer.loginEnabled ? 'Yes' : 'No'}</td></tr>
              <tr><th>Created:</th><td>${new Date(influencer.createdAt).toLocaleString()}</td></tr>
              <tr><th>Last Updated:</th><td>${new Date(influencer.updatedAt).toLocaleString()}</td></tr>
            </table>
          </div>
        </div>
      `;
    } catch (error) {
      content.innerHTML = `<div class="alert alert-danger">Failed to load influencer details: ${error.message}</div>`;
    }
  };

  // Edit Influencer (override earlier placeholder)
  editInfluencer = async (id) => {
    try {
      const influencer = currentData.influencers.find(inf => inf.id === id);
      if (!influencer) {
        showAlert('Influencer not found', 'error');
        return;
      }

      // Populate form
      document.getElementById('edit_influencer_id').value = influencer.id;
      document.getElementById('edit_name').value = influencer.name;
      document.getElementById('edit_contact').value = influencer.contactNumber;
      document.getElementById('edit_email').value = influencer.email || '';
      document.getElementById('edit_type').value = influencer.type;
      document.getElementById('edit_region').value = influencer.region || '';
      document.getElementById('edit_social_link').value = influencer.socialLink || '';
      document.getElementById('edit_upi_id').value = influencer.upiId || '';
      document.getElementById('edit_coupon_code').value = influencer.couponCode || '';
      document.getElementById('edit_approval_status').value = influencer.approvalStatus;
      document.getElementById('edit_login_enabled').value = influencer.loginEnabled ? 'true' : 'false';
      document.getElementById('edit_bank_details').value = influencer.bankDetails || '';
      document.getElementById('edit_notes').value = influencer.notes || '';

      const modal = new bootstrap.Modal(document.getElementById('editInfluencerModal'));
      modal.show();
    } catch (error) {
      showAlert('Failed to load influencer data: ' + error.message, 'error');
    }
  };

  // Save Influencer Edit
  const saveInfluencerEdit = async () => {
    const form = document.getElementById('editInfluencerForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = document.getElementById('edit_influencer_id').value;
    const data = {
      name: document.getElementById('edit_name').value,
      contact_number: document.getElementById('edit_contact').value,
      email: document.getElementById('edit_email').value || null,
      type: document.getElementById('edit_type').value,
      region: document.getElementById('edit_region').value || null,
      social_link: document.getElementById('edit_social_link').value || null,
      upi_id: document.getElementById('edit_upi_id').value || null,
      coupon_code: document.getElementById('edit_coupon_code').value || null,
      approval_status: document.getElementById('edit_approval_status').value,
      login_enabled: document.getElementById('edit_login_enabled').value === 'true',
      bank_details: document.getElementById('edit_bank_details').value || null,
      notes: document.getElementById('edit_notes').value || null
    };

    try {
      await apiRequest(`/api/admin/influencers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
      });
      showAlert('Influencer updated successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('editInfluencerModal')).hide();
      loadInfluencers();
    } catch (error) {
      showAlert('Failed to update influencer: ' + error.message, 'error');
    }
  };

  // Assign Login Credentials
  const assignCredentials = (id) => {
    const influencer = currentData.influencers.find(inf => inf.id === id);
    if (!influencer) {
      showAlert('Influencer not found', 'error');
      return;
    }

    document.getElementById('cred_influencer_id').value = influencer.id;
    document.getElementById('cred_influencer_name').value = influencer.name;
    document.getElementById('cred_email').value = influencer.email || '';
    document.getElementById('cred_password').value = '';
    document.getElementById('cred_force_reset').checked = false;
    document.getElementById('cred_enable_login').checked = true;

    const modal = new bootstrap.Modal(document.getElementById('assignCredentialsModal'));
    modal.show();
  };

  // Generate Random Password
  const generatePassword = () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    document.getElementById('cred_password').value = password;
  };

  // Toggle Password Visibility
  const toggleCredPassword = () => {
    const passwordInput = document.getElementById('cred_password');
    const icon = document.querySelector('#toggleCredPassword i');
    if (passwordInput.type === 'password') {
      passwordInput.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      passwordInput.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  };

  // Save Credentials
  const saveCredentials = async () => {
    const form = document.getElementById('assignCredentialsForm');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const id = document.getElementById('cred_influencer_id').value;
    const email = document.getElementById('cred_email').value;
    const password = document.getElementById('cred_password').value;
    const forceReset = document.getElementById('cred_force_reset').checked;
    const enableLogin = document.getElementById('cred_enable_login').checked;

    if (password.length < 8) {
      showAlert('Password must be at least 8 characters', 'error');
      return;
    }

    try {
      await apiRequest(`/api/admin/influencers/${id}/credentials`, {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          forcePasswordReset: forceReset,
          loginEnabled: enableLogin
        })
      });
      showAlert('Login credentials assigned successfully!', 'success');
      bootstrap.Modal.getInstance(document.getElementById('assignCredentialsModal')).hide();
      loadInfluencers();
    } catch (error) {
      showAlert('Failed to assign credentials: ' + error.message, 'error');
    }
  };

  // Delete Influencer
  const deleteInfluencer = (id) => {
    const influencer = currentData.influencers.find(inf => inf.id === id);
    if (!influencer) {
      showAlert('Influencer not found', 'error');
      return;
    }

    document.getElementById('delete_influencer_id').value = influencer.id;
    document.getElementById('delete_influencer_name').textContent = influencer.name;
    document.getElementById('delete_influencer_contact').textContent = influencer.contactNumber;

    const modal = new bootstrap.Modal(document.getElementById('deleteInfluencerModal'));
    modal.show();
  };

  // Confirm Delete
  const confirmDeleteInfluencer = async () => {
    const id = document.getElementById('delete_influencer_id').value;

    try {
      await apiRequest(`/api/admin/influencers/${id}`, {
        method: 'DELETE'
      });
      showAlert('Influencer deleted successfully', 'success');
      bootstrap.Modal.getInstance(document.getElementById('deleteInfluencerModal')).hide();
      loadInfluencers();
      loadOverview();
    } catch (error) {
      showAlert('Failed to delete influencer: ' + error.message, 'error');
    }
  };

  // Update displayInfluencersTable to include new action buttons
  displayInfluencersTable = (data) => {
    const container = document.getElementById('influencersTable');
    if (!data.length) {
      container.innerHTML = '<p class="text-muted text-center">No influencers found</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact</th>
              <th>Type</th>
              <th>Region</th>
              <th>Coupon Code</th>
              <th>Status</th>
              <th>Earnings</th>
              <th>Uses</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(inf => `
              <tr>
                <td>${inf.name}</td>
                <td>${inf.contactNumber}</td>
                <td>${inf.type}</td>
                <td>${inf.region || '-'}</td>
                <td><code>${inf.couponCode || '-'}</code></td>
                <td><span class="status-badge status-${inf.approvalStatus}">${inf.approvalStatus}</span></td>
                <td>₹${inf.totalEarnings || 0}</td>
                <td>${inf.referralUses || 0}</td>
                <td class="table-actions">
                  <button class="btn btn-sm btn-info view-influencer-btn" data-id="${inf.id}" title="View">
                    <i class="fas fa-eye"></i>
                  </button>
                  <button class="btn btn-sm btn-primary edit-influencer-btn" data-id="${inf.id}" title="Edit">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-sm btn-success assign-credentials-btn" data-id="${inf.id}" title="Assign Login">
                    <i class="fas fa-key"></i>
                  </button>
                  ${inf.approvalStatus === 'approved' ? `
                    <button class="btn btn-sm btn-warning disable-influencer-btn" data-id="${inf.id}" title="Disable">
                      <i class="fas fa-ban"></i>
                    </button>
                  ` : ''}
                  <button class="btn btn-sm btn-danger delete-influencer-btn" data-id="${inf.id}" title="Delete">
                    <i class="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Attach event listeners using event delegation
    container.querySelectorAll('.view-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        viewInfluencer(id);
      });
    });

    container.querySelectorAll('.edit-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        editInfluencer(id);
      });
    });

    container.querySelectorAll('.assign-credentials-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        assignCredentials(id);
      });
    });

    container.querySelectorAll('.disable-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        disableInfluencer(id);
      });
    });

    container.querySelectorAll('.delete-influencer-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        deleteInfluencer(id);
      });
    });
  };

  // Initialize influencer management event listeners in existing DOMContentLoaded
  const initInfluencerManagement = () => {
    document.getElementById('addInfluencerBtn')?.addEventListener('click', openAddInfluencerModal);
    document.getElementById('saveNewInfluencer')?.addEventListener('click', saveNewInfluencer);
    document.getElementById('saveInfluencerEdit')?.addEventListener('click', saveInfluencerEdit);
    document.getElementById('generatePassword')?.addEventListener('click', generatePassword);
    document.getElementById('toggleCredPassword')?.addEventListener('click', toggleCredPassword);
    document.getElementById('saveCredentials')?.addEventListener('click', saveCredentials);
    document.getElementById('confirmDeleteInfluencer')?.addEventListener('click', confirmDeleteInfluencer);
  };

  // Call this in the existing DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initInfluencerManagement);
  } else {
    initInfluencerManagement();
  }
})();
