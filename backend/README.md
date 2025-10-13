# Investracker Backend

FastAPI-based backend for the Investracker investment tracking and analytics application.

## Features

- **Authentication**: JWT-based authentication with refresh tokens
- **Portfolio Management**: Create and manage investment portfolios
- **Transaction Tracking**: Record buy/sell transactions, dividends, fees
- **Analytics**: Portfolio performance, allocation, and dividend analysis
- **Database**: PostgreSQL with SQLAlchemy ORM (designed for easy MongoDB migration)

## Technology Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL (with SQLAlchemy ORM)
- **Authentication**: JWT with OAuth2
- **API Documentation**: Automatic OpenAPI/Swagger documentation
- **Database Migrations**: Alembic

## Setup and Installation

### Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Virtual environment tool (venv, conda, etc.)

### Installation Steps

1. **Create and activate virtual environment**:
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # source venv/Scripts/activate  # Linux/Mac
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**:
   ```bash
   copy .env.example .env
   # Edit .env file with your database credentials and other settings
   ```

4. **Create PostgreSQL database**:
   ```sql
   CREATE DATABASE investracker_db;
   CREATE USER investracker_user WITH PASSWORD 'your_password';
   GRANT ALL PRIVILEGES ON DATABASE investracker_db TO investracker_user;
   ```

5. **Initialize database**:
   ```bash
   python init_db.py
   ```

6. **Run the application**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

## API Documentation

Once the server is running, you can access:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **OpenAPI JSON**: http://localhost:8000/openapi.json

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user info
- `PUT /api/v1/auth/me` - Update user profile

### Portfolios
- `POST /api/v1/portfolios/` - Create portfolio
- `GET /api/v1/portfolios/` - List user portfolios
- `GET /api/v1/portfolios/{id}` - Get portfolio details
- `PUT /api/v1/portfolios/{id}` - Update portfolio
- `DELETE /api/v1/portfolios/{id}` - Delete portfolio

### Transactions
- `POST /api/v1/transactions/` - Create transaction
- `GET /api/v1/transactions/` - List transactions (with filters)
- `GET /api/v1/transactions/{id}` - Get transaction details
- `PUT /api/v1/transactions/{id}` - Update transaction
- `DELETE /api/v1/transactions/{id}` - Delete transaction

### Analytics
- `GET /api/v1/analytics/portfolio/{id}/overview` - Portfolio overview
- `GET /api/v1/analytics/portfolio/{id}/allocation` - Asset allocation
- `GET /api/v1/analytics/portfolio/{id}/performance` - Performance metrics
- `GET /api/v1/analytics/portfolio/{id}/dividends` - Dividend analysis

## Database Schema

### Core Tables

1. **users** - User accounts and profiles
2. **portfolios** - Investment portfolios
3. **assets** - Financial instruments (stocks, bonds, ETFs, etc.)
4. **transactions** - Buy/sell transactions, dividends, fees
5. **holdings** - Current portfolio positions
6. **price_history** - Historical price data
7. **currency_rates** - Exchange rates for multi-currency support

## Configuration

Key configuration options in `.env`:

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

## Development

### Running Tests

```bash
pytest
```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description of changes"

# Apply migrations
alembic upgrade head
```

### Code Quality

The project uses:
- **Black** for code formatting
- **isort** for import sorting
- **flake8** for linting
- **mypy** for type checking

## Deployment

### Production Considerations

1. **Environment Variables**: Set secure values for production
2. **Database**: Use managed PostgreSQL service
3. **HTTPS**: Enable SSL/TLS encryption
4. **CORS**: Configure appropriate CORS origins
5. **Rate Limiting**: Implement API rate limiting
6. **Monitoring**: Add application monitoring and logging

### Docker Deployment

```dockerfile
# TODO: Add Dockerfile for containerized deployment
```

## Future Enhancements

1. **MongoDB Migration**: Easy migration path to MongoDB
2. **Real-time Data**: WebSocket support for live price updates
3. **File Uploads**: CSV import for transaction data
4. **ESG Integration**: Environmental, Social, Governance scoring
5. **Risk Analysis**: Advanced risk metrics and calculations
6. **Benchmarking**: Portfolio comparison with market indices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Add your license information here]
