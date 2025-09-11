import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CogIcon, HomeIcon, BellIcon, QuestionMarkCircleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";
import { useHomes } from '../../hooks/useDatabase';

export interface ViewProfileProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewProfile(props: ViewProfileProps) {
  const { user, logout } = useAuth();
  const [homesExpanded, setHomesExpanded] = useState(false);
  const { homes, loading: homesLoading } = useHomes(user?.uid || '');

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Profile</h1>
          
          {/* User info */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xl font-semibold">
                  {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {user?.displayName || 'User'}
                </h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>
            </div>
          </div>
          
          {/* Menu items */}
          <div className="space-y-4">
            {/* Homes section - expandable */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button 
                onClick={() => setHomesExpanded(!homesExpanded)}
                className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors"
              >
                <HomeIcon className="w-6 h-6 text-gray-600" />
                <span className="flex-1 text-left font-medium text-gray-900">
                  Homes ({homes.length})
                </span>
                {homesExpanded ? (
                  <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronRightIcon className="w-5 h-5 text-gray-400" />
                )}
              </button>
              
              {/* Expandable content */}
              {homesExpanded && (
                <div className="px-4 pb-4">
                  <div className="border-t border-gray-100 pt-3">
                    {homesLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="text-sm text-gray-500">Loading homes...</div>
                      </div>
                    ) : homes.length === 0 ? (
                      <div className="text-center py-6">
                        <HomeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-sm text-gray-500 mb-3">
                          You're not part of any homes yet
                        </p>
                        <button className="text-blue-600 text-sm font-medium hover:text-blue-700">
                          Create your first home
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {homes.map((home) => (
                          <div 
                            key={home.id} 
                            className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                          >
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{home.name}</p>
                              <p className="text-xs text-gray-500">
                                {home.members.length} member{home.members.length !== 1 ? 's' : ''}
                              </p>
                            </div>
                            <div className="text-xs text-gray-400">
                              {home.createdBy === user?.uid ? 'Owner' : 'Member'}
                            </div>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-gray-100">
                          <button className="w-full text-blue-600 text-sm font-medium hover:text-blue-700 py-2">
                            + Add or join a home
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors">
                <BellIcon className="w-6 h-6 text-gray-600" />
                <span className="flex-1 text-left font-medium text-gray-900">Notifications</span>
                <span className="text-sm text-gray-500">Settings & preferences</span>
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors">
                <CogIcon className="w-6 h-6 text-gray-600" />
                <span className="flex-1 text-left font-medium text-gray-900">Settings</span>
                <span className="text-sm text-gray-500">App preferences</span>
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors">
                <QuestionMarkCircleIcon className="w-6 h-6 text-gray-600" />
                <span className="flex-1 text-left font-medium text-gray-900">Help & Support</span>
                <span className="text-sm text-gray-500">Get help</span>
              </button>
            </div>
          </div>
          
          {/* Logout button */}
          <button 
            onClick={() => logout()}
            className="mt-8 w-full bg-red-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
          
          {/* App version */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500">Mullet v1.0.0</p>
          </div>
        </div>
      </div>
      <Navigation />
    </>
  );
}