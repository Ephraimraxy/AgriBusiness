import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Users2, ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { registerResourcePerson, getGeneratedIds, updateDocument, getAllDocuments, ResourcePerson } from "@/lib/firebaseService";
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function ResourcePersonRegistrationPage() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<'id' | 'details'>('id');
  const [resourcePersonId, setResourcePersonId] = useState('');
  const [isValidId, setIsValidId] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    firstName: '',
    surname: '',
    middleName: '',
    email: '',
    phoneNumber: '',
    specialization: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isValidatingId, setIsValidatingId] = useState(false);
  const [idValidationError, setIdValidationError] = useState('');
  const [idValidationSuccess, setIdValidationSuccess] = useState(false);
  const [emailValidationError, setEmailValidationError] = useState('');
  const [phoneValidationError, setPhoneValidationError] = useState('');
  const [isValidatingEmail, setIsValidatingEmail] = useState(false);
  const [isValidatingPhone, setIsValidatingPhone] = useState(false);

  const validateResourcePersonId = (id: string) => {
    const resourcePersonIdPattern = /^RP-0C0S0S\d+$/;
    return resourcePersonIdPattern.test(id);
  };

  const validateEmail = async (email: string) => {
    if (!email) return { isValid: false, error: 'Email is required' };
    
    // Basic email format validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }

    setIsValidatingEmail(true);
    setEmailValidationError('');

    try {
      // Check in resource_person_registrations collection
      const rpRegistrations = await getAllDocuments<ResourcePerson>("resource_person_registrations");
      const existingInRpReg = rpRegistrations.find(rp => rp.email === email);
      
      if (existingInRpReg) {
        return { isValid: false, error: 'This email is already registered as a resource person' };
      }

      // Check in staff_registrations collection
      const staffRegistrations = await getAllDocuments<any>("staff_registrations");
      const existingInStaffReg = staffRegistrations.find(staff => staff.email === email);
      
      if (existingInStaffReg) {
        return { isValid: false, error: 'This email is already registered as a staff member' };
      }

      // Check in trainees collection
      const trainees = await getAllDocuments<any>("trainees");
      const existingInTrainees = trainees.find(trainee => trainee.email === email);
      
      if (existingInTrainees) {
        return { isValid: false, error: 'This email is already registered as a trainee' };
      }

      // Check in users collection
      const users = await getAllDocuments<any>("users");
      const existingInUsers = users.find(user => user.email === email);
      
      if (existingInUsers) {
        return { isValid: false, error: 'This email is already registered in the system' };
      }

      // Check in resource_persons collection (fallback)
      const resourcePersons = await getAllDocuments<ResourcePerson>("resource_persons");
      const existingInRp = resourcePersons.find(rp => rp.email === email);
      
      if (existingInRp) {
        return { isValid: false, error: 'This email is already registered as a resource person' };
      }

      // Check in staffs collection (fallback)
      const staffs = await getAllDocuments<any>("staffs");
      const existingInStaffs = staffs.find(staff => staff.email === email);
      
      if (existingInStaffs) {
        return { isValid: false, error: 'This email is already registered as a staff member' };
      }

      return { isValid: true, error: '' };
    } catch (error) {
      console.error('Error validating email:', error);
      return { isValid: false, error: 'Failed to validate email. Please try again.' };
    } finally {
      setIsValidatingEmail(false);
    }
  };

  const validatePhone = async (phone: string) => {
    if (!phone) return { isValid: false, error: 'Phone number is required' };
    
    // Basic phone format validation (allows various formats)
    const phonePattern = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phonePattern.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      return { isValid: false, error: 'Please enter a valid phone number' };
    }

    setIsValidatingPhone(true);
    setPhoneValidationError('');

    try {
      // Check in resource_person_registrations collection
      const rpRegistrations = await getAllDocuments<ResourcePerson>("resource_person_registrations");
      const existingInRpReg = rpRegistrations.find(rp => rp.phone === phone);
      
      if (existingInRpReg) {
        return { isValid: false, error: 'This phone number is already registered as a resource person' };
      }

      // Check in staff_registrations collection
      const staffRegistrations = await getAllDocuments<any>("staff_registrations");
      const existingInStaffReg = staffRegistrations.find(staff => staff.phone === phone);
      
      if (existingInStaffReg) {
        return { isValid: false, error: 'This phone number is already registered as a staff member' };
      }

      // Check in trainees collection
      const trainees = await getAllDocuments<any>("trainees");
      const existingInTrainees = trainees.find(trainee => trainee.phone === phone);
      
      if (existingInTrainees) {
        return { isValid: false, error: 'This phone number is already registered as a trainee' };
      }

      // Check in users collection
      const users = await getAllDocuments<any>("users");
      const existingInUsers = users.find(user => user.phone === phone);
      
      if (existingInUsers) {
        return { isValid: false, error: 'This phone number is already registered in the system' };
      }

      // Check in resource_persons collection (fallback)
      const resourcePersons = await getAllDocuments<ResourcePerson>("resource_persons");
      const existingInRp = resourcePersons.find(rp => rp.phone === phone);
      
      if (existingInRp) {
        return { isValid: false, error: 'This phone number is already registered as a resource person' };
      }

      // Check in staffs collection (fallback)
      const staffs = await getAllDocuments<any>("staffs");
      const existingInStaffs = staffs.find(staff => staff.phone === phone);
      
      if (existingInStaffs) {
        return { isValid: false, error: 'This phone number is already registered as a staff member' };
      }

      return { isValid: true, error: '' };
    } catch (error) {
      console.error('Error validating phone:', error);
      return { isValid: false, error: 'Failed to validate phone number. Please try again.' };
    } finally {
      setIsValidatingPhone(false);
    }
  };

  const handleIdChange = (value: string) => {
    setResourcePersonId(value);
    const isValid = validateResourcePersonId(value);
    setIsValidId(isValid);
    setIdValidationError('');
    setIdValidationSuccess(false);
    if (isValid) {
      setFormData(prev => ({ ...prev, id: value }));
    }
  };

  const handleNextStep = async () => {
    if (!isValidId) {
      setIdValidationError('Please enter a valid Resource Person ID format (RP-0C0S0S1, RP-0C0S0S2, etc.)');
      return;
    }

    setIsValidatingId(true);
    setIdValidationError('');
    setIdValidationSuccess(false);

    try {
      // Get all generated resource person IDs from the database
      const generatedIds = await getGeneratedIds('resource_person');
      console.log('Generated IDs from database:', generatedIds);
      
      // Find the specific ID in the generated IDs
      const foundId = generatedIds.find(idData => idData.id === resourcePersonId);
      
      if (!foundId) {
        setIdValidationError(`ID ${resourcePersonId} does not exist in the system. Please generate a new Resource Person ID first.`);
        return;
      }

      // Check if the ID is available for registration
      if (foundId.status !== 'available') {
        if (foundId.status === 'assigned') {
          setIdValidationError(`ID ${resourcePersonId} is already assigned to ${foundId.assignedTo || 'another person'}.`);
        } else if (foundId.status === 'activated') {
          setIdValidationError(`ID ${resourcePersonId} is already activated and cannot be used for registration.`);
        } else {
          setIdValidationError(`ID ${resourcePersonId} is not available for registration (status: ${foundId.status}).`);
        }
        return;
      }

      // ID is valid and available
      setIdValidationSuccess(true);
      setFormData(prev => ({ ...prev, id: resourcePersonId }));
      
      // Proceed to the next step after a short delay to show success message
      setTimeout(() => {
        setCurrentStep('details');
      }, 1000);

    } catch (error) {
      console.error('Error validating ID:', error);
      setIdValidationError('Failed to validate ID. Please check your connection and try again.');
    } finally {
      setIsValidatingId(false);
    }
  };

  const handleInputChange = async (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation errors when user starts typing
    if (field === 'email') {
      setEmailValidationError('');
    } else if (field === 'phoneNumber') {
      setPhoneValidationError('');
    }
    
    // Validate email and phone on change with debounce
    if (field === 'email' && value.length > 3) {
      // Small delay to avoid too many API calls
      setTimeout(async () => {
        const validation = await validateEmail(value);
        setEmailValidationError(validation.error);
      }, 500);
    } else if (field === 'phoneNumber' && value.length > 5) {
      // Small delay to avoid too many API calls
      setTimeout(async () => {
        const validation = await validatePhone(value);
        setPhoneValidationError(validation.error);
      }, 500);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Final validation before submission
      const emailValidation = await validateEmail(formData.email);
      const phoneValidation = await validatePhone(formData.phoneNumber);
      
      if (!emailValidation.isValid) {
        setSubmitError(emailValidation.error);
        return;
      }
      
      if (!phoneValidation.isValid) {
        setSubmitError(phoneValidation.error);
        return;
      }
      
      // Register the resource person
      await registerResourcePerson(formData);
      
      // Update the generated ID status to 'assigned'
      const generatedIds = await getGeneratedIds('resource_person');
      const foundId = generatedIds.find(idData => idData.id === formData.id);
      
      if (foundId) {
        // Update the generated ID status
        // We need to find the document by the generated ID value, not use it as the document ID
        const generatedIdsQuery = query(
          collection(db, 'generatedIds'),
          where('id', '==', formData.id),
          where('type', '==', 'resource_person')
        );
        const querySnapshot = await getDocs(generatedIdsQuery);
        
        if (!querySnapshot.empty) {
          const docRef = doc(db, 'generatedIds', querySnapshot.docs[0].id);
          await updateDoc(docRef, {
            status: 'assigned',
            assignedTo: formData.email,
            assignedAt: Timestamp.now()
          });
          console.log(`Updated generated ID ${formData.id} status to assigned`);
        }
      }
      
      setSubmitSuccess(true);
    } catch (error) {
      console.error('Error submitting resource person registration:', error);
      setSubmitError('Failed to submit registration. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentStep('id');
    setResourcePersonId('');
    setIsValidId(false);
    setFormData({
      id: '',
      firstName: '',
      surname: '',
      middleName: '',
      email: '',
      phoneNumber: '',
      specialization: ''
    });
    setSubmitSuccess(false);
    setSubmitError('');
    setIdValidationError('');
    setIdValidationSuccess(false);
    setIsValidatingId(false);
    setEmailValidationError('');
    setPhoneValidationError('');
    setIsValidatingEmail(false);
    setIsValidatingPhone(false);
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="text-green-600" size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Successful!</h2>
              <div className="text-gray-600 mb-4">
                Resource person with ID <Badge variant="secondary">{formData.id}</Badge> has been successfully registered.
              </div>
              <p className="text-sm text-green-600 mb-6">
                ✓ Registration data saved to resource_person_registrations collection<br/>
                ✓ ID status updated to "assigned" in generatedIds collection
              </p>
                            <div className="space-y-2">
                <Button onClick={resetForm} className="w-full">
                  Register Another Resource Person
                </Button>
                                 <Link href="/resource-person-dashboard">
                  <Button variant="outline" className="w-full">
                    Go to RP Dashboard
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="ghost" className="w-full">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Farm Cattle Background with High-Quality Image */}
      <div className="absolute inset-0">
        {/* High-Quality Farm Cattle Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1566385101042-1a0aa0c1268c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2832&q=80')`
          }}
        ></div>
        
        {/* Gradient Overlay for Better Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-brown-900/60 via-amber-800/50 to-yellow-700/60"></div>
        
        {/* Floating Cattle Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-brown-600/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-amber-500/30 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-yellow-600/25 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute top-60 left-1/3 w-20 h-20 bg-brown-500/20 rounded-full blur-lg animate-pulse delay-1500"></div>
        <div className="absolute top-80 right-1/4 w-36 h-36 bg-amber-600/15 rounded-full blur-2xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-yellow-500/25 rounded-full blur-lg animate-pulse delay-3000"></div>
        
        {/* Rain Animation for Farm Feel */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-brown-400/70 rounded-full animate-bounce"></div>
        <div className="absolute top-0 left-8 w-1.5 h-1.5 bg-amber-400/60 rounded-full animate-bounce delay-100"></div>
        <div className="absolute top-0 left-16 w-1 h-1 bg-brown-300/80 rounded-full animate-bounce delay-200"></div>
        <div className="absolute top-0 left-24 w-2 h-2 bg-amber-500/50 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-0 left-32 w-1.5 h-1.5 bg-brown-400/70 rounded-full animate-bounce delay-400"></div>
        <div className="absolute top-0 left-40 w-1 h-1 bg-amber-300/80 rounded-full animate-bounce delay-500"></div>
        <div className="absolute top-0 left-48 w-1.5 h-1.5 bg-brown-300/90 rounded-full animate-bounce delay-600"></div>
        <div className="absolute top-0 left-56 w-1 h-1 bg-amber-400/60 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-0 left-64 w-2 h-2 bg-brown-400/70 rounded-full animate-bounce delay-800"></div>
        <div className="absolute top-0 left-72 w-1.5 h-1.5 bg-amber-500/50 rounded-full animate-bounce delay-900"></div>
        <div className="absolute top-0 left-80 w-1 h-1 bg-brown-300/80 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-0 left-88 w-1.5 h-1.5 bg-amber-400/70 rounded-full animate-bounce delay-1100"></div>
        <div className="absolute top-0 left-96 w-1 h-1 bg-brown-400/60 rounded-full animate-bounce delay-1200"></div>
      </div>

      {/* Registration Form with Glassmorphism */}
      <div className="relative z-10 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Registration Form */}
          <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-2xl p-6">
            {/* Back Button */}
            <div className="mb-6">
              <button 
                onClick={() => setLocation("/")}
                className="inline-flex items-center text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Landing Page
              </button>
            </div>

            {/* Header */}
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Resource Person Registration</h1>
              <p className="text-gray-600">Join our agricultural training platform as a resource person</p>
            </div>
            {currentStep === 'id' ? (
              <div className="max-w-md mx-auto">
                <div className="text-center mb-6">
                  <div className="bg-amber-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Users2 className="h-6 w-6 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Step 1: Verify Resource Person ID</h2>
                  <p className="text-sm text-gray-600">Enter your assigned Resource Person ID to begin registration</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Resource Person ID
                    </label>
                    <Input
                      type="text"
                      value={resourcePersonId}
                      onChange={(e) => setResourcePersonId(e.target.value)}
                      placeholder="e.g., RP-0C0S0S01"
                      className="bg-white border-gray-300 text-gray-800 placeholder-gray-500"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Format: RP-0C0S0S01, RP-0C0S0S02, etc.
                    </p>
                  </div>

                  <Button
                    onClick={handleNextStep}
                    disabled={!resourcePersonId || isValidatingId}
                    className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold shadow-lg"
                    size="lg"
                  >
                    {isValidatingId ? "Validating..." : "Verify Resource Person ID"}
                  </Button>

                  {idValidationError && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center text-red-700">
                        <AlertCircle className="h-5 w-5 mr-2" />
                        <span>{idValidationError}</span>
                      </div>
                    </div>
                  )}

                  {idValidationSuccess && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center text-green-700">
                        <CheckCircle className="h-5 w-5 mr-2" />
                        <span>Resource Person ID verified successfully! You can now proceed to registration.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-6">
                  <div className="bg-amber-100 p-3 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                    <Users2 className="h-6 w-6 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">Step 2: Complete Registration</h2>
                  <p className="text-sm text-gray-600">Fill in your details to complete resource person registration</p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <Input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        required
                        className="bg-white border-gray-300 text-gray-800 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Surname *
                      </label>
                      <Input
                        type="text"
                        value={formData.surname}
                        onChange={(e) => setFormData({...formData, surname: e.target.value})}
                        required
                        className="bg-white border-gray-300 text-gray-800 placeholder-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Middle Name
                      </label>
                      <Input
                        type="text"
                        value={formData.middleName}
                        onChange={(e) => setFormData({...formData, middleName: e.target.value})}
                        className="bg-white/20 border-white/30 text-white placeholder-white/70 backdrop-blur-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder-white/70 backdrop-blur-sm"
                      />
                      {emailValidationError && (
                        <p className="text-xs text-red-300 mt-1">{emailValidationError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Phone Number *
                      </label>
                      <Input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder-white/70 backdrop-blur-sm"
                      />
                      {phoneValidationError && (
                        <p className="text-xs text-red-300 mt-1">{phoneValidationError}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Specialization *
                      </label>
                      <Input
                        type="text"
                        value={formData.specialization}
                        onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                        required
                        className="bg-white/20 border-white/30 text-white placeholder-white/70 backdrop-blur-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-4 pt-6">
                    <Button
                      type="button"
                      onClick={() => setCurrentStep('id')}
                      variant="outline"
                      className="flex-1 border-white/30 text-white hover:bg-white/20 backdrop-blur-sm bg-white/10"
                      size="lg"
                    >
                      Back to ID Verification
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold shadow-lg"
                      size="lg"
                    >
                      {isSubmitting ? "Submitting..." : "Complete Registration"}
                    </Button>
                  </div>
                </form>

                {submitSuccess && (
                  <div className="mt-6 p-6 bg-green-500/20 border border-green-500/30 rounded-lg backdrop-blur-sm text-center">
                    <CheckCircle className="h-12 w-12 text-green-300 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-green-300 mb-2">Registration Successful!</h3>
                    <p className="text-green-200 mb-4">
                      Welcome to the team! Your resource person account has been created successfully.
                    </p>
                    <Link to="/rp-login">
                      <Button className="bg-green-600 hover:bg-green-700 text-white">
                        Proceed to Login
                      </Button>
                    </Link>
                  </div>
                )}

                {submitError && (
                  <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
                    <div className="flex items-center text-red-300">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      <span>{submitError}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 