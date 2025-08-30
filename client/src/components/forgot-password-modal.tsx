import { useState } from "react";
import { sendPasswordResetEmail, signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber, updatePassword, signOut, ConfirmationResult } from "firebase/auth";
import { queryDocuments, type Trainee, type BaseUser, type Staff, type ResourcePerson } from "@/lib/firebaseService";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Mail, CheckCircle, AlertCircle } from "lucide-react";
import CSSFarmsLoader from "./ui/css-farms-loader";
import { useToast } from "@/hooks/use-toast";

const emailSchema = z.object({
  method: z.literal("email"),
  email: z.string().email("Please enter a valid email address"),
});

const phoneSchema = z.object({
  method: z.literal("phone"),
  phone: z.string().regex(/^(\+234|0)[789][01]\d{8}$/, "Please enter a valid Nigerian phone number"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.discriminatedUnion("method", [emailSchema, phoneSchema]).superRefine((data, ctx) => {
  if (data.method === "phone") {
    const d = data as z.infer<typeof phoneSchema>;
    if (d.newPassword !== d.confirmPassword) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["confirmPassword"], message: "Passwords don't match" });
    }
  }
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [phoneStage, setPhoneStage] = useState<"enter" | "otp" | "reset">("enter");
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [otp, setOtp] = useState("");
  const [processSteps, setProcessSteps] = useState<Array<{ id: string; label: string; state: "idle" | "running" | "success" | "error"; detail?: string }>>([]);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      method: "email",
      email: "",
      phone: "",
      newPassword: "",
      confirmPassword: "",
    } as any,
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      if (data.method === "email") {
        // Live steps: check email exists, send email
        setProcessSteps([
          { id: "check-email", label: "Check email exists", state: "running" },
          { id: "send-email", label: "Send reset email", state: "idle" },
        ]);

        // Use API instead of Firebase Auth
        try {
          const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to send password reset email");
          }
          
          const result = await response.json();
          setProcessSteps(prev => prev.map(s => s.id === "check-email" ? { ...s, state: "success" } : s));
          setProcessSteps(prev => prev.map(s => s.id === "send-email" ? { ...s, state: "success" } : s));
          
          setIsSuccess(true);
          toast({
            title: "Password reset code sent!",
            description: `Check your email for the verification code. ${result.devCode ? `Dev code: ${result.devCode}` : ''}`,
          });
        } catch (apiError: any) {
          throw new Error(apiError.message || "Failed to send password reset email");
        }
      } else {
        // For phone, only handle final reset via submit
        if (phoneStage !== "reset") {
          setIsLoading(false);
          return;
        }
        setProcessSteps(prev => prev.map(s => s.id === "update-password" ? { ...s, state: "running" } : s));
        await updatePassword(auth.currentUser!, (data as any).newPassword);
        setProcessSteps(prev => prev.map(s => s.id === "update-password" ? { ...s, state: "success" } : s));
        await signOut(auth).catch(() => {});
        toast({ title: "Password updated", description: "You can now log in with your phone and new password." });
        onClose();
      }
    } catch (error: any) {
      console.error("Password reset error details:", {
        code: error.code,
        message: error.message,
        fullError: error
      });
      
      // Provide more specific error messages
      let userMessage = "Failed to send password reset email. Please try again.";
      
      if (error.code === 'auth/user-not-found') {
        userMessage = "No account found with this email address. Please register first or use a different email.";
      } else if (error.code === 'auth/invalid-email') {
        userMessage = "Please enter a valid email address.";
      } else if (error.code === 'auth/too-many-requests') {
        userMessage = "Too many attempts. Please try again later.";
      } else if (error.code === 'auth/network-request-failed') {
        userMessage = "Network error. Please check your connection and try again.";
      }
      
      toast({
        title: "Password reset failed",
        description: userMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSuccess(false);
    setPhoneStage("enter");
    setConfirmation(null);
    setOtp("");
    setProcessSteps([]);
    form.reset();
    onClose();
  };

  const normalizePhone = (input: string) => {
    const digits = input.replace(/\D/g, "");
    if (digits.startsWith("234")) return "+" + digits;
    if (digits.startsWith("0")) return "+234" + digits.slice(1);
    return "+" + digits;
  };

  const handleSendOtp = async () => {
    try {
      setIsLoading(true);
      setProcessSteps([
        { id: "normalize", label: "Normalize phone", state: "running" as const },
        { id: "check-exists", label: "Check phone exists", state: "idle" as const },
        { id: "recaptcha", label: "Initialize reCAPTCHA", state: "idle" as const },
        { id: "send-otp", label: "Send OTP", state: "idle" as const },
      ]);
      const phoneRaw = (form.getValues() as any).phone as string;
      const normalized = normalizePhone(phoneRaw);
      setProcessSteps(prev => prev.map(s => s.id === "normalize" ? { ...s, state: "success" as const, detail: normalized } : s));
      // Verify phone exists in any user collection (trainees, users, staff, resource_persons)
      setProcessSteps(prev => prev.map(s => s.id === "check-exists" ? { ...s, state: "running" } : s));
      const traineeMatches = await queryDocuments<Trainee>("trainees", "phone", "==", normalized);
      const traineeAlt = phoneRaw.startsWith("0") ? await queryDocuments<Trainee>("trainees", "phone", "==", phoneRaw) : [];

      const userMatches = await queryDocuments<BaseUser>("users", "phone", "==", normalized);
      const userAlt = phoneRaw.startsWith("0") ? await queryDocuments<BaseUser>("users", "phone", "==", phoneRaw) : [];

      const staffMatches = await queryDocuments<Staff>("staff", "phone", "==", normalized);
      const staffAlt = phoneRaw.startsWith("0") ? await queryDocuments<Staff>("staff", "phone", "==", phoneRaw) : [];

      const rpMatches = await queryDocuments<ResourcePerson>("resource_persons", "phone", "==", normalized);
      const rpAlt = phoneRaw.startsWith("0") ? await queryDocuments<ResourcePerson>("resource_persons", "phone", "==", phoneRaw) : [];

      const exists = [
        ...traineeMatches, ...traineeAlt,
        ...userMatches, ...userAlt,
        ...staffMatches, ...staffAlt,
        ...rpMatches, ...rpAlt,
      ].length > 0;

      if (!exists) {
        setProcessSteps(prev => prev.map(s => s.id === "check-exists" ? { ...s, state: "error", detail: "Not found" } : s));
        toast({ title: "Phone not found", description: "No account is associated with this phone number.", variant: "destructive" });
        setIsLoading(false);
        return;
      }
      setProcessSteps(prev => prev.map(s => s.id === "check-exists" ? { ...s, state: "success" } : s));
      // Send OTP
      const recaptchaId = "recaptcha-container-forgot";
      setProcessSteps(prev => prev.map(s => s.id === "recaptcha" ? { ...s, state: "running" } : s));
      let verifierEl = document.getElementById(recaptchaId);
      if (!verifierEl) {
        verifierEl = document.createElement("div");
        verifierEl.id = recaptchaId;
        verifierEl.style.display = "none";
        document.body.appendChild(verifierEl);
      }
      const appVerifier = new RecaptchaVerifier(auth, recaptchaId, { size: "invisible" });
      setProcessSteps(prev => prev.map(s => s.id === "recaptcha" ? { ...s, state: "success" } : s));
      setProcessSteps(prev => prev.map(s => s.id === "send-otp" ? { ...s, state: "running" } : s));
      const conf = await signInWithPhoneNumber(auth, normalized, appVerifier);
      setConfirmation(conf);
      setPhoneStage("otp");
      setProcessSteps(prev => prev.map(s => s.id === "send-otp" ? { ...s, state: "success" } : s));
      toast({ title: "OTP sent", description: "We sent a verification code to your phone." });
    } catch (err: any) {
      setProcessSteps(prev => prev.map(s => s.id === "send-otp" ? { ...s, state: "error", detail: err?.message } : s));
      toast({ title: "Failed to send OTP", description: err?.message || "Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      setIsLoading(true);
      setProcessSteps((prev: Array<{ id: string; label: string; state: "idle" | "running" | "success" | "error"; detail?: string }>) => {
        const hasStep = prev.find(s => s.id === "verify-otp");
        if (hasStep) return prev.map(s => s.id === "verify-otp" ? { ...s, state: "running" as const } : s);
        return [...prev, { id: "verify-otp", label: "Verify OTP", state: "running" as const }];
      });
      if (!confirmation) throw new Error("No OTP session found");
      if (!otp) throw new Error("Enter the verification code");
      await confirmation.confirm(otp);
      setPhoneStage("reset");
      setProcessSteps((prev: Array<{ id: string; label: string; state: "idle" | "running" | "success" | "error"; detail?: string }>) => [
        ...prev.map(s => s.id === "verify-otp" ? { ...s, state: "success" as const } : s),
        { id: "update-password", label: "Update password", state: "idle" as const }
      ]);
      toast({ title: "Verified", description: "Phone number verified. Set your new password." });
    } catch (err: any) {
      setProcessSteps(prev => prev.map(s => s.id === "verify-otp" ? { ...s, state: "error", detail: err?.message } : s));
      toast({ title: "Invalid code", description: err?.message || "Verification failed.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      const collections = [
        queryDocuments<BaseUser>("users", "email", "==", email),
        queryDocuments<Trainee>("trainees", "email", "==", email),
        queryDocuments<Staff>("staff", "email", "==", email),
        queryDocuments<ResourcePerson>("resource_persons", "email", "==", email),
      ];
      const results = await Promise.all(collections);
      return results.some(arr => (arr as any[]).length > 0);
    } catch {
      return false;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-600" />
            Reset Your Password
          </DialogTitle>
        </DialogHeader>

        {!isSuccess ? (
          <div className="space-y-4">
            <div className="text-center text-sm text-gray-600 mb-4">
              <p>Select recovery method and follow the steps.</p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Recovery Method</FormLabel>
                      <FormControl>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="email"
                              checked={field.value === "email"}
                              onChange={() => field.onChange("email")}
                            />
                            <span>Email</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="phone"
                              checked={field.value === "phone"}
                              onChange={() => field.onChange("phone")}
                            />
                            <span>Phone</span>
                          </label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("method") === "email" && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="john@example.com" 
                            {...field} 
                            type="email"
                            autoComplete="email"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch("method") === "phone" && (
                  <>
                    {phoneStage === "enter" && (
                      <>
                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="+2348012345678" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <Button type="button" className="w-full" onClick={handleSendOtp} disabled={isLoading}>
                          Send OTP
                        </Button>
                      </>
                    )}
                    {phoneStage === "otp" && (
                      <>
                        <div>
                          <Label>Enter OTP</Label>
                          <Input value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit code" />
                        </div>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setPhoneStage("enter")} disabled={isLoading}>Back</Button>
                          <Button type="button" onClick={handleVerifyOtp} disabled={isLoading}>Verify Code</Button>
                        </div>
                      </>
                    )}
                    {phoneStage === "reset" && (
                      <>
                        <FormField
                          control={form.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="********" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="********" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </>
                )}

                {processSteps.length > 0 && (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="text-xs font-medium text-gray-600">Process</div>
                    <ul className="space-y-1 text-sm">
                      {processSteps.map(step => (
                        <li key={step.id} className="flex items-center gap-2">
                          {step.state === "running" && <CSSFarmsLoader size="sm" className="text-blue-600" />}
                          {step.state === "success" && <CheckCircle className="h-4 w-4 text-green-600" />}
                          {step.state === "error" && <AlertCircle className="h-4 w-4 text-red-600" />}
                          {step.state === "idle" && <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />}
                          <span>{step.label}</span>
                          {step.detail && <span className="text-xs text-gray-500">({step.detail})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {form.watch("method") === "email" && (
                  <Button 
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <CSSFarmsLoader size="sm" className="mr-2" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Reset Link
                      </>
                    )}
                  </Button>
                )}
                {form.watch("method") === "phone" && phoneStage === "reset" && (
                  <Button 
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <CSSFarmsLoader size="sm" className="mr-2" />
                        Updating...
                      </>
                    ) : (
                      <>Set New Password</>
                    )}
                  </Button>
                )}
              </form>
            </Form>

            <div className="text-center">
              <Button
                variant="ghost"
                onClick={handleClose}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Back to Login
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900">Check Your Email</h3>
              <p className="text-sm text-gray-600">
                We've sent a password reset verification code to <span className="font-medium text-blue-600">{form.getValues("email")}</span>
              </p>
            </div>

            <div className="space-y-3 text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
              <p className="font-medium text-blue-800">📧 Email Delivery Status:</p>
              <p>✅ <strong>Verification code sent successfully</strong></p>
              <p>⏳ <strong>Delivery time:</strong> Usually 1-5 minutes</p>
              <p>📁 <strong>Check these folders:</strong></p>
              <ul className="list-disc list-inside ml-4 text-left">
                <li>Inbox (primary folder)</li>
                <li>Spam/Junk folder</li>
                <li>Promotions tab (Gmail)</li>
                <li>Updates tab (Gmail)</li>
              </ul>
            </div>

            <div className="space-y-3 text-sm text-gray-600">
              <p>• Enter the 6-digit verification code from your email</p>
              <p>• The code will expire in 15 minutes</p>
              <p>• If you don't see it in 10 minutes, check spam folder</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setIsSuccess(false);
                  form.reset();
                }}
                variant="outline"
                className="flex-1"
              >
                Try Another Email
              </Button>
              <Button
                onClick={handleClose}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                Got it, thanks!
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
      <div id="recaptcha-container-forgot" style={{ display: "none" }} />
    </Dialog>
  );
}
