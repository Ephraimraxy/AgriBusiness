import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { ArrowLeft, Mail, Phone, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { sendVerificationCode, verifyCode, loginWithVerification } from "@/lib/firebaseAuth";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
  identifier: z.string().min(1, "Email or phone number is required"),
  method: z.enum(["email", "phone"], { required_error: "Please select a verification method" }),
  verificationCode: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function VerificationLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"identifier" | "verification">("identifier");
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      method: undefined,
      verificationCode: "",
    },
  });

  const onSendCode = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const result = await sendVerificationCode(data.identifier, data.method);
      
      if (result.success) {
        setSentTo(data.identifier);
        setStep("verification");
        toast({
          title: "Code Sent",
          description: result.message,
        });
        
        // Show demo code in development
        if (result.code) {
          toast({
            title: "Demo Code",
            description: `Your verification code: ${result.code}`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Error",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onVerifyAndLogin = async (data: LoginFormData) => {
    if (!data.verificationCode) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const verificationResult = verifyCode(data.identifier, data.verificationCode);
      
      if (!verificationResult.success) {
        toast({
          title: "Verification Failed",
          description: verificationResult.message,
          variant: "destructive",
        });
        return;
      }

      // For demo purposes, we'll simulate a successful login
      // In a real app, you'd check if user exists and either login or redirect to registration
      toast({
        title: "Login Successful",
        description: "You have been logged in successfully!",
      });
      
      // Redirect to dashboard
      setLocation("/original/dashboard");
      
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An error occurred during login",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (data: LoginFormData) => {
    if (step === "identifier") {
      onSendCode(data);
    } else {
      onVerifyAndLogin(data);
    }
  };

  const goBack = () => {
    if (step === "verification") {
      setStep("identifier");
      form.setValue("verificationCode", "");
    } else {
      setLocation("/original/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-blue-100">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="mt-4 text-2xl font-bold text-gray-900">
              {step === "identifier" ? "Login with Verification" : "Enter Verification Code"}
            </CardTitle>
            <CardDescription>
              {step === "identifier" 
                ? "Choose how you'd like to receive your verification code"
                : `We sent a verification code to ${sentTo}`
              }
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                
                {step === "identifier" ? (
                  <>
                    <FormField
                      control={form.control}
                      name="identifier"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email or Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              {...field} 
                              placeholder="Enter your email or phone number"
                              autoComplete="username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="method"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Method</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-3"
                            >
                              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                                <RadioGroupItem value="email" id="email" />
                                <Mail className="w-4 h-4 text-gray-500" />
                                <Label htmlFor="email" className="flex-1 cursor-pointer">
                                  Send code via Email
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-3 border rounded-lg">
                                <RadioGroupItem value="phone" id="phone" />
                                <Phone className="w-4 h-4 text-gray-500" />
                                <Label htmlFor="phone" className="flex-1 cursor-pointer">
                                  Send code via SMS
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                ) : (
                  <FormField
                    control={form.control}
                    name="verificationCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Verification Code</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Enter 6-digit code"
                            maxLength={6}
                            autoComplete="one-time-code"
                            className="text-center text-lg tracking-widest"
                          />
                        </FormControl>
                        <FormMessage />
                        <p className="text-sm text-gray-500 mt-2">
                          Didn't receive the code?{" "}
                          <button
                            type="button"
                            onClick={() => {
                              const data = form.getValues();
                              onSendCode(data);
                            }}
                            className="text-blue-600 hover:text-blue-700 font-medium"
                          >
                            Resend
                          </button>
                        </p>
                      </FormItem>
                    )}
                  />
                )}

                <div className="flex flex-col space-y-3">
                  <Button 
                    type="submit" 
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : step === "identifier" ? "Send Code" : "Verify & Login"}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline"
                    className="w-full"
                    onClick={goBack}
                  >
                    <ArrowLeft className="mr-2" size={16} />
                    {step === "identifier" ? "Back to Login Options" : "Change Email/Phone"}
                  </Button>
                </div>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Prefer using a password?{" "}
                <Link href="/original/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in with password
                </Link>
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Don't have an account?{" "}
                <Link href="/original/trainee-registration" className="text-blue-600 hover:text-blue-700 font-medium">
                  Register here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}