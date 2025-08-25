import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, User, Edit, Save, X, Camera, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

interface ProfileData {
  id: string;
  firstName: string;
  surname: string;
  middleName?: string;
  email: string;
  phone: string;
  department?: string;
  position?: string;
  specialization?: string;
  profileImageUrl?: string;
  bio?: string;
  isVerified: boolean;
  createdAt: any;
}

interface ProfileManagementProps {
  userRole: "staff" | "resource_person";
  userEmail: string;
  userData: any; // Pass the actual user data from session
  onBack?: () => void;
  embedded?: boolean;
}

export default function ProfileManagement({ userRole, userEmail, userData, onBack, embedded = true }: ProfileManagementProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentProfileImage, setCurrentProfileImage] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState<Partial<ProfileData>>({
    firstName: "",
    surname: "",
    middleName: "",
    email: "",
    phone: "",
    department: "",
    position: "",
    specialization: "",
    bio: "",
  });

  // Use the passed user data instead of fetching from Firebase
  const profileData = userData;

  // Update profile mutation - now with Firebase Firestore
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<ProfileData>) => {
      try {
        const updatedData = { ...profileData, ...data };
        
        // Update Firestore document
        const userCollection = userRole === "staff" ? "staff" : "resourcePersons";
        const userDocRef = doc(db, userCollection, profileData.id);
        
        // Prepare data for Firestore (remove undefined values)
        const firestoreData: any = {};
        Object.keys(data).forEach(key => {
          if (data[key as keyof ProfileData] !== undefined) {
            firestoreData[key] = data[key as keyof ProfileData];
          }
        });
        
        await updateDoc(userDocRef, {
          ...firestoreData,
          updatedAt: new Date()
        });
        
        // Update session storage
        if (userRole === "staff") {
          sessionStorage.setItem('currentStaff', JSON.stringify(updatedData));
        } else {
          sessionStorage.setItem('currentRp', JSON.stringify(updatedData));
        }
        
        return updatedData;
      } catch (error) {
        console.error('Update error:', error);
        throw new Error('Failed to update profile. Please try again.');
      }
    },
    onSuccess: () => {
      toast({ 
        title: "Profile updated successfully", 
        description: "Your profile has been updated and saved to database."
      });
      setIsEditing(false);
      // Update the profile data state to reflect changes
      // No page reload needed
    },
    onError: (error: any) => {
      toast({ 
        title: "Update failed", 
        description: error.message || "Could not update profile. Please try again.",
        variant: "destructive" 
      });
    },
  });

  // Upload image mutation - now with Firebase Storage
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        // Delete old profile image if it exists
        if (currentProfileImage && currentProfileImage.startsWith('https://firebasestorage.googleapis.com')) {
          try {
            const oldImageRef = ref(storage, currentProfileImage);
            await deleteObject(oldImageRef);
          } catch (deleteError) {
            console.warn('Could not delete old profile image:', deleteError);
          }
        }
        
        // Create a unique filename
        const fileExtension = file.name.split('.').pop();
        const fileName = `${userRole}_${profileData.id}_${Date.now()}.${fileExtension}`;
        const storageRef = ref(storage, `profile-images/${fileName}`);
        
        // Upload file to Firebase Storage
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        // Update Firestore document
        const userCollection = userRole === "staff" ? "staff" : "resourcePersons";
        const userDocRef = doc(db, userCollection, profileData.id);
        
        await updateDoc(userDocRef, {
          profileImageUrl: downloadURL,
          profileImageUpdatedAt: new Date()
        });
        
        // Update session storage
        const updatedData = { ...profileData, profileImageUrl: downloadURL };
        if (userRole === "staff") {
          sessionStorage.setItem('currentStaff', JSON.stringify(updatedData));
        } else {
          sessionStorage.setItem('currentRp', JSON.stringify(updatedData));
        }
        
        return downloadURL;
      } catch (error) {
        console.error('Upload error:', error);
        throw new Error('Failed to upload image. Please try again.');
      }
    },
    onSuccess: (downloadURL) => {
      toast({ 
        title: "Profile image updated", 
        description: "Your profile image has been uploaded successfully and saved to database."
      });
      setSelectedImage(null);
      setPreviewUrl(null);
      // Update the current profile image to show the new image
      setCurrentProfileImage(downloadURL);
    },
    onError: (error: any) => {
      toast({ 
        title: "Upload failed", 
        description: error.message || "Could not upload image. Please try again.",
        variant: "destructive" 
      });
    },
  });

  // Initialize form data when profile data is loaded
  useEffect(() => {
    if (profileData) {
      setFormData({
        firstName: profileData.firstName || "",
        surname: profileData.surname || "",
        middleName: profileData.middleName || "",
        email: profileData.email || "",
        phone: profileData.phone || "",
        department: profileData.department || "",
        position: profileData.position || "",
        specialization: profileData.specialization || "",
        bio: profileData.bio || "",
      });
      setCurrentProfileImage(profileData.profileImageUrl || null);
    }
  }, [profileData]);

  // Fetch latest profile data from database
  const fetchLatestProfile = async () => {
    try {
      const userCollection = userRole === "staff" ? "staff" : "resourcePersons";
      const userDocRef = doc(db, userCollection, profileData.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const latestData = userDoc.data();
        const updatedData = { ...profileData, ...latestData };
        
        // Update session storage with latest data
        if (userRole === "staff") {
          sessionStorage.setItem('currentStaff', JSON.stringify(updatedData));
        } else {
          sessionStorage.setItem('currentRp', JSON.stringify(updatedData));
        }
        
        // Update local state
        setFormData({
          firstName: latestData.firstName || "",
          surname: latestData.surname || "",
          middleName: latestData.middleName || "",
          email: latestData.email || "",
          phone: latestData.phone || "",
          department: latestData.department || "",
          position: latestData.position || "",
          specialization: latestData.specialization || "",
          bio: latestData.bio || "",
        });
        setCurrentProfileImage(latestData.profileImageUrl || null);
      }
    } catch (error) {
      console.error('Error fetching latest profile:', error);
    }
  };

  // Fetch latest data when component mounts
  useEffect(() => {
    if (profileData?.id) {
      fetchLatestProfile();
    }
  }, [profileData?.id]);

  // Cleanup function for profile images
  const cleanupProfileImage = async () => {
    if (currentProfileImage && currentProfileImage.startsWith('https://firebasestorage.googleapis.com')) {
      try {
        const imageRef = ref(storage, currentProfileImage);
        await deleteObject(imageRef);
        console.log('Profile image cleaned up successfully');
      } catch (error) {
        console.warn('Could not cleanup profile image:', error);
      }
    }
  };

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      // Note: This won't run on page refresh, only on component unmount
      // For complete cleanup, you might want to add a delete profile function
    };
  }, []);

  // Handle image selection
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ 
          title: "File too large", 
          description: "Please select an image smaller than 5MB.",
          variant: "destructive" 
        });
        return;
      }
      
      setSelectedImage(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  // Handle image upload
  const handleImageUpload = async () => {
    if (!selectedImage) return;
    
    setIsUploading(true);
    try {
      await uploadImageMutation.mutateAsync(selectedImage);
    } finally {
      setIsUploading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfileMutation.mutateAsync(formData);
  };

  // Handle form field changes
  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!profileData) {
    return (
      <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 p-6"}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8 text-red-600">
            No profile data available.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 p-6"}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Profile Management</h2>
          <Button
            variant="outline"
            onClick={fetchLatestProfile}
            className="flex items-center gap-2"
            title="Refresh profile data from database"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {/* Profile Image Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" /> Profile Image
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={previewUrl || currentProfileImage} />
                <AvatarFallback className="text-lg">
                  {profileData?.firstName?.[0]}{profileData?.surname?.[0]}
                </AvatarFallback>
              </Avatar>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="profile-image" className="text-sm font-medium">
                    Upload New Image
                  </Label>
                  <Input
                    id="profile-image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="mt-1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
                  </p>
                </div>
                
                {selectedImage && (
                  <div className="flex space-x-2">
                    <Button
                      onClick={handleImageUpload}
                      disabled={isUploading}
                      className="flex items-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          Upload Image
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedImage(null);
                        setPreviewUrl(null);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" /> Profile Information
              </CardTitle>
              <Button
                variant={isEditing ? "outline" : "default"}
                onClick={() => setIsEditing(!isEditing)}
                className="flex items-center gap-2"
              >
                {isEditing ? <X className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                {isEditing ? "Cancel" : "Edit Profile"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                  
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange("firstName", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="surname">Surname</Label>
                    <Input
                      id="surname"
                      value={formData.surname}
                      onChange={(e) => handleInputChange("surname", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="middleName">Middle Name (Optional)</Label>
                    <Input
                      id="middleName"
                      value={formData.middleName}
                      onChange={(e) => handleInputChange("middleName", e.target.value)}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      disabled={!isEditing}
                      required
                    />
                  </div>
                </div>
                
                {/* Role-specific Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">
                    {userRole === "staff" ? "Staff Information" : "Resource Person Information"}
                  </h3>
                  
                  {userRole === "staff" ? (
                    <>
                      <div>
                        <Label htmlFor="department">Department</Label>
                        <Input
                          id="department"
                          value={formData.department}
                          onChange={(e) => handleInputChange("department", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="position">Position</Label>
                        <Input
                          id="position"
                          value={formData.position}
                          onChange={(e) => handleInputChange("position", e.target.value)}
                          disabled={!isEditing}
                        />
                      </div>
                    </>
                  ) : (
                    <div>
                      <Label htmlFor="specialization">Specialization</Label>
                      <Input
                        id="specialization"
                        value={formData.specialization}
                        onChange={(e) => handleInputChange("specialization", e.target.value)}
                        disabled={!isEditing}
                      />
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="bio">Bio (Optional)</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleInputChange("bio", e.target.value)}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                </div>
              </div>
              
              {/* Status Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Account Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Verification Status</Label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profileData?.isVerified 
                          ? "bg-green-100 text-green-800" 
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {profileData?.isVerified ? "Verified" : "Pending Verification"}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium">Member Since</Label>
                    <div className="mt-1 text-sm text-gray-600">
                      {profileData?.createdAt?.toDate?.()?.toLocaleDateString() || "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Save Button */}
              {isEditing && (
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateProfileMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
