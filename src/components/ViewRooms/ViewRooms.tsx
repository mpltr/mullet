import { useState } from 'react';
import { PlusIcon, HomeIcon, EnvelopeIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useHomes, useEnrichedUserInvitations, useRooms, useTasks, useHabits, useGroups } from "../../hooks/useDatabase";
import { homeInvitationService, roomService, taskService, habitService } from "../../lib/database";
import { Loader } from "../Loader";
import { Modal, ConfirmModal } from "../Modal";
import { Input } from "../Input";
import { TaskItem } from "../TaskItem";
import { HabitItem } from "../HabitItem";
import { TaskForm } from "../TaskForm";
import { HabitForm } from "../HabitForm";
import { FloatingActionButton } from "../FloatingActionButton";
import { HomeType, RoomType, TaskType } from "../../types/database";

export interface ViewRoomsProps {
  // Add any props needed from getServerSideProps or parent components
}

// Component to display rooms for a single home
interface HomeRoomsDisplayProps {
  home: HomeType;
  user: any;
  onAddRoom: (homeId: string) => void;
  onDeleteRoom: (room: RoomType) => void;
  onTaskCreate: (room: RoomType) => void;
  onHabitCreate: (room: RoomType) => void;
  onTaskEdit: (task: TaskType) => void;
  onItemDelete: (id: string, type: 'task' | 'habit', title: string) => void;
}

function HomeRoomsDisplay({ home, user, onAddRoom, onDeleteRoom, onTaskCreate, onHabitCreate, onTaskEdit, onItemDelete }: HomeRoomsDisplayProps) {
  const { rooms, loading: roomsLoading } = useRooms(home.id);
  const { tasks, loading: tasksLoading } = useTasks(user?.uid || '');
  const { habits, loading: habitsLoading } = useHabits(user?.uid || '');
  const { groups, loading: groupsLoading } = useGroups(home.id);
  const isOwner = home.createdBy === user?.uid;

  if (roomsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const isLoading = tasksLoading || habitsLoading || groupsLoading;

  // Filter tasks and habits for this home
  const homeTasks = tasks.filter(task => task.homeId === home.id);
  const homeHabits = habits.filter(habit => habit.homeId === home.id);

  // Helper function to get color classes
  const getColorDotClass = (color: string) => {
    const colorMap: Record<string, string> = {
      'red-200': 'bg-red-200',
      'orange-200': 'bg-orange-200',
      'amber-200': 'bg-amber-200',
      'yellow-200': 'bg-yellow-200',
      'lime-200': 'bg-lime-200',
      'green-200': 'bg-green-200',
      'emerald-200': 'bg-emerald-200',
      'teal-200': 'bg-teal-200',
      'cyan-200': 'bg-cyan-200',
      'sky-200': 'bg-sky-200',
      'blue-200': 'bg-blue-200',
      'indigo-200': 'bg-indigo-200',
      'violet-200': 'bg-violet-200',
      'purple-200': 'bg-purple-200',
      'fuchsia-200': 'bg-fuchsia-200',
      'pink-200': 'bg-pink-200',
      'rose-200': 'bg-rose-200'
    };
    return colorMap[color] || 'bg-gray-200';
  };

  const renderRoomContent = (room: RoomType) => {
    // Filter tasks and habits for this room
    const roomTasks = homeTasks.filter(task => task.roomId === room.id);
    const roomHabits = homeHabits.filter(habit => habit.roomId === room.id);

    // Group tasks and habits by group
    const groupedTasks: Record<string, typeof roomTasks> = {};
    const groupedHabits: Record<string, typeof roomHabits> = {};
    
    roomTasks.forEach(task => {
      const groupKey = task.groupId || 'ungrouped';
      if (!groupedTasks[groupKey]) groupedTasks[groupKey] = [];
      groupedTasks[groupKey].push(task);
    });

    roomHabits.forEach(habit => {
      const groupKey = habit.groupId || 'ungrouped';
      if (!groupedHabits[groupKey]) groupedHabits[groupKey] = [];
      groupedHabits[groupKey].push(habit);
    });

    // Sort tasks within groups by due date
    Object.keys(groupedTasks).forEach(groupKey => {
      groupedTasks[groupKey].sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
    });

    const hasContent = roomTasks.length > 0 || roomHabits.length > 0;

    return (
      <div className="space-y-4">

        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : hasContent ? (
          <div className="space-y-4">
            {/* Ungrouped items first */}
            {(groupedTasks.ungrouped || groupedHabits.ungrouped) && (
              <div>
                <div className="space-y-2">
                  {groupedHabits.ungrouped?.map((habit) => (
                    <HabitItem
                      key={habit.id}
                      habit={habit}
                      userId={user?.uid || ''}
                      showRoomTag={false}
                      onDelete={(habitId) => onItemDelete(habitId, 'habit', habit.title)}
                    />
                  ))}
                  {groupedTasks.ungrouped?.map((task) => {
                    const group = task.groupId ? groups.find(g => g.id === task.groupId) : null;
                    return (
                      <TaskItem
                        key={task.id}
                        task={task}
                        userId={user?.uid || ''}
                        groupName={group?.name}
                        showRoomTag={false}
                        onEdit={onTaskEdit}
                        onDelete={(taskId) => onItemDelete(taskId, 'task', task.title)}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grouped items */}
            {groups.map((group) => {
              const groupTasks = groupedTasks[group.id] || [];
              const groupHabits = groupedHabits[group.id] || [];
              
              if (groupTasks.length === 0 && groupHabits.length === 0) return null;

              return (
                <div key={group.id}>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">{group.name}</h4>
                  <div className="space-y-2">
                    {groupHabits.map((habit) => (
                      <HabitItem
                        key={habit.id}
                        habit={habit}
                        userId={user?.uid || ''}
                        showRoomTag={false}
                        onDelete={(habitId) => onItemDelete(habitId, 'habit', habit.title)}
                      />
                    ))}
                    {groupTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        userId={user?.uid || ''}
                        groupName={group.name}
                        showRoomTag={false}
                        onEdit={onTaskEdit}
                        onDelete={(taskId) => onItemDelete(taskId, 'task', task.title)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6">
            <CheckIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No tasks or habits in this room yet</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{home.name}</h2>
        {isOwner && (
          <button
            onClick={() => onAddRoom(home.id)}
            className="px-4 py-2 text-sm bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors"
          >
            <PlusIcon className="w-4 h-4 inline mr-2" />
            Add Room
          </button>
        )}
      </div>
      
      {rooms && rooms.length > 0 ? (
        <div className="space-y-6">
          {rooms.map((room) => (
            <div key={room.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getColorDotClass(room.color)}`}></div>
                  <h3 className="font-medium text-gray-900">{room.name}</h3>
                </div>
                {isOwner && (
                  <button
                    onClick={() => onDeleteRoom(room)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              {renderRoomContent(room)}
            </div>
          ))}
        </div>
      ) : isOwner ? (
        <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <HomeIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-4">No rooms in this home yet</p>
          <button
            onClick={() => onAddRoom(home.id)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Add your first room
          </button>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No rooms to display</p>
        </div>
      )}
    </div>
  );
}

export function ViewRooms(props: ViewRoomsProps) {
  const { user } = useAuth();
  const { homes, loading: homesLoading } = useHomes(user?.uid || '');
  const { invitations, loading: invitationsLoading } = useEnrichedUserInvitations(user?.email || '');

  // State for room management
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<RoomType | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedHome, setSelectedHome] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // State for task/habit management
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showHabitModal, setShowHabitModal] = useState(false);
  const [showItemDeleteModal, setShowItemDeleteModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomType | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{id: string, type: 'task' | 'habit', title: string} | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<TaskType | null>(null);

  // Available colors
  const allColors = [
    'red-200', 'orange-200', 'amber-200', 'yellow-200', 'lime-200', 'green-200',
    'emerald-200', 'teal-200', 'cyan-200', 'sky-200', 'blue-200', 'indigo-200',
    'violet-200', 'purple-200', 'fuchsia-200', 'pink-200', 'rose-200'
  ];

  // We'll use a local state to track rooms for the selected home
  const [modalRooms, setModalRooms] = useState<RoomType[]>([]);

  const getUsedColors = (homeId: string): string[] => {
    return modalRooms
      .filter(room => room.homeId === homeId)
      .map(room => room.color);
  };

  const getAvailableColor = (homeId: string): string => {
    const usedColors = getUsedColors(homeId);
    const availableColors = allColors.filter(color => !usedColors.includes(color));
    return availableColors.length > 0 ? availableColors[0] : allColors[0];
  };

  const handleOpenAddModal = async (homeId: string) => {
    setSelectedHome(homeId);
    
    // Fetch rooms for this home to determine used colors
    try {
      const existingRooms = await roomService.getByHome(homeId);
      setModalRooms(existingRooms);
      
      // Set default color to first available unused color
      const usedColors = existingRooms.map(room => room.color);
      const availableColors = allColors.filter(color => !usedColors.includes(color));
      setSelectedColor(availableColors.length > 0 ? availableColors[0] : allColors[0]);
    } catch (error) {
      console.error('Error fetching existing rooms:', error);
      setSelectedColor(allColors[0]);
    }
    
    setShowAddModal(true);
  };

  const handleOpenDeleteModal = (room: RoomType) => {
    setRoomToDelete(room);
    setShowDeleteModal(true);
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim() || !selectedHome || !selectedColor) return;
    
    const home = homes.find(h => h.id === selectedHome);
    if (!home) return;
    
    setIsLoading(true);
    try {
      await roomService.createWithColor(selectedHome, newRoomName.trim(), selectedColor);
      setNewRoomName('');
      setSelectedColor('');
      setShowAddModal(false);
      setSelectedHome('');
    } catch (error) {
      console.error('Error creating room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!roomToDelete) return;
    
    setIsLoading(true);
    try {
      await roomService.delete(roomToDelete.id);
      setShowDeleteModal(false);
      setRoomToDelete(null);
    } catch (error) {
      console.error('Error deleting room:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskCreate = (room: RoomType) => {
    setSelectedRoom(room);
    setShowTaskModal(true);
  };

  const handleHabitCreate = (room: RoomType) => {
    setSelectedRoom(room);
    setShowHabitModal(true);
  };

  const handleItemDeleteClick = (id: string, type: 'task' | 'habit', title: string) => {
    setItemToDelete({ id, type, title });
    setShowItemDeleteModal(true);
  };

  const handleConfirmItemDelete = async () => {
    if (!itemToDelete || isDeletingItem) return;

    setIsDeletingItem(true);
    try {
      if (itemToDelete.type === 'task') {
        await taskService.delete(itemToDelete.id);
      } else {
        await habitService.delete(itemToDelete.id);
      }
      setShowItemDeleteModal(false);
      setItemToDelete(null);
    } catch (error) {
      console.error(`Error deleting ${itemToDelete.type}:`, error);
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleTaskEdit = (task: TaskType) => {
    setTaskToEdit(task);
    setSelectedRoom(null);
    setShowTaskModal(true);
  };

  if (homesLoading || invitationsLoading) {
    return <Loader />;
  }

  // Show empty state if user has no homes
  if (homes.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 pb-20">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Rooms</h1>
            
            {/* Empty state */}
            <div className="text-center py-12">
              <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No homes yet</h3>
              <p className="text-gray-600 mb-6">Create your first home to start organizing rooms and tasks.</p>
              
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

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Rooms</h1>
          
          {homes.length === 0 ? (
            // Empty state when no rooms exist
            <div className="text-center py-12">
              <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms yet</h3>
              <p className="text-gray-600 mb-6">Create your first room to start organizing tasks by space.</p>
              
              {/* Show "Add Room" button for owners */}
              {homes.some(home => home.createdBy === user?.uid) && (
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  <PlusIcon className="w-5 h-5 inline mr-2" />
                  Create Your First Room
                </button>
              )}
            </div>
          ) : (
            // Show rooms organized by home
            <div className="space-y-8">
              {homes.map((home) => (
                <HomeRoomsDisplay
                  key={home.id}
                  home={home}
                  user={user}
                  onAddRoom={handleOpenAddModal}
                  onDeleteRoom={handleOpenDeleteModal}
                  onTaskCreate={handleTaskCreate}
                  onHabitCreate={handleHabitCreate}
                  onTaskEdit={handleTaskEdit}
                  onItemDelete={handleItemDeleteClick}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Room Modal */}
      <Modal 
        isOpen={showAddModal} 
        onClose={() => {
          setShowAddModal(false);
          setNewRoomName('');
          setSelectedHome('');
          setSelectedColor('');
          setModalRooms([]);
        }}
        title="Create New Room"
        size="sm"
      >
        <div className="space-y-4">
          {/* Home Selection (if not pre-selected) */}
          {!selectedHome && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Home
              </label>
              <select
                value={selectedHome}
                onChange={(e) => setSelectedHome(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Choose a home...</option>
                {homes
                  .filter(home => home.createdBy === user?.uid)
                  .map(home => (
                    <option key={home.id} value={home.id}>{home.name}</option>
                  ))
                }
              </select>
            </div>
          )}
          
          <Input
            label="Room Name"
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="e.g., Kitchen, Living Room, Bedroom"
            disabled={isLoading}
            fullWidth
          />

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Room Color
            </label>
            <div className="grid grid-cols-6 gap-2">
              {allColors.map((color) => {
                const usedColors = getUsedColors(selectedHome);
                const isUsed = usedColors.includes(color);
                
                const getColorClasses = () => {
                  const colorMap: Record<string, string> = {
                    'red-200': 'bg-red-200 border-red-300',
                    'orange-200': 'bg-orange-200 border-orange-300',
                    'amber-200': 'bg-amber-200 border-amber-300',
                    'yellow-200': 'bg-yellow-200 border-yellow-300',
                    'lime-200': 'bg-lime-200 border-lime-300',
                    'green-200': 'bg-green-200 border-green-300',
                    'emerald-200': 'bg-emerald-200 border-emerald-300',
                    'teal-200': 'bg-teal-200 border-teal-300',
                    'cyan-200': 'bg-cyan-200 border-cyan-300',
                    'sky-200': 'bg-sky-200 border-sky-300',
                    'blue-200': 'bg-blue-200 border-blue-300',
                    'indigo-200': 'bg-indigo-200 border-indigo-300',
                    'violet-200': 'bg-violet-200 border-violet-300',
                    'purple-200': 'bg-purple-200 border-purple-300',
                    'fuchsia-200': 'bg-fuchsia-200 border-fuchsia-300',
                    'pink-200': 'bg-pink-200 border-pink-300',
                    'rose-200': 'bg-rose-200 border-rose-300'
                  };
                  return colorMap[color] || 'bg-gray-200 border-gray-300';
                };

                return (
                  <div key={color} className="relative">
                    <button
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      disabled={isLoading}
                      className={`
                        w-8 h-8 rounded-full border-2 transition-all relative
                        ${getColorClasses()}
                        ${selectedColor === color ? 'ring-2 ring-blue-500 ring-offset-2' : 'hover:scale-110'}
                        ${isUsed ? 'opacity-60' : ''}
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      title={`${color.replace('-200', '')}${isUsed ? ' (already used)' : ''}`}
                    >
                      {isUsed && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Colors with dots are already used in this home
            </p>
          </div>
          
          <div className="flex space-x-3 justify-end">
            <button
              onClick={() => {
                setShowAddModal(false);
                setNewRoomName('');
                setSelectedHome('');
                setSelectedColor('');
                setModalRooms([]);
              }}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddRoom}
              disabled={isLoading || !newRoomName.trim() || !selectedHome || !selectedColor}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Room'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Task Creation/Edit Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => {
          setShowTaskModal(false);
          setSelectedRoom(null);
          setTaskToEdit(null);
        }}
        title={taskToEdit ? "Edit Task" : "Create New Task"}
        size="md"
      >
        {(selectedRoom || taskToEdit) && (
          <TaskForm
            homeId={(selectedRoom?.homeId || taskToEdit?.homeId) || ''}
            userId={user?.uid || ''}
            rooms={selectedRoom ? [selectedRoom] : rooms}
            task={taskToEdit || undefined}
            onSave={() => {
              setShowTaskModal(false);
              setSelectedRoom(null);
              setTaskToEdit(null);
            }}
            onCancel={() => {
              setShowTaskModal(false);
              setSelectedRoom(null);
              setTaskToEdit(null);
            }}
          />
        )}
      </Modal>

      {/* Habit Creation Modal */}
      <Modal
        isOpen={showHabitModal}
        onClose={() => {
          setShowHabitModal(false);
          setSelectedRoom(null);
        }}
        title="Create New Habit"
        size="md"
      >
        {selectedRoom && (
          <HabitForm
            homeId={selectedRoom.homeId}
            userId={user?.uid || ''}
            rooms={[selectedRoom]}
            onSave={() => {
              setShowHabitModal(false);
              setSelectedRoom(null);
            }}
            onCancel={() => {
              setShowHabitModal(false);
              setSelectedRoom(null);
            }}
          />
        )}
      </Modal>

      {/* Delete Room Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteRoom}
        title="Delete Room"
        message={`Are you sure you want to delete "${roomToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isLoading}
      />

      {/* Delete Task/Habit Confirmation Modal */}
      <ConfirmModal
        isOpen={showItemDeleteModal}
        onClose={() => setShowItemDeleteModal(false)}
        onConfirm={handleConfirmItemDelete}
        title={`Delete ${itemToDelete?.type}`}
        message={`Are you sure you want to delete "${itemToDelete?.title}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeletingItem}
      />

      {/* Floating Action Button */}
      {homes.length > 0 && (
        <FloatingActionButton
          onAddTask={() => setShowTaskModal(true)}
          onAddHabit={() => setShowHabitModal(true)}
        />
      )}

      <Navigation />
    </>
  );
}