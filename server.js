const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const lockfile = require('proper-lockfile');

const app = express();
const PORT = process.env.PORT || 3000;

// הגדרות CORS - כמו בקבצי PHP
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type']
}));

// Middleware לפענוח JSON
app.use(express.json());

// הגשת קבצים סטטיים מתיקיית public
app.use(express.static('public'));

// נתיב לדף הבית
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API route for admin check - המרה של check-admin.php
app.post('/api/admin/check', async (req, res) => {
    try {
        // קריאת רשימת מנהלים מקובץ נפרד
        const adminConfig = JSON.parse(await fs.readFile(path.join(__dirname, 'admins.json'), 'utf8'));
        const adminEmails = adminConfig.adminEmails || [];

        const { email } = req.body;

        if (!email) {
            return res.json({
                success: false,
                error: 'לא נשלח מייל'
            });
        }

        const cleanEmail = email.trim().toLowerCase();
        
        // בדיקה אם המייל ברשימת המנהלים
        const isAdmin = adminEmails.map(e => e.toLowerCase()).includes(cleanEmail);
        
        res.json({
            success: true,
            isAdmin: isAdmin,
            message: isAdmin ? 'ברוך הבא מנהל!' : 'נכנסת כאורח'
        });

    } catch (error) {
        console.error('Error in admin check:', error);
        res.json({
            success: false,
            error: 'שגיאה בבדיקת הרשאות'
        });
    }
});

// API route for saving vehicle data - המרה של save-vehicle-data.php
app.post('/api/vehicles/save', async (req, res) => {
    try {
        const { key, data } = req.body;
        
        // Validation
        if (!key || !data) {
            console.error('ERROR: Missing data - key:', !!key, 'data:', !!data);
            return res.json({ 
                success: false, 
                error: 'Missing data' 
            });
        }

        console.log('=== SAVE REQUEST at', new Date().toISOString(), '===');
        console.log('Request key:', key);

        const filename = path.join(__dirname, 'public', 'shared', 'vehicle_data.json');
        const backupDir = path.join(__dirname, 'public', 'shared', 'backups');

        // יצירת תיקיית backups אם לא קיימת
        try {
            await fs.mkdir(backupDir, { recursive: true });
        } catch (error) {
            // תיקייה כבר קיימת - זה בסדר
        }

        // יצירת backup רק פעם ביום
        const fileExists = await fs.access(filename).then(() => true).catch(() => false);
        
        if (fileExists) {
            const today = new Date().toISOString().split('T')[0];
            const backupName = path.join(backupDir, `vehicle_data.json.backup.${today}`);
            
            // יוצר backup רק אם לא קיים כבר backup מהיום
            const backupExists = await fs.access(backupName).then(() => true).catch(() => false);
            
            if (!backupExists) {
                try {
                    await fs.copyFile(filename, backupName);
                    console.log('Created daily backup:', backupName);
                    
                    // מחיקת backups ישנים (רק 5 אחרונים)
                    const backupFiles = await fs.readdir(backupDir);
                    const backupPattern = /^vehicle_data\.json\.backup\.\d{4}-\d{2}-\d{2}$/;
                    const validBackups = backupFiles.filter(file => backupPattern.test(file));
                    
                    if (validBackups.length > 5) {
                        // מיון לפי תאריך (השם כולל תאריך)
                        validBackups.sort();
                        
                        // מחיקת הישנים - שמירת 5 אחרונים
                        const toDelete = validBackups.slice(0, validBackups.length - 5);
                        for (const oldBackup of toDelete) {
                            await fs.unlink(path.join(backupDir, oldBackup));
                            console.log('Deleted old backup:', oldBackup);
                        }
                    }
                } catch (backupError) {
                    console.error('Error creating backup:', backupError);
                    // ממשיכים גם אם הbackup נכשל
                }
            }
        }

        // נעילת קובץ וטעינה בטוחה
        let vehicleData = {};
        
        if (fileExists) {
            try {
                // נעילה לקריאה
                const release = await lockfile.lock(filename, { 
                    retries: 3,
                    minTimeout: 100,
                    maxTimeout: 1000
                });
                
                try {
                    const jsonData = await fs.readFile(filename, 'utf8');
                    
                    // פענוח JSON עם בדיקת שגיאות
                    const cleanData = jsonData.replace(/^\uFEFF/, ''); // הסרת BOM
                    const decoded = JSON.parse(cleanData);
                    
                    if (decoded && typeof decoded === 'object') {
                        vehicleData = decoded;
                    } else {
                        console.error('Invalid JSON structure in file');
                        return res.json({ 
                            success: false, 
                            error: 'Corrupted data file' 
                        });
                    }
                } finally {
                    await release();
                }
                
            } catch (lockError) {
                console.error('ERROR: Cannot lock file for reading:', lockError);
                return res.json({ 
                    success: false, 
                    error: 'Cannot lock file' 
                });
            }
        } else {
            console.log('File does not exist, creating new one');
        }

        // debug - בדיקת תוכן קיים
        console.log('=== BEFORE ADDING NEW DATA ===');
        console.log('Existing keys in file:', Object.keys(vehicleData).join(', '));
        console.log('Total existing records:', Object.keys(vehicleData).length);
        console.log('New key being added:', key);

        // הוספת הנתונים החדשים
        vehicleData[key] = data;

        // debug - בדיקה אחרי הוספה
        console.log('=== AFTER ADDING NEW DATA ===');
        console.log('All keys now:', Object.keys(vehicleData).join(', '));
        console.log('Total records now:', Object.keys(vehicleData).length);

        // הכנת נתונים לשמירה
        const jsonData = JSON.stringify(vehicleData, null, 2);

        // שמירה בטוחה עם נעילה
        try {
            const release = await lockfile.lock(filename, { 
                retries: 3,
                minTimeout: 100,
                maxTimeout: 1000
            });
            
            try {
                await fs.writeFile(filename, jsonData, 'utf8');
                
                // debug - וידוא שמירה
                console.log('=== SAVE COMPLETED SUCCESSFULLY ===');
                const stats = await fs.stat(filename);
                console.log('File size after save:', stats.size, 'bytes');
                
                res.json({ 
                    success: true, 
                    message: 'Data saved successfully' 
                });
                
            } finally {
                await release();
            }
            
        } catch (lockError) {
            console.error('ERROR: Cannot open file for writing or lock failed:', lockError);
            res.json({ 
                success: false, 
                error: 'Cannot open file for writing' 
            });
        }

    } catch (error) {
        console.error('General error in save operation:', error);
        res.json({ 
            success: false, 
            error: 'שגיאה כללית בשמירה' 
        });
    }
});

// נתיבים לתת-מערכות
app.get('/towing-form*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'towing-form', 'index.html'));
});

app.get('/vehicle-lookup*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'vehicle-lookup', 'index.html'));
});

// API Routes - הוספנו את הAPI הראשון
app.get('/api/vehicles/data', async (req, res) => {
    try {
        const dataPath = path.join(__dirname, 'public', 'shared', 'vehicle_data.json');
        
        // בדיקה אם הקובץ קיים
        const fileExists = await fs.access(dataPath).then(() => true).catch(() => false);
        
        if (!fileExists) {
            return res.json({});
        }
        
        // קריאת הקובץ
        const data = await fs.readFile(dataPath, 'utf8');
        
        // הסרת BOM אם קיים (כמו בPHP)
        const cleanData = data.replace(/^\uFEFF/, '');
        
        // בדיקת תקינות JSON
        const parsed = JSON.parse(cleanData);
        res.json(parsed);
        
    } catch (error) {
        console.error('Error reading vehicle data:', error);
        res.json({});
    }
});

// API route for vehicle quick search - המרה של get-vehicle-quick.php
app.post('/api/vehicles/quick', async (req, res) => {
    try {
        const { license } = req.body;
        
        // בדיקת קלט
        if (!license) {
            return res.json({
                success: false,
                error: 'מספר רישוי לא הוזן'
            });
        }

        const cleanLicense = license.replace(/[^0-9]/g, '');

        // API resources בדיוק כמו במערכת המקורית
        const apiResources = {
            'private': '053cea08-09bc-40ec-8f7a-156f0677aff3',
            'motorcycle': 'bf9df4e2-d90d-4c0a-a400-19e15af8e95f',
            'heavy': 'cd3acc5c-03c3-4c89-9c54-d40f93c0d790',
            'machinery': '58dc4654-16b1-42ed-8170-98fadec153ea',
            'private_extra': '142afde2-6228-49f9-8a29-9b6c3a0cbe40'
        };

        let vehicleData = null;
        let vehicleType = '';

        // חיפוש בכל סוגי הרכב
        for (const [type, resourceId] of Object.entries(apiResources)) {
            if (type === 'private_extra') continue; // נדלג על זה בשלב הראשון
            
            const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&q=${cleanLicense}`;
            
            try {
                const response = await fetch(apiUrl);
                const result = await response.json();
                
                if (result.success && result.result && result.result.records.length > 0) {
                    const matchField = (type === 'machinery') ? 'mispar_tzama' : 'mispar_rechev';
                    
                    for (const record of result.result.records) {
                        const recordNumber = String(record[matchField] || '').replace(/[^0-9]/g, '');
                        if (recordNumber === cleanLicense) {
                            vehicleData = record;
                            vehicleType = type;
                            break;
                        }
                    }
                    if (vehicleData) break;
                }
            } catch (error) {
                console.error(`Error searching in ${type}:`, error);
                continue;
            }
        }

        // אם לא נמצא, בדיקה במאגרי ביטול
        if (!vehicleData) {
            const canceledResources = [
                '851ecab1-0622-4dbe-a6c7-f950cf82abf9',
                '4e6b9724-4c1e-43f0-909a-154d4cc4e046',
                'ec8cbc34-72e1-4b69-9c48-22821ba0bd6c'
            ];
            
            for (const resourceId of canceledResources) {
                const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${resourceId}&q=${cleanLicense}`;
                
                try {
                    const response = await fetch(apiUrl);
                    const result = await response.json();
                    
                    if (result.success && result.result && result.result.records.length > 0) {
                        for (const record of result.result.records) {
                            // בדיקה בכל השדות האפשריים
                            const found = Object.values(record).some(value => 
                                String(value || '').includes(cleanLicense)
                            );
                            
                            if (found) {
                                vehicleData = record;
                                vehicleData.__canceled = true;
                                break;
                            }
                        }
                        if (vehicleData) break;
                    }
                } catch (error) {
                    console.error(`Error searching in canceled resources:`, error);
                    continue;
                }
            }
        }

        // אם לא נמצא, בדיקה במאגר רכבים לא פעילים
        if (!vehicleData) {
            const inactiveResourceId = 'f6efe89a-fb3d-43a4-bb61-9bf12a9b9099';
            const apiUrl = `https://data.gov.il/api/3/action/datastore_search?resource_id=${inactiveResourceId}&filters=${encodeURIComponent(`{"mispar_rechev":"${cleanLicense}"}`)}`;
            
            try {
                const response = await fetch(apiUrl);
                const result = await response.json();
                
                if (result.success && result.result && result.result.records.length > 0) {
                    vehicleData = result.result.records[0];
                    vehicleData.__inactive = true;
                }
            } catch (error) {
                console.error('Error searching in inactive vehicles:', error);
            }
        }

        if (!vehicleData) {
            return res.json({
                success: false,
                error: 'לא נמצאו נתונים עבור מספר הרישוי'
            });
        }

        // עיבוד הנתונים לפורמט פשוט לטופס הגרירה
        const responseData = {
            success: true,
            vehicle: {
                licenseNumber: cleanLicense,
                manufacturer: vehicleData.tozeret_nm || vehicleData.shilda_totzar_en_nm || '',
                model: vehicleData.kinuy_mishari || vehicleData.degem_nm || '',
                year: vehicleData.shnat_yitzur || '',
                color: vehicleData.tzeva_rechev || '',
                fuelType: vehicleData.sug_delek_nm || '',
                vehicleType: vehicleData.sug_rechev_nm || '',
                weight: vehicleData.mishkal_kolel || '',
                fullDescription: ''
            },
            status: {
                isCanceled: !!vehicleData.__canceled,
                isInactive: !!vehicleData.__inactive,
                isActive: !vehicleData.__canceled && !vehicleData.__inactive
            }
        };

        // יצירת תיאור מלא
        const fullDesc = [
            responseData.vehicle.manufacturer,
            responseData.vehicle.model,
            responseData.vehicle.year
        ].filter(Boolean).join(' ');
        responseData.vehicle.fullDescription = fullDesc;

        // בדיקה של מידע נוסף מהמאגר המקומי (סוגי גרר)
        const localDataFile = path.join(__dirname, 'public', 'shared', 'vehicle_data.json');
        
        try {
            const localDataExists = await fs.access(localDataFile).then(() => true).catch(() => false);
            
            if (localDataExists) {
                const localDataContent = await fs.readFile(localDataFile, 'utf8');
                const localData = JSON.parse(localDataContent.replace(/^\uFEFF/, ''));
                
                // יצירת מפתח גנרי כמו במערכת המקורית
                const genericKey = createGenericKey(vehicleData);
                if (genericKey && localData[genericKey]) {
                    responseData.additionalData = localData[genericKey];
                    if (localData[genericKey].towTypes) {
                        responseData.towTypes = localData[genericKey].towTypes;
                    }
                }
            }
        } catch (error) {
            console.error('Error reading local data:', error);
        }

        res.json(responseData);

    } catch (error) {
        console.error('Error in vehicle quick search:', error);
        res.json({
            success: false,
            error: 'שגיאה כללית בחיפוש'
        });
    }
});

// פונקציה ליצירת מפתח גנרי - העתקה מדויקת מהPHP
function createGenericKey(vehicle) {
    const manufacturer = String(vehicle.tozeret_nm || vehicle.shilda_totzar_en_nm || '').trim();
    const model = String(vehicle.kinuy_mishari || vehicle.degem_nm || '').trim();
    const year = String(vehicle.shnat_yitzur || '').trim();
    
    if (!manufacturer || !model) return null;
    
    let key = `${manufacturer}_${model}_${year}`;
    
    // הוספת שדות מתקדמים אם קיימים
    const enhancedFields = [];
    if (vehicle.nefach_manoa) enhancedFields.push(`ev${vehicle.nefach_manoa}`);
    if (vehicle.degem_manoa) enhancedFields.push(`em${vehicle.degem_manoa}`);
    if (vehicle.ramat_gimur) enhancedFields.push(`tl${vehicle.ramat_gimur}`);
    if (vehicle.degem_cd) enhancedFields.push(`mc${vehicle.degem_cd}`);
    if (vehicle.sug_delek_nm) enhancedFields.push(`ft${vehicle.sug_delek_nm}`);
    
    if (enhancedFields.length > 0) {
        key += '_' + enhancedFields.join('_');
    }
    
    return key.replace(/[,\.\/\\\(\)\s]+/g, '_');
}

// התחלת השרת
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📁 Serving static files from 'public' directory`);
});

module.exports = app;