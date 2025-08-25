import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Download,
  Users,
  Clock,
  BarChart3,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Minimal Exam & Attempt types (adjust as needed)
type Exam = {
  id: string;
  title: string;
  description?: string;
  duration?: number;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

type ExamSubmission = {
  id: string;
  examId: string; // Changed to string to match how it's stored
  traineeId: string;
  traineeName: string;
  answers: Record<string, string>;
  submittedAt: Date;
  timeUsed: number;
};

type Attempt = {
  examId: string;
  examTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unansweredQuestions: number;
  percentage: number;
  status: 'pass' | 'fail';
  rating: string;
  submittedAt: Date;
  timeUsed: number;
};

type ResultsData = {
  exam: Exam;
  attempts: Attempt[];
};

// Function to fetch exams from Firestore
const fetchExams = async (): Promise<Exam[]> => {
  try {
    // Use simple query without orderBy to avoid index requirement
    const q = query(
      collection(db, "exams"),
      where("isActive", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Found exams:', querySnapshot.docs.length);
    
    const exams = querySnapshot.docs.map(doc => {
      const data = doc.data();
      console.log('Exam data:', { id: doc.id, title: data.title });
      return {
        id: doc.id,
        title: data.title || "Untitled Exam",
        description: data.description,
        duration: data.duration || 0,
        isActive: data.isActive || false,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      } as Exam;
    });
    
    // Sort manually by createdAt descending
    return exams.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  } catch (error) {
    console.error('Error fetching exams:', error);
    return [];
  }
};

// Function to fetch exam submissions from Firestore
const fetchAllExamSubmissions = async (traineeId: string): Promise<ExamSubmission[]> => {
  try {
    console.log('Fetching submissions for trainee:', traineeId);
    
    // First try to query by traineeId
    const q = query(
      collection(db, "examSubmissions"),
      where("traineeId", "==", traineeId)
    );
    
    const querySnapshot = await getDocs(q);
    console.log('Found submissions:', querySnapshot.docs.length);
    
    const submissions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        examId: data.examId || "",
        traineeId: data.traineeId || "",
        traineeName: data.traineeName || "Unknown",
        answers: data.answers || {},
        submittedAt: data.submittedAt?.toDate() || new Date(),
        timeUsed: data.timeUsed || 0,
      } as ExamSubmission;
    });
    
    // Sort manually by submittedAt descending
    return submissions.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
  } catch (error) {
    console.error('Error fetching submissions:', error);
    return [];
  }
};

// Calculate analysis using true answers from exam questions
const scoreSubmission = (
  answers: Record<string, string>,
  examQuestions: Array<{ id: string; correctAnswer?: string; questionType?: string }>
) => {
  const totalQuestions = examQuestions.length;
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unansweredQuestions = 0;

  const normalize = (val: string | undefined) => (val ?? "").trim().toLowerCase();

  examQuestions.forEach((q) => {
    const submitted = answers[q.id];
    if (!submitted || submitted.trim() === "") {
      unansweredQuestions++;
      return;
    }
    const sub = normalize(submitted);
    const cor = normalize(q.correctAnswer);

    // For true/false and yes/no, allow synonyms
    const isBooleanType = q.questionType === 'true_false' || cor === 'true' || cor === 'false' || cor === 'yes' || cor === 'no';
    const match = isBooleanType
      ? (sub === cor || (cor === 'true' && sub === 'yes') || (cor === 'false' && sub === 'no'))
      : sub === cor;

    if (match) correctAnswers++; else wrongAnswers++;
  });

  const percentage = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  const status: 'pass' | 'fail' = percentage >= 50 ? 'pass' : 'fail';
  let rating = '';
  if (percentage >= 90) rating = 'Excellent';
  else if (percentage >= 80) rating = 'Very Good';
  else if (percentage >= 70) rating = 'Good';
  else if (percentage >= 60) rating = 'Satisfactory';
  else if (percentage >= 50) rating = 'Pass';
  else rating = 'Fail';

  return { totalQuestions, correctAnswers, wrongAnswers, unansweredQuestions, percentage, status, rating };
};

export default function TraineeResultsCard() {
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState<string | null>(null);

  const traineeName = user?.displayName || user?.email || "Unknown";

  // Fetch exams
  const { data: exams = [] } = useQuery<Exam[]>({
    queryKey: ["exams"],
    queryFn: fetchExams,
  });

  // Fetch submissions for the current trainee
  const { data: submissions = [], isLoading: submissionsLoading } = useQuery<ExamSubmission[]>({
    queryKey: ["existing-submissions", user?.uid],
    queryFn: () => fetchAllExamSubmissions(user?.uid || ""),
    enabled: !!user?.uid,
  });

  // Create a map of exam submissions by exam ID
  const submissionsByExam = submissions.reduce((acc, submission) => {
    if (!acc[submission.examId]) {
      acc[submission.examId] = [];
    }
    acc[submission.examId].push(submission);
    return acc;
  }, {} as Record<string, ExamSubmission[]>);

  // Create attempts data for display
  // Fetch all questions once and group by examId
  const { data: allExamQuestions = [] } = useQuery<any[]>({
    queryKey: ["all-exam-questions-for-results"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "examQuestions"));
      return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const questionsByExam: Record<string, Array<{ id: string; correctAnswer?: string; questionType?: string }>> =
    allExamQuestions.reduce((acc, q: any) => {
      const examId = q.examId;
      if (!acc[examId]) acc[examId] = [];
      acc[examId].push({ id: q.id, correctAnswer: q.correctAnswer, questionType: q.questionType });
      return acc;
    }, {} as Record<string, Array<{ id: string; correctAnswer?: string; questionType?: string }>>);

  const attempts: Attempt[] = submissions.map(submission => {
    const exam = exams.find(e => e.id === submission.examId);
    const questions = questionsByExam[submission.examId] || [];
    const analysis = scoreSubmission(submission.answers, questions);

    return {
      examId: submission.examId,
      examTitle: exam?.title || "Unknown Exam",
      totalQuestions: analysis.totalQuestions,
      correctAnswers: analysis.correctAnswers,
      wrongAnswers: analysis.wrongAnswers,
      unansweredQuestions: analysis.unansweredQuestions,
      percentage: analysis.percentage,
      status: analysis.status,
      rating: analysis.rating,
      submittedAt: submission.submittedAt,
      timeUsed: submission.timeUsed,
    };
  });

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading user data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <BarChart3 className="w-8 h-8" />
            Exam Results
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            View your exam results and performance statistics
          </p>
        </div>
          </div>

      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Your Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          {submissionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading results...</p>
              </div>
            </div>
          ) : attempts.length === 0 ? (
            <div className="text-center py-8">
              <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No exam results found. Complete some exams to see your results here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Exam Title</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Time Used</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((attempt, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">
                        {attempt.examTitle}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold">{attempt.percentage}%</span>
                          <span className="text-sm text-gray-500">
                            ({attempt.correctAnswers}/{attempt.totalQuestions})
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={attempt.status === 'pass' ? 'default' : 'destructive'}
                          className={attempt.status === 'pass' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {attempt.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{attempt.rating}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-gray-500" />
                          <span>{formatTime(attempt.timeUsed)}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(attempt.submittedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
