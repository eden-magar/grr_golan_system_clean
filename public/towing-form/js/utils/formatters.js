/**
 * Data formatting utilities
 */

/**
 * Clean phone number - remove non-digits and format for Israeli numbers
 * @param {string} phoneNumber - Raw phone number input
 * @returns {string} - Cleaned phone number
 */
function cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // Remove all non-digits
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle +972 prefix (Israel)
    if (cleaned.startsWith('972')) {
        cleaned = cleaned.substring(3); // Remove 972
        
        // If number starts with 0 after prefix, remove it
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // Add 0 at the beginning
        cleaned = '0' + cleaned;
    }
    
    // Ensure number starts with 0 (Israeli format)
    if (!cleaned.startsWith('0') && cleaned.length >= 9) {
        cleaned = '0' + cleaned;
    }
    
    // Limit to 10 digits maximum
    return cleaned.slice(0, 10);
}

/**
 * Format credit card number with dashes
 * @param {string} digits - Credit card digits only
 * @returns {string} - Formatted card number (0000-0000-0000-0000)
 */
function formatCardNumberWithDashes(digits) {
    // Limit to 16 digits
    const limitedDigits = digits.slice(0, 16);
    
    // If no digits, return empty string
    if (!limitedDigits) return '';
    
    // Split into groups of 4
    const parts = [];
    for (let i = 0; i < limitedDigits.length; i += 4) {
        parts.push(limitedDigits.slice(i, i + 4));
    }
    
    return parts.join('-');
}

/**
 * Format card expiry date with slash
 * @param {string} digits - Expiry digits only (MMYY)
 * @returns {string} - Formatted expiry (MM/YY)
 */
function formatExpiryWithSlash(digits) {
    // Limit to 4 digits
    const limitedDigits = digits.slice(0, 4);
    
    // If no digits, return empty string
    if (!limitedDigits) return '';
    
    // If less than 2 digits, return as is
    if (limitedDigits.length <= 2) {
        return limitedDigits;
    }
    
    // Otherwise, add slash after first 2 digits
    return limitedDigits.slice(0, 2) + '/' + limitedDigits.slice(2);
}

/**
 * Format Israeli ID number
 * @param {string} value - ID number input
 * @returns {string} - Formatted ID (digits only, max 9)
 */
function formatIDNumber(value) {
    return value.replace(/\D/g, '').slice(0, 9);
}

/**
 * Format license plate number
 * @param {string} number - License plate input
 * @returns {string} - Formatted license plate
 */
function formatLicenseNumber(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    if (cleanNumber.length === 7) {
        return cleanNumber.slice(0, 2) + '-' + cleanNumber.slice(2, 5) + '-' + cleanNumber.slice(5);
    } else if (cleanNumber.length === 8) {
        return cleanNumber.slice(0, 3) + '-' + cleanNumber.slice(3, 5) + '-' + cleanNumber.slice(5);
    }
    return cleanNumber;
}

/**
 * Clean text - remove quotes and trim
 * @param {string} text - Input text
 * @returns {string} - Cleaned text
 */
function sanitizeText(text) {
    if (!text) return text;
    return text
        .replace(/['״"']/g, '')  // Remove all types of quotes (Hebrew, English, fancy)
        .trim();
}

/**
 * Extract only digits from string
 * @param {string} str - Input string
 * @returns {string} - Digits only
 */
function onlyDigits(str) {
    return (str || "").replace(/\D+/g, "");
}

/**
 * Calculate new cursor position after formatting credit card
 * @param {number} oldCursor - Previous cursor position
 * @param {string} newValue - New formatted value
 * @param {number} digitCount - Number of digits
 * @returns {number} - New cursor position
 */
function calculateNewCursorPosition(oldCursor, newValue, digitCount) {
    // If cursor at end, place it at new end
    if (oldCursor >= newValue.length) {
        return newValue.length;
    }
    
    // Count how many digits were before the old cursor
    let digitsBefore = 0;
    for (let i = 0; i < Math.min(oldCursor, newValue.length); i++) {
        if (/\d/.test(newValue[i])) {
            digitsBefore++;
        }
    }
    
    // Find new position after same number of digits
    let newPos = 0;
    let digitsFound = 0;
    
    for (let i = 0; i < newValue.length; i++) {
        if (/\d/.test(newValue[i])) {
            digitsFound++;
            if (digitsFound === digitsBefore + 1) {
                return i + 1;
            }
        }
        newPos = i + 1;
    }
    
    return newPos;
}

/**
 * Calculate cursor position for expiry field
 * @param {number} oldCursor - Previous cursor position
 * @param {string} newValue - New formatted value
 * @param {number} digitCount - Number of digits
 * @returns {number} - New cursor position
 */
function calculateExpiryCursorPosition(oldCursor, newValue, digitCount) {
    // For expiry - simpler logic
    if (digitCount <= 2) {
        return Math.min(oldCursor, newValue.length);
    } else {
        // If more than 2 digits, cursor after slash
        return Math.min(oldCursor + (newValue.includes('/') ? 1 : 0), newValue.length);
    }
}

/**
 * Find position in formatted string after N digits (skipping separators)
 * @param {string} formatted - Formatted string
 * @param {number} n - Number of digits
 * @returns {number} - Position index
 */
function indexAfterNDigits(formatted, n) {
    if (n <= 0) return 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
        if (/\d/.test(formatted[i])) {
            count++;
            if (count === n) return i + 1;
        }
    }
    return formatted.length;
}

/**
 * Count digits up to index in string (excluding separators)
 * @param {string} str - Input string
 * @param {number} idx - Index position
 * @returns {number} - Number of digits
 */
function countDigitsToIndex(str, idx) {
    return (str.slice(0, idx).match(/\d/g) || []).length;
}