import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";
import { Configuration, OpenAIApi } from "npm:openai@4.28.0";

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openaiApiKey = "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";

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const openai = new OpenAIApi(new Configuration({ apiKey: openaiApiKey }));

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
    [key: string]: number;
  };
  timestamp: string;
}

async function analyzeThreatWithAI(telemetry: TelemetryData, deviceInfo: any) {
  const prompt = `Analyze this medical device telemetry data for potential security threats:

Device Type: ${deviceInfo.device_type}
Device Name: ${deviceInfo.device_name}
Location: ${deviceInfo.location}

Telemetry Metrics:
- CPU Usage: ${telemetry.metrics.cpu_usage}%
- Memory Usage: ${telemetry.metrics.memory_usage}%
- Network Traffic: ${telemetry.metrics.network_traffic} MB/s
- Error Rate: ${telemetry.metrics.error_rate}%

Based on this data, identify any potential security threats or anomalies. Consider:
1. Resource usage patterns
2. Network behavior
3. Error patterns
4. Known attack vectors for medical devices

Provide a JSON response with:
- threat_detected (boolean)
- threat_type (string, if detected)
- severity_level (low, medium, high, critical)
- description (detailed explanation)
- recommended_actions (array of strings)`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a medical device security expert analyzing telemetry data for potential threats. Provide analysis in JSON format only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    if (analysis.threat_detected) {
      // Create threat record
      const { error: threatError } = await supabase
        .from('threats')
        .insert({
          device_id: telemetry.device_id,
          threat_type: analysis.threat_type,
          description: analysis.description,
          severity_level: analysis.severity_level,
          is_resolved: false
        });

      if (threatError) throw threatError;
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing threat with AI:', error);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const telemetryData: TelemetryData = await req.json();

    // Get device info
    const { data: deviceData, error: deviceError } = await supabase
      .from('devices')
      .select('*')
      .eq('device_id', telemetryData.device_id)
      .single();

    if (deviceError) throw deviceError;

    const analysis = await analyzeThreatWithAI(telemetryData, deviceData);

    return new Response(
      JSON.stringify(analysis),
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