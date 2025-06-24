import { supabase } from '../lib/supabase';
import { openAIService, SystemLogAnalysis } from './openai';

export interface SecurityAlert {
  id: string;
  type: 'threat_detected' | 'suspicious_activity' | 'system_anomaly' | 'database_issue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  source: string;
  timestamp: string;
  status: 'active' | 'acknowledged' | 'resolved';
  recommendations: string[];
  metadata?: any;
}

class AlertService {
  async createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'status'>): Promise<SecurityAlert> {
    const newAlert: SecurityAlert = {
      ...alert,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      status: 'active'
    };

    try {
      // Store alert in database
      const { error } = await supabase
        .from('alerts')
        .insert([{
          alert_type: alert.type,
          status: 'pending',
          created_at: newAlert.timestamp,
          // Store additional data in a JSON field if available
        }]);

      if (error) {
        console.error('Error storing alert in database:', error);
      }

      // Send notification to admin users
      await this.notifyAdmins(newAlert);

      return newAlert;
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  async analyzeSystemLogsForThreats(systemId?: string): Promise<SecurityAlert[]> {
    try {
      // Get recent system logs
      const { data: logs, error } = await supabase
        .from('system_logs')
        .select('*, external_systems(name, type)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      if (!logs || logs.length === 0) {
        return [];
      }

      // Use OpenAI to analyze logs for threats
      const analysis: SystemLogAnalysis = await openAIService.analyzeSystemLogs(logs);

      // Convert AI analysis to security alerts
      const alerts: SecurityAlert[] = [];

      for (const activity of analysis.suspiciousActivities) {
        const alert = await this.createAlert({
          type: 'suspicious_activity',
          severity: activity.riskLevel,
          title: `Suspicious Activity Detected: ${activity.activity}`,
          description: activity.description,
          source: activity.sourceSystem || 'External System',
          recommendations: [activity.recommendation]
        });
        alerts.push(alert);
      }

      // Create summary alert if security score is low
      if (analysis.securityScore < 70) {
        const summaryAlert = await this.createAlert({
          type: 'system_anomaly',
          severity: analysis.securityScore < 50 ? 'critical' : 'high',
          title: `Security Score Alert: ${analysis.securityScore}/100`,
          description: `System security score has dropped to ${analysis.securityScore}. Multiple suspicious activities detected.`,
          source: 'AI Analysis',
          recommendations: [
            'Review all recent system logs',
            'Check for unauthorized access attempts',
            'Verify system integrity',
            'Consider increasing monitoring frequency'
          ],
          metadata: { analysis }
        });
        alerts.push(summaryAlert);
      }

      return alerts;
    } catch (error) {
      console.error('Error analyzing system logs for threats:', error);
      
      // Create error alert
      const errorAlert = await this.createAlert({
        type: 'system_anomaly',
        severity: 'medium',
        title: 'Log Analysis Error',
        description: 'Unable to analyze system logs for threats. Manual review recommended.',
        source: 'Alert Service',
        recommendations: [
          'Check system connectivity',
          'Manually review recent logs',
          'Contact support if issue persists'
        ]
      });

      return [errorAlert];
    }
  }

  async analyzeDatabaseHealth(): Promise<SecurityAlert[]> {
    try {
      // Import database test function
      const { testDatabaseConnection } = await import('../lib/database-test');
      const dbStatus = await testDatabaseConnection();

      // Use OpenAI to analyze database status
      const analysis = await openAIService.analyzeDatabaseStatus(dbStatus);

      const alerts: SecurityAlert[] = [];

      // Create alerts for critical issues
      for (const issue of analysis.issues) {
        if (issue.severity === 'critical' || issue.severity === 'high') {
          const alert = await this.createAlert({
            type: 'database_issue',
            severity: issue.severity,
            title: `Database Issue: ${issue.type}`,
            description: issue.description,
            source: 'Database Monitor',
            recommendations: [issue.solution]
          });
          alerts.push(alert);
        }
      }

      // Create overall health alert if status is not healthy
      if (analysis.status !== 'healthy') {
        const alert = await this.createAlert({
          type: 'database_issue',
          severity: analysis.status === 'critical' ? 'critical' : 'medium',
          title: `Database Health: ${analysis.status.toUpperCase()}`,
          description: `Database health check indicates ${analysis.status} status. Immediate attention may be required.`,
          source: 'Database Monitor',
          recommendations: analysis.recommendations,
          metadata: { analysis }
        });
        alerts.push(alert);
      }

      return alerts;
    } catch (error) {
      console.error('Error analyzing database health:', error);
      
      const errorAlert = await this.createAlert({
        type: 'database_issue',
        severity: 'high',
        title: 'Database Health Check Failed',
        description: 'Unable to perform database health analysis. Manual inspection required.',
        source: 'Database Monitor',
        recommendations: [
          'Check database connectivity',
          'Verify database permissions',
          'Contact database administrator'
        ]
      });

      return [errorAlert];
    }
  }

  async analyzeSecurityThreats(): Promise<SecurityAlert[]> {
    try {
      // Get recent threats, devices, and alerts
      const [threatsResult, devicesResult, alertsResult] = await Promise.all([
        supabase.from('threats').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('devices').select('*'),
        supabase.from('alerts').select('*').order('created_at', { ascending: false }).limit(20)
      ]);

      const threats = threatsResult.data || [];
      const devices = devicesResult.data || [];
      const alerts = alertsResult.data || [];

      // Use OpenAI to analyze security landscape
      const analysis = await openAIService.analyzeSecurityThreats(threats, devices, alerts);

      const securityAlerts: SecurityAlert[] = [];

      // Create alerts for identified threats
      for (const threat of analysis.threats) {
        if (threat.severity === 'critical' || threat.severity === 'high') {
          const alert = await this.createAlert({
            type: 'threat_detected',
            severity: threat.severity,
            title: `Security Threat: ${threat.type}`,
            description: threat.description,
            source: 'AI Threat Analysis',
            recommendations: [threat.recommendation]
          });
          securityAlerts.push(alert);
        }
      }

      // Create risk score alert if high
      if (analysis.riskScore > 70) {
        const alert = await this.createAlert({
          type: 'system_anomaly',
          severity: analysis.riskScore > 85 ? 'critical' : 'high',
          title: `High Risk Score: ${analysis.riskScore}/100`,
          description: analysis.summary,
          source: 'AI Risk Assessment',
          recommendations: analysis.immediateActions,
          metadata: { analysis }
        });
        securityAlerts.push(alert);
      }

      return securityAlerts;
    } catch (error) {
      console.error('Error analyzing security threats:', error);
      
      const errorAlert = await this.createAlert({
        type: 'system_anomaly',
        severity: 'medium',
        title: 'Security Analysis Error',
        description: 'Unable to perform comprehensive security analysis. Manual review recommended.',
        source: 'Security Monitor',
        recommendations: [
          'Manually review recent threats',
          'Check device status',
          'Verify system integrity'
        ]
      });

      return [errorAlert];
    }
  }

  private async notifyAdmins(alert: SecurityAlert): Promise<void> {
    try {
      // Get admin users
      const { data: admins, error } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('role', 'admin');

      if (error || !admins) {
        console.error('Error fetching admin users:', error);
        return;
      }

      // Create notification records (you might want to implement a notifications table)
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: 'security_alert',
        title: alert.title,
        message: alert.description,
        severity: alert.severity,
        created_at: new Date().toISOString(),
        read: false,
        metadata: {
          alert_id: alert.id,
          source: alert.source
        }
      }));

      // Store notifications (implement notifications table if needed)
      console.log('Notifications to send:', notifications);

      // Here you could also integrate with email/SMS services
      // await this.sendEmailNotifications(admins, alert);
      // await this.sendSMSNotifications(admins, alert);

    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }

  async runPeriodicAnalysis(): Promise<void> {
    try {
      console.log('Starting periodic security analysis...');

      // Run all analysis functions
      const [logAlerts, dbAlerts, threatAlerts] = await Promise.all([
        this.analyzeSystemLogsForThreats(),
        this.analyzeDatabaseHealth(),
        this.analyzeSecurityThreats()
      ]);

      const allAlerts = [...logAlerts, ...dbAlerts, ...threatAlerts];

      console.log(`Generated ${allAlerts.length} alerts from periodic analysis`);

      // Log summary
      const criticalAlerts = allAlerts.filter(a => a.severity === 'critical').length;
      const highAlerts = allAlerts.filter(a => a.severity === 'high').length;

      if (criticalAlerts > 0 || highAlerts > 0) {
        console.warn(`SECURITY ALERT: ${criticalAlerts} critical, ${highAlerts} high severity alerts generated`);
      }

    } catch (error) {
      console.error('Error in periodic analysis:', error);
    }
  }
}

export const alertService = new AlertService();

// Start periodic analysis (every 5 minutes)
if (typeof window !== 'undefined') {
  setInterval(() => {
    alertService.runPeriodicAnalysis();
  }, 5 * 60 * 1000); // 5 minutes
}