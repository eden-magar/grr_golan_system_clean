/**
 * השלמה אוטומטית לכתובות - Google Places API
 * תומך בעברית ובישראל עם דיוק מושלם
 */

class AddressAutocomplete {
    constructor() {
        this.activeInput = null;
        this.autocompleteServices = new Map();
        this.geocoder = null;
        
        // ✨ מטמון לשמירת הטקסטים המקוריים
        this.originalTexts = new Map();
        
        // רשימת שדות כתובות לזיהוי אוטומטי
        this.addressFields = [
            'defectiveSource',
            'defectiveDestination', 
            'defectiveSource2',
            'defectiveDestination2',
            'workingCarSource',
            'workingCarDestination',
            'exchangeDefectiveDestination'
        ];
        
        this.init();
    }
    
    /**
     * אתחול המערכת
     */
    init() {
        // המתנה לטעינת Google Maps API
        if (window.google && window.google.maps) {
            this.setupGoogleMaps();
        } else {
            // המתנה לטעינת הספרייה
            const checkGoogle = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkGoogle);
                    this.setupGoogleMaps();
                }
            }, 100);
        }
    }
    
    /**
     * הגדרת Google Maps והשלמה אוטומטית
     */
    setupGoogleMaps() {
        // אתחול geocoder
        this.geocoder = new google.maps.Geocoder();
        
        // המתנה לטעינת הדף
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAddressFields());
        } else {
            this.setupAddressFields();
        }
    }
    
    /**
     * הגדרת השלמה אוטומטית לכל שדות הכתובות
     */
    setupAddressFields() {
        this.addressFields.forEach(fieldId => {
            const input = document.getElementById(fieldId);
            if (input) {
                this.setupGoogleAutocomplete(input);
            }
        });
        
        // הוספת מאזין לסגירת רשימות בלחיצה חיצונית
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.address-input-container')) {
                this.hideAllSuggestions();
            }
        });
    }
    
    /**
     * הגדרת Google Places Autocomplete לשדה ספציפי
     */
    setupGoogleAutocomplete(input) {
        // יצירת container להשלמה אוטומטית
        this.wrapInputWithContainer(input);
        
        // הגדרות לישראל
        const options = {
            componentRestrictions: { country: 'il' }, // רק ישראל
            fields: ['formatted_address', 'name', 'place_id', 'geometry', 'types'],
            types: ['establishment', 'geocode'] // עסקים וכתובות
        };
        
        // יצירת Autocomplete
        const autocomplete = new google.maps.places.Autocomplete(input, options);
        this.autocompleteServices.set(input.id, autocomplete);
        
        // ✨ מאזין להקלדה - שמירת הטקסט המקורי
        input.addEventListener('input', (e) => {
            this.handleInput(e);
            // שמירת הטקסט שהמשתמש מקליד
            this.originalTexts.set(input.id, e.target.value);
        });
        
        // מאזין לבחירת מקום
        autocomplete.addListener('place_changed', async () => {
            const place = autocomplete.getPlace();
            await this.handlePlaceSelection(place, input);
        });
        
        // מאזינים נוספים
        input.addEventListener('keydown', (e) => this.handleKeydown(e));
        input.addEventListener('focus', (e) => this.handleFocus(e));
    }
    
    /**
     * עטיפת שדה קלט ב-container
     */
    wrapInputWithContainer(input) {
        // בדיקה אם כבר עטוף
        if (input.parentElement.classList.contains('address-input-container')) {
            return;
        }
        
        const container = document.createElement('div');
        container.className = 'address-input-container';
        
        // העברת הקלט לcontainer
        input.parentNode.insertBefore(container, input);
        container.appendChild(input);
        
        // יצירת div להצעות (לצרכים עתידיים)
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'address-suggestions';
        container.appendChild(suggestionsDiv);
    }
    
    /**
     * טיפול בהקלדה
     */
    handleInput(e) {
        this.activeInput = e.target;
        
        // Google Autocomplete מטפל באוטוקומפליט אוטומטית
        // אין צורך בלוגיקה נוספת כאן
    }
    
    /**
     * טיפול במקלדת
     */
    handleKeydown(e) {
        // Google Autocomplete מטפל במקלדת אוטומטית
        // ניתן להוסיף לוגיקה מותאמת אישית כאן
        
        if (e.key === 'Escape') {
            this.hideAllSuggestions();
        }
    }
    
    /**
     * טיפול בפוקוס
     */
    handleFocus(e) {
        this.activeInput = e.target;
    }
    
    /**
     * ✨ טיפול בבחירת מקום - עם שמירת טקסט מקורי
     */

    async handlePlaceSelection(place, input) {
    if (!place.place_id && !place.formatted_address && !place.name) {
        console.warn('מקום לא מלא נבחר');
        return;
    }

    // קבלת הטקסט המקורי שהמשתמש הקליד
    const originalText = this.originalTexts.get(input.id) || '';
    let selectedAddress = '';

    try {
        let details = place;

        // אם יש place_id – נבקש פרטים מלאים
        if (place.place_id) {
            details = await this.getPlaceDetails(place.place_id);
        }

        // בחירת הערך הנכון לתצוגה
        if (details.formatted_address && details.formatted_address !== 'ישראל') {
            // כתובת אמיתית
            selectedAddress = details.formatted_address;
        } else if (details.name) {
            // אם הכתובת היא רק "ישראל" – נשתמש בשם
            selectedAddress = details.name;
        } else {
            selectedAddress = originalText; // fallback
        }

        // ✨ בדיקה אם הטקסט המקורי שונה מהכתובת החדשה
        const hasChanged = originalText && originalText.trim() !== selectedAddress.trim();

        if (hasChanged) {
            input.dataset.originalText = originalText;
            input.dataset.physicalAddress = selectedAddress;
            input.dataset.hasChanged = 'true';
        } else {
            input.dataset.hasChanged = 'false';
            delete input.dataset.originalText;
            delete input.dataset.physicalAddress;
        }

        // מילוי השדה
        input.value = selectedAddress;
        input.dataset.isGoogleAddress = 'true';

        // שמירת מידע נוסף
        input.dataset.placeId = details.place_id || '';
        if (details.geometry && details.geometry.location) {
            input.dataset.lat = details.geometry.location.lat();
            input.dataset.lng = details.geometry.location.lng();
        }

        // אירוע שינוי לטופס
        input.dispatchEvent(new Event('change', { bubbles: true }));

    } catch (err) {
        console.error('שגיאה בקבלת פרטי מקום:', err);
    }

    // מעבר לשדה הבא
    this.focusNextField(input);

    // הסתרת הצעות
    this.hideAllSuggestions();
}

    // async handlePlaceSelection(place, input) {
    //     if (!place.place_id) {
    //         console.warn('לא נמצא Place ID, שימוש בנתונים חלקיים');
    //     }

    //     // קבלת הטקסט המקורי שהמשתמש הקליד
    //     const originalText = this.originalTexts.get(input.id) || '';
    //     let selectedAddress = '';

    //     try {
    //         let details = place;

    //         // אם יש place_id – נבקש פרטים מלאים
    //         if (place.place_id) {
    //             details = await this.getPlaceDetails(place.place_id);
    //         }

    //         if (details.name && details.formatted_address) {
    //             if (this.isBusinessQuery(originalText)) {
    //                 selectedAddress = `${details.name}, ${details.formatted_address}`;
    //             } else {
    //                 selectedAddress = details.formatted_address;
    //             }
    //         } else if (details.name) {
    //             selectedAddress = details.name;
    //         } else {
    //             selectedAddress = details.formatted_address || '';
    //         }

    //         // ✨ בדיקה אם הטקסט המקורי שונה מהכתובת החדשה
    //         const hasChanged = originalText && originalText.trim() !== selectedAddress.trim();

    //         if (hasChanged) {
    //             input.dataset.originalText = originalText;
    //             input.dataset.physicalAddress = selectedAddress;
    //             input.dataset.hasChanged = 'true';
    //         } else {
    //             input.dataset.hasChanged = 'false';
    //             delete input.dataset.originalText;
    //             delete input.dataset.physicalAddress;
    //         }

    //         // מילוי השדה
    //         input.value = selectedAddress;
    //         input.dataset.isGoogleAddress = 'true';

    //         // שמירת מידע נוסף
    //         input.dataset.placeId = details.place_id || '';
    //         if (details.geometry && details.geometry.location) {
    //             input.dataset.lat = details.geometry.location.lat();
    //             input.dataset.lng = details.geometry.location.lng();
    //         }

    //         // אירוע שינוי לטופס
    //         input.dispatchEvent(new Event('change', { bubbles: true }));

    //     } catch (err) {
    //         console.error('שגיאה בקבלת פרטי מקום:', err);
    //     }

    //     // מעבר לשדה הבא
    //     this.focusNextField(input);

    //     // הסתרת הצעות
    //     this.hideAllSuggestions();
    // }


    // handlePlaceSelection(place, input) {
    //     if (!place.formatted_address && !place.name) {
    //         console.warn('מקום לא מלא נבחר');
    //         return;
    //     }
        
    //     // קבלת הטקסט המקורי שהמשתמש הקליד
    //     const originalText = this.originalTexts.get(input.id) || '';
        
    //     // בחירת הכתובת הטובה ביותר
    //     let selectedAddress = '';
        
    //     if (place.name && place.formatted_address) {
    //         // אם יש שם עסק וכתובת - בדוק איזה יותר מתאים
    //         if (this.isBusinessQuery(originalText)) {
    //             selectedAddress = `${place.name}, ${place.formatted_address}`;
    //         } else {
    //             selectedAddress = place.formatted_address;
    //         }
    //     } else if (place.name) {
    //         selectedAddress = place.name;
    //     } else {
    //         selectedAddress = place.formatted_address;
    //     }
        
    //     // ✨ בדיקה אם הטקסט המקורי שונה מהכתובת החדשה
    //     const hasChanged = originalText && originalText.trim() !== selectedAddress.trim();
        
    //     if (hasChanged) {
    //         // שמירת הטקסט המקורי והכתובת הפיזית
    //         input.dataset.originalText = originalText;
    //         input.dataset.physicalAddress = selectedAddress;
    //         input.dataset.hasChanged = 'true';
    //     } else {
    //         // אם אין שינוי, נקה את הנתונים הנוספים
    //         input.dataset.hasChanged = 'false';
    //         delete input.dataset.originalText;
    //         delete input.dataset.physicalAddress;
    //     }
        
    //     // מילוי השדה
    //     input.value = selectedAddress;
    //     input.dataset.isGoogleAddress = 'true';
        
    //     // אירוע שינוי לטופס
    //     input.dispatchEvent(new Event('change', { bubbles: true }));
        
    //     // שמירת מידע נוסף על המקום (אופציונלי)
    //     input.dataset.placeId = place.place_id;
    //     if (place.geometry && place.geometry.location) {
    //         input.dataset.lat = place.geometry.location.lat();
    //         input.dataset.lng = place.geometry.location.lng();
    //     }
        
    //     // מעבר לשדה הבא
    //     this.focusNextField(input);
        
    //     // הסתרת הצעות
    //     this.hideAllSuggestions();
    // }
    
    /**
     * בדיקה אם השאילתה מחפשת עסק
     */
    isBusinessQuery(query) {
        const businessKeywords = [
            'מוסך', 'garage', 'שירות', 'service',
            'חנות', 'shop', 'store', 'מרכז', 'center',
            'בית עסק', 'עסק', 'business', 'חברה', 'company',
            'חניון', 'parking', 'גרר', 'towing'
        ];
        
        const lowerQuery = query.toLowerCase();
        return businessKeywords.some(keyword => lowerQuery.includes(keyword));
    }
    
    /**
     * מעבר לשדה הבא
     */
    focusNextField(currentInput) {
        const form = currentInput.closest('form');
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        const currentIndex = Array.from(inputs).indexOf(currentInput);
        
        if (currentIndex > -1 && currentIndex < inputs.length - 1) {
            const nextInput = inputs[currentIndex + 1];
            if (nextInput && !nextInput.disabled && !nextInput.readOnly) {
                setTimeout(() => nextInput.focus(), 100);
            }
        }
    }
    
    /**
     * הסתרת כל רשימות ההצעות
     */
    hideAllSuggestions() {
        // Google Autocomplete מנהל את ההצעות אוטומטית
        // אין צורך בלוגיקה נוספת
        this.activeInput = null;
    }
    
    /**
     * חיפוש נוסף לכתובת (אם צריך)
     */
    async searchAddress(query) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                reject(new Error('Geocoder לא זמין'));
                return;
            }
            
            this.geocoder.geocode({
                address: query,
                componentRestrictions: { country: 'IL' },
                language: 'he'
            }, (results, status) => {
                if (status === 'OK' && results.length > 0) {
                    resolve(results);
                } else {
                    reject(new Error('לא נמצאו תוצאות'));
                }
            });
        });
    }
    
    /**
     * קבלת מידע מפורט על מקום לפי Place ID
     */
    async getPlaceDetails(placeId) {
        return new Promise((resolve, reject) => {
            const service = new google.maps.places.PlacesService(document.createElement('div'));
            
            service.getDetails({
                placeId: placeId,
                fields: ['name', 'formatted_address', 'geometry', 'types', 'opening_hours']
            }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    resolve(place);
                } else {
                    reject(new Error('שגיאה בקבלת פרטי מקום'));
                }
            });
        });
    }
}

// אתחול המערכת כשהדף נטען
// Google Maps API צריך להיטען לפני יצירת המחלקה
if (window.google && window.google.maps) {
    new AddressAutocomplete();
} else {
    window.addEventListener('load', () => {
        new AddressAutocomplete();
    });
}