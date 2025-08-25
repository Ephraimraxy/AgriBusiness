import { useAuth } from "@/contexts/AuthContext";
import { signOutUser } from "@/lib/firebaseAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Users, GraduationCap, Building, LogOut, UserCheck } from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const handleSignOut = async () => {
    await signOutUser();
    setLocation("/original/home");
  };

  if (!user) {
    setLocation("/original/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="text-2xl text-primary mr-3" size={32} />
              <h1 className="text-xl font-semibold text-foreground">Training Management Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-muted-foreground">Welcome, {user.displayName || user.email}</span>
              <Button onClick={handleSignOut} variant="outline" size="sm">
                <LogOut className="mr-2" size={16} />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">Dashboard Overview</h2>
          <p className="text-muted-foreground">Manage your training system efficiently</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/original/view-trainees")}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center">
                <Users className="mr-2 text-primary" size={24} />
                View Trainees
              </CardTitle>
              <CardDescription>Manage registered trainees and their details</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Access trainee records, room assignments, and progress tracking</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/original/registration")}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center">
                <GraduationCap className="mr-2 text-secondary-foreground" size={24} />
                Registration
              </CardTitle>
              <CardDescription>Register new users in the system</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Add trainees, staff, and resource persons to the platform</p>
            </CardContent>
          </Card>

                          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/staff-dashboard")}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2 text-blue-600" size={24} />
                Staff Dashboard
              </CardTitle>
              <CardDescription>Access staff management functions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Manage staff registrations, trainees, and administrative tasks</p>
            </CardContent>
          </Card>

                          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/resource-person-dashboard")}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center">
                <UserCheck className="mr-2 text-amber-600" size={24} />
                Resource Person Dashboard
              </CardTitle>
              <CardDescription>Access resource person functions</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Manage resource person activities and training functions</p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/original/sponsors")}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center">
                <Building className="mr-2 text-accent-foreground" size={24} />
                Sponsors
              </CardTitle>
              <CardDescription>Manage sponsor organizations</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Track and manage sponsor information and relationships</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}