// test-google-connection.js
// קובץ לבדיקת החיבור לגוגל שיטס

require('dotenv').config();
const fetch = require("node-fetch");

console.log("🔍 בודק חיבור לגוגל שיטס...\n");

// הדפסת הגדרות
console.log("📋 הגדרות נוכחיות:");
console.log("CALENDAR_URL:", process.env.CALENDAR_URL ? "✅ קיים" : "❌ חסר");
console.log("SHEETS_URL:", process.env.SHEETS_URL ? "✅ קיים" : "❌ חסר");
console.log("");

// נתונים לבדיקה
const testData = {
    orderNumber: "TEST-" + Date.now(),
    towingType: "defective",
    defectiveCarNumber: "12345678",
    company: "בדיקת מערכת",
    executionDate: new Date().toISOString().split('T')[0],
    executionTime: "12:00",
    notes: "בדיקת חיבור למערכת"
};

async function testGoogleConnection() {
    const payload = { data: JSON.stringify(testData) };
    
    console.log("📤 שולח נתוני בדיקה...");
    console.log("נתונים:", JSON.stringify(testData, null, 2));
    console.log("");

    try {
        // בדיקת CALENDAR_URL
        if (process.env.CALENDAR_URL) {
            console.log("🗓️ בודק חיבור ליומן...");
            const calendarResponse = await fetch(process.env.CALENDAR_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(payload),
                timeout: 10000 // 10 שניות timeout
            });

            console.log("סטטוס חיבור ליומן:", calendarResponse.status);
            
            if (calendarResponse.ok) {
                const calendarText = await calendarResponse.text();
                console.log("תגובה מהיומן:", calendarText.substring(0, 200) + "...");
                console.log("✅ החיבור ליומן עובד!");
            } else {
                console.log("❌ בעיה בחיבור ליומן");
                console.log("שגיאה:", calendarResponse.statusText);
            }
        }

        console.log("");

        // בדיקת SHEETS_URL  
        if (process.env.SHEETS_URL) {
            console.log("📊 בודק חיבור לגיליון...");
            const sheetsResponse = await fetch(process.env.SHEETS_URL, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams(payload),
                timeout: 10000
            });

            console.log("סטטוס חיבור לגיליון:", sheetsResponse.status);
            
            if (sheetsResponse.ok) {
                const sheetsText = await sheetsResponse.text();
                console.log("תגובה מהגיליון:", sheetsText.substring(0, 200) + "...");
                console.log("✅ החיבור לגיליון עובד!");
            } else {
                console.log("❌ בעיה בחיבור לגיליון");
                console.log("שגיאה:", sheetsResponse.statusText);
            }
        }

    } catch (error) {
        console.log("❌ שגיאה כללית:");
        console.log("סוג השגיאה:", error.name);
        console.log("הודעת השגיאה:", error.message);
        
        // המלצות לפתרון בעיות
        console.log("\n🔧 המלצות לפתרון:");
        
        if (error.message.includes('timeout')) {
            console.log("- הבעיה: החיבור איטי מדי");
            console.log("- פתרון: בדקי את חיבור האינטרנט או נסי שוב מאוחר יותר");
        }
        
        if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
            console.log("- הבעיה: לא ניתן להגיע לשרתי גוגל");
            console.log("- פתרון: בדקי את חיבור האינטרנט");
        }
        
        if (error.message.includes('fetch')) {
            console.log("- הבעיה: בעיה ברשת או ב-URLs");
            console.log("- פתרון: בדקי שה-URLs בקובץ .env נכונים");
        }
    }
}

// הפעלת הבדיקה
testGoogleConnection().then(() => {
    console.log("\n✨ בדיקה הושלמה!");
    console.log("💡 אם ראית שגיאות, העתיקי אותן ותשלחי לי");
});