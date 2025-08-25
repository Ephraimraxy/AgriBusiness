import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, FileText, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { useState } from "react";
import InlineDocumentViewer from "./inline-document-viewer";

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date | { seconds: number; nanoseconds: number };
}

export default function TraineeFileDetailsCard() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const {
    data: files = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<UploadedFile[]>({
    queryKey: ["/api/files"],
  });

  const handleDownload = (file: UploadedFile) => {
    window.open(`/api/files/${file.id}/download`, "_blank");
  };

  const handleView = (file: UploadedFile) => {
    console.log('🔍 Attempting to view file:', {
      id: file.id,
      name: file.originalName,
      mimeType: file.mimeType,
      size: file.size
    });
    
    // Check if file is viewable
    const viewableTypes = [
      'application/pdf',
      'text/',
      'image/',
      'application/json',
      'application/xml',
      'text/html',
      'text/css',
      'text/javascript'
    ];
    
    const isViewable = viewableTypes.some(type => 
      file.mimeType.startsWith(type) || file.mimeType.includes(type)
    );
    
    if (!isViewable) {
      toast({
        title: "Cannot Preview",
        description: "This file type cannot be previewed in the browser. Please use download instead.",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedFile(file);
    setIsViewerOpen(true);
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Files refreshed",
        description: "Latest files have been loaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh files. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType.startsWith("video/")) return "🎥";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word")) return "📝";
    if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
    if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📋";
    if (mimeType.includes("zip") || mimeType.includes("rar")) return "🗜️";
    return "📁";
  };

  const formatDate = (date: any) => {
    // Handle Firestore timestamp objects
    if (date && typeof date === 'object' && date.seconds) {
      return new Date(date.seconds * 1000).toLocaleString();
    }
    // Handle regular Date objects or strings
    return new Date(date).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8" />
            File Details
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all uploaded files with detailed information
          </p>
        </div>
      </div>

      {!isViewerOpen && (
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Lecture Materials</CardTitle>
              <Button
                onClick={handleRefresh}
                disabled={isRefetching}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
                {isRefetching ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading files...</p>
                </div>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No files available at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            <span>{getFileIcon(file.mimeType)}</span>
                            <span>{file.originalName}</span>
                          </div>
                        </TableCell>
                        <TableCell>{file.mimeType}</TableCell>
                        <TableCell>{formatBytes(file.size)}</TableCell>
                        <TableCell>{formatDate(file.uploadedAt)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleView(file)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Online
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Document Viewer Section */}
      {selectedFile && isViewerOpen && (
        <Card className="card-shadow mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Viewing: {selectedFile.originalName}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewerOpen(false);
                  setSelectedFile(null);
                }}
              >
                Close Viewer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[600px]">
              <InlineDocumentViewer
                file={selectedFile}
                onClose={() => {
                  setIsViewerOpen(false);
                  setSelectedFile(null);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
