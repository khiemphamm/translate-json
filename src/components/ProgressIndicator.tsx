'use client';

import React from 'react';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Pause, 
  Clock,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { TranslationSession } from '@/types/translation';

interface ProgressIndicatorProps {
  session: TranslationSession | null;
  isProcessing: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  session,
  isProcessing
}) => {
  if (!session) return null;

  const progress = session.totalStrings > 0 
    ? ((session.translatedStrings + session.skippedStrings) / session.totalStrings) * 100 
    : 0;

  const getStatusIcon = () => {
    switch (session.status) {
      case 'processing':
        return <Activity className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'paused':
        return <Pause className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (session.status) {
      case 'processing':
        return 'Translating...';
      case 'completed':
        return 'Translation completed';
      case 'error':
        return 'Translation failed';
      case 'paused':
        return 'Translation paused';
      default:
        return 'Ready to translate';
    }
  };

  const getStatusColor = () => {
    switch (session.status) {
      case 'processing':
        return 'text-blue-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      case 'paused':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getElapsedTime = () => {
    if (!session.startTime) return 0;
    const endTime = session.endTime || Date.now();
    return endTime - session.startTime;
  };

  const getEstimatedTimeRemaining = () => {
    if (!session.startTime || session.translatedStrings === 0) return null;
    
    const elapsed = getElapsedTime();
    const rate = session.translatedStrings / elapsed; // strings per ms
    const remaining = session.totalStrings - session.translatedStrings - session.skippedStrings;
    
    return remaining > 0 ? remaining / rate : 0;
  };

  const estimatedTime = getEstimatedTimeRemaining();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {getStatusIcon()}
          <h3 className={`text-lg font-semibold ${getStatusColor()}`}>
            {getStatusText()}
          </h3>
        </div>
        <div className="text-sm text-gray-500">
          {session.sourceLanguage} → {session.targetLanguage}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              session.status === 'error' ? 'bg-red-500' :
              session.status === 'completed' ? 'bg-green-500' :
              session.status === 'paused' ? 'bg-yellow-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <BarChart3 className="h-4 w-4 text-blue-500 mr-1" />
            <span className="text-2xl font-bold text-gray-900">
              {session.totalStrings}
            </span>
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>

        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-2xl font-bold text-green-700">
              {session.translatedStrings}
            </span>
          </div>
          <div className="text-xs text-gray-500">Translated</div>
        </div>

        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
            <span className="text-2xl font-bold text-yellow-700">
              {session.skippedStrings}
            </span>
          </div>
          <div className="text-xs text-gray-500">Skipped</div>
        </div>

        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <XCircle className="h-4 w-4 text-red-500 mr-1" />
            <span className="text-2xl font-bold text-red-700">
              {session.errorStrings}
            </span>
          </div>
          <div className="text-xs text-gray-500">Errors</div>
        </div>
      </div>

      {/* Time Information */}
      <div className="flex justify-between items-center text-sm text-gray-600 pt-2 border-t">
        <div>
          <Clock className="inline h-4 w-4 mr-1" />
          Elapsed: {formatTime(getElapsedTime())}
        </div>
        {estimatedTime && isProcessing && (
          <div>
            Remaining: ~{formatTime(estimatedTime)}
          </div>
        )}
      </div>

      {/* Batch Progress */}
      {session.batches.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">
            Batch Progress ({session.batches.filter(b => b.status === 'completed').length}/{session.batches.length})
          </div>
          <div className="flex space-x-1">
            {session.batches.map((batch, index) => (
              <div
                key={batch.id}
                className={`flex-1 h-2 rounded ${
                  batch.status === 'completed' ? 'bg-green-500' :
                  batch.status === 'processing' ? 'bg-blue-500' :
                  batch.status === 'error' ? 'bg-red-500' :
                  'bg-gray-200'
                }`}
                title={`Batch ${index + 1}: ${batch.status} (${Math.round(batch.progress)}%)`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
