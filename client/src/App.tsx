import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { useGlobalLoading } from "@/hooks/useGlobalLoading";
import CSSFarmsLoader from "@/components/ui/css-farms-loader";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Register from "@/pages/register";
import TraineeDashboard from "@/pages/trainee-dashboard";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminLogin from "@/pages/admin-login";
import VideoDetails from "@/pages/video-details";
import FileDetails from "@/pages/file-details";
import Exams from "@/pages/exams";
import Results from "@/pages/results";
import ViewTraineesAdvanced from "@/pages/view-trainees-advanced";
import ForgotPasswordPage from "@/pages/forgot-password";

// Original App imports
import OriginalMain from "@/pages/original-main";
import OriginalHome from "@/pages/original/home";
import OriginalDashboard from "@/pages/original/dashboard";
import OriginalLogin from "@/pages/original/login";
import OriginalRegistration from "@/pages/original/registration";
import OriginalTraineeRegistration from "@/pages/original/trainee-registration";
import OriginalStaffRegistration from "@/pages/staff-registration";
import OriginalResourcePersonRegistration from "@/pages/resource-person-registration";
import OriginalViewTrainees from "@/pages/original/view-trainees";
import OriginalViewTraineesNew from "@/pages/original/view-trainees-new";
import OriginalCertificateGeneration from "@/pages/original/certificate-generation";
import OriginalStaffIdGeneration from "@/pages/staff-id-generation";
import OriginalResourcePersonIdGeneration from "@/pages/resource-person-id-generation";
import OriginalResortManagement from "@/pages/original/resort-management";
import OriginalEvaluationSetup from "@/pages/original/evaluation-setup";
import OriginalEvaluationResults from "@/pages/original/evaluation-results";
import OriginalSponsors from "@/pages/original/sponsors";
import OriginalVerificationLogin from "@/pages/original/verification-login";
import OriginalThemeDemo from "@/pages/original/theme-demo";
import OriginalResourcePersonDashboard from "@/pages/resource-person-dashboard";
import OriginalStaffDashboard from "@/pages/staff-dashboard";
import OriginalStaffLogin from "@/pages/staff-login";
import OriginalRpLogin from "@/pages/rp-login";

import ExamApp from "@exam/App";

// Protected Route Component
function ProtectedRoute({ component: Component, ...props }: any) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CSSFarmsLoader size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <Component {...props} />;
}

function Router() {
  const { isLoading } = useAuth();
  useGlobalLoading(); // Hook to detect React Query loading states

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <CSSFarmsLoader size="lg" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/register" component={Register} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route path="/admin-dashboard" component={AdminDashboard} />
      <Route path="/hoseaephraim-Princesali@1" component={AdminLogin} />
      <Route path="/admin/view-trainees" component={ViewTraineesAdvanced} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      
      {/* Protected Routes - Always registered but protected at component level */}
      <Route path="/home" component={(props: any) => <ProtectedRoute component={Home} {...props} />} />
      <Route path="/trainee-dashboard" component={(props: any) => <ProtectedRoute component={TraineeDashboard} {...props} />} />
      <Route path="/trainee-dashboard/video-details" component={(props: any) => <ProtectedRoute component={VideoDetails} {...props} />} />
      <Route path="/trainee-dashboard/file-details" component={(props: any) => <ProtectedRoute component={FileDetails} {...props} />} />
      <Route path="/trainee-dashboard/exams" component={(props: any) => <ProtectedRoute component={Exams} {...props} />} />
      <Route path="/trainee-dashboard/results" component={(props: any) => <ProtectedRoute component={Results} {...props} />} />

      <Route path="/exam" component={ExamApp} />
      <Route path="/exam/*" component={ExamApp} />
      
      {/* Original App Routes */}
      <Route path="/original" component={OriginalMain} />
      <Route path="/original/home" component={OriginalHome} />
      <Route path="/original/dashboard" component={OriginalDashboard} />
      <Route path="/original/login" component={OriginalLogin} />
      <Route path="/original/registration" component={OriginalRegistration} />
      <Route path="/original/trainee-registration" component={OriginalTraineeRegistration} />
              <Route path="/staff-registration" component={OriginalStaffRegistration} />
              <Route path="/resource-person-registration" component={OriginalResourcePersonRegistration} />
      <Route path="/original/view-trainees" component={OriginalViewTrainees} />
      <Route path="/original/view-trainees-new" component={OriginalViewTraineesNew} />
      <Route path="/original/certificate-generation" component={OriginalCertificateGeneration} />
              <Route path="/staff-id-generation" component={OriginalStaffIdGeneration} />
              <Route path="/resource-person-id-generation" component={OriginalResourcePersonIdGeneration} />
      <Route path="/original/resort-management" component={OriginalResortManagement} />
      <Route path="/original/evaluation-setup" component={OriginalEvaluationSetup} />
      <Route path="/original/evaluation-results" component={OriginalEvaluationResults} />
      <Route path="/original/sponsors" component={OriginalSponsors} />
      <Route path="/original/verification-login" component={OriginalVerificationLogin} />
      <Route path="/original/theme-demo" component={OriginalThemeDemo} />
              <Route path="/resource-person-dashboard" component={OriginalResourcePersonDashboard} />
              <Route path="/staff-dashboard" component={OriginalStaffDashboard} />
              <Route path="/staff-login" component={OriginalStaffLogin} />
              <Route path="/rp-login" component={OriginalRpLogin} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoadingProvider>
        <TooltipProvider>
          <Toaster />
          {/* Global background - light mode only */}
          <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-green-100">
            <Router />
          </div>
        </TooltipProvider>
      </LoadingProvider>
    </QueryClientProvider>
  );
}

export default App;