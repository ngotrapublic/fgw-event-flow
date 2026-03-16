/**
 * Base Email Template Renderer
 * Shared structure cho tất cả templates, chỉ khác colors & styling
 */

function renderBaseTemplate(title, bodyContent, config) {
    const {
        headerBg = '#1E293B',
        headerText = '#FFFFFF',
        accentColor = '#F59E0B',
        accentBorder = accentColor,
        bgColor = '#FAFAF9',
        badgeBg = 'rgba(245,158,11,0.2)',
        badgeText = accentColor,
        badgeBorder = accentColor,
        headerTopBorder = accentColor,
        footerBg = '#F8FAFC',
    } = config || {};

    // Destructure bodyContent safely
    const {
        eventName = title,
        eventDate = new Date(),
        dayOfWeek = '',
        timeString = 'TBD',
        location = 'TBD',
        department = 'TBD',
        registrantEmail = 'N/A',
        facilitiesChecklist = {},
        facilitiesSummary = 'None',
        notes = 'None'
    } = bodyContent || {};

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
        if (!facilitiesChecklist || Object.keys(facilitiesChecklist).length === 0) {
            return `<tr><td style="color: #475569; font-size: 14px; padding: 6px 0;">${(facilitiesSummary || 'None').replace(/\n/g, '<br>')}</td></tr>`;
        }

        const selectedEntries = Object.entries(facilitiesChecklist).filter(([k, v]) => v && v.quantity > 0);

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
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
        
        @media only screen and (max-width: 600px) {
            .mobile-full-width { width: 100% !important; }
            .mobile-padding { padding: 20px !important; }
            .mobile-font-28 { font-size: 28px !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
    
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: ${bgColor}; padding: 32px 0;">
        <tr>
            <td align="center">
                
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="mobile-full-width" style="max-width: 600px; background-color: #FFFFFF; border-radius: 12px; overflow: hidden; margin: 0 auto; box-shadow: 0 4px 16px rgba(0,0,0,0.08);">
                    
                    <!-- Header -->
                    <tr>
                        <td style="padding: 0; background: ${headerBg}; border-top: 4px solid ${headerTopBorder};">
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td align="center" class="mobile-padding" style="padding: 48px 32px; text-align: center;">
                                        
                                        <!-- Department Badge -->
                                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto 16px;">
                                            <tr>
                                                <td style="background: ${badgeBg}; border: 1px solid ${badgeBorder}; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: ${badgeText};">
                                                    ${department}
                                                </td>
                                            </tr>
                                        </table>
                                        
                                        <!-- Event Title -->
                                        <h1 class="mobile-font-28" style="margin: 0; font-size: 32px; font-weight: 700; color: ${headerText}; line-height: 1.2;">
                                            ${eventName}
                                        </h1>
                                        
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                    <!-- Content Section -->
                    <tr>
                        <td class="mobile-padding" style="padding: 32px;">
                            
                            <!-- Registrant Info -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="font-size: 13px; color: #64748B; font-weight: 600;">
                                        Registered by: <a href="mailto:${registrantEmail}" style="color: ${accentColor}; text-decoration: none; font-weight: 700;">${registrantEmail}</a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- DATE/TIME/LOCATION Cards -->
                            ${['DATE', 'TIME', 'LOCATION'].map((label, idx) => {
        const value = idx === 0 ? `${eventDate}${dayOfWeek ? ` • ${dayOfWeek}` : ''}` :
            idx === 1 ? timeString :
                Array.isArray(location) ? location.join(', ') : location;
        return `
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                                <tr>
                                    <td style="background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid ${accentBorder}; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 20px 24px;">
                                                    <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 6px; font-weight: 700;">${label}</div>
                                                    <div style="font-size: ${idx === 2 ? '18px' : '20px'}; font-weight: 700; color: #020617; line-height: 1.3;">${value}</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                            </table>
                              `;
    }).join('')}
                            
                            <!-- Facilities Section -->
                            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; overflow: hidden;">
                                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                                            <tr>
                                                <td style="padding: 20px 24px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC;">
                                                    <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #334155;">Equipment & Facilities</div>
                                                </td>
                                            </tr>
                                        </table>
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
                                        <strong style="color: #334155;">Notes:</strong> ${notes || 'None'}
                                    </td>
                                </tr>
                            </table>
                            
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="background: ${footerBg}; border-top: 1px solid #E2E8F0; padding: 40px 24px; text-align: center;">
                            <div style="font-size: 11px; color: #94A3B8;">
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

module.exports = renderBaseTemplate;
