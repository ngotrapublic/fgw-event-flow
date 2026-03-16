/**
 * Modern Gradient Template - UI/UX Pro Max Edition
 * 
 * DESIGN CONCEPT: "Silicon Valley / SaaS Unicorn"
 * - Archetype: Tech Dashboard / App Notification
 * - Palette: Violet (#8B5CF6) to Blue (#3B82F6) Gradient
 * - Typography: Modern Sans (Helvetica Neue, Inter, Arial)
 * - Vibe: Airy, Optimistic, Clean, Tech-forward
 * 
 * OUTLOOK COMPATIBILITY:
 * - VML Background Gradient for Outlook Desktop
 * - Fallback to linear-gradient for Web
 * - "Glass" effect simulated via white card on colored BG
 */

module.exports = function renderModernGradient(title, bodyContent) {
    const {
        eventName = title,
        eventDate = new Date(),
        seriesEndDate = null,
        timeString = 'TBD',
        location = 'TBD',
        department = 'N/A',
        facilitiesChecklist = []
    } = bodyContent || {};

    // Facilities helper
    const getFacilitiesHtml = () => {
        const checklist = Array.isArray(facilitiesChecklist)
            ? facilitiesChecklist
            : (facilitiesChecklist ? [facilitiesChecklist] : []);

        if (!checklist.length) return '';

        const items = checklist.map(item => `
            <span style="display:inline-block; padding: 6px 12px; margin: 4px; background-color: #F3F4F6; color: #4B5563; border-radius: 20px; font-size: 13px; border: 1px solid #E5E7EB;">
                ${item}
            </span>
        `).join('');

        return `
            <tr>
                <td style="padding-bottom: 25px;">
                    <div style="font-size: 11px; text-transform: uppercase; color: #9CA3AF; letter-spacing: 1px; margin-bottom: 10px; font-weight: bold;">
                        Requested Extras
                    </div>
                    <div>${items}</div>
                </td>
            </tr>
        `;
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
    <body style="margin: 0; padding: 0; background-color: #F3E8FF;">
        
        <!-- VML Gradient Background for Outlook -->
        <!--[if gte mso 9]>
        <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
            <v:fill type="gradient" color1="#8B5CF6" color2="#3B82F6" angle="135" />
        </v:background>
        <![endif]-->

        <!-- CSS Gradient for Web -->
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background: linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%);">
            <tr>
                <td align="center" style="padding: 60px 20px;">
                    
                    <!-- GLASS CARD CONTAINER -->
                    <!-- Outlook logic: Card is just a rounded table -->
                    <table border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
                        
                        <!-- HEADER STRIPE (Thin) -->
                        <tr>
                            <td height="6" style="background: linear-gradient(90deg, #C084FC, #818CF8); font-size: 0; line-height: 0;">&nbsp;</td>
                        </tr>

                        <!-- CONTENT PADDING -->
                        <tr>
                            <td style="padding: 40px 50px;">
                                
                                <!-- BRANDING -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="left" style="padding-bottom: 30px;">
                                            <span style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-weight: 800; font-size: 20px; color: #7C3AED; letter-spacing: -0.5px;">
                                                antigravity<span style="color:#C084FC;">.app</span>
                                            </span>
                                        </td>
                                        <td align="right" style="padding-bottom: 30px;">
                                            <span style="background-color: #F0FDFA; color: #0D9488; padding: 6px 12px; border-radius: 12px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; font-weight: bold;">
                                                Confirmed
                                            </span>
                                        </td>
                                    </tr>
                                </table>

                                <!-- TITLE -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 32px; font-weight: bold; color: #111827; letter-spacing: -0.5px; line-height: 1.2; padding-bottom: 15px;">
                                            ${eventName}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; color: #6B7280; line-height: 1.5; padding-bottom: 30px;">
                                            You're all set! We've reserved your spot for this session. Add it to your calendar so you don't miss out.
                                        </td>
                                    </tr>
                                </table>

                                <!-- INFO GRID -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#F9FAFB" style="border-radius: 12px;">
                                    <tr>
                                        <td style="padding: 24px;">
                                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                                <!-- Row 1 -->
                                                <tr>
                                                    <td width="50%" valign="top" style="padding-bottom: 20px;">
                                                        <div style="font-size: 11px; text-transform: uppercase; color: #9CA3AF; letter-spacing: 1px; margin-bottom: 4px; font-weight: bold;">Date & Time</div>
                                                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1F2937;">
                                                            ${eventDate}${seriesEndDate ? ` to ${seriesEndDate}` : ''}<br>${timeString}
                                                        </div>
                                                    </td>
                                                    <td width="50%" valign="top" style="padding-bottom: 20px;">
                                                        <div style="font-size: 11px; text-transform: uppercase; color: #9CA3AF; letter-spacing: 1px; margin-bottom: 4px; font-weight: bold;">Location</div>
                                                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1F2937;">
                                                            ${Array.isArray(location) ? location.join(', ') : location}
                                                        </div>
                                                    </td>
                                                </tr>
                                                <!-- Row 2 -->
                                                 <tr>
                                                    <td width="50%" valign="top">
                                                        <div style="font-size: 11px; text-transform: uppercase; color: #9CA3AF; letter-spacing: 1px; margin-bottom: 4px; font-weight: bold;">Department</div>
                                                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; color: #1F2937;">
                                                            ${department}
                                                        </div>
                                                    </td>
                                                    <td width="50%" valign="top">
                                                        <!-- Empty for balance or Future expansion -->
                                                    </td>
                                                </tr>
                                            </table>
                                        </td>
                                    </tr>
                                </table>

                                <!-- SPACER -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr><td height="30" style="font-size:0; line-height:0;">&nbsp;</td></tr>
                                </table>

                                <!-- EXTRAS -->
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    ${getFacilitiesHtml()}
                                </table>

                            </td>
                        </tr>

                        <!-- FOOTER -->
                        <tr>
                            <td bgcolor="#F9FAFB" style="padding: 20px 50px; border-top: 1px solid #F3F4F6;">
                                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                    <tr>
                                        <td align="center" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #9CA3AF;">
                                            &copy; ${new Date().getFullYear()} University of Greenwich. All rights reserved.
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
