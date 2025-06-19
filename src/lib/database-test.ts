import { supabase } from './supabase';

export interface DatabaseTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export interface TableStatus {
  name: string;
  exists: boolean;
  accessible: boolean;
  rowCount?: number;
  error?: string;
}

export interface DatabaseStatus {
  connection: DatabaseTestResult;
  authentication: DatabaseTestResult;
  tables: TableStatus[];
  environment: {
    supabaseUrl: boolean;
    supabaseKey: boolean;
  };
}

const REQUIRED_TABLES = [
  'users',
  'devices', 
  'threats',
  'alerts',
  'reports',
  'external_systems',
  'system_logs',
  'admins',
  'threat_database',
  'system_settings',
  'notification_settings',
  'scheduled_reports'
];

export async function testDatabaseConnection(): Promise<DatabaseStatus> {
  const status: DatabaseStatus = {
    connection: { success: false, message: '' },
    authentication: { success: false, message: '' },
    tables: [],
    environment: {
      supabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
      supabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY
    }
  };

  // Test basic connection
  try {
    const { data, error } = await supabase.from('admins').select('count', { count: 'exact', head: true });
    
    if (error) {
      status.connection = {
        success: false,
        message: `Connection failed: ${error.message}`,
        details: error
      };
    } else {
      status.connection = {
        success: true,
        message: 'Database connection successful'
      };
    }
  } catch (err) {
    status.connection = {
      success: false,
      message: `Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`
    };
  }

  // Test authentication
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      status.authentication = {
        success: false,
        message: `Auth error: ${error.message}`
      };
    } else if (session) {
      status.authentication = {
        success: true,
        message: `Authenticated as: ${session.user.email}`,
        details: { userId: session.user.id, email: session.user.email }
      };
    } else {
      status.authentication = {
        success: false,
        message: 'No active session'
      };
    }
  } catch (err) {
    status.authentication = {
      success: false,
      message: `Auth test failed: ${err instanceof Error ? err.message : 'Unknown error'}`
    };
  }

  // Test each table
  for (const tableName of REQUIRED_TABLES) {
    const tableStatus: TableStatus = {
      name: tableName,
      exists: false,
      accessible: false
    };

    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        tableStatus.error = error.message;
        if (error.message.includes('does not exist')) {
          tableStatus.exists = false;
        } else {
          tableStatus.exists = true;
          tableStatus.accessible = false;
        }
      } else {
        tableStatus.exists = true;
        tableStatus.accessible = true;
        tableStatus.rowCount = count || 0;
      }
    } catch (err) {
      tableStatus.error = err instanceof Error ? err.message : 'Unknown error';
    }

    status.tables.push(tableStatus);
  }

  return status;
}

export async function testAdminAccess(): Promise<DatabaseTestResult> {
  try {
    // Test admin verification function
    const { data, error } = await supabase.rpc('verify_admin', {
      email_input: 'mudhirabu@gmail.com',
      password_input: 'admin123'
    });

    if (error) {
      return {
        success: false,
        message: `Admin verification failed: ${error.message}`,
        details: error
      };
    }

    return {
      success: data === true,
      message: data === true ? 'Admin access verified' : 'Admin credentials invalid',
      details: { verified: data }
    };
  } catch (err) {
    return {
      success: false,
      message: `Admin test error: ${err instanceof Error ? err.message : 'Unknown error'}`
    };
  }
}

export async function testDatabaseOperations(): Promise<DatabaseTestResult[]> {
  const results: DatabaseTestResult[] = [];

  // Test admin table access
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .limit(1);

    if (error) {
      results.push({
        success: false,
        message: `Admin table access failed: ${error.message}`
      });
    } else {
      results.push({
        success: true,
        message: `Admin table accessible (${data?.length || 0} records)`
      });
    }
  } catch (err) {
    results.push({
      success: false,
      message: `Admin table test error: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  // Test device creation (if user has permission)
  try {
    const { data, error } = await supabase
      .from('devices')
      .insert({
        device_name: 'Test Device',
        device_type: 'monitoring',
        status: 'online',
        location: 'Test Location'
      })
      .select()
      .single();

    if (error) {
      results.push({
        success: false,
        message: `Device creation test: ${error.message}`
      });
    } else {
      results.push({
        success: true,
        message: 'Device creation test successful'
      });

      // Clean up test device
      await supabase.from('devices').delete().eq('device_id', data.device_id);
    }
  } catch (err) {
    results.push({
      success: false,
      message: `Device test error: ${err instanceof Error ? err.message : 'Unknown error'}`
    });
  }

  return results;
}