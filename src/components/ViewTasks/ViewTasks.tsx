import { CheckIcon, ClockIcon, PlusIcon, HomeIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";
import { useAuth } from "../../contexts/AuthContext";
import { useHomes, useEnrichedUserInvitations } from "../../hooks/useDatabase";
import { homeInvitationService } from "../../lib/database";
import { Loader } from "../Loader";

export interface ViewTasksProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewTasks(props: ViewTasksProps) {
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
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Tasks</h1>
            
            {/* Empty state */}
            <div className="text-center py-12">
              <HomeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No homes yet</h3>
              <p className="text-gray-600 mb-6">Create your first home to start managing tasks.</p>
              
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
        
        {/* TODO: Replace with actual tasks data */}
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