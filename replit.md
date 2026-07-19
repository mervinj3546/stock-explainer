# Should I buy this stock - Financial Web Application

## Overview

This is a modern, full-stack financial web application called "Should I buy this stock" that provides stock market information and analysis. The application features a dark-themed UI built with React, TypeScript, and Tailwind CSS on the frontend, with an Express.js backend and PostgreSQL database for persistent storage.

## Recent Changes (January 26, 2025)

- ✅ Built complete dark mode financial web app with authentication
- ✅ Implemented login/register system with session management  
- ✅ Created interactive dashboard with ticker search functionality
- ✅ Added sidebar with watchlist and search history features
- ✅ Built comprehensive content tabs (news, sentiment, fundamentals, technical)
- ✅ Applied dark financial theme with green/blue color palette
- ✅ Added demo account: demo@example.com / demo123 with sample data
- ✅ Fixed authentication session management and type errors
- ✅ Moved search bar to center with previously searched ticker dropdown
- ✅ Converted sidebar to tabbed navigation (Favorites/Recently Searched)
- ✅ Added star functionality to favorite tickers from search history
- ✅ Added Financial Analysis and AI Analysis dashboard tabs
- ✅ Rebranded app to "Should I buy this stock" throughout the application
- ✅ Reorganized dashboard tabs: Primary Details, AI Analysis, Fundamentals, Technical Analysis, Retail vs Pro Sentiment
- ✅ Combined Financial Analysis and Contextual Fundamentals into single Fundamentals tab
- ✅ Created comprehensive homepage with hero section and features
- ✅ Built pricing page with three tiers ($5.99, $9.99, $15.99) in table format
- ✅ Added navigation pages: How to use this site, About us
- ✅ Updated routing system to show homepage for logged-out users
- ✅ Fixed login experience and authentication flow issues  
- ✅ Added interactive technical analysis chart placeholders (SMA, MACD, RSI)
- ✅ Enhanced Technical Analysis tab with responsive grid layout

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application follows a modern full-stack architecture with clear separation between client and server:

### Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for development
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Neon serverless connection
- **ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Session-based auth with express-session
- **Password Security**: bcrypt for password hashing

## Key Components

### Authentication System
- Session-based authentication using express-session with memory store
- Login and registration forms with form validation
- Password hashing with bcrypt
- Protected routes requiring authentication
- User management with profile information

### Database Schema
The application uses the following main entities:
- **Users**: Authentication and profile data
- **Tickers**: Stock symbols with pricing information
- **User Watchlists**: User's saved stock symbols
- **User Search History**: Track user search activity
- **Ticker Data**: Store various types of market data (news, fundamentals, technical analysis, sentiment)

### Core Features
- **Homepage**: Marketing landing page with features overview and navigation
- **Ticker Search**: Real-time stock symbol search functionality with history
- **Dashboard**: Main interface showing selected ticker information
- **Watchlist Management**: Add/remove stocks from personal watchlist with star functionality
- **Content Tabs**: Five organized tabs - Primary Details, AI Analysis, Fundamentals, Technical Analysis, Retail vs Pro Sentiment
- **Navigation Pages**: Pricing, How to use, About us pages with consistent branding
- **Responsive Design**: Mobile-first approach with dark theme

### UI Components
- Modern dark-themed interface using slate color palette
- Comprehensive component library based on shadcn/ui
- Interactive elements with hover states and animations
- Form components with validation feedback
- Loading states and error handling

## Data Flow

1. **Authentication Flow**: Users log in through the login page, creating a session that persists across requests
2. **Ticker Search**: Users search for stock symbols, which queries the backend and updates search history
3. **Data Fetching**: TanStack Query manages server state, caching ticker data and user preferences
4. **Watchlist Management**: Users can add/remove tickers from their watchlist with real-time updates
5. **Content Display**: Selected ticker information is displayed across multiple tabs with different data types

## External Dependencies

### Frontend Dependencies
- **UI Library**: Radix UI components for accessible primitives
- **Icons**: Lucide React and React Icons (Font Awesome)
- **Styling**: Tailwind CSS with CSS variables for theming
- **Development**: Vite with React plugin and TypeScript support

### Backend Dependencies
- **Database**: Neon PostgreSQL serverless with connection pooling
- **Session Storage**: Memory store (suitable for development, should be replaced with Redis in production)
- **Development Tools**: Drizzle Kit for database migrations

## Deployment Strategy

### Development Setup
- Frontend runs on Vite dev server with hot module replacement
- Backend runs on Express with tsx for TypeScript execution
- Database migrations handled through Drizzle Kit
- Environment variables required: `DATABASE_URL`, `SESSION_SECRET`

### Build Process
- Frontend builds to static files using Vite
- Backend compiles to ES modules using esbuild
- Database schema changes applied via `drizzle-kit push`

### Production Considerations
- Session store should be replaced with Redis or similar persistent storage
- Environment variables must be properly configured
- Database connection pooling already implemented with Neon
- Static assets served through Express in production mode

### Security Features
- HTTPS cookies in production (currently disabled for development)
- Password hashing with bcrypt
- Session management with configurable expiration
- Input validation using Zod schemas
- SQL injection protection through Drizzle ORM