import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Send, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createMessage, getUserByEmail, queryDocuments, TRAINEES_COLLECTION } from '@/lib/firebaseService';
import type { ResourcePerson, Trainee } from '@/lib/firebaseService';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourcePerson: ResourcePerson;
}

export default function MessageModal({ isOpen, onClose, resourcePerson }: MessageModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch trainee data directly from Firestore
  const { data: traineeData, isLoading: loadingTrainee } = useQuery<Partial<Trainee>>({
    queryKey: ['trainee', user?.email],
    queryFn: async () => {
      if (!user?.email) throw new Error('No user email available');
      
      // First try to get from trainees collection
      try {
        const trainees = await queryDocuments<Trainee>(TRAINEES_COLLECTION, "email", "==", user.email);
        console.log('Message Modal - Querying trainees collection with email:', user.email);
        console.log('Message Modal - Found trainees:', trainees);
        if (trainees.length > 0) {
          console.log('Found trainee in trainees collection:', trainees[0]);
          return trainees[0];
        }
      } catch (error) {
        console.error('Error fetching from trainees collection:', error);
      }
      
      // Fallback to getUserByEmail
      try {
        const userData = await getUserByEmail(user.email);
        if (userData && userData.role === 'trainee') {
          console.log('Found trainee via getUserByEmail:', userData);
          // Map BaseUser to Partial<Trainee>
          return {
            id: userData.id,
            firstName: (userData as any).firstName,
            surname: (userData as any).surname,
            email: userData.email,
            phone: (userData as any).phone,
            role: 'trainee',
            isVerified: userData.isVerified,
          } as Partial<Trainee>;
        }
      } catch (error) {
        console.error('Error fetching via getUserByEmail:', error);
      }
      
      throw new Error('Trainee not found in any collection');
    },
    enabled: !!user?.email && isOpen,
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    refetchInterval: 10000, // Refresh every 10 seconds for live updates
  });

  // Debug logging
  console.log('MessageModal - User object:', user);
  console.log('MessageModal - Resource Person:', resourcePerson);
  console.log('MessageModal - Trainee data from Firestore:', traineeData);
  console.log('MessageModal - Loading trainee data:', loadingTrainee);

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      console.log('=== MUTATION STARTED ===');
      
      // Use the trainee data fetched directly from Firestore
      if (!traineeData) {
        throw new Error('Trainee information not found. Please wait for data to load or try again.');
      }
      
      console.log('Using trainee data from Firestore:', traineeData);

      type CreateMessageInput = Parameters<typeof createMessage>[0];
      const t = traineeData as Partial<Trainee> & { traineeId?: string };
      const fromId = String(t.id || (t as any).traineeId || t.tagNumber || user?.uid || user?.email || 'unknown');
      const fromTagNumber = String(t.tagNumber || (t as any).traineeId || 'N/A');
      const fromRoom = t.roomNumber ? String(t.roomNumber) : undefined;
      const traineeSponsorId = t.sponsorId ? String(t.sponsorId) : undefined;

      const payload: CreateMessageInput = {
        fromId,
        fromName: `${t.firstName ?? ''} ${t.surname ?? ''}`.trim() || 'Trainee',
        fromEmail: String(t.email || user?.email || ''),
        fromTagNumber,
        ...(fromRoom ? { fromRoom } : {}),
        toId: resourcePerson.id,
        toName: `${resourcePerson.firstName ?? ''} ${resourcePerson.surname ?? ''}`.trim() || 'Resource Person',
        toEmail: resourcePerson.email || '',
        subject: subject.trim(),
        message: message.trim(),
        isRead: false,
        ...(traineeSponsorId ? { traineeSponsorId } : {}),
        messageType: 'trainee_to_rp',
        priority: 'normal',
      } as CreateMessageInput;

      console.log('Sending message with data:', payload);
      return await createMessage(payload);
    },
    onSuccess: () => {
      // Use trainee data from Firestore for success message
      let traineeInfo = '';
      
      if (traineeData) {
        const t = traineeData as Partial<Trainee> & { traineeId?: string };
        const idForInfo = t.tagNumber || (t as any).traineeId || (t.id ? String(t.id) : 'ID');
        traineeInfo = ` (${idForInfo})`;
      }
      
      toast({
        title: "Message sent successfully!",
        description: `Your message has been sent to ${resourcePerson.firstName} ${resourcePerson.surname}${traineeInfo}`,
      });
      
      // Reset form
      setSubject('');
      setMessage('');
      
      // Close modal
      onClose();
      
      // Invalidate notifications to refresh the count
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      
      // Also refresh trainee data queries
      queryClient.invalidateQueries({ queryKey: ['trainee'] });
    },
    onError: (error: any) => {
      console.error('Message send error:', error);
      toast({
        title: "Failed to send message",
        description: error.message || "Please try again later. If the problem persists, please log in again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!subject.trim() || !message.trim()) {
      toast({
        title: "Please fill all fields",
        description: "Subject and message are required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await sendMessageMutation.mutateAsync();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setSubject('');
      setMessage('');
      onClose();
    }
  };

  return (
          <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md" aria-describedby="message-modal-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600" />
            Send Message to {resourcePerson.firstName} {resourcePerson.surname}
          </DialogTitle>
          {/* Live Trainee Information Display */}
          <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-800 space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">From:</span>
                <span>{user?.displayName || 'Trainee'}</span>
              </div>
              
              {loadingTrainee ? (
                <div className="flex items-center gap-2 text-blue-600">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Loading trainee data...</span>
                </div>
              ) : traineeData ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Tag:</span>
                    <span className="font-mono bg-blue-100 px-2 py-1 rounded">
                      {(traineeData as any).tagNumber || (traineeData as any).traineeId || traineeData.id || 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Email:</span>
                    <span className="text-blue-700">{traineeData.email || user?.email || 'N/A'}</span>
                  </div>
                  {traineeData.roomNumber && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Room:</span>
                      <span>{traineeData.roomNumber}</span>
                    </div>
                  )}
                  {traineeData.sponsorId && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Sponsor:</span>
                      <span>{traineeData.sponsorId}</span>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-red-600">
                  <div>Failed to load trainee data</div>
                  <div className="mt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        console.log('=== DEBUG: CHECKING ALL AVAILABLE DATA ===');
                        console.log('User object:', user);
                        console.log('Trainee data query:', { traineeData, loadingTrainee });
                        console.log('Session storage keys:', Object.keys(sessionStorage));
                        console.log('Local storage keys:', Object.keys(localStorage));
                      }}
                      className="text-xs"
                    >
                      Debug: Check Available Data
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter message subject..."
              disabled={isSubmitting}
              maxLength={100}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={5}
              disabled={isSubmitting}
              maxLength={1000}
            />
            <div className="text-xs text-gray-500 text-right">
              {message.length}/1000 characters
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
                         <Button
               type="submit"
               disabled={isSubmitting || !subject.trim() || !message.trim() || loadingTrainee}
               className="flex items-center gap-2"
             >
               {isSubmitting ? (
                 <>
                   <Loader2 className="h-4 w-4 animate-spin" />
                   Sending...
                 </>
               ) : loadingTrainee ? (
                 <>
                   <Loader2 className="h-4 w-4 animate-spin" />
                   Loading...
                 </>
               ) : (
                 <>
                   <Send className="h-4 w-4" />
                   Send Message
                 </>
               )}
             </Button>
          </div>
        </form>
        <div id="message-modal-description" className="sr-only">
          Send a message to the selected resource person
        </div>
      </DialogContent>
    </Dialog>
  );
}
