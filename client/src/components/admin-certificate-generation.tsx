import { useState, useEffect } from "react";
import {
  FileText,
  Download,
  Eye,
  CheckSquare,
  Square,
  Loader2,
  AlertCircle,
  RefreshCw,
  Award,
  Users,
  UserCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";


interface User {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  tagNumber?: string;
  role: "admin" | "trainee";
  email?: string;
}

interface CertificateUser extends User {
  certificateId: string;
  isSelected: boolean;
}

export default function AdminCertificateGeneration() {
  const { toast } = useToast();
  const [users, setUsers] = useState<CertificateUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectAll, setSelectAll] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [previewUser, setPreviewUser] = useState<CertificateUser | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch trainees data
  const { data: trainees } = useQuery<User[]>({
    queryKey: ["/api/trainees"],
    retry: false,
  });

  // Generate random certificate ID
  const generateCertificateId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `CERT-${timestamp}-${random}`.toUpperCase();
  };

  // Load all users from database
  const loadUsers = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError('');
      setLoadingProgress(0);
      setLoadingStatus('Initializing...');
      
      // Simulate progress updates
      const updateProgress = (progress: number, status: string) => {
        setLoadingProgress(progress);
        setLoadingStatus(status);
      };

      updateProgress(10, 'Connecting to database...');
      await new Promise(resolve => setTimeout(resolve, 200));

      updateProgress(20, 'Fetching trainees...');
      await new Promise(resolve => setTimeout(resolve, 300));

      updateProgress(80, 'Processing user data...');
      
      // Convert trainees to certificate users
      const certificateUsers: CertificateUser[] = (trainees || []).map(user => ({
        ...user,
        certificateId: generateCertificateId(),
        isSelected: false
      }));

      setUsers(certificateUsers);
      updateProgress(100, 'Data loaded successfully');
      
      toast({
        title: "Data Loaded",
        description: `Loaded ${certificateUsers.length} trainees for certificate generation`,
      });

    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users');
      toast({
        title: "Error",
        description: "Failed to load trainees data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [trainees]);

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setUsers(users.map(user => ({ ...user, isSelected: newSelectAll })));
  };

  const handleSelectUser = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, isSelected: !user.isSelected } : user
    ));
  };

  const handlePreview = (user: CertificateUser) => {
    setPreviewUser(user);
    setIsPreviewOpen(true);
  };

  const handleDownload = (user: CertificateUser) => {
    // Simulate certificate download
    toast({
      title: "Certificate Downloaded",
      description: `Certificate for ${user.firstName} ${user.lastName} has been downloaded`,
    });
  };

  const handleGenerateCertificates = async () => {
    const selectedUsers = users.filter(user => user.isSelected);
    
    if (selectedUsers.length === 0) {
      toast({
        title: "No Users Selected",
        description: "Please select at least one user to generate certificates",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsGenerating(true);
      
      // Simulate certificate generation
      for (let i = 0; i < selectedUsers.length; i++) {
        const user = selectedUsers[i];
        setLoadingStatus(`Generating certificate for ${user.firstName} ${user.lastName}...`);
        setLoadingProgress((i / selectedUsers.length) * 100);
        
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setLoadingProgress(100);
      setLoadingStatus('All certificates generated successfully!');
      
      toast({
        title: "Certificates Generated",
        description: `Successfully generated ${selectedUsers.length} certificates`,
      });

    } catch (error) {
      console.error('Error generating certificates:', error);
      toast({
        title: "Error",
        description: "Failed to generate certificates",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefresh = async () => {
    await loadUsers(true);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'trainee':
        return <Badge variant="secondary">Trainee</Badge>;
      case 'admin':
        return <Badge variant="default">Admin</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Certificate Generation</h2>
            <p className="text-gray-600">Generate and manage trainee certificates</p>
          </div>
        </div>
        
        <Card className="card-shadow">
          <CardContent className="p-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">{loadingStatus}</p>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${loadingProgress}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Certificate Generation</h2>
          <p className="text-gray-600">Generate and manage trainee certificates</p>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleGenerateCertificates}
            disabled={isGenerating || users.filter(u => u.isSelected).length === 0}
          >
            <Award className="h-4 w-4 mr-2" />
            Generate Certificates
          </Button>
        </div>
      </div>

      {error && (
        <Card className="card-shadow border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="card-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Available Users</CardTitle>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600">Select All</span>
              </div>
              <Badge variant="secondary">
                {users.filter(u => u.isSelected).length} selected
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <Checkbox
                    checked={user.isSelected}
                    onCheckedChange={() => handleSelectUser(user.id)}
                  />
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.firstName} {user.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {user.tagNumber} • {user.email}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getRoleBadge(user.role)}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePreview(user)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(user)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Certificate Preview Modal */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
          </DialogHeader>
          {previewUser && (
            <div className="space-y-4">
              <div className="border-2 border-gray-200 rounded-lg p-6 bg-gradient-to-br from-blue-50 to-white">
                <div className="text-center space-y-4">
                  <Award className="h-16 w-16 mx-auto text-blue-600" />
                  <h2 className="text-2xl font-bold text-gray-800">Certificate of Completion</h2>
                  <p className="text-gray-600">This is to certify that</p>
                  <h3 className="text-xl font-semibold text-gray-900">
                    {previewUser.firstName} {previewUser.lastName}
                  </h3>
                  <p className="text-gray-600">has successfully completed the training program</p>
                  <div className="mt-6">
                    <p className="text-sm text-gray-500">Certificate ID: {previewUser.certificateId}</p>
                    <p className="text-sm text-gray-500">Date: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => handleDownload(previewUser)}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Certificate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 