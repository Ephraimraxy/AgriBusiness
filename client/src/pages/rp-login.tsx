import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getAllDocuments, ResourcePerson } from "@/lib/firebaseService";
import { Link } from "wouter";
import { UserCheck, ArrowLeft, AlertCircle } from "lucide-react";
import CSSFarmsLoader from "@/components/ui/css-farms-loader";

const rpLoginSchema = z.object({
  rpId: z.string().min(1, "Resource Person ID is required"),
});

type RpLoginFormData = z.infer<typeof rpLoginSchema>;

export default function RpLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<RpLoginFormData>({
    resolver: zodResolver(rpLoginSchema),
    defaultValues: {
      rpId: "",
    },
  });

  const onSubmit = async (data: RpLoginFormData) => {
    setIsLoading(true);
    try {
      // Check if the Resource Person ID exists in the database
      const rpRegistrations = await getAllDocuments<ResourcePerson>("resource_person_registrations");
      const foundRp = rpRegistrations.find(rp => rp.id === data.rpId);

      if (!foundRp) {
        toast({
          title: "Login Failed",
          description: "Resource Person ID not found. Please check your ID or register first.",
          variant: "destructive",
        });
        return;
      }

      // Store RP info in session storage for dashboard access
      sessionStorage.setItem('currentRp', JSON.stringify(foundRp));
      sessionStorage.setItem('userRole', 'resource_person');

      toast({
        title: "Login Successful",
        description: `Welcome back, ${foundRp.firstName} ${foundRp.surname}!`,
      });

      // Redirect to resource person dashboard
              setLocation("/resource-person-dashboard");
    } catch (error: any) {
      console.error('RP login error:', error);
      toast({
        title: "Login Failed",
        description: "An error occurred during login. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Farm Machinery Background with High-Quality Image */}
      <div className="absolute inset-0">
        {/* High-Quality Farm Machinery Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2832&q=80')`
          }}
        ></div>
        
        {/* Gradient Overlay for Better Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/60 via-indigo-800/50 to-purple-700/60"></div>
        
        {/* Floating Machinery Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-600/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-indigo-500/30 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-purple-600/25 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute top-60 left-1/3 w-20 h-20 bg-blue-500/20 rounded-full blur-lg animate-pulse delay-1500"></div>
        <div className="absolute top-80 right-1/4 w-36 h-36 bg-indigo-600/15 rounded-full blur-2xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-purple-500/25 rounded-full blur-lg animate-pulse delay-3000"></div>
        
        {/* Rain Animation for Industrial Feel */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-blue-400/70 rounded-full animate-bounce"></div>
        <div className="absolute top-0 left-8 w-1.5 h-1.5 bg-indigo-400/60 rounded-full animate-bounce delay-100"></div>
        <div className="absolute top-0 left-16 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-200"></div>
        <div className="absolute top-0 left-24 w-2 h-2 bg-indigo-500/50 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-0 left-32 w-1.5 h-1.5 bg-blue-400/70 rounded-full animate-bounce delay-400"></div>
        <div className="absolute top-0 left-40 w-1 h-1 bg-indigo-300/80 rounded-full animate-bounce delay-500"></div>
        <div className="absolute top-0 left-48 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-600"></div>
        <div className="absolute top-0 left-56 w-1 h-1 bg-indigo-400/60 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-0 left-64 w-2 h-2 bg-blue-400/70 rounded-full animate-bounce delay-800"></div>
        <div className="absolute top-0 left-72 w-1.5 h-1.5 bg-indigo-500/50 rounded-full animate-bounce delay-900"></div>
        <div className="absolute top-0 left-80 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-0 left-88 w-1.5 h-1.5 bg-indigo-400/70 rounded-full animate-bounce delay-1100"></div>
        <div className="absolute top-0 left-96 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-1200"></div>
      </div>

      {/* Login Form with Glassmorphism */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
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

            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <div className="bg-amber-100 p-3 rounded-full">
                  <UserCheck className="h-10 w-10 text-amber-600" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Resource Person Login</h2>
              <p className="mt-2 text-gray-600">
                Enter your Resource Person ID to access your dashboard
              </p>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="rpId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700">Resource Person ID</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter your RP ID (e.g., RP-0C0S0S1)" 
                          {...field}
                          className="bg-white border-gray-300 text-gray-800 placeholder-gray-500"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold shadow-lg"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <CSSFarmsLoader size="md" className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </Form>


          </div>
        </div>
      </div>
    </div>
  );
} 