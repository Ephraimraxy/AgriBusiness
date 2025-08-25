import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Button } from "@exam/components/ui/button";
import { Badge } from "@exam/components/ui/badge";
import { Input } from "@exam/components/ui/input";
import { Label } from "@exam/components/ui/label";
import { 
  Clock, 
  FileText, 
  Calendar,
  ArrowLeft,
  User,
  Mail,
  Play,
  Home
} from "lucide-react";
import { useLocation } from "wouter";
import type { Exam } from "@shared/schema";

export default function AvailableExams() {
  const [, navigate] = useLocation();
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");

  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams/available"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleStartExam = () => {
    if (!selectedExam || !studentName.trim() || !studentEmail.trim()) {
      return;
    }
    
    // Store student info in localStorage for the exam session
    localStorage.setItem('studentInfo', JSON.stringify({
      name: studentName,
      email: studentEmail
    }));
    
    navigate(`/exam/${selectedExam.id}/start`);
  };

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  if (selectedExam) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-4 mb-6">
            <Button 
              variant="ghost" 
              onClick={() => setSelectedExam(null)}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Exams
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
            >
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl text-slate-900">{selectedExam.title}</CardTitle>
              {selectedExam.description && (
                <p className="text-slate-600 mt-2">{selectedExam.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="flex items-center space-x-3">
                  <Clock className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-600">Duration</p>
                    <p className="font-semibold">{selectedExam.duration} minutes</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-slate-600">Start Time</p>
                    <p className="font-semibold">{formatDateTime(selectedExam.startTime)}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-slate-600">End Time</p>
                    <p className="font-semibold">{formatDateTime(selectedExam.endTime)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-lg mb-8">
                <h3 className="font-semibold text-slate-900 mb-4">Instructions</h3>
                <ul className="space-y-2 text-slate-700">
                  <li>• Read each question carefully before answering</li>
                  <li>• You can navigate between questions using the Previous/Next buttons</li>
                  <li>• Mark questions for review if you want to come back to them</li>
                  <li>• Submit your exam before the timer runs out</li>
                  <li>• The exam will auto-submit when time expires</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-slate-900">Student Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        type="text"
                        placeholder="Enter your full name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={studentEmail}
                        onChange={(e) => setStudentEmail(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Button 
                  onClick={handleStartExam}
                  disabled={!studentName.trim() || !studentEmail.trim()}
                  className="w-full md:w-auto bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Available Exams</h1>
            <p className="text-slate-600 mt-2">Select an exam to start taking it</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <FileText className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No exams available</h3>
              <p className="text-slate-600">There are currently no active exams to take.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam) => (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{exam.title}</CardTitle>
                    <Badge variant={exam.isActive ? "default" : "secondary"}>
                      {exam.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {exam.description && (
                    <p className="text-sm text-slate-600">{exam.description}</p>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Duration:</span>
                      <span className="font-medium">{exam.duration} minutes</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Start:</span>
                      <span className="font-medium">{formatDateTime(exam.startTime)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">End:</span>
                      <span className="font-medium">{formatDateTime(exam.endTime)}</span>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={() => setSelectedExam(exam)}
                    disabled={!exam.isActive}
                    className="w-full"
                  >
                    {exam.isActive ? "Take Exam" : "Not Available"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}