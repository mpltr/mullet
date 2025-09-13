import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  deleteField,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { HomeType, RoomType, TaskType, UserType, HomeInvitationType, GroupType, HabitType, TaskCompletionType, HabitCompletionType, COLLECTIONS } from '../types/database';

// Utility function to convert Firestore Timestamp to Date
const convertTimestamps = (data: any): any => {
  if (data === null || data === undefined) return data;
  
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  
  if (typeof data === 'object' && !Array.isArray(data)) {
    const converted: any = {};
    for (const [key, value] of Object.entries(data)) {
      converted[key] = convertTimestamps(value);
    }
    return converted;
  }
  
  if (Array.isArray(data)) {
    return data.map(convertTimestamps);
  }
  
  return data;
};

// Home CRUD Operations
export const homeService = {
  // Create a new home
  async create(userId: string, name: string): Promise<string> {
    const homeData = {
      name,
      createdBy: userId,
      createdAt: serverTimestamp(),
      members: [userId]
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.HOMES), homeData);
    
    // Update user's homes array
    await userService.addHome(userId, docRef.id);
    
    return docRef.id;
  },

  // Get homes for a specific user
  async getByUser(userId: string): Promise<HomeType[]> {
    const q = query(
      collection(db, COLLECTIONS.HOMES),
      where('members', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as HomeType[];
  },

  // Get a single home by ID
  async getById(homeId: string): Promise<HomeType | null> {
    const docRef = doc(db, COLLECTIONS.HOMES, homeId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data())
    } as HomeType;
  },

  // Add member to home
  async addMember(homeId: string, userId: string): Promise<void> {
    const homeRef = doc(db, COLLECTIONS.HOMES, homeId);
    const home = await this.getById(homeId);
    
    if (!home || home.members.includes(userId)) return;
    
    await updateDoc(homeRef, {
      members: [...home.members, userId]
    });
    
    await userService.addHome(userId, homeId);
  },

  // Remove member from home (leave home)
  async removeMember(homeId: string, userId: string): Promise<void> {
    const homeRef = doc(db, COLLECTIONS.HOMES, homeId);
    const home = await this.getById(homeId);
    
    if (!home || !home.members.includes(userId)) return;
    
    // Don't allow owner to leave their own home
    if (home.createdBy === userId) {
      throw new Error('Home owner cannot leave home. Delete the home instead.');
    }
    
    await updateDoc(homeRef, {
      members: home.members.filter(memberId => memberId !== userId)
    });
    
    await userService.removeHome(userId, homeId);
  },

  // Delete home (owner only)
  async delete(homeId: string, userId: string): Promise<void> {
    const home = await this.getById(homeId);
    
    if (!home) {
      throw new Error('Home not found');
    }
    
    if (home.createdBy !== userId) {
      throw new Error('Only the home owner can delete the home');
    }
    
    // Delete pending invitations created by this user for this home
    const invitationsQuery = query(
      collection(db, COLLECTIONS.HOME_INVITATIONS),
      where('homeId', '==', homeId),
      where('invitedBy', '==', userId),
      where('status', '==', 'pending')
    );
    const invitationsSnapshot = await getDocs(invitationsQuery);
    const deleteInvitationsPromises = invitationsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    
    // Delete the home document and cleanup in parallel
    await Promise.all([
      deleteDoc(doc(db, COLLECTIONS.HOMES, homeId)),
      ...deleteInvitationsPromises,
      // Only remove home from the current user's document (owner)
      // Other members will see the home is gone when they next load the app
      userService.removeHome(userId, homeId)
    ]);
    
    // TODO: Delete associated rooms and tasks
    // This would require additional cleanup queries
  }
};

// Room CRUD Operations
export const roomService = {
  // Helper function to generate random Tailwind color
  getRandomColor(): string {
    const colors = [
      'red-200', 'orange-200', 'amber-200', 'yellow-200', 'lime-200', 'green-200',
      'emerald-200', 'teal-200', 'cyan-200', 'sky-200', 'blue-200', 'indigo-200',
      'violet-200', 'purple-200', 'fuchsia-200', 'pink-200', 'rose-200'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  },

  // Get a unique color that isn't already used in the home
  getUniqueColor(usedColors: string[]): string {
    const allColors = [
      'red-200', 'orange-200', 'amber-200', 'yellow-200', 'lime-200', 'green-200',
      'emerald-200', 'teal-200', 'cyan-200', 'sky-200', 'blue-200', 'indigo-200',
      'violet-200', 'purple-200', 'fuchsia-200', 'pink-200', 'rose-200'
    ];
    
    // Filter out already used colors
    const availableColors = allColors.filter(color => !usedColors.includes(color));
    
    // If all colors are used, fall back to random (unlikely with 17 colors)
    if (availableColors.length === 0) {
      return this.getRandomColor();
    }
    
    // Return a random color from available colors
    return availableColors[Math.floor(Math.random() * availableColors.length)];
  },

  // Create a new room
  async create(homeId: string, name: string): Promise<string> {
    // Get existing rooms for this home to avoid duplicate colors
    const existingRooms = await this.getByHome(homeId);
    const usedColors = existingRooms.map(room => room.color);
    
    // Get a unique color for this home
    const color = this.getUniqueColor(usedColors);
    
    const roomData = {
      name,
      homeId,
      color,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ROOMS), roomData);
    return docRef.id;
  },

  // Create a new room with a specific color
  async createWithColor(homeId: string, name: string, color: string): Promise<string> {
    const roomData = {
      name,
      homeId,
      color,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ROOMS), roomData);
    return docRef.id;
  },

  // Get rooms for a home (sorted alphabetically)
  async getByHome(homeId: string): Promise<RoomType[]> {
    const q = query(
      collection(db, COLLECTIONS.ROOMS),
      where('homeId', '==', homeId)
    );
    
    const querySnapshot = await getDocs(q);
    const rooms = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as RoomType[];
    
    // Sort alphabetically by name
    return rooms.sort((a, b) => a.name.localeCompare(b.name));
  },

  // Delete a room
  async delete(roomId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.ROOMS, roomId));
  }
};

// Helper function to calculate next scheduled date for recurring tasks
function calculateNextScheduledDate(currentDueDate: Date, recurrenceDays: number): Date {
  // Simply add the recurrence days to the current due date
  const nextScheduledDate = new Date(currentDueDate.getTime() + (recurrenceDays * 24 * 60 * 60 * 1000));
  return nextScheduledDate;
}

// Task CRUD Operations
export const taskService = {
  // Create a new task
  async create(
    homeId: string, 
    title: string, 
    createdBy: string,
    options?: {
      description?: string;
      roomId?: string;
      groupId?: string;
      assignedTo?: string;
      dueDate?: Date;
      recurrenceDays?: number;
    }
  ): Promise<string> {
    const taskData: any = {
      title,
      status: 'pending' as const,
      homeId,
      createdBy,
      createdAt: serverTimestamp(),
      dueDate: options?.dueDate ? Timestamp.fromDate(options.dueDate) : null,
      nextDueDate: options?.recurrenceDays && options?.dueDate 
        ? Timestamp.fromDate(new Date(options.dueDate.getTime() + options.recurrenceDays * 24 * 60 * 60 * 1000))
        : null
    };

    // Only add optional fields if they have values
    if (options?.description) taskData.description = options.description;
    if (options?.roomId) taskData.roomId = options.roomId;
    if (options?.groupId) taskData.groupId = options.groupId;
    if (options?.assignedTo) taskData.assignedTo = options.assignedTo;
    if (options?.recurrenceDays) taskData.recurrenceDays = options.recurrenceDays;
    
    const docRef = await addDoc(collection(db, COLLECTIONS.TASKS), taskData);
    return docRef.id;
  },

  // Get tasks for a user (across all their homes)
  async getByUser(userId: string): Promise<TaskType[]> {
    // First, get all homes where user is a member
    const homesQuery = query(
      collection(db, COLLECTIONS.HOMES),
      where('members', 'array-contains', userId)
    );
    
    const homesSnapshot = await getDocs(homesQuery);
    const homeIds = homesSnapshot.docs.map(doc => doc.id);
    
    if (homeIds.length === 0) {
      return [];
    }
    
    // Then get all tasks from those homes
    const tasksQuery = query(
      collection(db, COLLECTIONS.TASKS),
      where('homeId', 'in', homeIds),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(tasksQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as TaskType[];
  },

  // Update a task
  async update(
    taskId: string,
    updates: {
      title?: string;
      description?: string;
      roomId?: string;
      groupId?: string;
      assignedTo?: string;
      dueDate?: Date;
      recurrenceDays?: number;
    }
  ): Promise<void> {
    const updateData: any = {};
    
    // Only add fields that are being updated
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) {
      if (updates.description.trim()) {
        updateData.description = updates.description;
      } else {
        updateData.description = deleteField();
      }
    }
    if (updates.roomId !== undefined) {
      if (updates.roomId) {
        updateData.roomId = updates.roomId;
      } else {
        updateData.roomId = deleteField();
      }
    }
    if (updates.groupId !== undefined) {
      if (updates.groupId) {
        updateData.groupId = updates.groupId;
      } else {
        updateData.groupId = deleteField();
      }
    }
    if (updates.assignedTo !== undefined) {
      if (updates.assignedTo) {
        updateData.assignedTo = updates.assignedTo;
      } else {
        updateData.assignedTo = deleteField();
      }
    }
    if (updates.dueDate !== undefined) {
      if (updates.dueDate) {
        updateData.dueDate = Timestamp.fromDate(updates.dueDate);
      } else {
        updateData.dueDate = deleteField();
        updateData.nextDueDate = deleteField();
      }
    }
    if (updates.recurrenceDays !== undefined) {
      if (updates.recurrenceDays) {
        updateData.recurrenceDays = updates.recurrenceDays;
        // Update nextDueDate if dueDate exists
        const currentTask = await getDoc(doc(db, COLLECTIONS.TASKS, taskId));
        if (currentTask.exists()) {
          const taskData = currentTask.data();
          const dueDate = updates.dueDate || (taskData.dueDate ? taskData.dueDate.toDate() : null);
          if (dueDate) {
            updateData.nextDueDate = Timestamp.fromDate(
              new Date(dueDate.getTime() + updates.recurrenceDays * 24 * 60 * 60 * 1000)
            );
          }
        }
      } else {
        updateData.recurrenceDays = deleteField();
        updateData.nextDueDate = deleteField();
      }
    }
    
    await updateDoc(doc(db, COLLECTIONS.TASKS, taskId), updateData);
  },

  // Update task status
  async updateStatus(taskId: string, status: TaskType['status'], completedBy?: string): Promise<void> {
    const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
    
    // Get current task data to check for recurrence
    const taskDoc = await getDoc(taskRef);
    if (!taskDoc.exists()) {
      throw new Error('Task not found');
    }
    
    const taskData = { id: taskDoc.id, ...convertTimestamps(taskDoc.data()) } as TaskType;
    
    if (status === 'completed') {
      // Record completion history
      // TODO: Re-enable after discussing completion tracking nuances
      // if (completedBy) {
      //   await addDoc(collection(db, COLLECTIONS.TASK_COMPLETIONS), {
      //     taskId,
      //     completedBy,
      //     completedAt: serverTimestamp(),
      //     homeId: taskData.homeId
      //   });
      // }
      
      // Handle recurring tasks
      if (taskData.recurrenceDays && taskData.dueDate) {
        // Calculate next scheduled date using smart scheduling
        const nextScheduledDate = calculateNextScheduledDate(taskData.dueDate, taskData.recurrenceDays);
        
        await updateDoc(taskRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          dueDate: Timestamp.fromDate(nextScheduledDate)
        });
      } else {
        // Non-recurring task - just mark as completed
        await updateDoc(taskRef, {
          status: 'completed',
          completedAt: serverTimestamp()
        });
      }
    } else {
      // Status change other than completion
      await updateDoc(taskRef, { status });
    }
  },

  // Get task completions history
  // TODO: Re-enable after discussing completion tracking nuances
  // async getCompletions(taskId: string): Promise<TaskCompletionType[]> {
  //   const q = query(
  //     collection(db, COLLECTIONS.TASK_COMPLETIONS),
  //     where('taskId', '==', taskId),
  //     orderBy('completedAt', 'desc')
  //   );
  //   
  //   const querySnapshot = await getDocs(q);
  //   return querySnapshot.docs.map(doc => ({
  //     id: doc.id,
  //     ...convertTimestamps(doc.data())
  //   })) as TaskCompletionType[];
  // },

  // Delete a task
  async delete(taskId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.TASKS, taskId));
    
    // Also delete associated completion history
    // TODO: Re-enable after discussing completion tracking nuances
    // const completionsQuery = query(
    //   collection(db, COLLECTIONS.TASK_COMPLETIONS),
    //   where('taskId', '==', taskId)
    // );
    // const completionsSnapshot = await getDocs(completionsQuery);
    // const deletePromises = completionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    // await Promise.all(deletePromises);
  },

  // Daily schedule check - auto-uncheck completed recurring tasks that are due
  async performDailyScheduleCheck(homeIds: string[]): Promise<void> {
    if (homeIds.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Query for completed recurring tasks in user's homes
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('homeId', 'in', homeIds),
      where('status', '==', 'completed')
    );

    const querySnapshot = await getDocs(q);
    const updates: Promise<void>[] = [];

    querySnapshot.forEach((doc) => {
      const task = { id: doc.id, ...convertTimestamps(doc.data()) } as TaskType;
      
      // Check if this is a recurring task that's due for re-activation
      if (task.recurrenceDays && task.dueDate) {
        const taskDueDate = new Date(task.dueDate);
        taskDueDate.setHours(0, 0, 0, 0);
        
        // If the scheduled date has arrived, reactivate the task
        if (taskDueDate.getTime() <= today.getTime()) {
          updates.push(
            updateDoc(doc.ref, {
              status: 'pending'
            })
          );
        }
      }
    });

    // Execute all updates in parallel
    await Promise.all(updates);
  }
};

// Habit CRUD Operations
export const habitService = {
  // Create a new habit
  async create(
    homeId: string,
    title: string,
    createdBy: string,
    options?: {
      description?: string;
      roomId?: string;
      groupId?: string;
    }
  ): Promise<string> {
    const habitData: any = {
      title,
      homeId,
      createdBy,
      createdAt: serverTimestamp()
    };

    // Only add optional fields if they have values
    if (options?.description) habitData.description = options.description;
    if (options?.roomId) habitData.roomId = options.roomId;
    if (options?.groupId) habitData.groupId = options.groupId;
    
    const docRef = await addDoc(collection(db, COLLECTIONS.HABITS), habitData);
    return docRef.id;
  },

  // Get habits for a user (across all their homes)
  async getByUser(userId: string): Promise<HabitType[]> {
    // First, get all homes where user is a member
    const homesQuery = query(
      collection(db, COLLECTIONS.HOMES),
      where('members', 'array-contains', userId)
    );
    
    const homesSnapshot = await getDocs(homesQuery);
    const homeIds = homesSnapshot.docs.map(doc => doc.id);
    
    if (homeIds.length === 0) {
      return [];
    }
    
    // Then get all habits from those homes
    const habitsQuery = query(
      collection(db, COLLECTIONS.HABITS),
      where('homeId', 'in', homeIds),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(habitsQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as HabitType[];
  },

  // Get habits for a specific home
  async getByHome(homeId: string): Promise<HabitType[]> {
    const q = query(
      collection(db, COLLECTIONS.HABITS),
      where('homeId', '==', homeId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as HabitType[];
  },

  // Complete a habit (add completion record)
  async complete(habitId: string, completedBy: string): Promise<string> {
    // Get habit data to include homeId
    const habitRef = doc(db, COLLECTIONS.HABITS, habitId);
    const habitDoc = await getDoc(habitRef);
    
    if (!habitDoc.exists()) {
      throw new Error('Habit not found');
    }
    
    const habitData = habitDoc.data() as HabitType;
    
    // Add completion record
    const completionData = {
      habitId,
      completedBy,
      completedAt: serverTimestamp(),
      homeId: habitData.homeId
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.HABIT_COMPLETIONS), completionData);
    return docRef.id;
  },

  // Get habit completions history
  async getCompletions(habitId: string): Promise<HabitCompletionType[]> {
    const q = query(
      collection(db, COLLECTIONS.HABIT_COMPLETIONS),
      where('habitId', '==', habitId),
      orderBy('completedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as HabitCompletionType[];
  },

  // Get last completion for a habit
  async getLastCompletion(habitId: string): Promise<HabitCompletionType | null> {
    const q = query(
      collection(db, COLLECTIONS.HABIT_COMPLETIONS),
      where('habitId', '==', habitId),
      orderBy('completedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const lastCompletion = querySnapshot.docs[0];
    return {
      id: lastCompletion.id,
      ...convertTimestamps(lastCompletion.data())
    } as HabitCompletionType;
  },

  // Update habit details
  async update(
    habitId: string,
    updates: {
      title?: string;
      description?: string;
      roomId?: string;
      groupId?: string;
    }
  ): Promise<void> {
    const habitRef = doc(db, COLLECTIONS.HABITS, habitId);
    await updateDoc(habitRef, updates);
  },

  // Delete a habit
  async delete(habitId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.HABITS, habitId));
    
    // Also delete associated completion history
    const completionsQuery = query(
      collection(db, COLLECTIONS.HABIT_COMPLETIONS),
      where('habitId', '==', habitId)
    );
    const completionsSnapshot = await getDocs(completionsQuery);
    const deletePromises = completionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }
};

// Group CRUD Operations
export const groupService = {
  // Create a new group
  async create(homeId: string, name: string, createdBy: string): Promise<string> {
    const groupData = {
      name,
      homeId,
      createdBy,
      createdAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.GROUPS), groupData);
    return docRef.id;
  },

  // Get groups for a specific home
  async getByHome(homeId: string): Promise<GroupType[]> {
    const q = query(
      collection(db, COLLECTIONS.GROUPS),
      where('homeId', '==', homeId),
      orderBy('name', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as GroupType[];
  },

  // Get a single group by ID
  async getById(groupId: string): Promise<GroupType | null> {
    const docRef = doc(db, COLLECTIONS.GROUPS, groupId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...convertTimestamps(docSnap.data())
    } as GroupType;
  },

  // Update group name
  async update(groupId: string, updates: { name?: string }): Promise<void> {
    const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);
    await updateDoc(groupRef, updates);
  },

  // Delete a group (orphaned task references handled in frontend)
  async delete(groupId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.GROUPS, groupId));
  },

  // Check if group name already exists in home (for validation)
  async nameExists(homeId: string, name: string, excludeId?: string): Promise<boolean> {
    const q = query(
      collection(db, COLLECTIONS.GROUPS),
      where('homeId', '==', homeId),
      where('name', '==', name)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (excludeId) {
      // Filter out the group being updated
      return querySnapshot.docs.some(doc => doc.id !== excludeId);
    }
    
    return !querySnapshot.empty;
  }
};

// User CRUD Operations
export const userService = {
  // Get multiple users by their IDs
  async getByIds(userIds: string[]): Promise<UserType[]> {
    if (userIds.length === 0) return [];
    
    console.log('🔍 Query: users where __name__ in', userIds);
    
    // Firestore 'in' queries are limited to 10 items, so batch if needed
    const batches: Promise<UserType[]>[] = [];
    for (let i = 0; i < userIds.length; i += 10) {
      const batchIds = userIds.slice(i, i + 10);
      const batchPromise = getDocs(
        query(collection(db, COLLECTIONS.USERS), where('__name__', 'in', batchIds))
      ).then(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data())
        } as UserType))
      );
      batches.push(batchPromise);
    }
    
    const results = await Promise.all(batches);
    return results.flat();
  },
  // Create or update user profile
  async createOrUpdate(
    userId: string, 
    email: string, 
    options?: { name?: string; photoURL?: string }
  ): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const existingUser = await getDoc(userRef);
    
    if (existingUser.exists()) {
      // Update existing user
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        ...(options?.name && { name: options.name }),
        ...(options?.photoURL && { photoURL: options.photoURL })
      });
    } else {
      // Create new user - use setDoc instead of updateDoc
      const userDoc = doc(db, COLLECTIONS.USERS, userId);
      await setDoc(userDoc, {
        email,
        name: options?.name,
        photoURL: options?.photoURL,
        homes: [],
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
    }
  },

  // Add home to user's homes array
  async addHome(userId: string, homeId: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      // Create user document if it doesn't exist
      await setDoc(userRef, {
        homes: [homeId],
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp()
      });
      return;
    }
    
    const userData = userDoc.data();
    const homes = userData.homes || [];
    
    if (!homes.includes(homeId)) {
      await updateDoc(userRef, {
        homes: [...homes, homeId]
      });
    }
  },

  // Remove home from user's homes array
  async removeHome(userId: string, homeId: string): Promise<void> {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return;
    
    const userData = userDoc.data();
    const homes = userData.homes || [];
    
    if (homes.includes(homeId)) {
      await updateDoc(userRef, {
        homes: homes.filter((id: string) => id !== homeId)
      });
    }
  }
};

// Home Invitation CRUD Operations
export const homeInvitationService = {
  // Create a new invitation
  async create(homeId: string, invitedEmail: string, invitedBy: string): Promise<string> {
    // Check if invitation already exists and is pending (for this specific inviter)
    const existingInvite = await this.getByHomeAndEmail(homeId, invitedEmail, invitedBy);
    if (existingInvite && existingInvite.status === 'pending') {
      throw new Error('Invitation already pending for this email');
    }

    const inviteData = {
      homeId,
      invitedEmail: invitedEmail.toLowerCase(),
      invitedBy,
      createdAt: serverTimestamp(),
      status: 'pending' as const
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.HOME_INVITATIONS), inviteData);
    return docRef.id;
  },

  // Get pending invitations for a home
  async getPendingByHome(homeId: string): Promise<HomeInvitationType[]> {
    const q = query(
      collection(db, COLLECTIONS.HOME_INVITATIONS),
      where('homeId', '==', homeId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as HomeInvitationType[];
  },

  // Get invitations for a user by email
  async getPendingByEmail(email: string): Promise<HomeInvitationType[]> {
    const q = query(
      collection(db, COLLECTIONS.HOME_INVITATIONS),
      where('invitedEmail', '==', email.toLowerCase()),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as HomeInvitationType[];
  },

  // Get invitation by home and email (for current user's invitations only)
  async getByHomeAndEmail(homeId: string, email: string, invitedBy: string): Promise<HomeInvitationType | null> {
    const q = query(
      collection(db, COLLECTIONS.HOME_INVITATIONS),
      where('homeId', '==', homeId),
      where('invitedEmail', '==', email.toLowerCase()),
      where('invitedBy', '==', invitedBy),
      where('status', '==', 'pending')
    );
    
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    
    const doc = querySnapshot.docs[0];
    return {
      id: doc.id,
      ...convertTimestamps(doc.data())
    } as HomeInvitationType;
  },

  // Accept invitation
  async accept(invitationId: string, userId: string): Promise<void> {
    const inviteRef = doc(db, COLLECTIONS.HOME_INVITATIONS, invitationId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = inviteDoc.data() as HomeInvitationType;
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer pending');
    }
    
    // Add user to home members
    await homeService.addMember(invitation.homeId, userId);
    
    // Delete the invitation after successful acceptance
    await deleteDoc(inviteRef);
  },

  // Decline invitation
  async decline(invitationId: string): Promise<void> {
    const inviteRef = doc(db, COLLECTIONS.HOME_INVITATIONS, invitationId);
    const inviteDoc = await getDoc(inviteRef);
    
    if (!inviteDoc.exists()) {
      throw new Error('Invitation not found');
    }
    
    const invitation = inviteDoc.data() as HomeInvitationType;
    if (invitation.status !== 'pending') {
      throw new Error('Invitation is no longer pending');
    }
    
    // Delete the invitation after declining
    await deleteDoc(inviteRef);
  },

  // Delete (revoke) invitation
  async delete(invitationId: string): Promise<void> {
    await deleteDoc(doc(db, COLLECTIONS.HOME_INVITATIONS, invitationId));
  }
};