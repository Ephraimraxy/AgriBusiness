import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { z } from "zod";
// Local minimal types (replace with real shared types when available)
type Exam = {
  id: number;
  title: string;
  description?: string;
  duration: number; // Duration in minutes
  isActive: boolean;
};

type Question = {
  questionText: string;
  questionType: "mcq" | "true_false" | "fill_blank";
  options?: string[];
  correctAnswer: string;
  points: number;
  orderIndex: number;
};
import Header from "@/components/header";
import AdminSidebar from "@/components/admin-sidebar";

// ----------------- Validation Schema -----------------
const examSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  isActive: z.boolean(),
  questions: z.array(
    z.object({
      questionText: z.string().min(1, "Question text is required"),
      questionType: z.enum(["mcq", "true_false", "fill_blank"]),
      options: z.array(z.string()).optional(),
      correctAnswer: z.string().min(1, "Correct answer is required"),
      points: z.number().min(1, "Points must be at least 1"),
      orderIndex: z.number(),
    })
  ),
});

type ExamFormData = z.infer<typeof examSchema>;

interface AdminExamSetupProps {
  embedded?: boolean; // when true, render without header & sidebar
  [key: string]: any; // allow route params and other props
}

export default function AdminExamSetup({ embedded = false, ..._rest }: AdminExamSetupProps) {
  const { examId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = Boolean(examId);

  // ----------------- Data fetching -----------------
  const { data: exam, isLoading: examLoading } = useQuery<Exam>({
    queryKey: ["exam", examId],
    queryFn: () => apiRequest("GET", `/api/exams/${examId}`).then(res => res.json()),
    enabled: isEdit && !!examId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["exam-questions", examId],
    queryFn: () => apiRequest("GET", `/api/exams/${examId}/questions`).then(res => res.json()),
    enabled: isEdit && !!examId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // ----------------- Form -----------------
  const form = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: 60,
      isActive: true,
      questions: [
        {
          questionText: "",
          questionType: "mcq",
          options: ["", "", "", ""],
          correctAnswer: "",
          points: 1,
          orderIndex: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  // Pre-fill when editing
  useEffect(() => {
    if (isEdit && exam && questions.length > 0 && !form.formState.isDirty) {
      const formData = {
        title: exam.title,
        description: exam.description || "",
        duration: exam.duration,
        isActive: exam.isActive || false,
        questions: questions.map((q: any, idx: number) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || ["", "", "", ""],
          correctAnswer: q.correctAnswer,
          points: q.points || 1,
          orderIndex: idx,
        })),
      };
      form.reset(formData);
    }
  }, [exam, questions, isEdit, form]);

  // ----------------- Mutations -----------------
  const createExamMutation = useMutation({
    mutationFn: async (data: ExamFormData) => {
      try {
        const payload = {
          title: data.title,
          description: data.description,
          duration: data.duration,
          isActive: data.isActive,
        };
        
        console.log('Sending exam creation request with payload:', payload);
        const res = await apiRequest("POST", "/api/exams", payload);
        
        // First, get the response text to check if it's HTML
        const responseText = await res.text();
        console.log('Raw response:', responseText);
        
        // Try to parse as JSON
        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          console.error('Failed to parse response as JSON:', e);
          throw new Error('Server returned an invalid response. Please check the server logs.');
        }
        
        if (!res.ok) {
          console.error('API error response:', responseData);
          throw new Error(responseData.message || 'Failed to create exam');
        }
        
        const created = responseData;
        
        // Create questions in parallel with error handling
        const questionPromises = data.questions.map((q, index) => 
          apiRequest("POST", `/api/exams/${created.id}/questions`, q)
            .then(async (qRes) => {
              if (!qRes.ok) {
                const errorText = await qRes.text();
                console.error(`Failed to create question ${index + 1}:`, errorText);
                throw new Error(`Failed to create question ${index + 1}`);
              }
              return qRes.json();
            })
            .catch(error => {
              console.error(`Error in question ${index + 1} creation:`, error);
              throw error;
            })
        );
        
        await Promise.all(questionPromises);
        return created;
      } catch (error) {
        console.error('Exam creation error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams"] });
      toast({ title: "Exam Created", description: "New exam has been created successfully." });
      navigate("/admin-dashboard");
    },
    onError: (error: any) => {
      toast({ 
        title: "Creation Failed", 
        description: error.message || "An error occurred while creating the exam. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: async (data: ExamFormData) => {
      if (!examId) throw new Error('No exam ID provided');
      
      try {
        const updatePayload = {
          title: data.title,
          description: data.description,
          duration: data.duration,
          isActive: data.isActive,
        };
        
        console.log('Sending exam update request with payload:', updatePayload);
        const updateRes = await apiRequest("PUT", `/api/exams/${examId}`, updatePayload);
        
        // Get response text first to check if it's HTML
        const updateResponseText = await updateRes.text();
        console.log('Raw update response:', updateResponseText);
        
        // Try to parse as JSON
        let updateResponseData;
        try {
          updateResponseData = updateResponseText ? JSON.parse(updateResponseText) : {};
        } catch (e) {
          console.error('Failed to parse update response as JSON:', e);
          throw new Error('Server returned an invalid response when updating exam.');
        }
        
        if (!updateRes.ok) {
          console.error('Exam update API error:', updateResponseData);
          throw new Error(updateResponseData.message || 'Failed to update exam');
        }
        
        // Delete existing questions
        const deleteRes = await apiRequest("DELETE", `/api/exams/${examId}/questions`);
        if (!deleteRes.ok) {
          throw new Error('Failed to clear existing questions');
        }
        
        // Create new questions in parallel
        const questionPromises = data.questions.map(q => 
          apiRequest("POST", `/api/exams/${examId}/questions`, q)
            .then(res => {
              if (!res.ok) throw new Error('Failed to update question');
              return res.json();
            })
        );
        
        await Promise.all(questionPromises);
        return true;
      } catch (error) {
        console.error('Exam update error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exams", examId] });
      queryClient.invalidateQueries({ queryKey: ["exam-questions", examId] });
      toast({ 
        title: "Exam Updated", 
        description: "Exam has been updated successfully.",
        variant: "default"
      });
      navigate("/admin-dashboard");
    },
    onError: (error: any) => {
      toast({ 
        title: "Update Failed", 
        description: error.message || "An error occurred while updating the exam. Please try again.", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: ExamFormData) => {
    try {
      if (isEdit) {
        await updateExamMutation.mutateAsync(data);
      } else {
        await createExamMutation.mutateAsync(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
      // Error handling is already done in the mutation's onError
    }
  };

  const addQuestion = () => {
    append({
      questionText: "",
      questionType: "mcq",
      options: ["", "", "", ""],
      correctAnswer: "",
      points: 1,
      orderIndex: fields.length,
    });
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case "mcq":
        return "Multiple Choice";
      case "true_false":
        return "True / False";
      case "fill_blank":
        return "Fill in the Blank";
      default:
        return type;
    }
  };

  if ((isEdit && (examLoading || questionsLoading)) || createExamMutation.isPending || updateExamMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-600"></div>
          <p className="text-gray-600">
            {createExamMutation.isPending || updateExamMutation.isPending 
              ? 'Saving your changes...' 
              : 'Loading exam data...'}
          </p>
        </div>
      </div>
    );
  }

  // ----------------- UI -----------------
  const handleSidebarChange = (section: string) => {
    if (section === "exams" || section === "registration") return;
    navigate("/admin-dashboard");
  };
  const mainContent = (
    <main className="flex-1 p-6">
      <div className="max-w-5xl mx-auto space-y-8">
            <div className="mb-4">
              <h1 className="text-2xl font-bold">{isEdit ? "Edit Exam" : "Create Exam"}</h1>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* Exam Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Exam Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title *</Label>
                    <Input {...form.register("title", { valueAsNumber: false })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea rows={3} {...form.register("description")} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      {...form.register("duration", { valueAsNumber: true })}
                      placeholder="e.g. 60 for 1 hour"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Each student will have this many minutes to complete the exam
                    </p>
                    {form.formState.errors.duration && (
                      <p className="text-sm text-red-500">
                        {form.formState.errors.duration.message}
                      </p>
                    )}
                  </div>
                </div>
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={form.watch("isActive")}
                      onCheckedChange={(val) => form.setValue("isActive", val)}
                    />
                    <span className="text-sm">Activate Exam</span>
                  </div>
                </CardContent>
              </Card>

              {/* Questions */}
              <Card>
                <CardHeader>
                  <CardTitle>Questions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {fields.map((field, index) => (
                    <div key={field.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">Question {index + 1}</h3>
                        {fields.length > 1 && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label>Question Text *</Label>
                        <Textarea rows={2} {...form.register(`questions.${index}.questionText` as const)} />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label>Question Type *</Label>
                          <Select
                            value={form.watch(`questions.${index}.questionType` as const)}
                            onValueChange={(value) =>
                              form.setValue(`questions.${index}.questionType` as const, value as any)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mcq">Multiple Choice</SelectItem>
                              <SelectItem value="true_false">True / False</SelectItem>
                              <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Points *</Label>
                          <Input type="number" {...form.register(`questions.${index}.points` as const, { valueAsNumber: true })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Order *</Label>
                          <Input type="number" {...form.register(`questions.${index}.orderIndex` as const, { valueAsNumber: true })} />
                        </div>
                      </div>

                      {form.watch(`questions.${index}.questionType` as const) === "mcq" && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {form.watch(`questions.${index}.options` as const)?.map((_, optIdx) => (
                            <Input
                              key={optIdx}
                              {...form.register(`questions.${index}.options.${optIdx}` as const)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}
                            />
                          ))}
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label>Correct Answer *</Label>
                        {form.watch(`questions.${index}.questionType` as const) === "mcq" ? (
                          <Select
                            value={form.watch(`questions.${index}.correctAnswer` as const)}
                            onValueChange={(value) =>
                              form.setValue(`questions.${index}.correctAnswer` as const, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              {form.watch(`questions.${index}.options` as const)?.map((opt: string, optIdx: number) =>
                                opt ? (
                                  <SelectItem key={optIdx} value={opt}>
                                    {String.fromCharCode(65 + optIdx)}: {opt}
                                  </SelectItem>
                                ) : null
                              )}
                            </SelectContent>
                          </Select>
                        ) : form.watch(`questions.${index}.questionType` as const) === "true_false" ? (
                          <Select
                            value={form.watch(`questions.${index}.correctAnswer` as const)}
                            onValueChange={(value) =>
                              form.setValue(`questions.${index}.correctAnswer` as const, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="True">True</SelectItem>
                              <SelectItem value="False">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input {...form.register(`questions.${index}.correctAnswer` as const)} placeholder="Enter answer" />
                        )}
                      </div>

                      {index < fields.length - 1 && <Separator className="mt-6" />}
                    </div>
                  ))}

                  <Button type="button" variant="outline" className="w-full" onClick={addQuestion}>
                    <Plus className="w-4 h-4 mr-2" /> Add Question
                  </Button>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Button type="button" variant="outline" onClick={() => navigate("/admin-dashboard")}>Cancel</Button>
                <Button type="submit" disabled={createExamMutation.isPending || updateExamMutation.isPending}>
                  <Save className="w-4 h-4 mr-2" /> {isEdit ? "Update" : "Save & Publish"}
                </Button>
              </div>
            </form>
      </div>
    </main>
  );

  if (embedded) {
    // Render only the main content when embedded inside AdminDashboard
    return mainContent;
  }

  // Full standalone page
  return (
    <div className="min-h-screen bg-gray-50">
      <Header variant="admin" />
      <div className="flex">
        <AdminSidebar activeSection="exams" onSectionChange={handleSidebarChange} />
        {mainContent}
      </div>
    </div>
  );
}
