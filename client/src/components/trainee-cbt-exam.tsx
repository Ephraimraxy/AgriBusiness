import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Clock, CheckCircle, XCircle, AlertTriangle, Play, Pause } from "lucide-react";
import { 
  CBTQuestion, 
  CBTExam, 
  CBTExamAttempt,
  getActiveCBTExam,
  getActiveCBTQuestions,
  createCBTExamAttempt,
  updateCBTExamAttempt,
  calculateExamScore,
  getRandomQuestions,
  hasTraineeTakenExam,
  getTraineeExamAttempt
} from "@/lib/cbtService";

interface ExamState {
  currentQuestionIndex: number;
  answers: Record<string, string>;
  timeRemaining: number;
  isStarted: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  score: number;
  startTime: Date | null;
  endTime: Date | null;
}

interface TraineeCBTExamProps {
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
  onExamLockChange?: (locked: boolean) => void;
}

export default function TraineeCBTExam({ traineeId, traineeName, traineeEmail, onExamLockChange }: TraineeCBTExamProps) {
  const [exam, setExam] = useState<CBTExam | null>(null);
  const [questions, setQuestions] = useState<CBTQuestion[]>([]);
  const [examAttempt, setExamAttempt] = useState<CBTExamAttempt | null>(null);
  const [examState, setExamState] = useState<ExamState>({
    currentQuestionIndex: 0,
    answers: {},
    timeRemaining: 0,
    isStarted: false,
    isPaused: false,
    isCompleted: false,
    score: 0,
    startTime: null,
    endTime: null
  });
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasTakenExam, setHasTakenExam] = useState(false);
  const [previousAttempt, setPreviousAttempt] = useState<CBTExamAttempt | null>(null);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetExamForNewTrainee = () => {
    setExam(null);
    setQuestions([]);
    setExamAttempt(null);
    setHasTakenExam(false);
    setPreviousAttempt(null);
    setAutoSubmitTriggered(false);
    setShowStartDialog(false);
    setShowResultsDialog(false);
    setShowConfirmSubmit(false);
    setExamState({
      currentQuestionIndex: 0,
      answers: {},
      timeRemaining: 0,
      isStarted: false,
      isPaused: false,
      isCompleted: false,
      score: 0,
      startTime: null,
      endTime: null
    });
  };

  useEffect(() => {
    if (!traineeId) return;
    resetExamForNewTrainee();
    loadExamData();
  }, [traineeId]);

  // Prevent accidental navigation and detect tab switching during exam
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examState.isStarted && !examState.isCompleted) {
        e.preventDefault();
        e.returnValue = 'You are currently taking an exam. Are you sure you want to leave?';
        return 'You are currently taking an exam. Are you sure you want to leave?';
      }
    };

    const handleVisibilityChange = () => {
      if (examState.isStarted && !examState.isCompleted && document.hidden) {
        // Tab was switched or window was minimized - auto submit
        handleSecurityViolation('Tab switching or window minimization');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Detect common screenshot shortcuts
      const screenshotKeys = [
        // Windows: PrintScreen, Alt+PrintScreen, Win+Shift+S
        'PrintScreen',
        // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
        // These are harder to detect, but we can catch some combinations
      ];
      
      if (examState.isStarted && !examState.isCompleted) {
        // Detect PrintScreen key
        if (e.key === 'PrintScreen') {
          e.preventDefault();
          handleSecurityViolation('Screenshot attempt (PrintScreen)');
        }
        
        // Detect Alt+PrintScreen
        if (e.altKey && e.key === 'PrintScreen') {
          e.preventDefault();
          handleSecurityViolation('Screenshot attempt (Alt+PrintScreen)');
        }
        
        // Detect F12 (Developer Tools)
        if (e.key === 'F12') {
          e.preventDefault();
          handleSecurityViolation('Developer tools access (F12)');
        }
        
        // Detect Ctrl+Shift+I (Developer Tools)
        if (e.ctrlKey && e.shiftKey && e.key === 'I') {
          e.preventDefault();
          handleSecurityViolation('Developer tools access (Ctrl+Shift+I)');
        }
        
        // Detect Ctrl+Shift+C (Developer Tools)
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
          e.preventDefault();
          handleSecurityViolation('Developer tools access (Ctrl+Shift+C)');
        }
        
        // Detect Ctrl+U (View Source)
        if (e.ctrlKey && e.key === 'u') {
          e.preventDefault();
          handleSecurityViolation('View source attempt (Ctrl+U)');
        }
        
        // Detect Ctrl+Shift+J (Console)
        if (e.ctrlKey && e.shiftKey && e.key === 'J') {
          e.preventDefault();
          handleSecurityViolation('Console access (Ctrl+Shift+J)');
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (examState.isStarted && !examState.isCompleted) {
        e.preventDefault();
        handleSecurityViolation('Right-click context menu access');
      }
    };

    const handleDevTools = () => {
      if (examState.isStarted && !examState.isCompleted) {
        // Check if dev tools are open
        const devtools = {
          open: false,
          orientation: null
        };
        
        const threshold = 160;
        
        if (window.outerHeight - window.innerHeight > threshold || 
            window.outerWidth - window.innerWidth > threshold) {
          if (!devtools.open) {
            devtools.open = true;
            handleSecurityViolation('Developer tools detection (window size change)');
          }
        } else {
          devtools.open = false;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    
    // Check for dev tools periodically
    const devToolsInterval = setInterval(handleDevTools, 1000);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(devToolsInterval);
    };
  }, [examState.isStarted, examState.isCompleted, autoSubmitTriggered]);

  const handleSecurityViolation = (violationType: string) => {
    if (!autoSubmitTriggered) {
      setAutoSubmitTriggered(true);
      setShowConfirmSubmit(false);
      // Auto-submit the exam immediately without showing dialog
      handleSubmitExam();
    }
  };

  const loadExamData = async () => {
    try {
      setLoading(true);
      
      // Load active exam
      const activeExam = await getActiveCBTExam();
      console.log('Active exam found:', activeExam);
      
      if (!activeExam) {
        console.error('No active exam found');
        return;
      }
      
      // Check if trainee has already taken this exam
      const taken = await hasTraineeTakenExam(traineeId, activeExam.id);
      setHasTakenExam(taken);
      
      if (taken) {
        console.log('Trainee has already taken this exam');
        // Get previous attempt details
        const attempt = await getTraineeExamAttempt(traineeId, activeExam.id);
        setPreviousAttempt(attempt);
        return;
      }
      
      // Load questions filtered by exam subjects
      console.log('Loading questions for subjects:', activeExam.subjects);
      const allQuestions = await getActiveCBTQuestions(activeExam.subjects);
      console.log('All questions found:', allQuestions.length);
      
      if (allQuestions.length === 0) {
        console.error('No questions found for the specified subjects');
        return;
      }
      
      // Select questions based on exam settings
      const selectedQuestions = activeExam.randomization 
        ? getRandomQuestions(allQuestions, activeExam.totalQuestions)
        : allQuestions.slice(0, activeExam.totalQuestions);
      
      console.log('Selected questions:', selectedQuestions.length);
      
      setExam(activeExam);
      setQuestions(selectedQuestions);
      setExamState(prev => ({ ...prev, timeRemaining: activeExam.duration * 60 }));
    } catch (error) {
      console.error('Error loading exam data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (examState.isStarted && !examState.isPaused && !examState.isCompleted && examState.timeRemaining > 0) {
      interval = setInterval(() => {
        setExamState(prev => {
          const newTimeRemaining = prev.timeRemaining - 1;
          
          if (newTimeRemaining <= 0) {
            // Time's up - auto submit
            if (!autoSubmitTriggered) {
              setAutoSubmitTriggered(true);
              setShowConfirmSubmit(false);
              handleSubmitExam();
            }
            return { ...prev, timeRemaining: 0, isCompleted: true };
          }
          
          return { ...prev, timeRemaining: newTimeRemaining };
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [examState.isStarted, examState.isPaused, examState.isCompleted, autoSubmitTriggered]);

  const handleStartExam = async () => {
    if (!exam) return;
    
    try {
      // Create exam attempt
      const attemptId = await createCBTExamAttempt({
        examId: exam.id,
        traineeId,
        traineeName,
        traineeEmail,
        startTime: new Date(),
        timeSpent: 0,
        score: 0,
        totalQuestions: questions.length,
        correctAnswers: 0,
        wrongAnswers: 0,
        unanswered: questions.length,
        isPassed: false,
        answers: {},
        status: 'in_progress'
      });
      
      setExamAttempt({ id: attemptId } as CBTExamAttempt);
      setExamState(prev => ({
        ...prev,
        isStarted: true,
        startTime: new Date(),
        timeRemaining: exam.duration * 60
      }));
      // Lock sidebar / collapse
      onExamLockChange?.(true);
      setShowStartDialog(false);
    } catch (error) {
      console.error('Error starting exam:', error);
    }
  };

  const handleAnswerQuestion = (questionId: string, answer: string) => {
    setExamState(prev => ({
      ...prev,
      answers: { ...prev.answers, [questionId]: answer }
    }));
  };

  const handleNextQuestion = () => {
    if (!exam) return;
    
    if (examState.currentQuestionIndex < questions.length - 1) {
      setExamState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1
      }));
    }
  };

  const handlePreviousQuestion = () => {
    if (examState.currentQuestionIndex > 0) {
      setExamState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex - 1
      }));
    }
  };

  const handlePauseExam = () => {
    setExamState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const handleSubmitExam = async () => {
    if (!exam || !examAttempt || isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirmSubmit(false);
    
    const endTime = new Date();
    const timeSpent = Math.round((endTime.getTime() - (examState.startTime?.getTime() || 0)) / 1000 / 60);
    const scoreData = calculateExamScore(examState.answers, questions);
    
    try {
      // Update exam attempt with results
      await updateCBTExamAttempt(examAttempt.id, {
        endTime,
        timeSpent,
        score: scoreData.score,
        correctAnswers: scoreData.correctAnswers,
        wrongAnswers: scoreData.wrongAnswers,
        unanswered: scoreData.unanswered,
        isPassed: scoreData.score >= exam.passingScore,
        answers: examState.answers,
        status: 'completed'
      });
      
      setExamState(prev => ({
        ...prev,
        isCompleted: true,
        score: scoreData.score,
        endTime
      }));
      
      // Always show results dialog for completed exams
      setShowResultsDialog(true);
      // Unlock sidebar
      onExamLockChange?.(false);
      // Mark exam as taken and clear current exam/questions so UI shows no exam available
      setHasTakenExam(true);
      setExam(null);
      setQuestions([]);
    } catch (error) {
      console.error('Error submitting exam:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateScore = () => {
    if (!questions.length) return 0;
    
    const scoreData = calculateExamScore(examState.answers, questions);
    return scoreData.score;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentQuestion = () => {
    if (!questions.length) return null;
    return questions[examState.currentQuestionIndex];
  };

  const getAnsweredCount = () => {
    return Object.keys(examState.answers).length;
  };

  const isPassed = () => {
    if (!exam) return false;
    return examState.score >= exam.passingScore;
  };

  if (!traineeId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (!exam || !questions.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Exam Available</h3>
          <p className="text-gray-500">
            There is no active exam or questions available at the moment.
          </p>
        </div>
      </div>
    );
  }

  // Show previous attempt if trainee has already taken the exam
  if (hasTakenExam && previousAttempt) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Exam Already Completed</h2>
          <p className="text-gray-600">You have already taken this exam</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Previous Attempt Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className={`text-2xl font-bold ${previousAttempt.isPassed ? 'text-green-600' : 'text-red-600'}`}>
                  {previousAttempt.score}%
                </div>
                <div className="text-sm text-gray-600">Score</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {previousAttempt.correctAnswers}
                </div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {previousAttempt.wrongAnswers}
                </div>
                <div className="text-sm text-gray-600">Wrong</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {previousAttempt.timeSpent}m
                </div>
                <div className="text-sm text-gray-600">Time Spent</div>
              </div>
            </div>
            
            <div className="text-center">
              <Badge className={previousAttempt.isPassed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {previousAttempt.isPassed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-gray-600">
                Completed on {new Date(previousAttempt.endTime || previousAttempt.startTime).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examState.isStarted) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">{exam.title}</h2>
          <p className="text-gray-600">Computer-Based Test</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-600" />
                <span>Duration: {exam.duration} minutes</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Questions: {questions.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                <span>Passing Score: {exam.passingScore}%</span>
              </div>
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <span>No going back once answered</span>
              </div>
            </div>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ SECURITY WARNINGS:</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• <strong>DO NOT</strong> switch browser tabs or minimize the window - exam will auto-submit</li>
                <li>• <strong>DO NOT</strong> take screenshots (PrintScreen, Alt+PrintScreen) - exam will auto-submit</li>
                <li>• <strong>DO NOT</strong> open Developer Tools (F12, Ctrl+Shift+I) - exam will auto-submit</li>
                <li>• <strong>DO NOT</strong> right-click or access context menu - exam will auto-submit</li>
                <li>• <strong>DO NOT</strong> view page source (Ctrl+U) - exam will auto-submit</li>
                <li>• <strong>DO NOT</strong> open browser console - exam will auto-submit</li>
              </ul>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">General Instructions:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Ensure you have a stable internet connection</li>
                <li>• Do not refresh the page during the exam</li>
                <li>• The exam will auto-submit when time expires</li>
                <li>• You cannot return to previous questions</li>
                <li>• Stay focused on the exam window at all times</li>
              </ul>
            </div>

            <Button 
              onClick={() => setShowStartDialog(true)}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Exam
            </Button>
          </CardContent>
        </Card>

        {/* Start Confirmation Dialog */}
        <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Ready to Start?</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>Are you sure you want to start the exam? Once started, you cannot pause or restart.</p>
              
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h4 className="font-semibold text-red-800 mb-2">⚠️ Final Security Reminder:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• Switching tabs will auto-submit your exam</li>
                  <li>• Taking screenshots will auto-submit your exam</li>
                  <li>• Opening developer tools will auto-submit your exam</li>
                  <li>• Right-clicking will auto-submit your exam</li>
                </ul>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowStartDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleStartExam} className="bg-green-600 hover:bg-green-700">
                  Start Now
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const currentQuestion = getCurrentQuestion();

  return (
    <div className="space-y-6">
      {/* Security Warning Banner */}
      {examState.isStarted && !examState.isCompleted && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 shadow-sm">
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-pulse">⚠️</div>
            <span className="text-red-800 font-medium text-sm">
              SECURITY ACTIVE: Do not switch tabs, take screenshots, or open developer tools - exam will auto-submit
            </span>
            <div className="animate-pulse">⚠️</div>
          </div>
        </div>
      )}
      
      {/* Header with Timer and Progress */}
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{exam.title}</h2>
            <p className="text-sm text-gray-600">
              Question {examState.currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-center">
              <div className={`flex items-center space-x-2 ${
                examState.timeRemaining <= 300 ? 'text-red-600' : 
                examState.timeRemaining <= 600 ? 'text-orange-600' : 'text-gray-600'
              }`}>
                <Clock className={`h-5 w-5 ${
                  examState.timeRemaining <= 300 ? 'text-red-600 animate-pulse' : 
                  examState.timeRemaining <= 600 ? 'text-orange-600' : 'text-gray-600'
                }`} />
                <span className="font-mono text-lg font-bold">
                  {formatTime(examState.timeRemaining)}
                </span>
              </div>
              <p className="text-xs text-gray-500">Time Remaining</p>
              {examState.timeRemaining <= 300 && (
                <p className="text-xs text-red-600 font-medium">⚠️ Time is running out!</p>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePauseExam}
              disabled={examState.isCompleted}
            >
              {examState.isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress: {getAnsweredCount()}/{questions.length} answered</span>
            <span>{Math.round((getAnsweredCount() / questions.length) * 100)}%</span>
          </div>
          <Progress value={(getAnsweredCount() / questions.length) * 100} className="h-2" />
        </div>
      </div>

      {/* Question Display */}
      {currentQuestion && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">{currentQuestion.subject}</Badge>
                <Badge variant="outline">{currentQuestion.topic}</Badge>
                <Badge className={
                  currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                  currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }>
                  {currentQuestion.difficulty}
                </Badge>
              </div>
              <div className="text-sm text-gray-500">
                Question {examState.currentQuestionIndex + 1}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                {currentQuestion.question}
              </h3>
              
              <div className="space-y-3">
                {currentQuestion.questionType === 'fill_blank' ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Enter your answer here..."
                      value={examState.answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswerQuestion(currentQuestion.id, e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-sm text-gray-500">
                      Type your answer in the text box above
                    </p>
                  </div>
                ) : (
                  currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        examState.answers[currentQuestion.id] === option
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleAnswerQuestion(currentQuestion.id, option)}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          examState.answers[currentQuestion.id] === option
                            ? 'border-green-500 bg-green-500'
                            : 'border-gray-300'
                        }`}>
                          {examState.answers[currentQuestion.id] === option && (
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          )}
                        </div>
                        <span className="font-medium text-gray-700">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4 border-t">
              <Button
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={examState.currentQuestionIndex === 0}
              >
                Previous
              </Button>
              
              <div className="flex space-x-2">
                {examState.currentQuestionIndex < questions.length - 1 ? (
                  <Button onClick={handleNextQuestion}>
                    Next
                  </Button>
                ) : (
                  <Button onClick={() => setShowConfirmSubmit(true)} className="bg-green-600 hover:bg-green-700">
                    Submit Exam
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question Navigator */}
      <Card>
        <CardHeader>
          <CardTitle>Question Navigator</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-10 gap-2">
            {questions.map((question, index) => (
              <Button
                key={question.id}
                variant={
                  examState.currentQuestionIndex === index
                    ? "default"
                    : examState.answers[question.id]
                    ? "outline"
                    : "ghost"
                }
                size="sm"
                onClick={() => setExamState(prev => ({ ...prev, currentQuestionIndex: index }))}
                className={`h-8 w-8 p-0 ${
                  examState.answers[question.id] ? 'border-green-500 text-green-700' : ''
                }`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Submit Confirmation Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Are you sure you want to submit your exam? This action cannot be undone.</p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Answered:</strong> {getAnsweredCount()} / {questions.length} questions
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowConfirmSubmit(false)} disabled={isSubmitting}>
                Continue Exam
              </Button>
              <Button onClick={handleSubmitExam} className="bg-red-600 hover:bg-red-700" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Exam'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Results Dialog */}
      <Dialog open={showResultsDialog} onOpenChange={setShowResultsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exam Results</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Summary */}
            <div className="text-center">
              <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${
                isPassed() ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {isPassed() ? (
                  <CheckCircle className="h-10 w-10 text-green-600" />
                ) : (
                  <XCircle className="h-10 w-10 text-red-600" />
                )}
              </div>
              
              <div>
                <h3 className={`text-3xl font-bold ${isPassed() ? 'text-green-600' : 'text-red-600'}`}>
                  {examState.score}%
                </h3>
                <p className={`text-xl ${isPassed() ? 'text-green-600' : 'text-red-600'}`}>
                  {isPassed() ? 'PASSED' : 'FAILED'}
                </p>
              </div>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {calculateExamScore(examState.answers, questions).correctAnswers}
                </div>
                <div className="text-sm text-gray-600">Correct</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {calculateExamScore(examState.answers, questions).wrongAnswers}
                </div>
                <div className="text-sm text-gray-600">Wrong</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-600">
                  {calculateExamScore(examState.answers, questions).unanswered}
                </div>
                <div className="text-sm text-gray-600">Unanswered</div>
              </div>
              
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {examState.startTime && examState.endTime ? 
                    Math.round((examState.endTime.getTime() - examState.startTime.getTime()) / 1000 / 60) : 0}m
                </div>
                <div className="text-sm text-gray-600">Time Taken</div>
              </div>
            </div>

            {/* Security Violation Warning */}
            {autoSubmitTriggered && examState.timeRemaining > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-semibold text-red-800 mb-2">⚠️ Security Violation Detected</h4>
                <p className="text-sm text-red-700">
                  Your exam was automatically submitted due to a security violation. 
                  This may include switching tabs, taking screenshots, opening developer tools, 
                  or other prohibited actions during the exam.
                </p>
              </div>
            )}

            {/* Exam Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Exam Information</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Passing Score: </span>
                  <span className="font-medium">{exam.passingScore}%</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Questions: </span>
                  <span className="font-medium">{questions.length}</span>
                </div>
                <div>
                  <span className="text-gray-600">Duration: </span>
                  <span className="font-medium">{exam.duration} minutes</span>
                </div>
                <div>
                  <span className="text-gray-600">Submission: </span>
                  <span className="font-medium">
                    {autoSubmitTriggered ? 
                      (examState.timeRemaining <= 0 ? 'Auto-submitted (Time expired)' : 'Auto-submitted (Security violation)') 
                      : 'Manually submitted'
                    }
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button 
                onClick={() => setShowResultsDialog(false)}
                className="w-full"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      
    </div>
  );
}
