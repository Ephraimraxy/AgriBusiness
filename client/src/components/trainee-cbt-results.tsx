import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  Eye, 
  Trophy, 
  TrendingUp,
  FileText,
  User
} from "lucide-react";
import { 
  CBTExamAttempt, 
  getCBTExamAttempts, 
  getCBTExamAttempt,
  CBTQuestion,
  getActiveCBTQuestions
} from "@/lib/cbtService";

interface TraineeCBTResultsProps {
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
}

export default function TraineeCBTResults({ traineeId, traineeName, traineeEmail }: TraineeCBTResultsProps) {
  const [attempts, setAttempts] = useState<CBTExamAttempt[]>([]);
  const [selectedAttempt, setSelectedAttempt] = useState<CBTExamAttempt | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<CBTQuestion[]>([]);

  useEffect(() => {
    loadAttempts();
  }, [traineeId]);

  const loadAttempts = async () => {
    try {
      setLoading(true);
      const attemptsData = await getCBTExamAttempts(traineeId);
      setAttempts(attemptsData);
      
      // Load questions for detailed view
      const questionsData = await getActiveCBTQuestions();
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading attempts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (attempt: CBTExamAttempt) => {
    try {
      // Get the full attempt data
      const fullAttempt = await getCBTExamAttempt(attempt.id);
      if (fullAttempt) {
        setSelectedAttempt(fullAttempt);
        setShowDetailDialog(true);
      }
    } catch (error) {
      console.error('Error loading attempt details:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'abandoned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number, passingScore: number) => {
    if (score >= passingScore) return 'text-green-600';
    return 'text-red-600';
  };

  const getQuestionTypeDisplayName = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'fill_blank': return 'Fill in Blank';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (attempts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">CBT Exam Results</h2>
          <p className="text-gray-600">View your exam performance and history</p>
        </div>
        
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Exam Attempts Found</h3>
            <p className="text-gray-500 mb-4">
              You haven't taken any CBT exams yet. Complete an exam to see your results here.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate statistics
  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter(a => a.status === 'completed').length;
  const passedAttempts = attempts.filter(a => a.isPassed).length;
  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
    : 0;
  const bestScore = Math.max(...attempts.map(a => a.score));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">CBT Exam Results</h2>
        <p className="text-gray-600">View your exam performance and history</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attempts</p>
                <p className="text-2xl font-bold">{totalAttempts}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold">{completedAttempts}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Passed</p>
                <p className="text-2xl font-bold">{passedAttempts}</p>
              </div>
              <Trophy className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Best Score</p>
                <p className="text-2xl font-bold">{bestScore}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overall Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Overall Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Average Score</span>
                <span>{averageScore}%</span>
              </div>
              <Progress value={averageScore} className="h-2" />
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Pass Rate:</span>
                <span className="font-medium">
                  {totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Completion Rate:</span>
                <span className="font-medium">
                  {totalAttempts > 0 ? Math.round((completedAttempts / totalAttempts) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attempts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Attempts History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Time Spent</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt) => (
                <TableRow key={attempt.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span>{formatDate(attempt.startTime)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(attempt.status)}>
                      {attempt.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${getScoreColor(attempt.score, 50)}`}>
                      {attempt.score}%
                    </span>
                    {attempt.isPassed && (
                      <CheckCircle className="h-4 w-4 text-green-600 inline ml-1" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span>{formatDuration(attempt.timeSpent)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {attempt.correctAnswers}/{attempt.totalQuestions} correct
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(attempt)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detailed Results Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Exam Results Details</DialogTitle>
          </DialogHeader>
          
          {selectedAttempt && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${getScoreColor(selectedAttempt.score, 50)}`}>
                    {selectedAttempt.score}%
                  </div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedAttempt.correctAnswers}
                  </div>
                  <div className="text-sm text-gray-600">Correct</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {selectedAttempt.wrongAnswers}
                  </div>
                  <div className="text-sm text-gray-600">Wrong</div>
                </div>
                
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">
                    {selectedAttempt.unanswered}
                  </div>
                  <div className="text-sm text-gray-600">Unanswered</div>
                </div>
              </div>

              {/* Question Analysis */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Question Analysis</h3>
                <div className="space-y-3">
                  {questions.map((question) => {
                    const userAnswer = selectedAttempt.answers[question.id];
                    const isCorrect = userAnswer && 
                      userAnswer.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
                    const isAnswered = userAnswer && userAnswer.trim() !== '';
                    
                    return (
                      <div key={question.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge className={getQuestionTypeDisplayName(question.questionType) === 'Multiple Choice' ? 'bg-blue-100 text-blue-800' : 
                                              getQuestionTypeDisplayName(question.questionType) === 'True/False' ? 'bg-purple-100 text-purple-800' : 
                                              'bg-orange-100 text-orange-800'}>
                              {getQuestionTypeDisplayName(question.questionType)}
                            </Badge>
                            <Badge className={
                              question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }>
                              {question.difficulty}
                            </Badge>
                          </div>
                          <div className="flex items-center space-x-2">
                            {isAnswered ? (
                              isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600" />
                              )
                            ) : (
                              <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        
                        <p className="text-gray-800 mb-3">{question.question}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium text-gray-600">Your Answer: </span>
                            <span className={isAnswered ? (isCorrect ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}>
                              {isAnswered ? userAnswer : 'Not answered'}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium text-gray-600">Correct Answer: </span>
                            <span className="text-green-600">{question.correctAnswer}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Exam Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Exam Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Start Time: </span>
                    <span>{formatDate(selectedAttempt.startTime)}</span>
                  </div>
                  {selectedAttempt.endTime && (
                    <div>
                      <span className="text-gray-600">End Time: </span>
                      <span>{formatDate(selectedAttempt.endTime)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">Time Spent: </span>
                    <span>{formatDuration(selectedAttempt.timeSpent)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status: </span>
                    <Badge className={getStatusColor(selectedAttempt.status)}>
                      {selectedAttempt.status.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
