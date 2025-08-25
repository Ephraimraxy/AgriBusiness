import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import DocViewer, { DocViewerRenderers } from 'react-doc-viewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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

interface DocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileData;
}

export default function DocumentViewer({ isOpen, onClose, file }: DocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [content, setContent] = useState<string>('');
  const { toast } = useToast();

  // Reset states when file changes
  useEffect(() => {
    if (isOpen) {
      console.log('DocumentViewer: Opening file', file);
      setIsLoading(true);
      setHasError(false);
      setErrorMessage('');
      setPageNumber(1);
      setScale(1.0);
      setRotation(0);
      setContent('');

      // Add timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        if (isLoading) {
          console.log('DocumentViewer: Loading timeout');
          setHasError(true);
          setErrorMessage('Loading timeout - file may be too large or corrupted');
          setIsLoading(false);
          toast({
            title: "Loading timeout",
            description: "The document took too long to load. Please try downloading it instead.",
            variant: "destructive",
          });
        }
      }, 45000); // 45 seconds timeout

      return () => clearTimeout(timeout);
    }
  }, [isOpen, file.id, isLoading, toast]);

  const isPDF = file.mimeType === 'application/pdf';
  const isTextFile = file.mimeType.startsWith('text/') || 
                     file.mimeType === 'application/json' || 
                     file.mimeType === 'application/xml' ||
                     file.mimeType === 'text/csv';
  const isImage = file.mimeType.startsWith('image/');
  const isSpreadsheet = file.mimeType.includes('excel') || file.mimeType.includes('spreadsheet') || file.mimeType === 'text/csv';
  const isPresentation = file.mimeType.includes('powerpoint') || file.mimeType.includes('presentation');
  const isWord = file.mimeType.includes('word') || file.mimeType.includes('document');

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

  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  const handleDocumentLoadError = (error: Error) => {
    console.error('Error loading document:', error);
    console.error('File details:', { id: file.id, name: file.originalName, type: file.mimeType });
    setIsLoading(false);
    setHasError(true);
    setErrorMessage(`Failed to load ${file.mimeType} document: ${error.message}`);
  };

  const handleDownload = () => {
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
  const rotate = () => setRotation(prev => (prev + 90) % 360);
  const nextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages || 1));
  const prevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));

  const resetView = () => {
    setScale(1.0);
    setRotation(0);
    setPageNumber(1);
  };

  const getFileIcon = () => {
    if (isPDF) return <FileText className="h-8 w-8 text-red-500" />;
    if (isSpreadsheet) return <FileSpreadsheet className="h-8 w-8 text-green-500" />;
    if (isPresentation) return <Presentation className="h-8 w-8 text-orange-500" />;
    if (isWord) return <FileText className="h-8 w-8 text-blue-500" />;
    if (isImage) return <FileImage className="h-8 w-8 text-purple-500" />;
    return <FileText className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isViewable) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Cannot Preview
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="mb-4">
              {getFileIcon()}
            </div>
            <h3 className="text-lg font-semibold mb-2">{file.originalName}</h3>
            <p className="text-gray-600 mb-4">
              This file type ({file.mimeType}) cannot be previewed in the browser.
            </p>
            <Button onClick={handleDownload} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download File
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl w-full h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getFileIcon()}
              <div>
                <DialogTitle className="text-lg font-semibold">
                  {file.originalName}
                </DialogTitle>
                <p className="text-sm text-gray-500">
                  {file.mimeType} • {formatFileSize(file.size)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="text-green-600 hover:text-green-700"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Controls for PDF */}
        {isPDF && !isLoading && !hasError && (
          <div className="px-6 py-2 bg-gray-50 border-b flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={zoomOut} disabled={scale <= 0.5}>
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium">{Math.round(scale * 100)}%</span>
              <Button variant="outline" size="sm" onClick={zoomIn} disabled={scale >= 3.0}>
                <ZoomIn className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={rotate}>
                <RotateCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetView}>
                Reset
              </Button>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={prevPage} disabled={pageNumber <= 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm">
                Page {pageNumber} of {numPages || '?'}
              </span>
              <Button variant="outline" size="sm" onClick={nextPage} disabled={pageNumber >= (numPages || 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Document Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-100">
          <div className="flex justify-center">
            {isLoading && !hasError && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 text-lg">Loading document...</p>
                <p className="text-gray-500 text-sm mt-2">Please wait while we prepare your file</p>
              </div>
            )}

            {hasError && (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Document</h3>
                  <p className="text-gray-600 mb-4">{errorMessage}</p>
                  <div className="space-y-2">
                    <Button onClick={handleDownload} className="w-full">
                      <Download className="w-4 h-4 mr-2" />
                      Download Instead
                    </Button>
                    <Button variant="outline" onClick={() => window.location.reload()} className="w-full">
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !hasError && (
              <div className="w-full">
                {isPDF ? (
                  <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <Document
                      file={`/api/files/${file.id}/download`}
                      onLoadSuccess={handleDocumentLoadSuccess}
                      onLoadError={handleDocumentLoadError}
                      loading={
                        <div className="flex items-center justify-center py-12">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          <span className="ml-2 text-gray-600">Loading PDF...</span>
                        </div>
                      }
                    >
                      <Page
                        pageNumber={pageNumber}
                        scale={scale}
                        rotate={rotation}
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                      />
                    </Document>
                  </div>
                ) : isTextFile ? (
                  <TextFileViewer file={file} onError={() => {
                    setHasError(true);
                    setErrorMessage('Failed to load text file');
                  }} />
                ) : isImage ? (
                  <div className="bg-white shadow-lg rounded-lg overflow-hidden">
                    <img 
                      src={`/api/files/${file.id}/download`}
                      alt={file.originalName}
                      className="max-w-full h-auto"
                      onLoad={() => setIsLoading(false)}
                      onError={() => {
                        setHasError(true);
                        setErrorMessage('Failed to load image');
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-white shadow-lg rounded-lg overflow-hidden">
                    <DocViewer
                      documents={[{
                        uri: `/api/files/${file.id}/download`,
                        fileType: file.mimeType,
                      }]}
                      pluginRenderers={DocViewerRenderers}
                      style={{ height: '100%' }}
                      config={{
                        header: {
                          disableHeader: true,
                        },
                      }}
                    />
                    {/* Fallback error handling for DocViewer */}
                    <div className="absolute inset-0 flex items-center justify-center bg-white" style={{ display: 'none' }} id="docviewer-fallback">
                      <div className="text-center">
                        <p className="text-gray-600 mb-4">Document viewer failed to load</p>
                        <Button onClick={handleDownload}>
                          <Download className="w-4 h-4 mr-2" />
                          Download Instead
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
