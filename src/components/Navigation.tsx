import Link from 'next/link';
import { useRouter } from 'next/router';
import { ClockIcon, ListBulletIcon, ClipboardDocumentListIcon, UserIcon } from '@heroicons/react/24/outline';
import { ClockIcon as ClockIconSolid, ListBulletIcon as ListBulletIconSolid, ClipboardDocumentListIcon as ClipboardDocumentListIconSolid, UserIcon as UserIconSolid } from '@heroicons/react/24/solid';

const navigationItems = [
  {
    name: 'Tasks',
    href: '/tasks',
    icon: ClipboardDocumentListIcon,
    iconActive: ClipboardDocumentListIconSolid,
  },
  {
    name: 'Habits',
    href: '/habits',
    icon: ClockIcon,
    iconActive: ClockIconSolid,
  },
  {
    name: 'Lists',
    href: '/lists',
    icon: ListBulletIcon,
    iconActive: ListBulletIconSolid,
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UserIcon,
    iconActive: UserIconSolid,
  },
];

export function Navigation() {
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around">
        {navigationItems.map((item) => {
          const isActive = router.pathname === item.href;
          const Icon = isActive ? item.iconActive : item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                isActive 
                  ? 'text-blue-600' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-xs mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}