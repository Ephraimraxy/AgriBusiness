import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Clock,
  FileText,
  Calendar,
  ArrowLeft,
  User,
  Mail,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useLocation } from "wouter";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
type Exam = {
  id: number;
  title: string;
  description?: string;
  duration: number;
  startTime: string | Date;
  endTime: string | Date;
  instructions?: string;
  isActive: boolean;
};

export default function Exams() {
  const [location, navigate] = useLocation();
  const queryClient = useQueryClient();

  // allow sidebar navigation
  const handleNavChange = (item: string) => {
    switch (item) {
      case "videos":
        navigate("/trainee-dashboard?videos=1");
        break;
      case "materials":
        navigate("/trainee-dashboard?materials=1");
        break;
      case "take-exam":
        navigate("/trainee-dashboard?exam=1");
        break;
      case "results":
        navigate("/trainee-dashboard?results=1");
        break;
      default:
        navigate("/trainee-dashboard");
    }
  };
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  
  // Fetch questions state
  const [showFetchDialog, setShowFetchDialog] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [fetchStatus, setFetchStatus] = useState("");
  const [fetchResult, setFetchResult] = useState<{
    success: boolean;
    message: string;
    questionsCount?: number;
  } | null>(null);

  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams/available"],
  });

  // Fetch questions mutation
  const fetchQuestionsMutation = useMutation({
    mutationFn: async () => {
      setFetchProgress(0);
      setFetchStatus("Initializing...");
      
      // Simulate progress steps
      const steps = [
        { progress: 10, status: "Connecting to database..." },
        { progress: 30, status: "Fetching exam data..." },
        { progress: 50, status: "Retrieving questions..." },
        { progress: 70, status: "Processing question data..." },
        { progress: 90, status: "Finalizing..." },
        { progress: 100, status: "Complete!" }
      ];

      for (let i = 0; i < steps.length; i++) {
        setFetchProgress(steps[i].progress);
        setFetchStatus(steps[i].status);
        await new Promise(resolve => setTimeout(resolve, 800)); // 800ms delay between steps
      }

      // Actually fetch questions from all exams
      const allQuestions = [];
      for (const exam of exams) {
        try {
          const response = await fetch(`/api/exams/${exam.id}/questions/public`);
          if (response.ok) {
            const questions = await response.json();
            allQuestions.push(...questions);
          }
        } catch (error) {
          console.error(`Failed to fetch questions for exam ${exam.id}:`, error);
        }
      }

      return allQuestions;
    },
    onSuccess: (questions) => {
      setFetchResult({
        success: true,
        message: `Successfully fetched ${questions.length} questions from ${exams.length} exams!`,
        questionsCount: questions.length
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/exams/available"] });
      
      // Auto-hide dialog after 3 seconds
      setTimeout(() => {
        setShowFetchDialog(false);
        setFetchResult(null);
        setFetchProgress(0);
        setFetchStatus("");
      }, 3000);
    },
    onError: (error) => {
      setFetchResult({
        success: false,
        message: `Failed to fetch questions: ${error.message || 'Unknown error occurred'}`
      });
      
      // Auto-hide dialog after 5 seconds on error
      setTimeout(() => {
        setShowFetchDialog(false);
        setFetchResult(null);
        setFetchProgress(0);
        setFetchStatus("");
      }, 5000);
    }
  });

  const handleFetchQuestions = () => {
    setShowFetchDialog(true);
    setFetchResult(null);
    fetchQuestionsMutation.mutate();
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const handleStartExam = () => {
    if (!selectedExam || !studentName.trim() || !studentEmail.trim()) {
      return;
    }
    localStorage.setItem(
      "studentInfo",
      JSON.stringify({ name: studentName, email: studentEmail })
    );
    navigate(`/exam/${selectedExam.id}/start`);
  };

  // Layout wrapper
  const Content = () => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (selectedExam) {
      return (
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-4 mb-6">
              <Button variant="ghost" onClick={() => setSelectedExam(null)}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Exams
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/trainee-dashboard?exam=1")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>{selectedExam.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="studentName">Student Name *</Label>
                    <Input
                      id="studentName"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter your full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="studentEmail">Student Email *</Label>
                    <Input
                      id="studentEmail"
                      type="email"
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="Enter your email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold">Exam Details:</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Duration:</span>
                        <span className="ml-2 font-medium">
                          {selectedExam.duration} minutes
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Start Time:</span>
                        <span className="ml-2 font-medium">
                          {formatDateTime(selectedExam.startTime)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">End Time:</span>
                        <span className="ml-2 font-medium">
                          {formatDateTime(selectedExam.endTime)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status:</span>
                        <Badge
                          variant={selectedExam.isActive ? "default" : "secondary"}
                          className="ml-2"
                        >
                          {selectedExam.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {selectedExam.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description:</h3>
                      <p className="text-gray-600">{selectedExam.description}</p>
                    </div>
                  )}
                  <Button
                    onClick={handleStartExam}
                    disabled={!selectedExam.isActive || !studentName.trim() || !studentEmail.trim()}
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start Exam
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // List view
    return (
      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                Available Exams
              </h1>
              <p className="text-slate-600 mt-2">
                Select an exam to start taking it
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={handleFetchQuestions}
                variant="outline"
                className="flex items-center gap-2"
                disabled={fetchQuestionsMutation.isPending}
              >
                <RefreshCw className={`w-4 h-4 ${fetchQuestionsMutation.isPending ? 'animate-spin' : ''}`} />
                Fetch Questions
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/trainee-dashboard?exam=1")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
              </Button>
            </div>
          </div>

          {exams.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  No exams available
                </h3>
                <p className="text-slate-600">
                  There are currently no active exams to take.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle className="text-lg">{exam.title}</CardTitle>
                    {exam.description && (
                      <p className="text-sm text-slate-600">{exam.description}</p>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Duration:</span>
                        <span className="font-medium">
                          {exam.duration} minutes
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Start:</span>
                        <span className="font-medium">
                          {formatDateTime(exam.startTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">End:</span>
                        <span className="font-medium">
                          {formatDateTime(exam.endTime)}
                        </span>
                      </div>
                    </div>
                    <Button
                      onClick={() => setSelectedExam(exam)}
                      disabled={!exam.isActive}
                      className="w-full"
                    >
                      {exam.isActive ? "Take Exam" : "Not Available"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar activeItem="take-exam" onItemChange={handleNavChange} />
        <main className="flex-1">
          <Content />
        </main>
      </div>

      {/* Fetch Questions Progress Dialog */}
      <Dialog open={showFetchDialog} onOpenChange={setShowFetchDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className={`w-5 h-5 ${fetchQuestionsMutation.isPending ? 'animate-spin' : ''}`} />
              Fetching Questions
            </DialogTitle>
            <DialogDescription>
              {fetchResult ? (
                <div className="flex items-center gap-2 mt-2">
                  {fetchResult.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={fetchResult.success ? "text-green-700" : "text-red-700"}>
                    {fetchResult.message}
                  </span>
                </div>
              ) : (
                <div className="space-y-4 mt-4">
                  <div className="flex items-center justify-between text-sm">
                    <span>{fetchStatus}</span>
                    <span>{fetchProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${fetchProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
