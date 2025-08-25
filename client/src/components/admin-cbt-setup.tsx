import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Save, Eye, Clock, Users, FileText, CheckCircle, XCircle } from "lucide-react";
import { 
  CBTQuestion, 
  createCBTQuestion, 
  updateCBTQuestion, 
  deleteCBTQuestion, 
  getCBTQuestions,
  CBTExam,
  createCBTExam,
  getCBTExams
} from "@/lib/cbtService";

interface CBTSettings {
  examTitle: string;
  duration: number; // in minutes
  totalQuestions: number;
  subjects: string[];
  randomization: boolean;
  showResults: boolean;
  passingScore: number;
}

export default function AdminCBTSetup() {
  const [questions, setQuestions] = useState<CBTQuestion[]>([]);
  const [settings, setSettings] = useState<CBTSettings>({
    examTitle: "CSS FARMS CBT Examination",
    duration: 120,
    totalQuestions: 50,
    subjects: ["Agriculture", "General Knowledge", "English"],
    randomization: true,
    showResults: true,
    passingScore: 50
  });
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<CBTQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    subject: "",
    topic: "",
    question: "",
    questionType: "multiple_choice" as const,
    options: ["", "", "", ""],
    correctAnswer: "",
    difficulty: "medium" as const
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState({ type: 'success' as 'success' | 'error', title: '', content: '' });

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const questionsData = await getCBTQuestions();
      setQuestions(questionsData);
    } catch (error) {
      console.error('Error loading questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    try {
      setSaving(true);
      
      // Validate question form
      if (!questionForm.subject.trim()) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Please select a subject' });
        setShowMessage(true);
        return;
      }
      
      if (!questionForm.topic.trim()) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Please enter a topic' });
        setShowMessage(true);
        return;
      }
      
      if (!questionForm.question.trim()) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Please enter a question' });
        setShowMessage(true);
        return;
      }
      
      if (questionForm.questionType === 'fill_blank') {
        if (!questionForm.correctAnswer.trim()) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Please enter the correct answer for fill in the blank question' });
          setShowMessage(true);
          return;
        }
      } else {
        // For multiple choice and true/false
        const validOptions = questionForm.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Please provide at least 2 options' });
          setShowMessage(true);
          return;
        }
        
        if (!questionForm.correctAnswer.trim()) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Please select a correct answer' });
          setShowMessage(true);
          return;
        }
        
        if (!validOptions.includes(questionForm.correctAnswer)) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Correct answer must be one of the provided options' });
          setShowMessage(true);
          return;
        }
      }
      
      const questionId = await createCBTQuestion({
        ...questionForm,
        isActive: true
      });
      
      // Reload questions to get the updated list
      await loadQuestions();
      
      setQuestionForm({
        subject: "",
        topic: "",
        question: "",
        questionType: "multiple_choice",
        options: ["", "", "", ""],
        correctAnswer: "",
        difficulty: "medium"
      });
      setShowQuestionModal(false);
      setMessage({ type: 'success', title: 'Success!', content: 'Question added successfully!' });
      setShowMessage(true);
    } catch (error) {
      console.error('Error adding question:', error);
      setMessage({ type: 'error', title: 'Error', content: 'Error adding question. Please try again.' });
      setShowMessage(true);
    } finally {
      setSaving(false);
    }
  };

  const handleEditQuestion = (question: CBTQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      subject: question.subject,
      topic: question.topic,
      question: question.question,
      questionType: question.questionType,
      options: question.options,
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty
    });
    setShowQuestionModal(true);
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    
    try {
      setSaving(true);
      
      // Validate question form
      if (!questionForm.subject.trim()) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Please select a subject' });
        setShowMessage(true);
        return;
      }
      
      if (!questionForm.topic.trim()) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Please enter a topic' });
        setShowMessage(true);
        return;
      }
      
      if (!questionForm.question.trim()) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Please enter a question' });
        setShowMessage(true);
        return;
      }
      
      if (questionForm.questionType === 'fill_blank') {
        if (!questionForm.correctAnswer.trim()) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Please enter the correct answer for fill in the blank question' });
          setShowMessage(true);
          return;
        }
      } else {
        // For multiple choice and true/false
        const validOptions = questionForm.options.filter(opt => opt.trim() !== '');
        if (validOptions.length < 2) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Please provide at least 2 options' });
          setShowMessage(true);
          return;
        }
        
        if (!questionForm.correctAnswer.trim()) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Please select a correct answer' });
          setShowMessage(true);
          return;
        }
        
        if (!validOptions.includes(questionForm.correctAnswer)) {
          setMessage({ type: 'error', title: 'Validation Error', content: 'Correct answer must be one of the provided options' });
          setShowMessage(true);
          return;
        }
      }
      
      await updateCBTQuestion(editingQuestion.id, questionForm);
      
      // Reload questions to get the updated list
      await loadQuestions();
      
      setEditingQuestion(null);
      setShowQuestionModal(false);
      setMessage({ type: 'success', title: 'Success!', content: 'Question updated successfully!' });
      setShowMessage(true);
    } catch (error) {
      console.error('Error updating question:', error);
      setMessage({ type: 'error', title: 'Error', content: 'Error updating question. Please try again.' });
      setShowMessage(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    setMessage({ 
      type: 'error', 
      title: 'Confirm Deletion', 
      content: 'Are you sure you want to delete this question? This action cannot be undone.' 
    });
    setShowMessage(true);
    
    // We'll handle the confirmation in the message dialog
    const shouldDelete = window.confirm('Are you sure you want to delete this question? This action cannot be undone.');
    if (!shouldDelete) {
      return;
    }
    
    try {
      await deleteCBTQuestion(id);
      // Reload questions to get the updated list
      await loadQuestions();
      setMessage({ type: 'success', title: 'Success!', content: 'Question deleted successfully!' });
      setShowMessage(true);
    } catch (error) {
      console.error('Error deleting question:', error);
      setMessage({ type: 'error', title: 'Error', content: 'Error deleting question. Please try again.' });
      setShowMessage(true);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionForm.options];
    newOptions[index] = value;
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const handleQuestionTypeChange = (type: 'multiple_choice' | 'true_false' | 'fill_blank') => {
    let newOptions: string[] = [];
    let newCorrectAnswer = "";

    switch (type) {
      case 'multiple_choice':
        newOptions = ["", "", "", ""];
        break;
      case 'true_false':
        newOptions = ["True", "False"];
        break;
      case 'fill_blank':
        newOptions = [""]; // For fill in the blank, we'll handle this differently
        break;
    }

    setQuestionForm({
      ...questionForm,
      questionType: type,
      options: newOptions,
      correctAnswer: newCorrectAnswer
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'bg-blue-100 text-blue-800';
      case 'true_false': return 'bg-purple-100 text-purple-800';
      case 'fill_blank': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQuestionTypeDisplayName = (type: string) => {
    switch (type) {
      case 'multiple_choice': return 'Multiple Choice';
      case 'true_false': return 'True/False';
      case 'fill_blank': return 'Fill in Blank';
      default: return type;
    }
  };

  const handleCreateExam = async () => {
    try {
      setSaving(true);
      
      // Validate settings
      if (!settings.examTitle.trim()) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Please enter an exam title' });
        setShowMessage(true);
        return;
      }
      
      if (settings.duration <= 0) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Duration must be greater than 0' });
        setShowMessage(true);
        return;
      }
      
      if (settings.totalQuestions <= 0) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Total questions must be greater than 0' });
        setShowMessage(true);
        return;
      }
      
      if (settings.passingScore < 0 || settings.passingScore > 100) {
        setMessage({ type: 'error', title: 'Validation Error', content: 'Passing score must be between 0 and 100' });
        setShowMessage(true);
        return;
      }
      
      // Check if there are enough questions
      const activeQuestions = questions.filter(q => q.isActive);
      if (activeQuestions.length < settings.totalQuestions) {
        setMessage({ 
          type: 'error', 
          title: 'Insufficient Questions', 
          content: `You need at least ${settings.totalQuestions} active questions. Currently you have ${activeQuestions.length} active questions.` 
        });
        setShowMessage(true);
        return;
      }
      
      const examId = await createCBTExam({
        title: settings.examTitle,
        duration: settings.duration,
        totalQuestions: settings.totalQuestions,
        passingScore: settings.passingScore,
        subjects: settings.subjects,
        randomization: settings.randomization,
        showResults: settings.showResults,
        isActive: true
      });
      
             setMessage({ 
         type: 'success', 
         title: 'Exam Published Successfully!', 
         content: `Exam "${settings.examTitle}" has been published and is now available for trainees to take. Exam ID: ${examId}` 
       });
      setShowMessage(true);
    } catch (error) {
      console.error('Error creating exam:', error);
             setMessage({ type: 'error', title: 'Error', content: 'Error publishing exam. Please try again.' });
      setShowMessage(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading CBT setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
                 <div>
           <h2 className="text-2xl font-bold text-gray-800">CBT Exam Setup</h2>
           <p className="text-gray-600">Configure and publish Computer-Based Test for trainees</p>
         </div>
                 <div className="flex space-x-2">
           <Button 
             onClick={handleCreateExam} 
             disabled={saving}
             className="bg-green-600 hover:bg-green-700"
           >
             <CheckCircle className="h-4 w-4 mr-2" />
             {saving ? 'Publishing...' : 'Publish Exam'}
           </Button>
          <Button onClick={() => setShowQuestionModal(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Exam Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="examTitle">Exam Title</Label>
              <Input
                id="examTitle"
                value={settings.examTitle}
                onChange={(e) => setSettings({ ...settings, examTitle: e.target.value })}
                placeholder="Enter exam title"
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={settings.duration}
                onChange={(e) => setSettings({ ...settings, duration: parseInt(e.target.value) })}
                placeholder="120"
              />
            </div>
            <div>
              <Label htmlFor="totalQuestions">Total Questions</Label>
              <Input
                id="totalQuestions"
                type="number"
                value={settings.totalQuestions}
                onChange={(e) => setSettings({ ...settings, totalQuestions: parseInt(e.target.value) })}
                placeholder="50"
              />
            </div>
            <div>
              <Label htmlFor="passingScore">Passing Score (%)</Label>
              <Input
                id="passingScore"
                type="number"
                value={settings.passingScore}
                onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) })}
                placeholder="50"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="randomization"
                checked={settings.randomization}
                onChange={(e) => setSettings({ ...settings, randomization: e.target.checked })}
              />
              <Label htmlFor="randomization">Enable Question Randomization</Label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showResults"
                checked={settings.showResults}
                onChange={(e) => setSettings({ ...settings, showResults: e.target.checked })}
              />
              <Label htmlFor="showResults">Show Results Immediately</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold">{questions.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Questions</p>
                <p className="text-2xl font-bold">{questions.filter(q => q.isActive).length}</p>
              </div>
              <Eye className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subjects</p>
                <p className="text-2xl font-bold">{settings.subjects.length}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Duration</p>
                <p className="text-2xl font-bold">{settings.duration}m</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Question Bank</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
                         <TableHeader>
               <TableRow>
                 <TableHead>Subject</TableHead>
                 <TableHead>Topic</TableHead>
                 <TableHead>Type</TableHead>
                 <TableHead>Question</TableHead>
                 <TableHead>Difficulty</TableHead>
                 <TableHead>Status</TableHead>
                 <TableHead>Actions</TableHead>
               </TableRow>
             </TableHeader>
            <TableBody>
                             {questions.map((question) => (
                 <TableRow key={question.id}>
                   <TableCell className="font-medium">{question.subject}</TableCell>
                   <TableCell>{question.topic}</TableCell>
                   <TableCell>
                     <Badge className={getQuestionTypeColor(question.questionType)}>
                       {getQuestionTypeDisplayName(question.questionType)}
                     </Badge>
                   </TableCell>
                   <TableCell className="max-w-xs truncate">{question.question}</TableCell>
                   <TableCell>
                     <Badge className={getDifficultyColor(question.difficulty)}>
                       {question.difficulty}
                     </Badge>
                   </TableCell>
                   <TableCell>
                     <Badge variant={question.isActive ? "default" : "secondary"}>
                       {question.isActive ? "Active" : "Inactive"}
                     </Badge>
                   </TableCell>
                   <TableCell>
                     <div className="flex space-x-2">
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleEditQuestion(question)}
                       >
                         <Edit className="h-4 w-4" />
                       </Button>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => handleDeleteQuestion(question.id)}
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                   </TableCell>
                 </TableRow>
               ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Question Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? "Edit Question" : "Add New Question"}
            </DialogTitle>
          </DialogHeader>
                     <div className="space-y-4">
             <div className="grid grid-cols-3 gap-4">
               <div>
                 <Label htmlFor="subject">Subject</Label>
                 <Select
                   value={questionForm.subject}
                   onValueChange={(value) => setQuestionForm({ ...questionForm, subject: value })}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select subject" />
                   </SelectTrigger>
                   <SelectContent>
                     {settings.subjects.map((subject) => (
                       <SelectItem key={subject} value={subject}>
                         {subject}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label htmlFor="questionType">Question Type</Label>
                 <Select
                   value={questionForm.questionType}
                   onValueChange={(value: 'multiple_choice' | 'true_false' | 'fill_blank') => 
                     handleQuestionTypeChange(value)
                   }
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                     <SelectItem value="true_false">True/False</SelectItem>
                     <SelectItem value="fill_blank">Fill in Blank</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div>
                 <Label htmlFor="difficulty">Difficulty</Label>
                 <Select
                   value={questionForm.difficulty}
                   onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                     setQuestionForm({ ...questionForm, difficulty: value })
                   }
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="easy">Easy</SelectItem>
                     <SelectItem value="medium">Medium</SelectItem>
                     <SelectItem value="hard">Hard</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
             </div>
            <div>
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={questionForm.topic}
                onChange={(e) => setQuestionForm({ ...questionForm, topic: e.target.value })}
                placeholder="Enter topic"
              />
            </div>
            <div>
              <Label htmlFor="question">Question</Label>
              <Textarea
                id="question"
                value={questionForm.question}
                onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                placeholder="Enter your question here..."
                rows={3}
              />
            </div>
                         <div>
               <Label>
                 {questionForm.questionType === 'fill_blank' ? 'Correct Answer' : 'Options'}
               </Label>
               <div className="space-y-2">
                 {questionForm.questionType === 'fill_blank' ? (
                   <div>
                     <Input
                       placeholder="Enter the correct answer"
                       value={questionForm.correctAnswer}
                       onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                     />
                     <p className="text-xs text-gray-500 mt-1">
                       For fill in the blank questions, enter the exact answer that should be accepted
                     </p>
                   </div>
                 ) : (
                   questionForm.options.map((option, index) => (
                     <div key={index} className="flex items-center space-x-2">
                       <Input
                         placeholder={
                           questionForm.questionType === 'true_false' 
                             ? option 
                             : `Option ${String.fromCharCode(65 + index)}`
                         }
                         value={option}
                         onChange={(e) => handleOptionChange(index, e.target.value)}
                         disabled={questionForm.questionType === 'true_false'}
                       />
                       <input
                         type="radio"
                         name="correctAnswer"
                         value={option}
                         checked={questionForm.correctAnswer === option}
                         onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                       />
                       <Label className="text-sm">Correct</Label>
                     </div>
                   ))
                 )}
               </div>
             </div>
                         <div className="flex justify-end space-x-2">
               <Button variant="outline" onClick={() => setShowQuestionModal(false)} disabled={saving}>
                 Cancel
               </Button>
               <Button 
                 onClick={editingQuestion ? handleUpdateQuestion : handleAddQuestion}
                 disabled={saving}
                 className="bg-green-600 hover:bg-green-700"
               >
                 <Save className="h-4 w-4 mr-2" />
                 {saving ? 'Saving...' : (editingQuestion ? "Update" : "Add") + " Question"}
               </Button>
             </div>
          </div>
                 </DialogContent>
       </Dialog>

       {/* Message Dialog */}
       <Dialog open={showMessage} onOpenChange={setShowMessage}>
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle className={`flex items-center gap-2 ${
               message.type === 'success' ? 'text-green-600' : 'text-red-600'
             }`}>
               {message.type === 'success' ? (
                 <CheckCircle className="h-5 w-5 text-green-600" />
               ) : (
                 <XCircle className="h-5 w-5 text-red-600" />
               )}
               {message.title}
             </DialogTitle>
           </DialogHeader>
           <div className="space-y-4">
             <p className="text-gray-700">{message.content}</p>
             <div className="flex justify-end">
               <Button 
                 onClick={() => setShowMessage(false)}
                 className={message.type === 'success' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
               >
                 OK
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
