const nodemailer = require('nodemailer');
const { departmentsCollection } = require('../config/firebase');
const { getSettingsInternal, getDecryptedSmtpSettings } = require('../controllers/settingsController');
const templateRegistry = require('../templates/emailTemplateRegistry');
const calendarService = require('./calendarService'); // ✅ NEW

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

    async send(recipients, subject, htmlContent, attachments = []) {
        // Global Switch Check
        const settings = getSettingsInternal();
        if (!settings.channels?.email) {
            console.log(`[EMAIL SERVICE] Email channel is disabled globally. Skipping send.`);
            return;
        }

        console.log(`[EMAIL SERVICE] Email channel enabled. Proceeding with send...`);

        this.transporter = this.createTransporter();

        const mailOptions = {
            from: `"EventFlow Management" <${this.transporter.options.auth.user}>`,
            to: recipients.join(','),
            subject,
            html: htmlContent,
            attachments // ✅ NEW: Support for attachments
        };

        try {
            console.log(`[EMAIL SERVICE] Sending to: ${recipients.join(', ')}`);
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`[EMAIL SERVICE] Email sent: ${info.response}`);
            return info;
        } catch (error) {
            console.error(`[EMAIL SERVICE] Error sending email:`, error);
            throw error;
        }
    }

    // Convert facilitiesChecklist from object to array of strings
    convertFacilitiesToArray(facilitiesObj) {
        console.log('[FACILITIES DEBUG] Input type:', typeof facilitiesObj);
        console.log('[FACILITIES DEBUG] Input value:', JSON.stringify(facilitiesObj));

        if (!facilitiesObj || typeof facilitiesObj !== 'object') {
            console.log('[FACILITIES DEBUG] Returning empty - invalid input');
            return [];
        }

        // Convert object {projector: {checked: true, quantity: 2, label: "Projector"}}
        // To array ["Projector (2)", "Sound System (1)", ...]
        const result = [];

        Object.entries(facilitiesObj).forEach(([key, value]) => {
            console.log(`[FACILITIES DEBUG] Processing: ${key}`, value);

            // Only include checked items
            if (value && value.checked === true) {
                const label = value.label || key;
                const quantity = value.quantity || '';

                // Format: "Projector (2)" or just "Projector" if no quantity
                if (quantity && quantity > 0) {
                    result.push(`${label} (${quantity})`);
                    console.log(`[FACILITIES DEBUG] Added with quantity: ${label} (${quantity})`);
                } else {
                    result.push(label);
                    console.log(`[FACILITIES DEBUG] Added without quantity: ${label}`);
                }
            } else {
                console.log(`[FACILITIES DEBUG] Skipped (not checked): ${key}`);
            }
        });

        console.log('[FACILITIES DEBUG] Final result:', result);
        console.log('[FACILITIES DEBUG] Result count:', result.length);
        return result;
    }

    // Helper: Generate robust time string
    getTimeString(event) {
        // Clean and validate time values (protect against "undefined" strings)
        const cleanTime = (time) => {
            if (!time || time === 'undefined' || time === 'null' || time === '') return null;
            const cleaned = String(time).trim();
            return (cleaned && cleaned !== 'undefined' && cleaned !== 'null') ? cleaned : null;
        };

        const start = cleanTime(event.startTime);
        const end = cleanTime(event.endTime);
        const session = cleanTime(event.eventSession);

        console.log('[EMAIL DEBUG] Time fields after cleaning:', { start, end, session });

        // Priority 1: Full time range
        if (start && end) {
            return `${start} - ${end}`;
        }

        // Priority 2: Session name
        if (session) {
            return session;
        }

        // Priority 3: Partial time
        if (start) return `From ${start}`;
        if (end) return `Until ${end}`;

        // Priority 4: All day check
        if (event.isAllDay === true) {
            return 'All Day Event';
        }

        // Fallback
        return 'Time Not Specified';
    }

    // Send Event Notification (called by emailQueueWorker)
    async sendEventNotification(event, type = 'created') {
        console.log(`[EMAIL SERVICE] Preparing ${type} notification for event: ${event.eventName}`);

        // DEBUG: Log ALL time-related fields
        console.log('[EMAIL DEBUG] Raw event time fields:', {
            startTime: event.startTime,
            endTime: event.endTime,
            eventSession: event.eventSession,
            isAllDay: event.isAllDay,
            startTimeType: typeof event.startTime,
            endTimeType: typeof event.endTime
        });

        // Get recipients
        const recipients = await this.getRecipients(event);
        if (recipients.length === 0) {
            console.log('[EMAIL SERVICE] No recipients found, skipping email');
            return;
        }

        // Get subject from settings
        const settings = getSettingsInternal();
        const template = settings.templates?.find(t => t.id === type);
        let subject = template?.subject || `Event ${type}`;

        // Replace variables in subject
        subject = subject.replace(/{{eventName}}/g, event.eventName);
        subject = subject.replace(/{{department}}/g, event.department);

        // Prepare body content with robust time handling
        const timeString = this.getTimeString(event);
        console.log('[EMAIL DEBUG] Generated timeString:', timeString);

        const bodyContent = {
            department: event.department,
            eventName: event.eventName,
            eventDate: event.eventDate,
            seriesEndDate: event.seriesEndDate,
            dayOfWeek: event.dayOfWeek,
            timeString: timeString,
            location: event.location,
            registrantEmail: event.registrantEmail || event.contactEmail,
            facilitiesChecklist: this.convertFacilitiesToArray(event.facilitiesChecklist),
            facilitiesSummary: event.facilitiesSummary,
            notes: event.notes,
            contractorName: event.contractorName,
            constructionTime: event.constructionTime,
            constructionContent: event.constructionContent,
            equipmentInOut: event.equipmentInOut,
            constructionPersonnel: event.constructionPersonnel,
            changes: event.changes // For 'updated' type
        };

        // 🎨 SELECT TEMPLATE based on settings
        console.log('[EMAIL DEBUG] settings.templates:', JSON.stringify(settings.templates, null, 2));
        console.log('[EMAIL DEBUG] Looking for type:', type);
        console.log('[EMAIL DEBUG] template object:', template);
        const templateId = template?.emailTemplate || 'minimalist-premium'; // default
        console.log(`[EMAIL SERVICE] Using template: ${templateId} for type: ${type}`);

        // Generate HTML using selected template
        const htmlContent = this.renderWithTemplate(templateId, event.eventName, bodyContent);

        // 🔍 DEBUG: Log recipients BEFORE and AFTER dedup
        console.log('[EMAIL DEBUG] Recipients array:', recipients);
        console.log('[EMAIL DEBUG] Recipients count:', recipients.length);
        console.log('[EMAIL DEBUG] Unique recipients:', [...new Set(recipients)]);
        console.log('[EMAIL DEBUG] Has duplicates?', recipients.length !== new Set(recipients).size);

        // 📅 GENERATE CALENDAR ATTACHMENT
        const attachments = [];
        try {
            const icsContent = await calendarService.generateIcsEvent(event);
            if (icsContent) {
                console.log('[EMAIL SERVICE] Generated .ics calendar attachment');
                attachments.push({
                    filename: 'event-invite.ics',
                    content: icsContent,
                    contentType: 'text/calendar; method=REQUEST'
                });
            } else {
                console.warn('[EMAIL SERVICE] Skipped .ics generation (missing date/time)');
            }
        } catch (icsError) {
            console.error('[EMAIL SERVICE] Failed to generate .ics:', icsError);
            // Non-blocking: send email anyway
        }

        // Send email with attachments
        await this.send(recipients, subject, htmlContent, attachments);
        console.log(`[EMAIL SERVICE] ${type} notification sent successfully`);
    }

    // 🎨 Render email using selected template
    renderWithTemplate(templateId, title, bodyContent) {
        console.log(`[EMAIL SERVICE] Rendering with template: ${templateId}`);

        const template = templateRegistry.getTemplate(templateId);

        if (!template) {
            console.warn(`[EMAIL SERVICE] Template "${templateId}" not found, falling back to default`);
            return this.getTicketTemplate(title, bodyContent);
        }

        if (!template.renderFunction) {
            console.warn(`[EMAIL SERVICE] Template "${templateId}" has no render function, falling back`);
            return this.getTicketTemplate(title, bodyContent);
        }

        try {
            return template.renderFunction(title, bodyContent);
        } catch (error) {
            console.error(`[EMAIL SERVICE] Error rendering template "${templateId}":`, error);
            console.log('[EMAIL SERVICE] Falling back to default template');
            return this.getTicketTemplate(title, bodyContent);
        }
    }

    // ✅ PROFESSIONAL: B2B Minimalist Email Template (UI/UX Pro Max Design System)
    getTicketTemplate(title, bodyContent, themeColor = '#0369A1') {
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

        // Helper to generate Facilities HTML (Clean list format)
        const getFacilitiesHtml = () => {
            const checklist = bodyContent.facilitiesChecklist;
            if (!checklist) return `<tr><td style="color: #475569; font-size: 14px; padding: 6px 0;">${(bodyContent.facilitiesSummary || 'None').replace(/\n/g, '<br>')}</td></tr>`;

            const locations = Array.isArray(bodyContent.location) ? bodyContent.location : [bodyContent.location];
            const selectedEntries = Object.entries(checklist).filter(([k, v]) => v && v.quantity > 0);

            if (selectedEntries.length === 0) return `<tr><td style="color: #475569; font-size: 14px; padding: 6px 0;">None</td></tr>`;

            return selectedEntries.map(([key, val]) => {
                const label = EQUIPMENT_LABELS[key] || key;
                const qty = val.quantity;
                return `<tr><td style="color: #475569; font-size: 14px; padding: 6px 0; border-bottom: 1px solid #F1F5F9;">${label} <strong style="color: #020617; float: right;">×${qty}</strong></td></tr>`;
            }).join('');
        };

        const facilitiesHtml = getFacilitiesHtml();

        return `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <!--[if mso]>
    <noscript>
    <xml>
    <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
    </xml>
    </noscript>
    <![endif]-->
    <style type="text/css">
        /* Email Client Reset */
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        /* Mobile Responsive */
        @media only screen and (max-width: 600px) {
            .mobile-full-width { width: 100% !important; }
            .mobile-padding { padding: 20px !important; }
            .mobile-font-28 { font-size: 28px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    
    <!-- Wrapper -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F1F5F9; padding: 32px 0;">
        <tr>
            <td align="center">
                
                <!-- Main Container -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="mobile-full-width" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; margin: 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
                    
                    <!-- Header: Professional Blue Gradient -->
                    <tr>
                        <td style="padding: 0;">
                            <!--[if mso]>
                            <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px;height:140px;">
                            <v:fill type="gradient" color="#0369A1" color2="#0284C7" angle="135"/>
                            <v:textbox inset="0,0,0,0">
                            <![endif]-->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" class="mobile-padding" style="padding: 48px 32px; background: linear-gradient(135deg, #0369A1, #0284C7); text-align: center;">
                                        
                                        <!-- Department Badge -->
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                                            <tr>
                                                <td style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #FFFFFF;">
                                                    ${bodyContent.department}
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Event Title -->
                                        <h1 class="mobile-font-28" style="margin: 0; font-size: 32px; font-weight: 700; color: #FFFFFF; line-height: 1.2;">
                                            ${bodyContent.eventName}
                                        </h1>
                                        
                                        <!-- Confirmed Badge -->
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 12px auto 0;">
                                            <tr>
                                                <td style="background: #10B981; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #FFFFFF;">
                                                    ✓ CONFIRMED
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            <!--[if mso]>
                            </v:textbox>
                            </v:rect>
                            <![endif]-->
                        </td>
                    </tr>
                    
                    <!-- Content Section -->
                    <tr>
                        <td class="mobile-padding" style="padding: 32px;">
                            
                            <!-- Registrant Info -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="font-size: 13px; color: #64748B; font-weight: 600;">
                                        Registered by: <a href="mailto:${bodyContent.registrantEmail}" style="color: #0369A1; text-decoration: none; font-weight: 700;">${bodyContent.registrantEmail}</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- DATE Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                                <tr>
                                    <td style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid #0369A1; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 20px 24px;">
                                                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 6px; font-weight: 700;">DATE</div>
                                                    <div style="font-size: 20px; font-weight: 700; color: #020617; line-height: 1.3;">${bodyContent.eventDate}${bodyContent.seriesEndDate ? ` to ${bodyContent.seriesEndDate}` : ''}${bodyContent.dayOfWeek ? ` • ${bodyContent.dayOfWeek}` : ''}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!--TIME Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                                <tr>
                                    <td style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid #0369A1; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 20px 24px;">
                                                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 6px; font-weight: 700;">TIME</div>
                                                    <div style="font-size: 20px; font-weight: 700; color: #020617; line-height: 1.3;">${bodyContent.timeString}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- LOCATION Card -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 32px;">
                                <tr>
                                    <td style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid #0369A1; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 20px 24px;">
                                                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 6px; font-weight: 700;">LOCATION</div>
                                                    <div style="font-size: 18px; font-weight: 700; color: #020617; line-height: 1.4;">${Array.isArray(bodyContent.location) ? bodyContent.location.join(', ') : bodyContent.location}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Facilities Section -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
                                        <!-- Header -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 20px 24px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC;">
                                                    <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #334155;">Equipment & Facilities</div>
                                                </td>
                                            </tr>
                                        </table>
                                        <!-- Content -->
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 16px 24px 20px;">
                                                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                                        ${facilitiesHtml}
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Notes -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
                                <tr>
                                    <td style="font-size: 13px; font-weight: 600; color: #64748B; line-height: 1.6;">
                                        <strong style="color: #334155;">Notes:</strong> ${bodyContent.notes || 'None'}
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: #F8FAFC; border-top: 1px solid #E2E8F0; padding: 40px 24px; text-align: center;">
                            <!-- CTA Button -->
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                                <tr>
                                    <td align="center" style="background: #0369A1; border-radius: 8px; box-shadow: 0 4px 12px rgba(3,105,161,0.3);">
                                        <a href="#" style="display: inline-block; padding: 14px 32px; color: #FFFFFF; text-decoration: none; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">
                                            View in Dashboard
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <!-- Ticket ID -->
                            <div style="font-size: 11px; color: #94A3B8; margin-top: 16px;">
                                E-Ticket ID: ${Date.now().toString().slice(-8)}
                            </div>
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Copyright -->
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="mobile-full-width" style="max-width: 600px; margin: 20px auto 0;">
                    <tr>
                        <td align="center" style="font-size: 12px; color: #94A3B8; font-weight: 600;">
                            © ${new Date().getFullYear()} EventFlow Management System
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
    
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
                // Fallback: If no default set, send to all
                else if (dept.emails && dept.emails.length > 0) {
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

        return [...new Set(recipients)];
    }

    detectChanges(oldEvent, newEvent) {
        const changes = [];

        if (oldEvent.eventDate !== newEvent.eventDate) {
            changes.push(`Date changed from ${oldEvent.eventDate} to ${newEvent.eventDate}`);
        }

        if (oldEvent.timeStart !== newEvent.timeStart || oldEvent.timeEnd !== newEvent.timeEnd) {
            changes.push(`Time changed from ${oldEvent.timeStart}-${oldEvent.timeEnd} to ${newEvent.timeStart}-${newEvent.timeEnd}`);
        }

        const oldLoc = Array.isArray(oldEvent.location) ? oldEvent.location.join(', ') : oldEvent.location;
        const newLoc = Array.isArray(newEvent.location) ? newEvent.location.join(', ') : newEvent.location;
        if (oldLoc !== newLoc) {
            changes.push(`Location changed from "${oldLoc}" to "${newLoc}"`);
        }

        if (oldEvent.contactPerson !== newEvent.contactPerson) {
            changes.push('Contact person updated');
        }

        if (oldEvent.contractorName !== newEvent.contractorName) {
            changes.push('Contractor name updated');
        }

        if (oldEvent.constructionTime !== newEvent.constructionTime) {
            changes.push('Construction time updated');
        }

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
