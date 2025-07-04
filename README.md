# Investracker - Investment Portfolio Tracking & Analytics

A comprehensive full-stack investment tracking and analytics application built with FastAPI (Python) backend and Next.js (TypeScript) frontend.

## 🎯 Project Overview

Investracker provides professional-grade investment portfolio tracking with advanced analytics, helping investors make informed decisions through comprehensive data visualization and performance metrics.

### Key Features

- **Portfolio Management**: Create and manage multiple investment portfolios
- **Transaction Tracking**: Record buy/sell transactions, dividends, fees, and splits
- **Advanced Analytics**: Time-weighted returns, Sharpe ratios, risk metrics
- **Asset Allocation**: Visual breakdown by asset class, sector, and region
- **Dividend Tracking**: Comprehensive dividend income analysis
- **ESG Integration**: Environmental, Social, Governance scoring
- **Performance Comparison**: Benchmark comparisons and peer analysis
- **Risk Analysis**: Volatility, correlation matrices, max drawdown calculations

## 🏗️ Architecture

### Backend (FastAPI + PostgreSQL)
- **Framework**: FastAPI with automatic OpenAPI documentation
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT-based with OAuth2 and refresh tokens
- **API Design**: RESTful with comprehensive error handling
- **Future**: Designed for easy MongoDB migration

### Frontend (Next.js + TypeScript)
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript for type safety
- **Styling**: Tailwind CSS with custom design system
- **State Management**: Redux Toolkit
- **Charts**: Recharts for data visualization
- **UI Components**: Headless UI with custom components

## 📁 Project Structure

```
Investracker/
├── backend/                    # FastAPI Backend
│   ├── app/
│   │   ├── api/v1/            # API endpoints
│   │   │   └── endpoints/     # Route handlers
│   │   ├── core/              # Core functionality
│   │   │   ├── auth.py        # Authentication logic
│   │   │   ├── config.py      # Configuration settings
│   │   │   └── database.py    # Database setup
│   │   ├── models/            # SQLAlchemy models
│   │   │   ├── user.py
│   │   │   ├── portfolio.py
│   │   │   ├── asset.py
│   │   │   ├── transaction.py
│   │   │   ├── holding.py
│   │   │   └── market_data.py
│   │   ├── schemas/           # Pydantic schemas
│   │   └── main.py           # FastAPI application
│   ├── requirements.txt
│   ├── .env.example
│   ├── init_db.py            # Database initialization
│   └── README.md
│
└── frontend/                  # Next.js Frontend
    ├── src/
    │   ├── app/              # App Router pages
    │   ├── components/       # React components
    │   │   ├── auth/        # Authentication components
    │   │   ├── dashboard/   # Dashboard components
    │   │   ├── portfolio/   # Portfolio components
    │   │   └── shared/      # Shared components
    │   ├── store/           # Redux store
    │   │   └── slices/      # Redux slices
    │   ├── services/        # API services
    │   ├── types/           # TypeScript types
    │   └── utils/           # Utility functions
    ├── package.json
    ├── tailwind.config.js
    └── README.md
```

## 🚀 Getting Started

### Prerequisites

- **Backend**: Python 3.8+, PostgreSQL 12+
- **Frontend**: Node.js 18+, npm/yarn
- **Development**: Git, IDE (VS Code recommended)

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**:
   ```bash
   copy .env.example .env
   # Edit .env with your database credentials
   ```

5. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE investracker_db;
   CREATE USER investracker_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE investracker_db TO investracker_user;
   ```

6. **Initialize database**:
   ```bash
   python init_db.py
   ```

7. **Run the backend**:
   ```bash
   uvicorn app.main:app --reload
   ```

   Backend will be available at: http://localhost:8000
   API Documentation: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up environment variables**:
   ```bash
   copy .env.example .env.local
   # Configure API URL and other settings
   ```

4. **Run the frontend**:
   ```bash
   npm run dev
   ```

   Frontend will be available at: http://localhost:3000

## 🔧 Configuration

### Backend Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/investracker_db

# JWT Authentication
SECRET_KEY=your-super-secret-key
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS
CORS_ORIGINS=["http://localhost:3000"]

# External APIs
ALPHA_VANTAGE_API_KEY=your-api-key
FINANCIAL_MODELING_PREP_API_KEY=your-api-key
```

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

## 📊 Database Schema

### Core Entities

1. **Users** - User accounts and preferences
2. **Portfolios** - Investment portfolios belonging to users
3. **Assets** - Financial instruments (stocks, bonds, ETFs, crypto)
4. **Transactions** - All portfolio transactions (buy/sell/dividend/fee)
5. **Holdings** - Current portfolio positions
6. **PriceHistory** - Historical price data for assets
7. **CurrencyRates** - Exchange rates for multi-currency support

### Key Relationships

- Users → Portfolios (1:Many)
- Portfolios → Assets (1:Many)
- Assets → Holdings (1:1)
- Assets → Transactions (1:Many)
- Assets → PriceHistory (1:Many)

## 🔐 API Authentication

The API uses JWT (JSON Web Tokens) for authentication:

1. **Login**: `POST /auth/login` - Returns access and refresh tokens
2. **Register**: `POST /auth/register` - Create new user account
3. **Refresh**: `POST /auth/refresh` - Get new access token
4. **Protected Routes**: Include `Authorization: Bearer <token>` header

## 📈 Analytics Features

### Portfolio Analytics
- Total portfolio value and performance
- Asset allocation by class, sector, region
- Risk metrics (volatility, Sharpe ratio, max drawdown)
- Time-weighted returns calculation

### Dividend Analysis
- Historical dividend income tracking
- Monthly/quarterly dividend projections
- Dividend yield calculations
- Payment calendar and alerts

### Performance Metrics
- Time-weighted return (TWR)
- Modified Dietz return
- Benchmark comparisons
- Risk-adjusted returns

## 🧪 Testing

### Backend Testing
```bash
cd backend
pytest
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 🚀 Deployment

### Production Considerations

1. **Security**: Use strong JWT secrets, enable HTTPS
2. **Database**: Use managed PostgreSQL service
3. **Monitoring**: Implement logging and error tracking
4. **Scaling**: Consider Redis for caching, load balancers

### Docker Deployment

```dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Frontend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

## 🔮 Future Enhancements

### Planned Features
- [ ] MongoDB migration support
- [ ] Real-time price data integration
- [ ] CSV/Excel import for transactions
- [ ] Mobile app (React Native)
- [ ] Advanced ESG scoring
- [ ] Tax optimization suggestions
- [ ] Social features (portfolio sharing)
- [ ] Robo-advisor integration

### Technical Improvements
- [ ] WebSocket support for real-time updates
- [ ] Advanced caching strategies
- [ ] Multi-language support
- [ ] Advanced error handling and retry logic
- [ ] Performance monitoring and analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript/Python best practices
- Write comprehensive tests
- Update documentation
- Follow commit message conventions

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Backend Development**: FastAPI, PostgreSQL, Authentication
- **Frontend Development**: Next.js, TypeScript, UI/UX
- **DevOps**: Docker, CI/CD, Deployment
- **Data Science**: Analytics, Performance Calculations

## 📞 Support

For support, email support@investracker.com or join our Slack channel.

---

**Investracker** - Professional Investment Portfolio Tracking & Analytics
