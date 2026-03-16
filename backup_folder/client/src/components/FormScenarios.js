export const FORM_SCENARIOS = [
    {
        id: 'entry_exit',
        label: '1. Đăng ký Ra/Vào',
        options: [
            {
                id: 'self_transport',
                label: 'Tự vận chuyển',
                forms: ['form09']
            },
            {
                id: 'outsourced_transport',
                label: 'Nhân sự ngoài vận chuyển',
                forms: ['form04', 'form09']
            }
        ]
    },
    {
        id: 'construction',
        label: '2. Đăng ký Thi công',
        options: [
            {
                id: 'simple_construction',
                label: 'Thi công đơn giản (Backdrop, ngắn hạn...)',
                forms: ['form01', 'form03', 'form04', 'form09', 'penalty-violation']
            },
            {
                id: 'fixed_construction',
                label: 'Thi công cố định (Nội thất, dài hạn...)',
                forms: ['form01', 'form03', 'form04', 'form07', 'form08', 'form09', 'penalty-violation']
            }
        ]
    },
    {
        id: 'event',
        label: '3. Sự kiện',
        options: [
            {
                id: 'event_decor',
                label: 'Có thi công trang trí',
                forms: ['form01', 'form03', 'form04', 'form09', 'penalty-violation', 'event-application']
            },
            {
                id: 'event_no_decor',
                label: 'Không thi công trang trí',
                forms: ['event-application']
            }
        ]
    }
];

export const mapEventToFormData = (event) => {
    if (!event) return {};

    // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    };

    return {
        ...event,
        // Form 03 & 14: Construction/Penalty
        contractorName: event.contractorName || '',
        constructionContent: event.constructionContent || '',
        constructionLocation: event.location || '',
        constructionTimeStart: event.constructionStartDate || event.constructionTime || event.eventDate, // Fallback
        constructionTimeEnd: event.constructionEndDate || event.constructionTime || event.eventEndDate || event.eventDate,
        constructionStartDate: event.constructionStartDate || event.constructionTime || '',
        constructionEndDate: event.constructionEndDate || event.constructionTime || '',
        constructionStartTime: event.constructionStartTime || '',
        constructionEndTime: event.constructionEndTime || '',
        equipmentInOut: event.equipmentInOut || [],

        // Form 15: Event Application
        eventType: event.eventName || '',
        eventLocation: event.location || '',
        eventDate: formatDate(event.eventDate),
        eventDescription: event.content || '',

        // Form 05: Working Permit
        workingDate: formatDate(event.eventDate),
        workingLocation: event.location || '',

        // Contact Info
        registrantName: event.registrantName || 'NGUYỄN THANH HUY',
        contactPhone: event.contactPhone || '0813995911',
    };
};
