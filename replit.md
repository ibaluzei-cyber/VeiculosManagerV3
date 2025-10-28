# Vehicle Management System - Replit Documentation

## Overview

This is a comprehensive vehicle management system built as a full-stack web application for managing vehicle inventory, brands, models, versions, colors, and optional features. The system includes advanced pricing configuration, discount management, and role-based access control with three user levels.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple

### Database Architecture
- **Database**: PostgreSQL (configured for Neon serverless)
- **Schema Management**: Drizzle Kit for migrations and schema management
- **Connection**: Connection pooling with @neondatabase/serverless

## Key Components

### Data Models
- **Brands**: Vehicle manufacturers (Volkswagen, Chevrolet, etc.)
- **Models**: Vehicle models linked to brands
- **Versions**: Specific versions of models with detailed specifications
- **Colors**: Paint colors with pricing and paint type associations
- **Vehicles**: Complete vehicle entities with all specifications
- **Optional Items**: Additional features that can be added to versions
- **Direct Sales**: Discount configurations for direct sales by brand
- **Users & Roles**: Three-tier user system (Administrator, Cadastrador, Usuário)

### Authentication & Authorization
- **Session-based authentication** with PostgreSQL session store
- **Role-based access control** with granular permissions
- **Security features**: Rate limiting, CSRF protection, secure headers with Helmet
- **User session tracking** with device information and activity monitoring

### Business Logic Features
- **Vehicle Configuration System**: Step-by-step vehicle customization
- **Dynamic Pricing**: Real-time price calculations with discounts and markups
- **Tax Exemptions**: Support for PCD and TAXI tax exemptions (IPI/ICMS)
- **Export Functionality**: CSV export for vehicle data
- **Customizable Theming**: Brand colors and logo customization

## Data Flow

### Client-Server Communication
1. **API Layer**: RESTful API with `/api` prefix for all backend operations
2. **Query Management**: TanStack Query handles caching, synchronization, and background updates
3. **Real-time Updates**: Optimistic updates with server reconciliation
4. **Error Handling**: Centralized error handling with user-friendly messages

### Authentication Flow
1. **Login**: Email/password authentication with rate limiting
2. **Session Management**: Server-side session with automatic cleanup
3. **Heartbeat System**: Keep-alive mechanism to maintain active sessions
4. **Permission Checking**: Route-level and component-level permission validation

### Data Persistence
1. **Schema Validation**: Zod schemas for runtime type validation
2. **Database Operations**: Type-safe queries with Drizzle ORM
3. **Transaction Support**: ACID compliance for critical operations
4. **Migration System**: Version-controlled schema changes

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: PostgreSQL connection for serverless environments
- **drizzle-orm**: Type-safe ORM with PostgreSQL adapter
- **@tanstack/react-query**: Server state management
- **passport & passport-local**: Authentication middleware
- **express-session**: Session management
- **helmet**: Security headers and CSRF protection
- **express-rate-limit**: API rate limiting

### UI Dependencies
- **@radix-ui/react-***: Accessible UI primitives
- **class-variance-authority**: Type-safe CSS class variants
- **tailwind-merge**: Intelligent Tailwind class merging
- **lucide-react**: Icon library

### Development Dependencies
- **vite**: Development server and build tool
- **typescript**: Type checking and compilation
- **tsx**: TypeScript execution for development
- **esbuild**: Fast JavaScript bundler for production

## Deployment Strategy

### Build Process
1. **Frontend Build**: Vite builds React app to `dist/public`
2. **Backend Build**: esbuild bundles server code to `dist/index.js`
3. **Database Setup**: Drizzle pushes schema changes to PostgreSQL
4. **Static Assets**: Vite handles asset optimization and hashing

### Environment Configuration
- **Database**: PostgreSQL connection string required in `DATABASE_URL`
- **Session Security**: Secure session secrets for production
- **CORS Configuration**: Proper origin validation for production domains

### Production Considerations
- **Process Management**: PM2 or similar for Node.js process management
- **Reverse Proxy**: Nginx for static file serving and SSL termination
- **Database**: Managed PostgreSQL service (Neon, AWS RDS, etc.)
- **Monitoring**: Application performance monitoring and error tracking

## Changelog

```
Changelog:
- July 05, 2025. Initial setup
- August 16, 2025. Implemented hierarchical discount system with version > model > brand specificity
- August 16, 2025. Added search filtering for direct sales management
- August 16, 2025. Fixed discount form editing and dropdown cascade functionality
- October 28, 2025. Added price type specific discount system (public, PCD IPI, TAXI IPI/ICMS, PCD IPI/ICMS, TAXI IPI)
- October 28, 2025. Fixed permissions for /direct-sales route
- October 28, 2025. Fixed discount dropdown disabled state for non-public price types
- October 28, 2025. Implemented smart version sorting: descending by year (2026→2025), with versions without year appearing last
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```