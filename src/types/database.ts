// Database Types following the documented architecture

export interface HomeType {
  id: string;
  name: string;
  createdBy: string; // userId
  createdAt: Date;
  members: string[]; // userIds
}

export interface HomeMember {
  uid: string;
  email: string;
  name?: string;
}

export interface HomeTypeWithMembers extends Omit<HomeType, 'members'> {
  members: HomeMember[];
}

export interface RoomType {
  id: string;
  name: string;
  homeId: string;
  createdAt: Date;
  authorizedUsers: string[]; // userIds - inherited from home members
}

export interface TaskType {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  homeId: string;
  roomId?: string; // optional - tasks can belong to home or specific room
  assignedTo?: string; // userId
  createdBy: string; // userId
  createdAt: Date;
  completedAt?: Date;
  authorizedUsers: string[]; // userIds - for efficient user-specific queries
}

export interface UserType {
  id: string; // matches Firebase Auth uid
  email: string;
  name?: string;
  photoURL?: string;
  homes: string[]; // homeIds for quick access
  createdAt: Date;
  lastLoginAt: Date;
}

export interface HomeInvitationType {
  id: string;
  homeId: string;
  invitedEmail: string;
  invitedBy: string; // userId who sent the invite
  createdAt: Date;
  status: 'pending' | 'accepted' | 'declined';
}

// Collection names as constants
export const COLLECTIONS = {
  HOMES: 'homes',
  ROOMS: 'rooms',
  TASKS: 'tasks',
  USERS: 'users',
  HOME_INVITATIONS: 'home_invitations'
} as const;