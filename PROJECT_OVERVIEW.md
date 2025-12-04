# Investracker - Investment Portfolio Tracking Platform

## Project Overview

Investracker is a modern, full-stack web application designed to help users track and manage their investment portfolios. The platform provides professional-grade analytics, real-time tracking, and comprehensive insights for investors to make informed decisions.

## Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: 
  - Heroicons for icons
  - @lottiefiles/dotlottie-react for animations
  - @lottiefiles/react-lottie-player for legacy Lottie support
- **State Management**: React hooks (useState)
- **Deployment**: Vercel

### Backend
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: JWT-based auth system
- **API**: RESTful API

### Color Palette
- **Primary Colors**: Mint/Green theme
  - `#ECF4E8` (50), `#C8F3B8` (300), `#ABE7B2` (400), `#8fd9a0` (500)
- **Accent Colors**: Muted Blue
  - `#93BFC7` (300), `#7aafb9` (400), `#5d9aa5` (500)

## Project Structure

```
Investracker/
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── app/           # Next.js app router pages
│   │   ├── components/    # React components
│   │   │   ├── LandingPage.tsx    # Main marketing page
│   │   │   └── Logo.tsx           # Brand logo component
│   │   └── styles/
│   ├── public/
│   │   └── lottie/        # Lottie animation files
│   │       ├── Hero.lottie
│   │       ├── join-us.lottie
│   │       └── track.lottie
│   ├── tailwind.config.js # Tailwind configuration with custom colors
│   └── package.json
│
├── backend/               # Express.js backend application
│   ├── src/
│   ├── prisma/           # Database schema and migrations
│   └── package.json
│
└── PROJECT_OVERVIEW.md   # This file
```

## Key Features Implemented

### Landing Page (Signed-Out State)
- **Modern Design**: Professional gradient backgrounds, frosted glass navigation
- **Responsive Layout**: Mobile-first design with hamburger menu
- **Animations**: Three dotLottie animations (hero, stats, CTA sections)
- **Feature Sections**:
  - Hero section with split layout (text + animation)
  - 6 feature cards with hover effects
  - Stats section with metrics (99.9% uptime, 10k+ users, $2B+ assets)
  - Call-to-action section with pattern overlay
- **Navigation**: Sticky header with Demo, Sign In, and Get Started links
- **Mobile Optimized**: All animations and layouts responsive for mobile devices

### Logo Component
- Responsive SVG logo with green gradient
- Configurable sizes (xs, sm, md, lg, xl)
- Optional link functionality
- Integrated into navigation

### Authentication System
- User registration and login
- JWT token-based authentication
- Protected routes

### Investment Tracking
- Portfolio management
- Israeli stocks tracking demo page
- Real-time data updates

## Design Philosophy

1. **Professional & Trustworthy**: Bank-level security messaging, clean design
2. **Conversion-Focused**: Strategic CTAs, engaging animations to drive signups
3. **Performance-First**: Optimized animations, lazy loading, SSR compatibility
4. **Mobile-Responsive**: Touch-friendly UI, mobile-optimized layouts

## Recent Development History

### November 22, 2025
- ✅ Merged logo feature (feature/add-logo → main)
- ✅ Complete landing page redesign with new color palette
- ✅ Added mint/green theme to Tailwind configuration
- ✅ Implemented modern UI with gradient backgrounds and blob animations
- ✅ Integrated three Lottie animations with local file hosting
- ✅ Made all animations mobile-responsive
- ✅ Merged redesign to production (feature/redesign-landing-page → main)

### December 4, 2025
- ✅ Installed @lottiefiles/dotlottie-react package
- ✅ Migrated from CDN-hosted to local .lottie files
- ✅ Created `/public/lottie/` directory structure
- ✅ Added Hero.lottie, join-us.lottie, and track.lottie files

## Git Repository

- **Repository**: https://github.com/MichaelBabushkin/investracker
- **Owner**: MichaelBabushkin
- **Current Branch**: main
- **Active Features**: All redesign work merged to production

---

## Setup Instructions for MacBook

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL
- Git

### 1. Clone the Repository

```bash
# Navigate to your desired directory
cd ~/Projects  # or wherever you want the project

# Clone the repository
git clone https://github.com/MichaelBabushkin/investracker.git

# Navigate into the project
cd investracker
```

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create .env.local file (you'll need to add your environment variables)
touch .env.local

# Run the development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

### 3. Backend Setup

```bash
# Navigate to backend directory (from project root)
cd backend

# Install dependencies
npm install

# Create .env file for database connection
touch .env

# Set up database (after configuring .env with PostgreSQL connection string)
npx prisma migrate dev

# Run the backend server
npm run dev
```

The backend will typically run on `http://localhost:5000` or your configured port.

### 4. Environment Variables

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
# Add other frontend environment variables as needed
```

**Backend (.env)**:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/investracker"
JWT_SECRET="your-secret-key"
PORT=5000
# Add other backend environment variables as needed
```

### 5. Database Setup

```bash
# From the backend directory
npx prisma generate
npx prisma migrate dev --name init
```

## Common Commands

### Frontend
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Backend
```bash
npm run dev      # Start development server with nodemon
npm run start    # Start production server
npx prisma studio # Open Prisma Studio (database GUI)
```

### Git Workflow
```bash
git status                    # Check current changes
git pull origin main          # Pull latest changes
git checkout -b feature/name  # Create new feature branch
git add .                     # Stage changes
git commit -m "message"       # Commit changes
git push origin branch-name   # Push to remote
```

## Port Configuration

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000` (or as configured)
- Prisma Studio: `http://localhost:5555`

## Notes for MacBook

1. **Use Terminal (zsh)** instead of PowerShell - commands are the same for npm/git
2. **PostgreSQL Installation**: Use Homebrew: `brew install postgresql@15`
3. **Node.js Installation**: Use `nvm` (Node Version Manager) for easy version switching
4. **VS Code**: Same setup, extensions should sync if using Settings Sync
5. **File Paths**: Use forward slashes `/` instead of backslashes `\`

## Support & Resources

- **GitHub Repository**: https://github.com/MichaelBabushkin/investracker
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Prisma**: https://www.prisma.io/docs

---

**Last Updated**: December 4, 2025
**Project Status**: Active Development
**Production Branch**: main
