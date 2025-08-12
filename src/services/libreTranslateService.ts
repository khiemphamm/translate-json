import axios from 'axios';
import { TranslationRequest, TranslationResponse, LanguageInfo } from '@/types/translation';

class LibreTranslateService {
  private baseUrl: string;
  private apiKey?: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_LIBRETRANSLATE_URL || 'http://localhost:5000';
    this.apiKey = process.env.LIBRETRANSLATE_API_KEY;
  }

  async getLanguages(): Promise<LanguageInfo[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/languages`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch languages:', error);
      // Fallback languages
      return [
        { code: 'auto', name: 'Auto Detect' },
        { code: 'en', name: 'English' },
        { code: 'vi', name: 'Vietnamese' },
        { code: 'es', name: 'Spanish' },
        { code: 'fr', name: 'French' },
        { code: 'de', name: 'German' },
        { code: 'it', name: 'Italian' },
        { code: 'pt', name: 'Portuguese' },
        { code: 'ru', name: 'Russian' },
        { code: 'ja', name: 'Japanese' },
        { code: 'ko', name: 'Korean' },
        { code: 'zh', name: 'Chinese' }
      ];
    }
  }

  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    try {
      const payload = {
        ...request,
        ...(this.apiKey && { api_key: this.apiKey })
      };

      const response = await axios.post(`${this.baseUrl}/translate`, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Translation failed: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await axios.post(`${this.baseUrl}/detect`, {
        q: text,
        ...(this.apiKey && { api_key: this.apiKey })
      });
      
      return response.data[0]?.language || 'en';
    } catch (error) {
      console.error('Language detection failed:', error);
      return 'en'; // Fallback to English
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/languages`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

export const libreTranslateService = new LibreTranslateService();
