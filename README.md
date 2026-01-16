# UAT CMS - Test Builder

A specialized Content Management System (CMS) designed for **Data-Driven Testing (DDT)**. This tool allows test engineers to manage release-specific test sets, cases, scenarios, and step definitions with a professional, spreadsheet-like interface.

## 📋 Problem & Solution

### The Problem

In large-scale UAT (User Acceptance Testing), managing test data across multiple releases is often chaotic. Teams frequently struggle with:

- **Version Control**: Tracking changes to test steps between release 1.0 and 2.0.
- **Data Persistence**: Losing historical test configurations.
- **User Interface**: Editing complex nested test hierarchies (Set > Case > Scenario > Step) in raw JSON or rigid forms is error-prone.
- **Execution Bottlenecks**: Difficulty in running specific tests "on the fly" without complex environment setups.
- **Reporting Gaps**: Lack of comprehensive results, making it hard to track failures at both a granular (test-case) and general (release-level) scale.
- **Late Error Discovery**: Discovering critical test script or data errors only on UAT release day, leading to delays and emergency fixes.

### The Solution

DDT CMS provides a centralized, versioned repository for test definitions:

- **Multi-Tenant Releases**: Each release has its own isolated database.
- **Smart Cloning**: Creating a new release automatically copies all data from the previous one, allowing for easy regression updates.
- **Dynamic Editor**: A high-performance UI (using Handsontable-inspired logic) for managing billions of test permutations.
- **Early Verification**: Ability to run and validate test scenarios weeks before the actual UAT release day, ensuring scripts are error-free.
- **On-the-Fly Execution**: Push-button service to trigger integrated 7PS Playwright tests using dynamically generated JSON configurations, providing immediate feedback.
- **Comprehensive Reporting**: Built-in reporting dashboards providing both high-level release health and granular test-case drill-downs.
- **Export Ready**: One-click JSON/CSV export for manual data consumption or external automation pipelines.

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18 or higher (v22 recommended)
- **npm**: v9 or higher
- **Docker** (optional, for containerized execution)

### Local Development

1. **Clone the repository**:

   ```bash
   git clone <repository-url>
   cd cms-uat
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Configure Environment**:
   Copy `.env.example` to `.env` and adjust the configuration as needed.

   ```bash
   cp .env.example .env
   ```

4. **Run the Application**:
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3030`.

### Running with Docker

The project includes a `docker-compose.yml` for quick setup:

```bash
docker compose up -d
```

## 🏗️ Architecture

- **Backend**: Node.js + Express
- **Database**: SQLite (`better-sqlite3`)
- **Frontend**: Vanilla JavaScript + Tailwind CSS
- **Persistence**:
  - `registry.db`: Global data (Releases, Metrics).
  - `releases/{id}.db`: Release-specific test data.

## 📦 Key Dependencies

| Dependency       | Purpose                                      |
| :--------------- | :------------------------------------------- |
| `express`        | Web server framework                         |
| `better-sqlite3` | High-performance SQLite driver               |
| `tailwindcss`    | Utility-first CSS styling                    |
| `helmet`         | Security headers                             |
| `concurrently`   | Runs dev server and CSS watch simultaneously |

## 🚀 Future Roadmap

The project is currently in the POC (Proof of Concept) phase. A migration path to **AWS Aurora PostgreSQL** and **AWS Lambda** is already established.

## 📄 License

Internal Property - Capital One UAT Team.
