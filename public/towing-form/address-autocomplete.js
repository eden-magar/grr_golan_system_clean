/**
 * השלמה אוטומטית לכתובות - Google Places API
 * תומך בעברית ובישראל עם דיוק מושלם
 */

class AddressAutocomplete {
    constructor() {
        this.activeInput = null;
        this.autocompleteServices = new Map();
        this.geocoder = null;
        
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
        
        // מאזין לבחירת מקום
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            this.handlePlaceSelection(place, input);
        });
        
        // מאזינים נוספים
        input.addEventListener('input', (e) => this.handleInput(e));
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
     * טיפול בבחירת מקום
     */
    handlePlaceSelection(place, input) {
        if (!place.formatted_address && !place.name) {
            console.warn('מקום לא מלא נבחר');
            return;
        }
        
        // בחירת הכתובת הטובה ביותר
        let selectedAddress = '';
        
        if (place.name && place.formatted_address) {
            // אם יש שם עסק וכתובת - בדוק איזה יותר מתאים
            if (this.isBusinessQuery(input.value)) {
                selectedAddress = `${place.name}, ${place.formatted_address}`;
            } else {
                selectedAddress = place.formatted_address;
            }
        } else if (place.name) {
            selectedAddress = place.name;
        } else {
            selectedAddress = place.formatted_address;
        }
        
        // מילוי השדה
        input.value = selectedAddress;
        
        // אירוע שינוי לטופס
        input.dispatchEvent(new Event('change', { bubbles: true }));
        
        // שמירת מידע נוסף על המקום (אופציונלי)
        input.dataset.placeId = place.place_id;
        if (place.geometry && place.geometry.location) {
            input.dataset.lat = place.geometry.location.lat();
            input.dataset.lng = place.geometry.location.lng();
        }
        
        // מעבר לשדה הבא
        this.focusNextField(input);
        
        // הסתרת הצעות
        this.hideAllSuggestions();
    }
    
    /**
     * בדיקה אם השאילתה מחפשת עסק
     */
    isBusinessQuery(query) {
        const businessKeywords = [
            'מוסך', 'garage', 'שירות', 'service',
            'חנות', 'shop', 'store', 'מרכז', 'center',
            'בית עסק', 'עסק', 'business', 'חברה', 'company'
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