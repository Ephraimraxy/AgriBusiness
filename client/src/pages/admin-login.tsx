import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff, Shield, Lock, User, RefreshCw, AlertCircle } from "lucide-react";
import CSSFarmsLoader from "@/components/ui/css-farms-loader";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [autoLoginTriggered, setAutoLoginTriggered] = useState(false);

  // Auto-fill credentials if accessed via custom admin URL
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath === '/hoseaephraim-Princesali@1') {
      setEmail('hoseaephraim50@gmail.com');
      setPassword('Princesali@1');
      setAutoLoginTriggered(true);
      console.log('Auto-filled admin credentials from custom URL');
    }
  }, []);

  // Auto-login after credentials are set
  useEffect(() => {
    if (autoLoginTriggered && email && password) {
      console.log('Auto-login triggered, submitting form...');
      setAutoLoginTriggered(false); // Prevent infinite loop
      // Small delay to ensure state is updated
      setTimeout(() => {
        const form = document.querySelector('form');
        if (form) {
          form.dispatchEvent(new Event('submit', { bubbles: true }));
        }
      }, 100);
    }
  }, [autoLoginTriggered, email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(""); // Clear previous errors
    setIsLoading(true);
    
    try {
      // Basic validation
      if (!email || !password) {
        setSubmitError("Please enter both email and password");
        setIsLoading(false);
        return;
      }

      console.log("Login attempt with:", { email, password });

      // Call the server admin login API
      console.log("Making request to /api/admin/login...");
      
      // First, test if server is reachable
      try {
        const testResponse = await fetch('/api/admin/me', { method: 'GET' });
        console.log("Server test response:", testResponse.status);
      } catch (testError) {
        console.log("Server test failed:", testError);
      }
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, password }),
          credentials: 'include', // Important: include cookies
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        console.log("Response status:", response.status);
        console.log("Response headers:", response.headers);
        
        if (!response.ok) {
          console.log("Response not OK, trying to get error data...");
          let errorData;
          try {
            errorData = await response.json();
            console.log("Error data:", errorData);
          } catch (parseError) {
            console.log("Could not parse error response:", parseError);
            errorData = { message: 'Unknown error occurred' };
          }
          throw new Error(errorData.message || 'Login failed');
        }

        const data = await response.json();
        console.log("Login successful:", data);
        
        // Store admin info in localStorage for client-side reference
        localStorage.setItem('adminAuthenticated', 'true');
        localStorage.setItem('adminEmail', email);
        localStorage.setItem('adminUser', JSON.stringify(data.user));
        
        console.log("Authentication successful, navigating to admin-dashboard...");
        
        // Navigate to admin dashboard
        navigate("/admin-dashboard");
        
        console.log("Navigation called");
        
      } catch (fetchError: unknown) {
        console.error("Fetch error:", fetchError);
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error('Request timed out. Please check your connection and try again.');
          }
          if (fetchError.message.includes('fetch')) {
            throw new Error('Network error: Unable to connect to server. Please check your connection and try again.');
          }
        }
        throw fetchError;
      }

    } catch (error) {
      console.error("Login error:", error);
      setSubmitError(error instanceof Error ? error.message : "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Agricultural Background with High-Quality Crop Image */}
      <div className="absolute inset-0">
        {/* High-Quality Agricultural Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2832&q=80')`
          }}
        ></div>
        
        {/* Gradient Overlay for Better Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/60 via-green-800/50 to-teal-700/60"></div>
        
        {/* Floating Plant Elements */}
        <div className="absolute top-20 left-10 w-32 h-32 bg-green-600/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-24 h-24 bg-emerald-500/30 rounded-full blur-lg animate-pulse delay-1000"></div>
        <div className="absolute bottom-40 left-20 w-28 h-28 bg-teal-600/25 rounded-full blur-xl animate-pulse delay-500"></div>
        <div className="absolute top-60 left-1/3 w-20 h-20 bg-green-500/20 rounded-full blur-lg animate-pulse delay-1500"></div>
        <div className="absolute top-80 right-1/4 w-36 h-36 bg-green-600/15 rounded-full blur-2xl animate-pulse delay-2000"></div>
        <div className="absolute bottom-20 right-1/3 w-24 h-24 bg-teal-500/25 rounded-full blur-lg animate-pulse delay-3000"></div>
        
        {/* Intensive Live Rain Animation - Many Drops */}
        {/* Row 1 - Top */}
        <div className="absolute top-0 left-0 w-1 h-1 bg-blue-400/70 rounded-full animate-bounce"></div>
        <div className="absolute top-0 left-4 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce delay-100"></div>
        <div className="absolute top-0 left-8 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-200"></div>
        <div className="absolute top-0 left-12 w-2 h-2 bg-cyan-500/50 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-0 left-16 w-1.5 h-1.5 bg-blue-400/70 rounded-full animate-bounce delay-400"></div>
        <div className="absolute top-0 left-20 w-1 h-1 bg-cyan-300/80 rounded-full animate-bounce delay-500"></div>
        <div className="absolute top-0 left-24 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-600"></div>
        <div className="absolute top-0 left-28 w-1 h-1 bg-cyan-400/60 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-0 left-32 w-2 h-2 bg-blue-400/70 rounded-full animate-bounce delay-800"></div>
        <div className="absolute top-0 left-36 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-900"></div>
        <div className="absolute top-0 left-40 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-0 left-44 w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce delay-1100"></div>
        <div className="absolute top-0 left-48 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-1200"></div>
        <div className="absolute top-0 left-52 w-2 h-2 bg-cyan-300/80 rounded-full animate-bounce delay-1300"></div>
        <div className="absolute top-0 left-56 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-1400"></div>
        <div className="absolute top-0 left-60 w-1 h-1 bg-cyan-400/70 rounded-full animate-bounce delay-1500"></div>
        <div className="absolute top-0 left-64 w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce delay-1600"></div>
        <div className="absolute top-0 left-68 w-1 h-1 bg-cyan-500/50 rounded-full animate-bounce delay-1700"></div>
        <div className="absolute top-0 left-72 w-2 h-2 bg-blue-300/80 rounded-full animate-bounce delay-1800"></div>
        <div className="absolute top-0 left-76 w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce delay-1900"></div>
        <div className="absolute top-0 left-80 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-2000"></div>
        <div className="absolute top-0 left-84 w-1.5 h-1.5 bg-cyan-300/90 rounded-full animate-bounce delay-2100"></div>
        <div className="absolute top-0 left-88 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-2200"></div>
        <div className="absolute top-0 left-92 w-2 h-2 bg-cyan-400/70 rounded-full animate-bounce delay-2300"></div>
        <div className="absolute top-0 left-96 w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce delay-2400"></div>
        
        {/* Row 2 - Slightly Lower */}
        <div className="absolute top-8 left-2 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-150"></div>
        <div className="absolute top-8 left-6 w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce delay-250"></div>
        <div className="absolute top-8 left-10 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-350"></div>
        <div className="absolute top-8 left-14 w-2 h-2 bg-cyan-500/50 rounded-full animate-bounce delay-450"></div>
        <div className="absolute top-8 left-18 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-550"></div>
        <div className="absolute top-8 left-22 w-1 h-1 bg-cyan-300/80 rounded-full animate-bounce delay-650"></div>
        <div className="absolute top-8 left-26 w-1.5 h-1.5 bg-blue-400/70 rounded-full animate-bounce delay-750"></div>
        <div className="absolute top-8 left-30 w-1 h-1 bg-cyan-400/60 rounded-full animate-bounce delay-850"></div>
        <div className="absolute top-8 left-34 w-2 h-2 bg-blue-300/80 rounded-full animate-bounce delay-950"></div>
        <div className="absolute top-8 left-38 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-1050"></div>
        <div className="absolute top-8 left-42 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-1150"></div>
        <div className="absolute top-8 left-46 w-1.5 h-1.5 bg-cyan-300/90 rounded-full animate-bounce delay-1250"></div>
        <div className="absolute top-8 left-50 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-1350"></div>
        <div className="absolute top-8 left-54 w-2 h-2 bg-cyan-400/70 rounded-full animate-bounce delay-1450"></div>
        <div className="absolute top-8 left-58 w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce delay-1550"></div>
        <div className="absolute top-8 left-62 w-1 h-1 bg-cyan-500/50 rounded-full animate-bounce delay-1650"></div>
        <div className="absolute top-8 left-66 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-1750"></div>
        <div className="absolute top-8 left-70 w-1 h-1 bg-cyan-300/80 rounded-full animate-bounce delay-1850"></div>
        <div className="absolute top-8 left-74 w-2 h-2 bg-blue-400/70 rounded-full animate-bounce delay-1950"></div>
        <div className="absolute top-8 left-78 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce delay-2050"></div>
        <div className="absolute top-8 left-82 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-2150"></div>
        <div className="absolute top-8 left-86 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-2250"></div>
        <div className="absolute top-8 left-90 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-2350"></div>
        <div className="absolute top-8 left-94 w-2 h-2 bg-cyan-300/90 rounded-full animate-bounce delay-2450"></div>
        
        {/* Additional Rain Drops for Intense Effect */}
        <div className="absolute top-16 left-4 w-1 h-1 bg-blue-400/70 rounded-full animate-bounce delay-200"></div>
        <div className="absolute top-16 left-8 w-1.5 h-1.5 bg-cyan-300/80 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-16 left-12 w-1 h-1 bg-blue-300/90 rounded-full animate-bounce delay-400"></div>
        <div className="absolute top-16 left-16 w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce delay-500"></div>
        <div className="absolute top-16 left-20 w-1.5 h-1.5 bg-blue-400/70 rounded-full animate-bounce delay-600"></div>
        <div className="absolute top-16 left-24 w-1 h-1 bg-cyan-500/50 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-16 left-28 w-1.5 h-1.5 bg-blue-300/80 rounded-full animate-bounce delay-800"></div>
        <div className="absolute top-16 left-32 w-1 h-1 bg-cyan-400/70 rounded-full animate-bounce delay-900"></div>
        <div className="absolute top-16 left-36 w-2 h-2 bg-blue-300/90 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-16 left-40 w-1.5 h-1.5 bg-cyan-300/80 rounded-full animate-bounce delay-1100"></div>
        <div className="absolute top-16 left-44 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-1200"></div>
        <div className="absolute top-16 left-48 w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce delay-1300"></div>
        <div className="absolute top-16 left-52 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-1400"></div>
        <div className="absolute top-16 left-56 w-2 h-2 bg-cyan-500/50 rounded-full animate-bounce delay-1500"></div>
        <div className="absolute top-16 left-60 w-1.5 h-1.5 bg-blue-400/70 rounded-full animate-bounce delay-1600"></div>
        <div className="absolute top-16 left-64 w-1 h-1 bg-cyan-300/90 rounded-full animate-bounce delay-1700"></div>
        <div className="absolute top-16 left-68 w-1.5 h-1.5 bg-blue-300/80 rounded-full animate-bounce delay-1800"></div>
        <div className="absolute top-16 left-72 w-1 h-1 bg-cyan-400/60 rounded-full animate-bounce delay-1900"></div>
        <div className="absolute top-16 left-76 w-2 h-2 bg-blue-400/70 rounded-full animate-bounce delay-2000"></div>
        <div className="absolute top-16 left-80 w-1.5 h-1.5 bg-cyan-300/80 rounded-full animate-bounce delay-2100"></div>
        <div className="absolute top-16 left-84 w-1 h-1 bg-blue-300/90 rounded-full animate-bounce delay-2200"></div>
        <div className="absolute top-16 left-88 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-2300"></div>
        <div className="absolute top-16 left-92 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-2400"></div>
      </div>

      {/* Glassmorphism Header */}
      <header className="relative z-50 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-2xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
                <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-8 w-auto" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">CSS GROUPS INTEGRATED FARMS</h1>
                <p className="text-sm text-white/80">ISAC Agribusiness Training Management System</p>
              </div>
            </div>

            {/* Back to Home Button */}
            <Button
              onClick={() => navigate("/")}
              variant="ghost"
              size="sm"
              className="text-white/90 hover:text-white hover:bg-white/20 backdrop-blur-sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
            </div>
          </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center min-h-screen py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-md mx-auto">
            {/* Floating Title */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center bg-white/20 backdrop-blur-md border border-white/30 text-white px-6 py-3 rounded-full text-sm font-medium mb-6 shadow-2xl">
                <Shield className="mr-2 h-4 w-4" />
                Administrative Access
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-4">
                Admin Login
              </h2>
              <p className="text-white/90 text-lg">
                Access the training platform management system
              </p>
            </div>

            {/* Login Form Card */}
            <Card className="bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <CardTitle className="text-2xl font-bold text-white flex items-center justify-center">
                  <Lock className="h-6 w-6 mr-2 text-emerald-300" />
                  Secure Login
                </CardTitle>
        </CardHeader>
        <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
                    <Label htmlFor="email" className="text-white font-medium">
                      <User className="h-4 w-4 inline mr-2" />
                      Email Address
                    </Label>
                <Input
                  id="email"
                  type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@cssfarms.ng"
                  required
                      className="bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm focus:border-emerald-300 focus:ring-emerald-300"
                />
            </div>

            <div className="space-y-2">
                    <Label htmlFor="password" className="text-white font-medium">
                      <Lock className="h-4 w-4 inline mr-2" />
                      Password
                    </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                        className="bg-white/20 border-white/30 text-white placeholder-white/60 backdrop-blur-sm focus:border-emerald-300 focus:ring-emerald-300 pr-10"
                />
                      <Button
                  type="button"
                        variant="ghost"
                        size="sm"
                  onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-0 top-0 h-full px-3 text-white/70 hover:text-white hover:bg-white/10"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
              </div>
            </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg font-semibold shadow-lg mb-4"
                  size="lg"
                >
                  {isLoading ? (
                    <>
                      <CSSFarmsLoader size="sm" className="mr-2" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </Button>


          </form>

          {/* Error Display */}
          {submitError && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg backdrop-blur-sm">
              <div className="flex items-center text-red-300">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span className="text-sm">{submitError}</span>
              </div>
            </div>
          )}

                {/* Additional Info */}
          <div className="mt-6 text-center">
                  <p className="text-sm text-white/70">
                    Secure access to administrative dashboard
                  </p>
                  <div className="mt-4 p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                    <p className="text-xs text-white/80">
                      <strong>Note:</strong> This area is restricted to authorized personnel only.
                    </p>
                  </div>
          </div>
        </CardContent>
      </Card>
          </div>
        </div>
      </main>
    </div>
  );
}