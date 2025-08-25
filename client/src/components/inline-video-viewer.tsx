import React, { useState, useRef } from 'react';
import { Player, ControlBar, BigPlayButton, LoadingSpinner } from 'video-react';
import 'video-react/dist/video-react.css';
import { Button } from '@/components/ui/button';
import { Download, Maximize2, Volume2, VolumeX } from 'lucide-react';

interface VideoData {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
}

interface InlineVideoViewerProps {
  video: VideoData;
  onClose: () => void;
}

export default function InlineVideoViewer({ video, onClose }: InlineVideoViewerProps) {
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
    <div className="w-full">
      <div className="relative">
        <div className="rounded-lg overflow-hidden shadow-lg">
          <Player
            ref={handlePlayerReady}
            src={`/api/videos/${video.id}/stream`}
            fluid={true}
            aspectRatio="16:9"
          >
            <BigPlayButton position="center" />
            <LoadingSpinner />
            <ControlBar />
          </Player>
        </div>

        {/* Custom Controls Overlay */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleMute}
            className="bg-black/50 text-white hover:bg-black/70 border-white/20"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-black/50 text-white hover:bg-black/70 border-white/20"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="bg-black/50 text-white hover:bg-black/70 border-white/20"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Info */}
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg mb-2">{video.originalName}</h3>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Type: {video.mimeType}</p>
          <p>Size: {(video.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
      </div>
    </div>
  );
}
