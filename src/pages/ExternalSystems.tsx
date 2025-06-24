import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Server, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  Settings,
  Activity,
  Database,
  Wifi,
  Shield,
  Bell,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { alertService } from '../services/alertService';
import { openAIService } from '../services/openai';

interface ExternalSystem {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  description?: string;
  last_sync: string;
  created_at: string;
}

interface SystemLog {
  id: string;
  system_id?: string;
  event_type: string;
  user_id?: string;
  timestamp: string;
  details: any;
  created_at: string;
  external_systems?: { name: string };
}

const ExternalSystems: React.FC = () => {
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  
  const [newSystem, setNewSystem] = useState({
    name: '',
    type: '',
    url: '',
    anon_key: '',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [systemsData, logsData] = await Promise.all([
        api.externalSystems.getAll(),
        api.systemLogs.getAll()
      ]);
      
      setSystems(systemsData);
      setLogs(logsData);
    } catch (err) {
      setError('Failed to fetch data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Add system logic here
      await fetchData();
      setShowAddModal(false);
      setNewSystem({ name: '', type: '', url: '', anon_key: '', description: '' });
    } catch (err) {
      setError('Failed to add system');
      console.error(err);
    }
  };

  const analyzeSystemLogs = async (systemId?: string) => {
    setAnalyzing(true);
    try {
      // Filter logs by system if specified
      const logsToAnalyze = systemId && systemId !== 'all' 
        ? logs.filter(log => log.system_id === systemId)
        : logs;

      if (logsToAnalyze.length === 0) {
        setAnalysisResults({
          message: 'No logs available for analysis',
          suspiciousActivities: [],
          patterns: [],
          securityScore: 100
        });
        return;
      }

      // Use OpenAI to analyze logs
      const analysis = await openAIService.analyzeSystemLogs(logsToAnalyze);
      setAnalysisResults(analysis);

      // Generate alerts if threats found
      if (analysis.suspiciousActivities.length > 0) {
        await alertService.analyzeSystemLogsForThreats(systemId);
      }

    } catch (err) {
      console.error('Analysis error:', err);
      setAnalysisResults({
        message: 'Analysis failed. Please try again.',
        suspiciousActivities: [],
        patterns: [],
        securityScore: 0
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const downloadSystemLogs = async () => {
    try {
      await api.reports.downloadSystemLogs(
        selectedSystem !== 'all' ? selectedSystem : undefined
      );
    } catch (err) {
      setError('Failed to download logs');
      console.error(err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-success-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-danger-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      default:
        return <Server className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success-100 text-success-800';
      case 'error':
        return 'bg-danger-100 text-danger-800';
      case 'warning':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSystem = selectedSystem === 'all' || log.system_id === selectedSystem;
    const matchesSearch = searchTerm === '' || 
      log.event_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.external_systems?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSystem && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading external systems...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">External Systems</h1>
        <div className="flex space-x-3">
          <button
            onClick={() => analyzeSystemLogs()}
            disabled={analyzing}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Shield className="h-5 w-5 mr-2" />
            {analyzing ? 'Analyzing...' : 'AI Threat Analysis'}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add System
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-danger-50 text-danger-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* AI Analysis Results */}
      {analysisResults && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="h-5 w-5 mr-2 text-blue-600" />
              AI Security Analysis Results
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Security Score:</span>
              <span className={`px-2 py-1 rounded text-sm font-medium ${
                analysisResults.securityScore >= 80 ? 'bg-success-100 text-success-800' :
                analysisResults.securityScore >= 60 ? 'bg-warning-100 text-warning-800' :
                'bg-danger-100 text-danger-800'
              }`}>
                {analysisResults.securityScore}/100
              </span>
            </div>
          </div>

          {analysisResults.message && (
            <p className="text-gray-600 mb-4">{analysisResults.message}</p>
          )}

          {analysisResults.suspiciousActivities && analysisResults.suspiciousActivities.length > 0 && (
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-warning-600" />
                Suspicious Activities Detected ({analysisResults.suspiciousActivities.length})
              </h3>
              <div className="space-y-3">
                {analysisResults.suspiciousActivities.map((activity: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            activity.riskLevel === 'critical' ? 'bg-danger-100 text-danger-800' :
                            activity.riskLevel === 'high' ? 'bg-warning-100 text-warning-800' :
                            activity.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {activity.riskLevel.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">{activity.sourceSystem}</span>
                        </div>
                        <h4 className="font-medium text-gray-900">{activity.activity}</h4>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-sm text-blue-600 mt-2">
                          <strong>Recommendation:</strong> {activity.recommendation}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {analysisResults.patterns && analysisResults.patterns.length > 0 && (
            <div>
              <h3 className="text-md font-medium text-gray-900 mb-3 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2 text-blue-600" />
                Patterns Identified ({analysisResults.patterns.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResults.patterns.map((pattern: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900">{pattern.pattern}</h4>
                    <p className="text-sm text-gray-600 mt-1">{pattern.significance}</p>
                    <span className="text-xs text-blue-600">Frequency: {pattern.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Systems Overview */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Connected Systems</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Sync
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {systems.map((system) => (
                <tr key={system.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Server className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{system.name}</div>
                        <div className="text-sm text-gray-500">{system.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {system.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(system.status)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(system.status)}`}>
                        {system.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(system.last_sync).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => analyzeSystemLogs(system.id)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Analyze
                    </button>
                    <button className="text-primary-600 hover:text-primary-900">
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">System Activity Logs</h2>
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
              {/* Search */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search logs..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              {/* System Filter */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-5 w-5 text-gray-400" />
                </div>
                <select
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  value={selectedSystem}
                  onChange={(e) => setSelectedSystem(e.target.value)}
                >
                  <option value="all">All Systems</option>
                  {systems.map((system) => (
                    <option key={system.id} value={system.id}>
                      {system.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Download Button */}
              <button
                onClick={downloadSystemLogs}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-5 w-5 mr-2 text-gray-400" />
                Download
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.external_systems?.name || 'Unknown'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                      {log.event_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {log.user_id || 'System'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {JSON.stringify(log.details).substring(0, 100)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No logs found matching your filters</p>
          </div>
        )}
      </div>

      {/* Add System Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add External System</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleAddSystem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Name *
                </label>
                <input
                  type="text"
                  required
                  value={newSystem.name}
                  onChange={(e) => setNewSystem({ ...newSystem, name: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="e.g., Hospital Management System"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Type *
                </label>
                <select
                  required
                  value={newSystem.type}
                  onChange={(e) => setNewSystem({ ...newSystem, type: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                >
                  <option value="">Select type</option>
                  <option value="healthcare">Healthcare System</option>
                  <option value="iot">IoT Platform</option>
                  <option value="database">Database System</option>
                  <option value="monitoring">Monitoring System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System URL *
                </label>
                <input
                  type="url"
                  required
                  value={newSystem.url}
                  onChange={(e) => setNewSystem({ ...newSystem, url: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="https://system.example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key *
                </label>
                <input
                  type="password"
                  required
                  value={newSystem.anon_key}
                  onChange={(e) => setNewSystem({ ...newSystem, anon_key: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  placeholder="System API key"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newSystem.description}
                  onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  rows={3}
                  placeholder="Brief description of the system"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  Add System
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalSystems;