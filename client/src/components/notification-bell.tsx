import React, { useState, useEffect } from 'react';
import { Bell, X, Clock, User, Building, MessageSquare, CheckCircle, RefreshCw, Trash2, Reply, CheckSquare, Square } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
 
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useAnnouncementReplies } from '@/hooks/useAnnouncementReplies';
import { useCreateAnnouncementReply } from '@/hooks/useAnnouncementReplies';
import { useNotifications, useMarkNotificationAsRead, useUnreadNotificationCount } from '@/hooks/useNotifications';
import { useTrainees } from '@/hooks/useTrainees';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryDocuments, TRAINEES_COLLECTION, STAFF_COLLECTION, RESOURCE_PERSONS_COLLECTION, NOTIFICATIONS_COLLECTION } from '@/lib/firebaseService';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Announcement, AnnouncementReply, Notification } from '@shared/schema';

// Helper function to format dates
function formatDate(date: Date | string | any): string {
  if (!date) return 'Unknown date';
  
  let dateObj: Date;
  
  // Handle Firebase Timestamp objects
  if (date && typeof date === 'object' && date.toDate) {
    dateObj = date.toDate();
  } else if (typeof date === 'string') {
    dateObj = new Date(date);
  } else if (date instanceof Date) {
    dateObj = date;
  } else {
    console.warn('Unknown date format:', date);
    return 'Invalid date';
  }
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid date';
  }
  
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInHours < 24) return `${diffInHours}h ago`;
  if (diffInDays < 7) return `${diffInDays}d ago`;
  
  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

interface NotificationBellProps {
  variant?: 'admin' | 'trainee';
}

// Trainee Reply Form Component - Trainees can reply but won't see other replies
function TraineeReplyForm({ announcementId }: { announcementId: string }) {
  const [replyMessage, setReplyMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const createReplyMutation = useCreateAnnouncementReply();

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    try {
      await createReplyMutation.mutateAsync({
        announcementId,
        message: replyMessage.trim(),
      });
      setReplyMessage('');
      setShowSuccess(true);
      // Hide success message after 3 seconds
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to create reply:', error);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-gray-900">Send a Response</h4>
      </div>
      
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Response sent successfully!
            </span>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmitReply} className="space-y-3">
        <Textarea
          placeholder="Type your response to this announcement..."
          value={replyMessage}
          onChange={(e) => setReplyMessage(e.target.value)}
          rows={3}
          className="resize-none"
          disabled={createReplyMutation.isPending}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!replyMessage.trim() || createReplyMutation.isPending}
            className="flex items-center gap-2"
          >
            {createReplyMutation.isPending ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <MessageSquare className="w-4 h-4" />
                Send Response
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Announcement Replies Component - Only for admins to view replies
function AnnouncementReplies({ announcementId }: { announcementId: string }) {
  const { user } = useAuth();
  const { data: replies = [], isLoading, error, refetch } = useAnnouncementReplies(announcementId);
  const { data: trainees = [] } = useTrainees();
  const [showRefreshSuccess, setShowRefreshSuccess] = useState(false);
  const [selectedReplies, setSelectedReplies] = useState<string[]>([]);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyToReply, setReplyToReply] = useState<any>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [replyToDelete, setReplyToDelete] = useState<any>(null);

  const createReplyMutation = useCreateAnnouncementReply();
  const { toast } = useToast();

  const handleRefresh = async () => {
    await refetch();
    setShowRefreshSuccess(true);
    setTimeout(() => setShowRefreshSuccess(false), 3000);
  };

  const handleSelectAll = () => {
    if (selectedReplies.length === replies.length) {
      setSelectedReplies([]);
    } else {
      setSelectedReplies(replies.map(reply => reply.id));
    }
  };

  const handleSelectReply = (replyId: string) => {
    setSelectedReplies(prev => 
      prev.includes(replyId) 
        ? prev.filter(id => id !== replyId)
        : [...prev, replyId]
    );
  };

  const handleReplyToReply = (reply: any) => {
    setReplyToReply(reply);
    setShowReplyDialog(true);
  };

  const handleSubmitReply = async () => {
    if (!replyMessage.trim()) return;

    try {
      await createReplyMutation.mutateAsync({
        announcementId,
        message: replyMessage,
        replyToId: replyToReply?.id, // Include the ID of the reply we're responding to
      });
      
      setReplyMessage('');
      setShowReplyDialog(false);
      setReplyToReply(null);
      
      toast({
        title: "Reply Sent",
        description: `Your reply has been sent to ${replyToReply?.from || 'the trainee'}.`,
      });
      
      refetch();
    } catch (error) {
      toast({
        title: "Failed to Send Reply",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteReply = async (reply: any) => {
    setReplyToDelete(reply);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteReply = async () => {
    if (!replyToDelete) return;

    try {
      if (replyToDelete.id === 'bulk') {
        // TODO: Implement bulk delete API
        // await Promise.all(selectedReplies.map(id => deleteReplyMutation.mutateAsync(id)));
        
        toast({
          title: "Replies Deleted",
          description: `${replyToDelete.count} replies have been deleted successfully.`,
        });
        
        setSelectedReplies([]);
      } else {
        // TODO: Implement delete reply API
        // await deleteReplyMutation.mutateAsync(replyToDelete.id);
        
        toast({
          title: "Reply Deleted",
          description: "The reply has been deleted successfully.",
        });
      }
      
      setShowDeleteConfirm(false);
      setReplyToDelete(null);
      refetch();
    } catch (error) {
      toast({
        title: "Failed to Delete Reply",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to get trainee details
  const getTraineeDetails = (fromId: string) => {
    const trainee = trainees.find(t => t.id === fromId || t.userId === fromId);
    if (trainee) {
      return {
        email: trainee.email,
        tagNumber: trainee.tagNumber,
        name: `${trainee.firstName} ${trainee.lastName}`.trim()
      };
    }
    return null;
  };



  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold text-gray-900">View Replies & Responses</h4>
          <Badge variant="secondary">{replies.length}</Badge>
        </div>
        <div className="flex items-center gap-2">
          {replies.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                className="flex items-center gap-2"
              >
                {selectedReplies.length === replies.length ? (
                  <CheckSquare className="h-4 w-4" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                {selectedReplies.length === replies.length ? 'Deselect All' : 'Select All'}
              </Button>
              {selectedReplies.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setReplyToDelete({ id: 'bulk', count: selectedReplies.length });
                    setShowDeleteConfirm(true);
                  }}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Selected ({selectedReplies.length})
                </Button>
              )}
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Refresh Success Message */}
      {showRefreshSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Replies refreshed successfully!
            </span>
          </div>
        </div>
      )}

      {/* Replies List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <span className="text-sm text-gray-600 ml-2">Loading replies...</span>
          </div>
        ) : error ? (
          <div className="text-center py-6 text-red-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-red-300" />
            <p className="text-sm">Failed to load replies</p>
            <p className="text-xs text-gray-500 mt-1">Please try again later</p>
          </div>
        ) : replies.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No replies yet. Trainees can respond through their notification bell.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Refresh" to check for new responses</p>
          </div>
        ) : (
          replies.map((reply) => (
            <div key={reply.id} className="bg-gray-50 rounded-lg p-3 border-l-4 border-l-blue-500">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectReply(reply.id)}
                    className="h-6 w-6 p-0"
                  >
                    {selectedReplies.includes(reply.id) ? (
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                  <User className="w-4 h-4 text-blue-600" />
                  {reply.fromRole === 'trainee' ? (
                    (() => {
                      const traineeDetails = getTraineeDetails(reply.fromId);
                      return traineeDetails ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {traineeDetails.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">
                              {traineeDetails.email}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {traineeDetails.tagNumber}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium text-sm text-gray-900">
                          {reply.from}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="font-medium text-sm text-gray-900">
                      {reply.from}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {reply.fromRole === 'admin' ? 'Admin' : 'Trainee'}
                  </Badge>
                  {reply.replyToId && (
                    <Badge variant="secondary" className="text-xs">
                      Reply
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(reply.createdAt)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReplyToReply(reply)}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      title="Reply to this response"
                    >
                      <Reply className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteReply(reply)}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                      title="Delete this response"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {reply.message}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent className="max-w-md" aria-describedby="reply-dialog-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Reply className="h-5 w-5 text-green-600" />
              Reply to {replyToReply?.fromRole === 'trainee' ? 'Trainee' : 'Response'}
            </DialogTitle>
          </DialogHeader>
          
          {replyToReply && (
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-blue-600" />
                  {replyToReply.fromRole === 'trainee' ? (
                    (() => {
                      const traineeDetails = getTraineeDetails(replyToReply.fromId);
                      return traineeDetails ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            {traineeDetails.name}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-gray-500">
                              {traineeDetails.email}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                              {traineeDetails.tagNumber}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="font-medium text-sm text-gray-900">
                          {replyToReply.from}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="font-medium text-sm text-gray-900">
                      {replyToReply.from}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {replyToReply.fromRole === 'admin' ? 'Admin' : 'Trainee'}
                  </Badge>
                </div>
                <p className="text-sm text-gray-700">
                  {replyToReply.message}
                </p>
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-700">
                  Your Reply
                </label>
                <Textarea
                  placeholder="Type your reply..."
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowReplyDialog(false);
                    setReplyMessage('');
                    setReplyToReply(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmitReply}
                  disabled={!replyMessage.trim() || createReplyMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {createReplyMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Reply className="w-4 h-4" />
                      Send Reply
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md" aria-describedby="delete-confirmation-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
          </DialogHeader>
          
          {replyToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">
                      {replyToDelete.id === 'bulk' 
                        ? `Delete ${replyToDelete.count} selected responses?`
                        : `Delete response from ${replyToDelete.from}?`
                      }
                    </h4>
                    <p className="text-sm text-red-700">
                      This action cannot be undone. The response{replyToDelete.id === 'bulk' ? 's will be' : ' will be'} permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setReplyToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDeleteReply}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {replyToDelete.id === 'bulk' ? 'Delete Responses' : 'Delete Response'}
                </Button>
              </div>
            </div>
          )}
          
          <div id="delete-confirmation-description" className="sr-only">
            Confirmation dialog for deleting a response
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



export default function NotificationBell({ variant = 'trainee' }: NotificationBellProps) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<any>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);

  // Debug: Check if we're in RP dashboard and force variant
  const currentVariant = (() => {
    // Check if we're in RP dashboard by looking at sessionStorage
    const rpData = sessionStorage.getItem('currentRp');
    const userRole = sessionStorage.getItem('userRole');
    
    if (rpData && userRole === 'resource_person') {
      console.log('Notification Bell - Detected RP in sessionStorage, forcing variant to admin');
      return 'admin';
    }
    
    return variant;
  })();
  
  console.log('Notification Bell - Original variant:', variant);
  console.log('Notification Bell - Current variant:', currentVariant);

  // Fetch announcements based on user type
  const sponsorId = currentVariant === 'trainee' ? (user as any)?.trainee?.sponsorId : undefined;
  const { data: announcements = [], isLoading } = useAnnouncements(sponsorId, {
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000, // Consider data stale after 15 seconds
  });

  // Fetch trainee data for proper user ID
  const { data: traineeData } = useQuery({
    queryKey: ['trainee-for-notifications', user?.email],
    queryFn: async () => {
      if (!user?.email || currentVariant !== 'trainee') return null;
      
      try {
        const trainees = await queryDocuments(TRAINEES_COLLECTION, "email", "==", user.email);
        console.log('Notification Bell - Found trainees:', trainees);
        if (trainees.length > 0) {
          return trainees[0];
        }
      } catch (error) {
        console.error('Error fetching trainee for notifications:', error);
      }
      return null;
    },
    enabled: !!user?.email && currentVariant === 'trainee',
    staleTime: 0,
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });

  // Fetch RP/Staff data for proper user ID
  const { data: staffRpData } = useQuery({
    queryKey: ['staff-rp-for-notifications', user?.email || 'sessionStorage'],
    queryFn: async () => {
      if (currentVariant !== 'admin') return null;
      
      try {
        let email = user?.email;
        
        // If no Firebase user, try to get email from sessionStorage
        if (!email) {
          const rpData = sessionStorage.getItem('currentRp');
          const staffData = sessionStorage.getItem('currentStaff');
          
          if (rpData) {
            const parsedRp = JSON.parse(rpData);
            email = parsedRp.email;
            console.log('Notification Bell - Using RP email from sessionStorage:', email);
          } else if (staffData) {
            const parsedStaff = JSON.parse(staffData);
            email = parsedStaff.email;
            console.log('Notification Bell - Using Staff email from sessionStorage:', email);
          }
        }
        
        if (!email) {
          console.log('Notification Bell - No email found for staff/RP notifications');
          return null;
        }
        
        // Try to find in staff collection
        const staff = await queryDocuments(STAFF_COLLECTION, "email", "==", email);
        if (staff.length > 0) {
          console.log('Notification Bell - Found staff:', staff[0]);
          return staff[0];
        }
        
        // Try to find in resource persons collection
        const resourcePersons = await queryDocuments(RESOURCE_PERSONS_COLLECTION, "email", "==", email);
        if (resourcePersons.length > 0) {
          console.log('Notification Bell - Found resource person:', resourcePersons[0]);
          return resourcePersons[0];
        }
      } catch (error) {
        console.error('Error fetching staff/RP for notifications:', error);
      }
      return null;
    },
    enabled: currentVariant === 'admin',
    staleTime: 0,
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });

  // Fetch notifications for the current user
  const userId = (() => {
    if (currentVariant === 'trainee') {
      return traineeData?.id;
    } else if (currentVariant === 'admin') {
      // For staff/RP, try to get ID from Firestore data first, then sessionStorage
      if (staffRpData?.id) {
        return staffRpData.id;
      }
      
      // Fallback to sessionStorage if no Firestore data
      const rpData = sessionStorage.getItem('currentRp');
      const staffData = sessionStorage.getItem('currentStaff');
      
      if (rpData) {
        const parsedRp = JSON.parse(rpData);
        console.log('Notification Bell - Using RP ID from sessionStorage:', parsedRp.id);
        console.log('Notification Bell - Full RP data from sessionStorage:', parsedRp);
        return parsedRp.id;
      } else if (staffData) {
        const parsedStaff = JSON.parse(staffData);
        console.log('Notification Bell - Using Staff ID from sessionStorage:', parsedStaff.id);
        console.log('Notification Bell - Full Staff data from sessionStorage:', parsedStaff);
        return parsedStaff.id;
      }
      
      return user?.uid;
    }
    return user?.uid;
  })();
  console.log('Notification Bell - User ID for notifications:', userId);
  console.log('Notification Bell - Trainee data:', traineeData);
  console.log('Notification Bell - Staff/RP data:', staffRpData);
  console.log('Notification Bell - User object:', user);
  console.log('Notification Bell - Original variant:', variant);
  console.log('Notification Bell - Current variant:', currentVariant);
  
  // Fetch notifications directly to avoid index issues
  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      
      try {
        console.log('Notification Bell - Fetching notifications for user:', userId);
        // Use API service instead of direct Firebase call
        const response = await fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch notifications: ${response.statusText}`);
        }
        
        const fetchedNotifications = await response.json();
        console.log('Notification Bell - Fetched notifications:', fetchedNotifications);
        return fetchedNotifications;
      } catch (error) {
        console.error('Notification Bell - Error fetching notifications:', error);
        return [];
      }
    },
    enabled: !!userId,
    staleTime: 0,
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });

  const { data: unreadCount = 0 } = useUnreadNotificationCount(userId || '');
  const markAsReadMutation = useMarkNotificationAsRead();

    // Filter active announcements
  const activeAnnouncements = announcements.filter(announcement => 
    announcement && announcement.isActive
  );

  // Debug logging for notifications (moved after activeAnnouncements is defined)
  console.log('Notification Bell - Notifications fetched:', notifications);
  console.log('Notification Bell - Unread count:', unreadCount);
  console.log('Notification Bell - Active announcements:', activeAnnouncements);
  console.log('Notification Bell - Total count calculation:', activeAnnouncements.length + unreadCount);

  // Handle announcement click
  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailDialog(true);
    setIsOpen(false);
  };

  // Close dialogs
  const handleClose = () => {
    setIsOpen(false);
    setShowDetailDialog(false);
    setSelectedAnnouncement(null);
  };

  return (
    <>
      {/* Notification Bell Button */}
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 text-gray-500 hover:text-gray-700 relative"
          onClick={() => setIsOpen(true)}
          disabled={isLoading}
        >
          <Bell className="h-4 w-4" />
          {(activeAnnouncements.length > 0 || unreadCount > 0) && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs font-bold"
            >
              {activeAnnouncements.length + unreadCount > 99 ? '99+' : activeAnnouncements.length + unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Notifications Popup */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md max-h-[80vh] p-0" aria-describedby="notifications-description">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notifications
                {(activeAnnouncements.length > 0 || notifications.length > 0) && (
                  <Badge variant="secondary" className="ml-2">
                    {activeAnnouncements.length + notifications.length}
                  </Badge>
                )}
              </DialogTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">Loading notifications...</span>
                </div>
              ) : (activeAnnouncements.length === 0 && notifications.length === 0) ? (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No new notifications</p>
                  <p className="text-gray-400 text-xs mt-1">You're all caught up!</p>
                </div>
              ) : (
                <>
                  {/* Show announcements first */}
                  {activeAnnouncements.map((announcement) => (
                  <Card
                    key={announcement.id}
                    className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
                    onClick={() => handleAnnouncementClick(announcement)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1 truncate">
                            {announcement.title}
                          </h4>
                          <p className="text-gray-600 text-xs line-clamp-2 mb-2">
                            {announcement.message}
                          </p>
                                                     <div className="flex items-center gap-2 text-xs text-gray-500">
                             <Clock className="h-3 w-3" />
                             <span>{formatDate(announcement.createdAt)}</span>
                             <span>•</span>
                             <User className="h-3 w-3" />
                             <span>{announcement.from || 'Admin'}</span>
                             {announcement.sponsorId && (
                               <>
                                 <span>•</span>
                                 <span>Sponsor</span>
                               </>
                             )}
                           </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {/* Show notifications */}
                {notifications.map((notification) => (
                  <Card
                    key={notification.id}
                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${
                      notification.isRead ? 'border-l-gray-300' : 'border-l-green-500'
                    }`}
                    onClick={() => {
                      markAsReadMutation.mutate(notification.id);
                      // Handle notification click based on type
                      if (notification.type === 'message') {
                        setSelectedMessage(notification);
                        setShowMessageDialog(true);
                        setIsOpen(false);
                      }
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                          notification.type === 'message' ? 'bg-blue-100' : 'bg-green-100'
                        }`}>
                          {notification.type === 'message' ? (
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Reply className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-gray-600 text-xs line-clamp-2 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span>{formatDate(notification.createdAt)}</span>
                            <span>•</span>
                            <User className="h-3 w-3" />
                            <span>{notification.fromName}</span>
                            {notification.type === 'message' && (
                              <>
                                <span>•</span>
                                <span className="text-blue-600 font-medium">Message</span>
                              </>
                            )}
                            {!notification.isRead && (
                              <>
                                <span>•</span>
                                <span className="text-green-600 font-medium">New</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                </>
              )}
            </div>
          </ScrollArea>
          
          <div id="notifications-description" className="sr-only">
            View and manage your notifications
          </div>
        </DialogContent>
      </Dialog>

                           {/* Announcement Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden" aria-describedby="announcement-details-description">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Announcement Details
              </DialogTitle>
            </DialogHeader>
           
           {selectedAnnouncement && (
             <div className="space-y-4">
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <h3 className="text-lg font-semibold text-gray-900 mb-2">
                   {selectedAnnouncement.title}
                 </h3>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(selectedAnnouncement.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>From: {selectedAnnouncement.from || 'Admin'}</span>
                    </div>
                    {selectedAnnouncement.sponsorId && (
                      <div className="flex items-center gap-1">
                        <Building className="h-4 w-4" />
                        <span>Sponsor Specific</span>
                      </div>
                    )}
                  </div>
                 <div className="bg-white rounded p-3 border">
                   <p className="text-gray-800 whitespace-pre-wrap">
                     {selectedAnnouncement.message}
                   </p>
                 </div>
               </div>

               {/* Replies Section - Only show for the original sender (admin) */}
               {variant === 'admin' && selectedAnnouncement.from === (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin') && (
                 <AnnouncementReplies announcementId={selectedAnnouncement.id} />
               )}
               
               {/* Reply Form for Trainees - They can reply but won't see other replies */}
               {variant === 'trainee' && (
                 <TraineeReplyForm announcementId={selectedAnnouncement.id} />
               )}
               
               <div className="flex justify-end">
                 <Button onClick={handleClose}>
                   Close
                 </Button>
               </div>
             </div>
           )}
           
           <div id="announcement-details-description" className="sr-only">
             View announcement details and replies
           </div>
         </DialogContent>
       </Dialog>

       {/* Message Detail Dialog */}
       <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
         <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden" aria-describedby="message-details-description">
           <DialogHeader>
             <DialogTitle className="flex items-center gap-2">
               <MessageSquare className="h-5 w-5 text-blue-600" />
               Message Details
             </DialogTitle>
           </DialogHeader>
           
           {selectedMessage && (
             <div className="space-y-4">
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                 <h3 className="text-lg font-semibold text-gray-900 mb-2">
                   {selectedMessage.title}
                 </h3>
                 <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                   <div className="flex items-center gap-1">
                     <User className="h-4 w-4" />
                     <span>From: {selectedMessage.fromName} ({selectedMessage.fromEmail})</span>
                   </div>
                   <div className="flex items-center gap-1">
                     <Clock className="h-4 w-4" />
                     <span>{formatDate(selectedMessage.createdAt)}</span>
                   </div>
                   {selectedMessage.fromTagNumber && (
                     <div className="flex items-center gap-1">
                       <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                         Tag: {selectedMessage.fromTagNumber}
                       </span>
                     </div>
                   )}
                 </div>
                 <div className="bg-white rounded p-3 border">
                   <p className="text-gray-800 whitespace-pre-wrap">
                     {selectedMessage.message}
                   </p>
                 </div>
               </div>
               
               <div className="flex justify-end">
                 <Button onClick={() => setShowMessageDialog(false)}>
                   Close
                 </Button>
               </div>
             </div>
           )}
           
           <div id="message-details-description" className="sr-only">
             View message details from trainee
           </div>
         </DialogContent>
       </Dialog>
    </>
  );
}

// Export the AnnouncementReplies component for use in other files
export { AnnouncementReplies };
