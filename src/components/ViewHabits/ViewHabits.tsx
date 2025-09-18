import { useState, useEffect } from 'react';
import { PlusIcon, ArrowPathIcon, EnvelopeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useHomes, useEnrichedUserInvitations, useHabits, useGroups, useRooms, useAllHabitCompletions, useUserPreferences } from "../../hooks/useDatabase";
import { homeInvitationService, habitService } from "../../lib/database";
import { Loader } from "../Loader";
import { Modal, ConfirmModal } from "../Modal";
import { HabitItem } from "../HabitItem";
import { HabitForm } from "../HabitForm";
import { FloatingActionButton } from "../FloatingActionButton";
import { HabitType } from "../../types/database";

export interface ViewHabitsProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewHabits(props: ViewHabitsProps) {
  const { user } = useAuth();
  const { homes, loading: homesLoading } = useHomes(user?.uid || '');
  const { invitations, loading: invitationsLoading } = useEnrichedUserInvitations(user?.email || '');
  const { preferences, loading: preferencesLoading, updatePreferences } = useUserPreferences(user?.uid || '');

  // Get current home (first home for now)
  const currentHome = homes.length > 0 ? homes[0] : null;
  
  // Data hooks for current home
  const { habits, loading: habitsLoading } = useHabits(user?.uid || '');
  const { groups, loading: groupsLoading } = useGroups(currentHome?.id || '');
  const { rooms, loading: roomsLoading } = useRooms(currentHome?.id || '');
  const { completions, loading: completionsLoading } = useAllHabitCompletions(currentHome?.id || '');
  
  // UI state
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'habit', title: string} | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [groupBy, setGroupBy] = useState<'group' | 'date' | 'room'>(preferences?.habitSort || 'date');

  // Update groupBy when preferences load
  useEffect(() => {
    if (preferences?.habitSort) {
      setGroupBy(preferences.habitSort);
    }
  }, [preferences]);

  // Helper functions
  const handleDeleteClick = (id: string, type: 'habit', title: string) => {
    setItemToDelete({ id, type, title });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isDeletingItem) return;

    setIsDeletingItem(true);
    try {
      await habitService.delete(itemToDelete.id);
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleAcceptInvitation = async (inviteId: string) => {
    try {
      await homeInvitationService.accept(inviteId);
    } catch (error) {
      console.error('Error accepting invitation:', error);
    }
  };

  const handleDeclineInvitation = async (inviteId: string) => {
    try {
      await homeInvitationService.decline(inviteId);
    } catch (error) {
      console.error('Error declining invitation:', error);
    }
  };

  // Filter habits for current home
  const currentHabits = habits.filter(habit => 
    currentHome && habit.homeId === currentHome.id
  );

  // Date categorization function (same as tasks)
  const getDateCategory = (dueDate: Date | null, isCompleted: boolean) => {
    if (isCompleted && !dueDate) return 'no-due-date';
    if (!dueDate) return 'no-due-date';

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const targetDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

    if (targetDate < today && !isCompleted) return 'overdue';
    if (targetDate.getTime() === today.getTime()) return 'today';
    if (targetDate.getTime() === tomorrow.getTime()) return 'tomorrow';
    if (targetDate <= nextWeek) return 'this-week';
    return 'later';
  };

  const getDateCategoryLabel = (category: string) => {
    switch (category) {
      case 'overdue': return 'Overdue';
      case 'today': return 'Today';
      case 'tomorrow': return 'Tomorrow';
      case 'this-week': return 'This Week';
      case 'later': return 'Later';
      case 'no-due-date': return 'No Due Date';
      default: return category;
    }
  };

  // Group-first sorting function
  const getGroupSortedData = () => {
    const groupedHabits: Record<string, typeof currentHabits> = {};
    
    currentHabits.forEach(habit => {
      const groupExists = habit.groupId ? groups.some(g => g.id === habit.groupId) : false;
      const groupKey = (habit.groupId && groupExists) ? habit.groupId : 'ungrouped';
      if (!groupedHabits[groupKey]) groupedHabits[groupKey] = [];
      groupedHabits[groupKey].push(habit);
    });

    return { groupedHabits };
  };

  // Helper function to get last completion for a habit
  const getLastCompletion = (habitId: string) => {
    return completions
      .filter(completion => completion.habitId === habitId)
      .sort((a, b) => {
        const aTime = a.completedAt?.getTime() || 0;
        const bTime = b.completedAt?.getTime() || 0;
        return bTime - aTime;
      })[0] || null;
  };

  // Helper function to calculate days since last completion
  const getDaysSinceLastCompletion = (habitId: string) => {
    const lastCompletion = getLastCompletion(habitId);
    if (!lastCompletion || !lastCompletion.completedAt) {
      return 999999; // Never completed - put at top of list
    }
    
    const now = new Date();
    const completionTime = new Date(lastCompletion.completedAt);
    const diffTime = now.getTime() - completionTime.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  // Date-first sorting function (sort by days since last completion, descending)
  const getDateSortedData = () => {
    const dateGroupedHabits: Record<string, typeof currentHabits> = {};
    
    // Put all habits in 'no-due-date' but sort by days since last completion
    dateGroupedHabits['no-due-date'] = [...currentHabits];

    // Sort by days since last completion (descending: most days first)
    dateGroupedHabits['no-due-date'].sort((a, b) => {
      const aDays = getDaysSinceLastCompletion(a.id);
      const bDays = getDaysSinceLastCompletion(b.id);
      
      // Sort by days descending (most days since completion first)
      if (aDays !== bDays) {
        return bDays - aDays;
      }
      
      // If same days, sort alphabetically by title
      return a.title.localeCompare(b.title);
    });

    return { dateGroupedHabits };
  };

  // Room-first sorting function
  const getRoomSortedData = () => {
    const roomGroupedHabits: Record<string, typeof currentHabits> = {};
    
    currentHabits.forEach(habit => {
      const roomKey = habit.roomId || 'no-room';
      if (!roomGroupedHabits[roomKey]) roomGroupedHabits[roomKey] = [];
      roomGroupedHabits[roomKey].push(habit);
    });

    // Sort within each room by group, then alphabetically
    Object.keys(roomGroupedHabits).forEach(roomKey => {
      roomGroupedHabits[roomKey].sort((a, b) => {
        const aGroupName = groups.find(g => g.id === a.groupId)?.name || 'Ungrouped';
        const bGroupName = groups.find(g => g.id === b.groupId)?.name || 'Ungrouped';
        
        if (aGroupName !== bGroupName) {
          return aGroupName.localeCompare(bGroupName);
        }
        
        return a.title.localeCompare(b.title);
      });
    });

    return { roomGroupedHabits };
  };

  // Get the appropriate data based on group preference
  const groupSortedData = getGroupSortedData();
  const dateSortedData = getDateSortedData();
  const roomSortedData = getRoomSortedData();
  const { groupedHabits } = groupSortedData;

  if (homesLoading || invitationsLoading || preferencesLoading) {
    return <Loader />;
  }

  // Show empty state if user has no homes
  if (homes.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 pb-20">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Habits</h1>
            
            {/* Show pending invitations */}
            {invitations.length > 0 && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Invitations</h2>
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <EnvelopeIcon className="h-6 w-6 text-blue-600" />
                          <div>
                            <p className="font-medium text-blue-900">
                              Invitation to join "{invitation.homeName}"
                            </p>
                            <p className="text-sm text-blue-700">
                              From {invitation.invitedByName || invitation.invitedBy}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleAcceptInvitation(invitation.id)}
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDeclineInvitation(invitation.id)}
                            className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-center py-12">
              <ArrowPathIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No homes yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                You need to be part of a home to manage habits.
              </p>
            </div>
          </div>
        </div>
        <Navigation />
      </>
    );
  }

  const isLoading = habitsLoading || groupsLoading || roomsLoading || completionsLoading;

  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Habits</h1>
        
        {/* Sort By Dropdown */}
        <div className="mb-4 flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Sort by</label>
          <div className="relative flex-1">
            <select
              value={groupBy}
              onChange={(e) => {
                const newValue = e.target.value as 'group' | 'date' | 'room';
                setGroupBy(newValue);
                updatePreferences({ habitSort: newValue });
              }}
              className="w-full appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="group">Group</option>
              <option value="date">Date</option>
              <option value="room">Room</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <>
            {groupBy === 'group' ? (
              /* Group-First Display */
              <div className="space-y-6">
                {/* Ungrouped habits first */}
                {groupedHabits.ungrouped && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      {currentHome?.name} Habits
                    </h2>
                    <div className="space-y-3">
                      {groupedHabits.ungrouped.map((habit) => {
                        const room = rooms.find(r => r.id === habit.roomId);
                        const group = habit.groupId ? groups.find(g => g.id === habit.groupId) : null;
                        return (
                          <HabitItem
                            key={habit.id}
                            habit={habit}
                            userId={user?.uid || ''}
                            roomName={room?.name}
                            groupName={group?.name}
                            showRoomTag={true}
                            onDelete={(habitId) => handleDeleteClick(habitId, 'habit', habit.title)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Grouped habits */}
                {groups.map((group) => {
                  const groupHabits = groupedHabits[group.id] || [];
                  
                  if (groupHabits.length === 0) return null;

                  return (
                    <div key={group.id}>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">{group.name}</h2>
                      <div className="space-y-3">
                        {groupHabits.map((habit) => {
                          const room = rooms.find(r => r.id === habit.roomId);
                          const group = groups.find(g => g.id === habit.groupId);
                          return (
                            <HabitItem
                              key={habit.id}
                              habit={habit}
                              userId={user?.uid || ''}
                              roomName={room?.name}
                              groupName={group?.name}
                              showRoomTag={true}
                              onDelete={(habitId) => handleDeleteClick(habitId, 'habit', habit.title)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state when no habits */}
                {currentHabits.length === 0 && (
                  <div className="text-center py-12">
                    <ArrowPathIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No habits yet</h3>
                    <p className="text-gray-600 mb-6">Create your first habit to start building good routines.</p>
                  </div>
                )}
              </div>
            ) : groupBy === 'date' ? (
              /* Date-First Display (simplified for habits) */
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">All Habits</h2>
                  <div className="space-y-3">
                    {dateSortedData.dateGroupedHabits['no-due-date']?.map((habit) => {
                      const room = rooms.find(r => r.id === habit.roomId);
                      const group = groups.find(g => g.id === habit.groupId);
                      return (
                        <HabitItem
                          key={habit.id}
                          habit={habit}
                          userId={user?.uid || ''}
                          roomName={room?.name}
                          groupName={group?.name}
                          showRoomTag={true}
                          onDelete={(habitId) => handleDeleteClick(habitId, 'habit', habit.title)}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Empty state when no habits */}
                {currentHabits.length === 0 && (
                  <div className="text-center py-12">
                    <ArrowPathIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No habits yet</h3>
                    <p className="text-gray-600 mb-6">Create your first habit to start building good routines.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Room-First Display */
              <div className="space-y-6">
                {/* No Room section first */}
                {roomSortedData.roomGroupedHabits['no-room'] && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">No Room</h2>
                    <div className="space-y-3">
                      {roomSortedData.roomGroupedHabits['no-room']?.map((habit) => {
                        const group = groups.find(g => g.id === habit.groupId);
                        return (
                          <HabitItem
                            key={habit.id}
                            habit={habit}
                            userId={user?.uid || ''}
                            groupName={group?.name}
                            showRoomTag={false}
                            onDelete={(habitId) => handleDeleteClick(habitId, 'habit', habit.title)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Room sections */}
                {rooms.map((room) => {
                  const roomHabits = roomSortedData.roomGroupedHabits[room.id] || [];
                  
                  if (roomHabits.length === 0) return null;

                  return (
                    <div key={room.id}>
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">{room.name}</h2>
                      <div className="space-y-3">
                        {roomHabits.map((habit) => {
                          const group = groups.find(g => g.id === habit.groupId);
                          return (
                            <HabitItem
                              key={habit.id}
                              habit={habit}
                              userId={user?.uid || ''}
                              groupName={group?.name}
                              showRoomTag={false}
                              onDelete={(habitId) => handleDeleteClick(habitId, 'habit', habit.title)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Empty state when no habits */}
                {currentHabits.length === 0 && (
                  <div className="text-center py-12">
                    <ArrowPathIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No habits yet</h3>
                    <p className="text-gray-600 mb-6">Create your first habit to start building good routines.</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* Habit Creation Modal */}
    <Modal
      isOpen={showHabitModal}
      onClose={() => setShowHabitModal(false)}
      title="Create New Habit"
      size="md"
    >
      {currentHome && (
        <HabitForm
          homeId={currentHome.id}
          userId={user?.uid || ''}
          rooms={rooms}
          onSave={() => setShowHabitModal(false)}
          onCancel={() => setShowHabitModal(false)}
        />
      )}
    </Modal>

    {/* Delete Confirmation Modal */}
    <ConfirmModal
      isOpen={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      onConfirm={handleConfirmDelete}
      title={`Delete ${itemToDelete?.type}`}
      message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
      confirmText="Delete"
      variant="danger"
      isLoading={isDeletingItem}
    />

    {/* Floating Action Button - Only for habits */}
    {currentHome && (
      <div className="fixed bottom-24 right-6 z-30">
        <button
          onClick={() => setShowHabitModal(true)}
          className="w-14 h-14 bg-purple-600 text-white rounded-lg shadow-lg hover:bg-purple-700 hover:scale-105 transition-all duration-300 ease-in-out transform flex items-center justify-center"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>
    )}

    <Navigation />
    </>
  );
}