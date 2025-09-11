# Mullet - House Management App

## Project Overview
A house management application for tracking tasks, rooms, and household responsibilities. Built with Next.js (Pages Router), Firebase Authentication, and Firestore.

## Authentication Decisions (2025-01-11)
- **Google OAuth only** - No email/password authentication
- **Client-side authentication** using Firebase Auth Context
- **Route protection** via withAuth HOC
- **Future**: Restrict access to specific Google accounts (you + partner)

## Database Architecture Decisions (2025-01-11)

### Chosen Approach: Denormalized with authorizedUsers Arrays

**Rationale**: Best balance of query performance, real-time sync, and simplicity for household-scale application.

### Firestore Collections Structure

```
houses/{houseId}
├── name: string
├── createdBy: string (userId)
├── createdAt: timestamp
└── members: string[] (userIds)

rooms/{roomId}
├── name: string
├── houseId: string
├── createdAt: timestamp
└── authorizedUsers: string[] (inherited from house members)

tasks/{taskId}
├── title: string
├── description: string
├── status: string (pending|in_progress|completed)
├── dueDate: timestamp
├── houseId: string
├── roomId: string (optional)
├── assignedTo: string (userId)
├── createdBy: string (userId)
├── createdAt: timestamp
└── authorizedUsers: string[] (for efficient user-specific queries)

users/{userId}
├── email: string
├── name: string
├── photoURL: string
├── houses: string[] (houseIds for quick access)
└── createdAt: timestamp
```

### Query Patterns
- **User's tasks**: `where('authorizedUsers', 'array-contains', userId)`
- **House tasks**: `where('houseId', '==', houseId)`
- **Room tasks**: `where('roomId', '==', roomId)`
- **Assigned tasks**: `where('assignedTo', '==', userId)`

### Security Rules Strategy
- Security rules filter data at database level before returning to client
- Users can only access houses where they are members
- Tasks/rooms inherit access from house membership
- Real-time listeners automatically respect security boundaries

### Real-time Features
- Firestore listeners for live updates across devices
- Optimistic updates for responsive UI
- Offline support built into Firestore

### Trade-offs
**Pros:**
- Excellent query performance for user-specific data
- Real-time sync works seamlessly
- Security enforced at database level
- Familiar relational-like patterns

**Cons:**
- Data duplication in authorizedUsers arrays
- Write complexity when house membership changes
- Need to maintain consistency across denormalized data

### Future Considerations
- Use Firebase Functions for complex write operations (maintaining consistency)
- Consider user-centric subcollections if scale becomes an issue (10k+ tasks per user)
- Implement batch operations for bulk updates

## Implementation Status
- ✅ Firebase Authentication (Google OAuth)
- ✅ Route protection
- ✅ Basic app structure
- ⏳ Firestore database setup
- ⏳ Data models and hooks
- ⏳ Core CRUD operations
- ⏳ Real-time sync implementation

## Tech Stack
- **Frontend**: Next.js 15 (Pages Router), React 19, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: Firebase Auth (Google OAuth)
- **Database**: Firestore
- **Hosting**: TBD