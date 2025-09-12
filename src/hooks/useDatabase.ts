import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HomeType, RoomType, TaskType, HomeInvitationType, COLLECTIONS } from '../types/database';

// Convert Firestore Timestamp to Date
const convertTimestamps = (data: any): any => {
  if (data === null || data === undefined) return data;
  
  if (data?.toDate && typeof data.toDate === 'function') {
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

// Hook for real-time homes data
export function useHomes(userId: string) {
  const [homes, setHomes] = useState<HomeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    console.log('🔍 Query: homes where members array-contains', userId);
    
    const q = query(
      collection(db, COLLECTIONS.HOMES),
      where('members', 'array-contains', userId)
    );

    let unsubscribe: Unsubscribe;
    
    try {
      unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          const homesData: HomeType[] = [];
          querySnapshot.forEach((doc) => {
            homesData.push({
              id: doc.id,
              ...convertTimestamps(doc.data())
            } as HomeType);
          });
          // Sort by createdAt descending (newest first)
          homesData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          setHomes(homesData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          // Handle permission denied errors for new users with no homes
          if (err.code === 'permission-denied' || err.code === 'firestore/permission-denied') {
            setHomes([]);
            setError(null);
          } else {
            console.error('Error fetching homes:', err);
            setError(err.message);
          }
          setLoading(false);
        }
      );
    } catch (err: any) {
      // Handle permission denied errors for new users with no homes
      if (err.code === 'permission-denied' || err.code === 'firestore/permission-denied') {
        setHomes([]);
        setError(null);
      } else {
        console.error('Error setting up homes listener:', err);
        setError(err.message);
      }
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }

    return () => unsubscribe();
  }, [userId]);

  return { homes, loading, error };
}

// Hook for real-time rooms data for a specific home
export function useRooms(homeId: string) {
  const [rooms, setRooms] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!homeId) {
      setLoading(false);
      return;
    }

    console.log('🔍 Query: rooms where homeId ==', homeId);
    
    const q = query(
      collection(db, COLLECTIONS.ROOMS),
      where('homeId', '==', homeId),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const roomsData: RoomType[] = [];
        querySnapshot.forEach((doc) => {
          roomsData.push({
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as RoomType);
        });
        setRooms(roomsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching rooms:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [homeId]);

  return { rooms, loading, error };
}

// Hook for real-time tasks data for a specific user
export function useTasks(userId: string) {
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    console.log('🔍 Query: tasks where authorizedUsers array-contains', userId);
    
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('authorizedUsers', 'array-contains', userId)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const tasksData: TaskType[] = [];
        querySnapshot.forEach((doc) => {
          tasksData.push({
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as TaskType);
        });
        // Sort by createdAt descending (newest first)
        tasksData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setTasks(tasksData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { tasks, loading, error };
}

// Hook for filtered tasks (pending, completed, etc.)
export function useFilteredTasks(userId: string, filter?: 'pending' | 'completed' | 'all') {
  const { tasks, loading, error } = useTasks(userId);

  const filteredTasks = tasks.filter(task => {
    if (!filter || filter === 'all') return true;
    return task.status === filter || (filter === 'pending' && task.status !== 'completed');
  });

  return { 
    tasks: filteredTasks, 
    allTasks: tasks,
    loading, 
    error 
  };
}

// Hook for tasks by home
export function useTasksByHome(userId: string, homeId: string) {
  const { tasks, loading, error } = useTasks(userId);
  
  const homeTasks = tasks.filter(task => task.homeId === homeId);

  return { tasks: homeTasks, loading, error };
}

// Hook for tasks by room
export function useTasksByRoom(userId: string, roomId: string) {
  const { tasks, loading, error } = useTasks(userId);
  
  const roomTasks = tasks.filter(task => task.roomId === roomId);

  return { tasks: roomTasks, loading, error };
}

// Hook for real-time home invitations for a specific home
export function useHomeInvitations(homeId: string) {
  const [invitations, setInvitations] = useState<HomeInvitationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!homeId) {
      setLoading(false);
      setInvitations([]);
      return;
    }

    console.log('🔍 Query: home_invitations where homeId ==', homeId);

    const q = query(
      collection(db, COLLECTIONS.HOME_INVITATIONS),
      where('homeId', '==', homeId)
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const invitationsData: HomeInvitationType[] = [];
        querySnapshot.forEach((doc) => {
          invitationsData.push({
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as HomeInvitationType);
        });

        const pendingInvitations = invitationsData.filter(inv => inv.status === 'pending');
        pendingInvitations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        
        setInvitations(pendingInvitations);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error in invitations listener:', err);
        setInvitations([]);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [homeId]);

  return { invitations, loading, error };
}

// Hook for real-time invitations for a user by email
export function useUserInvitations(userEmail: string) {
  const [invitations, setInvitations] = useState<HomeInvitationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      setInvitations([]);
      return;
    }

    console.log('🔍 Query: home_invitations where invitedEmail ==', userEmail.toLowerCase());

    const q = query(
      collection(db, COLLECTIONS.HOME_INVITATIONS),
      where('invitedEmail', '==', userEmail.toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const invitationsData: HomeInvitationType[] = [];
        querySnapshot.forEach((doc) => {
          invitationsData.push({
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as HomeInvitationType);
        });
        
        // Sort by createdAt descending on client side
        invitationsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        setInvitations(invitationsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching user invitations:', err);
        setInvitations([]);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userEmail]);

  return { invitations, loading, error };
}