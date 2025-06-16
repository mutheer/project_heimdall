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

interface MonitoringData {
  system_id: string;
  url: string;
  anon_key: string;
}

async function validateExternalSystem(url: string, anon_key: string): Promise<{ valid: boolean; error?: string }> {
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
        error: 'The system_logs table does not exist in the external system.' 
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
}

async function monitorSystem(data: MonitoringData) {
  try {
    // Validate the connection first
    const validation = await validateExternalSystem(data.url, data.anon_key);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const externalSupabase = createClient(data.url, data.anon_key);

    // Get the last sync timestamp
    const { data: lastSync } = await supabase
      .from('external_systems')
      .select('last_sync')
      .eq('id', data.system_id)
      .single();

    // Fetch logs from the external system
    let query = externalSupabase
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // If we have a last sync timestamp, only get newer logs
    if (lastSync?.last_sync) {
      query = query.gt('created_at', lastSync.last_sync);
    }

    const { data: externalLogs, error: logsError } = await query.limit(100);

    if (logsError) {
      throw new Error(`Failed to fetch logs from external system: ${logsError.message}`);
    }

    // Store the logs in our system
    if (externalLogs && externalLogs.length > 0) {
      const { error: insertError } = await supabase
        .from('system_logs')
        .insert(externalLogs.map(log => ({
          ...log,
          system_id: data.system_id
        })));

      if (insertError) {
        throw new Error(`Failed to store external logs: ${insertError.message}`);
      }
    }

    // Update system status
    const { error: updateError } = await supabase
      .from('external_systems')
      .update({
        last_sync: new Date().toISOString(),
        status: 'active'
      })
      .eq('id', data.system_id);

    if (updateError) {
      throw new Error(`Failed to update system status: ${updateError.message}`);
    }

    return {
      success: true,
      logs_count: externalLogs?.length || 0,
      last_sync: new Date().toISOString()
    };
  } catch (error: any) {
    // Update system status to error
    await supabase
      .from('external_systems')
      .update({
        last_sync: new Date().toISOString(),
        status: 'error'
      })
      .eq('id', data.system_id);

    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const integrationKey = req.headers.get('X-Integration-Key');
    if (!integrationKey) {
      throw new Error('Missing integration key');
    }

    // Verify integration key
    const { data: settings, error: keyError } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'integration_keys')
      .single();

    if (keyError || !settings?.setting_value?.includes(integrationKey)) {
      throw new Error('Invalid integration key');
    }

    const data: MonitoringData = await req.json();
    const result = await monitorSystem(data);

    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error: any) {
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