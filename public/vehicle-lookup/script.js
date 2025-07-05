let isAdmin = localStorage.getItem('isAdmin') === 'true';
let adminEmail = localStorage.getItem('adminEmail') || '';

// פונקציה להתחברות מנהל
function setupAdminLogin() {
  const adminBtn = document.getElementById('admin-login-btn');
  const adminStatus = document.getElementById('admin-status');
  
  adminBtn.addEventListener('click', () => {
    const email = prompt('הכנס מייל מנהל:');
    if (email) {
      checkAdmin(email);
    }
  });
  
  // במקום הפונקציה הנוכחית checkAdmin, להשתמש בשרת:
function checkAdmin(email) {
  fetch('/api/admin/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({email: email})
  })
  .then(response => response.json())
  .then(data => {
    if (data.success && data.isAdmin) {
      isAdmin = true;
      adminEmail = email;
      localStorage.setItem('isAdmin', 'true');
      localStorage.setItem('adminEmail', email);
      
      adminStatus.textContent = `מחובר כמנהל: ${email} | `;
      adminStatus.innerHTML += '<button onclick="logout()" style="background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;">התנתק</button>';
      adminStatus.className = 'admin-status admin';
      adminBtn.style.display = 'none';
      showSuccess('התחברת בהצלחה כמנהל! טוען מחדש...');
      setTimeout(() => {
        location.reload();
      }, 1500);
    } else {
      showError('המייל לא ברשימת המנהלים');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showError('שגיאה בהתחברות לשרת');
  });
}
}

function logout() {
  isAdmin = false;
  adminEmail = '';
  localStorage.removeItem('isAdmin');
  localStorage.removeItem('adminEmail');
  document.getElementById('admin-status').className = 'admin-status hidden';
  document.getElementById('admin-login-btn').style.display = 'inline-block';
  showSuccess('התנתקת בהצלחה! טוען מחדש...');
  setTimeout(() => {
    location.reload();
  }, 1000);
  }

  // Show error message - גלובלית
function showError(message) {
  const resultContent = document.getElementById('result-content');
  if (resultContent) {
    resultContent.innerHTML = `<div class="error-message">${message}</div>`;
  } else {
    alert(message);
  }
}

// Show success message - גלובלית  
function showSuccess(message) {
  const resultContent = document.getElementById('result-content');
  if (resultContent) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    resultContent.prepend(successElement);
    setTimeout(() => successElement.remove(), 3000);
  } else {
    alert(message);
  }
}

// הפעלת מערכת ההתחברות
document.addEventListener('DOMContentLoaded', function() {
  if (isAdmin && adminEmail) {
    const adminStatus = document.getElementById('admin-status');
    const adminBtn = document.getElementById('admin-login-btn');
    
    adminStatus.textContent = `מחובר כמנהל: ${adminEmail} | `;
    adminStatus.innerHTML += '<button onclick="logout()" style="background:none;border:none;color:inherit;text-decoration:underline;cursor:pointer;">התנתק</button>';
    adminStatus.className = 'admin-status admin';
    adminBtn.style.display = 'none';
  }
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const forms = {
    'private': document.getElementById('private-form'),
    'motorcycle': document.getElementById('motorcycle-form'),
    'heavy': document.getElementById('heavy-form'),
    'machinery': document.getElementById('machinery-form')
  };

  const resultContent = document.getElementById('result-content');
  const loading = document.getElementById('loading');

  // API resource identifiers for different vehicle types
  const apiResources = {
    'private': '053cea08-09bc-40ec-8f7a-156f0677aff3',
    'motorcycle': 'bf9df4e2-d90d-4c0a-a400-19e15af8e95f',
    'heavy': 'cd3acc5c-03c3-4c89-9c54-d40f93c0d790',
    'machinery': '58dc4654-16b1-42ed-8170-98fadec153ea',
    'private_extra': '142afde2-6228-49f9-8a29-9b6c3a0cbe40',
    // Resources for checking canceled vehicles
    'canceled_private': '851ecab1-0622-4dbe-a6c7-f950cf82abf9',
    'canceled_heavy': '4e6b9724-4c1e-43f0-909a-154d4cc4e046',
    'canceled_motorcycle': 'ec8cbc34-72e1-4b69-9c48-22821ba0bd6c'
  };

  // Display icons for different vehicle types
  const vehicleIcons = {
    'private': '🚗',
    'motorcycle': '🏍️',
    'heavy': '🚚',
    'machinery': '🚜'
  };

  // Field labels for machinery vehicles
  const fieldLabelsMachinery = {
    sug_tzama_nm: 'סוג צמ"ה',
    shilda_totzar_en_nm: 'יצרן השלדה',
    degem_nm: 'שם דגם',
    mishkal_ton: 'משקל עצמי',
    mishkal_kolel_ton: 'משקל כולל בטון'
  };

  // Field labels for private vehicles
  const fieldLabelsPrivate = {
    tozeret_nm: 'יצרן',
    tzeva_rechev: 'צבע הרכב',
    kinuy_mishari: 'דגם',
    sug_delek_nm: 'סוג דלק',
    sug_rechev_nm: 'סוג רכב',
    degem_nm: 'שם דגם',
    mishkal_kolel: 'משקל כולל'
  };

  // Field labels for motorcycles
  const fieldLabelsMotorcycle = {
    tozeret_nm: 'יצרן',
    sug_delek_nm: 'סוג דלק',
    sug_rechev_nm: 'סוג רכב'
  };

  // Field labels for heavy vehicles
  const fieldLabelsHeavy = {
    mispar_rechev: 'מספר רישוי',
    shnat_yitzur: 'שנת ייצור',
    tozeret_nm: 'יצרן',
    sug_delek_nm: 'סוג דלק',
    mishkal_kolel: 'משקל כולל',
    mishkal_azmi: 'משקל עצמי',
    hanaa_nm: 'הנעה'
  };

  // Extra fields for private vehicles
  const extraFieldsPrivate = {
    mishkal_kolel: 'משקל כולל',
    hanaa_nm: 'הנעה',
    technologiat_hanaa_nm: 'טכנולוגיית הנעה'
  };

  // Fields used for accurate vehicle identification
  const identificationFields = {
    basic: ['tozeret_nm', 'kinuy_mishari', 'shnat_yitzur'],
    enhanced: ['nefach_manoa', 'degem_manoa', 'ramat_gimur', 'degem_cd', 'sug_delek_nm']
  };

  // Function to check if a vehicle has been canceled
  function checkVehicleCancellation(licenseNumber, callback) {
    const resourceIds = [
      apiResources.canceled_private,
      apiResources.canceled_heavy,
      apiResources.canceled_motorcycle
    ];
  
    let completed = 0;
    let foundVehicle = null;
  
    resourceIds.forEach(resourceId => {
      // First method - search with filters
      const url1 = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&filters={"mispar_rechev":"${parseInt(licenseNumber, 10).toString()}"}`;
      
      // Second method - general search with q parameter
      const url2 = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&q=${licenseNumber}`;
      
      // Try with filters first
      fetch(url1)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.result.records && data.result.records.length > 0) {
            // Found with filters
            const record = data.result.records[0];
            processFoundRecord(record);
          } else {
            // If not found, try with general search
            return fetch(url2);
          }
        })
        .then(res => res ? res.json() : null)
        .then(data => {
          if (data && data.success && data.result.records && data.result.records.length > 0) {
            // Check if any records contain the license number
            const record = data.result.records.find(rec => {
              // Try to find in all possible fields
              return Object.values(rec).some(val => 
                val && val.toString().includes(licenseNumber.toString())
              );
            });
            
            if (record) {
              processFoundRecord(record);
            }
          }
        })
        .catch(err => {
          console.error("Error checking cancellation:", err, "for resource:", resourceId);
        })
        .finally(() => {
          completed++;
          if (completed === resourceIds.length) {
            callback(foundVehicle);
          }
        });
    });
  
    function processFoundRecord(record) {
      foundVehicle = {
        mispar_rechev: record.mispar_rechev || record.MISPAR_RECHEV || "",

        tozeret_nm: record.tozeret_nm || record.TOZERET_NM || record.TOZERET || "לא ידוע",
        kinuy_mishari: record.kinuy_mishari || record.KINUY_MISHARI || record.degem_nm || record.DEGEM_NM || record.DEGEM || "לא ידוע",
        shnat_yitzur: record.shnat_yitzur || record.SHNAT_YITZUR || "לא ידוע",

        degem_nm: record.degem_nm || record.DEGEM_NM || record.DEGEM || "לא ידוע",
        sug_rechev_nm: record.sug_rechev_nm || record.SUG_RECHEV_NM || record.SUG_RECHEV || "לא ידוע",
        tzeva_rechev: record.tzeva_rechev || record.TZEVA_RECHEV || record.TZEVA || "לא ידוע",
        mishkal_kolel: record.mishkal_kolel || record.MISHKAL_KOLEL || "לא ידוע",
        sug_delek_nm: record.sug_delek_nm || record.SUG_DELEK_NM || record.SUG_DELEK || "לא ידוע",

        __bitulSofi: true
      };
    }
  }

  // הוספה של בדיקה מול מאגר רכבים לא פעילים (Inactive Vehicles)
function checkInactiveVehicleAPI(licenseNumber, callback) {
  const resourceId = 'f6efe89a-fb3d-43a4-bb61-9bf12a9b9099';
  const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');

  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&filters={"mispar_rechev":"${cleanLicense}"}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.result.records.length > 0) {
        const record = data.result.records[0];

        const inactiveVehicle = {
          mispar_rechev: record.mispar_rechev || "",
          tozeret_nm: record.tozeret_nm || record.TOZERET_NM || "לא ידוע",
          kinuy_mishari: record.kinuy_mishari || record.degem_nm || record.DEGEM_NM || "לא ידוע",
          shnat_yitzur: record.shnat_yitzur || "לא ידוע",
          degem_nm: record.degem_nm || record.DEGEM_NM || "לא ידוע",
          sug_rechev_nm: record.sug_rechev_nm || record.SUG_RECHEV_NM || "לא ידוע",
          tzeva_rechev: record.tzeva_rechev || record.TZEVA_RECHEV || "לא ידוע",
          mishkal_kolel: record.mishkal_kolel || "לא ידוע",
          sug_delek_nm: record.sug_delek_nm || record.SUG_DELEK_NM || "לא ידוע",
          __inactive: true
        };

        callback(inactiveVehicle);
      } else {
        callback(null);
      }
    })
    .catch(err => {
      console.error('שגיאה בבדיקה מול מאגר רכבים לא פעילים:', err);
      callback(null);
    });
}

  function initServerData() {
    return fetch('/api/vehicles/data')
      .then(response => response.json())
      .then(serverData => {
        console.log('Server data loaded:', serverData);
        console.log('Server data keys:', Object.keys(serverData));
        console.log('Server records count:', Object.keys(serverData).length);
        
        // השרת הוא מקור האמת - תמיד השתמש בנתוני השרת
        localStorage.setItem('vehicleData', JSON.stringify(serverData));
        
        console.log(`Data loaded from server: ${Object.keys(serverData).length} records`);
        return serverData;
      })
      .catch((error) => {
        console.error('Error loading data from server:', error);
        
        // רק במקרה של שגיאת רשת - השתמש בנתונים מקומיים כגיבוי
        const localData = JSON.parse(localStorage.getItem('vehicleData')) || {};
        console.log('Server unavailable - using cached data:', Object.keys(localData).length, 'records');
        
        // הצג הודעה למשתמש שהשרת לא זמין
        if (Object.keys(localData).length > 0) {
          console.warn('Using cached data - some information may be outdated');
        }
        
        return localData;
      });
}


  // Get unique key for vehicle - WITHOUT LICENSE PLATE (generic for all vehicles of same model)
  function getGenericVehicleKey(vehicle) {
    // Basic information
    const manufacturer = (vehicle.tozeret_nm || vehicle.shilda_totzar_en_nm || '').trim();
    const model = (vehicle.kinuy_mishari || vehicle.degem_nm || '').trim();
    const year = (vehicle.shnat_yitzur || '').toString().trim();
    
    // Enhanced fields for accurate identification
    const engineVolume = (vehicle.nefach_manoa || '').toString().trim();
    const engineModel = (vehicle.degem_manoa || '').toString().trim();
    const trimLevel = (vehicle.ramat_gimur || '').trim();
    const modelCode = (vehicle.degem_cd || '').toString().trim();
    const fuelType = (vehicle.sug_delek_nm || '').trim();

    // Build enhanced key WITHOUT license plate (generic key)
    let key = '';
    
    // If all the information required for a standard key is available
    if (manufacturer && model) {
      // Start with basic fields that must be present
      key = `${manufacturer}_${model}_${year}`;
      
      // Add enhanced fields - maintain a consistent order for key consistency
      const enhancedFields = [];
      
      if (engineVolume) enhancedFields.push(`ev${engineVolume}`);
      if (engineModel) enhancedFields.push(`em${engineModel}`);
      if (trimLevel) enhancedFields.push(`tl${trimLevel}`);
      if (modelCode) enhancedFields.push(`mc${modelCode}`);
      if (fuelType) enhancedFields.push(`ft${fuelType}`);
      
      // Add enhanced fields to the key if they exist
      if (enhancedFields.length > 0) {
        key += `_${enhancedFields.join('_')}`;
      }
      
      // Clean the key from problematic characters
      key = key.replace(/\s+/g, '_').replace(/[,\.\/\\\(\)]/g, '');
      return key;
    } 
    // If information is missing, return a fallback key based on available info
    else if (manufacturer || model) {
      const key = `${manufacturer || 'unknown'}_${model || 'unknown'}_${year || 'unknown'}`;
      return key.replace(/\s+/g, '_').replace(/[,\.\/\\\(\)]/g, '');
    }
    // If even that is missing, return null (can't create generic key)
    else {
      return null;
    }
  }

  function saveVehicleDataToServer(vehicle, additionalData) {
    if (!isAdmin) {
        alert('נדרשות הרשאות מנהל לשמירת מידע');
        return null;
    }
    
    const key = getGenericVehicleKey(vehicle);
    
    if (!key) {
        console.error('Cannot create generic key for vehicle - insufficient data');
        return null;
    }
    
    // יצירת backup רק אם לא נוצר אחד היום
const currentData = JSON.parse(localStorage.getItem('vehicleData')) || {};
const today = new Date().toDateString();
const lastBackupDate = localStorage.getItem('lastBackupDate');

if (lastBackupDate !== today) {
    const backupKey = 'vehicleData_backup_' + new Date().toISOString().split('T')[0];
    localStorage.setItem(backupKey, JSON.stringify(currentData));
    localStorage.setItem('lastBackupDate', today);
    
    // מחיקת backups ישנים (רק 5 אחרונים - שבוע)
    const allKeys = Object.keys(localStorage);
    const backupKeys = allKeys.filter(k => k.startsWith('vehicleData_backup_')).sort();
    while (backupKeys.length > 5) {
        localStorage.removeItem(backupKeys.shift());
    }
    console.log('Daily backup created');
}
    
    // Read current local data
    let vehicleData = { ...currentData }; // יצירת עותק כדי לא לשנות את המקור
    
    // Check if there's already a record for this vehicle
    const existingData = vehicleData[key] || {};
    
    // Combine new data with existing data
    const updatedData = {
        // Basic vehicle information (generic - no license plate)
        manufacturer: vehicle.tozeret_nm || vehicle.shilda_totzar_en_nm || '',
        model: vehicle.kinuy_mishari || vehicle.degem_nm || '',
        year: vehicle.shnat_yitzur || '',
        
        // Enhanced information for more accurate identification
        engineVolume: vehicle.nefach_manoa || '',
        engineModel: vehicle.degem_manoa || '',
        trimLevel: vehicle.ramat_gimur || '',
        modelCode: vehicle.degem_cd || '',
        fuelType: vehicle.sug_delek_nm || '',
        
        // Additional generic information (not license-specific)
        color: vehicle.tzeva_rechev || '',
        weight: vehicle.mishkal_kolel || '',
        
        // Combine existing data with new data
        ...existingData,
        ...additionalData,
        
        // Add update timestamp
        lastUpdated: new Date().toISOString()
    };
    
    // Update local data immediately
    vehicleData[key] = updatedData;
    
    try {
        localStorage.setItem('vehicleData', JSON.stringify(vehicleData));
        console.log('Local data updated successfully');
    } catch (error) {
        console.error('Error updating local storage:', error);
        // שחזור מ-backup במקרה של שגיאה
        localStorage.setItem('vehicleData', localStorage.getItem(backupKey));
        alert('שגיאה בשמירה מקומית. הנתונים שוחזרו.');
        return null;
    }
    
    const dataToSend = {
        key: key,
        data: updatedData
    };
    
    // הצגת הודעת שמירה
    showSuccess('שומר נתונים...');
    
    fetch('/api/vehicles/save', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            console.log('Data saved successfully to server with key:', key);
            showSuccess('הנתונים נשמרו בהצלחה בשרת!');
            
            // רענון נתונים מהשרת לוודא סנכרון
            setTimeout(() => {
                refreshLocalDataFromServer();
            }, 1000);
        } else {
            console.error('Server error:', result.error);
            showError(`שגיאה בשמירה בשרת: ${result.error || 'שגיאה לא ידועה'}`);
            
            // במקרה של שגיאה בשרת, עדיין שומרים מקומית
            console.log('Data saved locally despite server error');
        }
    })
    .catch((error) => {
        console.error('Network error saving to server:', error);
        showError('שגיאת רשת בשמירה לשרת. הנתונים נשמרו מקומית.');
        
        // ניסיון חוזר אחרי 5 שניות
        setTimeout(() => {
            console.log('Retrying server save...');
            fetch('/api/vehicles/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToSend)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    console.log('Retry successful - data saved to server');
                    showSuccess('הנתונים נשמרו בשרת בניסיון חוזר');
                }
            })
            .catch(retryError => {
                console.error('Retry also failed:', retryError);
            });
        }, 5000);
    });
    
    return updatedData;
}

  // Function to refresh local data from server
  function refreshLocalDataFromServer() {
    fetch('/api/vehicles/data')
      .then(response => response.json())
      .then(vehicleData => {
        // Update localStorage with fresh data from server
        localStorage.setItem('vehicleData', JSON.stringify(vehicleData));
        console.log(`Refreshed local data from server: ${Object.keys(vehicleData).length} records`);
      })
      .catch((error) => {
        console.error('Error refreshing data from server:', error);
      });
  }

  // Get additional vehicle information if it exists (generic lookup)
  function getAdditionalVehicleData(vehicle) {
    const key = getGenericVehicleKey(vehicle);
    
    if (!key) {
      console.log('Cannot create key for vehicle');
      return null;
    }
    
    const vehicleData = JSON.parse(localStorage.getItem('vehicleData')) || {};
    const data = vehicleData[key];
    
    console.log(`Looking for key: ${key}`);
    console.log(`Found data:`, data);
    console.log(`All keys in storage:`, Object.keys(vehicleData));
    console.log(`Total records in localStorage:`, Object.keys(vehicleData).length);
    
    return data || null;
}

  // Switch between tabs
  function switchTab(tabId) {
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`${tabId}-tab`).classList.add('active');
    resultContent.innerHTML = '';
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      switchTab(tabId);
    });
  });

  // Format license number for display
  function formatLicenseNumber(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    if (cleanNumber.length === 7) {
      return cleanNumber.slice(0, 2) + '-' + cleanNumber.slice(2, 5) + '-' + cleanNumber.slice(5);
    } else if (cleanNumber.length === 8) {
      return cleanNumber.slice(0, 3) + '-' + cleanNumber.slice(3, 5) + '-' + cleanNumber.slice(5);
    }
    return cleanNumber;
  }

  // Validate license number
  function validateLicenseNumber(licenseNumber, vehicleType) {
    const cleanNumber = licenseNumber.replace(/[^0-9]/g, '');
    return /^\d{3,8}$/.test(cleanNumber);
  }

  // Show error message
  function showError(message) {
    resultContent.innerHTML = `<div class="error-message">${message}</div>`;
  }

  // Fetch extra information for private vehicles
  function fetchExtraPrivateInfo(vehicle, callback) {
    const model = (vehicle.tozeret_nm || '') + ' ' + (vehicle.kinuy_mishari || '');
    const query = encodeURIComponent(model);
    const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${apiResources.private_extra}&q=${query}`;
  
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.result.records.length > 0) {
          const match = data.result.records.find(record =>
            record.shnat_yitzur == vehicle.shnat_yitzur &&
            record.degem_cd == vehicle.degem_cd &&
            record.nefach_manoa == vehicle.nefach_manoa
          );
  
          if (match) {
            if ('automatic_ind' in match) {
              match.automatic_ind = match.automatic_ind === '1' || match.automatic_ind === 1
                ? 'אוטומטי'
                : 'ידני';
            }
            console.log('אחרי תרגום automatic_ind:', match);
            callback(match);
          } else {
            console.log("No exact match found in private_extra DB — skipping extra info.");
            callback(null);
          }
        } else {
          callback(null);
        }
      })
      .catch(err => {
        console.error('Error fetching extra private vehicle data:', err);
        callback(null);
      });
  }
  

 // Fetch vehicle data from API (updated version with precise extra info matching)
function fetchVehicleDataFromAPI(licenseNumber, vehicleType) {
  const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
  loading.classList.remove('hidden');
  resultContent.innerHTML = '';

  const resourceId = apiResources[vehicleType];
  const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&q=${cleanLicense}`;

  fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
      if (data.success && data.result && data.result.records.length > 0) {
        const matchField = vehicleType === 'machinery' ? 'mispar_tzama' : 'mispar_rechev';
        const vehicle = data.result.records.find(row => 
          String(row[matchField] || '').replace(/[^0-9]/g, '') === cleanLicense
        );

        if (vehicle) {
          // מידע נוסף
          const enrichAndDisplay = () => {
            const additionalData = getAdditionalVehicleData(vehicle);
            if (additionalData && additionalData.towTypes) {
              vehicle.towTypes = additionalData.towTypes;
            }
            displayVehicleData(vehicle, vehicleType, cleanLicense);
            loading.classList.add('hidden');
          };

          if (vehicleType === 'private') {
            fetchExtraPrivateInfo(vehicle, extraData => {
              if (extraData) {
                vehicle.mishkal_kolel = extraData.mishkal_kolel || vehicle.mishkal_kolel;
                vehicle.hanaa_nm = extraData.hanaa_nm || vehicle.hanaa_nm;
                vehicle.technologiat_hanaa_nm = extraData.technologiat_hanaa_nm || vehicle.technologiat_hanaa_nm;
                vehicle.automatic_ind = extraData.automatic_ind || vehicle.automatic_ind;
              }
              enrichAndDisplay();
            });
          } else {
            enrichAndDisplay();
          }
        } else {
          // לא נמצא ספציפית – בדיקה מול מאגרי ביטול ורכבים לא פעילים
          checkVehicleCancellation(cleanLicense, canceledVehicle => {
            if (canceledVehicle) {
              displayVehicleData(canceledVehicle, vehicleType, cleanLicense);
            } else {
              checkInactiveVehicleAPI(cleanLicense, inactiveVehicle => {
                if (inactiveVehicle) {
                  displayVehicleData(inactiveVehicle, vehicleType, cleanLicense);
                } else {
                  showError('לא נמצאו נתונים עבור מספר הרישוי.');
                }
                loading.classList.add('hidden');
              });
            }
          });
        }
      } else {
        // לא התקבלו תוצאות כלל
        checkVehicleCancellation(cleanLicense, canceledVehicle => {
          if (canceledVehicle) {
            displayVehicleData(canceledVehicle, vehicleType, cleanLicense);
          } else {
            checkInactiveVehicleAPI(cleanLicense, inactiveVehicle => {
              if (inactiveVehicle) {
                displayVehicleData(inactiveVehicle, vehicleType, cleanLicense);
              } else {
                showError('לא נמצאו תוצאות מה-API.');
              }
              loading.classList.add('hidden');
            });
          }
        });
      }
    })
    .catch(error => {
      console.error('API error:', error);
      checkVehicleCancellation(cleanLicense, canceledVehicle => {
        if (canceledVehicle) {
          displayVehicleData(canceledVehicle, vehicleType, cleanLicense);
        } else {
          checkInactiveVehicleAPI(cleanLicense, inactiveVehicle => {
            if (inactiveVehicle) {
              displayVehicleData(inactiveVehicle, vehicleType, cleanLicense);
            } else {
              showError('שגיאה בחיבור לשרת. אנא נסה שוב מאוחר יותר.');
            }
            loading.classList.add('hidden');
          });
        }
      });
    });
}

  // Display vehicle data
  function displayVehicleData(data, vehicleType, licenseNumber) {
    const formattedLicense = formatLicenseNumber(licenseNumber);
    const cleanLicense = licenseNumber.replace(/[^0-9]/g, '');
  
    let title = 'רכב';
    if (vehicleType === 'machinery') title = 'כלי צמ"ה';
    else if (vehicleType === 'heavy') title = 'רכב כבד';
    else if (vehicleType === 'motorcycle') title = 'דו גלגלי';
    else if (vehicleType === 'private') title = 'רכב פרטי/מסחרי';
  
    let html = `
    <div class="vehicle-summary">
      <div class="vehicle-image">${vehicleIcons[vehicleType]}</div>
      <div class="vehicle-details">
        <h3>${data.tozeret_nm || data.shilda_totzar_en_nm || ''} ${data.kinuy_mishari || data.degem_nm || ''} ${data.shnat_yitzur || ''}</h3>
        <p>${title}</p>
        <div class="license-plate">${formattedLicense}</div>
      </div>
    </div>`;
  
    html += '<div class="vehicle-info"><div class="vehicle-info-grid">';
    let copyLines = [];
    copyLines.push(`מספר רישוי: ${cleanLicense}`);
  
    let fieldsToUse = null;
    if (vehicleType === 'machinery') fieldsToUse = fieldLabelsMachinery;
    else if (vehicleType === 'private') fieldsToUse = { ...fieldLabelsPrivate, ...extraFieldsPrivate, automatic_ind: 'סוג גיר' };
    else if (vehicleType === 'motorcycle') fieldsToUse = fieldLabelsMotorcycle;
    else if (vehicleType === 'heavy') fieldsToUse = fieldLabelsHeavy;
  
    const showTowTypeForm = !data.__bitulSofi && isAdmin;
  
    if (fieldsToUse) {
      const maxLabelLength = Math.max(...Object.values(fieldsToUse).map(label => label.length));
      Object.entries(fieldsToUse).forEach(([key, label]) => {
        const value = data[key] || 'לא נמצא מידע';
        const paddedLabel = label.padEnd(maxLabelLength, '.');
        html += `
          <div class="vehicle-info-item">
            <strong>${label}</strong>
            <div class="vehicle-info-value">${value}</div>
          </div>`;
        copyLines.push(`${paddedLabel}: ${value}`);
      });
    }
  
    // הצגת סוגי גרר קיימים אם יש
    if (data.towTypes && data.towTypes.length > 0) {
      html += `
        <div class="vehicle-info-item">
          <strong>סוגי גרר מתאימים</strong>
          <div class="vehicle-info-value">${data.towTypes.join(', ')}</div>
        </div>`;
      copyLines.push(`סוגי גרר מתאימים: ${data.towTypes.join(', ')}`);
    }
  
    html += `</div>`; // סיום vehicle-info-grid
  
    // טופס הוספת/עדכון סוגי גרר
    if (showTowTypeForm) {
      const formTitle = Array.isArray(data.towTypes) && data.towTypes.length > 0 ? 'עדכן מידע' : 'הוסף מידע נוסף';
      const buttonText = formTitle;
      const towTypes = ['רמ-סע', 'משקפיים', 'דולי', 'מובילית'];
  
      html += `
      <div class="add-data-form">
        <h4>${formTitle}</h4>
        <div class="form-group">
          <label>בחר את סוגי הגרר האפשריים:</label>
          <div id="tow-type-options">
            ${towTypes.map(type => `
              <label class="tow-type-option ${Array.isArray(data.towTypes) && data.towTypes.includes(type) ? 'selected' : ''}">
                <input type="checkbox" value="${type}" ${Array.isArray(data.towTypes) && data.towTypes.includes(type) ? 'checked' : ''} hidden>
                ${type}
              </label>
            `).join('')}
          </div>
        </div>
        <button id="save-tow-types" class="secondary-button">${buttonText}</button>
      </div>`;
    }
  
    html += `
    <div style="text-align: center; margin-top: 20px;">
      <button id="copy-data-btn" style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">העתק נתונים</button>
      <span id="copy-success" style="display: none; margin-right: 10px; color: green; font-weight: bold;">הנתונים הועתקו!</span>
    </div>
    </div>`; // סיום vehicle-info
  
    resultContent.innerHTML = html;
  
    // הוספת התנהגות לחיצה על בלוקי גרר
    document.querySelectorAll('.tow-type-option').forEach(label => {
      const checkbox = label.querySelector('input[type="checkbox"]');
      label.addEventListener('click', (e) => {
        e.preventDefault();
        checkbox.checked = !checkbox.checked;
        label.classList.toggle('selected', checkbox.checked);
      });
    });
  
    // אם הרכב מבוטל
    if (data.__bitulSofi) {
      resultContent.innerHTML += `
        <div class="error-message" style="text-align: center; margin-top: 20px; font-weight: bold; font-size: 18px;">
          🚫 לפי נתוני משרד התחבורה - הרכב בוטל סופית ואינו כשיר לנסיעה!
        </div>
        <div class="canceled-vehicle-info" style="margin-top: 20px; background-color: #ffe6e6; border: 2px solid #ff6666; border-radius: 8px; padding: 15px;">
          <h4 style="color: #cc0000; margin-bottom: 10px;">מידע על ביטול רכב</h4>
          <p>רכב זה בוטל סופית ואינו כשיר לנוע בכבישים. מידע זה הוא ממאגרי הביטולים הרשמיים של משרד התחבורה.</p>
          <p style="font-weight: bold; margin-top: 10px;">שימוש ברכב מבוטל הינו עבירה על החוק ועלול לסכן חיים.</p>
        </div>`;
    }
    // אם הרכב לא פעיל (אך לא מבוטל)
if (data.__inactive) {
  resultContent.innerHTML += `
    <div class="error-message" style="text-align: center; margin-top: 20px; font-weight: bold; font-size: 18px;">
      🚫 הרכב לא מופיע כרכב פעיל במאגרי משרד התחבורה!
    </div>
    <div class="canceled-vehicle-info" style="margin-top: 20px; background-color: #fff3cd; border: 2px solid #ffecb5; border-radius: 8px; padding: 15px;">
      <h4 style="color: #856404; margin-bottom: 10px;">מידע מהרשומות</h4>
      <p>רכב זה אינו מופיע בין הרכבים הפעילים, ייתכן שהוא הושבת, נגרט, או לא חודש רישויו.</p>
    </div>`;
}

  
    // שמירה של סוגי גרר שנבחרו
    if (showTowTypeForm) {
      document.getElementById('save-tow-types').addEventListener('click', () => {
        const selectedTowTypes = Array.from(document.querySelectorAll('#tow-type-options input:checked')).map(el => el.value);
  
        if (selectedTowTypes.length > 0) {
          const additionalData = { towTypes: selectedTowTypes };
          const savedData = saveVehicleDataToServer(data, additionalData);
          
          // Update the vehicle data immediately with the saved information
          data.towTypes = selectedTowTypes;
          
          // Show success message
          showSuccess('המידע נשמר בהצלחה!');
          
          // Refresh the display to show the updated data
          setTimeout(() => {
            displayVehicleData(data, vehicleType, licenseNumber);
          }, 1000);
        } else {
          alert('נא לבחור לפחות סוג גרר אחד');
        }
      });
    }
  
    // העתקת נתונים
    document.getElementById('copy-data-btn').addEventListener('click', () => {
      const copyText = copyLines.join('\n');
      navigator.clipboard.writeText(copyText).then(() => {
        document.getElementById('copy-success').style.display = 'inline-block';
        setTimeout(() => {
          document.getElementById('copy-success').style.display = 'none';
        }, 2000);
      }).catch(() => {
        alert('שגיאה בהעתקת הנתונים');
      });
    });
  }
  
  

  // Show success message
  function showSuccess(message) {
    const successElement = document.createElement('div');
    successElement.className = 'success-message';
    successElement.textContent = message;
    
    resultContent.prepend(successElement);
    
    setTimeout(() => {
      successElement.remove();
    }, 3000);
  }

  // Function to export stored data as a JSON file
  function exportVehicleData() {
    // Get data from localStorage
    const vehicleData = JSON.parse(localStorage.getItem('vehicleData')) || {};
    
    // Convert data to formatted JSON string
    const jsonString = JSON.stringify(vehicleData, null, 2);
    
    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Create virtual link element and activate it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle_tow_types.json';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // Function to export data as CSV file - updated with tow types
  function exportVehicleDataCSV() {
    // Get data from localStorage
    const vehicleData = JSON.parse(localStorage.getItem('vehicleData')) || {};
    
    // Add BOM for correct UTF-8 encoding
    let csvContent = "\uFEFF"; // BOM for Hebrew support
    
    // Create CSV headers - updated with tow types
    csvContent += "יצרן,דגם,שנה,נפח מנוע,דגם מנוע,רמת גימור,קוד דגם,סוג דלק,סוגי גרר,תאריך עדכון\n";
    
    // Add each record
    Object.entries(vehicleData).forEach(([key, data]) => {
      // Add quotes around each field to handle commas within content
      csvContent += `"${data.manufacturer || ''}","${data.model || ''}","${data.year || ''}",`;
      csvContent += `"${data.engineVolume || ''}","${data.engineModel || ''}","${data.trimLevel || ''}",`;
      csvContent += `"${data.modelCode || ''}","${data.fuelType || ''}",`;
      csvContent += `"${Array.isArray(data.towTypes) ? data.towTypes.join(', ') : ''}",`;
      csvContent += `"${data.lastUpdated || ''}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create virtual link element and activate it
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vehicle_tow_types.csv';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  }

  // Update function to add export buttons
  function addExportButtons() {
    // Check if the user entered the correct password (stored in localStorage)
    if (!isAdmin) return;

  
    // Create the export container with export buttons
    const exportContainer = document.createElement('div');
    exportContainer.className = 'export-container';
    exportContainer.innerHTML = `
      <h3>מאגר נתוני סוגי גרר</h3>
      <p>ייצוא נתוני סוגי גרר שנאספו במערכת</p>
      <div class="export-buttons">
        <button id="export-json" class="export-button">הורד JSON</button>
        <button id="export-csv" class="export-button">הורד CSV</button>
      </div>
    `;
  
    // Add the export container to the page
    document.querySelector('.container').appendChild(exportContainer);
  
    // Add click events to the export buttons
    document.getElementById('export-json').addEventListener('click', exportVehicleData);
    document.getElementById('export-csv').addEventListener('click', exportVehicleDataCSV);
  }

  // Global variable to track if data is loaded
  let dataLoaded = false;

  Object.keys(forms).forEach(formKey => {
    const form = forms[formKey];
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const licenseInput = this.querySelector('input[name="license"]');
        const licenseNumber = licenseInput.value.trim();
        const cleanNumber = licenseNumber.replace(/[^0-9]/g, '');
        if (!validateLicenseNumber(cleanNumber, formKey)) {
          showError('מספר רישוי לא תקין. אנא הזן מספר רישוי בפורמט נכון.');
          return;
        }

        // Make sure data is loaded before searching
        if (!dataLoaded) {
          loading.classList.remove('hidden');
          resultContent.innerHTML = '<div>טוען נתוני המערכת...</div>';
          
          initServerData().then(() => {
            dataLoaded = true;
            fetchVehicleDataFromAPI(cleanNumber, formKey);
          });
        } else {
          fetchVehicleDataFromAPI(cleanNumber, formKey);
        }
      });
    }
  });

  // Initialize data from server on page load
  initServerData().then(() => {
    dataLoaded = true;
    console.log('Data loaded successfully on page load');
  });
  
  // Add export buttons
  addExportButtons();
  setupAdminLogin();
});