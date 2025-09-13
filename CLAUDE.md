# Mullet - Home Management App

## Application Concept

Mullet is a collaborative home management application that organizes household activities through a hierarchical structure:

### Core Entities
- **Homes**: The top-level container representing a household or shared living space
- **Members**: Users who belong to a home and can collaborate on tasks
- **Rooms**: Optional organizational spaces within a home (kitchen, bedroom, garage, etc.)
- **Groups**: Optional categories for organizing tasks and habits (chores, maintenance, health, etc.)
- **Tasks**: One-time or recurring activities that can be assigned and tracked
- **Habits**: Repeatable activities that can be completed multiple times and tracked over time

### Navigation Structure
The app uses a page-based navigation system:
- **Auth Pages**: Login and authentication flows
- **Home Selection**: Choose which home to manage (for users with multiple homes)
- **Main Dashboard**: Overview of tasks, habits, and home activity
- **Task Management**: Create, edit, and complete tasks
- **Habit Tracking**: Log habit completions and view progress
- **Room Organization**: Manage spaces within the home
- **Member Management**: Invite and manage home members

## Firebase Integration Architecture

### Authentication Flow
1. **Google OAuth**: Users authenticate via Firebase Auth using Google accounts only
2. **Auth Context**: Client-side auth state managed through React Context
3. **Route Protection**: `withAuth` HOC protects authenticated routes
4. **User Creation**: First login creates user document in Firestore with profile data

### Data Architecture (Home-Based Authorization)

**Authorization Model**: All data access is based on home membership rather than individual permissions.

#### Firestore Collections Structure
```
users/{userId}
├── email: string
├── name: string
├── photoURL: string
├── homes: string[] (homeIds for quick access)
└── createdAt: timestamp

homes/{homeId}
├── name: string
├── createdBy: string (userId)
├── createdAt: timestamp
└── members: string[] (userIds)

rooms/{roomId}
├── name: string
├── homeId: string
├── color: string (Tailwind color class)
└── createdAt: timestamp

groups/{groupId}
├── name: string
├── homeId: string
├── createdBy: string (userId)
└── createdAt: timestamp

tasks/{taskId}
├── title: string
├── description?: string
├── status: 'pending' | 'in_progress' | 'completed'
├── dueDate?: timestamp
├── homeId: string
├── roomId?: string (optional)
├── groupId?: string (optional)
├── assignedTo?: string (userId)
├── createdBy: string (userId)
├── createdAt: timestamp
├── completedAt?: timestamp
├── recurrenceDays?: number
└── nextDueDate?: timestamp

habits/{habitId}
├── title: string
├── description?: string
├── homeId: string
├── roomId?: string (optional)
├── groupId?: string (optional)
├── createdBy: string (userId)
└── createdAt: timestamp

habit_completions/{completionId}
├── habitId: string
├── completedBy: string (userId)
├── completedAt: timestamp
└── homeId: string

home_invitations/{inviteId}
├── homeId: string
├── invitedEmail: string
├── invitedBy: string (userId)
├── createdAt: timestamp
└── status: 'pending' | 'accepted' | 'declined'
```

### Data Access Patterns

#### Reading Data
1. **Home-Based Queries**: All data queries filter by `homeId` and validate user membership
2. **Real-Time Listeners**: `onSnapshot` listeners for live updates across devices
3. **Security Rules**: Firestore rules enforce home membership before returning data
4. **Hook Pattern**: Custom hooks (useTasks, useHabits, etc.) manage data fetching and real-time sync
5. **Client-Side Sorting**: All sorting and ordering is performed in the frontend after data retrieval - no `orderBy` in Firestore queries

#### Writing Data
1. **Service Layer**: Centralized services (taskService, habitService) handle all CRUD operations
2. **Optimistic Updates**: UI updates immediately, rolls back on error
3. **Batch Operations**: Complex operations use Firestore batch writes for consistency
4. **Auto-Population**: Services automatically set homeId, userId, and timestamps

#### Security Rules Strategy
- **Home Membership Check**: `request.auth.uid in get(/databases/$(database)/documents/homes/$(resource.data.homeId)).data.members`
- **Creator Permissions**: Users can only delete items they created
- **Member Permissions**: All home members can read/update shared resources
- **Invitation System**: Email-based invitations with pending/accepted/declined states

## Authentication Decisions (2025-01-11)
- **Google OAuth only** - No email/password authentication
- **Client-side authentication** using Firebase Auth Context
- **Route protection** via withAuth HOC
- **Future**: Restrict access to specific Google accounts (you + partner)

### Firebase Security Configuration
- **Environment Variables**: Firebase config moved to `.env.local` with `NEXT_PUBLIC_` prefix
- **Public by Design**: Firebase client config values are meant to be public (not sensitive)
- **Real Security**: Comes from Firestore Security Rules + Firebase Auth server-side validation
- **API Restrictions**: Should be configured in Firebase Console (domain restrictions, etc.)

## Implementation Philosophy

### Normalized Data Design (2025-01-13)
**Current Approach**: Simplified normalized structure with home-based authorization
- **Rationale**: Cleaner data model, simpler queries, security enforced at database level
- **Trade-off**: Slightly more complex queries but much simpler data consistency
- **Authorization**: All access controlled through home membership, no denormalized user arrays

### Development Principles
1. **Home-Centric Design**: Everything revolves around home membership
2. **Real-Time First**: All data updates propagate live across devices
3. **Security by Design**: Firestore rules enforce all access control
4. **Service Layer Pattern**: Centralized business logic in service classes
5. **Optimistic UI**: Immediate feedback with error rollback
6. **Client-Side Data Processing**: All sorting, filtering, and data transformation happens in the frontend to avoid Firestore indexes and reduce query complexity

## Implementation Status
- ✅ Firebase Authentication (Google OAuth)
- ✅ Route protection
- ✅ Basic app structure
- ⏳ Firestore database setup
- ⏳ Data models and hooks
- ⏳ Core CRUD operations
- ⏳ Real-time sync implementation

## Coding Standards
**IMPORTANT**: All code work must follow the comprehensive coding standards documented in the README.md file. This includes:
- Component naming conventions and directory structure
- View component abstraction pattern (pages re-export View components)
- TypeScript type patterns and naming
- Tailwind CSS styling guidelines
- Loader system usage
- Hook patterns and organization

### Form Field Styling Standards
**IMPORTANT**: All form fields (input, select, textarea) must use consistent text styling:
- **Text Color**: `text-gray-900` for all form field content
- **Placeholder**: `placeholder-gray-500` for placeholder text
- **Disabled State**: `disabled:text-gray-500` for disabled fields
- This ensures all form inputs have the same text visibility and consistency

Always reference the README.md for proper implementation patterns before writing code.

## Tech Stack
- **Frontend**: Next.js 15 (Pages Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth (Google OAuth)
- **Database**: Firestore
- **Hosting**: TBD