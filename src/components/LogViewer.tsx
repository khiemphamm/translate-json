'use client';

import React, { useEffect, useRef, useState } from 'react';
import { 
  Info, 
  AlertTriangle, 
  XCircle, 
  CheckCircle, 
  Filter,
  Download,
  Trash2,
  Clock
} from 'lucide-react';
import { TranslationLog } from '@/types/translation';

interface LogViewerProps {
  logs: TranslationLog[];
  maxHeight?: string;
  autoScroll?: boolean;
}

export const LogViewer: React.FC<LogViewerProps> = ({ 
  logs, 
  maxHeight = '300px',
  autoScroll = true 
}) => {
  const [filter, setFilter] = useState<TranslationLog['level'] | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const getLogIcon = (level: TranslationLog['level']) => {
    switch (level) {
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLogBgColor = (level: TranslationLog['level']) => {
    switch (level) {
      case 'info':
        return 'bg-blue-50 border-blue-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.level === filter;
    const matchesSearch = searchTerm === '' || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const downloadLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${formatTimestamp(log.timestamp)}] ${log.level.toUpperCase()}: ${log.message}`
    ).join('\n');

    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearLogs = () => {
    if (window.confirm('Are you sure you want to clear all logs?')) {
      // This would need to be implemented by the parent component
      console.log('Clear logs requested');
    }
  };

  const levelCounts = logs.reduce((acc, log) => {
    acc[log.level] = (acc[log.level] || 0) + 1;
    return acc;
  }, {} as Record<TranslationLog['level'], number>);

  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Translation Logs
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={downloadLogs}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              title="Download logs"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={clearLogs}
              className="p-2 text-gray-500 hover:text-red-600 rounded-md hover:bg-gray-100"
              title="Clear logs"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter and Search */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as TranslationLog['level'] | 'all')}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All ({logs.length})</option>
              <option value="info">Info ({levelCounts.info || 0})</option>
              <option value="success">Success ({levelCounts.success || 0})</option>
              <option value="warning">Warning ({levelCounts.warning || 0})</option>
              <option value="error">Error ({levelCounts.error || 0})</option>
            </select>
          </div>

          <div className="flex-1">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Log Content */}
      <div 
        ref={logContainerRef}
        className="overflow-y-auto p-4 space-y-2 font-mono text-sm"
        style={{ maxHeight }}
      >
        {filteredLogs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No logs to display</p>
            {searchTerm && (
              <p className="text-xs mt-1">
                Try adjusting your search or filter
              </p>
            )}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div
              key={log.id}
              className={`
                flex items-start space-x-3 p-3 rounded-md border-l-4 
                ${getLogBgColor(log.level)}
              `}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getLogIcon(log.level)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span className={`
                    text-xs font-medium px-2 py-0.5 rounded-full
                    ${log.level === 'info' ? 'bg-blue-100 text-blue-800' :
                      log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                      log.level === 'error' ? 'bg-red-100 text-red-800' :
                      log.level === 'success' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'}
                  `}>
                    {log.level.toUpperCase()}
                  </span>
                </div>
                <p className="text-gray-900 break-words">
                  {log.message}
                </p>
                {log.details && (
                  <details className="mt-2">
                    <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                      Show details
                    </summary>
                    <pre className="mt-1 text-xs text-gray-600 bg-gray-100 p-2 rounded overflow-x-auto">
                      {typeof log.details === 'string' 
                        ? log.details 
                        : JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {filteredLogs.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-2 text-xs text-gray-500">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      )}
    </div>
  );
};
