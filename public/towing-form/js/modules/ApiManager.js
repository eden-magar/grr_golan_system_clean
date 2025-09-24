/**
 * API Manager - Handles all server communications
 */

class ApiManager {
    constructor() {
        this.baseUrl = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
    }

    /**
     * Make HTTP request with error handling
     * @param {string} url - Request URL
     * @param {object} options - Fetch options
     * @returns {Promise<object>} - Response data
     */
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.defaultHeaders,
                    ...options.headers
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`API Error for ${url}:`, error);
            throw error;
        }
    }

    /**
     * Look up vehicle data by license number
     * @param {string} licenseNumber - Vehicle license number
     * @returns {Promise<object>} - Vehicle data response
     */
    async lookupVehicle(licenseNumber) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        
        if (cleanLicense.length < 5) {
            throw new Error('License number too short');
        }

        return this.makeRequest(API_ENDPOINTS.VEHICLE_LOOKUP, {
            method: 'POST',
            body: JSON.stringify({
                license: cleanLicense
            })
        });
    }

    /**
     * Check user authentication status
     * @param {string} email - User email
     * @returns {Promise<object>} - Auth status response
     */
    async checkAuth(email) {
        return this.makeRequest(API_ENDPOINTS.CHECK_AUTH, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    /**
     * Check if user has admin privileges
     * @param {string} email - User email
     * @returns {Promise<object>} - Admin status response
     */
    async checkAdminStatus(email) {
        return this.makeRequest(API_ENDPOINTS.CHECK_ADMIN, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    /**
     * Submit user registration request
     * @param {object} userData - User registration data
     * @returns {Promise<object>} - Registration response
     */
    async registerUser(userData) {
        const formData = new FormData();
        formData.append('action', 'register');
        formData.append('data', JSON.stringify(userData));

        return this.makeRequest(API_ENDPOINTS.REGISTER, {
            method: 'POST',
            body: formData,
            headers: {} // FormData sets its own headers
        });
    }

    /**
     * Submit user login request
     * @param {string} email - User email
     * @returns {Promise<object>} - Login response
     */
    async loginUser(email) {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('data', JSON.stringify({ email }));

        return this.makeRequest(API_ENDPOINTS.LOGIN_USER, {
            method: 'POST',
            body: formData,
            headers: {} // FormData sets its own headers
        });
    }

    /**
     * Submit towing form data to Google Apps Script
     * @param {object} formData - Complete form data
     * @returns {Promise<void>} - Submits via popup window
     */
    async submitTowingForm(formData) {
        try {
            // שליחה ישירה ל-Google Apps Script
            const response = await fetch(APPS_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `data=${encodeURIComponent(JSON.stringify(formData))}`
            });

            console.log('🔍 תגובת השרת:', response);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('🔍 תוצאה סופית:', result);
            return result;

        } catch (error) {
            console.error('Error submitting form:', error);
            throw new Error('Failed to submit form');
        }
    }

    /**
     * Generic GET request
     * @param {string} endpoint - API endpoint
     * @param {object} params - Query parameters
     * @returns {Promise<object>} - Response data
     */
    async get(endpoint, params = {}) {
        const url = new URL(endpoint, window.location.origin);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        return this.makeRequest(url.toString(), {
            method: 'GET'
        });
    }

    /**
     * Generic POST request
     * @param {string} endpoint - API endpoint
     * @param {object} data - Request body data
     * @returns {Promise<object>} - Response data
     */
    async post(endpoint, data = {}) {
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Upload file to server
     * @param {string} endpoint - Upload endpoint
     * @param {File} file - File to upload
     * @param {object} additionalData - Additional form data
     * @returns {Promise<object>} - Upload response
     */
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.makeRequest(endpoint, {
            method: 'POST',
            body: formData,
            headers: {} // FormData sets its own headers
        });
    }

    /**
     * Handle API errors with user-friendly messages
     * @param {Error} error - Error object
     * @param {string} context - Context where error occurred
     */
    handleError(error, context = 'API request') {
        console.error(`${context} failed:`, error);
        
        let userMessage;
        if (error.message.includes('network') || error.message.includes('fetch')) {
            userMessage = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message.includes('unauthorized') || error.message.includes('403')) {
            userMessage = ERROR_MESSAGES.UNAUTHORIZED;
        } else if (error.message.includes('not found') || error.message.includes('404')) {
            userMessage = ERROR_MESSAGES.VEHICLE_NOT_FOUND;
        } else {
            userMessage = error.message || ERROR_MESSAGES.NETWORK_ERROR;
        }
        
        showNotification(userMessage, 'error');
        return { success: false, error: userMessage };
    }

    /**
     * Set custom headers for all requests
     * @param {object} headers - Headers to set
     */
    setHeaders(headers) {
        this.defaultHeaders = {
            ...this.defaultHeaders,
            ...headers
        };
    }

    /**
     * Set base URL for relative requests
     * @param {string} url - Base URL
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    }
}

// Create singleton instance
const apiManager = new ApiManager();
window.apiManager = apiManager;