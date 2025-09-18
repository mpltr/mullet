import { useState } from 'react';
import { TrashIcon, CheckIcon, PencilIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { HabitType, HabitCompletionType } from '../../types/database';
import { habitService } from '../../lib/database';
import { useLastHabitCompletion, useRooms } from '../../hooks/useDatabase';
import { useUser } from '../../contexts/UserContext';
import { Modal } from '../Modal';
import { HabitForm } from '../HabitForm';

export interface HabitItemProps {
  habit: HabitType;
  userId: string;
  roomName?: string;
  groupName?: string;
  onDelete?: (habitId: string) => void;
  showRoomTag?: boolean;
}

export function HabitItem({ 
  habit, 
  userId, 
  roomName, 
  groupName, 
  onDelete,
  showRoomTag = false 
}: HabitItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { lastCompletion, loading: completionLoading } = useLastHabitCompletion(habit.id, habit.homeId);
  const lastCompletedByUser = useUser(lastCompletion?.completedBy || null);
  const { rooms } = useRooms(habit.homeId);
  
  const canDelete = habit.createdBy === userId;
  
  const handleComplete = async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    try {
      await habitService.complete(habit.id, userId);
    } catch (error) {
      console.error('Error completing habit:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && canDelete) {
      onDelete(habit.id);
    }
  };

  const handleEdit = () => {
    setShowEditModal(true);
  };

  const formatLastCompletion = (completion: HabitCompletionType) => {
    const now = new Date();
    const completionDate = new Date(completion.completedAt);
    const today = new Date().setHours(0, 0, 0, 0);
    const completionDay = new Date(completion.completedAt).setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today - completionDay) / (1000 * 60 * 60 * 24));
    
    let timeText;
    if (diffDays === 0) {
      timeText = 'Today';
    } else if (diffDays === 1) {
      timeText = 'Yesterday';
    } else {
      timeText = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    
    const userName = lastCompletedByUser?.name || lastCompletedByUser?.email || completion.completedBy;
    return `${timeText} by ${userName}`;
  };

  return (
    <>
    <div className="group rounded-lg border bg-gradient-to-r from-purple-100 to-indigo-100 dark:from-purple-900 dark:to-indigo-900 border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 transition-all">
      {/* Collapsed View - Always Visible */}
      <div 
        className="flex items-center space-x-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Complete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleComplete();
          }}
          disabled={isCompleting}
          className={`
            flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-all
            ${isCompleting
              ? 'bg-gray-300 text-gray-500 dark:text-gray-400 cursor-wait'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
            }
          `}
        >
          {isCompleting ? (
            'Adding...'
          ) : (
            <span className="flex items-center space-x-1">
              <CheckIcon className="w-3 h-3" />
              <span>Done</span>
            </span>
          )}
        </button>

        {/* Title and Completion Status */}
        <div className="flex-grow min-w-0">
          <h3 className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {habit.title}
          </h3>
          
          {/* Last Completion - Always Visible */}
          <div className="mt-1">
            {!completionLoading && lastCompletion && (
              <div className="text-xs text-purple-800 dark:text-purple-200 bg-purple-200 dark:bg-purple-800 px-2 py-1 rounded-md inline-block">
                Last: {formatLastCompletion(lastCompletion)}
              </div>
            )}
            
            {!completionLoading && !lastCompletion && (
              <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md inline-block">
                Never completed
              </div>
            )}
            
            {completionLoading && (
              <span className="text-xs text-gray-400">
                Loading...
              </span>
            )}
          </div>
        </div>

        {/* Tags - Always Visible */}
        <div className="flex flex-col space-y-1 items-end">
          {/* Group Tag */}
          {groupName && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:text-purple-200 rounded-md">
              {groupName}
            </span>
          )}
          
          {/* Room Tag */}
          {showRoomTag && roomName && (
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
              {roomName}
            </span>
          )}
        </div>

        {/* Expand/Collapse Indicator */}
        <div className="flex-shrink-0 p-1 text-gray-400">
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronRightIcon className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* Expanded View - Only Visible When Expanded */}
      {isExpanded && (
        <div className="px-3 pb-3">
          <div className="flex items-end justify-between ml-8">
            {/* Description */}
            <div className="flex-grow min-w-0">
              {habit.description && (
                <p className="text-xs text-gray-600">
                  {habit.description}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 ml-4 mr-8">
              {/* Edit Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                className="p-1 text-gray-400 hover:text-purple-600 transition-all"
                title="Edit habit"
              >
                <PencilIcon className="w-4 h-4" />
                <span className="sr-only">Edit</span>
              </button>
              
              {/* Delete Button */}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-1 text-gray-400 hover:text-red-600 transition-all"
                  title="Delete habit"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span className="sr-only">Delete</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    
    {/* Edit Modal */}
    <Modal
      isOpen={showEditModal}
      onClose={() => setShowEditModal(false)}
      title="Edit Habit"
      size="md"
    >
      <HabitForm
        homeId={habit.homeId}
        userId={userId}
        rooms={rooms}
        habit={habit}
        onSave={() => setShowEditModal(false)}
        onCancel={() => setShowEditModal(false)}
      />
    </Modal>
  </>
  );
}