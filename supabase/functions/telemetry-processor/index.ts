import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.39.7';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

interface TelemetryData {
  device_id: string;
  metrics: {
    cpu_usage: number;
    memory_usage: number;
    network_traffic: number;
    error_rate: number;
  };
  timestamp: string;
}

async function processTelemetryData(telemetryData: TelemetryData) {
  try {
    // 1. Update device telemetry data
    const { error: deviceError } = await supabase
      .from('devices')
      .update({
        telemetry_data: telemetryData.metrics,
        last_active: telemetryData.timestamp,
        status: 'online'
      })
      .eq('device_id', telemetryData.device_id);

    if (deviceError) throw deviceError;

    // 2. Analyze for threats
    const threats = await detectThreats(telemetryData);
    
    if (threats.length > 0) {
      // 3. Create threat records
      const { error: threatError } = await supabase
        .from('threats')
        .insert(threats.map(threat => ({
          device_id: telemetryData.device_id,
          threat_type: threat.type,
          description: threat.description,
          severity_level: threat.severity,
          is_resolved: false
        })));

      if (threatError) throw threatError;

      // 4. Generate alerts for detected threats
      await generateAlerts(threats);
    }

    return { success: true, threats };
  } catch (error) {
    console.error('Error processing telemetry:', error);
    throw error;
  }
}

async function detectThreats(telemetry: TelemetryData) {
  const threats = [];
  const { metrics } = telemetry;

  // CPU Usage Threat Detection
  if (metrics.cpu_usage > 90) {
    threats.push({
      type: 'High CPU Usage',
      description: `Abnormal CPU usage detected: ${metrics.cpu_usage}%`,
      severity: 'high'
    });
  }

  // Memory Usage Threat Detection
  if (metrics.memory_usage > 85) {
    threats.push({
      type: 'Memory Exhaustion',
      description: `Critical memory usage detected: ${metrics.memory_usage}%`,
      severity: 'critical'
    });
  }

  // Network Traffic Anomaly Detection
  if (metrics.network_traffic > 1000) {
    threats.push({
      type: 'Network Anomaly',
      description: 'Unusual network traffic pattern detected',
      severity: 'medium'
    });
  }

  // Error Rate Analysis
  if (metrics.error_rate > 5) {
    threats.push({
      type: 'High Error Rate',
      description: `Elevated error rate detected: ${metrics.error_rate}%`,
      severity: 'high'
    });
  }

  return threats;
}

async function generateAlerts(threats: any[]) {
  try {
    const alerts = threats.map(threat => ({
      alert_type: threat.type,
      status: 'pending',
      created_at: new Date().toISOString()
    }));

    const { error: alertError } = await supabase
      .from('alerts')
      .insert(alerts);

    if (alertError) throw alertError;
  } catch (error) {
    console.error('Error generating alerts:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const telemetryData: TelemetryData = await req.json();
    const result = await processTelemetryData(telemetryData);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});