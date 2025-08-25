import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Button } from "@exam/components/ui/button";
import { FileText, PlusCircle, BookOpen, BarChart3, Archive, Video, Upload, Eye } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-slate-900 mb-4">
            Online Exam System
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Create, manage, and take exams with our comprehensive online examination platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {/* Setup Exam */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PlusCircle className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">Setup Test/Exam</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                Create new exams with multiple question types, set duration, and configure exam settings
              </p>
              <Button 
                onClick={() => navigate("/setup")}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Create Exam
              </Button>
            </CardContent>
          </Card>

          {/* Take Exam */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">Take Exam</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                View available exams and start taking them with real-time timer and navigation
              </p>
              <Button 
                onClick={() => navigate("/exams")}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                View Exams
              </Button>
            </CardContent>
          </Card>

          {/* View Results */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-purple-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">View Results</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                View exam results, export data as CSV/PDF, and analyze performance
              </p>
              <Button 
                onClick={() => navigate("/results")}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                View Results
              </Button>
            </CardContent>
          </Card>

          {/* View Exam Records */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Archive className="w-8 h-8 text-orange-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">Exam Records</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                View all past exam records and details for future reference
              </p>
              <Button 
                onClick={() => navigate("/exam-records")}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                View Records
              </Button>
            </CardContent>
          </Card>

          {/* Video Upload */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-red-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">Video Upload</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                Upload and manage video files with play and delete functionality
              </p>
              <Button 
                onClick={() => navigate("/videos")}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Manage Videos
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-teal-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">File Upload</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                Upload files of different formats and sizes with download options
              </p>
              <Button 
                onClick={() => navigate("/files")}
                className="w-full bg-teal-600 hover:bg-teal-700"
              >
                Manage Files
              </Button>
            </CardContent>
          </Card>

          {/* Video Details */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-indigo-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">Video Details</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                View all uploaded videos in a detailed table with play and download options
              </p>
              <Button 
                onClick={() => navigate("/video-details")}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                View Video Details
              </Button>
            </CardContent>
          </Card>

          {/* File Details */}
          <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-cyan-600" />
              </div>
              <CardTitle className="text-xl text-slate-900">File Details</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-slate-600 mb-6">
                View all uploaded files in a detailed table with view and download options
              </p>
              <Button 
                onClick={() => navigate("/file-details")}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                View File Details
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Multiple Question Types</h3>
                <p className="text-slate-600 text-sm">Support for MCQ, True/False, and Fill-in-the-blank questions</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Real-time Timer</h3>
                <p className="text-slate-600 text-sm">Countdown timer with auto-submit when time expires</p>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Instant Results</h3>
                <p className="text-slate-600 text-sm">Automatic grading with detailed performance analysis</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}