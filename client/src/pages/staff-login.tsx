import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getAllDocuments, Staff } from "@/lib/firebaseService";
import { Link } from "wouter";
import { UserCheck, ArrowLeft, CheckCircle, XCircle, AlertCircle, Shield } from "lucide-react";
import CSSFarmsLoader from "@/components/ui/css-farms-loader";

const staffLoginSchema = z.object({
  staffId: z.string().min(1, "Staff ID is required"),
});

type StaffLoginFormData = z.infer<typeof staffLoginSchema>;

export default function StaffLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Enhanced state for better user feedback
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTitle, setStatusTitle] = useState('');

  const form = useForm<StaffLoginFormData>({
    resolver: zodResolver(staffLoginSchema),
    defaultValues: {
      staffId: "",
    },
  });

  const onSubmit = async (data: StaffLoginFormData) => {
    setIsLoading(true);
    setLoginStatus('idle');
    setStatusMessage('');
    setStatusTitle('');
    
    try {
      // Check if the Staff ID exists in the database
      const staffRegistrations = await getAllDocuments<Staff>("staff_registrations");
      const foundStaff = staffRegistrations.find(staff => staff.id === data.staffId);

      if (!foundStaff) {
        // Set error state
        setLoginStatus('error');
        setStatusTitle('Staff ID Not Found');
        setStatusMessage('No staff account found with this ID. Please check your ID or register first.');
        
        toast({
          title: "Login Failed",
          description: "Staff ID not found. Please check your ID or register first.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Store staff info in session storage for dashboard access
      sessionStorage.setItem('currentStaff', JSON.stringify(foundStaff));
      sessionStorage.setItem('userRole', 'staff');

      // Success state
      setLoginStatus('success');
      setStatusTitle('Login Successful!');
      setStatusMessage(`Welcome back, ${foundStaff.firstName} ${foundStaff.surname}! Redirecting to dashboard...`);

      toast({
        title: "Login Successful",
        description: `Welcome back, ${foundStaff.firstName} ${foundStaff.surname}!`,
      });

      // Redirect to staff dashboard after showing success message
      setTimeout(() => {
        setLocation("/staff-dashboard");
      }, 2000);
      
    } catch (error: any) {
      console.error('Staff login error:', error);
      
      // Set error state
      setLoginStatus('error');
      setStatusTitle('Login Error');
      setStatusMessage('An error occurred during login. Please try again.');
      
      toast({
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render status message with appropriate icon and styling
  const renderStatusMessage = () => {
    if (loginStatus === 'idle') return null;
    
    const statusConfig = {
      success: {
        icon: <CheckCircle className="h-5 w-5 text-green-500" />,
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
        textColor: "text-green-800"
      },
      error: {
        icon: <XCircle className="h-5 w-5 text-red-500" />,
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        textColor: "text-red-800"
      },
      warning: {
        icon: <AlertCircle className="h-5 w-5 text-yellow-500" />,
        bgColor: "bg-yellow-50",
        borderColor: "border-yellow-200",
        textColor: "text-yellow-800"
      }
    };
    
    const config = statusConfig[loginStatus];
    
    return (
      <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor} mb-6`}>
        <div className="flex items-center gap-3">
          {config.icon}
          <div>
            <h4 className="font-medium">{statusTitle}</h4>
            <p className="text-sm opacity-90">{statusMessage}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with CSS FARMS branding */}
      <div className="absolute inset-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2832&q=80')`
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-blue-800/50 to-indigo-700/60"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-6">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 text-white hover:text-blue-200 transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-lg font-semibold">Back to Home</span>
          </Link>
          
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-8 w-auto" />
            </div>
            <span className="text-white font-semibold">CSS FARMS</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex items-center justify-center min-h-screen px-6 py-12">
        <div className="w-full max-w-md">
          {/* Status Message Display */}
          {renderStatusMessage()}
          
          {/* Login Card */}
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8">
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Login</h1>
              <p className="text-gray-600">Access your staff dashboard</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Staff ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your Staff ID" 
                          {...field}
                          disabled={loginStatus === 'success'}
                          className="h-12 text-lg"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit"
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold disabled:opacity-50"
                  disabled={isLoading || loginStatus === 'success'}
                >
                  {isLoading ? (
                    <>
                      <CSSFarmsLoader size="md" className="mr-2" />
                      Signing In...
                    </>
                  ) : loginStatus === 'success' ? (
                    <>
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Login Successful!
                    </>
                  ) : (
                    <>
                      <UserCheck className="mr-2 h-5 w-5" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Need help? Contact your administrator
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 