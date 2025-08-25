import { useQuery } from "@tanstack/react-query";
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
  ArrowLeft,
  Calendar,
  Clock,
  Users,
  FileText,
  Home
} from "lucide-react";
import { useLocation } from "wouter";
import type { Exam } from "@shared/schema";
import CSSFarmsLoader from "@exam/components/ui/css-farms-loader";

export default function ExamRecords() {
  const [, navigate] = useLocation();

  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <CSSFarmsLoader size="lg" />
      </div>
    );
  }

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const getExamStatus = (exam: Exam) => {
    const now = new Date();
    const startTime = new Date(exam.startTime);
    const endTime = new Date(exam.endTime);

    if (!exam.isActive) {
      return { status: "Inactive", color: "bg-gray-500" };
    } else if (now < startTime) {
      return { status: "Upcoming", color: "bg-blue-500" };
    } else if (now >= startTime && now <= endTime) {
      return { status: "Active", color: "bg-green-500" };
    } else {
      return { status: "Expired", color: "bg-red-500" };
    }
  };

  const sortedExams = [...exams].sort((a, b) => 
    new Date(b.createdAt || b.startTime).getTime() - new Date(a.createdAt || a.startTime).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex gap-4 mb-4">
            <Button 
              variant="outline"
              onClick={() => navigate("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Exam Records</h1>
          <p className="text-slate-600">Complete history of all exams with details and status</p>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No Exam Records</h3>
              <p className="text-slate-500 text-center mb-6">
                No exams have been created yet. Create your first exam to see records here.
              </p>
              <Button 
                onClick={() => navigate("/setup")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Create First Exam
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                All Exam Records ({exams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exam Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Start Time</TableHead>
                      <TableHead>End Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExams.map((exam) => {
                      const { status, color } = getExamStatus(exam);
                      return (
                        <TableRow key={exam.id}>
                          <TableCell className="font-medium">
                            {exam.title}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={exam.description || undefined}>
                              {exam.description || "No description"}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-slate-500" />
                              {exam.duration} min
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <span className="text-sm">
                                {formatDateTime(exam.startTime)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4 text-slate-500" />
                              <span className="text-sm">
                                {formatDateTime(exam.endTime)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={`${color} text-white`}>
                              {status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {exam.createdAt ? formatDateTime(exam.createdAt) : "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/setup/${exam.id}`)}
                              >
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/results/${exam.id}`)}
                              >
                                Results
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}