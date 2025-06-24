const OPENAI_API_KEY = "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";

export interface AIAnalysisResult {
  threats: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
    confidence: number;
  }>;
  summary: string;
  riskScore: number;
  immediateActions: string[];
}

export interface DatabaseAnalysisResult {
  status: 'healthy' | 'warning' | 'critical';
  issues: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    solution: string;
  }>;
  performance: {
    connectionHealth: number;
    tableAccessibility: number;
    authenticationStatus: number;
  };
  recommendations: string[];
}

export interface SystemLogAnalysis {
  suspiciousActivities: Array<{
    timestamp: string;
    activity: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    sourceSystem: string;
    recommendation: string;
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    significance: string;
  }>;
  securityScore: number;
  alertsGenerated: number;
}

class OpenAIService {
  private apiKey: string;
  private baseURL: string = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = OPENAI_API_KEY;
  }

  private async makeRequest(endpoint: string, data: any) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OpenAI API request failed:', error);
      throw error;
    }
  }

  async analyzeSystemLogs(logs: any[], systemInfo?: any): Promise<SystemLogAnalysis> {
    const prompt = `
You are a cybersecurity expert analyzing system logs from a medical IoT security platform called Heimdall AI. 

SYSTEM CONTEXT:
- Healthcare facility in Botswana
- Medical IoT devices (ECG monitors, patient monitors, diagnostic equipment)
- External system integrations
- Critical patient safety requirements

LOGS TO ANALYZE:
${JSON.stringify(logs.slice(0, 50), null, 2)}

SYSTEM INFO:
${systemInfo ? JSON.stringify(systemInfo, null, 2) : 'No additional system info provided'}

Please analyze these logs for:
1. Security threats and suspicious activities
2. Unauthorized access attempts
3. System vulnerabilities
4. Unusual patterns or anomalies
5. Potential data breaches
6. Medical device security issues

For each suspicious activity found, provide:
- Timestamp
- Activity description
- Risk level (low/medium/high/critical)
- Detailed explanation
- Source system
- Recommended action

Also identify patterns and calculate an overall security score (0-100).

Respond in JSON format:
{
  "suspiciousActivities": [
    {
      "timestamp": "ISO timestamp",
      "activity": "Brief activity description",
      "riskLevel": "low|medium|high|critical",
      "description": "Detailed explanation of the threat",
      "sourceSystem": "System name or ID",
      "recommendation": "Specific action to take"
    }
  ],
  "patterns": [
    {
      "pattern": "Pattern description",
      "frequency": number,
      "significance": "Why this pattern matters"
    }
  ],
  "securityScore": number (0-100),
  "alertsGenerated": number
}`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert specializing in healthcare IoT security. Analyze logs and respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Error analyzing system logs:', error);
      // Return fallback analysis
      return {
        suspiciousActivities: [],
        patterns: [],
        securityScore: 50,
        alertsGenerated: 0
      };
    }
  }

  async analyzeDatabaseStatus(dbStatus: any): Promise<DatabaseAnalysisResult> {
    const prompt = `
You are a database administrator and security expert analyzing the health of a medical IoT security system database.

DATABASE STATUS DATA:
${JSON.stringify(dbStatus, null, 2)}

Please analyze:
1. Connection health and stability
2. Table accessibility and permissions
3. Authentication system status
4. Performance indicators
5. Security vulnerabilities
6. Data integrity issues

Provide recommendations for:
- Immediate fixes needed
- Performance optimizations
- Security improvements
- Monitoring enhancements

Respond in JSON format:
{
  "status": "healthy|warning|critical",
  "issues": [
    {
      "type": "Issue category",
      "severity": "low|medium|high|critical",
      "description": "Detailed issue description",
      "solution": "Specific solution steps"
    }
  ],
  "performance": {
    "connectionHealth": number (0-100),
    "tableAccessibility": number (0-100),
    "authenticationStatus": number (0-100)
  },
  "recommendations": ["List of recommendations"]
}`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a database expert specializing in healthcare systems. Analyze database status and respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1500
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Error analyzing database status:', error);
      // Return fallback analysis
      return {
        status: 'warning',
        issues: [],
        performance: {
          connectionHealth: 75,
          tableAccessibility: 80,
          authenticationStatus: 85
        },
        recommendations: ['Unable to perform detailed analysis. Please check system connectivity.']
      };
    }
  }

  async analyzeSecurityThreats(threats: any[], devices: any[], alerts: any[]): Promise<AIAnalysisResult> {
    const prompt = `
You are a cybersecurity expert analyzing threats in a medical IoT security system for a healthcare facility in Botswana.

CURRENT THREATS:
${JSON.stringify(threats.slice(0, 20), null, 2)}

DEVICE STATUS:
${JSON.stringify(devices.slice(0, 20), null, 2)}

RECENT ALERTS:
${JSON.stringify(alerts.slice(0, 10), null, 2)}

Please analyze:
1. Current threat landscape
2. Device vulnerabilities
3. Attack patterns
4. Risk assessment
5. Immediate actions needed
6. Long-term security improvements

Focus on:
- Patient safety implications
- Medical device security
- Data protection
- System availability
- Compliance requirements

Respond in JSON format:
{
  "threats": [
    {
      "type": "Threat category",
      "severity": "low|medium|high|critical",
      "description": "Detailed threat description",
      "recommendation": "Specific action to take",
      "confidence": number (0-100)
    }
  ],
  "summary": "Overall security assessment",
  "riskScore": number (0-100),
  "immediateActions": ["List of urgent actions needed"]
}`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a cybersecurity expert specializing in healthcare IoT security. Analyze threats and respond only with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      return analysis;
    } catch (error) {
      console.error('Error analyzing security threats:', error);
      // Return fallback analysis
      return {
        threats: [],
        summary: 'Unable to perform detailed threat analysis. Please check system connectivity.',
        riskScore: 50,
        immediateActions: []
      };
    }
  }

  async generateNavigationHelp(query: string, userRole: string): Promise<string> {
    const prompt = `
You are a helpful assistant for the Heimdall AI medical IoT security system. A user with role "${userRole}" is asking: "${query}"

The system has these main sections:
- Dashboard: Overview of threats, devices, and system status
- Devices: Manage medical IoT devices (ECG monitors, patient monitors, etc.)
- Threats: View and manage security threats
- Reports: Generate and view security reports
- External Systems: Manage connected healthcare systems
- Settings: User and system configuration

Provide clear, helpful navigation guidance. Be specific about where to click and what they'll find there. Keep it concise but informative.`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant for a medical IoT security system. Provide clear navigation guidance.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating navigation help:', error);
      return 'I apologize, but I\'m having trouble accessing the help system right now. Please try navigating using the sidebar menu or contact support for assistance.';
    }
  }

  async generateChatResponse(message: string, context: any): Promise<string> {
    const prompt = `
You are the Heimdall AI assistant for a medical IoT security system in Botswana. 

User message: "${message}"

System context:
${JSON.stringify(context, null, 2)}

Provide a helpful, informative response. You can:
- Analyze security data
- Explain system features
- Provide navigation help
- Offer recommendations
- Answer questions about the system

Be professional, concise, and focus on healthcare security. Use emojis sparingly and appropriately.`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are Heimdall AI, a helpful assistant for a medical IoT security system. Be professional and helpful.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Error generating chat response:', error);
      return 'I apologize, but I\'m experiencing some technical difficulties right now. Please try again in a moment or contact support if the issue persists.';
    }
  }
}

export const openAIService = new OpenAIService();