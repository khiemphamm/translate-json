'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { Download, FileText, Package, Check } from 'lucide-react';
import { JsonProcessor } from '@/utils/jsonProcessor';

interface FileDownloadProps {
  originalData: any;
  translatedData: any;
  disabled?: boolean;
}

export const FileDownload: React.FC<FileDownloadProps> = ({
  originalData,
  translatedData,
  disabled = false
}) => {
  const [downloadType, setDownloadType] = useState<'full' | 'patch'>('full');
  const [downloading, setDownloading] = useState(false);

  const downloadFile = async (type: 'full' | 'patch') => {
    if (!translatedData || downloading) return;

    setDownloading(true);

    try {
      let content: string;
      let filename: string;
      let mimeType: string;

      if (type === 'full') {
        content = JSON.stringify(translatedData, null, 2);
        filename = `translated-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      } else {
        const patch = JsonProcessor.createPatch(originalData, translatedData);
        content = JSON.stringify(patch, null, 2);
        filename = `translation-patch-${new Date().toISOString().split('T')[0]}.json`;
        mimeType = 'application/json';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);

      // Show success feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const getFileSize = (data: any) => {
    const jsonString = JSON.stringify(data, null, 2);
    return JsonProcessor.formatFileSize(new Blob([jsonString]).size);
  };

  const getPatchSize = () => {
    if (!originalData || !translatedData) return '0 Bytes';
    const patch = JsonProcessor.createPatch(originalData, translatedData);
    return getFileSize(patch);
  };

  const canDownload = translatedData && !disabled;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Download Results
      </h3>

      <div className="space-y-4">
        {/* Download Type Selection */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Download Options
          </label>
          
          <div className="space-y-2">
            {/* Full Translation */}
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                value="full"
                checked={downloadType === 'full'}
                onChange={(e) => setDownloadType(e.target.value as 'full' | 'patch')}
                className="text-blue-600 focus:ring-blue-500"
                disabled={!canDownload}
              />
              <FileText className="h-5 w-5 text-blue-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    Complete Translated JSON
                  </span>
                  {translatedData && (
                    <span className="text-sm text-gray-500">
                      {getFileSize(translatedData)}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Download the full JSON file with all translations applied
                </p>
              </div>
            </label>

            {/* Patch Only */}
            <label className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                value="patch"
                checked={downloadType === 'patch'}
                onChange={(e) => setDownloadType(e.target.value as 'full' | 'patch')}
                className="text-blue-600 focus:ring-blue-500"
                disabled={!canDownload}
              />
              <Package className="h-5 w-5 text-green-500" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">
                    Translation Patch
                  </span>
                  {originalData && translatedData && (
                    <span className="text-sm text-gray-500">
                      {getPatchSize()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Download only the changed values (patch format)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Download Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={() => downloadFile(downloadType)}
            disabled={!canDownload || downloading}
            className={`
              flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors
              ${canDownload && !downloading
                ? 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>
                  Download {downloadType === 'full' ? 'Complete File' : 'Patch'}
                </span>
              </>
            )}
          </button>

          {downloadType === 'full' && canDownload && (
            <button
              onClick={() => downloadFile('patch')}
              disabled={downloading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Package className="h-4 w-4 inline mr-1" />
              Also get patch
            </button>
          )}
        </div>

        {/* File Info */}
        {canDownload && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-sm">
            <div className="flex items-center space-x-2">
              <Check className="h-4 w-4 text-green-500" />
              <span className="text-gray-700">
                Translation completed successfully
              </span>
            </div>
            
            {originalData && translatedData && (
              <div className="text-gray-600 space-y-1">
                <div>
                  Original size: {getFileSize(originalData)}
                </div>
                <div>
                  Translated size: {getFileSize(translatedData)}
                </div>
                <div>
                  Patch size: {getPatchSize()}
                </div>
              </div>
            )}
          </div>
        )}

        {!canDownload && (
          <div className="text-center text-gray-500 py-4">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Complete the translation to download files</p>
          </div>
        )}
      </div>
    </div>
  );
};
