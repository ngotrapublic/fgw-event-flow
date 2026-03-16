const fs = require('fs');
const path = require('path');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateSampleEvent } = require('../utils/sampleData');
const templateRegistry = require('../templates/emailTemplateRegistry');

const SETTINGS_PATH = path.join(__dirname, '../config/systemSettings.json');

// Ensure default settings exist or migrate from ENV
const ensureSettingsFile = () => {
    let settings = {};
    let needsSave = false;

    if (fs.existsSync(SETTINGS_PATH)) {
        try {
            settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
        } catch (error) {
            console.error('Error reading settings file:', error);
        }
    }

    // MIGRATION: Remove unused email templates
    if (settings.templates) {
        const originalLength = settings.templates.length;
        settings.templates = settings.templates.filter(
            t => t.id !== 'approval' && t.id !== 'reject'
        );
        if (settings.templates.length < originalLength) {
            needsSave = true;
            console.log('[SETTINGS] Removed unused email templates (approval, reject)');
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
            needsSave = true;
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

    // Save if any migration occurred
    if (needsSave) {
        try {
            fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
            console.log('[SETTINGS] Migrations saved.');
        } catch (err) {
            console.error('[SETTINGS] Failed to save migrations:', err);
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

// 🎨 Get all available email templates
const getEmailTemplates = (req, res) => {
    try {
        const templateRegistry = require('../templates/emailTemplateRegistry');
        const templates = templateRegistry.getTemplateMetadata();
        res.json(templates);
    } catch (error) {
        console.error('Error getting email templates:', error);
        res.status(500).json({ message: 'Failed to load templates' });
    }
};

// 🎨 Assign template to notification type
const assignTemplate = (req, res) => {
    try {
        const { type } = req.params; // 'created', 'updated', 'reminder_1day', 'reminder_1hour'
        const { templateId } = req.body;

        // Validate template exists
        const templateRegistry = require('../templates/emailTemplateRegistry');
        if (!templateRegistry.isValidTemplate(templateId)) {
            return res.status(400).json({ message: 'Invalid template ID' });
        }

        // Load current settings
        const settings = getSettingsInternal();

        // Find template config for this type
        if (!settings.templates) {
            settings.templates = [];
        }

        let template = settings.templates.find(t => t.id === type);

        // If template config doesn't exist, create it
        if (!template) {
            template = {
                id: type,
                subject: type === 'created' ? 'Sự kiện mới: {{eventName}}' :
                    type === 'updated' ? 'Cập nhật: {{eventName}}' :
                        type === 'reminder_1day' ? 'Nhắc nhở: {{eventName}} - Ngày mai' :
                            'Sắp diễn ra: {{eventName}}',
                emailTemplate: templateId
            };
            settings.templates.push(template);
        } else {
            // Update existing
            template.emailTemplate = templateId;
        }

        // Save to file
        fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
        currentSettings = settings; // Update memory cache

        console.log(`[SETTINGS] Assigned template "${templateId}" to type "${type}"`);
        res.json({ success: true, message: 'Template assigned successfully' });

    } catch (error) {
        console.error('Error assigning template:', error);
        res.status(500).json({ message: 'Failed to assign template' });
    }
};

// Email Preview Endpoint
const previewEmail = async (req, res) => {
    try {
        const { type, design } = req.query;

        // Load settings to get template assignment
        const settings = getSettingsInternal();

        // Determine which template to use:
        // 1. If design param provided (from gallery) → use it for preview
        // 2. Else load saved template assignment for this type
        let templateId;

        if (design) {
            // Direct preview from gallery
            templateId = design;
            console.log(`[PREVIEW] Using template from query: ${templateId}`);
        } else if (type && settings.templates) { // Check settings.templates array
            const assignedTemplate = settings.templates.find(t => t.id === type);
            if (assignedTemplate) {
                templateId = assignedTemplate.emailTemplate || 'minimalist-premium';
                console.log(`[PREVIEW] Using saved template for ${type}: ${templateId}`);
            } else {
                templateId = 'minimalist-premium';
                console.log(`[PREVIEW] No specific template assigned for ${type}, using default: ${templateId}`);
            }
        } else {
            // Fallback to default
            templateId = 'minimalist-premium';
            console.log(`[PREVIEW] Using default template: ${templateId}`);
        }

        // Generate sample event data
        const sampleEvent = generateSampleEvent();

        // Prepare email body content
        const bodyContent = {
            department: sampleEvent.department.name,
            eventName: sampleEvent.title,
            eventDate: sampleEvent.date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }),
            dayOfWeek: sampleEvent.date.toLocaleDateString('en-US', { weekday: 'long' }),
            timeString: `${sampleEvent.time} - ${sampleEvent.endTime}`,
            location: sampleEvent.location,
            registrantEmail: sampleEvent.contactEmail,
            notes: sampleEvent.description,
            facilitiesChecklist: sampleEvent.facilitiesChecklist || [],
            facilitiesSummary: sampleEvent.facilitiesSummary || ''
        };

        // Render email HTML with selected template
        const template = templateRegistry.getTemplate(templateId);

        if (!template || !template.renderFunction) {
            throw new Error(`Template "${templateId}" not found or has no render function`);
        }

        const html = template.renderFunction(sampleEvent.title, bodyContent);

        // Return HTML for iframe display
        res.set('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('[PREVIEW] Error generating email preview:', error);
        res.status(500).send(`
            <div style="font-family: sans-serif; padding: 40px; text-align: center;">
                <h2 style="color: #ef4444;">⚠️ Preview Error</h2>
                <p style="color: #64748b;">${error.message}</p>
                <p style="font-size: 12px; color: #94a3b8; margin-top: 20px;">Please try again or select a different template.</p>
            </div>
        `);
    }
};

module.exports = {
    getSettings,
    updateSettings,
    getSettingsInternal,
    getDecryptedSmtpSettings,
    getEmailTemplates,
    assignTemplate,
    previewEmail
};
