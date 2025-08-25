import React, { useState, useRef } from 'react';
import { Player, ControlBar, BigPlayButton, LoadingSpinner } from 'video-react';
import 'video-react/dist/video-react.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Maximize2, Volume2, VolumeX } from 'lucide-react';

interface VideoViewerProps {
  isOpen: boolean;
  onClose: () => void;
  video: {
    id: string;
    fileName: string;
    originalName: string;
    mimeType: string;
    size: number;
    path: string;
  };
}

export default function VideoViewer({ isOpen, onClose, video }: VideoViewerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const playerRef = useRef<any>(null);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `/api/videos/${video.id}/stream`;
    link.download = video.originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleFullscreen = () => {
    if (playerRef.current) {
      if (isFullscreen) {
        playerRef.current.exitFullscreen();
      } else {
        playerRef.current.requestFullscreen();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const toggleMute = () => {
    if (playerRef.current) {
      const player = playerRef.current.getState();
      if (player.muted) {
        playerRef.current.unmute();
        setIsMuted(false);
      } else {
        playerRef.current.mute();
        setIsMuted(true);
      }
    }
  };

  const handlePlayerReady = (player: any) => {
    playerRef.current = player;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              {video.originalName}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleMute}
                className="text-blue-600 hover:text-blue-700"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
                className="text-purple-600 hover:text-purple-700"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
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

        <div className="flex-1 p-6 bg-black">
          <div className="w-full h-full">
            <Player
              ref={handlePlayerReady}
              fluid={true}
              height="100%"
              width="100%"
              src={`/api/videos/${video.id}/stream`}
              poster=""
              preload="metadata"
            >
              <BigPlayButton position="center" />
              <LoadingSpinner />
              <ControlBar
                autoHide={true}
                autoHideTime={3000}
                className="video-react-control-bar"
              />
            </Player>
          </div>
        </div>

        {/* Video Info */}
        <div className="p-4 bg-gray-50 border-t">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              <span className="font-medium">File:</span> {video.originalName}
            </div>
            <div>
              <span className="font-medium">Size:</span> {(video.size / (1024 * 1024)).toFixed(2)} MB
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
