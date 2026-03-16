/**
 * Email Template Registry
 * Central registry cho tất cả email templates
 */

const TEMPLATES = {
    'minimalist-premium': {
        id: 'minimalist-premium',
        name: 'Minimalist Premium',
        description: 'Navy + Gold, elegant & timeless',
        thumbnail: '/assets/email-thumbnails/minimalist-premium.png',
        colors: {
            primary: '#1E293B',
            accent: '#F59E0B'
        },
        compatibility: 5, // 1-5 rating
        categories: ['professional', 'safe', 'corporate'],
        renderFunction: require('./renders/minimalistPremium')
    },
    'modern-gradient': {
        id: 'modern-gradient',
        name: 'Modern Gradient',
        description: 'Purple gradients với glassmorphism',
        thumbnail: '/assets/email-thumbnails/modern-gradient.png',
        colors: {
            primary: '#667EEA',
            accent: '#764BA2'
        },
        compatibility: 3,
        categories: ['modern', 'creative', 'bold'],
        renderFunction: require('./renders/modernGradient')
    },
    'neubrutalism': {
        id: 'neubrutalism',
        name: 'Neubrutalism',
        description: 'Bright colors, Gen-Z style',
        thumbnail: '/assets/email-thumbnails/neubrutalism.png',
        colors: {
            primary: '#000000',
            accent: '#FBBF24'
        },
        compatibility: 5,
        categories: ['playful', 'bold', 'youth'],
        renderFunction: require('./renders/neubrutalism')
    },
    'geometric-modern': {
        id: 'geometric-modern',
        name: 'Geometric Modern',
        description: 'Colorful shapes, Bauhaus inspired',
        thumbnail: '/assets/email-thumbnails/geometric-modern.png',
        colors: {
            primary: '#3B82F6',
            accent: '#EC4899'
        },
        compatibility: 4,
        categories: ['creative', 'modern', 'playful'],
        renderFunction: require('./renders/geometric')
    },
    'monochrome-minimal': {
        id: 'monochrome-minimal',
        name: 'Monochrome Minimal',
        description: 'Black/White/Red, Swiss design',
        thumbnail: '/assets/email-thumbnails/monochrome-minimal.png',
        colors: {
            primary: '#000000',
            accent: '#EF4444'
        },
        compatibility: 5,
        categories: ['minimal', 'professional', 'editorial'],
        renderFunction: require('./renders/monochrome')
    },
    'japanese-zen': {
        id: 'japanese-zen',
        name: 'Japanese Zen',
        description: 'Wabi-sabi, minimal, calm (Outlook Compatible)',
        thumbnail: '/assets/email-thumbnails/japanese-zen.png',
        colors: {
            primary: '#78716C',
            accent: '#DC2626'
        },
        compatibility: 4,
        categories: ['minimal', 'calm', 'cultural'],
        renderFunction: require('./renders/japaneseZen')
    },
    'academic': {
        id: 'academic',
        name: 'Academic/University',
        description: 'Burgundy + Gold, traditional',
        thumbnail: '/assets/email-thumbnails/academic.png',
        colors: {
            primary: '#7C2D12',
            accent: '#F59E0B'
        },
        compatibility: 5,
        categories: ['formal', 'traditional', 'prestigious'],
        renderFunction: require('./renders/academic')
    },
    'split-screen': {
        id: 'split-screen',
        name: 'Split-Screen',
        description: 'Corporate Vibrant V3 (Outlook Compatible)',
        thumbnail: '/assets/email-thumbnails/split-screen.png',
        colors: {
            primary: '#14B8A6',
            accent: '#F97316'
        },
        compatibility: 4,
        categories: ['modern', 'bold', 'creative'],
        renderFunction: require('./renders/splitScreen')
    }
};

/**
 * Get template by ID
 */
function getTemplate(templateId) {
    const template = TEMPLATES[templateId];
    if (!template) {
        console.warn(`[TEMPLATE REGISTRY] Template "${templateId}" not found`);
        return null;
    }
    return template;
}

/**
 * Get all templates
 */
function getAllTemplates() {
    return Object.values(TEMPLATES);
}

/**
 * Get template metadata (without render function for API responses)
 */
function getTemplateMetadata() {
    return Object.values(TEMPLATES).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        thumbnail: template.thumbnail,
        colors: template.colors,
        compatibility: template.compatibility,
        categories: template.categories
    }));
}

/**
 * Check if template ID is valid
 */
function isValidTemplate(templateId) {
    return templateId && TEMPLATES.hasOwnProperty(templateId);
}

module.exports = {
    getTemplate,
    getAllTemplates,
    getTemplateMetadata,
    isValidTemplate,
    TEMPLATES
};
