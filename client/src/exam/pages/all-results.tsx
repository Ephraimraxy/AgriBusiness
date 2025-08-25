import { useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@exam/components/ui/select";
import { 
  Download, 
  ArrowLeft,
  BarChart3,
  FileText,
  Users,
  Clock,
  Home
} from "lucide-react";
import { useLocation } from "wouter";
import type { Exam, ExamAttempt } from "@shared/schema";

interface AttemptWithStudent extends ExamAttempt {
  studentName: string;
  studentEmail: string;
  percentage: number;
}

interface ResultsData {
  exam: Exam;
  attempts: AttemptWithStudent[];
}

export default function AllResults() {
  const [, navigate] = useLocation();
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  
  // Get examId from URL params if coming from exam records
  const urlParts = window.location.pathname.split('/');
  const examIdFromUrl = urlParts[2]; // /results/:examId
  
  // Use URL exam ID if present, otherwise use selected exam ID
  const effectiveExamId = examIdFromUrl || selectedExamId;

  const { data: exams = [], isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ResultsData>({
    queryKey: ["/api/results", effectiveExamId],
    enabled: !!effectiveExamId,
  });

  const handleExportCSV = () => {
    if (!results) return;

    const csvData = [
      ["Student Name", "Email", "Score", "Total Questions", "Percentage", "Start Time", "Submit Time", "Duration Taken"],
      ...results.attempts.map(attempt => [
        attempt.studentName,
        attempt.studentEmail,
        attempt.score?.toString() || "0",
        attempt.totalQuestions?.toString() || "0",
        `${attempt.percentage}%`,
        new Date(attempt.startedAt).toLocaleString(),
        attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "Not submitted",
        attempt.submittedAt 
          ? `${Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000)} minutes`
          : "Incomplete"
      ])
    ];

    const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${results.exam.title}_results.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return "bg-green-100 text-green-800";
    if (percentage >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const formatDuration = (startTime: string | Date, endTime: string | Date | null) => {
    if (!endTime) return "Incomplete";
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    return `${Math.round(duration / 60000)} minutes`;
  };

  if (examsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Exam Results</h1>
            <p className="text-slate-600 mt-2">View and export student performance data</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {!examIdFromUrl && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Select Exam</CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                  <SelectTrigger className="w-full md:w-96">
                    <SelectValue placeholder="Choose an exam to view results" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>
        )}

        {effectiveExamId && (
          <>
            {resultsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : results ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-slate-600">Exam</p>
                          <p className="text-2xl font-bold text-slate-900">{results.exam.title}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Users className="w-8 h-8 text-green-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-slate-600">Total Attempts</p>
                          <p className="text-2xl font-bold text-slate-900">{results.attempts?.length || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <BarChart3 className="w-8 h-8 text-purple-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-slate-600">Average Score</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {results.attempts && results.attempts.length > 0
                              ? Math.round(results.attempts.reduce((sum, attempt) => sum + (attempt.percentage || 0), 0) / results.attempts.length)
                              : 0}%
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <Clock className="w-8 h-8 text-orange-600" />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-slate-600">Duration</p>
                          <p className="text-2xl font-bold text-slate-900">{results.exam.duration}m</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Results Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Student Results</CardTitle>
                      {results.attempts && results.attempts.length > 0 && (
                        <Button onClick={handleExportCSV} variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export CSV
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!results.attempts || results.attempts.length === 0 ? (
                      <div className="text-center py-16">
                        <Users className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">No attempts yet</h3>
                        <p className="text-slate-600">No students have taken this exam yet.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Student Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Score</TableHead>
                              <TableHead>Percentage</TableHead>
                              <TableHead>Duration</TableHead>
                              <TableHead>Submitted At</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {results.attempts.map((attempt, index) => (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{attempt.studentName}</TableCell>
                                <TableCell>{attempt.studentEmail}</TableCell>
                                <TableCell>
                                  {attempt.score || 0}/{attempt.totalQuestions || 0}
                                </TableCell>
                                <TableCell>
                                  <Badge className={getGradeColor(attempt.percentage || 0)}>
                                    {attempt.percentage || 0}%
                                  </Badge>
                                </TableCell>
                                <TableCell>{formatDuration(attempt.startedAt, attempt.submittedAt)}</TableCell>
                                <TableCell>
                                  {attempt.submittedAt 
                                    ? new Date(attempt.submittedAt).toLocaleString()
                                    : "In progress"
                                  }
                                </TableCell>
                                <TableCell>
                                  <Badge variant={attempt.isSubmitted ? "default" : "secondary"}>
                                    {attempt.isSubmitted ? "Completed" : "In Progress"}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <p className="text-slate-600">No results found for this exam.</p>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}