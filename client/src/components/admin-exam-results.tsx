import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, ArrowLeft, Users } from "lucide-react";
import { 
  getCBTExams, 
  getCBTExamAttempts, 
  CBTExam, 
  CBTExamAttempt 
} from "@/lib/cbtService";

// Use Firebase types
type Exam = CBTExam;

interface AttemptWithStudent {
  studentName: string;
  studentEmail: string;
  percentage: number;
  score?: number;
  totalQuestions?: number;
  startedAt: string | Date;
  submittedAt?: string | Date | null;
  isSubmitted?: boolean;
}

interface ResultsData {
  exam: Exam;
  attempts: AttemptWithStudent[];
}

interface AdminExamResultsProps {
  onBack?: () => void;
  embedded?: boolean;
}

export default function AdminExamResults({ onBack, embedded = true }: AdminExamResultsProps) {
  const [selectedExamId, setSelectedExamId] = useState<string>("");

  // Get examId from URL params if linked directly (rare for admin flow)
  const urlParts = typeof window !== "undefined" ? window.location.pathname.split("/") : [];
  const examIdFromUrl = urlParts.length > 2 ? urlParts[2] : ""; // e.g. /results/:examId

  // Use URL exam ID if present, otherwise the selected exam ID from dropdown
  const effectiveExamId = examIdFromUrl || selectedExamId;

  const { data: exams = [], isLoading: examsLoading } = useQuery<Exam[]>({
    queryKey: ["cbt-exams"],
    queryFn: () => getCBTExams(),
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ResultsData>({
    queryKey: ["cbt-exam-results", effectiveExamId],
    queryFn: async () => {
      if (!effectiveExamId) return null;
      
      // Get the exam
      const exam = exams.find(e => e.id === effectiveExamId);
      if (!exam) return null;
      
      // Get all attempts for this exam
      const allAttempts = await getCBTExamAttempts();
      const examAttempts = allAttempts.filter(attempt => attempt.examId === effectiveExamId);
      
      // Transform attempts to include student info
      const attemptsWithStudent: AttemptWithStudent[] = examAttempts.map(attempt => ({
        studentName: attempt.traineeName || "Unknown Student",
        studentEmail: attempt.traineeEmail || "unknown@example.com",
        percentage: attempt.score ? Math.round((attempt.score / attempt.totalQuestions) * 100) : 0,
        score: attempt.score || 0,
        totalQuestions: attempt.totalQuestions || 0,
        startedAt: attempt.startTime,
        submittedAt: attempt.endTime,
        isSubmitted: attempt.status === 'completed',
      }));
      
      return {
        exam,
        attempts: attemptsWithStudent,
      };
    },
    enabled: !!effectiveExamId && exams.length > 0,
  });

  const handleExportCSV = () => {
    if (!results) return;

    const csvData = [
      [
        "Student Name",
        "Email",
        "Score",
        "Total Questions",
        "Percentage",
        "Start Time",
        "Submit Time",
        "Duration Taken",
      ],
      ...results.attempts.map((attempt) => [
        attempt.studentName,
        attempt.studentEmail,
        attempt.score?.toString() || "0",
        attempt.totalQuestions?.toString() || "0",
        `${attempt.percentage}%`,
        new Date(attempt.startedAt).toLocaleString(),
        attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "Not submitted",
        attempt.submittedAt
          ? `${Math.round(
              (new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000,
            )} minutes`
          : "Incomplete",
      ]),
    ];

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
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

  const formatDuration = (startTime: string | Date, endTime?: string | Date | null) => {
    if (!endTime) return "Incomplete";
    const duration = new Date(endTime).getTime() - new Date(startTime).getTime();
    return `${Math.round(duration / 60000)} minutes`;
  };

  if (examsLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 p-6"}>
      <div className="max-w-7xl mx-auto">
        {/* header with back button */}
        <div className="flex items-center justify-between mb-8">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          )}
          <h1 className="text-3xl font-bold text-slate-900">Exam Results</h1>
        </div>

        {/* Exam selector */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Select Exam</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={effectiveExamId} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-full md:w-1/2 lg:w-1/3">
                <SelectValue placeholder="Choose an exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam) => (
                  <SelectItem value={exam.id} key={exam.id}>
                    {exam.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {resultsLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
          </div>
        ) : !results ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-slate-600">No results found for the selected exam.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary & Export */}
            <Card className="mb-8">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-2xl">{results.exam.title}</CardTitle>
                  {results.attempts.length > 0 && (
                    <Button onClick={handleExportCSV} variant="outline">
                      <Download className="w-4 h-4 mr-2" /> Export CSV
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">
                  {results.attempts.length} attempt{results.attempts.length !== 1 ? "s" : ""} so far
                </p>
              </CardContent>
            </Card>

            {/* Results Table */}
            <Card>
              <CardHeader>
                <CardTitle>Student Results</CardTitle>
              </CardHeader>
              <CardContent>
                {results.attempts.length === 0 ? (
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
                              {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString() : "In progress"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={attempt.isSubmitted ? "default" : "secondary"}>
                                {attempt.submittedAt ? "Completed" : "In Progress"}
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
        )}
      </div>
    </div>
  );
}
