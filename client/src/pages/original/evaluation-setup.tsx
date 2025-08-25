import { Link } from "wouter";
import { useState, useEffect } from "react";
import EvaluationService, { EvaluationQuestion } from "@/lib/evaluationService";
import { 
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  FileText,
  Settings,
  Eye,
  Edit,
  CheckCircle,
  Globe,
  Lock,
  Unlock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";



export default function EvaluationSetupPage() {
  const evaluationService = EvaluationService.getInstance();
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [isPublished, setIsPublished] = useState(false);
  const [formTitle, setFormTitle] = useState('Training Evaluation Form');
  const [formDescription, setFormDescription] = useState('Complete this evaluation form to help us improve our training programs.');
  const [showPreview, setShowPreview] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EvaluationQuestion | null>(null);

  // Load initial state
  useEffect(() => {
    const state = evaluationService.getState();
    setQuestions(state.questions.length > 0 ? state.questions : [
      {
        id: '1',
        type: 'select',
        question: 'Course Title',
        options: ['Leadership Development', 'Digital Skills Workshop', 'Communication Skills', 'Project Management', 'Technical Training'],
        required: true,
        order: 1
      },
      {
        id: '2',
        type: 'text',
        question: 'Date',
        required: true,
        order: 2
      },
      {
        id: '3',
        type: 'select',
        question: 'Name of Resource Person',
        options: ['Dr. Sarah Johnson', 'Prof. Michael Chen', 'Ms. Emily Rodriguez', 'Mr. David Thompson', 'Dr. Lisa Wang'],
        required: true,
        order: 3
      },
      {
        id: '4',
        type: 'radio',
        question: 'Did the course content meet your expectation?',
        options: ['Yes', 'No', 'Somewhat'],
        required: true,
        order: 4
      },
      {
        id: '5',
        type: 'radio',
        question: 'Will the knowledge you gained be helpful to you?',
        options: ['Yes', 'No', 'Somewhat'],
        required: true,
        order: 5
      },
      {
        id: '6',
        type: 'radio',
        question: 'Is the resource person knowledgeable about the subject matter?',
        options: ['Yes', 'No', 'Somewhat'],
        required: true,
        order: 6
      },
      {
        id: '7',
        type: 'radio',
        question: 'Was the resource person able to explain and illustrate concepts?',
        options: ['Yes', 'No', 'Somewhat'],
        required: true,
        order: 7
      },
      {
        id: '8',
        type: 'radio',
        question: 'Was the resource person able to question well?',
        options: ['Yes', 'No', 'Somewhat'],
        required: true,
        order: 8
      },
      {
        id: '9',
        type: 'textarea',
        question: 'What recommendation do you have for the technical officer to improve?',
        required: false,
        order: 9
      },
      {
        id: '10',
        type: 'rating',
        question: 'What is your overall rating of the resource person?',
        options: ['Below Average', 'Average', 'Good', 'Excellent'],
        required: true,
        order: 10
      }
    ]);
    setIsPublished(state.isPublished);
  }, []);

  // Update service when questions change
  useEffect(() => {
    if (questions.length > 0) {
      evaluationService.updateQuestions(questions);
    }
  }, [questions]);

  const addQuestion = (question: Omit<EvaluationQuestion, 'id' | 'order'>) => {
    const newQuestion: EvaluationQuestion = {
      ...question,
      id: Date.now().toString(),
      order: questions.length + 1
    };
    setQuestions([...questions, newQuestion]);
    setShowAddQuestion(false);
  };

  const updateQuestion = (id: string, updates: Partial<EvaluationQuestion>) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, ...updates } : q));
    setEditingQuestion(null);
  };

  const deleteQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    const currentIndex = questions.findIndex(q => q.id === id);
    if (direction === 'up' && currentIndex > 0) {
      const newQuestions = [...questions];
      [newQuestions[currentIndex], newQuestions[currentIndex - 1]] = [newQuestions[currentIndex - 1], newQuestions[currentIndex]];
      setQuestions(newQuestions.map((q, index) => ({ ...q, order: index + 1 })));
    } else if (direction === 'down' && currentIndex < questions.length - 1) {
      const newQuestions = [...questions];
      [newQuestions[currentIndex], newQuestions[currentIndex + 1]] = [newQuestions[currentIndex + 1], newQuestions[currentIndex]];
      setQuestions(newQuestions.map((q, index) => ({ ...q, order: index + 1 })));
    }
  };

  const handlePublishEvaluation = () => {
    evaluationService.publishEvaluation();
    setIsPublished(true);
  };

  const handleCloseEvaluation = () => {
    evaluationService.closeEvaluation();
    setIsPublished(false);
  };

  const QuestionForm = ({ question, onSave, onCancel }: { 
    question?: EvaluationQuestion; 
    onSave: (question: Omit<EvaluationQuestion, 'id' | 'order'>) => void;
    onCancel: () => void;
  }) => {
    const [formData, setFormData] = useState({
      type: question?.type || 'text',
      question: question?.question || '',
      options: question?.options || [],
      required: question?.required || false
    });

    const [newOption, setNewOption] = useState('');

    const addOption = () => {
      if (newOption.trim() && !formData.options.includes(newOption.trim())) {
        setFormData({
          ...formData,
          options: [...formData.options, newOption.trim()]
        });
        setNewOption('');
      }
    };

    const removeOption = (index: number) => {
      setFormData({
        ...formData,
        options: formData.options.filter((_, i) => i !== index)
      });
    };

    const handleSave = () => {
      if (formData.question.trim()) {
        onSave({
          type: formData.type as 'text' | 'radio' | 'textarea' | 'rating' | 'select',
          question: formData.question.trim(),
          options: formData.type === 'radio' || formData.type === 'rating' || formData.type === 'select' ? formData.options : undefined,
          required: formData.required
        });
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question Type</label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text Input</SelectItem>
              <SelectItem value="select">Dropdown Select</SelectItem>
              <SelectItem value="radio">Multiple Choice</SelectItem>
              <SelectItem value="textarea">Long Text</SelectItem>
              <SelectItem value="rating">Rating Scale</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Question Text</label>
          <Textarea
            value={formData.question}
            onChange={(e) => setFormData({ ...formData, question: e.target.value })}
            placeholder="Enter your question here..."
            rows={3}
          />
        </div>

        {(formData.type === 'radio' || formData.type === 'rating' || formData.type === 'select') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input value={option} readOnly className="flex-1" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  placeholder="Add new option..."
                  onKeyPress={(e) => e.key === 'Enter' && addOption()}
                />
                <Button type="button" onClick={addOption} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="required"
            checked={formData.required}
            onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
            className="rounded border-gray-300"
          />
          <label htmlFor="required" className="text-sm font-medium text-gray-700">
            Required question
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
            <Save className="mr-2 h-4 w-4" />
            Save Question
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const PreviewForm = () => {
    const [formData, setFormData] = useState<Record<string, any>>({});

    const handleInputChange = (questionId: string, value: any) => {
      setFormData({ ...formData, [questionId]: value });
    };

    return (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">{formTitle}</h3>
          <p className="text-sm text-blue-700">{formDescription}</p>
        </div>

        <div className="space-y-4">
          {questions.map((q) => (
            <div key={q.id} className="border rounded-lg p-4">
              <div className="flex items-start gap-2 mb-3">
                <span className="text-sm font-medium text-gray-500">Q{q.order}</span>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    {q.question}
                    {q.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {q.type === 'text' && (
                    <Input
                      placeholder="Enter your answer..."
                      value={formData[q.id] || ''}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                    />
                  )}

                  {q.type === 'select' && q.options && (
                    <Select value={formData[q.id] || ''} onValueChange={(value) => handleInputChange(q.id, value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option..." />
                      </SelectTrigger>
                      <SelectContent>
                        {q.options.map((option, index) => (
                          <SelectItem key={index} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {q.type === 'textarea' && (
                    <Textarea
                      placeholder="Enter your answer..."
                      value={formData[q.id] || ''}
                      onChange={(e) => handleInputChange(q.id, e.target.value)}
                      rows={4}
                    />
                  )}

                  {q.type === 'radio' && q.options && (
                    <div className="space-y-2">
                      {q.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`${q.id}-${index}`}
                            name={q.id}
                            value={option}
                            checked={formData[q.id] === option}
                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                            className="rounded-full border-gray-300"
                          />
                          <label htmlFor={`${q.id}-${index}`} className="text-sm text-gray-700">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}

                  {q.type === 'rating' && q.options && (
                    <div className="space-y-2">
                      {q.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="radio"
                            id={`${q.id}-${index}`}
                            name={q.id}
                            value={option}
                            checked={formData[q.id] === option}
                            onChange={(e) => handleInputChange(q.id, e.target.value)}
                            className="rounded-full border-gray-300"
                          />
                          <label htmlFor={`${q.id}-${index}`} className="text-sm text-gray-700">
                            {option}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <Button className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="mr-2 h-4 w-4" />
            Submit Evaluation
          </Button>
          <Button variant="outline" onClick={() => setShowPreview(false)}>
            Close Preview
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link href="/original/home">
                <Button variant="ghost" className="mr-4">
                  <ArrowLeft className="mr-2" size={16} />
                  Back to Home
                </Button>
              </Link>
              <FileText className="text-2xl text-indigo-600 mr-3" size={32} />
              <h1 className="text-xl font-semibold text-gray-900">Evaluation Setup</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)}
                className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
              >
                <Eye className="mr-2" size={16} />
                Preview Form
              </Button>
              <Button 
                onClick={isPublished ? handleCloseEvaluation : handlePublishEvaluation}
                className={isPublished ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
              >
                {isPublished ? <Lock className="mr-2" size={16} /> : <Globe className="mr-2" size={16} />}
                {isPublished ? 'Close Evaluation' : 'Publish Evaluation'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Evaluation Form Builder</h2>
          <p className="text-lg text-gray-600">
            Create and configure evaluation questions for training assessments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Questions List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="text-indigo-600" size={20} />
                    Evaluation Questions ({questions.length})
                  </CardTitle>
                  <Button 
                    onClick={() => setShowAddQuestion(true)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="mr-2" size={16} />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700">
                              Q{question.order}
                            </Badge>
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              {question.type}
                            </Badge>
                            {question.required && (
                              <Badge variant="secondary" className="bg-red-100 text-red-700">
                                Required
                              </Badge>
                            )}
                          </div>
                          <h4 className="font-medium text-gray-900 mb-2">{question.question}</h4>
                          {question.options && (
                            <div className="text-sm text-gray-600">
                              Options: {question.options.join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingQuestion(question)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => deleteQuestion(question.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveQuestion(question.id, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveQuestion(question.id, 'down')}
                          disabled={index === questions.length - 1}
                        >
                          ↓
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Form Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="text-gray-600" size={20} />
                  Form Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Form Title</label>
                  <Input 
                    placeholder="Training Evaluation Form" 
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <Textarea 
                    placeholder="Brief description of the evaluation form..."
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Publication Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {isPublished ? <Globe className="text-green-600" size={20} /> : <Lock className="text-gray-600" size={20} />}
                  Publication Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={isPublished ? "default" : "secondary"} className={isPublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-700"}>
                    {isPublished ? 'Published' : 'Draft'}
                  </Badge>
                  <span className="text-sm text-gray-600">
                    {isPublished ? 'Evaluation is live and accepting responses' : 'Evaluation is in draft mode'}
                  </span>
                </div>
                <Button 
                  onClick={isPublished ? handleCloseEvaluation : handlePublishEvaluation}
                  className={isPublished ? "bg-red-600 hover:bg-red-700 w-full" : "bg-green-600 hover:bg-green-700 w-full"}
                >
                  {isPublished ? <Lock className="mr-2" size={16} /> : <Globe className="mr-2" size={16} />}
                  {isPublished ? 'Close Evaluation' : 'Publish Evaluation'}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="text-gray-600" size={20} />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview Form
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Save className="mr-2 h-4 w-4" />
                  Export Form
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add/Edit Question Dialog */}
        <Dialog open={showAddQuestion || !!editingQuestion} onOpenChange={() => {
          setShowAddQuestion(false);
          setEditingQuestion(null);
        }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Edit Question' : 'Add New Question'}
              </DialogTitle>
              <DialogDescription>
                Configure your evaluation question settings and options.
              </DialogDescription>
            </DialogHeader>
            <QuestionForm
              question={editingQuestion || undefined}
              onSave={(question) => {
                if (editingQuestion) {
                  updateQuestion(editingQuestion.id, question);
                } else {
                  addQuestion(question);
                }
              }}
              onCancel={() => {
                setShowAddQuestion(false);
                setEditingQuestion(null);
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="text-green-600" size={20} />
                Form Preview
              </DialogTitle>
              <DialogDescription>
                Preview how your evaluation form will appear to participants.
              </DialogDescription>
            </DialogHeader>
            <PreviewForm />
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
} 