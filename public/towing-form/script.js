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
                if (cleanValue.length >= 6 && cleanValue !== lastSearchedValue) {
                    lookupVehicleData(cleanValue, context);
                    lastSearchedValue = cleanValue;
                    hasSearched = true;
                }
            }, 10); // השהיה קטנה כדי לתת לערך להתעדכן
        });

        // חיפוש כשעוזבים את השדה (אם עדיין לא חיפשנו)
        field.addEventListener('blur', function() {
            const cleanValue = this.value.replace(/[^0-9]/g, '');
            if (cleanValue.length >= 6 && cleanValue !== lastSearchedValue && !hasSearched) {
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
                if (cleanValue.length < 6) {
                    const typeFieldId = getCarTypeFieldId(context);
                    hideVehicleTypeField(typeFieldId);
                    const typeField = document.getElementById(typeFieldId);
                    if (typeField) typeField.value = '';
                }
            }
        });
    });
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
            
            typeField.value = vehicleDescription;
            
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

    // יצירת מידע על המאגר בלבד
    const source = vehicle.source;
    let sourceText = 'מאגר ממשלתי';
    
    if (source) {
        const typeMap = {
            private: 'רכב פרטי',
            motorcycle: 'דו-גלגלי',
            heavy: 'מעל 3.5 טון',
            machinery: 'צמ״ה'
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

    // יצירת אלמנט מידע קטן
    const infoDiv = document.createElement('div');
    infoDiv.className = 'vehicle-info-display';
    infoDiv.style.cssText = `
        margin-top: 5px;
        padding: 5px 8px;
        background: #f0f9ff;
        border: 1px solid #bfdbfe;
        border-radius: 4px;
        font-size: 12px;
        color: #1e40af;
    `;
    infoDiv.textContent = `מקור: ${sourceText}`;

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
    setupLicenseNumberSanitization();
    setupPhoneSanitization();
    setupAddressTracking(); 
    setTimeout(() => {
    setupPhoneSanitization();
}, 2000);
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

// מעקב אחר סוג כתובות (גוגל vs טקסט חופשי)
function setupAddressTracking() {
    const addressFields = [
        'defectiveSource',
        'defectiveDestination', 
        'defectiveSource2',
        'defectiveDestination2',
        'workingCarSource',
        'workingCarDestination',
        'exchangeDefectiveDestination'
    ];

    addressFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        // ברירת מחדל - טקסט חופשי
        field.dataset.isGoogleAddress = 'false';

        // כשמשתמש מקליד ידנית - זה טקסט חופשי
        field.addEventListener('input', function() {
            this.dataset.isGoogleAddress = 'false';
        });
    });
}

// פונקציה לפתיחת דשבורד האדמין
function openAdminDashboard() {
    window.open('/admin', '_blank');
}

function clearSource(context) {
  const hid = document.getElementById(`dataSource_${context}`);
  if (hid) hid.value = '';
}