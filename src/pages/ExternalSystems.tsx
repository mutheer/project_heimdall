import React, { useState, useEffect } from 'react';
import { Server, Activity, AlertCircle, Check, Copy, Code, Settings, RefreshCw, X, Plus, Clock, AlertTriangle, Shield, Database, Link } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';

interface ExternalSystem {
  id: string;
  name: string;
  type: string;
  url: string;
  anon_key: string;
  status: 'active' | 'inactive' | 'error';
  description?: string;
  last_sync: string;
}

interface SystemLog {
  id: string;
  event_type: string;
  created_at: string;
  details: any;
  system_id?: string;
  external_systems?: { name: string };
}

const ExternalSystems: React.FC = () => {
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'documentation' | 'activity'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [syncingSystemIds, setSyncingSystemIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [newSystem, setNewSystem] = useState({
    name: '',
    type: 'Medical Device',
    description: '',
    url: '',
    anon_key: '',
    status: 'active' as 'active' | 'inactive' | 'error'
  });
  const [integrationKey, setIntegrationKey] = useState<string>('');

  useEffect(() => {
    fetchIntegrationKey();
    fetchSystems();
  }, []);

  useEffect(() => {
    if (selectedTab === 'activity') {
      if (selectedSystem) {
        fetchSystemLogs(selectedSystem);
      } else {
        fetchAllSystemLogs();
      }
    }
  }, [selectedTab, selectedSystem]);

  const fetchSystems = async () => {
    try {
      const { data, error } = await supabase
        .from('external_systems')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSystems(data || []);
    } catch (err) {
      console.error('Error fetching systems:', err);
    }
  };

  const fetchSystemLogs = async (systemId: string) => {
    setLogsLoading(true);
    setError(null);
    try {
      console.log('Fetching logs for system:', systemId);
      
      const { data: logs, error: logsError } = await supabase
        .from('system_logs')
        .select('*')
        .eq('system_id', systemId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching system logs:', logsError);
        throw logsError;
      }

      console.log('Fetched logs:', logs);
      setSystemLogs(logs || []);
      
      if (!logs || logs.length === 0) {
        console.log('No logs found for system:', systemId);
        // Try to sync the system to get fresh logs
        const system = systems.find(s => s.id === systemId);
        if (system) {
          console.log('Attempting to sync system to get fresh logs...');
          await syncSystem(system, true); // Pass true to indicate this is a background sync
        }
      }
    } catch (err: any) {
      console.error('Error fetching system logs:', err);
      setError(err.message || 'Failed to fetch system logs');
      setSystemLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchAllSystemLogs = async () => {
    setLogsLoading(true);
    setError(null);
    try {
      console.log('Fetching all system logs');
      
      const { data: logs, error: logsError } = await supabase
        .from('system_logs')
        .select(`
          *,
          external_systems!system_logs_system_id_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching all system logs:', logsError);
        throw logsError;
      }

      console.log('Fetched all logs:', logs);
      setSystemLogs(logs || []);
      
      if (!logs || logs.length === 0) {
        console.log('No logs found in system_logs table');
      }
    } catch (err: any) {
      console.error('Error fetching all system logs:', err);
      setError(err.message || 'Failed to fetch system logs');
      setSystemLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const testConnection = async () => {
    if (!newSystem.url || !newSystem.anon_key) {
      setConnectionTestResult({
        success: false,
        message: 'Please enter both URL and API key'
      });
      return;
    }

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const validation = await validateExternalSystem(newSystem.url, newSystem.anon_key);
      setConnectionTestResult({
        success: validation.valid,
        message: validation.valid ? 'Connection successful! System logs table found.' : validation.error || 'Connection failed'
      });
    } catch (err: any) {
      setConnectionTestResult({
        success: false,
        message: err.message || 'Connection test failed'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const validateExternalSystem = async (url: string, anon_key: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const externalSupabase = createClient(url, anon_key);
      
      // Check if we can connect by querying the system_logs table
      const { error: connectionError } = await externalSupabase
        .from('system_logs')
        .select('id')
        .limit(1);

      if (connectionError?.message?.includes('JWT')) {
        return { 
          valid: false, 
          error: 'Authentication failed. Please verify the API key is correct and has the necessary permissions.' 
        };
      }

      if (connectionError?.message?.includes('does not exist')) {
        return { 
          valid: false, 
          error: 'The system_logs table does not exist in the external system. Please ensure the table is created with the required schema.' 
        };
      }

      if (connectionError) {
        return { 
          valid: false, 
          error: 'Unable to connect to the external system. Please verify the URL is correct and the project is online.' 
        };
      }

      return { valid: true };
    } catch (err: any) {
      if (err.message?.includes('Failed to fetch')) {
        return { 
          valid: false, 
          error: 'Unable to reach the external system. Please check the URL and ensure the system is accessible.' 
        };
      }
      
      return { 
        valid: false, 
        error: 'Failed to validate external system connection: ' + (err.message || 'Unknown error')
      };
    }
  };

  const syncSystem = async (system: ExternalSystem, isBackgroundSync: boolean = false) => {
    if (!isBackgroundSync) {
      setSyncingSystemIds(prev => new Set([...prev, system.id]));
    }
    setError(null);
    
    try {
      const validation = await validateExternalSystem(system.url, system.anon_key);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session found');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/system-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'X-Integration-Key': integrationKey
        },
        body: JSON.stringify({
          system_id: system.id,
          url: system.url,
          anon_key: system.anon_key
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Sync successful:', data);

      await fetchSystems();
      
      // Refresh logs if we're viewing this system or all systems
      if (selectedTab === 'activity') {
        if (selectedSystem === system.id) {
          await fetchSystemLogs(system.id);
        } else if (!selectedSystem) {
          await fetchAllSystemLogs();
        }
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error syncing system:', err);
      if (!isBackgroundSync) {
        setError(err.message || 'Failed to sync system. Please check the system configuration and try again.');
      }
    } finally {
      if (!isBackgroundSync) {
        setSyncingSystemIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(system.id);
          return newSet;
        });
      }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success-100 text-success-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType.toLowerCase()) {
      case 'login':
      case 'signup':
        return <Shield className="h-5 w-5 text-success-500" />;
      case 'logout':
      case 'recovery':
        return <AlertTriangle className="h-5 w-5 text-warning-500" />;
      case 'token_refreshed':
        return <RefreshCw className="h-5 w-5 text-primary-500" />;
      case 'user_deleted':
        return <AlertCircle className="h-5 w-5 text-danger-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleAddSystem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const validation = await validateExternalSystem(newSystem.url, newSystem.anon_key);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const { data, error: insertError } = await supabase
        .from('external_systems')
        .insert([newSystem])
        .select();

      if (insertError) throw insertError;

      await fetchSystems();
      setShowAddModal(false);
      setNewSystem({
        name: '',
        type: 'Medical Device',
        description: '',
        url: '',
        anon_key: '',
        status: 'active'
      });
      setConnectionTestResult(null);
    } catch (err: any) {
      console.error('Error adding system:', err);
      setError(err.message || 'Failed to add system. Please check the configuration and try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatLogDetails = (details: any) => {
    if (typeof details === 'string') {
      return details;
    }
    
    if (typeof details === 'object' && details !== null) {
      // Format common log details nicely
      if (details.user_id) {
        return `User: ${details.user_id}`;
      }
      if (details.ip_address) {
        return `IP: ${details.ip_address}`;
      }
      if (details.user_agent) {
        return `User Agent: ${details.user_agent}`;
      }
      if (details.error) {
        return `Error: ${details.error}`;
      }
      
      // For other objects, show key-value pairs
      return Object.entries(details)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    
    return String(details);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">External Systems Integration</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center px-4 py-2 bg-primary-600 text-white rounded-md shadow-sm hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          <span>Connect External System</span>
        </button>
      </div>

      {/* Integration Key Section */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Database className="h-5 w-5 mr-2" />
          Integration Key
        </h2>
        <div className="bg-gray-50 p-4 rounded-md">
          <div className="flex items-center justify-between">
            <code className="text-sm">{integrationKey || 'No integration key found'}</code>
            <button
              onClick={() => copyApiKey(integrationKey)}
              className="p-2 text-gray-400 hover:text-gray-600"
              disabled={!integrationKey}
            >
              {copiedKey === integrationKey ? (
                <Check className="h-5 w-5 text-success-500" />
              ) : (
                <Copy className="h-5 w-5" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            Use this key to authenticate your system with our API.
          </p>
        </div>
      </div>

      {/* Add System Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center">
                <Link className="h-6 w-6 mr-2" />
                Connect External Supabase Database
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="text-sm font-medium text-blue-900 mb-2">📋 Prerequisites</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your external Supabase project must have a <code className="bg-blue-100 px-1 rounded">system_logs</code> table</li>
                <li>• The API key must have read access to the <code className="bg-blue-100 px-1 rounded">system_logs</code> table</li>
                <li>• The system_logs table should contain: <code className="bg-blue-100 px-1 rounded">id, event_type, created_at, details</code></li>
              </ul>
            </div>

            <form onSubmit={handleAddSystem}>
              <div className="space-y-4">
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
                    placeholder="e.g., Patient Monitoring System"
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
                    <option value="Medical Device">Medical Device</option>
                    <option value="Diagnostic">Diagnostic System</option>
                    <option value="Laboratory">Laboratory Equipment</option>
                    <option value="Monitoring">Monitoring System</option>
                    <option value="Database">External Database</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supabase Project URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={newSystem.url}
                    onChange={(e) => setNewSystem({ ...newSystem, url: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="https://your-project.supabase.co"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your Supabase project settings under "API" → "Project URL"
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Supabase Anon Key *
                  </label>
                  <input
                    type="text"
                    required
                    value={newSystem.anon_key}
                    onChange={(e) => setNewSystem({ ...newSystem, anon_key: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your Supabase project settings under "API" → "Project API keys" → "anon public"
                  </p>
                </div>

                {/* Connection Test */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900">Test Connection</h3>
                    <button
                      type="button"
                      onClick={testConnection}
                      disabled={testingConnection || !newSystem.url || !newSystem.anon_key}
                      className="flex items-center px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {testingConnection ? (
                        <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4 mr-1" />
                      )}
                      Test Connection
                    </button>
                  </div>

                  {connectionTestResult && (
                    <div className={`p-3 rounded-md ${
                      connectionTestResult.success 
                        ? 'bg-success-50 border border-success-200' 
                        : 'bg-danger-50 border border-danger-200'
                    }`}>
                      <div className="flex items-center">
                        {connectionTestResult.success ? (
                          <Check className="h-5 w-5 text-success-500 mr-2" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-danger-500 mr-2" />
                        )}
                        <span className={`text-sm ${
                          connectionTestResult.success ? 'text-success-700' : 'text-danger-700'
                        }`}>
                          {connectionTestResult.message}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newSystem.description}
                    onChange={(e) => setNewSystem({ ...newSystem, description: e.target.value })}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Brief description of the system and its purpose"
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-md">
                  <p className="text-sm text-danger-700">{error}</p>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  disabled={loading || !connectionTestResult?.success}
                >
                  {loading ? 'Connecting...' : 'Connect System'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`${
              selectedTab === 'overview'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedTab('activity')}
            className={`${
              selectedTab === 'activity'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Activity Log
          </button>
          <button
            onClick={() => setSelectedTab('documentation')}
            className={`${
              selectedTab === 'documentation'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            Integration Guide
          </button>
        </nav>
      </div>

      {selectedTab === 'overview' ? (
        <div className="space-y-6">
          {/* Systems Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {systems.map((system) => (
              <div
                key={system.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <Server className="h-8 w-8 text-primary-600" />
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{system.name}</h3>
                        <p className="text-sm text-gray-500">{system.type}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full flex items-center ${getStatusColor(
                        system.status
                      )}`}
                    >
                      {system.status === 'active' ? (
                        <Activity className="h-4 w-4 mr-1" />
                      ) : system.status === 'error' ? (
                        <AlertCircle className="h-4 w-4 mr-1" />
                      ) : (
                        <AlertCircle className="h-4 w-4 mr-1" />
                      )}
                      {system.status.charAt(0).toUpperCase() + system.status.slice(1)}
                    </span>
                  </div>

                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500">Project URL</label>
                      <div className="mt-1 flex items-center">
                        <code className="text-sm bg-gray-50 px-3 py-1 rounded-md flex-1 truncate">
                          {system.url}
                        </code>
                        <button
                          onClick={() => copyApiKey(system.url)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          {copiedKey === system.url ? (
                            <Check className="h-5 w-5 text-success-500" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500">API Key</label>
                      <div className="mt-1 flex items-center">
                        <code className="text-sm bg-gray-50 px-3 py-1 rounded-md flex-1">
                          {system.anon_key.substring(0, 20)}...
                        </code>
                        <button
                          onClick={() => copyApiKey(system.anon_key)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                        >
                          {copiedKey === system.anon_key ? (
                            <Check className="h-5 w-5 text-success-500" />
                          ) : (
                            <Copy className="h-5 w-5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-gray-500">Last Sync</label>
                      <p className="text-sm text-gray-900">
                        {new Date(system.last_sync).toLocaleString()}
                      </p>
                    </div>

                    {error && system.status === 'error' && (
                      <div className="bg-danger-50 border border-danger-200 rounded-md p-3">
                        <p className="text-sm text-danger-700">{error}</p>
                      </div>
                    )}

                    <div className="pt-4 flex justify-end space-x-3">
                      <button 
                        onClick={() => {
                          setSelectedSystem(system.id);
                          setSelectedTab('activity');
                        }}
                        className="flex items-center px-3 py-1 text-sm text-gray-700 hover:text-gray-900"
                      >
                        <Activity className="h-4 w-4 mr-1" />
                        View Activity
                      </button>
                      <button 
                        onClick={() => syncSystem(system)}
                        disabled={syncingSystemIds.has(system.id)}
                        className="flex items-center px-3 py-1 text-sm text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <RefreshCw className={`h-4 w-4 mr-1 ${syncingSystemIds.has(system.id) ? 'animate-spin' : ''}`} />
                        Sync Now
                      </button>
                      <button className="flex items-center px-3 py-1 text-sm text-gray-700 hover:text-gray-900">
                        <Settings className="h-4 w-4 mr-1" />
                        Configure
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : selectedTab === 'activity' ? (
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">System Activity Log</h2>
                <div className="flex items-center space-x-4">
                  <select
                    value={selectedSystem || ''}
                    onChange={(e) => setSelectedSystem(e.target.value || null)}
                    className="block w-48 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value="">All Systems</option>
                    {systems.map((system) => (
                      <option key={system.id} value={system.id}>
                        {system.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => selectedSystem ? fetchSystemLogs(selectedSystem) : fetchAllSystemLogs()}
                    disabled={logsLoading}
                    className="flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {logsLoading ? (
                <div className="p-4 text-center text-gray-500">Loading activity logs...</div>
              ) : error ? (
                <div className="p-4">
                  <div className="flex items-center justify-center text-danger-500">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    <span>{error}</span>
                  </div>
                </div>
              ) : systemLogs.length > 0 ? (
                systemLogs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getEventIcon(log.event_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {log.event_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </p>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                        {log.system_id && (
                          <p className="text-xs text-gray-500 mt-1">
                            System: {systems.find(s => s.id === log.system_id)?.name || log.external_systems?.name || 'Unknown'}
                          </p>
                        )}
                        <div className="mt-1">
                          <p className="text-sm text-gray-700">
                            {formatLogDetails(log.details)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Activity Logs Found</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {selectedSystem 
                      ? 'No activity logs found for the selected system. Try syncing the system to fetch the latest logs.'
                      : 'No activity logs found in the system. Connect external systems and sync them to see activity logs here.'
                    }
                  </p>
                  {selectedSystem && (
                    <button
                      onClick={() => {
                        const system = systems.find(s => s.id === selectedSystem);
                        if (system) syncSystem(system);
                      }}
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync System
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">External System Integration Guide</h2>
              
              <div className="prose max-w-none">
                <h3 className="text-base font-medium text-gray-900">🔗 Connecting Your Supabase Database</h3>
                <p className="text-gray-600 mb-4">
                  To connect your external Supabase database, you'll need to ensure it has the required table structure and proper access permissions.
                </p>

                <h4 className="text-sm font-medium text-gray-900 mt-6">📋 Required Table Schema</h4>
                <p className="text-gray-600 mb-4">
                  Your external Supabase project must have a <code className="bg-gray-100 px-1 rounded">system_logs</code> table with the following structure:
                </p>
                <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                  <code>{`CREATE TABLE system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  details jsonb NOT NULL
);

-- Optional: Add index for better performance
CREATE INDEX system_logs_created_at_idx ON system_logs(created_at DESC);`}</code>
                </pre>

                <h4 className="text-sm font-medium text-gray-900 mt-6">🔑 API Key Requirements</h4>
                <p className="text-gray-600 mb-4">
                  The API key you provide must have at least <strong>read access</strong> to the <code className="bg-gray-100 px-1 rounded">system_logs</code> table. You can use either:
                </p>
                <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                  <li><strong>Anon Key</strong>: If your table has proper RLS policies allowing public read access</li>
                  <li><strong>Service Role Key</strong>: For full access (use with caution)</li>
                </ul>

                <h4 className="text-sm font-medium text-gray-900 mt-6">🛡️ Row Level Security (RLS)</h4>
                <p className="text-gray-600 mb-4">
                  If using the anon key, ensure your <code className="bg-gray-100 px-1 rounded">system_logs</code> table has appropriate RLS policies:
                </p>
                <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                  <code>{`-- Enable RLS
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Allow public read access (adjust as needed)
CREATE POLICY "Allow public read access"
ON system_logs
FOR SELECT
TO public
USING (true);`}</code>
                </pre>

                <h4 className="text-sm font-medium text-gray-900 mt-6">📊 Sample Data Format</h4>
                <p className="text-gray-600 mb-4">
                  Here's an example of how your system logs should be structured:
                </p>
                <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                  <code>{JSON.stringify({
                    id: "123e4567-e89b-12d3-a456-426614174000",
                    event_type: "user_login",
                    created_at: "2025-01-15T10:30:00Z",
                    details: {
                      user_id: "user123",
                      ip_address: "192.168.1.1",
                      user_agent: "Mozilla/5.0...",
                      success: true
                    }
                  }, null, 2)}</code>
                </pre>

                <h4 className="text-sm font-medium text-gray-900 mt-6">🔄 Sync Process</h4>
                <p className="text-gray-600 mb-4">
                  Once connected, the system will:
                </p>
                <ol className="list-decimal list-inside text-gray-600 mb-4 space-y-1">
                  <li>Validate the connection and table structure</li>
                  <li>Fetch recent logs from your system_logs table</li>
                  <li>Store them locally for analysis and monitoring</li>
                  <li>Sync periodically to keep data up-to-date</li>
                </ol>

                <h4 className="text-sm font-medium text-gray-900 mt-6">🚨 Troubleshooting</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h5 className="text-sm font-medium text-yellow-800 mb-2">Common Issues:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li><strong>Authentication failed:</strong> Check your API key and ensure it has the correct permissions</li>
                    <li><strong>Table does not exist:</strong> Create the system_logs table with the required schema</li>
                    <li><strong>Connection timeout:</strong> Verify your project URL and ensure the project is online</li>
                    <li><strong>No data synced:</strong> Check RLS policies and ensure there are records in the table</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalSystems;