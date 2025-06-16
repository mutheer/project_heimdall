import React from 'react';
import { X, AlertTriangle, Info } from 'lucide-react';

interface NotificationDropdownProps {
  setOpen: (open: boolean) => void;
}

const notifications = [
  {
    id: '1',
    title: 'Critical Threat Detected',
    message: 'Suspicious activity on ECG Monitor (Device ID: ECG-001)',
    time: '2 minutes ago',
    type: 'critical',
  },
  {
    id: '2',
    title: 'System Update Available',
    message: 'New threat definitions are available for download',
    time: '1 hour ago',
    type: 'info',
  },
  {
    id: '3',
    title: 'Warning: Device Offline',
    message: 'Patient Monitor (PM-003) has been offline for 15 minutes',
    time: '3 hours ago',
    type: 'warning',
  },
];

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ setOpen }) => {
  return (
    <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
        <div className="px-4 py-2 flex items-center justify-between border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
          <button
            className="text-gray-400 hover:text-gray-500"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <div className="max-h-72 overflow-y-auto">
          {notifications.map((notification) => (
            <div key={notification.id} className="px-4 py-3 border-b border-gray-100 hover:bg-gray-50">
              <div className="flex">
                <div className="flex-shrink-0 mr-3">
                  {notification.type === 'critical' ? (
                    <div className="h-8 w-8 rounded-full bg-danger-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-danger-600" />
                    </div>
                  ) : notification.type === 'warning' ? (
                    <div className="h-8 w-8 rounded-full bg-warning-100 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-warning-600" />
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                      <Info className="h-5 w-5 text-primary-600" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                  <p className="text-sm text-gray-500">{notification.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{notification.time}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="px-4 py-2 text-center">
          <button className="text-sm text-primary-600 hover:text-primary-800 font-medium">
            View all notifications
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationDropdown;