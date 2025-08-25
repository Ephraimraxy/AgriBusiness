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
  MoreHorizontal
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
  deleteRoom,
  deleteTagNumber,
  type Room, 
  type TagNumber,
  type Facility,
  type HousekeepingTask,
  type GuestService
} from "@/lib/firebaseService";
import * as XLSX from 'xlsx';

export default function ResortManagementPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [tagNumbers, setTagNumbers] = useState<TagNumber[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [housekeepingTasks, setHousekeepingTasks] = useState<HousekeepingTask[]>([]);
  const [guestServices, setGuestServices] = useState<GuestService[]>([]);
  const [isImportingRooms, setIsImportingRooms] = useState(false);
  const [isImportingTags, setIsImportingTags] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Selection states
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showMoreSections, setShowMoreSections] = useState(false);
  
  // Delete confirmation states
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'rooms' | 'tags' | null>(null);
  const [deleteCount, setDeleteCount] = useState(0);
  const [isClearingAll, setIsClearingAll] = useState(false);
  
  // Message dialog states
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageDescription, setMessageDescription] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success');

  // Details dialog states
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Room | TagNumber | Facility | HousekeepingTask | GuestService | null>(null);
  const [selectedItemType, setSelectedItemType] = useState<'room' | 'tag' | 'facility' | 'housekeeping' | 'guest' | null>(null);

  // Helper function to show message dialogs
  const showMessage = (title: string, description: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setMessageTitle(title);
    setMessageDescription(description);
    setMessageType(type);
    setShowMessageDialog(true);
  };

  // Helper function to show details dialog
  const showDetails = (item: Room | TagNumber | Facility | HousekeepingTask | GuestService, type: 'room' | 'tag' | 'facility' | 'housekeeping' | 'guest') => {
    setSelectedItem(item);
    setSelectedItemType(type);
    setShowDetailsDialog(true);
  };

  // Fetch data from Firebase on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [roomsData, tagsData, facilitiesData, housekeepingData, guestServicesData] = await Promise.all([
          getRooms(),
          getTagNumbers(),
          getFacilities(),
          getHousekeepingTasks(),
          getGuestServices()
        ]);
        setRooms(roomsData);
        setTagNumbers(tagsData);
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

  // Room selection handlers
  const handleSelectAllRooms = (checked: boolean) => {
    if (checked) {
      setSelectedRooms(rooms.map(room => room.id!));
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
      // Delete selected rooms
      for (const roomId of selectedRooms) {
        await deleteRoom(roomId);
      }

      // Refresh rooms list
      const updatedRooms = await getRooms();
      setRooms(updatedRooms);
      setSelectedRooms([]);

      showMessage("Rooms deleted successfully", `${deleteCount} room(s) have been deleted.`, "success");
    } catch (error) {
      console.error('Error deleting rooms:', error);
      showMessage("Delete failed", "Failed to delete selected rooms.", "error");
    } finally {
      setShowDeleteDialog(false);
      setDeleteType(null);
      setDeleteCount(0);
    }
  };

  // Tag selection handlers
  const handleSelectAllTags = (checked: boolean) => {
    if (checked) {
      setSelectedTags(tagNumbers.map(tag => tag.id!));
    } else {
      setSelectedTags([]);
    }
  };

  const handleSelectTag = (tagId: string, checked: boolean) => {
    if (checked) {
      setSelectedTags(prev => [...prev, tagId]);
    } else {
      setSelectedTags(prev => prev.filter(id => id !== tagId));
    }
  };

  const handleDeleteTags = () => {
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
      // Delete selected tags
      for (const tagId of selectedTags) {
        await deleteTagNumber(tagId);
      }

      // Refresh tags list
      const updatedTags = await getTagNumbers();
      setTagNumbers(updatedTags);
      setSelectedTags([]);

      showMessage("Tags deleted successfully", `${deleteCount} tag(s) have been deleted.`, "success");
    } catch (error) {
      console.error('Error deleting tags:', error);
      showMessage("Delete failed", "Failed to delete selected tags.", "error");
    } finally {
      setShowDeleteDialog(false);
      setDeleteType(null);
      setDeleteCount(0);
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
    if (tagNumbers.length === 0) {
      showMessage("No tags to clear", "There are no tag numbers to delete.", "warning");
      return;
    }

    setDeleteType('tags');
    setDeleteCount(tagNumbers.length);
    setSelectedTags(tagNumbers.map(tag => tag.id!));
    setShowDeleteDialog(true);
  };

  const handleRoomImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      showMessage("Invalid file format", "Please upload an Excel file (.xlsx or .xls)", "error");
      return;
    }

    setIsImportingRooms(true);
    try {
      // Read the Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

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

          // Skip header row and process data
          const roomsData: Omit<Room, 'id' | 'createdAt'>[] = [];
          
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (row && row.length >= 4) {
              const [serialNumber, roomNumber, bedSpace, block] = row;
              
              // Validate data
              if (roomNumber && bedSpace && block) {
                roomsData.push({
                  roomNumber: String(roomNumber),
                  bedSpace: String(bedSpace),
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

          // Save each room to Firebase
          for (const room of roomsData) {
            await createRoom(room);
          }

          // Refresh the rooms list
          const updatedRooms = await getRooms();
          setRooms(updatedRooms);
          
          showMessage("Rooms imported successfully", `${roomsData.length} rooms have been imported and saved to the database.`, "success");
        } catch (error) {
          console.error('Error processing Excel file:', error);
          showMessage("Import failed", "Failed to process Excel file. Please check the format.", "error");
        } finally {
          setIsImportingRooms(false);
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
    try {
      // Read the Excel file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

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

          // Save each tag number to Firebase
          for (const tag of tagsData) {
            await createTagNumber(tag);
          }

          // Refresh the tag numbers list
          const updatedTags = await getTagNumbers();
          setTagNumbers(updatedTags);
          
          showMessage("Tag numbers imported successfully", `${tagsData.length} tag numbers have been imported and saved to the database.`, "success");
        } catch (error) {
          console.error('Error processing Excel file:', error);
          showMessage("Import failed", "Failed to process Excel file. Please check the format.", "error");
        } finally {
          setIsImportingTags(false);
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
              </div>
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="mr-2" size={16} />
                Add New
              </Button>
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
              <div className="flex gap-2">
                <Input placeholder="Search rooms..." className="flex-1" />
                <Button variant="outline">
                  <Search className="mr-2" size={16} />
                  Search
                </Button>
                <Button variant="outline">
                  <Filter className="mr-2" size={16} />
                  Filter
                </Button>
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
                {rooms.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Bed className="mx-auto mb-2 text-gray-400" size={32} />
                    <p>No rooms imported yet</p>
                    <p className="text-sm">Use the "Import Rooms" button to add rooms</p>
                  </div>
                ) : (
                  rooms.map((room, index) => (
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
                        <Badge 
                          variant={
                            room.status === 'available' ? 'secondary' : 
                            room.status === 'occupied' ? 'destructive' : 'outline'
                          }
                        >
                          {room.status}
                        </Badge>
                        <Button size="sm" onClick={() => showDetails(room, 'room')}>View Details</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button className="w-full">
                <Plus className="mr-2" size={16} />
                Add New Room
              </Button>
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
              <div className="flex gap-2">
                <Input placeholder="Search tag numbers..." className="flex-1" />
                <Button variant="outline">
                  <Search className="mr-2" size={16} />
                  Search
                </Button>
                <Button variant="outline">
                  <Filter className="mr-2" size={16} />
                  Filter
                </Button>
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
                {tagNumbers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="mx-auto mb-2 text-gray-400" size={32} />
                    <p>No tag numbers imported yet</p>
                    <p className="text-sm">Use the "Import Tag Numbers" button to add tags</p>
                  </div>
                ) : (
                  tagNumbers.map((tag, index) => (
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
                        <Button size="sm" onClick={() => showDetails(tag, 'tag')}>View Details</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <Button className="w-full">
                <Plus className="mr-2" size={16} />
                Add New Tag Number
              </Button>
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
                          <Button size="sm" onClick={() => showDetails(facility, 'facility')}>
                            {facility.status === 'available' ? 'Book Now' : 'View Details'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button className="w-full">
                  <Plus className="mr-2" size={16} />
                  Add New Facility
                </Button>
              </CardContent>
            </Card>

            {/* Housekeeping */}
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
                          <Button size="sm" onClick={() => showDetails(task, 'housekeeping')}>
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
                          <Button size="sm" onClick={() => showDetails(service, 'guest')}>
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
                Confirm Deletion
              </DialogTitle>
              <DialogDescription className="text-left">
                Are you sure you want to delete <strong>{deleteCount}</strong> {deleteType === 'rooms' ? 'room(s)' : 'tag(s)'}?
                <br />
                <span className="text-red-600 font-medium">This action cannot be undone.</span>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDeleteDialog(false);
                  setDeleteType(null);
                  setDeleteCount(0);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteType === 'rooms' ? confirmDeleteRooms : confirmDeleteTags}
              >
                <Trash2 className="mr-2" size={16} />
                Delete {deleteType === 'rooms' ? 'Rooms' : 'Tags'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Message Dialog */}
        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 ${
                messageType === 'success' ? 'text-green-600' : 
                messageType === 'error' ? 'text-red-600' : 'text-yellow-600'
              }`}>
                {messageType === 'success' && (
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {messageType === 'error' && (
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                )}
                {messageType === 'warning' && (
                  <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                )}
                {messageTitle}
              </DialogTitle>
              <DialogDescription className="text-left">
                {messageDescription}
              </DialogDescription>
            </DialogHeader>
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

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedItemType === 'room' && <Bed className="text-blue-600" size={20} />}
                {selectedItemType === 'tag' && <Tag className="text-green-600" size={20} />}
                {selectedItemType === 'facility' && <Calendar className="text-green-600" size={20} />}
                {selectedItemType === 'housekeeping' && <Users className="text-yellow-600" size={20} />}
                {selectedItemType === 'guest' && <Users className="text-purple-600" size={20} />}
                {selectedItemType === 'room' && 'Room Details'}
                {selectedItemType === 'tag' && 'Tag Number Details'}
                {selectedItemType === 'facility' && 'Facility Details'}
                {selectedItemType === 'housekeeping' && 'Housekeeping Task Details'}
                {selectedItemType === 'guest' && 'Guest Service Details'}
              </DialogTitle>
            </DialogHeader>
            
            {selectedItem && (
              <div className="space-y-6">
                {selectedItemType === 'room' && selectedItem && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Room Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Room Number:</span>
                            <span className="font-medium">{(selectedItem as Room).roomNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bed Space:</span>
                            <span className="font-medium">{(selectedItem as Room).bedSpace}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Block:</span>
                            <span className="font-medium">{(selectedItem as Room).block}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge 
                              variant={
                                (selectedItem as Room).status === 'available' ? 'secondary' : 
                                (selectedItem as Room).status === 'occupied' ? 'destructive' : 'outline'
                              }
                            >
                              {(selectedItem as Room).status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Additional Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-sm">{(selectedItem as Room).id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">
                              {(selectedItem as Room).createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItemType === 'tag' && selectedItem && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Tag Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tag Number:</span>
                            <span className="font-medium">{(selectedItem as TagNumber).tagNo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge 
                              variant={(selectedItem as TagNumber).status === 'available' ? 'secondary' : 'destructive'}
                            >
                              {(selectedItem as TagNumber).status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Additional Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-sm">{(selectedItem as TagNumber).id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">
                              {(selectedItem as TagNumber).createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItemType === 'facility' && selectedItem && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Facility Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{(selectedItem as Facility).name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Capacity:</span>
                            <span className="font-medium">{(selectedItem as Facility).capacity}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge 
                              variant={
                                (selectedItem as Facility).status === 'available' ? 'secondary' : 
                                (selectedItem as Facility).status === 'booked' ? 'destructive' : 'outline'
                              }
                            >
                              {(selectedItem as Facility).status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Additional Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-sm">{(selectedItem as Facility).id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">
                              {(selectedItem as Facility).createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItemType === 'housekeeping' && selectedItem && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Task Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Task Name:</span>
                            <span className="font-medium">{(selectedItem as HousekeepingTask).taskName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Scheduled Time:</span>
                            <span className="font-medium">{(selectedItem as HousekeepingTask).scheduledTime}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge 
                              variant={
                                (selectedItem as HousekeepingTask).status === 'pending' ? 'outline' :
                                (selectedItem as HousekeepingTask).status === 'in-progress' ? 'secondary' :
                                (selectedItem as HousekeepingTask).status === 'completed' ? 'default' : 'destructive'
                              }
                            >
                              {(selectedItem as HousekeepingTask).status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Additional Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-sm">{(selectedItem as HousekeepingTask).id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">
                              {(selectedItem as HousekeepingTask).createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedItemType === 'guest' && selectedItem && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Service Information</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Guest Name:</span>
                            <span className="font-medium">{(selectedItem as GuestService).guestName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Room Number:</span>
                            <span className="font-medium">{(selectedItem as GuestService).roomNumber}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Service Type:</span>
                            <span className="font-medium">{(selectedItem as GuestService).serviceType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <Badge 
                              variant={
                                (selectedItem as GuestService).status === 'pending' ? 'outline' :
                                (selectedItem as GuestService).status === 'in-progress' ? 'secondary' : 'default'
                              }
                            >
                              {(selectedItem as GuestService).status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Additional Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">ID:</span>
                            <span className="font-mono text-sm">{(selectedItem as GuestService).id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Created:</span>
                            <span className="font-medium">
                              {(selectedItem as GuestService).createdAt?.toDate?.()?.toLocaleString() || 'N/A'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDetailsDialog(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
} 