import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  UserCheck,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Search,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  getStaffRegistrations,
  Staff,
  generateStaffId, 
  getAllDocuments,
  getGeneratedIds
} from "@/lib/firebaseService";
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function StaffIdGenerationPage() {
  const [staffMembers, setStaffMembers] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState<'success' | 'error' | 'loading'>('loading');
  const [generatedId, setGeneratedId] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null);

  const handleCloseModal = () => {
    setShowModal(false);
    setGeneratedId('');
  };

  const handleDeleteClick = (staff: Staff) => {
    setDeleteTarget(staff);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setModalTitle('Deleting Staff Member');
      setModalMessage(`Please wait while we delete ${deleteTarget.id} and all associated data...`);
      setModalType('loading');
      setShowModal(true);
      setShowDeleteModal(false);

      // Delete from staff_registrations collection
      const deleteRegistrations = await getAllDocuments<Staff>("staff_registrations");
      const registrationToDelete = deleteRegistrations.find(reg => reg.id === deleteTarget.id);
      
      if (registrationToDelete) {
        // Delete from staff_registrations
        const registrationQuery = query(
          collection(db, 'staff_registrations'),
          where('id', '==', deleteTarget.id)
        );
        const registrationSnapshot = await getDocs(registrationQuery);
        if (!registrationSnapshot.empty) {
          const docRef = doc(db, 'staff_registrations', registrationSnapshot.docs[0].id);
          await deleteDoc(docRef);
        }
      }

      // Update generatedIds collection to set status back to 'available'
      const generatedIdsQuery = query(
        collection(db, 'generatedIds'),
        where('id', '==', deleteTarget.id),
        where('type', '==', 'staff')
      );
      const generatedIdsSnapshot = await getDocs(generatedIdsQuery);
      if (!generatedIdsSnapshot.empty) {
        const docRef = doc(db, 'generatedIds', generatedIdsSnapshot.docs[0].id);
        await updateDoc(docRef, {
          status: 'available',
          assignedTo: null,
          assignedAt: null
        });
      }

      // Show success modal
      setModalTitle('Deletion Complete!');
      setModalMessage(`Successfully deleted ${deleteTarget.id} and all associated data.\n\nThe ID is now available for new registrations.`);
      setModalType('success');

      // Refresh the staff members list
      const updatedRegistrations = await getAllDocuments<Staff>("staff_registrations");
      const updatedGeneratedIds = await getGeneratedIds('staff');
      
      // Combine data from both collections
      const combinedData: Staff[] = [];
      
      // First, add all registrations from staff_registrations
      combinedData.push(...updatedRegistrations);
      
      // Then, add pending records from generatedIds that don't have registrations
      updatedGeneratedIds.forEach(idData => {
        if (idData.status === 'assigned' || idData.status === 'activated') {
          // Check if this ID already has a registration
          const hasRegistration = updatedRegistrations.find(reg => reg.id === idData.id);
          
          if (!hasRegistration) {
            // Create pending record if no registration found
            combinedData.push({
              id: idData.id,
              firstName: 'Pending',
              surname: 'Pending',
              middleName: 'Pending',
              email: 'pending@example.com',
              phone: 'Pending',
              role: 'staff',
              isVerified: false,
              department: 'Pending',
              position: 'Pending',
              createdAt: idData.createdAt
            });
          }
        }
      });
      
      setStaffMembers(combinedData);

    } catch (error: any) {
      console.error('Error deleting staff member:', error);
      
      // Show error modal
      setModalTitle('Deletion Failed');
      setModalMessage('Failed to delete staff member. Please try again.\n\nError: ' + (error.message || 'Unknown error'));
      setModalType('error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // Load staff registrations from database
  useEffect(() => {
    const loadStaffMembers = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        // Get data from staff_registrations collection
        const initialRegistrations = await getAllDocuments<Staff>("staff_registrations");
        console.log('Registrations data:', initialRegistrations);
        
        // Get data from generatedIds collection for staff type
        const initialGeneratedIds = await getGeneratedIds('staff');
        console.log('Generated IDs data:', initialGeneratedIds);
        
        // Combine data from both collections
        const combinedData: Staff[] = [];
        
        // First, add all registrations from staff_registrations
        console.log('Raw initial registrations data:', initialRegistrations);
        combinedData.push(...initialRegistrations);
        
        // Then, add pending records from generatedIds that don't have registrations
        initialGeneratedIds.forEach(idData => {
          if (idData.status === 'assigned' || idData.status === 'activated') {
            // Check if this ID already has a registration
            const hasRegistration = initialRegistrations.find(reg => reg.id === idData.id);
            
            if (!hasRegistration) {
              // Create pending record if no registration found
              combinedData.push({
                id: idData.id,
                firstName: 'Pending',
                surname: 'Pending',
                middleName: 'Pending',
                email: 'pending@example.com',
                phone: 'Pending',
                role: 'staff',
                isVerified: false,
                department: 'Pending',
                position: 'Pending',
                createdAt: idData.createdAt
              });
            }
          }
        });
        
        console.log('Combined data:', combinedData);
        setStaffMembers(combinedData);
        
      } catch (error: any) {
        console.error('Error loading staff members:', error);
        if (error.code === 'unavailable' || error.message?.includes('connection')) {
          setError('Network connection error. Please check your internet connection and try again.');
        } else {
          setError('Failed to load staff members. Please try again later.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadStaffMembers();
  }, []);

  // Filter staff members based on search term
  const filteredStaffMembers = staffMembers.filter(staff => 
    searchTerm === '' || 
    staff.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    staff.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle generating new staff ID
  const handleGenerateStaffId = async () => {
    try {
      setIsGenerating(true);
      setError('');
      
      // Show loading modal
      setModalTitle('Generating Staff ID');
      setModalMessage('Please wait while we generate a new Staff ID...');
      setModalType('loading');
      setShowModal(true);
      
      const newId = await generateStaffId();
      setGeneratedId(newId);
      
      // Show success modal
      setModalTitle('ID Generated Successfully!');
      setModalMessage(`New Staff ID: ${newId}\n\nThis ID has been added to the system and is now available for registration.`);
      setModalType('success');
      
      // Refresh the staff members list to show the new pending record
      const newRegistrations = await getAllDocuments<Staff>("staff_registrations");
      const newGeneratedIds = await getGeneratedIds('staff');
      
      // Combine data from both collections
      const combinedData: Staff[] = [];
      
      // First, add all registrations from staff_registrations
      combinedData.push(...newRegistrations);
      
      // Then, add pending records from generatedIds that don't have registrations
      newGeneratedIds.forEach(idData => {
        if (idData.status === 'assigned' || idData.status === 'activated') {
          // Check if this ID already has a registration
          const hasRegistration = newRegistrations.find(reg => reg.id === idData.id);
          
          if (!hasRegistration) {
            // Create pending record if no registration found
            combinedData.push({
              id: idData.id,
              firstName: 'Pending',
              surname: 'Pending',
              middleName: 'Pending',
              email: 'pending@example.com',
              phone: 'Pending',
              role: 'staff',
              isVerified: false,
              department: 'Pending',
              position: 'Pending',
              createdAt: idData.createdAt
            });
          }
        }
      });
      
      setStaffMembers(combinedData);
      
    } catch (error: any) {
      console.error('Error generating staff ID:', error);
      
      // Show error modal
      setModalTitle('Generation Failed');
      setModalMessage('Failed to generate staff ID. Please try again.\n\nError: ' + (error.message || 'Unknown error'));
      setModalType('error');
      setError('Failed to generate staff ID. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle synchronizing with staff_registrations collection
  const handleSynchronize = async () => {
    try {
      setIsSynchronizing(true);
      setError('');
      
      // Show loading modal
      setModalTitle('Synchronizing Data');
      setModalMessage('Please wait while we synchronize with the registration database...');
      setModalType('loading');
      setShowModal(true);
      
      console.log('Starting synchronization with staff_registrations collection...');
      
      // Get data from staff_registrations collection
      const syncRegistrations = await getAllDocuments<Staff>("staff_registrations");
      console.log('Registrations data:', syncRegistrations);
      
      // Get data from generatedIds collection for staff type
      const syncGeneratedIds = await getGeneratedIds('staff');
      console.log('Generated IDs data:', syncGeneratedIds);
      
      // Combine data from both collections
      const combinedData: Staff[] = [];
      
      // First, add all registrations from staff_registrations
      console.log('Raw registrations data:', syncRegistrations);
      combinedData.push(...syncRegistrations);
      
      // Then, add pending records from generatedIds that don't have registrations
      syncGeneratedIds.forEach(idData => {
        if (idData.status === 'assigned' || idData.status === 'activated') {
          // Check if this ID already has a registration
          const hasRegistration = syncRegistrations.find(reg => reg.id === idData.id);
          
          if (!hasRegistration) {
            // Create pending record if no registration found
            combinedData.push({
              id: idData.id,
              firstName: 'Pending',
              surname: 'Pending',
              middleName: 'Pending',
              email: 'pending@example.com',
              phone: 'Pending',
              role: 'staff',
              isVerified: false,
              department: 'Pending',
              position: 'Pending',
              createdAt: idData.createdAt
            });
          }
        }
      });
      
      console.log('Combined data:', combinedData);
      setStaffMembers(combinedData);
      
      // Show success modal
      const registeredCount = combinedData.filter(staff => staff.email !== 'pending@example.com').length;
      const pendingCount = combinedData.filter(staff => staff.email === 'pending@example.com').length;
      setModalTitle('Synchronization Complete!');
      setModalMessage(`Successfully synchronized data from both collections.\n\nFound ${registeredCount} registered records and ${pendingCount} pending records.`);
      setModalType('success');
      
    } catch (error: any) {
      console.error('Error synchronizing data:', error);
      
      // Show error modal
      setModalTitle('Synchronization Failed');
      setModalMessage('Failed to synchronize data. Please try again.\n\nError: ' + (error.message || 'Unknown error'));
      setModalType('error');
      setError('Failed to synchronize data. Please try again.');
    } finally {
      setIsSynchronizing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
                              <Link href="/">
                <Button variant="ghost" className="mr-4">
                  <ArrowLeft className="mr-2" size={16} />
                  Back to Home
                </Button>
              </Link>
              <UserCheck className="text-2xl text-blue-600 mr-3" size={32} />
              <h1 className="text-xl font-semibold text-gray-900">Staff ID Generation</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Staff Registrations</h2>
          <p className="text-gray-600">View and manage staff registrations and their details.</p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Staff Records</h3>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <Input
                    placeholder="Search staff members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Button 
                  onClick={handleSynchronize}
                  disabled={isSynchronizing}
                  variant="outline"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <RefreshCw className={`mr-2 ${isSynchronizing ? 'animate-spin' : ''}`} size={16} />
                  {isSynchronizing ? 'Syncing...' : 'Synchronize'}
                </Button>
              <Button 
                  onClick={handleGenerateStaffId}
                disabled={isGenerating}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="mr-2" size={16} />
                  {isGenerating ? 'Generating...' : 'Generate ST ID'}
              </Button>
              </div>
            </div>
          </div>

                            {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-600">
                        <AlertTriangle size={16} />
                        <span className="text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">ID</th>
                   <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Email</th>
                   <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">First Name</th>
                   <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Surname</th>
                   <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Middle Name</th>
                   <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Phone Number</th>
                   <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Role</th>
                   <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Department</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {isLoading ? (
                          <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
                        <p className="text-lg font-medium text-gray-900 mb-2">Loading Staff Members...</p>
                        <p className="text-gray-500">Please wait while we fetch the latest registration information.</p>
                              </div>
                            </td>
                          </tr>
                ) : filteredStaffMembers.length === 0 ? (
                          <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                              <div className="flex flex-col items-center">
                                <UserCheck className="w-12 h-12 text-gray-300 mb-4" />
                        <p className="text-lg font-medium text-gray-900 mb-2">No Staff Members Found</p>
                        <p className="text-gray-500 mb-4">No staff registrations found.</p>
                        <Link href="/staff-registration">
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2" size={16} />
                            Register First Staff Member
                                </Button>
                        </Link>
                              </div>
                            </td>
                          </tr>
                        ) : (
                  filteredStaffMembers.map((staff, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                          {staff.id}
                                </span>
                              </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.firstName}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.surname}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.middleName || 'N/A'}</td>
                                             <td className="px-6 py-4 text-sm text-gray-900">
                         {staff.phone || 'N/A'}
                              </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.role}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.department || 'N/A'}</td>
                              <td className="px-6 py-4">
                        <Button
                          onClick={() => handleDeleteClick(staff)}
                          variant="destructive"
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Delete
                                    </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
        </div>
      </main>

      {/* Progress Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {modalType === 'loading' && (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              )}
              {modalType === 'success' && (
                <CheckCircle className="text-green-600" size={20} />
              )}
              {modalType === 'error' && (
                <AlertTriangle className="text-red-600" size={20} />
              )}
              {modalTitle}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="whitespace-pre-line text-sm text-gray-600 mb-6">
              {modalMessage}
            </div>
            {modalType === 'success' && generatedId && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="text-green-600" size={16} />
                  <span className="font-mono text-sm font-medium text-green-800">
                    {generatedId}
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-end">
              <Button 
                onClick={handleCloseModal}
                className={modalType === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-red-600" size={20} />
              Confirm Deletion
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete <strong>{deleteTarget?.id}</strong>?
              <br /><br />
              This action will:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Delete all registration data from the database</li>
                <li>Remove the record from both collections</li>
                <li>Set the ID status back to 'available' for new registrations</li>
              </ul>
              <br />
              <strong className="text-red-600">This action cannot be undone.</strong>
            </div>
            <div className="flex justify-end gap-3">
              <Button 
                onClick={handleDeleteCancel}
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDeleteConfirm}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 