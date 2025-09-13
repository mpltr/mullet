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
  color: string; // Tailwind color class (e.g., 'blue-300', 'green-300')
}

export interface TaskType {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: Date;
  homeId: string;
  roomId?: string; // optional - tasks can belong to home or specific room
  groupId?: string; // optional - tasks can belong to a group
  assignedTo?: string; // userId
  createdBy: string; // userId
  createdAt: Date;
  completedAt?: Date;
  recurrenceDays?: number; // optional - number of days for recurrence
  nextDueDate?: Date; // for recurring tasks, the next scheduled due date
}

export interface GroupType {
  id: string;
  name: string;
  homeId: string;
  createdBy: string; // userId
  createdAt: Date;
}

export interface HabitType {
  id: string;
  title: string;
  description?: string;
  homeId: string;
  roomId?: string; // optional - habits can belong to home or specific room
  groupId?: string; // optional - habits can belong to a group
  createdBy: string; // userId
  createdAt: Date;
}

export interface TaskCompletionType {
  id: string;
  taskId: string;
  completedBy: string; // userId
  completedAt: Date;
  homeId: string; // for efficient querying
}

export interface HabitCompletionType {
  id: string;
  habitId: string;
  completedBy: string; // userId
  completedAt: Date;
  homeId: string; // for efficient querying
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

export interface EnrichedHomeInvitationType extends HomeInvitationType {
  homeName: string;
  inviterName: string;
}

// Collection names as constants
export const COLLECTIONS = {
  HOMES: 'homes',
  ROOMS: 'rooms',
  TASKS: 'tasks',
  HABITS: 'habits',
  GROUPS: 'groups',
  TASK_COMPLETIONS: 'task_completions',
  HABIT_COMPLETIONS: 'habit_completions',
  USERS: 'users',
  HOME_INVITATIONS: 'home_invitations'
} as const;