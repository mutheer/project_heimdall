import React, { useState, useEffect } from 'react';
import { Server, Activity, AlertCircle, Check, Copy, Code, Settings, RefreshCw, X, Plus, Clock, AlertTriangle, Shield, Database, Link, Download, FileText, Bell } from 'lucide-react';
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
  user_id?: string;
  timestamp?: string;
}

interface ThreatAlert {
  id: string;
  system_name: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: string;
  details: any;
}

const ExternalSystems: React.FC = () => {
  const [systems, setSystems] = useState<ExternalSystem[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'documentation' | 'activity' | 'reports' | 'alerts'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [threatAlerts, setThreatAlerts] = useState<ThreatAlert[]>([]);
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
        fetchExternalSystemLogs(selectedSystem);
      } else {
        fetchAllExternalSystemLogs();
      }
    } else if (selectedTab === 'alerts') {
      fetchThreatAlerts();
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

  const fetchExternalSystemLogs = async (systemId: string) => {
    setLogsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching logs for external system:', systemId);
      
      // Find the system details
      const system = systems.find(s => s.id === systemId);
      if (!system) {
        throw new Error('System not found');
      }

      console.log('Connecting to external system:', system.url);
      
      // Create client for external system
      const externalSupabase = createClient(system.url, system.anon_key);
      
      // Fetch logs directly from external system's system_logs table
      const { data: externalLogs, error: logsError } = await externalSupabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching logs from external system:', logsError);
        throw new Error(`Failed to fetch logs from external system: ${logsError.message}`);
      }

      console.log('Fetched logs from external system:', externalLogs?.length || 0);
      
      // Transform logs to match our interface
      const transformedLogs: SystemLog[] = (externalLogs || []).map(log => ({
        id: log.id,
        event_type: log.event_type,
        created_at: log.created_at,
        details: log.details,
        user_id: log.user_id,
        timestamp: log.timestamp || log.created_at
      }));

      setSystemLogs(transformedLogs);
      
      // Analyze logs for threats
      await analyzeThreatPatterns(transformedLogs, system);
      
      if (transformedLogs.length === 0) {
        console.log('No logs found in external system');
      }
    } catch (err: any) {
      console.error('Error fetching external system logs:', err);
      setError(err.message || 'Failed to fetch logs from external system');
      setSystemLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchAllExternalSystemLogs = async () => {
    setLogsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching logs from all external systems');
      
      const allLogs: (SystemLog & { system_name: string })[] = [];
      
      // Fetch logs from each external system
      for (const system of systems) {
        try {
          console.log(`Fetching logs from ${system.name}...`);
          
          const externalSupabase = createClient(system.url, system.anon_key);
          
          const { data: externalLogs, error: logsError } = await externalSupabase
            .from('system_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Limit per system to avoid too much data

          if (logsError) {
            console.warn(`Failed to fetch logs from ${system.name}:`, logsError.message);
            continue; // Skip this system and continue with others
          }

          // Transform and add system name
          const transformedLogs = (externalLogs || []).map(log => ({
            id: `${system.id}-${log.id}`, // Prefix with system ID to avoid conflicts
            event_type: log.event_type,
            created_at: log.created_at,
            details: log.details,
            user_id: log.user_id,
            timestamp: log.timestamp || log.created_at,
            system_name: system.name
          }));

          allLogs.push(...transformedLogs);
          console.log(`Fetched ${transformedLogs.length} logs from ${system.name}`);
          
          // Analyze logs for threats
          await analyzeThreatPatterns(transformedLogs, system);
        } catch (systemError) {
          console.warn(`Error fetching logs from ${system.name}:`, systemError);
          continue;
        }
      }
      
      // Sort all logs by created_at
      allLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setSystemLogs(allLogs);
      console.log(`Total logs fetched: ${allLogs.length}`);
      
    } catch (err: any) {
      console.error('Error fetching all external system logs:', err);
      setError(err.message || 'Failed to fetch logs from external systems');
      setSystemLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const analyzeThreatPatterns = async (logs: SystemLog[], system: ExternalSystem) => {
    const threats: ThreatAlert[] = [];
    
    logs.forEach(log => {
      const eventType = log.event_type.toLowerCase();
      const details = log.details || {};
      
      // Detect suspicious login attempts
      if (eventType.includes('login') || eventType.includes('signin')) {
        // Multiple failed login attempts
        if (details.success === false || eventType.includes('failed')) {
          threats.push({
            id: `threat-${log.id}`,
            system_name: system.name,
            event_type: 'Suspicious Login Attempt',
            severity: 'high',
            description: `Failed login attempt detected from ${details.ip_address || 'unknown IP'}`,
            timestamp: log.created_at,
            details: log.details
          });
        }
        
        // Login from unusual location or IP
        if (details.ip_address && !isKnownIP(details.ip_address)) {
          threats.push({
            id: `threat-geo-${log.id}`,
            system_name: system.name,
            event_type: 'Unusual Access Location',
            severity: 'medium',
            description: `Login from unusual IP address: ${details.ip_address}`,
            timestamp: log.created_at,
            details: log.details
          });
        }
      }
      
      // Detect privilege escalation attempts
      if (eventType.includes('admin') || eventType.includes('privilege') || eventType.includes('role')) {
        threats.push({
          id: `threat-priv-${log.id}`,
          system_name: system.name,
          event_type: 'Privilege Escalation Attempt',
          severity: 'critical',
          description: `Potential privilege escalation detected: ${log.event_type}`,
          timestamp: log.created_at,
          details: log.details
        });
      }
      
      // Detect data access patterns
      if (eventType.includes('select') || eventType.includes('query') || eventType.includes('export')) {
        const userAgent = details.user_agent || '';
        if (userAgent.includes('bot') || userAgent.includes('crawler') || userAgent.includes('script')) {
          threats.push({
            id: `threat-bot-${log.id}`,
            system_name: system.name,
            event_type: 'Automated Data Access',
            severity: 'medium',
            description: `Automated access detected from: ${userAgent}`,
            timestamp: log.created_at,
            details: log.details
          });
        }
      }
      
      // Detect unusual time access
      const logTime = new Date(log.created_at);
      const hour = logTime.getHours();
      if (hour < 6 || hour > 22) { // Outside business hours
        threats.push({
          id: `threat-time-${log.id}`,
          system_name: system.name,
          event_type: 'Off-Hours Access',
          severity: 'low',
          description: `System access detected outside business hours at ${logTime.toLocaleTimeString()}`,
          timestamp: log.created_at,
          details: log.details
        });
      }
    });
    
    // Store threats in database for persistence
    if (threats.length > 0) {
      await storeThreatAlerts(threats);
    }
  };

  const isKnownIP = (ip: string): boolean => {
    // Simple IP whitelist - in production, this would be more sophisticated
    const knownIPs = ['127.0.0.1', '::1', '192.168.', '10.0.', '172.16.'];
    return knownIPs.some(knownIP => ip.startsWith(knownIP));
  };

  const storeThreatAlerts = async (threats: ThreatAlert[]) => {
    try {
      // Store in threats table
      const threatRecords = threats.map(threat => ({
        threat_type: threat.event_type,
        description: threat.description,
        severity_level: threat.severity,
        timestamp: threat.timestamp,
        is_resolved: false,
        device_id: null // External system threats don't have device_id
      }));

      const { error } = await supabase
        .from('threats')
        .insert(threatRecords);

      if (error) {
        console.error('Error storing threat alerts:', error);
      } else {
        console.log(`Stored ${threats.length} threat alerts`);
      }
    } catch (err) {
      console.error('Error storing threat alerts:', err);
    }
  };

  const fetchThreatAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('threats')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(100);

      if (error) throw error;

      const alerts: ThreatAlert[] = (data || []).map(threat => ({
        id: threat.threat_id,
        system_name: 'External System',
        event_type: threat.threat_type,
        severity: threat.severity_level as 'low' | 'medium' | 'high' | 'critical',
        description: threat.description,
        timestamp: threat.timestamp,
        details: {}
      }));

      setThreatAlerts(alerts);
    } catch (err) {
      console.error('Error fetching threat alerts:', err);
    }
  };

  const downloadSystemLogsReport = async () => {
    try {
      const reportData = {
        title: 'External Systems Activity Report',
        generated_at: new Date().toISOString(),
        systems: systems.map(system => ({
          name: system.name,
          type: system.type,
          status: system.status,
          last_sync: system.last_sync
        })),
        logs: systemLogs.map(log => ({
          event_type: log.event_type,
          timestamp: log.created_at,
          user_id: log.user_id,
          details: log.details
        })),
        summary: {
          total_systems: systems.length,
          active_systems: systems.filter(s => s.status === 'active').length,
          total_logs: systemLogs.length,
          unique_events: [...new Set(systemLogs.map(l => l.event_type))].length
        }
      };

      // Create CSV content
      const csvContent = generateCSVReport(reportData);
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `external-systems-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Also store in database
      await supabase.from('reports').insert({
        report_data: reportData,
        export_format: 'csv'
      });

    } catch (err) {
      console.error('Error generating report:', err);
      setError('Failed to generate report');
    }
  };

  const downloadThreatAlertsReport = async () => {
    try {
      const reportData = {
        title: 'Threat Alerts Report',
        generated_at: new Date().toISOString(),
        alerts: threatAlerts,
        summary: {
          total_alerts: threatAlerts.length,
          critical_alerts: threatAlerts.filter(a => a.severity === 'critical').length,
          high_alerts: threatAlerts.filter(a => a.severity === 'high').length,
          medium_alerts: threatAlerts.filter(a => a.severity === 'medium').length,
          low_alerts: threatAlerts.filter(a => a.severity === 'low').length
        }
      };

      // Create CSV content for threats
      const csvContent = generateThreatCSVReport(reportData);
      
      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `threat-alerts-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error generating threat report:', err);
      setError('Failed to generate threat report');
    }
  };

  const generateCSVReport = (data: any): string => {
    const headers = ['Timestamp', 'Event Type', 'User ID', 'System', 'Details'];
    const rows = data.logs.map((log: any) => [
      log.timestamp,
      log.event_type,
      log.user_id || '',
      (log as any).system_name || 'Unknown',
      JSON.stringify(log.details).replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
  };

  const generateThreatCSVReport = (data: any): string => {
    const headers = ['Timestamp', 'Event Type', 'Severity', 'System', 'Description'];
    const rows = data.alerts.map((alert: ThreatAlert) => [
      alert.timestamp,
      alert.event_type,
      alert.severity,
      alert.system_name,
      alert.description.replace(/"/g, '""')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row: any[]) => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    return csvContent;
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

      // Update system status to active since connection is working
      await supabase
        .from('external_systems')
        .update({
          last_sync: new Date().toISOString(),
          status: 'active'
        })
        .eq('id', system.id);

      await fetchSystems();
      
      // Refresh logs if we're viewing this system or all systems
      if (selectedTab === 'activity') {
        if (selectedSystem === system.id) {
          await fetchExternalSystemLogs(system.id);
        } else if (!selectedSystem) {
          await fetchAllExternalSystemLogs();
        }
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error syncing system:', err);
      if (!isBackgroundSync) {
        setError(err.message || 'Failed to sync system. Please check the system configuration and try again.');
      }
      
      // Update system status to error
      await supabase
        .from('external_systems')
        .update({
          last_sync: new Date().toISOString(),
          status: 'error'
        })
        .eq('id', system.id);
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
    // Only copy first 20 characters for security
    const maskedKey = key.substring(0, 20) + '...';
    navigator.clipboard.writeText(maskedKey);
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
            <code className="text-sm">{integrationKey ? '••••••••••••••••••••' : 'No integration key found'}</code>
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
                    type="password"
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
            onClick={() => setSelectedTab('alerts')}
            className={`${
              selectedTab === 'alerts'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <Bell className="h-4 w-4 mr-1" />
            Threat Alerts
          </button>
          <button
            onClick={() => setSelectedTab('reports')}
            className={`${
              selectedTab === 'reports'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
          >
            <FileText className="h-4 w-4 mr-1" />
            Reports
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
                          ••••••••••••••••••••
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
                    onClick={() => selectedSystem ? fetchExternalSystemLogs(selectedSystem) : fetchAllExternalSystemLogs()}
                    disabled={logsLoading}
                    className="flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${logsLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                  <button
                    onClick={downloadSystemLogsReport}
                    className="flex items-center px-3 py-2 text-sm bg-success-600 text-white rounded-md hover:bg-success-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Report
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
                        {(log as any).system_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            System: {(log as any).system_name}
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
                      ? 'No activity logs found in the selected external system. The system may not have any logs yet or the system_logs table may be empty.'
                      : 'No activity logs found in any connected external systems. Connect external systems and ensure they have data in their system_logs tables.'
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
      ) : selectedTab === 'alerts' ? (
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900 flex items-center">
                  <Bell className="h-5 w-5 mr-2" />
                  Threat Alerts
                </h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={fetchThreatAlerts}
                    className="flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </button>
                  <button
                    onClick={downloadThreatAlertsReport}
                    className="flex items-center px-3 py-2 text-sm bg-danger-600 text-white rounded-md hover:bg-danger-700"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Report
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-gray-200">
              {threatAlerts.length > 0 ? (
                threatAlerts.map((alert) => (
                  <div key={alert.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <AlertTriangle className={`h-5 w-5 ${
                          alert.severity === 'critical' ? 'text-danger-500' :
                          alert.severity === 'high' ? 'text-warning-500' :
                          alert.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900">{alert.event_type}</p>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(alert.severity)}`}>
                              {alert.severity.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(alert.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          System: {alert.system_name}
                        </p>
                        <div className="mt-1">
                          <p className="text-sm text-gray-700">{alert.description}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Threat Alerts</h3>
                  <p className="text-sm text-gray-500">
                    No security threats have been detected from external systems.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : selectedTab === 'reports' ? (
        <div className="space-y-6">
          <div className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                System Reports
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-base font-medium text-gray-900 mb-2">Activity Logs Report</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a comprehensive report of all system activity logs from connected external systems.
                  </p>
                  <button
                    onClick={downloadSystemLogsReport}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Report
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-base font-medium text-gray-900 mb-2">Threat Alerts Report</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Download a detailed report of all detected security threats and alerts.
                  </p>
                  <button
                    onClick={downloadThreatAlertsReport}
                    className="flex items-center px-4 py-2 bg-danger-600 text-white rounded-md hover:bg-danger-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Report
                  </button>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
                <h4 className="text-sm font-medium text-blue-900 mb-2">📊 Report Contents</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li><strong>Activity Logs:</strong> Event types, timestamps, user IDs, system details, and event metadata</li>
                  <li><strong>Threat Alerts:</strong> Threat types, severity levels, descriptions, affected systems, and detection timestamps</li>
                  <li><strong>Format:</strong> CSV files compatible with Excel, Google Sheets, and data analysis tools</li>
                  <li><strong>Data Range:</strong> All available data from connected external systems</li>
                </ul>
              </div>
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
  details jsonb NOT NULL,
  user_id text,
  timestamp timestamptz
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

                <h4 className="text-sm font-medium text-gray-900 mt-6">🔄 How It Works</h4>
                <p className="text-gray-600 mb-4">
                  Once connected, the system will:
                </p>
                <ol className="list-decimal list-inside text-gray-600 mb-4 space-y-1">
                  <li>Connect directly to your external Supabase database</li>
                  <li>Query the system_logs table in real-time</li>
                  <li>Display logs without storing them locally</li>
                  <li>Validate connection and table structure</li>
                  <li>Analyze logs for security threats and suspicious activities</li>
                  <li>Generate alerts for potential security incidents</li>
                </ol>

                <h4 className="text-sm font-medium text-gray-900 mt-6">🚨 Threat Detection</h4>
                <p className="text-gray-600 mb-4">
                  The system automatically analyzes logs for:
                </p>
                <ul className="list-disc list-inside text-gray-600 mb-4 space-y-1">
                  <li><strong>Failed Login Attempts:</strong> Multiple failed authentication attempts</li>
                  <li><strong>Unusual Access Patterns:</strong> Logins from unknown IP addresses or locations</li>
                  <li><strong>Privilege Escalation:</strong> Attempts to gain administrative access</li>
                  <li><strong>Automated Access:</strong> Bot or script-based system access</li>
                  <li><strong>Off-Hours Activity:</strong> System access outside business hours</li>
                </ul>

                <h4 className="text-sm font-medium text-gray-900 mt-6">🚨 Troubleshooting</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                  <h5 className="text-sm font-medium text-yellow-800 mb-2">Common Issues:</h5>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    <li><strong>Authentication failed:</strong> Check your API key and ensure it has the correct permissions</li>
                    <li><strong>Table does not exist:</strong> Create the system_logs table with the required schema</li>
                    <li><strong>Connection timeout:</strong> Verify your project URL and ensure the project is online</li>
                    <li><strong>No data displayed:</strong> Check RLS policies and ensure there are records in the table</li>
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