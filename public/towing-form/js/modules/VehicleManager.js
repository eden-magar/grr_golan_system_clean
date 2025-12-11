/**
 * Vehicle Manager - Handles vehicle lookup, data storage, and UI updates
 */

class VehicleManager {
    constructor() {
        this.vehicleData = new Map();
        this.searchCache = new Map();
        this.activeSearches = new Set();
        
        this.fieldMapping = {
            'defective': {
                number: 'defectiveCarNumber',
                type: 'defectiveCarType'
            },
            'defective2': {
                number: 'defectiveCarNumber2',
                type: 'defectiveCarType2'
            },
            'working': {
                number: 'workingCarNumber',
                type: 'workingCarType'
            },
            'exchangeDefective': {
                number: 'exchangeDefectiveNumber',
                type: 'exchangeDefectiveType'
            }
        };
    }

    /**
     * Initialize vehicle lookup functionality
     */
    init() {
        this.setupVehicleLookup();
        this.setupLicenseNumberSanitization();
    }

    /**
     * Setup vehicle lookup for all vehicle number fields
     */
    setupVehicleLookup() {
        const vehicleFields = [
            { id: 'defectiveCarNumber', context: 'defective' },
            { id: 'defectiveCarNumber2', context: 'defective2' },
            { id: 'workingCarNumber', context: 'working' },
            { id: 'exchangeDefectiveNumber', context: 'exchangeDefective' }
        ];

        vehicleFields.forEach(({ id, context }) => {
            const field = document.getElementById(id);
            if (!field) return;

            this.setupFieldListeners(field, context);
        });
    }

    /**
     * Setup event listeners for a vehicle number field
     * @param {HTMLElement} field - Vehicle number input field
     * @param {string} context - Vehicle context (defective, working, etc.)
     */
    setupFieldListeners(field, context) {
        let lastSearchedValue = '';
        let hasSearched = false;

        // Search immediately after paste
        field.addEventListener('paste', (e) => {
            setTimeout(() => {
                const cleanValue = this.sanitizeLicenseNumber(field.value);
                if (cleanValue.length >= 5 && cleanValue !== lastSearchedValue) {
                    this.lookupVehicle(cleanValue, context);
                    lastSearchedValue = cleanValue;
                    hasSearched = true;
                }
            }, 10);
        });

        // Search when leaving field (if not searched yet)
        field.addEventListener('blur', () => {
            const cleanValue = this.sanitizeLicenseNumber(field.value);
            if (cleanValue.length >= 5 && cleanValue !== lastSearchedValue && !hasSearched) {
                this.lookupVehicle(cleanValue, context);
                lastSearchedValue = cleanValue;
                hasSearched = true;
            }
        });

        // Reset search state when changing value
        field.addEventListener('input', () => {
            const cleanValue = this.sanitizeLicenseNumber(field.value);
            if (cleanValue !== lastSearchedValue) {
                hasSearched = false;
                this.clearDataSource(context);
                
                // Hide vehicle type field if number too short
                if (cleanValue.length < 5) {
                    this.hideVehicleTypeField(context);
                    this.clearVehicleTypeField(context);
                }
            }
        });
    }

    /**
     * Setup license number sanitization for all license fields
     */
    setupLicenseNumberSanitization() {
        const licenseInputs = [
            'defectiveCarNumber',
            'defectiveCarNumber2',
            'workingCarNumber',
            'exchangeDefectiveNumber'
        ];

        licenseInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', () => {
                    const cursorPos = input.selectionStart;
                    const cleanValue = this.sanitizeLicenseNumber(input.value);
                    input.value = cleanValue;
                    input.setSelectionRange(cursorPos, cursorPos);
                });
            }
        });
    }

    /**
     * Sanitize license number - keep only digits
     * @param {string} license - Raw license input
     * @returns {string} - Clean license number
     */
    sanitizeLicenseNumber(license) {
        return license.replace(/[^0-9]/g, '');
    }

    /**
     * Look up vehicle data by license number
     * @param {string} licenseNumber - Vehicle license number
     * @param {string} context - Vehicle context
     */
    async lookupVehicle(licenseNumber, context) {
        const cleanLicense = this.sanitizeLicenseNumber(licenseNumber);
        
        if (cleanLicense.length < 5) return;

        // Prevent duplicate searches
        const searchKey = `${cleanLicense}-${context}`;
        if (this.activeSearches.has(searchKey)) return;
        this.activeSearches.add(searchKey);

        // Check cache first
        if (this.searchCache.has(cleanLicense)) {
            const cachedResult = this.searchCache.get(cleanLicense);
            this.handleVehicleResult(cachedResult, context);
            this.activeSearches.delete(searchKey);
            return;
        }

        this.showLoadingIndicator(context, true);
        showNotification('🔍 מחפש מידע רכב במאגרי משרד התחבורה...', 'info');

        try {
            const result = await apiManager.lookupVehicle(cleanLicense);
            
            // Cache the result
            this.searchCache.set(cleanLicense, result);
            
            this.handleVehicleResult(result, context);

        } catch (error) {
            console.error('Vehicle lookup error:', error);
            this.handleVehicleNotFound(context);
        } finally {
            this.showLoadingIndicator(context, false);
            this.activeSearches.delete(searchKey);
            
            // Clean up notifications
            setTimeout(() => {
                document.querySelectorAll('[style*="top: 20px"]').forEach(el => el.remove());
            }, 100);
        }
    }

    /**
     * Handle successful vehicle lookup result
     * @param {object} result - API response
     * @param {string} context - Vehicle context
     */
    handleVehicleResult(result, context) {
        if (result.success) {
            this.fillVehicleData(result.vehicle, result.status, result.towTypes, context);
            this.saveDataSource(result, context);
            this.showVehicleStatusWarnings(result.status);
        } else {
            this.handleVehicleNotFound(context);
        }
    }

    /**
     * Handle vehicle not found scenario
     * @param {string} context - Vehicle context
     */
    handleVehicleNotFound(context) {
        const typeFieldId = this.getCarTypeFieldId(context);
        this.showVehicleTypeField(typeFieldId);
        
        const typeField = document.getElementById(typeFieldId);
        if (typeField) {
            typeField.placeholder = 'נא להזין סוג רכב';
            typeField.value = '';
        }
        
        this.showVehicleInfo({}, {}, [], context);
    }

    /**
     * Fill vehicle data into form fields
     * @param {object} vehicle - Vehicle data
     * @param {object} status - Vehicle status
     * @param {array} towTypes - Available tow types
     * @param {string} context - Vehicle context
     */
    fillVehicleData(vehicle, status, towTypes, context) {
        const typeFieldId = this.getCarTypeFieldId(context);
        const typeField = document.getElementById(typeFieldId);
        
        if (!typeField) return;

        console.log('🚗 Vehicle data received:', vehicle);

        // Create vehicle description
        let vehicleDescription = '';
        if (vehicle.manufacturer) vehicleDescription += vehicle.manufacturer;
        if (vehicle.model) vehicleDescription += (vehicleDescription ? ' ' : '') + vehicle.model;
        if (vehicle.year) vehicleDescription += (vehicleDescription ? ' ' : '') + vehicle.year;

        typeField.value = sanitizeText(vehicleDescription);

        // Save ALL vehicle data as data attributes
        typeField.dataset.color = vehicle.color || '';
        typeField.dataset.gear = vehicle.gear || vehicle.transmission || vehicle.gearType || '';
        typeField.dataset.gearType = vehicle.gearType || vehicle.gear || vehicle.transmission || '';
        typeField.dataset.machineryType = vehicle.machineryType || '';
        typeField.dataset.selfWeight = vehicle.selfWeight || '';
        typeField.dataset.selfWeightTon = vehicle.selfWeightTon || '';
        typeField.dataset.totalWeight = vehicle.totalWeight || '';
        typeField.dataset.totalWeightTon = vehicle.totalWeightTon || '';
        typeField.dataset.fuelType = vehicle.fuelType || '';
        typeField.dataset.driveType = vehicle.driveType || '';
        typeField.dataset.driveTechnology = vehicle.driveTechnology || '';
        typeField.dataset.engineVolume = vehicle.engineVolume || '';
        typeField.dataset.trimLevel = vehicle.trimLevel || '';

        console.log(`✅ Data saved for ${context}:`, {
            color: typeField.dataset.color,
            fuelType: typeField.dataset.fuelType,
            gear: typeField.dataset.gear,
            driveType: typeField.dataset.driveType,
            totalWeight: typeField.dataset.totalWeight
        });

        // Show vehicle type field
        this.showVehicleTypeField(typeFieldId);

        // Add visual feedback
        typeField.style.backgroundColor = '#e8f5e8';
        typeField.style.border = '2px solid #4caf50';

        // Remove styling after delay
        setTimeout(() => {
            typeField.style.backgroundColor = '';
            typeField.style.border = '';
        }, 2000);

        // Show vehicle info
        this.showVehicleInfo(vehicle, status, towTypes, context);
        
        // הפעלת חישוב מחיר מחדש לאחר טעינת נתוני רכב
        if (window.pricingManager && typeof window.pricingManager.debouncedCalculation === 'function') {
            window.pricingManager.debouncedCalculation(1000);
        }
    }

    /**
     * Save data source information
     * @param {object} result - API result
     * @param {string} context - Vehicle context
     */
    saveDataSource(result, context) {
        const src = result.source || result?.vehicle?.source || null;
        if (!src) return;

        const hiddenId = `dataSource_${context}`;
        let hidden = document.getElementById(hiddenId);
        
        if (!hidden) {
            hidden = document.createElement('input');
            hidden.type = 'hidden';
            hidden.id = hiddenId;
            hidden.name = hiddenId;
            
            const numberFieldId = this.getCarNumberFieldId(context);
            const form = document.getElementById(numberFieldId)?.closest('form');
            if (form) {
                form.appendChild(hidden);
            }
        }
        
        hidden.value = JSON.stringify(src);
        this.vehicleData.set(context, result);
    }

    /**
     * Clear data source for context
     * @param {string} context - Vehicle context
     */
    clearDataSource(context) {
        const hiddenId = `dataSource_${context}`;
        const hidden = document.getElementById(hiddenId);
        if (hidden) {
            hidden.value = '';
        }
        this.vehicleData.delete(context);
    }

    /**
     * Show vehicle status warnings
     * @param {object} status - Vehicle status object
     */
    showVehicleStatusWarnings(status) {
        if (status.isCanceled) {
            showNotification('🚫 הרכב מבוטל סופית ואינו כשיר לנסיעה!', 'error');
        } else if (status.isInactive) {
            showNotification('⚠️ הרכב לא מופיע כרכב פעיל במאגר משרד התחבורה', 'warning');
        }
    }

    /**
     * Show vehicle information display
     * @param {object} vehicle - Vehicle data
     * @param {object} status - Vehicle status
     * @param {array} towTypes - Available tow types
     * @param {string} context - Vehicle context
     */
    showVehicleInfo(vehicle, status, towTypes, context) {
        const fieldId = this.getCarTypeFieldId(context);
        const field = document.getElementById(fieldId);
        if (!field) return;

        // Remove existing info
        const existingInfo = field.parentNode.querySelector('.vehicle-info-display');
        if (existingInfo) {
            existingInfo.remove();
        }

        // Create source info
        const source = vehicle.source;
        let sourceText = 'מאגר ממשלתי';

        if (source) {
            const typeMap = {
                private: 'רכב פרטי',
                motorcycle: 'דו-גלגלי',
                heavy: 'מעל 3.5 טון',
                machinery: 'צמ"ה'
            };

            const statusMap = {
                regular: 'פעיל',
                canceled: 'מבוטל',
                inactive: 'לא פעיל'
            };

            const vehicleType = typeMap[source.type] || '';
            const vehicleStatus = statusMap[source.category] || '';

            sourceText = [vehicleType, vehicleStatus].filter(Boolean).join(' • ');
        }

        // Collect all available info - בסדר הנכון
        const additionalInfo = [];

        // Check if this is machinery (צמ"ה)
        const isMachinery = source && source.type === 'machinery';

        if (isMachinery) {
            // מידע ספציפי לצמ"ה
            const machineryType = vehicle.machineryType || field.dataset.machineryType;
            if (machineryType) {
                additionalInfo.push(`סוג צמ"ה: ${machineryType}`);
            }

            const selfWeightTon = vehicle.selfWeightTon || field.dataset.selfWeightTon;
            if (selfWeightTon && parseFloat(selfWeightTon) > 0) {
                additionalInfo.push(`משקל עצמי: ${selfWeightTon} טון`);
            }

            const totalWeightTon = vehicle.totalWeightTon || field.dataset.totalWeightTon;
            if (totalWeightTon && parseFloat(totalWeightTon) > 0) {
                additionalInfo.push(`משקל כולל: ${totalWeightTon} טון`);
            }
        } else {
            // מידע לרכבים רגילים

            // 1. צבע - COLOR
            const color = vehicle.color || field.dataset.color;
            if (color) {
                additionalInfo.push(`צבע: ${color}`);
            }

            // 2. דלק - Fuel type
            const fuelType = vehicle.fuelType || field.dataset.fuelType;
            if (fuelType) {
                additionalInfo.push(`דלק: ${fuelType}`);
            }

            // 3. גיר - Gear
            const gearType = vehicle.gear || vehicle.gearType || vehicle.transmission || field.dataset.gear || field.dataset.gearType;
            if (gearType) {
                additionalInfo.push(`גיר: ${gearType}`);
            }

            // 4. הנעה - Drive type
            const driveType = vehicle.driveType || field.dataset.driveType;
            if (driveType) {
                additionalInfo.push(`הנעה: ${driveType}`);
            }

            // 5. משקל - Weight
            const totalWeight = vehicle.totalWeight || field.dataset.totalWeight;
            const selfWeight = vehicle.selfWeight || field.dataset.selfWeight;
            if (totalWeight && parseFloat(totalWeight) > 0) {
                additionalInfo.push(`משקל כולל: ${parseFloat(totalWeight).toLocaleString()} ק"ג`);
            } else if (selfWeight && parseFloat(selfWeight) > 0) {
                additionalInfo.push(`משקל עצמי: ${parseFloat(selfWeight).toLocaleString()} ק"ג`);
            }
        }

        // Create display div
        const infoDiv = document.createElement('div');
        infoDiv.className = 'vehicle-info-display';
        infoDiv.style.cssText = `
            margin-top: 5px;
            padding: 8px 12px;
            background: #f0f9ff;
            border: 1px solid #bfdbfe;
            border-radius: 4px;
            font-size: 12px;
            color: #1e40af;
            line-height: 1.6;
        `;

        // Build display text
        let fullText = `מקור: ${sourceText}`;
        if (additionalInfo.length > 0) {
            fullText += '\n' + additionalInfo.join(' • ');
        }

        infoDiv.textContent = fullText;
        infoDiv.style.whiteSpace = 'pre-line';

        field.parentNode.appendChild(infoDiv);
    }

    /**
     * Show/hide loading indicator
     * @param {string} context - Vehicle context
     * @param {boolean} show - Show or hide
     */
    showLoadingIndicator(context, show) {
        const fieldId = this.getCarTypeFieldId(context);
        const field = document.getElementById(fieldId);
        if (!field) return;

        const loadingId = `loading-${context}`;
        let loadingDiv = document.getElementById(loadingId);

        if (show) {
            if (!loadingDiv) {
                loadingDiv = document.createElement('div');
                loadingDiv.id = loadingId;
                loadingDiv.style.cssText = `
                    margin-top: 5px;
                    padding: 8px;
                    background: #fef3c7;
                    border: 1px solid #f59e0b;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #92400e;
                    text-align: center;
                `;
                loadingDiv.innerHTML = '🔍 מחפש מידע רכב...';
                field.parentNode.appendChild(loadingDiv);
            }
        } else {
            if (loadingDiv) {
                loadingDiv.remove();
            }
        }
    }

    /**
     * Get car type field ID for context
     * @param {string} context - Vehicle context
     * @returns {string} - Field ID
     */
    getCarTypeFieldId(context) {
        const fieldMap = {
            'defective': 'defectiveCarType',
            'defective2': 'defectiveCarType2',
            'working': 'workingCarType',
            'exchangeDefective': 'exchangeDefectiveType'
        };
        return fieldMap[context];
    }

    /**
     * Get car number field ID for context
     * @param {string} context - Vehicle context
     * @returns {string} - Field ID
     */
    getCarNumberFieldId(context) {
        const fieldMap = {
            'defective': 'defectiveCarNumber',
            'defective2': 'defectiveCarNumber2',
            'working': 'workingCarNumber',
            'exchangeDefective': 'exchangeDefectiveNumber'
        };
        return fieldMap[context];
    }

    /**
     * Show vehicle type field
     * @param {string} fieldId - Field ID
     */
    showVehicleTypeField(fieldId) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.closest('.form-group').classList.remove('vehicle-type-hidden');
        }
    }

    /**
     * Hide vehicle type field
     * @param {string} context - Vehicle context
     */
    hideVehicleTypeField(context) {
        const typeFieldId = this.getCarTypeFieldId(context);
        const field = document.getElementById(typeFieldId);
        if (field) {
            const formGroup = field.closest('.form-group');
            if (formGroup) {
                formGroup.classList.add('vehicle-type-hidden');
            }
        }
    }

    /**
     * Clear vehicle type field value and data
     * @param {string} context - Vehicle context
     */
    clearVehicleTypeField(context) {
        const typeFieldId = this.getCarTypeFieldId(context);
        const typeField = document.getElementById(typeFieldId);
        if (typeField) {
            typeField.value = '';
            // Clear all data attributes
            Object.keys(typeField.dataset).forEach(key => {
                delete typeField.dataset[key];
            });
        }
    }

    /**
     * Check if vehicle data is available for context
     * @param {string} context - Vehicle context
     * @returns {boolean} - True if data available
     */
    isVehicleDataAvailable(context) {
        return this.vehicleData.has(context);
    }

    /**
     * Get vehicle data for context
     * @param {string} context - Vehicle context
     * @returns {object|null} - Vehicle data or null
     */
    getVehicleData(context) {
        return this.vehicleData.get(context) || null;
    }

    /**
     * Get vehicle base price for context
     * @param {string} context - Vehicle context
     * @returns {object} - Price data {price, type, description}
     */
    getVehicleBasePrice(context = 'defective') {
        try {
            const dataSourceId = `dataSource_${context}`;
            const dataSourceElement = document.getElementById(dataSourceId);

            if (!dataSourceElement || !dataSourceElement.value) {
                console.log('No vehicle data source, using default price');
                return { price: 200, type: 'default', description: 'מחיר בסיס (ברירת מחדל)' };
            }

            const sourceData = JSON.parse(dataSourceElement.value);
            const vehicleType = sourceData.type;

            const result = PRICING_CONFIG.BASE_PRICES[vehicleType] || PRICING_CONFIG.BASE_PRICES.private;
            const typeNames = {
                'private': 'רכב פרטי',
                'motorcycle': 'דו-גלגלי',
                'heavy': 'מעל 3.5 טון',
                'machinery': 'צמ"ה'
            };

            console.log(`Vehicle type: ${vehicleType}, Base price: ${result}₪`);

            return {
                price: result,
                type: vehicleType,
                description: typeNames[vehicleType] || 'לא מזוהה'
            };

        } catch (error) {
            console.error('Error reading vehicle data:', error);
            return { price: 200, type: 'error', description: 'שגיאה - מחיר ברירת מחדל' };
        }
    }
}

// Create singleton instance
const vehicleManager = new VehicleManager();
window.vehicleManager = vehicleManager;