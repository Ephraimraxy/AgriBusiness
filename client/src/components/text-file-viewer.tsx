import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TextFileViewerProps {
  file: {
    id: string;
    originalName: string;
    mimeType: string;
    size?: number;
  };
  onError: () => void;
}

export default function TextFileViewer({ file, onError }: TextFileViewerProps) {
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      console.log('\n=== TEXT FILE VIEWER START ===');
      console.log('📝 Fetching text file:', {
        id: file.id,
        name: file.originalName,
        mimeType: file.mimeType
      });
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Add timeout to prevent hanging - longer timeout for larger files
        const controller = new AbortController();
        const fileSizeMB = file.size ? file.size / (1024 * 1024) : 0;
        const timeoutDuration = fileSizeMB > 5 ? 60000 : 30000; // 30-60 seconds for large files
        
        const timeoutId = setTimeout(() => {
          console.log(`⏰ TEXT FILE TIMEOUT: ${timeoutDuration/1000} second timeout reached for ${fileSizeMB.toFixed(2)} MB file`);
          controller.abort();
        }, timeoutDuration);
        
        console.log('🌐 Making fetch request to:', `/api/files/${file.id}/view`);
        const response = await fetch(`/api/files/${file.id}/view`, {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        console.log('✅ Fetch response received:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        console.log('📖 Reading response as text...');
        const text = await response.text();
        console.log('✅ Text content read successfully:', {
          length: text.length,
          preview: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        });
        setContent(text);
        console.log('=== TEXT FILE VIEWER END (SUCCESS) ===\n');
      } catch (err) {
        console.error('❌ Error fetching text file:', err);
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('⏰ Request was aborted due to timeout');
          const fileSizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : 'Unknown';
          setError(`Request timed out - this file (${fileSizeMB} MB) may be too large for online viewing. Try downloading instead.`);
        } else {
          console.log('❌ Other error occurred:', err);
          setError(err instanceof Error ? err.message : 'Failed to load file');
        }
        onError();
        console.log('=== TEXT FILE VIEWER END (ERROR) ===\n');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [file.id, onError]);

  const handleDownload = () => {
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  if (isLoading) {
    const fileSizeMB = file.size ? (file.size / (1024 * 1024)).toFixed(2) : 'Unknown';
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600 text-lg">Loading text file...</p>
        <p className="text-gray-500 text-sm mt-2">
          File size: {fileSizeMB} MB • Please wait while we fetch the content
        </p>
        {fileSizeMB !== 'Unknown' && parseFloat(fileSizeMB) > 5 && (
          <p className="text-orange-600 text-sm mt-2">
            ⚠️ Large file detected - this may take a few minutes
          </p>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load File</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          {file.size && file.size > 5 * 1024 * 1024 && (
            <p className="text-orange-600 text-sm mb-4">
              💡 Tip: Files larger than 5MB work better when downloaded and opened locally
            </p>
          )}
          <Button onClick={handleDownload} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Download Instead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">
              {file.originalName}
            </h3>
            <p className="text-xs text-gray-500">{file.mimeType}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="text-green-600 hover:text-green-700"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        </div>
      </div>
      <div className="p-4">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 p-4 rounded border overflow-auto max-h-96 leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}
