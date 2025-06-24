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
  BarChart3,
  Bell
} from 'lucide-react';
import { api } from '../services/api';
import { testDatabaseConnection } from '../lib/database-test';
import { openAIService } from '../services/openai';
import { alertService } from '../services/alertService';
import { useUser } from '../context/UserContext';

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

const AIChat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useUser();

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

I'm powered by OpenAI GPT-4 and can help you with:

🔍 **AI-Powered Security Analysis**
• Analyze external system logs for threats
• Detect suspicious activities and patterns
• Generate intelligent security alerts

📊 **Database Health Monitoring**
• AI-driven database status analysis
• Performance optimization recommendations
• Connection and security assessments

🧭 **Intelligent Navigation**
• Smart system guidance
• Feature explanations
• Personalized help based on your role

📈 **Advanced Log Analysis**
• Pattern recognition in activity logs
• Anomaly detection
• Automated threat classification

🚨 **Real-time Alert Generation**
• Automatic threat notifications
• Admin alert system
• Risk assessment and prioritization

What would you like me to analyze today?`,
        timestamp: new Date()
      });
    }
  }, [isOpen, messages.length]);

  // Check for new alerts periodically
  useEffect(() => {
    const checkAlerts = async () => {
      try {
        const alerts = await alertService.analyzeSystemLogsForThreats();
        setAlertCount(alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length);
      } catch (error) {
        console.error('Error checking alerts:', error);
      }
    };

    const interval = setInterval(checkAlerts, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

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
        await new Promise(resolve => setTimeout(resolve, 30));
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
    type: 'security' | 'navigation' | 'database' | 'logs' | 'alerts' | 'general';
  } => {
    const lowerInput = input.toLowerCase();
    
    // Security analysis keywords
    const securityKeywords = ['threat', 'security', 'attack', 'breach', 'vulnerability', 'malware', 'intrusion', 'analyze security'];
    const securityScore = securityKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    // Database keywords
    const databaseKeywords = ['database', 'db', 'connection', 'table', 'query', 'performance', 'status', 'health'];
    const databaseScore = databaseKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    // Log analysis keywords
    const logKeywords = ['log', 'activity', 'analyze', 'parse', 'review', 'examine', 'audit', 'external system'];
    const logScore = logKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    // Alert keywords
    const alertKeywords = ['alert', 'notification', 'warning', 'notify', 'suspicious', 'anomaly'];
    const alertScore = alertKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    // Navigation keywords
    const navKeywords = ['help', 'how to', 'navigate', 'guide', 'show me', 'explain', 'where is'];
    const navScore = navKeywords.filter(keyword => lowerInput.includes(keyword)).length;

    const scores = [
      { type: 'security' as const, score: securityScore, keywords: securityKeywords },
      { type: 'database' as const, score: databaseScore, keywords: databaseKeywords },
      { type: 'logs' as const, score: logScore, keywords: logKeywords },
      { type: 'alerts' as const, score: alertScore, keywords: alertKeywords },
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

  const performAISecurityAnalysis = async () => {
    try {
      await addTypingMessage('🔍 **Starting AI-Powered Security Analysis...**\n\nAnalyzing threats, devices, and system logs with OpenAI GPT-4...');

      // Get data for analysis
      const [threats, devices, alerts] = await Promise.all([
        api.threats.getAll(),
        api.devices.getAll(),
        api.alerts.getRecent()
      ]);

      // Use OpenAI to analyze security landscape
      const analysis = await openAIService.analyzeSecurityThreats(threats, devices, alerts);

      let response = `🛡️ **AI Security Analysis Complete**\n\n`;
      response += `**Risk Score:** ${analysis.riskScore}/100\n\n`;
      response += `**Summary:** ${analysis.summary}\n\n`;

      if (analysis.threats.length > 0) {
        response += `**🚨 Threats Identified:**\n`;
        analysis.threats.forEach((threat, index) => {
          const severityEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            critical: '🔴'
          };
          response += `${index + 1}. ${severityEmoji[threat.severity]} **${threat.type}** (${threat.severity})\n`;
          response += `   ${threat.description}\n`;
          response += `   *Recommendation:* ${threat.recommendation}\n\n`;
        });
      }

      if (analysis.immediateActions.length > 0) {
        response += `**⚡ Immediate Actions Required:**\n`;
        analysis.immediateActions.forEach((action, index) => {
          response += `${index + 1}. ${action}\n`;
        });
      }

      await addTypingMessage(response);

      // Generate alerts for critical threats
      if (analysis.riskScore > 70) {
        const alerts = await alertService.analyzeSecurityThreats();
        if (alerts.length > 0) {
          await addTypingMessage(`🚨 **${alerts.length} security alerts generated and sent to administrators.**`);
        }
      }

      // Add action buttons
      addMessage({
        role: 'assistant',
        content: 'Quick Actions:',
        timestamp: new Date(),
        actions: [
          {
            label: 'View Threats',
            action: () => window.location.href = '/threats',
            icon: <Shield className="w-4 h-4" />
          },
          {
            label: 'Check Devices',
            action: () => window.location.href = '/devices',
            icon: <Activity className="w-4 h-4" />
          },
          {
            label: 'Generate Report',
            action: () => window.location.href = '/reports',
            icon: <Download className="w-4 h-4" />
          }
        ]
      });

    } catch (error) {
      await addTypingMessage('❌ **Analysis Error**\n\nI encountered an issue while performing the security analysis. Please check your connection and try again.');
      console.error('Security analysis error:', error);
    }
  };

  const performAIDatabaseAnalysis = async () => {
    try {
      await addTypingMessage('🔍 **Starting AI Database Health Analysis...**\n\nAnalyzing database status with OpenAI GPT-4...');

      const dbStatus = await testDatabaseConnection();
      const analysis = await openAIService.analyzeDatabaseStatus(dbStatus);

      let response = `💾 **AI Database Analysis Complete**\n\n`;
      response += `**Status:** ${analysis.status.toUpperCase()}\n\n`;

      response += `**Performance Metrics:**\n`;
      response += `• Connection Health: ${analysis.performance.connectionHealth}%\n`;
      response += `• Table Accessibility: ${analysis.performance.tableAccessibility}%\n`;
      response += `• Authentication Status: ${analysis.performance.authenticationStatus}%\n\n`;

      if (analysis.issues.length > 0) {
        response += `**🚨 Issues Detected:**\n`;
        analysis.issues.forEach((issue, index) => {
          const severityEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            critical: '🔴'
          };
          response += `${index + 1}. ${severityEmoji[issue.severity]} **${issue.type}** (${issue.severity})\n`;
          response += `   ${issue.description}\n`;
          response += `   *Solution:* ${issue.solution}\n\n`;
        });
      }

      if (analysis.recommendations.length > 0) {
        response += `**💡 Recommendations:**\n`;
        analysis.recommendations.forEach((rec, index) => {
          response += `${index + 1}. ${rec}\n`;
        });
      }

      await addTypingMessage(response);

      // Generate alerts for critical database issues
      if (analysis.status === 'critical') {
        const alerts = await alertService.analyzeDatabaseHealth();
        if (alerts.length > 0) {
          await addTypingMessage(`🚨 **${alerts.length} database alerts generated and sent to administrators.**`);
        }
      }

    } catch (error) {
      await addTypingMessage('❌ **Database Analysis Error**\n\nI encountered an issue while analyzing the database. Please check system connectivity and try again.');
      console.error('Database analysis error:', error);
    }
  };

  const performAILogAnalysis = async () => {
    try {
      await addTypingMessage('🔍 **Starting AI Log Analysis...**\n\nAnalyzing external system logs for threats and anomalies...');

      // Get recent system logs
      const logs = await api.systemLogs.getAll();
      
      if (logs.length === 0) {
        await addTypingMessage('📝 **No Recent Logs Found**\n\nNo system logs available for analysis. External systems may not be generating logs or connectivity issues may exist.');
        return;
      }

      // Use OpenAI to analyze logs
      const analysis = await openAIService.analyzeSystemLogs(logs);

      let response = `📊 **AI Log Analysis Complete**\n\n`;
      response += `**Security Score:** ${analysis.securityScore}/100\n`;
      response += `**Logs Analyzed:** ${logs.length}\n`;
      response += `**Alerts Generated:** ${analysis.alertsGenerated}\n\n`;

      if (analysis.suspiciousActivities.length > 0) {
        response += `**🚨 Suspicious Activities Detected:**\n`;
        analysis.suspiciousActivities.forEach((activity, index) => {
          const riskEmoji = {
            low: '🟢',
            medium: '🟡',
            high: '🟠',
            critical: '🔴'
          };
          response += `${index + 1}. ${riskEmoji[activity.riskLevel]} **${activity.activity}** (${activity.riskLevel})\n`;
          response += `   Source: ${activity.sourceSystem}\n`;
          response += `   ${activity.description}\n`;
          response += `   *Action:* ${activity.recommendation}\n\n`;
        });
      }

      if (analysis.patterns.length > 0) {
        response += `**🔍 Patterns Identified:**\n`;
        analysis.patterns.forEach((pattern, index) => {
          response += `${index + 1}. **${pattern.pattern}** (${pattern.frequency} occurrences)\n`;
          response += `   ${pattern.significance}\n\n`;
        });
      }

      await addTypingMessage(response);

      // Generate alerts for suspicious activities
      const alerts = await alertService.analyzeSystemLogsForThreats();
      if (alerts.length > 0) {
        await addTypingMessage(`🚨 **${alerts.length} security alerts generated from log analysis and sent to administrators.**`);
      }

    } catch (error) {
      await addTypingMessage('❌ **Log Analysis Error**\n\nI encountered an issue while analyzing system logs. Please check external system connectivity and try again.');
      console.error('Log analysis error:', error);
    }
  };

  const handleAIResponse = async (userInput: string) => {
    const analysis = analyzeUserIntent(userInput);
    setIsAnalyzing(true);

    try {
      switch (analysis.type) {
        case 'security':
          await performAISecurityAnalysis();
          break;
        case 'database':
          await performAIDatabaseAnalysis();
          break;
        case 'logs':
          await performAILogAnalysis();
          break;
        case 'alerts':
          await addTypingMessage('🚨 **Alert System Status**\n\nChecking for new alerts and running threat analysis...');
          const alerts = await alertService.runPeriodicAnalysis();
          await addTypingMessage('✅ **Alert analysis complete.** All administrators have been notified of any critical findings.');
          break;
        case 'navigation':
          const navHelp = await openAIService.generateNavigationHelp(userInput, user?.role || 'viewer');
          await addTypingMessage(`🧭 **Navigation Help**\n\n${navHelp}`);
          break;
        default:
          const context = {
            userRole: user?.role,
            systemStatus: 'operational',
            recentActivity: 'normal'
          };
          const response = await openAIService.generateChatResponse(userInput, context);
          await addTypingMessage(response);
      }
    } catch (error) {
      await addTypingMessage(
        '❌ **AI Service Error**\n\nI encountered an issue while processing your request. This might be due to:\n\n• OpenAI API connectivity issues\n• System overload\n• Network connectivity problems\n\nPlease try again in a moment or contact support if the issue persists.'
      );
      console.error('AI response error:', error);
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
      label: 'AI Security Analysis',
      action: () => handleAIResponse('analyze security threats and system status with AI'),
      icon: <Shield className="w-4 h-4" />
    },
    {
      label: 'AI Database Health',
      action: () => handleAIResponse('check database connection and health status with AI'),
      icon: <Database className="w-4 h-4" />
    },
    {
      label: 'AI Log Analysis',
      action: () => handleAIResponse('analyze external system logs for threats and anomalies'),
      icon: <BarChart3 className="w-4 h-4" />
    },
    {
      label: 'Generate Alerts',
      action: () => handleAIResponse('run threat analysis and generate security alerts'),
      icon: <Bell className="w-4 h-4" />
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
        {alertCount > 0 && (
          <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center font-bold">
            {alertCount}
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
            <div className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <div>
                <h3 className="font-semibold">Heimdall AI Assistant</h3>
                <p className="text-xs text-blue-100">
                  {isAnalyzing ? 'Analyzing with OpenAI...' : 'Powered by GPT-4'}
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
                  <span className="text-sm text-blue-600">AI analyzing with OpenAI GPT-4...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length <= 1 && (
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 mb-2">AI-Powered Quick Actions:</p>
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
                placeholder="Ask AI to analyze threats, logs, database..."
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