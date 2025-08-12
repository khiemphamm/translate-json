'use client';

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle } from 'lucide-react';
import { FileUploadState } from '@/types/translation';
import { JsonProcessor } from '@/utils/jsonProcessor';

interface FileUploadProps {
  onFileUpload: (state: FileUploadState) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, disabled }) => {
  const [uploadState, setUploadState] = useState<FileUploadState>({
    file: null,
    content: null,
    isValid: false
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    const file = acceptedFiles[0];
    
    try {
      const text = await file.text();
      const validation = JsonProcessor.validateJson(text);
      
      const newState: FileUploadState = {
        file,
        content: validation.data,
        isValid: validation.isValid,
        error: validation.error
      };

      setUploadState(newState);
      onFileUpload(newState);
    } catch (error) {
      const errorState: FileUploadState = {
        file,
        content: null,
        isValid: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
      
      setUploadState(errorState);
      onFileUpload(errorState);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
      'text/plain': ['.txt']
    },
    multiple: false,
    disabled
  });

  const clearFile = () => {
    const clearState: FileUploadState = {
      file: null,
      content: null,
      isValid: false
    };
    setUploadState(clearState);
    onFileUpload(clearState);
  };

  return (
    <div className="w-full">
      {!uploadState.file ? (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Upload JSON File
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {isDragActive
              ? 'Drop the JSON file here...'
              : 'Drag and drop a JSON file here, or click to select'}
          </p>
          <p className="text-xs text-gray-500">
            Supports .json and .txt files up to 10MB
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-medium text-gray-900">{uploadState.file.name}</h4>
                <p className="text-sm text-gray-500">
                  {JsonProcessor.formatFileSize(uploadState.file.size)}
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              className="text-gray-400 hover:text-gray-600"
              disabled={disabled}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {uploadState.isValid ? (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                <span className="text-sm text-green-700">Valid JSON file</span>
              </div>
              {uploadState.content && (
                <div className="mt-2 text-xs text-gray-600">
                  {JsonProcessor.extractStrings(uploadState.content).length} translatable strings found
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                <span className="text-sm text-red-700">Invalid JSON file</span>
              </div>
              {uploadState.error && (
                <div className="mt-1 text-xs text-red-600">
                  {uploadState.error}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
