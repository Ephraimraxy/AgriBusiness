import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@exam/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@exam/components/ui/table";
import { Play, Video, Download } from "lucide-react";
import { formatBytes } from "@exam/lib/utils";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";

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
  const [location, navigate] = useLocation();

  // allow sidebar navigation
  const handleNavChange = (item: string) => {
    switch (item) {
      case "dashboard":
        navigate("/trainee-dashboard");
        break;
      case "videos":
        navigate("/trainee-dashboard?videos=1");
        break;
      case "materials":
        navigate("/trainee-dashboard?materials=1");
        break;
      // Remove take-exam and results navigation cases
      default:
        navigate("/trainee-dashboard");
    }
  };
  const [navState, setNavState] = useState<any>(null);

  useEffect(() => {
    // Try to read navigation state if present (Wouter puts it on window.history.state)
    if (window.history && window.history.state && window.history.state.usr) {
      setNavState(window.history.state.usr);
    }
  }, [location]);

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="grid grid-cols-[auto_1fr] flex-1 min-h-0">
        <Sidebar activeItem="videos" onItemChange={handleNavChange} />
        <main className="p-6 overflow-y-auto min-h-0">
          <div className="container mx-auto py-8 px-4">
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

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-6 px-6 mt-auto">
        <div className="container mx-auto text-center">
          <div className="flex items-center justify-center space-x-3 mb-3">
            <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-6 w-auto" />
            <span className="text-base font-semibold">CSS FARMS Nigeria</span>
          </div>
          <p className="text-gray-400 text-sm">
            Video Management - Agricultural Training Management System
          </p>
        </div>
      </footer>
    </div>
  );
}
