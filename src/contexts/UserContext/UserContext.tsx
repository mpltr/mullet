import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserType } from '../../types/database';
import { userService } from '../../lib/database';

interface UserContextType {
  // Get user info by ID (from cache or fetch)
  getUserById: (userId: string) => Promise<UserType | null>;
  // Get multiple users by IDs (batch fetch with caching)
  getUsersByIds: (userIds: string[]) => Promise<UserType[]>;
  // Get user from cache only (no fetch)
  getCachedUser: (userId: string) => UserType | null;
  // Preload users into cache
  preloadUsers: (userIds: string[]) => Promise<void>;
  // Clear cache (if needed)
  clearCache: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [userCache, setUserCache] = useState<Map<string, UserType>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  const getCachedUser = (userId: string): UserType | null => {
    return userCache.get(userId) || null;
  };

  const getUserById = async (userId: string): Promise<UserType | null> => {
    // Return from cache if available
    const cached = userCache.get(userId);
    if (cached) return cached;

    // Prevent duplicate requests
    if (loadingUsers.has(userId)) {
      // Wait a bit and try cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      return userCache.get(userId) || null;
    }

    try {
      setLoadingUsers(prev => new Set(prev).add(userId));
      const users = await userService.getByIds([userId]);
      const user = users[0] || null;
      
      if (user) {
        setUserCache(prev => new Map(prev).set(userId, user));
      }
      
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      return null;
    } finally {
      setLoadingUsers(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const getUsersByIds = async (userIds: string[]): Promise<UserType[]> => {
    const uncachedIds = userIds.filter(id => !userCache.has(id) && !loadingUsers.has(id));
    
    // If all users are cached, return immediately
    if (uncachedIds.length === 0) {
      return userIds.map(id => userCache.get(id)).filter(Boolean) as UserType[];
    }

    try {
      // Mark as loading
      setLoadingUsers(prev => {
        const next = new Set(prev);
        uncachedIds.forEach(id => next.add(id));
        return next;
      });

      // Fetch uncached users
      const fetchedUsers = await userService.getByIds(uncachedIds);
      
      // Update cache
      setUserCache(prev => {
        const next = new Map(prev);
        fetchedUsers.forEach(user => next.set(user.id, user));
        return next;
      });

      // Return all requested users (cached + newly fetched)
      return userIds.map(id => userCache.get(id) || fetchedUsers.find(u => u.id === id)).filter(Boolean) as UserType[];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    } finally {
      setLoadingUsers(prev => {
        const next = new Set(prev);
        uncachedIds.forEach(id => next.delete(id));
        return next;
      });
    }
  };

  const preloadUsers = async (userIds: string[]): Promise<void> => {
    await getUsersByIds(userIds);
  };

  const clearCache = () => {
    setUserCache(new Map());
    setLoadingUsers(new Set());
  };

  const value: UserContextType = {
    getUserById,
    getUsersByIds,
    getCachedUser,
    preloadUsers,
    clearCache
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUsers() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUsers must be used within a UserProvider');
  }
  return context;
}

// Convenience hook for getting a single user
export function useUser(userId: string | null): UserType | null {
  const { getCachedUser, getUserById } = useUsers();
  const [user, setUser] = useState<UserType | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }

    // First try cache
    const cached = getCachedUser(userId);
    if (cached) {
      setUser(cached);
      return;
    }

    // Then fetch if not cached
    getUserById(userId).then(setUser);
  }, [userId, getCachedUser, getUserById]);

  return user;
}