import { CheckIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";

export interface ViewTasksProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewTasks(props: ViewTasksProps) {
  return (
    <>
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Tasks</h1>
        
        {/* Filter tabs */}
        <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-6">
          <button className="flex-1 py-2 px-3 text-sm font-medium rounded-md bg-white text-gray-900 shadow-sm">
            All
          </button>
          <button className="flex-1 py-2 px-3 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900">
            Pending
          </button>
          <button className="flex-1 py-2 px-3 text-sm font-medium rounded-md text-gray-600 hover:text-gray-900">
            Completed
          </button>
        </div>
        
        {/* Tasks list */}
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-start space-x-3">
              <button className="mt-1 p-1 rounded-full border-2 border-gray-300 hover:border-blue-500">
                <div className="w-4 h-4"></div>
              </button>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Clean the kitchen counters</h3>
                <p className="text-sm text-gray-600 mt-1">Kitchen • Assigned to you</p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Due today
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
            <div className="flex items-start space-x-3">
              <button className="mt-1 p-1 rounded-full border-2 border-gray-300 hover:border-blue-500">
                <div className="w-4 h-4"></div>
              </button>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">Vacuum living room</h3>
                <p className="text-sm text-gray-600 mt-1">Living Room • Assigned to partner</p>
                <div className="flex items-center mt-2 text-xs text-gray-500">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  Due tomorrow
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 opacity-60">
            <div className="flex items-start space-x-3">
              <div className="mt-1 p-1 rounded-full bg-green-500">
                <CheckIcon className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 line-through">Take out trash</h3>
                <p className="text-sm text-gray-600 mt-1">Kitchen • Completed</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Add task button */}
        <button className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Add New Task
        </button>
      </div>
    </div>
    <Navigation />
    </>
  );
}