import { useState } from 'react';
import { CheckIcon, TrashIcon, ClockIcon, ArrowPathIcon, PencilIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TaskType } from '../../types/database';
import { taskService } from '../../lib/database';
import { useUser } from '../../contexts/UserContext';

dayjs.extend(relativeTime);

export interface TaskItemProps {
  task: TaskType;
  userId: string;
  roomName?: string;
  groupName?: string;
  onDelete?: (taskId: string) => void;
  onEdit?: (task: TaskType) => void;
  showRoomTag?: boolean;
}

export function TaskItem({ 
  task, 
  userId, 
  roomName, 
  groupName, 
  onDelete,
  onEdit, 
  showRoomTag = false 
}: TaskItemProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isCompleted = task.status === 'completed';
  const canDelete = task.createdBy === userId;
  
  // Get the user who last completed the task
  const lastCompletedByUser = useUser(task.lastCompletedBy || null);
  
  const handleToggleComplete = async () => {
    if (isUpdating) return;
    
    setIsUpdating(true);
    try {
      const newStatus = isCompleted ? 'pending' : 'completed';
      await taskService.updateStatus(task.id, newStatus, userId);
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = () => {
    if (onDelete && canDelete) {
      onDelete(task.id);
    }
  };

  const formatDueDate = (date: Date) => {
    const dueDate = dayjs(date);
    const today = dayjs().startOf('day');
    const dueDateStart = dueDate.startOf('day');
    
    const diffDays = dueDateStart.diff(today, 'day');
    
    if (diffDays === 0) return 'Due Today';
    if (diffDays === 1) return 'Due Tomorrow';
    if (diffDays === -1) return 'Due Yesterday';
    if (diffDays < -1) return `Due ${Math.abs(diffDays)} days ago`;
    if (diffDays > 1) return `Due in ${diffDays} days`;
    
    return `Due ${dueDate.format('MMM D')}`;
  };

  const formatNextScheduled = (date: Date) => {
    const dueDate = dayjs(date);
    const today = dayjs().startOf('day');
    const dueDateStart = dueDate.startOf('day');
    
    const diffDays = dueDateStart.diff(today, 'day');
    
    if (diffDays === 0) return 'Next scheduled today';
    if (diffDays === 1) return 'Next scheduled tomorrow';
    if (diffDays === -1) return 'Next scheduled yesterday';
    if (diffDays < -1) return `Next scheduled ${Math.abs(diffDays)} days ago`;
    if (diffDays > 1) return `Next scheduled in ${diffDays} days`;
    
    return `Next scheduled ${dueDate.format('MMM D')}`;
  };

  const getCompletionText = () => {
    if (!isCompleted || !task.lastCompletedBy) {
      return null;
    }

    // Use user name if available, otherwise show user ID briefly while loading
    const userName = lastCompletedByUser?.name || lastCompletedByUser?.email || task.lastCompletedBy;
    
    if (task.recurrenceDays && task.lastCompletedAt) {
      // For recurring tasks, show "Last completed by [Name] on [Date]"
      const completedDate = dayjs(task.lastCompletedAt).format('MMM D');
      return `Last completed by ${userName} on ${completedDate}`;
    } else {
      // For non-recurring tasks, show "Completed by [Name]"
      return `Completed by ${userName}`;
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

  return (
    <div className={`
      group rounded-lg border transition-all
      ${isCompleted 
        ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700' 
        : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 dark:hover:border-gray-500'
      }
      ${isOverdue ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-950' : ''}
    `}>
      {/* Collapsed View - Always Visible */}
      <div 
        className="flex items-center space-x-3 p-3 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggleComplete();
          }}
          disabled={isUpdating}
          className={`
            flex-shrink-0 w-5 h-5 rounded border-2 transition-all
            ${isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
            ${isOverdue && !isCompleted ? 'border-red-400' : ''}
          `}
        >
          {isCompleted && (
            <CheckIconSolid className="w-3 h-3" />
          )}
        </button>

        {/* Title and Due Date */}
        <div className="flex-grow min-w-0">
          <h3 className={`
            font-medium text-sm
            ${isCompleted 
              ? 'text-gray-500 dark:text-gray-400 dark:text-gray-500 line-through' 
              : isOverdue 
                ? 'text-red-900' 
                : 'text-gray-900 dark:text-gray-100'
            }
          `}>
            {task.title}
          </h3>
          
          {/* Due Date - Always Visible */}
          {task.dueDate && (
            <div className={`
              flex items-center space-x-1 text-xs mt-1
              ${isOverdue && !isCompleted 
                ? 'text-red-600' 
                : isCompleted 
                  ? 'text-gray-400 dark:text-gray-500' 
                  : 'text-gray-500 dark:text-gray-400 dark:text-gray-500'
              }
            `}>
              <ClockIcon className="w-3 h-3" />
              <span>
                {isCompleted && task.recurrenceDays 
                  ? formatNextScheduled(task.dueDate)
                  : formatDueDate(task.dueDate)
                }
              </span>
            </div>
          )}
        </div>

        {/* Tags - Always Visible */}
        <div className="flex flex-col space-y-1 items-end">
          {/* Group Tag */}
          {groupName && (
            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-md">
              {groupName}
            </span>
          )}
          
          {/* Orphaned Group Indicator */}
          {task.groupId && !groupName && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 dark:text-gray-400 dark:text-gray-500 rounded-md">
              Ungrouped
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
        <div className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500">
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
            {/* Description and Completion Info */}
            <div className="flex-grow min-w-0">
              {/* Description */}
              {task.description && (
                <p className={`
                  text-xs
                  ${isCompleted ? 'text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400 dark:text-gray-500'}
                `}>
                  {task.description}
                </p>
              )}
              
              {/* Completion Info */}
              {getCompletionText() && (
                <span className="text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  {getCompletionText()}
                </span>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-1 ml-4 mr-8">
              {/* Edit Button */}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-blue-600 transition-all"
                  title="Edit task"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span className="sr-only">Edit</span>
                </button>
              )}
              
              {/* Delete Button */}
              {canDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 transition-all"
                  title="Delete task"
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
  );
}