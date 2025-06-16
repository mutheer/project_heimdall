import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { AlertTriangle, AlertOctagon, AlertCircle } from 'lucide-react';
import type { Threat } from '../services/api';

interface ThreatCardProps {
  threat: Threat & { devices?: { device_name: string } };
}

const ThreatCard: React.FC<ThreatCardProps> = ({ threat }) => {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-danger-100 text-danger-800 border-danger-200';
      case 'high':
        return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="h-5 w-5 text-danger-600" />;
      case 'high':
        return <AlertTriangle className="h-5 w-5 text-warning-600" />;
      case 'medium':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'low':
        return <AlertCircle className="h-5 w-5 text-blue-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{getSeverityIcon(threat.severity_level)}</div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">{threat.threat_type}</h3>
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full capitalize ${getSeverityColor(
                  threat.severity_level
                )}`}
              >
                {threat.severity_level}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Device: {threat.devices?.device_name || 'Unknown Device'}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(threat.timestamp), { addSuffix: true })}
            </p>
            <p className="text-sm text-gray-700 mt-2">{threat.description}</p>
            <div className="mt-3 flex justify-end">
              <button className="text-primary-600 hover:text-primary-800 text-xs font-medium">View details</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThreatCard;