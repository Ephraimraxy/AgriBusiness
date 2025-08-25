import { Link } from "wouter";
import { useState, useEffect } from "react";
import { 
  Building2, 
  Bed, 
  Calendar, 
  Users, 
  Settings, 
  Plus,
  Search,
  Filter,
  ArrowLeft,
  Upload,
  Tag,
  Trash2,
  ChevronDown,
  MoreHorizontal,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  createRoom, 
  createTagNumber, 
  getRooms, 
  getTagNumbers, 
  getFacilities,
  getHousekeepingTasks,
  getGuestServices,
  getTrainees,
  deleteRoom,
  deleteTagNumber,
  updateDocument,
  synchronizeAllocations,
  type Room, 
  type TagNumber,
  type Facility,
  type HousekeepingTask,
  type GuestService,
  type Trainee
} from "@/lib/firebaseService";
import * as XLSX from 'xlsx';

export default function ResortManagementPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tagNumbers, setTagNumbers] = useState<TagNumber[]>([]);
  const [trainees, setTrainees] = useState<Trainee[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isDeepRefreshing, setIsDeepRefreshing] = useState(false);
  const [isDeepRefreshingTags, setIsDeepRefreshingTags] = useState(false);

  // Search and filter states
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('all');
  const [tagStatusFilter, setTagStatusFilter] = useState<string>('all');
  const [showRoomFilterDropdown, setShowRoomFilterDropdown] = useState(false);
  const [showTagFilterDropdown, setShowTagFilterDropdown] = useState(false);

  // Filtered data
  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.roomNumber?.toLowerCase().includes(roomSearchTerm.toLowerCase()) ||
                         room.block?.toLowerCase().includes(roomSearchTerm.toLowerCase()) ||
                         room.bedSpace?.toLowerCase().includes(roomSearchTerm.toLowerCase());
    
    const matchesStatus = roomStatusFilter === 'all' || 
                         (roomStatusFilter === 'available' && room.status === 'available') ||
                         (roomStatusFilter === 'occupied' && room.status === 'occupied') ||
                         (roomStatusFilter === 'maintenance' && room.status === 'maintenance');
    
    return matchesSearch && matchesStatus;
  });

  const filteredTags = tagNumbers.filter(tag => {
    const matchesSearch = tag.tagNo?.toLowerCase().includes(tagSearchTerm.toLowerCase());
    
    const matchesStatus = tagStatusFilter === 'all' || 
                         (tagStatusFilter === 'available' && tag.status === 'available') ||
                         (tagStatusFilter === 'assigned' && tag.status === 'assigned');
    
    return matchesSearch && matchesStatus;
  });

  // Function to deep refresh tag statuses
  const handleDeepRefreshTags = async () => {
    try {
      setIsDeepRefreshingTags(true);
      showMessage("Deep refresh started", "Checking tag assignments and updating statuses...", "success");

      // Fetch all trainees and tag numbers from database
      const allTrainees = await getTrainees();
      const allTags = await getTagNumbers();

      // Calculate tag usage
      const tagUsage = new Map();
      allTrainees.forEach(trainee => {
        if (trainee.tagNumber) {
          const tag = allTags.find(t => t.tagNo === trainee.tagNumber);
          if (tag) {
            const current = tagUsage.get(tag.tagNo) || { assigned: false };
            tagUsage.set(tag.tagNo, { assigned: true });
          }
        }
      });

      // Update tag statuses
      const batch = new Map();
      tagUsage.forEach((usage, tagNo) => {
        const tag = allTags.find(t => t.tagNo === tagNo);
        if (tag) {
          const newStatus = usage.assigned ? 'assigned' : 'available';
          batch.set(tag.id, { status: newStatus });
        }
      });

      // Update tags in batch
      Array.from(batch.entries()).forEach(async ([tagId, updates]) => {
        await updateDocument("tagNumbers", tagId, updates);
      });

      // Refresh the tag list
      const updatedTags = await getTagNumbers();
      setTagNumbers(updatedTags);

      showMessage("Deep refresh completed", "Tag statuses have been updated based on current assignments.", "success");
    } catch (error) {
      console.error('Error during deep refresh:', error);
      showMessage("Deep refresh failed", "Failed to update tag statuses.", "error");
    } finally {
      setIsDeepRefreshingTags(false);
    }
  };


  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>([]);
  const [guestServices, setGuestServices] = useState<GuestService[]>([]);
  const [isImportingRooms, setIsImportingRooms] = useState(false);
  const [isImportingTags, setIsImportingTags] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [currentImportIndex, setCurrentImportIndex] = useState(0);
  const [importType, setImportType] = useState<'rooms' | 'tags' | null>(null);
  const [importCount, setImportCount] = useState(0);
  
  // Selection states
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMoreSections, setShowMoreSections] = useState(false);
  
  // Delete confirmation states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'rooms' | 'tags' | null>(null);
  const [deleteCount, setDeleteCount] = useState(0);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [currentDeleteIndex, setCurrentDeleteIndex] = useState(0);
  const [isManualCleaning, setIsManualCleaning] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  
  // Message dialog states
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageDescription, setMessageDescription] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success');

  // Helper function to show message dialogs
  const showMessage = (title: string, description: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setMessageTitle(title);
    setMessageDescription(description);
    setMessageType(type);
    setShowMessageDialog(true);
  };

  // Fetch data from Firebase on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, tagsData, traineesData, facilitiesData, housekeepingData, guestServicesData] = await Promise.all([
          getRooms(),
          getTagNumbers(),
          getTrainees(),
          getFacilities(),
          getHousekeepingTasks(),
          getGuestServices()
        ]);
        setRooms(roomsData);
        setTagNumbers(tagsData);
        setTrainees(traineesData);
        setFacilities(facilitiesData);
        setHousekeepingTasks(housekeepingData);
        setGuestServices(guestServicesData);
      } catch (error) {
        console.error('Error fetching data:', error);
        showMessage("Error loading data", "Failed to load data from database.", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.filter-dropdown')) {
        setShowRoomFilterDropdown(false);
        setShowTagFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Room selection handlers
  const handleSelectAllRooms = (checked: boolean) => {
    if (checked) {
      setSelectedRooms(filteredRooms.map(room => room.id!));
    } else {
      setSelectedRooms([]);
    }
  };

  const handleSelectRoom = (roomId: string, checked: boolean) => {
    if (checked) {
      setSelectedRooms(prev => [...prev, roomId]);
    } else {
      setSelectedRooms(prev => prev.filter(id => id !== roomId));
    }
  };

  const handleDeepRefresh = async () => {
    try {
      setIsDeepRefreshing(true);
      showMessage("Deep refresh started", "Checking room assignments and updating statuses...", "success");
      
      // Get all trainees and rooms
      const allTrainees = await getTrainees();
      const allRooms = await getRooms();
      
      // Create a map of room occupancy
      const roomOccupancy = new Map<string, { occupants: number; bedSpace: number }>();
      
      // Count occupants for each room
      allTrainees.forEach(trainee => {
        if (trainee.roomNumber && trainee.roomBlock) {
          const roomKey = `${trainee.roomNumber}-${trainee.roomBlock}`;
          const room = allRooms.find(r => r.roomNumber === trainee.roomNumber && r.block === trainee.roomBlock);
          
          if (room) {
            const current = roomOccupancy.get(roomKey) || { occupants: 0, bedSpace: parseInt(room.bedSpace || '1') };
            roomOccupancy.set(roomKey, { 
              occupants: current.occupants + 1,
              bedSpace: current.bedSpace
            });
          }
        }
      });

      // Update room statuses
      const batch = new Map<string, { status: string; currentOccupancy: number }>();
      
      roomOccupancy.forEach(({ occupants, bedSpace }, roomKey) => {
        const [roomNumber, block] = roomKey.split('-');
        const room = allRooms.find(r => r.roomNumber === roomNumber && r.block === block);
        
        if (room) {
          let newStatus: string;
          
          if (bedSpace === 1) {
            newStatus = occupants > 0 ? 'fully_occupied' : 'available';
          } else if (bedSpace === 2) {
            newStatus = occupants === 0 ? 'available' :
                       occupants === 1 ? 'partially_occupied' :
                       'fully_occupied';
          } else {
            newStatus = occupants > 0 ? 'occupied' : 'available';
          }
          
          batch.set(room.id!, { 
            status: newStatus,
            currentOccupancy: occupants
          });
        }
      });

      // Update room statuses in batch
      Array.from(batch.entries()).forEach(async ([roomId, updates]) => {
        await updateDocument("rooms", roomId, updates);
      });

      // Refresh data
      const updatedRooms = await getRooms();
      setRooms(updatedRooms);
      
      showMessage("Deep refresh completed", "Room statuses have been updated based on current occupancy.", "success");
    } catch (error) {
      console.error('Error during deep refresh:', error);
      showMessage("Deep refresh failed", "Failed to update room statuses.", "error");
    } finally {
      setIsDeepRefreshing(false);
    }
  };

  const handleDeleteRooms = () => {
    if (selectedRooms.length === 0) {
      showMessage("No rooms selected", "Please select rooms to delete.", "warning");
      return;
    }

    setDeleteType('rooms');
    setDeleteCount(selectedRooms.length);
    setShowDeleteDialog(true);
  };

  const confirmDeleteRooms = async () => {
    try {
      setIsDeleting(true);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
      
      // Get the rooms that will be deleted for cleanup
      const roomsToDelete = rooms.filter(room => selectedRooms.includes(room.id!));
      
      // Delete selected rooms with progress
      for (let i = 0; i < selectedRooms.length; i++) {
        const roomId = selectedRooms[i];
        setCurrentDeleteIndex(i + 1);
        setDeleteProgress(((i + 1) / selectedRooms.length) * 100);
        
        await deleteRoom(roomId);
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clean up trainee records
      setDeleteProgress(90);
      await cleanupTraineeRecords(roomsToDelete, []);

      // Refresh rooms list
      setDeleteProgress(95);
      const updatedRooms = await getRooms();
      setRooms(updatedRooms);
      setSelectedRooms([]);

      setDeleteProgress(100);
                showMessage("Rooms deleted successfully", `${deleteCount} room(s) have been deleted and trainee records updated. Please refresh the trainees page to see the changes.`, "success");
    } catch (error) {
      console.error('Error deleting rooms:', error);
      showMessage("Delete failed", "Failed to delete selected rooms.", "error");
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
      setShowDeleteDialog(false);
      setDeleteType(null);
      setDeleteCount(0);
    }
  };

  // Tag selection handlers
  const handleSelectAllTags = (checked: boolean) => {
    if (checked) {
      setSelectedTags(filteredTags.map(tag => tag.id!));
    } else {
      setSelectedTags([]);
    }
  };

  const handleSelectTag = (tagId: string, checked: boolean) => {
    console.log('handleSelectTag called with tagId:', tagId, 'checked:', checked);
    if (checked) {
      setSelectedTags(prev => {
        const newSelection = [...prev, tagId];
        console.log('Updated selectedTags:', newSelection);
        return newSelection;
      });
    } else {
      setSelectedTags(prev => {
        const newSelection = prev.filter(id => id !== tagId);
        console.log('Updated selectedTags:', newSelection);
        return newSelection;
      });
    }
  };

  const handleDeleteTags = () => {
    console.log('handleDeleteTags called with selectedTags:', selectedTags);
    console.log('selectedTags length:', selectedTags.length);
    console.log('tagNumbers:', tagNumbers);
    
    if (selectedTags.length === 0) {
      showMessage("No tags selected", "Please select tags to delete.", "warning");
      return;
    }

    setDeleteType('tags');
    setDeleteCount(selectedTags.length);
    setShowDeleteDialog(true);
  };

  const confirmDeleteTags = async () => {
    try {
      console.log('confirmDeleteTags called');
      console.log('Starting tag deletion for selected tags:', selectedTags);
      console.log('selectedTags length:', selectedTags.length);
      setIsDeleting(true);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
      
      // Get the tags that will be deleted for cleanup
      const tagsToDelete = tagNumbers.filter(tag => selectedTags.includes(tag.id!));
      console.log('Tags to delete details:', tagsToDelete);
      
      // Delete selected tags with progress (up to 80% of progress bar)
      for (let i = 0; i < selectedTags.length; i++) {
        const tagId = selectedTags[i];
        console.log(`Deleting tag ${i+1}/${selectedTags.length}:`, tagId);
        setCurrentDeleteIndex(i + 1);
        setDeleteProgress(((i + 1) / selectedTags.length) * 80);
        
        try {
          await deleteTagNumber(tagId);
          console.log(`Successfully deleted tag ${tagId} from database`);
        } catch (error) {
          console.error(`Failed to delete tag ${tagId}:`, error);
          throw error; // Re-throw to be caught by the outer catch
        }
        
        // Small delay for visual feedback
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Clean up trainee records (up to 90% of progress bar)
      console.log('Starting trainee records cleanup...');
      setDeleteProgress(90);
      await cleanupTraineeRecords([], tagsToDelete);
      console.log('Trainee records cleanup completed');

      // Refresh tags list from the database (up to 95% of progress bar)
      console.log('Refreshing tags list from database...');
      setDeleteProgress(95);
      const updatedTags = await getTagNumbers();
      setTagNumbers(updatedTags);
      setSelectedTags([]);
      console.log('Tags list refreshed from database');

      // Completion (100%)
      setDeleteProgress(100);
      console.log('Tag deletion process completed successfully');
      showMessage("Tags deleted successfully", `${selectedTags.length} tag(s) have been deleted and trainee records updated. Please refresh the trainees page to see the changes.`, "success");
    } catch (error) {
      console.error('Error deleting tags:', error);
      showMessage("Delete failed", "Failed to delete selected tags.", "error");
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
      setShowDeleteDialog(false);
      setDeleteType(null);
      setDeleteCount(0);
    }
  };

  // Function to clean up trainee records when rooms/tags are deleted
  const cleanupTraineeRecords = async (deletedRooms: Room[], deletedTags: TagNumber[]) => {
    try {
      console.log('Starting cleanup with:', { deletedRooms: deletedRooms.length, deletedTags: deletedTags.length });
      console.log('Deleted tags:', deletedTags.map(t => t.tagNo));
      
      const allTrainees = await getTrainees();
      console.log('Total trainees found:', allTrainees.length);
      let updatedCount = 0;

      for (const trainee of allTrainees) {
        let needsUpdate = false;
        const updateData: Partial<Trainee> = {};

        // Check if trainee's room was deleted
        const roomDeleted = deletedRooms.some(room => 
          room.roomNumber === trainee.roomNumber && room.block === trainee.roomBlock
        );
        
        if (roomDeleted) {
          updateData.roomNumber = 'pending';
          updateData.roomBlock = 'pending';
          updateData.bedSpace = 'pending';
          needsUpdate = true;
          console.log(`Room cleanup needed for trainee ${trainee.id}: ${trainee.roomBlock}-${trainee.roomNumber}`);
        }

        // Check if trainee's tag was deleted
        const tagDeleted = deletedTags.some(tag => {
          // Handle different tag number formats
          const traineeTag = trainee.tagNumber || '';
          const deletedTag = tag.tagNo || '';
          
          console.log(`Comparing trainee tag "${traineeTag}" with deleted tag "${deletedTag}"`);
          
          // Direct match
          if (traineeTag === deletedTag) {
            console.log(`Direct match found for trainee ${trainee.id}`);
            return true;
          }
          
          // Handle "Trainee-XXX" vs "XXX" format
          if (traineeTag.startsWith('Trainee-') && traineeTag.replace('Trainee-', '') === deletedTag) {
            console.log(`Format match found for trainee ${trainee.id}: ${traineeTag} matches ${deletedTag}`);
            return true;
          }
          if (deletedTag.startsWith('Trainee-') && deletedTag.replace('Trainee-', '') === traineeTag) {
            console.log(`Format match found for trainee ${trainee.id}: ${traineeTag} matches ${deletedTag}`);
            return true;
          }
          
          return false;
        });
        
        if (tagDeleted) {
          updateData.tagNumber = 'pending';
          // Also update allocation status if the trainee has no room assigned
          if (!trainee.roomNumber || trainee.roomNumber === 'pending') {
            updateData.allocationStatus = 'no_tags';
          } else {
            updateData.allocationStatus = 'no_tags';
          }
          needsUpdate = true;
          console.log(`Tag cleanup needed for trainee ${trainee.id}: ${trainee.tagNumber} -> pending`);
          console.log(`Updated allocation status for trainee ${trainee.id} to: ${updateData.allocationStatus}`);
        }

        // Update trainee record if needed
        if (needsUpdate) {
          console.log(`Updating trainee ${trainee.id} with:`, updateData);
          await updateDocument("trainees", trainee.id, updateData);
          updatedCount++;
        }
      }

      console.log(`Cleanup complete: Updated ${updatedCount} trainee records`);
      if (updatedCount > 0) {
        showMessage("Cleanup Complete", `Updated ${updatedCount} trainee records after cleanup.`, "success");
      }
    } catch (error) {
      console.error('Error cleaning up trainee records:', error);
      showMessage("Cleanup Error", "Failed to cleanup trainee records.", "error");
    }
  };

  // Clear all functions for cleanup
  const clearAllRooms = async () => {
    if (rooms.length === 0) {
      showMessage("No rooms to clear", "There are no rooms to delete.", "warning");
      return;
    }

    setDeleteType('rooms');
    setDeleteCount(rooms.length);
    setSelectedRooms(rooms.map(room => room.id!));
    setShowDeleteDialog(true);
  };

  const clearAllTags = async () => {
    console.log('clearAllTags called with tagNumbers:', tagNumbers);
    console.log('tagNumbers length:', tagNumbers.length);
    
    if (tagNumbers.length === 0) {
      showMessage("No tags to clear", "There are no tag numbers to delete.", "warning");
      return;
    }

    const allTagIds = tagNumbers.map(tag => tag.id!);
    console.log('Setting selectedTags to all tag IDs:', allTagIds);
    
    setDeleteType('tags');
    setDeleteCount(tagNumbers.length);
    setSelectedTags(allTagIds);
    setShowDeleteDialog(true);
  };

  // Recalculate room statuses based on current occupancy
  const recalculateRoomStatuses = async () => {
    try {
      const allTrainees = await getTrainees();
      const allRooms = await getRooms();
      
      let updatedRooms = 0;
      
      for (const room of allRooms) {
        if (room.roomNumber && room.block) {
          // Count trainees in this room
          const traineesInRoom = allTrainees.filter(t => 
            t.roomNumber === room.roomNumber && 
            t.roomBlock === room.block
          );
          
          const currentOccupancy = traineesInRoom.length;
          // Handle both numeric and text bed space formats
          let bedSpaceType = 1;
          if (room.bedSpace) {
            if (room.bedSpace.toLowerCase() === 'double') {
              bedSpaceType = 2;
            } else if (room.bedSpace.toLowerCase() === 'single') {
              bedSpaceType = 1;
            } else {
              bedSpaceType = parseInt(room.bedSpace) || 1;
            }
          }
          
          let correctStatus: string;
          if (bedSpaceType === 1) {
            // Single bed room
            correctStatus = currentOccupancy >= 1 ? 'fully_occupied' : 'available';
          } else if (bedSpaceType === 2) {
            // Double bed room
            correctStatus = currentOccupancy === 0 ? 'available' : 
                           currentOccupancy === 1 ? 'partially_occupied' : 
                           'fully_occupied';
          } else {
            // Other bed space types
            correctStatus = currentOccupancy >= bedSpaceType ? 'fully_occupied' : 
                           currentOccupancy > 0 ? 'partially_occupied' : 'available';
          }
          
          // Update room if status is incorrect
          console.log(`Room ${room.roomNumber}-${room.block}: current status="${room.status}", correct status="${correctStatus}", occupancy=${currentOccupancy}/${bedSpaceType}`);
          if (room.status !== correctStatus) {
            console.log(`Updating room ${room.roomNumber}-${room.block} from "${room.status}" to "${correctStatus}"`);
            await updateDocument("rooms", room.id!, {
              status: correctStatus,
              currentOccupancy: currentOccupancy
            });
            updatedRooms++;
          }
        }
      }
      
      return updatedRooms;
    } catch (error) {
      console.error('Error recalculating room statuses:', error);
      throw error;
    }
  };

  // Synchronize allocations function
  const handleSynchronize = async () => {
    try {
      setIsSynchronizing(true);
      showMessage("Synchronizing Allocations", "Processing trainee allocations and room statuses...", "success");
      
      // First, recalculate room statuses
      const updatedRooms = await recalculateRoomStatuses();
      console.log(`Updated ${updatedRooms} room statuses`);
      
      // Then run the full synchronization
      const result = await synchronizeAllocations();
      
      showMessage("Synchronization Complete", 
        `Updated ${updatedRooms} room statuses. Allocated ${result.allocated} trainees. ${result.noRooms > 0 ? `No rooms available for ${result.noRooms} trainees.` : ''} ${result.noTags > 0 ? `No tags available for ${result.noTags} trainees.` : ''}`, 
        "success"
      );
      
      // Refresh data after synchronization
      const refreshedRooms = await getRooms();
      const refreshedTags = await getTagNumbers();
      setRooms(refreshedRooms);
      setTagNumbers(refreshedTags);
    } catch (error) {
      console.error('Error in synchronization:', error);
      showMessage("Synchronization Error", "Failed to synchronize allocations.", "error");
    } finally {
      setIsSynchronizing(false);
    }
  };

  // Manual cleanup function for debugging
  const manualCleanup = async () => {
    try {
      setIsManualCleaning(true);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
      
      setDeleteProgress(10);
      const allTrainees = await getTrainees();
      
      setDeleteProgress(20);
      const allTags = await getTagNumbers();
      
      console.log('Manual cleanup - All trainees:', allTrainees.map(t => ({ id: t.id, tagNumber: t.tagNumber })));
      console.log('Manual cleanup - All tags:', allTags.map(t => ({ id: t.id, tagNo: t.tagNo })));
      
      setDeleteProgress(30);
      // Find trainees with tag numbers that don't exist in the tags collection
      const traineesToUpdate = allTrainees.filter(trainee => {
        if (!trainee.tagNumber || trainee.tagNumber === 'pending') return false;
        
        const tagExists = allTags.some(tag => {
          const traineeTag = trainee.tagNumber || '';
          const existingTag = tag.tagNo || '';
          
          // Direct match
          if (traineeTag === existingTag) return true;
          
          // Handle "Trainee-XXX" vs "XXX" format
          if (traineeTag.startsWith('Trainee-') && traineeTag.replace('Trainee-', '') === existingTag) return true;
          if (existingTag.startsWith('Trainee-') && existingTag.replace('Trainee-', '') === traineeTag) return true;
          
          return false;
        });
        
        return !tagExists;
      });
      
      console.log('Trainees to update:', traineesToUpdate.map(t => ({ id: t.id, tagNumber: t.tagNumber })));
      
      setDeleteProgress(40);
      if (traineesToUpdate.length > 0) {
        setDeleteCount(traineesToUpdate.length);
        
        for (let i = 0; i < traineesToUpdate.length; i++) {
          const trainee = traineesToUpdate[i];
          setCurrentDeleteIndex(i + 1);
          setDeleteProgress(40 + ((i + 1) / traineesToUpdate.length) * 50);
          
          await updateDocument("trainees", trainee.id, { tagNumber: 'pending' });
          console.log(`Updated trainee ${trainee.id}: ${trainee.tagNumber} -> pending`);
          
          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        setDeleteProgress(95);
        showMessage("Manual Cleanup Complete", `Updated ${traineesToUpdate.length} trainee records with missing tags.`, "success");
      } else {
        setDeleteProgress(100);
        showMessage("No Cleanup Needed", "All trainee tag numbers are valid.", "success");
      }
    } catch (error) {
      console.error('Error in manual cleanup:', error);
      showMessage("Manual Cleanup Error", "Failed to perform manual cleanup.", "error");
    } finally {
      setIsManualCleaning(false);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
    }
  };

  const handleRoomImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showMessage("Invalid file format", "Please upload an Excel file (.xlsx or .xls)", "error");
      return;
    }

    setIsImportingRooms(true);
    setImportType('rooms');
    setImportProgress(0);
    setCurrentImportIndex(0);
    
    try {
      // Read the Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setImportProgress(10);
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          
          setImportProgress(20);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          setImportProgress(30);
          // Validate header row
          const headerRow = jsonData[0] as any[];
          if (!headerRow || headerRow.length < 4) {
            showMessage("Invalid file format", "Room file must have at least 4 columns: S/N, Room Numbers, Bed Space, Block", "error");
            return;
          }

          // Check if this looks like a room file (should have bed space and block columns)
          const hasBedSpace = headerRow.some((cell: any) => 
            String(cell).toLowerCase().includes('bed') || 
            String(cell).toLowerCase().includes('space')
          );
          const hasBlock = headerRow.some((cell: any) => 
            String(cell).toLowerCase().includes('block')
          );

          if (!hasBedSpace || !hasBlock) {
            showMessage("Wrong file type", "This appears to be a tag numbers file. Please use the 'Import Tag Numbers' button instead.", "error");
            return;
          }

          setImportProgress(40);
          // Skip header row and process data
          const roomsData: Omit<Room, 'id' | 'createdAt'>[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row.length >= 4) {
              const [serialNumber, roomNumber, bedSpace, block] = row;
              
              // Validate data
              if (roomNumber && bedSpace && block) {
                // Convert bed space format
                let bedSpaceValue = String(bedSpace);
                if (bedSpaceValue.toLowerCase() === 'double') {
                  bedSpaceValue = '2';
                } else if (bedSpaceValue.toLowerCase() === 'single') {
                  bedSpaceValue = '1';
                }
                
                // Format room number (add "Room-" prefix if not present)
                let formattedRoomNumber = String(roomNumber);
                if (!formattedRoomNumber.startsWith('Room-')) {
                  formattedRoomNumber = `Room-${formattedRoomNumber}`;
                }
                
                roomsData.push({
                  roomNumber: formattedRoomNumber,
                  bedSpace: bedSpaceValue,
                  block: String(block),
                  status: 'available'
                });
              }
            }
          }

          if (roomsData.length === 0) {
            showMessage("No valid data found", "Please check your Excel file format. Expected columns: S/N, Room Numbers, Bed Space, Block", "error");
            return;
          }

          setImportCount(roomsData.length);
          setImportProgress(50);

          // Save each room to Firebase with progress
          for (let i = 0; i < roomsData.length; i++) {
            const room = roomsData[i];
            setCurrentImportIndex(i + 1);
            setImportProgress(50 + ((i + 1) / roomsData.length) * 40);
            
            await createRoom(room);
            
            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          setImportProgress(95);
          // Refresh the rooms list
          const updatedRooms = await getRooms();
          setRooms(updatedRooms);
          
          setImportProgress(100);
          showMessage("Rooms imported successfully", `${roomsData.length} rooms have been imported and saved to the database.`, "success");
        } catch (error) {
          console.error('Error processing Excel file:', error);
          showMessage("Import failed", "Failed to process Excel file. Please check the format.", "error");
        } finally {
          setIsImportingRooms(false);
          setImportProgress(0);
          setCurrentImportIndex(0);
          setImportType(null);
          setImportCount(0);
          event.target.value = '';
        }
      };

      reader.onerror = () => {
        showMessage("File read error", "Failed to read the Excel file.", "error");
        setIsImportingRooms(false);
        event.target.value = '';
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing rooms:', error);
      showMessage("Import failed", "Failed to import rooms. Please try again.", "error");
      setIsImportingRooms(false);
      event.target.value = '';
    }
  };

  const handleTagImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showMessage("Invalid file format", "Please upload an Excel file (.xlsx or .xls)", "error");
      return;
    }

    setIsImportingTags(true);
    setImportType('tags');
    setImportProgress(0);
    setCurrentImportIndex(0);
    
    try {
      // Read the Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setImportProgress(10);
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          
          setImportProgress(20);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

          setImportProgress(30);
          // Validate header row
          const headerRow = jsonData[0] as any[];
          if (!headerRow || headerRow.length < 2) {
            showMessage("Invalid file format", "Tag numbers file must have at least 2 columns: S/N, TAG NO", "error");
            return;
          }

          // Check if this looks like a tag numbers file (should NOT have bed space and block columns)
          const hasBedSpace = headerRow.some((cell: any) => 
            String(cell).toLowerCase().includes('bed') || 
            String(cell).toLowerCase().includes('space')
          );
          const hasBlock = headerRow.some((cell: any) => 
            String(cell).toLowerCase().includes('block')
          );

          if (hasBedSpace || hasBlock) {
            showMessage("Wrong file type", "This appears to be a rooms file. Please use the 'Import Rooms' button instead.", "error");
            return;
          }

          // Check if it has tag-related columns
          const hasTagColumn = headerRow.some((cell: any) => 
            String(cell).toLowerCase().includes('tag') || 
            String(cell).toLowerCase().includes('no')
          );

          if (!hasTagColumn) {
            showMessage("Invalid tag numbers file", "Tag numbers file should have columns like 'S/N' and 'TAG NO'", "error");
            return;
          }

          setImportProgress(40);
          // Skip header row and process data
          const tagsData: Omit<TagNumber, 'id' | 'createdAt'>[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row.length >= 2) {
              const [serialNumber, tagNo] = row;
              
              // Validate data
              if (tagNo) {
                tagsData.push({
                  tagNo: String(tagNo),
                  status: 'available'
                });
              }
            }
          }

          if (tagsData.length === 0) {
            showMessage("No valid data found", "Please check your Excel file format. Expected columns: S/N, TAG NO", "error");
            return;
          }

          setImportCount(tagsData.length);
          setImportProgress(50);

          // Save each tag number to Firebase with progress
          for (let i = 0; i < tagsData.length; i++) {
            const tag = tagsData[i];
            setCurrentImportIndex(i + 1);
            setImportProgress(50 + ((i + 1) / tagsData.length) * 40);
            
            await createTagNumber(tag);
            
            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          setImportProgress(95);
          // Refresh the tag numbers list
          const updatedTags = await getTagNumbers();
          setTagNumbers(updatedTags);
          
          setImportProgress(100);
          showMessage("Tag numbers imported successfully", `${tagsData.length} tag numbers have been imported and saved to the database.`, "success");
        } catch (error) {
          console.error('Error processing Excel file:', error);
          showMessage("Import failed", "Failed to process Excel file. Please check the format.", "error");
        } finally {
          setIsImportingTags(false);
          setImportProgress(0);
          setCurrentImportIndex(0);
          setImportType(null);
          setImportCount(0);
          event.target.value = '';
        }
      };

      reader.onerror = () => {
        showMessage("File read error", "Failed to read the Excel file.", "error");
        setIsImportingTags(false);
        event.target.value = '';
      };

      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing tags:', error);
      showMessage("Import failed", "Failed to import tag numbers. Please try again.", "error");
      setIsImportingTags(false);
      event.target.value = '';
    }
  };

  // Function to calculate bed space occupancy for a room
  const getRoomOccupancy = (room: Room) => {
    if (room.status === 'available') {
      return { occupancy: 'Available', variant: 'secondary' as const };
    }
    
    if (room.status === 'maintenance') {
      return { occupancy: 'Maintenance', variant: 'outline' as const };
    }
    
    // Find trainees assigned to this room
    const roomTrainees = trainees.filter(trainee => 
      trainee.roomNumber === room.roomNumber && 
      trainee.roomBlock === room.block
    );
    
    // Handle both numeric and text bed space formats
    let bedSpaceNumber = 1;
    if (room.bedSpace) {
      if (room.bedSpace.toLowerCase() === 'double') {
        bedSpaceNumber = 2;
      } else if (room.bedSpace.toLowerCase() === 'single') {
        bedSpaceNumber = 1;
      } else {
        bedSpaceNumber = parseInt(room.bedSpace) || 1;
      }
    }
    const occupiedBeds = roomTrainees.length;
    
    if (occupiedBeds === 0) {
      return { occupancy: 'Available', variant: 'secondary' as const };
    }
    
    if (occupiedBeds >= bedSpaceNumber) {
      return { occupancy: 'Fully Occupied', variant: 'secondary' as const };
    }
    
    return { 
      occupancy: `Partially Occupied (${occupiedBeds} of ${bedSpaceNumber})`, 
      variant: 'secondary' as const 
    };
  };

  // Calculate stats from actual data
  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter(room => room.status === 'occupied').length;
  const availableRooms = rooms.filter(room => room.status === 'available').length;
  const maintenanceRooms = rooms.filter(room => room.status === 'maintenance').length;
  const availableTags = tagNumbers.filter(tag => tag.status === 'available').length;
  const assignedTags = tagNumbers.filter(tag => tag.status === 'assigned').length;
  const totalFacilities = facilities.length;
  const availableFacilities = facilities.filter(facility => facility.status === 'available').length;
  const pendingTasks = housekeepingTasks.filter(task => task.status === 'pending').length;
  const pendingServices = guestServices.filter(service => service.status === 'pending').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resort management data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/original/home">
                <Button variant="ghost" className="mr-4">
                  <ArrowLeft className="mr-2" size={16} />
                  Back to Home
                </Button>
              </Link>
              <Building2 className="text-2xl text-teal-600 mr-3" size={32} />
              <h1 className="text-xl font-semibold text-gray-900">Resort Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Import Buttons */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleRoomImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isImportingRooms}
                  />
                  <Button 
                    variant="outline" 
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    disabled={isImportingRooms}
                  >
                    <Upload className="mr-2" size={16} />
                    {isImportingRooms ? 'Importing...' : 'Import Rooms'}
                  </Button>
                </div>
                <div className="relative">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleTagImport}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isImportingTags}
                  />
                  <Button 
                    variant="outline" 
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    disabled={isImportingTags}
                  >
                    <Tag className="mr-2" size={16} />
                    {isImportingTags ? 'Importing...' : 'Import Tag Numbers'}
                  </Button>
                </div>
                <Button 
                  onClick={handleSynchronize}
                  variant="outline" 
                  className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                  disabled={isSynchronizing || isDeleting}
                >
                  <RefreshCw className={`mr-2 ${isSynchronizing ? 'animate-spin' : ''}`} size={16} />
                  {isSynchronizing ? "Synchronizing..." : "Synchronize Allocations"}
                </Button>
                <Button 
                  onClick={manualCleanup}
                  variant="outline" 
                  className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                  disabled={isManualCleaning || isDeleting}
                >
                  <RefreshCw className={`mr-2 ${isManualCleaning ? 'animate-spin' : ''}`} size={16} />
                  {isManualCleaning ? "Cleaning..." : "Manual Cleanup"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Resort Management Dashboard</h2>
          <p className="text-lg text-gray-600">
            Manage resort facilities, room allocations, and accommodation services
          </p>
        </div>

                 {/* Import Instructions */}
         <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
           <h3 className="font-semibold text-blue-900 mb-2">Import Instructions:</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
             <div>
               <strong>Rooms Excel Format:</strong>
               <ul className="list-disc list-inside mt-1">
                 <li>S/N</li>
                 <li>Room Numbers</li>
                 <li>Bed Space</li>
                 <li>Block</li>
               </ul>
             </div>
             <div>
               <strong>Tag Numbers Excel Format:</strong>
               <ul className="list-disc list-inside mt-1">
                 <li>S/N</li>
                 <li>TAG NO</li>
               </ul>
             </div>
           </div>
           
           {/* Clear All Buttons */}
           <div className="mt-4 pt-4 border-t border-blue-200">
             <h4 className="font-semibold text-red-700 mb-2">⚠️ Data Management:</h4>
             <div className="flex gap-2">
               <Button 
                 variant="outline" 
                 size="sm"
                 onClick={clearAllRooms}
                 className="text-red-600 border-red-300 hover:bg-red-50"
               >
                 <Trash2 className="mr-2" size={14} />
                 Clear All Rooms ({rooms.length})
               </Button>
               <Button 
                 variant="outline" 
                 size="sm"
                 onClick={clearAllTags}
                 className="text-red-600 border-red-300 hover:bg-red-50"
               >
                 <Trash2 className="mr-2" size={14} />
                 Clear All Tags ({tagNumbers.length})
               </Button>
             </div>
             <p className="text-xs text-red-600 mt-1">
               Use these buttons to clear all data if you imported the wrong file type
             </p>
           </div>
         </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <Bed className="text-blue-600" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                  <p className="text-2xl font-bold text-gray-900">{totalRooms}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <Calendar className="text-green-600" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Available Facilities</p>
                  <p className="text-2xl font-bold text-gray-900">{availableFacilities}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                  <Users className="text-yellow-600" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingTasks}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <Settings className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Services</p>
                  <p className="text-2xl font-bold text-gray-900">{pendingServices}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Room Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bed className="text-blue-600" size={20} />
                Room Management ({totalRooms} rooms)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="outline"
                  onClick={handleDeepRefresh}
                  className="w-full"
                  disabled={isDeepRefreshing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isDeepRefreshing ? 'Refreshing...' : 'Deep Refresh'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search rooms..." 
                  className="flex-1" 
                  value={roomSearchTerm}
                  onChange={(e) => setRoomSearchTerm(e.target.value)}
                />
                <div className="relative">
                  <Button 
                    variant="outline"
                    onClick={() => setShowRoomFilterDropdown(!showRoomFilterDropdown)}
                  >
                    <Filter className="mr-2" size={16} />
                    Filter
                  </Button>
                  {showRoomFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 filter-dropdown">
                      <div className="py-1">
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            roomStatusFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setRoomStatusFilter('all');
                            setShowRoomFilterDropdown(false);
                          }}
                        >
                          All Statuses
                        </button>
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            roomStatusFilter === 'available' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setRoomStatusFilter('available');
                            setShowRoomFilterDropdown(false);
                          }}
                        >
                          Available Only
                        </button>
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            roomStatusFilter === 'occupied' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setRoomStatusFilter('occupied');
                            setShowRoomFilterDropdown(false);
                          }}
                        >
                          Occupied Only
                        </button>
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            roomStatusFilter === 'maintenance' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setRoomStatusFilter('maintenance');
                            setShowRoomFilterDropdown(false);
                          }}
                        >
                          Maintenance Only
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection and Delete Controls */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedRooms.length === rooms.length && rooms.length > 0}
                    onCheckedChange={handleSelectAllRooms}
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedRooms.length} selected)
                  </span>
                </div>
                {selectedRooms.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteRooms}
                  >
                    <Trash2 className="mr-2" size={16} />
                    Delete Selected
                  </Button>
                )}
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredRooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bed className="mx-auto mb-2 text-gray-400" size={32} />
                    <p>{rooms.length === 0 ? 'No rooms imported yet' : 'No rooms match your search/filter'}</p>
                    <p className="text-sm">{rooms.length === 0 ? 'Use the "Import Rooms" button to add rooms' : 'Try adjusting your search or filter criteria'}</p>
                  </div>
                ) : (
                  filteredRooms.map((room, index) => (
                    <div key={room.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedRooms.includes(room.id!)}
                          onCheckedChange={(checked) => handleSelectRoom(room.id!, checked as boolean)}
                        />
                        <div>
                          <h4 className="font-medium">{room.roomNumber}</h4>
                          <p className="text-sm text-gray-600">{room.bedSpace} • Block {room.block}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const occupancy = getRoomOccupancy(room);
                          return (
                            <Badge variant={occupancy.variant}>
                              {occupancy.occupancy}
                            </Badge>
                          );
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Status Summary for Rooms */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Room Status Summary: {filteredRooms.length} of {rooms.length} rooms
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Available: {filteredRooms.filter(r => getRoomOccupancy(r).occupancy === 'Available').length}
                    </Badge>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                      Partially Occupied: {filteredRooms.filter(r => getRoomOccupancy(r).occupancy.includes('Occupied (') && !getRoomOccupancy(r).occupancy.includes('Fully')).length}
                    </Badge>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Fully Occupied: {filteredRooms.filter(r => getRoomOccupancy(r).occupancy === 'Fully Occupied').length}
                    </Badge>
                    <Badge variant="outline">
                      Maintenance: {filteredRooms.filter(r => getRoomOccupancy(r).occupancy === 'Maintenance').length}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tag Numbers Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="text-green-600" size={20} />
                Tag Numbers Management ({tagNumbers.length} tags)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="outline"
                  onClick={handleDeepRefreshTags}
                  className="w-full"
                  disabled={isDeepRefreshingTags}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {isDeepRefreshingTags ? 'Refreshing...' : 'Deep Refresh'}
                </Button>
              </div>
              <div className="flex gap-2">
                <Input 
                  placeholder="Search tag numbers..." 
                  className="flex-1" 
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                />
                <div className="relative">
                  <Button 
                    variant="outline"
                    onClick={() => setShowTagFilterDropdown(!showTagFilterDropdown)}
                  >
                    <Filter className="mr-2" size={16} />
                    Filter
                  </Button>
                  {showTagFilterDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 filter-dropdown">
                      <div className="py-1">
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            tagStatusFilter === 'all' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setTagStatusFilter('all');
                            setShowTagFilterDropdown(false);
                          }}
                        >
                          All Statuses
                        </button>
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            tagStatusFilter === 'available' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setTagStatusFilter('available');
                            setShowTagFilterDropdown(false);
                          }}
                        >
                          Available Only
                        </button>
                        <button
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                            tagStatusFilter === 'assigned' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                          }`}
                          onClick={() => {
                            setTagStatusFilter('assigned');
                            setShowTagFilterDropdown(false);
                          }}
                        >
                          Assigned Only
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection and Delete Controls */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedTags.length === tagNumbers.length && tagNumbers.length > 0}
                    onCheckedChange={handleSelectAllTags}
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedTags.length} selected)
                  </span>
                </div>
                {selectedTags.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteTags}
                  >
                    <Trash2 className="mr-2" size={16} />
                    Delete Selected
                  </Button>
                )}
              </div>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredTags.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="mx-auto mb-2 text-gray-400" size={32} />
                    <p>{tagNumbers.length === 0 ? 'No tag numbers imported yet' : 'No tags match your search/filter'}</p>
                    <p className="text-sm">{tagNumbers.length === 0 ? 'Use the "Import Tag Numbers" button to add tags' : 'Try adjusting your search or filter criteria'}</p>
                  </div>
                ) : (
                  filteredTags.map((tag, index) => (
                    <div key={tag.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedTags.includes(tag.id!)}
                          onCheckedChange={(checked) => handleSelectTag(tag.id!, checked as boolean)}
                        />
                        <div>
                          <h4 className="font-medium">{tag.tagNo}</h4>
                          <p className="text-sm text-gray-600">Tag Number</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={tag.status === 'available' ? 'secondary' : 'destructive'}
                        >
                          {tag.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Status Summary for Tags */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Tag Status Summary: {filteredTags.length} of {tagNumbers.length} tags
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Available: {filteredTags.filter(t => t.status === 'available').length}
                    </Badge>
                    <Badge variant="destructive">
                      Assigned: {filteredTags.filter(t => t.status === 'assigned').length}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* More Sections Button */}
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowMoreSections(!showMoreSections)}
            className="bg-white hover:bg-gray-50"
          >
            <MoreHorizontal className="mr-2" size={20} />
            More Management Options
            <ChevronDown 
              className={`ml-2 transition-transform ${showMoreSections ? 'rotate-180' : ''}`} 
              size={20} 
            />
          </Button>
        </div>

        {/* Additional Management Sections */}
        {showMoreSections && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Facility Booking */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="text-green-600" size={20} />
                  Facility Booking ({totalFacilities} facilities)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Search facilities..." className="flex-1" />
                  <Button variant="outline">
                    <Search className="mr-2" size={16} />
                    Search
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {facilities.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="mx-auto mb-2 text-gray-400" size={32} />
                      <p>No facilities added yet</p>
                      <p className="text-sm">Add facilities to manage bookings</p>
                    </div>
                  ) : (
                    facilities.map((facility, index) => (
                      <div key={facility.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{facility.name}</h4>
                          <p className="text-sm text-gray-600">{facility.capacity}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              facility.status === 'available' ? 'secondary' : 
                              facility.status === 'booked' ? 'destructive' : 'outline'
                            }
                          >
                            {facility.status}
                          </Badge>
                          <Button size="sm">
                            {facility.status === 'available' ? 'Book Now' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDeepRefresh}
                    className="w-full"
                    disabled={isDeepRefreshing}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {isDeepRefreshing ? 'Refreshing...' : 'Deep Refresh'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="text-yellow-600" size={20} />
                  Housekeeping ({housekeepingTasks.length} tasks)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Search tasks..." className="flex-1" />
                  <Button variant="outline">
                    <Filter className="mr-2" size={16} />
                    Filter
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {housekeepingTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto mb-2 text-gray-400" size={32} />
                      <p>No housekeeping tasks yet</p>
                      <p className="text-sm">Create tasks to manage housekeeping</p>
                    </div>
                  ) : (
                    housekeepingTasks.map((task, index) => (
                      <div key={task.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{task.taskName}</h4>
                          <p className="text-sm text-gray-600">{task.scheduledTime}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              task.status === 'pending' ? 'outline' :
                              task.status === 'in-progress' ? 'secondary' :
                              task.status === 'completed' ? 'default' : 'destructive'
                            }
                          >
                            {task.status}
                          </Badge>
                          <Button size="sm">
                            {task.status === 'pending' ? 'Start Task' : 'Update Status'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button className="w-full">
                  <Plus className="mr-2" size={16} />
                  Create New Task
                </Button>
              </CardContent>
            </Card>

            {/* Guest Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="text-purple-600" size={20} />
                  Guest Services ({guestServices.length} services)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input placeholder="Search guests..." className="flex-1" />
                  <Button variant="outline">
                    <Search className="mr-2" size={16} />
                    Search
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {guestServices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto mb-2 text-gray-400" size={32} />
                      <p>No guest services yet</p>
                      <p className="text-sm">Add guest services to manage requests</p>
                    </div>
                  ) : (
                    guestServices.map((service, index) => (
                      <div key={service.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium">{service.guestName}</h4>
                          <p className="text-sm text-gray-600">{service.roomNumber} • {service.serviceType}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={
                              service.status === 'pending' ? 'outline' :
                              service.status === 'in-progress' ? 'secondary' : 'default'
                            }
                          >
                            {service.status}
                          </Badge>
                          <Button size="sm">
                            {service.status === 'pending' ? 'Process' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button className="w-full">
                  <Plus className="mr-2" size={16} />
                  New Guest Request
                </Button>
              </CardContent>
            </Card>
          </div>
                 )}
       </main>

               {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="text-red-600" size={20} />
                {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
              </DialogTitle>
              <DialogDescription>
                {isDeleting ? (
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - deleteProgress / 100)}`}
                            className="text-red-600 transition-all duration-300 ease-in-out"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">{Math.round(deleteProgress)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {deleteProgress < 30 ? "Analyzing trainee data..." :
                         deleteProgress < 40 ? "Identifying orphaned tags..." :
                         `Updating ${currentDeleteIndex} of ${deleteCount} trainee(s)...`}
                      </p>
                      {deleteProgress >= 90 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Finalizing cleanup...
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-red-600 mb-2">Warning: This action cannot be undone.</p>
                    <p>Are you sure you want to delete {deleteType === 'rooms' ? 'these rooms' : 'these tags'}?</p>
                    <p className="text-sm text-gray-500">{deleteCount} {deleteType === 'rooms' ? 'room(s)' : 'tag(s)'} will be permanently removed.</p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant={isDeleting ? 'default' : 'outline'}
                onClick={() => setShowDeleteDialog(false)}
                className={isDeleting ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                {isDeleting ? 'Cancel' : 'Cancel'}
              </Button>
              <Button
                variant="destructive"
                onClick={isDeleting ? undefined : () => {
                  console.log('Delete button clicked');
                  console.log('deleteType:', deleteType);
                  if (deleteType === 'rooms') {
                    console.log('Calling confirmDeleteRooms');
                    confirmDeleteRooms();
                  } else if (deleteType === 'tags') {
                    console.log('Calling confirmDeleteTags');
                    confirmDeleteTags();
                  } else {
                    console.log('Unknown deleteType:', deleteType);
                  }
                }}
                className="ml-2"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Cleanup Dialog */}
        {isManualCleaning && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="text-orange-600" size={20} />
                  Manual Cleanup in Progress...
                </DialogTitle>
                <DialogDescription className="text-left">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - deleteProgress / 100)}`}
                            className="text-orange-600 transition-all duration-300 ease-in-out"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">{Math.round(deleteProgress)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {deleteProgress < 30 ? "Analyzing trainee data..." :
                         deleteProgress < 40 ? "Identifying orphaned tags..." :
                         `Updating ${currentDeleteIndex} of ${deleteCount} trainee(s)...`}
                      </p>
                      {deleteProgress >= 90 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Finalizing cleanup...
                        </p>
                      )}
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}

        {/* Import Progress Dialog */}
        {(isImportingRooms || isImportingTags) && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Upload className="text-blue-600" size={20} />
                  Importing {importType === 'rooms' ? 'Rooms' : 'Tags'}...
                </DialogTitle>
                <DialogDescription className="text-left">
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="relative w-16 h-16 mx-auto mb-4">
                        <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 40}`}
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - importProgress / 100)}`}
                            className="text-blue-600 transition-all duration-300 ease-in-out"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">{Math.round(importProgress)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {importProgress < 30 ? "Processing file..." :
                         importProgress < 50 ? "Validating data..." :
                         importProgress < 70 ? "Creating records..." :
                         importProgress < 90 ? "Updating database..." :
                         "Finalizing import..."}
                      </p>
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}

        {/* Message Dialog */}
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${
                messageType === 'success' ? 'text-green-600' : 
                messageType === 'error' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {messageType === 'success' ? <CheckCircle2 className="w-5 h-5" /> : 
                 messageType === 'error' ? <XCircle className="w-5 h-5" /> : 
                 <AlertTriangle className="w-5 h-5" />}
                {messageTitle}
              </DialogTitle>
            </DialogHeader>
            <DialogDescription>{messageDescription}</DialogDescription>
            <DialogFooter>
              <Button
                variant={messageType === 'success' ? 'default' : 'outline'}
                onClick={() => setShowMessageDialog(false)}
                className={
                  messageType === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  messageType === 'error' ? 'border-red-300 text-red-600 hover:bg-red-50' :
                  'border-yellow-300 text-yellow-600 hover:bg-yellow-50'
                }
              >
                {messageType === 'success' ? 'Great!' : 'OK'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
  