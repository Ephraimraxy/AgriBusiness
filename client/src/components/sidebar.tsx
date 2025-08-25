import { useAuth } from "@/hooks/useAuth";
import { Dispatch, SetStateAction, useState } from "react";
import { signOut } from "firebase/auth";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LogOut, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { 
  Home, 
  Video, 
  FileText,
  ClipboardCheck, 
  Upload, 
  Megaphone, 
  Headphones,
  BookOpen,
  BarChart3,
  PlayCircle,
  Users
} from "lucide-react";
import { cn } from "@/lib/utils";

export const traineeSidebarItems = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'videos', label: 'Training Videos', icon: Video },
  { id: 'materials', label: 'Lecture Materials', icon: BookOpen },
  // Remove take-exam and results buttons
  { id: 'cbt-exam', label: 'CBT Exam', icon: ClipboardCheck },
  { id: 'cbt-results', label: 'CBT Results', icon: FileText },
  { id: 'assignments', label: 'Assignments', icon: Upload },
  { id: 'start-evaluation', label: 'Start Evaluation', icon: PlayCircle },
  { id: 'resource-persons', label: 'View Resource Persons', icon: Users },
  { id: 'support', label: 'Support', icon: Headphones },
];

interface SidebarProps {
  activeItem: string;
  onItemChange: (item: string) => void;
  onCollapseChange?: (collapsed: boolean) => void;
  disabled?: boolean;
  forceCollapsed?: boolean;
}

export default function Sidebar({ activeItem, onItemChange, onCollapseChange, disabled = false, forceCollapsed }: SidebarProps) {
  const { user } = useAuth();
  // Assume trainee for sidebar; if you want admin logic, pass a prop
  const isAdmin = false; // or use a prop if needed
  const [, setLocation] = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const effectiveCollapsed = typeof forceCollapsed === 'boolean' ? forceCollapsed : isCollapsed;

  const handleLogoutClick = () => setShowConfirm(true);
  const handleConfirmLogout = () => {
    setShowConfirm(false);
    setLocation("/");
    signOut(auth).catch(() => {});
  };
  const handleCancel = () => setShowConfirm(false);

  const handleCollapseToggle = () => {
    if (disabled) return;
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapseChange?.(newCollapsedState);
  };

  return (
    <aside className={cn(
      "sidebar-container-with-fixed-footer bg-gradient-to-b from-green-100 via-green-50 to-white shadow-sm transition-all duration-300 border-r border-gray-200",
      effectiveCollapsed ? "w-16" : "w-64"
    )}>
      {/* Toggle Button */}
      <div className="flex justify-end p-2 pt-32 border-b border-gray-200 flex-none sticky top-0 bg-gradient-to-b from-green-100 via-green-50 to-white z-10">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCollapseToggle}
          className="h-10 w-10 p-0 hover:bg-green-200 transition-colors"
          disabled={disabled}
        >
          {effectiveCollapsed ? <ChevronRight className="h-10 w-10 text-red-600 animate-bold-blink" /> : <ChevronLeft className="h-10 w-10 text-red-600 animate-bold-blink" />}
        </Button>
      </div>

      <nav className="sidebar-nav p-4 pt-12">
        <ul className="space-y-2">
          {traineeSidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full h-12 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
                    effectiveCollapsed 
                      ? "justify-center px-2" 
                      : "justify-start space-x-3",
                    activeItem === item.id
                      ? "bg-green-600 text-white hover:bg-green-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  )}
                  onClick={() => !disabled && onItemChange(item.id)}
                  title={effectiveCollapsed ? item.label : undefined}
                  disabled={disabled}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!effectiveCollapsed && <span>{item.label}</span>}
                </Button>
              </li>
            );
          })}
          {/* Logout placed after the last sidebar item */}
          <li>
            <Button
              variant="ghost"
              className={cn(
                "w-full h-12 transition-all duration-200 text-red-600 hover:text-green-600 hover:bg-green-100 disabled:opacity-50 disabled:pointer-events-none",
                effectiveCollapsed ? "justify-center px-2" : "justify-start space-x-3"
              )}
              onClick={!disabled ? handleLogoutClick : undefined}
              title={effectiveCollapsed ? "Logout" : undefined}
              disabled={disabled}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {!effectiveCollapsed && <span>Logout</span>}
            </Button>
          </li>
        </ul>
      </nav>
      {/* Logout confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-sm animate-in zoom-in-95 fade-in-50" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-center">
              <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="Logo" className="h-12 w-auto mx-auto mb-4 animate-bounce" />
              Are you sure you want to logout?
            </DialogTitle>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleCancel}>Cancel</Button>
            <Button variant="destructive" onClick={handleConfirmLogout}>Logout</Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
