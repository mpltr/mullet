import { Navigation } from "../Navigation";

export interface ViewRoomsProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewRooms(props: ViewRoomsProps) {
  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Rooms</h1>
          
          {/* Placeholder content */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900">Kitchen</h3>
              <p className="text-sm text-gray-600 mt-1">3 tasks pending</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900">Living Room</h3>
              <p className="text-sm text-gray-600 mt-1">1 task pending</p>
            </div>
            
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <h3 className="font-semibold text-gray-900">Bathroom</h3>
              <p className="text-sm text-gray-600 mt-1">2 tasks pending</p>
            </div>
          </div>
          
          {/* Add room button */}
          <button className="mt-6 w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors">
            Add New Room
          </button>
        </div>
      </div>
      <Navigation />
    </>
  );
}