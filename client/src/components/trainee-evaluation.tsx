import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  PlayCircle,
  CheckCircle,
  Clock,
  FileText,
  AlertCircle,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  getPublishedEvaluationQuestions, 
  submitEvaluationResponses, 
  checkTraineeEvaluationSubmission,
  type EvaluationQuestion 
} from "@/lib/firebaseService";

interface EvaluationAnswer {
  questionId: string;
  question: string;
  answer: string | number;
}

export default function TraineeEvaluation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [hasNewQuestions, setHasNewQuestions] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to manage initialization with minimum loading time
  useEffect(() => {
    // Set a minimum loading time of 1.5 seconds to prevent flash
    initializationTimeoutRef.current = setTimeout(() => {
      setIsInitializing(false);
    }, 1500);

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, []);

  // Fetch published evaluation questions
  const { data: questions = [], isLoading: questionsLoading, refetch, error: questionsError } = useQuery<EvaluationQuestion[]>({
    queryKey: ["published-evaluation-questions"],
    queryFn: async () => {
      try {
        console.log('🔄 Fetching evaluation questions...');
        const publishedQuestions = await getPublishedEvaluationQuestions();
        console.log('📡 Questions fetched:', publishedQuestions.length);
        setLastSyncTime(new Date());
        return publishedQuestions;
      } catch (error) {
        console.error('❌ Error fetching published evaluation questions:', error);
        throw error; // Re-throw to let React Query handle it
      }
    },
    retry: 3, // Retry 3 times on failure
    retryDelay: 1000, // Wait 1 second between retries
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // Deep synchronize function
  const handleDeepSync = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 Deep Sync initiated...');
      console.log('🔍 Current questions count:', questions.length);
      console.log('🔍 Current user:', user?.uid);
      
      // Test Firebase connection first
      console.log('🔍 Testing Firebase connection...');
      
      // Check if Firebase is properly initialized
      try {
        const { db } = await import('@/lib/firebase');
        console.log('🔍 Firebase db object:', db);
        console.log('🔍 Firebase app:', db.app);
      } catch (firebaseError) {
        console.error('❌ Firebase initialization error:', firebaseError);
        throw new Error('Firebase is not properly initialized');
      }
      
      // Force a fresh fetch from Firebase
      const freshQuestions = await getPublishedEvaluationQuestions();
      console.log('📡 Fresh questions fetched:', freshQuestions.length);
      console.log('📡 Questions data:', freshQuestions);
      
      if (freshQuestions.length === 0) {
        console.log('⚠️ No questions returned from Firebase');
        toast({
          title: "No Questions Found",
          description: "No published evaluation questions found in the database. Please contact an administrator.",
          variant: "destructive",
        });
        return;
      }
      
      // Update the query cache manually
      queryClient.setQueryData(["published-evaluation-questions"], freshQuestions);
      console.log('💾 Query cache updated');
      
      // Also invalidate the query to trigger a refetch
      await queryClient.invalidateQueries({ queryKey: ["published-evaluation-questions"] });
      console.log('🔄 Query invalidated');
      
      // Check if there are new questions (more questions than before)
      const previousQuestionCount = questions.length;
      const newQuestionCount = freshQuestions.length;
      
      if (newQuestionCount > previousQuestionCount) {
        setHasNewQuestions(true);
        console.log('🆕 New questions detected!');
        toast({
          title: "New Questions Available!",
          description: `${newQuestionCount - previousQuestionCount} new evaluation questions have been published. You can take the evaluation again.`,
        });
      } else {
        setHasNewQuestions(false);
        console.log('✅ No new questions found');
        toast({
          title: "Synchronization Complete",
          description: `Successfully fetched ${freshQuestions.length} evaluation questions from the database.`,
        });
      }
      
      // Update last sync time
      setLastSyncTime(new Date());
      
      console.log('✅ Deep Sync completed successfully');
    } catch (error) {
      console.error('❌ Deep Sync failed:', error);
      
      // More detailed error information
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        });
      }
      
      // Try to provide more helpful error messages
      let errorMessage = "Failed to refresh evaluation questions. Please try again.";
      
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          errorMessage = "Access denied. Please check if you're properly authenticated.";
        } else if (error.message.includes('unavailable')) {
          errorMessage = "Firebase service is currently unavailable. Please try again later.";
        } else if (error.message.includes('not-found')) {
          errorMessage = "Evaluation questions collection not found. Please contact an administrator.";
        } else if (error.message.includes('network')) {
          errorMessage = "Network error. Please check your internet connection and try again.";
        } else if (error.message.includes('Firebase is not properly initialized')) {
          errorMessage = "Firebase configuration error. Please contact support.";
        } else if (error.message.includes('index is being created')) {
          errorMessage = "Database is being optimized. Please try again in a few minutes.";
        } else if (error.message.includes('requires an index')) {
          errorMessage = "Database index is being created. Please try again in a few minutes or contact an administrator.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Synchronization Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Check if trainee has already submitted evaluation
  const { data: hasSubmitted = false, isLoading: submissionLoading, refetch: refetchSubmissionStatus } = useQuery<boolean>({
    queryKey: ["trainee-evaluation-submission", user?.uid],
    queryFn: () => checkTraineeEvaluationSubmission(user?.uid || ""),
    enabled: !!user?.uid,
    retry: false,
  });

  // Function to start a new evaluation (when new questions are available)
  const handleStartNewEvaluation = () => {
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowCompletionDialog(false);
    setHasNewQuestions(false);
    setIsInitializing(false); // Ensure we don't show loading again
    // Reset the submission status to allow taking the evaluation again
    queryClient.setQueryData(["trainee-evaluation-submission", user?.uid], false);
  };

  // Submit evaluation responses mutation
  const submitMutation = useMutation({
    mutationFn: async (responses: EvaluationAnswer[]) => {
      console.log('🔍 Mutation called with user:', user);
      console.log('🔍 User UID:', user?.uid);
      console.log('🔍 User displayName:', user?.displayName);
      console.log('🔍 User email:', user?.email);
      
      if (!user?.uid) {
        console.error('❌ User UID is missing');
        throw new Error("User information not available");
      }
      
      // Use available user information with fallbacks
      const userName = user.displayName || user.email?.split('@')[0] || 'Unknown User';
      const userEmail = user.email || 'no-email@example.com';
      
      console.log('🔍 Using user info:', { uid: user.uid, userName, userEmail });
      
      await submitEvaluationResponses(
        user.uid,
        userName,
        userEmail,
        responses
      );
    },
    onSuccess: () => {
      setShowCompletionDialog(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
      queryClient.invalidateQueries({ queryKey: ["trainee-evaluation-submission"] });
      toast({
        title: "Evaluation submitted",
        description: "Thank you for completing the evaluation!",
      });
    },
    onError: (error) => {
      toast({
        title: "Submission failed",
        description: "Failed to submit evaluation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;

  const handleAnswerChange = (questionId: string, value: string | number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (!currentQuestion) return;

    // Check if current question is answered (for required questions)
    if (!answers[currentQuestion.id]) {
      toast({
        title: "Question required",
        description: "Please answer this question before continuing.",
        variant: "destructive",
      });
      return;
    }

    // Check if user is authenticated before submitting
    if (isLastQuestion && !user?.uid) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit your evaluation.",
        variant: "destructive",
      });
      return;
    }

    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentQuestionIndex(prev => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    if (!currentQuestion) return;

    setIsSubmitting(true);
    
    try {
      // Check user authentication before submitting
      if (!user?.uid) {
        throw new Error("User not authenticated. Please log in again.");
      }

      console.log('🔍 Submitting evaluation for user:', {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email
      });

      const responses: EvaluationAnswer[] = questions.map(question => ({
        questionId: question.id,
        question: question.question,
        answer: answers[question.id] || ""
      }));

      console.log('📝 Submitting responses:', responses.length, 'responses');
      await submitMutation.mutateAsync(responses);
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      
      // Show more specific error message
      if (error instanceof Error) {
        if (error.message.includes('not authenticated')) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to submit your evaluation.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Submission Error",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const currentAnswer = answers[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'yes_no':
        return (
          <RadioGroup
            value={currentAnswer as string || ""}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id="yes" />
                <Label htmlFor="yes">Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id="no" />
                <Label htmlFor="no">No</Label>
              </div>
            </div>
          </RadioGroup>
        );

      case 'single_choice':
        return (
          <RadioGroup
            value={currentAnswer as string || ""}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
          >
            <div className="space-y-3">
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`}>{option}</Label>
              </div>
            ))}
            </div>
          </RadioGroup>
        );
      
      case 'rating':
        return (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  variant={currentAnswer === rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAnswerChange(currentQuestion.id, rating)}
                  className={`w-12 h-12 ${
                    currentAnswer === rating 
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                      : "bg-white hover:bg-gray-50 text-gray-700 border-gray-300"
                  }`}
                >
                  {rating}
                </Button>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              1 = Poor, 5 = Excellent
            </p>
          </div>
        );

      case 'expression':
        return (
          <Textarea
            placeholder="Please provide your feedback..."
            value={currentAnswer as string || ""}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
            className="min-h-[120px]"
          />
        );
      
      default:
        return (
          <Input
            placeholder="Enter your answer..."
            value={currentAnswer as string || ""}
            onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
          />
        );
    }
  };

  if (isInitializing || questionsLoading || submissionLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-800">
              {isInitializing ? "Initializing Evaluation" : 
               questionsLoading ? "Loading Questions" : "Checking Status"}
            </h3>
            <p className="text-sm text-gray-600">
              {isInitializing ? "Setting up your evaluation session..." :
               questionsLoading ? "Fetching evaluation questions from database..." :
               "Verifying your evaluation status..."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (hasSubmitted && !hasNewQuestions) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Evaluation</h2>
            <p className="text-gray-600">Training evaluation questions</p>
            {lastSyncTime && (
              <p className="text-xs text-gray-500 mt-1">
                Last synchronized: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-3">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="mr-2 h-4 w-4" />
            Completed
          </Badge>
            <Button
              onClick={handleDeepSync}
              disabled={isRefreshing}
              variant="outline"
              className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRefreshing ? "Syncing..." : "Deep Sync"}
            </Button>
          </div>
        </div>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Evaluation Completed</h3>
              <p className="text-gray-600 mb-4">
                You have successfully completed the evaluation. Your feedback is valuable to us.
              </p>
              
              {/* Information about checking for new questions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                <h4 className="font-medium text-blue-800 mb-2">Want to check for new questions?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Use the Deep Sync button to check for newly published questions</li>
                  <li>• New questions may be added by administrators</li>
                  <li>• You can take additional evaluations if new questions are available</li>
                  <li>• Your previous responses are saved and won't be lost</li>
                </ul>
              </div>
              
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={handleDeepSync}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isRefreshing ? "Syncing..." : "Check for New Questions"}
                </Button>
                
                {hasNewQuestions && (
                  <Button
                    onClick={handleStartNewEvaluation}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white border-green-600"
                  >
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Take New Evaluation
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show evaluation questions if there are questions available (either not submitted or new questions available)
  const shouldShowQuestions = questions.length > 0 && (!hasSubmitted || hasNewQuestions);

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Evaluation</h2>
            <p className="text-gray-600">Training evaluation questions</p>
            {lastSyncTime && (
              <p className="text-xs text-gray-500 mt-1">
                Last synchronized: {lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </div>
          <Button
            onClick={handleDeepSync}
            disabled={isRefreshing}
            variant="outline"
            className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isRefreshing ? "Syncing..." : "Deep Sync"}
          </Button>
        </div>

        <Card className="card-shadow">
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Questions Available</h3>
              <p className="text-gray-600 mb-4">
                There are no evaluation questions published yet. Please check back later.
              </p>
              
              {/* Helpful troubleshooting information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-left">
                <h4 className="font-medium text-blue-800 mb-2">Troubleshooting:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Check if an administrator has created evaluation questions</li>
                  <li>• Verify that questions have been published (not just saved as drafts)</li>
                  <li>• Ensure you have proper access permissions</li>
                  <li>• Try the Deep Sync button to refresh data</li>
                </ul>
              </div>
              
              <div className="flex justify-center space-x-2">
                <Button
                  onClick={handleDeepSync}
                  disabled={isRefreshing}
                  variant="outline"
                  size="sm"
                  className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                >
                  {isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {isRefreshing ? "Syncing..." : "Deep Sync"}
                </Button>
                
                {process.env.NODE_ENV === 'development' && (
                  <Button
                    onClick={async () => {
                      console.log('🔍 Checking if any questions exist...');
                      try {
                        const { collection, getDocs } = await import('firebase/firestore');
                        const { db } = await import('@/lib/firebase');
                        const allQuestions = await getDocs(collection(db, 'evaluation_questions'));
                        console.log('🔍 Total questions in database:', allQuestions.docs.length);
                        console.log('🔍 Questions data:', allQuestions.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                        
                        toast({
                          title: "Database Check Complete",
                          description: `Found ${allQuestions.docs.length} total questions in database.`,
                        });
                      } catch (error) {
                        console.error('❌ Database check failed:', error);
                        toast({
                          title: "Database Check Failed",
                          description: error instanceof Error ? error.message : "Check failed",
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="bg-yellow-50 text-yellow-700 border-yellow-200"
                  >
                    Check Database
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Only show evaluation questions if user hasn't submitted OR if there are new questions available
  if (!shouldShowQuestions) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {hasNewQuestions ? "New Training Evaluation" : "Training Evaluation"}
          </h2>
          <p className="text-gray-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </p>
          {hasNewQuestions && (
            <p className="text-sm text-green-600 font-medium">
              ✨ New questions available! You can take this evaluation again.
            </p>
          )}
          {lastSyncTime && (
            <p className="text-xs text-gray-500 mt-1">
              Last synchronized: {lastSyncTime.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex flex-col items-end space-y-1">
            <Button
              onClick={handleDeepSync}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
            >
              {isRefreshing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {isRefreshing ? "Syncing..." : "Deep Sync"}
            </Button>
            <div className="text-xs text-gray-500">
              {questions.length > 0 ? `${questions.length} questions loaded` : "No questions available"}
            </div>
        </div>
        <Badge variant="secondary">
          <Clock className="mr-2 h-4 w-4" />
          {Math.ceil((questions.length - currentQuestionIndex) * 2)} min remaining
        </Badge>
      </div>
      </div>

      {/* Connection Status & Error Display */}
      {questionsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Connection Error</h3>
              <p className="text-xs text-red-600 mt-1">
                Failed to fetch evaluation questions. Please try the Deep Sync button above.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {questionsLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            <div>
              <h3 className="text-sm font-medium text-blue-800">Loading Questions</h3>
              <p className="text-xs text-blue-600 mt-1">
                Fetching evaluation questions from the database...
              </p>
            </div>
          </div>
        </div>
      )}



      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
      
      {/* Question Card */}
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-medium mr-3">
              Q{currentQuestionIndex + 1}
            </span>
            {currentQuestion?.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {renderQuestion()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>
        
        <Button
          onClick={handleNext}
          disabled={isSubmitting}
          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : isLastQuestion ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Submit Evaluation
            </>
          ) : (
            <>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </>
          )}
            </Button>
          </div>

      {/* Completion Dialog */}
      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()} aria-describedby="evaluation-completion-description">
          <DialogHeader>
            <DialogTitle>Evaluation Completed!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
            <p className="text-gray-600">
                You have successfully completed the evaluation. Your feedback is valuable to us and will help improve our training programs.
              </p>
            </div>
            <div className="flex justify-end">
              <Button 
                onClick={() => setShowCompletionDialog(false)}
                className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              >
              Close
            </Button>
            </div>
          </div>
          
          <div id="evaluation-completion-description" className="sr-only">
            Evaluation completion confirmation dialog
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 