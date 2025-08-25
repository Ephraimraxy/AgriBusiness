import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sprout, Video, ClipboardCheck, TrendingUp, Users, BookOpen, Award, UserCheck, Users2 } from "lucide-react";
import RegistrationWizard from "@/components/registration-wizard";
import LoginModal from "@/components/login-modal";


// ---------- Types ----------
interface Setting {
  value: string;
}

interface Sponsor {
  id: string;
  name: string;
  description?: string;
}


export default function Landing() {
  const [, navigate] = useLocation();
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);


  const { data: registrationEnabled } = useQuery<Setting>({
    queryKey: ["/api/settings/registration_enabled"],
    retry: false,
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    refetchIntervalInBackground: true,
    staleTime: 0, // Always consider data stale to ensure fresh updates
  });

  const { data: staffRegistrationEnabled } = useQuery<Setting>({
    queryKey: ["/api/settings/staff_registration_enabled"],
    retry: false,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: rpRegistrationEnabled } = useQuery<Setting>({
    queryKey: ["/api/settings/rp_registration_enabled"],
    retry: false,
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    staleTime: 0,
  });

  const { data: activeSponsor } = useQuery<Sponsor | undefined>({
    queryKey: ["/api/sponsors/active"],
    retry: false,
  });

  const isRegistrationEnabled = registrationEnabled?.value === "true";
  const isStaffRegistrationEnabled = staffRegistrationEnabled?.value === "true";
  const isRpRegistrationEnabled = rpRegistrationEnabled?.value === "true";

  return (
          <div className="min-h-screen relative overflow-hidden">
        {/* Agricultural Background with High-Quality Crop Image */}
        <div className="absolute inset-0">
        {/* High-Quality Agricultural Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2832&q=80')`
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
        <div className="absolute top-8 left-94 w-2 h-2 bg-cyan-300/80 rounded-full animate-bounce delay-2450"></div>
        <div className="absolute top-8 left-98 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-2550"></div>
        
        {/* Row 3 - Middle */}
        <div className="absolute top-16 left-1 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-16 left-5 w-1.5 h-1.5 bg-cyan-300/80 rounded-full animate-bounce delay-400"></div>
        <div className="absolute top-16 left-9 w-1 h-1 bg-blue-300/70 rounded-full animate-bounce delay-500"></div>
        <div className="absolute top-16 left-13 w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce delay-600"></div>
        <div className="absolute top-16 left-17 w-1.5 h-1.5 bg-blue-400/80 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-16 left-21 w-1 h-1 bg-cyan-500/50 rounded-full animate-bounce delay-800"></div>
        <div className="absolute top-16 left-25 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-900"></div>
        <div className="absolute top-16 left-29 w-1 h-1 bg-cyan-300/70 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-16 left-33 w-2 h-2 bg-blue-400/60 rounded-full animate-bounce delay-1100"></div>
        <div className="absolute top-16 left-37 w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce delay-1200"></div>
        <div className="absolute top-16 left-41 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-1300"></div>
        <div className="absolute top-16 left-45 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-1400"></div>
        <div className="absolute top-16 left-49 w-1 h-1 bg-blue-400/70 rounded-full animate-bounce delay-1500"></div>
        <div className="absolute top-16 left-53 w-2 h-2 bg-cyan-300/90 rounded-full animate-bounce delay-1600"></div>
        <div className="absolute top-16 left-57 w-1.5 h-1.5 bg-blue-300/60 rounded-full animate-bounce delay-1700"></div>
        <div className="absolute top-16 left-61 w-1 h-1 bg-cyan-400/70 rounded-full animate-bounce delay-1800"></div>
        <div className="absolute top-16 left-65 w-1.5 h-1.5 bg-blue-400/80 rounded-full animate-bounce delay-1900"></div>
        <div className="absolute top-16 left-69 w-1 h-1 bg-cyan-300/80 rounded-full animate-bounce delay-2000"></div>
        <div className="absolute top-16 left-73 w-2 h-2 bg-blue-300/70 rounded-full animate-bounce delay-2100"></div>
        <div className="absolute top-16 left-77 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce delay-2200"></div>
        <div className="absolute top-16 left-81 w-1 h-1 bg-blue-400/90 rounded-full animate-bounce delay-2300"></div>
        <div className="absolute top-16 left-85 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-2400"></div>
        <div className="absolute top-16 left-89 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-2500"></div>
        <div className="absolute top-16 left-93 w-2 h-2 bg-cyan-300/70 rounded-full animate-bounce delay-2600"></div>
        <div className="absolute top-16 left-97 w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce delay-2700"></div>
        
        {/* Row 4 - Lower */}
        <div className="absolute top-24 left-3 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-200"></div>
        <div className="absolute top-24 left-7 w-1.5 h-1.5 bg-cyan-400/70 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-24 left-11 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-400"></div>
        <div className="absolute top-24 left-15 w-2 h-2 bg-cyan-500/50 rounded-full animate-bounce delay-500"></div>
        <div className="absolute top-24 left-19 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-600"></div>
        <div className="absolute top-24 left-23 w-1 h-1 bg-cyan-300/80 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-24 left-27 w-1.5 h-1.5 bg-blue-400/70 rounded-full animate-bounce delay-800"></div>
        <div className="absolute top-24 left-31 w-1 h-1 bg-cyan-400/60 rounded-full animate-bounce delay-900"></div>
        <div className="absolute top-24 left-35 w-2 h-2 bg-blue-300/80 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-24 left-39 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-1100"></div>
        <div className="absolute top-24 left-43 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-1200"></div>
        <div className="absolute top-24 left-47 w-1.5 h-1.5 bg-cyan-300/90 rounded-full animate-bounce delay-1300"></div>
        <div className="absolute top-24 left-51 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-1400"></div>
        <div className="absolute top-24 left-55 w-2 h-2 bg-cyan-400/70 rounded-full animate-bounce delay-1500"></div>
        <div className="absolute top-24 left-59 w-1.5 h-1.5 bg-blue-400/60 rounded-full animate-bounce delay-1600"></div>
        <div className="absolute top-24 left-63 w-1 h-1 bg-cyan-500/50 rounded-full animate-bounce delay-1700"></div>
        <div className="absolute top-24 left-67 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-1800"></div>
        <div className="absolute top-24 left-71 w-1 h-1 bg-cyan-300/80 rounded-full animate-bounce delay-1900"></div>
        <div className="absolute top-24 left-75 w-2 h-2 bg-blue-400/70 rounded-full animate-bounce delay-2000"></div>
        <div className="absolute top-24 left-79 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce delay-2100"></div>
        <div className="absolute top-24 left-83 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-2200"></div>
        <div className="absolute top-24 left-87 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-2300"></div>
        <div className="absolute top-24 left-91 w-1 h-1 bg-blue-400/60 rounded-full animate-bounce delay-2400"></div>
        <div className="absolute top-24 left-95 w-2 h-2 bg-cyan-300/80 rounded-full animate-bounce delay-2500"></div>
        <div className="absolute top-24 left-99 w-1.5 h-1.5 bg-blue-300/90 rounded-full animate-bounce delay-2600"></div>
        
        {/* Additional Rain Drops for More Coverage */}
        <div className="absolute top-32 left-4 w-1 h-1 bg-blue-400/70 rounded-full animate-bounce delay-100"></div>
        <div className="absolute top-32 left-8 w-1.5 h-1.5 bg-cyan-300/80 rounded-full animate-bounce delay-200"></div>
        <div className="absolute top-32 left-12 w-1 h-1 bg-blue-300/90 rounded-full animate-bounce delay-300"></div>
        <div className="absolute top-32 left-16 w-2 h-2 bg-cyan-400/60 rounded-full animate-bounce delay-400"></div>
        <div className="absolute top-32 left-20 w-1.5 h-1.5 bg-blue-400/80 rounded-full animate-bounce delay-500"></div>
        <div className="absolute top-32 left-24 w-1 h-1 bg-cyan-500/50 rounded-full animate-bounce delay-600"></div>
        <div className="absolute top-32 left-28 w-1.5 h-1.5 bg-blue-300/70 rounded-full animate-bounce delay-700"></div>
        <div className="absolute top-32 left-32 w-1 h-1 bg-cyan-300/90 rounded-full animate-bounce delay-800"></div>
        <div className="absolute top-32 left-36 w-2 h-2 bg-blue-400/60 rounded-full animate-bounce delay-900"></div>
        <div className="absolute top-32 left-40 w-1.5 h-1.5 bg-cyan-400/80 rounded-full animate-bounce delay-1000"></div>
        <div className="absolute top-32 left-44 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-1100"></div>
        <div className="absolute top-32 left-48 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-1200"></div>
        <div className="absolute top-32 left-52 w-1 h-1 bg-blue-400/70 rounded-full animate-bounce delay-1300"></div>
        <div className="absolute top-32 left-56 w-2 h-2 bg-cyan-300/80 rounded-full animate-bounce delay-1400"></div>
        <div className="absolute top-32 left-60 w-1.5 h-1.5 bg-blue-300/60 rounded-full animate-bounce delay-1500"></div>
        <div className="absolute top-32 left-64 w-1 h-1 bg-cyan-400/70 rounded-full animate-bounce delay-1600"></div>
        <div className="absolute top-32 left-68 w-1.5 h-1.5 bg-blue-400/80 rounded-full animate-bounce delay-1700"></div>
        <div className="absolute top-32 left-72 w-1 h-1 bg-cyan-300/80 rounded-full animate-bounce delay-1800"></div>
        <div className="absolute top-32 left-76 w-2 h-2 bg-blue-300/70 rounded-full animate-bounce delay-1900"></div>
        <div className="absolute top-32 left-80 w-1.5 h-1.5 bg-cyan-400/60 rounded-full animate-bounce delay-2000"></div>
        <div className="absolute top-32 left-84 w-1 h-1 bg-blue-400/90 rounded-full animate-bounce delay-2100"></div>
        <div className="absolute top-32 left-88 w-1.5 h-1.5 bg-cyan-500/50 rounded-full animate-bounce delay-2200"></div>
        <div className="absolute top-32 left-92 w-1 h-1 bg-blue-300/80 rounded-full animate-bounce delay-2300"></div>
        <div className="absolute top-32 left-96 w-2 h-2 bg-cyan-300/70 rounded-full animate-bounce delay-2400"></div>
      </div>
      {/* Modern Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20 shadow-2xl">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-green-600 p-2 rounded-xl">
                <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-8 w-auto" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">CSS GROUPS INTEGRATED FARMS</h1>
                <p className="text-sm font-bold text-white">ISAC Agribusiness Training Management System</p>
              </div>
            </div>


          </div>
        </div>
      </header>

      {/* Main Content - This will flex to fill available space */}
      <main className="flex-1 relative z-10 pt-24 pb-40">
        {/* Hero Section */}
        <section className="pt-20 pb-32 px-6">
          <div className="container mx-auto max-w-6xl">
                <div className="flex items-center justify-between gap-12">
                  {/* Left Side - Hero Content */}
                  <div className="flex-1 text-center">
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <div className="inline-flex items-center bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-full text-sm font-medium border border-white/30">
                <Award className="mr-2 h-4 w-4" />
                Nigeria's Leading Agricultural Training Platform
              </div>

                      <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                        Transform Your <span className="text-emerald-300">Agribusiness Future</span>
              </h2>
                    </div>

              <p className="text-sm md:text-base text-white/90 mb-6 max-w-2xl mx-auto leading-relaxed text-center">
                Join our comprehensive training program and become part of Nigeria's agricultural revolution
              </p>
            </div>


                </div>



            {/* Action Cards with Glassmorphism */}
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {/* Trainee Registration Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl hover:bg-white/15 transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-white/20 p-3 rounded-full mr-4 backdrop-blur-sm">
                      <Users className="h-8 w-8 text-emerald-300" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Join as Trainee</h3>
                      <p className="text-white/90">Start your Agribusiness journey</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center text-white/90">
                      <Video className="h-4 w-4 mr-2 text-emerald-300" />
                      <span>Video-based learning modules</span>
                    </div>
                    <div className="flex items-center text-white/90">
                      <ClipboardCheck className="h-4 w-4 mr-2 text-emerald-300" />
                      <span>Practical assignments & assessments</span>
                    </div>
                    <div className="flex items-center text-white/90">
                      <Award className="h-4 w-4 mr-2 text-emerald-300" />
                      <span>Industry-recognized certification</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => setShowRegistration(true)}
                      disabled={!isRegistrationEnabled}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 text-lg font-semibold shadow-lg"
                      size="lg"
                    >
                      {isRegistrationEnabled ? "Register Now" : "Registration Closed"}
                    </Button>

                    <Button
                      onClick={() => setShowLogin(true)}
                      variant="outline"
                      className="w-full border-white/30 text-white hover:bg-white/20 py-3 text-lg backdrop-blur-sm bg-white/10"
                      size="lg"
                    >
                      Already Registered? Login
                    </Button>

                    {/* Registration Status */}
                    <div className="mt-6 p-4 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                      <Badge variant={isRegistrationEnabled ? "default" : "secondary"} className="mb-2">
                        {isRegistrationEnabled
                          ? "✓ Registration Open"
                          : "⚠ Registration Closed"}
                      </Badge>
                      {activeSponsor && (
                        <p className="text-sm text-white/90">
                          Current sponsor: <span className="font-semibold">{activeSponsor.name}</span>
                        </p>
                      )}
                      <p className="text-xs text-white/70 mt-2">
                        Last updated: {new Date().toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Staff Registration Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl hover:bg-white/15 transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-white/20 p-3 rounded-full mr-4 backdrop-blur-sm">
                      <UserCheck className="h-8 w-8 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Join as Staff</h3>
                      <p className="text-white/90">Contribute to agricultural training</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center text-white/90">
                      <BookOpen className="h-4 w-4 mr-2 text-blue-400" />
                      <span>Training and development</span>
                    </div>
                    <div className="flex items-center text-white/90">
                      <TrendingUp className="h-4 w-4 mr-2 text-blue-400" />
                      <span>Career growth opportunities</span>
                    </div>
                    <div className="flex items-center text-white/90">
                      <Award className="h-4 w-4 mr-2 text-blue-400" />
                      <span>Professional development</span>
                    </div>
                    </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => navigate("/staff-registration")}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold shadow-lg"
                      size="lg"
                      disabled={!isStaffRegistrationEnabled}
                    >
                      {isStaffRegistrationEnabled ? "Register Now" : "Registration Closed"}
                    </Button>

                    <Button
                      onClick={() => navigate("/staff-login")}
                      variant="outline"
                      className="w-full border-white/30 text-white hover:bg-white/20 py-3 text-lg backdrop-blur-sm bg-white/10"
                      size="lg"
                    >
                      Staff Login
                    </Button>
                  </div>
                </div>
                  </div>

              {/* Resource Person Registration Card */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl hover:bg-white/15 transition-all duration-300">
                <div className="p-8">
                  <div className="flex items-center mb-6">
                    <div className="bg-white/20 p-3 rounded-full mr-4 backdrop-blur-sm">
                      <Users2 className="h-8 w-8 text-amber-300" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white">Join as Resource Person</h3>
                      <p className="text-white/90">Share your expertise</p>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div className="flex items-center text-white/90">
                      <Sprout className="h-4 w-4 mr-2 text-amber-300" />
                      <span>Expert knowledge sharing</span>
                      </div>
                    <div className="flex items-center text-white/90">
                      <ClipboardCheck className="h-4 w-4 mr-2 text-amber-300" />
                      <span>Training delivery</span>
                    </div>
                    <div className="flex items-center text-white/90">
                      <Award className="h-4 w-4 mr-2 text-amber-300" />
                      <span>Professional recognition</span>
                    </div>
                      </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => navigate("/resource-person-registration")}
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3 text-lg font-semibold shadow-lg"
                      size="lg"
                      disabled={!isRpRegistrationEnabled}
                    >
                      {isRpRegistrationEnabled ? "Register Now" : "Registration Closed"}
                    </Button>

                    <Button
                      onClick={() => navigate("/rp-login")}
                      variant="outline"
                      className="w-full border-white/30 text-white hover:bg-white/20 py-3 text-lg backdrop-blur-sm bg-white/10"
                      size="lg"
                    >
                      RP Login
                    </Button>
                      </div>
                    </div>
                  </div>
            </div>


          </div>
        </section>

        {/* Program Benefits Section */}
        <section className="py-4 bg-gradient-to-b from-emerald-900 to-emerald-800">
          <div className="container mx-auto px-4">
            <div className="text-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-white mb-1">Program Benefits</h2>
              <p className="text-xs text-white/80">What you'll gain from our training</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
              {/* Expert-Led Training */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center hover:bg-white/15 transition-all duration-300">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Expert-Led Training</h3>
                <p className="text-xs text-white/80">Learn from industry professionals with years of experience</p>
              </div>

              {/* Certification */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center hover:bg-white/15 transition-all duration-300">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Certification</h3>
                <p className="text-xs text-white/80">Receive recognized certificates upon completion</p>
              </div>

              {/* Community Network */}
              <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-center hover:bg-white/15 transition-all duration-300">
                <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="w-5 h-5 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Community Network</h3>
                <p className="text-xs text-white/80">Connect with fellow trainees and mentors</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer with Glassmorphism */}
      <footer className="fixed bottom-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-t border-white/20 py-3 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-center space-x-4">
            <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
              <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-6 w-auto" />
            </div>
            <span className="text-sm font-semibold text-white">CSS GROUP INTEGRATED FARMS</span>
            <span className="text-white/70 text-xs">•</span>
            <span className="text-white/70 text-xs">Transforming Nigeria's agricultural sector through comprehensive training programs</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <RegistrationWizard
        isOpen={showRegistration}
        onClose={() => setShowRegistration(false)}
        onSwitchToLogin={() => setShowLogin(true)}
      />
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
      />
    </div>
  );
}