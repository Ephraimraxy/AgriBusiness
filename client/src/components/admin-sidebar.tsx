
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { useState } from "react";
import { useRegistrationStatus, useToggleRegistration } from "@/hooks/useRegistrationStatus";
import { Button } from "@/components/ui/button";
import { 
  BarChart3, 
  Users, 
  Building, 
  BookOpen, 
  Bell, 
  Settings, 
  LogOut,
  Upload,
  MessageSquare,
  FileText,
  Calendar,
  Shield,
  ClipboardCheck,
  UserPlus,
  Award,
  MapPin,
  IdCard,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Video,
  Plus
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface AdminSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

export default function AdminSidebar({ activeSection, onSectionChange, onCollapseChange }: AdminSidebarProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showContentDropdown, setShowContentDropdown] = useState(false);
  // Remove the showExamDropdown state
  const { data: registrationSetting } = useRegistrationStatus();
  const toggleReg = useToggleRegistration();
  const registrationOpen = registrationSetting?.value === "true";

  const sidebarItems = [
    { 
      id: "dashboard", 
      label: "Dashboard", 
      icon: BarChart3, 
      description: "System overview and stats"
    },
    { 
      id: "sponsors", 
      label: "Sponsors", 
      icon: Building, 
      description: "Manage training sponsors"
    },
    { 
      id: "trainees", 
      label: "Trainees", 
      icon: Users, 
      description: "View and manage trainees"
    },
    { 
      id: "content", 
      label: "Content", 
      icon: BookOpen, 
      description: "Manage training materials",
      hasSubmenu: true,
      subItems: [
        { id: "videos", label: "Videos", icon: Video, description: "Upload and manage training videos" },
        { id: "files", label: "Files", icon: FileText, description: "Upload and manage training materials" }
      ]
    },
    { 
      id: "announcements", 
      label: "Announcements", 
      icon: Bell, 
      description: "Send messages to trainees"
    },
    { 
      id: "cbt-setup", 
      label: "CBT Setup", 
      icon: ClipboardCheck, 
      description: "Setup CBT exam questions and settings"
    },
    // Remove the exams section with dropdown
    { 
      id: "certificate", 
      label: "Certificate", 
      icon: Award, 
      description: "Generate and manage certificates"
    },
    { 
      id: "allocations", 
      label: "Allocations", 
      icon: MapPin, 
      description: "Manage room and venue allocations"
    },
    { 
      id: "generate-id", 
      label: "Generate ID", 
      icon: IdCard, 
      description: "Generate and manage Staff and Resource Person IDs"
    },
    { 
      id: "monitoring-evaluation", 
      label: "Monitoring & Evaluation", 
      icon: TrendingUp, 
      description: "Track progress and performance"
    },
    { 
      id: "registration", 
      label: "Registration", 
      icon: UserPlus, 
      description: "Start/Stop trainee registration"
    },
    { 
      id: "settings", 
      label: "Settings", 
      icon: Settings, 
      description: "System configuration"
    }
  ];

  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowConfirm(false);
    try {
      await fetch((import.meta as any).env?.VITE_API_URL ? `${(import.meta as any).env.VITE_API_URL}/api/admin/logout` : '/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      });
    } catch {}
    window.location.href = "/";
  };

  const handleCancel = () => setShowConfirm(false);

  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };

  const [, navigate] = useLocation();

  return (
    <div className={cn(
      "sidebar-container-with-fixed-footer bg-gradient-to-b from-green-200 via-green-50 to-white shadow-lg transition-all duration-300 border-r border-gray-200",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header with Toggle Button */}
      <div className="p-4 pt-24 border-b flex-none">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1">
                <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-8 w-auto object-contain" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Admin Panel</h2>
                <p className="text-sm text-gray-600">CSS FARMS Nigeria</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapseToggle}
            className="h-10 w-10 p-0"
          >
            {isCollapsed ? <ChevronRight className="h-10 w-10 text-red-600 animate-bold-blink" /> : <ChevronLeft className="h-10 w-10 text-red-600 animate-bold-blink" />}
          </Button>
        </div>
      </div>

      <nav className="sidebar-nav mt-6">
        <div className="px-4 space-y-2">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="relative">
                <Button
                  variant={activeSection === item.id ? "default" : "ghost"}
                  className={cn(
                    "w-full text-left h-auto p-3 transition-all duration-200 group",
                    isCollapsed 
                      ? "justify-center px-2" 
                      : "justify-start",
                    activeSection === item.id
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => {
                    if (item.id === "content") {
                      setShowContentDropdown(!showContentDropdown);
                      // Don't navigate to content page, just toggle the dropdown
                    } else {
                      onSectionChange(item.id);
                    }
                  }}
                  title={isCollapsed ? item.label : undefined}
                >
                  <div className={cn(
                    "flex items-center w-full",
                    isCollapsed ? "justify-center" : "justify-between"
                  )}>
                    <div className="flex items-center space-x-3">
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate text-left">{item.label}</p>
                          <p className="text-xs opacity-75 truncate text-left">{item.description}</p>
                        </div>
                      )}
                    </div>
                    {!isCollapsed && item.hasSubmenu && (
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        (item.id === "content" && showContentDropdown)
                          ? "rotate-90" 
                          : ""
                      )} />
                    )}
                  </div>
                </Button>

                {/* Dropdown Menu */}
                {!isCollapsed && item.hasSubmenu && (
                  <div className={cn(
                    "ml-6 mt-1 space-y-1.5 overflow-hidden transition-all duration-200",
                    (item.id === "content" && !showContentDropdown)
                      ? "max-h-0 opacity-0 mt-0"
                      : "max-h-96 opacity-100"
                  )}>
                    {Array.isArray(item.subItems) && item.subItems.map((subItem) => (
                      <Button
                        key={subItem.id}
                        variant={activeSection === subItem.id ? "default" : "ghost"}
                        className={cn(
                          "w-full text-left h-auto py-2.5 px-4 text-sm transition-all duration-200 rounded-md",
                          activeSection === subItem.id
                            ? "bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900 font-medium"
                            : "text-gray-700 hover:bg-green-50 hover:text-green-700"
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.id === "content") {
                            // For content sub-items, set the contentView state
                            onSectionChange(`content-${subItem.id}`);
                          } else {
                            onSectionChange(subItem.id);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-70 flex-shrink-0"></div>
                          <span className="truncate">{subItem.label}</span>
                        </div>
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>




      <div className="p-4 border-t bg-gray-50 flex-none pb-20">
        <Button
          variant="ghost"
          className={cn(
            "w-full text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-200",
            isCollapsed 
              ? "justify-center px-2" 
              : "justify-start"
          )}
          onClick={handleLogoutClick}
          title={isCollapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="ml-3">Logout</span>}
        </Button>
      </div>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-sm z-[12000] animate-in zoom-in-95 fade-in-50" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} aria-describedby="logout-confirmation-description">
          <DialogHeader>
            <DialogTitle className="text-center">
              <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="Logo" className="h-12 w-auto mx-auto mb-4" />
              Are you sure you want to logout?
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmLogout}>Logout</Button>
          </div>
          <div id="logout-confirmation-description" className="sr-only">
            Logout confirmation dialog
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
