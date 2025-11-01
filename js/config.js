// API Configuration
const API_CONFIG = {
    // Backend API Base URL - Same domain on VPS
    BASE_URL: window.location.origin,
    
    // Frontend domain on Hostinger VPS
    FRONTEND_URL: window.location.origin,
    
    // Set to false for production deployment
    // Set to true for local development (uses localhost:3002)
    USE_LOCAL: false,
    
    // API Endpoints (matching backend routes)
    ENDPOINTS: {
        // Health check
        HEALTH: '/api/health-check',
        
        // Authentication
        LOGIN: '/api/auth/login',
        INFLUENCER_LOGIN: '/api/auth/influencer-login',
        LOGOUT: '/api/auth/logout',
        ME: '/api/auth/me',
        
        // Dashboard
        DASHBOARD_STATS: '/api/stats/dashboard',
        ADMIN_DASHBOARD: '/api/admin/dashboard',
        ADMIN_DASHBOARD_OVERVIEW: '/api/admin/dashboard/overview',
        
        // Registrations
        LIST_REGISTRATIONS: '/api/list-registrations',
        GET_REGISTRATION: '/api/get-registration',
        SUBMIT_REGISTRATION: '/api/submit-registration',
        SAVE_REGISTRATION: '/api/registration/save',
        COMPLETE_REGISTRATION: '/api/registration/complete',
        
        // Admin Registrations
        ADMIN_REGISTRATIONS: '/api/admin/registrations',
        ADMIN_MANUAL_REGISTRATION: '/api/admin/registrations/manual',
        ADMIN_BULK_REGISTRATION: '/api/admin/registrations/bulk',
        
        // OTP
        SEND_OTP: '/api/otp/send',
        REQUEST_OTP: '/api/otp/request',
        VERIFY_OTP: '/api/otp/verify',
        
        // Payment
        CREATE_ORDER: '/api/create-order',
        VERIFY_PAYMENT: '/api/verify-payment',
        GET_PUBLIC_KEYS: '/api/get-public-keys',
        ADMIN_PAYMENTS: '/api/admin/payments',
        
        // Influencer
        REGISTER_INFLUENCER: '/api/influencers/register',
        INFLUENCER_PROFILE: '/api/influencer/profile',
        INFLUENCER_DASHBOARD: '/api/influencer/dashboard',
        INFLUENCER_REGISTRATIONS: '/api/influencer/registrations',
        INFLUENCER_COUPONS: '/api/influencer/coupons',
        
        // Admin Influencer Management
        ADMIN_INFLUENCERS: '/api/admin/influencers',
        ADMIN_APPROVE_INFLUENCER: '/api/admin/influencers/:id/approve',
        ADMIN_REJECT_INFLUENCER: '/api/admin/influencers/:id/reject',
        ADMIN_UPDATE_INFLUENCER: '/api/admin/influencers/:id',
        ADMIN_DELETE_INFLUENCER: '/api/admin/influencers/:id',
        ADMIN_INFLUENCER_CREDENTIALS: '/api/admin/influencers/:id/credentials',
        
        // Coupon
        VALIDATE_COUPON: '/api/validate-coupon',
        ADMIN_COUPONS: '/api/admin/coupons',
        ADMIN_UPDATE_COUPON: '/api/admin/coupons/:id',
        ADMIN_DELETE_COUPON: '/api/admin/coupons/:id',
        
        // Notifications
        NOTIFY: '/api/notify'
    }
};

// Helper function to get full API URL
function getApiUrl(endpoint) {
    // Use local backend if USE_LOCAL is true
    if (API_CONFIG.USE_LOCAL) {
        return `http://localhost:3002${endpoint}`;
    }
    // Production: Use HTTPS API subdomain with SSL
    return `https://api.agrivalah.in${endpoint}`;
}

// Helper function for API calls with credentials
async function apiCall(endpoint, options = {}) {
    const url = getApiUrl(endpoint);
    const defaultOptions = {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
}
