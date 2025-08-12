/* eslint-disable @typescript-eslint/no-explicit-any */
import { cloneDeep, isEqual } from 'lodash';
import { JsonDiff } from '@/types/translation';

export class JsonProcessor {
  private static readonly URL_PATTERN = /^https?:\/\/[^\s]+$/i;
  private static readonly HEX_COLOR_PATTERN = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
  private static readonly EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly NUMBER_PATTERN = /^-?\d+(\.\d+)?$/;
  private static readonly PLACEHOLDER_PATTERN = /\{\{[^}]+\}\}|\{[^}]+\}|%[a-zA-Z0-9_]+%|\$\{[^}]+\}/g;
  private static readonly HTML_TAG_PATTERN = /<[^>]+>/g;
  private static readonly VARIABLE_PATTERN = /\$[a-zA-Z_][a-zA-Z0-9_]*|\{[a-zA-Z_][a-zA-Z0-9_]*\}/g;

  static extractStrings(obj: any, path: string[] = []): Array<{ path: string[]; value: string }> {
    const strings: Array<{ path: string[]; value: string }> = [];

    if (typeof obj === 'string') {
      if (this.shouldTranslate(obj)) {
        strings.push({ path: [...path], value: obj });
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        strings.push(...this.extractStrings(item, [...path, index.toString()]));
      });
    } else if (obj && typeof obj === 'object') {
      Object.entries(obj).forEach(([key, value]) => {
        strings.push(...this.extractStrings(value, [...path, key]));
      });
    }

    return strings;
  }

  static shouldTranslate(text: string): boolean {
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Skip empty strings or only whitespace
    if (text.trim().length === 0) {
      return false;
    }

    // Skip if too short (likely abbreviations or codes)
    if (text.trim().length < 2) {
      return false;
    }

    // Skip URLs
    if (this.URL_PATTERN.test(text)) {
      return false;
    }

    // Skip email addresses
    if (this.EMAIL_PATTERN.test(text)) {
      return false;
    }

    // Skip hex colors
    if (this.HEX_COLOR_PATTERN.test(text)) {
      return false;
    }

    // Skip pure numbers
    if (this.NUMBER_PATTERN.test(text.trim())) {
      return false;
    }

    // Skip if it's mostly placeholders/variables (more than 50% of the text)
    const placeholderMatches = text.match(this.PLACEHOLDER_PATTERN) || [];
    const variableMatches = text.match(this.VARIABLE_PATTERN) || [];
    const matchedLength = [...placeholderMatches, ...variableMatches]
      .reduce((sum, match) => sum + match.length, 0);
    
    if (matchedLength > text.length * 0.5) {
      return false;
    }

    // Skip if it's mostly HTML tags
    const htmlMatches = text.match(this.HTML_TAG_PATTERN) || [];
    const htmlLength = htmlMatches.reduce((sum, match) => sum + match.length, 0);
    if (htmlLength > text.length * 0.7) {
      return false;
    }

    // Skip common technical strings
    const technicalPatterns = [
      /^[A-Z_][A-Z0-9_]*$/, // CONSTANT_NAMES
      /^[a-z]+([A-Z][a-z]*)*$/, // camelCase
      /^[a-z]+(-[a-z]+)*$/, // kebab-case
      /^[a-z]+(_[a-z]+)*$/, // snake_case
      /^\d{4}-\d{2}-\d{2}/, // dates
      /^\d+px$|^\d+%$|^\d+em$|^\d+rem$/, // CSS units
      /^rgb\(|^rgba\(|^hsl\(|^hsla\(/i, // CSS colors
    ];

    return !technicalPatterns.some(pattern => pattern.test(text.trim()));
  }

  static applyTranslations(originalObj: any, translations: Map<string, string>): any {
    const result = cloneDeep(originalObj);
    
    const applyToValue = (obj: any, path: string[]): any => {
      if (typeof obj === 'string') {
        const pathKey = path.join('.');
        return translations.get(pathKey) || obj;
      } else if (Array.isArray(obj)) {
        return obj.map((item, index) => 
          applyToValue(item, [...path, index.toString()])
        );
      } else if (obj && typeof obj === 'object') {
        const newObj: any = {};
        Object.entries(obj).forEach(([key, value]) => {
          newObj[key] = applyToValue(value, [...path, key]);
        });
        return newObj;
      }
      return obj;
    };

    return applyToValue(result, []);
  }

  static generateDiff(original: any, translated: any, path: string[] = []): JsonDiff[] {
    const diffs: JsonDiff[] = [];

    if (typeof original === 'string' && typeof translated === 'string') {
      if (original !== translated) {
        diffs.push({
          path: [...path],
          original,
          translated,
          type: 'changed'
        });
      } else {
        diffs.push({
          path: [...path],
          original,
          translated,
          type: 'unchanged'
        });
      }
    } else if (Array.isArray(original) && Array.isArray(translated)) {
      const maxLength = Math.max(original.length, translated.length);
      
      for (let i = 0; i < maxLength; i++) {
        const currentPath = [...path, i.toString()];
        
        if (i >= original.length) {
          diffs.push({
            path: currentPath,
            original: undefined,
            translated: translated[i],
            type: 'added'
          });
        } else if (i >= translated.length) {
          diffs.push({
            path: currentPath,
            original: original[i],
            translated: undefined,
            type: 'removed'
          });
        } else {
          diffs.push(...this.generateDiff(original[i], translated[i], currentPath));
        }
      }
    } else if (original && typeof original === 'object' && translated && typeof translated === 'object') {
      const allKeys = new Set([...Object.keys(original), ...Object.keys(translated)]);
      
      allKeys.forEach(key => {
        const currentPath = [...path, key];
        
        if (!(key in original)) {
          diffs.push({
            path: currentPath,
            original: undefined,
            translated: translated[key],
            type: 'added'
          });
        } else if (!(key in translated)) {
          diffs.push({
            path: currentPath,
            original: original[key],
            translated: undefined,
            type: 'removed'
          });
        } else {
          diffs.push(...this.generateDiff(original[key], translated[key], currentPath));
        }
      });
    } else {
      if (!isEqual(original, translated)) {
        diffs.push({
          path: [...path],
          original,
          translated,
          type: 'changed'
        });
      } else {
        diffs.push({
          path: [...path],
          original,
          translated,
          type: 'unchanged'
        });
      }
    }

    return diffs;
  }

  static validateJson(text: string): { isValid: boolean; error?: string; data?: any } {
    try {
      const data = JSON.parse(text);
      return { isValid: true, data };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error ? error.message : 'Invalid JSON' 
      };
    }
  }

  static deduplicateStrings(strings: Array<{ path: string[]; value: string }>): {
    unique: Array<{ path: string[]; value: string; originalIndices: number[] }>;
    duplicateMap: Map<string, number[]>;
  } {
    const valueMap = new Map<string, number[]>();
    const unique: Array<{ path: string[]; value: string; originalIndices: number[] }> = [];

    // Group strings by value
    strings.forEach((item, index) => {
      if (!valueMap.has(item.value)) {
        valueMap.set(item.value, []);
      }
      valueMap.get(item.value)!.push(index);
    });

    // Create unique array with original indices
    valueMap.forEach((indices, value) => {
      const firstIndex = indices[0];
      unique.push({
        path: strings[firstIndex].path,
        value,
        originalIndices: indices
      });
    });

    return {
      unique,
      duplicateMap: valueMap
    };
  }

  static createPatch(original: any, translated: any): any {
    const patch: any = {};

    const createPatchForPath = (orig: any, trans: any, path: string[] = []): void => {
      if (typeof orig === 'string' && typeof trans === 'string' && orig !== trans) {
        this.setValueAtPath(patch, path, trans);
      } else if (Array.isArray(orig) && Array.isArray(trans)) {
        trans.forEach((item, index) => {
          if (index < orig.length) {
            createPatchForPath(orig[index], item, [...path, index.toString()]);
          }
        });
      } else if (orig && typeof orig === 'object' && trans && typeof trans === 'object') {
        Object.keys(trans).forEach(key => {
          if (key in orig) {
            createPatchForPath(orig[key], trans[key], [...path, key]);
          }
        });
      }
    };

    createPatchForPath(original, translated);
    return patch;
  }

  private static setValueAtPath(obj: any, path: string[], value: any): void {
    let current = obj;
    
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[path[path.length - 1]] = value;
  }

  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  static estimateTranslationCost(strings: string[], tokensPerString = 10): number {
    return strings.reduce((total, str) => total + Math.ceil(str.length / tokensPerString), 0);
  }
}
