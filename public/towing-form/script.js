
function setupAddressEditingGuards() {
  const ids = [
    'defectiveSource','defectiveDestination',
    'defectiveSource2','defectiveDestination2'
  ];
  ids.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;

    // בזמן הקלדה – מסמנים שזה לא מגוגל, ואם ריק מוחקים כתובת פיזית
    el.addEventListener('input', function () {
      this.dataset.isGoogleAddress = 'false';
      if (!this.value.trim()) delete this.dataset.physicalAddress;
    });

    // ביציאה מהשדה – אם ריק מוחקים כתובת פיזית
    el.addEventListener('blur', function () {
      if (!this.value.trim()) delete this.dataset.physicalAddress;
    });
  });
}

function sanitizeText(text) {
    if (!text) return text;
    return text
        .replace(/['״"']/g, '')  // מחיקת כל סוגי הגרשים (עברי, אנגלי, גרשיים)
        .trim();
}
// מאזינים לשדות מספר רכב לחיפוש אוטומטי
function setupVehicleLookup() {
    const vehicleFields = [
        { id: 'defectiveCarNumber', context: 'defective' },
        { id: 'defectiveCarNumber2', context: 'defective2' },
        { id: 'workingCarNumber', context: 'working' },
        { id: 'exchangeDefectiveNumber', context: 'exchangeDefective' }
    ];

    vehicleFields.forEach(({ id, context }) => {
        const field = document.getElementById(id);
        if (!field) return;

        // משתנה לעקיבה אחר חיפושים
        let lastSearchedValue = '';
        let hasSearched = false;

        // חיפוש מיידי אחרי הדבקה
        field.addEventListener('paste', function(e) {
            setTimeout(() => {
                const cleanValue = this.value.replace(/[^0-9]/g, '');
                if (cleanValue.length >= 5 && cleanValue !== lastSearchedValue) {
                    lookupVehicleData(cleanValue, context);
                    lastSearchedValue = cleanValue;
                    hasSearched = true;
                }
            }, 10); // השהיה קטנה כדי לתת לערך להתעדכן
        });

        // חיפוש כשעוזבים את השדה (אם עדיין לא חיפשנו)
        field.addEventListener('blur', function() {
            const cleanValue = this.value.replace(/[^0-9]/g, '');
            if (cleanValue.length >= 5 && cleanValue !== lastSearchedValue && !hasSearched) {
                lookupVehicleData(cleanValue, context);
                lastSearchedValue = cleanValue;
                hasSearched = true;
            }
        });

        // איפוס מצב החיפוש כשמשנים את הערך
        field.addEventListener('input', function() {
            const cleanValue = this.value.replace(/[^0-9]/g, '');
            if (cleanValue !== lastSearchedValue) {
                hasSearched = false;
                // נקה את מקור המידע עבור ההקשר הזה אם המספר השתנה
                const hid = document.getElementById(`dataSource_${context}`);
                if (hid) hid.value = '';
                // הסתרת שדה סוג רכב אם משנים את המספר
                if (cleanValue.length < 5) {
                    const typeFieldId = getCarTypeFieldId(context);
                    hideVehicleTypeField(typeFieldId);
                    const typeField = document.getElementById(typeFieldId);
                    if (typeField) typeField.value = '';
                }
            }
        });
    });
}

// פונקציה לחיפוש מידע רכב
    async function lookupVehicleData(licenseNumber, vehicleContext) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        
        if (cleanLicense.length < 5) return;

        // הצגת אינדיקטור טעינה
        showLoadingIndicator(vehicleContext, true);
        showVehicleWarning('🔍 מחפש מידע רכב במאגרי משרד התחבורה...', 'info');

        try {
            const response = await fetch('/api/vehicles/quick', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    license: cleanLicense
                })
            });

            const result = await response.json();

            if (result.success) {
                fillVehicleData(result.vehicle, result.status, result.towTypes, vehicleContext);
                // שמירת מקור המידע (source) שהגיע מהשרת
                const src = result.source || result?.vehicle?.source || null;
                if (src) {
                const hiddenId = `dataSource_${vehicleContext}`;
                let hidden = document.getElementById(hiddenId);
                if (!hidden) {
                    hidden = document.createElement('input');
                    hidden.type = 'hidden';
                    hidden.id = hiddenId;
                    hidden.name = hiddenId;
                    document.getElementById(getCarNumberFieldId(vehicleContext)).closest('form').appendChild(hidden);
                }
                hidden.value = JSON.stringify(src);
                }

    
                // הצגת התראות אם הרכב מבוטל או לא פעיל - אבל לא הצגת החלונית הכחולה
                if (result.status.isCanceled) {
                    showVehicleWarning('הרכב מבוטל סופית ואינו כשיר לנסיעה!', 'error');
                } else if (result.status.isInactive) {
                    showVehicleWarning('הרכב לא מופיע כרכב פעיל במאגר משרד התחבורה', 'warning');
                }
                // לא קוראים ל-showVehicleInfo כאן!
            } else {
                // רק אם הרכב לא נמצא - מציגים את החלונית
                const typeFieldId = getCarTypeFieldId(vehicleContext);
                showVehicleTypeField(typeFieldId);
                document.getElementById(typeFieldId).placeholder = 'נא להזין סוג רכב';
                document.getElementById(typeFieldId).value = '';
                showVehicleInfo({}, {}, [], vehicleContext); // חלונית ריקה להזנה ידנית
            }
        } catch (error) {
            console.error('Error fetching vehicle data:', error);
            // הצגת שדה סוג רכב למילוי ידני (ללא הודעת שגיאה)
            const typeFieldId = getCarTypeFieldId(vehicleContext);
            showVehicleTypeField(typeFieldId);
            document.getElementById(typeFieldId).placeholder = 'נא להזין סוג רכב';
            document.getElementById(typeFieldId).value = '';
        } finally {
            showLoadingIndicator(vehicleContext, false);
            setTimeout(() => {
            document.querySelectorAll('[style*="top: 20px"]').forEach(el => el.remove());
        }, 100);
        }
    }
    
// פונקציה למילוי הנתונים בטופס
    function fillVehicleData(vehicle, status, towTypes, context) {
    const typeFieldMap = {
        'defective': 'defectiveCarType',
        'defective2': 'defectiveCarType2', 
        'working': 'workingCarType',
        'exchangeDefective': 'exchangeDefectiveType'
    };

    const typeFieldId = typeFieldMap[context];
    if (typeFieldId) {
        console.log('🚗 כל נתוני הרכב:', vehicle);
        const typeField = document.getElementById(typeFieldId);
        if (typeField) {
            // יצירת תיאור מקוצר לשדה סוג רכב
            let vehicleDescription = '';
            if (vehicle.manufacturer) vehicleDescription += vehicle.manufacturer;
            if (vehicle.model) vehicleDescription += (vehicleDescription ? ' ' : '') + vehicle.model;
            if (vehicle.year) vehicleDescription += (vehicleDescription ? ' ' : '') + vehicle.year;
            
            typeField.value = sanitizeText(vehicleDescription);

            
            // ✨ שמירת צבע וגיר ב-data attributes ✨
            typeField.dataset.color = vehicle.color || '';
            typeField.dataset.gear = vehicle.gear || vehicle.transmission || '';
            typeField.dataset.machineryType = vehicle.machineryType || '';
            typeField.dataset.selfWeight = vehicle.selfWeight || '';
            typeField.dataset.totalWeightTon = vehicle.totalWeightTon || '';
            typeField.dataset.fuelType = vehicle.fuelType || '';
            typeField.dataset.driveType = vehicle.driveType || '';
            typeField.dataset.gearType = vehicle.gearType || '';
            console.log(`נשמר מידע עבור ${context}: צבע=${vehicle.color}, גיר=${vehicle.gear || vehicle.transmission}`);
            
            // הצגת שדה סוג רכב כשמצאנו מידע
            showVehicleTypeField(typeFieldId);
            
            // הוספת סגנון ויזואלי להראות שהמידע התמלא אוטומטית
            typeField.style.backgroundColor = '#e8f5e8';
            typeField.style.border = '2px solid #4caf50';
            
            // הסרת הסגנון לאחר 3 שניות
            setTimeout(() => {
                typeField.style.backgroundColor = '';
                typeField.style.border = '';
            }, 2000);
        }
    }
    showVehicleInfo(vehicle, status, towTypes, context);

}

// פונקציה להצגת מידע נוסף על הרכב
function showVehicleInfo(vehicle, status, towTypes, context) {
    const fieldMap = {
        'defective': 'defectiveCarType',
        'defective2': 'defectiveCarType2',
        'working': 'workingCarType', 
        'exchangeDefective': 'exchangeDefectiveType'
    };

    const fieldId = fieldMap[context];
    const field = document.getElementById(fieldId);
    if (!field) return;

    // הסרת הודעה קיימת אם יש
    const existingInfo = field.parentNode.querySelector('.vehicle-info-display');
    if (existingInfo) {
        existingInfo.remove();
    }

    // יצירת מידע על המאגר
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

    // הוספת מידע נוסף
    const additionalInfo = [];
    
    // גיר
    const gearType = field.dataset.gear || field.dataset.gearType;
    if (gearType) {
        additionalInfo.push(`גיר: ${gearType}`);
    }
    
    // משקל
    const weight = field.dataset.selfWeight || field.dataset.totalWeightTon || vehicle.weight;
    if (weight) {
        const weightText = weight.includes('טון') ? weight : `${weight} ק"ג`;
        additionalInfo.push(`משקל: ${weightText}`);
    }

    // סוג דלק
    const fuelType = field.dataset.fuelType;
    if (fuelType) {
        additionalInfo.push(`דלק: ${fuelType}`);
    }
    
    // הנעה
    const driveType = field.dataset.driveType;
    if (driveType) {
        additionalInfo.push(`הנעה: ${driveType}`);
    }

    // יצירת התצוגה
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
        line-height: 1.4;
    `;
    
    let fullText = `מקור: ${sourceText}`;
    if (additionalInfo.length > 0) {
        fullText += '\n' + additionalInfo.join(' • ');
    }
    
    infoDiv.textContent = fullText;
    infoDiv.style.whiteSpace = 'pre-line';

    field.parentNode.appendChild(infoDiv);
}

// פונקציה להצגת אינדיקטור טעינה
    function showLoadingIndicator(context, show) {
        const fieldMap = {
            'defective': 'defectiveCarType',
            'defective2': 'defectiveCarType2',
            'working': 'workingCarType',
            'exchangeDefective': 'exchangeDefectiveType'
        };

        const fieldId = fieldMap[context];
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

    // פונקציה להצגת התראות
    function showVehicleWarning(message, type = 'info') {
        // יצירת התראה זמנית
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
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
            'info': 'background: #eff6ff; border: 2px solid #93c5fd; color: #1e40af;'
        };

        warningDiv.style.cssText += colors[type] || colors.info;
        warningDiv.textContent = message;

        document.body.appendChild(warningDiv);

        // הסרה אחרי 5 שניות
        setTimeout(() => {
            warningDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => warningDiv.remove(), 300);
        }, 5000);
    }

    function setupPhoneSanitization() {
    const phoneFields = [
        'contactPhone1',
        'destContactPhone',
        'contactPhone2',
        'destContactPhone2',
        'workingSourcePhone',
        'workingDestPhone',
        'garagePhone'
    ];

    phoneFields.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // הסרת כל המאזינים הקודמים
            const newInput = input.cloneNode(true);
            input.parentNode.replaceChild(newInput, input);
            
            // מאזין להקלדה
            newInput.addEventListener('input', function(e) {
                const cursorPos = e.target.selectionStart;
                const cleanedPhone = cleanPhoneNumber(e.target.value);
                e.target.value = cleanedPhone;
                e.target.setSelectionRange(cursorPos, cursorPos);
            });
            
            // מאזין להדבקה
            newInput.addEventListener('paste', function(e) {
                e.preventDefault();
                const pasteData = (e.clipboardData || window.clipboardData).getData('text');
                const cleanedPhone = cleanPhoneNumber(pasteData);
                e.target.value = cleanedPhone;
            });
            
            // מאזין ל-blur (כשעוזבים את השדה) - לניקוי סופי
            newInput.addEventListener('blur', function(e) {
                const cleanedPhone = cleanPhoneNumber(e.target.value);
                e.target.value = cleanedPhone;
            });
        }
    });
}

function cleanPhoneNumber(phoneNumber) {
    if (!phoneNumber) return '';
    
    // הסרת כל מה שאינו ספרה
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // טיפול בקידומת +972 (ישראל)
    if (cleaned.startsWith('972')) {
        cleaned = cleaned.substring(3); // הסר את 972
        
        // אם המספר מתחיל ב-0 אחרי הקידומת, הסר אותו
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // הוסף 0 בהתחלה
        cleaned = '0' + cleaned;
    }
    
    // וידוא שהמספר מתחיל ב-0 (פורמט ישראלי)
    if (!cleaned.startsWith('0') && cleaned.length >= 9) {
        cleaned = '0' + cleaned;
    }
    
    // הגבלה ל-10 ספרות מקסימום
    return cleaned.slice(0, 10);
}

function setupLicenseNumberSanitization() {
    const licenseInputs = [
        'defectiveCarNumber',
        'defectiveCarNumber2',
        'workingCarNumber',
        'exchangeDefectiveNumber'
    ];

    licenseInputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', function () {
                const cursorPos = input.selectionStart;
                const cleanValue = input.value.replace(/[^0-9]/g, '');
                input.value = cleanValue;
                input.setSelectionRange(cursorPos, cursorPos); // שמירה על מיקום הסמן
            });
        }
    });
}

function setupCreditCardFormatting() {
    // מספר כרטיס
    const cardNumberField = document.getElementById('cardNumber');
    if (cardNumberField) {
        // הוסף placeholder עם פורמט
        cardNumberField.placeholder = '0000-0000-0000-0000';
        
        cardNumberField.addEventListener('input', function (e) {
            const input = e.target;
            const cursorPosition = input.selectionStart;
            
            // קבל רק את הספרות
            const digits = input.value.replace(/\D/g, '');
            
            // פורמט עם קווים
            const formatted = formatCardNumberWithDashes(digits);
            
            // עדכן את הערך
            input.value = formatted;
            
            // חשב מיקום סמן חדש
            const newCursorPos = calculateNewCursorPosition(cursorPosition, formatted, digits.length);
            input.setSelectionRange(newCursorPos, newCursorPos);
        });

        // טיפול בהדבקה
        cardNumberField.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedData.replace(/\D/g, '');
            const formatted = formatCardNumberWithDashes(digits);
            e.target.value = formatted;
        });
    }

    // תאריך תוקף
    const cardExpiryField = document.getElementById('cardExpiry');
    if (cardExpiryField) {
        // הוסף placeholder עם פורמט
        cardExpiryField.placeholder = 'MM/YY';
        
        cardExpiryField.addEventListener('input', function (e) {
            const input = e.target;
            const cursorPosition = input.selectionStart;
            
            // קבל רק את הספרות
            const digits = input.value.replace(/\D/g, '');
            
            // פורמט עם קו נטוי
            const formatted = formatExpiryWithSlash(digits);
            
            // עדכן את הערך
            input.value = formatted;
            
            // חשב מיקום סמן חדש לתוקף
            const newCursorPos = calculateExpiryCursorPosition(cursorPosition, formatted, digits.length);
            input.setSelectionRange(newCursorPos, newCursorPos);
        });

        // טיפול בהדבקה
        cardExpiryField.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedData.replace(/\D/g, '');
            const formatted = formatExpiryWithSlash(digits);
            e.target.value = formatted;
        });
    }

    // CVV - רק ספרות
    const cardCvvField = document.getElementById('cardCvv');
    if (cardCvvField) {
        cardCvvField.placeholder = '000';
        
        cardCvvField.addEventListener('input', function (e) {
            const cursorPosition = e.target.selectionStart;
            const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
            e.target.value = digits;
            e.target.setSelectionRange(cursorPosition, cursorPosition);
        });

        cardCvvField.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text');
            const digits = pastedData.replace(/\D/g, '').slice(0, 4);
            e.target.value = digits;
        });
    }

    setupIDValidation();
}

// פונקציה לפורמט כרטיס אשראי עם קווים
function formatCardNumberWithDashes(digits) {
    // הגבל ל-16 ספרות
    const limitedDigits = digits.slice(0, 16);
    
    // אם אין ספרות, החזר מחרוזת ריקה
    if (!limitedDigits) return '';
    
    // חלק לקבוצות של 4
    const parts = [];
    for (let i = 0; i < limitedDigits.length; i += 4) {
        parts.push(limitedDigits.slice(i, i + 4));
    }
    
    return parts.join('-');
}

// פונקציה לפורמט תוקף עם קו נטוי
function formatExpiryWithSlash(digits) {
    // הגבל ל-4 ספרות
    const limitedDigits = digits.slice(0, 4);
    
    // אם אין ספרות, החזר מחרוזת ריקה
    if (!limitedDigits) return '';
    
    // אם יש פחות מ-2 ספרות, החזר כמו שזה
    if (limitedDigits.length <= 2) {
        return limitedDigits;
    }
    
    // אחרת, הוסף קו נטוי אחרי 2 הספרות הראשונות
    return limitedDigits.slice(0, 2) + '/' + limitedDigits.slice(2);
}

// חישוב מיקום סמן חדש לכרטיס אשראי
function calculateNewCursorPosition(oldCursor, newValue, digitCount) {
    // אם הסמן בסוף, שים אותו בסוף החדש
    if (oldCursor >= newValue.length) {
        return newValue.length;
    }
    
    // ספור כמה ספרות היו לפני הסמן הישן
    let digitsBefore = 0;
    for (let i = 0; i < Math.min(oldCursor, newValue.length); i++) {
        if (/\d/.test(newValue[i])) {
            digitsBefore++;
        }
    }
    
    // מצא את המיקום החדש אחרי אותה כמות ספרות
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

// חישוב מיקום סמן לתוקף
function calculateExpiryCursorPosition(oldCursor, newValue, digitCount) {
    // עבור תוקף - לוגיקה פשוטה יותר
    if (digitCount <= 2) {
        return Math.min(oldCursor, newValue.length);
    } else {
        // אם יש יותר מ-2 ספרות, הסמן אחרי הקו נטוי
        return Math.min(oldCursor + (newValue.includes('/') ? 1 : 0), newValue.length);
    }
}

// פונקציית ניקוי לשליחה (ללא שינוי)
function getCleanCreditCardData() {
    const cardNumber = document.getElementById('cardNumber');
    const cardExpiry = document.getElementById('cardExpiry');
    const cardCvv = document.getElementById('cardCvv');
    
    return {
        number: cardNumber ? cardNumber.value.replace(/\D/g, '') : '',
        expiry: cardExpiry ? cardExpiry.value.replace(/\D/g, '') : '',
        cvv: cardCvv ? cardCvv.value.replace(/\D/g, '') : ''
    };
}

function setupIDValidation() {
    const idField = document.getElementById('idNumber');
    if (!idField) return;

    idField.addEventListener('input', function(e) {
        const cursorPos = e.target.selectionStart;
        const formatted = formatIDNumber(e.target.value);
        e.target.value = formatted;
        e.target.setSelectionRange(cursorPos, cursorPos);
        
        const errorMsg = e.target.parentNode.querySelector('.id-error');
        if (errorMsg) errorMsg.remove();
    });

    idField.addEventListener('blur', function(e) {
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
            errorDiv.textContent = 'מספר תעודת זהות לא תקין';
            e.target.parentNode.appendChild(errorDiv);
        }
    });
}

// פונקציה לזיהוי סוג רכב ומחיר בסיס
function getVehicleBasePrice(context = 'defective') {
    try {
        // קריאת מקור המידע
        const dataSourceId = `dataSource_${context}`;
        const dataSourceElement = document.getElementById(dataSourceId);
        
        if (!dataSourceElement || !dataSourceElement.value) {
            console.log('אין מידע על מקור הנתונים, משתמש במחיר ברירת מחדל');
            return { price: 200, type: 'default', description: 'מחיר בסיס (ברירת מחדל)' };
        }
        
        // פירוק נתוני המקור
        const sourceData = JSON.parse(dataSourceElement.value);
        const vehicleType = sourceData.type;
        
        // מיפוי סוג רכב למחיר
        const priceMap = {
            'private': { price: 200, description: 'רכב פרטי' },
            'motorcycle': { price: 200, description: 'דו-גלגלי' },  // דו-גלגלי כמו פרטי
            'heavy': { price: 400, description: 'מעל 3.5 טון' },
            'machinery': { price: 600, description: 'צמ״ה' }
        };
        
        const result = priceMap[vehicleType] || { price: 200, description: 'לא מזוהה' };
        
        console.log(`סוג רכב: ${vehicleType}, מחיר בסיס: ${result.price}₪`);
        
        return {
            price: result.price,
            type: vehicleType,
            description: result.description
        };
        
    } catch (error) {
        console.error('שגיאה בקריאת מידע הרכב:', error);
        return { price: 200, type: 'error', description: 'שגיאה - מחיר ברירת מחדל' };
    }
}

// פונקציה לחישוב מרחק בין שתי כתובות
async function calculateDistance(sourceAddress, destinationAddress) {
    return new Promise((resolve, reject) => {
        // בדיקה שיש לנו את ה-Google Maps API
        if (typeof google === 'undefined') {
            reject(new Error('Google Maps API לא זמין'));
            return;
        }

        // יצירת Distance Matrix Service
        const service = new google.maps.DistanceMatrixService();
        
        console.log(`🗺️ מחשב מרחק מ: "${sourceAddress}" אל: "${destinationAddress}"`);

        service.getDistanceMatrix({
            origins: [sourceAddress],
            destinations: [destinationAddress],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
            region: 'IL' // מוגבל לישראל
        }, (response, status) => {
            if (status === 'OK') {
                const element = response.rows[0].elements[0];
                
                if (element.status === 'OK') {
                    const distanceInMeters = element.distance.value;
                    const distanceInKm = Math.round(distanceInMeters / 1000);
                    const duration = element.duration.text;
                    
                    console.log(`✅ מרחק נמצא: ${distanceInKm} ק"מ (${duration})`);
                    
                    resolve({
                        success: true,
                        distanceKm: distanceInKm,
                        distanceText: element.distance.text,
                        duration: duration,
                        durationValue: element.duration.value
                    });
                } else {
                    const errorMsg = getDistanceErrorMessage(element.status);
                    console.warn(`⚠️ שגיאה בחישוב מרחק: ${errorMsg}`);
                    reject(new Error(errorMsg));
                }
            } else {
                const errorMsg = `שגיאה ב-API: ${status}`;
                console.error(`❌ ${errorMsg}`);
                reject(new Error(errorMsg));
            }
        });
    });
}

// פונקציה לחישוב מחיר סופי
async function calculateTotalPrice(context = 'defective') {
    try {
        console.log(`💰 מתחיל חישוב מחיר עבור ${context}`);
        
        // שלב 1: קבלת מחיר בסיס
        const vehicleData = getVehicleBasePrice(context);
        console.log(`מחיר בסיס: ${vehicleData.price}₪ (${vehicleData.description})`);
        
        // שלב 2: קבלת כתובות וחישוב מרחק
        const addresses = getAddressesForCalculation(context);
        const distanceData = await calculateDistance(addresses.source, addresses.destination);
        
        // שלב 3: חישוב מחיר נסיעה (10₪ לק"מ)
        const travelPrice = distanceData.distanceKm * 10;
        console.log(`מחיר נסיעה: ${distanceData.distanceKm} ק"מ × 10₪ = ${travelPrice}₪`);
        
        // שלב 4: חישוב מחיר סופי
        const totalPrice = Math.round((vehicleData.price + travelPrice) * 1.18);
        console.log(`מחיר סופי: ${vehicleData.price}₪ + ${travelPrice}₪ = ${totalPrice}₪`);
        
        return {
            success: true,
            basePrice: vehicleData.price,
            vehicleType: vehicleData.description,
            distanceKm: distanceData.distanceKm,
            distanceText: distanceData.distanceText,
            duration: distanceData.duration,
            travelPrice: travelPrice,
            totalPrice: totalPrice,
            calculation: {
                base: `${vehicleData.description}: ${vehicleData.price}₪`,
                travel: `${distanceData.distanceKm} ק"מ × 10₪ = ${travelPrice}₪`,
                total: `סה"כ: ${totalPrice}₪`
            }
        };
        
    } catch (error) {
        console.error(`❌ שגיאה בחישוב מחיר: ${error.message}`);
        return {
            success: false,
            error: error.message
        };
    }
}


function setupPaymentTypeButtons() {
    const paymentButtons = document.querySelectorAll('.payment-btn');
    const creditCardSection = document.getElementById('creditCardSection');
    
    paymentButtons.forEach(button => {
        button.addEventListener('click', function() {
            // הסרת active מכל הכפתורים
            paymentButtons.forEach(btn => btn.classList.remove('active'));
            
            // הוספת active לכפתור שנלחץ
            this.classList.add('active');
            
            // הצגה/הסתרה של שדות כרטיס אשראי
            const paymentType = this.dataset.payment;
            
            if (paymentType === 'credit') {
                creditCardSection.classList.remove('hidden');
            } else {
                creditCardSection.classList.add('hidden');
                // איפוס שדות כרטיס אשראי כשמחליפים לאופציה אחרת
                clearCreditCardFields();
            }
        });
    });
}

// פונקציה לקבלת סוג התשלום הנבחר
function getSelectedPaymentType() {
    const activeButton = document.querySelector('.payment-btn.active');
    return activeButton ? activeButton.dataset.payment : 'cash';
}

function getCarNumberFieldId(context) {
    const fieldMap = {
        'defective': 'defectiveCarNumber',
        'defective2': 'defectiveCarNumber2',
        'working': 'workingCarNumber',
        'exchangeDefective': 'exchangeDefectiveNumber'
    };
    return fieldMap[context];
}

// פונקציה לקבלת ID של שדה סוג רכב לפי context
function getCarTypeFieldId(context) {
    const fieldMap = {
        'defective': 'defectiveCarType',
        'defective2': 'defectiveCarType2', 
        'working': 'workingCarType',
        'exchangeDefective': 'exchangeDefectiveType'
    };
    return fieldMap[context];
}

// פונקציות להצגה/הסתרה של שדות סוג רכב
function showVehicleTypeField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.closest('.form-group').classList.remove('vehicle-type-hidden');
    }
}

function hideVehicleTypeField(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.closest('.form-group').classList.add('vehicle-type-hidden');
    }
}


// מעקב אחר סוג כתובות (גוגל vs טקסט חופשי)
// פונקציה לקבלת כתובות מהטופס (מעדיפים value; ואם הוא ריק — מחזירים ריק)
function getAddressesForCalculation(context = 'defective') {
  let sourceFieldId, destinationFieldId;

  if (context === 'defective') {
    sourceFieldId = 'defectiveSource';
    destinationFieldId = 'defectiveDestination';
  } else if (context === 'defective2') {
    sourceFieldId = 'defectiveSource2';
    destinationFieldId = 'defectiveDestination2';
  } else {
    throw new Error('קונטקסט לא נתמך');
  }

  const sourceField = document.getElementById(sourceFieldId);
  const destField   = document.getElementById(destinationFieldId);

  if (!sourceField || !destField) {
    throw new Error('שדות כתובת לא נמצאו');
  }

  const srcVal  = (sourceField.value || '').trim();
  const destVal = (destField.value   || '').trim();

  // ❗ אם המשתמש מחק את הטקסט – מחזירים ריק, בלי להסתמך על dataset.physicalAddress
  const sourceAddress = srcVal  ? (sourceField.dataset.physicalAddress || srcVal)  : '';
  const destAddress   = destVal ? (destField.dataset.physicalAddress   || destVal) : '';

  return {
    source: sourceAddress,
    destination: destAddress,
    sourceIsGoogle: sourceField.dataset.isGoogleAddress === 'true',
    destIsGoogle:   destField.dataset.isGoogleAddress   === 'true'
  };
}


function clearSource(context) {
  const hid = document.getElementById(`dataSource_${context}`);
  if (hid) hid.value = '';
}

// פונקציה לבדיקת סטטוס אדמין
async function checkAdminStatus() {
    const userEmail = localStorage.getItem('userEmail');
    
    if (!userEmail) return;

    try {
        const response = await fetch('../api/check-admin', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: userEmail })
        });

        const result = await response.json();
        
        if (result.success && result.isAdmin) {
            // המשתמש הוא אדמין - הצג את כפתור הדשבורד
            const adminButton = document.getElementById('adminDashboard');
            if (adminButton) {
                adminButton.style.display = 'inline-block';
            }
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
    }
}

// פונקציה לבדיקה ולוג - לצורך פיתוח ובדיקה
function testVehicleBasePrice() {
    console.log('🧪 בדיקת פונקציית מחיר בסיס:');
    
    const result = getVehicleBasePrice('defective');
    console.log('תוצאה:', result);
    
    const available = isVehicleDataAvailable('defective');
    console.log('נתונים זמינים:', available);
    
    return result;
}

// פונקציה לבדיקה ולוג - לצורך פיתוח ובדיקה
async function testDistanceCalculation() {
    try {
        console.log('🧪 בדיקת חישוב מרחק:');
        
        // נסה לקבל כתובות מהטופס
        const addresses = getAddressesForCalculation('defective');
        console.log('כתובות:', addresses);
        
        // חשב מרחק
        const result = await calculateDistance(addresses.source, addresses.destination);
        console.log('תוצאת חישוב מרחק:', result);
        
        return result;
        
    } catch (error) {
        console.error('❌ שגיאה בבדיקת מרחק:', error.message);
        return null;
    }
}

// פונקציה לעדכון שדה המחיר בטופס
function updatePriceField(priceData) {
    const priceField = document.getElementById('price');
    if (!priceField) {
        console.error('שדה מחיר לא נמצא');
        return;
    }
    
    if (priceData.success) {
        // עדכון הערך
        priceField.value = priceData.totalPrice;
        
        // הוספת סגנון ויזואלי
        priceField.style.backgroundColor = '#e8f5e8';
        priceField.style.border = '2px solid #4caf50';
        
        // הוסף tooltip או data attribute עם פירוט החישוב
        priceField.title = `${priceData.calculation.base}\n${priceData.calculation.travel}\n${priceData.calculation.total}`;
        priceField.dataset.autoCalculated = 'true';
        priceField.dataset.calculationDetails = JSON.stringify(priceData);
        
        // עדכן גם את הכרטיסים כשהחישוב מצליח
        updateTierPricesUI(priceData.totalPrice);
        
        // הסרת הסגנון אחרי 3 שניות
        setTimeout(() => {
            priceField.style.backgroundColor = '';
            priceField.style.border = '';
        }, 3000);
        
        console.log(`✅ שדה מחיר עודכן ל-${priceData.totalPrice}₪`);
        showPriceCalculationMessage(priceData);
        
    } else {
        console.error('לא ניתן לעדכן שדה מחיר - חישוב נכשל');
    }
}

// מעדכן את שלושת המחירים בכרטיסים לפי מחיר בסיס כולל מע"מ (totalPrice) וטוגל "שטחים"
function updateTierPricesUI(baseInclVAT) {
  const outskirtsEl = document.getElementById('isOutskirts');
  const isOutskirts = !!(outskirtsEl && outskirtsEl.checked);

  // "רגיל" לאחר שכבת שטחים (אם מסומן)
  const baseEffective = Math.round(baseInclVAT * (isOutskirts ? 1.25 : 1));

  // שלושת המחירים (עיגול לשקל שלם)
  const priceRegular = baseEffective;
  const pricePlus25  = Math.round(baseEffective * 1.25);
  const pricePlus50  = Math.round(baseEffective * 1.50);

  // כתיבה ל-UI
  const elReg = document.getElementById('price-regular-amount');
  const el25  = document.getElementById('price-plus25-amount');
  const el50  = document.getElementById('price-plus50-amount');

  if (elReg) elReg.textContent = priceRegular + '₪';
  if (el25)  el25.textContent  = pricePlus25 + '₪';
  if (el50)  el50.textContent  = pricePlus50 + '₪';

  // נשמור מצב לשימוש בשלבים הבאים
  window.__pricingState = {
    baseInclVAT,
    isOutskirts,
    prices: { regular: priceRegular, plus25: pricePlus25, plus50: pricePlus50 }
  };
}

function setupOutskirtsToggleRecalc() {
  const el = document.getElementById('isOutskirts');
  if (!el) return;

  el.addEventListener('change', () => {
    const st = window.__pricingState;
    if (st && typeof st.baseInclVAT === 'number') {
      // יש כבר בסיס מחושב → עדכני את שלושת המחירים מיידית
      updateTierPricesUI(st.baseInclVAT);
    } else {
      // אין בסיס עדיין → תני למנוע החישוב שלך לרוץ
      try { debouncedPriceCalculation('defective', 300); } catch (_) {}
    }
  });
}

// קולט Date מקומי ומחזיר 'regular' | 'plus25' | 'plus50'
function getRecommendedTier(dateObj) {
  if (!(dateObj instanceof Date)) return 'regular';

  const day = dateObj.getDay(); // 0=א, 1=ב, ... 5=ו, 6=ש
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const hm = hours * 60 + minutes; // דקות מאז תחילת היום

  const isSunToThu = (d) => d >= 0 && d <= 4;  // א–ה
  const isMonToFri = (d) => d >= 1 && d <= 5;  // ב–ו

  // +50% סוף שבוע: שישי 14:00 → ראשון 06:59
  if (day === 5 && hm >= 14 * 60) return 'plus50';     // ו׳ מ-14:00
  if (day === 6) return 'plus50';                      // כל שבת
  if (day === 0 && hm <= 6 * 60 + 59) return 'plus50'; // א׳ עד 06:59

  // +50% לילות א–ה: 19:00–06:59
  if (isSunToThu(day) && hm >= 19 * 60) return 'plus50';     // ערב/לילה 19:00–23:59
  if (isMonToFri(day) && hm <= 6 * 60 + 59) return 'plus50'; // לילה עד 06:59 בבוקר

  // +25% ערבים א–ה: 15:00–18:59
  if (isSunToThu(day) && hm >= 15 * 60 && hm < 19 * 60) return 'plus25';

  // אחרת רגיל
  return 'regular';
}

// מסיר/מוסיף .recommended לפי tier נתון
function applyRecommendedHighlight(tier) {
  const cards = document.querySelectorAll('.price-card');
  cards.forEach(c => c.classList.remove('recommended'));

  const map = {
    regular:  '.price-card[data-type="regular"]',
    plus25:   '.price-card[data-type="plus25"]',
    plus50:   '.price-card[data-type="plus50"]'
  };

  const target = document.querySelector(map[tier] || map.regular);
  if (target) target.classList.add('recommended');
}

// מוציא את הסכומים מתוך ה-DOM (מספר שלם/מעוגל)
function getCurrentTierAmounts() {
  const read = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return 0;
    const num = parseFloat(String(el.textContent || '').replace(/[^\d.]/g, ''));
    return Math.round(num || 0);
  };
  return {
    regular: read('#price-regular-amount'),
    plus25:  read('#price-plus25-amount'),
    plus50:  read('#price-plus50-amount')
  };
}

// מה ה-tier הסופי לשימוש: בחירה ידנית אם קיימת, אחרת המומלץ עכשיו
function getEffectiveTier() {
  const manual = window.__pricingState?.chosenTier;
  if (manual) return manual;
  
  // בדיקה איזה רדיו נבחר
  const checkedRadio = document.querySelector('input[name="priceType"]:checked');
  if (checkedRadio) {
    return checkedRadio.value; // 'regular', 'plus25', או 'plus50'
  }
  
  // ברירת מחדל - רגיל
  return 'regular';
}

// (אופציונלי לבדיקת קונסול): כמה הסכום הסופי כרגע
function getEffectiveAmount() {
  const amounts = getCurrentTierAmounts();
  const tier = getEffectiveTier();
  return { tier, amount: amounts[tier] || 0 };
}

function writeFinalPriceToHidden() {
  const priceEl = document.getElementById('price');
  if (!priceEl) return;

  if (isManualMode()) {
    const manualInput = document.getElementById('customPrice');
    const manualVal = manualInput?.value?.trim();
    if (manualVal && !isNaN(Number(manualVal))) {
      priceEl.value = Number(manualVal).toString();
      priceEl.dataset.manuallyEdited = 'true';
      console.log('מחיר ידני נשמר:', priceEl.value);
    } else {
      priceEl.value = '';
      priceEl.dataset.manuallyEdited = 'false';
    }
    return;
  }

  const { amount } = getEffectiveAmount();
  priceEl.value = (amount ?? '').toString();
  priceEl.dataset.manuallyEdited = 'false';
}



// מחזיר Date לפי הבחירה בטופס (היום/תאריך אחר + שעה אם קיימת)
function getPlannedDateTimeFromForm() {
  const isTodayActive = !!document.querySelector('[data-target="today"].active');
  const dateInput = document.getElementById('executionDate');
  const timeInput = document.getElementById('executionTime');

  // אם "היום" — זמן נוכחי
  if (isTodayActive) return new Date();

  // אחרת "תאריך אחר"
  const d = (dateInput && dateInput.value) ? new Date(dateInput.value) : new Date();

  // אם יש שעה (גם אם הסקשן מוסתר) נשתמש בה, אחרת ברירת מחדל 12:00
  let hh = 12, mm = 0;
  if (timeInput && timeInput.value) {
    const [h, m] = timeInput.value.split(':').map(Number);
    if (!Number.isNaN(h)) hh = h;
    if (!Number.isNaN(m)) mm = m;
  }
  d.setHours(hh, mm, 0, 0);
  return d;
}

// מרענן את ההדגשה לפי הבחירה בטופס
function refreshRecommendedHighlight() {
  const dt = getPlannedDateTimeFromForm();
  const tier = getRecommendedTier(dt);
  applyRecommendedHighlight(tier);
}

// קובע אם מצב "מחיר ידני" מסומן
function isManualMode() {
  const manualRadio = document.getElementById('price-manual');
  return !!(manualRadio && manualRadio.checked);
}

// מוודא שקיים שדה מחיר נסתר לשליחה ולקריאה פנימית
function ensureHiddenPriceField() {
  let el = document.getElementById('price');
  if (!el) {
    el = document.createElement('input');
    el.type = 'hidden';
    el.id = 'price';
    el.name = 'price';
    const form = document.getElementById('towingForm');
    if (form) form.appendChild(el);
  }
}


function setupPriceChoiceHandlers() {
  const radios = document.querySelectorAll('input[name="priceType"]');
  if (!radios.length) return;

  // ודאי שיש אובייקט מצב
  window.__pricingState = window.__pricingState || {};

  radios.forEach(r => {
    r.addEventListener('change', () => {
      window.__pricingState.chosenTier = r.value; // 'regular' | 'plus25' | 'plus50'
      // שומרות רק את הבחירה; ההדגשה הוויזואלית נשארת נפרדת
      writeFinalPriceToHidden();
    });
  });
  

  // אתחול ערך התחלתי אם יש רדיו מסומן בדיפולט
  const checked = document.querySelector('input[name="priceType"]:checked');
  if (checked) window.__pricingState.chosenTier = checked.value;
}


// פונקציה להצגת הודעה על חישוב המחיר (אופציונלי)
function showPriceCalculationMessage(priceData) {
    // יצירת הודעה זמנית
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        padding: 15px 20px;
        border-radius: 8px;
        font-weight: 500;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 300px;
        background: #e8f5e8;
        border: 2px solid #4caf50;
        color: #2d5016;
        animation: slideIn 0.3s ease;
    `;
    
    messageDiv.innerHTML = `
        <strong>💰 מחיר חושב אוטומטית:</strong><br>
        ${priceData.calculation.base}<br>
        ${priceData.calculation.travel}<br>
        <strong>${priceData.calculation.total}</strong>
    `;
    
    document.body.appendChild(messageDiv);
    
    // הסרה אחרי 5 שניות
    setTimeout(() => {
        messageDiv.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => messageDiv.remove(), 300);
    }, 5000);
}

// פונקציה מרכזית לחישוב מחיר עם עדכון הטופס
async function calculateAndUpdatePrice(context = 'defective') {
    try {
        console.log('🚀 מתחיל חישוב מחיר מלא...');
        
        const result = await calculateTotalPrice(context);
        
        if (result.success) {
            updatePriceField(result);
            return result;
        } else {
            console.error('חישוב מחיר נכשל:', result.error);
            // כאן אפשר להוסיף הודעת שגיאה למשתמש
            return null;
        }
        
    } catch (error) {
        console.error('שגיאה כללית בחישוב מחיר:', error);
        return null;
    }
}

// פונקציה לבדיקה ולוג - לצורך פיתוח ובדיקה
async function testFullPriceCalculation() {
    console.log('🧪 בדיקת חישוב מחיר מלא:');
    const result = await calculateAndUpdatePrice('defective');
    console.log('תוצאה סופית:', result);
    return result;
}

// פונקציה לבדיקה אם כל הנתונים זמינים לחישוב מחיר
function canCalculatePrice(context = 'defective') {
    try {
        if (!isVehicleDataAvailable(context)) {
            return false;
        }
        
        const addresses = getAddressesForCalculation(context);
        
        // בדיקה מדויקת יותר - לא רק שקיימות אלא שאינן ריקות
        if (!addresses.source || !addresses.destination || 
            !addresses.source.trim() || !addresses.destination.trim()) {
            return false;
        }
        
        return true;
        
    } catch (error) {
        return false;
    }
}



// פונקציה לחישוב מחיר עם debounce (למניעת חישובים מיותרים)
let priceCalculationTimeout;

function setupAutomaticPriceCalculation() {
    console.log('מגדיר חישוב מחיר אוטומטי...');
    
    // שדות שצריכים לעקוב אחריהם עבור רכב תקול ראשון ושני
    const fieldsToWatch = [
        'defectiveCarNumber',    // מספר רכב (לקבלת סוג רכב)
        'defectiveSource',      // כתובת מוצא
        'defectiveDestination', // כתובת יעד
        'defectiveSource2',     // כתובת מוצא רכב שני
        'defectiveDestination2' // כתובת יעד רכב שני
    ];
    
    fieldsToWatch.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            // מאזין לשינויים בשדה
            field.addEventListener('input', (e) => {
                console.log(`שינוי בשדה ${fieldId}`);
                
                // בדיקה מיידית אם שדה כתובת התרוקן
                const isAddressField = fieldId.includes('Source') || fieldId.includes('Destination');
                const isEmpty = !e.target.value.trim();
                
                if (isAddressField && isEmpty) {
                    // זמן קצר יותר למחיקת כתובות
                    debouncedPriceCalculation('defective', 300);
                } else {
                    // זמן רגיל לעריכה
                    debouncedPriceCalculation('defective', 1500);
                }
            });
            
            // מאזין לאובדן פוקוס (כשעוזבים את השדה)
            field.addEventListener('blur', () => {
                console.log(`עזיבת שדה ${fieldId}`);
                debouncedPriceCalculation('defective', 500);
            });
        }
    });
    
    // מאזין מיוחד לשינויים בנתוני הרכב (כשהמערכת מוצאת רכב)
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && 
                mutation.attributeName === 'value') {
                
                // טיפול בנתוני רכב ראשון ושני
                if (mutation.target.id === 'dataSource_defective' || 
                    mutation.target.id === 'dataSource_defective2') {
                    console.log(`נתוני רכב עודכנו: ${mutation.target.id}`);
                    debouncedPriceCalculation('defective', 1000);
                }
            }
        });
    });
    
    // התחל לעקוב אחר שינויים במקור נתוני הרכב
    const dataSourceFields = ['dataSource_defective', 'dataSource_defective2'];
    dataSourceFields.forEach(fieldId => {
        const dataSourceField = document.getElementById(fieldId);
        if (dataSourceField) {
            observer.observe(dataSourceField, {
                attributes: true,
                attributeFilter: ['value']
            });
        }
    });
}

// פונקציה חדשה לאיפוס מחיר
function resetPriceField() {
    console.log('🔴 resetPriceField נקרא - מתחיל איפוס');
    
    const priceField = document.getElementById('price');
    if (priceField) {
        console.log('🔴 מאפס שדה מחיר נסתר, ערך לפני:', priceField.value);
        priceField.value = '';
        priceField.style.backgroundColor = '';
        priceField.style.border = '';
        priceField.removeAttribute('title');
        priceField.dataset.autoCalculated = 'false';
        delete priceField.dataset.calculationDetails;
        console.log('🔴 שדה מחיר נסתר אופס');
    }
    
    // איפוס המחירים בכרטיסים עם לוגים
    const priceElements = [
        { id: 'price-regular-amount', text: '0₪' },
        { id: 'price-plus25-amount', text: '0₪' },
        { id: 'price-plus50-amount', text: '0₪' }
    ];
    
    priceElements.forEach(({ id, text }) => {
        const element = document.getElementById(id);
        if (element) {
            console.log(`🔴 מאפס ${id}, ערך לפני: "${element.textContent}", ערך אחרי: "${text}"`);
            element.textContent = text;
            element.innerText = text;
        } else {
            console.log(`🔴 ❌ לא נמצא אלמנט: ${id}`);
        }
    });
    
    // איפוס מצב התמחור
    if (window.__pricingState) {
        console.log('🔴 מאפס __pricingState');
        delete window.__pricingState.baseInclVAT;
        delete window.__pricingState.prices;
    }
    
    // הסרת המלצה
    const recommendedCards = document.querySelectorAll('.price-card.recommended');
    console.log(`🔴 מסיר המלצה מ-${recommendedCards.length} כרטיסים`);
    document.querySelectorAll('.price-card').forEach(card => {
        card.classList.remove('recommended');
    });
    
    console.log('🔴 ✅ resetPriceField הושלם');
}

async function debouncedPriceCalculation(context = 'defective', delay = 1000) {
    console.log(`🔵 debouncedPriceCalculation נקרא עבור ${context}, עיכוב: ${delay}ms`);
    
    if (priceCalculationTimeout) {
        console.log('🔵 מבטל חישוב קודם');
        clearTimeout(priceCalculationTimeout);
    }
    
    priceCalculationTimeout = setTimeout(async () => {
        console.log('🔵 מתחיל לוגיקת חישוב לאחר עיכוב');
        
        const priceField = document.getElementById('price');
        const wasManuallyEdited = priceField && priceField.dataset.manuallyEdited === 'true';
        
        if (wasManuallyEdited) {
            console.log('🔵 המשתמש עדכן את המחיר ידנית - לא מחשב אוטומטית');
            return;
        }
        
        let addresses;
        try {
            addresses = getAddressesForCalculation(context);
            console.log('🔵 כתובות שנמצאו:', addresses);
        } catch (error) {
            console.log('🔵 שדות כתובת לא נמצאו - איפוס המחיר', error.message);
            resetPriceField();
            return;
        }
        
        console.log('🔵 בודק אם כתובות ריקות...');
        console.log(`🔵 מוצא: "${addresses.source}" (אורך: ${addresses.source.length})`);
        console.log(`🔵 יעד: "${addresses.destination}" (אורך: ${addresses.destination.length})`);
        
        if (!addresses.source || !addresses.destination) {
            console.log('🔵 כתובות ריקות - קורא ל-resetPriceField');
            resetPriceField();
            
            // בדיקה אם המחיר באמת התאפס
            setTimeout(() => {
                const regularEl = document.getElementById('price-regular-amount');
                const plus25El = document.getElementById('price-plus25-amount');
                const plus50El = document.getElementById('price-plus50-amount');
                
                console.log('🔵 בדיקה אחרי איפוס:');
                console.log(`🔵 רגיל: "${regularEl?.textContent}"`);
                console.log(`🔵 +25%: "${plus25El?.textContent}"`);
                console.log(`🔵 +50%: "${plus50El?.textContent}"`);
            }, 100);
            
            return;
        }
        
        console.log('🔵 כתובות לא ריקות - ממשיך לחישוב');
        
        if (canCalculatePrice(context)) {
            console.log('🔵 מתחיל חישוב מחיר אוטומטי...');
            const result = await calculateAndUpdatePrice(context);
        }
    }, delay);
}


// פונקציה לטיפול בעריכה ידנית של המחיר
function setupManualPriceEditing() {
    const priceField = document.getElementById('price');
    if (!priceField) return;
    
    // מאזין לעריכה ידנית של המחיר
    priceField.addEventListener('input', function() {
        // סימון שהמשתמש ערך ידנית
        this.dataset.manuallyEdited = 'true';
        this.dataset.autoCalculated = 'false';
        
        // הסרת סגנון "חושב אוטומטית"
        this.style.backgroundColor = '';
        this.style.border = '';
        this.removeAttribute('title');
        
        console.log('✏️ המשתמש ערך את המחיר ידנית:', this.value);
    });
    
    // איפוס הסימון כשמוחקים את השדה
    priceField.addEventListener('focus', function() {
        if (!this.value) {
            this.dataset.manuallyEdited = 'false';
            console.log('🔄 איפוס סימון עריכה ידנית');
        }
    });
}


// פונקציה לאיפוס מעקב מחיר אוטומטי (כשמשנים סוג גרירה)
function resetAutomaticPriceCalculation() {
    // ביטול חישוב ממתין
    if (priceCalculationTimeout) {
        clearTimeout(priceCalculationTimeout);
        priceCalculationTimeout = null;
    }
    
    // איפוס שדה מחיר
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
}

// פונקציה להפעלת המערכת המלאה
function initializeAutomaticPricing() {
    console.log('🚀 מפעיל מערכת חישוב מחיר אוטומטי');
    
    // הגדרת מאזינים אוטומטיים
    setupAutomaticPriceCalculation();
    
    // הגדרת טיפול בעריכה ידנית
    setupManualPriceEditing();
    
    console.log('✅ מערכת חישוב מחיר מוכנה לשימוש (אוטומטי + עריכה ידנית)');
}

// פונקציה לבדיקה - להפעלה ידנית
function testAutomaticPricing() {
    console.log('🧪 בדיקת מערכת חישוב אוטומטי:');
    initializeAutomaticPricing();
}

// פונקציה לאיפוס שדות כרטיס אשראי
function clearCreditCardFields() {
    const creditFields = ['idNumber', 'cardNumber', 'cardExpiry', 'cardCvv'];
    creditFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) field.value = '';
    });
}

    // פונקציה לגלילה אוטומטית רק עבור שדות כתובות
function setupAddressAutoScroll() {
    // רשימת שדות הכתובות שיש להם השלמה אוטומטית
    const addressFieldIds = [
        'defectiveSource',
        'defectiveDestination',
        'defectiveSource2', 
        'defectiveDestination2',
        'workingCarSource',
        'workingCarDestination',
        'exchangeDefectiveDestination'
    ];
    
    addressFieldIds.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('focus', function() {
                // השהיה קטנה כדי לתת לאירוע הפוקוס להסתיים
                setTimeout(() => {
                    // חישוב המיקום של השדה
                    const fieldRect = this.getBoundingClientRect();
                    const fieldTop = fieldRect.top + window.pageYOffset;
                    
                    // חישוב גובה הכותרת העליונה (אם יש)
                    const headerHeight = document.querySelector('.main-header')?.offsetHeight || 0;
                    
                    // גלילה לשדה עם מרווח נוח מלמעלה (200px כדי להשאיר מקום לרשימת ההצעות)
                    const scrollToPosition = fieldTop - headerHeight - 200;
                    
                    // גלילה חלקה
                    window.scrollTo({
                        top: Math.max(0, scrollToPosition), // וודא שלא נגלול למעלה מהעמוד
                        behavior: 'smooth'
                    });
                }, 150); // השהיה של 150ms
            });
        }
    });
}


function updateRequiredFieldsVisibility() {
    // נבחר את כל השדות שהם required
    const requiredInputs = document.querySelectorAll('[required]');
    
    requiredInputs.forEach(input => {
        // אם ההורה של השדה מוסתר (display: none או יש לו class hidden)
        const isVisible = input.offsetParent !== null && !input.closest('.hidden');
        
        if (isVisible) {
            input.setAttribute('required', 'required');
        } else {
            input.removeAttribute('required');
        }
    });
}

// פונקציה לפתיחת דשבורד האדמין
function openAdminDashboard() {
    window.open('/admin', '_blank');
}

// פונקציה לעיצוב מספר רישוי
    function formatLicenseNumber(number) {
        const cleanNumber = number.replace(/[^0-9]/g, '');
        if (cleanNumber.length === 7) {
            return cleanNumber.slice(0, 2) + '-' + cleanNumber.slice(2, 5) + '-' + cleanNumber.slice(5);
        } else if (cleanNumber.length === 8) {
            return cleanNumber.slice(0, 3) + '-' + cleanNumber.slice(3, 5) + '-' + cleanNumber.slice(5);
        }
        return cleanNumber;
    }


document.addEventListener('DOMContentLoaded', function() {
    // אלמנטים ראשיים
    const mainForm = document.getElementById('towingForm');
    const summaryPage = document.getElementById('summaryPage');
    const backToEdit = document.getElementById('backToEdit');
    const confirmSubmit = document.getElementById('confirmSubmit');
    const defectiveCarForm = document.getElementById('defectiveCarForm');
    const exchangeForm = document.getElementById('exchangeForm');
    const secondDefectiveCarForm = document.getElementById('secondDefectiveCarForm');
    const addSecondDefectiveCarBtn = document.getElementById('addSecondDefectiveCar');
    const removeSecondDefectiveCarBtn = document.getElementById('removeSecondDefectiveCar');
    const towingTypeSelect = document.getElementById('towingType');
    
    // גישה לאלמנט המכיל את כפתור הוספת רכב נוסף
    const addCarButtonContainer = document.getElementById('addCarButtonContainer');
 
    // הצגת שם החברה בכותרת
    const companyName = localStorage.getItem('userCompany') || 'חברה לא מזוהה';
    document.getElementById('companyName').textContent = companyName;

    // בדיקה אם זה גרר גולן
    const isGrerGolan = companyName === 'גרר גולן';

    // הצגת שדה שם לקוח רק עבור גרר גולן
    if (isGrerGolan) {
        const clientNameGroup = document.getElementById('clientNameGroup');
        if (clientNameGroup) {
            clientNameGroup.style.display = 'block';
        }
    }

    // אתחול תאריך ושעה
    initDateTime();

    checkAdminStatus();
    
    // הגדרת אירועים
    setupDateButtons();
    setupTowingTypeChange();
    setupSecondCarButtons();
    setupSharedLocationOptions();
    setupFormEvents();
    setupAddressEditingGuards();

    
    function initDateTime() {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        document.getElementById('executionDate').value = currentDate;
    }

    function generateOrderNumber() {
    const now = new Date();
    
    // קבלת התאריך בפורמט DDMMYY
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // חודשים מתחילים מ-0
    const year = String(now.getFullYear()).slice(-2); // שנתיים אחרונות
    
    // קבלת השעה בפורמט HHMMSS
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // יצירת מספר ההזמנה: DDMMYYHHMMSS
    return day + month + year + hours + minutes + seconds;
}

function setDefaultOrderNumber() {
    const orderNumberField = document.getElementById('orderNumber');
    
    if (orderNumberField && !orderNumberField.value.trim()) {
        orderNumberField.value = generateOrderNumber();
        
        // הוספת סגנון ויזואלי להראות שהמספר נוצר אוטומטית
        orderNumberField.style.backgroundColor = '#e8f5e8';
        orderNumberField.style.border = '2px solid #4caf50';
        
        // הסרת הסגנון לאחר 2 שניות
        setTimeout(() => {
            orderNumberField.style.backgroundColor = '';
            orderNumberField.style.border = '';
        }, 2000);
    }
}
    
    function setupDateButtons() {
        // מניעת התנהגות ברירת מחדל של כפתורים בטופס
        document.querySelectorAll('.toggle-btn').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
            });
        });
        
        const dateButtons = document.querySelectorAll('[data-target="today"], [data-target="other-date"]');
        const datePicker = document.getElementById('datePicker');
        
        dateButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                dateButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                if (this.dataset.target === 'today') {
                    datePicker.classList.add('hidden');
                    const today = new Date().toISOString().split('T')[0];
                    document.getElementById('executionDate').value = today;
                } else {
                    datePicker.classList.remove('hidden');
                }
            });
        });
        
        // טיפול בכפתורי שעה
        const timeButtons = document.querySelectorAll('[data-target="now"], [data-target="other-time"]');
        const timePicker = document.getElementById('timePicker');
        
        timeButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                timeButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                if (this.dataset.target === 'now') {
                    timePicker.classList.add('hidden');
                    const now = new Date();
                    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    document.getElementById('executionTime').value = currentTime;
                } else {
                    timePicker.classList.remove('hidden');
                }
            });
        });
    }
    
    function setupTowingTypeChange() {
        towingTypeSelect.addEventListener('change', function() {
            // קודם מסתירים את כל הטפסים בכל מקרה
            if (defectiveCarForm) defectiveCarForm.classList.add('hidden');
            if (exchangeForm) exchangeForm.classList.add('hidden');
            if (secondDefectiveCarForm) {
                secondDefectiveCarForm.classList.add('hidden');
            clearSource('defective2');
            }
            
            // מסתירים את כפתור הוספת הרכב הנוסף - מחלקת CSS וגם visibility
            if (addCarButtonContainer) {
                addCarButtonContainer.classList.add('hidden');
                addCarButtonContainer.style.visibility = 'hidden';
            }
            
            // מציגים את הטופס המתאים לפי הבחירה
            if (this.value === 'defective') {
                if (defectiveCarForm) defectiveCarForm.classList.remove('hidden');
                // מציגים את כפתור הוספת הרכב - מחלקת CSS וגם visibility
                if (addCarButtonContainer) {
                    addCarButtonContainer.classList.remove('hidden');
                    addCarButtonContainer.style.visibility = 'visible';
                }
            } else if (this.value === 'exchange') {
                if (exchangeForm) exchangeForm.classList.remove('hidden');
            }
            updateRequiredFieldsVisibility();
            setTimeout(() => setupPhoneSanitization(), 100);
        });
    }
    
    function setupSecondCarButtons() {
        if (addSecondDefectiveCarBtn) {
            addSecondDefectiveCarBtn.addEventListener('click', function() {
                if (secondDefectiveCarForm) secondDefectiveCarForm.classList.remove('hidden');
                // מסתירים את כפתור הוספת הרכב - מחלקת CSS וגם visibility
                if (addCarButtonContainer) {
                    addCarButtonContainer.classList.add('hidden');
                    addCarButtonContainer.style.visibility = 'hidden';
                }
                updateShareOptions();
                updateRequiredFieldsVisibility();
                setTimeout(() => setupPhoneSanitization(), 100);
            });

        }
        
        if (removeSecondDefectiveCarBtn) {
            removeSecondDefectiveCarBtn.addEventListener('click', function() {
                if (secondDefectiveCarForm) {
                secondDefectiveCarForm.classList.add('hidden');
            clearSource('defective2');
            }
                // מציגים חזרה את כפתור ההוספה - מחלקת CSS וגם visibility
                if (addCarButtonContainer) {
                    addCarButtonContainer.classList.remove('hidden');
                    addCarButtonContainer.style.visibility = 'visible';
                }
                
                // ניקוי שדות
                const inputs = secondDefectiveCarForm.querySelectorAll('input, textarea');
                inputs.forEach(input => {
                    input.value = '';
                });
                
                // איפוס בחירות כפתורים
                document.querySelectorAll('.choice-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // הסתרת שדות המוצא והיעד הנוספים
                const secondCarSourceFields = document.getElementById('secondCarSourceFields');
                const secondCarDestinationFields = document.getElementById('secondCarDestinationFields');
                
                if (secondCarSourceFields) secondCarSourceFields.classList.add('hidden');
                if (secondCarDestinationFields) secondCarDestinationFields.classList.add('hidden');
                
                // הסתרת התצוגה המקדימה
                const sourcePreview = document.getElementById('sourcePreview');
                const destinationPreview = document.getElementById('destinationPreview');
                
                if (sourcePreview) sourcePreview.style.display = 'none';
                if (destinationPreview) destinationPreview.style.display = 'none';
                updateRequiredFieldsVisibility();
                setTimeout(() => setupPhoneSanitization(), 100);
            });
        }
        updateRequiredFieldsVisibility();
    }
    
    function setupSharedLocationOptions() {
        // טיפול בכפתורי בחירת מוצא/יעד
        document.querySelectorAll('.choice-btn').forEach(button => {
            button.addEventListener('click', function() {
                const field = this.dataset.field;
                const target = this.dataset.target;
                
                // הסר בחירה מכל הכפתורים באותה קבוצה
                document.querySelectorAll(`.choice-btn[data-field="${field}"]`).forEach(btn => {
                    btn.classList.remove('selected');
                });
                
                // סמן את הכפתור הנבחר
                this.classList.add('selected');
                
                // הסר סימון שגיאה אם קיים
                const parentGroup = this.closest('.required-choice');
                if (parentGroup) {
                    parentGroup.classList.remove('error');
                }
                
                // טיפול בשדות הנוספים בהתאם לבחירה
                if (field === 'source') {
                    const secondCarSourceFields = document.getElementById('secondCarSourceFields');
                    const sourcePreview = document.getElementById('sourcePreview');
                    
                    if (target === 'same-source') {
                        if (secondCarSourceFields) secondCarSourceFields.classList.add('hidden');
                        updateSourcePreview();
                    } else {
                        if (secondCarSourceFields) secondCarSourceFields.classList.remove('hidden');
                        if (sourcePreview) sourcePreview.style.display = 'none';
                    }
                } else if (field === 'destination') {
                    const secondCarDestinationFields = document.getElementById('secondCarDestinationFields');
                    const destinationPreview = document.getElementById('destinationPreview');
                    
                    if (target === 'same-destination') {
                        if (secondCarDestinationFields) secondCarDestinationFields.classList.add('hidden');
                        updateDestinationPreview();
                    } else {
                        if (secondCarDestinationFields) secondCarDestinationFields.classList.remove('hidden');
                        if (destinationPreview) destinationPreview.style.display = 'none';
                    }
                }
            });
        });
        
        // עדכון שדות המוצא והיעד כאשר הם משתנים ברכב הראשון
        const defectiveSource = document.getElementById('defectiveSource');
        const contactName1 = document.getElementById('contactName1');
        const defectiveDestination = document.getElementById('defectiveDestination');
        const destContactName = document.getElementById('destContactName');
        
        if (defectiveSource) defectiveSource.addEventListener('input', updateSourcePreview);
        if (contactName1) contactName1.addEventListener('input', updateSourcePreview);
        if (defectiveDestination) defectiveDestination.addEventListener('input', updateDestinationPreview);
        if (destContactName) destContactName.addEventListener('input', updateDestinationPreview);
    }
    
    // פונקציות עזר לעדכון תצוגת מידע שיתופי
    function updateSourcePreview() {
        const sourceButton = document.querySelector('.choice-btn[data-target="same-source"].selected');
        if (!sourceButton) return;
        
        const sourceValue = document.getElementById('defectiveSource').value;
        const contactName = document.getElementById('contactName1').value;
        const preview = document.getElementById('sourcePreview');
        
        if (sourceValue && preview) {
            preview.textContent = `כתובת: ${sourceValue}${contactName ? ', איש קשר: ' + contactName : ''}`;
            preview.style.display = 'block';
        } else if (preview) {
            preview.style.display = 'none';
        }
    }
    
    function updateDestinationPreview() {
        const destButton = document.querySelector('.choice-btn[data-target="same-destination"].selected');
        if (!destButton) return;
        
        const destValue = document.getElementById('defectiveDestination').value;
        const contactName = document.getElementById('destContactName').value;
        const preview = document.getElementById('destinationPreview');
        
        if (destValue && preview) {
            preview.textContent = `כתובת: ${destValue}${contactName ? ', איש קשר: ' + contactName : ''}`;
            preview.style.display = 'block';
        } else if (preview) {
            preview.style.display = 'none';
        }
    }
    
    function updateShareOptions() {
        updateSourcePreview();
        updateDestinationPreview();
    }
    
    function setupFormEvents() {
        // בדיקת חובת בחירה לפני הצגת עמוד הסיכום
        if (mainForm) {
            mainForm.addEventListener('submit', function(e) {
                setDefaultOrderNumber();
                e.preventDefault(); // עצור תמיד את שליחת הטופס הרגילה
                
                const towingType = document.getElementById('towingType').value;
                
                // בדוק רק אם 1) זה רכב תקול, 2) הטופס של הרכב השני מוצג
                if (towingType === 'defective' && 
                    secondDefectiveCarForm && 
                    !secondDefectiveCarForm.classList.contains('hidden')) {
                    
                    let isValid = true;
                    
                    // בדוק אם נבחרה אפשרות מוצא
                    const sourceSelected = document.querySelector('.choice-btn[data-field="source"].selected');
                    if (!sourceSelected) {
                        isValid = false;
                        // הצג הודעת שגיאה
                        const sourceGroup = document.querySelector('.choice-buttons[data-field="source"]');
                        if (sourceGroup) {
                            sourceGroup.closest('.required-choice').classList.add('error');
                        }
                    }
                    
                    // בדוק אם נבחרה אפשרות יעד
                    const destinationSelected = document.querySelector('.choice-btn[data-field="destination"].selected');
                    if (!destinationSelected) {
                        isValid = false;
                        // הצג הודעת שגיאה
                        const destGroup = document.querySelector('.choice-buttons[data-field="destination"]');
                        if (destGroup) {
                            destGroup.closest('.required-choice').classList.add('error');
                        }
                    }
                    
                    // אם יש שגיאה
                    if (!isValid) {
                        alert('יש לבחור האם המוצא והיעד זהים או שונים מהרכב הראשון');
                        return; // אל תמשיך לדף הסיכום
                    }
                }
                if (typeof ensureHiddenPriceField === 'function') ensureHiddenPriceField();
                if (typeof writeFinalPriceToHidden === 'function') writeFinalPriceToHidden();       
                // אם הגענו לכאן, הכל תקין - הצג את דף הסיכום
                showSummary();
            });
        }
        const submitToSummaryBtn = document.getElementById('submitToSummary');
        if (submitToSummaryBtn) {
            submitToSummaryBtn.addEventListener('click', function(e) {
                e.preventDefault();
                // מפעיל את אותה בדיקה כמו submit של הטופס
                const form = document.getElementById('towingForm');
                if (form) {
                    const submitEvent = new Event('submit');
                    form.dispatchEvent(submitEvent);
                }
            });
        }
        // חזרה לעריכה
        if (backToEdit) {
            backToEdit.addEventListener('click', function() {
                mainForm.classList.remove('hidden');
                summaryPage.classList.add('hidden');
                updateRequiredFieldsVisibility();
            });
        }
        
        document.querySelectorAll('input, select, textarea').forEach(element => {
            if (element.id !== 'orderNumber') {
                element.addEventListener('focus', function() {
                    setDefaultOrderNumber();
                });
            }
        });

         setupCreditCardFormatting();
    setupPaymentTypeButtons();
    setupAddressAutoScroll();
    initializeAutomaticPricing();
    setupOutskirtsToggleRecalc();
    setupPriceChoiceHandlers();
    ensureHiddenPriceField();

    // הדגשה אוטומטית לפי הזמן הנוכחי
    const now = new Date();
    const recommended = getRecommendedTier(now);
    applyRecommendedHighlight(recommended);

    document
      .querySelectorAll('[data-target="today"], [data-target="other-date"]')
      .forEach(btn => btn.addEventListener('click', refreshRecommendedHighlight));

    const execDateEl = document.getElementById('executionDate');
    if (execDateEl) execDateEl.addEventListener('change', refreshRecommendedHighlight);

    const execTimeEl = document.getElementById('executionTime');
    if (execTimeEl) execTimeEl.addEventListener('change', refreshRecommendedHighlight);

    // ⬇️ הצגה/הסתרה של המחיר הידני + סינכרון ל-#price
    (function initManualPriceVisibility(){
    const manualRadio = document.getElementById('price-manual');
    const wrap        = document.querySelector('.manual-input-wrap');
    const manualInput = document.getElementById('customPrice');

    if (!manualRadio || !wrap) return;

    const toggle = () => {
        const isManual = manualRadio.checked;
        wrap.style.display = isManual ? 'block' : 'none';
        // בכל מעבר מצב נעדכן את הערך הסופי בשדה הנסתר
        writeFinalPriceToHidden();
    };

    toggle();
    document
        .querySelectorAll('input[name="priceType"]')
        .forEach(r => r.addEventListener('change', toggle));

    // כשהמשתמש מקליד מחיר ידני – נסנכרן לשדה הנסתר #price
    if (manualInput) {
        manualInput.addEventListener('input', () => {
        const hidden = document.getElementById('price');
        if (hidden) {
            const hasVal = manualInput.value.trim() !== '';
            hidden.dataset.manuallyEdited = hasVal ? 'true' : 'false';
            hidden.dataset.autoCalculated = 'false';
        }
        writeFinalPriceToHidden();
        });
    }
    })();
}


// הפעל את הפונקציה כשהדף נטען
// document.addEventListener('DOMContentLoaded', function() {
//     setupAddressAutoScroll();
// });

    // פונקציות הנוגעות לעמוד הסיכום
    
    function getDateDisplay() {
        if (document.querySelector('[data-target="today"].active')) {
            return 'היום';
        }
        return document.getElementById('executionDate').value;
    }
    
    function getTimeDisplay() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }
    
    function getTowingTypeDisplay() {
        const type = document.getElementById('towingType').value;
        return type === 'defective' ? 'גרירת רכב תקול' : 'מסירת רכב תקין ואיסוף רכב תקול';
    }
    
    function updateDefectiveCarSummary() {
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
            const inputElement = document.getElementById(id);
            const summaryElement = document.getElementById(`summary-${id}`);
            
            if (inputElement && summaryElement) {
                summaryElement.textContent = inputElement.value || 'לא הוזן';
            }
        }
        
        // בדיקה אם יש רכב תקול שני והאם יש אלמנט סיכום עבורו
        const secondSummary = document.getElementById('summary-secondDefectiveCar');
        if (secondDefectiveCarForm && !secondDefectiveCarForm.classList.contains('hidden') && secondSummary) {
            secondSummary.classList.remove('hidden');
            
            // עדכון פרטי רכב שני
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
            
            // עדכון מוצא ויעד של רכב שני
            if (document.querySelector('.choice-btn[data-target="same-source"].selected')) {
                const sourceElement = document.getElementById('summary-defectiveSource2');
                const contactNameElement = document.getElementById('summary-contactName2');
                const contactPhoneElement = document.getElementById('summary-contactPhone2');
                
                if (sourceElement) sourceElement.textContent = 'זהה לרכב הראשון';
                if (contactNameElement) contactNameElement.textContent = 'זהה לרכב הראשון';
                if (contactPhoneElement) contactPhoneElement.textContent = 'זהה לרכב הראשון';
            } else {
                const sourceElement = document.getElementById('summary-defectiveSource2');
                const contactNameElement = document.getElementById('summary-contactName2');
                const contactPhoneElement = document.getElementById('summary-contactPhone2');
                
                if (sourceElement) sourceElement.textContent = document.getElementById('defectiveSource2').value || 'לא הוזן';
                if (contactNameElement) contactNameElement.textContent = document.getElementById('contactName2').value || 'לא הוזן';
                if (contactPhoneElement) contactPhoneElement.textContent = document.getElementById('contactPhone2').value || 'לא הוזן';
            }

            if (document.querySelector('.choice-btn[data-target="same-destination"].selected')) {
                const destElement = document.getElementById('summary-defectiveDestination2');
                const destContactNameElement = document.getElementById('summary-destContactName2');
                const destContactPhoneElement = document.getElementById('summary-destContactPhone2');
                
                if (destElement) destElement.textContent = 'זהה לרכב הראשון';
                if (destContactNameElement) destContactNameElement.textContent = 'זהה לרכב הראשון';
                if (destContactPhoneElement) destContactPhoneElement.textContent = 'זהה לרכב הראשון';
            } else {
                const destElement = document.getElementById('summary-defectiveDestination2');
                const destContactNameElement = document.getElementById('summary-destContactName2');
                const destContactPhoneElement = document.getElementById('summary-destContactPhone2');
                
                if (destElement) destElement.textContent = document.getElementById('defectiveDestination2').value || 'לא הוזן';
                if (destContactNameElement) destContactNameElement.textContent = document.getElementById('destContactName2').value || 'לא הוזן';
                if (destContactPhoneElement) destContactPhoneElement.textContent = document.getElementById('destContactPhone2').value || 'לא הוזן';
            }
        } else if (secondSummary) {
            secondSummary.classList.add('hidden');
        }
    }
    
    function updateExchangeSummary() {
        const workingCarFields = {
            workingCarType: 'סוג רכב תקין',
            workingCarNumber: 'מספר רכב תקין',
            workingCarCode: 'קוד רכב תקין',
            workingCarSource: 'מקום איסוף',
            workingCarDestination: 'יעד מסירה',
            workingSourceContact: 'שם איש קשר באיסוף',
            workingSourcePhone: 'טלפון איש קשר באיסוף',
            workingDestContact: 'שם איש קשר ביעד',
            workingDestPhone: 'טלפון איש קשר ביעד',
            exchangeDefectiveType: 'סוג רכב תקול',
            exchangeDefectiveNumber: 'מספר רכב תקול',
            exchangeDefectiveCode: 'קוד רכב תקול',
            exchangeDefectiveDetails: 'פירוט התקלה',
            exchangeDefectiveDestination: 'יעד רכב תקול',
            garageContact: 'שם איש קשר ביעד',
            garagePhone: 'טלפון איש קשר ביעד'
        };
    
        for (const [id, label] of Object.entries(workingCarFields)) {
            const inputElement = document.getElementById(id);
            const summaryElement = document.getElementById(`summary-${id}`);
            
            if (inputElement && summaryElement) {
                summaryElement.textContent = inputElement.value || 'לא הוזן';
            }
        }
    }
    
    function showSummary() {
        mainForm.classList.add('hidden');
        summaryPage.classList.remove('hidden');
    
        // עדכון פרטים בסיסיים
        const summaryOrderNumber = document.getElementById('summary-orderNumber');
        const summaryCompany = document.getElementById('summary-company');
        const summaryDate = document.getElementById('summary-date');
        const summaryTime = document.getElementById('summary-time');
        const summaryTowingType = document.getElementById('summary-towingType');
        
        if (summaryOrderNumber) summaryOrderNumber.textContent = document.getElementById('orderNumber').value || 'לא הוזן';
        if (summaryCompany) summaryCompany.textContent = companyName;
        if (summaryDate) summaryDate.textContent = getDateDisplay();
        if (summaryTime) summaryTime.textContent = getTimeDisplay();
        if (summaryTowingType) summaryTowingType.textContent = getTowingTypeDisplay();
    
        const currentTowingType = document.getElementById('towingType').value;
    
        // הסתרת כל חלקי הסיכום
        const summaryDefectiveCar = document.getElementById('summary-defectiveCar');
        const summaryExchange = document.getElementById('summary-exchange');
        
        if (summaryDefectiveCar) summaryDefectiveCar.classList.add('hidden');
        if (summaryExchange) summaryExchange.classList.add('hidden');
    
        // הצגת החלק הרלוונטי
        if (currentTowingType === 'defective') {
            if (summaryDefectiveCar) {
                summaryDefectiveCar.classList.remove('hidden');
                updateDefectiveCarSummary();
            }
        } else if (currentTowingType === 'exchange') {
            if (summaryExchange) {
                summaryExchange.classList.remove('hidden');
                updateExchangeSummary();
            }
        }
    
        // עדכון הערות
        const summaryNotes = document.getElementById('summary-notes');
        if (summaryNotes) {
            summaryNotes.textContent = document.getElementById('notes').value || 'אין הערות';
        }
    }



// פונקציה לעיצוב תאריך תוקף
function formatExpiryDate(value) {
    // הסרת כל מה שאינו ספרה
    const numbers = value.replace(/\D/g, '');
    
    // הוספת / אחרי 2 ספרות
    if (numbers.length >= 2) {
        return numbers.slice(0, 2) + '/' + numbers.slice(2, 4);
    }
    
    return numbers;
}

// פונקציה לעיצוב CVV
function formatCVV(value) {
    // רק ספרות, מקסימום 4
    return value.replace(/\D/g, '').slice(0, 4);
}

// מחזיר רק ספרות
function onlyDigits(str) {
  return (str || "").replace(/\D+/g, "");
}

// מחזיר את המיקום בפורמט לאחר N ספרות (מדלג על מפרידים)
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

// סופר כמה ספרות יש עד מיקום caret במחרוזת מקורית (לא-פורמט)
function countDigitsToIndex(str, idx) {
  return (str.slice(0, idx).match(/\d/g) || []).length;
}

function formatCardNumber(value) {
  // השאר רק ספרות (באמצעות onlyDigits אם קיימת)
  const digits = (typeof onlyDigits === 'function' ? onlyDigits(value) : value.replace(/\D/g, ''))
                  .slice(0, 16); // הגבל ל-16 ספרות

  // הוסף מקפים אחרי כל 4 ספרות
  return digits.replace(/(\d{4})(?=\d)/g, '$1-');
}


// תוקף: MM/YY (עד 4 ספרות, בלי "תיקון חכם")
function formatExpiryDate(value) {
  const digits = onlyDigits(value).slice(0, 4); // MMYY
  if (digits.length <= 2) return digits;
  return digits.slice(0, 2) + "/" + digits.slice(2);
}

// CVV: עד 4 ספרות (לתמיכה ב-AMEX)
function formatCVV(value) {
  return onlyDigits(value).slice(0, 4);
}

    

    // הוספת סגנונות CSS לאנימציות
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // הפעלת פונקציונליות מילוי אוטומטי
    setupVehicleLookup();
    setupLicenseNumberSanitization();
    setupPhoneSanitization();
    // setupAddressTracking(); 
    setTimeout(() => {
    setupPhoneSanitization();
}, 2000);
});



// פונקציה לעיצוב מספר תעודת זהות - הוסף אחרי הפונקציות הקיימות
function formatIDNumber(value) {
    return value.replace(/\D/g, '').slice(0, 9);
}

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

// פונקציה לבדיקת זמינות נתוני הרכב
function isVehicleDataAvailable(context = 'defective') {
    const dataSourceId = `dataSource_${context}`;
    const dataSourceElement = document.getElementById(dataSourceId);
    return dataSourceElement && dataSourceElement.value;
}


// פונקציה לתרגום הודעות שגיאה
function getDistanceErrorMessage(status) {
    const errorMessages = {
        'NOT_FOUND': 'כתובת לא נמצאה במפות גוגל',
        'ZERO_RESULTS': 'לא נמצא מסלול בין הכתובות',
        'MAX_WAYPOINTS_EXCEEDED': 'יותר מדי נקודות במסלול',
        'MAX_ROUTE_LENGTH_EXCEEDED': 'המסלול ארוך מדי',
        'INVALID_REQUEST': 'בקשה לא תקינה',
        'OVER_DAILY_LIMIT': 'חרגת מהמכסה היומית של Google',
        'OVER_QUERY_LIMIT': 'חרגת ממגבלת הבקשות',
        'REQUEST_DENIED': 'הבקשה נדחתה - בדוק הגדרות API',
        'UNKNOWN_ERROR': 'שגיאה לא ידועה בשרתי גוגל'
    };
    
    return errorMessages[status] || `שגיאה לא מוכרת: ${status}`;
}

// פונקציה לקבלת כתובות מהטופס
// function getAddressesForCalculation(context = 'defective') {
//     let sourceFieldId, destinationFieldId;
    
//     if (context === 'defective') {
//         sourceFieldId = 'defectiveSource';
//         destinationFieldId = 'defectiveDestination';
//     } else if (context === 'defective2') {
//         sourceFieldId = 'defectiveSource2';
//         destinationFieldId = 'defectiveDestination2';
//     } else {
//         throw new Error('קונטקסט לא נתמך');
//     }
    
//     const sourceField = document.getElementById(sourceFieldId);
//     const destField = document.getElementById(destinationFieldId);
    
//     if (!sourceField || !destField) {
//         throw new Error('שדות כתובת לא נמצאו');
//     }
    
//     // נעדיף כתובות פיזיות אם זמינות, אחרת נשתמש בטקסט שהוזן
//     const sourceAddress = sourceField.dataset.physicalAddress || sourceField.value;
//     const destAddress = destField.dataset.physicalAddress || destField.value;
    
//     // הורדנו את הבדיקה מכאן - תיעשה בפונקציה הקוראת
//     return {
//         source: (sourceAddress || '').trim(),
//         destination: (destAddress || '').trim(),
//         sourceIsGoogle: sourceField.dataset.isGoogleAddress === 'true',
//         destIsGoogle: destField.dataset.isGoogleAddress === 'true'
//     };
// }





