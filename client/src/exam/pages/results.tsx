import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Button } from "@exam/components/ui/button";
import { Badge } from "@exam/components/ui/badge";
import {
  CheckCircle,
  XCircle,
  Clock,
  Download,
  ArrowLeft,
  Award,
  Target,
  TrendingUp,
} from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@exam/hooks/useAuth";

interface ResultData {
  attempt: {
    submittedAt: string;
    startedAt: string;
  };
  results: any[];
  score: number;
  totalQuestions: number;
  percentage: number;
}

export default function Results() {
  const { attemptId } = useParams();
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const { data: results, isLoading } = useQuery<ResultData>({
    queryKey: ["/api/attempts", attemptId, "results"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-slate-600">Results not found.</p>
            <Button onClick={() => navigate(user?.role === "admin" ? "/admin" : "/student")} className="mt-4">
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { attempt, results: questionResults, score, totalQuestions, percentage } = results;
  const timeTaken = Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000 / 60);

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return "text-green-500";
    if (percentage >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: "A+", color: "bg-green-500" };
    if (percentage >= 80) return { grade: "A", color: "bg-green-400" };
    if (percentage >= 70) return { grade: "B", color: "bg-blue-500" };
    if (percentage >= 60) return { grade: "C", color: "bg-yellow-500" };
    if (percentage >= 50) return { grade: "D", color: "bg-orange-500" };
    return { grade: "F", color: "bg-red-500" };
  };

  const gradeInfo = getGrade(percentage);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate(user?.role === "admin" ? "/admin" : "/student")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="space-y-6">
          {/* Result Summary Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Exam Results</CardTitle>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardHeader>
            
            {/* Score Summary */}
            <CardContent className="p-6 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
                <div>
                  <div className={`text-4xl font-bold ${getScoreColor(percentage)}`}>
                    {score}
                  </div>
                  <div className="text-sm text-slate-600 flex items-center justify-center mt-1">
                    <Target className="w-4 h-4 mr-1" />
                    Correct Answers
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-red-500">
                    {totalQuestions - score}
                  </div>
                  <div className="text-sm text-slate-600 flex items-center justify-center mt-1">
                    <XCircle className="w-4 h-4 mr-1" />
                    Incorrect
                  </div>
                </div>
                <div>
                  <div className={`text-4xl font-bold ${getScoreColor(percentage)}`}>
                    {percentage}%
                  </div>
                  <div className="text-sm text-slate-600 flex items-center justify-center mt-1">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Final Score
                  </div>
                </div>
                <div>
                  <div className="text-4xl font-bold text-slate-700">
                    {timeTaken}m
                  </div>
                  <div className="text-sm text-slate-600 flex items-center justify-center mt-1">
                    <Clock className="w-4 h-4 mr-1" />
                    Time Taken
                  </div>
                </div>
              </div>

              {/* Grade Badge */}
              <div className="flex justify-center mt-6">
                <div className={`${gradeInfo.color} text-white px-6 py-3 rounded-full flex items-center space-x-2`}>
                  <Award className="w-6 h-6" />
                  <span className="text-xl font-bold">Grade: {gradeInfo.grade}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Results */}
          <Card>
            <CardHeader>
              <CardTitle>Answer Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {questionResults.map((result: any, index: number) => (
                  <div key={index} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-medium text-slate-900 flex-1 pr-4">
                        {index + 1}. {result.question.questionText}
                      </h3>
                      <Badge 
                        variant={result.isCorrect ? "default" : "destructive"}
                        className={result.isCorrect ? "bg-green-500" : "bg-red-500"}
                      >
                        {result.isCorrect ? "Correct" : "Incorrect"}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-slate-600">Your Answer:</span>
                        <div className={`mt-1 flex items-center ${result.isCorrect ? "text-green-600" : "text-red-600"}`}>
                          {result.isCorrect ? (
                            <CheckCircle className="w-4 h-4 mr-2" />
                          ) : (
                            <XCircle className="w-4 h-4 mr-2" />
                          )}
                          <span className="font-medium">
                            {result.userAnswer || "No answer provided"}
                          </span>
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium text-slate-600">Correct Answer:</span>
                        <div className="mt-1 flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          <span className="font-medium">{result.correctAnswer}</span>
                        </div>
                      </div>
                    </div>

                    {/* Question Type Indicator */}
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <Badge variant="outline" className="text-xs">
                        {result.question.questionType === "mcq" ? "Multiple Choice" :
                         result.question.questionType === "true_false" ? "True/False" :
                         "Fill in the Blank"} • {result.question.points} point{result.question.points !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Performance Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">Overall Performance</span>
                  <span className={`text-sm font-semibold ${getScoreColor(percentage)}`}>
                    {percentage >= 80 ? "Excellent" :
                     percentage >= 60 ? "Good" :
                     percentage >= 40 ? "Fair" : "Needs Improvement"}
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${
                      percentage >= 80 ? "bg-green-500" :
                      percentage >= 60 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                  <div>
                    <span className="font-medium">Questions Attempted:</span>
                    <div className="text-slate-900">{questionResults.filter((r: any) => r.userAnswer).length} / {totalQuestions}</div>
                  </div>
                  <div>
                    <span className="font-medium">Accuracy Rate:</span>
                    <div className="text-slate-900">
                      {questionResults.filter((r: any) => r.userAnswer).length > 0 
                        ? Math.round((score / questionResults.filter((r: any) => r.userAnswer).length) * 100)
                        : 0}%
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
