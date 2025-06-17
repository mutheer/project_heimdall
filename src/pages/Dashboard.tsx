import React, { useEffect, useState } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ShieldAlert, ShieldCheck, Cpu, AlertTriangle, Activity, Shield, Database } from 'lucide-react';
import ThreatCard from '../components/ThreatCard';
import DeviceStatusCard from '../components/DeviceStatusCard';
import DatabaseStatus from '../components/DatabaseStatus';
import { api, Device, Threat } from '../services/api';

const Dashboard: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [threats, setThreats] = useState<(Threat & { devices: { device_name: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDatabaseStatus, setShowDatabaseStatus] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesData, threatsData] = await Promise.all([
          api.devices.getAll(),
          api.threats.getAll()
        ]);
        
        setDevices(devicesData);
        setThreats(threatsData);
      } catch (err) {
        setError('Failed to fetch data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

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
        <div className="text-gray-500">Loading...</div>
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
                <Tooltip formatter={(value: number) => [`${value} devices`, entry.name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
        </div>

        {/* Threat Type Distribution */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Threat Types</h2>
          <div className="h-64">
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
                <Tooltip formatter={(value: number) => [`${value} threats`, entry.name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
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
            {threats.slice(0, 3).map((threat) => (
              <ThreatCard key={threat.threat_id} threat={threat} />
            ))}
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
            {devices.slice(0, 4).map((device) => (
              <DeviceStatusCard key={device.device_id} device={device} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;