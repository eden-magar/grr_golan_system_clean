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
    
    const isPinDropped = field.dataset.isPinDropped === 'true';
    const lat = field.dataset.lat;
    const lng = field.dataset.lng;
    
    if (isPinDropped && lat && lng) {
        const cleanAddress = field.dataset.physicalAddress || field.value.replace(' (מיקום מדויק)', '');
        
        return {
            address: cleanAddress,
            physicalAddress: cleanAddress,
            isGoogleAddress: true,
            isPinDropped: true,
            lat: parseFloat(lat),
            lng: parseFloat(lng)
        };
    }
    
    // ⭐ זה החלק שצריך לתקן
    const hasChanged = field.dataset.hasChanged === 'true';
    const originalText = field.dataset.originalText || '';
    const physicalAddress = field.dataset.physicalAddress || '';
    const currentValue = field.value;
    
    return {
        address: currentValue,
        physicalAddress: physicalAddress || currentValue,
        isGoogleAddress: field.dataset.isGoogleAddress === 'true',
        originalText: originalText,  // ⭐ הוסף את זה
        hasChanged: hasChanged        // ⭐ הוסף את זה
    };
}

// function processAddress(fieldId) {
//     const field = document.getElementById(fieldId);
//     if (!field) return { address: '', isGoogleAddress: false };
    
//     const isPinDropped = field.dataset.isPinDropped === 'true';
//     const lat = field.dataset.lat;
//     const lng = field.dataset.lng;
    
//     if (isPinDropped && lat && lng) {
//         // Pin drop - send coordinates to Google Apps Script
//         const cleanAddress = field.dataset.physicalAddress || field.value.replace(' (מיקום מדויק)', '');
        
//         return {
//             address: cleanAddress,
//             physicalAddress: cleanAddress,
//             isGoogleAddress: true,
//             isPinDropped: true,
//             lat: parseFloat(lat),
//             lng: parseFloat(lng)
//         };
//     }
    
//     // Regular address handling (keep existing logic)
//     const hasChanged = field.dataset.hasChanged === 'true';
//     const originalText = field.dataset.originalText;
//     const physicalAddress = field.dataset.physicalAddress;
//     const currentValue = field.value;
    
//     let displayAddress, addressForWaze;
    
//     if (hasChanged && originalText && physicalAddress) {
//     // Show only the clean physical address, not the duplicate
//         displayAddress = physicalAddress;
//         addressForWaze = physicalAddress;
//     } else {
//         displayAddress = currentValue;
//         addressForWaze = currentValue;
//     }
    
//     return {
//         address: displayAddress,
//         physicalAddress: addressForWaze,
//         isGoogleAddress: field.dataset.isGoogleAddress === 'true'
//     };
// }

function collectPricingData() {
  // 🔧 תיקון: שימוש ב-PricingManager state במקום קריאה ישירה לצ'קבוקס
  const isOutskirts = window.pricingManager ? 
    window.pricingManager.isOutskirts() : 
    !!document.getElementById('isOutskirts')?.checked;
    
  const selectedTier = document.querySelector('input[name="priceType"]:checked')?.value || 'regular';
  const autoRecommendedTier = getRecommendedTier(new Date());

  console.log('🏠 collectPricingData - isOutskirts:', isOutskirts);

  // אם מצב ידני פעיל — נשתמש בסכום הידני
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
    selectedTier,            // מה שהמשתמש סימן ידנית (אם לא ידני — אחד מהרדיו)
    autoRecommendedTier,     // מה מומלץ לפי הזמן
    finalTier,               // 'manual' או אחד מהטירים
    finalPrice,              // הסכום הסופי שנשלח ליומן
    discountEnabled: window.pricingManager ? window.pricingManager.state.discountEnabled : false,

    displayed: {             // הסכומים שמופיעים על הכרטיסים כרגע
      regular: readAmount('#price-regular-amount'),
      plus25:  readAmount('#price-plus25-amount'),
      plus50:  readAmount('#price-plus50-amount')
    }
  };
}


//  פונקציות עזר לפונקציית collectFromData
/**
 * Collect base form data (common to all types)
 */
function collectBaseFormData() {
    const now = new Date();
    
    // אם לא הוזנה שעה - השתמש בשעה נוכחית
    const execTimeField = document.getElementById('executionTime');
    const executionTime = execTimeField?.value || now.toTimeString().substring(0, 5);
    
    let executionDate = document.getElementById('executionDate').value;
    if (!executionDate) {
        executionDate = now.toISOString().split('T')[0];
    }
    
    return {
        orderNumber: document.getElementById('orderNumber').value,
        executionDate: executionDate,
        executionTime: executionTime, // עכשיו זה משתמש בשעה שהמשתמש הקליד או בשעה נוכחית
        towingType: document.getElementById('towingType').value,
        towSelection: collectTowSelection(),
        notes: document.getElementById('notes').value,
        submittedBy: localStorage.getItem('userEmail') || 'לא ידוע',
        clientName: document.getElementById('clientName').value || '',
        clientPhone: document.getElementById('clientPhone').value || '',
        priceApproved: document.getElementById('priceApprovedYes')?.classList.contains('active') || false,
        invoiceName: document.getElementById('invoiceName').value || '',
        company: localStorage.getItem('userCompany') || 'לא ידוע',
        department: localStorage.getItem('userDepartment') || ''
    };
}

/**
 * Collect vehicle data with color and gear info
 */
/**
 * Collect vehicle data with color and gear info
 */
function collectVehicleData(prefix) {
    // טיפול במקרה מיוחד של defective2
    const numberFieldId = prefix === 'defective2' ? 'defectiveCarNumber2' : `${prefix}CarNumber`;
    const typeFieldId = prefix === 'defective2' ? 'defectiveCarType2' : `${prefix}CarType`;
    const codeFieldId = prefix === 'defective2' ? 'defectiveCarCode2' : `${prefix}CarCode`;
    
    const numberField = document.getElementById(numberFieldId);
    const typeField = document.getElementById(typeFieldId);
    const codeField = document.getElementById(codeFieldId);
    
    return {
        carNumber: numberField?.value || '',
        carType: sanitizeText(typeField?.value || ''),
        carCode: codeField?.value || '',
        color: typeField?.dataset.color || '',
        gear: typeField?.dataset.gear || '',
        machineryType: typeField?.dataset.machineryType || '',
        selfWeight: typeField?.dataset.selfWeight || '',
        totalWeightTon: typeField?.dataset.totalWeightTon || '',
        fuelType: typeField?.dataset.fuelType || '',
        driveType: typeField?.dataset.driveType || '',
        gearType: typeField?.dataset.gearType || ''
    };
}

/**
 * Collect contact info
 */
function collectContactInfo(nameId, phoneId) {
    return {
        name: document.getElementById(nameId).value,
        phone: document.getElementById(phoneId).value
    };
}

/**
 * Collect defective car data
 */
function collectDefectiveData() {
    const sourceData = processAddress('defectiveSource');
    
    const secondDefectiveCarForm = document.getElementById('secondDefectiveCarForm');
    const hasSecondCar = secondDefectiveCarForm && !secondDefectiveCarForm.classList.contains('hidden');
    
    const data = {
        location: sourceData.physicalAddress,
        defectiveCar: {
            ...collectVehicleData('defective'),
            defectDetails: collectDefectDetails(),
            towSelection: collectTowSelection(),
            source: processAddress('defectiveSource'),
            destination: processAddress('defectiveDestination'),
            primaryContact: collectContactInfo('contactName1', 'contactPhone1'),
            destinationContact: collectContactInfo('destContactName', 'destContactPhone')
        },
        hasSecondCar: hasSecondCar,
        dataSource_defective: document.getElementById('dataSource_defective')?.value || ''
    };
    
    if (hasSecondCar) {
        const shareSource = document.querySelector('.choice-btn[data-target="same-source"]')?.classList.contains('selected');
        const shareDestination = document.querySelector('.choice-btn[data-target="same-destination"]')?.classList.contains('selected');
        
        data.secondDefectiveCar = {
            ...collectVehicleData('defective2'),
            defectDetails: document.getElementById('defectDetails2').value,
            shareSource: shareSource,
            shareDestination: shareDestination
        };
        
        if (!shareSource) {
            data.secondDefectiveCar.source = processAddress('defectiveSource2');
            data.secondDefectiveCar.primaryContact = collectContactInfo('contactName2', 'contactPhone2');
        } else {
            data.secondDefectiveCar.source = data.defectiveCar.source;
            data.secondDefectiveCar.primaryContact = data.defectiveCar.primaryContact;
        }
        
        if (!shareDestination) {
            data.secondDefectiveCar.destination = processAddress('defectiveDestination2');
            data.secondDefectiveCar.destinationContact = collectContactInfo('destContactName2', 'destContactPhone2');
        } else {
            data.secondDefectiveCar.destination = data.defectiveCar.destination;
            data.secondDefectiveCar.destinationContact = data.defectiveCar.destinationContact;
        }
        
        data.dataSource_defective2 = document.getElementById('dataSource_defective2')?.value || '';
    }
    
    return data;
}

/**
 * Collect working-defective (תקין-תקול) data
 */
function collectWorkingDefectiveData() {
    const sourceData = processAddress('workingSource');
    
    // Helper functions for tags
    const getDefectTags = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return '';
        const tags = container.querySelectorAll('.defect-tag');
        return Array.from(tags).map(tag => tag.textContent).join(', ');
    };
    
    const getTowTags = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return '';
        const tags = container.querySelectorAll('.tow-tag');
        return Array.from(tags).map(tag => tag.textContent).join(', ');
    };
    
    return {
        location: sourceData.physicalAddress,
        isNewWorkingDefective: true,
        workingCar: {
            ...collectVehicleData('working'),
            towSelection: getTowTags('workingSelectedTow'),
            source: processAddress('workingSource'),
            destination: processAddress('workingDestination'),
            sourceContact: collectContactInfo('workingSourceContactName', 'workingSourceContactPhone'),
            destContact: collectContactInfo('workingDestContactName', 'workingDestContactPhone')
        },
        defectivePickup: {
            ...collectVehicleData('defective2'),
            defectDetails: getDefectTags('selectedDefects2'),
            towSelection: getTowTags('selectedTow2'),
            source: processAddress('defectiveSource2'),
            destination: processAddress('defectiveDestination2'),
            sourceContact: collectContactInfo('defectiveSourceContactName2', 'defectiveSourceContactPhone2'),
            destContact: collectContactInfo('defectiveDestContactName2', 'defectiveDestContactPhone2')
        },
        manualPrice: document.getElementById('workingDefectivePrice').value,
        dataSource_working: document.getElementById('dataSource_working')?.value || '',
        dataSource_defective2: document.getElementById('dataSource_defective2')?.value || ''
    };
}

/**
 * Collect old exchange data (for backward compatibility)
 */
function collectOldExchangeData() {
    const sourceData = processAddress('workingCarSource');
    
    return {
        location: sourceData.physicalAddress,
        workingCar: {
            ...collectVehicleData('workingCar'),
            source: processAddress('workingCarSource'),
            destination: processAddress('workingCarDestination'),
            sourceContact: collectContactInfo('workingSourceContact', 'workingSourcePhone'),
            destContact: collectContactInfo('workingDestContact', 'workingDestPhone')
        },
        defectivePickup: {
            ...collectVehicleData('exchangeDefective'),
            defectDetails: document.getElementById('exchangeDefectiveDetails').value,
            destination: processAddress('exchangeDefectiveDestination'),
            garageContact: collectContactInfo('garageContact', 'garagePhone')
        },
        dataSource_working: document.getElementById('dataSource_working')?.value || '',
        dataSource_exchangeDefective: document.getElementById('dataSource_exchangeDefective')?.value || ''
    };
}

/**
 * Collect pricing data
 */
function collectPricingAndPaymentData() {
    const pricing = collectPricingData();
    const selectedPaymentType = getSelectedPaymentType();
    
    let finalPrice = 0;

// בדוק אם זה תקין-תקול עם מחיר ידני
const workingDefectivePrice = document.getElementById('workingDefectivePrice');
if (workingDefectivePrice && workingDefectivePrice.value) {
    finalPrice = Number(workingDefectivePrice.value) || 0;
} else if (window.pricingManager && typeof window.pricingManager.getFinalPrice === 'function') {
    finalPrice = window.pricingManager.getFinalPrice();
}
    
    const data = {
        pricing: pricing,
        totalPrice: finalPrice,
        isOutskirts: document.getElementById('isOutskirts')?.checked || false,
        isFromGarage: document.getElementById('isFromGarage')?.checked || false,
        payment: {
            paymentType: selectedPaymentType,
            price: finalPrice > 0 ? finalPrice : undefined
        }
    };
    
    if (pricing) {
        pricing.discountApplied = pricing.discountEnabled;
        pricing.fromGarage = data.isFromGarage;
    }
    
    if (window.pricingManager && typeof window.pricingManager.getDistanceData === 'function') {
        data.distanceData = window.pricingManager.getDistanceData();
    }
    
    if (window.pricingManager && typeof window.pricingManager.getPriceBreakdown === 'function') {
        const breakdown = window.pricingManager.getPriceBreakdown();
        const isManualMode = window.pricingManager.isManualMode();
        
        if (isManualMode) {
            data.priceBredown = {
                totalPrice: breakdown.finalTotal,
                isManual: true
            };
        } else {
            data.priceBredown = {
                vehicleBasePrice: breakdown.vehicleBasePrice,
                vehicleDescription: breakdown.vehicleDescription,
                travelDistance: breakdown.travelDistance,
                travelPrice: breakdown.travelPrice,
                workFees: breakdown.workFees,
                timeSurcharge: breakdown.timeSurcharge,
                areaSurcharge: breakdown.outskirtsAmount,
                totalPrice: breakdown.finalTotal,
                totalBeforeVAT: breakdown.subtotalBeforeVAT,
                vatAmount: breakdown.vatAmount,
                vatPercentage: 18
            };
        }
    }
    
    if (selectedPaymentType === 'credit') {
        data.payment.idNumber = document.getElementById('idNumber').value || '';
        data.payment.creditCard = {
            number: document.getElementById('cardNumber').value || '',
            expiry: document.getElementById('cardExpiry').value || '',
            cvv: document.getElementById('cardCvv').value || '',
            holderPhone: document.getElementById('cardHolderPhone').value || ''
        };
    }
    
    return data;
}

/**
 * Main function to collect all form data
 */
function collectFormData() {
    // נתונים בסיסיים משותפים לכל הטפסים
    const baseData = collectBaseFormData();
    
    // נתונים ספציפיים לפי סוג הגרירה
    let specificData = {};
    
    if (baseData.towingType === 'defective') {
        specificData = collectDefectiveData();
    } else if (baseData.towingType === 'exchange') {
        // בדיקה איזה exchange - חדש או ישן
        const workingDefectiveForm = document.getElementById('workingDefectiveForm');
        const isNewForm = workingDefectiveForm && !workingDefectiveForm.classList.contains('hidden');
        
        if (isNewForm) {
            specificData = collectWorkingDefectiveData();
        } else {
            specificData = collectOldExchangeData();
        }
    }
    
    // נתוני תמחור ותשלום
    const pricingData = collectPricingAndPaymentData();
    
    // שילוב הכל
    const formData = {
        ...baseData,
        ...specificData,
        ...pricingData
    };
    
    console.log('📦 Form data collected:', formData);
    return formData;
}


// function collectFormData() {
//     // קבלת זמן נוכחי
//     const now = new Date();
//     const currentTime = now.toTimeString().substring(0, 5); // פורמט של HH:MM
    
//     // בדיקה אם נבחר תאריך אחר או להשתמש בתאריך של היום
//     let executionDate = document.getElementById('executionDate').value;
//     if (!executionDate) {
//         // אם אין תאריך נבחר, השתמש בתאריך של היום
//         const today = now.toISOString().split('T')[0];
//         executionDate = today;
//     }
    
//     const formData = {
//         orderNumber: document.getElementById('orderNumber').value,
//         executionDate: executionDate,
//         executionTime: currentTime, // משתמשים בזמן הנוכחי עבור שעת הביצוע
//         towingType: document.getElementById('towingType').value,
//         towSelection: collectTowSelection(),
//         notes: document.getElementById('notes').value,
//         submittedBy: localStorage.getItem('userEmail') || 'לא ידוע',
//         // שדות חדשים שהוספנו
//         clientName: document.getElementById('clientName').value || '',
//         clientPhone: document.getElementById('clientPhone').value || '',
//         // בדיקת מצב אישור הצעת מחיר
//         priceApproved: document.getElementById('priceApprovedYes')?.classList.contains('active') || false,
//         // שם לחשבונית
//         invoiceName: document.getElementById('invoiceName').value || '',
//         // company: localStorage.getItem('userCompany') || 'לא ידוע', // הוספת שם החברה
//         // clientName: document.getElementById('clientName').value || '',
//         // department: localStorage.getItem('userDepartment') || '' // הוספת שם המחלקה
//         company: localStorage.getItem('userCompany') || 'לא ידוע',
//         department: localStorage.getItem('userDepartment') || '' 
//     };

//     // בדיקה אם טופס רכב נוסף מוצג
//     const secondDefectiveCarForm = document.getElementById('secondDefectiveCarForm');
//     const hasSecondCar = secondDefectiveCarForm && !secondDefectiveCarForm.classList.contains('hidden');
//     formData.hasSecondCar = hasSecondCar;
    
//     // הוספת מקור המידע לכל רכב
//     formData.dataSource_defective = document.getElementById('dataSource_defective')?.value || '';
//     formData.dataSource_defective2 = document.getElementById('dataSource_defective2')?.value || '';
//     formData.dataSource_working = document.getElementById('dataSource_working')?.value || '';
//     formData.dataSource_exchangeDefective = document.getElementById('dataSource_exchangeDefective')?.value || '';

//     if (formData.towingType === 'defective') {
//         // ✨ עדכון location להשתמש בפונקציה החדשה
//         const sourceData = processAddress('defectiveSource');
//         formData.location = sourceData.physicalAddress; // עבור הלוקיישן של האירוע
        
//         // ✨ קבלת צבע וגיר מה-data attributes ✨
//         const defectiveCarTypeField = document.getElementById('defectiveCarType');
        
//         formData.defectiveCar = {
//             carNumber: document.getElementById('defectiveCarNumber').value,
//             carType: sanitizeText(document.getElementById('defectiveCarType').value),
//             carCode: document.getElementById('defectiveCarCode').value,
//             color: defectiveCarTypeField?.dataset.color || '', 
//             gear: defectiveCarTypeField?.dataset.gear || '',   
//             machineryType: defectiveCarTypeField?.dataset.machineryType || '',
//             selfWeight: defectiveCarTypeField?.dataset.selfWeight || '',
//             totalWeightTon: defectiveCarTypeField?.dataset.totalWeightTon || '',
//             fuelType: defectiveCarTypeField?.dataset.fuelType || '',
//             driveType: defectiveCarTypeField?.dataset.driveType || '',
//             gearType: defectiveCarTypeField?.dataset.gearType || '',

//             defectDetails: collectDefectDetails(),
//             towSelection: collectTowSelection(),
//             // ✨ שימוש בפונקציה החדשה לכתובות
//             source: processAddress('defectiveSource'),
//             destination: processAddress('defectiveDestination'),
//             primaryContact: {
//                 name: document.getElementById('contactName1').value,
//                 phone: document.getElementById('contactPhone1').value
//             },
//             destinationContact: {
//                 name: document.getElementById('destContactName').value,
//                 phone: document.getElementById('destContactPhone').value
//             }
//         };
        
//         // בדיקה אם יש רכב שני
//         if (hasSecondCar) {
//             const shareSource = document.querySelector('.choice-btn[data-target="same-source"]').classList.contains('selected');
//             const shareDestination = document.querySelector('.choice-btn[data-target="same-destination"]').classList.contains('selected');
            
//             // ✨ קבלת צבע וגיר של רכב שני ✨
//             const defectiveCarType2Field = document.getElementById('defectiveCarType2');
            
//             formData.secondDefectiveCar = {
//                 carNumber: document.getElementById('defectiveCarNumber2').value,
//                 carType: document.getElementById('defectiveCarType2').value,
//                 carCode: document.getElementById('defectiveCarCode2').value,
//                 color: defectiveCarType2Field?.dataset.color || '', 
//                 gear: defectiveCarType2Field?.dataset.gear || '',  
//                 machineryType: defectiveCarType2Field?.dataset.machineryType || '',
//                 selfWeight: defectiveCarType2Field?.dataset.selfWeight || '',
//                 totalWeightTon: defectiveCarType2Field?.dataset.totalWeightTon || '',
//                 fuelType: defectiveCarType2Field?.dataset.fuelType || '',
//                 driveType: defectiveCarType2Field?.dataset.driveType || '',
//                 gearType: defectiveCarType2Field?.dataset.gearType || '',
//                 defectDetails: document.getElementById('defectDetails2').value,
//                 shareSource: shareSource,
//                 shareDestination: shareDestination
//             };
            
//             // אם לא משתפים את המוצא, השתמש בערכים שהוזנו
//             if (!shareSource) {
//                 // ✨ שימוש בפונקציה החדשה
//                 formData.secondDefectiveCar.source = processAddress('defectiveSource2');
//                 formData.secondDefectiveCar.primaryContact = {
//                     name: document.getElementById('contactName2').value,
//                     phone: document.getElementById('contactPhone2').value
//                 };
//             } else {
//                 // אם משתפים את המוצא, העתק מהרכב הראשון
//                 formData.secondDefectiveCar.source = formData.defectiveCar.source;
//                 formData.secondDefectiveCar.primaryContact = formData.defectiveCar.primaryContact;
//             }
            
//             // אם לא משתפים את היעד, השתמש בערכים שהוזנו
//             if (!shareDestination) {
//                 // ✨ שימוש בפונקציה החדשה
//                 formData.secondDefectiveCar.destination = processAddress('defectiveDestination2');
//                 formData.secondDefectiveCar.destinationContact = {
//                     name: document.getElementById('destContactName2').value,
//                     phone: document.getElementById('destContactPhone2').value
//                 };
//             } else {
//                 // אם משתפים את היעד, העתק מהרכב הראשון
//                 formData.secondDefectiveCar.destination = formData.defectiveCar.destination;
//                 formData.secondDefectiveCar.destinationContact = formData.defectiveCar.destinationContact;
//             }
//         }
//     } else if (formData.towingType === 'exchange') {
//         // ✨ עדכון location להשתמש בפונקציה החדשה
//         const sourceData = processAddress('workingCarSource');
//         formData.location = sourceData.physicalAddress; // עבור הלוקיישן של האירוע
        
//         // ✨ קבלת צבע וגיר של רכב תקין ✨
//         const workingCarTypeField = document.getElementById('workingCarType');
        
//         formData.workingCar = {
//             carType: document.getElementById('workingCarType').value,
//             carNumber: document.getElementById('workingCarNumber').value,
//             carCode: document.getElementById('workingCarCode').value,
//             color: workingCarTypeField?.dataset.color || '', 
//             gear: workingCarTypeField?.dataset.gear || '',   
//             machineryType: workingCarTypeField?.dataset.machineryType || '',
//             selfWeight: workingCarTypeField?.dataset.selfWeight || '',
//             totalWeightTon: workingCarTypeField?.dataset.totalWeightTon || '',
//             fuelType: workingCarTypeField?.dataset.fuelType || '',
//             driveType: workingCarTypeField?.dataset.driveType || '',
//             gearType: workingCarTypeField?.dataset.gearType || '',
//             // ✨ שימוש בפונקציה החדשה לכתובות
//             source: processAddress('workingCarSource'),
//             destination: processAddress('workingCarDestination'),
//             sourceContact: {
//                 name: document.getElementById('workingSourceContact').value,
//                 phone: document.getElementById('workingSourcePhone').value
//             },
//             destContact: {
//                 name: document.getElementById('workingDestContact').value,
//                 phone: document.getElementById('workingDestPhone').value
//             }
//         };

//         // ✨ קבלת צבע וגיר של רכב תקול לאיסוף ✨
//         const exchangeDefectiveTypeField = document.getElementById('exchangeDefectiveType');

//         formData.defectivePickup = {
//             carType: document.getElementById('exchangeDefectiveType').value,
//             carNumber: document.getElementById('exchangeDefectiveNumber').value,
//             carCode: document.getElementById('exchangeDefectiveCode').value,
//             color: exchangeDefectiveTypeField?.dataset.color || '', 
//             gear: exchangeDefectiveTypeField?.dataset.gear || '',   
//             machineryType: exchangeDefectiveTypeField?.dataset.machineryType || '',
//             selfWeight: exchangeDefectiveTypeField?.dataset.selfWeight || '',
//             totalWeightTon: exchangeDefectiveTypeField?.dataset.totalWeightTon || '',
//             fuelType: exchangeDefectiveTypeField?.dataset.fuelType || '',
//             driveType: exchangeDefectiveTypeField?.dataset.driveType || '',
//             gearType: exchangeDefectiveTypeField?.dataset.gearType || '',
//             defectDetails: document.getElementById('exchangeDefectiveDetails').value,
//             // ✨ שימוש בפונקציה החדשה לכתובות
//             destination: processAddress('exchangeDefectiveDestination'),
//             garageContact: {
//                 name: document.getElementById('garageContact').value,
//                 phone: document.getElementById('garagePhone').value
//             }
//         };
//     }

//     // ✨ איסוף נתוני תמחור מה-PricingManager
//     formData.pricing = collectPricingData();
//     if (formData.pricing) {
//         formData.pricing.discountApplied = formData.pricing.discountEnabled;
//     }
//     // הוסף מידע על חניון לנתוני התמחור
//     if (formData.pricing) {
//         formData.pricing.fromGarage = formData.isFromGarage;
//     }
//     // הוספת נתוני שטחים
//     formData.isOutskirts = document.getElementById('isOutskirts')?.checked || false;

//     // הוספת נתוני חניון
//     formData.isFromGarage = document.getElementById('isFromGarage')?.checked || false;

//     // ✨ הוספת נתוני מרחק מה-PricingManager
//     if (window.pricingManager && typeof window.pricingManager.getDistanceData === 'function') {
//         formData.distanceData = window.pricingManager.getDistanceData();
//     }

//     // ✨ איסוף פירוט תמחור מפורט - גרסה סופית
//     if (window.pricingManager && typeof window.pricingManager.getPricingData === 'function') {
//         const pricingDetails = window.pricingManager.getPricingData();
//         console.log('🔍 pricingDetails:', JSON.stringify(pricingDetails, null, 2));

//         // ✨ שימוש בפירוט המדויק מה-PricingManager
//         if (typeof window.pricingManager.getPriceBreakdown === 'function') {
//             const breakdown = window.pricingManager.getPriceBreakdown();
//             const isManualMode = window.pricingManager.isManualMode();
            
//             if (isManualMode) {
//                 // במחיר ידני - רק המחיר הסופי
//                 formData.priceBredown = {
//                     totalPrice: breakdown.finalTotal,
//                     isManual: true
//                 };
//             } else {
//                 // במחיר אוטומטי - פירוט מלא   
//             formData.priceBredown = {
//                 vehicleBasePrice: breakdown.vehicleBasePrice,
//                 vehicleDescription: breakdown.vehicleDescription,
//                 travelDistance: breakdown.travelDistance,
//                 travelPrice: breakdown.travelPrice,
//                 workFees: breakdown.workFees,
//                 timeSurcharge: breakdown.timeSurcharge,
//                 areaSurcharge: breakdown.outskirtsAmount,
//                 totalPrice: breakdown.finalTotal,
//                 // נתונים למע"מ
//                 totalBeforeVAT: breakdown.subtotalBeforeVAT,
//                 vatAmount: breakdown.vatAmount,
//                 vatPercentage: 18
//             };
//         }
            
//             console.log('💰 פירוט מחיר מפורט:', formData.priceBredown);
//             console.log('🔍 נתוני רכב תקול:', formData.defectiveCar);
//             console.log('🔍 נתוני בחירת גרר:', formData.towSelection);

//         } else {
//             console.warn('getPriceBreakdown function not available');
//         }
//     }

//     // קבלת מחיר סופי - עדיפות למחיר ידני
//     let finalPrice = 0;

//     if (window.pricingManager && typeof window.pricingManager.getFinalPrice === 'function') {
//         finalPrice = window.pricingManager.getFinalPrice();
//         console.log('מחיר סופי מ-PricingManager (כולל הנחה):', finalPrice);
//     } else {
//         const priceField = document.getElementById('price');
//         if (priceField && priceField.value) {
//             finalPrice = Number(priceField.value.replace(/[^\d]/g, '')) || 0;
//         }
//     }

//     formData.totalPrice = finalPrice;
//     console.log('מחיר סופי שנשלח:', formData.totalPrice);

//     // הוספת פרטי תשלום
//     const selectedPaymentType = getSelectedPaymentType();
//     formData.payment = {
//         paymentType: selectedPaymentType,
//         price: finalPrice > 0 ? finalPrice : formData.totalPrice || undefined
//     };

//     // הוספת פרטי אשראי אם נבחר סוג תשלום אשראי
//     if (selectedPaymentType === 'credit') {
//         formData.payment.idNumber = document.getElementById('idNumber').value || '';
//         formData.payment.creditCard = {
//             number: document.getElementById('cardNumber').value || '',
//             expiry: document.getElementById('cardExpiry').value || '',
//             cvv: document.getElementById('cardCvv').value || '',
//             holderPhone: document.getElementById('cardHolderPhone').value || ''
//         };
//         console.log('Credit card data:', formData.payment.creditCard); // הוסיפי את זה
//     }

//     // הוספת השדות החדשים
//     formData.clientPhone = document.getElementById('clientPhone').value || '';
//     formData.priceApproved = document.getElementById('priceApprovedYes')?.classList.contains('active') || false;
//     formData.invoiceName = document.getElementById('invoiceName').value || '';
//     return formData;
// }


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

function resetFormKeepUserData() {
    // שמירה על נתוני המשתמש
    const userEmail = localStorage.getItem('userEmail');
    const userCompany = localStorage.getItem('userCompany');
    const userDepartment = localStorage.getItem('userDepartment');

    // איפוס כל הטופס
    document.getElementById('towingForm').reset();

    // איפוס סוג גרירה
    const towingTypeEl = document.getElementById('towingType');
    if (towingTypeEl) towingTypeEl.value = '';

    // הסתרת כל הטפסים
    document.getElementById('defectiveCarForm')?.classList.add('hidden');
    document.getElementById('exchangeForm')?.classList.add('hidden');
    document.getElementById('secondDefectiveCarForm')?.classList.add('hidden');
    document.getElementById('workingDefectiveForm')?.classList.add('hidden');

    // הסתרת כפתור רכב נוסף
    const addCarButtonContainer = document.getElementById('addCarButtonContainer');
    if (addCarButtonContainer) {
        addCarButtonContainer.classList.add('hidden');
        addCarButtonContainer.style.visibility = 'hidden';
    }

    // איפוס בחירות choice buttons
    document.querySelectorAll('.choice-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // איפוס שדות לקוח
    document.getElementById('clientName').value = '';
    document.getElementById('clientPhone').value = '';
    document.getElementById('invoiceName').value = '';

    // איפוס מצב הצעת מחיר
    document.getElementById('priceApprovedYes')?.classList.remove('active');
    document.getElementById('priceApprovedNo')?.classList.remove('active');
    document.getElementById('approvedSection')?.classList.add('hidden');

    // החזרת כפתור שליחה למצב התחלתי
    const submitBtnText = document.getElementById('submitBtnText');
    const submitBtn = document.getElementById('submitToSummary');
    if (submitBtnText) submitBtnText.textContent = 'הצג הצעת מחיר';
    if (submitBtn) submitBtn.querySelector('i').className = 'fas fa-calculator';

    // ניקוי נתוני כתובות
    ['defectiveSource', 'defectiveDestination', 'defectiveSource2', 'defectiveDestination2',
     'workingSource', 'workingDestination', 'workingCarSource', 'workingCarDestination',
     'exchangeDefectiveDestination'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = '';
            delete field.dataset.physicalAddress;
            delete field.dataset.isGoogleAddress;
            delete field.dataset.hasChanged;
            delete field.dataset.originalText;
            delete field.dataset.lat;
            delete field.dataset.lng;
            delete field.dataset.isPinDropped;
        }
    });

    // ניקוי נתוני רכב
    ['defectiveCarType', 'defectiveCarType2', 'workingCarType', 'exchangeDefectiveType'].forEach(fieldId => {
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
        }
    });

    // ניקוי מקורות מידע
    ['defective', 'defective2', 'working', 'exchangeDefective'].forEach(context => {
        document.getElementById(`dataSource_${context}`)?.remove();
    });

    // החזרה למצב תצוגה התחלתי
    document.getElementById('summaryPage')?.classList.add('hidden');
    document.getElementById('towingForm')?.classList.remove('hidden');

    // החזרת תאריך להיום
    const today = new Date().toISOString().split('T')[0];
    const execDateEl = document.getElementById('executionDate');
    if (execDateEl) execDateEl.value = today;

    // איפוס כפתורי תאריך
    document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-target="today"]')?.classList.add('active');
    document.getElementById('datePicker')?.classList.add('hidden');

    // איפוס שדה מחיר ישן
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

    // איפוס תמחור - checkbox וטוגלים
    const outskirts = document.getElementById('isOutskirts');
    const garageToggle = document.getElementById('isFromGarage');
    if (outskirts) outskirts.checked = false;
    if (garageToggle) garageToggle.checked = false;

    // איפוס pills
    document.getElementById('garageToggle')?.classList.remove('active');
    document.getElementById('outskritsToggle')?.classList.remove('active');

    // איפוס PricingManager state
    if (window.pricingManager) {
        window.pricingManager.state.outskirts = false;
        window.pricingManager.state.fromGarage = false;
        window.pricingManager.state.discountEnabled = false;
        window.pricingManager.state.distanceData = null;
        window.pricingManager.updateDiscountButtonDisplay?.();
        window.pricingManager.hideDistanceInfo?.();
        window.pricingManager.resetPriceBreakdown?.();
        window.pricingManager.refreshRecommendedTier?.();
    }

    // איפוס רדיו buttons
    document.querySelectorAll('input[name="priceType"]').forEach(r => r.checked = false);

    // איפוס כרטיסי מחיר
    document.querySelectorAll('.price-card-label').forEach(lbl => lbl.classList.remove('selected'));
    document.querySelectorAll('.price-card').forEach(card => card.classList.remove('recommended'));

    // איפוס מחיר ידני
    const manualWrap = document.querySelector('.manual-input-wrap');
    const manualInput = document.getElementById('customPrice');
    if (manualWrap) manualWrap.style.display = 'none';
    if (manualInput) manualInput.value = '';

    // איפוס תצוגת מחירים
    const regularAmount = document.getElementById('price-regular-amount');
    const plus25Amount = document.getElementById('price-plus25-amount');
    const plus50Amount = document.getElementById('price-plus50-amount');
    if (regularAmount) regularAmount.textContent = '0₪';
    if (plus25Amount) plus25Amount.textContent = '0₪';
    if (plus50Amount) plus50Amount.textContent = '0₪';

    // איפוס כפתורי תשלום
    document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector('[data-payment="cash"]')?.classList.add('active');
    document.getElementById('creditCardSection')?.classList.add('hidden');

    // איפוס בחירות תקלות וגרר
    resetDefectSelections();
    resetTowSelection();

    // איפוס בחירות תקין-תקול
    const selectedDefects2 = document.getElementById('selectedDefects2');
    const workingSelectedTow = document.getElementById('workingSelectedTow');
    const selectedTow2 = document.getElementById('selectedTow2');
    
    if (selectedDefects2) {
        selectedDefects2.innerHTML = '<div class="selected-defects-placeholder">לא נבחרו תקלות</div>';
        selectedDefects2.classList.remove('has-selections');
    }
    if (workingSelectedTow) {
        workingSelectedTow.innerHTML = '<div class="selected-tow-placeholder">לא נבחר גרר</div>';
        workingSelectedTow.classList.remove('has-selection');
    }
    if (selectedTow2) {
        selectedTow2.innerHTML = '<div class="selected-tow-placeholder">לא נבחר גרר</div>';
        selectedTow2.classList.remove('has-selection');
    }

    // הסתרת סקשני מחיר
    document.getElementById('pricingSection')?.classList.add('hidden');
    document.getElementById('priceApprovalSection')?.classList.add('hidden');
    document.getElementById('travelOptions')?.classList.add('hidden');

    // הגדרה מחדש של מאזינים
    setupVehicleLookup();
    if (typeof setupPhoneSanitization === 'function') setupPhoneSanitization();
    if (typeof setupAddressTracking === 'function') setupAddressTracking();
}

// function resetFormKeepUserData() {
//     // שמירה על נתוני המשתמש לפני איפוס (רק פרטי משתמש!)
//     const userEmail = localStorage.getItem('userEmail');
//     const userCompany = localStorage.getItem('userCompany');
//     const userDepartment = localStorage.getItem('userDepartment');

//     // איפוס כל הטופס - כולל נתוני רכב!
//     document.getElementById('towingForm').reset();

//     // ✅ איפוס סוג גרירה והסתרת כל הטפסים
//     const towingTypeEl = document.getElementById('towingType');
//     if (towingTypeEl) towingTypeEl.value = '';

//     // הסתרת כל הטפסים
//     document.getElementById('defectiveCarForm')?.classList.add('hidden');
//     document.getElementById('exchangeForm')?.classList.add('hidden');
//     document.getElementById('secondDefectiveCarForm')?.classList.add('hidden');
//     document.getElementById('workingDefectiveForm')?.classList.add('hidden');

//     // הסתרת כפתור רכב נוסף
//     const addCarButtonContainer = document.getElementById('addCarButtonContainer');
//     if (addCarButtonContainer) {
//         addCarButtonContainer.classList.add('hidden');
//         addCarButtonContainer.style.visibility = 'hidden';
//     }

//     // איפוס בחירות choice buttons (לרכב שני)
//     document.querySelectorAll('.choice-btn').forEach(btn => {
//         btn.classList.remove('selected');
//     });

//     // איפוס השדות החדשים
//     document.getElementById('clientName').value = '';
//     document.getElementById('clientPhone').value = '';
//     document.getElementById('invoiceName').value = '';

//     // איפוס מצב הצעת מחיר אושרה
//     const approvedYes = document.getElementById('priceApprovedYes');
//     const approvedNo = document.getElementById('priceApprovedNo');
//     const approvedSection = document.getElementById('approvedSection');

//     if (approvedYes) approvedYes.classList.remove('active');
//     if (approvedNo) approvedNo.classList.remove('active');
//     if (approvedSection) approvedSection.classList.add('hidden');

//     // החזרת הכפתור לטקסט המקורי
//     const submitBtn = document.getElementById('submitToSummary');
//     const submitBtnText = document.getElementById('submitBtnText');
//     if (submitBtnText) submitBtnText.textContent = 'הצג הצעת מחיר';
//     if (submitBtn) submitBtn.querySelector('i').className = 'fas fa-calculator';

//     // 🔧 ניקוי מלא של כל נתוני הכתובות
//     const addressFields = [
//         'defectiveSource', 'defectiveDestination',
//         'defectiveSource2', 'defectiveDestination2',
//         'workingCarSource', 'workingCarDestination',
//         'exchangeDefectiveDestination'
//     ];
//     addressFields.forEach(fieldId => {
//         const field = document.getElementById(fieldId);
//         if (field) {
//             field.value = '';
//             field.dataset.physicalAddress = '';
//             field.dataset.isGoogleAddress = 'false';
//             field.dataset.hasChanged = 'false';
//             field.dataset.originalText = '';
//             delete field.dataset.physicalAddress;
//             delete field.dataset.isGoogleAddress;
//             delete field.dataset.hasChanged;
//             delete field.dataset.originalText;
//             if (fieldId === 'defectiveSource' || fieldId === 'defectiveDestination') {
//                 delete field.dataset.lat;
//                 delete field.dataset.lng;
//                 delete field.dataset.isPinDropped;
//             }
//             console.log(`🧹 נוקה שדה כתובת: ${fieldId}`);
//         }
//     });

//     // 🔧 ניקוי מלא של כל נתוני הרכב (בלי שמירה!)
//     const vehicleFields = [
//         'defectiveCarType',
//         'defectiveCarType2',
//         'workingCarType',
//         'exchangeDefectiveType'
//     ];
//     vehicleFields.forEach(fieldId => {
//         const field = document.getElementById(fieldId);
//         if (field) {
//             field.value = '';
//             delete field.dataset.color;
//             delete field.dataset.gear;
//             delete field.dataset.machineryType;
//             delete field.dataset.selfWeight;
//             delete field.dataset.totalWeightTon;
//             delete field.dataset.fuelType;
//             delete field.dataset.driveType;
//             delete field.dataset.gearType;
//             field.closest('.form-group')?.classList.add('vehicle-type-hidden');
//             console.log(`🧹 נוקה שדה רכב: ${fieldId}`);
//         }
//     });

//     // 🔧 ניקוי מלא של מקורות המידע (data sources)
//     ['defective', 'defective2', 'working', 'exchangeDefective'].forEach(context => {
//         const sourceField = document.getElementById(`dataSource_${context}`);
//         if (sourceField) {
//             sourceField.remove();
//             console.log(`🧹 הוסר מקור מידע: ${context}`);
//         }
//     });

//     // החזרה למצב תצוגה התחלתי
//     document.getElementById('summaryPage').classList.add('hidden');
//     document.getElementById('towingForm').classList.remove('hidden');
//     document.getElementById('defectiveCarForm')?.classList.add('hidden');
//     document.getElementById('exchangeForm')?.classList.add('hidden');
//     document.getElementById('secondDefectiveCarForm')?.classList.add('hidden');

//     const addCarButtonContainer = document.getElementById('addCarButtonContainer');
//     if (addCarButtonContainer) {
//         addCarButtonContainer.classList.add('hidden');
//         addCarButtonContainer.style.visibility = 'hidden';
//     }

//     // איפוס בחירת סוג גרירה
//     const towingTypeEl = document.getElementById('towingType');
//     if (towingTypeEl) towingTypeEl.value = '';

//     // החזרת התאריך להיום והכפתורים למצב ברירת מחדל
//     const today = new Date().toISOString().split('T')[0];
//     const execDateEl = document.getElementById('executionDate');
//     if (execDateEl) execDateEl.value = today;

//     document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
//     document.querySelector('[data-target="today"]')?.classList.add('active');
//     document.getElementById('datePicker')?.classList.add('hidden');

//     // איפוס מחיר חשבונית (שדה הטופס הישן)
//     const priceField = document.getElementById('price');
//     if (priceField) {
//         priceField.value = '';
//         priceField.style.backgroundColor = '';
//         priceField.style.border = '';
//         priceField.removeAttribute('title');
//         priceField.dataset.autoCalculated = 'false';
//         priceField.dataset.manuallyEdited = 'false';
//         delete priceField.dataset.calculationDetails;
//     }

//     // 💸 איפוס תמחור חדש: רדיו/מחיר ידני/שטחים/המלצה
//     const outskirts = document.getElementById('isOutskirts');
//     if (outskirts) outskirts.checked = false;

//     // איפוס מצב השטחים במערכת התמחור
//     if (window.pricingManager) {
//         window.pricingManager.state.outskirts = false;
//     }
//     // איפוס מצב החניון במערכת התמחור
//     if (window.pricingManager) {
//         window.pricingManager.state.fromGarage = false;
//     }
//     // איפוס טוגל החניון
//     const garageToggle = document.getElementById('isFromGarage');
//     if (garageToggle) garageToggle.checked = false;

//     // רדיו: אפס הכל - אף טיר לא נבחר
//     const priceRadios = document.querySelectorAll('input[name="priceType"]');
//     priceRadios.forEach(r => r.checked = false);

//     // הסרת בחירה ויזואלית מכרטיסים ישנים
//     document.querySelectorAll('.price-card-label').forEach(lbl => lbl.classList.remove('selected'));
//     document.querySelectorAll('.price-card').forEach(card => card.classList.remove('recommended'));

//     // מחיר ידני: הסתר ונקה
//     const manualWrap = document.querySelector('.manual-input-wrap');
//     if (manualWrap) manualWrap.style.display = 'none';
//     const manualInput = document.getElementById('customPrice');
//     if (manualInput) manualInput.value = '';

//     // איפוס מלא של כל המחירים
//     const regularAmount = document.getElementById('price-regular-amount');
//     const plus25Amount = document.getElementById('price-plus25-amount'); 
//     const plus50Amount = document.getElementById('price-plus50-amount');

//     if (regularAmount) regularAmount.textContent = '0₪';
//     if (plus25Amount) plus25Amount.textContent = '0₪';
//     if (plus50Amount) plus50Amount.textContent = '0₪';

//     if (window.pricingManager) {
//         window.pricingManager.state.discountEnabled = false;
//         window.pricingManager.updateDiscountButtonDisplay();
//     }

//     // מחיר ידני: איפוס
//     const customPriceInput = document.getElementById('customPrice');
//     if (customPriceInput) {
//         customPriceInput.value = '';
//     }

//     // איפוס מצב התמחור
//     if (window.__pricingState) {
//         delete window.__pricingState.baseInclVAT;
//         delete window.__pricingState.chosenTier;
//     }

//     // רענון המלצה על מחיר לפי זמן נוכחי (ללא סכומים)
//     if (window.pricingManager && typeof window.pricingManager.refreshRecommendedTier === 'function') {
//         window.pricingManager.refreshRecommendedTier();
//         console.log('רענון המלצת מחיר בוצע');
//     }

//     // איפוס הפירוט המפורט ב-PricingManager
//     if (window.pricingManager && typeof window.pricingManager.resetPriceBreakdown === 'function') {
//         window.pricingManager.resetPriceBreakdown();
//         console.log('איפוס פירוט מחיר בוצע');
//     }

//     // איפוס נתוני מרחק ותצוגה
//     if (window.pricingManager) {
//         // איפוס נתוני המרחק מה-state
//         window.pricingManager.state.distanceData = null;
        
//         // הסתרת תצוגת המרחק
//         if (typeof window.pricingManager.hideDistanceInfo === 'function') {
//             window.pricingManager.hideDistanceInfo();
//         }
        
//         // איפוס מצב השטחים (כפול ביטחון)
//         window.pricingManager.state.outskirts = false;
        
//         console.log('איפוס נתוני מרחק ותצוגה בוצע');
//     }

//     // איפוס מצב השטחים במערכת התמחור
//     if (window.pricingManager) {
//         window.pricingManager.state.outskirts = false;
//     }

//     // איפוס כפתורי תשלום
//     document.querySelectorAll('.payment-btn').forEach(btn => btn.classList.remove('active'));
//     document.querySelector('[data-payment="cash"]')?.classList.add('active');
//     document.getElementById('creditCardSection')?.classList.add('hidden');

//     // 🔧 הגדרה מחדש של המאזינים אחרי הניקוי
//     console.log('🔄 מגדיר מחדש מאזיני רכב...');
//     setupVehicleLookup();
//     if (typeof setupPhoneSanitization === 'function') setupPhoneSanitization();
//     if (typeof setupAddressTracking === 'function') setupAddressTracking();

//     // איפוס בחירות התקלות
//     resetDefectSelections();
//     resetTowSelection();

//     // הסתר סקשני מחיר ואישור
//     const pricingSection = document.getElementById('pricingSection');
//     const priceApprovalSection = document.getElementById('priceApprovalSection');
//     const travelOptions = document.getElementById('travelOptions');

//     if (pricingSection) pricingSection.classList.add('hidden');
//     if (priceApprovalSection) priceApprovalSection.classList.add('hidden');
//     if (travelOptions) travelOptions.classList.add('hidden');
//     console.log('✅ הטופס אופס (כולל תמחור) — פרטי המשתמש נשמרו');
// }

// חשיפת הפונקציות גלובלית
window.collectDefectDetails = collectDefectDetails;
window.collectTowSelection = collectTowSelection;