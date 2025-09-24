/**
 * Address Manager - Handles address autocomplete and Google Places integration
 */

class AddressManager {
    constructor() {
        this.activeInput = null;
        this.autocompleteServices = new Map();
        this.geocoder = null;
        this.originalTexts = new Map();
        
        this.addressFields = [
            'defectiveSource',
            'defectiveDestination', 
            'defectiveSource2',
            'defectiveDestination2',
            'workingCarSource',
            'workingCarDestination',
            'exchangeDefectiveDestination'
        ];
    }

    /**
     * Initialize address management system
     */
    init() {
        if (window.google && window.google.maps) {
            this.setupGoogleMaps();
        } else {
            // Wait for Google Maps to load
            const checkGoogle = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkGoogle);
                    this.setupGoogleMaps();
                }
            }, 100);
        }

        this.setupAddressEditingGuards();
        this.setupAutoScroll();
    }

    /**
     * Setup Google Maps and geocoder
     */
    setupGoogleMaps() {
        this.geocoder = new google.maps.Geocoder();
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAddressFields());
        } else {
            this.setupAddressFields();
        }
    }

    /**
     * Setup address fields with autocomplete
     */
    setupAddressFields() {
        this.addressFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                this.setupGoogleAutocomplete(input);
            }
        });
        
        // Add global click listener to hide suggestions
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.address-input-container')) {
                this.hideAllSuggestions();
            }
        });
    }

    /**
     * Setup Google Places Autocomplete for specific field
     * @param {HTMLElement} input - Address input field
     */
    setupGoogleAutocomplete(input) {
        // Create container for autocomplete
        this.wrapInputWithContainer(input);
        
        // Google Places options for Israel
        const options = {
            componentRestrictions: { country: 'il' },
            fields: ['formatted_address', 'name', 'place_id', 'geometry', 'types'],
            types: ['establishment', 'geocode']
        };
        
        // Create autocomplete instance
        const autocomplete = new google.maps.places.Autocomplete(input, options);
        this.autocompleteServices.set(input.id, autocomplete);
        
        // Setup event listeners
        input.addEventListener('input', (e) => {
            this.handleInput(e);
            this.originalTexts.set(input.id, e.target.value);
        });
        
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            this.handlePlaceSelection(place, input);
        });
        
        input.addEventListener('keydown', (e) => this.handleKeydown(e));
        input.addEventListener('focus', (e) => this.handleFocus(e));
    }

    /**
     * Wrap input field with container for autocomplete
     * @param {HTMLElement} input - Input field to wrap
     */
    wrapInputWithContainer(input) {
        if (input.parentElement.classList.contains('address-input-container')) {
            return;
        }
        
        const container = document.createElement('div');
        container.className = 'address-input-container';
        
        input.parentNode.insertBefore(container, input);
        container.appendChild(input);
        
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'address-suggestions';
        container.appendChild(suggestionsDiv);
    }

    /**
     * Handle input events
     * @param {Event} e - Input event
     */
    handleInput(e) {
        this.activeInput = e.target;
        // Google Autocomplete handles suggestions automatically
    }

    /**
     * Handle keyboard events
     * @param {Event} e - Keyboard event
     */
    handleKeydown(e) {
        if (e.key === 'Escape') {
            this.hideAllSuggestions();
        }
    }

    /**
     * Handle focus events
     * @param {Event} e - Focus event
     */
    handleFocus(e) {
        this.activeInput = e.target;
    }

    /**
     * Handle place selection from Google Places
     * @param {object} place - Selected place object
     * @param {HTMLElement} input - Input field
     */
    handlePlaceSelection(place, input) {
        if (!place.formatted_address && !place.name) {
            console.warn('Incomplete place selected');
            return;
        }
        
        const originalText = this.originalTexts.get(input.id) || '';
        
        // Choose best address format
        let selectedAddress = '';
        
        if (place.name && place.formatted_address) {
            if (this.isBusinessQuery(originalText)) {
                selectedAddress = `${place.name}, ${place.formatted_address}`;
            } else {
                selectedAddress = place.formatted_address;
            }
        } else if (place.name) {
            selectedAddress = place.name;
        } else {
            selectedAddress = place.formatted_address;
        }
        
        // Check if original text differs from selected address
        const hasChanged = originalText && originalText.trim() !== selectedAddress.trim();
        
        if (hasChanged) {
            input.dataset.originalText = originalText;
            input.dataset.physicalAddress = selectedAddress;
            input.dataset.hasChanged = 'true';
        } else {
            input.dataset.hasChanged = 'false';
            delete input.dataset.originalText;
            delete input.dataset.physicalAddress;
        }
        
        // Fill the field
        input.value = selectedAddress;
        input.dataset.isGoogleAddress = 'true';
        
        // Save additional place data
        input.dataset.placeId = place.place_id;
        if (place.geometry && place.geometry.location) {
            input.dataset.lat = place.geometry.location.lat();
            input.dataset.lng = place.geometry.location.lng();
        }
        
        // Trigger change event
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // Focus next field
        this.focusNextField(input);
        this.hideAllSuggestions();
    }

    /**
     * Check if query is looking for a business
     * @param {string} query - Search query
     * @returns {boolean} - True if business query
     */
    isBusinessQuery(query) {
        const businessKeywords = [
            'מוסך', 'garage', 'שירות', 'service',
            'חנות', 'shop', 'store', 'מרכז', 'center',
            'בית עסק', 'עסק', 'business', 'חברה', 'company',
            'חניון', 'parking', 'גרר', 'towing'
        ];
        
        const lowerQuery = query.toLowerCase();
        return businessKeywords.some(keyword => lowerQuery.includes(keyword));
    }

    /**
     * Focus next form field
     * @param {HTMLElement} currentInput - Current input field
     */
    focusNextField(currentInput) {
        const form = currentInput.closest('form');
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        const currentIndex = Array.from(inputs).indexOf(currentInput);
        
        if (currentIndex > -1 && currentIndex < inputs.length - 1) {
            const nextInput = inputs[currentIndex + 1];
            if (nextInput && !nextInput.disabled && !nextInput.readOnly) {
                setTimeout(() => nextInput.focus(), 100);
            }
        }
    }

    /**
     * Hide all suggestion lists
     */
    hideAllSuggestions() {
        this.activeInput = null;
    }

    /**
     * Setup address editing guards
     */
    setupAddressEditingGuards() {
        const addressIds = [
            'defectiveSource', 'defectiveDestination',
            'defectiveSource2', 'defectiveDestination2'
        ];
        
        addressIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            // On input - mark as not Google address and clear physical address if empty
            el.addEventListener('input', function () {
                this.dataset.isGoogleAddress = 'false';
                if (!this.value.trim()) {
                    delete this.dataset.physicalAddress;
                }
            });

            // On blur - clear physical address if empty
            el.addEventListener('blur', function () {
                if (!this.value.trim()) {
                    delete this.dataset.physicalAddress;
                }
            });
        });
    }

    /**
     * Setup auto-scroll for address fields
     */
    setupAutoScroll() {
        this.addressFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field) return;
            
            field.addEventListener('focus', function() {
                setTimeout(() => {
                    scrollToElement(this, UI_CONFIG.AUTO_SCROLL_OFFSET);
                }, 150);
            });
        });
    }

    /**
     * Process address for form submission
     * @param {string} fieldId - Field ID to process
     * @returns {object} - Processed address data
     */
    processAddress(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return { address: '', isGoogleAddress: false };
        
        const hasChanged = field.dataset.hasChanged === 'true';
        const originalText = field.dataset.originalText;
        const physicalAddress = field.dataset.physicalAddress;
        const currentValue = field.value;
        
        let displayAddress, addressForWaze;
        
        if (hasChanged && originalText && physicalAddress) {
            displayAddress = `${originalText} - ${physicalAddress}`;
            addressForWaze = physicalAddress;
        } else {
            displayAddress = currentValue;
            addressForWaze = currentValue;
        }
        
        return {
            address: displayAddress,
            physicalAddress: addressForWaze,
            isGoogleAddress: field.dataset.isGoogleAddress === 'true'
        };
    }

    /**
     * Search for address using geocoder
     * @param {string} query - Address query
     * @returns {Promise<array>} - Geocoder results
     */
    async searchAddress(query) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('Geocoder not available'));
                return;
            }
            
            this.geocoder.geocode({
                address: query,
                componentRestrictions: { country: 'IL' },
                language: 'he'
            }, (results, status) => {
                if (status === 'OK' && results.length > 0) {
                    resolve(results);
                } else {
                    reject(new Error('No results found'));
                }
            });
        });
    }

    /**
     * Get place details by Place ID
     * @param {string} placeId - Google Place ID
     * @returns {Promise<object>} - Place details
     */
    async getPlaceDetails(placeId) {
        return new Promise((resolve, reject) => {
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            
            service.getDetails({
                placeId: placeId,
                fields: ['name', 'formatted_address', 'geometry', 'types', 'opening_hours']
            }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(place);
                } else {
                    reject(new Error('Error getting place details'));
                }
            });
        });
    }

    /**
     * Validate address field
     * @param {string} fieldId - Field ID to validate
     * @returns {object} - Validation result
     */
    validateAddress(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return { isValid: false, message: 'Field not found' };
        
        const value = field.value?.trim();
        if (!value) return { isValid: false, message: 'Address is required' };
        
        if (value.length < 3) {
            return { isValid: false, message: 'Address too short' };
        }
        
        return { isValid: true, message: '' };
    }

    /**
     * Clear address data for field
     * @param {string} fieldId - Field ID to clear
     */
    clearAddressData(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        field.value = '';
        delete field.dataset.physicalAddress;
        delete field.dataset.isGoogleAddress;
        delete field.dataset.hasChanged;
        delete field.dataset.originalText;
        delete field.dataset.placeId;
        delete field.dataset.lat;
        delete field.dataset.lng;
    }

    /**
     * Get all processed addresses for form submission
     * @returns {object} - All address data
     */
    getAllAddresses() {
        const addresses = {};
        
        this.addressFields.forEach(fieldId => {
            addresses[fieldId] = this.processAddress(fieldId);
        });
        
        return addresses;
    }

    /**
     * Check if Google Maps is available
     * @returns {boolean} - True if available
     */
    isGoogleMapsAvailable() {
        return !!(window.google && window.google.maps);
    }
}

// Create singleton instance
const addressManager = new AddressManager();
window.addressManager = addressManager;