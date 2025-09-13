import { useState } from 'react';
import { TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import { HabitType, HabitCompletionType } from '../../types/database';
import { habitService } from '../../lib/database';
import { useLastHabitCompletion } from '../../hooks/useDatabase';

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
  const { lastCompletion, loading: completionLoading } = useLastHabitCompletion(habit.id);
  
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

  const formatLastCompletion = (completion: HabitCompletionType) => {
    const now = new Date();
    const completionDate = new Date(completion.completedAt);
    const diffHours = Math.floor((now.getTime() - completionDate.getTime()) / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    let timeText;
    if (diffHours < 1) {
      timeText = 'Just now';
    } else if (diffHours < 24) {
      timeText = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      timeText = 'Yesterday';
    } else if (diffDays < 7) {
      timeText = `${diffDays} days ago`;
    } else {
      timeText = completionDate.toLocaleDateString();
    }
    
    return timeText;
  };

  return (
    <div className="group flex items-center space-x-3 p-3 rounded-lg border bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200 hover:border-purple-300 transition-all">
      {/* Complete Button */}
      <button
        onClick={handleComplete}
        disabled={isCompleting}
        className={`
          flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-all
          ${isCompleting
            ? 'bg-gray-300 text-gray-500 cursor-wait'
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

      {/* Habit Content */}
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-grow min-w-0">
            {/* Title */}
            <h3 className="font-medium text-sm text-gray-900">
              {habit.title}
            </h3>
            
            {/* Description */}
            {habit.description && (
              <p className="text-xs text-gray-600 mt-1">
                {habit.description}
              </p>
            )}
            
            {/* Meta Info */}
            <div className="flex items-center space-x-2 mt-2">
              {/* Room Tag */}
              {showRoomTag && roomName && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-md">
                  {roomName}
                </span>
              )}
              
              {/* Last Completion */}
              {!completionLoading && lastCompletion && (
                <span className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded-md">
                  Last: {formatLastCompletion(lastCompletion)}
                </span>
              )}
              
              {/* Never completed indicator */}
              {!completionLoading && !lastCompletion && (
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  Never completed
                </span>
              )}
              
              {/* Loading state */}
              {completionLoading && (
                <span className="text-xs text-gray-400">
                  Loading...
                </span>
              )}
            </div>
          </div>
          
          {/* Delete Button */}
          {canDelete && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 transition-all"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}