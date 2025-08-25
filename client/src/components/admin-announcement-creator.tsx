import React, { useState } from 'react';
import { Bell, Send, Eye, EyeOff, Users, Building, Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

interface AdminAnnouncementCreatorProps {
  onClose?: () => void;
}

interface AnnouncementForm {
  title: string;
  message: string;
  sponsorId?: string;
  isActive: boolean;
  isGlobal: boolean;
}

export default function AdminAnnouncementCreator({ onClose }: AdminAnnouncementCreatorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  console.log('AdminAnnouncementCreator: Component loaded');
  
       const [form, setForm] = useState<AnnouncementForm>({
    title: '',
    message: '',
    sponsorId: 'all',
    isActive: true,
    isGlobal: false,
  });
  
  const [showPreview, setShowPreview] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create announcement mutation
  const createAnnouncementMutation = useMutation({
    mutationFn: async (announcementData: Omit<AnnouncementForm, 'isGlobal'>) => {
             const payload = {
         ...announcementData,
         sponsorId: announcementData.sponsorId === 'all' ? undefined : announcementData.sponsorId || undefined, // Convert 'all' to undefined for global
       };
      
      console.log('Creating announcement with payload:', payload);
      
      const response = await apiRequest('/api/announcements', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Announcement Sent!",
        description: "Your announcement has been successfully sent to all trainees.",
      });
      
      // Invalidate announcements cache to refresh
      queryClient.invalidateQueries({ queryKey: ['/api/announcements'] });
      
             // Reset form
       setForm({
         title: '',
         message: '',
         sponsorId: 'all',
         isActive: true,
         isGlobal: false,
       });
      
      if (onClose) {
        onClose();
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to Send Announcement",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim() || !form.message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both title and message fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await createAnnouncementMutation.mutateAsync({
        title: form.title.trim(),
        message: form.message.trim(),
        sponsorId: form.isGlobal ? undefined : form.sponsorId,
        isActive: form.isActive,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form changes
  const handleFormChange = (field: keyof AnnouncementForm, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Character count for message
  const messageLength = form.message.length;
  const maxLength = 1000;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Bell className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create Announcement</h2>
            <p className="text-sm text-gray-600">Send important messages to trainees</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600" />
              Announcement Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter announcement title..."
                  value={form.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  maxLength={100}
                  required
                />
                <p className="text-xs text-gray-500">
                  {form.title.length}/100 characters
                </p>
              </div>



              {/* Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Enter your announcement message..."
                  value={form.message}
                  onChange={(e) => handleFormChange('message', e.target.value)}
                  rows={6}
                  maxLength={maxLength}
                  required
                  className={`resize-none ${messageLength > maxLength * 0.9 ? 'border-orange-300' : ''}`}
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">
                    {messageLength}/{maxLength} characters
                  </span>
                  {messageLength > maxLength * 0.9 && (
                    <span className="text-orange-600">
                      {maxLength - messageLength} characters remaining
                    </span>
                  )}
                </div>
              </div>

              {/* Scope Selection */}
              <div className="space-y-3">
                <Label>Announcement Scope</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isGlobal"
                      checked={form.isGlobal}
                      onCheckedChange={(checked) => {
                        handleFormChange('isGlobal', checked);
                                                 if (checked) {
                           handleFormChange('sponsorId', 'all');
                         }
                      }}
                    />
                    <Label htmlFor="isGlobal" className="flex items-center gap-2 cursor-pointer">
                      <Globe className="w-4 h-4 text-blue-600" />
                      Send to all trainees (Global)
                    </Label>
                  </div>
                  
                  {!form.isGlobal && (
                    <div className="space-y-2">
                      <Label htmlFor="sponsorId" className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-green-600" />
                        Specific Sponsor (Optional)
                      </Label>
                      <Select
                        value={form.sponsorId}
                        onValueChange={(value) => handleFormChange('sponsorId', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a sponsor (or leave empty for all)" />
                        </SelectTrigger>
                                                 <SelectContent>
                           <SelectItem value="all">All Sponsors</SelectItem>
                           {/* Add sponsor options here when available */}
                           <SelectItem value="sponsor1">Sponsor 1</SelectItem>
                           <SelectItem value="sponsor2">Sponsor 2</SelectItem>
                         </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={form.isActive}
                  onCheckedChange={(checked) => handleFormChange('isActive', checked)}
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Make announcement active immediately
                </Label>
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || !form.title.trim() || !form.message.trim()}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Announcement
                    </>
                  )}
                </Button>
                
                {onClose && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview Section */}
        {showPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-green-600" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Preview Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={form.isGlobal ? "default" : "secondary"}>
                      {form.isGlobal ? (
                        <>
                          <Globe className="w-3 h-3 mr-1" />
                          Global
                        </>
                                             ) : (
                         <>
                           <Building className="w-3 h-3 mr-1" />
                           {form.sponsorId && form.sponsorId !== 'all' ? 'Sponsor' : 'All Sponsors'}
                         </>
                       )}
                    </Badge>
                    {form.isActive && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        Active
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>

                {/* Preview Content */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <h3 className="font-semibold text-gray-900">
                    {form.title || 'Announcement Title'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <User className="w-4 h-4" />
                    <span>From: {user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Admin'}</span>
                  </div>
                  <div className="bg-white rounded p-3 border">
                    <p className="text-gray-800 whitespace-pre-wrap">
                      {form.message || 'Your announcement message will appear here...'}
                    </p>
                  </div>
                </div>

                {/* Preview Footer */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>This announcement will be sent to:</p>
                  <ul className="list-disc list-inside space-y-1">
                                         {form.isGlobal ? (
                       <li>All trainees across all sponsors</li>
                     ) : form.sponsorId && form.sponsorId !== 'all' ? (
                       <li>Trainees from the selected sponsor only</li>
                     ) : (
                       <li>All trainees (no sponsor filter)</li>
                     )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
