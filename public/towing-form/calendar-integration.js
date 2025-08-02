const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx19ZVGQMCy2lK2ZQBp--2ZsEQIt5icnq808eFIy-I5VU5yy4N8aody0gsTzoV8MY5R/exec";
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

// פונקציה לאיסוף הנתונים מהטופס
// מצאי את הפונקציה collectFormData והחליפי אותה בזו המעודכנת:

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

    if (formData.towingType === 'defective') {
        formData.location = document.getElementById('defectiveSource').value;
        
        // ✨ קבלת צבע וגיר מה-data attributes ✨
        const defectiveCarTypeField = document.getElementById('defectiveCarType');
        
        formData.defectiveCar = {
            carNumber: document.getElementById('defectiveCarNumber').value,
            carType: document.getElementById('defectiveCarType').value,
            carCode: document.getElementById('defectiveCarCode').value,
            color: defectiveCarTypeField?.dataset.color || '', // ✨ הוספת צבע ✨
            gear: defectiveCarTypeField?.dataset.gear || '',   // ✨ הוספת גיר ✨
            defectDetails: document.getElementById('defectDetails').value,
            source: {
                address: document.getElementById('defectiveSource').value,
                isGoogleAddress: document.getElementById('defectiveSource').dataset.isGoogleAddress === 'true'
            },
            destination: {
                address: document.getElementById('defectiveDestination').value,
                isGoogleAddress: document.getElementById('defectiveDestination').dataset.isGoogleAddress === 'true'
            },
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
                color: defectiveCarType2Field?.dataset.color || '', // ✨ הוספת צבע ✨
                gear: defectiveCarType2Field?.dataset.gear || '',   // ✨ הוספת גיר ✨
                defectDetails: document.getElementById('defectDetails2').value,
                shareSource: shareSource,
                shareDestination: shareDestination
            };
            
            // אם לא משתפים את המוצא, השתמש בערכים שהוזנו
            if (!shareSource) {
                formData.secondDefectiveCar.source = {
                    address: document.getElementById('defectiveSource2').value,
                    isGoogleAddress: document.getElementById('defectiveSource2').dataset.isGoogleAddress === 'true'
                };
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
                formData.secondDefectiveCar.destination = {
                address: document.getElementById('defectiveDestination2').value,
                isGoogleAddress: document.getElementById('defectiveDestination2').dataset.isGoogleAddress === 'true'
            };
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
        formData.location = document.getElementById('workingCarSource').value;
        
        // ✨ קבלת צבע וגיר של רכב תקין ✨
        const workingCarTypeField = document.getElementById('workingCarType');
        
        formData.workingCar = {
            carType: document.getElementById('workingCarType').value,
            carNumber: document.getElementById('workingCarNumber').value,
            carCode: document.getElementById('workingCarCode').value,
            color: workingCarTypeField?.dataset.color || '', // ✨ הוספת צבע ✨
            gear: workingCarTypeField?.dataset.gear || '',   // ✨ הוספת גיר ✨
            source: {
                address: document.getElementById('workingCarSource').value,
                isGoogleAddress: document.getElementById('workingCarSource').dataset.isGoogleAddress === 'true'
            },
            destination: {
                address: document.getElementById('workingCarDestination').value,
                isGoogleAddress: document.getElementById('workingCarDestination').dataset.isGoogleAddress === 'true'
            },
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
            color: exchangeDefectiveTypeField?.dataset.color || '', // ✨ הוספת צבע ✨
            gear: exchangeDefectiveTypeField?.dataset.gear || '',   // ✨ הוספת גיר ✨
            defectDetails: document.getElementById('exchangeDefectiveDetails').value,
            destination: {
                address: document.getElementById('exchangeDefectiveDestination').value,
                isGoogleAddress: document.getElementById('exchangeDefectiveDestination').dataset.isGoogleAddress === 'true'
            },
            garageContact: {
                name: document.getElementById('garageContact').value,
                phone: document.getElementById('garagePhone').value
            }
        };
    }

    return formData;
}