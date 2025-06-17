import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Shield, 
  Cpu, 
  FileBarChart, 
  Settings, 
  AlertCircle, 
  LogOut,
  Server
} from 'lucide-react';
import { useUser } from '../context/UserContext';

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
  const { logout, user } = useUser();

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Devices', href: '/devices', icon: Cpu },
    { name: 'Threats', href: '/threats', icon: Shield },
    { name: 'Reports', href: '/reports', icon: FileBarChart },
    { name: 'External Systems', href: '/external-systems', icon: Server },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-gray-900 bg-opacity-50 transition-opacity md:hidden ${
          sidebarOpen ? 'opacity-100 ease-out' : 'opacity-0 ease-in pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      <div
        className={`fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition duration-300 md:translate-x-0 md:static md:inset-0 ${
          sidebarOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in'
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-center h-16 border-b border-gray-200">
            <div className="flex items-center px-4">
              <img 
                src="/ChatGPT Image Jun 16, 2025, 12_28_31 PM.png"
                alt="Heimdall AI Logo"
                className="h-8 w-auto"
              />
              <span className="ml-2 text-xl font-semibold text-gray-800">Heimdall AI</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) =>
                    `group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`
                  }
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setSidebarOpen(false);
                    }
                  }}
                >
                  <item.icon
                    className="mr-4 h-6 w-6 flex-shrink-0"
                    aria-hidden="true"
                  />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <img
                className="h-10 w-10 rounded-full bg-gray-300"
                src="https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=40"
                alt="User avatar"
              />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.name}</p>
                <p className="text-xs font-medium text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;