const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxf6_sCGVmBfSR-_4r-CO8nbp3a_7qFQ2IMLEQ1-7iVMdcWzuYYaXRovZxaFj95TgCu/exec";
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
        department: localStorage.getItem('userDepartment') || '' // הוספת שם המחלקה
    };

    // בדיקה אם טופס רכב נוסף מוצג
    const secondDefectiveCarForm = document.getElementById('secondDefectiveCarForm');
    const hasSecondCar = secondDefectiveCarForm && !secondDefectiveCarForm.classList.contains('hidden');
    formData.hasSecondCar = hasSecondCar;

    if (formData.towingType === 'defective') {
        formData.location = document.getElementById('defectiveSource').value;
        formData.defectiveCar = {
            carNumber: document.getElementById('defectiveCarNumber').value,
            carType: document.getElementById('defectiveCarType').value,
            carCode: document.getElementById('defectiveCarCode').value,
            defectDetails: document.getElementById('defectDetails').value,
            source: document.getElementById('defectiveSource').value,
            destination: document.getElementById('defectiveDestination').value,
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
            
            formData.secondDefectiveCar = {
                carNumber: document.getElementById('defectiveCarNumber2').value,
                carType: document.getElementById('defectiveCarType2').value,
                carCode: document.getElementById('defectiveCarCode2').value,
                defectDetails: document.getElementById('defectDetails2').value,
                shareSource: shareSource,
                shareDestination: shareDestination
            };
            
            // אם לא משתפים את המוצא, השתמש בערכים שהוזנו
            if (!shareSource) {
                formData.secondDefectiveCar.source = document.getElementById('defectiveSource2').value;
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
                formData.secondDefectiveCar.destination = document.getElementById('defectiveDestination2').value;
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
        formData.workingCar = {
            carType: document.getElementById('workingCarType').value,
            carNumber: document.getElementById('workingCarNumber').value,
            carCode: document.getElementById('workingCarCode').value,
            source: document.getElementById('workingCarSource').value,
            destination: document.getElementById('workingCarDestination').value,
            sourceContact: {
                name: document.getElementById('workingSourceContact').value,
                phone: document.getElementById('workingSourcePhone').value
            },
            destContact: {
                name: document.getElementById('workingDestContact').value,
                phone: document.getElementById('workingDestPhone').value
            }
        };

        formData.defectivePickup = {
            carType: document.getElementById('exchangeDefectiveType').value,
            carNumber: document.getElementById('exchangeDefectiveNumber').value,
            carCode: document.getElementById('exchangeDefectiveCode').value,
            defectDetails: document.getElementById('exchangeDefectiveDetails').value,
            destination: document.getElementById('exchangeDefectiveDestination').value,
            garageContact: {
                name: document.getElementById('garageContact').value,
                phone: document.getElementById('garagePhone').value
            }
        };
    }

    return formData;
}