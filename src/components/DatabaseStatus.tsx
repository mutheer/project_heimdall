import React, { useState, useEffect } from 'react';
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Shield,
  Server,
  Key,
  Activity
} from 'lucide-react';
import { 
  testDatabaseConnection, 
  testAdminAccess, 
  testDatabaseOperations,
  type DatabaseStatus,
  type DatabaseTestResult
} from '../lib/database-test';

interface DatabaseStatusProps {
  isOpen: boolean;
  onClose: () => void;
}

const DatabaseStatusComponent: React.FC<DatabaseStatusProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<DatabaseStatus | null>(null);
  const [adminTest, setAdminTest] = useState<DatabaseTestResult | null>(null);
  const [operationTests, setOperationTests] = useState<DatabaseTestResult[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      const [dbStatus, adminResult, operationResults] = await Promise.all([
        testDatabaseConnection(),
        testAdminAccess(),
        testDatabaseOperations()
      ]);

      setStatus(dbStatus);
      setAdminTest(adminResult);
      setOperationTests(operationResults);
    } catch (err) {
      console.error('Test execution failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runTests();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-5 w-5 text-success-500" />
    ) : (
      <XCircle className="h-5 w-5 text-danger-500" />
    );
  };

  const getTableStatusIcon = (table: any) => {
    if (!table.exists) {
      return <XCircle className="h-4 w-4 text-danger-500" />;
    }
    if (!table.accessible) {
      return <AlertCircle className="h-4 w-4 text-warning-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-success-500" />;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Database className="h-6 w-6 text-primary-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">Database Connection Status</h2>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={runTests}
                disabled={loading}
                className="flex items-center px-3 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-primary-600" />
              <span className="ml-3 text-gray-600">Testing database connection...</span>
            </div>
          ) : status ? (
            <div className="space-y-6">
              {/* Environment Configuration */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Key className="h-5 w-5 mr-2" />
                  Environment Configuration
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center">
                    {getStatusIcon(status.environment.supabaseUrl)}
                    <span className="ml-2 text-sm">Supabase URL</span>
                  </div>
                  <div className="flex items-center">
                    {getStatusIcon(status.environment.supabaseKey)}
                    <span className="ml-2 text-sm">Supabase API Key</span>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Database Connection
                </h3>
                <div className="flex items-center">
                  {getStatusIcon(status.connection.success)}
                  <span className="ml-2 text-sm">{status.connection.message}</span>
                </div>
              </div>

              {/* Authentication Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Authentication Status
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    {getStatusIcon(status.authentication.success)}
                    <span className="ml-2 text-sm">{status.authentication.message}</span>
                  </div>
                  {adminTest && (
                    <div className="flex items-center">
                      {getStatusIcon(adminTest.success)}
                      <span className="ml-2 text-sm">Admin Access: {adminTest.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Table Status */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Database Tables ({status.tables.filter(t => t.exists && t.accessible).length}/{status.tables.length})
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {status.tables.map((table) => (
                    <div key={table.name} className="flex items-center justify-between bg-white p-3 rounded border">
                      <div className="flex items-center">
                        {getTableStatusIcon(table)}
                        <span className="ml-2 text-sm font-medium">{table.name}</span>
                      </div>
                      {table.accessible && table.rowCount !== undefined && (
                        <span className="text-xs text-gray-500">{table.rowCount} rows</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Operation Tests */}
              {operationTests.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Database Operations
                  </h3>
                  <div className="space-y-2">
                    {operationTests.map((test, index) => (
                      <div key={index} className="flex items-center">
                        {getStatusIcon(test.success)}
                        <span className="ml-2 text-sm">{test.message}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Tables Details */}
              {status.tables.some(t => !t.accessible || !t.exists) && (
                <div className="bg-danger-50 border border-danger-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-danger-900 mb-3">Issues Found</h3>
                  <div className="space-y-2">
                    {status.tables
                      .filter(t => !t.accessible || !t.exists)
                      .map((table) => (
                        <div key={table.name} className="text-sm text-danger-700">
                          <strong>{table.name}:</strong> {table.error || 'Table not accessible'}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-primary-900 mb-2">Connection Summary</h3>
                <div className="text-sm text-primary-700">
                  <p>
                    <strong>Status:</strong> {status.connection.success ? 'Connected' : 'Disconnected'}
                  </p>
                  <p>
                    <strong>Tables:</strong> {status.tables.filter(t => t.exists && t.accessible).length} of {status.tables.length} accessible
                  </p>
                  <p>
                    <strong>Authentication:</strong> {status.authentication.success ? 'Active Session' : 'No Session'}
                  </p>
                  {adminTest && (
                    <p>
                      <strong>Admin Access:</strong> {adminTest.success ? 'Verified' : 'Failed'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Click refresh to test database connection</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseStatusComponent;