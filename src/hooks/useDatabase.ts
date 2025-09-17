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
import { HomeType, RoomType, TaskType, HomeInvitationType, HomeTypeWithMembers, HomeMember, EnrichedHomeInvitationType, HabitType, GroupType, HabitCompletionType, COLLECTIONS } from '../types/database';
import { userService, habitService, groupService } from '../lib/database';
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
          homesData.sort((a, b) => {
            const aTime = a.createdAt?.getTime() || 0;
            const bTime = b.createdAt?.getTime() || 0;
            return bTime - aTime;
          });
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
  const { homes, loading: homesLoading } = useHomes(userId);
  const { preloadUsers } = useUsers();

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    if (homesLoading) {
      return; // Wait for homes to load
    }
    
    const homeIds = homes.map(home => home.id);
    
    if (homeIds.length === 0) {
      setTasks([]);
      setLoading(false);
      return;
    }

    console.log('🔍 Query: tasks where homeId in', homeIds);
    
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('homeId', 'in', homeIds)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const tasksData: TaskType[] = [];
        querySnapshot.forEach((doc) => {
          const taskData = {
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as TaskType;
          
          // Debug logging for completion tracking
          if (taskData.status === 'completed' || taskData.lastCompletedBy) {
            console.log('📖 Reading task from DB:', {
              id: taskData.id,
              title: taskData.title,
              status: taskData.status,
              completedAt: taskData.completedAt,
              lastCompletedBy: taskData.lastCompletedBy,
              lastCompletedAt: taskData.lastCompletedAt
            });
          }
          
          tasksData.push(taskData);
        });
        // Sort by createdAt descending (newest first) on client-side
        tasksData.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
        
        // Preload user data for completion tracking before setting tasks
        const userIds = new Set<string>();
        tasksData.forEach(task => {
          if (task.lastCompletedBy) {
            userIds.add(task.lastCompletedBy);
          }
          if (task.createdBy) {
            userIds.add(task.createdBy);
          }
        });
        
        if (userIds.size > 0) {
          // Wait for users to be preloaded before setting tasks
          preloadUsers(Array.from(userIds))
            .then(() => {
              setTasks(tasksData);
              setLoading(false);
              setError(null);
            })
            .catch(err => {
              console.error('Failed to preload users:', err);
              // Still set tasks even if user preloading fails
              setTasks(tasksData);
              setLoading(false);
              setError(null);
            });
        } else {
          // No users to preload
          setTasks(tasksData);
          setLoading(false);
          setError(null);
        }
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, homesLoading, homes]);

  return { tasks, loading: loading || homesLoading, error };
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
        pendingInvitations.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
        
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
        invitationsData.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
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

// Hook for real-time habits data for a specific user
export function useHabits(userId: string) {
  const [habits, setHabits] = useState<HabitType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { homes, loading: homesLoading } = useHomes(userId);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    
    if (homesLoading) {
      return; // Wait for homes to load
    }
    
    const homeIds = homes.map(home => home.id);
    
    if (homeIds.length === 0) {
      setHabits([]);
      setLoading(false);
      return;
    }

    console.log('🔍 Query: habits where homeId in', homeIds);
    
    const q = query(
      collection(db, COLLECTIONS.HABITS),
      where('homeId', 'in', homeIds)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const habitsData: HabitType[] = [];
        querySnapshot.forEach((doc) => {
          habitsData.push({
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as HabitType);
        });
        // Sort by createdAt descending (newest first)
        habitsData.sort((a, b) => {
          const aTime = a.createdAt?.getTime() || 0;
          const bTime = b.createdAt?.getTime() || 0;
          return bTime - aTime;
        });
        setHabits(habitsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching habits:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, homesLoading, homes]);

  return { habits, loading: loading || homesLoading, error };
}

// Hook for habits by home
export function useHabitsByHome(userId: string, homeId: string) {
  const { habits, loading, error } = useHabits(userId);
  
  const homeHabits = habits.filter(habit => habit.homeId === homeId);

  return { habits: homeHabits, loading, error };
}

// Hook for habits by room
export function useHabitsByRoom(userId: string, roomId: string) {
  const { habits, loading, error } = useHabits(userId);
  
  const roomHabits = habits.filter(habit => habit.roomId === roomId);

  return { habits: roomHabits, loading, error };
}

// Hook for habit completions with user enrichment
export function useHabitCompletions(habitId: string, homeId?: string) {
  const [completions, setCompletions] = useState<HabitCompletionType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!habitId || !homeId) {
      setLoading(false);
      return;
    }

    console.log('🔍 Query: habit_completions where habitId ==', habitId, 'and homeId ==', homeId);
    
    const q = query(
      collection(db, COLLECTIONS.HABIT_COMPLETIONS),
      where('habitId', '==', habitId),
      where('homeId', '==', homeId)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const completionsData: HabitCompletionType[] = [];
        querySnapshot.forEach((doc) => {
          completionsData.push({
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as HabitCompletionType);
        });
        // Sort by completedAt descending (newest first)
        completionsData.sort((a, b) => {
          const aTime = a.completedAt?.getTime() || 0;
          const bTime = b.completedAt?.getTime() || 0;
          return bTime - aTime;
        });
        setCompletions(completionsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching habit completions:', err);
        
        // If it's a permission error, just set empty completions and continue
        if (err.code === 'permission-denied') {
          console.warn('Permission denied for habit completions, setting empty array');
          setCompletions([]);
          setLoading(false);
          setError(null); // Don't treat this as an error for the UI
        } else {
          setError(err.message);
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [habitId, homeId]);

  return { completions, loading, error };
}

// Hook for getting the last completion of a habit
export function useLastHabitCompletion(habitId: string, homeId?: string) {
  const { completions, loading, error } = useHabitCompletions(habitId, homeId);
  
  const lastCompletion = completions.length > 0 ? completions[0] : null;

  return { lastCompletion, loading, error };
}

// Hook for real-time groups data for a specific home
export function useGroups(homeId: string) {
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!homeId) {
      setLoading(false);
      return;
    }

    console.log('🔍 Query: groups where homeId ==', homeId);
    
    const q = query(
      collection(db, COLLECTIONS.GROUPS),
      where('homeId', '==', homeId)
    );

    const unsubscribe: Unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const groupsData: GroupType[] = [];
        querySnapshot.forEach((doc) => {
          groupsData.push({
            id: doc.id,
            ...convertTimestamps(doc.data())
          } as GroupType);
        });
        // Sort alphabetically by name
        groupsData.sort((a, b) => a.name.localeCompare(b.name));
        setGroups(groupsData);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching groups:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [homeId]);

  return { groups, loading, error };
}

// Hook for getting a single group by ID
export function useGroup(groupId: string) {
  const [group, setGroup] = useState<GroupType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    console.log('🔍 Query: group by ID', groupId);
    
    const groupRef = doc(db, COLLECTIONS.GROUPS, groupId);

    const unsubscribe: Unsubscribe = onSnapshot(
      groupRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setGroup({
            id: docSnapshot.id,
            ...convertTimestamps(docSnapshot.data())
          } as GroupType);
        } else {
          setGroup(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching group:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [groupId]);

  return { group, loading, error };
}