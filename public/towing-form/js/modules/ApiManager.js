/**
 * API Manager - Handles all server communications
 * Updated to fetch vehicle data directly from data.gov.il
 */

class ApiManager {
    constructor() {
        this.baseUrl = '';
        this.defaultHeaders = {
            'Content-Type': 'application/json'
        };
        
        // מזהי המאגרים ב-data.gov.il - כל המאגרים
        this.vehicleResources = {
            // מאגרים ראשיים
            private: '053cea08-09bc-40ec-8f7a-156f0677aff3',
            private_extra: '142afde2-6228-49f9-8a29-9b6c3a0cbe40',
            motorcycle: 'bf9df4e2-d90d-4c0a-a400-19e15af8e95f',
            heavy: 'cd3acc5c-03c3-4c89-9c54-d40f93c0d790',
            machinery: '58dc4654-16b1-42ed-8170-98fadec153ea',
            
            // מאגרי רכבים מבוטלים
            canceled_private: '851ecab1-0622-4dbe-a6c7-f950cf82abf9',
            canceled_heavy: '4e6b9724-4c1e-43f0-909a-154d4cc4e046',
            canceled_motorcycle: 'ec8cbc34-72e1-4b69-9c48-22821ba0bd6c',
            
            // מאגר רכבים לא פעילים
            inactive: 'f6efe89a-fb3d-43a4-bb61-9bf12a9b9099'
        };
        
        // תוויות לסוגי רכב
        this.sourceLabels = {
            private: 'רכב פרטי',
            motorcycle: 'דו גלגלי',
            heavy: 'רכב כבד',
            machinery: 'צמ"ה',
        };
    }

    /**
     * Make HTTP request with error handling
     */
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...this.defaultHeaders,
                    ...options.headers
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }

            return result;
        } catch (error) {
            console.error(`API Error for ${url}:`, error);
            throw error;
        }
    }

    /**
     * חיפוש רכב במאגר ספציפי של data.gov.il
     */
    async searchInResource(licenseNumber, resourceId, source) {
        try {
            const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
            
            // ניסיון ראשון - חיפוש עם filter
            const url1 = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&filters={"mispar_rechev":"${parseInt(cleanLicense, 10).toString()}"}`;
            
            const response1 = await fetch(url1);
            const data1 = await response1.json();
            
            if (data1.success && data1.result?.records?.length > 0) {
                return { found: true, data: data1.result.records[0] };
            }
            
            // ניסיון שני - חיפוש כללי
            const url2 = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&q=${cleanLicense}`;
            
            const response2 = await fetch(url2);
            const data2 = await response2.json();
            
            if (data2.success && data2.result?.records?.length > 0) {
                // בדיקה שהרשומה מכילה את מספר הרישוי
                const record = data2.result.records.find(rec => {
                    const recLicense = String(rec.mispar_rechev || rec.mispar_tzama || '').replace(/[^0-9]/g, '');
                    return recLicense === cleanLicense || recLicense === parseInt(cleanLicense, 10).toString();
                });
                
                if (record) {
                    return { found: true, data: record };
                }
            }
            
            return { found: false, data: null };
        } catch (error) {
            console.error(`Error searching in ${source}:`, error);
            return { found: false, data: null };
        }
    }

    /**
     * בדיקה אם רכב מבוטל
     */
    async checkCanceledVehicle(licenseNumber) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        
        const canceledResources = [
            { id: this.vehicleResources.canceled_private, type: 'private' },
            { id: this.vehicleResources.canceled_heavy, type: 'heavy' },
            { id: this.vehicleResources.canceled_motorcycle, type: 'motorcycle' }
        ];
        
        for (const resource of canceledResources) {
            const result = await this.searchInResource(cleanLicense, resource.id, 'canceled');
            if (result.found) {
                return { isCanceled: true, data: result.data, type: resource.type };
            }
        }
        
        return { isCanceled: false, data: null };
    }

    /**
     * בדיקה אם רכב לא פעיל
     */
    async checkInactiveVehicle(licenseNumber) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        const result = await this.searchInResource(cleanLicense, this.vehicleResources.inactive, 'inactive');
        
        if (result.found) {
            return { isInactive: true, data: result.data };
        }
        
        return { isInactive: false, data: null };
    }

    /**
     * מיפוי נתונים גולמיים לפורמט אחיד
     */
    mapVehicleData(rawData, source, licenseNumber) {
        // חישוב סוג גיר
        let gearType = null;
        if (rawData['automatic_ind'] === 1 || rawData['automatic_ind'] === '1' || rawData['automatic_ind'] === true) {
            gearType = 'אוטומטי';
        } else if (rawData['automatic_ind'] === 0 || rawData['automatic_ind'] === '0' || rawData['automatic_ind'] === false) {
            gearType = 'ידני';
        }
        
        // חישוב משקל
        let totalWeight = null;
        let totalWeightTon = null;
        let selfWeight = null;
        
        if (source === 'machinery') {
            if (rawData['mishkal_kolel_ton']) {
                totalWeightTon = parseFloat(rawData['mishkal_kolel_ton']);
                totalWeight = totalWeightTon * 1000;
            }
            if (rawData['mishkal_ton']) {
                selfWeight = parseFloat(rawData['mishkal_ton']) * 1000;
            }
        } else {
            if (rawData['mishkal_kolel']) {
                totalWeight = parseFloat(rawData['mishkal_kolel']);
                totalWeightTon = totalWeight / 1000;
            }
            if (rawData['mishkal_azmi']) {
                selfWeight = parseFloat(rawData['mishkal_azmi']);
            }
        }
        
        // יצרן
        let manufacturer = rawData['tozeret_nm'] || rawData['shilda_totzar_en_nm'] || null;
        
        // דגם
        let model = rawData['kinuy_mishari'] || rawData['degem_nm'] || null;
        
        // צבע
        let color = rawData['tzeva_rechev'] || rawData['tzeva_cd'] || null;
        
        // סוג דלק
        let fuelType = rawData['sug_delek_nm'] || null;
        
        // הנעה
        let driveType = rawData['hanaa_nm'] || null;
        
        // טכנולוגיית הנעה
        let driveTechnology = rawData['technologiat_hanaa_nm'] || null;
        
        return {
            // פרטים בסיסיים
            plateNumber: licenseNumber,
            manufacturer: manufacturer,
            model: model,
            year: rawData['shnat_yitzur'] || null,
            
            // צבע
            color: color,
            
            // דלק והנעה
            fuelType: fuelType,
            driveType: driveType,
            driveTechnology: driveTechnology,
            
            // משקל
            totalWeight: totalWeight,
            totalWeightTon: totalWeightTon,
            selfWeight: selfWeight,
            
            // גיר - שלושה שמות לתאימות
            gear: gearType,
            gearType: gearType,
            transmission: gearType,
            
            // סוג רכב
            vehicleType: rawData['sug_rechev_nm'] || rawData['sug_tzama_nm'] || null,
            
            // שדות נוספים
            modelCode: rawData['degem_cd'] || null,
            engineVolume: rawData['nefach_manoa'] || null,
            engineModel: rawData['degem_manoa'] || null,
            trimLevel: rawData['ramat_gimur'] || null,
            
            // לצמ"ה
            machineryType: source === 'machinery' ? (rawData['sug_tzama_nm'] || null) : null,
            
            // מקור - לתצוגה
            source: {
                type: source,
                label: this.sourceLabels[source] || source
            }
        };
    }

    /**
     * Look up vehicle data by license number - directly from data.gov.il
     * @param {string} licenseNumber - Vehicle license number
     * @returns {Promise<object>} - Vehicle data response
     */
    async lookupVehicle(licenseNumber) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        
        if (cleanLicense.length < 5) {
            return {
                success: false,
                error: 'מספר רישוי קצר מדי'
            };
        }
        
        // סדר החיפוש: פרטי, דו גלגלי, כבד, צמ"ה
        const searchOrder = ['private', 'motorcycle', 'heavy', 'machinery'];
        
        for (const source of searchOrder) {
            const result = await this.searchInResource(cleanLicense, this.vehicleResources[source], source);
            
            if (result.found) {
                let rawData = result.data;
                
                // אם זה רכב פרטי - נחפש פרטים נוספים
                if (source === 'private') {
                    const extraResult = await this.searchInResource(cleanLicense, this.vehicleResources.private_extra, 'private_extra');
                    if (extraResult.found) {
                        // מיזוג הנתונים
                        rawData = { ...rawData, ...extraResult.data };
                    }
                }
                
                const mappedData = this.mapVehicleData(rawData, source, cleanLicense);
                
                return {
                    success: true,
                    vehicle: mappedData,
                    source: {
                        type: source,
                        category: 'regular',
                        label: this.sourceLabels[source]
                    },
                    status: {
                        isCanceled: false,
                        isInactive: false
                    },
                    towTypes: this.getSuggestedTowTypes(source)
                };
            }
        }
        
        // לא נמצא במאגרים הפעילים - נבדוק אם מבוטל
        const canceledCheck = await this.checkCanceledVehicle(cleanLicense);
        if (canceledCheck.isCanceled) {
            const mappedData = this.mapVehicleData(canceledCheck.data, canceledCheck.type, cleanLicense);
            
            return {
                success: true,
                vehicle: mappedData,
                source: {
                    type: canceledCheck.type,
                    category: 'canceled',
                    label: this.sourceLabels[canceledCheck.type] + ' (מבוטל)'
                },
                status: {
                    isCanceled: true,
                    isInactive: false
                },
                towTypes: this.getSuggestedTowTypes(canceledCheck.type)
            };
        }
        
        // נבדוק אם לא פעיל
        const inactiveCheck = await this.checkInactiveVehicle(cleanLicense);
        if (inactiveCheck.isInactive) {
            const mappedData = this.mapVehicleData(inactiveCheck.data, 'private', cleanLicense);
            
            return {
                success: true,
                vehicle: mappedData,
                source: {
                    type: 'private',
                    category: 'inactive',
                    label: 'רכב לא פעיל'
                },
                status: {
                    isCanceled: false,
                    isInactive: true
                },
                towTypes: this.getSuggestedTowTypes('private')
            };
        }
        
        // לא נמצא באף מאגר
        return {
            success: false,
            error: 'הרכב לא נמצא במאגרי משרד התחבורה'
        };
    }

    /**
     * המלצה לסוגי גרר לפי סוג רכב
     */
    getSuggestedTowTypes(vehicleType) {
        const suggestions = {
            private: ['רמ-סע', 'דולי', 'מובילית'],
            motorcycle: ['רמ-סע', 'מובילית'],
            heavy: ['גרר כבד', 'מובילית גדולה'],
            machinery: ['לואו-בד', 'גרר כבד'],
        };
        return suggestions[vehicleType] || ['רמ-סע'];
    }

    /**
     * Check user authentication status
     */
    async checkAuth(email) {
        return this.makeRequest(API_ENDPOINTS.CHECK_AUTH, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    /**
     * Check if user has admin privileges
     */
    async checkAdminStatus(email) {
        return this.makeRequest(API_ENDPOINTS.CHECK_ADMIN, {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    /**
     * Submit user registration request
     */
    async registerUser(userData) {
        const formData = new FormData();
        formData.append('action', 'register');
        formData.append('data', JSON.stringify(userData));

        return this.makeRequest(API_ENDPOINTS.REGISTER, {
            method: 'POST',
            body: formData,
            headers: {}
        });
    }

    /**
     * Submit user login request
     */
    async loginUser(email) {
        const formData = new FormData();
        formData.append('action', 'login');
        formData.append('data', JSON.stringify({ email }));

        return this.makeRequest(API_ENDPOINTS.LOGIN_USER, {
            method: 'POST',
            body: formData,
            headers: {}
        });
    }

    /**
     * Submit towing form data
     */
    async submitTowingForm(formData) {
        try {
            const response = await fetch(window.TOWING_SUBMIT_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            console.log('🔍 תגובת השרת:', response);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('🔍 תוצאה סופית:', result);
            return result;

        } catch (error) {
            console.error('Error submitting form:', error);
            throw new Error('Failed to submit form');
        }
    }

    /**
     * Generic GET request
     */
    async get(endpoint, params = {}) {
        const url = new URL(endpoint, window.location.origin);
        Object.keys(params).forEach(key => {
            url.searchParams.append(key, params[key]);
        });

        return this.makeRequest(url.toString(), {
            method: 'GET'
        });
    }

    /**
     * Generic POST request
     */
    async post(endpoint, data = {}) {
        return this.makeRequest(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    /**
     * Upload file to server
     */
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.makeRequest(endpoint, {
            method: 'POST',
            body: formData,
            headers: {}
        });
    }

    /**
     * Handle API errors with user-friendly messages
     */
    handleError(error, context = 'API request') {
        console.error(`${context} failed:`, error);
        
        let userMessage;
        if (error.message.includes('network') || error.message.includes('fetch')) {
            userMessage = ERROR_MESSAGES.NETWORK_ERROR;
        } else if (error.message.includes('unauthorized') || error.message.includes('403')) {
            userMessage = ERROR_MESSAGES.UNAUTHORIZED;
        } else if (error.message.includes('not found') || error.message.includes('404')) {
            userMessage = ERROR_MESSAGES.VEHICLE_NOT_FOUND;
        } else {
            userMessage = error.message || ERROR_MESSAGES.NETWORK_ERROR;
        }
        
        showNotification(userMessage, 'error');
        return { success: false, error: userMessage };
    }

    /**
     * Set custom headers for all requests
     */
    setHeaders(headers) {
        this.defaultHeaders = {
            ...this.defaultHeaders,
            ...headers
        };
    }

    /**
     * Set base URL for relative requests
     */
    setBaseUrl(url) {
        this.baseUrl = url;
    }
}

// Create singleton instance
const apiManager = new ApiManager();
window.apiManager = apiManager;