// --- SHIM לבטיחות (מונע קריסה אחרי שליחה) ---
window.setupVehicleLookup = window.setupVehicleLookup ||
  (window.vehicleManager?.setupVehicleLookup?.bind(window.vehicleManager) ||
   function(){ /* no-op */ });


function sanitizeText(text) {
    if (!text) return text;
    return text
        .replace(/['״"']/g, '')  // מחיקת כל סוגי הגרשים (עברי, אנגלי, גרשיים)
        .trim();
}

/**
 * Collect selected defects from the defect selector
 */
function collectDefectDetails() {
    const container = document.getElementById('selectedDefects');
    if (!container) {
        return '';
    }
    
    if (!container.classList.contains('has-selections')) {
        return '';
    }
    
    const tags = container.querySelectorAll('.defect-tag');
    const defects = Array.from(tags).map(tag => tag.textContent);
    
    return defects.join(', ');
}


// /**
//  * Collect selected defects from the defect selector
//  */
// function collectDefectDetails() {
//     const container = document.getElementById('selectedDefects');
//     if (!container || !container.classList.contains('has-selections')) {
//         return '';
//     }
    
//     const tags = container.querySelectorAll('.defect-tag');
//     const defects = Array.from(tags).map(tag => tag.textContent);
    
//     return defects.join(', ');
// }

/**
 * Reset defect selections
 */
function resetDefectSelections() {
    const container = document.getElementById('selectedDefects');
    if (container) {
        container.innerHTML = '<div class="selected-defects-placeholder">לא נבחרו תקלות</div>';
        container.classList.remove('has-selections');
    }
}

/**
 * Collect selected tows from the tow selector
 */
function collectTowSelection() {
    const container = document.getElementById('selectedTow');
    if (!container || !container.classList.contains('has-selection')) {
        return '';
    }
    
    const tags = container.querySelectorAll('.tow-tag');
    const tows = Array.from(tags).map(tag => tag.textContent);
    
    return tows.join(', ');
}

/**
 * Reset tow selections
 */
function resetTowSelection() {
    const container = document.getElementById('selectedTow');
    if (container) {
        container.innerHTML = '<div class="selected-tow-placeholder">לא נבחר גרר</div>';
        container.classList.remove('has-selection');
    }
}

// ✨ פונקציה חדשה לטיפול בכתובות עם טקסט מקורי
function processAddress(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return { address: '', isGoogleAddress: false };
    
    const hasChanged = field.dataset.hasChanged === 'true';
    const originalText = field.dataset.originalText;
    const physicalAddress = field.dataset.physicalAddress;
    const currentValue = field.value;
    
    let displayAddress;
    let addressForWaze;
    
    if (hasChanged && originalText && physicalAddress) {
        // אם היה שינוי, הצג: "טקסט מקורי - כתובת פיזית"
        displayAddress = `${originalText} - ${physicalAddress}`;
        addressForWaze = physicalAddress; // קישור Waze לכתובת הפיזית
    } else {
        // אם אין שינוי, השתמש בערך הנוכחי
        displayAddress = currentValue;
        addressForWaze = currentValue;
    }
    
    return {
        address: displayAddress,
        physicalAddress: addressForWaze,
        isGoogleAddress: field.dataset.isGoogleAddress === 'true'
    };
}

function collectPricingData() {
  const isOutskirts = !!document.getElementById('isOutskirts')?.checked;
  const selectedTier = document.querySelector('input[name="priceType"]:checked')?.value || 'regular';
  const autoRecommendedTier = getRecommendedTier(new Date());

  // אם מצב ידני פעיל – נשתמש בסכום הידני
  const manualOn = (typeof isManualMode === 'function') && isManualMode();
  const manualVal = document.getElementById('customPrice')?.value?.trim();
  const manualAmount = manualOn && manualVal ? Number(manualVal.replace(/[^\d]/g,'')) || 0 : null;

  // הסכום/טיר האפקטיבי מהמערכת (כשלא במצב ידני)
  const { tier: autoTier, amount: autoAmount } = getEffectiveAmount();

  const finalTier  = manualOn ? 'manual' : autoTier;
  const finalPrice = manualOn ? manualAmount : autoAmount;

  const readAmount = sel => {
    const el = document.querySelector(sel);
    if (!el) return null;
    return Number(String(el.textContent || el.innerText || '')
      .replace(/[^\d.,-]/g,'')
      .replace(',','.'));
  };

  return {
    outskirts: isOutskirts,
    selectedTier,            // מה שהמשתמש סימן ידנית (אם לא ידני – אחד מהרדיו)
    autoRecommendedTier,     // מה מומלץ לפי הזמן
    finalTier,               // 'manual' או אחד מהטירים
    finalPrice,              // הסכום הסופי שנשלח ליומן
    displayed: {             // הסכומים שמופיעים על הכרטיסים כרגע
      regular: readAmount('#price-regular-amount'),
      plus25:  readAmount('#price-plus25-amount'),
      plus50:  readAmount('#price-plus50-amount')
    }
  };
}


// פונקציה לאיסוף הנתונים מהטופס
// עדכון לפונקציה collectFormData ב-calendar-integration.js

function collectFormData() {
    // קבלת זמן נוכחי
    const now = new Date();
    const currentTime = now.toTimeString().substring(0, 5); // פורמט של HH:MM
    
    // בדיקה אם נבחר תאריך אחר או להשתמש בתאריך של היום
    let executionDate = document.getElementById('executionDate').value;
    if (!executionDate) {
        // אם אין תאריך נבחר, השתמש בתאריך של היום
        const today = now.toISOString().split('T')[0];
        executionDate = today;
    }
    
    const formData = {
        orderNumber: document.getElementById('orderNumber').value,
        executionDate: executionDate,
        executionTime: currentTime, // משתמשים בזמן הנוכחי עבור שעת הביצוע
        towingType: document.getElementById('towingType').value,
        towSelection: collectTowSelection(),
        notes: document.getElementById('notes').value,
        submittedBy: localStorage.getItem('userEmail') || 'לא ידוע',
        company: localStorage.getItem('userCompany') || 'לא ידוע', // הוספת שם החברה
        clientName: document.getElementById('clientName').value || '',
        department: localStorage.getItem('userDepartment') || '' // הוספת שם המחלקה
    };

    // בדיקה אם טופס רכב נוסף מוצג
    const secondDefectiveCarForm = document.getElementById('secondDefectiveCarForm');
    const hasSecondCar = secondDefectiveCarForm && !secondDefectiveCarForm.classList.contains('hidden');
    formData.hasSecondCar = hasSecondCar;
    
    // הוספת מקור המידע לכל רכב
    formData.dataSource_defective = document.getElementById('dataSource_defective')?.value || '';
    formData.dataSource_defective2 = document.getElementById('dataSource_defective2')?.value || '';
    formData.dataSource_working = document.getElementById('dataSource_working')?.value || '';
    formData.dataSource_exchangeDefective = document.getElementById('dataSource_exchangeDefective')?.value || '';

    if (formData.towingType === 'defective') {
        // ✨ עדכון location להשתמש בפונקציה החדשה
        const sourceData = processAddress('defectiveSource');
        formData.location = sourceData.physicalAddress; // עבור הלוקיישן של האירוע
        
        // ✨ קבלת צבע וגיר מה-data attributes ✨
        const defectiveCarTypeField = document.getElementById('defectiveCarType');
        
        formData.defectiveCar = {
            carNumber: document.getElementById('defectiveCarNumber').value,
            carType: sanitizeText(document.getElementById('defectiveCarType').value),
            carCode: document.getElementById('defectiveCarCode').value,
            color: defectiveCarTypeField?.dataset.color || '', 
            gear: defectiveCarTypeField?.dataset.gear || '',   
            machineryType: defectiveCarTypeField?.dataset.machineryType || '',
            selfWeight: defectiveCarTypeField?.dataset.selfWeight || '',
            totalWeightTon: defectiveCarTypeField?.dataset.totalWeightTon || '',
            fuelType: defectiveCarTypeField?.dataset.fuelType || '',
            driveType: defectiveCarTypeField?.dataset.driveType || '',
            gearType: defectiveCarTypeField?.dataset.gearType || '',

            defectDetails: collectDefectDetails(),
            towSelection: collectTowSelection(),
            // ✨ שימוש בפונקציה החדשה לכתובות
            source: processAddress('defectiveSource'),
            destination: processAddress('defectiveDestination'),
            primaryContact: {
                name: document.getElementById('contactName1').value,
                phone: document.getElementById('contactPhone1').value
            },
            destinationContact: {
                name: document.getElementById('destContactName').value,
                phone: document.getElementById('destContactPhone').value
            }
        };
        
        // בדיקה אם יש רכב שני
        if (hasSecondCar) {
            const shareSource = document.querySelector('.choice-btn[data-target="same-source"]').classList.contains('selected');
            const shareDestination = document.querySelector('.choice-btn[data-target="same-destination"]').classList.contains('selected');
            
            // ✨ קבלת צבע וגיר של רכב שני ✨
            const defectiveCarType2Field = document.getElementById('defectiveCarType2');
            
            formData.secondDefectiveCar = {
                carNumber: document.getElementById('defectiveCarNumber2').value,
                carType: document.getElementById('defectiveCarType2').value,
                carCode: document.getElementById('defectiveCarCode2').value,
                color: defectiveCarType2Field?.dataset.color || '', 
                gear: defectiveCarType2Field?.dataset.gear || '',  
                machineryType: defectiveCarType2Field?.dataset.machineryType || '',
                selfWeight: defectiveCarType2Field?.dataset.selfWeight || '',
                totalWeightTon: defectiveCarType2Field?.dataset.totalWeightTon || '',
                fuelType: defectiveCarType2Field?.dataset.fuelType || '',
                driveType: defectiveCarType2Field?.dataset.driveType || '',
                gearType: defectiveCarType2Field?.dataset.gearType || '',
                defectDetails: document.getElementById('defectDetails2').value,
                shareSource: shareSource,
                shareDestination: shareDestination
            };
            
            // אם לא משתפים את המוצא, השתמש בערכים שהוזנו
            if (!shareSource) {
                // ✨ שימוש בפונקציה החדשה
                formData.secondDefectiveCar.source = processAddress('defectiveSource2');
                formData.secondDefectiveCar.primaryContact = {
                    name: document.getElementById('contactName2').value,
                    phone: document.getElementById('contactPhone2').value
                };
            } else {
                // אם משתפים את המוצא, העתק מהרכב הראשון
                formData.secondDefectiveCar.source = formData.defectiveCar.source;
                formData.secondDefectiveCar.primaryContact = formData.defectiveCar.primaryContact;
            }
            
            // אם לא משתפים את היעד, השתמש בערכים שהוזנו
            if (!shareDestination) {
                // ✨ שימוש בפונקציה החדשה
                formData.secondDefectiveCar.destination = processAddress('defectiveDestination2');
                formData.secondDefectiveCar.destinationContact = {
                    name: document.getElementById('destContactName2').value,
                    phone: document.getElementById('destContactPhone2').value
                };
            } else {
                // אם משתפים את היעד, העתק מהרכב הראשון
                formData.secondDefectiveCar.destination = formData.defectiveCar.destination;
                formData.secondDefectiveCar.destinationContact = formData.defectiveCar.destinationContact;
            }
        }
    } else if (formData.towingType === 'exchange') {
        // ✨ עדכון location להשתמש בפונקציה החדשה
        const sourceData = processAddress('workingCarSource');
        formData.location = sourceData.physicalAddress; // עבור הלוקיישן של האירוע
        
        // ✨ קבלת צבע וגיר של רכב תקין ✨
        const workingCarTypeField = document.getElementById('workingCarType');
        
        formData.workingCar = {
            carType: document.getElementById('workingCarType').value,
            carNumber: document.getElementById('workingCarNumber').value,
            carCode: document.getElementById('workingCarCode').value,
            color: workingCarTypeField?.dataset.color || '', 
            gear: workingCarTypeField?.dataset.gear || '',   
            machineryType: workingCarTypeField?.dataset.machineryType || '',
            selfWeight: workingCarTypeField?.dataset.selfWeight || '',
            totalWeightTon: workingCarTypeField?.dataset.totalWeightTon || '',
            fuelType: workingCarTypeField?.dataset.fuelType || '',
            driveType: workingCarTypeField?.dataset.driveType || '',
            gearType: workingCarTypeField?.dataset.gearType || '',
            // ✨ שימוש בפונקציה החדשה לכתובות
            source: processAddress('workingCarSource'),
            destination: processAddress('workingCarDestination'),
            sourceContact: {
                name: document.getElementById('workingSourceContact').value,
                phone: document.getElementById('workingSourcePhone').value
            },
            destContact: {
                name: document.getElementById('workingDestContact').value,
                phone: document.getElementById('workingDestPhone').value
            }
        };

        // ✨ קבלת צבע וגיר של רכב תקול לאיסוף ✨
        const exchangeDefectiveTypeField = document.getElementById('exchangeDefectiveType');

        formData.defectivePickup = {
            carType: document.getElementById('exchangeDefectiveType').value,
            carNumber: document.getElementById('exchangeDefectiveNumber').value,
            carCode: document.getElementById('exchangeDefectiveCode').value,
            color: exchangeDefectiveTypeField?.dataset.color || '', 
            gear: exchangeDefectiveTypeField?.dataset.gear || '',   
            machineryType: exchangeDefectiveTypeField?.dataset.machineryType || '',
            selfWeight: exchangeDefectiveTypeField?.dataset.selfWeight || '',
            totalWeightTon: exchangeDefectiveTypeField?.dataset.totalWeightTon || '',
            fuelType: exchangeDefectiveTypeField?.dataset.fuelType || '',
            driveType: exchangeDefectiveTypeField?.dataset.driveType || '',
            gearType: exchangeDefectiveTypeField?.dataset.gearType || '',
            defectDetails: document.getElementById('exchangeDefectiveDetails').value,
            // ✨ שימוש בפונקציה החדשה לכתובות
            destination: processAddress('exchangeDefectiveDestination'),
            garageContact: {
                name: document.getElementById('garageContact').value,
                phone: document.getElementById('garagePhone').value
            }
        };
    }

    // ✨ איסוף נתוני תמחור מה-PricingManager
    formData.pricing = collectPricingData();

    // ✨ הוספת נתוני מרחק מה-PricingManager
    if (window.pricingManager && typeof window.pricingManager.getDistanceData === 'function') {
        formData.distanceData = window.pricingManager.getDistanceData();
    }

    // ✨ איסוף פירוט תמחור מפורט - גרסה סופית
    if (window.pricingManager && typeof window.pricingManager.getPricingData === 'function') {
        const pricingDetails = window.pricingManager.getPricingData();
        console.log('🔍 pricingDetails:', JSON.stringify(pricingDetails, null, 2));

        // ✨ שימוש בפירוט המדויק מה-PricingManager
        if (typeof window.pricingManager.getPriceBreakdown === 'function') {
            const breakdown = window.pricingManager.getPriceBreakdown();
            const isManualMode = window.pricingManager.isManualMode();
            
            if (isManualMode) {
                // במחיר ידני - רק המחיר הסופי
                formData.priceBredown = {
                    totalPrice: breakdown.finalTotal,
                    isManual: true
                };
            } else {
                // במחיר אוטומטי - פירוט מלא   
            formData.priceBredown = {
                vehicleBasePrice: breakdown.vehicleBasePrice,
                vehicleDescription: breakdown.vehicleDescription,
                travelDistance: breakdown.travelDistance,
                travelPrice: breakdown.travelPrice,
                workFees: breakdown.workFees,
                timeSurcharge: breakdown.timeSurcharge,
                areaSurcharge: breakdown.outskirtsAmount,
                totalPrice: breakdown.finalTotal,
                // נתונים למע"מ
                totalBeforeVAT: breakdown.subtotalBeforeVAT,
                vatAmount: breakdown.vatAmount,
                vatPercentage: 18
            };
        }
            
            console.log('💰 פירוט מחיר מפורט:', formData.priceBredown);
            console.log('🔍 נתוני רכב תקול:', formData.defectiveCar);
            console.log('🔍 נתוני בחירת גרר:', formData.towSelection);

        } else {
            console.warn('getPriceBreakdown function not available');
        }
    }

    // קבלת מחיר סופי - עדיפות למחיר ידני
    const priceField = document.getElementById('price');
    let finalPrice = 0;

    if (priceField && priceField.value) {
        finalPrice = Number(priceField.value.replace(/[^\d]/g, '')) || 0;
        console.log('מחיר נמצא בשדה הנסתר:', finalPrice);
    } else if (formData.pricing?.finalPrice) {
        finalPrice = Number(formData.pricing.finalPrice) || 0;
        console.log('מחיר נמצא ב-pricing:', finalPrice);
    }

    formData.totalPrice = finalPrice;
    console.log('מחיר סופי שנשלח:', formData.totalPrice);

    // הוספת פרטי תשלום
    const selectedPaymentType = getSelectedPaymentType();
    formData.payment = {
        paymentType: selectedPaymentType,
        price: finalPrice > 0 ? finalPrice : formData.totalPrice || undefined
    };

    // הוספת פרטי אשראי אם נבחר סוג תשלום אשראי
    if (selectedPaymentType === 'credit') {
        formData.payment.idNumber = document.getElementById('idNumber').value || '';
        formData.payment.creditCard = {
            number: document.getElementById('cardNumber').value || '',
            expiry: document.getElementById('cardExpiry').value || '',
            cvv: document.getElementById('cardCvv').value || '',
            holderPhone: document.getElementById('cardHolderPhone').value || ''
        };
        console.log('Credit card data:', formData.payment.creditCard); // הוסיפי את זה
    }

    return formData;
}


function getSelectedPaymentType() {
    const activeButton = document.querySelector('.payment-btn.active');
    return activeButton ? activeButton.dataset.payment : 'cash';
}

// פונקציה לטיפול במודל הצלחה
document.getElementById('successOkButton').addEventListener('click', function() {
    // סגירת מודל הצלחה
    const successModal = document.getElementById('successModal');
    successModal.classList.remove('show');
    
    // איפוס הטופס תוך שמירה על נתוני המשתמש
    resetFormKeepUserData();
});

// תחליף את הפונקציה resetFormKeepUserData בקובץ calendar-integration.js עם הגרסה הזו:

function resetFormKeepUserData() {
    // שמירה על נתוני המשתמש לפני איפוס (רק פרטי משתמש!)
    const userEmail = localStorage.getItem('userEmail');
    const userCompany = localStorage.getItem('userCompany');
    const userDepartment = localStorage.getItem('userDepartment');

    // איפוס כל הטופס - כולל נתוני רכב!
    document.getElementById('towingForm').reset();

    // 🔧 ניקוי מלא של כל נתוני הכתובות
    const addressFields = [
        'defectiveSource', 'defectiveDestination',
        'defectiveSource2', 'defectiveDestination2',
        'workingCarSource', 'workingCarDestination',
        'exchangeDefectiveDestination'
    ];
    addressFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            field.dataset.physicalAddress = '';
            field.dataset.isGoogleAddress = 'false';
            field.dataset.hasChanged = 'false';
            field.dataset.originalText = '';
            delete field.dataset.physicalAddress;
            delete field.dataset.isGoogleAddress;
            delete field.dataset.hasChanged;
            delete field.dataset.originalText;
            console.log(`🧹 נוקה שדה כתובת: ${fieldId}`);
        }
    });

    // 🔧 ניקוי מלא של כל נתוני הרכב (בלי שמירה!)
    const vehicleFields = [
        'defectiveCarType',
        'defectiveCarType2',
        'workingCarType',
        'exchangeDefectiveType'
    ];
    vehicleFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            delete field.dataset.color;
            delete field.dataset.gear;
            delete field.dataset.machineryType;
            delete field.dataset.selfWeight;
            delete field.dataset.totalWeightTon;
            delete field.dataset.fuelType;
            delete field.dataset.driveType;
            delete field.dataset.gearType;
            field.closest('.form-group')?.classList.add('vehicle-type-hidden');
            console.log(`🧹 נוקה שדה רכב: ${fieldId}`);
        }
    });

    // 🔧 ניקוי מלא של מקורות המידע (data sources)
    ['defective', 'defective2', 'working', 'exchangeDefective'].forEach(context => {
        const sourceField = document.getElementById(`dataSource_${context}`);
        if (sourceField) {
            sourceField.remove();
            console.log(`🧹 הוסר מקור מידע: ${context}`);
        }
    });

    // החזרה למצב תצוגה התחלתי
    document.getElementById('summaryPage').classList.add('hidden');
    document.getElementById('towingForm').classList.remove('hidden');
    document.getElementById('defectiveCarForm')?.classList.add('hidden');
    document.getElementById('exchangeForm')?.classList.add('hidden');
    document.getElementById('secondDefectiveCarForm')?.classList.add('hidden');

    const addCarButtonContainer = document.getElementById('addCarButtonContainer');
    if (addCarButtonContainer) {
        addCarButtonContainer.classList.add('hidden');
        addCarButtonContainer.style.visibility = 'hidden';
    }

    // איפוס בחירת סוג גרירה
    const towingTypeEl = document.getElementById('towingType');
    if (towingTypeEl) towingTypeEl.value = '';

    // החזרת התאריך להיום והכפתורים למצב ברירת מחדל
    const today = new Date().toISOString().split('T')[0];
    const execDateEl = document.getElementById('executionDate');
    if (execDateEl) execDateEl.value = today;

    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-target="today"]')?.classList.add('active');
    document.getElementById('datePicker')?.classList.add('hidden');

    // איפוס מחיר חשבונית (שדה הטופס הישן)
    const priceField = document.getElementById('price');
    if (priceField) {
        priceField.value = '';
        priceField.style.backgroundColor = '';
        priceField.style.border = '';
        priceField.removeAttribute('title');
        priceField.dataset.autoCalculated = 'false';
        priceField.dataset.manuallyEdited = 'false';
        delete priceField.dataset.calculationDetails;
    }

    // 💸 איפוס תמחור חדש: רדיו/מחיר ידני/שטחים/המלצה
    const outskirts = document.getElementById('isOutskirts');
    if (outskirts) outskirts.checked = false;

    // איפוס מצב השטחים במערכת התמחור
    if (window.pricingManager) {
        window.pricingManager.state.outskirts = false;
    }
    // רדיו: אפס הכל - אף טיר לא נבחר
    const priceRadios = document.querySelectorAll('input[name="priceType"]');
    priceRadios.forEach(r => r.checked = false);

    // הסרת בחירה ויזואלית מכרטיסים ישנים
    document.querySelectorAll('.price-card-label').forEach(lbl => lbl.classList.remove('selected'));
    document.querySelectorAll('.price-card').forEach(card => card.classList.remove('recommended'));

    // מחיר ידני: הסתר ונקה
    const manualWrap = document.querySelector('.manual-input-wrap');
    if (manualWrap) manualWrap.style.display = 'none';
    const manualInput = document.getElementById('customPrice');
    if (manualInput) manualInput.value = '';

    // איפוס מלא של כל המחירים
    const regularAmount = document.getElementById('price-regular-amount');
    const plus25Amount = document.getElementById('price-plus25-amount'); 
    const plus50Amount = document.getElementById('price-plus50-amount');

    if (regularAmount) regularAmount.textContent = '0₪';
    if (plus25Amount) plus25Amount.textContent = '0₪';
    if (plus50Amount) plus50Amount.textContent = '0₪';

    // מחיר ידני: איפוס
    const customPriceInput = document.getElementById('customPrice');
    if (customPriceInput) {
        customPriceInput.value = '';
    }

    // איפוס מצב התמחור
    if (window.__pricingState) {
        delete window.__pricingState.baseInclVAT;
        delete window.__pricingState.chosenTier;
    }

    // רענון המלצה על מחיר לפי זמן נוכחי (ללא סכומים)
    if (window.pricingManager && typeof window.pricingManager.refreshRecommendedTier === 'function') {
        window.pricingManager.refreshRecommendedTier();
        console.log('רענון המלצת מחיר בוצע');
    }

    // איפוס הפירוט המפורט ב-PricingManager
    if (window.pricingManager && typeof window.pricingManager.resetPriceBreakdown === 'function') {
        window.pricingManager.resetPriceBreakdown();
        console.log('איפוס פירוט מחיר בוצע');
    }

    // איפוס מצב השטחים במערכת התמחור
    if (window.pricingManager) {
        window.pricingManager.state.outskirts = false;
    }

    // איפוס כפתורי תשלום
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-payment="cash"]')?.classList.add('active');
    document.getElementById('creditCardSection')?.classList.add('hidden');

    // 🔧 הגדרה מחדש של המאזינים אחרי הניקוי
    console.log('🔄 מגדיר מחדש מאזיני רכב...');
    setupVehicleLookup();
    if (typeof setupPhoneSanitization === 'function') setupPhoneSanitization();
    if (typeof setupAddressTracking === 'function') setupAddressTracking();

    // איפוס בחירות התקלות
    resetDefectSelections();
    resetTowSelection();
    console.log('✅ הטופס אופס (כולל תמחור) — פרטי המשתמש נשמרו');
}

// חשיפת הפונקציות גלובלית
window.collectDefectDetails = collectDefectDetails;
window.collectTowSelection = collectTowSelection;