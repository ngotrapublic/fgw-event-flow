/**
 * Minimalist Premium Template - UI/UX Pro Max Edition
 * 
 * DESIGN CONCEPT: "Luxury Letterhead"
 * - Archetype: Executive Brief / High-end Invitation
 * - Palette: Slate 800 (Text), Amber 700 (Accent), Slate 50 (Canvas)
 * - Typography: Serif (Headlines) + Sans (Body) pairing
 * - Vibe: Authoritative, Spacious, Elegant
 * 
 * OUTLOOK COMPATIBILITY:
 * - 100% Table-based structure
 * - Inline CSS only
 * - No Flexbox/Grid
 * - Solid Borders for accents
 */

module.exports = function renderMinimalistPremium(title, bodyContent) {
    const {
        eventName = title,
        eventDate = new Date(),
        seriesEndDate = null,
        timeString = 'TBD',
        location = 'TBD',
        department = 'N/A',
        facilitiesChecklist = [],
        notes = ''
    } = bodyContent || {};

    // Helper to render facilities list safely
    const getFacilitiesHtml = () => {
        const checklist = Array.isArray(facilitiesChecklist)
            ? facilitiesChecklist
            : (facilitiesChecklist ? [facilitiesChecklist] : []);

        if (!checklist.length) return '<tr><td style="color: #64748B; font-family: Helvetica, Arial, sans-serif; font-size: 14px; padding: 4px 0;">None requested</td></tr>';

        return checklist.map(item => `
            <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #F1F5F9;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="24" valign="top" style="padding-top:2px;">
                                <span style="font-size:16px; color:#B45309;">•</span>
                            </td>
                            <td align="left" style="color: #334155; font-family: Helvetica, Arial, sans-serif; font-size: 15px;">
                                ${item}
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        `).join('');
    };

    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="x-apple-disable-message-reformatting">
        <title>${eventName}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F1F5F9; -webkit-font-smoothing: antialiased;">
        
        <!-- WRAPPER -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F1F5F9">
            <tr>
                <td align="center" style="padding: 60px 0;">
                    
                    <!-- MAIN CARD (600px) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color: #FFFFFF; border-top: 4px solid #B45309; border-bottom: 1px solid #E2E8F0;">
                        
                        <!-- 1. HEADER LOGO SECTION -->
                        <tr>
                            <td align="center" style="padding: 50px 50px 30px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <!-- Left: Brand -->
                                        <td align="left" valign="middle">
                                            <span style="font-family: 'Times New Roman', Times, serif; color: #1E293B; font-size: 26px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase;">
                                                ANTIGRAVITY
                                            </span>
                                        </td>
                                        <!-- Right: Date Badge -->
                                        <td align="right" valign="middle">
                                            <span style="font-family: 'Courier New', Courier, monospace; color: #64748B; font-size: 12px; letter-spacing: 1px; text-transform: uppercase; border: 1px solid #E2E8F0; padding: 6px 12px; border-radius: 4px;">
                                                ${new Date().toLocaleDateString('en-GB')}
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 2. HERO TITLE -->
                        <tr>
                            <td style="padding: 0 50px 40px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="font-family: Helvetica, Arial, sans-serif; color: #B45309; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 16px;">
                                            Official Confirmation
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="left" style="font-family: 'Times New Roman', Times, serif; color: #0F172A; font-size: 42px; line-height: 1.1; font-weight: bold;">
                                            ${eventName}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="left" style="padding-top: 24px;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="border-left: 2px solid #B45309; padding-left: 16px;">
                                                        <span style="font-family: Helvetica, Arial, sans-serif; font-size: 16px; color: #475569; line-height: 1.5;">
                                                            Your event has been successfully registered and confirmed in our system.
                                                        </span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 3. DETAILS GRID -->
                        <tr>
                            <td style="padding: 0 50px 40px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0;">
                                    <tr>
                                        <!-- Dept + Location -->
                                        <td width="50%" valign="top" style="padding: 30px 20px 30px 0; border-right: 1px solid #E2E8F0;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td style="font-family: 'Times New Roman', Times, serif; color: #64748B; font-size: 14px; font-weight: bold; padding-bottom: 8px;">
                                                        Department
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Helvetica, Arial, sans-serif; color: #0F172A; font-size: 16px; padding-bottom: 24px;">
                                                        ${department}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: 'Times New Roman', Times, serif; color: #64748B; font-size: 14px; font-weight: bold; padding-bottom: 8px;">
                                                        Location
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Helvetica, Arial, sans-serif; color: #0F172A; font-size: 16px;">
                                                        ${Array.isArray(location) ? location.join(', ') : location}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>

                                        <!-- Date + Time -->
                                        <td width="50%" valign="top" style="padding: 30px 0 30px 30px;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td style="font-family: 'Times New Roman', Times, serif; color: #64748B; font-size: 14px; font-weight: bold; padding-bottom: 8px;">
                                                        Date & Time
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Helvetica, Arial, sans-serif; color: #0F172A; font-size: 16px; padding-bottom: 4px;">
                                                        ${eventDate}${seriesEndDate ? ` to ${seriesEndDate}` : ''}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Helvetica, Arial, sans-serif; color: #64748B; font-size: 14px; padding-bottom: 24px;">
                                                        ${timeString}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: 'Times New Roman', Times, serif; color: #64748B; font-size: 14px; font-weight: bold; padding-bottom: 8px;">
                                                        Duration
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Helvetica, Arial, sans-serif; color: #0F172A; font-size: 16px;">
                                                        Standard Session
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 4. FACILITIES -->
                        <tr>
                            <td style="padding: 0 50px 50px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="font-family: 'Times New Roman', Times, serif; color: #0F172A; font-size: 20px; font-weight: bold; padding-bottom: 20px;">
                                            Setup Requirements
                                        </td>
                                    </tr>
                                    ${getFacilitiesHtml()}
                                </table>
                            </td>
                        </tr>

                         <!-- 5. NOTES -->
                         ${notes ? `
                        <tr>
                            <td style="padding: 0 50px 50px 50px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F8FAFC" style="border: 1px dashed #CBD5E1;">
                                    <tr>
                                        <td style="padding: 24px; font-family: Helvetica, Arial, sans-serif; color: #475569; font-size: 14px; line-height: 1.6; font-style: italic;">
                                            "${notes}"
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        ` : ''}

                        <!-- 6. FOOTER -->
                        <tr>
                            <td bgcolor="#1E293B" align="center" style="padding: 30px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="font-family: Helvetica, Arial, sans-serif; color: #94A3B8; font-size: 11px; text-transform: uppercase; letter-spacing: 1px;">
                                            University of GreenWich &bull; Event Management System
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>

                     <!-- Space below -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr><td height="60" style="height:60px;">&nbsp;</td></tr>
                    </table>

                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};
