import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { 
  Plus, 
  RefreshCw, 
  Trash2, 
  Eye, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  UserCheck,
  Users,
  Hash,
  BarChart3
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  generateNewIds, 
  getGeneratedIds, 
  adminFreeId, 
  adminDeactivateId, 
  getIdStatistics,
  type GeneratedId 
} from "@/lib/firebaseService";

export default function AdminIdManagement() {
  const [idType, setIdType] = useState<"staff" | "resource_person">("staff");
  const [generateCount, setGenerateCount] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deactivationReason, setDeactivationReason] = useState("");
  const [freeReason, setFreeReason] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch generated IDs
  const { data: generatedIds, isLoading: isLoadingIds, refetch: refetchIds } = useQuery({
    queryKey: ["generatedIds", idType],
    queryFn: () => getGeneratedIds(idType),
  });

  // Fetch ID statistics
  const { data: idStats, isLoading: isLoadingStats, refetch: refetchStats } = useQuery({
    queryKey: ["idStatistics"],
    queryFn: getIdStatistics,
  });

  // Generate new IDs mutation
  const generateIdsMutation = useMutation({
    mutationFn: async () => {
      return await generateNewIds(idType, generateCount);
    },
    onSuccess: (newIds) => {
      toast({
        title: "IDs Generated Successfully",
        description: `Generated ${newIds.length} new ${idType === "staff" ? "Staff" : "Resource Person"} ID(s): ${newIds.join(", ")}`
      });
      queryClient.invalidateQueries({ queryKey: ["generatedIds", idType] });
      queryClient.invalidateQueries({ queryKey: ["idStatistics"] });
      setGenerateCount(1);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Generate IDs",
        description: error.message || "An error occurred while generating IDs",
        variant: "destructive"
      });
    },
  });

  // Free ID mutation
  const freeIdMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await adminFreeId(id, reason);
    },
    onSuccess: () => {
      toast({
        title: "ID Freed Successfully",
        description: "The ID has been freed and is now available for reuse"
      });
      queryClient.invalidateQueries({ queryKey: ["generatedIds", idType] });
      queryClient.invalidateQueries({ queryKey: ["idStatistics"] });
      setSelectedId(null);
      setFreeReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Free ID",
        description: error.message || "An error occurred while freeing the ID",
        variant: "destructive"
      });
    },
  });

  // Deactivate ID mutation
  const deactivateIdMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      return await adminDeactivateId(id, reason);
    },
    onSuccess: () => {
      toast({
        title: "ID Deactivated Successfully",
        description: "The ID has been deactivated and cannot be used for registration"
      });
      queryClient.invalidateQueries({ queryKey: ["generatedIds", idType] });
      queryClient.invalidateQueries({ queryKey: ["idStatistics"] });
      setSelectedId(null);
      setDeactivationReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Deactivate ID",
        description: error.message || "An error occurred while deactivating the ID",
        variant: "destructive"
      });
    },
  });

  const handleGenerateIds = () => {
    if (generateCount < 1 || generateCount > 100) {
      toast({
        title: "Invalid Count",
        description: "Please enter a count between 1 and 100",
        variant: "destructive"
      });
      return;
    }
    generateIdsMutation.mutate();
  };

  const handleFreeId = () => {
    if (!selectedId) return;
    freeIdMutation.mutate({ id: selectedId, reason: freeReason || "Manually freed by admin" });
  };

  const handleDeactivateId = () => {
    if (!selectedId) return;
    deactivateIdMutation.mutate({ id: selectedId, reason: deactivationReason || "Deactivated by admin" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="default" className="bg-green-100 text-green-800">Available</Badge>;
      case 'assigned':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Assigned</Badge>;
      case 'activated':
        return <Badge variant="outline" className="bg-purple-100 text-purple-800">Activated</Badge>;
      case 'deactivated':
        return <Badge variant="destructive">Deactivated</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'assigned':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'activated':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'deactivated':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">ID Management</h2>
          <p className="text-gray-600">Generate and manage Staff and Resource Person IDs</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            refetchIds();
            refetchStats();
          }}
          className="flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {idStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Hash className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total IDs</p>
                  <p className="text-2xl font-bold">{idStats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Available</p>
                  <p className="text-2xl font-bold">{idStats.available}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Assigned</p>
                  <p className="text-2xl font-bold">{idStats.assigned}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Deactivated</p>
                  <p className="text-2xl font-bold">{idStats.deactivated}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate New IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Generate New IDs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end space-x-4">
            <div className="space-y-2">
              <Label htmlFor="idType">ID Type</Label>
              <Select value={idType} onValueChange={(value: "staff" | "resource_person") => setIdType(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff IDs</SelectItem>
                  <SelectItem value="resource_person">Resource Person IDs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="count">Count</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="100"
                value={generateCount}
                onChange={(e) => setGenerateCount(parseInt(e.target.value) || 1)}
                className="w-20"
              />
            </div>
            
            <Button
              onClick={handleGenerateIds}
              disabled={generateIdsMutation.isPending}
              className="flex items-center gap-2"
            >
              {generateIdsMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Generate IDs
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ID List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="w-5 h-5" />
            Generated IDs - {idType === "staff" ? "Staff" : "Resource Person"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingIds ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="ml-2">Loading IDs...</span>
            </div>
          ) : generatedIds && generatedIds.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedIds.map((idData) => (
                  <TableRow key={idData.id}>
                    <TableCell className="font-mono font-medium">{idData.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(idData.status)}
                        {getStatusBadge(idData.status)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {idData.assignedTo ? (
                        <span className="text-sm text-gray-600">{idData.assignedTo}</span>
                      ) : (
                        <span className="text-sm text-gray-400">Not assigned</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {idData.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {idData.status === 'assigned' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedId(idData.id)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Free ID: {idData.id}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will free the ID and make it available for reuse. 
                                  The current user will lose access to this ID.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="freeReason">Reason (Optional)</Label>
                                  <Input
                                    id="freeReason"
                                    value={freeReason}
                                    onChange={(e) => setFreeReason(e.target.value)}
                                    placeholder="e.g., User left organization"
                                  />
                                </div>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleFreeId}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Free ID
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        
                        {idData.status !== 'activated' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => setSelectedId(idData.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate ID: {idData.id}</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently deactivate the ID and prevent it from being used for registration.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="deactivationReason">Reason (Required)</Label>
                                  <Input
                                    id="deactivationReason"
                                    value={deactivationReason}
                                    onChange={(e) => setDeactivationReason(e.target.value)}
                                    placeholder="e.g., ID compromised, system change"
                                    required
                                  />
                                </div>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={handleDeactivateId}
                                  disabled={!deactivationReason.trim()}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Deactivate ID
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No {idType === "staff" ? "Staff" : "Resource Person"} IDs found.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
