import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  FileText,
  Download,
  Eye,
  CheckSquare,
  Square,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getAllDocuments } from "@/lib/firebaseService";
import CertificatePreviewModal from "@/components/CertificatePreviewModal";
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  tagNumber?: string;
  role: "staff" | "resource_person" | "trainee";
  certificateId?: string;
}

interface CertificateUser extends User {
  certificateId: string;
  isSelected: boolean;
}

export default function CertificateGenerationPage() {
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

      updateProgress(20, 'Fetching staff data...');
      const staff = await getAllDocuments('staff');
      await new Promise(resolve => setTimeout(resolve, 300));

      updateProgress(40, 'Fetching resource persons...');
      const resourcePersons = await getAllDocuments('resourcePersons');
      await new Promise(resolve => setTimeout(resolve, 300));

      updateProgress(60, 'Fetching trainees...');
      const trainees = await getAllDocuments('trainees');
      await new Promise(resolve => setTimeout(resolve, 300));

      updateProgress(80, 'Processing user data...');
      
      // Combine all users and add certificate IDs
      const allUsers: CertificateUser[] = [
        ...staff.map(user => ({
          ...user,
          certificateId: generateCertificateId(),
          isSelected: false
        })),
        ...resourcePersons.map(user => ({
          ...user,
          certificateId: generateCertificateId(),
          isSelected: false
        })),
        ...trainees.map(user => ({
          ...user,
          certificateId: generateCertificateId(),
          isSelected: false
        }))
      ];

      updateProgress(90, 'Finalizing...');
      await new Promise(resolve => setTimeout(resolve, 200));

      setUsers(allUsers);
      setSelectAll(false); // Reset selection when refreshing
      
      updateProgress(100, 'Complete!');
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error loading users:', error);
      setError('Failed to load users from database');
      setLoadingStatus('Error occurred');
    } finally {
      if (isRefresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
      // Reset progress after a delay
      setTimeout(() => {
        setLoadingProgress(0);
        setLoadingStatus('');
      }, 1000);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Handle select all
  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setUsers(users.map(user => ({ ...user, isSelected: newSelectAll })));
  };

  // Handle individual selection
  const handleSelectUser = (userId: string) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, isSelected: !user.isSelected } : user
    ));
    
    // Update select all state
    const allSelected = users.every(user => 
      user.id === userId ? !user.isSelected : user.isSelected
    );
    setSelectAll(allSelected);
  };

  // Preview certificate
  const handlePreview = (user: CertificateUser) => {
    setPreviewUser(user);
    setIsPreviewOpen(true);
  };

  // Download single certificate
  const handleDownload = (user: CertificateUser) => {
    try {
      // Create certificate content
      const certificateContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate - ${user.firstName} ${user.surname}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 40px; }
            .certificate { 
              border: 3px solid #1e40af; 
              padding: 40px; 
              text-align: center; 
              background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
              min-height: 600px;
              position: relative;
            }
            .header { 
              border-bottom: 2px solid #1e40af; 
              padding-bottom: 20px; 
              margin-bottom: 40px;
            }
            .title { 
              font-size: 36px; 
              font-weight: bold; 
              color: #1e40af; 
              margin: 0;
            }
            .subtitle { 
              font-size: 18px; 
              color: #374151; 
              margin: 10px 0 0 0;
            }
            .content { 
              font-size: 20px; 
              color: #374151; 
              line-height: 1.6;
              margin: 40px 0;
            }
            .name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #1e40af; 
              margin: 20px 0;
            }
            .role { 
              font-size: 24px; 
              color: #059669; 
              font-weight: bold;
              margin: 20px 0;
            }
            .certificate-id { 
              font-family: monospace; 
              font-size: 16px; 
              color: #6b7280; 
              margin: 20px 0;
            }
            .footer { 
              border-top: 2px solid #1e40af; 
              padding-top: 20px; 
              margin-top: 40px;
              font-size: 14px;
              color: #6b7280;
            }
            .date { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="certificate">
            <div class="header">
              <h1 class="title">Certificate of Completion</h1>
              <p class="subtitle">Training Management System</p>
            </div>
            
            <div class="content">
              <p>This is to certify that</p>
              <div class="name">${user.firstName} ${user.middleName || ''} ${user.surname}</div>
              <p>has successfully completed the training program as a</p>
              <div class="role">${getRoleText(user.role)}</div>
              <div class="certificate-id">Certificate ID: ${user.certificateId}</div>
              ${user.tagNumber ? `<div class="certificate-id">Tag Number: ${user.tagNumber}</div>` : ''}
            </div>
            
            <div class="footer">
              <div class="date">Date Issued: ${new Date().toLocaleDateString()}</div>
              <div class="date">Valid Until: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
            </div>
          </div>
        </body>
        </html>
      `;

      // Create blob and download
      const blob = new Blob([certificateContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificate-${user.firstName}-${user.surname}-${user.certificateId}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Certificate downloaded successfully!",
        description: `${user.firstName} ${user.surname} - ${user.certificateId}`,
        duration: 3000,
      });
    } catch (error) {
      console.error('Error downloading certificate:', error);
      toast({
        title: "Download failed",
        description: "An error occurred while downloading the certificate.",
        variant: "destructive",
        duration: 3000,
      });
    }
  };

  // Handle deep refresh
  const handleRefresh = async () => {
    await loadUsers(true);
  };

  // Download all selected certificates as ZIP
  const handleDownloadAll = async () => {
    const selectedUsers = users.filter(user => user.isSelected);
    
    if (selectedUsers.length === 0) {
      toast({
        title: "No users selected",
        description: "Please select at least one user to download certificates.",
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    setIsGenerating(true);
    
    try {
      // Show initial toast
      toast({
        title: "Generating certificates...",
        description: `Processing ${selectedUsers.length} certificates`,
        duration: 2000,
      });

      // Create certificates for all selected users
      const certificates = selectedUsers.map(user => {
        const certificateContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>Certificate - ${user.firstName} ${user.surname}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 0; padding: 40px; }
              .certificate { 
                border: 3px solid #1e40af; 
                padding: 40px; 
                text-align: center; 
                background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
                min-height: 600px;
                position: relative;
              }
              .header { 
                border-bottom: 2px solid #1e40af; 
                padding-bottom: 20px; 
                margin-bottom: 40px;
              }
              .title { 
                font-size: 36px; 
                font-weight: bold; 
                color: #1e40af; 
                margin: 0;
              }
              .subtitle { 
                font-size: 18px; 
                color: #374151; 
                margin: 10px 0 0 0;
              }
              .content { 
                font-size: 20px; 
                color: #374151; 
                line-height: 1.6;
                margin: 40px 0;
              }
              .name { 
                font-size: 28px; 
                font-weight: bold; 
                color: #1e40af; 
                margin: 20px 0;
              }
              .role { 
                font-size: 24px; 
                color: #059669; 
                font-weight: bold;
                margin: 20px 0;
              }
              .certificate-id { 
                font-family: monospace; 
                font-size: 16px; 
                color: #6b7280; 
                margin: 20px 0;
              }
              .footer { 
                border-top: 2px solid #1e40af; 
                padding-top: 20px; 
                margin-top: 40px;
                font-size: 14px;
                color: #6b7280;
              }
              .date { margin: 10px 0; }
            </style>
          </head>
          <body>
            <div class="certificate">
              <div class="header">
                <h1 class="title">Certificate of Completion</h1>
                <p class="subtitle">Training Management System</p>
              </div>
              
              <div class="content">
                <p>This is to certify that</p>
                <div class="name">${user.firstName} ${user.middleName || ''} ${user.surname}</div>
                <p>has successfully completed the training program as a</p>
                <div class="role">${getRoleText(user.role)}</div>
                <div class="certificate-id">Certificate ID: ${user.certificateId}</div>
                ${user.tagNumber ? `<div class="certificate-id">Tag Number: ${user.tagNumber}</div>` : ''}
              </div>
              
              <div class="footer">
                <div class="date">Date Issued: ${new Date().toLocaleDateString()}</div>
                <div class="date">Valid Until: ${new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString()}</div>
              </div>
            </div>
          </body>
          </html>
        `;

        return {
          name: `certificate-${user.firstName}-${user.surname}-${user.certificateId}.html`,
          content: certificateContent
        };
      });

      // Download each certificate individually (since ZIP requires additional libraries)
      certificates.forEach(cert => {
        const blob = new Blob([cert.content], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = cert.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      });

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success toast
      toast({
        title: "Certificates downloaded successfully!",
        description: `${selectedUsers.length} certificates have been generated and downloaded.`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error generating certificates:', error);
      toast({
        title: "Failed to generate certificates",
        description: "An error occurred while generating certificates. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getRoleText = (role: string) => {
    switch (role) {
      case 'staff':
        return 'Staff Member';
      case 'resource_person':
        return 'Resource Person';
      case 'trainee':
        return 'Trainee';
      default:
        return role;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'staff':
        return <Badge variant="default">Staff</Badge>;
      case 'resource_person':
        return <Badge variant="secondary">Resource Person</Badge>;
      case 'trainee':
        return <Badge variant="outline">Trainee</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

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
              <FileText className="text-2xl text-blue-600 mr-3" size={32} />
              <h1 className="text-xl font-semibold text-gray-900">Certificate Generation</h1>
            </div>
                         <div className="flex items-center space-x-4">
               {isRefreshing && (
                 <div className="flex items-center space-x-2 text-sm text-gray-600">
                   <div className="w-16 bg-gray-200 rounded-full h-1">
                     <div 
                       className="bg-blue-600 h-1 rounded-full transition-all duration-300 ease-out"
                       style={{ width: `${loadingProgress}%` }}
                     ></div>
                   </div>
                   <span>{loadingProgress}%</span>
                 </div>
               )}
               <Badge variant="outline">
                 {users.filter(u => u.isSelected).length} selected
               </Badge>
                               <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing || isLoading}
                  variant="outline"
                  className="mr-2"
                >
                  {isRefreshing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Refreshing... ({loadingProgress}%)
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2" size={16} />
                      Refresh Data
                    </>
                  )}
                </Button>
               <Button 
                 onClick={handleDownloadAll}
                 disabled={isGenerating || users.filter(u => u.isSelected).length === 0}
                 className="bg-blue-600 hover:bg-blue-700"
               >
                 {isGenerating ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Generating...
                   </>
                 ) : (
                   <>
                     <Download className="mr-2" size={16} />
                     Download All ({users.filter(u => u.isSelected).length})
                   </>
                 )}
               </Button>
             </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Certificate Management</h2>
          <p className="text-gray-600">
            Generate and download certificates for all registered users. Select individual users or use "Select All" to download multiple certificates.
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle size={16} />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <div className="flex items-center">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center justify-center w-4 h-4"
                      >
                        {selectAll ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Tag Number</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">First Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Surname</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Middle Name</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Certificate ID</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                                 {isLoading ? (
                   <tr>
                     <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                       <div className="flex flex-col items-center max-w-md mx-auto">
                         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                         <p className="text-lg font-medium text-gray-900 mb-2">Loading Users...</p>
                         <p className="text-gray-500 mb-4">Please wait while we fetch all users from the database.</p>
                         
                         {/* Progress Bar */}
                         <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                           <div 
                             className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                             style={{ width: `${loadingProgress}%` }}
                           ></div>
                         </div>
                         
                         {/* Progress Text */}
                         <div className="text-sm text-gray-600">
                           <p className="font-medium">{loadingStatus}</p>
                           <p className="text-xs text-gray-500 mt-1">{loadingProgress}% complete</p>
                         </div>
                       </div>
                     </td>
                   </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No Users Found</p>
                        <p className="text-gray-500 mb-4">No users found in the database to generate certificates for.</p>
                        <Link href="/original/registration">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            Register Users
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, index) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleSelectUser(user.id)}
                          className="flex items-center justify-center w-4 h-4"
                        >
                          {user.isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {user.tagNumber || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.surname}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500">
                          {user.middleName || '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {user.certificateId}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handlePreview(user)}
                            title="Preview Certificate"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleDownload(user)}
                            title="Download Certificate"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Certificate Preview Modal */}
      <CertificatePreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setPreviewUser(null);
        }}
        user={previewUser}
        onDownload={handleDownload}
      />
    </div>
  );
} 