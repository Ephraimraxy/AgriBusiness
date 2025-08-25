import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// Toast implementation with shadcn/ui
import { Toast, ToastProvider, ToastViewport, ToastTitle, ToastDescription, ToastClose } from "@/components/ui/toast";
import { useToast as useToastPrimitive } from "@/components/ui/use-toast";

function useToast() {
  const { toast } = useToastPrimitive();
  
  return {
    toast: (options: { title: string; description: string; variant?: 'default' | 'destructive' }) => {
      toast({
        title: options.title,
        description: options.description,
        variant: options.variant || 'default',
      });
    }
  };
}

// Import the necessary functions and types from firebaseService
import { 
  updateDocument, 
  deleteDocument, 
  createSponsor, 
  getSponsors, 
  type Sponsor 
} from "@/lib/firebaseService";

// Update sponsor in Firestore
async function updateSponsor(id: string, data: Partial<Omit<Sponsor, 'id' | 'createdAt'>>): Promise<void> {
  try {
    await updateDocument('sponsors', id, data);
    console.log('Sponsor updated successfully:', id, data);
  } catch (error) {
    console.error('Error updating sponsor:', error);
    throw error;
  }
}

// Delete sponsor from Firestore
async function deleteSponsor(id: string): Promise<void> {
  try {
    await deleteDocument('sponsors', id);
    console.log('Sponsor deleted successfully:', id);
  } catch (error) {
    console.error('Error deleting sponsor:', error);
    throw error;
  }
}

function ToastContainer() {
  return (
    <ToastProvider>
      <ToastViewport className="fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]" />
    </ToastProvider>
  );
}
import { Loader2, Edit, Trash2, MoreHorizontal, ArrowLeft, Building, Plus, Search } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

export default function SponsorsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);
  const [deletingSponsor, setDeletingSponsor] = useState<Sponsor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Reset form when dialog is closed
  useEffect(() => {
    if (!isCreateDialogOpen && !editingSponsor) {
      setNewSponsor({
        name: "",
        description: "",
        isActive: true,
      });
    } else if (editingSponsor) {
      setNewSponsor({
        name: editingSponsor.name,
        description: editingSponsor.description || "",
        isActive: editingSponsor.isActive,
      });
    }
  }, [isCreateDialogOpen, editingSponsor]);
  const [newSponsor, setNewSponsor] = useState({
    name: "",
    description: "",
    isActive: true,
  });
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewSponsor(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const createSponsorMutation = useMutation({
    mutationFn: () => createSponsor(newSponsor),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      setIsCreateDialogOpen(false);
      setNewSponsor({ name: "", description: "", isActive: true });
      toast({
        title: "Success",
        description: "Sponsor created successfully!",
        variant: "default",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create sponsor",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newSponsor.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a sponsor name",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSponsor) {
        await updateSponsor(editingSponsor.id, {
          name: newSponsor.name,
          description: newSponsor.description,
          isActive: newSponsor.isActive
        });
        toast({
          title: "Success",
          description: `Sponsor "${newSponsor.name}" has been updated.`,
        });
        setEditingSponsor(null);
        setIsCreateDialogOpen(false);
        // Refresh the sponsors list
        queryClient.invalidateQueries({ queryKey: ['sponsors'] });
      } else {
        await createSponsorMutation.mutateAsync({
          name: newSponsor.name,
          description: newSponsor.description,
          isActive: newSponsor.isActive
        });
        setIsCreateDialogOpen(false);
        toast({
          title: "Success",
          description: `Sponsor "${newSponsor.name}" has been created.`,
        });
      }
      
      // Reset form
      setNewSponsor({ name: "", description: "", isActive: true });
    } catch (error) {
      console.error('Error saving sponsor:', error);
      toast({
        title: "Error",
        description: `Failed to ${editingSponsor ? 'update' : 'create'} sponsor. Please try again.`,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const { data: sponsors = [], isLoading } = useQuery({
    queryKey: ['sponsors'],
    queryFn: getSponsors,
  });

  const filteredSponsors = sponsors.filter(sponsor =>
    sponsor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (sponsor.description && sponsor.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading sponsors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 relative">
      <ToastContainer />
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
                    <Building className="mr-2 text-blue-600" size={24} />
                    Sponsors Management
                  </CardTitle>
                  <CardDescription>
                    View and manage training sponsors ({filteredSponsors.length} total)
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Search */}
            <div className="flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search sponsors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Sponsor
              </Button>
            </div>

            {/* Sponsors Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSponsors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        <div className="text-gray-500">
                          <Building className="mx-auto h-12 w-12 mb-4 opacity-20" />
                          {sponsors.length === 0 ? "No sponsors registered yet" : "No sponsors match your search"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSponsors.map((sponsor) => (
                      <TableRow key={sponsor.id}>
                        <TableCell className="font-medium">
                          {sponsor.name}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate">
                            {sponsor.description || "No description"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={sponsor.isActive ? "default" : "secondary"}>
                            {sponsor.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                            {sponsor.createdAt instanceof Date 
                            ? sponsor.createdAt.toLocaleDateString()
                            : new Date(sponsor.createdAt.seconds * 1000).toLocaleDateString()
                          }
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => setEditingSponsor(sponsor)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <Edit className="h-4 w-4" />
                                <span>Edit</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => setDeletingSponsor(sponsor)}
                                className="flex items-center gap-2 text-red-600 hover:text-red-600 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-blue-600">
                    {filteredSponsors.length}
                  </div>
                  <p className="text-sm text-gray-600">Total Sponsors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-600">
                    {filteredSponsors.filter(s => s.isActive).length}
                  </div>
                  <p className="text-sm text-gray-600">Active Sponsors</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-gray-600">
                    {filteredSponsors.filter(s => !s.isActive).length}
                  </div>
                  <p className="text-sm text-gray-600">Inactive Sponsors</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingSponsor} 
        onOpenChange={(open) => !open && setDeletingSponsor(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the sponsor "{deletingSponsor?.name}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (!deletingSponsor) return;
                try {
                  await deleteSponsor(deletingSponsor.id);
                  toast({
                    title: "Success",
                    description: `Sponsor "${deletingSponsor.name}" has been deleted.`,
                  });
                  // Refresh the sponsors list
                  queryClient.invalidateQueries({ queryKey: ['sponsors'] });
                } catch (error) {
                  console.error('Error deleting sponsor:', error);
                  toast({
                    title: "Error",
                    description: "Failed to delete sponsor. Please try again.",
                    variant: "destructive",
                  });
                } finally {
                  setDeletingSponsor(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create/Edit Sponsor Dialog */}
      <Dialog 
        open={isCreateDialogOpen || !!editingSponsor} 
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingSponsor(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingSponsor ? 'Edit Sponsor' : 'Create New Sponsor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name *
                </Label>
                <div className="col-span-3">
                  <Input
                    id="name"
                    name="name"
                    value={newSponsor.name}
                    onChange={handleInputChange}
                    className="w-full"
                    placeholder="Enter sponsor name"
                    disabled={createSponsorMutation.isPending}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Address
                </Label>
                <div className="col-span-3">
                  <textarea
                    id="description"
                    name="description"
                    value={newSponsor.description}
                    onChange={handleInputChange}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    placeholder="Enter sponsor address"
                    rows={3}
                    disabled={createSponsorMutation.isPending}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="isActive" className="text-right">
                  Active
                </Label>
                <div className="col-span-3">
                  <Switch
                    id="isActive"
                    name="isActive"
                    checked={newSponsor.isActive}
                    onCheckedChange={(checked) =>
                      setNewSponsor({ ...newSponsor, isActive: checked })
                    }
                    disabled={createSponsorMutation.isPending}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateDialogOpen(false);
                  setEditingSponsor(null);
                }}
                disabled={createSponsorMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {editingSponsor ? 'Updating...' : 'Creating...'}
                  </>
                ) : editingSponsor ? (
                  'Update Sponsor'
                ) : (
                  'Create Sponsor'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
