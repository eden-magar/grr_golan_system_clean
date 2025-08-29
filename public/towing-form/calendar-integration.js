const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzKtpMTbPVQIvx1lMaTP3tNoiinVKjQ3VAg6YCsJj0QhnICxVDCkm4p7s0CGg3XKzKs/exec";

function sanitizeText(text) {
    if (!text) return text;
    return text
        .replace(/['״"']/g, '')  // מחיקת כל סוגי הגרשים (עברי, אנגלי, גרשיים)
        .trim();
}

// מאזין לכפתור השליחה הסופי
document.getElementById('confirmSubmit').addEventListener('click', async function(e) {
    e.preventDefault();
    
    try {
        // הצגת מודל טעינה
        const loadingModal = document.getElementById('loadingModal');
        loadingModal.classList.add('show');
        
        // איסוף נתוני הטופס
        const formData = collectFormData();
        
        // יצירת חלון popup קטן שיסגר מיד (פתרון לבעיית CORS)
        const popup = window.open('', 'formSubmit', 'width=1,height=1,left=9999,top=9999');
        
        // יצירת form במבנה נסתר בחלון החדש
        const formHtml = `
            <html><body>
            <form method="POST" action="${APPS_SCRIPT_URL}">
                <input type="hidden" name="data" value='${JSON.stringify(formData)}'>
            </form>
            <script>
                document.forms[0].submit();
                setTimeout(() => window.close(), 500);
            </script>
            </body></html>
        `;
        
        popup.document.write(formHtml);
        popup.document.close();
        
        // המתנה קצרה ואז הצגת הצלחה
        setTimeout(() => {
            // הסתרת מודל טעינה
            loadingModal.classList.remove('show');
            
            // הצגת מודל הצלחה
            const successModal = document.getElementById('successModal');
            successModal.classList.add('show');
            
            // סגירת החלון אם עדיין פתוח
            if (!popup.closed) {
                popup.close();
            }
        }, 2500); // 2.5 שניות המתנה
        
    } catch (error) {
        console.error('Error:', error);
        
        // הסתרת מודל טעינה במקרה של שגיאה
        const loadingModal = document.getElementById('loadingModal');
        loadingModal.classList.remove('show');
        
        alert('אירעה שגיאה בשליחת הטופס. אנא נסה שוב.');
    }
});

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

// פונקציה לאיסוף הנתונים מהטופס
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

            defectDetails: document.getElementById('defectDetails').value,
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
        const selectedPaymentType = getSelectedPaymentType();
        formData.payment = {
        paymentType: selectedPaymentType,
        price: document.getElementById('price').value || '',
        idNumber: document.getElementById('idNumber').value || '', 
        creditCard: {
            number: document.getElementById('cardNumber').value || '',
            expiry: document.getElementById('cardExpiry').value || '',
            cvv: document.getElementById('cardCvv').value || ''
        }
    };
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
            // ניקוי הערך
            field.value = '';
            
            // 🚨 ניקוי כל ה-data attributes של כתובות
            field.dataset.physicalAddress = '';
            field.dataset.isGoogleAddress = 'false';
            field.dataset.hasChanged = 'false';
            field.dataset.originalText = '';
            
            // ניקוי attributes נוספים אם קיימים
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
            // ניקוי הערך
            field.value = '';
            
            // 🚨 ניקוי כל ה-data attributes של רכב
            delete field.dataset.color;
            delete field.dataset.gear;
            delete field.dataset.machineryType;
            delete field.dataset.selfWeight;
            delete field.dataset.totalWeightTon;
            delete field.dataset.fuelType;
            delete field.dataset.driveType;
            delete field.dataset.gearType;
            
            // הסתרת שדה סוג רכב
            field.closest('.form-group')?.classList.add('vehicle-type-hidden');
            
            console.log(`🧹 נוקה שדה רכב: ${fieldId}`);
        }
    });
    
    // 🔧 ניקוי מלא של מקורות המידע (data sources)
    ['defective', 'defective2', 'working', 'exchangeDefective'].forEach(context => {
        const sourceField = document.getElementById(`dataSource_${context}`);
        if (sourceField) {
            sourceField.remove(); // מחק לגמרי את השדה
            console.log(`🧹 הוסר מקור מידע: ${context}`);
        }
    });
    
    // החזרה למצב התחלתי
    document.getElementById('summaryPage').classList.add('hidden');
    document.getElementById('towingForm').classList.remove('hidden');
    
    // הסתרת כל הטפסים המתקדמים
    document.getElementById('defectiveCarForm')?.classList.add('hidden');
    document.getElementById('exchangeForm')?.classList.add('hidden');
    document.getElementById('secondDefectiveCarForm')?.classList.add('hidden');
    
    // הסתרת כפתור הוספת רכב נוסף
    const addCarButtonContainer = document.getElementById('addCarButtonContainer');
    if (addCarButtonContainer) {
        addCarButtonContainer.classList.add('hidden');
        addCarButtonContainer.style.visibility = 'hidden';
    }
    
    // איפוס בחירת סוג גרירה
    document.getElementById('towingType').value = '';
    
    // החזרת התאריך להיום
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('executionDate').value = today;
    
    // החזרת כפתורי התאריך למצב ברירת מחדל
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-target="today"]')?.classList.add('active');
    document.getElementById('datePicker')?.classList.add('hidden');
    
    // איפוס מחיר ונקה כל עיצוב אוטומטי
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
    
    // איפוס כפתורי תשלום
    document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector('[data-payment="cash"]')?.classList.add('active');
    document.getElementById('creditCardSection')?.classList.add('hidden');
    
    // 🔧 הגדרה מחדש של המאזינים אחרי הניקוי
    console.log('🔄 מגדיר מחדש מאזיני רכב...');
    setupVehicleLookup();
    setupPhoneSanitization();
    setupAddressTracking();
    
    console.log('✅ הטופס אופס לחלוטין - רק פרטי משתמש נשמרו');
    console.log('🧹 כל נתוני הרכב והכתובות נמחקו');
    console.log('🔄 מאזינים הוגדרו מחדש');
}