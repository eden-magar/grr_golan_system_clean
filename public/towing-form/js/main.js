/**
 * Main Application Controller
 * Orchestrates all modules and manages application lifecycle
 */

class TowingFormApp {
    constructor() {
        this.isInitialized = false;
        this.managers = {
            vehicle: null,
            pricing: null,
            address: null,
            form: null,
            api: null
        };
        
        this.initializationOrder = [
            'api',
            'address', 
            'vehicle',
            'pricing',
            'form'
        ];
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing Towing Form Application...');
            
            // Check if already initialized
            if (this.isInitialized) {
                console.warn('Application already initialized');
                return;
            }

            // Wait for DOM to be ready
            await this.waitForDOM();
            
            // Check authentication first
            const authResult = await this.checkAuthentication();
            if (!authResult.success) {
                this.redirectToLogin();
                return;
            }

            // Initialize managers in order
            await this.initializeManagers();
            
            // Setup global event handlers
            this.setupGlobalHandlers();
            
            // Setup error handling
            this.setupErrorHandling();
            
            // Setup CSS animations
            this.setupAnimations();
            
            // Mark as initialized
            this.isInitialized = true;
            
            console.log('✅ Application initialized successfully');
            
            // Show welcome message for debug
            if (this.isDevelopmentMode()) {
                console.log('🔧 Development mode - all modules loaded');
            }

        } catch (error) {
            console.error('❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }

    /**
     * Wait for DOM to be ready
     */
    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    /**
     * Check user authentication
     */
    async checkAuthentication() {
        try {
            const userEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);
            
            if (!userEmail) {
                return { success: false, reason: 'No user email found' };
            }

            // Verify with server
            const result = await apiManager.checkAuth(userEmail);

            if (window.apiManager) {
                window.apiManager.submitTowingOrder =
                window.apiManager.submitTowingOrder ||
                window.apiManager.sendOrder ||
                window.apiManager.createCalendarEvent;
            }
            
            if (!result.success) {
                localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
                localStorage.removeItem(STORAGE_KEYS.USER_COMPANY);
                localStorage.removeItem(STORAGE_KEYS.USER_DEPARTMENT);
                return { success: false, reason: 'Authentication failed' };
            }

            return { success: true };

        } catch (error) {
            console.error('Authentication check failed:', error);
            return { success: false, reason: 'Network error' };
        }
    }

    /**
     * Redirect to login page
     */
    redirectToLogin() {
        showNotification('נדרשת הזדהות מחדש', 'warning');
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 2000);
    }

    /**
     * Initialize all managers in the correct order
     */
    async initializeManagers() {
        for (const managerName of this.initializationOrder) {
            try {
                console.log(`🔄 Initializing ${managerName}Manager...`);
                
                switch (managerName) {
                    case 'api':
                        this.managers.api = apiManager;
                        window.apiManager = window.apiManager || apiManager;

                        // שם פעולה אחיד לשליחה
                        window.apiManager.submitTowingOrder =
                            window.apiManager.submitTowingOrder ||
                            window.apiManager.submitTowingForm  || // אם יש
                            window.apiManager.sendOrder         ||
                            window.apiManager.createCalendarEvent;

                        // שמרי גם אליאס הפוך למקומות שקוראים ל-submitTowingForm
                        window.apiManager.submitTowingForm =
                            window.apiManager.submitTowingForm ||
                            window.apiManager.submitTowingOrder;

                        break;
                        break;
                        
                    case 'address':
                        this.managers.address = addressManager;
                        await this.waitForGoogleMaps();
                        this.managers.address.init();
                        break;
                        
                    case 'vehicle':
                        this.managers.vehicle = vehicleManager;
                        this.managers.vehicle.init();
                        break;
                        
                    case 'pricing':
                        this.managers.pricing = pricingManager;
                        this.managers.pricing.init();

                        // ודאי שיש מופע גלובלי
                        window.pricingManager = window.pricingManager || this.managers.pricing;

                        const pm = window.pricingManager;
                        window.getRecommendedTier = pm.getRecommendedTier?.bind(pm) || (() => 'regular');
                        window.isManualMode       = pm.isManualMode?.bind(pm)       || (() => false);
                        window.getEffectiveAmount = pm.getEffectiveAmount?.bind(pm) || (() => ({ tier: 'regular', amount: 0 }));
                        break;
                        
                    case 'form':
                        this.managers.form = new FormManager();
                        this.managers.form.init();
                        break;
                }
                
                console.log(`✅ ${managerName}Manager initialized`);
                
            } catch (error) {
                console.error(`❌ Failed to initialize ${managerName}Manager:`, error);
                throw new Error(`Manager initialization failed: ${managerName}`);
            }
        }
    }

    /**
     * Wait for Google Maps to load
     */
    async waitForGoogleMaps() {
        return new Promise((resolve) => {
            if (window.google && window.google.maps) {
                resolve();
                return;
            }

            const checkInterval = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);

            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('Google Maps loading timeout - continuing without maps');
                resolve();
            }, 10000);
        });
    }

    /**
     * Setup global event handlers
     */
    setupGlobalHandlers() {
        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+S to save form data
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveFormDraft();
            }
            
            // Escape to close modals
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });

        // Handle browser refresh/close
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges()) {
                const message = 'יש לך שינויים שלא נשמרו. האם אתה בטוח שברצונך לעזוב?';
                e.returnValue = message;
                return message;
            }
        });

        // Handle online/offline status
        window.addEventListener('online', () => {
            showNotification('חיבור לאינטרנט הוחזר', 'success');
            this.syncPendingData();
        });

        window.addEventListener('offline', () => {
            showNotification('אין חיבור לאינטרנט', 'warning');
        });

        // Handle focus/blur for better UX
        window.addEventListener('focus', () => {
            this.refreshDataIfNeeded();
        });
    }

    /**
     * Setup global error handling
     */
    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (e) => {
            console.error('Global error:', e.error);
            this.handleGlobalError(e.error);
        });

        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            console.error('Unhandled promise rejection:', e.reason);
            this.handleGlobalError(e.reason);
        });
    }

    /**
     * Setup CSS animations
     */
    setupAnimations() {
        // Add CSS for slide animations
        if (!document.getElementById('main-app-styles')) {
            const style = document.createElement('style');
            style.id = 'main-app-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(20px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(-20px); opacity: 0; }
                }
                
                .form-section {
                    animation: slideIn 0.3s ease;
                }
                
                .notification {
                    animation: slideIn 0.3s ease;
                }
                
                .loading-spinner {
                    border: 3px solid #f3f4f6;
                    border-top: 3px solid #3b82f6;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    animation: spin 1s linear infinite;
                    display: inline-block;
                    margin-right: 8px;
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Handle global errors
     */
    handleGlobalError(error) {
        // Don't spam error messages
        if (this.lastErrorTime && Date.now() - this.lastErrorTime < 5000) {
            return;
        }
        this.lastErrorTime = Date.now();

        // Filter out common non-critical errors
        const message = error?.message || error?.toString() || 'שגיאה לא צפויה';
        
        if (message.includes('ResizeObserver') || 
            message.includes('Non-Error promise rejection')) {
            return; // Ignore these
        }

        showNotification('אירעה שגיאה במערכת. אנא רענן את הדף', 'error');
    }

    /**
     * Handle initialization errors
     */
    handleInitializationError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #fee2e2;
            border: 2px solid #fca5a5;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            z-index: 10000;
            max-width: 400px;
        `;
        
        errorDiv.innerHTML = `
            <h3 style="margin-top: 0; color: #991b1b;">שגיאה באתחול המערכת</h3>
            <p style="color: #7f1d1d;">לא ניתן לטעון את המערכת כראוי</p>
            <button onclick="location.reload()" style="
                background: #dc2626; 
                color: white; 
                border: none; 
                padding: 8px 16px; 
                border-radius: 4px; 
                cursor: pointer;
            ">רענן דף</button>
        `;
        
        document.body.appendChild(errorDiv);
    }

    /**
     * Save form draft to localStorage
     */
    saveFormDraft() {
        try {
            if (!this.managers.form?.elements.mainForm) return;

            const formData = new FormData(this.managers.form.elements.mainForm);
            const data = {};
            
            for (let [key, value] of formData.entries()) {
                data[key] = value;
            }
            
            localStorage.setItem('formDraft', JSON.stringify({
                data: data,
                timestamp: Date.now()
            }));
            
            showNotification('טופס נשמר כטיוטה', 'success', 2000);
        } catch (error) {
            console.error('Failed to save draft:', error);
        }
    }

    /**
     * Load form draft from localStorage
     */
    loadFormDraft() {
        try {
            const draft = localStorage.getItem('formDraft');
            if (!draft) return false;

            const { data, timestamp } = JSON.parse(draft);
            
            // Check if draft is not too old (24 hours)
            if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
                localStorage.removeItem('formDraft');
                return false;
            }

            // Fill form with draft data
            Object.entries(data).forEach(([key, value]) => {
                const field = document.getElementById(key);
                if (field) {
                    field.value = value;
                }
            });

            showNotification('טיוטה נטענה', 'info', 3000);
            return true;

        } catch (error) {
            console.error('Failed to load draft:', error);
            return false;
        }
    }

    /**
     * Check if form has unsaved changes
     */
    hasUnsavedChanges() {
        if (!this.managers.form?.elements.mainForm) return false;

        const formData = new FormData(this.managers.form.elements.mainForm);
        for (let [key, value] of formData.entries()) {
            if (value && value.trim()) {
                return true;
            }
        }
        return false;
    }

    /**
     * Close all open modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.remove();
        });
    }

    /**
     * Sync pending data when back online
     */
    async syncPendingData() {
        const pending = JSON.parse(localStorage.getItem('pendingSubmissions') || '[]');
        if (!pending.length) return;

        const sender =
            (this.managers.api && (this.managers.api.submitTowingOrder || this.managers.api.submitTowingForm)) ||
            (window.apiManager && (window.apiManager.submitTowingOrder || window.apiManager.submitTowingForm));

        for (const s of pending) {
            try {
            if (typeof sender === 'function') {
                await sender(s.data);
                console.log('Synced pending submission:', s.id);
            } else {
                console.warn('No submit function available for syncing');
                break;
            }
            } catch (err) {
            console.error('Failed to sync submission:', err);
            }
        }

        localStorage.removeItem('pendingSubmissions');
        showNotification('נתונים ממתינים נשלחו בהצלחה', 'success');
        }


    /**
     * Refresh data if needed (when window regains focus)
     */
    refreshDataIfNeeded() {
        const lastRefresh = parseInt(localStorage.getItem('lastRefresh') || '0');
        const now = Date.now();
        
        // Refresh every 30 minutes
        if (now - lastRefresh > 30 * 60 * 1000) {
            this.managers.vehicle?.searchCache.clear();
            localStorage.setItem('lastRefresh', now.toString());
        }
    }

    /**
     * Check if running in development mode
     */
    isDevelopmentMode() {
        return window.location.hostname === 'localhost' || 
               window.location.hostname === '127.0.0.1' ||
               window.location.search.includes('debug=true');
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            managers: Object.keys(this.managers).reduce((acc, key) => {
                acc[key] = !!this.managers[key];
                return acc;
            }, {}),
            online: navigator.onLine,
            hasDraft: !!localStorage.getItem('formDraft')
        };
    }

    /**
     * Destroy application and clean up
     */
    destroy() {
        try {
            // Destroy all managers
            Object.values(this.managers).forEach(manager => {
                if (manager && typeof manager.destroy === 'function') {
                    manager.destroy();
                }
            });

            // Remove global listeners
            this.closeAllModals();
            
            // Clear state
            this.managers = {};
            this.isInitialized = false;
            
            console.log('Application destroyed');
        } catch (error) {
            console.error('Error during cleanup:', error);
        }
    }
}

// Create global application instance
const towingApp = new TowingFormApp();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    towingApp.init();
});

// Expose for debugging
if (window.location.search.includes('debug=true')) {
    window.towingApp = towingApp;
    window.managers = {
        vehicle: vehicleManager,
        pricing: pricingManager,
        address: addressManager,
        api: apiManager
    };
}

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TowingFormApp;
}