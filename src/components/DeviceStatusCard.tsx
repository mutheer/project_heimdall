import React from 'react';
import { format } from 'date-fns';
import { Cpu, WifiOff, AlertTriangle, Activity, Server, Database, Microscope } from 'lucide-react';
import type { Device } from '../services/api';

interface DeviceStatusCardProps {
  device: Device;
}

const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({ device }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-success-100 text-success-800 border-success-200';
      case 'offline':
        return 'bg-danger-100 text-danger-800 border-danger-200';
      case 'warning':
        return 'bg-warning-100 text-warning-800 border-warning-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Activity className="h-5 w-5 text-success-600" />;
      case 'offline':
        return <WifiOff className="h-5 w-5 text-danger-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-600" />;
      default:
        return <Cpu className="h-5 w-5 text-gray-600" />;
    }
  };

  const getDeviceTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'monitoring':
        return <Activity className="h-5 w-5" />;
      case 'diagnostic':
        return <Server className="h-5 w-5" />;
      case 'lab':
        return <Microscope className="h-5 w-5" />;
      case 'critical':
        return <Database className="h-5 w-5" />;
      default:
        return <Cpu className="h-5 w-5" />;
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-gray-700">{getDeviceTypeIcon(device.device_type)}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">{device.device_name}</h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full flex items-center capitalize ${getStatusColor(
                  device.status
                )}`}
              >
                <span className="mr-1">{getStatusIcon(device.status)}</span>
                {device.status}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              ID: {device.device_id}
            </p>
            <p className="text-xs text-gray-500">
              Last active: {format(new Date(device.last_active), 'MMM d, yyyy h:mm a')}
            </p>
            <div className="mt-3 flex justify-end">
              <button className="text-primary-600 hover:text-primary-800 text-xs font-medium">View details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceStatusCard;