import React, { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldAlert, ShieldCheck, Cpu, AlertTriangle, Activity, Shield, Database, RefreshCw } from 'lucide-react';
import ThreatCard from '../components/ThreatCard';
import DeviceStatusCard from '../components/DeviceStatusCard';
import DatabaseStatus Afrom '../components/DatabaseStatus';
import { api, Device, Threat } from '../services/api';

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [threats, setThreats] = useState<(Threat & { devices: { device_name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatabaseStatus, setShowDatabaseStatus] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const fetchData = async (isRetry = false) => {
    try {
      if (!isRetry) {
        setLoading(true);
      }
      setError(null);

      console.log('Fetching dashboard data...');
      
      // Test connection first
      const healthCheck = await api.healthCheck();
      console.log('Health check result:', healthCheck);

      if (healthCheck.status !== 'healthy') {
        throw new Error('Database connection is not healthy');
      }

      const [devicesData, threatsData] = await Promise.all([
        api.devices.getAll(),
        api.threats.getAll()
      ]);
      
      console.log('Fetched devices:', devicesData.length);
      console.log('Fetched threats:', threatsData.length);
      
      setDevices(devicesData);
      setThreats(threatsData);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      console.error('Dashboard fetch error:', err);
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      
      // Auto-retry logic for network errors
      if (retryCount < 3 && (
        errorMessage.includes('Failed to fetch') || 
        errorMessage.includes('Network') ||
        errorMessage.includes('connection')
      )) {
        console.log(`Retrying in 2 seconds... (attempt ${retryCount + 1}/3)`);
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchData(true);
        }, 2000);
      }
    } finally {
      if (!isRetry) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate device status distribution
  const deviceStatusData = devices.reduce((acc, device) => {
    const status = device.status;
    const existingStatus = acc.find(item => item.name === status);
    if (existingStatus) {
      existingStatus.value++;
    } else {
      acc.push({ name: status, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  // Calculate threat type distribution
  const threatTypeData = threats.reduce((acc, threat) => {
    const type = threat.threat_type;
    const existingType = acc.find(item => item.name === type);
    if (existingType) {
      existingType.value++;
    } else {
      acc.push({ name: type, value: 1 });
    }
    return acc;
  }, [] as { name: string; value: number }[]);

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];
  const THREAT_COLORS = ['#ef4444', '#f59e0b', '#0ea5e9', '#8b5cf6', '#d1d5db'];

  const stats = [
    {
      id: 1,
      name: 'Total Devices',
      value: devices.length.toString(),
      icon: Cpu,
      color: 'bg-primary-500',
    },
    {
      id: 2,
      name: 'Active Threats',
      value: threats.filter(t => !t.is_resolved).length.toString(),
      icon: ShieldAlert,
      color: 'bg-danger-500',
    },
    {
      id: 3,
      name: 'Protected Devices',
      value: devices.filter(d => d.status === 'online').length.toString(),
      icon: ShieldCheck,
      color: 'bg-success-500',
    },
    {
      id: 4,
      name: 'Total Threats',
      value: threats.length.toString(),
      icon: Shield,
      color: 'bg-secondary-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <div className="text-gray-500">Loading dashboard data...</div>
          {retryCount > 0 && (
            <div className="text-sm text-gray-400">
              Retrying... (attempt {retryCount}/3)
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-danger-500 font-medium">Connection Error</div>
          <div className="text-gray-600 max-w-md">{error}</div>
          <button
            onClick={() => fetchData()}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors mx-auto"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </button>
          <div className="text-sm text-gray-500 mt-4">
            <p>Troubleshooting tips:</p>
            <ul className="text-left mt-2 space-y-1">
              <li>• Check your internet connection</li>
              <li>• Verify Supabase project is active</li>
              <li>• Confirm environment variables are correct</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowDatabaseStatus(true)}
            className="flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
          >
            <Database className="h-4 w-4 mr-2" />
            Database Status
          </button>
          <button
            onClick={() => fetchData()}
            className="flex items-center px-3 py-2 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <div className="text-sm text-gray-500">Last updated: {new Date().toLocaleString()}</div>
        </div>
      </div>

      {/* Database Status Modal */}
      <DatabaseStatus 
        isOpen={showDatabaseStatus} 
        onClose={() => setShowDatabaseStatus(false)} 
      />

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white rounded-lg shadow-sm p-6 flex items-center">
            <div className={`${stat.color} rounded-md p-3 mr-4`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-gray-500 text-sm">{stat.name}</p>
              <p className="text-2xl font-semibold">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Status Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Device Status</h2>
          <div className="h-64">
            {deviceStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {deviceStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} devices`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No device data available
              </div>
            )}
          </div>
          {deviceStatusData.length > 0 && (
            <div className="flex justify-center space-x-4 mt-2">
              {deviceStatusData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <span
                    className="h-3 w-3 rounded-full mr-1"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></span>
                  <span className="text-xs">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Threat Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Threat Types</h2>
          <div className="h-64">
            {threatTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={threatTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {threatTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={THREAT_COLORS[index % THREAT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number, name: string) => [`${value} threats`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                No threat data available
              </div>
            )}
          </div>
          {threatTypeData.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              {threatTypeData.map((entry, index) => (
                <div key={index} className="flex items-center">
                  <span
                    className="h-3 w-3 rounded-full mr-1"
                    style={{ backgroundColor: THREAT_COLORS[index % THREAT_COLORS.length] }}
                  ></span>
                  <span className="text-xs whitespace-nowrap">{entry.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Latest Threats & Device Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latest Threats */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Latest Threats</h2>
            <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              View all
            </button>
          </div>
          <div className="space-y-4">
            {threats.length > 0 ? (
              threats.slice(0, 3).map((threat) => (
                <ThreatCard key={threat.threat_id} threat={threat} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No threats detected
              </div>
            )}
          </div>
        </div>

        {/* Device Status */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Device Status</h2>
            <button className="text-primary-600 hover:text-primary-800 text-sm font-medium">
              View all
            </button>
          </div>
          <div className="space-y-4">
            {devices.length > 0 ? (
              devices.slice(0, 4).map((device) => (
                <DeviceStatusCard key={device.device_id} device={device} />
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No devices registered
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;