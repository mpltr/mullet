import { CheckIcon, ClockIcon, PlusIcon, HomeIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { useState, useEffect } from 'react';
import { Navigation } from "../Navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useHomes, useEnrichedUserInvitations, useTasks, useHabits, useGroups, useRooms } from "../../hooks/useDatabase";
import { homeInvitationService, taskService, habitService } from "../../lib/database";
import { Loader } from "../Loader";
import { Modal, ConfirmModal } from "../Modal";
import { TaskItem } from "../TaskItem";
import { HabitItem } from "../HabitItem";
import { TaskForm } from "../TaskForm";
import { HabitForm } from "../HabitForm";

export interface ViewTasksProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewTasks(props: ViewTasksProps) {
  const { user } = useAuth();
  const { homes, loading: homesLoading } = useHomes(user?.uid || '');
  const { invitations, loading: invitationsLoading } = useEnrichedUserInvitations(user?.email || '');
  
  // Get current home (first home for now, will add home switching later)
  const currentHome = homes.length > 0 ? homes[0] : null;
  
  // Data hooks for current home
  const { tasks, loading: tasksLoading } = useTasks(user?.uid || '');
  const { habits, loading: habitsLoading } = useHabits(user?.uid || '');
  const { groups, loading: groupsLoading } = useGroups(currentHome?.id || '');
  const { rooms, loading: roomsLoading } = useRooms(currentHome?.id || '');
  
  // UI state
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'task' | 'habit', title: string} | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskType | null>(null);

  // Perform daily schedule check when homes are loaded
  useEffect(() => {
    if (user && homes.length > 0 && !homesLoading) {
      const homeIds = homes.map(home => home.id);
      taskService.performDailyScheduleCheck(homeIds).catch(error => {
        console.error('Error performing daily schedule check:', error);
      });
    }
  }, [user, homes, homesLoading]);

  // Helper functions
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

  // Filter habits for current home
  const currentHabits = habits.filter(habit => 
    currentHome && habit.homeId === currentHome.id
  );

  // Group tasks and habits by group (handle orphaned groups)
  const groupedTasks: Record<string, typeof filteredTasks> = {};
  const groupedHabits: Record<string, typeof currentHabits> = {};
  
  filteredTasks.forEach(task => {
    // If task has groupId but group doesn't exist, treat as ungrouped
    const groupExists = task.groupId ? groups.some(g => g.id === task.groupId) : false;
    const groupKey = (task.groupId && groupExists) ? task.groupId : 'ungrouped';
    if (!groupedTasks[groupKey]) groupedTasks[groupKey] = [];
    groupedTasks[groupKey].push(task);
  });

  currentHabits.forEach(habit => {
    // If habit has groupId but group doesn't exist, treat as ungrouped
    const groupExists = habit.groupId ? groups.some(g => g.id === habit.groupId) : false;
    const groupKey = (habit.groupId && groupExists) ? habit.groupId : 'ungrouped';
    if (!groupedHabits[groupKey]) groupedHabits[groupKey] = [];
    groupedHabits[groupKey].push(habit);
  });

  // Sort tasks within groups by due date
  Object.keys(groupedTasks).forEach(groupKey => {
    groupedTasks[groupKey].sort((a, b) => {
      // Tasks without due date go last
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
  });

  if (homesLoading || invitationsLoading) {
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
              <p className="text-gray-600 mb-6">Create your first home to start managing tasks.</p>
              
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
                  <h2 className="text-lg font-semibold text-gray-900">Pending Home Invitations</h2>
                </div>
                
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-lg">{invitation.homeName}</p>
                          <p className="text-sm text-gray-600 mt-1">
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tasks & Habits</h1>
        
        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6">
          <button 
            onClick={() => setFilter('all')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              filter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All
          </button>
          <button 
            onClick={() => setFilter('pending')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              filter === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Pending
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${
              filter === 'completed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Completed
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Create task/habit buttons */}
            <div className="flex space-x-3 mb-6">
              <button 
                onClick={() => setShowTaskModal(true)}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 inline mr-2" />
                Add Task
              </button>
              <button 
                onClick={() => setShowHabitModal(true)}
                className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                <PlusIcon className="w-5 h-5 inline mr-2" />
                Add Habit
              </button>
            </div>

            {/* Tasks and Habits organized by groups */}
            <div className="space-y-6">
              {/* Ungrouped tasks first */}
              {(groupedTasks.ungrouped || groupedHabits.ungrouped) && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    {currentHome?.name} Tasks
                  </h2>
                  <div className="space-y-3">
                    {groupedTasks.ungrouped?.map((task) => {
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
                    {groupedHabits.ungrouped?.map((habit) => {
                      const room = rooms.find(r => r.id === habit.roomId);
                      return (
                        <HabitItem
                          key={habit.id}
                          habit={habit}
                          userId={user?.uid || ''}
                          roomName={room?.name}
                          showRoomTag={true}
                          onDelete={(habitId) => handleDeleteClick(habitId, 'habit', habit.title)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grouped tasks and habits */}
              {groups.map((group) => {
                const groupTasks = groupedTasks[group.id] || [];
                const groupHabits = groupedHabits[group.id] || [];
                
                if (groupTasks.length === 0 && groupHabits.length === 0) return null;

                return (
                  <div key={group.id}>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">{group.name}</h2>
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
                      {groupHabits.map((habit) => {
                        const room = rooms.find(r => r.id === habit.roomId);
                        return (
                          <HabitItem
                            key={habit.id}
                            habit={habit}
                            userId={user?.uid || ''}
                            roomName={room?.name}
                            showRoomTag={true}
                            onDelete={(habitId) => handleDeleteClick(habitId, 'habit', habit.title)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Empty state when no tasks or habits */}
              {filteredTasks.length === 0 && currentHabits.length === 0 && (
                <div className="text-center py-12">
                  <CheckIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    {filter === 'completed' ? 'No completed tasks yet' : 'No tasks or habits yet'}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {filter === 'completed' 
                      ? 'Complete some tasks to see them here.' 
                      : 'Create your first task or habit to get started.'}
                  </p>
                </div>
              )}
            </div>
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
      isLoading={isDeleting}
    />

    <Navigation />
    </>
  );
}