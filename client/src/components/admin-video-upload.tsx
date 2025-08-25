import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Play, Trash2, ArrowLeft, Clock, Download, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import InlineVideoViewer from "./inline-video-viewer";

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

interface AdminVideoUploadProps {
  onBack?: () => void;
  embedded?: boolean;
}

export default function AdminVideoUpload({ onBack, embedded = true }: AdminVideoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: videos = [], isLoading } = useQuery<VideoFile[]>({
    queryKey: ["/api/videos"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (files: FileList) => {
      const responses = [] as any[];
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append("video", files[i]);
        const res = await fetch("/api/videos/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to upload ${files[i].name}`);
        }
        responses.push(await res.json());
      }
      return responses;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ 
        title: "Videos uploaded successfully!", 
        description: "Your videos have been uploaded and are now available for trainees."
      });
      setSelectedFiles(null);
      const input = document.getElementById("video-upload") as HTMLInputElement | null;
      if (input) input.value = "";
    },
    onError: (err: any) => {
      toast({ 
        title: "Upload failed", 
        description: err.message || "Could not upload videos. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete video");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({ title: "Video deleted successfully", description: "The video has been removed from the system." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Delete failed", 
        description: error.message || "Could not delete the video. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({ title: "No files selected", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      await uploadMutation.mutateAsync(selectedFiles);
    } finally {
      setUploading(false);
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return "?";
    const m = Math.floor(duration / 60);
    const s = duration % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const formatDate = (d: Date) => new Date(d).toLocaleString();

  return (
    <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 p-6"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <h2 className="text-2xl font-bold">Video Upload</h2>
        </div>

        {/* Upload Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" /> Upload Videos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input id="video-upload" type="file" accept="video/*" multiple onChange={e => setSelectedFiles(e.target.files)} />
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="text-sm text-gray-600">
                  Selected {selectedFiles.length} file(s)
                </div>
              )}
              <Button onClick={handleUpload} disabled={!selectedFiles || uploading} className="w-full sm:w-auto">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {!isViewerOpen && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Videos ({videos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">Loading...</div>
              ) : videos.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No videos uploaded yet.</div>
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
                      {videos.map(v => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">{v.originalName}</TableCell>
                          <TableCell>{formatBytes(v.size)}</TableCell>
                          <TableCell className="flex items-center gap-1"><Clock className="w-4 h-4 text-slate-500" />{formatDuration(v.duration)}</TableCell>
                          <TableCell>{v.mimeType}</TableCell>
                          <TableCell>{formatDate(v.uploadedAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => {
                                setSelectedVideo(v);
                                setIsViewerOpen(true);
                              }}>
                                <Play className="w-4 h-4 mr-1" />
                                Play
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => window.open(`/api/videos/${v.id}/download`, "_blank")}>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Video</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{v.originalName}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(v.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
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
      </div>

      {/* Video Viewer Section */}
      {selectedVideo && isViewerOpen && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Video className="w-5 h-5" />
                Watching: {selectedVideo.originalName}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewerOpen(false);
                  setSelectedVideo(null);
                }}
              >
                Close Viewer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[600px]">
              <InlineVideoViewer
                video={selectedVideo}
                onClose={() => {
                  setIsViewerOpen(false);
                  setSelectedVideo(null);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
