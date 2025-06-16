import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Filter, Download, Cpu, X, Wifi, Bluetooth, Key } from 'lucide-react';
import { api, Device } from '../services/api';
import { supabase } from '../lib/supabase';

const Devices: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [integrationKey, setIntegrationKey] = useState<string>('');
  const [connectionMethod, setConnectionMethod] = useState<'wifi' | 'bluetooth' | 'key'>('wifi');
  const [deviceInfo, setDeviceInfo] = useState({
    name: '',
    type: '',
    location: ''
  });

  useEffect(() => {
    fetchDevices();
    fetchIntegrationKey();
  }, []);

  const fetchDevices = async () => {
    try {
      const data = await api.devices.getAll();
      setDevices(data);
    } catch (err) {
      setError('Failed to fetch devices');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchIntegrationKey = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'integration_keys')
        .maybeSingle();

      if (!error && data) {
        // Ensure setting_value is an array and has at least one key
        const keys = Array.isArray(data.setting_value) ? data.setting_value : [];
        setIntegrationKey(keys[0] || '');
      } else {
        console.warn('No integration keys found:', error);
        setIntegrationKey('');
      }
    } catch (err) {
      console.error('Error fetching integration key:', err);
      setIntegrationKey('');
    }
  };

  const handleConnect = async () => {
    try {
      if (!integrationKey) {
        throw new Error('No integration key available');
      }

      if (!deviceInfo.name || !deviceInfo.type) {
        throw new Error('Device name and type are required');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-integration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Integration-Key': integrationKey
        },
        body: JSON.stringify({
          action: 'register_device',
          data: {
            device_name: deviceInfo.name,
            device_type: deviceInfo.type,
            location: deviceInfo.location || null,
            connection_method: connectionMethod,
            initial_metrics: {
              connection_type: connectionMethod,
              registration_time: new Date().toISOString()
            }
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to register device');
      }

      await fetchDevices();
      setShowConnectModal(false);
      setDeviceInfo({ name: '', type: '', location: '' });
    } catch (err) {
      console.error('Error connecting device:', err);
      setError(err.message || 'Failed to connect device');
    }
  };

  // Filter devices based on search term and status
  const filteredDevices = devices.filter((device) => {
    const matchesSearch =
      device.device_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.device_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.device_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      selectedStatus === 'all' || device.status === selectedStatus;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-success-100 text-success-800';
      case 'offline':
        return 'bg-danger-100 text-danger-800';
      case 'warning':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConnectionIcon = () => {
    switch (connectionMethod) {
      case 'wifi':
        return <Wifi className="h-8 w-8 text-primary-600" />;
      case 'bluetooth':
        return <Bluetooth className="h-8 w-8 text-primary-600" />;
      case 'key':
        return <Key className="h-8 w-8 text-primary-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading devices...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-danger-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-0">Medical IoT Devices</h1>
        <button 
          onClick={() => setShowConnectModal(true)}
          className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 transition-colors"
        >
          <PlusCircle className="h-5 w-5 mr-2" />
          <span>Connect Device</span>
        </button>
      </div>

      {/* Connect Device Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Connect New Device</h2>
              <button onClick={() => setShowConnectModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6">
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setConnectionMethod('wifi')}
                  className={`p-4 rounded-lg border ${
                    connectionMethod === 'wifi' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <Wifi className={`h-8 w-8 ${
                    connectionMethod === 'wifi' ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <span className="block mt-2 text-sm">WiFi</span>
                </button>
                <button
                  onClick={() => setConnectionMethod('bluetooth')}
                  className={`p-4 rounded-lg border ${
                    connectionMethod === 'bluetooth' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <Bluetooth className={`h-8 w-8 ${
                    connectionMethod === 'bluetooth' ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <span className="block mt-2 text-sm">Bluetooth</span>
                </button>
                <button
                  onClick={() => setConnectionMethod('key')}
                  className={`p-4 rounded-lg border ${
                    connectionMethod === 'key' ? 'border-primary-500 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <Key className={`h-8 w-8 ${
                    connectionMethod === 'key' ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <span className="block mt-2 text-sm">Integration Key</span>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={deviceInfo.name}
                    onChange={(e) => setDeviceInfo({ ...deviceInfo, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., ECG Monitor 001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Device Type *
                  </label>
                  <select
                    required
                    value={deviceInfo.type}
                    onChange={(e) => setDeviceInfo({ ...deviceInfo, type: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">Select type</option>
                    <option value="monitoring">Monitoring Device</option>
                    <option value="diagnostic">Diagnostic Device</option>
                    <option value="lab">Laboratory Equipment</option>
                    <option value="critical">Critical Care Device</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={deviceInfo.location}
                    onChange={(e) => setDeviceInfo({ ...deviceInfo, location: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="e.g., Ward A, Room 101"
                  />
                </div>

                {connectionMethod === 'key' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-md">
                    <h3 className="text-sm font-medium text-gray-900 mb-2">Integration Key</h3>
                    {integrationKey ? (
                      <code className="text-sm block bg-white p-2 rounded border border-gray-200">
                        {integrationKey}
                      </code>
                    ) : (
                      <p className="text-sm text-red-600">No integration key available. Please contact your administrator.</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Use this key in your device's configuration to connect to the system.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowConnectModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConnect}
                disabled={!deviceInfo.name || !deviceInfo.type || !integrationKey}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                Connect Device
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search devices..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Filter by status */}
            <div className="w-full md:w-40">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                  <option value="warning">Warning</option>
                </select>
              </div>
            </div>

            {/* Export button */}
            <button className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              <Download className="h-5 w-5 mr-2 text-gray-400" />
              Export
            </button>
          </div>
        </div>

        {/* Devices table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Device
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Device ID
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Type
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Location
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Last Active
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDevices.map((device) => (
                <tr key={device.device_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <Cpu className="h-5 w-5 text-gray-500" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{device.device_name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{device.device_id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{device.device_type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        device.status
                      )}`}
                    >
                      {device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{device.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(device.last_active).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-primary-600 hover:text-primary-900">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDevices.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No devices found matching your filters</p>
          </div>
        )}

        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to{' '}
                <span className="font-medium">{filteredDevices.length}</span> of{' '}
                <span className="font-medium">{filteredDevices.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Previous</span>
                  &laquo;
                </button>
                <button
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  1
                </button>
                <button
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                >
                  <span className="sr-only">Next</span>
                  &raquo;
                </button>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Devices;