"use client";
import { useTheme } from "../contexts/ThemeContext";
import { useEffect, useState } from "react";
import { SunIcon, MoonIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</h3>
        <div className="flex space-x-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 p-3 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse h-16" />
          ))}
        </div>
      </div>
    );
  }

  const themes = [
    { 
      value: 'light', 
      icon: SunIcon, 
      label: 'Light',
      description: 'Light theme'
    },
    { 
      value: 'dark', 
      icon: MoonIcon, 
      label: 'Dark',
      description: 'Dark theme'
    },
    { 
      value: 'system', 
      icon: ComputerDesktopIcon, 
      label: 'System',
      description: 'Follow device setting'
    },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</h3>
      <div className="flex space-x-4">
        {themes.map((themeOption) => {
          const Icon = themeOption.icon;
          const isSelected = theme === themeOption.value;
          
          return (
            <label
              key={themeOption.value}
              className={`flex-1 relative cursor-pointer rounded-lg p-3 border transition-all ${
                isSelected 
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-950' 
                  : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={themeOption.value}
                checked={isSelected}
                onChange={(e) => setTheme(e.target.value)}
                className="sr-only"
              />
              <div className="flex flex-col items-center text-center">
                <Icon className={`w-6 h-6 mb-2 ${
                  isSelected 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  isSelected 
                    ? 'text-blue-600 dark:text-blue-400' 
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {themeOption.label}
                </span>
                <span className={`text-xs mt-1 ${
                  isSelected 
                    ? 'text-blue-500 dark:text-blue-300' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {themeOption.description}
                </span>
              </div>
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></div>
                </div>
              )}
            </label>
          );
        })}
      </div>
    </div>
  );
}