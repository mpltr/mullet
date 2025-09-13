import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  doc,
  getDoc,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HomeType, RoomType, TaskType, HomeInvitationType, HomeTypeWithMembers, HomeMember, EnrichedHomeInvitationType, COLLECTIONS } from '../types/database';
import { userService } from '../lib/database';
import { useUsers } from '../contexts/UserContext';

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
      where('homeId', '==', homeId)
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
        
        // Sort alphabetically by name
        roomsData.sort((a, b) => a.name.localeCompare(b.name));
        
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
export function useHomeInvitations(homeId: string, invitedBy?: string) {
  const [invitations, setInvitations] = useState<HomeInvitationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!homeId || !invitedBy) {
      setLoading(false);
      setInvitations([]);
      return;
    }

    console.log('🔍 Query: home_invitations where homeId ==', homeId, 'and invitedBy ==', invitedBy);

    const q = query(
      collection(db, COLLECTIONS.HOME_INVITATIONS),
      where('homeId', '==', homeId),
      where('invitedBy', '==', invitedBy)
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

// Hook for homes with populated member email addresses
export function useHomesWithMembers(userId: string) {
  const [homesWithMembers, setHomesWithMembers] = useState<HomeTypeWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use the existing useHomes hook and UserContext
  const { homes, loading: homesLoading, error: homesError } = useHomes(userId);
  const { getUsersByIds } = useUsers();

  useEffect(() => {
    if (homesLoading) {
      setLoading(true);
      return;
    }

    if (homesError) {
      setError(homesError);
      setLoading(false);
      return;
    }

    if (homes.length === 0) {
      setHomesWithMembers([]);
      setLoading(false);
      return;
    }

    // Get all unique member IDs from all homes
    const allMemberIds = [...new Set(homes.flatMap(home => home.members))];
    
    // Fetch user details for all members using UserContext (with caching)
    getUsersByIds(allMemberIds)
      .then(users => {
        // Create a lookup map for quick access
        const userLookup = new Map(users.map(user => [user.id, user]));
        
        // Transform homes with populated member data
        const enrichedHomes: HomeTypeWithMembers[] = homes.map(home => ({
          ...home,
          members: home.members.map(memberId => {
            const user = userLookup.get(memberId);
            return {
              uid: memberId,
              email: user?.email || 'Unknown',
              name: user?.name
            } as HomeMember;
          })
        }));
        
        setHomesWithMembers(enrichedHomes);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.error('Error fetching member details:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [homes, homesLoading, homesError, getUsersByIds]);

  return { homes: homesWithMembers, loading, error };
}

// Hook for enriched user invitations with home names and inviter names
export function useEnrichedUserInvitations(userEmail: string) {
  const [enrichedInvitations, setEnrichedInvitations] = useState<EnrichedHomeInvitationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use existing hooks
  const { invitations, loading: invitationsLoading, error: invitationsError } = useUserInvitations(userEmail);
  const { getUsersByIds } = useUsers();

  useEffect(() => {
    if (invitationsLoading) {
      setLoading(true);
      return;
    }

    if (invitationsError) {
      setError(invitationsError);
      setLoading(false);
      return;
    }

    if (invitations.length === 0) {
      setEnrichedInvitations([]);
      setLoading(false);
      return;
    }

    // Get all unique home IDs and inviter user IDs
    const homeIds = [...new Set(invitations.map(inv => inv.homeId))];
    const inviterIds = [...new Set(invitations.map(inv => inv.invitedBy))];

    // Fetch home data and user data in parallel
    Promise.all([
      // Fetch homes
      Promise.all(homeIds.map(async homeId => {
        try {
          const homeDoc = await getDoc(doc(db, COLLECTIONS.HOMES, homeId));
          if (homeDoc.exists()) {
            return { id: homeDoc.id, ...convertTimestamps(homeDoc.data()) } as HomeType;
          }
          return null;
        } catch (error) {
          console.error('Error fetching home:', error);
          return null;
        }
      })),
      // Fetch inviters
      getUsersByIds(inviterIds)
    ])
      .then(([homes, inviters]) => {
        // Create lookup maps
        const homeLookup = new Map(homes.filter(Boolean).map(home => [home!.id, home!]));
        const inviterLookup = new Map(inviters.map(user => [user.id, user]));
        
        // Enrich invitations
        const enriched: EnrichedHomeInvitationType[] = invitations.map(invitation => {
          const home = homeLookup.get(invitation.homeId);
          const inviter = inviterLookup.get(invitation.invitedBy);
          
          return {
            ...invitation,
            homeName: home?.name || 'Unknown Home',
            inviterName: inviter?.name || inviter?.email || 'Unknown User'
          };
        });
        
        setEnrichedInvitations(enriched);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        console.error('Error enriching invitations:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [invitations, invitationsLoading, invitationsError, getUsersByIds]);

  return { invitations: enrichedInvitations, loading, error };
}