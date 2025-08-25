import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@exam/components/ui/card";
import { Button } from "@exam/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@exam/components/ui/radio-group";
import { Label } from "@exam/components/ui/label";
import { Input } from "@exam/components/ui/input";
import { Progress } from "@exam/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@exam/components/ui/alert-dialog";
import { ChevronLeft, ChevronRight, Flag, Check, Clock } from "lucide-react";
import Timer from "@exam/components/timer";
import QuestionNavigator from "@exam/components/question-navigator";
import { useToast } from "@exam/hooks/use-toast";
import { apiRequest } from "@exam/lib/queryClient";
import { useLocation } from "wouter";
import type { Exam, Question, ExamAttempt } from "@shared/schema";

export default function ExamInterface() {
  const { examId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<number>>(new Set());
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [examAttempt, setExamAttempt] = useState<ExamAttempt | null>(null);

  const { data: exam, isLoading: examLoading } = useQuery<Exam>({
    queryKey: ["/api/exams", examId],
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/exams", examId, "questions"],
    enabled: !!examId,
  });

  const startExamMutation = useMutation({
    mutationFn: async () => {
      // Get student info from localStorage
      const studentInfo = localStorage.getItem('studentInfo');
      const parsedInfo = studentInfo ? JSON.parse(studentInfo) : {};
      
      const response = await apiRequest("POST", `/api/exams/${examId}/start`, {
        studentName: parsedInfo.name || "Anonymous Student",
        studentEmail: parsedInfo.email || "student@example.com"
      });
      return response.json();
    },
    onSuccess: (attempt) => {
      setExamAttempt(attempt);
    },
    onError: (error) => {
      toast({
        title: "Failed to start exam",
        description: error.message,
        variant: "destructive",
      });
      navigate("/student");
    },
  });

  const saveAnswerMutation = useMutation({
    mutationFn: async ({ questionId, userAnswer, isMarkedForReview }: any) => {
      if (!examAttempt) return;
      
      const response = await apiRequest("POST", `/api/attempts/${examAttempt.id}/answers`, {
        questionId,
        userAnswer,
        isMarkedForReview,
      });
      return response.json();
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async () => {
      if (!examAttempt) return;
      
      const response = await apiRequest("POST", `/api/attempts/${examAttempt.id}/submit`);
      return response.json();
    },
    onSuccess: (attempt) => {
      navigate(`/results/${attempt.id}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to submit exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (examId && !examAttempt) {
      startExamMutation.mutate();
    }
  }, [examId]);

  const currentQuestion = questions[currentQuestionIndex];
  const answeredQuestions = new Set(Object.keys(answers).map(Number));
  const progress = (currentQuestionIndex + 1) / questions.length * 100;

  const handleAnswerChange = (value: string) => {
    if (!currentQuestion) return;
    
    const newAnswers = { ...answers, [currentQuestion.id]: value };
    setAnswers(newAnswers);
    
    saveAnswerMutation.mutate({
      questionId: currentQuestion.id,
      userAnswer: value,
      isMarkedForReview: markedQuestions.has(currentQuestionIndex),
    });
  };

  const handleMarkForReview = () => {
    const newMarked = new Set(markedQuestions);
    if (newMarked.has(currentQuestionIndex)) {
      newMarked.delete(currentQuestionIndex);
    } else {
      newMarked.add(currentQuestionIndex);
    }
    setMarkedQuestions(newMarked);
    
    if (currentQuestion && answers[currentQuestion.id]) {
      saveAnswerMutation.mutate({
        questionId: currentQuestion.id,
        userAnswer: answers[currentQuestion.id],
        isMarkedForReview: newMarked.has(currentQuestionIndex),
      });
    }
  };

  const handleNavigation = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = () => {
    setShowSubmitDialog(true);
  };

  const handleConfirmSubmit = () => {
    setShowSubmitDialog(false);
    submitExamMutation.mutate();
  };

  const handleTimeUp = () => {
    toast({
      title: "Time's up!",
      description: "Your exam is being submitted automatically.",
      variant: "destructive",
    });
    submitExamMutation.mutate();
  };

  if (examLoading || questionsLoading || !examAttempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!exam || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">Exam not found or has no questions.</p>
            <Button onClick={() => navigate("/student")} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Exam Header with Timer */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{exam.title}</h1>
              <p className="text-sm text-slate-600 mt-1">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
            <Timer
              initialTime={examAttempt?.timeRemaining || 0}
              onTimeUp={handleTimeUp}
              isActive={true}
            />
          </div>
        </CardHeader>
        <CardContent className="px-6 py-3 bg-slate-50">
          <div className="flex justify-between items-center text-sm text-slate-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </CardContent>
      </Card>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Question Content */}
        <Card>
          <CardContent className="p-8">
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">
                {currentQuestion.questionText}
              </h2>
              <div className="text-sm text-slate-600 mb-6">
                <span className="bg-slate-100 px-2 py-1 rounded">
                  {currentQuestion.questionType === "mcq" ? "Multiple Choice" :
                   currentQuestion.questionType === "true_false" ? "True/False" :
                   "Fill in the Blank"}
                </span>
              </div>
            </div>

            {/* Answer Options */}
            <div className="space-y-4">
              {currentQuestion.questionType === "mcq" && currentQuestion.options ? (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={handleAnswerChange}
                >
                  {(currentQuestion.options as string[]).map((option, index) => (
                    <div key={index} className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                      <RadioGroupItem
                        value={option}
                        id={`option-${index}`}
                        className="mr-4"
                      />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center">
                          <span className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-slate-900">{option}</span>
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : currentQuestion.questionType === "true_false" ? (
                <RadioGroup
                  value={answers[currentQuestion.id] || ""}
                  onValueChange={handleAnswerChange}
                >
                  <div className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="True" id="true" className="mr-4" />
                    <Label htmlFor="true" className="flex-1 cursor-pointer">True</Label>
                  </div>
                  <div className="flex items-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50">
                    <RadioGroupItem value="False" id="false" className="mr-4" />
                    <Label htmlFor="false" className="flex-1 cursor-pointer">False</Label>
                  </div>
                </RadioGroup>
              ) : (
                <Input
                  type="text"
                  placeholder="Enter your answer..."
                  value={answers[currentQuestion.id] || ""}
                  onChange={(e) => handleAnswerChange(e.target.value)}
                  className="w-full p-4 border border-slate-200 rounded-lg"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation Controls */}
        <Card>
          <CardContent className="px-6 py-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="flex items-center space-x-4">
                <Button
                  variant="outline"
                  onClick={handleMarkForReview}
                  className={markedQuestions.has(currentQuestionIndex) ? "bg-yellow-100" : ""}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  {markedQuestions.has(currentQuestionIndex) ? "Unmark" : "Mark for Review"}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmit}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Submit Exam
                </Button>
              </div>

              <Button
                onClick={handleNext}
                disabled={currentQuestionIndex === questions.length - 1}
                className="bg-blue-600 text-white hover:bg-blue-700"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Question Navigator */}
        <QuestionNavigator
          totalQuestions={questions.length}
          currentQuestion={currentQuestionIndex}
          answeredQuestions={answeredQuestions}
          markedQuestions={markedQuestions}
          onNavigate={handleNavigation}
        />
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Clock className="w-5 h-5 text-yellow-500 mr-2" />
              Confirm Submission
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your exam? You have answered{" "}
              <span className="font-semibold">{answeredQuestions.size}</span> out of{" "}
              <span className="font-semibold">{questions.length}</span> questions.
              <br />
              <br />
              Once submitted, you cannot make any changes to your answers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSubmit}
              className="bg-red-500 hover:bg-red-600"
            >
              Submit Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
