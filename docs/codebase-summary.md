# Codebase Summary

**Last Updated**: 2026-01-16
**Version**: 1.0.0
**Project**: FGW Event Manager (Antigravity)

## Overview

Antigravity is a **full-stack Event Management System** designed for educational institutions (FPT Greenwich). It enables staff to create, manage, and track events with features including logistics planning, analytics dashboards, print templates, and email notifications.

## Project Structure

```
antigravity/
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── components/     # React components (22 main + 6 subdirs)
│   │   ├── context/        # React Context (Auth, Notifications)
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API service layer
│   │   ├── firebase/       # Firebase client config
│   │   ├── layout/         # App layout components
│   │   └── lib/            # Utility functions
│   └── package.json
├── server/                 # Express.js Backend
│   ├── controllers/        # Route handlers (11 files)
│   ├── routes/             # Express routes (11 files)
│   ├── services/           # Business logic (6 files)
│   ├── middleware/         # Auth, error handling
│   ├── config/             # Firebase admin config
│   ├── utils/              # Helper functions
│   └── package.json
├── docs/                   # Project documentation
│   ├── project-overview-pdr.md
│   ├── system-architecture.md
│   ├── project-roadmap.md
│   ├── code-standards.md
│   └── journals/           # Development journals
├── .gemini/                # AI Agent configuration
└── .agent/                 # Workflow definitions
```

## Core Technologies

### Frontend (`client/`)
| Category | Technology | Version |
|----------|------------|---------|
| Framework | React | 18.2 |
| Build Tool | Vite | 5.2 |
| Styling | TailwindCSS | 3.4 |
| Animations | Framer Motion | 11.0 |
| Charts | Recharts | 3.6 |
| Icons | Lucide React | 0.344 |
| Forms | React Hook Form | 7.51 |
| Routing | React Router DOM | 6.22 |
| Drag & Drop | dnd-kit | 6.3 |
| Auth/DB | Firebase | 12.6 |
| HTTP Client | Axios | 1.7 |
| Date Utils | date-fns | 4.1 |

### Backend (`server/`)
| Category | Technology | Version |
|----------|------------|---------|
| Framework | Express | 5.1 |
| Database | Firebase Admin | 13.6 |
| Email | Nodemailer | 7.0 |
| PDF Generation | Puppeteer | 24.32 |
| Excel Processing | ExcelJS, xlsx | 4.4, 0.18 |
| File Upload | Multer | 2.0 |
| Environment | dotenv | 17.2 |

## Key Components

### Frontend Components (Top 10 by Size)
| Component | Size | Purpose |
|-----------|------|---------|
| `DepartmentGalaxy.jsx` | 72KB | Analytics dashboard with KPIs, charts, bento grid |
| `EventDashboard.jsx` | 60KB | Main event list and management interface |
| `EventForm.jsx` | 55KB | Event creation/editing form with validation |
| `PrintPortal.jsx` | 38KB | Print preview and PDF generation |
| `DepartmentManager.jsx` | 28KB | Department CRUD operations |
| `EventPreviewModal.jsx` | 28KB | Event detail modal with timeline |
| `CalendarView.jsx` | 18KB | Calendar visualization (react-big-calendar) |
| `LogisticsTimeline.jsx` | 18KB | Smart logistics planning timeline |
| `VenueMap.jsx` | 15KB | Interactive venue/location map |
| `LogisticsKanban.jsx` | 14KB | Drag-and-drop Kanban board |

### Backend Controllers
| Controller | Purpose |
|------------|---------|
| `eventController.js` | Event CRUD, conflict detection, status management |
| `importController.js` | Excel import/export functionality |
| `analyticsController.js` | Dashboard analytics aggregation |
| `usersController.js` | User management and roles |
| `backupController.js` | Data backup and restore |
| `departmentController.js` | Department CRUD |
| `settingsController.js` | Application settings |
| `resourceController.js` | Resource management |
| `pdfController.js` | PDF generation |
| `locationController.js` | Location/venue CRUD |
| `auditLogController.js` | Activity logging |

### Backend Services
| Service | Purpose |
|---------|---------|
| `emailService.js` | Transactional emails, notification templates |
| `notificationService.js` | Push notifications via Firebase |
| `conflictService.js` | Schedule conflict detection |
| `auditService.js` | Activity and audit logging |
| `pdfService.js` | PDF rendering with Puppeteer |
| `retentionService.js` | Data retention policies |

## API Endpoints

### Events `/api/events`
- `GET /` - List events with filters (date, department, status)
- `POST /` - Create new event
- `GET /:id` - Get event details
- `PUT /:id` - Update event
- `DELETE /:id` - Delete event
- `PUT /:id/status` - Update event status
- `GET /:id/pdf` - Generate PDF for event

### Analytics `/api/analytics`
- `GET /summary` - Dashboard data (KPIs, charts, heatmap, security watch)

### Users `/api/users`
- Standard CRUD + role management

### Departments `/api/departments`
- Standard CRUD operations

### Locations `/api/locations`
- Standard CRUD operations

### Import/Export `/api/import`
- `POST /excel` - Import events from Excel
- `GET /export` - Export events to Excel

### Backup `/api/backup`
- `POST /create` - Create backup
- `POST /restore` - Restore from backup

## Key Features

1. **Event Management**: Full CRUD with multi-location support and conflict detection
2. **Analytics Dashboard**: Neo-brutalism styled with KPI cards, heatmap calendar, pie charts
3. **Logistics Kanban**: Drag-and-drop task management with dnd-kit
4. **Print System**: 20+ customizable PDF templates for different event types
5. **Interactive Venue Map**: Visual location selection and capacity management
6. **Email Notifications**: Automated notifications with customizable templates
7. **Role-Based Access**: Admin, Staff, Viewer roles with protected routes
8. **Audit Logging**: Complete activity tracking for compliance
9. **Excel Import/Export**: Batch event management via spreadsheets
10. **Real-time Updates**: Firebase-powered live data synchronization

## Development Workflow

### Running Locally
```bash
# Terminal 1: Frontend
cd client && npm run dev

# Terminal 2: Backend
cd server && npm run dev
```

### Build for Production
```bash
cd client && npm run build
```

## File Statistics
- **Frontend Components**: 22 main files + 36 in subdirectories
- **Backend Controllers**: 11 files
- **Backend Services**: 6 files
- **Print Templates**: 20 files
- **Total Source Lines**: ~20,000+ LOC

## Recent Changes (2026-01)
- Simplified Analytics Dashboard (removed Focus Mode toggle)
- Location Usage statistics in Bento grid
- Code cleanup: removed 9 unused icon imports
- Fixed `focusMode` ReferenceError

## Related Documentation
- [Project Overview PDR](./project-overview-pdr.md)
- [System Architecture](./system-architecture.md)
- [Project Roadmap](./project-roadmap.md)
- [Code Standards](./code-standards.md)
