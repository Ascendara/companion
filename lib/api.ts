import { config } from './config'
import { encryptE2EData, decryptE2EData } from './crypto'

const API_BASE_URL = config.apiBaseUrl;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ConnectionResponse {
  sessionId: string;
  displayName: string;
  userId: string;
  message?: string;
}

export interface Download {
  id: string;
  name: string;
  progress: number;
  speed: string;
  eta: string;
  status: 'queued' | 'downloading' | 'paused' | 'stopped' | 'completed' | 'error' | 'extracting';
  size: string;
  downloaded: string;
  error: string | null;
  paused: boolean;
  stopped: boolean;
  timestamp: string;
}

export interface DownloadsResponse {
  downloads: Download[];
  lastUpdated: string;
  hasNewDownloads: boolean;
  newDownloadIds: string[];
  newDownloadsInfo: Array<{ id: string; name: string }>;
}

class ApiClient {
  private sessionId: string | null = null;

  setSessionId(sessionId: string) {
    console.log('[API] Setting session ID:', sessionId)
    this.sessionId = sessionId;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ascendara_session_id', sessionId);
      sessionStorage.setItem('ascendara_session_timestamp', Date.now().toString());
      console.log('[API] Session ID saved to localStorage with timestamp')
    } else {
      console.warn('[API] Window not available, cannot save to localStorage')
    }
  }

  getSessionId(): string | null {
    if (this.sessionId) return this.sessionId;
    if (typeof window !== 'undefined') {
      this.sessionId = localStorage.getItem('ascendara_session_id');
    } else {
      console.warn('[API] Window not available, cannot read from localStorage')
    }
    return this.sessionId;
  }

  isSessionValid(): boolean {
    if (typeof window === 'undefined') return false;
    
    const sessionId = this.getSessionId();
    if (!sessionId) return false;
    
    const timestamp = sessionStorage.getItem('ascendara_session_timestamp');
    if (!timestamp) return true;
    
    const SESSION_TIMEOUT = 24 * 60 * 60 * 1000;
    const age = Date.now() - parseInt(timestamp, 10);
    
    if (age > SESSION_TIMEOUT) {
      console.log('[API] Session expired due to age');
      this.clearSession();
      return false;
    }
    
    return true;
  }

  clearSession() {
    console.log('[API] Clearing session')
    this.sessionId = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ascendara_session_id');
      localStorage.removeItem('ascendara_user_id');
      console.log('[API] Session and user ID cleared from localStorage')
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    if (typeof window !== 'undefined' && localStorage.getItem('mock_mode') === 'true') {
      console.warn('[API] BLOCKED: Real API call attempted in mock mode:', endpoint)
      return {
        success: false,
        error: 'API calls are disabled in mock mode',
      }
    }
    
    console.log(`[API] Making request to: ${API_BASE_URL}${endpoint}`)
    console.log('[API] Request options:', options)
    
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (options.headers) {
        Object.entries(options.headers).forEach(([key, value]) => {
          if (typeof value === 'string') {
            headers[key] = value;
          }
        });
      }

      this.getSessionId();
      if (this.sessionId) {
        console.log('[API] Adding session ID to headers:', this.sessionId)
        headers['X-Session-ID'] = this.sessionId;
      }

      console.log('[API] Request headers:', headers)
      console.log('[API] Request body:', options.body)

      const fetchUrl = `${API_BASE_URL}${endpoint}`
      console.log('[API] Full URL:', fetchUrl)

      const response = await fetch(fetchUrl, {
        ...options,
        headers,
        mode: 'cors',
        credentials: 'omit',
      });

      console.log('[API] Response received')
      console.log('[API] Response status:', response.status)
      console.log('[API] Response ok:', response.ok)
      console.log('[API] Response headers:', Object.fromEntries(response.headers.entries()))

      // Handle rate limiting and other non-JSON responses
      if (response.status === 429) {
        console.error('[API] Rate limit exceeded - too many requests')
        return {
          success: false,
          error: 'Rate limit exceeded. Please wait before trying again.',
        };
      }

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[API] Non-JSON response received:', contentType)
        const text = await response.text();
        console.error('[API] Response text (first 200 chars):', text.substring(0, 200))
        return {
          success: false,
          error: `Server error (${response.status}): ${response.statusText}`,
        };
      }

      const data = await response.json();
      console.log('[API] Response data:', data)

      if (!response.ok) {
        console.error('[API] Request failed:', data.error || `Status ${response.status}`)
        return {
          success: false,
          error: data.error || `Request failed with status ${response.status}`,
        };
      }

      console.log('[API] Request successful')
      return {
        success: true,
        data: data,
      };
    } catch (error) {
      console.error('[API] Request exception:', error)
      console.error('[API] Error type:', error instanceof Error ? error.constructor.name : typeof error)
      console.error('[API] Error message:', error instanceof Error ? error.message : String(error))
      console.error('[API] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
      
      let errorMessage = 'Network error';
      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          errorMessage = 'Cannot connect to server. Please check:\n1. Backend is running at ' + API_BASE_URL + '\n2. CORS is configured\n3. Network connection is active';
          console.error('[API] CORS or network connectivity issue detected')
          console.error('[API] Backend URL:', API_BASE_URL)
          console.error('[API] Make sure the backend allows requests from this origin')
        } else {
          errorMessage = error.message;
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  async verifyCode(code: string): Promise<ApiResponse<ConnectionResponse>> {
    console.log('[API] verifyCode called with code:', code)
    console.log('[API] Code length:', code.length)
    console.log('[API] Code type:', typeof code)
    
    const result = await this.request<ConnectionResponse>('/verify-code', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    
    console.log('[API] verifyCode result:', result)
    
    // Store user ID if connection successful
    if (result.success && result.data) {
      this.setUserId(result.data.userId);
      console.log('[API] Stored user ID from connection:', result.data.userId);
    }
    
    return result;
  }

  async getDownloads(): Promise<ApiResponse<DownloadsResponse>> {
    // Get user ID from session data stored when connecting
    const userId = this.getUserId();
    if (!userId) {
      console.error('[API] No user ID found in session');
      return {
        success: false,
        error: 'No user session found. Please reconnect.',
      };
    }
    
    console.log('[API] Fetching downloads for user:', userId);
    const response = await this.request<any>(`/downloads/${userId}`);
    
    if (response.success && response.data) {
      try {
        // Check if data is E2E encrypted
        if (response.data.e2e_encrypted) {
          console.log('[API] Decrypting E2E encrypted downloads data');
          const decryptedData = await decryptE2EData(response.data, userId);
          return {
            success: true,
            data: decryptedData as DownloadsResponse
          };
        }
        
        // Plain JSON (for backward compatibility or non-sensitive data)
        return {
          success: true,
          data: response.data as DownloadsResponse
        };
      } catch (error) {
        console.error('[API] Failed to decrypt E2E data:', error);
        return {
          success: false,
          error: 'Failed to decrypt data'
        };
      }
    }
    
    return response;
  }
  
  getUserId(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ascendara_user_id');
    }
    return null;
  }
  
  setUserId(userId: string) {
    console.log('[API] Setting user ID:', userId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ascendara_user_id', userId);
    }
  }

  async pauseDownload(downloadId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('[API] Pausing download:', downloadId);
    return this.request<{ message: string }>('/downloads/command', {
      method: 'POST',
      body: JSON.stringify({ 
        command: 'pause',
        downloadId 
      }),
    });
  }

  async resumeDownload(downloadId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('[API] Resuming download:', downloadId);
    return this.request<{ message: string }>('/downloads/command', {
      method: 'POST',
      body: JSON.stringify({ 
        command: 'resume',
        downloadId 
      }),
    });
  }

  async cancelDownload(downloadId: string): Promise<ApiResponse<{ message: string }>> {
    console.log('[API] Killing download:', downloadId);
    return this.request<{ message: string }>('/downloads/command', {
      method: 'POST',
      body: JSON.stringify({ 
        command: 'kill',
        downloadId 
      }),
    });
  }

  async checkConnection(): Promise<ApiResponse<{ connected: boolean }>> {
    return this.request<{ connected: boolean }>('/check-connection');
  }

  async getUserName(): Promise<ApiResponse<{ displayName: string; userId: string }>> {
    console.log('[API] Fetching username');
    const userId = this.getUserId();
    if (!userId) {
      return {
        success: false,
        error: 'No user ID found'
      };
    }
    
    const response = await this.request<any>('/getusername');
    
    if (response.success && response.data) {
      try {
        // Check if data is E2E encrypted
        if (response.data.e2e_encrypted) {
          console.log('[API] Decrypting E2E encrypted username data');
          const decryptedData = await decryptE2EData(response.data, userId);
          return {
            success: true,
            data: decryptedData as { displayName: string; userId: string }
          };
        }
        
        // Plain JSON (for backward compatibility)
        return {
          success: true,
          data: response.data as { displayName: string; userId: string }
        };
      } catch (error) {
        console.error('[API] Failed to decrypt E2E data:', error);
        return {
          success: false,
          error: 'Failed to decrypt data'
        };
      }
    }
    
    return response;
  }

  async checkNotifications(): Promise<ApiResponse<{ hasNewDownloads: boolean; notifications: Array<{ downloadId: string; downloadName: string; timestamp: string; acknowledged: boolean }> }>> {
    console.log('[API] Checking for new download notifications');
    const userId = this.getUserId();
    if (!userId) {
      return {
        success: false,
        error: 'No user ID found'
      };
    }
    
    const response = await this.request<any>('/downloads/check-notifications');
    
    if (response.success && response.data) {
      try {
        // Check if data is E2E encrypted
        if (response.data.e2e_encrypted) {
          console.log('[API] Decrypting E2E encrypted notifications data');
          const decryptedData = await decryptE2EData(response.data, userId);
          return {
            success: true,
            data: decryptedData as { hasNewDownloads: boolean; notifications: Array<{ downloadId: string; downloadName: string; timestamp: string; acknowledged: boolean }> }
          };
        }
        
        // Plain JSON (for backward compatibility)
        return {
          success: true,
          data: response.data as { hasNewDownloads: boolean; notifications: Array<{ downloadId: string; downloadName: string; timestamp: string; acknowledged: boolean }> }
        };
      } catch (error) {
        console.error('[API] Failed to decrypt E2E data:', error);
        return {
          success: false,
          error: 'Failed to decrypt data'
        };
      }
    }
    
    return response;
  }

  async disconnect(): Promise<ApiResponse<{ message: string }>> {
    console.log('[API] Disconnecting device from user account');
    const sessionId = this.getSessionId();
    const userId = this.getUserId();
    
    if (!sessionId || !userId) {
      console.warn('[API] No session or user ID found for disconnect');
      return {
        success: false,
        error: 'No active session to disconnect',
      };
    }

    const result = await this.request<{ message: string }>('/disconnect-device', {
      method: 'POST',
      body: JSON.stringify({ 
        sessionId,
        userId 
      }),
    });

    console.log('[API] Disconnect result:', result);
    
    // Clear local session data regardless of backend response
    this.clearSession();
    
    return result;
  }

  async getFriends(): Promise<ApiResponse<{ friends: Array<{
    uid: string;
    displayName: string;
    email: string;
    photoURL: string;
    status: {
      status: string;
      preferredStatus: string;
      customMessage: string;
      updatedAt?: string;
    };
  }> }>> {
    console.log('[API] Fetching friends list');
    const userId = this.getUserId();
    if (!userId) {
      return {
        success: false,
        error: 'No user ID found'
      };
    }
    
    const response = await this.request<any>('/get-friends', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    
    if (response.success && response.data) {
      try {
        // Check if data is E2E encrypted
        if (response.data.e2e_encrypted) {
          console.log('[API] Decrypting E2E encrypted friends data');
          const decryptedData = await decryptE2EData(response.data, userId);
          return {
            success: true,
            data: decryptedData as { friends: Array<{
              uid: string;
              displayName: string;
              email: string;
              photoURL: string;
              status: {
                status: string;
                preferredStatus: string;
                customMessage: string;
                updatedAt?: string;
              };
            }> }
          };
        }
        
        // Plain JSON (for backward compatibility)
        return {
          success: true,
          data: response.data as { friends: Array<{
            uid: string;
            displayName: string;
            email: string;
            photoURL: string;
            status: {
              status: string;
              preferredStatus: string;
              customMessage: string;
              updatedAt?: string;
            };
          }> }
        };
      } catch (error) {
        console.error('[API] Failed to decrypt E2E data:', error);
        return {
          success: false,
          error: 'Failed to decrypt data'
        };
      }
    }
    
    return response;
  }
}

export const apiClient = new ApiClient();
