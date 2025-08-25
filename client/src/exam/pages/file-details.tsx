import { useQuery } from "@tanstack/react-query";
import { Button } from "@exam/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@exam/components/ui/table";
import { Download, FileText, Eye, Home } from "lucide-react";
import { useToast } from "@exam/hooks/use-toast";
import { formatBytes } from "@exam/lib/utils";
import { useLocation } from "wouter";

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export default function FileDetails() {
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: files = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ['/api/files'],
  });



  const handleDownload = (file: UploadedFile) => {
    window.open(`/api/files/${file.id}/download`, '_blank');
  };

  const handleView = (file: UploadedFile) => {
    // For text files, PDFs, images, etc., we can view them in browser
    const viewableTypes = [
      'text/', 'application/pdf', 'image/', 'application/json',
      'application/xml', 'text/html', 'text/css', 'text/javascript'
    ];
    
    const isViewable = viewableTypes.some(type => file.mimeType.startsWith(type));
    
    if (isViewable) {
      window.open(`/api/files/${file.id}/download`, '_blank');
    } else {
      toast({
        title: "Cannot preview",
        description: "This file type cannot be previewed in the browser. Use download instead.",
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return '📋';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
    return '📁';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <FileText className="w-8 h-8" />
            File Details
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all uploaded files with detailed information
          </p>
        </div>
        <Button
          onClick={() => navigate("/")}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Home
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Files ({files.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading files...</div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No files uploaded yet. Go to the file upload page to add files!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getFileIcon(file.mimeType)}</span>
                          {file.originalName}
                        </div>
                      </TableCell>
                      <TableCell>{formatBytes(file.size)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                          {file.mimeType}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(file.uploadedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleView(file)}
                            className="flex items-center gap-1"
                            title="View file"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDownload(file)}
                            className="flex items-center gap-1"
                            title="Download file"
                          >
                            <Download className="w-4 h-4" />
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
    </div>
  );
}