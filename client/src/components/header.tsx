import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { useLocation } from "wouter";
import { auth } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import NotificationBell from "@/components/notification-bell";

interface HeaderProps {
  variant?: 'admin' | 'trainee' | 'staff' | 'resource_person';
}

export default function Header({ variant }: HeaderProps) {
  const { user } = useAuth();
  const role: 'admin' | 'trainee' | 'staff' | 'resource_person' = variant ?? 'trainee';
  const [, setLocation] = useLocation();
  const [showConfirm, setShowConfirm] = useState(false);
  const { toast } = useToast();

  const [traineeTag, setTraineeTag] = useState<string | null>(null);
  const [traineeRoom, setTraineeRoom] = useState<string | null>(null);
  const [userID, setUserID] = useState<string | null>(null);
  const [isSyncingAlloc, setIsSyncingAlloc] = useState(false);
  const [now, setNow] = useState<Date>(new Date());

  const handleLogoutClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmLogout = async () => {
    setShowConfirm(false);
    try {
      if (role === 'admin') {
        // For admin, redirect to logout page which handles cleanup
        setLocation("/admin-logout");
      } else {
        // For other users, use Firebase signOut
        await signOut(auth);
        setLocation("/");
      }
    } catch (error) {
      console.error("Logout error:", error);
      setLocation("/");
    }
  };

  const handleCancel = () => setShowConfirm(false);

  const getUserInitials = () => {
    // For staff and resource person, show their ID in the circle
    if ((role === 'staff' || role === 'resource_person') && userID) {
      return userID;
    }
    // For trainees and admin, show initials
    if (user?.displayName) {
      const parts = user.displayName.split(' ');
      return parts.map((p) => p[0]).join('').toUpperCase();
    }
    return user?.email ? user.email[0].toUpperCase() : 'U';
  };

  const getUserName = () => {
    if (role === 'admin') return 'Administrator';
    if (role === 'staff') return 'Staff Member';
    if (role === 'resource_person') return 'Resource Person';
    return user?.displayName || user?.email || 'User';
  };

  const fetchUserData = async () => {
    if (!user?.email) return;
    
    try {
      if (role === 'trainee') {
        // Fetch trainee allocations
        const q = query(collection(db, 'trainees'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          const tag = data.tagNumber && data.tagNumber !== 'pending' ? String(data.tagNumber) : null;
          const rn = data.roomNumber;
          const rb = data.roomBlock;
          const room = rn && rn !== 'pending' && rb && rb !== 'pending' ? `${rb}-${rn}` : null;
          setTraineeTag(tag);
          setTraineeRoom(room);
        } else {
          setTraineeTag(null);
          setTraineeRoom(null);
        }
      } else if (role === 'staff') {
        // Fetch staff ID
        const q = query(collection(db, 'staff'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          setUserID(data.staffID || null);
        } else {
          setUserID(null);
        }
      } else if (role === 'resource_person') {
        // Fetch resource person ID
        const q = query(collection(db, 'resourcePersons'), where('email', '==', user.email));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          setUserID(data.rpID || null);
        } else {
          setUserID(null);
        }
      }
    } catch (err: any) {
      toast({ title: 'Sync failed', description: err?.message || 'Could not fetch user data', variant: 'destructive' });
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [role, user?.email]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Debug logging for variant
  useEffect(() => {
    console.log('Header - Variant prop:', variant);
    console.log('Header - NotificationBell variant:', variant === 'staff' || variant === 'resource_person' ? 'admin' : variant);
    console.log('Header - User role:', role);
    console.log('Header - User object:', user);
  }, [variant, role, user]);

  const handleSyncAllocations = async () => {
    if (role !== 'trainee') return;
    try {
      setIsSyncingAlloc(true);
      await fetchUserData();
      toast({ title: 'Allocations synced', description: 'Latest tag and room details fetched.' });
    } finally {
      setIsSyncingAlloc(false);
    }
  };

  const formattedNow = now.toLocaleString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const offsetMinutes = -now.getTimezoneOffset();
  const tzSign = offsetMinutes >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMinutes);
  const tzH = String(Math.floor(absMin / 60)).padStart(2, '0');
  const tzM = String(absMin % 60).padStart(2, '0');
  const tzLabel = `GMT${tzSign}${tzH}:${tzM}`;

  return (
    <>
      <header className="bg-gradient-to-r from-green-200 via-green-50 to-white shadow-sm border-b border-gray-200 sticky top-0 z-[60]">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-8 w-auto" />
              <div>
                <h1 className="text-xl font-bold text-gray-800">CSS GROUPS INTEGRATED FARMS</h1>
                <p className="text-sm text-gray-600">
                  {role === 'admin' ? 'ISAC (Admin Panel)' : 
                   role === 'staff' ? 'ISAC (Staff Dashboard)' :
                   role === 'resource_person' ? 'ISAC (Resource Person Dashboard)' :
                   'ISAC (Trainee Dashboard)'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationBell variant={variant === 'staff' || variant === 'resource_person' ? 'admin' : variant} />
              {role === 'trainee' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="p-2 text-gray-500 hover:text-gray-700"
                  onClick={handleSyncAllocations}
                  disabled={isSyncingAlloc}
                  aria-label="Sync allocations"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncingAlloc ? 'animate-spin' : ''}`} />
                </Button>
              )}
              <div className="flex items-center space-x-2">
                <div className={`${(role === 'staff' || role === 'resource_person') && userID ? 'w-12 h-8' : 'w-8 h-8'} bg-[hsl(var(--primary))] rounded-full flex items-center justify-center`}>
                  <span className={`text-white font-medium ${(role === 'staff' || role === 'resource_person') && userID ? 'text-xs' : 'text-sm'}`}>
                    {getUserInitials()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">{getUserName()}</span>
                  {role === 'admin' ? (
                    <Badge variant="outline" className="text-xs">Administrator</Badge>
                  ) : role === 'staff' ? (
                    <Badge variant="outline" className="text-xs">Staff</Badge>
                  ) : role === 'resource_person' ? (
                    <Badge variant="outline" className="text-xs">Resource Person</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      Tag: {traineeTag ?? '-'} | Room: {traineeRoom ?? '-'}
                    </Badge>
                  )}
                </div>
              </div>
              {role === 'admin' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoutClick}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="sm:max-w-sm animate-in zoom-in-95 fade-in-50">
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
    </>
  );
}