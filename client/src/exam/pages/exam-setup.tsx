import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@exam/components/ui/card";
import { Button } from "@exam/components/ui/button";
import { Input } from "@exam/components/ui/input";
import { Label } from "@exam/components/ui/label";
import { Textarea } from "@exam/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@exam/components/ui/select";
import { Switch } from "@exam/components/ui/switch";
import { Separator } from "@exam/components/ui/separator";
import { Plus, Trash2, Save, ArrowLeft, Home } from "lucide-react";
import { useToast } from "@exam/hooks/use-toast";
import { apiRequest } from "@exam/lib/queryClient";
import { useLocation } from "wouter";
import { z } from "zod";
import type { Exam, Question } from "@shared/schema";

const examSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  duration: z.number().min(1, "Duration must be at least 1 minute"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
  isActive: z.boolean(),
  questions: z.array(z.object({
    questionText: z.string().min(1, "Question text is required"),
    questionType: z.enum(["mcq", "true_false", "fill_blank"]),
    options: z.array(z.string()).optional(),
    correctAnswer: z.string().min(1, "Correct answer is required"),
    points: z.number().min(1, "Points must be at least 1"),
    orderIndex: z.number(),
  })),
});

type ExamFormData = z.infer<typeof examSchema>;

export default function ExamSetup() {
  const { examId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!examId;

  const { data: exam, isLoading: examLoading } = useQuery<Exam>({
    queryKey: ["/api/exams", examId],
    enabled: isEdit,
  });

  const { data: questions = [], isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/exams", examId, "questions"],
    enabled: isEdit,
  });

  const form = useForm<ExamFormData>({
    resolver: zodResolver(examSchema),
    defaultValues: {
      title: "",
      description: "",
      duration: 60,
      startTime: "",
      endTime: "",
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

  useEffect(() => {
    if (exam && questions.length > 0) {
      const endTime = new Date(new Date(exam.startTime).getTime() + exam.duration * 60000);
      
      form.reset({
        title: exam.title,
        description: exam.description || "",
        duration: exam.duration,
        startTime: new Date(exam.startTime).toISOString().slice(0, 16),
        endTime: endTime.toISOString().slice(0, 16),
        isActive: exam.isActive || false,
        questions: questions.map((q: any, index: number) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || ["", "", "", ""],
          correctAnswer: q.correctAnswer,
          points: q.points || 1,
          orderIndex: index,
        })),
      });
    }
  }, [exam, questions, form]);

  const createExamMutation = useMutation({
    mutationFn: async (data: ExamFormData) => {
      const examData = {
        title: data.title,
        description: data.description,
        duration: data.duration,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        isActive: data.isActive,
      };

      const examResponse = await apiRequest("POST", "/api/exams", examData);
      const exam = await examResponse.json();

      // Create questions
      for (const question of data.questions) {
        await apiRequest("POST", `/api/exams/${exam.id}/questions`, question);
      }

      return exam;
    },
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams/available"] });
      toast({
        title: "Exam created",
        description: "The exam has been created successfully. You can now start the exam.",
      });
      navigate("/exams");
    },
    onError: (error) => {
      toast({
        title: "Failed to create exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateExamMutation = useMutation({
    mutationFn: async (data: ExamFormData) => {
      // Create a new exam instead of updating the existing one
      const examData = {
        title: data.title,
        description: data.description,
        duration: data.duration,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
        isActive: data.isActive,
      };

      const examResponse = await apiRequest("POST", "/api/exams", examData);
      const newExam = await examResponse.json();

      // Create questions for the new exam
      for (const question of data.questions) {
        await apiRequest("POST", `/api/exams/${newExam.id}/questions`, question);
      }

      return newExam;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams/available"] });
      toast({
        title: "New exam created",
        description: "A new exam has been created based on your edits. The original exam remains unchanged.",
      });
      navigate("/exam-records");
    },
    onError: (error) => {
      toast({
        title: "Failed to create new exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExamFormData) => {
    if (isEdit) {
      updateExamMutation.mutate(data);
    } else {
      createExamMutation.mutate(data);
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
      case "mcq": return "Multiple Choice";
      case "true_false": return "True/False";
      case "fill_blank": return "Fill in the Blank";
      default: return type;
    }
  };

  if (isEdit && (examLoading || questionsLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <h1 className="text-3xl font-bold text-slate-900">
            {isEdit ? "Create New Exam (Based on Existing)" : "Create New Exam"}
          </h1>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Exam Details */}
          <Card>
            <CardHeader>
              <CardTitle>Exam Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  {...form.register("title")}
                  placeholder="Enter exam title"
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  {...form.register("description")}
                  placeholder="Enter exam description (optional)"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes) *</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...form.register("duration", { valueAsNumber: true })}
                    placeholder="60"
                  />
                  {form.formState.errors.duration && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.duration.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time *</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    {...form.register("startTime")}
                  />
                  {form.formState.errors.startTime && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.startTime.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time *</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    {...form.register("endTime")}
                  />
                  {form.formState.errors.endTime && (
                    <p className="text-sm text-red-500">
                      {form.formState.errors.endTime.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={form.watch("isActive")}
                  onCheckedChange={(checked) => form.setValue("isActive", checked)}
                />
                <Label htmlFor="isActive">Make exam active</Label>
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
                <div key={field.id} className="border border-slate-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Question {index + 1}</h3>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question Text *</Label>
                      <Textarea
                        {...form.register(`questions.${index}.questionText`)}
                        placeholder="Enter your question"
                        rows={2}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Question Type *</Label>
                        <Select
                          value={form.watch(`questions.${index}.questionType`)}
                          onValueChange={(value) => 
                            form.setValue(`questions.${index}.questionType` as any, value as any)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                            <SelectItem value="true_false">True/False</SelectItem>
                            <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Points *</Label>
                        <Input
                          type="number"
                          {...form.register(`questions.${index}.points`, { valueAsNumber: true })}
                          placeholder="1"
                        />
                      </div>
                    </div>

                    {form.watch(`questions.${index}.questionType`) === "mcq" && (
                      <div className="space-y-2">
                        <Label>Options *</Label>
                        {[0, 1, 2, 3].map((optionIndex) => (
                          <Input
                            key={optionIndex}
                            {...form.register(`questions.${index}.options.${optionIndex}`)}
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
                          />
                        ))}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label>Correct Answer *</Label>
                      {form.watch(`questions.${index}.questionType`) === "mcq" ? (
                        <Select
                          value={form.watch(`questions.${index}.correctAnswer`)}
                          onValueChange={(value) =>
                            form.setValue(`questions.${index}.correctAnswer`, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct option" />
                          </SelectTrigger>
                          <SelectContent>
                            {form.watch(`questions.${index}.options`)?.map((option: string, optionIndex: number) => (
                              option && (
                                <SelectItem key={optionIndex} value={option}>
                                  {String.fromCharCode(65 + optionIndex)}: {option}
                                </SelectItem>
                              )
                            ))}
                          </SelectContent>
                        </Select>
                      ) : form.watch(`questions.${index}.questionType`) === "true_false" ? (
                        <Select
                          value={form.watch(`questions.${index}.correctAnswer`)}
                          onValueChange={(value) =>
                            form.setValue(`questions.${index}.correctAnswer`, value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="True">True</SelectItem>
                            <SelectItem value="False">False</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          {...form.register(`questions.${index}.correctAnswer`)}
                          placeholder="Enter the correct answer"
                        />
                      )}
                    </div>
                  </div>

                  {index < fields.length - 1 && <Separator className="mt-6" />}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addQuestion}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Question
              </Button>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createExamMutation.isPending || updateExamMutation.isPending}
              className="bg-blue-600 text-white hover:bg-blue-700"
            >
              <Save className="w-4 h-4 mr-2" />
              {createExamMutation.isPending || updateExamMutation.isPending
                ? "Saving..."
                : isEdit
                ? "Update Exam"
                : "Save and Publish"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
