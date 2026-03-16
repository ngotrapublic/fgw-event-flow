/**
 * Academic/University Template - UI/UX Pro Max Edition
 * 
 * DESIGN CONCEPT: "The Ivy League"
 * - Archetype: Degree / Decree / Formal Invitation
 * - Palette: Warm Ivory (#FFFBEB), Deep Burgundy (#7C2D12), Aged Gold (#D97706)
 * - Typography: All Serif (Times New Roman, Georgia) for prestige
 * - Vibe: Traditional, Institutional, Significant
 * 
 * OUTLOOK COMPATIBILITY:
 * - 100% Table-based
 * - Inline CSS only
 * - Frame Border effect via nested tables
 */

module.exports = function renderAcademic(title, bodyContent) {
    // Destructure bodyContent
    const {
        eventName = title,
        eventDate = new Date(),
        timeString = 'TBD',
        location = 'TBD',
        department = 'N/A',
        facilitiesChecklist = []
    } = bodyContent || {};

    // Helper for list items
    const getFacilitiesHtml = () => {
        const checklist = Array.isArray(facilitiesChecklist)
            ? facilitiesChecklist
            : (facilitiesChecklist ? [facilitiesChecklist] : []);

        if (!checklist.length) return '<tr><td style="font-family: \'Times New Roman\', Times, serif; font-size: 14px; padding: 4px 0; font-style: italic; color: #78350F;">None requested</td></tr>';

        return checklist.map(item => `
            <tr>
                <td style="padding: 6px 0;">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="20" valign="top" style="color: #B45309; font-size: 18px; line-height: 1;">&bull;</td>
                            <td align="left" style="font-family: 'Times New Roman', Times, serif; color: #431407; font-size: 16px;">
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
    <body style="margin: 0; padding: 0; background-color: #FDFBF7; -webkit-font-smoothing: antialiased;">
        
        <!-- WRAPPER -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FDFBF7">
            <tr>
                <td align="center" style="padding: 40px 10px;">
                    
                    <!-- OUTER FRAME (Gold) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color: #7C2D12;">
                        <tr>
                            <td style="padding: 2px;">
                                <!-- INNER FRAME (Ivory) -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFBEB">
                                    <tr>
                                        <td style="padding: 8px; border: 1px solid #7C2D12;">
                                            
                                            <!-- MAIN CONTENT CONTAINER -->
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFBEB">
                                                
                                                <!-- 1. SEAL & HEADER -->
                                                <tr>
                                                    <td align="center" style="padding: 40px 0 20px 0;">
                                                        <!-- Seal Placeholder (Unicode) -->
                                                        <div style="font-size: 64px; line-height: 1; color: #7C2D12; margin-bottom: 10px;">&#10059;</div>
                                                        <div style="font-family: 'Times New Roman', Times, serif; color: #78350F; font-size: 14px; text-transform: uppercase; letter-spacing: 2px; font-weight: bold;">
                                                            University of Greenwich
                                                        </div>
                                                        <div style="width: 60px; height: 1px; background-color: #B45309; margin: 15px auto;"></div>
                                                    </td>
                                                </tr>

                                                <!-- 2. FORMAL TITLE -->
                                                <tr>
                                                    <td align="center" style="padding: 0 40px 30px 40px;">
                                                        <div style="font-family: 'Times New Roman', Times, serif; font-size: 18px; color: #92400E; font-style: italic; margin-bottom: 10px;">
                                                            This is to formally confirm the scheduling of
                                                        </div>
                                                        <div style="font-family: 'Times New Roman', Times, serif; font-size: 32px; color: #451A03; font-weight: bold; line-height: 1.2;">
                                                            ${eventName}
                                                        </div>
                                                    </td>
                                                </tr>

                                                <!-- 3. DETAILS BOX (Formal Grid) -->
                                                <tr>
                                                    <td style="padding: 0 40px 30px 40px;">
                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border-top: 2px solid #7C2D12; border-bottom: 2px solid #7C2D12;">
                                                            <tr>
                                                                <td width="30%" valign="top" style="padding: 20px 0; border-right: 1px solid #E7E5E4;">
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #92400E; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                                                                        Department
                                                                    </div>
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 16px; color: #451A03; margin-top: 5px;">
                                                                        ${department}
                                                                    </div>
                                                                </td>
                                                                <td width="40%" valign="top" style="padding: 20px; border-right: 1px solid #E7E5E4; text-align: center;">
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #92400E; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                                                                        Date & Time
                                                                    </div>
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 18px; color: #7C2D12; font-weight: bold; margin-top: 5px;">
                                                                        ${eventDate}
                                                                    </div>
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 15px; color: #451A03;">
                                                                        ${timeString}
                                                                    </div>
                                                                </td>
                                                                <td width="30%" valign="top" style="padding: 20px 0; text-align: right;">
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #92400E; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                                                                        Location
                                                                    </div>
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 16px; color: #451A03; margin-top: 5px;">
                                                                        ${Array.isArray(location) ? location[0] : location}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </table>
                                                    </td>
                                                </tr>

                                                <!-- 4. REQUIREMENTS LIST -->
                                                <tr>
                                                    <td style="padding: 0 40px 40px 40px;">
                                                        <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                            <tr>
                                                                <td align="center" style="font-family: 'Times New Roman', Times, serif; font-size: 16px; color: #78350F; font-weight: bold; padding-bottom: 15px; text-decoration: underline;">
                                                                    Required Accommodations
                                                                </td>
                                                            </tr>
                                                            ${getFacilitiesHtml()}
                                                        </table>
                                                    </td>
                                                </tr>

                                                <!-- 5. SIGNATURE / FOOTER -->
                                                <tr>
                                                    <td align="center" style="padding-bottom: 40px;">
                                                        <table border="0" cellpadding="0" cellspacing="0" width="200">
                                                            <tr>
                                                                <td align="center" style="border-top: 1px solid #7C2D12; padding-top: 10px;">
                                                                    <div style="font-family: 'Times New Roman', Times, serif; font-size: 12px; color: #7C2D12; font-style: italic;">
                                                                        Authorized by System Administrator
                                                                    </div>
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
                    </table>
                    
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
};
