import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Search, 
  ArrowLeft,
  Users,
  Download,
  Edit,
  Trash2,
  Check,
  X,
  RefreshCw,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { getTrainees, getRooms, getTagNumbers, deleteDocument, updateDocument, synchronizeAllocations, type Trainee, type Room, type TagNumber } from "@/lib/firebaseService";
import { NIGERIAN_STATES, STATES_LGAS } from "@/lib/constants";

export default function ViewTraineesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);
  const [editingTrainee, setEditingTrainee] = useState<Trainee | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'multiple' | null>(null);
  const [traineeToDelete, setTraineeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [currentDeleteIndex, setCurrentDeleteIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [forceRefreshProgress, setForceRefreshProgress] = useState(0);

  const { data: trainees = [], isLoading, error } = useQuery({
    queryKey: ['trainees'],
    queryFn: getTrainees,
    refetchInterval: 5000, // Refetch every 5 seconds to catch updates
    staleTime: 0, // Always consider data stale
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
    refetchInterval: 5000,
    staleTime: 0,
  });

  const { data: tagNumbers = [] } = useQuery({
    queryKey: ['tagNumbers'],
    queryFn: getTagNumbers,
    refetchInterval: 5000,
    staleTime: 0,
  });

  // Comprehensive status calculation function
  const calculateDetailedStatus = (trainee: Trainee) => {
    const hasRoom = trainee.roomNumber && trainee.roomBlock && trainee.roomNumber !== 'pending' && trainee.roomBlock !== 'pending';
    const hasTag = trainee.tagNumber && trainee.tagNumber !== 'pending';
    
    if (!hasRoom && !hasTag) {
      return { status: 'pending', details: 'No room or tag assigned', variant: 'destructive' };
    }
    
    if (!hasRoom) {
      return { status: 'no_room', details: 'Tag assigned but no room', variant: 'secondary' };
    }
    
    if (!hasTag) {
      return { status: 'no_tag', details: 'Room assigned but no tag', variant: 'secondary' };
    }
    
    // Both room and tag assigned - check room occupancy
    const traineeRoom = rooms.find(room => 
      room.roomNumber === trainee.roomNumber && room.block === trainee.roomBlock
    );
    
    if (!traineeRoom) {
      return { status: 'room_not_found', details: 'Room not found in system', variant: 'destructive' };
    }
    
    // Handle both numeric and text bed space formats
    let bedSpaceType = 1;
    if (traineeRoom.bedSpace) {
      if (traineeRoom.bedSpace.toLowerCase() === 'double') {
        bedSpaceType = 2;
      } else if (traineeRoom.bedSpace.toLowerCase() === 'single') {
        bedSpaceType = 1;
      } else {
        bedSpaceType = parseInt(traineeRoom.bedSpace) || 1;
      }
    }
    const traineesInRoom = trainees.filter(t => 
      t.roomNumber === trainee.roomNumber && 
      t.roomBlock === trainee.roomBlock
    );
    
    const occupancy = traineesInRoom.length;
    
    if (bedSpaceType === 1) {
      // Single bed room
      if (occupancy === 1) {
        return { status: 'fully_allocated', details: 'Single room fully occupied', variant: 'default' };
      } else {
        return { status: 'error', details: `Single room has ${occupancy} occupants`, variant: 'destructive' };
      }
    } else if (bedSpaceType === 2) {
      // Double bed room
      if (occupancy === 1) {
        return { status: 'partially_allocated', details: 'Double room - 1 of 2 beds occupied', variant: 'secondary' };
      } else if (occupancy === 2) {
        return { status: 'fully_allocated', details: 'Double room fully occupied', variant: 'default' };
      } else {
        return { status: 'error', details: `Double room has ${occupancy} occupants`, variant: 'destructive' };
      }
    } else {
      // Other bed space types
      if (occupancy >= bedSpaceType) {
        return { status: 'fully_allocated', details: `Room fully occupied (${occupancy}/${bedSpaceType})`, variant: 'default' };
      } else if (occupancy > 0) {
        return { status: 'partially_allocated', details: `Room partially occupied (${occupancy}/${bedSpaceType})`, variant: 'secondary' };
      } else {
        return { status: 'error', details: 'Room has no occupants', variant: 'destructive' };
      }
    }
  };

  // Debug logging
  console.log('ViewTraineesNew - Data:', {
    trainees,
    rooms,
    tagNumbers,
    isLoading,
    error,
    traineesLength: trainees.length,
    filteredTraineesLength: trainees.filter(trainee => {
      const matchesSearch = searchTerm === "" || 
        `${trainee.firstName} ${trainee.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainee.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trainee.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGender = genderFilter === "" || genderFilter === "all" || trainee.gender === genderFilter;
      const matchesState = stateFilter === "" || stateFilter === "all" || trainee.state === stateFilter;
      
      return matchesSearch && matchesGender && matchesState;
    }).length
  });

  const deleteTraineeMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteDocument("trainees", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      toast({
        title: "Success",
        description: "Trainee deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete trainee",
        variant: "destructive",
      });
    },
  });

  const updateTraineeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Trainee> }) => {
      await updateDocument("trainees", id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      setEditingTrainee(null);
      toast({
        title: "Success",
        description: "Trainee updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trainee",
        variant: "destructive",
      });
    },
  });

  const synchronizeAllocationsMutation = useMutation({
    mutationFn: async () => {
      setRefreshProgress(0);
      
      // Get trainees first to calculate progress
      const trainees = await getTrainees();
      const pendingTrainees = trainees.filter(t => 
        t.allocationStatus === 'pending' || 
        t.tagNumber === 'pending' || 
        t.roomNumber === 'pending'
      );
      
      setRefreshProgress(10);
      
      // Call synchronize with progress updates
      const result = await synchronizeAllocations();
      
      setRefreshProgress(100);
      return result;
    },
    onSuccess: async (result) => {
      // Force refresh the trainees data
      await queryClient.invalidateQueries({ queryKey: ['trainees'] });
      await queryClient.refetchQueries({ queryKey: ['trainees'] });
      
      toast({
        title: "Allocations Synchronized",
        description: `Allocated ${result.allocated} trainees. ${result.noRooms > 0 ? `No rooms available for ${result.noRooms} trainees.` : ''} ${result.noTags > 0 ? `No tags available for ${result.noTags} trainees.` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to synchronize allocations",
        variant: "destructive",
      });
    },
  });



  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshProgress(0);
    
    try {
      setRefreshProgress(25);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setRefreshProgress(50);
      await queryClient.invalidateQueries({ queryKey: ['trainees'] });
      
      setRefreshProgress(75);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setRefreshProgress(100);
      toast({
        title: "Refresh Complete",
        description: "Trainee data has been refreshed.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh trainee data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
      setRefreshProgress(0);
    }
  };

  const filteredTrainees = trainees.filter(trainee => {
    const matchesSearch = searchTerm === "" || 
      `${trainee.firstName} ${trainee.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainee.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGender = genderFilter === "" || genderFilter === "all" || trainee.gender === genderFilter;
    const matchesState = stateFilter === "" || stateFilter === "all" || trainee.state === stateFilter;
    
    return matchesSearch && matchesGender && matchesState;
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTrainees(filteredTrainees.map(t => t.id));
    } else {
      setSelectedTrainees([]);
    }
  };

  const handleSelectTrainee = (traineeId: string, checked: boolean) => {
    if (checked) {
      setSelectedTrainees(prev => [...prev, traineeId]);
    } else {
      setSelectedTrainees(prev => prev.filter(id => id !== traineeId));
    }
  };

  // Delete handlers
  const handleDeleteSingle = (traineeId: string) => {
    setTraineeToDelete(traineeId);
    setDeleteType('single');
    setShowDeleteDialog(true);
  };

  const handleDeleteMultiple = () => {
    setDeleteType('multiple');
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);

      if (deleteType === 'single' && traineeToDelete) {
        setDeleteProgress(50);
        await deleteTraineeMutation.mutateAsync(traineeToDelete);
        setDeleteProgress(100);
      } else if (deleteType === 'multiple') {
        // Delete multiple trainees with progress
        for (let i = 0; i < selectedTrainees.length; i++) {
          const traineeId = selectedTrainees[i];
          setCurrentDeleteIndex(i + 1);
          setDeleteProgress(((i + 1) / selectedTrainees.length) * 100);
          
          await deleteTraineeMutation.mutateAsync(traineeId);
          
          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        setSelectedTrainees([]);
      }
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
      setShowDeleteDialog(false);
      setTraineeToDelete(null);
      setDeleteType(null);
    }
  };

  // Edit handlers
  const handleEdit = (trainee: Trainee) => {
    setEditingTrainee(trainee);
  };

  const handleSaveEdit = (updatedData: Partial<Trainee>) => {
    if (editingTrainee) {
      updateTraineeMutation.mutate({ id: editingTrainee.id, data: updatedData });
    }
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      setExportProgress(20);
    const headers = ['Tag Number', 'Name', 'Email', 'Phone', 'Gender', 'State', 'LGA', 'Room'];
      
      setExportProgress(40);
    const csvContent = [
      headers.join(','),
        ...filteredTrainees.map((trainee, index) => {
          setExportProgress(40 + ((index + 1) / filteredTrainees.length) * 50);
          return [
        trainee.tagNumber,
        `${trainee.firstName} ${trainee.surname}`,
        trainee.email,
        trainee.phone,
        trainee.gender,
        trainee.state,
        trainee.lga,
        trainee.roomNumber ? `${trainee.roomBlock}-${trainee.roomNumber}` : 'Not assigned'
          ].join(',');
        })
    ].join('\n');
    
      setExportProgress(95);
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trainees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
      
      setExportProgress(100);
      toast({
        title: "Export successful",
        description: `Exported ${filteredTrainees.length} trainees to CSV file.`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export failed",
        description: "Failed to export trainees data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading trainees...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-2xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Trainees</h2>
          <p className="text-gray-600 mb-4">There was an error loading the trainees data.</p>
          <pre className="text-sm text-red-600 bg-red-50 p-4 rounded-lg max-w-md overflow-auto">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/original/home">
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="mr-2" size={16} />
                    Back to Home
                  </Button>
                </Link>
              <div>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 text-blue-600" size={24} />
                    Registered Trainees
                  </CardTitle>
                  <CardDescription>
                    View and manage all registered trainees ({filteredTrainees.length} total)
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  onClick={handleRefresh} 
                  variant="outline"
                  disabled={isRefreshing || synchronizeAllocationsMutation.isPending}
                  className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                >
                  <RefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} size={16} />
                  {isRefreshing ? "Refreshing..." : "Refresh"}
                </Button>
                <Button 
                  onClick={async () => {
                    setIsForceRefreshing(true);
                    setForceRefreshProgress(0);
                    
                    // Simulate progress steps
                    setForceRefreshProgress(20);
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    setForceRefreshProgress(40);
                    await queryClient.invalidateQueries({ queryKey: ['trainees'] });
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    setForceRefreshProgress(70);
                    await queryClient.refetchQueries({ queryKey: ['trainees'] });
                    await new Promise(resolve => setTimeout(resolve, 200));
                    
                    setForceRefreshProgress(100);
                    await new Promise(resolve => setTimeout(resolve, 300));
                    
                    setIsForceRefreshing(false);
                    setForceRefreshProgress(0);
                    
                    toast({
                      title: "Data Refreshed",
                      description: "Trainee data has been refreshed from database.",
                    });
                  }}
                  variant="outline"
                  disabled={isRefreshing || synchronizeAllocationsMutation.isPending || isForceRefreshing}
                  className="bg-purple-50 text-purple-700 hover:bg-purple-100"
                >
                  <RefreshCw className={`mr-2 ${isForceRefreshing ? 'animate-spin' : ''}`} size={16} />
                  {isForceRefreshing ? "Refreshing..." : "Force Refresh"}
                </Button>
                <Button 
                  onClick={() => synchronizeAllocationsMutation.mutate()} 
                  variant="outline"
                  disabled={isRefreshing || synchronizeAllocationsMutation.isPending}
                  className="bg-green-50 text-green-700 hover:bg-green-100"
                >
                  {synchronizeAllocationsMutation.isPending ? "Synchronizing..." : "Synchronize Allocations"}
                </Button>
                {selectedTrainees.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteMultiple}
                    disabled={deleteTraineeMutation.isPending}
                  >
                    <Trash2 className="mr-2" size={16} />
                    Delete Selected ({selectedTrainees.length})
                  </Button>
                )}
              <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
                <Download className="mr-2" size={16} />
                Export CSV
              </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredTrainees.length}
                  </div>
                  <p className="text-sm text-gray-600">Total Trainees</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredTrainees.filter(t => {
                      const hasRoom = t.roomNumber && t.roomBlock && t.roomNumber !== 'pending' && t.roomBlock !== 'pending';
                      const hasTag = t.tagNumber && t.tagNumber !== 'pending';
                      return hasRoom && hasTag;
                    }).length}
                  </div>
                  <p className="text-sm text-gray-600">Allocated</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-orange-600">
                    {filteredTrainees.filter(t => {
                      const hasRoom = t.roomNumber && t.roomBlock && t.roomNumber !== 'pending' && t.roomBlock !== 'pending';
                      const hasTag = t.tagNumber && t.tagNumber !== 'pending';
                      return !hasRoom && !hasTag;
                    }).length}
                  </div>
                  <p className="text-sm text-gray-600">Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-600">
                    {filteredTrainees.filter(t => {
                      const hasRoom = t.roomNumber && t.roomBlock && t.roomNumber !== 'pending' && t.roomBlock !== 'pending';
                      const hasTag = t.tagNumber && t.tagNumber !== 'pending';
                      return (hasRoom && !hasTag) || (!hasRoom && hasTag);
                    }).length}
                  </div>
                  <p className="text-sm text-gray-600">Partial</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Search by name, tag, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Genders</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stateFilter} onValueChange={setStateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by state" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All States</SelectItem>
                  {Array.from(new Set(trainees.map(t => t.state).filter((state): state is string => !!state))).map(state => (
                    <SelectItem key={state} value={state}>{state}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setGenderFilter("all");
                  setStateFilter("all");
                }}
              >
                Clear Filters
              </Button>
            </div>

            {/* Selection Controls */}
            {filteredTrainees.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={selectedTrainees.length === filteredTrainees.length && filteredTrainees.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm font-medium">
                    Select All ({selectedTrainees.length} selected)
                  </span>
                </div>
                {selectedTrainees.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteMultiple}
                    disabled={deleteTraineeMutation.isPending}
                  >
                    <Trash2 className="mr-2" size={16} />
                    Delete Selected
                  </Button>
                )}
              </div>
            )}

            {/* Trainees Table */}
            <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedTrainees.length === filteredTrainees.length && filteredTrainees.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Tag Number</TableHead>
                      <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                      <TableHead>Gender</TableHead>
                    <TableHead>Location</TableHead>
                      <TableHead>Room</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Bed Space</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {filteredTrainees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-8">
                        <div className="text-gray-500">
                          <Users className="mx-auto h-12 w-12 mb-4 opacity-20" />
                          {trainees.length === 0 ? "No trainees registered yet" : "No trainees match your filters"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTrainees.map((trainee) => (
                      <TableRow key={trainee.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedTrainees.includes(trainee.id)}
                            onCheckedChange={(checked) => handleSelectTrainee(trainee.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {trainee.tagNumber}
                        </TableCell>
                        <TableCell>
                          <div>
                          <div className="font-medium">
                            {trainee.firstName} {trainee.surname}
                            </div>
                            {trainee.middleName && (
                              <div className="text-sm text-gray-500">
                                {trainee.middleName}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{trainee.email}</div>
                            <div className="text-gray-500">{trainee.phone}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={trainee.gender === "male" ? "default" : "secondary"}>
                            {trainee.gender}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{trainee.state}</div>
                            <div className="text-gray-500">{trainee.lga}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {trainee.roomNumber && trainee.roomBlock ? (
                            <Badge variant="outline">
                              {trainee.roomBlock}-{trainee.roomNumber}
                            </Badge>
                          ) : (
                            <span className="text-gray-500 text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const statusInfo = calculateDetailedStatus(trainee);
                            return (
                              <div className="space-y-1">
                                <Badge 
                                  variant={statusInfo.variant as any} 
                                  className={
                                    statusInfo.variant === 'default' ? 'bg-green-100 text-green-800' :
                                    statusInfo.variant === 'secondary' ? 'bg-orange-100 text-orange-800' :
                                    'bg-red-100 text-red-800'
                                  }
                                >
                                  {statusInfo.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                                <div className="text-xs text-gray-500">
                                  {statusInfo.details}
                                </div>
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {trainee.bedSpace && trainee.bedSpace !== 'pending' ? (
                            <Badge variant="outline">{trainee.bedSpace}</Badge>
                          ) : (
                            <span className="text-gray-500 text-sm">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-blue-600 hover:text-blue-900"
                              onClick={() => handleEdit(trainee)}
                            >
                              <Edit size={16} />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDeleteSingle(trainee.id)}
                              disabled={deleteTraineeMutation.isPending}
                            >
                              <Trash2 size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  </TableBody>
                </Table>
              </div>
          </CardContent>
        </Card>

        {/* Refresh/Synchronize Progress Dialog */}
        {(isRefreshing || synchronizeAllocationsMutation.isPending) && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RefreshCw className="text-blue-600" size={20} />
                  {isRefreshing ? "Refreshing Data..." : "Synchronizing Allocations..."}
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
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - refreshProgress / 100)}`}
                            className="text-blue-600 transition-all duration-300 ease-in-out"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">{Math.round(refreshProgress)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {isRefreshing ? "Refreshing trainee data..." : "Processing allocations..."}
                      </p>
                      {refreshProgress >= 90 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Finalizing...
                        </p>
                      )}
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}

        {/* Export Progress Dialog */}
        {isExporting && (
          <Dialog open={true} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Download className="text-blue-600" size={20} />
                  Exporting Trainees...
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
                            strokeDashoffset={`${2 * Math.PI * 40 * (1 - exportProgress / 100)}`}
                            className="text-blue-600 transition-all duration-300 ease-in-out"
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-semibold text-gray-700">{Math.round(exportProgress)}%</span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        Preparing CSV file with {filteredTrainees.length} trainees...
                      </p>
                      {exportProgress >= 95 && (
                        <p className="text-xs text-blue-600 mt-2">
                          Downloading file...
                        </p>
                      )}
                    </div>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent>
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
                        Deleting {currentDeleteIndex} of {deleteType === 'single' ? 1 : selectedTrainees.length} trainee(s)...
                      </p>
                </div>
              </div>
                ) : (
                  deleteType === 'single' 
                    ? "Are you sure you want to delete this trainee? This action cannot be undone."
                    : `Are you sure you want to delete ${selectedTrainees.length} selected trainees? This action cannot be undone.`
                )}
              </DialogDescription>
            </DialogHeader>
            {!isDeleting && (
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={confirmDelete}>
                  Delete
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Trainee Dialog */}
        {editingTrainee && (
          <EditTraineeDialog 
            trainee={editingTrainee}
            onSave={handleSaveEdit}
            onCancel={() => setEditingTrainee(null)}
            isLoading={updateTraineeMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

// Edit Trainee Dialog Component
interface EditTraineeDialogProps {
  trainee: Trainee;
  onSave: (data: Partial<Trainee>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditTraineeDialog({ trainee, onSave, onCancel, isLoading }: EditTraineeDialogProps) {
  const [formData, setFormData] = useState({
    firstName: trainee.firstName,
    surname: trainee.surname,
    middleName: trainee.middleName || '',
    email: trainee.email,
    phone: trainee.phone,
    gender: trainee.gender,
    state: trainee.state || '',
    lga: trainee.lga || '',
  });

  // Get available LGAs for the selected state
  const availableLGAs = formData.state ? STATES_LGAS[formData.state] || [] : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trainee</DialogTitle>
          <DialogDescription>
            Update trainee information for {trainee.firstName} {trainee.surname}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Surname</label>
              <Input
                value={formData.surname}
                onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Middle Name</label>
            <Input
              value={formData.middleName}
              onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Gender</label>
            <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as 'male' | 'female' }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">State</label>
            <Select 
              value={formData.state} 
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                state: value,
                lga: '' // Reset LGA when state changes
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a state" />
              </SelectTrigger>
              <SelectContent>
                {NIGERIAN_STATES.map((state) => (
                  <SelectItem key={state.value} value={state.value}>
                    {state.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">LGA</label>
            <Select 
              value={formData.lga} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, lga: value }))}
              disabled={!formData.state}
            >
              <SelectTrigger>
                <SelectValue placeholder={formData.state ? "Select an LGA" : "Select a state first"} />
              </SelectTrigger>
              <SelectContent>
                {availableLGAs.map((lga) => (
                  <SelectItem key={lga} value={lga}>
                    {lga}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}