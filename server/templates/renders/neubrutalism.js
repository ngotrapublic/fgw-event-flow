/**
 * Neubrutalism Template - UI/UX Pro Max Edition
 * 
 * DESIGN CONCEPT: "Corporate Brutalism"
 * - Archetype: Terminal / Schematic / Raw Authority
 * - Palette: Black (#000000), White (#FFFFFF), Neon Yellow (#FEF08A), Cyber Blue (#7DD3FC)
 * - Typography: Monospace (Headlines) + Sans (Body)
 * - Vibe: High Contrast, Functional, Unapologetic
 * 
 * OUTLOOK COMPATIBILITY:
 * - 100% Table-based
 * - Inline CSS only
 * - 3px Solid Borders (No soft shadows)
 * - Hard Shadows via Border Right/Bottom
 */

module.exports = function renderNeubrutalism(title, bodyContent) {
    // Destructure bodyContent
    const {
        eventName = title,
        eventDate = new Date(),
        timeString = 'TBD',
        location = 'TBD',
        facilitiesChecklist = [],
        notes = ''
    } = bodyContent || {};

    // Helper for grid items
    const getFacilitiesHtml = () => {
        const checklist = Array.isArray(facilitiesChecklist)
            ? facilitiesChecklist
            : (facilitiesChecklist ? [facilitiesChecklist] : []);

        if (!checklist.length) return '<tr><td style="font-family: \'Courier New\', Courier, monospace; font-size: 14px; padding: 10px; border: 3px solid #000000; border-top: 0;">None</td></tr>';

        return checklist.map(item => `
            <tr>
                <td style="background-color: #FFFFFF; padding: 12px; border: 3px solid #000000; border-top: 0; font-family: Helvetica, Arial, sans-serif; font-weight: bold; font-size: 14px; color: #000000;">
                    [x] ${item}
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
    <body style="margin: 0; padding: 0; background-color: #F3F4F6; -webkit-font-smoothing: none;">
        
        <!-- WRAPPER -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F3F4F6">
            <tr>
                <td align="center" style="padding: 40px 0;">
                    
                    <!-- MAIN CONTAINER (600px - Fixed) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color: #FFFFFF;">
                        
                        <!-- 1. HEADER (Marquee style) -->
                        <tr>
                            <td style="border: 3px solid #000000; border-bottom: 0; background-color: #000000; padding: 15px;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="font-family: 'Courier New', Courier, monospace; color: #FEF08A; font-size: 18px; font-weight: bold; letter-spacing: -1px;">
                                            &gt; SYSTEM_NOTIFICATION
                                        </td>
                                        <td align="right" style="font-family: 'Courier New', Courier, monospace; color: #FFFFFF; font-size: 14px;">
                                            ID: #${Math.floor(Math.random() * 10000)}
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- 2. HERO SECTION (Neon Yellow) -->
                        <tr>
                            <td bgcolor="#FEF08A" style="border: 3px solid #000000; padding: 40px; border-bottom: 6px solid #000000;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="font-family: 'Arial Black', Gadget, sans-serif; font-size: 48px; line-height: 1; color: #000000; text-transform: uppercase;">
                                            ${eventName}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td align="left" style="padding-top: 20px;">
                                            <table border="0" cellpadding="0" cellspacing="0">
                                                <tr>
                                                    <td bgcolor="#000000" style="padding: 10px 20px;">
                                                        <span style="font-family: 'Courier New', Courier, monospace; color: #FFFFFF; font-weight: bold; font-size: 16px;">
                                                            STATUS: CONFIRMED
                                                        </span>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SPACER (Transparent) -->
                        <tr><td height="20" style="font-size:0; line-height:0;">&nbsp;</td></tr>

                        <!-- 3. DETAILS GRID BLOCK -->
                        <tr>
                            <td>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <!-- DATE BOX (Cyber Blue) -->
                                        <td width="50%" valign="top" style="padding-right: 10px;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#7DD3FC" style="border: 3px solid #000000; border-bottom: 6px solid #000000;">
                                                <tr>
                                                    <td style="padding: 15px; border-bottom: 3px solid #000000; background-color: #FFFFFF;">
                                                        <span style="font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 14px;">DATE_TIME</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 20px;">
                                                        <div style="font-family: Helvetica, Arial, sans-serif; font-weight: bold; font-size: 20px; color: #000000; margin-bottom: 5px;">
                                                            ${eventDate}
                                                        </div>
                                                        <div style="font-family: 'Courier New', Courier, monospace; font-size: 16px; color: #000000;">
                                                            ${timeString}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                        <!-- LOCATION BOX (White) -->
                                        <td width="50%" valign="top" style="padding-left: 10px;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFFFF" style="border: 3px solid #000000; border-bottom: 6px solid #000000;">
                                                <tr>
                                                    <td style="padding: 15px; border-bottom: 3px solid #000000; background-color: #000000;">
                                                        <span style="font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 14px; color: #FFFFFF;">LOCATION</span>
                                                    </td>
                                                </tr>
                                                <tr>
                                                    <td style="padding: 20px;">
                                                        <div style="font-family: Helvetica, Arial, sans-serif; font-weight: bold; font-size: 18px; color: #000000; line-height: 1.4;">
                                                           ${Array.isArray(location) ? location.join('<br>') : location}
                                                        </div>
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- SPACER -->
                        <tr><td height="20" style="font-size:0; line-height:0;">&nbsp;</td></tr>

                        <!-- 4. FACILITIES LIST -->
                        <tr>
                             <td>
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="border: 3px solid #000000; background-color: #000000; padding: 10px 15px;">
                                            <span style="font-family: 'Courier New', Courier, monospace; font-weight: bold; font-size: 16px; color: #FFFFFF;">
                                                &gt; FACILITIES_REQUEST
                                            </span>
                                        </td>
                                    </tr>
                                    ${getFacilitiesHtml()}
                                </table>
                            </td>
                        </tr>

                        <!-- 5. FOOTER -->
                        <tr>
                            <td align="center" style="padding-top: 40px; padding-bottom: 20px;">
                                <table border="0" cellpadding="0" cellspacing="0">
                                    <tr>
                                        <td style="font-family: 'Courier New', Courier, monospace; font-size: 12px; color: #000000;">
                                            UNIVERSITY_OF_GREENWICH // EVENT_SYSTEM
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
