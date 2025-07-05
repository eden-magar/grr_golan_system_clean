document.addEventListener('DOMContentLoaded', function() {
    // הוספת אפקטים אינטראקטיביים
    initCardEffects();
    initAccessibilityFeatures();
    
    console.log('מערכת ניהול רכבים - גרר גולן');
    console.log('© 2025 - מערכת מוכנה לשימוש');
});

function initCardEffects() {
    const cards = document.querySelectorAll('.system-card');
    
    cards.forEach(card => {
        // אפקט hover מתקדם
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
        
        // אפקט לחיצה
        card.addEventListener('mousedown', function() {
            this.style.transform = 'translateY(-4px) scale(0.98)';
        });
        
        card.addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        // אפקט פוקוס לנגישות
        card.addEventListener('focus', function() {
            this.style.outline = '3px solid rgba(49, 130, 206, 0.5)';
            this.style.outlineOffset = '4px';
        });
        
        card.addEventListener('blur', function() {
            this.style.outline = 'none';
        });
    });
}

function initAccessibilityFeatures() {
    // הוספת תמיכה בניווט מקלדת
    document.addEventListener('keydown', function(e) {
        // Alt + 1 למערכת בדיקת רכבים
        if (e.altKey && e.key === '1') {
            e.preventDefault();
            window.location.href = 'vehicle-lookup/';
        }
        
        // Alt + 2 לטופס גרירה
        if (e.altKey && e.key === '2') {
            e.preventDefault();
            window.location.href = 'towing-form/';
        }
    });
    
    // הוספת hints לניווט מקלדת
    const lookupCard = document.querySelector('.lookup-card');
    const towingCard = document.querySelector('.towing-card');
    
    if (lookupCard) {
        lookupCard.setAttribute('title', 'לחץ או Alt+1 לכניסה למערכת בדיקת רכבים');
    }
    
    if (towingCard) {
        towingCard.setAttribute('title', 'לחץ או Alt+2 לכניסה לטופס גרירה');
    }
}

// פונקציה לבדיקת זמינות המערכות (אופציונלי)
function checkSystemsAvailability() {
    const systems = [
        { name: 'vehicle-lookup', url: 'vehicle-lookup/' },
        { name: 'towing-form', url: 'towing-form/' }
    ];
    
    systems.forEach(system => {
        fetch(system.url, { method: 'HEAD' })
            .then(response => {
                if (response.ok) {
                    console.log(`✅ ${system.name} זמין`);
                } else {
                    console.warn(`⚠️ ${system.name} לא זמין`);
                }
            })
            .catch(error => {
                console.warn(`❌ שגיאה בבדיקת ${system.name}:`, error);
            });
    });
}

// הוספת אנימציה בטעינה
function animateOnLoad() {
    const cards = document.querySelectorAll('.system-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease-out';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 200);
    });
}

// הפעלת האנימציה בטעינה
setTimeout(animateOnLoad, 100);