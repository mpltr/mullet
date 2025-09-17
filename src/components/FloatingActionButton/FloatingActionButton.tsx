import { useState, useEffect, useRef } from 'react';
import { PlusIcon, XMarkIcon, ListBulletIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export interface FloatingActionButtonProps {
  onAddTask: () => void;
  onAddHabit: () => void;
}

export function FloatingActionButton({ onAddTask, onAddHabit }: FloatingActionButtonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isExpanded && menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExpanded]);

  const handleAddTask = () => {
    setIsExpanded(false);
    onAddTask();
  };

  const handleAddHabit = () => {
    setIsExpanded(false);
    onAddHabit();
  };

  return (
    <div ref={menuRef} className="fixed bottom-24 right-6 z-30">
      {/* Menu Items - Appear above main button when expanded */}
      <div className={`
        absolute bottom-20 right-0 flex flex-col space-y-3 transition-all duration-300 ease-in-out
        ${isExpanded 
          ? 'opacity-100 translate-y-0 pointer-events-auto' 
          : 'opacity-0 translate-y-4 pointer-events-none'
        }
      `}>
        {/* Add Habit Button */}
        <button
          onClick={handleAddHabit}
          className="flex items-center space-x-3 bg-purple-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-purple-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
        >
          <ArrowPathIcon className="w-5 h-5" />
          <span className="font-medium">Add Habit</span>
        </button>
        
        {/* Add Task Button */}
        <button
          onClick={handleAddTask}
          className="flex items-center space-x-3 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 whitespace-nowrap"
        >
          <ListBulletIcon className="w-5 h-5" />
          <span className="font-medium">Add Task</span>
        </button>
      </div>

      {/* Main FAB Button - Always visible, stays in place */}
      <button
        onClick={handleToggle}
        className={`
          w-14 h-14 rounded-lg shadow-lg transition-all duration-300 ease-in-out transform flex items-center justify-center text-white
          ${isExpanded 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-green-600 hover:bg-green-700 hover:scale-105'
          }
        `}
      >
        {isExpanded ? (
          <XMarkIcon className="w-6 h-6" />
        ) : (
          <PlusIcon className="w-6 h-6" />
        )}
      </button>
    </div>
  );
}