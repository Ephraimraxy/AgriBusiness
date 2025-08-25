import { useState, useEffect, useRef, useCallback } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  BookOpen, 
  Clock, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Play,
  Calendar,
  Users,
  Award,
  Eye,
  EyeOff,
  HelpCircle
} from "lucide-react";


// Types for our data
interface Exam {
  id: string;
  title: string;
  description?: string;
  duration: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ExamQuestion {
  id: string;
  examId: string;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'fill_blank';
  options?: string[];
  correctAnswer: string;
  points: number;
  orderIndex: number;
}

export default function TraineeExamCard() {
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [showQuestions, setShowQuestions] = useState(false);
  const [fetchProgress, setFetchProgress] = useState(0);
  const [isFetching, setIsFetching] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [examMode, setExamMode] = useState<'preview' | 'taking' | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [submittedExams, setSubmittedExams] = useState<Set<string>>(new Set());
  const [showMetadataModal, setShowMetadataModal] = useState(false);
  const [examToStart, setExamToStart] = useState<Exam | null>(null);

  // Monitor network status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch available exams
  const { data: exams = [], isLoading: examsLoading, error: examsError } = useQuery<Exam[]>({
    queryKey: ["available-exams"],
    queryFn: async () => {
      const examsQuery = query(collection(db, "exams"), where("isActive", "==", true));
      const snapshot = await getDocs(examsQuery);
      return snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Exam[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3, // Retry 3 times
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  // Fetch questions for selected exam
  const { data: questions = [], isLoading: questionsLoading } = useQuery<ExamQuestion[]>({
    queryKey: ["exam-questions", selectedExam?.id],
    queryFn: async () => {
      if (!selectedExam) return [];
      const qSnap = await getDocs(query(collection(db, "examQuestions"), where("examId", "==", selectedExam.id)));
      return qSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ExamQuestion[];
    },
    enabled: !!selectedExam && showQuestions,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch all questions for all exams to calculate totals
  const { data: allQuestions = [] } = useQuery<ExamQuestion[]>({
    queryKey: ["all-exam-questions"],
    queryFn: async () => {
      const qSnap = await getDocs(collection(db, "examQuestions"));
      return qSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ExamQuestion[];
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch existing submissions to prevent retaking
  const { data: existingSubmissions = [], isLoading: submissionsLoading } = useQuery({
    queryKey: ["existing-submissions", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      
      const q = query(
        collection(db, "examSubmissions"),
        where("traineeId", "==", user.uid)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data());
    },
    onSuccess: (data) => {
      console.log('Fetched submissions:', data);
      console.log('Current user UID:', user?.uid);
      const submittedExamIds = new Set(data.map(sub => sub.examId));
      console.log('Setting submitted exams:', Array.from(submittedExamIds));
      setSubmittedExams(submittedExamIds);
      
      // Also save to localStorage for persistence
      const storageKey = `submittedExams_${user?.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(submittedExamIds)));
      console.log('Saved to localStorage with key:', storageKey, 'data:', Array.from(submittedExamIds));
    },
    staleTime: 0, // Always fetch fresh data
    refetchOnWindowFocus: true,
    enabled: !!user, // Only fetch when user is available
  });

  // Load submitted exams from localStorage on component mount
  useEffect(() => {
    if (!user) {
      setSubmittedExams(new Set());
      return;
    }
    
    const storageKey = `submittedExams_${user.uid}`;
    console.log('Loading from localStorage with key:', storageKey);
    const savedSubmittedExams = localStorage.getItem(storageKey);
    if (savedSubmittedExams) {
      try {
        const examIds = JSON.parse(savedSubmittedExams);
        console.log('Loading from localStorage:', examIds);
        setSubmittedExams(new Set(examIds));
      } catch (error) {
        console.error('Error parsing saved submitted exams:', error);
      }
    } else {
      console.log('No saved submissions found in localStorage for key:', storageKey);
      setSubmittedExams(new Set());
    }
  }, [user]);

  // Fetch questions with progress animation
  const fetchQuestionsMutation = useMutation({
    mutationFn: async (exam: Exam) => {
      setIsFetching(true);
      setFetchProgress(0);
      
      // Simulate progress steps
      const steps = [
        { progress: 20, delay: 300 },
        { progress: 40, delay: 300 },
        { progress: 60, delay: 300 },
        { progress: 80, delay: 300 },
        { progress: 100, delay: 300 }
      ];

      for (const step of steps) {
        setFetchProgress(step.progress);
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }

      try {
        const response = await fetch(`/api/exams/${exam.id}/questions/public`);
        if (!response.ok) {
          if (response.status === 500) {
            throw new Error('Database connection issue. Please check your internet connection and try again.');
          }
          throw new Error(`Failed to fetch questions: ${response.status} ${response.statusText}`);
        }
        return response.json();
      } catch (error: any) {
        if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('Network error. Please check your internet connection and try again.');
        }
        throw error;
      }
    },
    onSuccess: (questions, exam) => {
      setSelectedExam(exam);
      setShowQuestions(true);
      setIsFetching(false);
      setFetchProgress(0);
    },
    onError: (error: any) => {
      console.error('Failed to fetch questions:', error);
      setIsFetching(false);
      setFetchProgress(0);
      // Show error message to user
      toast({
        title: "Failed to Fetch Questions",
        description: error.message || "An error occurred while fetching exam questions. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleFetchQuestions = (exam: Exam) => {
    setSelectedExam(exam);
    setExamMode('preview');
    setShowQuestions(true);
  };

    const handleStartExam = (exam: Exam) => {
    // Ensure submissions are loaded before proceeding
    if (submissionsLoading) {
      toast({
        title: "Please Wait",
        description: "Loading your exam history. Please try again in a moment.",
        variant: "destructive",
      });
      return;
    }

    // Check if exam has already been submitted
    if (submittedExams.has(exam.id)) {
      toast({
        title: "Exam Already Completed",
        description: "You have already submitted this exam. You cannot retake it.",
        variant: "destructive",
      });
      return;
    }

    // Show metadata modal first
    setExamToStart(exam);
    setShowMetadataModal(true);
  };

  const handleConfirmStartExam = () => {
    if (!examToStart) return;
    
    setSelectedExam(examToStart);
    setExamMode('taking');
    setShowQuestions(true);
    setTimeLeft(examToStart.duration * 60); // minutes to seconds
    setCurrentIndex(0);
    setShowMetadataModal(false);
    setExamToStart(null);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'fill_blank': return 'Fill in the Blank';
      default: return type;
    }
  };

  const getTotalPoints = (questions: ExamQuestion[]) => {
    return questions.reduce((total, q) => total + q.points, 0);
  };

  // Function to get total questions across all exams
  const getTotalQuestions = () => {
    if (allQuestions.length > 0) {
      return allQuestions.length;
    }
    return 0;
  };

  /** Exam submission and timer **/
  const handleSubmitExam = useCallback(async () => {
    if (!selectedExam) return;
    
    // Check if already submitted
    if (submittedExams.has(selectedExam.id)) {
      toast({
        title: "Exam Already Submitted",
        description: "You have already submitted this exam. You cannot retake it.",
        variant: "destructive",
      });
      return;
    }

    try {
      const submissionData = {
        examId: selectedExam.id,
        traineeId: user?.uid ?? "anonymous",
        traineeName: user?.displayName ?? user?.email ?? "anonymous",
        answers,
        submittedAt: new Date(),
        timeUsed: selectedExam.duration * 60 - timeLeft
      };
      
      console.log('Saving exam submission with data:', submissionData);
      console.log('Current user UID:', user?.uid);
      
      await addDoc(collection(db, "examSubmissions"), submissionData);

      // Add to submitted exams set and localStorage
      const newSubmittedExams = new Set([...submittedExams, selectedExam.id]);
      setSubmittedExams(newSubmittedExams);
      const storageKey = `submittedExams_${user?.uid}`;
      localStorage.setItem(storageKey, JSON.stringify(Array.from(newSubmittedExams)));

      // Invalidate the existing submissions query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["existing-submissions", user?.uid] });

      toast({
        title: "Exam Submitted Successfully!",
        description: "Your exam has been submitted and recorded.",
      });
    } catch (err) {
      console.error("Failed to save submission", err);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your exam. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setExamMode(null);
    setShowQuestions(false);
    setSelectedExam(null);
    setAnswers({});
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [selectedExam, submittedExams, user?.uid, queryClient]);

  useEffect(() => {
    if (examMode === 'taking') {
      if (timeLeft <= 0) {
        handleSubmitExam();
        return;
      }
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [examMode, timeLeft, handleSubmitExam]);

  // Auto-submit when user leaves the page
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examMode === 'taking' && selectedExam && !submittedExams.has(selectedExam.id)) {
        e.preventDefault();
        e.returnValue = '';
        handleSubmitExam();
      }
    };

    const handleVisibilityChange = () => {
      if (examMode === 'taking' && selectedExam && !submittedExams.has(selectedExam.id) && document.hidden) {
        handleSubmitExam();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [examMode, selectedExam, submittedExams, handleSubmitExam]);

  // Don't render until user is loaded
  if (!user) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <p className="text-gray-600">Loading user data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examsLoading || submissionsLoading) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
              <p className="text-gray-600">
                {examsLoading ? "Loading available exams..." : "Loading your exam history..."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examsError) {
    return (
      <div className="max-w-6xl mx-auto py-8">
        <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
          <CardContent className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center space-y-4 text-center">
              <AlertCircle className="w-16 h-16 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">Connection Error</h3>
              <p className="text-gray-600 max-w-md">
                {examsError.message || 'Failed to load exams. Please check your internet connection and try again.'}
              </p>
              <Button 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["available-exams"] })}
                variant="outline"
                className="mt-4"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {examMode === 'taking' ? 'Exam in Progress' : 'Available Exams'}
              </h1>
              <p className="text-gray-600">
                {examMode === 'taking' 
                  ? 'Complete your exam. You can navigate between questions using the buttons below.'
                  : 'Select an exam to view details and start taking it'
                }
              </p>
            </div>
          </div>
          
          {/* Network Status Indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600">Total Exams</p>
                  <p className="text-2xl font-bold text-blue-700">{exams.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-green-600">Active Exams</p>
                  <p className="text-2xl font-bold text-green-700">
                    {exams.filter(e => e.isActive).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-orange-600">Avg Duration</p>
                  <p className="text-2xl font-bold text-orange-700">
                    {exams.length > 0 
                      ? Math.round(exams.reduce((sum, e) => sum + e.duration, 0) / exams.length)
                      : 0} min
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600">Total Points</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {getTotalPoints(allQuestions)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <HelpCircle className="w-5 h-5 text-indigo-600" />
                <div>
                  <p className="text-sm text-indigo-600">Total Questions</p>
                  <p className="text-2xl font-bold text-indigo-700">
                    {getTotalQuestions()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Exams Grid - Hidden when taking exam */}
      {examMode !== 'taking' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {exams.map((exam) => (
          <Card key={exam.id} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-xl text-gray-900 mb-2">{exam.title}</CardTitle>
                  {exam.description && (
                    <p className="text-gray-600 text-sm mb-3">{exam.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <Badge variant={exam.isActive ? "default" : "secondary"} className="text-xs">
                      {exam.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {exam.duration} min
                    </Badge>
                  </div>
                </div>

              </div>
        </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Action Button */}
              {submittedExams.has(exam.id) ? (
                <Button
                  disabled
                  size="sm"
                  className="w-full bg-gray-400 cursor-not-allowed"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Completed
                </Button>
              ) : (
                <Button
                  onClick={() => handleStartExam(exam)}
                  disabled={!exam.isActive}
                  size="sm"
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {exam.isActive ? "Take Exam" : "Not Available"}
                </Button>
              )}

              {/* Progress Bar for Fetching */}
              {isFetching && selectedExam?.id === exam.id && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Loading questions...</span>
                    <span>{fetchProgress}%</span>
                  </div>
                  <Progress value={fetchProgress} className="h-2" />
                </div>
              )}

              {/* Questions Preview */}
              {selectedExam?.id === exam.id && showQuestions && examMode === 'preview' && !questionsLoading && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">Questions Preview</h4>
                    <Badge variant="outline" className="text-xs">
                      {questions.length} questions
                    </Badge>
                  </div>
                  
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {questions.map((question, index) => (
                      <div key={question.id} className="p-3 bg-white rounded border">
                        <div className="flex items-start justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Q{index + 1}: {question.questionText}
                          </span>
                          <Badge variant="secondary" className="text-xs ml-2">
                            {getQuestionTypeLabel(question.questionType)}
                          </Badge>
                        </div>
                        
                        {question.questionType === 'mcq' && question.options && (
                          <div className="text-xs text-gray-600 space-y-1">
                            {question.options.map((option, optIndex) => (
                              <div key={optIndex} className="flex items-center gap-2">
                                <span className="w-4 h-4 bg-gray-200 rounded text-center text-xs">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
                          <span className="text-xs text-gray-500">
                            Points: {question.points}
                          </span>
                          <span className="text-xs text-gray-500">
                            Order: {question.orderIndex + 1}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Total Points Available:</span>
                      <span className="font-semibold text-green-600">
                        {getTotalPoints(questions)} points
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Taking Exam Mode */}
              {selectedExam?.id === exam.id && showQuestions && examMode === 'taking' && !questionsLoading && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900">Exam In Progress</h4>
                    <Badge variant="outline" className="text-xs">
                      Time Left: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2,'0')}
                    </Badge>
                  </div>

                  {/* Current Question */}
                  {questions.length > 0 && (() => {
                    const q = questions[currentIndex];
                    return (
                      <div className="space-y-2" key={q.id}>
                        <p className="text-sm font-medium">Q{currentIndex + 1} of {questions.length}: {q.questionText}</p>

                        {/* MCQ */}
                        {q.questionType === 'mcq' && Array.isArray(q.options) && (
                          <div className="space-y-1 pl-4">
                            {(q.options ?? []).map((opt, idx) => (
                              <label key={idx} className="flex items-center gap-2 text-sm">
                                <input
                                  type="radio"
                                  name={`answer-${q.id}`}
                                  value={opt}
                                  checked={answers[q.id] === opt}
                                  onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* True / False */}
                        {q.questionType === 'true_false' && (
                          <div className="space-x-4 pl-4 text-sm">
                            {['True', 'False'].map(opt => (
                              <label key={opt} className="flex items-center gap-1">
                                <input
                                  type="radio"
                                  name={`answer-${q.id}`}
                                  value={opt}
                                  checked={answers[q.id] === opt}
                                  onChange={() => setAnswers(prev => ({ ...prev, [q.id]: opt }))}
                                />
                                <span>{opt}</span>
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Fill in the blank */}
                        {q.questionType === 'fill_blank' && (
                          <input
                            type="text"
                            className="border rounded p-1 w-full text-sm"
                            value={answers[q.id] ?? ''}
                            onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                          />
                        )}
                      </div>
                    );
                  })()}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-4">
                    <Button
                      variant="secondary"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                    >
                      Previous
                    </Button>

                    {currentIndex < questions.length - 1 ? (
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button onClick={handleSubmitExam} className="bg-blue-600 hover:bg-blue-700">
                        Submit Exam
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {/* Error State */}
              {selectedExam?.id === exam.id && showQuestions && questionsLoading && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">Loading questions...</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        </div>
      )}

            {/* No Exams State */}
      {examMode !== 'taking' && exams.length === 0 && (
        <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
          <CardContent className="py-16 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No exams available
            </h3>
            <p className="text-gray-600">
              There are currently no active exams to take. Please check back later.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Exam Taking Interface - Full Screen */}
      {examMode === 'taking' && selectedExam && showQuestions && (
        <div className="space-y-6">
          {/* Timer and Progress */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-green-800">Exam in Progress</h2>
                  <p className="text-green-600">Complete your exam before time runs out</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-red-600">
                    {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                  </div>
                  <p className="text-sm text-red-600">Time Remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Question */}
          {questions.length > 0 && !questionsLoading && (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-6">
                  {/* Question Header */}
                  <div className="flex items-center justify-between pb-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Question {currentIndex + 1} of {questions.length}
                    </h3>
                    <Badge variant="outline" className="text-sm">
                      {getQuestionTypeLabel(questions[currentIndex].questionType)}
                    </Badge>
                  </div>

                  {/* Question Text */}
                  <div className="space-y-4">
                    <p className="text-lg text-gray-800">{questions[currentIndex].questionText}</p>

                    {/* MCQ Options */}
                    {questions[currentIndex].questionType === 'mcq' && Array.isArray(questions[currentIndex].options) && (
                      <div className="space-y-3">
                        {questions[currentIndex].options.map((option, idx) => (
                          <label key={idx} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name={`answer-${questions[currentIndex].id}`}
                              value={option}
                              checked={answers[questions[currentIndex].id] === option}
                              onChange={() => setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: option }))}
                              className="w-4 h-4 text-green-600"
                            />
                            <span className="text-gray-800">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* True/False Options */}
                    {questions[currentIndex].questionType === 'true_false' && (
                      <div className="space-y-3">
                        {['True', 'False'].map((option) => (
                          <label key={option} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                            <input
                              type="radio"
                              name={`answer-${questions[currentIndex].id}`}
                              value={option}
                              checked={answers[questions[currentIndex].id] === option}
                              onChange={() => setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: option }))}
                              className="w-4 h-4 text-green-600"
                            />
                            <span className="text-gray-800">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Fill in the Blank */}
                    {questions[currentIndex].questionType === 'fill_blank' && (
                      <div className="space-y-2">
                        <Input
                          type="text"
                          placeholder="Type your answer here..."
                          value={answers[questions[currentIndex].id] ?? ''}
                          onChange={(e) => setAnswers(prev => ({ ...prev, [questions[currentIndex].id]: e.target.value }))}
                          className="text-lg p-3"
                        />
                      </div>
                    )}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t">
                    <Button
                      variant="secondary"
                      disabled={currentIndex === 0}
                      onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                      className="px-6"
                    >
                      Previous
                    </Button>

                    <div className="text-sm text-gray-600">
                      {currentIndex + 1} of {questions.length}
                    </div>

                    {currentIndex < questions.length - 1 ? (
                      <Button
                        className="bg-indigo-600 hover:bg-indigo-700 px-6"
                        onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
                      >
                        Next
                      </Button>
                    ) : (
                      <Button 
                        onClick={handleSubmitExam} 
                        className="bg-blue-600 hover:bg-blue-700 px-6"
                      >
                        Submit Exam
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {questionsLoading && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading exam questions...</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Exam Metadata Modal */}
      <Dialog open={showMetadataModal} onOpenChange={setShowMetadataModal}>
        <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} aria-describedby="exam-metadata-description">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900">
              {examToStart?.title}
            </DialogTitle>
            <DialogDescription className="text-gray-600">
              {examToStart?.description || "No description available"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Exam Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Duration:</span>
                <Badge variant="outline" className="text-sm">
                  <Clock className="w-3 h-3 mr-1" />
                  {examToStart?.duration} minutes
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <Badge variant={examToStart?.isActive ? "default" : "secondary"} className="text-sm">
                  {examToStart?.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMetadataModal(false);
                  setExamToStart(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmStartExam}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Exam
              </Button>
            </div>
          </div>
          
          <div id="exam-metadata-description" className="sr-only">
            Exam metadata and start confirmation dialog
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
