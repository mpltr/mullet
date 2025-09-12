import { PlusIcon, HomeIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useHomes, useEnrichedUserInvitations } from "../../hooks/useDatabase";
import { homeInvitationService } from "../../lib/database";
import { Loader } from "../Loader";

export interface ViewRoomsProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewRooms(props: ViewRoomsProps) {
  const { user } = useAuth();
  const { homes, loading: homesLoading } = useHomes(user?.uid || '');
  const { invitations, loading: invitationsLoading } = useEnrichedUserInvitations(user?.email || '');

  if (homesLoading || invitationsLoading) {
    return <Loader />;
  }

  // Show empty state if user has no homes
  if (homes.length === 0) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 pb-20">
          <div className="px-4 py-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Rooms</h1>
            
            {/* Empty state */}
            <div className="text-center py-12">
              <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No homes yet</h3>
              <p className="text-gray-600 mb-6">Create your first home to start organizing rooms and tasks.</p>
              
              <button className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                <PlusIcon className="w-5 h-5 inline mr-2" />
                Create Your First Home
              </button>
            </div>

            {/* Show invitations if any */}
            {invitations.length > 0 && (
              <div className="mt-8">
                <div className="flex items-center space-x-2 mb-4">
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Pending Home Invitations</h2>
                </div>
                
                <div className="space-y-3">
                  {invitations.map((invitation) => (
                    <div key={invitation.id} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-lg">{invitation.homeName}</p>
                          <p className="text-sm text-gray-600 mt-1">
                            Owner: {invitation.inviterName}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {invitation.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button 
                            onClick={async () => {
                              try {
                                await homeInvitationService.accept(invitation.id, user!.uid);
                              } catch (error) {
                                console.error('Error accepting invite:', error);
                              }
                            }}
                            className="px-3 py-1 text-sm bg-green-100 text-green-800 rounded-md hover:bg-green-200 transition-colors"
                          >
                            Accept
                          </button>
                          <button 
                            onClick={async () => {
                              try {
                                await homeInvitationService.decline(invitation.id);
                              } catch (error) {
                                console.error('Error declining invite:', error);
                              }
                            }}
                            className="px-3 py-1 text-sm bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <Navigation />
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Rooms</h1>
          
          {/* TODO: Replace with actual rooms data */}
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