import { useState, useEffect } from 'react';
import { TaskType, GroupType, RoomType } from '../../types/database';
import { taskService } from '../../lib/database';
import { useGroups } from '../../hooks/useDatabase';
import { Input } from '../Input';
import { GroupSelector } from '../GroupSelector';

export interface TaskFormProps {
  homeId: string;
  userId: string;
  rooms?: RoomType[];
  task?: TaskType; // For editing
  onSave?: (taskId: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function TaskForm({
  homeId,
  userId,
  rooms = [],
  task,
  onSave,
  onCancel,
  isLoading = false
}: TaskFormProps) {
  const { groups, loading: groupsLoading } = useGroups(homeId);
  
  // Form state
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [roomId, setRoomId] = useState(task?.roomId || '');
  const [groupId, setGroupId] = useState(task?.groupId || '');
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? task.dueDate.toISOString().split('T')[0] : ''
  );
  const [recurrenceDays, setRecurrenceDays] = useState(task?.recurrenceDays?.toString() || '');
  const [assignedTo, setAssignedTo] = useState(task?.assignedTo || '');
  
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      if (task) {
        // Update existing task
        await taskService.update(task.id, {
          title: title.trim(),
          description: description.trim(),
          roomId: roomId,
          groupId: groupId,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          recurrenceDays: recurrenceDays ? parseInt(recurrenceDays) : undefined,
          assignedTo: assignedTo
        });
        
        if (onSave) {
          onSave(task.id);
        }
      } else {
        // Create new task
        const options: any = {};
        if (description.trim()) options.description = description.trim();
        if (roomId) options.roomId = roomId;
        if (groupId) options.groupId = groupId;
        if (dueDate) options.dueDate = new Date(dueDate);
        if (recurrenceDays) options.recurrenceDays = parseInt(recurrenceDays);
        if (assignedTo) options.assignedTo = assignedTo;
        
        const taskId = await taskService.create(
          homeId,
          title.trim(),
          userId,
          options
        );
        
        if (onSave) {
          onSave(taskId);
        }
      }
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSubmitting(false);
    }
  };


  const isFormValid = title.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <Input
        label="Task Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to be done?"
        required
        disabled={isLoading || submitting}
        fullWidth
      />

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add more details..."
          disabled={isLoading || submitting}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
        />
      </div>

      {/* Room Selection */}
      {rooms.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Room
          </label>
          <select
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            disabled={isLoading || submitting}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 disabled:opacity-50"
          >
            <option value="">No specific room</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Group Selection */}
      {!groupsLoading && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Group
          </label>
          <GroupSelector
            homeId={homeId}
            userId={userId}
            groups={groups}
            selectedGroupId={groupId}
            onGroupSelect={setGroupId}
            disabled={isLoading || submitting}
          />
        </div>
      )}

      {/* Due Date */}
      <Input
        label="Due Date"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        disabled={isLoading || submitting}
        fullWidth
      />

      {/* Recurrence */}
      <Input
        label="Repeat Every (Days)"
        type="number"
        value={recurrenceDays}
        onChange={(e) => setRecurrenceDays(e.target.value)}
        placeholder="e.g., 7 for weekly"
        min="1"
        disabled={isLoading || submitting || !dueDate}
        fullWidth
        helpText={!dueDate ? "Set a due date to enable recurrence" : undefined}
      />

      {/* Form Actions */}
      <div className="flex space-x-3 justify-end pt-4">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        
        <button
          type="submit"
          disabled={!isFormValid || isLoading || submitting}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? 'Saving...' : task ? 'Update Task' : 'Create Task'}
        </button>
      </div>
    </form>
  );
}