import { useAuth } from '../../contexts/AuthContext';
import { CogIcon, HomeIcon, BellIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";

export interface ViewProfileProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewProfile(props: ViewProfileProps) {
  const { user, logout } = useAuth();

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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <button className="w-full flex items-center space-x-3 p-4 hover:bg-gray-50 transition-colors">
                <HomeIcon className="w-6 h-6 text-gray-600" />
                <span className="flex-1 text-left font-medium text-gray-900">Houses</span>
                <span className="text-sm text-gray-500">Manage your homes</span>
              </button>
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