import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User, 
  Shield, 
  Database, 
  Activity, 
  AlertTriangle,
  CheckCircle,
  Loader,
  Download,
  Search,
  BarChart3
} from 'lucide-react';
import { api } from '../services/api';
import { testDatabaseConnection } from '../lib/database-test';

interface Message {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
  actions?: Array<{
    label: string;
    action: () => void;
    icon?: React.ReactNode;
  }>;
}

interface AIAnalysis {
  type: 'security' | 'navigation' | 'database' | 'logs' | 'general';
  findings: string[];
  recommendations: string[];
  severity?: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
}

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      addMessage({
        role: 'assistant',
        content: `🤖 **Heimdall AI Assistant Ready**

I can help you with:

🔍 **Security Analysis**
• Analyze system logs for threats
• Review external system activity
• Detect suspicious patterns

📊 **Database Monitoring**
• Check database connection status
• Analyze table health
• Monitor performance metrics

🧭 **System Navigation**
• Guide you through features
• Explain dashboard components
• Help with device management

📈 **Log Analysis**
• Parse activity logs
• Identify anomalies
• Generate security reports

What would you like me to help you with today?`,
        timestamp: new Date()
      });
    }
  }, [isOpen, messages.length]);

  const addMessage = (message: Omit<Message, 'id'>) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, updates: Partial<Message>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  const addTypingMessage = async (content: string, role: 'assistant' | 'user' = 'assistant') => {
    const messageId = addMessage({
      role,
      content: '',
      timestamp: new Date(),
      isTyping: role === 'assistant'
    });

    if (role === 'assistant') {
      const words = content.split(' ');
      let currentText = '';
      
      for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        updateMessage(messageId, { content: currentText });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      updateMessage(messageId, { isTyping: false });
    } else {
      updateMessage(messageId, { content });
    }

    return messageId;
  };

  const analyzeUserIntent = (input: string): { 
    intent: string; 
    keywords: string[]; 
    confidence: number;
    type: 'security' | 'navigation' | 'database' | 'logs' | 'general';
  } => {
    const lowerInput = input.toLowerCase();
    
    // Security analysis keywords
    const securityKeywords = ['threat', 'security', 'alert', 'suspicious', 'attack', 'breach', 'vulnerability', 'malware', 'intrusion'];
    const securityScore = securityKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    // Database keywords
    const databaseKeywords = ['database', 'db', 'connection', 'table', 'query', 'performance', 'status', 'health'];
    const databaseScore = databaseKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    // Log analysis keywords
    const logKeywords = ['log', 'activity', 'analyze', 'parse', 'review', 'examine', 'audit'];
    const logScore = logKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    // Navigation keywords
    const navKeywords = ['help', 'how to', 'navigate', 'guide', 'show me', 'explain', 'where is'];
    const navScore = navKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    const scores = [
      { type: 'security' as const, score: securityScore, keywords: securityKeywords },
      { type: 'database' as const, score: databaseScore, keywords: databaseKeywords },
      { type: 'logs' as const, score: logScore, keywords: logKeywords },
      { type: 'navigation' as const, score: navScore, keywords: navKeywords }
    ];

    const highest = scores.reduce((max, current) => 
      current.score > max.score ? current : max
    );

    return {
      intent: lowerInput,
      keywords: highest.keywords.filter(k => lowerInput.includes(k)),
      confidence: highest.score,
      type: highest.score > 0 ? highest.type : 'general'
    };
  };

  const performSecurityAnalysis = async (): Promise<AIAnalysis> => {
    try {
      // Get recent threats and alerts
      const [threats, devices] = await Promise.all([
        api.threats.getAll(),
        api.devices.getAll()
      ]);

      const recentThreats = threats.filter(t => 
        new Date(t.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );

      const offlineDevices = devices.filter(d => d.status === 'offline');
      const warningDevices = devices.filter(d => d.status === 'warning');

      const findings = [];
      const recommendations = [];
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (recentThreats.length > 0) {
        findings.push(`Found ${recentThreats.length} threats in the last 24 hours`);
        const criticalThreats = recentThreats.filter(t => t.severity_level === 'critical');
        if (criticalThreats.length > 0) {
          severity = 'critical';
          findings.push(`${criticalThreats.length} critical threats require immediate attention`);
          recommendations.push('Review and respond to critical threats immediately');
        }
      }

      if (offlineDevices.length > 0) {
        findings.push(`${offlineDevices.length} devices are currently offline`);
        recommendations.push('Check offline devices for connectivity issues');
        if (severity === 'low') severity = 'medium';
      }

      if (warningDevices.length > 0) {
        findings.push(`${warningDevices.length} devices showing warning status`);
        recommendations.push('Investigate devices with warning status');
      }

      if (findings.length === 0) {
        findings.push('No immediate security concerns detected');
        recommendations.push('Continue monitoring for new threats');
      }

      return {
        type: 'security',
        findings,
        recommendations,
        severity,
        data: { threats: recentThreats, offlineDevices, warningDevices }
      };
    } catch (error) {
      return {
        type: 'security',
        findings: ['Error accessing security data'],
        recommendations: ['Check system connectivity and try again'],
        severity: 'medium'
      };
    }
  };

  const performDatabaseAnalysis = async (): Promise<AIAnalysis> => {
    try {
      const dbStatus = await testDatabaseConnection();
      
      const findings = [];
      const recommendations = [];
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

      if (dbStatus.connection.success) {
        findings.push('Database connection is healthy');
      } else {
        findings.push('Database connection issues detected');
        severity = 'critical';
        recommendations.push('Check database connectivity immediately');
      }

      const accessibleTables = dbStatus.tables.filter(t => t.accessible).length;
      const totalTables = dbStatus.tables.length;
      
      findings.push(`${accessibleTables}/${totalTables} tables are accessible`);
      
      if (accessibleTables < totalTables) {
        findings.push(`${totalTables - accessibleTables} tables have access issues`);
        recommendations.push('Review table permissions and RLS policies');
        if (severity === 'low') severity = 'medium';
      }

      if (dbStatus.authentication.success) {
        findings.push('Authentication system is working correctly');
      } else {
        findings.push('Authentication issues detected');
        recommendations.push('Check authentication configuration');
        severity = 'high';
      }

      return {
        type: 'database',
        findings,
        recommendations,
        severity,
        data: dbStatus
      };
    } catch (error) {
      return {
        type: 'database',
        findings: ['Error performing database analysis'],
        recommendations: ['Check system status and try again'],
        severity: 'high'
      };
    }
  };

  const generateNavigationHelp = (query: string): AIAnalysis => {
    const lowerQuery = query.toLowerCase();
    const findings = [];
    const recommendations = [];

    if (lowerQuery.includes('device') || lowerQuery.includes('iot')) {
      findings.push('Device management is available in the Devices section');
      recommendations.push('Navigate to Devices → View all connected medical IoT devices');
      recommendations.push('Use the "Connect Device" button to add new devices');
    }

    if (lowerQuery.includes('threat') || lowerQuery.includes('security')) {
      findings.push('Threat monitoring is in the Threats section');
      recommendations.push('Navigate to Threats → View detected security threats');
      recommendations.push('Filter by severity level to prioritize responses');
    }

    if (lowerQuery.includes('report')) {
      findings.push('Reporting features are in the Reports section');
      recommendations.push('Navigate to Reports → Generate or view existing reports');
      recommendations.push('Schedule automated reports for regular monitoring');
    }

    if (lowerQuery.includes('external') || lowerQuery.includes('system')) {
      findings.push('External system management is available');
      recommendations.push('Navigate to External Systems → Manage connected systems');
      recommendations.push('Monitor system logs and integration status');
    }

    if (findings.length === 0) {
      findings.push('General navigation help available');
      recommendations.push('Use the sidebar to navigate between sections');
      recommendations.push('Dashboard provides an overview of all system components');
      recommendations.push('Settings allows user and system configuration');
    }

    return {
      type: 'navigation',
      findings,
      recommendations
    };
  };

  const handleAIResponse = async (userInput: string) => {
    const analysis = analyzeUserIntent(userInput);
    setIsAnalyzing(true);

    try {
      let aiAnalysis: AIAnalysis;

      switch (analysis.type) {
        case 'security':
          aiAnalysis = await performSecurityAnalysis();
          break;
        case 'database':
          aiAnalysis = await performDatabaseAnalysis();
          break;
        case 'navigation':
          aiAnalysis = generateNavigationHelp(userInput);
          break;
        case 'logs':
          // For now, provide guidance on log analysis
          aiAnalysis = {
            type: 'logs',
            findings: [
              'Log analysis capabilities available',
              'System logs are collected from external systems',
              'Activity monitoring is active'
            ],
            recommendations: [
              'Check External Systems section for log data',
              'Review system logs for unusual activity',
              'Set up automated log analysis alerts'
            ]
          };
          break;
        default:
          aiAnalysis = {
            type: 'general',
            findings: ['I can help with various system analysis tasks'],
            recommendations: [
              'Ask me to analyze security threats',
              'Request database status checks',
              'Get navigation help for the system',
              'Analyze activity logs for anomalies'
            ]
          };
      }

      // Format the response
      let response = `🔍 **Analysis Complete**\n\n`;
      
      if (aiAnalysis.severity) {
        const severityEmoji = {
          low: '🟢',
          medium: '🟡',
          high: '🟠',
          critical: '🔴'
        };
        response += `**Severity Level:** ${severityEmoji[aiAnalysis.severity]} ${aiAnalysis.severity.toUpperCase()}\n\n`;
      }

      response += `**Findings:**\n`;
      aiAnalysis.findings.forEach(finding => {
        response += `• ${finding}\n`;
      });

      response += `\n**Recommendations:**\n`;
      aiAnalysis.recommendations.forEach(rec => {
        response += `• ${rec}\n`;
      });

      // Add action buttons based on analysis type
      const actions = [];
      
      if (aiAnalysis.type === 'security') {
        actions.push({
          label: 'View Threats',
          action: () => window.location.href = '/threats',
          icon: <Shield className="w-4 h-4" />
        });
        actions.push({
          label: 'Check Devices',
          action: () => window.location.href = '/devices',
          icon: <Activity className="w-4 h-4" />
        });
      }

      if (aiAnalysis.type === 'database') {
        actions.push({
          label: 'Database Status',
          action: () => {
            // This would trigger the database status modal
            console.log('Open database status');
          },
          icon: <Database className="w-4 h-4" />
        });
      }

      await addTypingMessage(response);

      if (actions.length > 0) {
        addMessage({
          role: 'assistant',
          content: 'Quick Actions:',
          timestamp: new Date(),
          actions
        });
      }

    } catch (error) {
      await addTypingMessage(
        '❌ **Analysis Error**\n\nI encountered an issue while analyzing your request. Please try again or contact support if the problem persists.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim() === '' || isLoading) return;

    const userMessage = currentInput.trim();
    setCurrentInput('');
    setIsLoading(true);

    await addTypingMessage(userMessage, 'user');
    await handleAIResponse(userMessage);
    
    setIsLoading(false);
  };

  const quickActions = [
    {
      label: 'Analyze Security',
      action: () => handleAIResponse('analyze security threats and system status'),
      icon: <Shield className="w-4 h-4" />
    },
    {
      label: 'Check Database',
      action: () => handleAIResponse('check database connection and health status'),
      icon: <Database className="w-4 h-4" />
    },
    {
      label: 'System Navigation',
      action: () => handleAIResponse('help me navigate the system and understand features'),
      icon: <Search className="w-4 h-4" />
    },
    {
      label: 'Log Analysis',
      action: () => handleAIResponse('analyze recent activity logs for security issues'),
      icon: <BarChart3 className="w-4 h-4" />
    }
  ];

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg transition-all duration-300 ${
          isOpen ? 'scale-0' : 'scale-100'
        }`}
      >
        <MessageCircle className="w-6 h-6" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Heimdall AI Assistant</h3>
                <p className="text-xs text-blue-100">
                  {isAnalyzing ? 'Analyzing...' : 'Ready to help'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-blue-100 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div className={`flex items-start space-x-2 max-w-[85%] ${
                  message.role === 'assistant' ? 'flex-row' : 'flex-row-reverse space-x-reverse'
                }`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'assistant' 
                      ? 'bg-blue-100 text-blue-600' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {message.role === 'assistant' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div className="space-y-2">
                    <div
                      className={`rounded-lg px-3 py-2 ${
                        message.role === 'assistant'
                          ? 'bg-gray-100 text-gray-900'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line">
                        {message.content}
                        {message.isTyping && (
                          <span className="inline-block w-2 h-2 bg-current rounded-full animate-pulse ml-1" />
                        )}
                      </p>
                    </div>
                    {message.actions && (
                      <div className="flex flex-wrap gap-2">
                        {message.actions.map((action, index) => (
                          <button
                            key={index}
                            onClick={action.action}
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100 transition-colors"
                          >
                            {action.icon}
                            <span>{action.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isAnalyzing && (
              <div className="flex justify-start">
                <div className="flex items-center space-x-2 bg-blue-50 rounded-lg px-3 py-2">
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                  <span className="text-sm text-blue-600">Analyzing system data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">Quick Actions:</p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={action.action}
                    disabled={isLoading || isAnalyzing}
                    className="flex items-center space-x-1 px-2 py-2 bg-white border border-gray-200 rounded text-xs hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {action.icon}
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder="Ask me anything about the system..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                disabled={isLoading || isAnalyzing}
              />
              <button
                type="submit"
                disabled={isLoading || isAnalyzing || currentInput.trim() === ''}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChat;