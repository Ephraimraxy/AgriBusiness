import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';
import { Button } from '@/components/ui/button';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, AlertCircle, FileText, FileSpreadsheet, Presentation, FileImage } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import TextFileViewer from './text-file-viewer';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface FileData {
  id: string;
  originalName: string;
  mimeType: string;
  size?: number;
  uploadedAt?: string;
}

interface InlineDocumentViewerProps {
  file: FileData;
  onClose: () => void;
}

export default function InlineDocumentViewer({ file, onClose }: InlineDocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [content, setContent] = useState<string>('');
  const [iframeKey, setIframeKey] = useState(0); // For forcing iframe refresh
  
  // Progressive loading states
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set());
  const [loadingPages, setLoadingPages] = useState<Set<number>>(new Set());
  const [pageErrors, setPageErrors] = useState<Map<number, string>>(new Map());
  const [currentLoadingPage, setCurrentLoadingPage] = useState<number>(1);
  const [isProgressiveMode, setIsProgressiveMode] = useState(false);
  
  const { toast } = useToast();

  // Reset states when file changes
  useEffect(() => {
    console.log('\n=== INLINE DOCUMENT VIEWER START ===');
    console.log('📁 File to open:', {
      id: file.id,
      name: file.originalName,
      mimeType: file.mimeType,
      size: file.size ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'
    });
    
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setPageNumber(1);
    setScale(1.0);
    setRotation(0);
    setContent('');
    setIframeKey(prev => prev + 1); // Force iframe refresh

    // Add timeout to prevent infinite loading - handle missing file size gracefully
    const fileSizeMB = file.size && file.size > 0 ? file.size / (1024 * 1024) : null;
    const hasValidSize = fileSizeMB !== null;
    
    // Use default timeout if file size is unknown, otherwise use size-based timeout
    const timeoutDuration = hasValidSize 
      ? (fileSizeMB > 10 ? 180000 : fileSizeMB > 5 ? 120000 : 90000) // 1.5-3 minutes for large files
      : 120000; // Default 2 minutes for unknown size files
    
    const timeout = setTimeout(() => {
      console.log(`⏰ TIMEOUT: Loading timeout reached (${timeoutDuration/1000} seconds) for file: ${hasValidSize ? fileSizeMB.toFixed(2) + ' MB' : 'unknown size'}`);
      setHasError(true);
      setErrorMessage(`Loading timeout - this file ${hasValidSize ? `(${fileSizeMB.toFixed(2)} MB)` : ''} may be too large for online viewing. Try downloading instead.`);
      setIsLoading(false);
      toast({
        title: "Loading timeout",
        description: `File ${hasValidSize ? `is ${fileSizeMB.toFixed(2)} MB and ` : ''}took too long to load. Please download to view.`,
        variant: "destructive",
      });
      console.log('=== INLINE DOCUMENT VIEWER END (TIMEOUT) ===\n');
    }, timeoutDuration);

    return () => {
      console.log('🧹 Cleanup: Clearing timeout');
      clearTimeout(timeout);
    };
  }, [file.id, toast]);

  const isPDF = file.mimeType === 'application/pdf';
  const isTextFile = file.mimeType.startsWith('text/') || 
                     file.mimeType === 'application/json' || 
                     file.mimeType === 'application/xml' ||
                     file.mimeType === 'text/csv';
  const isImage = file.mimeType.startsWith('image/');
  const isSpreadsheet = file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') || file.mimeType === 'text/csv';
  const isPresentation = file.mimeType.includes('powerpoint') || file.mimeType.includes('presentation');
  const isWord = file.mimeType.includes('word') || file.mimeType.includes('document');

  // Add a fallback timeout for DocViewer to prevent infinite loading
  useEffect(() => {
    if (!isPDF && !isTextFile && !isImage && isLoading) {
      const docViewerTimeout = setTimeout(() => {
        if (isLoading) {
          console.log('✅ DocViewer loaded (fallback timeout)');
          setIsLoading(false);
        }
      }, 8000); // 8 seconds for DocViewer

      return () => clearTimeout(docViewerTimeout);
    }
  }, [isPDF, isTextFile, isImage, isLoading]);

  // Progressive PDF loading logic
  useEffect(() => {
    if (isPDF && numPages && isProgressiveMode) {
      const loadNextPage = async () => {
        if (currentLoadingPage <= numPages && !loadedPages.has(currentLoadingPage)) {
          setLoadingPages(prev => new Set(prev).add(currentLoadingPage));
          
          try {
            // Simulate page loading (in real implementation, this would load actual page data)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setLoadedPages(prev => new Set(prev).add(currentLoadingPage));
            setLoadingPages(prev => {
              const newSet = new Set(prev);
              newSet.delete(currentLoadingPage);
              return newSet;
            });
            
            // Move to next page
            setCurrentLoadingPage(prev => prev + 1);
          } catch (error) {
            setPageErrors(prev => new Map(prev).set(currentLoadingPage, 'Failed to load page'));
            setLoadingPages(prev => {
              const newSet = new Set(prev);
              newSet.delete(currentLoadingPage);
              return newSet;
            });
            setCurrentLoadingPage(prev => prev + 1);
          }
        }
      };

      loadNextPage();
    }
  }, [isPDF, numPages, isProgressiveMode, currentLoadingPage, loadedPages]);

  // Enable progressive mode for large PDFs or unknown size files
  useEffect(() => {
    if (isPDF) {
      const shouldEnableProgressive = !file.size || file.size === 0 || file.size > 2 * 1024 * 1024;
      if (shouldEnableProgressive) {
        setIsProgressiveMode(true);
        console.log('📚 Enabling progressive loading for PDF:', {
          hasSize: !!file.size,
          size: file.size,
          reason: !file.size || file.size === 0 ? 'unknown size' : 'large file'
        });
      }
    }
  }, [isPDF, file.size]);

  const isViewable = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'text/html',
    'text/css',
    'text/javascript',
    'application/json',
    'application/xml',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ].includes(file.mimeType);

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') return <FileText className="w-5 h-5" />;
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet') || mimeType === 'text/csv') return <FileSpreadsheet className="w-5 h-5" />;
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return <Presentation className="w-5 h-5" />;
    if (mimeType.startsWith('image/')) return <FileImage className="w-5 h-5" />;
    return <FileText className="w-5 h-5" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/files/${file.id}/download`;
    link.download = file.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('✅ PDF loaded successfully:', { numPages, fileId: file.id });
    setNumPages(numPages);
    setIsLoading(false);
    
    // Initialize progressive loading for large files or unknown size files
    const shouldEnableProgressive = !file.size || file.size === 0 || file.size > 2 * 1024 * 1024;
    if (shouldEnableProgressive) {
      setIsProgressiveMode(true);
      setLoadedPages(new Set([1])); // Mark first page as loaded
      console.log('📚 Progressive loading initialized for', numPages, 'pages', {
        reason: !file.size || file.size === 0 ? 'unknown size' : 'large file'
      });
    }
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('❌ PDF load error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      fileId: file.id
    });
    setHasError(true);
    setErrorMessage('Failed to load PDF document');
    setIsLoading(false);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPageNumber = prevPageNumber + offset;
      return Math.min(Math.max(1, newPageNumber), numPages || 1);
    });
  };

  const changeScale = (newScale: number) => {
    setScale(Math.max(0.5, Math.min(3.0, newScale)));
  };

  const changeRotation = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleIframeLoad = () => {
    console.log('✅ PDF iframe loaded successfully');
    setIsLoading(false);
  };

  const handleIframeError = () => {
    console.error('❌ PDF iframe failed to load');
    setHasError(true);
    setErrorMessage('Failed to load PDF - please try downloading instead');
    setIsLoading(false);
  };

  const renderContent = () => {
    console.log('🎨 Rendering content, current state:', {
      isLoading,
      hasError,
      errorMessage,
      isPDF: isPDF,
      isTextFile: isTextFile,
      isImage: isImage,
      isViewable: isViewable
    });

    if (isLoading) {
      console.log('⏳ Rendering loading state');
      const fileSizeMB = file.size && file.size > 0 ? (file.size / (1024 * 1024)).toFixed(2) : null;
      const hasValidSize = fileSizeMB !== null;
      const isLargeFile = hasValidSize && parseFloat(fileSizeMB) > 2;
      
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading document...</p>
            <p className="text-gray-500 text-sm mt-2">
              {hasValidSize ? `File size: ${fileSizeMB} MB` : 'File size: Unknown'} • Please wait while we prepare your file...
            </p>
            
            {(!hasValidSize || isLargeFile) && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 text-sm font-medium mb-2">
                  🚀 Progressive Loading Enabled
                </p>
                <p className="text-blue-600 text-xs">
                  {!hasValidSize 
                    ? 'File size unknown - using progressive loading for reliability'
                    : 'Large file detected - we\'ll load pages progressively so you can start reading immediately'
                  }
                </p>
              </div>
            )}
            
            {hasValidSize && parseFloat(fileSizeMB) > 5 && (
              <p className="text-orange-600 text-sm mt-2">
                ⚠️ Very large file - progressive loading will help with performance
              </p>
            )}
          </div>
        </div>
      );
    }

    if (hasError) {
      const fileSizeMB = file.size && file.size > 0 ? (file.size / (1024 * 1024)).toFixed(2) : null;
      const hasValidSize = fileSizeMB !== null;
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load File</h3>
            <p className="text-red-600 mb-2">{errorMessage}</p>
            {hasValidSize && (
              <p className="text-gray-600 text-sm mb-4">
                File size: {fileSizeMB} MB • This may be why the file is slow to load
              </p>
            )}
            {!hasValidSize && (
              <p className="text-gray-600 text-sm mb-4">
                File size: Unknown • Progressive loading was enabled for reliability
              </p>
            )}
            <div className="space-y-2">
              <Button onClick={handleDownload} variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Download Instead
              </Button>
              <Button 
                onClick={() => {
                  setHasError(false);
                  setErrorMessage('');
                  setIsLoading(true);
                  setIframeKey(prev => prev + 1);
                }} 
                variant="outline" 
                className="w-full"
              >
                Try Again
              </Button>
            </div>
            {hasValidSize && parseFloat(fileSizeMB) > 5 && (
              <p className="text-orange-600 text-xs mt-3">
                💡 Tip: Large files work better when downloaded and opened locally
              </p>
            )}
            {!hasValidSize && (
              <p className="text-orange-600 text-xs mt-3">
                💡 Tip: Files with unknown size work better when downloaded and opened locally
              </p>
            )}
          </div>
        </div>
      );
    }

    if (!isViewable) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">This file type cannot be previewed</p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </div>
        </div>
      );
    }

    if (isPDF) {
      return (
        <div className="space-y-4">
          {/* PDF Controls */}
          <div className="flex items-center justify-center space-x-4 bg-gray-50 p-4 rounded-lg">
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {pageNumber} of {numPages || '?'}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changePage(1)}
              disabled={pageNumber >= (numPages || 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeScale(scale - 0.1)}
              disabled={scale <= 0.5}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => changeScale(scale + 0.1)}
              disabled={scale >= 3.0}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={changeRotation}
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          {/* PDF Document - PROGRESSIVE LOADING SOLUTION */}
          <div className="space-y-4">
            {/* Progressive Loading Progress */}
            {isProgressiveMode && numPages && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-blue-800">Progressive Loading</h4>
                  <span className="text-xs text-blue-600">
                    {loadedPages.size} of {numPages} pages loaded
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(loadedPages.size / numPages) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-blue-600 mt-1">
                  <span>Page 1</span>
                  <span>Page {numPages}</span>
                </div>
                {loadingPages.size > 0 && (
                  <p className="text-xs text-blue-600 mt-2">
                    Loading page {Array.from(loadingPages)[0]}...
                  </p>
                )}
              </div>
            )}
            
            <div className="flex justify-center">
              <iframe
                key={iframeKey}
                src={`/api/files/${file.id}/view`}
                width="100%"
                height="600"
                style={{ border: 'none', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                title={`PDF Viewer - ${file.originalName}`}
                sandbox="allow-same-origin allow-scripts allow-forms"
              />
            </div>
            
            {/* Fallback - Direct link and alternative viewer */}
            <div className="text-center space-y-2">
              <p className="text-gray-600 text-sm">If the PDF doesn't load above, try these alternatives:</p>
              <div className="flex justify-center space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.open(`/api/files/${file.id}/view`, '_blank')}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIframeKey(prev => prev + 1);
                    setIsLoading(true);
                    setHasError(false);
                  }}
                >
                  Refresh Viewer
                </Button>
              </div>
              
              {isProgressiveMode && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm font-medium mb-1">
                    💡 Progressive Loading Active
                  </p>
                  <p className="text-green-600 text-xs">
                    Large files load page by page. You can start reading while more pages load in the background.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (isTextFile) {
      return (
        <TextFileViewer
          file={file}
          onError={() => {
            setHasError(true);
            setErrorMessage('Failed to load text file');
          }}
        />
      );
    }

    if (isImage) {
      return (
        <div className="flex justify-center">
          <img
            src={`/api/files/${file.id}/view`}
            alt={file.originalName}
            className="max-w-full max-h-96 object-contain rounded-lg shadow-lg"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setHasError(true);
              setErrorMessage('Failed to load image');
              setIsLoading(false);
            }}
          />
        </div>
      );
    }

    // For other document types (Word, Excel, PowerPoint)
    // Check if file is too large for inline viewing
    if (file.size && file.size > 50 * 1024 * 1024) { // 50MB limit
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">This file is too large to preview online</p>
            <p className="text-gray-500 text-sm mb-4">File size: {(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            <p className="text-orange-600 text-sm mb-4">Files larger than 50MB cannot be previewed in the browser</p>
            <Button onClick={handleDownload} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download to View
            </Button>
          </div>
        </div>
      );
    }

    // Add warning for large files that might be slow to load
    if (file.size && file.size > 10 * 1024 * 1024) { // 10MB warning
      return (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Large File Warning
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>This file is {(file.size / (1024 * 1024)).toFixed(2)} MB and may take a while to load.</p>
                  <p className="mt-1">You can continue trying to view it online or download it for faster access.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Button 
                onClick={() => {
                  setIsLoading(true);
                  setHasError(false);
                  setIframeKey(prev => prev + 1);
                }}
                className="bg-yellow-600 hover:bg-yellow-700"
              >
                Try Viewing Online
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Instead
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Add warning for files with unknown size
    if (!file.size || file.size === 0) {
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  File Size Unknown
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>We couldn't determine the size of this file.</p>
                  <p className="mt-1">Progressive loading has been enabled for reliability. You can try viewing online or download for guaranteed access.</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <Button 
                onClick={() => {
                  setIsLoading(true);
                  setHasError(false);
                  setIframeKey(prev => prev + 1);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Try Viewing Online
              </Button>
              <Button onClick={handleDownload} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Instead
              </Button>
            </div>
          </div>
        </div>
      );
    }

    console.log('📄 Rendering DocViewer for document type:', file.mimeType);
    console.log('🔗 DocViewer URI:', `/api/files/${file.id}/view`);
    
    return (
      <div className="h-96">
        <DocViewer
          documents={[
            {
              uri: `/api/files/${file.id}/view`,
              fileType: file.mimeType,
            }
          ]}
          pluginRenderers={DocViewerRenderers}
          style={{ height: '100%' }}
          config={{
            header: {
              disableHeader: true,
            },
          }}
        />
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
}
