import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Button } from "@exam/components/ui/button";
import { Badge } from "@exam/components/ui/badge";
import { 
  GraduationCap, 
  FileText, 
  CheckCircle, 
  TrendingUp, 
  Clock, 
  Calendar,
  Eye,
  User,
  LogOut
} from "lucide-react";
import { useAuth } from "@exam/hooks/useAuth";
import { useToast } from "@exam/hooks/use-toast";
import { apiRequest } from "@exam/lib/queryClient";
import { useLocation } from "wouter";
import type { Exam, ExamAttempt } from "@shared/schema";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: exams = [], isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: attempts = [], isLoading: attemptsLoading } = useQuery<ExamAttempt[]>({
    queryKey: ["/api/attempts"],
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.clear();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    },
  });

  const startExamMutation = useMutation({
    mutationFn: async (examId: number) => {
      const response = await apiRequest("POST", `/api/exams/${examId}/start`);
      return response.json();
    },
    onSuccess: (attempt, examId) => {
      navigate(`/exam/${examId}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to start exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const completedAttempts = attempts.filter((attempt: any) => attempt.isSubmitted);
  const averageScore = completedAttempts.length > 0 
    ? Math.round(completedAttempts.reduce((sum: number, attempt: any) => sum + (attempt.score || 0), 0) / completedAttempts.length)
    : 0;

  const handleStartExam = (examId: number) => {
    startExamMutation.mutate(examId);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (examsLoading || attemptsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="text-blue-600 text-2xl mr-3" />
              <span className="text-xl font-bold text-slate-800">EduTest</span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-slate-600">
                Welcome, {user?.firstName || user?.username}
              </div>
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="text-white text-sm" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="text-slate-600 hover:text-slate-900"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-slate-900">Student Dashboard</h1>
            <div className="flex items-center space-x-2 text-sm text-slate-500">
              <Clock className="w-4 h-4" />
              <span>Last updated: {new Date().toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="text-blue-600 text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Available Exams</p>
                    <p className="text-2xl font-bold text-slate-900">{exams.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="text-green-500 text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Completed</p>
                    <p className="text-2xl font-bold text-slate-900">{completedAttempts.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="text-yellow-500 text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Average Score</p>
                    <p className="text-2xl font-bold text-slate-900">{averageScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Available Exams */}
          <Card>
            <CardHeader>
              <CardTitle>Available Exams</CardTitle>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No exams available at the moment.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {exams.map((exam: any) => {
                    const now = new Date();
                    const startTime = new Date(exam.startTime);
                    const endTime = new Date(exam.endTime);
                    const isActive = exam.isActive && now >= startTime && now <= endTime;
                    const isUpcoming = now < startTime;
                    
                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-slate-900">{exam.title}</h3>
                          <div className="flex items-center space-x-4 mt-2 text-sm text-slate-600">
                            <span>
                              <Clock className="w-4 h-4 inline mr-1" />
                              {exam.duration} minutes
                            </span>
                            <span>
                              <Calendar className="w-4 h-4 inline mr-1" />
                              {formatDateTime(exam.startTime)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge variant={isActive ? "default" : isUpcoming ? "secondary" : "outline"}>
                            {isActive ? "Active" : isUpcoming ? "Scheduled" : "Ended"}
                          </Badge>
                          <Button
                            onClick={() => handleStartExam(exam.id)}
                            disabled={!isActive || startExamMutation.isPending}
                            className={`px-6 py-2 rounded-lg transition-colors ${
                              isActive
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-slate-300 text-slate-500 cursor-not-allowed"
                            }`}
                          >
                            {isActive ? "Start Exam" : "Not Available"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Results */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Results</CardTitle>
            </CardHeader>
            <CardContent>
              {completedAttempts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No completed exams yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {completedAttempts.slice(0, 5).map((attempt: any) => {
                    const percentage = Math.round((attempt.score / attempt.totalQuestions) * 100);
                    return (
                      <div
                        key={attempt.id}
                        className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                      >
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">Exam #{attempt.examId}</h4>
                          <p className="text-sm text-slate-600">
                            Completed {formatDateTime(attempt.submittedAt)}
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-lg font-bold text-green-500">
                              {attempt.score}/{attempt.totalQuestions}
                            </div>
                            <div className="text-sm text-slate-600">{percentage}%</div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/results/${attempt.id}`)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
