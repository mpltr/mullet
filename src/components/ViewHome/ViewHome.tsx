import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

export interface ViewHomeProps {
  // Add any props needed from getServerSideProps or parent components
}

export function ViewHome(props: ViewHomeProps) {
  const { user, loginWithGoogle } = useAuth();
  const router = useRouter();

  const handleMyHomes = () => {
    router.push('/tasks');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Menu */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="text-2xl font-bold text-gray-900">Mullet</div>
            </div>
            
            <div>
              {user ? (
                <button
                  onClick={handleMyHomes}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  My Homes
                </button>
              ) : (
                <button
                  onClick={() => loginWithGoogle()}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex flex-col items-center justify-center px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-32 h-32 mx-auto relative">
              {/* House with flowing hair logo */}
              <svg
                viewBox="0 0 400 400"
                className="w-full h-full text-gray-700"
                fill="currentColor"
              >
                {/* Hair/mullet flowing part */}
                <path d="M120 180 C120 120, 180 80, 260 90 C320 100, 360 140, 380 200 C390 240, 370 280, 340 300 C300 330, 250 340, 200 330 C160 320, 130 280, 120 240 Z" />
                
                {/* House base */}
                <rect x="140" y="180" width="120" height="100" rx="8" fill="white" stroke="currentColor" strokeWidth="8" />
                
                {/* Roof */}
                <path d="M130 180 L200 120 L270 180 Z" fill="white" stroke="currentColor" strokeWidth="8" strokeLinejoin="round" />
                
                {/* Windows (2x2 grid) */}
                <rect x="155" y="200" width="20" height="20" rx="2" />
                <rect x="185" y="200" width="20" height="20" rx="2" />
                <rect x="155" y="230" width="20" height="20" rx="2" />
                <rect x="185" y="230" width="20" height="20" rx="2" />
                
                {/* Door */}
                <rect x="215" y="220" width="25" height="40" rx="2" />
              </svg>
            </div>
          </div>

          {/* Hero Text */}
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            House Management
            <br />
            <span className="text-blue-600">Made Simple</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Organize your household tasks, manage rooms, and coordinate with family members 
            all in one place. Business up front, party in the back.
          </p>

          {/* CTA */}
          {!user && (
            <button
              onClick={() => loginWithGoogle()}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
            >
              Get Started
            </button>
          )}

          {user && (
            <div className="space-y-4">
              <p className="text-gray-600">Welcome back, {user.email}!</p>
              <button
                onClick={handleMyHomes}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors shadow-lg"
              >
                Go to My Homes
              </button>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Task Management</h3>
            <p className="text-gray-600">Keep track of household tasks and assign them to family members.</p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Room Organization</h3>
            <p className="text-gray-600">Organize tasks and activities by room for better coordination.</p>
          </div>

          <div className="text-center p-6">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Family Coordination</h3>
            <p className="text-gray-600">Invite family members and coordinate household activities together.</p>
          </div>
        </div>
      </main>
    </div>
  );
}