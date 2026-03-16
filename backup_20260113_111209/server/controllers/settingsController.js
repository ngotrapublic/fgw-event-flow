const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../utils/encryption');

const SETTINGS_PATH = path.join(__dirname, '../config/systemSettings.json');

// Ensure default settings exist or migrate from ENV
const ensureSettingsFile = () => {
    let settings = {};
    if (fs.existsSync(SETTINGS_PATH)) {
        try {
            settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        } catch (error) {
            console.error('Error reading settings file:', error);
        }
    }

    // MIGRATION: Check if SMTP settings are missing, if so, try to migrate from ENV
    if (!settings.smtp) {
        console.log('[SETTINGS] SMTP config missing. Checking environment variables for migration...');
        if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
            console.log('[SETTINGS] Found ENV credentials. Migrating to secure storage...');
            settings.smtp = {
                host: 'smtp.office365.com', // Default to what was in emailService
                port: 587,
                user: process.env.EMAIL_USER,
                pass: encrypt(process.env.EMAIL_PASS), // ENCRYPTED!
                secure: false
            };

            // Save immediately
            try {
                fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
                console.log('[SETTINGS] Migration successful. Credentials encrypted and saved.');
            } catch (err) {
                console.error('[SETTINGS] Failed to save migrated settings:', err);
            }
        } else {
            // Default placeholder if nothing found
            settings.smtp = {
                host: 'smtp.gmail.com',
                port: 587,
                user: '',
                pass: '',
                secure: false
            };
        }
    }

    return settings;
};

// Initialize on load
let currentSettings = ensureSettingsFile();

const getSettings = (req, res) => {
    // Return settings but MASK the password
    // Use getSettingsInternal() to ensure we read the latest file state (important after migration)
    const freshSettings = getSettingsInternal();
    const safeSettings = JSON.parse(JSON.stringify(freshSettings));

    if (safeSettings.smtp && safeSettings.smtp.pass) {
        safeSettings.smtp.pass = '********'; // Masked
        safeSettings.smtp.isConfigured = true; // Flag to tell UI that a password exists
    }
    res.json(safeSettings);
};

// Internal use: Returns RAW settings (with encrypted password)
const getSettingsInternal = () => {
    // Reload to ensure freshness
    try {
        if (fs.existsSync(SETTINGS_PATH)) {
            return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        }
    } catch (e) { console.error(e); }
    return currentSettings;
};

// Helper to get DECRYPTED password for email service
const getDecryptedSmtpSettings = () => {
    const settings = getSettingsInternal();
    if (settings.smtp && settings.smtp.pass) {
        try {
            const decryptedPass = decrypt(settings.smtp.pass);
            return { ...settings.smtp, pass: decryptedPass };
        } catch (e) {
            console.error('Failed to decrypt SMTP password');
        }
    }
    return settings.smtp;
};

const updateSettings = (req, res) => {
    try {
        const newSettings = req.body;

        // Handle Password Update securely
        if (newSettings.smtp) {
            // If password is being updated (not masked)
            if (newSettings.smtp.pass && newSettings.smtp.pass !== '********') {
                newSettings.smtp.pass = encrypt(newSettings.smtp.pass);
            } else {
                // If password is masked '********', keep the OLD encrypted password
                newSettings.smtp.pass = currentSettings.smtp?.pass;
            }
        }

        // Merge with existing to prevent data loss
        const mergedSettings = { ...currentSettings, ...newSettings };

        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(mergedSettings, null, 2));
        currentSettings = mergedSettings; // Update memory cache

        res.json({ message: 'Settings saved successfully' });
    } catch (error) {
        console.error('Error saving settings:', error);
        res.status(500).json({ message: 'Failed to save settings' });
    }
};

module.exports = {
    getSettings,
    updateSettings,
    getSettingsInternal,
    getDecryptedSmtpSettings
};
