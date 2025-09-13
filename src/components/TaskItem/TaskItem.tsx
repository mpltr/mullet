import { useState } from 'react';
import { CheckIcon, TrashIcon, ClockIcon, ArrowPathIcon, PencilIcon } from '@heroicons/react/24/outline';
import { CheckIcon as CheckIconSolid } from '@heroicons/react/24/solid';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { TaskType } from '../../types/database';
import { taskService } from '../../lib/database';

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
  
  const isCompleted = task.status === 'completed';
  const canDelete = task.createdBy === userId;
  
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

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !isCompleted;

  return (
    <div className={`
      group flex items-center space-x-3 p-3 rounded-lg border transition-all
      ${isCompleted 
        ? 'bg-gray-50 border-gray-200' 
        : 'bg-white border-gray-300 hover:border-gray-400'
      }
      ${isOverdue ? 'border-red-300 bg-red-50' : ''}
    `}>
      {/* Checkbox */}
      <button
        onClick={handleToggleComplete}
        disabled={isUpdating}
        className={`
          flex-shrink-0 w-5 h-5 rounded border-2 transition-all
          ${isCompleted
            ? 'bg-green-500 border-green-500 text-white'
            : 'border-gray-300 hover:border-gray-400'
          }
          ${isUpdating ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
          ${isOverdue && !isCompleted ? 'border-red-400' : ''}
        `}
      >
        {isCompleted && (
          <CheckIconSolid className="w-3 h-3" />
        )}
      </button>

      {/* Task Content */}
      <div className="flex-grow min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-grow min-w-0">
            {/* Title */}
            <h3 className={`
              font-medium text-sm
              ${isCompleted 
                ? 'text-gray-500 line-through' 
                : isOverdue 
                  ? 'text-red-900' 
                  : 'text-gray-900'
              }
            `}>
              {task.title}
            </h3>
            
            {/* Description */}
            {task.description && (
              <p className={`
                text-xs mt-1
                ${isCompleted ? 'text-gray-400' : 'text-gray-600'}
              `}>
                {task.description}
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
              
              {/* Group Tag */}
              {groupName && (
                <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-md">
                  {groupName}
                </span>
              )}
              
              {/* Orphaned Group Indicator */}
              {task.groupId && !groupName && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md">
                  Ungrouped
                </span>
              )}
              
              {/* Due Date or Next Scheduled */}
              {task.dueDate && (
                <span className={`
                  flex items-center space-x-1 text-xs
                  ${isOverdue && !isCompleted 
                    ? 'text-red-600' 
                    : isCompleted 
                      ? 'text-gray-400' 
                      : 'text-gray-500'
                  }
                `}>
                  <ClockIcon className="w-3 h-3" />
                  <span>
                    {isCompleted && task.recurrenceDays 
                      ? `Next scheduled: ${formatDueDate(task.dueDate)}`
                      : formatDueDate(task.dueDate)
                    }
                  </span>
                </span>
              )}
              
              {/* Recurrence Indicator */}
              {task.recurrenceDays && isCompleted && (
                <span className="flex items-center space-x-1 text-xs text-gray-400">
                  <ArrowPathIcon className="w-3 h-3" />
                  <span>Every {task.recurrenceDays} day{task.recurrenceDays !== 1 ? 's' : ''}</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-1">
            {/* Edit Button */}
            {onEdit && (
              <button
                onClick={() => onEdit(task)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-all"
                title="Edit task"
              >
                <PencilIcon className="w-4 h-4" />
                <span className="sr-only">Edit</span>
              </button>
            )}
            
            {/* Delete Button */}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="p-1 text-gray-400 hover:text-red-600 transition-all"
                title="Delete task"
              >
                <TrashIcon className="w-4 h-4" />
                <span className="sr-only">Delete</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}