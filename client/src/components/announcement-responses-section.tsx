import React, { useState } from 'react';
import { MessageSquare, User, Clock, RefreshCw, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useAnnouncementReplies } from '@/hooks/useAnnouncementReplies';
import { useAuth } from '@/hooks/useAuth';

export default function AnnouncementResponsesSection() {
  const { user } = useAuth();
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState<string | null>(null);

  // Fetch all announcements
  const { data: announcements = [], isLoading: announcementsLoading } = useAnnouncements(undefined, {
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Fetch replies for selected announcement
  const { data: replies = [], isLoading: repliesLoading, refetch } = useAnnouncementReplies(selectedAnnouncementId || '');

  const handleRefresh = async () => {
    if (selectedAnnouncementId) {
      await refetch();
      setShowRefreshSuccess(true);
      setTimeout(() => setShowRefreshSuccess(false), 3000);
    }
  };

  const formatDate = (date: Date | any) => {
    try {
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60 * 60));
    
      if (diffInHours < 1) {
        return 'Just now';
      } else if (diffInHours < 24) {
        return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
      } else {
        return dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid date';
    }
  };

  // Filter announcements that have replies
  const announcementsWithReplies = announcements.filter(announcement => 
    announcement.id && announcement.from === (user?.firstName ? `${user.firstName} ${(user as any).lastName || ''}`.trim() : 'Admin')
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between bg-white pb-4 border-b border-gray-200">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Announcement Responses</h3>
          <p className="text-sm text-gray-600">View all responses from trainees to your announcements</p>
        </div>
        {selectedAnnouncementId && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={repliesLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${repliesLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>

      {/* Refresh Success Message */}
      {showRefreshSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Responses refreshed successfully!
            </span>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden mt-4">
        {!selectedAnnouncementId ? (
          /* Announcements List */
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900">Your Announcements</h4>
              
              {announcementsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <span className="text-sm text-gray-600 ml-2">Loading announcements...</span>
                </div>
              ) : announcementsWithReplies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No announcements found</p>
                  <p className="text-xs text-gray-400 mt-1">Create announcements to see responses here</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {announcementsWithReplies.map((announcement) => (
                    <Card 
                      key={announcement.id} 
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedAnnouncementId === announcement.id ? 'ring-2 ring-purple-500' : ''
                      }`}
                      onClick={() => setSelectedAnnouncementId(announcement.id)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg">{announcement.title}</CardTitle>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {announcement.message}
                            </p>
                          </div>
                          <Badge variant="secondary" className="ml-2">
                            {announcement.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(announcement.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>From: {announcement.from || 'Admin'}</span>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Selected Announcement Responses */
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Responses</h4>
              <Badge variant="secondary">{replies.length} responses</Badge>
            </div>
            
            <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50 custom-scrollbar">
              <div className="p-4 space-y-3">
                {repliesLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                    <span className="text-sm text-gray-600 ml-2">Loading responses...</span>
                  </div>
                ) : replies.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No responses yet</p>
                    <p className="text-xs text-gray-400 mt-1">Trainees can respond through their notification bell</p>
                  </div>
                ) : (
                  replies.map((reply) => (
                    <div key={reply.id} className="bg-white rounded-lg p-4 border-l-4 border-l-purple-500 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-purple-600" />
                          <span className="font-medium text-sm text-gray-900">
                            {reply.from}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {reply.fromRole === 'admin' ? 'Admin' : 'Trainee'}
                          </Badge>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(reply.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {reply.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
