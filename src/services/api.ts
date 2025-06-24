import { supabase } from '../lib/supabase';

export interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  status: 'online' | 'offline' | 'warning';
  last_active: string;
  location: string;
  telemetry_data: Record<string, any>;
}

export interface Threat {
  threat_id: string;
  threat_type: string;
  description: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  is_resolved: boolean;
  device_id: string;
}

export interface Alert {
  alert_id: string;
  threat_id: string;
  alert_type: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  user_id: string;
  created_at: string;
}

export interface Report {
  report_id: string;
  generated_by: string;
  timestamp: string;
  report_data: any;
  created_at: string;
}

export interface SystemLog {
  id: string;
  system_id?: string;
  event_type: string;
  user_id?: string;
  timestamp: string;
  details: any;
  created_at: string;
}

export interface ExternalSystem {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  description?: string;
  last_sync: string;
  created_at: string;
}

export const api = {
  devices: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Device[];
    },

    sendTelemetry: async (deviceId: string, telemetryData: any) => {
      // First, send telemetry to the AI analyzer
      const aiResponse = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/threat-analyzer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: deviceId,
          metrics: telemetryData,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!aiResponse.ok) {
        throw new Error('Failed to analyze telemetry data');
      }

      const aiAnalysis = await aiResponse.json();

      // Then, update device telemetry
      const { error: updateError } = await supabase
        .from('devices')
        .update({
          telemetry_data: telemetryData,
          last_active: new Date().toISOString(),
          status: aiAnalysis.threat_detected ? 'warning' : 'online'
        })
        .eq('device_id', deviceId);

      if (updateError) throw updateError;

      return aiAnalysis;
    }
  },

  threats: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('threats')
        .select('*, devices(device_name)')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data as (Threat & { devices: { device_name: string } })[];
    }
  },

  alerts: {
    getRecent: async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*, threats(*)')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data as (Alert & { threats: Threat })[];
    },

    update: async (alertId: string, status: 'acknowledged' | 'resolved') => {
      const { error } = await supabase
        .from('alerts')
        .update({ status })
        .eq('alert_id', alertId);

      if (error) throw error;
    }
  },

  reports: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*, users(username)')
        .order('timestamp', { ascending: false });
      
      if (error) throw error;
      return data as (Report & { users: { username: string } })[];
    },

    generate: async (type: string, params: any) => {
      const { data, error } = await supabase
        .from('reports')
        .insert([
          {
            report_data: {
              type,
              params,
              generated_at: new Date().toISOString()
            }
          }
        ])
        .select();

      if (error) throw error;
      return data[0] as Report;
    },

    downloadSystemLogs: async (systemId?: string, startDate?: string, endDate?: string) => {
      let query = supabase
        .from('system_logs')
        .select('*, external_systems(name)')
        .order('created_at', { ascending: false });

      if (systemId) {
        query = query.eq('system_id', systemId);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      // Convert to CSV format
      const logs = data as (SystemLog & { external_systems?: { name: string } })[];
      const csvHeaders = ['Timestamp', 'System', 'Event Type', 'User ID', 'Details'];
      const csvRows = logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.external_systems?.name || 'Unknown',
        log.event_type,
        log.user_id || '',
        JSON.stringify(log.details)
      ]);

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `system-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return logs;
    }
  },

  systemLogs: {
    getAll: async (systemId?: string, limit: number = 100) => {
      let query = supabase
        .from('system_logs')
        .select('*, external_systems(name)')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (systemId) {
        query = query.eq('system_id', systemId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as (SystemLog & { external_systems?: { name: string } })[];
    },

    analyzeForThreats: async (logs: SystemLog[]) => {
      // Analyze logs for suspicious patterns
      const threats = [];
      const suspiciousPatterns = [
        { pattern: /failed.*login/i, severity: 'medium', type: 'Authentication Failure' },
        { pattern: /unauthorized.*access/i, severity: 'high', type: 'Unauthorized Access' },
        { pattern: /admin.*login/i, severity: 'medium', type: 'Admin Access' },
        { pattern: /error.*database/i, severity: 'high', type: 'Database Error' },
        { pattern: /connection.*refused/i, severity: 'medium', type: 'Connection Issue' },
        { pattern: /timeout/i, severity: 'low', type: 'Timeout Event' }
      ];

      for (const log of logs) {
        const logText = JSON.stringify(log.details).toLowerCase();
        
        for (const { pattern, severity, type } of suspiciousPatterns) {
          if (pattern.test(logText)) {
            threats.push({
              log_id: log.id,
              threat_type: type,
              severity,
              timestamp: log.created_at,
              description: `Suspicious activity detected in ${log.event_type}: ${logText.substring(0, 100)}...`,
              system_id: log.system_id
            });
          }
        }
      }

      return threats;
    }
  },

  externalSystems: {
    getAll: async () => {
      const { data, error } = await supabase
        .from('external_systems')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as ExternalSystem[];
    }
  }
};