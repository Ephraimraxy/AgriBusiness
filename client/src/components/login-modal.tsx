
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LogIn, CheckCircle, XCircle, AlertCircle, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ForgotPasswordModal from "./forgot-password-modal";
import CSSFarmsLoader from "./ui/css-farms-loader";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Firebase error message mapping
const getFirebaseErrorMessage = (errorCode: string): { title: string; message: string; type: 'error' | 'warning' } => {
  switch (errorCode) {
    case 'auth/user-not-found':
      return {
        title: "User Not Found",
        message: "No account found with this email/phone. Please check your credentials or register first.",
        type: 'error'
      };
    case 'auth/wrong-password':
      return {
        title: "Invalid Password",
        message: "The password you entered is incorrect. Please try again.",
        type: 'error'
      };
    case 'auth/invalid-email':
      return {
        title: "Invalid Email",
        message: "Please enter a valid email address format.",
        type: 'error'
      };
    case 'auth/user-disabled':
      return {
        title: "Account Disabled",
        message: "This account has been disabled. Please contact support.",
        type: 'error'
      };
    case 'auth/too-many-requests':
      return {
        title: "Too Many Attempts",
        message: "Too many failed login attempts. Please try again later.",
        type: 'warning'
      };
    case 'auth/network-request-failed':
      return {
        title: "Network Error",
        message: "Network connection failed. Please check your internet connection.",
        type: 'error'
      };
    case 'auth/operation-not-allowed':
      return {
        title: "Login Not Allowed",
        message: "Email/password login is not enabled for this app.",
        type: 'error'
      };
    default:
      return {
        title: "Login Failed",
        message: "An unexpected error occurred. Please try again.",
        type: 'error'
      };
  }
};

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [, setLocation] = useLocation();
  const [rememberMe, setRememberMe] = useState(false);
  const { toast } = useToast();
  
  // Enhanced state for better user feedback
  const [loginStatus, setLoginStatus] = useState<'idle' | 'success' | 'error' | 'warning'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [statusTitle, setStatusTitle] = useState('');

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  // Reset form and status when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false);
      setLoginStatus('idle');
      setStatusMessage('');
      setStatusTitle('');
      form.reset();
    }
  }, [isOpen, form]);

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setLoginStatus('idle');
    setStatusMessage('');
    setStatusTitle('');
    
    try {
      const isEmail = data.identifier.includes("@");
      const emailForAuth = isEmail
        ? data.identifier
        : `${data.identifier.replace(/\D/g, "")}@phone.cssfarms.local`;
      
      await signInWithEmailAndPassword(auth, emailForAuth, data.password);
      
      // Success state
      setLoginStatus('success');
      setStatusTitle('Login Successful!');
      setStatusMessage('Welcome to CSS FARMS! Redirecting to dashboard...');
      
      // Show success toast
      toast({ 
        title: "Login successful!", 
        description: "Welcome to CSS FARMS!",
        variant: "default"
      });
      
      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
        // Navigate to dashboard
        setLocation("/trainee-dashboard");
      }, 2000);
      
    } catch (error: any) {
      // Parse Firebase error code
      const errorCode = error.code || 'unknown';
      const { title, message, type } = getFirebaseErrorMessage(errorCode);
      
      // Set error state
      setLoginStatus(type === 'warning' ? 'warning' : 'error');
      setStatusTitle(title);
      setStatusMessage(message);
      
      // Show error toast
      toast({ 
        title: title, 
        description: message, 
        variant: "destructive" 
      });
      
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
      <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} ${config.textColor}`}>
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Login to CSS FARMS
          </DialogTitle>
        </DialogHeader>

        {/* Status Message Display */}
        {renderStatusMessage()}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email or Phone</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="john@example.com or 08012345678" 
                      {...field}
                      disabled={loginStatus === 'success'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="********" 
                      {...field}
                      disabled={loginStatus === 'success'}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="remember" 
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  disabled={loginStatus === 'success'}
                />
                <Label htmlFor="remember" className="text-sm text-gray-600">
                  Remember me
                </Label>
              </div>
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-green-600 hover:text-green-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loginStatus === 'success'}
              >
                Forgot password?
              </button>
            </div>
            
            <Button 
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              disabled={isLoading || loginStatus === 'success'}
            >
              {isLoading ? (
                <>
                  <CSSFarmsLoader size="sm" className="mr-2" />
                  Logging in...
                </>
              ) : loginStatus === 'success' ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Login Successful!
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Login with CSS FARMS
                </>
              )}
            </Button>
            
            <div className="text-center text-sm text-gray-600">
              <p>This system uses secure authentication</p>
            </div>
          </form>
        </Form>

        {/* Forgot Password Modal */}
        <ForgotPasswordModal 
          isOpen={showForgotPassword} 
          onClose={() => setShowForgotPassword(false)} 
        />
      </DialogContent>
    </Dialog>
  );
}
