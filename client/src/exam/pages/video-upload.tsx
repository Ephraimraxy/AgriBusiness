import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@exam/lib/queryClient";
import { Button } from "@exam/components/ui/button";
import { Input } from "@exam/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@exam/components/ui/table";
import { Upload, Play, Trash2, Video, Home } from "lucide-react";
import { useToast } from "@exam/hooks/use-toast";
import { formatBytes } from "@exam/lib/utils";
import { useLocation } from "wouter";

interface VideoFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  duration?: number;
  path: string;
  uploadedAt: Date;
}

export default function VideoUpload() {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: videos = [], isLoading } = useQuery<VideoFile[]>({
    queryKey: ['/api/videos'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('video', file);
      });

      const responses = [];
      for (let i = 0; i < files.length; i++) {
        const singleFormData = new FormData();
        singleFormData.append('video', files[i]);
        
        const response = await fetch('/api/videos/upload', {
          method: 'POST',
          body: singleFormData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${files[i].name}`);
        }

        const result = await response.json();
        responses.push(result);
      }

      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({ title: "Videos uploaded successfully!" });
      setSelectedFiles(null);
      // Reset file input
      const fileInput = document.getElementById('video-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    },
    onError: (error: any) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/videos/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete video');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/videos'] });
      toast({ title: "Video deleted successfully!" });
    },
    onError: () => {
      toast({
        title: "Delete failed",
        description: "Could not delete the video",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select video files to upload",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFiles);
    } finally {
      setUploading(false);
    }
  };

  const handlePlay = (video: VideoFile) => {
    window.open(`/api/videos/${video.id}/stream`, '_blank');
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return 'Unknown';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Video className="w-8 h-8" />
            Video Upload System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Upload and manage your video files. Supported formats: MP4, AVI, MKV, MOV, WMV
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

      {/* Upload Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Videos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              id="video-upload"
              type="file"
              accept="video/*"
              multiple
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Selected {selectedFiles.length} file(s):
                <ul className="list-disc list-inside mt-1">
                  {Array.from(selectedFiles).map((file, index) => (
                    <li key={index}>
                      {file.name} ({formatBytes(file.size)})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button
              onClick={handleUpload}
              disabled={!selectedFiles || uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? "Uploading..." : "Upload Videos"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Videos Table */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Videos ({videos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading videos...</div>
          ) : videos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No videos uploaded yet. Start by uploading your first video!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {videos.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell className="font-medium">
                        {video.originalName}
                      </TableCell>
                      <TableCell>{formatBytes(video.size)}</TableCell>
                      <TableCell>{formatDuration(video.duration)}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                          {video.mimeType}
                        </span>
                      </TableCell>
                      <TableCell>{formatDate(video.uploadedAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePlay(video)}
                            className="flex items-center gap-1"
                          >
                            <Play className="w-4 h-4" />
                            Play
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(video.id)}
                            className="flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
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