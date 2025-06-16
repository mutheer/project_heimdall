import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Integration-Key',
};

interface TelemetryData {
  device_id: string;
  metrics: {
    [key: string]: number | string | boolean;
  };
  timestamp: string;
}

interface IntegrationRequest {
  integration_key: string;
  action: 'telemetry' | 'register_device' | 'get_threats';
  data: TelemetryData | any;
}

async function validateIntegrationKey(key: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'integration_keys')
      .single();

    if (error) throw error;
    
    const validKeys = data.setting_value as string[];
    return validKeys.includes(key);
  } catch (err) {
    console.error('Error validating integration key:', err);
    return false;
  }
}

async function handleTelemetryData(data: TelemetryData) {
  try {
    // Update device telemetry
    const { error: deviceError } = await supabase
      .from('devices')
      .update({
        telemetry_data: data.metrics,
        last_active: data.timestamp,
        status: 'online'
      })
      .eq('device_id', data.device_id);

    if (deviceError) throw deviceError;

    // Analyze for threats
    const threats = await analyzeTelemetryForThreats(data);
    
    if (threats.length > 0) {
      // Create threat records
      const { error: threatError } = await supabase
        .from('threats')
        .insert(threats.map(threat => ({
          device_id: data.device_id,
          threat_type: threat.type,
          description: threat.description,
          severity_level: threat.severity,
          is_resolved: false
        })));

      if (threatError) throw threatError;
    }

    return { success: true, threats };
  } catch (error) {
    console.error('Error processing telemetry:', error);
    throw error;
  }
}

async function analyzeTelemetryForThreats(telemetry: TelemetryData) {
  const threats = [];
  const { metrics } = telemetry;

  // Get threat rules from database
  const { data: rules, error } = await supabase
    .from('threat_database')
    .select('*');

  if (error) throw error;

  // Apply each rule to the metrics
  for (const rule of rules) {
    try {
      const ruleFunction = new Function('metrics', rule.rule_logic);
      const result = ruleFunction(metrics);
      
      if (result.detected) {
        threats.push({
          type: rule.rule_name,
          description: result.description,
          severity: result.severity
        });
      }
    } catch (err) {
      console.error(`Error applying rule ${rule.rule_name}:`, err);
    }
  }

  return threats;
}

async function registerDevice(deviceData: any) {
  try {
    // First, check if device already exists
    const { data: existingDevice } = await supabase
      .from('devices')
      .select('device_id')
      .eq('device_name', deviceData.device_name)
      .maybeSingle();

    if (existingDevice) {
      return { success: true, device: existingDevice, message: 'Device already registered' };
    }

    // Register new device
    const { data, error } = await supabase
      .from('devices')
      .insert([{
        device_name: deviceData.device_name,
        device_type: deviceData.device_type,
        status: 'online',
        location: deviceData.location,
        telemetry_data: deviceData.initial_metrics || {}
      }])
      .select()
      .single();

    if (error) throw error;

    // Create initial log entry
    await supabase
      .from('logs')
      .insert([{
        device_id: data.device_id,
        log_type: 'registration',
        log_data: {
          event: 'device_registered',
          details: deviceData
        }
      }]);

    return { success: true, device: data, message: 'Device registered successfully' };
  } catch (error) {
    console.error('Error registering device:', error);
    throw error;
  }
}

async function getRecentThreats(deviceId?: string) {
  try {
    let query = supabase
      .from('threats')
      .select('*, devices(device_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return { success: true, threats: data };
  } catch (error) {
    console.error('Error fetching threats:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const integrationKey = req.headers.get('X-Integration-Key');
    if (!integrationKey) {
      throw new Error('Missing integration key');
    }

    const isValidKey = await validateIntegrationKey(integrationKey);
    if (!isValidKey) {
      throw new Error('Invalid integration key');
    }

    const request: IntegrationRequest = await req.json();
    let response;

    switch (request.action) {
      case 'telemetry':
        response = await handleTelemetryData(request.data);
        break;
      case 'register_device':
        response = await registerDevice(request.data);
        break;
      case 'get_threats':
        response = await getRecentThreats(request.data?.device_id);
        break;
      default:
        throw new Error('Invalid action');
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error.message
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});