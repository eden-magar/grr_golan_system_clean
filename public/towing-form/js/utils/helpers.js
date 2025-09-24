/**
 * General utility helper functions
 */

/**
 * Debounce function - delays execution until after delay period
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} - Debounced function
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

/**
 * Generate unique order number based on current timestamp
 * @returns {string} - Order number (DDMMYYHHMMSS)
 */
function generateOrderNumber() {
    const now = new Date();
    
    // Get date in DDMMYY format
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    
    // Get time in HHMMSS format
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Create order number: DDMMYYHHMMSS
    return day + month + year + hours + minutes + seconds;
}

/**
 * Show notification message to user
 * @param {string} message - Message to display
 * @param {string} type - Message type ('info', 'error', 'warning', 'success')
 * @param {number} duration - Display duration in milliseconds
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 400px;
        animation: slideIn 0.3s ease;
    `;

    const colors = {
        'error': 'background: #fef2f2; border: 2px solid #fca5a5; color: #991b1b;',
        'warning': 'background: #fefbf2; border: 2px solid #fcd34d; color: #92400e;',
        'success': 'background: #f0fff4; border: 2px solid #68d391; color: #276749;',
        'info': 'background: #eff6ff; border: 2px solid #93c5fd; color: #1e40af;'
    };

    notification.style.cssText += colors[type] || colors.info;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Remove after duration
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, duration);
}

/**
 * Get current date in YYYY-MM-DD format
 * @returns {string} - Current date
 */
function getCurrentDate() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Get current time in HH:MM format
 * @returns {string} - Current time
 */
function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Check if element is visible (not hidden)
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} - True if visible
 */
function isElementVisible(element) {
    if (!element) return false;
    return element.offsetParent !== null && !element.closest('.hidden');
}

/**
 * Smooth scroll to element with offset
 * @param {HTMLElement} element - Element to scroll to
 * @param {number} offset - Offset from top in pixels
 */
function scrollToElement(element, offset = 0) {
    if (!element) return;
    
    const elementRect = element.getBoundingClientRect();
    const elementTop = elementRect.top + window.pageYOffset;
    const headerHeight = document.querySelector('.main-header')?.offsetHeight || 0;
    const scrollToPosition = elementTop - headerHeight - offset;
    
    window.scrollTo({
        top: Math.max(0, scrollToPosition),
        behavior: 'smooth'
    });
}

/**
 * Update visibility of required fields based on form state
 */
function updateRequiredFieldsVisibility() {
    const requiredInputs = document.querySelectorAll('[required]');
    
    requiredInputs.forEach(input => {
        const isVisible = isElementVisible(input);
        
        if (isVisible) {
            input.setAttribute('required', 'required');
        } else {
            input.removeAttribute('required');
        }
    });
}

/**
 * Clear form fields in a container
 * @param {HTMLElement|string} container - Container element or selector
 * @param {Array<string>} excludeIds - Field IDs to exclude from clearing
 */
function clearFormFields(container, excludeIds = []) {
    const containerEl = typeof container === 'string' 
        ? document.querySelector(container) 
        : container;
        
    if (!containerEl) return;
    
    const inputs = containerEl.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        if (!excludeIds.includes(input.id)) {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
            
            // Clear data attributes
            Object.keys(input.dataset).forEach(key => {
                delete input.dataset[key];
            });
        }
    });
}

/**
 * Show/hide element with optional animation
 * @param {HTMLElement|string} element - Element or selector
 * @param {boolean} show - True to show, false to hide
 * @param {string} animationClass - Optional CSS class for animation
 */
function toggleElement(element, show, animationClass = '') {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;
    
    if (show) {
        el.classList.remove('hidden');
        if (animationClass) el.classList.add(animationClass);
    } else {
        el.classList.add('hidden');
        if (animationClass) el.classList.remove(animationClass);
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} - Success status
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            return true;
        } catch (fallbackErr) {
            return false;
        } finally {
            document.body.removeChild(textArea);
        }
    }
}

/**
 * Format currency amount for display
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency symbol
 * @returns {string} - Formatted amount
 */
function formatCurrency(amount, currency = '₪') {
    if (!amount && amount !== 0) return `0${currency}`;
    return `${Math.round(amount)}${currency}`;
}

/**
 * Parse numeric value from string (removes non-digits)
 * @param {string} value - String value
 * @returns {number} - Parsed number or 0
 */
function parseNumericValue(value) {
    if (!value) return 0;
    const cleaned = value.toString().replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

/**
 * Check if device is mobile
 * @returns {boolean} - True if mobile device
 */
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Wait for specified milliseconds
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after delay
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get error message text for distance calculation errors
 * @param {string} status - Error status from Google Maps
 * @returns {string} - Hebrew error message
 */
function getDistanceErrorMessage(status) {
    const errorMessages = {
        'NOT_FOUND': 'כתובת לא נמצאה במפות גוגל',
        'ZERO_RESULTS': 'לא נמצא מסלול בין הכתובות',
        'MAX_WAYPOINTS_EXCEEDED': 'יותר מדי נקודות במסלול',
        'MAX_ROUTE_LENGTH_EXCEEDED': 'המסלול ארוך מדי',
        'INVALID_REQUEST': 'בקשה לא תקינה',
        'OVER_DAILY_LIMIT': 'חרגת ממכסה היומית של Google',
        'OVER_QUERY_LIMIT': 'חרגת ממגבלת הבקשות',
        'REQUEST_DENIED': 'הבקשה נדחתה - בדוק הגדרות API',
        'UNKNOWN_ERROR': 'שגיאה לא ידועה בשרתי גוגל'
    };
    
    return errorMessages[status] || `שגיאה לא מוכרת: ${status}`;
}