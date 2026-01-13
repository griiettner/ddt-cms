# CMS for Data-Driven Testing (DDT)

A web-based Content Management System for managing Data-Driven Testing test cases, designed to replace Google Sheets and provide REST API access for Playwright test automation.

## 🎯 Project Status

**Phase**: Backend Foundation (Week 1)
**Version**: 0.1.0 (POC)
**Status**: ✅ Docker environment running with hot reload

### What's Working

✅ Docker-based development environment with hot reload
✅ SQLite database with complete schema (6 tables)
✅ Database migrations and seeding
✅ Express server serving both static files and API
✅ User identification middleware (placeholder for POC)
✅ Dashboard UI with Capital One branding
✅ Health and status endpoints

### What's Next

- Implement REST API endpoints (Releases, Test Sets, Test Cases, Test Steps, Config)
- Build Test Sets management page
- Build Test Cases page with AG Grid inline editing
- Build Settings page for configuration management
- Add Playwright integration endpoints

## 🚀 Quick Start

### Prerequisites

- Docker 20+ (with Docker Compose v2)
- No Node.js installation needed - everything runs in Docker!

### Start Development Environment

```bash
# Start the application (builds on first run)
docker compose up

# Or run in background
docker compose up -d

# View logs
docker compose logs -f app
```

The application will be available at:
- **Dashboard**: http://localhost:3000
- **API**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

### Stop the Application

```bash
# Stop containers
docker compose down

# Stop and remove volumes (clears database)
docker compose down -v
```

## 🔥 Hot Reload

Both backend and frontend have hot reload enabled:

- **Backend**: Changes to `server/**/*.js` automatically restart the server (nodemon)
- **Frontend**: Changes to `public/**/*` are immediately available (refresh browser)
- **Database**: Persisted in `./data/` directory (survives container restarts)

## 📁 Project Structure

```
cms-uat/
├── server/                    # Backend (Node.js + Express)
│   ├── index.js              # Main server file
│   ├── db/
│   │   ├── database.js       # SQLite connection
│   │   ├── migrations.js     # Database schema
│   │   └── seed.js           # Default data
│   ├── middleware/
│   │   ├── auth.js           # User identification
│   │   └── errorHandler.js  # Error handling
│   ├── routes/               # API endpoints (to be implemented)
│   └── utils/
├── public/                    # Frontend (HTML, CSS, JS)
│   ├── index.html            # Dashboard page
│   ├── js/
│   │   └── dashboard.js      # Dashboard logic
│   └── css/
├── data/                      # SQLite database files
│   └── cms-ddt.db
├── .context/                  # Documentation
├── docker-compose.yml         # Development environment
├── Dockerfile                 # Development image (with hot reload)
├── Dockerfile.prod            # Production image (no hot reload)
├── package.json
└── .env                       # Environment variables
```

## 🗄️ Database Schema

### Tables
- **releases** - Release version management (v1.0.0, v2.0.0, etc.)
- **test_sets** - Test categorization/grouping
- **test_cases** - Individual test scenarios (displayed as accordions)
- **test_steps** - Test data rows (7 columns: Step Definition, Type, ID, Action, Action Result, Required, Expected Results)
- **configuration_options** - Dynamic Types and Actions (configurable via Settings page)
- **test_runs** - Test execution history and results

### Sample Data

On first run, the database is automatically seeded with:
- 1 release (v1.0.0)
- 1 sample test set
- 1 sample test case
- 3 sample test steps
- 5 Type options (Navigation, Interaction, Validation, Data Entry, Wait)
- 8 Action options (Active, Visible, Click, Text Match, Text Plain, URL, Custom Select, Options Match)

## 🎨 Design System

The application uses Capital One's color palette and branding:

- **Primary Blue**: #004879
- **Secondary Red**: #DA0025
- **Success Green**: #00A758
- **Warning Yellow**: #FDB71A
- **Neutral Grays**: 50-900 scale

See [`.context/DESIGN_SYSTEM.md`](.context/DESIGN_SYSTEM.md) for complete design guidelines.

## 🔧 Development

### Building CSS

The application uses **local Tailwind CSS** (no CDN dependencies for corporate compliance).

```bash
# Rebuild CSS (automatically runs on npm run dev/start)
docker compose exec app npm run build:css

# Watch CSS changes (for active development)
docker compose exec app npm run watch:css
```

**Note**: CSS is automatically built when the container starts, so you typically don't need to run these commands manually.

### Database Operations

```bash
# Initialize database (creates tables)
docker compose exec app npm run db:init

# Seed database (adds default data)
docker compose exec app npm run db:seed

# Access database directly
docker compose exec app sqlite3 /app/data/cms-ddt.db
```

### Testing Endpoints

```bash
# Health check
curl http://localhost:3000/health

# API status
curl http://localhost:3000/api/status
```

### View Logs

```bash
# All logs
docker compose logs -f

# Last 50 lines
docker compose logs --tail 50 app
```

## 📚 Documentation

Comprehensive documentation is available in the `.context/` directory:

- [`PROJECT_OVERVIEW.md`](.context/PROJECT_OVERVIEW.md) - Project goals, scope, and stakeholders
- [`ARCHITECTURE.md`](.context/ARCHITECTURE.md) - System architecture and technical design
- [`DEVELOPMENT_GUIDE.md`](.context/DEVELOPMENT_GUIDE.md) - Developer setup and coding standards
- [`DECISIONS.md`](.context/DECISIONS.md) - Architectural decisions (17 documented)
- [`CONSTITUTIONS.md`](.context/CONSTITUTIONS.md) - Core principles and conventions
- [`ROADMAP.md`](.context/ROADMAP.md) - Implementation timeline
- [`RISKS.md`](.context/RISKS.md) - Risk assessment and mitigation
- [`DESIGN_SYSTEM.md`](.context/DESIGN_SYSTEM.md) - Capital One branding and visual design
- [`CHANGELOG.md`](.context/CHANGELOG.md) - Version history

## 🔒 Authentication

**POC**: Uses placeholder user from environment variables (`DEFAULT_USER`)

**Production**: Extracts authenticated user from HTTP headers (enterprise network layer handles authentication)

No SSO integration needed - network-level authentication only.

## 🎯 Roadmap

### Week 1: Backend Foundation ✅
- [x] Project setup and Docker environment
- [x] Database schema and migrations
- [x] Express server with static file serving
- [x] User identification middleware
- [x] Basic dashboard UI
- [ ] Core API endpoints (Releases, Test Sets, Test Cases, Test Steps, Config)

### Week 2: Frontend Core
- [ ] Test Sets management page
- [ ] Navigation and routing
- [ ] API client utilities
- [ ] Floating action buttons
- [ ] Modal components

### Week 3: Test Cases & Editing
- [ ] Test Cases page with accordions
- [ ] AG Grid inline editing (7 columns)
- [ ] Dynamic Action Result editors
- [ ] Keyboard shortcuts
- [ ] Auto-save functionality
- [ ] Settings page

### Week 4: Polish & Testing
- [ ] Playwright integration API
- [ ] Test run logging
- [ ] Bug fixes and polish
- [ ] Complete documentation
- [ ] Ready for POC demo

## 🤝 Contributing

This is a Capital One POC project. See [`.context/DEVELOPMENT_GUIDE.md`](.context/DEVELOPMENT_GUIDE.md) for coding standards and contribution guidelines.

## 📄 License

UNLICENSED - Capital One Internal Project

---

**Last Updated**: 2026-01-13
**Maintained By**: Capital One Team
**Version**: 0.1.0
