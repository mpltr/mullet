import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { HomeType, RoomType, TaskType, UserType, COLLECTIONS } from '../types/database';

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
  }
};

// Room CRUD Operations
export const roomService = {
  // Create a new room
  async create(homeId: string, name: string, authorizedUsers: string[]): Promise<string> {
    const roomData = {
      name,
      homeId,
      createdAt: serverTimestamp(),
      authorizedUsers
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.ROOMS), roomData);
    return docRef.id;
  },

  // Get rooms for a home
  async getByHome(homeId: string): Promise<RoomType[]> {
    const q = query(
      collection(db, COLLECTIONS.ROOMS),
      where('homeId', '==', homeId),
      orderBy('createdAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as RoomType[];
  }
};

// Task CRUD Operations
export const taskService = {
  // Create a new task
  async create(
    homeId: string, 
    title: string, 
    createdBy: string,
    authorizedUsers: string[],
    options?: {
      description?: string;
      roomId?: string;
      assignedTo?: string;
      dueDate?: Date;
    }
  ): Promise<string> {
    const taskData = {
      title,
      description: options?.description,
      status: 'pending' as const,
      homeId,
      roomId: options?.roomId,
      assignedTo: options?.assignedTo,
      createdBy,
      createdAt: serverTimestamp(),
      dueDate: options?.dueDate ? Timestamp.fromDate(options.dueDate) : null,
      authorizedUsers
    };
    
    const docRef = await addDoc(collection(db, COLLECTIONS.TASKS), taskData);
    return docRef.id;
  },

  // Get tasks for a user (across all their homes)
  async getByUser(userId: string): Promise<TaskType[]> {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('authorizedUsers', 'array-contains', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestamps(doc.data())
    })) as TaskType[];
  },

  // Update task status
  async updateStatus(taskId: string, status: TaskType['status']): Promise<void> {
    const taskRef = doc(db, COLLECTIONS.TASKS, taskId);
    const updateData: any = { status };
    
    if (status === 'completed') {
      updateData.completedAt = serverTimestamp();
    }
    
    await updateDoc(taskRef, updateData);
  }
};

// User CRUD Operations
export const userService = {
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
  }
};