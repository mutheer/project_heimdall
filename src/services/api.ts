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
    }
  }
};