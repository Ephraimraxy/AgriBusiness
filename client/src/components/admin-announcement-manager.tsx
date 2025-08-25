import React, { useState } from 'react';
import { Bell, Edit, Trash2, Eye, EyeOff, Users, Building, Globe, Calendar, Clock, User, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { apiRequest } from '@/lib/queryClient';
import type { Announcement } from '@shared/schema';
import { AnnouncementReplies } from './notification-bell';

export default function AdminAnnouncementManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log('AdminAnnouncementManager: Component loaded');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [announcementToDelete, setAnnouncementToDelete] = useState<Announcement | null>(null);
  const [showToggleConfirmDialog, setShowToggleConfirmDialog] = useState(false);
  const [announcementToToggle, setAnnouncementToToggle] = useState<Announcement | null>(null);
  const [selectedAnnouncementForResponses, setSelectedAnnouncementForResponses] = useState<Announcement | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'responses'>('list');

  // Fetch all announcements (no sponsor filter for admin)
  const { data: announcements = [], isLoading } = useAnnouncements(undefined, {
    refetchInterval: 30000,
    staleTime: 15000,
  });

  // Toggle announcement active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await apiRequest(`/api/announcements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Announcement status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update announcement status.",
        variant: "destructive",
      });
    },
  });

  // Delete announcement
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/announcements/${id}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Announcement Deleted",
        description: "Announcement and all its replies have been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete announcement.",
        variant: "destructive",
      });
    },
  });

  // Format date for display
  const formatDate = (date: Date | any) => {
    try {
      // Convert Firestore Timestamp to Date if needed
      const dateObj = date?.toDate ? date.toDate() : new Date(date);
      
      // Validate that we have a valid date
      if (isNaN(dateObj.getTime())) {
        return 'Invalid date';
      }
      
      return dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid date';
    }
  };

  // Handle announcement click
  const handleAnnouncementClick = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDetailDialog(true);
  };

  // Handle view responses click
  const handleViewResponses = (announcement: Announcement) => {
    setSelectedAnnouncementForResponses(announcement);
    setViewMode('responses');
  };

  // Handle back to list
  const handleBackToList = () => {
    setViewMode('list');
    setSelectedAnnouncementForResponses(null);
  };

  // Handle toggle active status
  const handleToggleActive = (announcement: Announcement) => {
    setAnnouncementToToggle(announcement);
    setShowToggleConfirmDialog(true);
  };

  // Confirm toggle status
  const confirmToggleStatus = async () => {
    if (!announcementToToggle) return;
    
    try {
      await toggleActiveMutation.mutateAsync({
        id: announcementToToggle.id,
        isActive: !announcementToToggle.isActive,
      });
      setShowToggleConfirmDialog(false);
      setAnnouncementToToggle(null);
    } catch (error) {
      console.error('Error toggling announcement status:', error);
    }
  };

  // Handle delete
  const handleDelete = (announcement: Announcement) => {
    setAnnouncementToDelete(announcement);
    setShowDeleteConfirmDialog(true);
  };

  // Confirm delete announcement
  const confirmDelete = async () => {
    if (!announcementToDelete) return;
    
    try {
      await deleteMutation.mutateAsync(announcementToDelete.id);
      setShowDeleteConfirmDialog(false);
      setAnnouncementToDelete(null);
    } catch (error) {
      console.error('Error deleting announcement:', error);
    }
  };

  return (
    <div className="space-y-6">
      {viewMode === 'list' ? (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Bell className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Manage Announcements</h2>
                <p className="text-sm text-gray-600">View and manage all announcements</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-blue-50 text-blue-700">
                {announcements.length} Total
              </Badge>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                {announcements.filter(a => a.isActive).length} Active
              </Badge>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Responses Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToList}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Announcements
              </Button>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Announcement Responses</h2>
                <p className="text-sm text-gray-600">
                  Responses to: {selectedAnnouncementForResponses?.title}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

            {/* Main Content */}
      {viewMode === 'list' ? (
        /* Announcements List */
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-400 animate-pulse"></div>
              </div>
              <div className="mt-4 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Announcements</h3>
                <p className="text-gray-500">Please wait while we fetch your announcements...</p>
              </div>
            </div>
          ) : announcements.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Announcements</h3>
                <p className="text-gray-500">No announcements have been created yet.</p>
              </CardContent>
            </Card>
          ) : (
            announcements.map((announcement) => (
              <Card key={announcement.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {announcement.title}
                        </h3>
                        <div className="flex items-center gap-1">
                          {announcement.isActive ? (
                            <Badge variant="outline" className="text-green-600 border-green-300">
                              <Eye className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500 border-gray-300">
                              <EyeOff className="w-3 h-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                          
                          {announcement.sponsorId ? (
                            <Badge variant="secondary">
                              <Building className="w-3 h-3 mr-1" />
                              Sponsor
                            </Badge>
                          ) : (
                            <Badge variant="default">
                              <Globe className="w-3 h-3 mr-1" />
                              Global
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {announcement.message}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{formatDate(announcement.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{announcement.from || 'Admin'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{formatDate(announcement.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAnnouncementClick(announcement)}
                        className="h-8 w-8 p-0"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(announcement)}
                        disabled={toggleActiveMutation.isPending}
                        className="h-8 w-8 p-0"
                        title="Toggle Status"
                      >
                        {announcement.isActive ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewResponses(announcement)}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                        title="View Responses"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(announcement)}
                        disabled={deleteMutation.isPending}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Responses Section */
        <div className="space-y-4">
          {selectedAnnouncementForResponses && (
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {selectedAnnouncementForResponses.title}
                </h3>
                <p className="text-gray-700">
                  {selectedAnnouncementForResponses.message}
                </p>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-lg font-medium text-gray-900">Responses from Trainees</h4>
                <AnnouncementReplies announcementId={selectedAnnouncementForResponses.id} />
              </div>
            </>
          )}
        </div>
      )}

      {/* Announcement Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl" aria-describedby="announcement-detail-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Announcement Details
            </DialogTitle>
          </DialogHeader>
          
          {selectedAnnouncement && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {selectedAnnouncement.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    {selectedAnnouncement.isActive ? (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-gray-500 border-gray-300">
                        Inactive
                      </Badge>
                    )}
                    
                    {selectedAnnouncement.sponsorId ? (
                      <Badge variant="secondary">
                        <Building className="w-3 h-3 mr-1" />
                        Sponsor Specific
                      </Badge>
                    ) : (
                      <Badge variant="default">
                        <Globe className="w-3 h-3 mr-1" />
                        Global
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="bg-white rounded p-3 border mb-3">
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {selectedAnnouncement.message}
                  </p>
                </div>
                
                                 <div className="flex items-center justify-between text-sm text-gray-600">
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1">
                       <Calendar className="w-4 h-4" />
                       <span>Created: {formatDate(selectedAnnouncement.createdAt)}</span>
                     </div>
                     <div className="flex items-center gap-1">
                       <User className="w-4 h-4" />
                       <span>From: {selectedAnnouncement.from || 'Admin'}</span>
                     </div>
                     <div className="flex items-center gap-1">
                       <Clock className="w-4 h-4" />
                       <span>Updated: {formatDate(selectedAnnouncement.updatedAt)}</span>
                     </div>
                   </div>
                 </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleToggleActive(selectedAnnouncement)}
                  disabled={toggleActiveMutation.isPending}
                >
                  {selectedAnnouncement.isActive ? 'Deactivate' : 'Activate'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete(selectedAnnouncement)}
                  disabled={deleteMutation.isPending}
                >
                  Delete
                </Button>
                <Button onClick={() => setShowDetailDialog(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
          
          <div id="announcement-detail-description" className="sr-only">
            Dialog showing detailed information about the selected announcement
          </div>
        </DialogContent>
      </Dialog>



      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirmDialog} onOpenChange={setShowDeleteConfirmDialog}>
        <DialogContent className="max-w-md" aria-describedby="delete-confirmation-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          
          {announcementToDelete && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 mb-1">
                      Delete "{announcementToDelete.title}"?
                    </h4>
                    <p className="text-sm text-red-700">
                      This action cannot be undone. All replies to this announcement will also be permanently deleted.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirmDialog(false);
                    setAnnouncementToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Permanently'
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <div id="delete-confirmation-description" className="sr-only">
            Confirmation dialog for deleting an announcement
          </div>
        </DialogContent>
      </Dialog>

      {/* Toggle Status Confirmation Dialog */}
      <Dialog open={showToggleConfirmDialog} onOpenChange={setShowToggleConfirmDialog}>
        <DialogContent className="max-w-md" aria-describedby="toggle-confirmation-description">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {announcementToToggle?.isActive ? (
                <EyeOff className="w-5 h-5 text-orange-600" />
              ) : (
                <Eye className="w-5 h-5 text-green-600" />
              )}
              {announcementToToggle?.isActive ? 'Deactivate' : 'Activate'} Announcement
            </DialogTitle>
          </DialogHeader>
          
          {announcementToToggle && (
            <div className="space-y-4">
              <div className={`border rounded-lg p-4 ${
                announcementToToggle.isActive 
                  ? 'bg-orange-50 border-orange-200' 
                  : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${
                    announcementToToggle.isActive 
                      ? 'bg-orange-100' 
                      : 'bg-green-100'
                  }`}>
                    {announcementToToggle.isActive ? (
                      <EyeOff className="w-3 h-3 text-orange-600" />
                    ) : (
                      <Eye className="w-3 h-3 text-green-600" />
                    )}
                  </div>
                  <div>
                    <h4 className={`font-medium mb-1 ${
                      announcementToToggle.isActive ? 'text-orange-900' : 'text-green-900'
                    }`}>
                      {announcementToToggle.isActive ? 'Deactivate' : 'Activate'} "{announcementToToggle.title}"?
                    </h4>
                    <p className={`text-sm ${
                      announcementToToggle.isActive ? 'text-orange-700' : 'text-green-700'
                    }`}>
                      {announcementToToggle.isActive 
                        ? 'This announcement will no longer be visible to trainees.'
                        : 'This announcement will become visible to all trainees.'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowToggleConfirmDialog(false);
                    setAnnouncementToToggle(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmToggleStatus}
                  disabled={toggleActiveMutation.isPending}
                  className={announcementToToggle.isActive 
                    ? 'bg-orange-600 hover:bg-orange-700' 
                    : 'bg-green-600 hover:bg-green-700'
                  }
                >
                  {toggleActiveMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Updating...
                    </>
                  ) : (
                    announcementToToggle.isActive ? 'Deactivate' : 'Activate'
                  )}
                </Button>
              </div>
            </div>
          )}
          
          <div id="toggle-confirmation-description" className="sr-only">
            Confirmation dialog for toggling announcement status
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
