/**
 * API Manager - Handles all external API calls including vehicle lookup
 * Updated: Now correctly searches private_extra by model name, not license number
 */

class ApiManager {
    constructor() {
        // Government API resource IDs
        this.resources = {
            // Active vehicles
            private: '053cea08-09bc-40ec-8f7a-156f0677aff3',
            private_extra: '142afde2-6228-49f9-8a29-9b6c3a0cbe40', // Extra info - searched by model name!
            motorcycle: 'bf9df4e2-d90d-4c0a-a400-19e15af8e95f',
            heavy: 'cd3acc5c-03c3-4c89-9c54-d40f93c0d790',
            machinery: '58dc4654-16b1-42ed-8170-98fadec153ea',
            
            // Canceled vehicles
            canceled_private: '851ecab1-0622-4dbe-a6c7-f950cf82abf9',
            canceled_heavy: '4e6b9724-4c1e-43f0-909a-154d4cc4e046',
            canceled_motorcycle: 'ec8cbc34-72e1-4b69-9c48-22821ba0bd6c',
            
            // Inactive vehicles
            inactive: 'f6efe89a-fb3d-43a4-bb61-9bf12a9b9099'
        };

        this.baseUrl = 'https://data.gov.il/api/3/action/datastore_search';
    }

    /**
     * Search for vehicle in a specific resource by license number
     * @param {string} resourceId - Resource ID
     * @param {string} licenseNumber - Vehicle license number
     * @param {string} resourceName - Resource name for logging
     * @returns {Promise<object|null>} - Vehicle record or null
     */
    async searchInResource(resourceId, licenseNumber, resourceName) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        
        // Use q parameter for general search (more reliable)
        const url = `${this.baseUrl}?resource_id=${resourceId}&q=${cleanLicense}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success && data.result?.records?.length > 0) {
                // Find exact match by license number
                const matchField = resourceName === 'machinery' ? 'mispar_tzama' : 'mispar_rechev';
                const record = data.result.records.find(row => 
                    String(row[matchField] || '').replace(/[^0-9]/g, '') === cleanLicense
                );
                
                if (record) {
                    console.log(`✅ Found in ${resourceName}:`, record);
                    return record;
                }
            }
            return null;
        } catch (error) {
            console.error(`Error searching in ${resourceName}:`, error);
            return null;
        }
    }

    /**
     * Fetch extra info for private vehicle by model name
     * This is the correct way - private_extra doesn't have license numbers!
     * @param {object} vehicle - Vehicle data from primary search
     * @returns {Promise<object|null>} - Extra info or null
     */
    async fetchExtraPrivateInfo(vehicle) {
        try {
            // Build search query from manufacturer + model name
            const model = ((vehicle.tozeret_nm || '') + ' ' + (vehicle.kinuy_mishari || '')).trim();
            
            if (!model) {
                console.log('No model info for extra search');
                return null;
            }

            const query = encodeURIComponent(model);
            const url = `${this.baseUrl}?resource_id=${this.resources.private_extra}&q=${query}`;
            
            console.log(`🔍 Searching private_extra for model: ${model}`);
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.success && data.result?.records?.length > 0) {
                // Find exact match by year, model code, and engine volume
                const match = data.result.records.find(record =>
                    record.shnat_yitzur == vehicle.shnat_yitzur &&
                    record.degem_cd == vehicle.degem_cd &&
                    record.nefach_manoa == vehicle.nefach_manoa
                );
                
                if (match) {
                    console.log('✅ Found extra info:', match);
                    
                    // Convert automatic_ind to readable format
                    if ('automatic_ind' in match) {
                        match.automatic_ind = (match.automatic_ind === '1' || match.automatic_ind === 1)
                            ? 'אוטומטי'
                            : 'ידני';
                    }
                    
                    return match;
                } else {
                    console.log('No exact match in private_extra - trying partial match');
                    
                    // Try partial match by year only
                    const partialMatch = data.result.records.find(record =>
                        record.shnat_yitzur == vehicle.shnat_yitzur
                    );
                    
                    if (partialMatch) {
                        console.log('✅ Found partial match:', partialMatch);
                        if ('automatic_ind' in partialMatch) {
                            partialMatch.automatic_ind = (partialMatch.automatic_ind === '1' || partialMatch.automatic_ind === 1)
                                ? 'אוטומטי'
                                : 'ידני';
                        }
                        return partialMatch;
                    }
                }
            }
            
            console.log('No extra info found in private_extra');
            return null;
        } catch (error) {
            console.error('Error fetching extra private info:', error);
            return null;
        }
    }

    /**
     * Check if vehicle is in canceled databases
     * @param {string} licenseNumber - Vehicle license number
     * @returns {Promise<object|null>} - Canceled vehicle data or null
     */
    async checkCanceledVehicle(licenseNumber) {
        const canceledResources = [
            { id: this.resources.canceled_private, name: 'canceled_private' },
            { id: this.resources.canceled_heavy, name: 'canceled_heavy' },
            { id: this.resources.canceled_motorcycle, name: 'canceled_motorcycle' }
        ];

        for (const resource of canceledResources) {
            const record = await this.searchInResource(resource.id, licenseNumber, resource.name);
            if (record) {
                return {
                    ...this.mapVehicleFields(record, 'private'),
                    isCanceled: true
                };
            }
        }
        return null;
    }

    /**
     * Check if vehicle is in inactive database
     * @param {string} licenseNumber - Vehicle license number
     * @returns {Promise<object|null>} - Inactive vehicle data or null
     */
    async checkInactiveVehicle(licenseNumber) {
        const record = await this.searchInResource(
            this.resources.inactive, 
            licenseNumber, 
            'inactive'
        );
        
        if (record) {
            return {
                ...this.mapVehicleFields(record, 'private'),
                isInactive: true
            };
        }
        return null;
    }

    /**
     * Map raw API fields to standardized vehicle object
     * @param {object} record - Raw API record
     * @param {string} vehicleType - Type of vehicle
     * @param {object} extraInfo - Extra info from private_extra (optional)
     * @returns {object} - Standardized vehicle object
     */
    mapVehicleFields(record, vehicleType, extraInfo = null) {
        const mapped = {
            plateNumber: record.mispar_rechev || record.mispar_tzama || '',
            manufacturer: record.tozeret_nm || record.shilda_totzar_en_nm || '',
            model: record.kinuy_mishari || record.degem_nm || '',
            year: record.shnat_yitzur || '',
            color: record.tzeva_rechev || '',
            fuelType: record.sug_delek_nm || '',
            vehicleType: record.sug_rechev_nm || '',
            
            // Fields that may come from primary or extra search
            totalWeight: record.mishkal_kolel || '',
            selfWeight: record.mishkal_azmi || '',
            driveType: record.hanaa_nm || '',
            driveTechnology: record.technologiat_hanaa_nm || '',
            gear: record.automatic_ind || '',
            
            // Additional fields for identification
            engineVolume: record.nefach_manoa || '',
            engineModel: record.degem_manoa || '',
            trimLevel: record.ramat_gimur || '',
            modelCode: record.degem_cd || '',
            
            // Machinery specific (צמ"ה)
            machineryType: record.sug_tzama_nm || '',
            selfWeightTon: record.mishkal_ton || '',
            totalWeightTon: record.mishkal_kolel_ton || '',
            
            // Source info
            source: {
                type: vehicleType,
                label: this.getVehicleTypeLabel(vehicleType)
            }
        };

        // Merge extra info if available
        if (extraInfo) {
            if (extraInfo.mishkal_kolel) mapped.totalWeight = extraInfo.mishkal_kolel;
            if (extraInfo.hanaa_nm) mapped.driveType = extraInfo.hanaa_nm;
            if (extraInfo.technologiat_hanaa_nm) mapped.driveTechnology = extraInfo.technologiat_hanaa_nm;
            if (extraInfo.automatic_ind) mapped.gear = extraInfo.automatic_ind;
        }

        return mapped;
    }

    /**
     * Get Hebrew label for vehicle type
     * @param {string} type - Vehicle type
     * @returns {string} - Hebrew label
     */
    getVehicleTypeLabel(type) {
        const labels = {
            private: 'רכב פרטי',
            motorcycle: 'דו-גלגלי',
            heavy: 'מעל 3.5 טון',
            machinery: 'צמ"ה'
        };
        return labels[type] || type;
    }

    /**
     * Determine available tow types based on vehicle data
     * @param {object} vehicle - Vehicle data
     * @param {string} vehicleType - Type of vehicle
     * @returns {array} - Available tow types
     */
    determineTowTypes(vehicle, vehicleType) {
        const towTypes = [];
        
        // Default: all private vehicles can use flatbed
        if (vehicleType === 'private' || vehicleType === 'motorcycle') {
            towTypes.push('רמ-סע');
        }
        
        // Check drive type for additional options
        const driveType = (vehicle.driveType || vehicle.hanaa_nm || '').toLowerCase();
        const driveTech = (vehicle.driveTechnology || vehicle.technologiat_hanaa_nm || '').toLowerCase();
        
        // 4x4 or AWD vehicles
        if (driveType.includes('4') || driveType.includes('כפול') || 
            driveTech.includes('4') || driveTech.includes('כפול')) {
            towTypes.push('משקפיים', 'דולי');
        }
        
        // Front wheel drive
        if (driveType.includes('קדמ') || driveTech.includes('קדמ')) {
            towTypes.push('משקפיים');
        }
        
        // Heavy vehicles
        if (vehicleType === 'heavy') {
            towTypes.push('מובילית', 'גרר כבד');
        }
        
        // Machinery
        if (vehicleType === 'machinery') {
            towTypes.push('מובילית');
        }
        
        return [...new Set(towTypes)]; // Remove duplicates
    }

    /**
     * Main vehicle lookup function
     * @param {string} licenseNumber - Vehicle license number
     * @returns {Promise<object>} - Vehicle lookup result
     */
    async lookupVehicle(licenseNumber) {
        const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
        
        if (cleanLicense.length < 5) {
            return { success: false, error: 'מספר רישוי קצר מדי' };
        }

        console.log(`🔍 Looking up vehicle: ${cleanLicense}`);

        // Search order: private → motorcycle → heavy → machinery
        const searchOrder = [
            { type: 'private', resourceId: this.resources.private },
            { type: 'motorcycle', resourceId: this.resources.motorcycle },
            { type: 'heavy', resourceId: this.resources.heavy },
            { type: 'machinery', resourceId: this.resources.machinery }
        ];

        // Try each active resource
        for (const { type, resourceId } of searchOrder) {
            const record = await this.searchInResource(resourceId, cleanLicense, type);
            
            if (record) {
                let extraInfo = null;
                
                // For private vehicles, fetch extra info by model name
                if (type === 'private') {
                    extraInfo = await this.fetchExtraPrivateInfo(record);
                }
                
                const vehicle = this.mapVehicleFields(record, type, extraInfo);
                const towTypes = this.determineTowTypes(vehicle, type);
                
                console.log('✅ Final vehicle data:', vehicle);
                
                return {
                    success: true,
                    vehicle: vehicle,
                    status: {
                        isActive: true,
                        isCanceled: false,
                        isInactive: false
                    },
                    towTypes: towTypes,
                    source: vehicle.source
                };
            }
        }

        // Not found in active databases, check canceled
        console.log('🔍 Checking canceled vehicles...');
        const canceledVehicle = await this.checkCanceledVehicle(cleanLicense);
        if (canceledVehicle) {
            return {
                success: true,
                vehicle: canceledVehicle,
                status: {
                    isActive: false,
                    isCanceled: true,
                    isInactive: false
                },
                towTypes: [],
                source: { type: 'canceled', category: 'canceled' }
            };
        }

        // Check inactive
        console.log('🔍 Checking inactive vehicles...');
        const inactiveVehicle = await this.checkInactiveVehicle(cleanLicense);
        if (inactiveVehicle) {
            return {
                success: true,
                vehicle: inactiveVehicle,
                status: {
                    isActive: false,
                    isCanceled: false,
                    isInactive: true
                },
                towTypes: [],
                source: { type: 'inactive', category: 'inactive' }
            };
        }

        // Not found anywhere
        console.log('❌ Vehicle not found in any database');
        return {
            success: false,
            error: 'הרכב לא נמצא במאגרי משרד התחבורה'
        };
    }

    /**
     * Get pricing data for a route (placeholder for future implementation)
     */
    async getRoutePricing(origin, destination) {
        // This would integrate with Google Maps API or similar
        return {
            distance: 0,
            duration: 0,
            price: 0
        };
    }

    /**
     * Check if user is admin
     * @param {string} email - User email to check
     * @returns {Promise<object>} - Admin status
     */
    async checkAdminStatus(email) {
        try {
            const response = await fetch('/api/admin/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });
            
            if (!response.ok) {
                return { success: false, isAdmin: false };
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error checking admin status:', error);
            return { success: false, isAdmin: false };
        }
    }

    /**
     * Submit form data to calendar/server
     * @param {object} formData - Form data to submit
     * @returns {Promise<object>} - Submit result
     */
    async submitTowingOrder(formData) {
        try {
            const response = await fetch('/api/submit-towing', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error submitting form:', error);
            throw error;
        }
    }
}

// Create singleton instance
const apiManager = new ApiManager();
window.apiManager = apiManager;