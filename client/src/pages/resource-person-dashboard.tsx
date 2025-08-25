import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, LogOut, User, ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  UserCheck,
  FileText,
  Calendar,
  Settings,
  Award,
  Users,
  GraduationCap,
  Building,
  ClipboardCheck,
  BarChart3,
  Upload,
  Megaphone,
  TrendingUp,
  PlayCircle,
  Headphones,
  Home,
  Video,
  BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";
import Header from "@/components/header";
import AdminContentActions from "@/components/admin-content-actions";
import AdminVideoUpload from "@/components/admin-video-upload";
import AdminFileUpload from "@/components/admin-file-upload";
import ProfileManagement from "@/components/profile-management";

export default function ResourcePersonDashboardPage() {
  const [, setLocation] = useLocation();
  const [currentRp, setCurrentRp] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<string>("dashboard");
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  const [contentView, setContentView] = useState<"actions" | "videos" | "files">("actions");
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);

  // Check for RP session on component mount
  useEffect(() => {
    const rpData = sessionStorage.getItem('currentRp');
    const userRole = sessionStorage.getItem('userRole');
    
    if (!rpData || userRole !== 'resource_person') {
      setLocation("/rp-login");
      return;
    }

    const parsedRp = JSON.parse(rpData);
    setCurrentRp(parsedRp);
    setCurrentUserEmail(parsedRp.email);
  }, [setLocation]);

  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowConfirm(false);
    sessionStorage.removeItem('currentRp');
    sessionStorage.removeItem('userRole');
    setLocation("/");
  };

  const handleCancel = () => setShowConfirm(false);

  if (!currentRp) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
             <Header variant="resource_person" />

      <div className="dashboard-layout flex-1">
        {/* Sidebar matching trainee dashboard */}
        <aside className={cn(
          "bg-gradient-to-b from-green-100 via-green-50 to-white shadow-sm flex flex-col transition-all duration-300 sticky top-0 h-screen",
          isCollapsed ? "w-16" : "w-64"
        )}>
          {/* Toggle Button */}
          <div className="flex justify-end p-2 border-b border-gray-200">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          <nav className="p-4 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              <li>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-12 transition-all duration-200",
                    isCollapsed 
                      ? "justify-center px-2" 
                      : "justify-start space-x-3",
                    activeSection === "dashboard"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setActiveSection("dashboard")}
                  title={isCollapsed ? "Dashboard" : undefined}
                >
                  <Home className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-base">Dashboard</span>}
                </Button>
              </li>
              
              <li>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-12 transition-all duration-200",
                    isCollapsed 
                      ? "justify-center px-2" 
                      : "justify-start space-x-3",
                    activeSection === "content"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => {
                    setShowContentDropdown(!showContentDropdown);
                    // Don't navigate to content page, just toggle the dropdown
                  }}
                  title={isCollapsed ? "Content" : undefined}
                >
                  <BookOpen className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-base">Content</span>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        showContentDropdown ? "rotate-90" : ""
                      )} />
                    </div>
                  )}
                </Button>
                
                {/* Content Dropdown Menu */}
                {!isCollapsed && showContentDropdown && (
                  <div className="ml-6 mt-1 space-y-1.5">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full text-left h-auto py-2.5 px-4 text-sm transition-all duration-200 rounded-md",
                        contentView === "videos"
                          ? "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 font-medium"
                          : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setContentView("videos");
                        setActiveSection("content");
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0"></div>
                        <Video className="h-4 w-4" />
                        <span className="truncate">Videos</span>
                      </div>
                    </Button>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full text-left h-auto py-2.5 px-4 text-sm transition-all duration-200 rounded-md",
                        contentView === "files"
                          ? "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 font-medium"
                          : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        setContentView("files");
                        setActiveSection("content");
                      }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0"></div>
                        <FileText className="h-4 w-4" />
                        <span className="truncate">Files</span>
                      </div>
                    </Button>
                  </div>
                )}
              </li>
              
              <li>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-12 transition-all duration-200",
                    isCollapsed 
                      ? "justify-center px-2" 
                      : "justify-start space-x-3",
                    activeSection === "profile"
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => setActiveSection("profile")}
                  title={isCollapsed ? "Profile" : undefined}
                >
                  <User className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-base">Profile</span>}
                </Button>
              </li>
              
              {/* Logout Button moved closer to last button */}
              <li className="mt-4">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full text-red-600 hover:text-green-600 hover:bg-green-100 focus:text-green-700 focus:bg-green-100 transition-all duration-200",
                    isCollapsed 
                      ? "justify-center px-2" 
                      : "flex items-center justify-start space-x-3"
                  )}
                  onClick={handleLogoutClick}
                  title={isCollapsed ? "Logout" : undefined}
                >
                  <LogOut className="h-5 w-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-base">Logout</span>}
                </Button>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {activeSection === "dashboard" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                                   <h2 className="text-3xl font-bold text-gray-800 mb-2">Resource Person Overview</h2>
                 <p className="text-lg text-gray-600">Manage your resource person activities and profile</p>
                </div>
                <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white">
                  <UserCheck className="mr-2 h-4 w-4" />
                  Manage Profile
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="card-shadow">
                  <CardHeader>
                                         <CardTitle className="flex items-center text-lg">
                       <UserCheck className="mr-2 h-5 w-5 text-green-600" />
                       Profile Information
                     </CardTitle>
                     <CardDescription className="text-base">Your resource person details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                                             <div className="flex justify-between">
                         <span className="text-base text-gray-600">Name:</span>
                         <span className="text-base font-medium">{currentRp.firstName} {currentRp.surname}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-base text-gray-600">Email:</span>
                         <span className="text-base font-medium">{currentRp.email}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-base text-gray-600">Specialization:</span>
                         <span className="text-base font-medium">{currentRp.specialization || 'Not specified'}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-base text-gray-600">Status:</span>
                         <Badge variant="outline" className="text-sm">
                           {currentRp.isVerified ? 'Verified' : 'Pending'}
                         </Badge>
                       </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow">
                  <CardHeader>
                                         <CardTitle className="flex items-center text-lg">
                       <ClipboardCheck className="mr-2 h-5 w-5 text-blue-600" />
                       Quick Actions
                     </CardTitle>
                     <CardDescription className="text-base">Common tasks and shortcuts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                                             <Button 
                         variant="outline" 
                         size="default" 
                         className="w-full justify-start text-base"
                         onClick={() => setLocation("/resource-person-id-generation")}
                       >
                         <UserCheck className="mr-2 h-4 w-4" />
                         Manage Registrations
                       </Button>
                       <Button 
                         variant="outline" 
                         size="default" 
                         className="w-full justify-start text-base"
                         onClick={() => setLocation("/original/view-trainees")}
                       >
                         <Users className="mr-2 h-4 w-4" />
                         View Trainees
                       </Button>
                       <Button 
                         variant="outline" 
                         size="default" 
                         className="w-full justify-start text-base"
                         onClick={() => setLocation("/original/certificate-generation")}
                       >
                         <Award className="mr-2 h-4 w-4" />
                         Generate Certificates
                       </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-shadow">
                  <CardHeader>
                                         <CardTitle className="flex items-center text-lg">
                       <BarChart3 className="mr-2 h-5 w-5 text-purple-600" />
                       Statistics
                     </CardTitle>
                     <CardDescription className="text-base">Your activity overview</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                                             <div className="flex items-center justify-between">
                         <span className="text-base text-gray-600">Total Trainees:</span>
                         <span className="text-xl font-bold text-gray-800">0</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-base text-gray-600">Certificates Issued:</span>
                         <span className="text-xl font-bold text-gray-800">0</span>
                       </div>
                       <div className="flex items-center justify-between">
                         <span className="text-base text-gray-600">Active Sessions:</span>
                         <span className="text-xl font-bold text-gray-800">0</span>
                       </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Content Section */}
          {activeSection === "content" && (
            contentView === "actions" ? (
              <AdminContentActions onNavigate={setContentView} />
            ) : contentView === "videos" ? (
              <AdminVideoUpload embedded />
            ) : contentView === "files" ? (
              <AdminFileUpload embedded />
            ) : (
              <div className="p-6 text-center text-gray-600">Unknown view.</div>
            )
          )}

          {/* Profile Section */}
          {activeSection === "profile" && currentRp && currentUserEmail && (
            <ProfileManagement 
              userRole="resource_person" 
              userEmail={currentUserEmail}
              userData={currentRp}
              onBack={() => setActiveSection("dashboard")}
              embedded
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-200 via-green-50 to-white text-gray-700 py-3 px-6 mt-auto border-t border-gray-200 shadow-sm">
        <div className="container mx-auto">
          <div className="flex items-center justify-center space-x-4">
            <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-5 w-auto" />
            <span className="text-sm font-medium">CSS FARMS Nigeria</span>
            <span className="text-gray-400 text-xs">•</span>
            <span className="text-gray-500 text-xs">Resource Person Dashboard - Agricultural Training Management System</span>
          </div>
        </div>
      </footer>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
         <DialogContent className="sm:max-w-md animate-in zoom-in-95 fade-in-50">
           <DialogHeader>
             <DialogTitle className="text-center text-xl">
               <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="Logo" className="h-16 w-auto mx-auto mb-4 animate-bounce" />
               Are you sure you want to logout?
             </DialogTitle>
           </DialogHeader>
           <div className="flex justify-end gap-3 mt-6">
             <Button variant="outline" onClick={handleCancel} size="lg" className="text-base px-6">
               Cancel
             </Button>
             <Button onClick={handleConfirmLogout} className="bg-red-600 hover:bg-red-700 text-white text-base px-6" size="lg">
               Logout
             </Button>
           </div>
         </DialogContent>
       </Dialog>
    </div>
  );
} 