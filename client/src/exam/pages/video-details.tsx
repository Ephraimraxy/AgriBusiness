import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@exam/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@exam/components/ui/table";
import { Play, Video, Home, Download } from "lucide-react";
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

export default function VideoDetails() {
  const [, navigate] = useLocation();

  const { data: videos = [], isLoading } = useQuery<VideoFile[]>({
    queryKey: ['/api/videos'],
  });

  const handlePlay = (video: VideoFile) => {
    window.open(`/api/videos/${video.id}/stream`, '_blank');
  };

  const handleDownload = (video: VideoFile) => {
    const link = document.createElement('a');
    link.href = `/api/videos/${video.id}/stream`;
    link.download = video.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar activeItem="videos" onItemChange={() => {}} />
        <main className="flex-1 p-6">
          <div className="container mx-auto py-8 px-4">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                  <Video className="w-8 h-8" />
                  Video Details
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  View all uploaded videos with detailed information
                </p>
              </div>
              <Button
  onClick={() => navigate("/trainee-dashboard")}
  variant="outline"
  className="flex items-center gap-2"
>
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
  Back
</Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Videos ({videos.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">Loading videos...</div>
                ) : videos.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No videos uploaded yet. Go to the video upload page to add videos!
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {videos.map((video: VideoFile) => (
                          <TableRow key={video.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Video className="w-4 h-4 text-blue-500" />
                                {video.originalName}
                              </div>
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
                                  title="Play video"
                                >
                                  <Play className="w-4 h-4" />
                                  Play
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => handleDownload(video)}
                                  className="flex items-center gap-1"
                                  title="Download video"
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
        </main>
      </div>
    </div>
  );
}