/**
 * Constants and configuration for the towing system
 * Keep each constant defined ONCE. Expose to window only AFTER defining.
 */

// ---- Apps Script URL (define once) ----
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbws2SD_kiPYJMu2yIq5gY7qp1q037X8p4j0V3Pb5L2CQ9nDmuVazlGS6-FZjZLyVRjc/exec";
window.APPS_SCRIPT_URL = APPS_SCRIPT_URL; // expose globally

// ---- LocalStorage keys (define once) ----
const STORAGE_KEYS = {
  USER_EMAIL: "userEmail",
  USER_COMPANY: "userCompany",
  USER_DEPARTMENT: "userDepartment"
};
window.STORAGE_KEYS = STORAGE_KEYS; // expose globally

// ---- API endpoints ----
const API_ENDPOINTS = {
  VEHICLE_LOOKUP: "/api/vehicles/quick",
  CHECK_AUTH: "../api/check-auth",
  CHECK_ADMIN: "../api/check-admin",
  REGISTER: "../api/register",
  LOGIN_USER: "../login-user"
};
window.API_ENDPOINTS = API_ENDPOINTS;

// ---- Pricing configuration ----
const PRICING_CONFIG = {
  BASE_PRICES: {
    private: 200,
    motorcycle: 200,
    heavy: 400,
    machinery: 600
  },
  TRAVEL_PRICE_PER_KM: 10,
  VAT_RATE: 1.18,
  OUTSKIRTS_MULTIPLIER: 1.25,
  TIER_MULTIPLIERS: {
    regular: 1,
    plus25: 1.25,
    plus50: 1.50
  }
};
window.PRICING_CONFIG = PRICING_CONFIG;

// ---- Time configuration ----
const TIME_CONFIG = {
  EVENING_START: 15, // 15:00
  EVENING_END: 19,   // 19:00
  NIGHT_START: 19,   // 19:00
  NIGHT_END: 7,      // 07:00
  WEEKEND_FRIDAY_START: 14, // Friday from 14:00
  WEEKEND_SUNDAY_END: 7     // Sunday until 06:59
};
window.TIME_CONFIG = TIME_CONFIG;

// ---- UI configuration ----
const UI_CONFIG = {
  DEBOUNCE_DELAY: 1500,
  PRICE_CALC_DELAY: 1000,
  LOADING_DELAY: 2500,
  AUTO_SCROLL_OFFSET: 200,
  SUGGESTION_ANIMATION_DELAY: 300
};
window.UI_CONFIG = UI_CONFIG;

// ---- Vehicle types ----
const VEHICLE_TYPES = {
  PRIVATE: "private",
  MOTORCYCLE: "motorcycle",
  HEAVY: "heavy",
  MACHINERY: "machinery"
};
window.VEHICLE_TYPES = VEHICLE_TYPES;

// ---- Error messages (Hebrew for UI) ----
const ERROR_MESSAGES = {
  VEHICLE_NOT_FOUND: "רכב לא נמצא במאגר משרד התחבורה",
  NETWORK_ERROR: "שגיאת רשת - אנא נסה שוב",
  UNAUTHORIZED: "המשתמש אינו מורשה במערכת",
  MISSING_DATA: "נתונים חסרים בטופס",
  INVALID_ID: "מספר תעודת זהות לא תקין",
  INVALID_PHONE: "מספר טלפון לא תקין"
};
window.ERROR_MESSAGES = ERROR_MESSAGES;

// ---- Success messages (Hebrew for UI) ----
const SUCCESS_MESSAGES = {
  FORM_SUBMITTED: "הטופס נשלח בהצלחה!",
  VEHICLE_FOUND: "רכב נמצא במאגר",
  PRICE_CALCULATED: "מחיר חושב אוטומטית"
};
window.SUCCESS_MESSAGES = SUCCESS_MESSAGES;

// ---- Validation patterns ----
const VALIDATION_PATTERNS = {
  PHONE: /^0\d{8,9}$/,
  LICENSE_PLATE: /^\d{5,8}$/,
  ID_NUMBER: /^\d{9}$/,
  CREDIT_CARD: /^\d{4}-\d{4}-\d{4}-\d{4}$/,
  CARD_EXPIRY: /^\d{2}\/\d{2}$/,
  CVV: /^\d{3,4}$/
};
window.VALIDATION_PATTERNS = VALIDATION_PATTERNS;
