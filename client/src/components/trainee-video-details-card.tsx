import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Play, Video, Download, RefreshCw } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { useState } from "react";
import InlineVideoViewer from "./inline-video-viewer";
import { useToast } from "@/hooks/use-toast";

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

export default function TraineeVideoDetailsCard() {
  const { toast } = useToast();
  const [selectedVideo, setSelectedVideo] = useState<VideoFile | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const { 
    data: videos = [], 
    isLoading, 
    refetch, 
    isRefetching 
  } = useQuery<VideoFile[]>({
    queryKey: ['/api/videos'],
  });

  const handlePlay = (video: VideoFile) => {
    setSelectedVideo(video);
    setIsViewerOpen(true);
  };

  const handleDownload = (video: VideoFile) => {
    const link = document.createElement('a');
    link.href = `/api/videos/${video.id}/stream`;
    link.download = video.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Videos refreshed",
        description: "Latest videos have been loaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh videos. Please try again.",
        variant: "destructive",
      });
    }
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
    <div className="space-y-6">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Video className="w-8 h-8" />
            Video Details
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View all uploaded videos with detailed information
          </p>
        </div>
      </div>

      {!isViewerOpen && (
        <Card className="card-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Training Videos</CardTitle>
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
                  <p className="text-gray-600">Loading videos...</p>
                </div>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-8">
                <Video className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No videos available at the moment.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Video Name</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Duration</TableHead>
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
                        <TableCell>{formatDate(video.uploadedAt)}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handlePlay(video)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Watch Online
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(video)}
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

      {/* Video Viewer Section */}
      {selectedVideo && isViewerOpen && (
        <Card className="card-shadow mt-6">
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
