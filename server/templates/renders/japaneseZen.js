/**
 * Japanese Zen Email Template - Outlook Compatible Edition
 * 
 * Aesthetic: Wabi-sabi, Minimalist, Asymmetric
 * Colors: 
 * - Background: #FAF9F6 (Rice Paper)
 * - Text: #292524 (Stone Gray)
 * - Accent: #B91C1C (Seal Red)
 * 
 * Tech: 100% Table-based, no flexbox, generic fonts first (Outlook safe)
 */

module.exports = function renderJapaneseZen(title, bodyContent) {
    const {
        eventName = title,
        eventDate = new Date(),
        timeString = 'TBD',
        location = 'TBD',
        department = 'TBD',
        facilitiesChecklist = [],
        notes = ''
    } = bodyContent || {};

    // Helper: Facilities List
    const facilitiesList = Array.isArray(facilitiesChecklist)
        ? facilitiesChecklist
        : (facilitiesChecklist ? [facilitiesChecklist] : []);

    // Helper: Date Formatting
    let dateFormatted = eventDate;
    try {
        const dateObj = new Date(eventDate);
        if (!isNaN(dateObj)) {
            const day = dateObj.getDate().toString().padStart(2, '0');
            const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
            const year = dateObj.getFullYear();
            dateFormatted = `${day}.${month}.${year}`;
        }
    } catch (e) {
        // Fallback to original string if parsing fails
    }

    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>${eventName}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #E5E5E5;">
        
        <!-- OUTER WRAPPER (Gray Background for Contrast) -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#E5E5E5">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    
                    <!-- MAIN CARD (Rice Paper Texture Color) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color: #FAF9F6; border: 1px solid #D6D3D1;">
                        
                        <!-- 1. TOP RED ACCENT (Signature) -->
                        <tr>
                            <td height="6" bgcolor="#B91C1C" style="font-size: 6px; line-height: 6px;">&nbsp;</td>
                        </tr>

                        <!-- 2. HEADER SECTION (Asymmetric) -->
                        <tr>
                            <td style="padding: 50px 40px 30px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <!-- Vertical Red Line Accent -->
                                        <td width="4" bgcolor="#B91C1C" style="width: 4px; font-size: 1px; line-height: 1px;">&nbsp;</td>
                                        <td width="20" style="width: 20px;">&nbsp;</td>
                                        
                                        <!-- Header Text -->
                                        <td align="left">
                                            <div style="font-family: 'Courier New', Courier, monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #78716C; margin-bottom: 10px;">
                                                ${department}
                                            </div>
                                            <div style="font-family: Georgia, 'Times New Roman', serif; font-size: 36px; color: #1C1917; line-height: 1.2;">
                                                ${eventName}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 3. INFO GRID (Minimalist) -->
                        <tr>
                            <td style="padding: 0 40px 40px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 1px solid #E7E5E4; border-bottom: 1px solid #E7E5E4;">
                                    <tr>
                                        <!-- DATE -->
                                        <td width="33%" valign="top" style="padding: 25px 0; border-right: 1px solid #E7E5E4;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; color: #A8A29E; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 5px;">
                                                        Date
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #1C1917;">
                                                        ${dateFormatted}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                        
                                        <!-- TIME -->
                                        <td width="33%" valign="top" style="padding: 25px 0 25px 25px; border-right: 1px solid #E7E5E4;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; color: #A8A29E; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 5px;">
                                                        Time
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #1C1917;">
                                                        ${timeString}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>

                                        <!-- LOCATION -->
                                        <td width="33%" valign="top" style="padding: 25px 0 25px 25px;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="font-family: Arial, sans-serif; font-size: 10px; font-weight: 700; color: #A8A29E; text-transform: uppercase; letter-spacing: 1px; padding-bottom: 5px;">
                                                        Location
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="font-family: Georgia, 'Times New Roman', serif; font-size: 18px; color: #1C1917;">
                                                        ${Array.isArray(location) ? location[0] : location}
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 4. FACILITIES (Vertical List with Red Dots) -->
                        ${facilitiesList.length > 0 ? `
                        <tr>
                            <td style="padding: 0 60px 40px 60px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="padding-bottom: 20px;">
                                            <span style="font-family: Arial, sans-serif; font-size: 11px; font-weight: 700; color: #B91C1C; text-transform: uppercase; letter-spacing: 2px; border-bottom: 1px solid #B91C1C; padding-bottom: 3px;">
                                                Requirements
                                            </span>
                                        </td>
                                    </tr>
                                    ${facilitiesList.map(item => `
                                    <tr>
                                        <td align="center" style="padding-bottom: 10px;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td style="color: #B91C1C; font-size: 20px; line-height: 10px; vertical-align: middle; padding-right: 10px;">•</td>
                                                    <td style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; color: #44403C; font-style: italic;">
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
                        ` : ''}

                        <!-- 5. FOOTER (Hanko Stamp Style) -->
                        <tr>
                            <td align="center" style="padding: 30px 40px 50px 40px;">
                                <table border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <!-- Simulated Stamp Border -->
                                        <td style="border: 1px solid #B91C1C; padding: 10px 15px; border-radius: 4px;">
                                            <span style="font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #B91C1C; text-transform: uppercase;">
                                                University of Greenwich
                                            </span>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};
