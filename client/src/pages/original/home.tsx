import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import EvaluationService, { EvaluationQuestion } from "@/lib/evaluationService";
import { 
  GraduationCap, 
  UserPlus, 
  Users, 
  Bus, 
  Presentation, 
  BarChart3, 
  Settings,
  Building2,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  Activity,
  FileText,
  Star,
  Award,
  Calendar,
  PieChart,
  BarChart,
  IdCard,
  UserCheck,
  Users2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [evaluationQuestions, setEvaluationQuestions] = useState<EvaluationQuestion[]>([]);
  const [isEvaluationPublished, setIsEvaluationPublished] = useState(false);
  const [evaluationFormData, setEvaluationFormData] = useState<Record<string, any>>({});
  const [showGenerateIdModal, setShowGenerateIdModal] = useState(false);

  const evaluationService = EvaluationService.getInstance();

  useEffect(() => {
    const state = evaluationService.getState();
    setEvaluationQuestions(state.questions);
    setIsEvaluationPublished(state.isPublished);
  }, []);

  const handleSubmitEvaluation = () => {
    // Extract course title and resource person from form data
    const courseTitle = evaluationFormData['1'] || '';
    const resourcePerson = evaluationFormData['3'] || '';
    const date = evaluationFormData['2'] || new Date().toISOString().split('T')[0];

    // Submit response to service
    evaluationService.submitResponse({
      courseTitle,
      date,
      resourcePerson,
      responses: evaluationFormData
    });

    // Reset form and close modal
    setEvaluationFormData({});
    setShowEvaluationModal(false);
  };

  const handleStaffIdGeneration = () => {
    setShowGenerateIdModal(false);
    // Navigate to staff ID generation page
            setLocation('/staff-id-generation');
  };

  const handleResourcePersonIdGeneration = () => {
    setShowGenerateIdModal(false);
    // Navigate to resource person ID generation page
            setLocation('/resource-person-id-generation');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <GraduationCap className="text-2xl text-primary mr-3" size={32} />
              <h1 className="text-xl font-semibold text-foreground">Training Management System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/original/login">
                <Button variant="ghost" className="text-muted-foreground hover:text-foreground font-medium">
                  Login
                </Button>
              </Link>
              <Link href="/original/dashboard">
                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to Training Management Portal</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Streamline your training operations with our comprehensive management system. 
            Register participants, manage resources, and track progress all in one place.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Registration Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="text-2xl text-primary" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Registration</h3>
                <p className="text-muted-foreground mb-6">Register new users in the system as staff, resource persons, or trainees.</p>
                <Link href="/original/registration">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                    Start Registration
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* View Trainees Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="text-2xl text-secondary-foreground" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">View Trainees</h3>
                <p className="text-muted-foreground mb-6">Manage registered trainees, view their details, room assignments, and tag numbers.</p>
                <Link href="/original/view-trainees">
                  <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80">
                    View Trainees
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Resort Management Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="text-2xl text-teal-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Resort Management</h3>
                <p className="text-gray-600 mb-6">Manage resort facilities, room allocations, and accommodation services.</p>
                <Link href="/original/resort-management">
                  <Button className="w-full bg-teal-600 hover:bg-teal-700">
                    Manage Resort
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Monitoring and Evaluation Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="text-2xl text-indigo-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Monitoring & Evaluation</h3>
                <p className="text-gray-600 mb-6">Track training progress, evaluate outcomes, and generate performance reports.</p>
                <Link href="/original/evaluation-setup">
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700">
                    Open M&E Portal
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Evaluation Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-2xl text-purple-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Evaluation</h3>
                <p className="text-gray-600 mb-6">Conduct comprehensive assessments, surveys, and performance evaluations.</p>
                <div className="space-y-2">
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => setShowEvaluationModal(true)}
                  >
                    Start Evaluation
                  </Button>
                  <Link href="/original/evaluation-results">
                    <Button 
                      variant="outline"
                      className="w-full"
                    >
                      View Results
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>



          {/* Reports Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="text-2xl text-red-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Reports</h3>
                <p className="text-gray-600 mb-6">Generate comprehensive reports and analytics for training programs.</p>
                <Button className="w-full bg-gray-400 cursor-not-allowed" disabled>
                  Coming Soon
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sponsors Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="text-2xl text-orange-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Sponsors</h3>
                <p className="text-gray-600 mb-6">Manage training sponsors and funding organizations.</p>
                <Link href="/original/sponsors">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700">
                    Manage Sponsors
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Generate ID Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <IdCard className="text-2xl text-emerald-600" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Generate ID</h3>
                <p className="text-gray-600 mb-6">Generate unique identification numbers for staff and resource persons.</p>
                <Button 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => setShowGenerateIdModal(true)}
                >
                  Generate ID
                </Button>
              </div>
            </CardContent>
          </Card>

                    {/* Certificate Generation Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Download className="text-2xl text-green-600 dark:text-green-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Certificate Generation</h3>
                <p className="text-muted-foreground mb-6">Generate and download certificates for all registered users with bulk download options.</p>
                <Link href="/original/certificate-generation">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                    Generate Certificates
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Theme Demo Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Settings className="text-2xl text-purple-600 dark:text-purple-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">Theme Demo</h3>
                <p className="text-muted-foreground mb-6">Explore the dark and light theme system with interactive examples.</p>
                <Link href="/original/theme-demo">
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    View Theme Demo
                </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Evaluation Modal */}
        <Dialog open={showEvaluationModal} onOpenChange={setShowEvaluationModal}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-2xl">
                <FileText className="text-purple-600" size={28} />
                Training Evaluation Form
              </DialogTitle>
              <DialogDescription className="text-lg">
                {isEvaluationPublished 
                  ? "Complete this evaluation form to help us improve our training programs"
                  : "Evaluation is currently closed. Please check back later."
                }
              </DialogDescription>
            </DialogHeader>
            
            {isEvaluationPublished ? (
              <div className="space-y-6">
                {/* Form Header */}
                <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-2">Training Evaluation Form</h3>
                  <p className="text-sm text-purple-700">Please complete this evaluation form to help us improve our training programs.</p>
                </div>

                {/* Dynamic Evaluation Questions */}
                <div className="space-y-4">
                  {evaluationQuestions.map((question) => (
                    <div key={question.id} className="border rounded-lg p-4">
                      <label className="block text-sm font-medium text-gray-900 mb-2">
                        {question.question}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {question.type === 'text' && (
                        <Input 
                          placeholder="Enter your answer..."
                          value={evaluationFormData[question.id] || ''}
                          onChange={(e) => setEvaluationFormData({
                            ...evaluationFormData,
                            [question.id]: e.target.value
                          })}
                        />
                      )}

                      {question.type === 'select' && question.options && (
                        <select
                          value={evaluationFormData[question.id] || ''}
                          onChange={(e) => setEvaluationFormData({
                            ...evaluationFormData,
                            [question.id]: e.target.value
                          })}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select an option...</option>
                          {question.options.map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      )}

                      {question.type === 'radio' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${question.id}-${index}`}
                                name={question.id}
                                value={option}
                                checked={evaluationFormData[question.id] === option}
                                onChange={(e) => setEvaluationFormData({
                                  ...evaluationFormData,
                                  [question.id]: e.target.value
                                })}
                                className="rounded-full border-gray-300"
                              />
                              <label htmlFor={`${question.id}-${index}`} className="text-sm text-gray-700">
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}

                      {question.type === 'textarea' && (
                        <Textarea 
                          placeholder="Enter your answer..."
                          rows={4}
                          value={evaluationFormData[question.id] || ''}
                          onChange={(e) => setEvaluationFormData({
                            ...evaluationFormData,
                            [question.id]: e.target.value
                          })}
                        />
                      )}

                      {question.type === 'rating' && question.options && (
                        <div className="space-y-2">
                          {question.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${question.id}-${index}`}
                                name={question.id}
                                value={option}
                                checked={evaluationFormData[question.id] === option}
                                onChange={(e) => setEvaluationFormData({
                                  ...evaluationFormData,
                                  [question.id]: e.target.value
                                })}
                                className="rounded-full border-gray-300"
                              />
                              <label htmlFor={`${question.id}-${index}`} className="text-sm text-gray-700">
                                {option}
                              </label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-gray-400" size={32} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Evaluation Coming Soon</h3>
                <p className="text-gray-600 mb-4">
                  The evaluation form is currently closed. Please check back later when it becomes available.
                </p>
                <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                  Evaluation Closed
                </Badge>
              </div>
            )}

            <DialogFooter className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setShowEvaluationModal(false)}
              >
                Close
              </Button>
              {isEvaluationPublished && (
                <Button 
                  className="bg-purple-600 hover:bg-purple-700"
                  onClick={handleSubmitEvaluation}
                >
                  <CheckCircle className="mr-2" size={16} />
                  Submit Evaluation
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate ID Modal */}
        <Dialog open={showGenerateIdModal} onOpenChange={setShowGenerateIdModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <IdCard className="text-emerald-600" size={24} />
                Generate ID Numbers
              </DialogTitle>
              <DialogDescription className="text-base">
                Choose the type of ID you want to generate:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Staff ID Option */}
              <Button 
                onClick={handleStaffIdGeneration}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium"
              >
                <UserCheck className="mr-3" size={20} />
                Generate Staff IDs
              </Button>

              {/* Resource Person ID Option */}
              <Button 
                onClick={handleResourcePersonIdGeneration}
                className="w-full h-16 bg-amber-600 hover:bg-amber-700 text-white text-lg font-medium"
              >
                <Users2 className="mr-3" size={20} />
                Generate Resource Person IDs
              </Button>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowGenerateIdModal(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
