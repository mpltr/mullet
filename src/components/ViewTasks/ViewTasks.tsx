import { CheckIcon, ClockIcon, PlusIcon, HomeIcon, EnvelopeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { Navigation } from "../Navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useHomes, useEnrichedUserInvitations, useTasks, useHabits, useGroups, useRooms, useUserPreferences } from "../../hooks/useDatabase";
import { homeInvitationService, taskService, habitService } from "../../lib/database";
import { TaskType, HabitType } from "../../types/database";
import { Loader } from "../Loader";
import { Modal, ConfirmModal } from "../Modal";
import { TaskItem } from "../TaskItem";
import { HabitItem } from "../HabitItem";
import { TaskForm } from "../TaskForm";
import { HabitForm } from "../HabitForm";
import { FloatingActionButton } from "../FloatingActionButton";

export interface ViewTasksProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewTasks(props: ViewTasksProps) {
  const { user } = useAuth();
  const { homes, loading: homesLoading } = useHomes(user?.uid || '');
  const { invitations, loading: invitationsLoading } = useEnrichedUserInvitations(user?.email || '');
  const { preferences, loading: preferencesLoading, updatePreferences } = useUserPreferences(user?.uid || '');
  
  // Get current home (first home for now, will add home switching later)
  const currentHome = homes.length > 0 ? homes[0] : null;
  
  // Data hooks for current home
  const { tasks, loading: tasksLoading } = useTasks(user?.uid || '');
  const { habits, loading: habitsLoading } = useHabits(user?.uid || '');
  const { groups, loading: groupsLoading } = useGroups(currentHome?.id || '');
  const { rooms, loading: roomsLoading } = useRooms(currentHome?.id || '');
  
  // UI state
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [groupBy, setGroupBy] = useState<'group' | 'date' | 'room'>(preferences?.taskSort || 'date');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'task' | 'habit', title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskType | null>(null);

  // Update groupBy when preferences load
  useEffect(() => {
    if (preferences?.taskSort) {
      setGroupBy(preferences.taskSort);
    }
  }, [preferences]);

  // Perform daily schedule check when homes are loaded
  useEffect(() => {
    if (user && homes.length > 0 && !homesLoading) {
      const homeIds = homes.map(home => home.id);
      taskService.performDailyScheduleCheck(homeIds).catch(error => {
        console.error('Error performing daily schedule check:', error);
      });
    }
  }, [user, homes, homesLoading]);

  // Helper functions for date grouping
  const getDateCategory = (dueDate: Date | null, isCompleted: boolean) => {
    if (!dueDate) return 'no-due-date';
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    
    // Reset times to compare dates only
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());
    const nextWeekOnly = new Date(nextWeek.getFullYear(), nextWeek.getMonth(), nextWeek.getDate());
    
    if (!isCompleted && dueDateOnly < todayOnly) return 'overdue';
    if (dueDateOnly.getTime() === todayOnly.getTime()) return 'today';
    if (dueDateOnly.getTime() === tomorrowOnly.getTime()) return 'tomorrow';
    if (dueDateOnly <= nextWeekOnly) return 'this-week';
    return 'later';
  };

  const getDateCategoryOrder = (category: string) => {
    const order = {
      'today': 0,
      'overdue': 1,
      'tomorrow': 2,
      'this-week': 3,
      'later': 4,
      'no-due-date': 5
    };
    return order[category as keyof typeof order] || 6;
  };

  const getDateCategoryLabel = (category: string) => {
    const labels = {
      'overdue': 'Overdue',
      'today': 'Today',
      'tomorrow': 'Tomorrow',
      'this-week': 'This Week',
      'later': 'Later',
      'no-due-date': 'No Due Date'
    };
    return labels[category as keyof typeof labels] || category;
  };

  const handleDeleteClick = (id: string, type: 'task' | 'habit', title: string) => {
    setItemToDelete({ id, type, title });
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      if (itemToDelete.type === 'task') {
        await taskService.delete(itemToDelete.id);
      } else {
        await habitService.delete(itemToDelete.id);
      }
      setShowDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTaskEdit = (task: TaskType) => {
    setTaskToEdit(task);
    setShowTaskModal(true);
  };

  // Filter tasks based on current filter
  const filteredTasks = tasks.filter(task => {
    if (!currentHome || task.homeId !== currentHome.id) return false;
    
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  // Note: Habits are now managed in a separate page, not shown here

  // Group-first sorting function
  const getGroupSortedData = () => {
    const groupedTasks: Record<string, typeof filteredTasks> = {};
    
    filteredTasks.forEach(task => {
      // If task has groupId but group doesn't exist, treat as ungrouped
      const groupExists = task.groupId ? groups.some(g => g.id === task.groupId) : false;
      const groupKey = (task.groupId && groupExists) ? task.groupId : 'ungrouped';
      if (!groupedTasks[groupKey]) groupedTasks[groupKey] = [];
      groupedTasks[groupKey].push(task);
    });

    // Sort tasks within groups: uncompleted first, then completed, then by due date within each status
    Object.keys(groupedTasks).forEach(groupKey => {
      groupedTasks[groupKey].sort((a, b) => {
        // First sort by completion status: uncompleted tasks first
        const aCompleted = a.status === 'completed';
        const bCompleted = b.status === 'completed';
        
        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1; // uncompleted (false) comes before completed (true)
        }
        
        // Within same completion status, sort by due date
        // Tasks without due date go last
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });

    return { groupedTasks };
  };

  // Date-first sorting function
  const getDateSortedData = () => {
    const dateGroupedTasks: Record<string, typeof filteredTasks> = {};
    
    filteredTasks.forEach(task => {
      const dateCategory = getDateCategory(task.dueDate ? new Date(task.dueDate) : null, task.status === 'completed');
      if (!dateGroupedTasks[dateCategory]) dateGroupedTasks[dateCategory] = [];
      dateGroupedTasks[dateCategory].push(task);
    });

    // Sort within each date category by completion status first, then by group
    Object.keys(dateGroupedTasks).forEach(dateKey => {
      dateGroupedTasks[dateKey].sort((a, b) => {
        // First sort by completion status: uncompleted tasks first
        const aCompleted = a.status === 'completed';
        const bCompleted = b.status === 'completed';
        
        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1; // uncompleted (false) comes before completed (true)
        }
        
        // Within same completion status, sort by group
        const aGroupName = groups.find(g => g.id === a.groupId)?.name || 'Ungrouped';
        const bGroupName = groups.find(g => g.id === b.groupId)?.name || 'Ungrouped';
        
        if (aGroupName !== bGroupName) {
          return aGroupName.localeCompare(bGroupName);
        }
        
        return 0;
      });
    });

    return { dateGroupedTasks };
  };

  // Room-first sorting function
  const getRoomSortedData = () => {
    const roomGroupedTasks: Record<string, typeof filteredTasks> = {};
    
    filteredTasks.forEach(task => {
      const roomKey = task.roomId || 'no-room';
      if (!roomGroupedTasks[roomKey]) roomGroupedTasks[roomKey] = [];
      roomGroupedTasks[roomKey].push(task);
    });

    // Sort within each room by completion status first, then by group, then by due date
    Object.keys(roomGroupedTasks).forEach(roomKey => {
      roomGroupedTasks[roomKey].sort((a, b) => {
        // First sort by completion status: uncompleted tasks first
        const aCompleted = a.status === 'completed';
        const bCompleted = b.status === 'completed';
        
        if (aCompleted !== bCompleted) {
          return aCompleted ? 1 : -1; // uncompleted (false) comes before completed (true)
        }
        
        // Within same completion status, sort by group
        const aGroupName = groups.find(g => g.id === a.groupId)?.name || 'Ungrouped';
        const bGroupName = groups.find(g => g.id === b.groupId)?.name || 'Ungrouped';
        
        if (aGroupName !== bGroupName) {
          return aGroupName.localeCompare(bGroupName);
        }
        
        // Finally by due date
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });

    return { roomGroupedTasks };
  };

  // Get the appropriate data based on group preference
  const groupSortedData = getGroupSortedData();
  const dateSortedData = getDateSortedData();
  const roomSortedData = getRoomSortedData();
  const { groupedTasks } = groupSortedData;

  if (homesLoading || invitationsLoading || preferencesLoading) {
    return <Loader />;
  }

  // Show empty state if user has no homes
  if (homes.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 pb-20">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Tasks</h1>
            
            {/* Empty state */}
            <div className="text-center py-12">
              <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No homes yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first home to start managing tasks.</p>
              
              <button className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                <PlusIcon className="w-5 h-5 inline mr-2" />
                Create Your First Home
              </button>
            </div>

            {/* Show invitations if any */}
            {invitations.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center space-x-2 mb-4">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pending Home Invitations</h2>
                </div>
                
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-lg">{invitation.homeName}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Owner: {invitation.inviterName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {invitation.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button 
                            onClick={async () => {
                              try {
                                await homeInvitationService.accept(invitation.id, user!.uid);
                              } catch (error) {
                                console.error('Error accepting invite:', error);
                              }
                            }}
                            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await homeInvitationService.decline(invitation.id);
                              } catch (error) {
                                console.error('Error declining invite:', error);
                              }
                            }}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
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
          </div>
        </div>
        <Navigation />
      </>
    );
  }

  const isLoading = tasksLoading || habitsLoading || groupsLoading;

  return (
    <>
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Tasks</h1>
        
        {/* Sort By Dropdown */}
        <div className="mb-4 flex items-center space-x-3">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Sort by</label>
          <div className="relative flex-1">
            <select
              value={groupBy}
              onChange={(e) => {
                const newValue = e.target.value as 'group' | 'date' | 'room';
                setGroupBy(newValue);
                updatePreferences({ taskSort: newValue });
              }}
              className="w-full appearance-none bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md py-2 pl-3 pr-10 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
            >
              <option value="group">Group</option>
              <option value="date">Date</option>
              <option value="room">Room</option>
            </select>
            <ChevronDownIcon className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mb-6">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              filter === 'pending' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Pending
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              filter === 'completed' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-600 dark:text-gray-400 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            Completed
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        ) : (
          <>
            {groupBy === 'group' ? (
              /* Group-First Display */
              <div className="space-y-6">
              {/* Ungrouped tasks first */}
              {groupedTasks.ungrouped && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                    {currentHome?.name} Tasks
                  </h2>
                  <div className="space-y-3">
                    {groupedTasks.ungrouped.map((task) => {
                      const room = rooms.find(r => r.id === task.roomId);
                      const group = task.groupId ? groups.find(g => g.id === task.groupId) : null;
                      return (
                        <TaskItem
                          key={task.id}
                          task={task}
                          userId={user?.uid || ''}
                          roomName={room?.name}
                          groupName={group?.name}
                          showRoomTag={true}
                          onEdit={handleTaskEdit}
                          onDelete={(taskId) => handleDeleteClick(taskId, 'task', task.title)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grouped tasks */}
              {groups.map((group) => {
                const groupTasks = groupedTasks[group.id] || [];
                
                if (groupTasks.length === 0) return null;

                return (
                  <div key={group.id}>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{group.name}</h2>
                    <div className="space-y-3">
                      {groupTasks.map((task) => {
                        const room = rooms.find(r => r.id === task.roomId);
                        return (
                          <TaskItem
                            key={task.id}
                            task={task}
                            userId={user?.uid || ''}
                            roomName={room?.name}
                            groupName={group.name}
                            showRoomTag={true}
                            onEdit={handleTaskEdit}
                            onDelete={(taskId) => handleDeleteClick(taskId, 'task', task.title)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Empty state when no tasks */}
              {filteredTasks.length === 0 && (
                <div className="text-center py-12">
                  <CheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filter === 'completed' ? 'No completed tasks yet' : 'No tasks yet'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {filter === 'completed' 
                      ? 'Complete some tasks to see them here.' 
                      : 'Create your first task to get started.'}
                  </p>
                </div>
              )}
              </div>
            ) : groupBy === 'date' ? (
              /* Date-First Display */
              <div className="space-y-6">
                {['today', 'overdue', 'tomorrow', 'this-week', 'later', 'no-due-date'].map((dateCategory) => {
                  const dateTasks = dateSortedData.dateGroupedTasks[dateCategory] || [];
                  
                  if (dateTasks.length === 0) return null;

                  return (
                    <div key={dateCategory}>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        {getDateCategoryLabel(dateCategory)}
                      </h2>
                      <div className="space-y-3">
                        {dateTasks.map((task) => {
                          const room = rooms.find(r => r.id === task.roomId);
                          const group = groups.find(g => g.id === task.groupId);
                          return (
                            <TaskItem
                              key={task.id}
                              task={task}
                              userId={user?.uid || ''}
                              roomName={room?.name}
                              groupName={group?.name}
                              showRoomTag={true}
                              onEdit={handleTaskEdit}
                              onDelete={(taskId) => handleDeleteClick(taskId, 'task', task.title)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Room-First Display */
              <div className="space-y-6">
                {/* No Room section first */}
                {roomSortedData.roomGroupedTasks['no-room'] && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">No Room</h2>
                    <div className="space-y-3">
                      {roomSortedData.roomGroupedTasks['no-room']?.map((task) => {
                        const group = groups.find(g => g.id === task.groupId);
                        return (
                          <TaskItem
                            key={task.id}
                            task={task}
                            userId={user?.uid || ''}
                            groupName={group?.name}
                            showRoomTag={false}
                            onEdit={handleTaskEdit}
                            onDelete={(taskId) => handleDeleteClick(taskId, 'task', task.title)}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Room sections */}
                {rooms.map((room) => {
                  const roomTasks = roomSortedData.roomGroupedTasks[room.id] || [];
                  
                  if (roomTasks.length === 0) return null;

                  return (
                    <div key={room.id}>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{room.name}</h2>
                      <div className="space-y-3">
                        {roomTasks.map((task) => {
                          const group = groups.find(g => g.id === task.groupId);
                          return (
                            <TaskItem
                              key={task.id}
                              task={task}
                              userId={user?.uid || ''}
                              groupName={group?.name}
                              showRoomTag={false}
                              onEdit={handleTaskEdit}
                              onDelete={(taskId) => handleDeleteClick(taskId, 'task', task.title)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>

    {/* Task Creation/Edit Modal */}
    <Modal
      isOpen={showTaskModal}
      onClose={() => {
        setShowTaskModal(false);
        setTaskToEdit(null);
      }}
      title={taskToEdit ? "Edit Task" : "Create New Task"}
      size="md"
    >
      {currentHome && (
        <TaskForm
          homeId={currentHome.id}
          userId={user?.uid || ''}
          rooms={rooms}
          task={taskToEdit || undefined}
          onSave={() => {
            setShowTaskModal(false);
            setTaskToEdit(null);
          }}
          onCancel={() => {
            setShowTaskModal(false);
            setTaskToEdit(null);
          }}
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
      isLoading={isDeleting}
    />

    {/* Floating Action Button - Task Creation Only */}
    {currentHome && (
      <div className="fixed bottom-24 right-6 z-30">
        <button
          onClick={() => setShowTaskModal(true)}
          className="w-14 h-14 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 hover:scale-105 transition-all duration-300 ease-in-out transform flex items-center justify-center"
        >
          <PlusIcon className="w-6 h-6" />
        </button>
      </div>
    )}

    <Navigation />
    </>
  );
}