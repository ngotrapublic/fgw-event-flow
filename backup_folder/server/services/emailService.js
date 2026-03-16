const nodemailer = require('nodemailer');
const { departmentsCollection } = require('../config/firebase');
const { getSettingsInternal, getDecryptedSmtpSettings } = require('../controllers/settingsController');

class EmailService {
    constructor() {
        this.transporter = null;
    }

    // Create transporter on the fly to ensure we use latest settings
    createTransporter() {
        const smtpSettings = getDecryptedSmtpSettings();

        // Fallback to Env if settings fail (Safety Net, though Migration should handle this)
        if (!smtpSettings || !smtpSettings.user) {
            console.log('[EMAIL] Using fallback ENV credentials');
            return nodemailer.createTransport({
                host: 'smtp.office365.com',
                port: 587,
                secure: false,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                },
                tls: { ciphers: 'SSLv3', rejectUnauthorized: false }
            });
        }

        console.log(`[EMAIL] Using Custom SMTP: ${smtpSettings.host}`);
        return nodemailer.createTransport({
            host: smtpSettings.host,
            port: parseInt(smtpSettings.port) || 587,
            secure: smtpSettings.secure || false,
            auth: {
                user: smtpSettings.user,
                pass: smtpSettings.pass
            },
            tls: {
                ciphers: 'SSLv3', // Compatibility
                rejectUnauthorized: false // Often needed for custom SMTPs
            }
        });
    }

    async send(recipients, subject, htmlContent) {
        // Global Switch Check
        const settings = getSettingsInternal();
        if (!settings.channels?.email) {
            console.log(`[EMAIL SERVICE] Email channel is disabled globally. Skipping send.`);
            return;
        }

        console.log(`\n[EMAIL SERVICE] Sending to: ${recipients.join(', ')}...`);

        // Re-create transporter to get fresh settings
        this.transporter = this.createTransporter();

        // Get correct FROM address
        const smtpSettings = getDecryptedSmtpSettings();
        const fromAddress = smtpSettings?.user || process.env.EMAIL_USER;

        const mailOptions = {
            from: `"Event Management System" <${fromAddress}>`,
            to: recipients,
            subject: subject,
            html: htmlContent
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EMAIL SERVICE] Email sent: ${info.response}`);
            return info;
        } catch (error) {
            console.error(`[EMAIL SERVICE] Error sending email:`, error);
            throw error;
        }
    }

    // ✅ NEW: Ticket Style Template
    getTicketTemplate(title, bodyContent, themeColor = '#4f46e5') {
        // Equipment Labels Mapping
        const EQUIPMENT_LABELS = {
            'loa': 'Loa / Âm thanh',
            'mic': 'Micro',
            'led': 'Màn hình LED',
            'ban': 'Bàn',
            'ghe': 'Ghế',
            'tivi': 'Tivi',
            'standee': 'Standee',
            'anhsang': 'Ánh sáng',
            'nuoc': 'Nước suối / Teabreak',
            'khac': 'Khác'
        };

        // Helper to generate Facilities HTML
        const getFacilitiesHtml = () => {
            const checklist = bodyContent.facilitiesChecklist;
            // Fallback to summary string if checklist is missing
            if (!checklist) return (bodyContent.facilitiesSummary || 'None').replace(/\n/g, '<br>');

            const locations = Array.isArray(bodyContent.location)
                ? bodyContent.location
                : (bodyContent.location ? [bodyContent.location] : []);

            const selectedFacilities = Object.entries(checklist).filter(([_, v]) => v?.checked);

            if (selectedFacilities.length === 0) return 'None';

            // If single location or no location, just show list
            if (locations.length <= 1) {
                return selectedFacilities.map(([key, val]) => {
                    const label = EQUIPMENT_LABELS[key] || key;
                    return `<div style="margin-bottom: 2px;">• ${label}: <strong>x${val.quantity}</strong></div>`;
                }).join('');
            }

            // Group by location
            let html = '';
            let hasDistributedItems = false;

            locations.forEach(loc => {
                const locItems = selectedFacilities.filter(([_, val]) => {
                    return val.distribution && val.distribution[loc] > 0;
                });

                if (locItems.length > 0) {
                    hasDistributedItems = true;
                    html += `<div style="margin-bottom: 12px;">
                        <div style="font-weight: 700; color: #334155; font-size: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; text-transform: uppercase;">📍 ${loc}</div>`;

                    locItems.forEach(([key, val]) => {
                        const qty = val.distribution[loc];
                        const label = EQUIPMENT_LABELS[key] || key;
                        html += `<div style="padding-left: 8px; font-size: 13px; color: #475569; margin-bottom: 2px;">• ${label}: <strong style="color: #0f172a;">x${qty}</strong></div>`;
                    });
                    html += `</div>`;
                }
            });

            // Fallback if distribution logic didn't catch anything (e.g. data mismatch)
            if (!hasDistributedItems) {
                return selectedFacilities.map(([key, val]) => {
                    const label = EQUIPMENT_LABELS[key] || key;
                    return `<div style="margin-bottom: 2px;">• ${label}: <strong>x${val.quantity}</strong></div>`;
                }).join('');
            }

            return html;
        };

        const facilitiesHtml = getFacilitiesHtml();

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f0f2f5; }
        .wrapper { width: 100%; table-layout: fixed; background-color: #f0f2f5; padding-bottom: 40px; }
        .webkit { max-width: 600px; margin: 0 auto; }
        .outer { margin: 0 auto; width: 100%; max-width: 600px; }
        .ticket-container { background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.1); margin-top: 20px; }
        .header { background: linear-gradient(135deg, ${themeColor}, #7c3aed); padding: 30px 20px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; }
        .status-badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; margin-top: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .content { padding: 30px; }
        .event-title { font-size: 24px; font-weight: 800; color: #1e293b; margin: 0 0 5px 0; line-height: 1.2; }
        .dept-badge { display: inline-block; background-color: #eef2ff; color: #4f46e5; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 15px; }
        .grid-table { width: 100%; border-collapse: separate; border-spacing: 0 10px; margin-top: 10px; }
        .grid-cell { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px; width: 48%; vertical-align: top; }
        .label { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
        .value { font-size: 14px; font-weight: 600; color: #334155; display: block; }
        .divider { border-top: 2px dashed #e2e8f0; margin: 25px 0; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0; }
        .barcode { font-family: 'Courier New', monospace; font-size: 24px; letter-spacing: 4px; color: #94a3b8; opacity: 0.5; font-weight: bold; transform: scaleY(1.5); display: inline-block; margin-bottom: 10px; }
        .btn { display: inline-block; background-color: ${themeColor}; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 10px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2); }
    </style>
</head>
<body>
    <center class="wrapper">
        <div class="webkit">
            <table class="outer" align="center">
                <tr>
                    <td>
                        <div class="ticket-container">
                            <!-- Header -->
                            <div class="header">
                                <h1>${title}</h1>
                                <div class="status-badge">Confirmed</div>
                            </div>

                            <!-- Body -->
                            <div class="content">
                                <div class="dept-badge">${bodyContent.department}</div>
                                <h2 class="event-title">${bodyContent.eventName}</h2>
                                <div style="color: #64748b; font-size: 14px; margin-bottom: 20px;">
                                    Registered by: <a href="mailto:${bodyContent.registrantEmail}" style="color: ${themeColor}; text-decoration: none;">${bodyContent.registrantEmail}</a>
                                </div>

                                <!-- Grid Info -->
                                <table class="grid-table">
                                    <tr>
                                        <td class="grid-cell" style="margin-right: 2%;">
                                            <span class="label">DATE</span>
                                            <span class="value">${bodyContent.eventDate}</span>
                                            <span style="font-size: 12px; color: #94a3b8;">${bodyContent.dayOfWeek || ''}</span>
                                        </td>
                                        <td style="width: 4%;"></td>
                                        <td class="grid-cell">
                                            <span class="label">TIME</span>
                                            <span class="value">${bodyContent.timeString}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td colspan="3" class="grid-cell" style="width: 100%; margin-top: 10px;">
                                            <span class="label">LOCATION</span>
                                            <span class="value">${Array.isArray(bodyContent.location) ? bodyContent.location.join(', ') : bodyContent.location}</span>
                                        </td>
                                    </tr>
                                </table>

                                <!-- Dashed Line -->
                                <div class="divider"></div>

                                <!-- Extra Details -->
                                    <div style="font-size: 13px; color: #9a3412; margin-top: 5px;">
                                        ${facilitiesHtml}
                                    </div>
                                </div>

                                <!-- Logistics & Construction Details -->
                                ${(bodyContent.contractorName || bodyContent.constructionTime || (bodyContent.equipmentInOut && bodyContent.equipmentInOut.length > 0) || (bodyContent.constructionPersonnel && bodyContent.constructionPersonnel.length > 0)) ? `
                                <div style="margin-top: 20px;">
                                    <div style="background-color: #f1f5f9; padding: 10px 15px; border-radius: 8px 8px 0 0; border-bottom: 2px solid #cbd5e1;">
                                        <span class="label" style="color: #334155; font-size: 12px;">LOGISTICS & CONSTRUCTION REGISTRATION</span>
                                    </div>
                                    <div style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 15px;">
                                        
                                        ${(bodyContent.contractorName || bodyContent.constructionTime) ? `
                                        <div style="margin-bottom: 15px;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase;">Contractor & Construction (Thi công)</div>
                                            ${bodyContent.contractorName ? `<div style="font-size: 14px; color: #334155; font-weight: 600;">${bodyContent.contractorName}</div>` : ''}
                                            ${bodyContent.constructionTime ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;"><strong>Time:</strong> ${bodyContent.constructionTime}</div>` : ''}
                                            ${bodyContent.constructionContent ? `<div style="font-size: 13px; color: #475569; margin-top: 2px;"><strong>Content:</strong> ${bodyContent.constructionContent}</div>` : ''}
                                        </div>` : ''}

                                        <!-- Equipment Table -->
                                        ${(bodyContent.equipmentInOut && bodyContent.equipmentInOut.length > 0 && bodyContent.equipmentInOut[0].name) ? `
                                        <div style="margin-bottom: 15px;">
                                            <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Equipment In/Out (Vật dụng mang vào)</div>
                                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                                <tr style="background-color: #f8fafc;">
                                                    <th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0; color: #475569;">Item Name</th>
                                                    <th style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; color: #475569; width: 60px;">Qty</th>
                                                </tr>
                                                ${bodyContent.equipmentInOut.map(item => item.name ? `
                                                <tr>
                                                    <td style="padding: 8px; border: 1px solid #e2e8f0; color: #334155;">${item.name}</td>
                                                    <td style="text-align: center; padding: 8px; border: 1px solid #e2e8f0; color: #334155;">${item.quantity || 1}</td>
                                                </tr>` : '').join('')}
                                            </table>
                                        </div>` : ''}

                                        <!-- Personnel Table -->
                                        ${(bodyContent.constructionPersonnel && bodyContent.constructionPersonnel.length > 0 && bodyContent.constructionPersonnel[0].name) ? `
                                        <div>
                                            <div style="font-size: 11px; color: #64748b; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Construction Personnel (Nhân sự thi công)</div>
                                            <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                                                <tr style="background-color: #f8fafc;">
                                                    <th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0; color: #475569;">Full Name</th>
                                                    <th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0; color: #475569;">Phone</th>
                                                    <th style="text-align: left; padding: 8px; border: 1px solid #e2e8f0; color: #475569;">ID Card (CCCD)</th>
                                                </tr>
                                                ${bodyContent.constructionPersonnel.map(p => p.name ? `
                                                <tr>
                                                    <td style="padding: 8px; border: 1px solid #e2e8f0; color: #334155;">${p.name}</td>
                                                    <td style="padding: 8px; border: 1px solid #e2e8f0; color: #334155;">${p.phone || '-'}</td>
                                                    <td style="padding: 8px; border: 1px solid #e2e8f0; color: #334155;">${p.idCard || '-'}</td>
                                                </tr>` : '').join('')}
                                            </table>
                                        </div>` : ''}
                                    </div>
                                </div>` : ''}

                                <div style="font-size: 13px; color: #64748b; line-height: 1.5;">
                                    <strong>Notes:</strong> ${bodyContent.notes || 'None'}
                                </div>
                            </div>

                            <!-- Footer -->
                            <div class="footer">
                                <div class="barcode">||| || ||| |||| ||</div>
                                <div style="font-size: 10px; color: #94a3b8; letter-spacing: 2px; margin-bottom: 15px;">E-TICKET ID: ${Date.now().toString().slice(-8)}</div>
                                <a href="#" class="btn">View in Dashboard</a>
                            </div>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #94a3b8;">
                            © ${new Date().getFullYear()} EventFlow Management System
                        </div>
                    </td>
                </tr>
            </table>
        </div>
    </center>
</body>
</html>`;
    }

    async getRecipients(event) {
        const recipients = [];
        try {
            const snapshot = await departmentsCollection.where('name', '==', event.department).get();
            if (!snapshot.empty) {
                const dept = snapshot.docs[0].data();

                // 1. Add Department Default Email
                if (dept.defaultEmail) {
                    recipients.push(dept.defaultEmail);
                }
                // Fallback: If no default set, maybe send to all? Or just leave it? 
                // User's request implies "Default Email", so we prioritized that.
                // If we want to keep backward compatibility:
                else if (dept.emails && dept.emails.length > 0) {
                    // If no default is set, send to the first one or all? 
                    // Let's send to all if no default is specified, to be safe.
                    recipients.push(...dept.emails);
                }
            }

            // 2. Add Event Creator / Registrant
            if (event.registrantEmail) {
                recipients.push(event.registrantEmail);
            }

            // 3. Add Specific Contact Email (if provided and different)
            if (event.contactEmail) {
                recipients.push(event.contactEmail);
            }

        } catch (error) {
            console.error('Error getting recipients:', error);
        }

        // Deduplicate
        return [...new Set(recipients.filter(email => email))]; // filter(email) removes empty strings/nulls
    }

    async sendEventNotification(event, type = 'created') {
        const settings = getSettingsInternal();

        // Check if specific template type is active
        // Types: 'created' (welcome), 'updated', 'reminder_1day' (reminder)
        let templateTypeKey = 'welcome';
        if (type === 'updated') templateTypeKey = 'updated';
        if (type === 'reminder_1day') templateTypeKey = 'reminder';

        const templateSetting = settings.templates?.find(t => t.id === templateTypeKey);

        if (templateSetting && !templateSetting.active) {
            console.log(`[EMAIL SERVICE] Notification type '${templateTypeKey}' is disabled in settings. Skipping.`);
            return;
        }

        const recipients = await this.getRecipients(event);
        if (recipients.length === 0) return;

        const timeString = (event.startTime && event.endTime)
            ? `${event.startTime} - ${event.endTime}`
            : event.eventSession;

        const eventData = {
            ...event,
            timeString
        };

        let subject = '';
        let htmlContent = '';

        // Use custom subject if available, replacing placeholders
        const getSubject = (standardSubject) => {
            if (templateSetting && templateSetting.subject) {
                return templateSetting.subject.replace('{{eventName}}', event.eventName);
            }
            return standardSubject;
        };

        if (type === 'created') {
            subject = getSubject(`🎟️ Ticket Confirmed: ${event.eventName}`);
            htmlContent = this.getTicketTemplate('Event Registration', eventData, '#4f46e5');
        } else {
            let title = 'Event Notification';
            let color = '#4f46e5';

            if (type === 'updated') {
                title = 'Event Updated';
                color = '#f59e0b'; // Amber
                subject = getSubject(`⚠️ Update: ${event.eventName}`);
            } else if (type === 'reminder_1day') {
                title = 'Event Reminder';
                color = '#0ea5e9'; // Sky Blue
                subject = getSubject(`⏰ Reminder: ${event.eventName}`);
            }

            htmlContent = this.getTicketTemplate(title, eventData, color);
        }

        return this.send(recipients, subject, htmlContent);
    }

    detectChanges(oldEvent, newEvent) {
        const changes = [];
        const fields = [
            { key: 'eventName', label: 'Event Name' },
            { key: 'eventDate', label: 'Date' },
            { key: 'startTime', label: 'Start Time' },
            { key: 'endTime', label: 'End Time' },
            { key: 'location', label: 'Location' },
            { key: 'facilitiesSummary', label: 'Facilities' },
            { key: 'notes', label: 'Notes' },
            { key: 'contractorName', label: 'Contractor Name' },
            { key: 'constructionContent', label: 'Construction Content' },
            { key: 'constructionTime', label: 'Construction Time' }
        ];

        fields.forEach(field => {
            if (oldEvent[field.key] !== newEvent[field.key]) {
                changes.push(`${field.label}: "${oldEvent[field.key] || ''}" -> "${newEvent[field.key] || ''}"`);
            }
        });

        // Deep compare for arrays
        if (JSON.stringify(oldEvent.equipmentInOut) !== JSON.stringify(newEvent.equipmentInOut)) {
            changes.push('Equipment In/Out list updated');
        }

        if (JSON.stringify(oldEvent.constructionPersonnel) !== JSON.stringify(newEvent.constructionPersonnel)) {
            changes.push('Construction Personnel list updated');
        }

        return changes;
    }
}

module.exports = new EmailService();
