import { useState } from 'react';
import { HabitType, RoomType } from '../../types/database';
import { habitService } from '../../lib/database';
import { useGroups } from '../../hooks/useDatabase';
import { Input } from '../Input';
import { GroupSelector } from '../GroupSelector';

export interface HabitFormProps {
  homeId: string;
  userId: string;
  rooms?: RoomType[];
  habit?: HabitType; // For editing
  onSave?: (habitId: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function HabitForm({
  homeId,
  userId,
  rooms = [],
  habit,
  onSave,
  onCancel,
  isLoading = false
}: HabitFormProps) {
  const { groups, loading: groupsLoading } = useGroups(homeId);
  
  // Form state
  const [title, setTitle] = useState(habit?.title || '');
  const [description, setDescription] = useState(habit?.description || '');
  const [roomId, setRoomId] = useState(habit?.roomId || '');
  const [groupId, setGroupId] = useState(habit?.groupId || '');
  
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      if (habit) {
        // Update existing habit
        const updateData: any = { title: title.trim() };
        if (description.trim()) updateData.description = description.trim();
        if (roomId) updateData.roomId = roomId;
        if (groupId) updateData.groupId = groupId;
        
        await habitService.update(habit.id, updateData);
        
        if (onSave) {
          onSave(habit.id);
        }
      } else {
        // Create new habit
        const options: any = {};
        if (description.trim()) options.description = description.trim();
        if (roomId) options.roomId = roomId;
        if (groupId) options.groupId = groupId;
        
        const habitId = await habitService.create(
          homeId,
          title.trim(),
          userId,
          options
        );
        
        if (onSave) {
          onSave(habitId);
        }
      }
    } catch (error) {
      console.error('Error saving habit:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const isFormValid = title.trim().length > 0;

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900 dark:to-indigo-900 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-purple-900 dark:text-purple-100">
          {habit ? 'Edit Habit' : 'Create New Habit'}
        </h3>
        <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
          Habits can be completed multiple times and track your progress over time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <Input
          label="Habit Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Drink 8 glasses of water, Take vitamins"
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
            placeholder="Add details about this habit..."
            disabled={isLoading || submitting}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
          />
        </div>

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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50"
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

        {/* Form Actions */}
        <div className="flex space-x-3 justify-end pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-transparent border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          
          <button
            type="submit"
            disabled={!isFormValid || isLoading || submitting}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:opacity-50"
          >
            {submitting ? 'Saving...' : habit ? 'Update Habit' : 'Create Habit'}
          </button>
        </div>
      </form>
    </div>
  );
}