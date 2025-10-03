/**
 * Pricing Manager - Handles price calculations, tier management, and UI updates
 */

class PricingManager {
    constructor() {
        this.state = {
            basePrice: 0,
            outskirts: false,
            fromGarage: false,
            selectedTier: '',
            calculatedPrices: {
                regular: 0,
                plus25: 0,
                plus50: 0
            },
            finalPrice: 0,
            manualMode: false,
            discountEnabled: false,
            distanceData: null,
            
            // ✨ הוספת מבנה פירוט מחיר חדש
            breakdown: {
                vehicleBasePrice: 0,        // מחיר בסיס הרכב לפני הכל
                vehicleDescription: '',     // תיאור הרכב
                travelDistance: 0,          // ק"מ
                travelPrice: 0,             // עלות נסיעה
                workFees: 0,                // תוספת עבודות (כרגע תמיד 0)
                subtotalBeforeVAT: 0,       // סכום לפני מע"מ
                vatAmount: 0,               // סכום מע"מ
                subtotalWithVAT: 0,         // סכום אחרי מע"מ
                outskirtsAmount: 0,         // תוספת שטחים
                timeSurcharge: 0,           // תוספת זמן
                finalTotal: 0               // סכום סופי
            }
        };
        
        this.calculationTimeout = null;
        this.geocoder = null;
    }

    /**
     * Initialize pricing system
     */
    init() {
        this.initializeGoogleMaps();
        this.setupPriceChoiceHandlers();
        // this.setupOutskirtsToggle();
        this.setupManualPriceMode();
        this.setupAutomaticCalculation();
        this.ensureHiddenPriceField();
        this.refreshRecommendedTier();
        // this.setupGarageToggle();
        this.setupDiscountToggle();
    }

    /**
     * Initialize Google Maps for distance calculations
     */
    initializeGoogleMaps() {
        if (window.google && window.google.maps) {
            this.geocoder = new google.maps.Geocoder();
        }
    }

    /**
     * Setup price tier choice handlers
     */
    setupPriceChoiceHandlers() {
        const radios = document.querySelectorAll('input[name="priceType"]');
        if (!radios.length) return;

        radios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.state.selectedTier = radio.value;
                this.state.manualMode = radio.value === 'manual';
                this.updateFinalPrice();
            });
        });

        // Set initial state
        const checked = document.querySelector('input[name="priceType"]:checked');
        if (checked) {
            this.state.selectedTier = checked.value;
            this.state.manualMode = checked.value === 'manual';
        }
    }

    /**
     * Setup outskirts toggle functionality
     */
    setupOutskirtsToggle() {
    console.log('=== setupOutskirtsToggle STARTED ===');
    const toggle = document.getElementById('isOutskirts');
    console.log('Toggle element:', toggle);
    
    if (!toggle) {
        console.error('❌ isOutskirts not found');
        return;
    }

    const updateOutskirts = () => {
        console.log('📢 updateOutskirts called');
        const newValue = toggle.value === 'true';
        console.log('Current state:', this.state.outskirts, '→ New value:', newValue);
        
        if (this.state.outskirts !== newValue) {
            this.state.outskirts = newValue;
            console.log('✅ State updated, calling recalculatePrices');
            this.recalculatePrices();
        } else {
            console.log('⏭️ No change, skipping recalculate');
        }
    };

    toggle.addEventListener('change', () => {
        console.log('🔔 Change event on isOutskirts');
        updateOutskirts();
    });
}
    /**
     * Setup manual price mode
     */
    setupManualPriceMode() {
        const manualRadio = document.getElementById('price-manual');
        const manualInput = document.getElementById('customPrice');
        const manualWrap = document.querySelector('.manual-input-wrap');

        if (!manualRadio || !manualInput || !manualWrap) return;

        // Toggle manual input visibility
        const toggleManualInput = () => {
            const isManual = manualRadio.checked;
            manualWrap.style.display = isManual ? 'block' : 'none';
            this.state.manualMode = isManual;
            this.updateFinalPrice();
        };

        // Setup event listeners
        document.querySelectorAll('input[name="priceType"]')
            .forEach(r => r.addEventListener('change', toggleManualInput));

        manualInput.addEventListener('input', () => {
            this.updateFinalPrice();
        });

        // Initial state
        toggleManualInput();
    }

    /**
     * Setup automatic price calculation
     */
    setupAutomaticCalculation() {
        const fieldsToWatch = [
            'defectiveCarNumber',
            'defectiveSource',
            'defectiveDestination',
            'defectiveSource2',
            'defectiveDestination2'
        ];

        fieldsToWatch.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (!field) return;

            field.addEventListener('input', (e) => {
                const isAddressField = fieldId.includes('Source') || fieldId.includes('Destination');
                const isEmpty = !e.target.value.trim();
                
                if (isAddressField && isEmpty) {
                    this.debouncedCalculation(300);
                } else {
                    this.debouncedCalculation(1500);
                }
            });

            field.addEventListener('blur', () => {
                this.debouncedCalculation(500);
            });
        });

        // Watch for vehicle data changes
        this.setupVehicleDataWatcher();
    }

    /**
     * Setup watcher for vehicle data changes
     */
    setupVehicleDataWatcher() {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && 
                    mutation.attributeName === 'value') {
                    
                    if (mutation.target.id === 'dataSource_defective' || 
                        mutation.target.id === 'dataSource_defective2') {
                        this.debouncedCalculation(1000);
                    }
                }
            });
        });

        ['dataSource_defective', 'dataSource_defective2'].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                observer.observe(field, {
                    attributes: true,
                    attributeFilter: ['value']
                });
            }
        });
    }

    /**
     * Debounced price calculation
     * @param {number} delay - Delay in milliseconds
     */
    debouncedCalculation(delay = 1000) {
        if (this.calculationTimeout) {
            clearTimeout(this.calculationTimeout);
        }

        this.calculationTimeout = setTimeout(async () => {
            if (!this.canCalculatePrice()) {
                this.resetPrices();
                return;
            }

            await this.calculateAndUpdatePrice();
        }, delay);
    }

    /**
     * Check if price calculation is possible
     * @returns {boolean} - True if can calculate
     */
    canCalculatePrice() {
        try {
            if (!vehicleManager.isVehicleDataAvailable('defective')) {
                return false;
            }

            const addresses = this.getAddressesForCalculation();
            return addresses.source && addresses.destination &&
                   addresses.source.trim() && addresses.destination.trim();
        } catch (error) {
            return false;
        }
    }

    /**
     * Calculate and update price
     */
    async calculateAndUpdatePrice() {
        try {
            const result = await this.calculateTotalPrice();
            if (result.success) {
                this.updatePriceDisplay(result);
                this.updateFinalPrice();
                showNotification(SUCCESS_MESSAGES.PRICE_CALCULATED, 'success', 3000);
            }
        } catch (error) {
            console.error('Price calculation error:', error);
        }
    }

    /**
     * Calculate total price including base price, distance, and stops
     * @returns {object} - Calculation result
     */
    async calculateTotalPrice() {
        try {
            // Get base price from vehicle
            const vehicleData = vehicleManager.getVehicleBasePrice('defective');
            
            // Get route points
            const routeData = this.getAddressesForCalculation();
            
            // Calculate total distance for entire route
            let distanceData;
            
            if (routeData.routePoints.length < 2) {
                throw new Error('נדרש לפחות מוצא ויעד');
            }
            
            // Calculate distance for each segment
            let totalDistance = 0;
            let totalDuration = 0;
            const segments = [];

            console.log('🔍 Checking garage state:', this.state.fromGarage);
            // ⭐ הוסף את זה - אם יוצאים מחניון
            if (this.state.fromGarage) {
                console.log('🚗 ADDING GARAGE TO ROUTE!');
                const garageAddress = "המרכבה 47, חולון";
                const firstPoint = routeData.routePoints[0]; // המוצא
                
                if (firstPoint && firstPoint.address) {
                    const fromGarage = await this.calculateDistance(garageAddress, firstPoint.address);
                    
                    totalDistance += fromGarage.distanceKm;
                    totalDuration += fromGarage.durationValue;
                    
                    segments.push({
                        from: 'חניון גרר גולן',
                        to: firstPoint.label,
                        distance: fromGarage.distanceKm
                    });
                    
                    console.log('🚗 יציאה מחניון:', fromGarage.distanceKm, 'ק"מ');
                }
            }
            
            for (let i = 0; i < routeData.routePoints.length - 1; i++) {
                const from = routeData.routePoints[i];
                const to = routeData.routePoints[i + 1];
                
                const segmentDistance = await this.calculateDistance(from.address, to.address);
                
                totalDistance += segmentDistance.distanceKm;
                totalDuration += segmentDistance.durationValue;
                
                segments.push({
                    from: from.label,
                    to: to.label,
                    distance: segmentDistance.distanceKm
                });
            }
            
            distanceData = {
                success: true,
                distanceKm: totalDistance,
                distanceText: `${totalDistance} ק"מ`,
                duration: `${Math.round(totalDuration / 60)} דקות`,
                durationValue: totalDuration,
                segments: segments
            };
            
            // Save distance data to state
            this.state.distanceData = distanceData;
            
            // Calculate travel price
            const travelPrice = distanceData.distanceKm * PRICING_CONFIG.TRAVEL_PRICE_PER_KM;
            
            // 1. Base + Travel (ללא עצירות)
            const baseSubtotal = vehicleData.price + travelPrice;
            
            // 2. Outskirts addition (if applicable)
            const afterOutskirts = this.state.outskirts ? 
                Math.round(baseSubtotal * PRICING_CONFIG.OUTSKIRTS_MULTIPLIER) : 
                baseSubtotal;
            
            console.log('💰 Price calculation:');
            console.log('- Base:', vehicleData.price);
            console.log('- Travel:', travelPrice);
            console.log('- Subtotal:', baseSubtotal);
            console.log('- After outskirts:', afterOutskirts);
            
            // 3. Time surcharges (on subtotal before VAT)
            const tierPricesBeforeVAT = {
                regular: afterOutskirts,
                plus25: Math.round(afterOutskirts * PRICING_CONFIG.TIER_MULTIPLIERS.plus25),
                plus50: Math.round(afterOutskirts * PRICING_CONFIG.TIER_MULTIPLIERS.plus50)
            };
            
            // 4. VAT on each tier
            const tierPrices = {
                regular: Math.round(tierPricesBeforeVAT.regular * PRICING_CONFIG.VAT_RATE),
                plus25: Math.round(tierPricesBeforeVAT.plus25 * PRICING_CONFIG.VAT_RATE),
                plus50: Math.round(tierPricesBeforeVAT.plus50 * PRICING_CONFIG.VAT_RATE)
            };

            // Update state
            this.state.basePrice = tierPrices.regular;
            this.state.calculatedPrices = tierPrices;

            // Update price breakdown with new data
            this.updatePriceBreakdown({
                success: true,
                basePrice: vehicleData.price,
                vehicleType: vehicleData.description,
                distanceKm: distanceData.distanceKm,
                travelPrice: travelPrice,
                baseSubtotal: baseSubtotal,
                afterOutskirts: afterOutskirts,
                tierPricesBeforeVAT: tierPricesBeforeVAT
            });

            // Display distance info
            this.displayDistanceInfo(distanceData);

            return {
                success: true,
                basePrice: vehicleData.price,
                vehicleType: vehicleData.description,
                distanceKm: distanceData.distanceKm,
                distanceText: distanceData.distanceText,
                duration: distanceData.duration,
                travelPrice: travelPrice,
                subtotal: baseSubtotal,
                afterOutskirts: afterOutskirts,
                finalPrices: tierPrices,
                calculation: {
                    base: `${vehicleData.description}: ${vehicleData.price}₪`,
                    travel: `${distanceData.distanceKm} ק"מ × ${PRICING_CONFIG.TRAVEL_PRICE_PER_KM}₪ = ${travelPrice}₪`,
                    total: `סה"כ רגיל: ${tierPrices.regular}₪`
                }
            };

        } catch (error) {
            console.error('Price calculation error:', error);
            
            // Show error to user if it's about empty stops
            if (error.message.includes('עצירה')) {
                showNotification(error.message, 'error', 5000);
            }
            
            this.hideDistanceInfo();
            this.resetPriceBreakdown();
            return { success: false, error: error.message };
        }
    }
    

    displayDistanceInfo(distanceData) {
        const distanceDisplay = document.getElementById('distanceDisplay');
        if (distanceDisplay && distanceData) {
            const contentDiv = distanceDisplay.querySelector('.info-box-content');
            if (contentDiv) {
                contentDiv.innerHTML = `
                    <div class="distance-main">
                        <div class="distance-km">${distanceData.distanceKm} ק"מ</div>
                        <div class="distance-details">
                            <div class="distance-detail-item">
                                <span class="value">${distanceData.distanceText}</span>
                            </div>
                            <div class="distance-detail-item">
                                <span class="value">${distanceData.duration}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            distanceDisplay.style.display = 'block';
            distanceDisplay.classList.add('show');
            
            setTimeout(() => {
                distanceDisplay.classList.add('visible');
            }, 100);
        }
    }

    hideDistanceInfo() {
        const distanceDisplay = document.getElementById('distanceDisplay');
        if (distanceDisplay) {
            distanceDisplay.style.display = 'none';
            distanceDisplay.classList.remove('show');
            this.state.distanceData = null;
        }
    }

    /**
     * Calculate distance between two addresses
     * @param {string} sourceAddress - Source address
     * @param {string} destinationAddress - Destination address
     * @returns {Promise<object>} - Distance data
     */
    async calculateDistance(sourceAddress, destinationAddress) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('Google Maps not available'));
                return;
            }

            const service = new google.maps.DistanceMatrixService();

            service.getDistanceMatrix({
                origins: [sourceAddress],
                destinations: [destinationAddress],
                travelMode: google.maps.TravelMode.DRIVING,
                unitSystem: google.maps.UnitSystem.METRIC,
                region: 'IL'
            }, (response, status) => {
                if (status === 'OK') {
                    const element = response.rows[0].elements[0];
                    
                    if (element.status === 'OK') {
                        const distanceInMeters = element.distance.value;
                        const distanceInKm = Math.round(distanceInMeters / 1000);
                        
                        resolve({
                            success: true,
                            distanceKm: distanceInKm,
                            distanceText: element.distance.text,
                            duration: element.duration.text,
                            durationValue: element.duration.value
                        });
                    } else {
                        reject(new Error(getDistanceErrorMessage(element.status)));
                    }
                } else {
                    reject(new Error(`API error: ${status}`));
                }
            });
        });
    }

    /**
     * Get addresses for calculation
     * @returns {object} - Source and destination addresses
     */
    getAddressesForCalculation() {
        if (window.formManager && typeof window.formManager.collectRoutePoints === 'function') {
            const routePoints = window.formManager.collectRoutePoints();

            console.log('🧭 Route order for calculation:', 
                routePoints.map(p => `${p.type}(${p.address.slice(0,20)}...)`).join(' → ')
            );

            return {
                routePoints,
                hasStops: false,
                stopsCount: 0,
                source: routePoints.find(p => p.type === 'source')?.address || '',
                destination: routePoints.find(p => p.type === 'destination')?.address || ''
            };
        }

        // Fallback
        const sourceField = document.getElementById('defectiveSource');
        const destField = document.getElementById('defectiveDestination');
        
        return {
            routePoints: [
                { type: 'source', address: sourceField?.value || '', label: 'מוצא' },
                { type: 'destination', address: destField?.value || '', label: 'יעד' }
            ],
            hasStops: false,
            stopsCount: 0,
            source: sourceField?.value || '',
            destination: destField?.value || ''
        };
    }
   
    /**
     * Update price display in UI
     * @param {object} priceData - Calculation result
     */
    updatePriceDisplay(priceData) {
        if (!priceData.success) return;

        // חישוב מחירים (עם או בלי הנחה)
        let displayPrices = priceData.finalPrices;
        
        if (this.state.discountEnabled) {
            displayPrices = {
                regular: Math.round(priceData.finalPrices.regular * 0.9),
                plus25: Math.round(priceData.finalPrices.plus25 * 0.9),
                plus50: Math.round(priceData.finalPrices.plus50 * 0.9)
            };
        }

        // Update tier price displays
        const regularEl = document.getElementById('price-regular-amount');
        const plus25El = document.getElementById('price-plus25-amount');
        const plus50El = document.getElementById('price-plus50-amount');

        if (regularEl) regularEl.textContent = formatCurrency(displayPrices.regular);
        if (plus25El) plus25El.textContent = formatCurrency(displayPrices.plus25);
        if (plus50El) plus50El.textContent = formatCurrency(displayPrices.plus50);

        // Update state
        this.state.calculatedPrices = priceData.finalPrices; // המחירים המקוריים
    }

    /**
     * Reset all prices to zero
     */
    resetPrices() {
        const elements = [
            { id: 'price-regular-amount', text: '0₪' },
            { id: 'price-plus25-amount', text: '0₪' },
            { id: 'price-plus50-amount', text: '0₪' }
        ];

        elements.forEach(({ id, text }) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = text;
            }
        });

        this.state.calculatedPrices = { regular: 0, plus25: 0, plus50: 0 };
        this.updateFinalPrice();
        
        // ✨ הסתרת מידע המרחק
        this.hideDistanceInfo();
    }

    recalculatePrices() {
        console.log('🔄 recalculatePrices started');
        console.log('- state.fromGarage:', this.state.fromGarage);
        console.log('- state.outskirts:', this.state.outskirts);

        // אם אין עדיין חישוב בסיסי, לא נמשיך
        if (!this.state.breakdown.baseSubtotal) {
            console.warn("⚠️ אין baseSubtotal - מריצים חישוב מלא מחדש");
            this.calculateAndUpdatePrice(); // ← כאן תריצי את החישוב הראשי שלך
            return;
        }

        let baseSubtotal = this.state.breakdown.baseSubtotal;

        // אם הגרירה מהחניון – נוסיף חישוב מרחק נוסף
        if (this.state.fromGarage) {
            console.log("🚚 חישוב כולל חניון (המרכבה 47 חולון)");
            // כאן אפשר או להוסיף ק"מ קבוע או להריץ חישוב מסלול נוסף
            // לדוגמה: נוסיף 10 ק"מ קבועים
            baseSubtotal += 10 * PRICING_CONFIG.KM_RATE;
        }

        // שטחים
        let afterOutskirts = this.state.outskirts
            ? Math.round(baseSubtotal * PRICING_CONFIG.OUTSKIRTS_MULTIPLIER)
            : baseSubtotal;

        console.log('- baseSubtotal:', baseSubtotal);
        console.log('- afterOutskirts:', afterOutskirts);

        // עדכן breakdown
        this.state.breakdown.afterOutskirts = afterOutskirts;

        // חישוב טיירים לפני מע״מ
        const tierPricesBeforeVAT = {
            regular: afterOutskirts,
            plus25: Math.round(afterOutskirts * PRICING_CONFIG.TIER_MULTIPLIERS.plus25),
            plus50: Math.round(afterOutskirts * PRICING_CONFIG.TIER_MULTIPLIERS.plus50)
        };

        // חישוב אחרי מע״מ
        const tierPrices = {
            regular: Math.round(tierPricesBeforeVAT.regular * PRICING_CONFIG.VAT_RATE),
            plus25: Math.round(tierPricesBeforeVAT.plus25 * PRICING_CONFIG.VAT_RATE),
            plus50: Math.round(tierPricesBeforeVAT.plus50 * PRICING_CONFIG.VAT_RATE)
        };

        // עדכון state
        this.state.breakdown.tierPricesBeforeVAT = tierPricesBeforeVAT;
        this.state.calculatedPrices = tierPrices;
        this.state.basePrice = tierPrices.regular;

        // עדכון תצוגה
        this.updatePriceDisplay({ success: true, finalPrices: tierPrices });
        this.updateFinalPrice();
    }


    // recalculatePrices() {
    //     console.log('🔄 recalculatePrices started');
    //     console.log('- state.outskirts:', this.state.outskirts);
        
    //     // אם אין עדיין breakdown מלא, חזרי לחישוב מלא
    //     if (!this.state.breakdown.baseSubtotal) {
    //         return;
    //     }
        
    //     // עבוד עם הבסיס הנכון (לפני מע"מ ושטחים)
    //     const baseSubtotal = this.state.breakdown.baseSubtotal; // 640
        
    //     // חשב מחדש שטחים
    //     const afterOutskirts = this.state.outskirts ? 
    //         Math.round(baseSubtotal * PRICING_CONFIG.OUTSKIRTS_MULTIPLIER) : 
    //         baseSubtotal;
        
    //     console.log('- baseSubtotal:', baseSubtotal);
    //     console.log('- afterOutskirts:', afterOutskirts);
        
    //     // עדכן את הפירוט
    //     this.state.breakdown.outskirtsAmount = afterOutskirts - baseSubtotal;
    //     this.state.breakdown.afterOutskirts = afterOutskirts;
        
    //     // חשב מחדש טיירים
    //     const tierPricesBeforeVAT = {
    //         regular: afterOutskirts,
    //         plus25: Math.round(afterOutskirts * PRICING_CONFIG.TIER_MULTIPLIERS.plus25),
    //         plus50: Math.round(afterOutskirts * PRICING_CONFIG.TIER_MULTIPLIERS.plus50)
    //     };
        
    //     const tierPrices = {
    //         regular: Math.round(tierPricesBeforeVAT.regular * PRICING_CONFIG.VAT_RATE),
    //         plus25: Math.round(tierPricesBeforeVAT.plus25 * PRICING_CONFIG.VAT_RATE),
    //         plus50: Math.round(tierPricesBeforeVAT.plus50 * PRICING_CONFIG.VAT_RATE)
    //     };

    //     // עדכן המצב
    //     this.state.breakdown.tierPricesBeforeVAT = tierPricesBeforeVAT;
    //     this.state.calculatedPrices = tierPrices;
    //     this.state.basePrice = tierPrices.regular;
        
    //     this.updatePriceDisplay({ success: true, finalPrices: tierPrices });
    //     this.updateFinalPrice();
    // }

    /**
     * Get recommended tier based on date/time
     * @param {Date} dateObj - Date to check
     * @returns {string} - Recommended tier
     */
    getRecommendedTier(dateObj = new Date()) {
        if (!(dateObj instanceof Date)) return 'regular';

        const day = dateObj.getDay(); // 0=Sunday, 1=Monday, etc.
        const hours = dateObj.getHours();
        const minutes = dateObj.getMinutes();
        const totalMinutes = hours * 60 + minutes;

        // Weekend: Friday 14:00 → Sunday 06:59
        if (day === 5 && totalMinutes >= TIME_CONFIG.WEEKEND_FRIDAY_START * 60) return 'plus50';
        if (day === 6) return 'plus50'; // All Saturday
        if (day === 0 && totalMinutes <= TIME_CONFIG.WEEKEND_SUNDAY_END * 60) return 'plus50';

        // Night hours: 19:00-06:59 (Sunday-Thursday)
        const isSunToThu = day >= 0 && day <= 4;
        const isMonToFri = day >= 1 && day <= 5;
        
        if (isSunToThu && totalMinutes >= TIME_CONFIG.NIGHT_START * 60) return 'plus50';
        if (isMonToFri && totalMinutes <= TIME_CONFIG.NIGHT_END * 60) return 'plus50';

        // Evening hours: 15:00-18:59 (Sunday-Thursday)
        if (isSunToThu && totalMinutes >= TIME_CONFIG.EVENING_START * 60 && totalMinutes < TIME_CONFIG.NIGHT_START * 60) {
            return 'plus25';
        }

        return 'regular';
    }

    /**
     * Apply recommended tier highlighting
     * @param {string} tier - Tier to highlight
     */
    applyRecommendedHighlight(tier) {
        document.querySelectorAll('.price-card').forEach(card => {
            card.classList.remove('recommended');
        });

        const tierMap = {
            regular: '.price-card[data-type="regular"]',
            plus25: '.price-card[data-type="plus25"]',
            plus50: '.price-card[data-type="plus50"]'
        };

        const target = document.querySelector(tierMap[tier]);
        if (target) {
            target.classList.add('recommended');
        }
    }

    /**
     * Refresh recommended tier based on form date/time
     */
    refreshRecommendedTier() {
        const plannedDateTime = this.getPlannedDateTimeFromForm();
        const recommendedTier = this.getRecommendedTier(plannedDateTime);
        this.applyRecommendedHighlight(recommendedTier);
    }

    /**
     * Get planned date/time from form
     * @returns {Date} - Planned execution date/time
     */
    getPlannedDateTimeFromForm() {
        const isTodayActive = !!document.querySelector('[data-target="today"].active');
        const dateInput = document.getElementById('executionDate');
        const timeInput = document.getElementById('executionTime');

        if (isTodayActive) return new Date();

        const date = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();
        
        let hours = 12, minutes = 0;
        if (timeInput && timeInput.value) {
            const [h, m] = timeInput.value.split(':').map(Number);
            if (!Number.isNaN(h)) hours = h;
            if (!Number.isNaN(m)) minutes = m;
        }
        
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    /**
     * Update final price in hidden field
     */
    updateFinalPrice() {
        const priceField = document.getElementById('price');
        if (!priceField) return;

        // בדיקה אם יש טיר נבחר
        const selectedRadio = document.querySelector('input[name="priceType"]:checked');
        
        if (!selectedRadio) {
            // אף טיר לא נבחר - מחיר 0
            this.state.finalPrice = 0;
            priceField.value = '0';
            return;
        }

        if (this.state.manualMode) {
            const manualInput = document.getElementById('customPrice');
            const manualValue = manualInput?.value?.trim();
            if (manualValue && !isNaN(Number(manualValue))) {
                this.state.finalPrice = Number(manualValue);
                priceField.value = this.state.finalPrice.toString();
            } else {
                priceField.value = '';
            }
        } else {
            let amount = this.state.calculatedPrices[this.state.selectedTier] || 0;
            
            // החלת הנחה אם מופעלת
            if (this.state.discountEnabled) {
                amount = Math.round(amount * 0.9);
            }
            
            this.state.finalPrice = amount;
            priceField.value = amount.toString();
        }

        // ✨ NEW: עדכון הפירוט לפי הטיר החדש
        if (this.state.breakdown && this.state.breakdown.tierPricesBeforeVAT) {
            this.updateBreakdownForSelectedTier();
        }

        priceField.dataset.manuallyEdited = this.state.manualMode ? 'true' : 'false';
    }

    /**
     * Ensure hidden price field exists
     */
    ensureHiddenPriceField() {
        let priceField = document.getElementById('price');
        if (!priceField) {
            priceField = document.createElement('input');
            priceField.type = 'hidden';
            priceField.id = 'price';
            priceField.name = 'price';
            
            const form = document.getElementById('towingForm');
            if (form) {
                form.appendChild(priceField);
            }
        }
    }

    /**
     * Get current pricing state for form submission
     * @returns {object} - Pricing state
     */
    getPricingData() {
        return {
            outskirts: this.state.outskirts,
            selectedTier: this.state.selectedTier,
            manualMode: this.state.manualMode,
            finalPrice: this.state.finalPrice,
            calculatedPrices: { ...this.state.calculatedPrices },
            autoRecommendedTier: this.getRecommendedTier(),
            distanceData: this.state.distanceData ? { ...this.state.distanceData } : null,
            discountEnabled: this.state.discountEnabled  // הוספת מצב הנחה
        };
    }

    getDistanceData() {
        return this.state.distanceData ? { ...this.state.distanceData } : null;
    }

        /**
     * Get the current final price (ensures it's up-to-date)
     * @returns {number}
     */
    getFinalPrice() {
        // מוודא שהשדה החבוי מעודכן לפני ההחזרה
        this.updateFinalPrice();
        return Number(this.state.finalPrice) || 0;
    }

    /**
 * Return currently selected tier (regular / plus25 / plus50 / manual)
 * @returns {string}
 */
getSelectedTier() {
  return this.state.selectedTier;
}

    /**
     * Is manual price mode enabled?
     * @returns {boolean}
     */
    isManualMode() {
    return !!this.state.manualMode;
    }

    /**
     * Outskirts toggle value
     * @returns {boolean}
     */
    isOutskirts() {
    return !!this.state.outskirts;
    }

    /**
     * Return calculated tier prices snapshot
     * @returns {{regular:number, plus25:number, plus50:number}}
     */
    getCalculatedPrices() {
    return { ...this.state.calculatedPrices };
    }

    /**
     * Update price breakdown with detailed components
     * @param {object} data - Calculation data
     */
    updatePriceBreakdown(data) {
        if (!data || !data.success) {
            this.resetPriceBreakdown();
            return;
        }

        // Calculate outskirts amount
        const outskirtsAmount = data.afterOutskirts - data.baseSubtotal;
        
        // Update breakdown according to correct order
        this.state.breakdown = {
            vehicleBasePrice: data.basePrice || 0,
            vehicleDescription: data.vehicleType || 'גרירת רכב',
            travelDistance: data.distanceKm || 0,
            travelPrice: data.travelPrice || 0,
            workFees: 0, // Always 0
            
            // Totals according to calculation stages
            baseSubtotal: data.baseSubtotal || 0,                    // Base + Travel + Stops
            outskirtsAmount: outskirtsAmount,                        // Outskirts addition
            afterOutskirts: data.afterOutskirts || 0,               // After outskirts
            
            // Tier data (before VAT)
            tierPricesBeforeVAT: data.tierPricesBeforeVAT || {
                regular: 0,
                plus25: 0, 
                plus50: 0
            },
            
            // Currently selected tier
            selectedTier: this.state.selectedTier,
            
            // Time surcharge and VAT will be calculated based on selected tier
            timeSurcharge: 0,        // Calculated in updateFinalPrice
            subtotalBeforeVAT: 0,    // Calculated in updateFinalPrice  
            vatAmount: 0,            // Calculated in updateFinalPrice
            finalTotal: 0            // Calculated in updateFinalPrice
        };
        
        // Update for current tier
        this.updateBreakdownForSelectedTier();

        console.log('💰 Price breakdown updated:', this.state.breakdown);
    }



    /**
     * Update breakdown calculations for currently selected tier
     */
    updateBreakdownForSelectedTier() {
        const breakdown = this.state.breakdown;
        if (!breakdown.tierPricesBeforeVAT) return;
        
        // בדיקה אם יש טיר נבחר באמת
        const selectedRadio = document.querySelector('input[name="priceType"]:checked');
        console.log('🔍 Selected radio:', selectedRadio);
        console.log('🔍 State selectedTier:', this.state.selectedTier);
        
        if (!selectedRadio) {
            console.log('❌ אין רדיו נבחר - מאפס פירוט');
            // אין טיר נבחר - איפוס הפירוט
            breakdown.subtotalBeforeVAT = 0;
            breakdown.vatAmount = 0;
            breakdown.timeSurcharge = 0;
            breakdown.finalTotal = 0;
            return;
        }
        
        const selectedTier = this.state.manualMode ? 'manual' : selectedRadio.value;
        console.log('✅ טיר שנבחר:', selectedTier);
        
        if (selectedTier === 'manual') {
            // במחיר ידני - נחשב לאחור
            const manualPrice = this.state.finalPrice || 0;
            breakdown.subtotalBeforeVAT = Math.round(manualPrice / 1.18);
            breakdown.vatAmount = manualPrice - breakdown.subtotalBeforeVAT;
            breakdown.timeSurcharge = Math.max(0, breakdown.subtotalBeforeVAT - breakdown.afterOutskirts);
            breakdown.finalTotal = manualPrice;
        } else {
            // במחיר אוטומטי
            const beforeVAT = breakdown.tierPricesBeforeVAT[selectedTier] || 0;
            const afterVAT = Math.round(beforeVAT * 1.18);
            
            breakdown.subtotalBeforeVAT = beforeVAT;
            breakdown.vatAmount = afterVAT - beforeVAT;
            breakdown.timeSurcharge = beforeVAT - breakdown.afterOutskirts;
            breakdown.finalTotal = afterVAT;
        }
    }
    /**
     * Setup garage toggle functionality
     */
    setupGarageToggle() {
    console.log('=== setupGarageToggle STARTED ===');
    const toggle = document.getElementById('isFromGarage');
    console.log('Toggle element:', toggle);
    
    if (!toggle) {
        console.error('❌ isFromGarage not found');
        return;
    }

    const updateGarage = () => {
        console.log('📢 updateGarage called');
        const newValue = toggle.value === 'true';
        console.log('Current state:', this.state.fromGarage, '→ New value:', newValue);
        
        if (this.state.fromGarage !== newValue) {
            this.state.fromGarage = newValue;
            console.log('✅ State updated, calling debouncedCalculation');
            this.debouncedCalculation(500);
        } else {
            console.log('⏭️ No change, skipping recalculate');
        }
    };

    toggle.addEventListener('change', () => {
        console.log('🔔 Change event on isFromGarage');
        updateGarage();
    });
}

    /**
     * Setup discount toggle functionality
     */
    setupDiscountToggle() {
        const discountBtn = document.getElementById('discountToggle');
        if (!discountBtn) return;

        discountBtn.addEventListener('click', () => {
            this.toggleDiscount();
        });
    }

    /**
     * Toggle discount on/off
     */
    toggleDiscount() {
        // לא ניתן להפעיל הנחה במחיר ידני
        if (this.state.manualMode) {
            console.log('לא ניתן להפעיל הנחה במחיר ידני');
            return;
        }

        // בדיקה שיש מחירים מחושבים
        if (this.state.calculatedPrices.regular === 0) {
            console.log('יש לחשב מחיר תחילה כדי להפעיל הנחה');
            return;
        }

        // החלפת מצב הנחה
        this.state.discountEnabled = !this.state.discountEnabled;
        
        // עדכון תצוגת הכפתור
        this.updateDiscountButtonDisplay();
        
        // עדכון מחירים
        this.updatePriceDisplay({ 
            success: true, 
            finalPrices: this.state.calculatedPrices 
        });
        this.updateFinalPrice();
    }

    /**
     * Update discount button display
     */
    updateDiscountButtonDisplay() {
        const discountBtn = document.getElementById('discountToggle');
        if (!discountBtn) return;

        if (this.state.discountEnabled) {
            discountBtn.classList.add('active');
            discountBtn.innerHTML = '<i class="fas fa-percent"></i> הנחה מופעלת';
        } else {
            discountBtn.classList.remove('active');
            discountBtn.innerHTML = '<i class="fas fa-percent"></i> הנחה 10%';
        }
    }


    /**
     * Reset price breakdown to empty state
     */
    resetPriceBreakdown() {
        this.state.breakdown = {
            vehicleBasePrice: 0,
            vehicleDescription: '',
            travelDistance: 0,
            travelPrice: 0,
            workFees: 0,
            subtotalBeforeVAT: 0,
            vatAmount: 0,
            subtotalWithVAT: 0,
            outskirtsAmount: 0,
            timeSurcharge: 0,
            finalTotal: 0
        };
    }

    /**
     * Get current price breakdown for form submission
     * @returns {object} - Price breakdown object
     */
    getPriceBreakdown() {
        return { ...this.state.breakdown };
    }

}

// Create singleton instance
const pricingManager = new PricingManager();
window.pricingManager = pricingManager;