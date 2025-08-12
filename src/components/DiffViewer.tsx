'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Plus, 
  Minus, 
  Edit, 
  Check,
  ChevronRight,
  ChevronDown,
  Copy,
  Download
} from 'lucide-react';
import { JsonDiff } from '@/types/translation';
import { JsonProcessor } from '@/utils/jsonProcessor';

interface DiffViewerProps {
  originalData: any;
  translatedData: any;
  className?: string;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalData,
  translatedData,
  className = ''
}) => {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [showUnchanged, setShowUnchanged] = useState(false);
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');

  const diffs = React.useMemo(() => {
    if (!originalData || !translatedData) return [];
    return JsonProcessor.generateDiff(originalData, translatedData);
  }, [originalData, translatedData]);

  const filteredDiffs = showUnchanged 
    ? diffs 
    : diffs.filter(diff => diff.type !== 'unchanged');

  const toggleExpanded = (pathString: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(pathString)) {
      newExpanded.delete(pathString);
    } else {
      newExpanded.add(pathString);
    }
    setExpandedPaths(newExpanded);
  };

  const getChangeIcon = (type: JsonDiff['type']) => {
    switch (type) {
      case 'added':
        return <Plus className="h-4 w-4 text-green-600" />;
      case 'removed':
        return <Minus className="h-4 w-4 text-red-600" />;
      case 'changed':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'unchanged':
        return <Check className="h-4 w-4 text-gray-400" />;
      default:
        return null;
    }
  };

  const getChangeColor = (type: JsonDiff['type']) => {
    switch (type) {
      case 'added':
        return 'bg-green-50 border-green-200';
      case 'removed':
        return 'bg-red-50 border-red-200';
      case 'changed':
        return 'bg-blue-50 border-blue-200';
      case 'unchanged':
        return 'bg-gray-50 border-gray-200';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const formatValue = (value: any): string => {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const copyValue = async (value: any) => {
    try {
      await navigator.clipboard.writeText(formatValue(value));
    } catch (error) {
      console.error('Failed to copy value:', error);
    }
  };

  const downloadDiff = () => {
    const diffText = filteredDiffs.map(diff => {
      const path = diff.path.join('.');
      const original = formatValue(diff.original);
      const translated = formatValue(diff.translated);
      
      return `[${diff.type.toUpperCase()}] ${path}\n${
        diff.type === 'changed' 
          ? `- ${original}\n+ ${translated}`
          : diff.type === 'added'
          ? `+ ${translated}`
          : `- ${original}`
      }\n`;
    }).join('\n');

    const blob = new Blob([diffText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation-diff-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const stats = React.useMemo(() => {
    return diffs.reduce((acc, diff) => {
      acc[diff.type] = (acc[diff.type] || 0) + 1;
      return acc;
    }, {} as Record<JsonDiff['type'], number>);
  }, [diffs]);

  if (!originalData || !translatedData) {
    return (
      <div className="text-center text-gray-500 py-8">
        <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Upload and translate a JSON file to see the diff</p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Translation Diff
          </h3>
          <div className="flex space-x-2">
            <button
              onClick={downloadDiff}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              title="Download diff"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4 mb-4 text-sm">
          <div className="flex items-center space-x-1">
            <Plus className="h-4 w-4 text-green-600" />
            <span>{stats.added || 0} added</span>
          </div>
          <div className="flex items-center space-x-1">
            <Minus className="h-4 w-4 text-red-600" />
            <span>{stats.removed || 0} removed</span>
          </div>
          <div className="flex items-center space-x-1">
            <Edit className="h-4 w-4 text-blue-600" />
            <span>{stats.changed || 0} changed</span>
          </div>
          <div className="flex items-center space-x-1">
            <Check className="h-4 w-4 text-gray-400" />
            <span>{stats.unchanged || 0} unchanged</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <label className="flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={showUnchanged}
                onChange={(e) => setShowUnchanged(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Show unchanged</span>
            </label>

            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">View:</span>
              <select
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as 'side-by-side' | 'unified')}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="side-by-side">Side by side</option>
                <option value="unified">Unified</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => setShowUnchanged(!showUnchanged)}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
          >
            {showUnchanged ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>{showUnchanged ? 'Hide' : 'Show'} unchanged</span>
          </button>
        </div>
      </div>

      {/* Diff Content */}
      <div className="max-h-96 overflow-y-auto">
        {filteredDiffs.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Check className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No differences found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredDiffs.map((diff, index) => {
              const pathString = diff.path.join('.');
              const isExpanded = expandedPaths.has(pathString);
              const hasValue = diff.original !== undefined || diff.translated !== undefined;

              return (
                <div
                  key={index}
                  className={`p-4 ${getChangeColor(diff.type)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {hasValue && (
                        <button
                          onClick={() => toggleExpanded(pathString)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {getChangeIcon(diff.type)}
                      <span className="font-medium text-gray-900">
                        {pathString || '(root)'}
                      </span>
                    </div>
                    <span className={`
                      text-xs font-medium px-2 py-1 rounded-full
                      ${diff.type === 'added' ? 'bg-green-100 text-green-800' :
                        diff.type === 'removed' ? 'bg-red-100 text-red-800' :
                        diff.type === 'changed' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'}
                    `}>
                      {diff.type}
                    </span>
                  </div>

                  {isExpanded && hasValue && (
                    <div className="mt-3 space-y-2">
                      {viewMode === 'side-by-side' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {diff.original !== undefined && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-600">
                                  Original
                                </span>
                                <button
                                  onClick={() => copyValue(diff.original)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Copy value"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">
                                {formatValue(diff.original)}
                              </pre>
                            </div>
                          )}
                          {diff.translated !== undefined && (
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-gray-600">
                                  Translated
                                </span>
                                <button
                                  onClick={() => copyValue(diff.translated)}
                                  className="text-gray-400 hover:text-gray-600"
                                  title="Copy value"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                              <pre className="text-xs bg-white border rounded p-2 overflow-x-auto">
                                {formatValue(diff.translated)}
                              </pre>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {diff.original !== undefined && (
                            <div className="flex items-start space-x-2">
                              <Minus className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                              <pre className="text-xs bg-red-50 border border-red-200 rounded p-2 flex-1 overflow-x-auto">
                                {formatValue(diff.original)}
                              </pre>
                            </div>
                          )}
                          {diff.translated !== undefined && (
                            <div className="flex items-start space-x-2">
                              <Plus className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                              <pre className="text-xs bg-green-50 border border-green-200 rounded p-2 flex-1 overflow-x-auto">
                                {formatValue(diff.translated)}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
