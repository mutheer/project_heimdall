import { supabase } from '../lib/supabase';

export interface Device {
  device_id: string;
  device_name: string;
  device_type: string;
  status: 'online' | 'offline' | 'warning';
  last_active: string;
  created_at: string;
  updated_at: string;
  location?: string;
  telemetry_data?: any;
}

export interface Threat {
  threat_id: string;
  threat_type: string;
  description: string;
  severity_level: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  is_resolved: boolean;
  device_id?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'analyst' | 'viewer';
  email: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  alert_id: string;
  threat_id?: string;
  alert_type: string;
  status: 'pending' | 'acknowledged' | 'resolved';
  user_id?: string;
  created_at: string;
  updated_at: string;
  last_notification?: string;
}

export interface ExternalSystem {
  id: string;
  name: string;
  type: string;
  url: string;
  anon_key: string;
  status: string;
  description?: string;
  last_sync: string;
  created_at: string;
  updated_at: string;
}

export interface Report {
  report_id: string;
  generated_by?: string;
  timestamp: string;
  report_data: any;
  created_at: string;
  export_format?: string;
  scheduled_by?: string;
}

class ApiService {
  // Device operations
  devices = {
    getAll: async (): Promise<Device[]> => {
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching devices:', error);
          throw new Error(`Failed to fetch devices: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('API Error - devices.getAll:', error);
        throw error;
      }
    },

    getById: async (id: string): Promise<Device | null> => {
      try {
        const { data, error } = await supabase
          .from('devices')
          .select('*')
          .eq('device_id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // No rows found
          }
          console.error('Error fetching device:', error);
          throw new Error(`Failed to fetch device: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - devices.getById:', error);
        throw error;
      }
    },

    create: async (device: Omit<Device, 'device_id' | 'created_at' | 'updated_at'>): Promise<Device> => {
      try {
        const { data, error } = await supabase
          .from('devices')
          .insert([device])
          .select()
          .single();

        if (error) {
          console.error('Error creating device:', error);
          throw new Error(`Failed to create device: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - devices.create:', error);
        throw error;
      }
    },

    update: async (id: string, updates: Partial<Device>): Promise<Device> => {
      try {
        const { data, error } = await supabase
          .from('devices')
          .update(updates)
          .eq('device_id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating device:', error);
          throw new Error(`Failed to update device: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - devices.update:', error);
        throw error;
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('devices')
          .delete()
          .eq('device_id', id);

        if (error) {
          console.error('Error deleting device:', error);
          throw new Error(`Failed to delete device: ${error.message}`);
        }
      } catch (error) {
        console.error('API Error - devices.delete:', error);
        throw error;
      }
    }
  };

  // Threat operations
  threats = {
    getAll: async (): Promise<(Threat & { devices?: { device_name: string } })[]> => {
      try {
        const { data, error } = await supabase
          .from('threats')
          .select(`
            *,
            devices:device_id (
              device_name
            )
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching threats:', error);
          throw new Error(`Failed to fetch threats: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('API Error - threats.getAll:', error);
        throw error;
      }
    },

    getById: async (id: string): Promise<Threat | null> => {
      try {
        const { data, error } = await supabase
          .from('threats')
          .select('*')
          .eq('threat_id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // No rows found
          }
          console.error('Error fetching threat:', error);
          throw new Error(`Failed to fetch threat: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - threats.getById:', error);
        throw error;
      }
    },

    create: async (threat: Omit<Threat, 'threat_id' | 'created_at' | 'updated_at'>): Promise<Threat> => {
      try {
        const { data, error } = await supabase
          .from('threats')
          .insert([threat])
          .select()
          .single();

        if (error) {
          console.error('Error creating threat:', error);
          throw new Error(`Failed to create threat: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - threats.create:', error);
        throw error;
      }
    },

    update: async (id: string, updates: Partial<Threat>): Promise<Threat> => {
      try {
        const { data, error } = await supabase
          .from('threats')
          .update(updates)
          .eq('threat_id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating threat:', error);
          throw new Error(`Failed to update threat: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - threats.update:', error);
        throw error;
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('threats')
          .delete()
          .eq('threat_id', id);

        if (error) {
          console.error('Error deleting threat:', error);
          throw new Error(`Failed to delete threat: ${error.message}`);
        }
      } catch (error) {
        console.error('API Error - threats.delete:', error);
        throw error;
      }
    }
  };

  // User operations
  users = {
    getAll: async (): Promise<User[]> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching users:', error);
          throw new Error(`Failed to fetch users: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('API Error - users.getAll:', error);
        throw error;
      }
    },

    getById: async (id: string): Promise<User | null> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            return null; // No rows found
          }
          console.error('Error fetching user:', error);
          throw new Error(`Failed to fetch user: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - users.getById:', error);
        throw error;
      }
    },

    create: async (user: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([user])
          .select()
          .single();

        if (error) {
          console.error('Error creating user:', error);
          throw new Error(`Failed to create user: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - users.create:', error);
        throw error;
      }
    },

    update: async (id: string, updates: Partial<User>): Promise<User> => {
      try {
        const { data, error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating user:', error);
          throw new Error(`Failed to update user: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - users.update:', error);
        throw error;
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting user:', error);
          throw new Error(`Failed to delete user: ${error.message}`);
        }
      } catch (error) {
        console.error('API Error - users.delete:', error);
        throw error;
      }
    }
  };

  // Alert operations
  alerts = {
    getAll: async (): Promise<Alert[]> => {
      try {
        const { data, error } = await supabase
          .from('alerts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching alerts:', error);
          throw new Error(`Failed to fetch alerts: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('API Error - alerts.getAll:', error);
        throw error;
      }
    }
  };

  // External system operations
  externalSystems = {
    getAll: async (): Promise<ExternalSystem[]> => {
      try {
        const { data, error } = await supabase
          .from('external_systems')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching external systems:', error);
          throw new Error(`Failed to fetch external systems: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('API Error - externalSystems.getAll:', error);
        throw error;
      }
    },

    create: async (system: Omit<ExternalSystem, 'id' | 'created_at' | 'updated_at'>): Promise<ExternalSystem> => {
      try {
        const { data, error } = await supabase
          .from('external_systems')
          .insert([system])
          .select()
          .single();

        if (error) {
          console.error('Error creating external system:', error);
          throw new Error(`Failed to create external system: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - externalSystems.create:', error);
        throw error;
      }
    },

    update: async (id: string, updates: Partial<ExternalSystem>): Promise<ExternalSystem> => {
      try {
        const { data, error } = await supabase
          .from('external_systems')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          console.error('Error updating external system:', error);
          throw new Error(`Failed to update external system: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - externalSystems.update:', error);
        throw error;
      }
    },

    delete: async (id: string): Promise<void> => {
      try {
        const { error } = await supabase
          .from('external_systems')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting external system:', error);
          throw new Error(`Failed to delete external system: ${error.message}`);
        }
      } catch (error) {
        console.error('API Error - externalSystems.delete:', error);
        throw error;
      }
    }
  };

  // Report operations
  reports = {
    getAll: async (): Promise<Report[]> => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching reports:', error);
          throw new Error(`Failed to fetch reports: ${error.message}`);
        }

        return data || [];
      } catch (error) {
        console.error('API Error - reports.getAll:', error);
        throw error;
      }
    },

    create: async (report: Omit<Report, 'report_id' | 'created_at'>): Promise<Report> => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .insert([report])
          .select()
          .single();

        if (error) {
          console.error('Error creating report:', error);
          throw new Error(`Failed to create report: ${error.message}`);
        }

        return data;
      } catch (error) {
        console.error('API Error - reports.create:', error);
        throw error;
      }
    }
  };

  // Health check
  healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('count')
        .limit(1);

      if (error) {
        console.error('Health check failed:', error);
        throw new Error(`Health check failed: ${error.message}`);
      }

      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('API Error - healthCheck:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  };
}

export const api = new ApiService();