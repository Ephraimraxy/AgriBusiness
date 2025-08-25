# Replit.md - CSS FARMS Nigeria Trainees Management System

## Overview

This is a full-stack web application built for managing the CSS FARMS Nigeria Trainees Program. The system handles trainee registration, content management, progress tracking, and administrative functions for agricultural training programs sponsored by various organizations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Replit Auth with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL store
- **API Design**: RESTful API with JSON responses

### Database Design
- **Database**: Firebase Firestore (NoSQL document database)
- **ORM/SDK**: Firebase SDK for JavaScript/TypeScript
- **Schema**: TypeScript type definitions in shared/schema.ts
- **Connection**: Firebase Admin SDK with direct Firestore access

## Key Components

### Authentication System
- **Provider**: Replit Auth with OpenID Connect
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Role-Based Access**: Admin and trainee roles with different permissions
- **Security**: HTTP-only cookies with secure flags

### User Management
- **Admin Users**: System administrators with full access
- **Trainee Users**: Students with limited access to their own data
- **Registration Flow**: Multi-step registration with email verification
- **Profile Management**: Automated assignment of training details (room, venue, etc.)

### Content Management
- **Training Materials**: Video content, documents, and resources
- **Progress Tracking**: Individual trainee progress monitoring
- **Announcements**: System-wide and sponsor-specific notifications
- **Assignments**: Task management and submission tracking

### Data Models
- **Users**: Core user authentication and profile data
- **Sponsors**: Organizations sponsoring trainee batches
- **Trainees**: Extended user profiles with training-specific information
- **Content**: Training materials and resources
- **Progress**: Individual trainee progress and completion tracking
- **Announcements**: System notifications and updates

## Data Flow

### Registration Process
1. User accesses landing page
2. Admin enables/disables registration via system settings
3. Multi-step registration: email/password → verification → personal details
4. Automatic assignment of training logistics (room, venue, meal location)
5. Email verification before account activation

### Authentication Flow
1. User clicks login → redirected to Replit Auth
2. Successful authentication creates/updates user session
3. Role-based redirection (admin → admin dashboard, trainee → trainee dashboard)
4. Session persistence with PostgreSQL backing

### Content Delivery
1. Content filtered by sponsor association
2. Progress tracking for individual trainees
3. Real-time updates via React Query
4. Optimistic updates for better UX

## External Dependencies

### Core Dependencies
- **firebase**: Firebase SDK for client-side operations
- **firebase-admin**: Firebase Admin SDK for server-side operations
- **@tanstack/react-query**: Server state management
- **express**: Web framework
- **passport**: Authentication middleware
- **openid-client**: OpenID Connect implementation

### UI Dependencies
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **react-hook-form**: Form management
- **zod**: Schema validation

### Development Dependencies
- **vite**: Build tool and dev server
- **typescript**: Type checking
- **esbuild**: Server-side bundling

## Deployment Strategy

### Development Environment
- **Dev Server**: Vite dev server with HMR
- **Database**: Firebase Firestore (development instance)
- **Build Command**: `npm run dev`
- **Environment**: NODE_ENV=development

### Production Deployment
- **Build Process**: Vite build for client + esbuild for server
- **Server Bundle**: Single ESM bundle in dist/index.js
- **Static Assets**: Served from dist/public
- **Database**: Firebase Firestore (production instance)
- **Environment Variables**: SESSION_SECRET, REPLIT_DOMAINS, Firebase Config

### Key Configuration
- **Database Config**: Firebase configuration in server/firebase.ts
- **Vite Config**: Multi-root setup with client/server separation
- **TypeScript**: Monorepo structure with shared types
- **Session Security**: Secure cookies with proper domain configuration

### File Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types and schemas
├── migrations/      # Database migrations
├── dist/            # Built application
└── attached_assets/ # Project requirements
```

This architecture provides a robust, scalable solution for managing agricultural training programs with proper separation of concerns, type safety, and modern development practices.