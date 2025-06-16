import React from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { useUser } from '../context/UserContext';
import NotificationDropdown from './NotificationDropdown';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useUser();
  const [notificationsOpen, setNotificationsOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
              <span className="sr-only">Open sidebar</span>
            </button>
            <div className="ml-4 md:ml-0 flex items-center">
              <img 
                src="https://www.developmentaid.org/files/organizationLogos/ministry-of-health-wellness-botswana-167881.jpg"
                alt="Ministry of Health Botswana"
                className="h-8 w-auto mr-2"
              />
              <h1 className="text-xl font-semibold text-gray-900">Heimdall AI</h1>
            </div>
          </div>
          <div className="flex items-center">
            <div className="relative mr-3">
              <button
                className="p-1 rounded-full text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary-500 relative"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
              >
                <span className="sr-only">View notifications</span>
                <Bell className="h-6 w-6" />
                <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-danger-500 ring-2 ring-white"></span>
              </button>
              {notificationsOpen && <NotificationDropdown setOpen={setNotificationsOpen} />}
            </div>
            <div className="ml-3 relative flex items-center">
              <div className="flex items-center">
                <img
                  className="h-8 w-8 rounded-full bg-gray-300"
                  src="https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=40"
                  alt="User avatar"
                />
                <span className="ml-2 text-sm font-medium text-gray-700 hidden md:block">
                  {user?.name}
                </span>
              </div>
              <button
                onClick={logout}
                className="ml-3 text-sm text-primary-600 hover:text-primary-800 hidden md:block"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;