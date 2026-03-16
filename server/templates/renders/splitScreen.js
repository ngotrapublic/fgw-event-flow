/**
 * Split-Screen Email Template - Corporate Vibrant V3 ENHANCED
 * 
 * Features:
 * - MASSIVE typography for maximum impact (60px+ headings)
 * - GENEROUS spacing for premium feel
 * - HIGH CONTRAST visual hierarchy
 * - Bold Unicode symbols for icons
 * - Full table-based layout for 100% Outlook Desktop compatibility
 */

module.exports = function renderSplitScreen(title, bodyContent) {
    const {
        eventName = title,
        eventDate = new Date(),
        timeString = 'TBD',
        timeEnd = '',
        location = 'TBD',
        department = 'PHÒNG ĐÀO TẠO',
        facilitiesChecklist = [],
        notes = ''
    } = bodyContent || {};

    // Process facilities checklist
    const facilitiesList = Array.isArray(facilitiesChecklist)
        ? facilitiesChecklist
        : (facilitiesChecklist ? [facilitiesChecklist] : []);

    // Format Date
    let dateDay = '01';
    let dateMonthYear = '01/2026';

    try {
        const dateObj = new Date(eventDate);
        if (!isNaN(dateObj)) {
            dateDay = dateObj.getDate().toString().padStart(2, '0');
            dateMonthYear = dateObj.toLocaleDateString('vi-VN', { month: '2-digit', year: 'numeric' });
        } else {
            // Fallback if eventDate is a string like "Thứ Sáu, 30/01/2026"
            const parts = String(eventDate).split('/');
            if (parts.length >= 2) {
                // very basic heuristic
                dateDay = parts[0].replace(/\D/g, '') || '01';
                dateMonthYear = String(eventDate);
            }
        }
    } catch (e) {
        console.warn('Date parse error in SplitScreen:', e);
    }

    // Split facilities into two columns
    const midPoint = Math.ceil(facilitiesList.length / 2);
    const leftColFacilities = facilitiesList.slice(0, midPoint);
    const rightColFacilities = facilitiesList.slice(midPoint);

    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <meta name="x-apple-disable-message-reformatting">
        <title>${eventName}</title>
         <!--[if gte mso 9]>
        <xml>
        <o:OfficeDocumentSettings>
            <o:AllowPNG/>
            <o:PixelsPerInch>96</o:PixelsPerInch>
        </o:OfficeDocumentSettings>
        </xml>
        <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: #e5e7eb;">
        <!-- CENTERED WRAPPER -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#e5e7eb">
            <tr>
                <td align="center" style="padding: 30px 0;">
                    
                    <!-- MAIN CONTAINER (600px) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color: #ffffff;">
                        
                        <!-- 1. HEADER SECTION (Teal #0D9488 + Massive Typography) -->
                        <tr>
                            <td bgcolor="#0D9488" style="padding: 50px 40px; text-align: center; border-bottom: 10px solid #0F766E;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="color: #CCFBF1; font-family: Arial, Helvetica, sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 4px; font-weight: 700; padding-bottom: 15px;">
                                            ${department}
                                        </td>
                                    </tr>
                                    <tr>
                                        <!-- MASSIVE Title -->
                                        <td align="center" style="color: #ffffff; font-family: Impact, Arial Black, Arial, sans-serif; font-size: 42px; font-weight: 900; line-height: 1.1; text-transform: uppercase; letter-spacing: -1px;">
                                            ${eventName}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SPACER -->
                        <tr><td height="8" bgcolor="#ffffff" style="font-size: 8px; line-height: 8px;">&nbsp;</td></tr>

                        <!-- 2. DATE & TIME SPLIT ROW (MASSIVE Numbers) -->
                        <tr>
                            <td>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <!-- DATE BLOCK (Orange #F97316) -->
                                        <td width="296" bgcolor="#F97316" valign="top" style="padding: 35px 25px; border-bottom: 8px solid #C2410C;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td align="center" style="color: rgba(255,255,255,0.85); font-family: Arial, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; padding-bottom: 12px;">
                                                        DATE
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <!-- MASSIVE Date Number -->
                                                    <td align="center" style="color: #ffffff; font-family: Impact, Arial Black, Arial, sans-serif; font-size: 72px; font-weight: 900; line-height: 0.9; padding: 12px 0;">
                                                        ${dateDay}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="center" style="color: rgba(255,255,255,0.95); font-family: Arial, sans-serif; font-size: 18px; font-weight: 700; text-transform: uppercase; padding-top: 8px;">
                                                        ${dateMonthYear}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                        
                                        <!-- GAP -->
                                        <td width="8" bgcolor="#ffffff" style="font-size: 8px; line-height: 8px;">&nbsp;</td>

                                        <!-- TIME BLOCK (Purple #8B5CF6) -->
                                        <td width="296" bgcolor="#8B5CF6" valign="top" style="padding: 35px 25px; border-bottom: 8px solid #7C3AED;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <td align="center" style="color: rgba(255,255,255,0.85); font-family: Arial, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px; padding-bottom: 12px;">
                                                        TIME
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <!-- MASSIVE Time -->
                                                    <td align="center" style="color: #ffffff; font-family: Impact, Arial Black, Arial, sans-serif; font-size: 48px; font-weight: 900; line-height: 1; padding: 18px 0;">
                                                        ${timeString}
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td align="center" style="color: rgba(255,255,255,0.95); font-family: Arial, sans-serif; font-size: 18px; font-weight: 700; padding-top: 5px;">
                                                        ${timeEnd ? '– ' + timeEnd : ''}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SPACER -->
                        <tr><td height="8" bgcolor="#ffffff" style="font-size: 8px; line-height: 8px;">&nbsp;</td></tr>

                        <!-- 3. LOCATION SECTION (Medium Teal #14B8A6 + Bold Icon) -->
                        <tr>
                            <td bgcolor="#14B8A6" style="padding: 35px 30px; border-bottom: 8px solid #0D9488;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td valign="middle" align="center">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <!-- Pin Icon -->
                                                    <td style="width: 45px; font-size: 36px; line-height: 1; text-align: center; vertical-align: middle;">
                                                        📍
                                                    </td>
                                                    <!-- Text -->
                                                    <td style="padding-left: 15px; vertical-align: middle;">
                                                        <table border="0" cellpadding="0" cellspacing="0">
                                                            <tr>
                                                                <td style="color: rgba(255,255,255,0.85); font-family: Arial, sans-serif; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; padding-bottom: 5px;">
                                                                    LOCATION
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 24px; font-weight: 700; line-height: 1.3;">
                                                                    ${Array.isArray(location) ? location.join(', ') : location}
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SPACER -->
                        <tr><td height="8" bgcolor="#ffffff" style="font-size: 8px; line-height: 8px;">&nbsp;</td></tr>

                        <!-- 4. SETUP SECTION (Deep Orange #EA580C + Bold Typography) -->
                        ${facilitiesList.length > 0 ? `
                        <tr>
                            <td bgcolor="#EA580C" style="padding: 40px 35px; border-bottom: 8px solid #C2410C;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="padding-bottom: 25px;">
                                            <!-- Bold Header -->
                                            <div style="color: #ffffff; font-family: Arial, sans-serif; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 3px;">
                                                📋 YÊU CẦU SETUP
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>
                                            <!-- Two Column Grid -->
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <tr>
                                                    <!-- Left Column -->
                                                    <td width="50%" valign="top" style="padding-right: 10px;">
                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                            ${leftColFacilities.map(item => `
                                                                <tr>
                                                                    <td style="padding-bottom: 12px;">
                                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                                            <tr>
                                                                                <td width="25" style="font-size: 18px; font-weight: 900; vertical-align: top;">
                                                                                    <span style="color: #86efac;">✓</span>
                                                                                </td>
                                                                                <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; line-height: 1.4; vertical-align: top;">
                                                                                    ${item}
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            `).join('')}
                                                        </table>
                                                    </td>
                                                    
                                                    <!-- Right Column -->
                                                    <td width="50%" valign="top" style="padding-left: 10px;">
                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                            ${rightColFacilities.map(item => `
                                                                <tr>
                                                                    <td style="padding-bottom: 12px;">
                                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                                            <tr>
                                                                                <td width="25" style="font-size: 18px; font-weight: 900; vertical-align: top;">
                                                                                    <span style="color: #86efac;">✓</span>
                                                                                </td>
                                                                                <td style="color: #ffffff; font-family: Arial, sans-serif; font-size: 15px; font-weight: 600; line-height: 1.4; vertical-align: top;">
                                                                                    ${item}
                                                                                </td>
                                                                            </tr>
                                                                        </table>
                                                                    </td>
                                                                </tr>
                                                            `).join('')}
                                                        </table>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        ` : ''}

                        <!-- FOOTER -->
                        <tr>
                            <td align="center" style="padding: 35px 20px; color: #9CA3AF; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5;">
                                Powered by <strong>University of GreenWich</strong>
                            </td>
                        </tr>

                    </table>
                    <!-- END MAIN CONTAINER -->
                    
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};
