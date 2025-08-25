import { Switch, Route, Router as WouterBase } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@exam/components/ui/toaster";
import { TooltipProvider } from "@exam/components/ui/tooltip";
import { ThemeProvider } from "@exam/contexts/ThemeContext";
import Home from "@exam/pages/home";
import AvailableExams from "@exam/pages/available-exams";
import ExamInterface from "@exam/pages/exam-interface";
import ExamSetup from "@exam/pages/exam-setup";
import Results from "@exam/pages/results";
import AllResults from "@exam/pages/all-results";
import ExamRecords from "@exam/pages/exam-records";
import VideoUpload from "@exam/pages/video-upload";
import FileUpload from "@exam/pages/file-upload";
import VideoDetails from "@exam/pages/video-details";
import FileDetails from "@exam/pages/file-details";
import NotFound from "@exam/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/setup" component={ExamSetup} />
      <Route path="/setup/:examId" component={ExamSetup} />
      <Route path="/exams" component={AvailableExams} />
      <Route path="/:examId/start" component={ExamInterface} />
      <Route path="/:examId" component={ExamInterface} />
      <Route path="/results" component={AllResults} />
      <Route path="/results/:examId" component={AllResults} />
      <Route path="/result/:attemptId" component={Results} />
      <Route path="/exam-records" component={ExamRecords} />
      <Route path="/student" component={AvailableExams} />
      <Route path="/videos" component={VideoUpload} />
      <Route path="/files" component={FileUpload} />
      <Route path="/video-details" component={VideoDetails} />
      <Route path="/file-details" component={FileDetails} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <WouterBase base="/exam">
      <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </WouterBase>
  );
}

export default App;
