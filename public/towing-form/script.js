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

    // אתחול תאריך ושעה
    initDateTime();
    
    // הגדרת אירועים
    setupDateButtons();
    setupTowingTypeChange();
    setupSecondCarButtons();
    setupSharedLocationOptions();
    setupFormEvents();
    
    function initDateTime() {
        const now = new Date();
        const currentDate = now.toISOString().split('T')[0];
        document.getElementById('executionDate').value = currentDate;
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
            if (secondDefectiveCarForm) secondDefectiveCarForm.classList.add('hidden');
            
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
            });
        }
        
        if (removeSecondDefectiveCarBtn) {
            removeSecondDefectiveCarBtn.addEventListener('click', function() {
                if (secondDefectiveCarForm) secondDefectiveCarForm.classList.add('hidden');
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
            });
        }
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
                
                // אם הגענו לכאן, הכל תקין - הצג את דף הסיכום
                showSummary();
            });
        }
        
        // חזרה לעריכה
        if (backToEdit) {
            backToEdit.addEventListener('click', function() {
                mainForm.classList.remove('hidden');
                summaryPage.classList.add('hidden');
            });
        }
        
        // אישור ושליחה
        if (confirmSubmit) {
            confirmSubmit.addEventListener('click', function() {
                // כאן תוכל להוסיף קוד לשמירת/שליחת הנתונים
                alert('הטופס נשלח בהצלחה!');
                // ניקוי הטופס והחזרה למסך הראשי
                mainForm.reset();
                mainForm.classList.remove('hidden');
                summaryPage.classList.add('hidden');
                
                // החזרה למצב התחלתי
                if (defectiveCarForm) defectiveCarForm.classList.add('hidden');
                if (exchangeForm) exchangeForm.classList.add('hidden');
                if (secondDefectiveCarForm) secondDefectiveCarForm.classList.add('hidden');
                
                // מסתירים את כפתור הוספת הרכב - מחלקת CSS וגם visibility
                if (addCarButtonContainer) {
                    addCarButtonContainer.classList.add('hidden');
                    addCarButtonContainer.style.visibility = 'hidden';
                }
                
                // איפוס בחירת סוג גרירה
                document.getElementById('towingType').value = '';
            });
        }
    }
    
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

    // ===== הוספת פונקציונליות מילוי אוטומטי של רכבים =====
    
    // מאזינים לשינויים בשדות מספר רכב
    function setupVehicleLookup() {
    // מאזינים לכפתורי "הזן"
    document.querySelectorAll('.lookup-btn').forEach(button => {
        button.addEventListener('click', function() {
            const context = this.dataset.target;
            const licenseField = document.getElementById(getCarNumberFieldId(context));
            
            if (licenseField && licenseField.value.length >= 6) {
                lookupVehicleData(licenseField.value, context);
            } else {
                showVehicleWarning('אנא הזן מספר רכב תקין (לפחות 6 ספרות)', 'warning');
            }
        });
    });
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

    // פונקציה לחיפוש מידע רכב
    async function lookupVehicleData(licenseNumber, vehicleContext) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        
        if (cleanLicense.length < 6) return;

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
            const typeField = document.getElementById(typeFieldId);
            if (typeField) {
                // יצירת תיאור מקוצר לשדה סוג רכב
                let vehicleDescription = '';
                if (vehicle.manufacturer) vehicleDescription += vehicle.manufacturer;
                if (vehicle.model) vehicleDescription += (vehicleDescription ? ' ' : '') + vehicle.model;
                if (vehicle.year) vehicleDescription += (vehicleDescription ? ' ' : '') + vehicle.year;
                
                typeField.value = vehicleDescription;
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

        // יצירת אלמנט מידע
        const infoDiv = document.createElement('div');
        infoDiv.className = 'vehicle-info-display';
        infoDiv.style.cssText = `
            margin-top: 8px;
            padding: 10px;
            background: #f0f9ff;
            border: 1px solid #bfdbfe;
            border-radius: 6px;
            font-size: 13px;
            line-height: 1.4;
        `;

        let infoHTML = `
            <div style="font-weight: bold; color: #1e40af; margin-bottom: 6px;">
                🚗 ${vehicle.fullDescription}
            </div>
        `;

        // הוספת מידע נוסף
        const details = [];
        if (vehicle.color) details.push(`צבע: ${vehicle.color}`);
        if (vehicle.fuelType) details.push(`דלק: ${vehicle.fuelType}`);
        if (vehicle.weight) details.push(`משקל: ${vehicle.weight}`);
        
        if (details.length > 0) {
            infoHTML += `<div style="color: #64748b;">${details.join(' • ')}</div>`;
        }


        // סטטוס הרכב
        if (status.isCanceled) {
            infoHTML += `<div style="color: #dc2626; font-weight: bold; margin-top: 6px;">⚠️ רכב מבוטל</div>`;
        } else if (status.isInactive) {
            infoHTML += `<div style="color: #d97706; font-weight: bold; margin-top: 6px;">⚠️ רכב לא פעיל</div>`;
        }

        infoDiv.innerHTML = infoHTML;
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
});

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