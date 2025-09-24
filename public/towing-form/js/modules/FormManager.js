/**
 * Form Manager - Coordinates the entire form functionality
 */

class FormManager {
    constructor() {
        this.currentStep = 1;
        this.formData = {};
        this.isValid = false;
        this.loadingModal = null;
        this.successModal = null;
        this._submitting = false;
        
        this.elements = {
            mainForm: null,
            summaryPage: null,
            defectiveCarForm: null,
            exchangeForm: null,
            secondDefectiveCarForm: null,
            addCarButtonContainer: null
        };
    }

    /**
     * Initialize form manager
     */
    init() {
        this.cacheElements();
        this.setupFormEvents();
        this.setupDateTimeControls();
        this.setupTowingTypeChange();
        this.setupSecondCarButtons();
        this.setupSharedLocationOptions();
        this.setupPhoneSanitization();
        this.setupCreditCardFormatting();
        this.setupPaymentTypeButtons();
        this.setupDefectSelector();
        this.setupTowSelector();
        this.initializeDateTime();
        this.checkCompanySpecificFeatures();
        this.checkAdminStatus();
    }

    /**
     * Cache DOM elements for better performance
     */
    cacheElements() {
        this.elements = {
            mainForm: document.getElementById('towingForm'),
            summaryPage: document.getElementById('summaryPage'),
            defectiveCarForm: document.getElementById('defectiveCarForm'),
            exchangeForm: document.getElementById('exchangeForm'),
            secondDefectiveCarForm: document.getElementById('secondDefectiveCarForm'),
            addCarButtonContainer: document.getElementById('addCarButtonContainer'),
            towingTypeSelect: document.getElementById('towingType'),
            backToEdit: document.getElementById('backToEdit'),
            confirmSubmit: document.getElementById('confirmSubmit'),
            submitToSummary: document.getElementById('submitToSummary')
        };
    }

    /**
     * Setup main form event handlers
     */
    setupFormEvents() {
        if (this.elements.mainForm) {
            this.elements.mainForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        }

        if (this.elements.submitToSummary) {
            this.elements.submitToSummary.addEventListener('click', (e) => {
                e.preventDefault();
                this.triggerFormSubmit();
            });
        }

        if (this.elements.backToEdit) {
            this.elements.backToEdit.addEventListener('click', () => this.showMainForm());
        }

        if (this.elements.confirmSubmit) {
            const btn = this.elements.confirmSubmit;
            if (btn) {
            const clone = btn.cloneNode(true); // מסיר מאזינים קודמים
            btn.parentNode.replaceChild(clone, btn);
            this.elements.confirmSubmit = clone;
            }
            this.elements.confirmSubmit.addEventListener('click', (e) => this.handleFinalSubmit(e));
        }

        // Auto-generate order number on any field focus
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.id !== 'orderNumber') {
                element.addEventListener('focus', () => this.setDefaultOrderNumber());
            }
        });
    }

    /**
     * Setup date and time controls
     */
    setupDateTimeControls() {
        // Date toggle buttons
        const dateButtons = document.querySelectorAll('[data-target="today"], [data-target="other-date"]');
        const datePicker = document.getElementById('datePicker');
        
        dateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                dateButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                if (button.dataset.target === 'today') {
                    datePicker?.classList.add('hidden');
                    document.getElementById('executionDate').value = getCurrentDate();
                } else {
                    datePicker?.classList.remove('hidden');
                }
                
                // Refresh price recommendations
                pricingManager.refreshRecommendedTier();
            });
        });

        // Date/time change listeners for price recommendations
        const execDate = document.getElementById('executionDate');
        const execTime = document.getElementById('executionTime');
        
        if (execDate) execDate.addEventListener('change', () => pricingManager.refreshRecommendedTier());
        if (execTime) execTime.addEventListener('change', () => pricingManager.refreshRecommendedTier());
    }

    /**
     * Setup towing type change handler
     */
    setupTowingTypeChange() {
        if (!this.elements.towingTypeSelect) return;

        this.elements.towingTypeSelect.addEventListener('change', () => {
            this.handleTowingTypeChange();
        });
    }

    /**
     * Handle towing type change
     */
    handleTowingTypeChange() {
        const towingType = this.elements.towingTypeSelect.value;
        
        // Hide all forms first
        this.hideAllSubForms();
        
        // Show relevant form
        if (towingType === 'defective') {
            this.elements.defectiveCarForm?.classList.remove('hidden');
            this.showAddCarButton();
        } else if (towingType === 'exchange') {
            this.elements.exchangeForm?.classList.remove('hidden');
        }
        
        updateRequiredFieldsVisibility();
        setTimeout(() => this.setupPhoneSanitization(), 100);
    }

    /**
     * Hide all sub-forms
     */
    hideAllSubForms() {
        this.elements.defectiveCarForm?.classList.add('hidden');
        this.elements.exchangeForm?.classList.add('hidden');
        this.elements.secondDefectiveCarForm?.classList.add('hidden');
        this.hideAddCarButton();
        vehicleManager.clearDataSource('defective2');
    }

    /**
     * Setup second car buttons
     */
    setupSecondCarButtons() {
        const addBtn = document.getElementById('addSecondDefectiveCar');
        const removeBtn = document.getElementById('removeSecondDefectiveCar');

        if (addBtn) {
            addBtn.addEventListener('click', () => this.addSecondCar());
        }

        if (removeBtn) {
            removeBtn.addEventListener('click', () => this.removeSecondCar());
        }
    }

    /**
     * Add second defective car
     */
    addSecondCar() {
        if (this.elements.secondDefectiveCarForm) {
            this.elements.secondDefectiveCarForm.classList.remove('hidden');
            this.hideAddCarButton();
            this.updateShareOptions();
            updateRequiredFieldsVisibility();
            setTimeout(() => this.setupPhoneSanitization(), 100);
        }
    }

    /**
     * Remove second defective car
     */
    removeSecondCar() {
        if (!this.elements.secondDefectiveCarForm) return;

        this.elements.secondDefectiveCarForm.classList.add('hidden');
        vehicleManager.clearDataSource('defective2');
        this.showAddCarButton();
        
        // Clear all fields in second car form
        clearFormFields(this.elements.secondDefectiveCarForm);
        
        // Reset choice buttons
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Hide additional fields
        this.hideSecondCarFields();
        
        updateRequiredFieldsVisibility();
        setTimeout(() => this.setupPhoneSanitization(), 100);
    }

    /**
     * Hide second car additional fields
     */
    hideSecondCarFields() {
        const sourceFields = document.getElementById('secondCarSourceFields');
        const destFields = document.getElementById('secondCarDestinationFields');
        const sourcePreview = document.getElementById('sourcePreview');
        const destPreview = document.getElementById('destinationPreview');
        
        sourceFields?.classList.add('hidden');
        destFields?.classList.add('hidden');
        
        if (sourcePreview) sourcePreview.style.display = 'none';
        if (destPreview) destPreview.style.display = 'none';
    }

    /**
     * Show/hide add car button
     */
    showAddCarButton() {
        if (this.elements.addCarButtonContainer) {
            this.elements.addCarButtonContainer.classList.remove('hidden');
            this.elements.addCarButtonContainer.style.visibility = 'visible';
        }
    }

    hideAddCarButton() {
        if (this.elements.addCarButtonContainer) {
            this.elements.addCarButtonContainer.classList.add('hidden');
            this.elements.addCarButtonContainer.style.visibility = 'hidden';
        }
    }

    /**
     * Setup shared location options for second car
     */
    setupSharedLocationOptions() {
        document.querySelectorAll('.choice-btn').forEach(button => {
            button.addEventListener('click', () => this.handleChoiceButton(button));
        });
        
        // Setup preview updates
        this.setupPreviewUpdates();
    }

    /**
     * Handle choice button clicks
     */
    handleChoiceButton(button) {
        const field = button.dataset.field;
        const target = button.dataset.target;
        
        // Remove selection from group
        document.querySelectorAll(`.choice-btn[data-field="${field}"]`).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Select current button
        button.classList.add('selected');
        
        // Remove error styling
        const parentGroup = button.closest('.required-choice');
        parentGroup?.classList.remove('error');
        
        // Handle field visibility
        this.handleChoiceFieldVisibility(field, target);
    }

    /**
     * Handle field visibility based on choice
     */
    handleChoiceFieldVisibility(field, target) {
        if (field === 'source') {
            const sourceFields = document.getElementById('secondCarSourceFields');
            const sourcePreview = document.getElementById('sourcePreview');
            
            if (target === 'same-source') {
                sourceFields?.classList.add('hidden');
                this.updateSourcePreview();
            } else {
                sourceFields?.classList.remove('hidden');
                if (sourcePreview) sourcePreview.style.display = 'none';
            }
        } else if (field === 'destination') {
            const destFields = document.getElementById('secondCarDestinationFields');
            const destPreview = document.getElementById('destinationPreview');
            
            if (target === 'same-destination') {
                destFields?.classList.add('hidden');
                this.updateDestinationPreview();
            } else {
                destFields?.classList.remove('hidden');
                if (destPreview) destPreview.style.display = 'none';
            }
        }
    }

    /**
     * Setup preview updates for shared fields
     */
    setupPreviewUpdates() {
        const fields = [
            { id: 'defectiveSource', update: () => this.updateSourcePreview() },
            { id: 'contactName1', update: () => this.updateSourcePreview() },
            { id: 'defectiveDestination', update: () => this.updateDestinationPreview() },
            { id: 'destContactName', update: () => this.updateDestinationPreview() }
        ];
        
        fields.forEach(({ id, update }) => {
            const field = document.getElementById(id);
            if (field) field.addEventListener('input', update);
        });
    }

    /**
     * Update source preview
     */
    updateSourcePreview() {
        const sourceButton = document.querySelector('.choice-btn[data-target="same-source"].selected');
        if (!sourceButton) return;
        
        const sourceValue = document.getElementById('defectiveSource')?.value || '';
        const contactName = document.getElementById('contactName1')?.value || '';
        const preview = document.getElementById('sourcePreview');
        
        if (sourceValue && preview) {
            preview.textContent = `כתובת: ${sourceValue}${contactName ? ', איש קשר: ' + contactName : ''}`;
            preview.style.display = 'block';
        } else if (preview) {
            preview.style.display = 'none';
        }
    }

    /**
     * Update destination preview
     */
    updateDestinationPreview() {
        const destButton = document.querySelector('.choice-btn[data-target="same-destination"].selected');
        if (!destButton) return;
        
        const destValue = document.getElementById('defectiveDestination')?.value || '';
        const contactName = document.getElementById('destContactName')?.value || '';
        const preview = document.getElementById('destinationPreview');
        
        if (destValue && preview) {
            preview.textContent = `כתובת: ${destValue}${contactName ? ', איש קשר: ' + contactName : ''}`;
            preview.style.display = 'block';
        } else if (preview) {
            preview.style.display = 'none';
        }
    }

    /**
     * Update share options
     */
    updateShareOptions() {
        this.updateSourcePreview();
        this.updateDestinationPreview();
    }

    /**
     * Setup phone number sanitization
     */
    setupPhoneSanitization() {
        const phoneFields = [
            'contactPhone1', 'destContactPhone', 'contactPhone2', 'destContactPhone2',
            'workingSourcePhone', 'workingDestPhone', 'garagePhone', 'cardHolderPhone'
        ];

        phoneFields.forEach(id => {
            const input = document.getElementById(id);
            if (!input) return;
            
            // Remove existing listeners by cloning
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            // Add sanitization listeners
            newInput.addEventListener('input', (e) => {
                const cursorPos = e.target.selectionStart;
                const cleanedPhone = cleanPhoneNumber(e.target.value);
                e.target.value = cleanedPhone;
                e.target.setSelectionRange(cursorPos, cursorPos);
            });
            
            newInput.addEventListener('paste', (e) => {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                const cleanedPhone = cleanPhoneNumber(pasteData);
                e.target.value = cleanedPhone;
            });
            
            newInput.addEventListener('blur', (e) => {
                const cleanedPhone = cleanPhoneNumber(e.target.value);
                e.target.value = cleanedPhone;
            });
        });
    }

    /**
     * Setup credit card formatting
     */
    setupCreditCardFormatting() {
        this.setupCardNumberFormatting();
        this.setupCardExpiryFormatting();
        this.setupCardCVVFormatting();
        this.setupIDValidation();
    }

    /**
     * Setup card number formatting
     */
    setupCardNumberFormatting() {
        const cardNumberField = document.getElementById('cardNumber');
        if (!cardNumberField) return;
        
        cardNumberField.placeholder = '0000-0000-0000-0000';
        
        cardNumberField.addEventListener('input', (e) => {
            const input = e.target;
            const cursorPosition = input.selectionStart;
            const digits = input.value.replace(/\D/g, '');
            const formatted = formatCardNumberWithDashes(digits);
            
            input.value = formatted;
            const newCursorPos = calculateNewCursorPosition(cursorPosition, formatted, digits.length);
            input.setSelectionRange(newCursorPos, newCursorPos);
        });

        cardNumberField.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedData.replace(/\D/g, '');
            const formatted = formatCardNumberWithDashes(digits);
            e.target.value = formatted;
        });
    }

    /**
     * Setup card expiry formatting
     */
    setupCardExpiryFormatting() {
        const cardExpiryField = document.getElementById('cardExpiry');
        if (!cardExpiryField) return;
        
        cardExpiryField.placeholder = 'MM/YY';
        
        cardExpiryField.addEventListener('input', (e) => {
            const input = e.target;
            const cursorPosition = input.selectionStart;
            const digits = input.value.replace(/\D/g, '');
            const formatted = formatExpiryWithSlash(digits);
            
            input.value = formatted;
            const newCursorPos = calculateExpiryCursorPosition(cursorPosition, formatted, digits.length);
            input.setSelectionRange(newCursorPos, newCursorPos);
        });

        cardExpiryField.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedData.replace(/\D/g, '');
            const formatted = formatExpiryWithSlash(digits);
            e.target.value = formatted;
        });
    }

    /**
     * Setup CVV formatting
     */
    setupCardCVVFormatting() {
        const cardCvvField = document.getElementById('cardCvv');
        if (!cardCvvField) return;
        
        cardCvvField.placeholder = '000';
        
        cardCvvField.addEventListener('input', (e) => {
            const cursorPosition = e.target.selectionStart;
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
            e.target.value = digits;
            e.target.setSelectionRange(cursorPosition, cursorPosition);
        });

        cardCvvField.addEventListener('paste', (e) => {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedData.replace(/\D/g, '').slice(0, 4);
            e.target.value = digits;
        });
    }

    /**
     * Setup ID validation
     */
    setupIDValidation() {
        const idField = document.getElementById('idNumber');
        if (!idField) return;

        idField.addEventListener('input', (e) => {
            const cursorPos = e.target.selectionStart;
            const formatted = formatIDNumber(e.target.value);
            e.target.value = formatted;
            e.target.setSelectionRange(cursorPos, cursorPos);
            
            // Remove existing error
            const errorMsg = e.target.parentNode.querySelector('.id-error');
            if (errorMsg) errorMsg.remove();
        });

        idField.addEventListener('blur', (e) => {
            const value = e.target.value.trim();
            if (!value) return;

            const existingError = e.target.parentNode.querySelector('.id-error');
            if (existingError) existingError.remove();

            if (!validateIsraeliID(value)) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'id-error';
                errorDiv.style.cssText = `
                    margin-top: 5px;
                    padding: 5px 8px;
                    background: #fef2f2;
                    border: 1px solid #fca5a5;
                    border-radius: 4px;
                    font-size: 12px;
                    color: #991b1b;
                `;
                errorDiv.textContent = ERROR_MESSAGES.INVALID_ID;
                e.target.parentNode.appendChild(errorDiv);
            }
        });
    }

    /**
     * Setup payment type buttons
     */
    setupPaymentTypeButtons() {
        const paymentButtons = document.querySelectorAll('.payment-btn');
        const creditCardSection = document.getElementById('creditCardSection');
        
        paymentButtons.forEach(button => {
            button.addEventListener('click', () => {
                paymentButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const paymentType = button.dataset.payment;
                
                if (paymentType === 'credit') {
                    creditCardSection?.classList.remove('hidden');
                } else {
                    creditCardSection?.classList.add('hidden');
                    this.clearCreditCardFields();
                }
            });
        });
    }

    /**
     * Clear credit card fields
     */
    clearCreditCardFields() {
        const creditFields = ['idNumber', 'cardNumber', 'cardExpiry', 'cardCvv', 'cardHolderPhone'];        creditFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) field.value = '';
        });
    }

    /**
     * Get selected payment type
     */
    getSelectedPaymentType() {
        const activeButton = document.querySelector('.payment-btn.active');
        return activeButton ? activeButton.dataset.payment : 'cash';
    }

    /**
     * Initialize date and time
     */
    initializeDateTime() {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        const dateField = document.getElementById('executionDate');
        if (dateField) dateField.value = currentDate;
    }

    /**
     * Set default order number if empty
     */
    setDefaultOrderNumber() {
        const orderNumberField = document.getElementById('orderNumber');
        
        if (orderNumberField && !orderNumberField.value.trim()) {
            orderNumberField.value = generateOrderNumber();
            
            // Visual feedback
            orderNumberField.style.backgroundColor = '#e8f5e8';
            orderNumberField.style.border = '2px solid #4caf50';
            
            setTimeout(() => {
                orderNumberField.style.backgroundColor = '';
                orderNumberField.style.border = '';
            }, 2000);
        }
    }

    /**
     * Check company-specific features
     */
    checkCompanySpecificFeatures() {
        const companyName = localStorage.getItem(STORAGE_KEYS.USER_COMPANY) || 'חברה לא מזוהה';
        document.getElementById('companyName').textContent = companyName;

        // Show client name field for specific companies
        const isSpecialCompany = companyName === 'גרר גולן';
        if (isSpecialCompany) {
            const clientNameGroup = document.getElementById('clientNameGroup');
            if (clientNameGroup) {
                clientNameGroup.style.display = 'block';
            }
        }
    }

    /**
     * Check admin status
     */
    async checkAdminStatus() {
        const userEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
        if (!userEmail) return;

        try {
            const result = await apiManager.checkAdminStatus(userEmail);
            if (result.success && result.isAdmin) {
                const adminButton = document.getElementById('adminDashboard');
                if (adminButton) {
                    adminButton.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    }

    /**
     * Handle form submission
     */
    handleFormSubmit(e) {
        e.preventDefault();
        
        this.setDefaultOrderNumber();
        
        const towingType = this.elements.towingTypeSelect.value;
        
        // Validate second car choices if applicable
        if (towingType === 'defective' && 
            this.elements.secondDefectiveCarForm && 
            !this.elements.secondDefectiveCarForm.classList.contains('hidden')) {
            
            if (!this.validateSecondCarChoices()) {
                return;
            }
        }
        
        // Ensure pricing data is finalized
        pricingManager.updateFinalPrice();
        
        this.showSummary();
    }

    /**
     * Validate second car choices
     */
    validateSecondCarChoices() {
        let isValid = true;
        
        const sourceSelected = document.querySelector('.choice-btn[data-field="source"].selected');
        if (!sourceSelected) {
            isValid = false;
            const sourceGroup = document.querySelector('.choice-buttons[data-field="source"]');
            if (sourceGroup) {
                sourceGroup.closest('.required-choice').classList.add('error');
            }
        }
        
        const destinationSelected = document.querySelector('.choice-btn[data-field="destination"].selected');
        if (!destinationSelected) {
            isValid = false;
            const destGroup = document.querySelector('.choice-buttons[data-field="destination"]');
            if (destGroup) {
                destGroup.closest('.required-choice').classList.add('error');
            }
        }
        
        if (!isValid) {
            showNotification('יש לבחור האם המוצא והיעד זהים או שונים מהרכב הראשון', 'error');
        }
        
        return isValid;
    }

    /**
     * Trigger form submit event
     */
    triggerFormSubmit() {
        if (this.elements.mainForm) {
            const submitEvent = new Event('submit');
            this.elements.mainForm.dispatchEvent(submitEvent);
        }
    }

    /**
     * Show main form
     */
    showMainForm() {
        this.elements.mainForm?.classList.remove('hidden');
        this.elements.summaryPage?.classList.add('hidden');
        updateRequiredFieldsVisibility();
    }

    /**
     * Show summary page
     */
    showSummary() {
        this.elements.mainForm?.classList.add('hidden');
        this.elements.summaryPage?.classList.remove('hidden');
        this.updateSummary();
    }

    /**
     * Update summary display
     */
    updateSummary() {
        this.updateBasicSummary();
        this.updateFormSpecificSummary();
        this.updateNotesSummary();
    }

    /**
     * Update basic summary information
     */
    updateBasicSummary() {
        const updates = [
            { summaryId: 'summary-orderNumber', fieldId: 'orderNumber', default: 'לא הוזן' },
            { summaryId: 'summary-company', value: localStorage.getItem(STORAGE_KEYS.USER_COMPANY) || 'לא ידוע' },
            { summaryId: 'summary-date', value: this.getDateDisplay() },
            { summaryId: 'summary-time', value: this.getTimeDisplay() },
            { summaryId: 'summary-towingType', value: this.getTowingTypeDisplay() }
        ];

        updates.forEach(({ summaryId, fieldId, value, default: defaultValue }) => {
            const summaryEl = document.getElementById(summaryId);
            if (!summaryEl) return;
            
            if (value) {
                summaryEl.textContent = value;
            } else if (fieldId) {
                const fieldEl = document.getElementById(fieldId);
                summaryEl.textContent = fieldEl?.value || defaultValue || 'לא הוזן';
            }
        });
    }

    /**
     * Update form-specific summary
     */
    updateFormSpecificSummary() {
        const towingType = this.elements.towingTypeSelect.value;
        
        const summaryDefective = document.getElementById('summary-defectiveCar');
        const summaryExchange = document.getElementById('summary-exchange');
        
        // Hide all sections first
        summaryDefective?.classList.add('hidden');
        summaryExchange?.classList.add('hidden');
        
        if (towingType === 'defective') {
            summaryDefective?.classList.remove('hidden');
            this.updateDefectiveCarSummary();
        } else if (towingType === 'exchange') {
            summaryExchange?.classList.remove('hidden');
            this.updateExchangeSummary();
        }
    }

    /**
     * Update defective car summary
     */
    updateDefectiveCarSummary() {
        const summaryFields = {
            defectiveCarNumber: 'מספר רכב',
            defectiveCarType: 'סוג רכב',
            defectiveCarCode: 'קוד רכב',
            defectDetails: 'פירוט התקלה',
            defectiveSource: 'מוצא',
            defectiveDestination: 'יעד',
            contactName1: 'שם איש קשר במקום',
            contactPhone1: 'טלפון איש קשר במקום',
            destContactName: 'שם איש קשר ביעד',
            destContactPhone: 'טלפון איש קשר ביעד'
        };


        for (const [id, label] of Object.entries(summaryFields)) {
            let inputValue = '';
            
            if (id === 'defectDetails') {
                // Handle defect details specially
                inputValue = window.collectDefectDetails ? window.collectDefectDetails() : '';
            } else {
                const inputElement = document.getElementById(id);
                inputValue = inputElement ? inputElement.value : '';
            }
            
            const summaryElement = document.getElementById(`summary-${id}`);
            if (summaryElement) {
                summaryElement.textContent = inputValue || 'לא הוזן';
            }
        }
        // Add tow selection to summary
        const towSummary = document.getElementById('summary-towSelection');
        if (towSummary) {
            const towSelection = window.collectTowSelection ? window.collectTowSelection() : '';
            towSummary.textContent = towSelection || 'לא נבחר גרר';
        }
        
        // Handle second car if visible
        const secondSummary = document.getElementById('summary-secondDefectiveCar');
        if (this.elements.secondDefectiveCarForm && 
            !this.elements.secondDefectiveCarForm.classList.contains('hidden') && 
            secondSummary) {
            
            secondSummary.classList.remove('hidden');
            this.updateSecondDefectiveCarSummary();
        } else if (secondSummary) {
            secondSummary.classList.add('hidden');
        }
    }

    /**
     * Update second defective car summary
     */
    updateSecondDefectiveCarSummary() {
        const secondCarFields = {
            defectiveCarNumber2: 'מספר רכב',
            defectiveCarType2: 'סוג רכב',
            defectiveCarCode2: 'קוד רכב',
            defectDetails2: 'פירוט התקלה'
        };
        
        for (const [id, label] of Object.entries(secondCarFields)) {
            const inputElement = document.getElementById(id);
            const summaryElement = document.getElementById(`summary-${id}`);
            
            if (inputElement && summaryElement) {
                summaryElement.textContent = inputElement.value || 'לא הוזן';
            }
        }
        
        // Handle shared vs separate addresses
        const shareSource = document.querySelector('.choice-btn[data-target="same-source"]')?.classList.contains('selected');
        const shareDestination = document.querySelector('.choice-btn[data-target="same-destination"]')?.classList.contains('selected');
        
        this.updateSecondCarSourceSummary(shareSource);
        this.updateSecondCarDestinationSummary(shareDestination);
    }

    /**
     * Update second car source summary
     */
    
//   updateSecondCarSourceSummary(shareSource) {
//           const sourceElement = document.getElementById('summary-defectiveSource2');
//           const contactNameElement = document.getElementById('summary-contactName2');
//           const contactPhoneElement = document.getElementById('summary-contactPhone2');
          
//           if (shareSource) {
//               if (sourceElement) sourceElement.textContent = 'זהה לרכב הראשון';
//               if (contactNameElement) contactNameElement.textContent = 'זהה לרכב הראשון';
//               if (contactPhoneElement) contactPhoneElement.textContent = 'זהה לרכב הראשון';
//           } else {
//               const sourceInput = document.getElementById('defectiveSource2');
//               const contactNameInput = document.getElementById('contactName2');
//               const contactPhoneInput = document.getElementById('contactPhone2');
              
//               if (sourceElement) sourceElement.textContent = sourceInput?.value || 'לא הוזן';
//               if (contactNameElement) contactNameElement.textContent = contactNameInput?.value || 'לא הוזן';
//               if (contactPhoneElement) contactPhoneElement.textContent = contactPhoneInput?.value || 'לא הוזן';
//           }
//       }

    /**
     * Update second car destination summary
     */
    // updateSecondCarDestinationSummary(shareDestination) {
    //     const destElement = document.getElementById('summary-defectiveDestination2');
    //     const destContactNameElement = document.getElementById('summary-destContactName2');
    //     const destContactPhoneElement = document.getElementById('summary-destContactPhone2');
        
    //     if (shareDestination) {
    //         if (destElement) destElement.textContent = 'זהה לרכב הראשון';
    //         if (destContactNameElement) destContactNameElement.textContent = 'זהה לרכב הראשון';
    //         if (destContactPhoneElement) destContactPhoneElement.textContent = 'זהה לרכב הראשון';
    //     } else {
    //         const destInput = document.getElementById('defectiveDestination2');
    //         const destContactNameInput = document.getElementById('destContactName2');
    //         const destContactPhoneInput = document.getElementById('destContactPhone2');
            
    //         if (destElement) destElement.textContent = destInput?.value || 'לא הוזן';
    //         if (destContactNameElement) destContactNameElement.textContent = destContactNameInput?.value || 'לא הוזן';
    //         if (destContactPhoneElement) destContactPhoneElement.textContent = destContactPhoneInput?.value || 'לא הוזן';
    //     }
    // }

    updateSecondCarSourceSummary(shareSource) {
        const sourceElement = document.getElementById('summary-defectiveSource2');
        const contactNameElement = document.getElementById('summary-contactName2');
        const contactPhoneElement = document.getElementById('summary-contactPhone2');
        
        if (shareSource) {
            if (sourceElement) sourceElement.textContent = 'זהה לרכב הראשון';
            if (contactNameElement) contactNameElement.textContent = 'זהה לרכב הראשון';
            if (contactPhoneElement) contactPhoneElement.textContent = 'זהה לרכב הראשון';
        } else {
            const sourceInput = document.getElementById('defectiveSource2');
            const contactNameInput = document.getElementById('contactName2');
            const contactPhoneInput = document.getElementById('contactPhone2');
            
            if (sourceElement) sourceElement.textContent = sourceInput?.value || 'לא הוזן';
            if (contactNameElement) contactNameElement.textContent = contactNameInput?.value || 'לא הוזן';
            if (contactPhoneElement) contactPhoneElement.textContent = contactPhoneInput?.value || 'לא הוזן';
        }
    }

    /**
     * Update second car destination summary
     */
    updateSecondCarDestinationSummary(shareDestination) {
        const destElement = document.getElementById('summary-defectiveDestination2');
        const destContactNameElement = document.getElementById('summary-destContactName2');
        const destContactPhoneElement = document.getElementById('summary-destContactPhone2');
        
        if (shareDestination) {
            if (destElement) destElement.textContent = 'זהה לרכב הראשון';
            if (destContactNameElement) destContactNameElement.textContent = 'זהה לרכב הראשון';
            if (destContactPhoneElement) destContactPhoneElement.textContent = 'זהה לרכב הראשון';
        } else {
            const destInput = document.getElementById('defectiveDestination2');
            const destContactNameInput = document.getElementById('destContactName2');
            const destContactPhoneInput = document.getElementById('destContactPhone2');
            
            if (destElement) destElement.textContent = destInput?.value || 'לא הוזן';
            if (destContactNameElement) destContactNameElement.textContent = destContactNameInput?.value || 'לא הוזן';
            if (destContactPhoneElement) destContactPhoneElement.textContent = destContactPhoneInput?.value || 'לא הוזן';
        }
    }

    /**
     * Update exchange summary
     */
    updateExchangeSummary() {
        const exchangeFields = {
            workingCarNumber: 'מספר רכב תקין',
            workingCarType: 'סוג רכב תקין',
            workingCarCode: 'קוד רכב תקין',
            workingSource: 'מוצא רכב תקין',
            workingDestination: 'יעד רכב תקין',
            workingSourcePhone: 'טלפון איש קשר במוצא',
            workingDestPhone: 'טלפון איש קשר ביעד',
            exchangeCarNumber: 'מספר רכב להחלפה',
            exchangeCarType: 'סוג רכב להחלפה',
            exchangeCarCode: 'קוד רכב להחלפה'
        };

        for (const [id, label] of Object.entries(exchangeFields)) {
            const inputElement = document.getElementById(id);
            const summaryElement = document.getElementById(`summary-${id}`);
            
            if (inputElement && summaryElement) {
                summaryElement.textContent = inputElement.value || 'לא הוזן';
            }
        }
    }

    /**
     * Update notes summary
     */
    updateNotesSummary() {
        const notesField = document.getElementById('notes');
        const summaryNotes = document.getElementById('summary-notes');
        
        if (notesField && summaryNotes) {
            summaryNotes.textContent = notesField.value || 'אין הערות נוספות';
        }

        // Update pricing summary
        this.updatePricingSummary();
    }

    /**
     * Update pricing summary
     */
    updatePricingSummary() {
        const summaryPrice = document.getElementById('summary-price');
        const summaryPricingTier = document.getElementById('summary-pricingTier');
        const summaryPaymentType = document.getElementById('summary-paymentType');
        
        if (summaryPrice) {
            const finalPrice = pricingManager.getFinalPrice();
            summaryPrice.textContent = finalPrice ? `${finalPrice} ₪` : 'לא הוגדר';
        }
        
        if (summaryPricingTier) {
            const tier = pricingManager.getSelectedTier();
            summaryPricingTier.textContent = tier || 'לא נבחר';
        }
        
        if (summaryPaymentType) {
            const paymentType = this.getSelectedPaymentType();
            const paymentTexts = {
                'cash': 'מזומן',
                'credit': 'אשראי',
                'check': 'המחאה',
                'transfer': 'העברה בנקאית'
            };
            summaryPaymentType.textContent = paymentTexts[paymentType] || 'לא נבחר';
        }

        // Update credit card summary if applicable
        this.updateCreditCardSummary();
    }

    /**
     * Update credit card summary
     */
    updateCreditCardSummary() {
        const summaryCardSection = document.getElementById('summary-creditCardDetails');
        const paymentType = this.getSelectedPaymentType();
        
        if (paymentType === 'credit' && summaryCardSection) {
            summaryCardSection.classList.remove('hidden');
            
            const cardFields = {
                idNumber: 'summary-idNumber',
                cardNumber: 'summary-cardNumber',
                cardExpiry: 'summary-cardExpiry'
            };
            
            for (const [fieldId, summaryId] of Object.entries(cardFields)) {
                const field = document.getElementById(fieldId);
                const summaryEl = document.getElementById(summaryId);
                
                if (field && summaryEl) {
                    if (fieldId === 'cardNumber' && field.value) {
                        // Mask card number except last 4 digits
                        const maskedNumber = field.value.replace(/(\d{4}-\d{4}-\d{4}-)(\d{4})/, '****-****-****-$2');
                        summaryEl.textContent = maskedNumber;
                    } else {
                        summaryEl.textContent = field.value || 'לא הוזן';
                    }
                }
            }
        } else if (summaryCardSection) {
            summaryCardSection.classList.add('hidden');
        }
    }

    /**
     * Get formatted date display
     */
    getDateDisplay() {
        const todayBtn = document.querySelector('[data-target="today"].active');
        if (todayBtn) {
            return 'היום';
        }
        
        const dateField = document.getElementById('executionDate');
        if (dateField?.value) {
            const date = new Date(dateField.value);
            return date.toLocaleDateString('he-IL');
        }
        
        return 'לא הוזן';
    }

    /**
     * Get formatted time display
     */
    getTimeDisplay() {
        const timeField = document.getElementById('executionTime');
        return timeField?.value || 'לא הוזן';
    }

    /**
     * Get towing type display text
     */
    getTowingTypeDisplay() {
        const towingType = this.elements.towingTypeSelect?.value;
        const types = {
            'defective': 'רכב תקול',
            'exchange': 'החלפת רכב'
        };
        return types[towingType] || 'לא נבחר';
    }

    /**
     * Handle final form submission
     */
    // בתוך class FormManager { ... }
    async handleFinalSubmit(e) {
        e.preventDefault();
        if (this._submitting) {
            console.warn('[FormManager] submit ignored: already submitting');
            return;
        }
        this._submitting = true;

        // נוודא שהמחיר הסופי כתוב לשדה הנסתר
        try {
            if (typeof ensureHiddenPriceField === 'function') ensureHiddenPriceField();
            if (typeof writeFinalPriceToHidden === 'function') writeFinalPriceToHidden();
        } catch (_) {}

        this.showLoadingModal();

        try {
            // נשתמש ב־collectFormData החיצוני אם קיים, אחרת של ה־FormManager
            const formData = (window.collectFormData ? window.collectFormData() : this.collectFormData());

            // בוחרים פונקציית שליחה זמינה על apiManager
            const sender =
                (window.apiManager?.submitTowingOrder) ||
                (window.apiManager?.submitTowingForm)  ||
                (window.apiManager?.sendOrder)         ||
                (window.apiManager?.createCalendarEvent);

            if (typeof sender !== 'function') {
                throw new Error('No submit function found on apiManager');
            }

            const result = await sender(formData);

            // הצליח
            if (result && result.success !== false) {
                this.hideLoadingModal();
                this.showSuccessModal(result.orderNumber || formData.orderNumber || '');

                // ✅ איפוס מיידי של הטופס, תוך שמירת נתוני המשתמש
                try {
                    if (typeof window.resetFormKeepUserData === 'function') {
                        console.log('[FormManager] auto-reset after success');
                        window.resetFormKeepUserData();
                    } else {
                        this.resetForm();
                    }
                } catch (err) {
                    console.warn('[FormManager] reset failed:', err);
                }

                return;
            }

            // תשובה שמצהירה על כישלון
            throw new Error(result?.message || 'שגיאה בשליחת הטופס');

        } catch (error) {
            console.error('[FormManager] submit error:', error);
            this.hideLoadingModal();
            this.showErrorModal(error.message || 'שגיאה בלתי צפויה בשליחה');
        } finally {
            this._submitting = false;
        }
    }



    /**
     * Collect all form data
     */
    collectFormData() {
        const formData = new FormData(this.elements.mainForm);
        const data = {};
        
        // Convert FormData to object
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Add additional data
        data.company = localStorage.getItem(STORAGE_KEYS.USER_COMPANY);
        data.userEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
        data.submissionTime = new Date().toISOString();
        data.paymentType = this.getSelectedPaymentType();
        data.finalPrice = pricingManager.getFinalPrice();
        data.pricingTier = pricingManager.getSelectedTier();
        
        // Add second car choice data if applicable
        if (this.elements.secondDefectiveCarForm && 
            !this.elements.secondDefectiveCarForm.classList.contains('hidden')) {
            
            const sourceChoice = document.querySelector('.choice-btn[data-field="source"].selected');
            const destChoice = document.querySelector('.choice-btn[data-field="destination"].selected');
            
            data.secondCarSourceChoice = sourceChoice?.dataset.target || null;
            data.secondCarDestinationChoice = destChoice?.dataset.target || null;
        }
        
        return data;
    }

    /**
     * Show loading modal
     */
    showLoadingModal() {
        this.loadingModal = document.createElement('div');
        this.loadingModal.className = 'loading-modal'; // ⬅️ האלמנט החיצוני
        this.loadingModal.innerHTML = `
            <div class="loading-content">
            <div class="loading-spinner"></div>
            <div class="loading-text">שולח את הטופס...</div>
            <div class="loading-subtitle">אנא המתן, הבקשה נשלחת למערכת</div>
            </div>
        `;
        document.body.appendChild(this.loadingModal);
        // ה-CSS מצפה .loading-modal.show
        this.loadingModal.classList.add('show');
        }

        hideLoadingModal() {
        if (this.loadingModal) {
            this.loadingModal.remove();
            this.loadingModal = null;
        }
        }

    /**
     * Hide loading modal
     */
    hideLoadingModal() {
        if (this.loadingModal) {
            this.loadingModal.remove();
            this.loadingModal = null;
        }
    }

    /**
     * Show success modal
     */
    showSuccessModal(orderNumber) {
  this.successModal = document.createElement('div');
  this.successModal.className = 'success-modal'; // ⬅️ האלמנט החיצוני
  this.successModal.innerHTML = `
    <div class="success-content">
      <div class="success-icon"></div>
      <h3 class="success-title">הטופס נשלח בהצלחה!</h3>
      <p class="success-message">מספר הזמנה: <strong>${orderNumber}</strong><br>ניצור איתך קשר בהקדם.</p>
      <div class="modal-actions">
        <button id="successNewFormBtn" class="success-button">טופס חדש</button>
      </div>
    </div>
  `;
  document.body.appendChild(this.successModal);
  // ה-CSS מצפה .success-modal.show
  this.successModal.classList.add('show');

  const newFormBtn = this.successModal.querySelector('#successNewFormBtn');
  if (newFormBtn) newFormBtn.addEventListener('click', () => {
    this.successModal.remove();
    this.successModal = null;
  });

  const okBtn = this.successModal.querySelector('#successOkButton');
  if (okBtn) okBtn.addEventListener('click', () => {
    this.successModal.remove();
    this.successModal = null;
  });
}





    /**
     * Show error modal
     */
    showErrorModal(message) {
        const errorModal = document.createElement('div');
        errorModal.className = 'modal-overlay';
        errorModal.innerHTML = `
            <div class="modal-content error-modal">
                <div class="error-icon">✗</div>
                <h3>שגיאה בשליחת הטופס</h3>
                <p>${message}</p>
                <p>אנא נסה שוב או פנה לתמיכה טכנית</p>
                <div class="modal-actions">
                    <button onclick="this.closest('.modal-overlay').remove()" class="btn-primary">סגור</button>
                </div>
            </div>
        `;
        document.body.appendChild(errorModal);
    }

    /**
     * Reset form to initial state
     */
    resetForm() {
        // Reset all form fields
        if (this.elements.mainForm) {
            this.elements.mainForm.reset();
        }
        
        // Hide all sub-forms
        this.hideAllSubForms();
        
        // Reset choice buttons
        document.querySelectorAll('.choice-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Reset payment buttons
        document.querySelectorAll('.payment-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector('.payment-btn[data-payment="cash"]')?.classList.add('active');
        
        // Hide credit card section
        document.getElementById('creditCardSection')?.classList.add('hidden');
        
        // Reset date to today
        document.querySelector('[data-target="today"]')?.classList.add('active');
        document.querySelector('[data-target="other-date"]')?.classList.remove('active');
        document.getElementById('datePicker')?.classList.add('hidden');
        
        // Clear vehicle data
        vehicleManager.clearAllData();
        
        // Reset pricing
        pricingManager.reset();
        
        // Show main form
        this.showMainForm();
        
        // Re-initialize components
        this.initializeDateTime();
        this.setDefaultOrderNumber();
    }

    /**
     * Destroy form manager and clean up
     */
    destroy() {
        // Remove event listeners
        document.querySelectorAll('input, select, textarea, button').forEach(element => {
            element.replaceWith(element.cloneNode(true));
        });
        
        // Hide modals
        this.hideLoadingModal();
        if (this.successModal) {
            this.successModal.remove();
            this.successModal = null;
        }
        
        // Clear data
        this.formData = {};
        this.elements = {};
    }

    /**
     * Setup defect selector functionality
     */
    setupDefectSelector() {
        const defectBtn = document.getElementById('defectSelectorBtn');
        if (!defectBtn) return;
        
        defectBtn.addEventListener('click', () => this.showDefectModal());
    }

    /**
     * Setup tow selector functionality
     */
    setupTowSelector() {
        const towBtn = document.getElementById('towSelectorBtn');
        if (!towBtn) return;
        
        towBtn.addEventListener('click', () => this.showTowModal());
    }

    /**
     * Show tow selection modal
     */
    showTowModal() {
        this.createTowModal();
    }

    /**
     * Create tow modal
     */
    createTowModal() {
        // Remove existing modal if present
        const existing = document.getElementById('towModal');
        if (existing) existing.remove();
        
        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'towModal';
        modal.className = 'tow-modal';
        
        modal.innerHTML = `
            <div class="tow-modal-content">
                <div class="tow-modal-header">
                    <h3 class="tow-modal-title">בחר גרר מתאים</h3>
                    <button class="tow-modal-close" onclick="this.closest('.tow-modal').remove()">×</button>
                </div>
                <div class="tow-options">
                    <div class="tow-option" data-tow="flatbed">
                        <i class="fas fa-truck-loading"></i>
                        <span>מובילית</span>
                    </div>
                    <div class="tow-option" data-tow="wheel-lift">
                        <i class="fas fa-cog"></i>
                        <span>רמ-סע</span>
                    </div>
                    <div class="tow-option" data-tow="glasses">
                        <i class="fas fa-glasses"></i>
                        <span>משקפיים</span>
                    </div>
                    <div class="tow-option" data-tow="dolly">
                        <i class="fas fa-dolly"></i>
                        <span>דולי</span>
                    </div>
                </div>
                <div class="tow-modal-actions">
                    <button class="tow-modal-btn tow-modal-cancel" onclick="this.closest('.tow-modal').remove()">ביטול</button>
                    <button class="tow-modal-btn tow-modal-confirm" onclick="window.formManager.confirmTowSelection()">אישור</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Setup option clicks
        this.setupTowOptions();
    }

    /**
     * Setup tow option clicks (multiple selection)
     */
    setupTowOptions() {
        const options = document.querySelectorAll('.tow-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                // Toggle selection for current option
                option.classList.toggle('selected');
            });
        });
    }

    /**
     * Confirm tow selection and close modal
     */
    confirmTowSelection() {
        const selectedOptions = document.querySelectorAll('.tow-option.selected');
        const selectedTows = [];
        
        selectedOptions.forEach(option => {
            selectedTows.push(option.querySelector('span').textContent);
        });
        
        this.updateSelectedTow(selectedTows);
        document.getElementById('towModal').remove();
    }

    /**
     * Update the display of selected tow
     */
    updateSelectedTow(tows) {
        const container = document.getElementById('selectedTow');
        if (!container) return;
        
        if (tows.length === 0) {
            container.innerHTML = '<div class="selected-tow-placeholder">לא נבחר גרר</div>';
            container.classList.remove('has-selection');
        } else {
            const tagsHtml = tows.map(tow => 
                `<span class="tow-tag">${tow}</span>`
            ).join('');
            container.innerHTML = tagsHtml;
            container.classList.add('has-selection');
        }
    }

    /**
     * Show defect selection modal
     */
    showDefectModal() {
        this.createDefectModal();
    }

    /**
     * Create defect modal
     */
    createDefectModal() {
        // Remove existing modal if present
        const existing = document.getElementById('defectModal');
        if (existing) existing.remove();
        
        // Create modal HTML
        const modal = document.createElement('div');
        modal.id = 'defectModal';
        modal.className = 'defect-modal';
        
        modal.innerHTML = `
            <div class="defect-modal-content">
                <div class="defect-modal-header">
                    <h3 class="defect-modal-title">בחר תקלות</h3>
                    <button class="defect-modal-close" onclick="this.closest('.defect-modal').remove()">×</button>
                </div>
                <div class="defect-options">
                    <div class="defect-option" data-defect="no-power">
                        <i class="fas fa-battery-empty"></i>
                        <span>אין חשמל</span>
                    </div>
                    <div class="defect-option" data-defect="flat-tire">
                        <i class="fas fa-circle"></i>
                        <span>פנצ'ר</span>
                    </div>
                    <div class="defect-option" data-defect="accident">
                        <i class="fas fa-car-crash"></i>
                        <span>תאונה</span>
                    </div>
                    <div class="defect-option" data-defect="broken-wheel">
                        <i class="fas fa-cog"></i>
                        <span>גלגל עקום או שבור</span>
                    </div>
                    <div class="defect-option" data-defect="leak">
                        <i class="fas fa-tint"></i>
                        <span>נזילת מים/שמן</span>
                    </div>
                    <div class="defect-option" data-defect="wont-start">
                        <i class="fas fa-wrench"></i>
                        <span>לא נדלק/לא מניע</span>
                    </div>
                    <div class="defect-option" data-defect="underground">
                        <i class="fas fa-building"></i>
                        <span>חניון תת קרקעי</span>
                    </div>
                    <div class="defect-option" data-defect="runs-ok">
                        <i class="fas fa-check"></i>
                        <span>מניע/נדלק ונוסע</span>
                    </div>
                    <div class="defect-option" data-defect="other">
                        <i class="fas fa-edit"></i>
                        <span>אחר</span>
                        <input type="text" class="defect-other-input" placeholder="פרט את התקלה...">
                    </div>
                </div>
                <div class="defect-modal-actions">
                    <button class="defect-modal-btn defect-modal-cancel" onclick="this.closest('.defect-modal').remove()">ביטול</button>
                    <button class="defect-modal-btn defect-modal-confirm" onclick="window.formManager.confirmDefectSelection()">אישור</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => modal.classList.add('show'), 10);
        
        // Setup option clicks
        this.setupDefectOptions();
    }

    /**
     * Setup defect option clicks
     */
    setupDefectOptions() {
        const options = document.querySelectorAll('.defect-option');
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                if (e.target.classList.contains('defect-other-input')) return;
                option.classList.toggle('selected');
            });
        });
    }

    /**
     * Confirm defect selection and close modal
     */
    confirmDefectSelection() {
        const selectedOptions = document.querySelectorAll('.defect-option.selected');
        const selectedDefects = [];
        
        selectedOptions.forEach(option => {
            const defectType = option.dataset.defect;
            if (defectType === 'other') {
                const otherText = option.querySelector('.defect-other-input').value.trim();
                if (otherText) {
                    selectedDefects.push(`אחר: ${otherText}`);
                }
            } else {
                selectedDefects.push(option.querySelector('span').textContent);
            }
        });
        
        this.updateSelectedDefects(selectedDefects);
        document.getElementById('defectModal').remove();
    }

    /**
     * Update the display of selected defects
     */
    updateSelectedDefects(defects) {
        const container = document.getElementById('selectedDefects');
        if (!container) return;
        
        if (defects.length === 0) {
            container.innerHTML = '<div class="selected-defects-placeholder">לא נבחרו תקלות</div>';
            container.classList.remove('has-selections');
        } else {
            const tagsHtml = defects.map(defect => 
                `<span class="defect-tag">${defect}</span>`
            ).join('');
            container.innerHTML = tagsHtml;
            container.classList.add('has-selections');
        }
    }
}



// Initialize form manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.formManager = new FormManager();
    window.formManager.init();
});

// Expose methods for global access
window.FormManager = FormManager;


  