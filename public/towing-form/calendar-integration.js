const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzkkc7NE7PQ8_2XkF213ynoq9SJYOGH0l8ZSxE-266_73_bLfQG7RcJL4etgA_j_JMI/exec";
// מאזין לכפתור השליחה הסופי
document.getElementById('confirmSubmit').addEventListener('click', async function(e) {
    e.preventDefault();
    
    try {
        const formData = collectFormData();

        const form = document.createElement('form');
    form.method = 'POST';
    form.action = APPS_SCRIPT_URL;
    form.target = '_blank';

    const hiddenField = document.createElement('input');
    hiddenField.type = 'hidden';
    hiddenField.name = 'data';
    hiddenField.value = JSON.stringify(formData);

    form.appendChild(hiddenField);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
        
        alert('הטופס נשלח בהצלחה והאירוע נוסף ליומן!');
        location.reload();
    } catch (error) {
        console.error('Error:', error);
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
            carType: document.getElementById('defectiveCarType').value,
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
        formData.payment = {
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