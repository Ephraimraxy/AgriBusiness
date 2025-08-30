import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let responseBody = '';
    
    try {
      // Get the response text first
      responseBody = await res.text();
      console.log('Raw error response:', responseBody);
      
      // Try to parse as JSON if it looks like JSON
      if (responseBody.trim().startsWith('{') || responseBody.trim().startsWith('[')) {
        try {
          const errorData = JSON.parse(responseBody);
          errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
        } catch (e) {
          // If not valid JSON, use the text as is
          errorMessage = responseBody || res.statusText;
        }
      } else {
        errorMessage = responseBody || res.statusText;
      }
    } catch (error) {
      console.error('Error processing error response:', error);
      errorMessage = `Request failed with status ${res.status}: ${res.statusText}`;
    }
    
    const error = new Error(errorMessage);
    (error as any).status = res.status;
    (error as any).response = responseBody; // Attach the full response
    throw error;
  }
}

// Base URL for API requests
// In production (Render), use relative paths since frontend and API are on same domain
const API_BASE_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_PUBLIC_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | { method: string; body?: string; headers?: Record<string, string> },
  data?: unknown | undefined,
): Promise<Response> {
  // Handle both signatures: (url, options) and (method, url, data)
  let method: string;
  let url: string;
  let body: string | undefined;
  let headers: Record<string, string> = {};

  if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
    // Signature: (url, options)
    url = urlOrMethod;
    method = urlOrOptions.method;
    body = urlOrOptions.body;
    headers = urlOrOptions.headers || {};
  } else {
    // Signature: (method, url, data)
    method = urlOrMethod;
    url = urlOrOptions || '';
    body = data ? JSON.stringify(data) : undefined;
  }

  // Ensure URL starts with a slash
  const apiUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  
  console.log(`Making ${method} request to:`, apiUrl);
  
  try {
    const res = await fetch(apiUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        ...headers
      },
      body: body,
      credentials: "include",
    });

    console.log(`Response status for ${method} ${url}:`, res.status);
    
    // Get response text first to handle both JSON and non-JSON responses
    const responseText = await res.text();
    
    // Create a new response with the text as the body
    const response = new Response(responseText, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers
    });
    
    await throwIfResNotOk(response);
    return response;
  } catch (error) {
    console.error(`API request failed for ${method} ${url}:`, error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        status: (error as any).status,
        response: (error as any).response
      });
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/") as string;
    const apiUrl = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    const res = await fetch(apiUrl, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
