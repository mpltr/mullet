import { PlusIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";

export interface ViewListsProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewLists(props: ViewListsProps) {
  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Lists</h1>
          
          {/* Lists */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ShoppingCartIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Grocery List</h3>
                  <p className="text-sm text-gray-600 mt-1">8 items • 3 completed</p>
                </div>
                <div className="text-sm text-gray-500">Today</div>
              </div>
              
              {/* Preview items */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 rounded border-2 border-gray-300"></div>
                  <span className="text-gray-900">Milk</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 rounded bg-green-500 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-gray-500 line-through">Bread</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 rounded border-2 border-gray-300"></div>
                  <span className="text-gray-900">Eggs</span>
                </div>
                <div className="text-xs text-gray-500 ml-6">+5 more items</div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <PlusIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Hardware Store</h3>
                  <p className="text-sm text-gray-600 mt-1">3 items • 0 completed</p>
                </div>
                <div className="text-sm text-gray-500">Tomorrow</div>
              </div>
              
              {/* Preview items */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 rounded border-2 border-gray-300"></div>
                  <span className="text-gray-900">Light bulbs</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 rounded border-2 border-gray-300"></div>
                  <span className="text-gray-900">Screws</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <div className="w-4 h-4 rounded border-2 border-gray-300"></div>
                  <span className="text-gray-900">Paint brush</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <PlusIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Party Planning</h3>
                  <p className="text-sm text-gray-600 mt-1">12 items • 8 completed</p>
                </div>
                <div className="text-sm text-gray-500">Next week</div>
              </div>
            </div>
          </div>
          
          {/* Add list button */}
          <button className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Create New List
          </button>
        </div>
      </div>
      <Navigation />
    </>
  );
}