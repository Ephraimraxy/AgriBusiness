import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Calendar, Clock, FileText, Edit, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

// Minimal local Exam type – replace with shared type when available
export type Exam = {
  id: number;
  title: string;
  description?: string;
  duration: number;
  startTime: string | Date;
  endTime: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  isActive: boolean;
};

interface AdminExamRecordsProps {
  onBack?: () => void;
  embedded?: boolean;
}

export default function AdminExamRecords({ onBack, embedded = true }: AdminExamRecordsProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: exams = [], isLoading } = useQuery<Exam[]>({
    queryKey: ["/api/exams"],
  });

  // Toggle publish/unpublish mutation
  const togglePublishMutation = useMutation({
    mutationFn: async ({ examId, isActive }: { examId: number; isActive: boolean }) => {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update exam status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam status updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exam status",
        variant: "destructive",
      });
    },
  });

  // Update exam mutation
  const updateExamMutation = useMutation({
    mutationFn: async ({ examId, data }: { examId: number; data: Partial<Exam> }) => {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update exam');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      setEditingExam(null);
      setEditData({});
      toast({
        title: "Success",
        description: "Exam updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update exam",
        variant: "destructive",
      });
    },
  });

  // Delete exam mutation
  const deleteExamMutation = useMutation({
    mutationFn: async (examId: number) => {
      const response = await fetch(`/api/exams/${examId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete exam');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      toast({
        title: "Success",
        description: "Exam deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exam",
        variant: "destructive",
      });
    },
  });

  const formatDateTime = (date: string | Date) => {
    return new Date(date).toLocaleString();
  };

  const handleTogglePublish = (exam: Exam) => {
    togglePublishMutation.mutate({
      examId: exam.id,
      isActive: !exam.isActive,
    });
  };

  const handleEdit = (exam: Exam) => {
    // Navigate to exam setup page to edit questions
    navigate(`/admin-exam-setup?examId=${exam.id}`);
  };

  const handleSave = (examId: number) => {
    // This function is no longer needed since we navigate to edit page
    // Keeping it for potential future use
  };

  const handleDelete = (examId: number) => {
    if (window.confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
      deleteExamMutation.mutate(examId);
    }
  };

  const handleCancelEdit = () => {
    // This function is no longer needed since we navigate to edit page
    // Keeping it for potential future use
  };

  const sortedExams = [...exams].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || b.startTime).getTime() - new Date(a.updatedAt || a.createdAt || a.startTime).getTime(),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 p-6"}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <h1 className="text-3xl font-bold text-slate-900">Exam Records</h1>
        </div>

        {exams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <FileText className="w-16 h-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold text-slate-600 mb-2">No Exam Records</h3>
              <p className="text-slate-500 text-center mb-6">No exams have been created yet.</p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> All Exam Records ({exams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Last Modified</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedExams.map((exam) => (
                      <TableRow key={exam.id}>
                        <TableCell className="font-medium">
                          {exam.title}
                        </TableCell>
                        <TableCell className="max-w-xs truncate" title={exam.description || undefined}>
                          {exam.description || "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-slate-500" /> {exam.duration} min
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {exam.updatedAt ? formatDateTime(exam.updatedAt) : (exam.createdAt ? formatDateTime(exam.createdAt) : "N/A")}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(exam)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTogglePublish(exam)}
                              disabled={togglePublishMutation.isPending}
                              className={exam.isActive ? "bg-orange-100 text-orange-700 hover:bg-orange-200" : "bg-green-100 text-green-700 hover:bg-green-200"}
                            >
                              {exam.isActive ? "Unpublish" : "Publish"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(exam.id)}
                              disabled={deleteExamMutation.isPending}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
