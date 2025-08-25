import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Button } from "@exam/components/ui/button";
import { Badge } from "@exam/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@exam/components/ui/table";
import {
  GraduationCap,
  FileText,
  Users,
  Clock,
  BarChart3,
  Plus,
  Download,
  Edit,
  Trash2,
  Eye,
  User,
  LogOut,
} from "lucide-react";
import { useAuth } from "@exam/hooks/useAuth";
import { useToast } from "@exam/hooks/use-toast";
import { apiRequest } from "@exam/lib/queryClient";
import { useLocation } from "wouter";
import type { Exam } from "@shared/schema";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();

  const { data: exams = [], isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
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

  const deleteExamMutation = useMutation({
    mutationFn: async (examId: number) => {
      await apiRequest("DELETE", `/api/exams/${examId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Exam deleted",
        description: "The exam has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleDeleteExam = (examId: number) => {
    if (window.confirm("Are you sure you want to delete this exam?")) {
      deleteExamMutation.mutate(examId);
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getExamStatus = (exam: any) => {
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (!exam.isActive) return "Inactive";
    if (now < startTime) return "Scheduled";
    if (now >= startTime && now <= endTime) return "Active";
    return "Ended";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-500";
      case "Scheduled":
        return "bg-blue-500";
      case "Ended":
        return "bg-slate-500";
      default:
        return "bg-slate-400";
    }
  };

  if (examsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activeExams = exams.filter((exam: any) => getExamStatus(exam) === "Active").length;
  const totalExams = exams.length;

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
            <h1 className="text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => navigate("/admin/exams/new")}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Exam
              </Button>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            </div>
          </div>

          {/* Admin Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="text-blue-600 text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Total Exams</p>
                    <p className="text-2xl font-bold text-slate-900">{totalExams}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="text-green-500 text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Active Students</p>
                    <p className="text-2xl font-bold text-slate-900">-</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="text-yellow-500 text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Active Exams</p>
                    <p className="text-2xl font-bold text-slate-900">{activeExams}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <BarChart3 className="text-red-500 text-2xl" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-600">Avg. Score</p>
                    <p className="text-2xl font-bold text-slate-900">-</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Exam Management */}
          <Card>
            <CardHeader>
              <CardTitle>Manage Exams</CardTitle>
            </CardHeader>
            <CardContent>
              {exams.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-500">No exams created yet.</p>
                  <Button
                    onClick={() => navigate("/admin/exams/new")}
                    className="mt-4 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Exam
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Exam Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Start Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exams.map((exam: any) => {
                        const status = getExamStatus(exam);
                        return (
                          <TableRow key={exam.id} className="hover:bg-slate-50">
                            <TableCell>
                              <div>
                                <div className="font-medium text-slate-900">{exam.title}</div>
                                <div className="text-sm text-slate-500">{exam.description}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(status)} text-white`}>
                                {status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-slate-900">
                              {formatDateTime(exam.startTime)}
                            </TableCell>
                            <TableCell className="text-sm text-slate-900">
                              {exam.duration} min
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/exams/${exam.id}/edit`)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => navigate(`/admin/exams/${exam.id}/results`)}
                                  className="text-slate-400 hover:text-slate-600"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteExam(exam.id)}
                                  className="text-red-500 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
