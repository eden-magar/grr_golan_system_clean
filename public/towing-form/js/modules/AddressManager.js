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
            'workingSource',          // ← הוסף
            'workingDestination',     // ← הוסף
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

    /**
     * Setup pin drop buttons
     */
    setupPinDropButtons() {
        const pinButtons = document.querySelectorAll('.pin-drop-btn');
        pinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const targetFieldId = button.dataset.target;
                this.showPinDropModal(targetFieldId);
            });
        });
    }

    /**
     * Show pin drop modal for specific field
     * @param {string} fieldId - Target field ID
     */
    showPinDropModal(fieldId) {
        // וודא שהשדה קיים
        const field = document.getElementById(fieldId);
        if (!field) {
            console.error('Field not found:', fieldId);
            return;
        }
        
        // הוסף זמנית לרשימה אם זה שדה עצירה
        if (fieldId.startsWith('stopAddress') && !this.addressFields.includes(fieldId)) {
            this.addressFields.push(fieldId);
        }
        
        const modal = this.createPinDropModal(fieldId);
        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Initialize map after modal is visible
        setTimeout(() => this.initializeMap(fieldId), 300);
    }

    /**
     * Create pin drop modal
     * @param {string} fieldId - Target field ID
     * @returns {HTMLElement} - Modal element
     */
    createPinDropModal(fieldId) {
        // Remove existing modal if present
        const existing = document.getElementById('pinDropModalActive');
        if (existing) existing.remove();
        
        const modal = document.createElement('div');
        modal.id = 'pinDropModalActive';
        modal.className = 'pin-drop-modal';
        
        // קביעת תווית דינמית
        let fieldLabel = 'מיקום';
        if (fieldId === 'defectiveSource') fieldLabel = 'מוצא';
        else if (fieldId === 'defectiveDestination') fieldLabel = 'יעד';
        else if (fieldId.startsWith('stopAddress')) {
            const stopNumber = fieldId.replace('stopAddress', '');
            fieldLabel = `עצירה ${parseInt(stopNumber) + 1}`;
        }
        
        modal.innerHTML = `
            <div class="pin-drop-modal-content">
                <div class="pin-drop-modal-header">
                    <h3 class="pin-drop-modal-title">בחר מיקום ${fieldLabel}</h3>
                    <button class="pin-drop-modal-close" onclick="this.closest('.pin-drop-modal').remove()">×</button>
                </div>
                <div id="pinDropMap" class="pin-drop-map"></div>
                <div class="pin-drop-modal-actions">
                    <button class="pin-drop-modal-btn pin-drop-modal-cancel" onclick="this.closest('.pin-drop-modal').remove()">ביטול</button>
                    <button class="pin-drop-modal-btn pin-drop-modal-confirm" onclick="window.addressManager.confirmPinDrop('${fieldId}')">אישור מיקום</button>
                </div>
            </div>
        `;
        
        return modal;
    }

    /**
     * Initialize Google Map in modal
     * @param {string} fieldId - Target field ID
     */
    initializeMap(fieldId) {
        if (!window.google || !window.google.maps) {
            console.error('Google Maps not loaded');
            return;
        }

        const mapContainer = document.getElementById('pinDropMap');
        if (!mapContainer) return;

        // Get current field value for initial position
        const field = document.getElementById(fieldId);
        const currentValue = field ? field.value.trim() : '';
        
        // Default to center of Israel
        let initialPosition = { lat: 32.0853, lng: 34.7818 };
        
        // Try to get position from existing coordinates
        if (field && field.dataset.lat && field.dataset.lng) {
            initialPosition = {
                lat: parseFloat(field.dataset.lat),
                lng: parseFloat(field.dataset.lng)
            };
        }

        // Create map
        const map = new google.maps.Map(mapContainer, {
            zoom: 15,
            center: initialPosition,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            gestureHandling: 'greedy'  // מאפשר גלילה ללא Ctrl
        });

        // Create draggable marker
        const marker = new google.maps.Marker({
            position: initialPosition,
            map: map,
            draggable: true,
            title: 'גרור אותי למיקום הרצוי'
        });

        // Store map and marker for later use
        this.currentMap = map;
        this.currentMarker = marker;
        this.currentFieldId = fieldId;

        // If we have a current address, try to geocode it
        if (currentValue && !field.dataset.lat) {
            this.geocodeAddress(currentValue, map, marker);
        }

        // Add click listener to map
        map.addListener('click', (e) => {
            marker.setPosition(e.latLng);
        });
    }

    /**
     * Geocode address to position map
     * @param {string} address - Address to geocode
     * @param {google.maps.Map} map - Map instance
     * @param {google.maps.Marker} marker - Marker instance
     */
    geocodeAddress(address, map, marker) {
        if (!this.geocoder) return;

        this.geocoder.geocode({
            address: address,
            componentRestrictions: { country: 'IL' }
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                map.setCenter(location);
                marker.setPosition(location);
            }
        });
    }

    /**
     * Confirm pin drop and update field
     * @param {string} fieldId - Target field ID
     */

    confirmPinDrop(fieldId) {
        if (!this.currentMarker) return;

        const position = this.currentMarker.getPosition();
        const lat = position.lat();
        const lng = position.lng();

        // Reverse geocode to get address
        this.reverseGeocode(lat, lng, (address) => {
            this.updateFieldWithPinDrop(fieldId, lat, lng, address);
            
            // Close modal
            const modal = document.getElementById('pinDropModalActive');
            if (modal) modal.remove();
            
            // Trigger change event and force price recalculation
            const field = document.getElementById(fieldId);
            if (field) {
                field.dispatchEvent(new Event('input', { bubbles: true }));
                field.dispatchEvent(new Event('blur', { bubbles: true }));
                
                // Force immediate price calculation if PricingManager is available
                setTimeout(() => {
                    if (window.pricingManager && typeof window.pricingManager.debouncedCalculation === 'function') {
                        window.pricingManager.debouncedCalculation(100);
                    }
                }, 100);
            }
        });
    }

    /**
     * Reverse geocode coordinates to address
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {function} callback - Callback with address
     */

    reverseGeocode(lat, lng, callback) {
        if (!this.geocoder) {
            callback('מיקום מדויק');
            return;
        }

        this.geocoder.geocode({
            location: { lat: lat, lng: lng }
        }, (results, status) => {
            if (status === 'OK' && results[0]) {
                callback(results[0].formatted_address);
            } else {
                callback('מיקום מדויק');
            }
        });
    }

    /**
     * Update field with pin drop data
     * @param {string} fieldId - Field ID
     * @param {number} lat - Latitude
     * @param {number} lng - Longitude
     * @param {string} address - Reverse geocoded address
     */
    updateFieldWithPinDrop(fieldId, lat, lng, address) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Update field value and datasets
    field.value = address + ' (מיקום מדויק)';
    field.dataset.lat = lat.toString();
    field.dataset.lng = lng.toString();
    field.dataset.isPinDropped = 'true';
    field.dataset.isGoogleAddress = 'true';
    field.dataset.physicalAddress = address;
}

    /**
     * Clear pin drop data from field
     * @param {string} fieldId - Field ID to clear
     */
    clearPinDropData(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;
        
        delete field.dataset.lat;
        delete field.dataset.lng;
        delete field.dataset.isPinDropped;
        field.dataset.isGoogleAddress = 'false';
    }

    /**
     * Clear all pin drop data
     */
    clearAllPinDrops() {
        this.addressFields.forEach(fieldId => {
            this.clearPinDropData(fieldId);
        });
    }

}

// Create singleton instance
const addressManager = new AddressManager();
window.addressManager = addressManager;