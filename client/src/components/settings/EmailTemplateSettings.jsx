import React, { useState, useEffect } from 'react';
import { Palette, Check, Loader2 } from 'lucide-react';
import { useToast } from '../Toast';
import './EmailTemplateSettings.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const EmailTemplateSettings = () => {
    const { addToast } = useToast();
    const [templates, setTemplates] = useState([]);
    const [currentAssignments, setCurrentAssignments] = useState({});
    const [showGallery, setShowGallery] = useState(false);
    const [editingType, setEditingType] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const notificationTypes = [
        { id: 'created', label: 'Thông báo tạo sự kiện' },
        { id: 'updated', label: 'Thông báo cập nhật' },
        { id: 'reminder_1day', label: 'Nhắc nhở 1 ngày trước' },
        { id: 'reminder_1hour', label: 'Nhắc nhở 1 giờ trước' }
    ];

    // Load templates and settings
    useEffect(() => {
        const loadData = async () => {
            try {
                // Load available templates
                const templatesRes = await fetch(`${API_BASE}/settings/email-templates`);
                const templatesData = await templatesRes.json();
                setTemplates(templatesData);

                // Load current assignments from settings
                const settingsRes = await fetch(`${API_BASE}/settings`);
                const settingsData = await settingsRes.json();

                const assignments = {};
                if (settingsData.templates) {
                    settingsData.templates.forEach(t => {
                        assignments[t.id] = t.emailTemplate || 'minimalist-premium';
                    });
                }

                // Set defaults for types not in settings
                notificationTypes.forEach(type => {
                    if (!assignments[type.id]) {
                        assignments[type.id] = 'minimalist-premium';
                    }
                });

                setCurrentAssignments(assignments);
            } catch (error) {
                console.error('Error loading templates:', error);
                addToast('Failed to load templates', 'error');
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);

    const openGallery = (type) => {
        setEditingType(type);
        setShowGallery(true);
    };

    const handleSelectTemplate = async (templateId) => {
        setIsSaving(true);
        try {
            const response = await fetch(`${API_BASE}/settings/templates/${editingType}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ templateId })
            });

            if (response.ok) {
                setCurrentAssignments(prev => ({
                    ...prev,
                    [editingType]: templateId
                }));
                addToast('Template saved successfully', 'success');
                setShowGallery(false);
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving template:', error);
            addToast('Failed to save template', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="email-template-loading">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading templates...</span>
            </div>
        );
    }

    return (
        <div className="email-template-settings">
            <div className="section-header">
                <Palette className="w-5 h-5" />
                <h3>Email Template Configuration</h3>
            </div>
            <p className="section-description">
                Choose email template design for each notification type
            </p>

            <div className="template-assignments">
                {notificationTypes.map(type => {
                    const template = templates.find(t => t.id === currentAssignments[type.id]);
                    if (!template) return null;

                    return (
                        <div key={type.id} className="template-assignment">
                            <label className="assignment-label">{type.label}</label>
                            <div className="current-template-card">
                                <div className="template-info">
                                    <div className="template-preview">
                                        <div className="color-dots">
                                            <span
                                                className="color-dot"
                                                style={{ background: template.colors.primary }}
                                            />
                                            <span
                                                className="color-dot"
                                                style={{ background: template.colors.accent }}
                                            />
                                        </div>
                                    </div>
                                    <div className="template-details">
                                        <h4>{template.name}</h4>
                                        <p>{template.description}</p>
                                        <div className="template-meta">
                                            <span className="compatibility">
                                                {Array.from({ length: template.compatibility }).map((_, i) => (
                                                    <span key={i}>⭐</span>
                                                ))}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    className="btn-change"
                                    onClick={() => openGallery(type.id)}
                                >
                                    Đổi Template
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Gallery Modal */}
            {showGallery && (
                <div className="modal-overlay" onClick={() => setShowGallery(false)}>
                    <div className="modal-content template-gallery" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Chọn Email Template</h2>
                            <button
                                className="btn-close"
                                onClick={() => setShowGallery(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="template-grid">
                            {templates.map(template => {
                                const isSelected = currentAssignments[editingType] === template.id;
                                return (
                                    <div
                                        key={template.id}
                                        className={`template-card ${isSelected ? 'selected' : ''}`}
                                        onClick={() => handleSelectTemplate(template.id)}
                                    >
                                        <div className="template-card-colors">
                                            <div
                                                className="color-bar"
                                                style={{ background: template.colors.primary }}
                                            />
                                            <div
                                                className="color-bar"
                                                style={{ background: template.colors.accent }}
                                            />
                                        </div>
                                        <div className="template-card-info">
                                            <h4>{template.name}</h4>
                                            <p>{template.description}</p>
                                            <div className="template-categories">
                                                {template.categories.slice(0, 2).map(cat => (
                                                    <span key={cat} className="category-tag">{cat}</span>
                                                ))}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className="selected-badge">
                                                <Check className="w-4 h-4" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {isSaving && (
                            <div className="saving-overlay">
                                <Loader2 className="w-6 h-6 animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailTemplateSettings;
