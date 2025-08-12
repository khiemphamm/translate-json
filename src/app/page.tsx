'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Settings,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

import { FileUpload } from '@/components/FileUpload';
import { LanguageSelector } from '@/components/LanguageSelector';
import { ProgressIndicator } from '@/components/ProgressIndicator';
import { LogViewer } from '@/components/LogViewer';
import { DiffViewer } from '@/components/DiffViewer';
import { FileDownload } from '@/components/FileDownload';

import { 
  FileUploadState, 
  TranslationSession, 
  TranslationConfig,
  TranslationLog
} from '@/types/translation';
import { translationService } from '@/services/translationService';
import { libreTranslateService } from '@/services/libreTranslateService';
import { cacheService } from '@/services/cacheService';

export default function Home() {
  const [fileState, setFileState] = useState<FileUploadState>({
    file: null,
    content: null,
    isValid: false
  });

  const [config, setConfig] = useState<TranslationConfig>({
    sourceLanguage: 'auto',
    targetLanguage: 'vi',
    batchSize: parseInt(process.env.NEXT_PUBLIC_BATCH_SIZE || '50', 10),
    maxRetries: parseInt(process.env.NEXT_PUBLIC_MAX_RETRIES || '3', 10),
    skipPatterns: [],
    preservePatterns: [],
    autoDetectSource: true
  });

  const [session, setSession] = useState<TranslationSession | null>(null);
  const [logs, setLogs] = useState<TranslationLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Check LibreTranslate service status
  useEffect(() => {
    const checkServiceStatus = async () => {
      setServiceStatus('checking');
      const isHealthy = await libreTranslateService.isHealthy();
      setServiceStatus(isHealthy ? 'online' : 'offline');
    };

    checkServiceStatus();
    const interval = setInterval(checkServiceStatus, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Set up translation service callbacks
  useEffect(() => {
    translationService.setProgressCallback(setSession);
    translationService.setLogCallback((log) => {
      setLogs(prev => [...prev, log]);
    });

    // Clean up cache on mount
    cacheService.cleanupExpired();
  }, []);

  // Update processing state
  useEffect(() => {
    setIsProcessing(translationService.isTranslationInProgress());
  }, [session]);

  const handleStartTranslation = async () => {
    if (!fileState.isValid || !fileState.content) {
      alert('Please upload a valid JSON file first');
      return;
    }

    if (serviceStatus === 'offline') {
      alert('LibreTranslate service is not available. Please check your configuration.');
      return;
    }

    try {
      setLogs([]); // Clear previous logs
      const newSession = await translationService.startTranslation(
        fileState.content,
        config
      );
      setSession(newSession);
    } catch (error) {
      console.error('Translation failed:', error);
      alert(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handlePauseTranslation = () => {
    translationService.pauseTranslation();
  };

  const handleResumeTranslation = async () => {
    try {
      await translationService.resumeTranslation();
    } catch (error) {
      console.error('Resume failed:', error);
      alert(`Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleStopTranslation = () => {
    translationService.stopTranslation();
  };

  const handleResetTranslation = () => {
    if (isProcessing) {
      translationService.stopTranslation();
    }
    setSession(null);
    setLogs([]);
  };

  const canStartTranslation = fileState.isValid && 
                              !isProcessing && 
                              serviceStatus === 'online';

  const canResumeTranslation = translationService.canResume();

  const getServiceStatusIcon = () => {
    switch (serviceStatus) {
      case 'checking':
        return <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />;
      case 'online':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            JSON Translation Tool
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Translate large JSON files while preserving structure using LibreTranslate API
          </p>
          
          {/* Service Status */}
          <div className="flex items-center justify-center space-x-2 mt-4">
            {getServiceStatusIcon()}
            <span className={`text-sm ${
              serviceStatus === 'online' ? 'text-green-600' :
              serviceStatus === 'offline' ? 'text-red-600' :
              'text-yellow-600'
            }`}>
              LibreTranslate: {serviceStatus}
            </span>
          </div>

          {serviceStatus === 'offline' && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto">
              <div className="flex items-center space-x-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Service Unavailable</span>
              </div>
              <p className="text-red-600 text-sm mt-1">
                Make sure LibreTranslate is running on {process.env.NEXT_PUBLIC_LIBRETRANSLATE_URL}
              </p>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* File Upload */}
            <FileUpload 
              onFileUpload={setFileState}
              disabled={isProcessing}
            />

            {/* Language Selection */}
            <div className="grid grid-cols-1 gap-4">
              <LanguageSelector
                value={config.sourceLanguage}
                onChange={(lang) => setConfig(prev => ({ ...prev, sourceLanguage: lang }))}
                label="Source Language"
                showAutoDetect={true}
                disabled={isProcessing}
              />
              
              <LanguageSelector
                value={config.targetLanguage}
                onChange={(lang) => setConfig(prev => ({ ...prev, targetLanguage: lang }))}
                label="Target Language"
                disabled={isProcessing}
              />
            </div>

            {/* Advanced Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
              >
                <Settings className="h-4 w-4" />
                <span className="font-medium">Advanced Settings</span>
              </button>

              {showAdvancedSettings && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={config.batchSize}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        batchSize: parseInt(e.target.value) || 50 
                      }))}
                      disabled={isProcessing}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of strings to translate in each batch
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Max Retries
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={config.maxRetries}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        maxRetries: parseInt(e.target.value) || 3 
                      }))}
                      disabled={isProcessing}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Number of retry attempts for failed translations
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="space-y-3">
              {!isProcessing && !session && (
                <button
                  onClick={handleStartTranslation}
                  disabled={!canStartTranslation}
                  className={`
                    w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-md font-medium transition-colors
                    ${canStartTranslation
                      ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  <Play className="h-5 w-5" />
                  <span>Start Translation</span>
                </button>
              )}

              {isProcessing && (
                <button
                  onClick={handlePauseTranslation}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-600 text-white rounded-md font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                >
                  <Pause className="h-5 w-5" />
                  <span>Pause Translation</span>
                </button>
              )}

              {canResumeTranslation && (
                <button
                  onClick={handleResumeTranslation}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-md font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <Play className="h-5 w-5" />
                  <span>Resume Translation</span>
                </button>
              )}

              {(isProcessing || session) && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleStopTranslation}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <Square className="h-4 w-4" />
                    <span>Stop</span>
                  </button>
                  
                  <button
                    onClick={handleResetTranslation}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Middle Column - Progress and Logs */}
          <div className="space-y-6">
            {/* Progress Indicator */}
            <ProgressIndicator 
              session={session}
              isProcessing={isProcessing}
            />

            {/* Log Viewer */}
            <LogViewer 
              logs={logs}
              maxHeight="400px"
              autoScroll={true}
            />
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Diff Viewer */}
            <DiffViewer
              originalData={fileState.content}
              translatedData={session?.translatedJson}
            />

            {/* File Download */}
            <FileDownload
              originalData={fileState.content}
              translatedData={session?.translatedJson}
              disabled={!session?.translatedJson}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
