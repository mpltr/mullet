import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { GroupType } from '../../types/database';
import { groupService } from '../../lib/database';

export interface GroupSelectorProps {
  homeId: string;
  userId: string;
  groups: GroupType[];
  selectedGroupId: string;
  onGroupSelect: (groupId: string) => void;
  disabled?: boolean;
}

export function GroupSelector({
  homeId,
  userId,
  groups,
  selectedGroupId,
  onGroupSelect,
  disabled = false
}: GroupSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedGroup = groups.find(g => g.id === selectedGroupId);
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!searchTerm.trim() || creatingGroup) return;

    setCreatingGroup(true);
    try {
      const groupId = await groupService.create(homeId, searchTerm.trim(), userId);
      onGroupSelect(groupId);
      setSearchTerm('');
      setIsOpen(false);
    } catch (error) {
      console.error('Error creating group:', error);
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = async (groupId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (deletingGroup) return;

    setDeletingGroup(groupId);
    try {
      await groupService.delete(groupId);
      if (selectedGroupId === groupId) {
        onGroupSelect(''); // Clear selection
      }
    } catch (error) {
      console.error('Error deleting group:', error);
    } finally {
      setDeletingGroup(null);
    }
  };

  const handleGroupSelect = (groupId: string) => {
    onGroupSelect(groupId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="text-sm">
          {selectedGroup ? selectedGroup.name : 'Select group (optional)'}
        </span>
        <ChevronDownIcon className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Content */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <div className="relative">
              <input
                type="text"
                placeholder="Search or create group..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchTerm.trim() && !filteredGroups.find(g => g.name.toLowerCase() === searchTerm.toLowerCase())) {
                      handleCreateGroup();
                    }
                  }
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    setSearchTerm('');
                  }
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {/* Ungrouped Option */}
            <button
              type="button"
              onClick={() => handleGroupSelect('')}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                selectedGroupId === '' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <span>No group</span>
              {selectedGroupId === '' && <div className="w-2 h-2 bg-blue-600 rounded-full" />}
            </button>

            {/* Existing Groups */}
            {filteredGroups.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => handleGroupSelect(group.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between group ${
                  selectedGroupId === group.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <span>{group.name}</span>
                <div className="flex items-center space-x-2">
                  {selectedGroupId === group.id && (
                    <div className="w-2 h-2 bg-blue-600 rounded-full" />
                  )}
                  <button
                    onClick={(e) => handleDeleteGroup(group.id, e)}
                    disabled={deletingGroup === group.id}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1"
                    title="Delete group"
                  >
                    {deletingGroup === group.id ? (
                      <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <XMarkIcon className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </button>
            ))}

            {/* Create New Group Option */}
            {searchTerm && !filteredGroups.find(g => g.name.toLowerCase() === searchTerm.toLowerCase()) && (
              <button
                type="button"
                onClick={handleCreateGroup}
                disabled={creatingGroup}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center text-green-700 border-t border-gray-100"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                <span>
                  {creatingGroup ? 'Creating...' : `Create "${searchTerm}"`}
                </span>
              </button>
            )}

            {/* Empty State */}
            {filteredGroups.length === 0 && !searchTerm && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No groups created yet
              </div>
            )}

            {/* No Results */}
            {filteredGroups.length === 0 && searchTerm && !searchTerm.trim() && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">
                No groups match your search
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}