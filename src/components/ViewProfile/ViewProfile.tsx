import { useState, memo, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { CogIcon, HomeIcon, BellIcon, QuestionMarkCircleIcon, ChevronDownIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Navigation } from "../Navigation";
import { Input } from "../Input";
import { useHomes, useHomeInvitations } from '../../hooks/useDatabase';
import { homeService, homeInvitationService } from '../../lib/database';

export interface ViewProfileProps {
  // Add any props needed from getServerSideProps or parent components
}

interface HomeDetailsProps {
  home: any;
  user: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  inviteEmail: string;
  onInviteEmailChange: (email: string) => void;
  onSendInvite: () => void;
  isSendingInvite: boolean;
}

const HomeDetails = memo(function HomeDetails({
  home,
  user,
  isExpanded,
  onToggleExpanded,
  inviteEmail,
  onInviteEmailChange,
  onSendInvite,
  isSendingInvite
}: HomeDetailsProps) {
  const { invitations, loading: invitationsLoading, error } = useHomeInvitations(home.id);
  const isOwner = home.createdBy === user?.uid;
  

  return (
    <div className="border border-gray-200 rounded-lg">
      <button
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between py-2 px-3 hover:bg-gray-50 rounded-lg"
      >
        <div className="text-left">
          <p className="font-medium text-gray-900 text-sm">{home.name}</p>
          <p className="text-xs text-gray-500">
            {home.members.length} member{home.members.length !== 1 ? 's' : ''}
            {isOwner && invitations.length > 0 && (
              <span className="ml-1">• {invitations.length} pending invite{invitations.length !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-400">
            {isOwner ? 'Owner' : 'Member'}
          </span>
          {isExpanded ? (
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRightIcon className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {/* Members List */}
          <div className="mt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">Members ({home.members.length})</p>
            <div className="space-y-1">
              {home.members.map((memberId: string) => (
                <div key={memberId} className="text-xs text-gray-600 py-1">
                  {memberId === user?.uid ? 'You' : `User ${memberId.slice(-6)}`}
                  {memberId === home.createdBy && <span className="ml-1 text-gray-400">(Owner)</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Owner-only invite functionality */}
          {isOwner && (
            <>
              {/* Pending Invitations */}
              {invitations.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-700 mb-2">Pending Invites ({invitations.length})</p>
                  <div className="space-y-1">
                    {invitations.map((invitation) => (
                      <div key={invitation.id} className="flex items-center justify-between text-xs py-1">
                        <span className="text-gray-600">{invitation.invitedEmail}</span>
                        <button
                          onClick={async () => {
                            try {
                              await homeInvitationService.delete(invitation.id);
                            } catch (error) {
                              console.error('Error revoking invite:', error);
                            }
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invite New Member */}
              <div className="mt-4">
                <p className="text-xs font-medium text-gray-700 mb-2">Invite Member</p>
                <div className="flex space-x-2">
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => onInviteEmailChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSendInvite()}
                    placeholder="Email address"
                    size="sm"
                    disabled={isSendingInvite}
                    className="flex-1"
                  />
                  <button
                    onClick={onSendInvite}
                    disabled={!inviteEmail.trim() || isSendingInvite}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingInvite ? 'Sending...' : 'Invite'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

export function ViewProfile(props: ViewProfileProps) {
  const { user, logout } = useAuth();
  const [homesExpanded, setHomesExpanded] = useState(false);
  const [expandedHomeIds, setExpandedHomeIds] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [homeName, setHomeName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [isSendingInvite, setIsSendingInvite] = useState<Record<string, boolean>>({});
  const { homes, loading: homesLoading } = useHomes(user?.uid || '');

  const handleCreateHome = async () => {
    if (!user?.uid || !homeName.trim()) return;
    
    setIsCreating(true);
    try {
      await homeService.create(user.uid, homeName.trim());
      setHomeName('');
      setShowCreateModal(false);
      setHomesExpanded(true); // Keep homes expanded after creation
    } catch (error) {
      console.error('Error creating home:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const openCreateModal = () => {
    setShowCreateModal(true);
    setHomeName('');
  };

  const toggleHomeExpanded = useCallback((homeId: string) => {
    const newExpanded = new Set(expandedHomeIds);
    if (newExpanded.has(homeId)) {
      newExpanded.delete(homeId);
    } else {
      newExpanded.add(homeId);
    }
    setExpandedHomeIds(newExpanded);
  }, [expandedHomeIds]);

  const handleSendInvite = useCallback(async (homeId: string) => {
    const email = inviteEmails[homeId]?.trim();
    if (!user?.uid || !email) return;

    setIsSendingInvite(prev => ({ ...prev, [homeId]: true }));
    try {
      await homeInvitationService.create(homeId, email, user.uid);
      setInviteEmails(prev => ({ ...prev, [homeId]: '' }));
    } catch (error: any) {
      console.error('Error sending invite:', error);
      alert(error.message || 'Failed to send invitation');
    } finally {
      setIsSendingInvite(prev => ({ ...prev, [homeId]: false }));
    }
  }, [inviteEmails, user?.uid]);

  const handleInviteEmailChange = useCallback((homeId: string, email: string) => {
    setInviteEmails(prev => ({ ...prev, [homeId]: email }));
  }, []);

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
                        <button 
                          onClick={openCreateModal}
                          className="text-blue-600 text-sm font-medium hover:text-blue-700"
                        >
                          Create your first home
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {homes.map((home) => (
                          <HomeDetails
                            key={home.id}
                            home={home}
                            user={user}
                            isExpanded={expandedHomeIds.has(home.id)}
                            onToggleExpanded={() => toggleHomeExpanded(home.id)}
                            inviteEmail={inviteEmails[home.id] || ''}
                            onInviteEmailChange={(email) => handleInviteEmailChange(home.id, email)}
                            onSendInvite={() => handleSendInvite(home.id)}
                            isSendingInvite={isSendingInvite[home.id] || false}
                          />
                        ))}
                        <div className="pt-2 border-t border-gray-100">
                          <button 
                            onClick={openCreateModal}
                            className="w-full text-blue-600 text-sm font-medium hover:text-blue-700 py-2"
                          >
                            + Create a home
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
      
      {/* Create Home Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create New Home</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <Input
                label="Home Name"
                type="text"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateHome()}
                placeholder="Enter home name"
                fullWidth
                disabled={isCreating}
                autoFocus
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={isCreating}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHome}
                disabled={!homeName.trim() || isCreating}
                className="flex-1 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Home'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}