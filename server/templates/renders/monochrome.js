/**
 * Monochrome Minimal Template Renderer
 * Black/White/Red Swiss design
 */

const renderBase = require('./baseTemplate');

module.exports = function renderMonochrome(title, bodyContent) {
    return renderBase(title, bodyContent, {
        headerBg: '#000000', // Pure black
        headerText: '#FFFFFF',
        accentColor: '#EF4444', // Red accent
        accentBorder: '#EF4444',
        bgColor: '#FFFFFF',
        badgeBg: '#FFFFFF',
        badgeText: '#000000',
        badgeBorder: '#000000',
        headerTopBorder: '#EF4444',
        footerBg: '#FAFAFA'
    });
};
