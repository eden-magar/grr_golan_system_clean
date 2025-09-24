/**
 * Data validation utilities
 */

/**
 * Validate Israeli ID number using checksum algorithm
 * @param {string} id - ID number to validate
 * @returns {boolean} - True if valid
 */
function validateIsraeliID(id) {
    if (!id || id.length !== 9) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        let digit = parseInt(id[i]);
        if (i % 2 === 1) {
            digit *= 2;
            if (digit > 9) digit = Math.floor(digit / 10) + (digit % 10);
        }
        sum += digit;
    }
    
    return sum % 10 === 0;
}

/**
 * Validate Israeli phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid
 */
function validatePhoneNumber(phone) {
    if (!phone) return false;
    const cleaned = cleanPhoneNumber(phone);
    return VALIDATION_PATTERNS.PHONE.test(cleaned);
}

/**
 * Validate license plate number
 * @param {string} license - License plate to validate
 * @returns {boolean} - True if valid
 */
function validateLicenseNumber(license) {
    if (!license) return false;
    const cleaned = license.replace(/[^0-9]/g, '');
    return VALIDATION_PATTERNS.LICENSE_PLATE.test(cleaned);
}

/**
 * Validate credit card number format
 * @param {string} cardNumber - Card number to validate
 * @returns {boolean} - True if valid format
 */
function validateCreditCard(cardNumber) {
    if (!cardNumber) return false;
    const cleaned = cardNumber.replace(/\D/g, '');
    return cleaned.length >= 13 && cleaned.length <= 19;
}

/**
 * Validate card expiry date (MM/YY format)
 * @param {string} expiry - Expiry date to validate
 * @returns {boolean} - True if valid format and not expired
 */
function validateCardExpiry(expiry) {
    if (!expiry || !VALIDATION_PATTERNS.CARD_EXPIRY.test(expiry)) return false;
    
    const [month, year] = expiry.split('/').map(Number);
    const now = new Date();
    const currentYear = now.getFullYear() % 100;
    const currentMonth = now.getMonth() + 1;
    
    // Check valid month
    if (month < 1 || month > 12) return false;
    
    // Check not expired
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
        return false;
    }
    
    return true;
}

/**
 * Validate CVV format
 * @param {string} cvv - CVV to validate
 * @returns {boolean} - True if valid
 */
function validateCVV(cvv) {
    if (!cvv) return false;
    return VALIDATION_PATTERNS.CVV.test(cvv);
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid format
 */
function validateEmail(email) {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate address field (minimum length and content)
 * @param {string} address - Address to validate
 * @returns {boolean} - True if valid
 */
function validateAddress(address) {
    if (!address) return false;
    return address.trim().length >= 3;
}

/**
 * Validate contact name (minimum length)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
function validateContactName(name) {
    if (!name) return false;
    return name.trim().length >= 2;
}

/**
 * Validate defect details (minimum length)
 * @param {string} details - Defect details to validate
 * @returns {boolean} - True if valid
 */
function validateDefectDetails(details) {
    if (!details) return false;
    return details.trim().length >= 5;
}

/**
 * Validate required field is not empty
 * @param {string} value - Value to validate
 * @returns {boolean} - True if not empty
 */
function validateRequired(value) {
    return value && value.toString().trim().length > 0;
}

/**
 * Validate price is a positive number
 * @param {string|number} price - Price to validate
 * @returns {boolean} - True if valid positive number
 */
function validatePrice(price) {
    if (!price) return false;
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return !isNaN(numPrice) && numPrice > 0;
}

/**
 * Validate form field based on field type and requirements
 * @param {HTMLElement} field - Form field element
 * @returns {object} - Validation result {isValid: boolean, message: string}
 */
function validateFormField(field) {
    if (!field) return { isValid: false, message: 'Field not found' };
    
    const value = field.value?.trim();
    const fieldType = field.type;
    const fieldId = field.id;
    const isRequired = field.hasAttribute('required');
    
    // Check required fields
    if (isRequired && !validateRequired(value)) {
        return { isValid: false, message: 'This field is required' };
    }
    
    // Skip validation for empty optional fields
    if (!value && !isRequired) {
        return { isValid: true, message: '' };
    }
    
    // Validate based on field type/id
    switch (fieldId) {
        case 'idNumber':
            return validateIsraeliID(value) 
                ? { isValid: true, message: '' }
                : { isValid: false, message: ERROR_MESSAGES.INVALID_ID };
                
        case 'contactPhone1':
        case 'destContactPhone':
        case 'contactPhone2':
        case 'destContactPhone2':
        case 'workingSourcePhone':
        case 'workingDestPhone':
        case 'garagePhone':
            return validatePhoneNumber(value)
                ? { isValid: true, message: '' }
                : { isValid: false, message: ERROR_MESSAGES.INVALID_PHONE };
                
        case 'defectiveCarNumber':
        case 'defectiveCarNumber2':
        case 'workingCarNumber':
        case 'exchangeDefectiveNumber':
            return validateLicenseNumber(value)
                ? { isValid: true, message: '' }
                : { isValid: false, message: 'Invalid license plate number' };
                
        case 'cardNumber':
            return validateCreditCard(value)
                ? { isValid: true, message: '' }
                : { isValid: false, message: 'Invalid credit card number' };
                
        case 'cardExpiry':
            return validateCardExpiry(value)
                ? { isValid: true, message: '' }
                : { isValid: false, message: 'Invalid or expired date' };
                
        case 'cardCvv':
            return validateCVV(value)
                ? { isValid: true, message: '' }
                : { isValid: false, message: 'Invalid CVV' };
                
        default:
            // Generic validation based on field type
            if (fieldType === 'email') {
                return validateEmail(value)
                    ? { isValid: true, message: '' }
                    : { isValid: false, message: 'Invalid email format' };
            }
            
            return { isValid: true, message: '' };
    }
}