# 🛡️ Heimdall AI - Healthcare Security Guardian

<div align="center">

![Heimdall AI Logo](/ChatGPT%20Image%20Jun%2016,%202025,%2012_28_31%20PM.png)

**AI-Powered Medical IoT Threat Detection System for Botswana Healthcare**

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green.svg)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4.1-blue.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

## 🌟 Overview

Heimdall AI is a cutting-edge healthcare security platform designed specifically for medical IoT devices in Botswana's healthcare system. Named after the Norse guardian of the rainbow bridge, this system stands watch over critical medical infrastructure, detecting threats and anomalies before they can compromise patient safety or data security.

### 🎯 Mission Statement

To safeguard Botswana's healthcare infrastructure by providing real-time threat detection, comprehensive monitoring, and intelligent analysis of medical IoT devices, ensuring the highest standards of patient safety and data security.

## ✨ Key Features

### 🔍 **Real-Time Threat Detection**
- AI-powered anomaly detection using advanced machine learning algorithms
- Continuous monitoring of medical device telemetry data
- Automated threat classification and severity assessment
- Real-time alerts for critical security incidents

### 📊 **Comprehensive Dashboard**
- Intuitive overview of all connected medical devices
- Live threat status monitoring with visual indicators
- Interactive charts and analytics for trend analysis
- Customizable widgets for different user roles

### 🏥 **Medical Device Management**
- Support for various medical IoT devices (ECG monitors, patient monitors, diagnostic equipment)
- Device registration and configuration management
- Location-based device tracking and status monitoring
- Telemetry data collection and analysis

### 🔗 **External System Integration**
- Seamless integration with existing healthcare management systems
- RESTful API for third-party system connectivity
- Secure data synchronization across multiple platforms
- Audit logging for compliance and security tracking

### 📈 **Advanced Reporting**
- Automated report generation with customizable templates
- Scheduled reports for regular security assessments
- Export capabilities (PDF, Excel, CSV formats)
- Historical data analysis and trend reporting

### 👥 **Role-Based Access Control**
- **Admin**: Full system access and user management

## 🏗️ Architecture

### Technology Stack

**Frontend:**
- **React 18.3.1** - Modern UI framework with hooks and context
- **TypeScript** - Type-safe development environment
- **Tailwind CSS** - Utility-first CSS framework for beautiful designs
- **Lucide React** - Beautiful, customizable icons
- **Recharts** - Responsive chart library for data visualization
- **React Router** - Client-side routing and navigation

**Backend:**
- **Supabase** - Backend-as-a-Service with PostgreSQL database
- **PostgreSQL** - Robust relational database with JSONB support
- **Row Level Security (RLS)** - Database-level security policies
- **Edge Functions** - Serverless functions for AI processing

**AI & Analytics:**
- **OpenAI GPT-4** - Advanced threat analysis and pattern recognition
- **Custom ML Models** - Specialized medical device anomaly detection
- **Real-time Processing** - Stream processing for immediate threat detection

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Git**
- **Supabase Account** (free tier available)

### Installation

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/heimdall-ai-healthcare.git
   cd heimdall-ai-healthcare
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Database Setup**
   - Import the migration files from `supabase/migrations/` into your Supabase project
   - Or use Supabase CLI: `supabase db reset`

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Access the Application**
   - Open [http://localhost:5173](http://localhost:5173)
   - Login with default credentials:
     - **Email**: `mudhirabu@gmail.com`
     - **Password**: `admin123`

## 📱 Usage Guide

### Getting Started

1. **Dashboard Overview**
   - View real-time system status and key metrics
   - Monitor active threats and device health
   - Access quick actions and navigation

2. **Device Management**
   - Register new medical IoT devices
   - Configure device settings and locations
   - Monitor device status and telemetry data

3. **Threat Monitoring**
   - View detected threats by severity level
   - Investigate threat details and recommendations
   - Acknowledge and resolve security incidents

4. **System Integration**
   - Connect external healthcare systems
   - Configure API endpoints and authentication
   - Monitor integration status and logs

5. **Reporting & Analytics**
   - Generate security reports and compliance documents
   - Schedule automated reports for stakeholders
   - Export data for further analysis

### API Integration

Connect your medical devices using our RESTful API:

```javascript
// Device Registration
POST /api/devices/register
{
  "device_name": "ECG Monitor 001",
  "device_type": "monitoring",
  "location": "Ward A, Room 101"
}

// Telemetry Data Submission
POST /api/telemetry
{
  "device_id": "uuid",
  "metrics": {
    "cpu_usage": 45.2,
    "memory_usage": 67.8,
    "network_traffic": 234.5
  }
}
```

## 🔧 Development

### Project Structure

```
heimdall-ai-healthcare/
├── 📁 src/
│   ├── 📁 components/          # Reusable UI components
│   │   ├── DeviceStatusCard.tsx
│   │   ├── ThreatCard.tsx
│   │   └── NotificationDropdown.tsx
│   ├── 📁 pages/              # Main application pages
│   │   ├── Dashboard.tsx
│   │   ├── Devices.tsx
│   │   ├── Threats.tsx
│   │   └── ExternalSystems.tsx
│   ├── 📁 context/            # React context providers
│   │   └── UserContext.tsx
│   ├── 📁 services/           # API services and utilities
│   │   └── api.ts
│   └── 📁 lib/               # Configuration and utilities
│       └── supabase.ts
├── 📁 supabase/
│   ├── 📁 functions/          # Edge functions for AI processing
│   │   ├── threat-analyzer/
│   │   ├── system-integration/
│   │   └── system-monitor/
│   └── 📁 migrations/         # Database schema migrations
└── 📁 public/                # Static assets
```

### Available Scripts

```bash
# Development
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build

# Code Quality
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking

# Database
npm run db:reset     # Reset database with migrations
npm run db:seed      # Seed database with sample data
```


### Security Features

- **End-to-End Encryption** for all data transmission
- **Row-Level Security (RLS)** for database access control
- **JWT Authentication** with secure session management
- **API Rate Limiting** to prevent abuse
- **Audit Logging** for all system activities

### Compliance Standards

- **HIPAA Compliant** - Healthcare data protection
- **GDPR Ready** - European data protection regulation
- **ISO 27001** - Information security management
- **SOC 2 Type II** - Security and availability controls

## 📊 Performance & Monitoring


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 📈 Roadmap

### Upcoming Features

- **Mobile Application** - iOS and Android apps for on-the-go monitoring
- **Advanced AI Models** - Enhanced threat detection with federated learning
- **Blockchain Integration** - Immutable audit trails for compliance
- **Multi-language Support** - Localization for regional healthcare systems
- **Predictive Analytics** - Proactive threat prevention and device maintenance


<div align="center">