import { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { 
  createDocument, 
  EvaluationQuestion, 
  getPublishedEvaluationQuestions,
  getEvaluationResponses,
  EvaluationResponse,
  updateDocument,
  deleteDocument,
  cleanupInvalidRoomAssignments,
  cleanupInvalidTagAssignments
} from "@/lib/firebaseService";
import { getTrainees, getRooms, getTagNumbers, deleteDocument as deleteTraineeDocument, updateDocument as updateTraineeDocument, synchronizeAllocations } from "@/lib/firebaseService.traineeview";
import { 
  createRoom, 
  createTagNumber, 
  getRooms as getResortRooms, 
  getTagNumbers as getResortTagNumbers, 
  getFacilities,
  getHousekeepingTasks,
  getGuestServices,
  deleteRoom,
  deleteTagNumber,
  updateDocument as updateResortDocument,
  synchronizeAllocations as synchronizeResortAllocations,
  getTrainees as getResortTrainees,
  type Room, 
  type TagNumber,
  type Facility,
  type HousekeepingTask,
  type GuestService
} from "@/lib/firebaseService.allocations";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Components
import AdminSidebar from "@/components/admin-sidebar";
import AdminContentActions from "@/components/admin-content-actions";
import AdminVideoUpload from "@/components/admin-video-upload";
import AdminFileUpload from "@/components/admin-file-upload";
import AdminExamActions from "@/components/admin-exam-actions";
import AdminExamSetup from "./admin-exam-setup";
import AdminExamResults from "@/components/admin-exam-results";
import AdminExamRecords from "@/components/admin-exam-records";
import AdminCertificateGeneration from "@/components/admin-certificate-generation";
import Header from "@/components/header";
import { EvaluationPieChart, EvaluationBarChart } from "@/components/evaluation-pie-chart";
import AdminAnnouncementCreator from "@/components/admin-announcement-creator";
import AdminAnnouncementManager from "@/components/admin-announcement-manager";
import AdminIdManagement from "@/components/admin-id-management";
import AdminCBTSetup from "@/components/admin-cbt-setup";

// UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";

// Icons
import { BarChart3, Users, Building, BookOpen, Bell, Settings, Plus, Edit, Trash2, Upload, FileText, Video, ClipboardCheck, GraduationCap, UserPlus, Filter, Download, Search, Award, MapPin, IdCard, TrendingUp, Eye, X, RefreshCw, Tag, Bed, Calendar, CheckCircle, Loader2, Clock, UserCheck } from "lucide-react";

// Types
import type { Trainee, Sponsor } from "@shared/schema";

// ---------- Types ----------
interface Statistics {
  totalTrainees: number;
  activeSponsors: number;
  completedCourses: number;
  activeContent: number;
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  // sub-view for exams section
  const [examView, setExamView] = useState<"actions" | "setup" | "results" | "records">("actions");
  const [evaluationView, setEvaluationView] = useState<"questions" | "responses" | "manage" | "edit" | "chart">("manage");
  // sub-view for content section
  const [contentView, setContentView] = useState<"actions" | "videos" | "files">("actions");
  // sub-view for announcements section
  const [announcementView, setAnnouncementView] = useState<"create" | "manage">("create");

  // Handler for sidebar navigation (matches trainee dashboard tab logic)
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    
    if (section.startsWith("content-")) {
      const view = section.split('content-')[1] as "videos" | "files";
      setContentView(view);
      setActiveSection("content");
    } else if (section.startsWith("exam-")) {
      const view = section.split('exam-')[1] as "actions" | "setup" | "results" | "records";
      setExamView(view);
      setActiveSection("exams");
    } else if (section.startsWith("evaluation-")) {
      const view = section.split('evaluation-')[1] as "questions" | "responses" | "manage" | "edit" | "chart";
      setEvaluationView(view);
      setActiveSection("monitoring-evaluation");
    } else if (section === "content") {
      setContentView("actions");
    } else if (section === "exams") {
      setExamView("actions");
    } else if (section === "monitoring-evaluation") {
      setEvaluationView("manage");
    }
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Trainee management state
  const [searchTerm, setSearchTerm] = useState("");
  const [genderFilter, setGenderFilter] = useState("all");
  const [stateFilter, setStateFilter] = useState("all");
  const [selectedTrainees, setSelectedTrainees] = useState<string[]>([]);
  const [editingTrainee, setEditingTrainee] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteType, setDeleteType] = useState<'single' | 'multiple' | null>(null);
  const [traineeToDelete, setTraineeToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [currentDeleteIndex, setCurrentDeleteIndex] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState(0);
  const [isForceRefreshing, setIsForceRefreshing] = useState(false);
  const [forceRefreshProgress, setForceRefreshProgress] = useState(0);

  // Resort management state
  const [resortRooms, setResortRooms] = useState<Room[]>([]);
  const [resortTagNumbers, setResortTagNumbers] = useState<TagNumber[]>([]);
  const [resortFacilities, setResortFacilities] = useState<Facility[]>([]);
  const [resortHousekeepingTasks, setResortHousekeepingTasks] = useState<HousekeepingTask[]>([]);
  const [resortGuestServices, setResortGuestServices] = useState<GuestService[]>([]);
  const [isResortDeepRefreshing, setIsResortDeepRefreshing] = useState(false);
  const [isResortDeepRefreshingTags, setIsResortDeepRefreshingTags] = useState(false);

  // Resort search and filter states
  const [resortRoomSearchTerm, setResortRoomSearchTerm] = useState('');
  const [resortTagSearchTerm, setResortTagSearchTerm] = useState('');
  const [resortRoomStatusFilter, setResortRoomStatusFilter] = useState<string>('all');
  const [resortTagStatusFilter, setResortTagStatusFilter] = useState<string>('all');
  const [showResortRoomFilterDropdown, setShowResortRoomFilterDropdown] = useState(false);
  const [showResortTagFilterDropdown, setShowResortTagFilterDropdown] = useState(false);

  // Resort selection states
  const [selectedResortRooms, setSelectedResortRooms] = useState<string[]>([]);
  const [selectedResortTags, setSelectedResortTags] = useState<string[]>([]);

  // Resort operation states
  const [isResortDeleting, setIsResortDeleting] = useState(false);
  const [resortDeleteProgress, setResortDeleteProgress] = useState(0);
  const [resortCurrentDeleteIndex, setResortCurrentDeleteIndex] = useState(0);
  const [resortDeleteType, setResortDeleteType] = useState<'rooms' | 'tags' | null>(null);
  const [resortDeleteCount, setResortDeleteCount] = useState(0);
  const [showResortDeleteDialog, setShowResortDeleteDialog] = useState(false);

  // Resort import states
  const [isResortImportingRooms, setIsResortImportingRooms] = useState(false);
  const [isResortImportingTags, setIsResortImportingTags] = useState(false);
  const [resortImportProgress, setResortImportProgress] = useState(0);
  const [resortCurrentImportIndex, setResortCurrentImportIndex] = useState(0);
  const [resortImportType, setResortImportType] = useState<'rooms' | 'tags' | null>(null);
  const [resortImportCount, setResortImportCount] = useState(0);

  // Resort synchronization states
  const [isResortSynchronizing, setIsResortSynchronizing] = useState(false);
  const [isResortManualCleaning, setIsResortManualCleaning] = useState(false);

  // Resort message states
  const [showResortMessageDialog, setShowResortMessageDialog] = useState(false);
  const [resortMessageTitle, setResortMessageTitle] = useState('');
  const [resortMessageDescription, setResortMessageDescription] = useState('');
  const [resortMessageType, setResortMessageType] = useState<'success' | 'error' | 'warning'>("success");

  // Cleanup progress states
  const [showCleanupProgressDialog, setShowCleanupProgressDialog] = useState(false);
  const [cleanupProgress, setCleanupProgress] = useState(0);
  const [cleanupCurrentIndex, setCleanupCurrentIndex] = useState(0);
  const [cleanupTotal, setCleanupTotal] = useState(0);
  const [cleanupType, setCleanupType] = useState<'rooms' | 'tags' | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState('');

  // Resort UI states
  const [showResortMoreSections, setShowResortMoreSections] = useState(false);
  // Resort confirm dialog state
  const [showResortConfirmDialog, setShowResortConfirmDialog] = useState(false);
  const [resortConfirmAction, setResortConfirmAction] = useState<
    'delete_rooms' | 'delete_tags' | 'clear_rooms' | 'clear_tags' | 'synchronize' | 'deep_refresh_rooms' | 'deep_refresh_tags' | 'manual_cleanup' | null
  >(null);
  const [resortConfirmTitle, setResortConfirmTitle] = useState('');
  const [resortConfirmDescription, setResortConfirmDescription] = useState('');

  const openResortConfirm = (
    action: 'delete_rooms' | 'delete_tags' | 'clear_rooms' | 'clear_tags' | 'synchronize' | 'deep_refresh_rooms' | 'deep_refresh_tags' | 'manual_cleanup',
    title: string,
    description: string
  ) => {
    setResortConfirmAction(action);
    setResortConfirmTitle(title);
    setResortConfirmDescription(description);
    setShowResortConfirmDialog(true);
  };

  const confirmResortAction = async () => {
    const action = resortConfirmAction;
    setShowResortConfirmDialog(false);
    if (!action) return;
    switch (action) {
      case 'delete_rooms':
        await performResortRoomsDeletion();
        break;
      case 'delete_tags':
        await performResortTagsDeletion();
        break;
      case 'clear_rooms':
        await clearAllResortRoomsConfirmed();
        break;
      case 'clear_tags':
        await clearAllResortTagsConfirmed();
        break;
      case 'synchronize':
        setIsResortSynchronizing(true);
        resortSynchronizeAllocationsMutation.mutate();
        break;
      case 'deep_refresh_rooms':
        await resortDeepRefreshRooms();
        break;
      case 'deep_refresh_tags':
        await resortDeepRefreshTags();
        break;
      case 'manual_cleanup':
        await resortManualCleanup();
        break;
    }
    setResortConfirmAction(null);
  };

  // Question Modal State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showResponsesModal, setShowResponsesModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<EvaluationQuestion | null>(null);
  const [previewQuestion, setPreviewQuestion] = useState<EvaluationQuestion | null>(null);
  const [questionForm, setQuestionForm] = useState({
    question: '',
    type: 'yes_no' as EvaluationQuestion['type'],
    options: [''],
    isPublished: false
  });

  // Fetch evaluation questions from Firebase
  const { data: evaluationQuestions = [], isLoading: questionsLoading } = useQuery<EvaluationQuestion[]>({
    queryKey: ["evaluation-questions"],
    queryFn: async () => {
      try {
        // Fetch all questions (both published and unpublished) for admin view
        const q = query(
          collection(db, "evaluation_questions"),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const firebaseQuestions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as EvaluationQuestion[];

        // If no questions exist in Firebase, return sample questions for initial setup
        if (firebaseQuestions.length === 0) {
          return [
            {
              id: '1',
              question: 'How satisfied are you with the training program?',
              type: 'rating' as const,
              isPublished: true,
              createdAt: new Date('2024-01-15'),
              updatedAt: new Date('2024-01-15')
            },
            {
              id: '2',
              question: 'Do you feel the training materials were comprehensive?',
              type: 'yes_no' as const,
              isPublished: false,
              createdAt: new Date('2024-01-14'),
              updatedAt: new Date('2024-01-14')
            },
            {
              id: '3',
              question: 'Which training module was most beneficial?',
              type: 'single_choice' as const,
              options: ['Module 1', 'Module 2', 'Module 3', 'Module 4'],
              isPublished: true,
              createdAt: new Date('2024-01-13'),
              updatedAt: new Date('2024-01-13')
            },
            {
              id: '4',
              question: 'What suggestions do you have for improving this training program?',
              type: 'expression' as const,
              isPublished: true,
              createdAt: new Date('2024-01-12'),
              updatedAt: new Date('2024-01-12')
            },
            {
              id: '5',
              question: 'Did the course content meet your expectations?',
              type: 'yes_no' as const,
              isPublished: true,
              createdAt: new Date('2024-01-11'),
              updatedAt: new Date('2024-01-11')
            }
          ];
        }

        return firebaseQuestions;
      } catch (error) {
        console.error('Error fetching evaluation questions:', error);
        // Return sample questions as fallback if Firebase fails
        return [
          {
            id: '1',
            question: 'How satisfied are you with the training program?',
            type: 'rating' as const,
            isPublished: true,
            createdAt: new Date('2024-01-15'),
            updatedAt: new Date('2024-01-15')
          },
          {
            id: '2',
            question: 'Do you feel the training materials were comprehensive?',
            type: 'yes_no' as const,
            isPublished: false,
            createdAt: new Date('2024-01-14'),
            updatedAt: new Date('2024-01-14')
          },
          {
            id: '3',
            question: 'Which training module was most beneficial?',
            type: 'single_choice' as const,
            options: ['Module 1', 'Module 2', 'Module 3', 'Module 4'],
            isPublished: true,
            createdAt: new Date('2024-01-13'),
            updatedAt: new Date('2024-01-13')
          }
        ];
      }
    },
    retry: false,
  });

  // Fetch evaluation responses
  const { data: evaluationResponses = [] } = useQuery<EvaluationResponse[]>({
    queryKey: ["evaluation-responses"],
    queryFn: getEvaluationResponses,
    retry: false,
  });

  // Save question mutation
  const saveQuestionMutation = useMutation({
    mutationFn: async (questionData: Omit<EvaluationQuestion, 'id' | 'createdAt' | 'updatedAt'>) => {
      return await createDocument('evaluation_questions', {
        ...questionData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-questions"] });
      toast({
        title: "Question saved",
        description: "The question has been saved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save question. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Update question mutation
  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, questionData }: { id: string; questionData: Partial<EvaluationQuestion> }) => {
      await updateDocument('evaluation_questions', id, questionData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-questions"] });
      toast({
        title: "Question updated",
        description: "The question has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update question. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Delete question mutation
  const deleteQuestionMutation = useMutation({
    mutationFn: async (questionId: string) => {
      await deleteDocument('evaluation_questions', questionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["evaluation-questions"] });
      toast({
        title: "Question deleted",
        description: "The question has been deleted successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete question. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Question handlers
  const handlePreviewQuestion = (question: EvaluationQuestion) => {
    setPreviewQuestion(question);
    setShowPreviewModal(true);
  };

  const handleEditQuestion = (question: EvaluationQuestion) => {
    setEditingQuestion(question);
    setQuestionForm({
      question: question.question,
      type: question.type,
      options: question.options || [''],
      isPublished: question.isPublished
    });
    setEvaluationView("edit");
  };

  const handleTogglePublish = (question: EvaluationQuestion) => {
    const newStatus = !question.isPublished;
    const action = newStatus ? 'published' : 'unpublished';
    
    updateQuestionMutation.mutate({
      id: question.id,
      questionData: { 
        isPublished: newStatus,
        updatedAt: new Date()
      }
    }, {
      onSuccess: () => {
        toast({
          title: `Question ${action}`,
          description: `"${question.question.substring(0, 50)}..." has been ${action} successfully.`,
          variant: newStatus ? "default" : "destructive",
        });
        
        // Invalidate queries to refresh the UI
        queryClient.invalidateQueries({ queryKey: ["evaluation-questions"] });
        queryClient.invalidateQueries({ queryKey: ["published-evaluation-questions"] });
      }
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (window.confirm('Are you sure you want to delete this question?')) {
      deleteQuestionMutation.mutate(questionId);
    }
  };

  const handleAddOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...(prev.options || []), '']
    }));
  };

  const handleRemoveOption = (index: number) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || []
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options?.map((opt, i) => i === index ? value : opt) || []
    }));
  };

  const handleSubmitQuestion = () => {
    if (!questionForm.question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question.",
        variant: "destructive"
      });
      return;
    }

    if (questionForm.type === 'single_choice' && (!questionForm.options || questionForm.options.length < 2)) {
      toast({
        title: "Error",
        description: "Please add at least 2 options for single choice questions.",
        variant: "destructive"
      });
      return;
    }

    const questionData = {
      question: questionForm.question,
      type: questionForm.type,
      options: questionForm.type === 'single_choice' ? questionForm.options : undefined,
      isPublished: questionForm.isPublished
    };

    if (editingQuestion) {
      // Update existing question
      updateQuestionMutation.mutate({
        id: editingQuestion.id,
        questionData
      }, {
        onSuccess: () => {
          setEvaluationView("manage");
          setEditingQuestion(null);
          setQuestionForm({
            question: '',
            type: 'yes_no',
            options: [''],
            isPublished: false
          });
        }
      });
    } else {
      // Add new question
      saveQuestionMutation.mutate(questionData);
    }

    // Reset form and close modal
    setQuestionForm({
      question: '',
      type: 'yes_no',
      options: [''],
      isPublished: false
    });
    setEditingQuestion(null);
    setShowQuestionModal(false);
  };

  const handleCloseQuestionModal = () => {
    setQuestionForm({
      question: '',
      type: 'yes_no',
      options: [''],
      isPublished: false
    });
    setEditingQuestion(null);
    setShowQuestionModal(false);
  };

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const { data: registrationEnabled } = useQuery<{ value: string } | undefined>({
    queryKey: ["/api/settings/registration_enabled"],
    retry: false,
  });

  const { data: staffRegistrationEnabled } = useQuery<{ value: string } | undefined>({
    queryKey: ["/api/settings/staff_registration_enabled"],
    retry: false,
  });

  const { data: rpRegistrationEnabled } = useQuery<{ value: string } | undefined>({
    queryKey: ["/api/settings/rp_registration_enabled"],
    retry: false,
  });

  const { data: sponsors } = useQuery<Sponsor[]>({
    queryKey: ["/api/sponsors"],
    retry: false,
  });

  const { data: activeSponsor } = useQuery<Sponsor | undefined>({
    queryKey: ["/api/sponsors/active"],
    retry: false,
  });

  const { data: statistics } = useQuery<Statistics>({
    queryKey: ["/api/statistics"],
    retry: false,
  });

  const { data: trainees } = useQuery<Trainee[]>({
    queryKey: ["/api/trainees"],
    retry: false,
  });

  // Trainee management queries
  const { data: advancedTrainees = [], isLoading: traineesLoading, error: traineesError } = useQuery({
    queryKey: ['trainees'],
    queryFn: getTrainees,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000, // Data considered fresh for 15s
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ['rooms'],
    queryFn: getRooms,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000, // Data considered fresh for 15s
    refetchOnWindowFocus: false,
  });

  const { data: tagNumbers = [] } = useQuery({
    queryKey: ['tagNumbers'],
    queryFn: getTagNumbers,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000, // Data considered fresh for 15s
    refetchOnWindowFocus: false,
  });

  // Resort management queries
  const { data: resortRoomsData = [] } = useQuery({
    queryKey: ['resortRooms'],
    queryFn: getResortRooms,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000, // Data considered fresh for 15s
    refetchOnWindowFocus: false,
  });

  const { data: resortTagNumbersData = [] } = useQuery({
    queryKey: ['resortTagNumbers'],
    queryFn: getResortTagNumbers,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000, // Data considered fresh for 15s
    refetchOnWindowFocus: false,
  });

  const { data: resortFacilitiesData = [] } = useQuery({
    queryKey: ['resortFacilities'],
    queryFn: getFacilities,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000, // Data considered fresh for 15s
    refetchOnWindowFocus: false,
  });

  const { data: resortHousekeepingTasksData = [] } = useQuery({
    queryKey: ['resortHousekeepingTasks'],
    queryFn: getHousekeepingTasks,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000, // Data considered fresh for 15s
    refetchOnWindowFocus: false,
  });

  const { data: resortGuestServicesData = [] } = useQuery({
    queryKey: ['resortGuestServices'],
    queryFn: getGuestServices,
    refetchInterval: 30000, // Reduced from 5s to 30s
    staleTime: 15000,
    refetchOnWindowFocus: false,
  });

  // Trainee management mutations
  const deleteTraineeMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteTraineeDocument("trainees", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      toast({
        title: "Success",
        description: "Trainee deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete trainee",
        variant: "destructive",
      });
    },
  });

  const updateTraineeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await updateTraineeDocument("trainees", id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      setEditingTrainee(null);
      toast({
        title: "Success",
        description: "Trainee updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trainee",
        variant: "destructive",
      });
    },
  });

  const synchronizeAllocationsMutation = useMutation({
    mutationFn: async () => {
      setRefreshProgress(0);
      const result = await synchronizeAllocations();
      setRefreshProgress(100);
      return result;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['trainees'] });
      await queryClient.refetchQueries({ queryKey: ['trainees'] });
      
      toast({
        title: "Allocations Synchronized",
        description: `Allocated ${result.allocated} trainees. ${result.noRooms > 0 ? `No rooms available for ${result.noRooms} trainees.` : ''} ${result.noTags > 0 ? `No tags available for ${result.noTags} trainees.` : ''}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to synchronize allocations",
        variant: "destructive",
      });
    },
  });

  // Resort management mutations
  const resortDeleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteRoom(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resortRooms'] });
      toast({
        title: "Success",
        description: "Room deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete room",
        variant: "destructive",
      });
    },
  });

  const resortDeleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteTagNumber(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resortTagNumbers'] });
      toast({
        title: "Success",
        description: "Tag number deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete tag number",
        variant: "destructive",
      });
    },
  });

  const resortSynchronizeAllocationsMutation = useMutation({
    mutationFn: async () => {
      setResortDeleteProgress(0);
      const result = await synchronizeResortAllocations();
      setResortDeleteProgress(100);
      return result;
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ['resortRooms'] });
      await queryClient.invalidateQueries({ queryKey: ['resortTagNumbers'] });
      await queryClient.refetchQueries({ queryKey: ['resortRooms'] });
      await queryClient.refetchQueries({ queryKey: ['resortTagNumbers'] });
      
      toast({
        title: "Resort Allocations Synchronized",
        description: `Allocated ${result.allocated} trainees. ${result.noRooms > 0 ? `No rooms available for ${result.noRooms} trainees.` : ''} ${result.noTags > 0 ? `No tags available for ${result.noTags} trainees.` : ''}`,
      });
      setIsResortSynchronizing(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to synchronize resort allocations",
        variant: "destructive",
      });
      setIsResortSynchronizing(false);
    },
    onSettled: () => {
      // Safety to ensure dialog closes if not already closed
      setIsResortSynchronizing(false);
    }
  });

  const registrationToggleMutation = useMutation({
    mutationFn: async (data: { enabled: boolean; sponsorId?: string }) => {
      // Update registration enabled status
      await apiRequest("POST", "/api/settings", {
        key: "registration_enabled",
        value: data.enabled.toString()
      });

      // If enabling registration and sponsor is selected, set as active sponsor
      if (data.enabled && data.sponsorId) {
        await apiRequest("PATCH", `/api/sponsors/${data.sponsorId}`, {
          isActive: true
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/registration_enabled"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sponsors/active"] });
      toast({
        title: "Registration Updated",
        description: "Registration settings have been updated successfully.",
      });

    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update registration settings.",
        variant: "destructive",
      });
    },
  });

  // Staff Registration Toggle Mutation
  const staffRegistrationToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/settings", {
        key: "staff_registration_enabled",
        value: enabled.toString()
      });
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/staff_registration_enabled"] });
      toast({
        title: "Staff Registration Updated",
        description: `Staff registration has been ${enabled ? "enabled" : "disabled"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update staff registration settings.",
        variant: "destructive",
      });
    },
  });

  // Resource Person Registration Toggle Mutation
  const rpRegistrationToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("POST", "/api/settings", {
        key: "rp_registration_enabled",
        value: enabled.toString()
      });
      return enabled;
    },
    onSuccess: (enabled) => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/rp_registration_enabled"] });
      toast({
        title: "Resource Person Registration Updated",
        description: `Resource Person registration has been ${enabled ? "enabled" : "disabled"} successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update Resource Person registration settings.",
        variant: "destructive",
      });
    },
  });

  // Cleanup mutations for invalid room and tag assignments
  const cleanupRoomAssignmentsMutation = useMutation({
    mutationFn: async () => {
      setShowCleanupProgressDialog(true);
      setCleanupType('rooms');
      setCleanupProgress(0);
      setCleanupCurrentIndex(0);
      setCleanupTotal(0);
      setCleanupStatus('Starting cleanup...');
      
      return await cleanupInvalidRoomAssignments((current, total, status) => {
        setCleanupProgress(total > 0 ? (current / total) * 100 : 0);
        setCleanupCurrentIndex(current);
        setCleanupTotal(total);
        setCleanupStatus(status);
      });
    },
    onSuccess: (result) => {
      setShowCleanupProgressDialog(false);
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      queryClient.invalidateQueries({ queryKey: ['advancedTrainees'] });
      toast({
        title: "Room Assignments Cleaned",
        description: `Successfully cleaned up ${result.cleaned} invalid room assignments. ${result.errors > 0 ? `${result.errors} errors occurred.` : ''}`,
      });
    },
    onError: (error) => {
      setShowCleanupProgressDialog(false);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean up invalid room assignments.",
        variant: "destructive",
      });
    },
  });

  const cleanupTagAssignmentsMutation = useMutation({
    mutationFn: async () => {
      setShowCleanupProgressDialog(true);
      setCleanupType('tags');
      setCleanupProgress(0);
      setCleanupCurrentIndex(0);
      setCleanupTotal(0);
      setCleanupStatus('Starting cleanup...');
      
      return await cleanupInvalidTagAssignments((current, total, status) => {
        setCleanupProgress(total > 0 ? (current / total) * 100 : 0);
        setCleanupCurrentIndex(current);
        setCleanupTotal(total);
        setCleanupStatus(status);
      });
    },
    onSuccess: (result) => {
      setShowCleanupProgressDialog(false);
      queryClient.invalidateQueries({ queryKey: ['trainees'] });
      queryClient.invalidateQueries({ queryKey: ['advancedTrainees'] });
      toast({
        title: "Tag Assignments Cleaned",
        description: `Successfully cleaned up ${result.cleaned} invalid tag assignments. ${result.errors > 0 ? `${result.errors} errors occurred.` : ''}`,
      });
    },
    onError: (error) => {
      setShowCleanupProgressDialog(false);
      toast({
        title: "Cleanup Failed",
        description: error.message || "Failed to clean up invalid tag assignments.",
        variant: "destructive",
      });
    },
  });

  // Resort handlers: deep refresh, bulk delete, clear-all
  const resortDeepRefreshRooms = async () => {
    try {
      setIsResortDeepRefreshing(true);
      const allTrainees = await getResortTrainees();
      const allRooms = await getResortRooms();

      for (const room of allRooms) {
        if (!room.id || !room.roomNumber || !room.block) continue;
        const traineesInRoom = allTrainees.filter(t => t.roomNumber === room.roomNumber && t.roomBlock === room.block);
        const bedSpaceNumber = (() => {
          const bs = room.bedSpace?.toString().toLowerCase() || '1';
          if (bs === 'double') return 2;
          if (bs === 'single') return 1;
          const parsed = parseInt(room.bedSpace as string);
          return isNaN(parsed) ? 1 : parsed;
        })();
        const occupancy = traineesInRoom.length;
        let correctStatus: Room['status'];
        if (bedSpaceNumber === 1) {
          correctStatus = occupancy >= 1 ? 'fully_occupied' : 'available';
        } else if (bedSpaceNumber === 2) {
          correctStatus = occupancy === 0 ? 'available' : occupancy === 1 ? 'partially_occupied' : 'fully_occupied';
        } else {
          correctStatus = occupancy >= bedSpaceNumber ? 'fully_occupied' : occupancy > 0 ? 'partially_occupied' : 'available';
        }
        if (room.status !== correctStatus || room.currentOccupancy !== occupancy) {
          await updateResortDocument<Room>('rooms', room.id, { status: correctStatus, currentOccupancy: occupancy });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['resortRooms'] });
      await queryClient.refetchQueries({ queryKey: ['resortRooms'] });
      toast({ title: 'Deep refresh complete', description: 'Room statuses updated based on current occupancy.' });
    } catch (err) {
      toast({ title: 'Deep refresh failed', description: 'Could not update room statuses.', variant: 'destructive' });
    } finally {
      setIsResortDeepRefreshing(false);
    }
  };

  const resortDeepRefreshTags = async () => {
    try {
      setIsResortDeepRefreshingTags(true);
      const allTrainees = await getResortTrainees();
      const allTags = await getResortTagNumbers();
      const usedTagSet = new Set<string>(
        allTrainees
          .map(t => t.tagNumber)
          .filter((v): v is string => !!v && v !== 'pending')
          .map(v => (v.startsWith('Trainee-') ? v.replace('Trainee-', '') : v))
      );

      for (const tag of allTags) {
        if (!tag.id) continue;
        const isAssigned = usedTagSet.has(tag.tagNo.startsWith('Trainee-') ? tag.tagNo.replace('Trainee-', '') : tag.tagNo);
        const desiredStatus: TagNumber['status'] = isAssigned ? 'assigned' : 'available';
        if (tag.status !== desiredStatus) {
          await updateResortDocument<TagNumber>('tagNumbers', tag.id, { status: desiredStatus });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['resortTagNumbers'] });
      await queryClient.refetchQueries({ queryKey: ['resortTagNumbers'] });
      toast({ title: 'Deep refresh complete', description: 'Tag statuses updated based on current assignments.' });
    } catch (err) {
      toast({ title: 'Deep refresh failed', description: 'Could not update tag statuses.', variant: 'destructive' });
    } finally {
      setIsResortDeepRefreshingTags(false);
    }
  };

  const deleteSelectedResortRooms = async () => {
    if (selectedResortRooms.length === 0) {
      toast({ title: 'No rooms selected', description: 'Select rooms to delete.', variant: 'destructive' });
      return;
    }
    setResortDeleteType('rooms');
    setResortDeleteCount(selectedResortRooms.length);
    setShowResortDeleteDialog(true);
  };

  const deleteSelectedResortTags = async () => {
    if (selectedResortTags.length === 0) {
      toast({ title: 'No tags selected', description: 'Select tags to delete.', variant: 'destructive' });
      return;
    }
    setResortDeleteType('tags');
    setResortDeleteCount(selectedResortTags.length);
    setShowResortDeleteDialog(true);
  };

  const performResortRoomsDeletion = async () => {
    try {
      setIsResortDeleting(true);
      for (let i = 0; i < selectedResortRooms.length; i++) {
        setResortCurrentDeleteIndex(i + 1);
        setResortDeleteProgress(((i + 1) / selectedResortRooms.length) * 100);
        await resortDeleteRoomMutation.mutateAsync(selectedResortRooms[i]);
      }
      setSelectedResortRooms([]);
      await queryClient.invalidateQueries({ queryKey: ['resortRooms'] });
      await queryClient.refetchQueries({ queryKey: ['resortRooms'] });
      toast({ title: 'Rooms deleted', description: 'Selected rooms have been deleted.' });
    } catch (err) {
      toast({ title: 'Delete failed', description: 'Failed to delete selected rooms.', variant: 'destructive' });
    } finally {
      setIsResortDeleting(false);
      setResortDeleteProgress(0);
      setResortCurrentDeleteIndex(0);
      setShowResortDeleteDialog(false);
      setResortDeleteType(null);
      setResortDeleteCount(0);
    }
  };

  const performResortTagsDeletion = async () => {
    try {
      setIsResortDeleting(true);
      for (let i = 0; i < selectedResortTags.length; i++) {
        setResortCurrentDeleteIndex(i + 1);
        setResortDeleteProgress(((i + 1) / selectedResortTags.length) * 100);
        await resortDeleteTagMutation.mutateAsync(selectedResortTags[i]);
      }
      setSelectedResortTags([]);
      await queryClient.invalidateQueries({ queryKey: ['resortTagNumbers'] });
      await queryClient.refetchQueries({ queryKey: ['resortTagNumbers'] });
      toast({ title: 'Tags deleted', description: 'Selected tags have been deleted.' });
    } catch (err) {
      toast({ title: 'Delete failed', description: 'Failed to delete selected tags.', variant: 'destructive' });
    } finally {
      setIsResortDeleting(false);
      setResortDeleteProgress(0);
      setResortCurrentDeleteIndex(0);
      setShowResortDeleteDialog(false);
      setResortDeleteType(null);
      setResortDeleteCount(0);
    }
  };

  const clearAllResortRooms = async () => {
    if (resortRoomsData.length === 0) {
      toast({ title: 'No rooms to clear', description: 'There are no rooms to delete.' });
      return;
    }
    setSelectedResortRooms(resortRoomsData.map(r => r.id!).filter(Boolean));
    openResortConfirm('clear_rooms', 'Clear All Rooms', `This will permanently delete all ${resortRoomsData.length} rooms. Continue?`);
  };

  const clearAllResortTags = async () => {
    if (resortTagNumbersData.length === 0) {
      toast({ title: 'No tags to clear', description: 'There are no tag numbers to delete.' });
      return;
    }
    setSelectedResortTags(resortTagNumbersData.map(t => t.id!).filter(Boolean));
    openResortConfirm('clear_tags', 'Clear All Tag Numbers', `This will permanently delete all ${resortTagNumbersData.length} tag numbers. Continue?`);
  };

  const clearAllResortRoomsConfirmed = async () => {
    setResortDeleteType('rooms');
    setResortDeleteCount(selectedResortRooms.length);
    setShowResortDeleteDialog(true);
  };

  const clearAllResortTagsConfirmed = async () => {
    setResortDeleteType('tags');
    setResortDeleteCount(selectedResortTags.length);
    setShowResortDeleteDialog(true);
  };

  const resortManualCleanup = async () => {
    try {
      setIsResortManualCleaning(true);
      setResortDeleteProgress(0);
      setResortCurrentDeleteIndex(0);

      const allTrainees = await getResortTrainees();
      const allTags = await getResortTagNumbers();
      setResortDeleteProgress(20);

      // Build a set of existing tag numbers (normalize formats)
      const existingTags = new Set<string>(
        allTags.map(t => (t.tagNo.startsWith('Trainee-') ? t.tagNo.replace('Trainee-', '') : t.tagNo))
      );

      const traineesToUpdate = allTrainees.filter(t => {
        if (!t.tagNumber || t.tagNumber === 'pending') return false;
        const traineeTag = t.tagNumber.startsWith('Trainee-') ? t.tagNumber.replace('Trainee-', '') : t.tagNumber;
        return !existingTags.has(traineeTag);
      });

      setResortDeleteCount(traineesToUpdate.length);
      if (traineesToUpdate.length === 0) {
        setResortDeleteProgress(100);
        toast({ title: 'No Cleanup Needed', description: 'All trainee tag numbers are valid.' });
        return;
      }

      for (let i = 0; i < traineesToUpdate.length; i++) {
        const tr = traineesToUpdate[i];
        setResortCurrentDeleteIndex(i + 1);
        setResortDeleteProgress(20 + ((i + 1) / traineesToUpdate.length) * 70);
        await updateResortDocument('trainees', tr.id, { tagNumber: 'pending', allocationStatus: 'no_tags' });
      }

      await queryClient.invalidateQueries({ queryKey: ['trainees'] });
      await queryClient.refetchQueries({ queryKey: ['trainees'] });
      await queryClient.invalidateQueries({ queryKey: ['resortTagNumbers'] });
      await queryClient.refetchQueries({ queryKey: ['resortTagNumbers'] });

      setResortDeleteProgress(100);
      toast({ title: 'Manual Cleanup Complete', description: `Updated ${traineesToUpdate.length} trainee records with missing tags.` });
    } catch (err) {
      toast({ title: 'Manual Cleanup Error', description: 'Failed to perform manual cleanup.', variant: 'destructive' });
    } finally {
      setIsResortManualCleaning(false);
      setResortDeleteProgress(0);
      setResortCurrentDeleteIndex(0);
    }
  };

  // Check admin authentication via localStorage and Firebase
  const [adminUser, setAdminUser] = useState<any>(null);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    const checkAdminAuth = () => {
      const isAuthenticated = localStorage.getItem('adminAuthenticated');
      const adminEmail = localStorage.getItem('adminEmail');
      const adminUserData = localStorage.getItem('adminUser');
      
      if (isAuthenticated === 'true' && adminEmail && adminUserData) {
        try {
          const userData = JSON.parse(adminUserData);
          setAdminUser(userData);
        } catch (error) {
          console.error('Error parsing admin user data:', error);
          localStorage.removeItem('adminAuthenticated');
          localStorage.removeItem('adminEmail');
          localStorage.removeItem('adminUser');
          navigate("/admin-login");
        }
      } else {
        navigate("/admin-login");
      }
      setIsCheckingAdmin(false);
    };

    checkAdminAuth();
  }, [navigate]);

  // Handle authentication loading
  if (isCheckingAdmin) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!adminUser) {
    navigate("/admin-login");
    return null;
  }



  // Comprehensive status calculation function
  const calculateDetailedStatus = (trainee: any) => {
    const hasRoom = trainee.roomNumber && trainee.roomBlock && trainee.roomNumber !== 'pending' && trainee.roomBlock !== 'pending';
    const hasTag = trainee.tagNumber && trainee.tagNumber !== 'pending';
    
    if (!hasRoom && !hasTag) {
      return { status: 'pending', details: 'No room or tag assigned', variant: 'destructive' };
    }
    
    if (!hasRoom) {
      return { status: 'no_room', details: 'Tag assigned but no room', variant: 'secondary' };
    }
    
    if (!hasTag) {
      return { status: 'no_tag', details: 'Room assigned but no tag', variant: 'secondary' };
    }
    
    // Both room and tag assigned - check room occupancy
    const traineeRoom = rooms.find(room => 
      room.roomNumber === trainee.roomNumber && room.block === trainee.roomBlock
    );
    
    if (!traineeRoom) {
      return { status: 'room_not_found', details: 'Room not found in system', variant: 'destructive' };
    }
    
    // Handle both numeric and text bed space formats
    let bedSpaceType = 1;
    if (traineeRoom.bedSpace) {
      if (traineeRoom.bedSpace.toLowerCase() === 'double') {
        bedSpaceType = 2;
      } else if (traineeRoom.bedSpace.toLowerCase() === 'single') {
        bedSpaceType = 1;
      } else {
        bedSpaceType = parseInt(traineeRoom.bedSpace) || 1;
      }
    }
    const traineesInRoom = advancedTrainees.filter(t => 
      t.roomNumber === trainee.roomNumber && 
      t.roomBlock === trainee.roomBlock
    );
    
    const occupancy = traineesInRoom.length;
    
    if (bedSpaceType === 1) {
      // Single bed room
      if (occupancy === 1) {
        return { status: 'fully_allocated', details: 'Single room fully occupied', variant: 'default' };
      } else {
        return { status: 'error', details: `Single room has ${occupancy} occupants`, variant: 'destructive' };
      }
    } else if (bedSpaceType === 2) {
      // Double bed room
      if (occupancy === 1) {
        return { status: 'partially_allocated', details: 'Double room - 1 of 2 beds occupied', variant: 'secondary' };
      } else if (occupancy === 2) {
        return { status: 'fully_allocated', details: 'Double room fully occupied', variant: 'default' };
      } else {
        return { status: 'error', details: `Double room has ${occupancy} occupants`, variant: 'destructive' };
      }
    } else {
      // Other bed space types
      if (occupancy >= bedSpaceType) {
        return { status: 'fully_allocated', details: `Room fully occupied (${occupancy}/${bedSpaceType})`, variant: 'default' };
      } else if (occupancy > 0) {
        return { status: 'partially_allocated', details: `Room partially occupied (${occupancy}/${bedSpaceType})`, variant: 'secondary' };
      } else {
        return { status: 'error', details: 'Room has no occupants', variant: 'destructive' };
      }
    }
  };

  const filteredTrainees = advancedTrainees.filter(trainee => {
    const matchesSearch = searchTerm === "" || 
      `${trainee.firstName} ${trainee.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainee.tagNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trainee.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGender = genderFilter === "" || genderFilter === "all" || trainee.gender === genderFilter;
    const matchesState = stateFilter === "" || stateFilter === "all" || trainee.state === stateFilter;
    
    return matchesSearch && matchesGender && matchesState;
  });

  // Selection handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTrainees(filteredTrainees.map(t => t.id));
    } else {
      setSelectedTrainees([]);
    }
  };

  const handleSelectTrainee = (traineeId: string, checked: boolean) => {
    if (checked) {
      setSelectedTrainees(prev => [...prev, traineeId]);
    } else {
      setSelectedTrainees(prev => prev.filter(id => id !== traineeId));
    }
  };

  // Delete handlers
  const handleDeleteSingle = (traineeId: string) => {
    setTraineeToDelete(traineeId);
    setDeleteType('single');
    setShowDeleteDialog(true);
  };

  const handleDeleteMultiple = () => {
    setDeleteType('multiple');
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);

      if (deleteType === 'single' && traineeToDelete) {
        setDeleteProgress(50);
        await deleteTraineeMutation.mutateAsync(traineeToDelete);
        setDeleteProgress(100);
      } else if (deleteType === 'multiple') {
        // Delete multiple trainees with progress
        for (let i = 0; i < selectedTrainees.length; i++) {
          const traineeId = selectedTrainees[i];
          setCurrentDeleteIndex(i + 1);
          setDeleteProgress(((i + 1) / selectedTrainees.length) * 100);
          
          await deleteTraineeMutation.mutateAsync(traineeId);
          
          // Small delay for visual feedback
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        setSelectedTrainees([]);
      }
    } catch (error) {
      console.error('Error during deletion:', error);
    } finally {
      setIsDeleting(false);
      setDeleteProgress(0);
      setCurrentDeleteIndex(0);
      setShowDeleteDialog(false);
      setTraineeToDelete(null);
      setDeleteType(null);
    }
  };

  // Edit handlers
  const handleEdit = (trainee: any) => {
    setEditingTrainee(trainee);
  };

  const handleSaveEdit = (updatedData: any) => {
    if (editingTrainee) {
      updateTraineeMutation.mutate({ id: editingTrainee.id, data: updatedData });
    }
  };

  const exportToCSV = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      setExportProgress(20);
      const headers = ['Tag Number', 'Name', 'Email', 'Phone', 'Gender', 'State', 'LGA', 'Room'];
      
      setExportProgress(40);
      const csvContent = [
        headers.join(','),
        ...filteredTrainees.map((trainee, index) => {
          setExportProgress(40 + ((index + 1) / filteredTrainees.length) * 50);
          return [
            trainee.tagNumber,
            `${trainee.firstName} ${trainee.surname}`,
            trainee.email,
            trainee.phone,
            trainee.gender,
            trainee.state,
            trainee.lga,
            trainee.roomNumber ? `${trainee.roomBlock}-${trainee.roomNumber}` : 'Not assigned'
          ].join(',');
        })
      ].join('\n');
    
      setExportProgress(95);
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'trainees.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      
      setExportProgress(100);
      toast({
        title: "Export successful",
        description: `Exported ${filteredTrainees.length} trainees to CSV file.`,
      });
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast({
        title: "Export failed",
        description: "Failed to export trainees data.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshProgress(0);
    
    try {
      setRefreshProgress(25);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setRefreshProgress(50);
      await queryClient.invalidateQueries({ queryKey: ['trainees'] });
      
      setRefreshProgress(75);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setRefreshProgress(100);
      toast({
        title: "Refresh Complete",
        description: "Trainee data has been refreshed.",
      });
    } catch (error) {
      console.error('Error refreshing data:', error);
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh trainee data.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
      setRefreshProgress(0);
    }
  };

  // Resort Imports (Rooms)
  const handleResortRoomImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ title: 'Invalid file', description: 'Please upload an Excel file (.xlsx or .xls)', variant: 'destructive' });
      event.target.value = '';
      return;
    }
    setIsResortImportingRooms(true);
    setResortImportType('rooms');
    setResortImportProgress(0);
    setResortCurrentImportIndex(0);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setResortImportProgress(10);
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          setResortImportProgress(20);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
          setResortImportProgress(30);
          const headerRow = jsonData[0] as any[];
          if (!headerRow || headerRow.length < 4) {
            toast({ title: 'Invalid format', description: 'Expected columns: S/N, Room Numbers, Bed Space, Block', variant: 'destructive' });
            return;
          }
          const hasBedSpace = headerRow.some((cell: any) => String(cell).toLowerCase().includes('bed') || String(cell).toLowerCase().includes('space'));
          const hasBlock = headerRow.some((cell: any) => String(cell).toLowerCase().includes('block'));
          if (!hasBedSpace || !hasBlock) {
            toast({ title: 'Wrong file', description: 'This looks like a tag file. Use Import Tag Numbers.', variant: 'destructive' });
            return;
          }
          setResortImportProgress(40);
          const roomsToCreate: Omit<Room, 'id' | 'createdAt'>[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length < 4) continue;
            const [, roomNumberCell, bedSpaceCell, blockCell] = row;
            if (!roomNumberCell || !bedSpaceCell || !blockCell) continue;
            let bedSpaceValue = String(bedSpaceCell);
            if (bedSpaceValue.toLowerCase() === 'double') bedSpaceValue = '2';
            else if (bedSpaceValue.toLowerCase() === 'single') bedSpaceValue = '1';
            let formattedRoomNumber = String(roomNumberCell);
            if (!formattedRoomNumber.startsWith('Room-')) {
              formattedRoomNumber = `Room-${formattedRoomNumber}`;
            }
            roomsToCreate.push({
              roomNumber: formattedRoomNumber,
              bedSpace: bedSpaceValue,
              block: String(blockCell),
              status: 'available'
            });
          }
          if (roomsToCreate.length === 0) {
            toast({ title: 'No valid rows', description: 'Check your Excel format for Rooms.', variant: 'destructive' });
            return;
          }
          setResortImportCount(roomsToCreate.length);
          setResortImportProgress(50);
          for (let i = 0; i < roomsToCreate.length; i++) {
            setResortCurrentImportIndex(i + 1);
            setResortImportProgress(50 + ((i + 1) / roomsToCreate.length) * 40);
            await createRoom(roomsToCreate[i]);
            await new Promise(r => setTimeout(r, 50));
          }
          setResortImportProgress(95);
          await queryClient.invalidateQueries({ queryKey: ['resortRooms'] });
          await queryClient.refetchQueries({ queryKey: ['resortRooms'] });
          setResortImportProgress(100);
          toast({ title: 'Rooms imported', description: `${roomsToCreate.length} rooms added.` });
        } catch (err) {
          console.error('Rooms import error:', err);
          toast({ title: 'Import failed', description: 'Failed to process rooms file.', variant: 'destructive' });
        } finally {
          setIsResortImportingRooms(false);
          setResortImportProgress(0);
          setResortCurrentImportIndex(0);
          setResortImportType(null);
          setResortImportCount(0);
          event.target.value = '';
        }
      };
      reader.onerror = () => {
        toast({ title: 'File read error', description: 'Could not read the file.', variant: 'destructive' });
        setIsResortImportingRooms(false);
        event.target.value = '';
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing rooms:', error);
      toast({ title: 'Import failed', description: 'Failed to import rooms.', variant: 'destructive' });
      setIsResortImportingRooms(false);
      event.target.value = '';
    }
  };

  // Resort Imports (Tags)
  const handleResortTagImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast({ title: 'Invalid file', description: 'Please upload an Excel file (.xlsx or .xls)', variant: 'destructive' });
      event.target.value = '';
      return;
    }
    setIsResortImportingTags(true);
    setResortImportType('tags');
    setResortImportProgress(0);
    setResortCurrentImportIndex(0);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          setResortImportProgress(10);
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          setResortImportProgress(20);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
          setResortImportProgress(30);
          const headerRow = jsonData[0] as any[];
          if (!headerRow || headerRow.length < 2) {
            toast({ title: 'Invalid format', description: 'Expected columns: S/N, TAG NO', variant: 'destructive' });
            return;
          }
          const hasBedSpace = headerRow.some((cell: any) => String(cell).toLowerCase().includes('bed') || String(cell).toLowerCase().includes('space'));
          const hasBlock = headerRow.some((cell: any) => String(cell).toLowerCase().includes('block'));
          if (hasBedSpace || hasBlock) {
            toast({ title: 'Wrong file', description: 'This looks like a rooms file. Use Import Rooms.', variant: 'destructive' });
            return;
          }
          const hasTagColumn = headerRow.some((cell: any) => String(cell).toLowerCase().includes('tag') || String(cell).toLowerCase().includes('no'));
          if (!hasTagColumn) {
            toast({ title: 'Invalid tag file', description: 'Expected a TAG column.', variant: 'destructive' });
            return;
          }
          setResortImportProgress(40);
          const tagsToCreate: Omit<TagNumber, 'id' | 'createdAt'>[] = [];
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i] as any[];
            if (!row || row.length < 2) continue;
            const [, tagNoCell] = row;
            if (!tagNoCell) continue;
            tagsToCreate.push({ tagNo: String(tagNoCell), status: 'available' });
          }
          if (tagsToCreate.length === 0) {
            toast({ title: 'No valid rows', description: 'Check your Excel format for Tag Numbers.', variant: 'destructive' });
            return;
          }
          setResortImportCount(tagsToCreate.length);
          setResortImportProgress(50);
          for (let i = 0; i < tagsToCreate.length; i++) {
            setResortCurrentImportIndex(i + 1);
            setResortImportProgress(50 + ((i + 1) / tagsToCreate.length) * 40);
            await createTagNumber(tagsToCreate[i]);
            await new Promise(r => setTimeout(r, 50));
          }
          setResortImportProgress(95);
          await queryClient.invalidateQueries({ queryKey: ['resortTagNumbers'] });
          await queryClient.refetchQueries({ queryKey: ['resortTagNumbers'] });
          setResortImportProgress(100);
          toast({ title: 'Tags imported', description: `${tagsToCreate.length} tag numbers added.` });
        } catch (err) {
          console.error('Tags import error:', err);
          toast({ title: 'Import failed', description: 'Failed to process tags file.', variant: 'destructive' });
        } finally {
          setIsResortImportingTags(false);
          setResortImportProgress(0);
          setResortCurrentImportIndex(0);
          setResortImportType(null);
          setResortImportCount(0);
          event.target.value = '';
        }
      };
      reader.onerror = () => {
        toast({ title: 'File read error', description: 'Could not read the file.', variant: 'destructive' });
        setIsResortImportingTags(false);
        event.target.value = '';
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error importing tags:', error);
      toast({ title: 'Import failed', description: 'Failed to import tag numbers.', variant: 'destructive' });
      setIsResortImportingTags(false);
      event.target.value = '';
    }
  };

  // Test function to verify room allocation
  const testRoomAllocation = async () => {
    try {
      const trainees = await getTrainees();
      const rooms = await getRooms();
      
      console.log("=== ROOM ALLOCATION TEST ===");
      console.log(`Total trainees: ${trainees.length}`);
      console.log(`Total rooms: ${rooms.length}`);
      
      // Log room details
      console.log("Room details:");
      rooms.forEach(room => {
        console.log(`- Room ${room.roomNumber} (${room.block}): status=${room.status}, bedSpace=${room.bedSpace}`);
      });
      
      // Log trainee allocation status
      console.log("Trainee allocation status:");
      const statusCounts = trainees.reduce((acc, trainee) => {
        acc[trainee.allocationStatus || 'unknown'] = (acc[trainee.allocationStatus || 'unknown'] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log(statusCounts);
      
      toast({
        title: "Room Allocation Test",
        description: `Found ${trainees.length} trainees and ${rooms.length} rooms. Check console for details.`,
      });
    } catch (error) {
      console.error("Test failed:", error);
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Failed to test room allocation",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header variant="admin" />

      {/* Real-time Notification Banner */}
      {evaluationQuestions.some(q => q.isPublished) && (
        <div className="fixed top-16 left-0 right-0 z-[10000] bg-gradient-to-r from-green-50 to-blue-50 border-b border-green-200 px-6 py-3 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800">
                Live Evaluation System Active
              </span>
              <span className="text-xs text-green-600">
                {evaluationQuestions.filter(q => q.isPublished).length} questions are currently live for trainees
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-green-600">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Real-time updates enabled</span>
            </div>
          </div>
        </div>
      )}

      {/* Firebase Connection Status Banner */}
      {traineesError && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-200 px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-red-800">
                Firebase Connection Issue
              </span>
              <span className="text-xs text-red-600">
                Some data may not be up to date. Retrying automatically...
              </span>
            </div>
            <div className="flex items-center space-x-2 text-xs text-red-600">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span>Offline mode active</span>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-layout-with-fixed-footer">
        <AdminSidebar 
        activeSection={activeSection} 
        onSectionChange={handleSectionChange}
        onCollapseChange={setIsSidebarCollapsed}
        />

        {/* Main Content */}
        <main className={cn(
          "main-content-with-fixed-footer p-6",
          isSidebarCollapsed && "collapsed"
        )}>
          {activeSection === "dashboard" && (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Dashboard Overview</h2>
                <p className="text-gray-600">Welcome back, Administrator</p>
              </div>

              {/* Stats Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="card-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Total Trainees</p>
                        <p className="text-3xl font-bold text-[hsl(var(--primary))]">
                          {statistics?.totalTrainees || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Sponsors</p>
                        <p className="text-3xl font-bold text-[hsl(var(--secondary))]">
                          {statistics?.activeSponsors || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center">
                        <Building className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Completed Courses</p>
                        <p className="text-3xl font-bold text-[hsl(var(--success))]">
                          {statistics?.completedCourses || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-[hsl(var(--success))] rounded-full flex items-center justify-center">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="card-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Active Content</p>
                        <p className="text-3xl font-bold text-[hsl(var(--info))]">
                          {statistics?.activeContent || 0}
                        </p>
                      </div>
                      <div className="w-12 h-12 bg-[hsl(var(--info))] rounded-full flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
                             {/* Recent Activity */}
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-800">Recent System Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-[hsl(var(--success))] rounded-full flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">New trainees registered</p>
                        <p className="text-sm text-gray-600">Latest registrations - 2 hours ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-[hsl(var(--info))] rounded-full flex items-center justify-center">
                        <Video className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">New training video uploaded</p>
                        <p className="text-sm text-gray-600">Advanced Crop Management - 1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-[hsl(var(--secondary))] rounded-full flex items-center justify-center">
                        <Building className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">New sponsor added</p>
                        <p className="text-sm text-gray-600">Agricultural Development Program - 2 days ago</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Sponsors Section */}
          {activeSection === "sponsors" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Sponsors Management</h2>
                  <p className="text-gray-600">Manage training program sponsors</p>
                </div>
                <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Sponsor
                </Button>
              </div>

              {/* Sponsors Table */}
              <Card className="card-shadow overflow-hidden">
                <CardHeader className="border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-800">Active Sponsors</CardTitle>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Filter className="mr-1 h-4 w-4" />
                        Filter
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="mr-1 h-4 w-4" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Sponsor
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Trainees
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Start Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sponsors?.map((sponsor) => (
                          <tr key={sponsor.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                                    <Building className="h-5 w-5 text-white" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{sponsor.name}</div>
                                  <div className="text-sm text-gray-500">{sponsor.description}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {trainees?.filter(t => t.sponsorId === sponsor.id).length || 0}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={sponsor.isActive ? "default" : "secondary"}>
                                {sponsor.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {sponsor.startDate ? new Date(sponsor.startDate).toLocaleDateString() : "N/A"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <Button variant="ghost" size="sm" className="text-[hsl(var(--primary))] hover:text-[hsl(var(--primary-dark))] mr-3">
                                Edit
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-900">
                                Deactivate
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Exams Section */}
          {activeSection === "exams" && (
            examView === "actions" ? (
              <AdminExamActions onNavigate={setExamView} />
            ) : examView === "setup" ? (
              <AdminExamSetup embedded />
            ) : examView === "results" ? (
               <AdminExamResults embedded />
             ) : examView === "records" ? (
               <AdminExamRecords embedded />
             ) : (
               <div className="p-6 text-center text-gray-600">Unknown view.</div>
             )
          )}

          {/* Content Section */}
          {activeSection === "content" && (
             contentView === "actions" ? (
               <AdminContentActions onNavigate={setContentView} />
             ) : contentView === "videos" ? (
               <AdminVideoUpload embedded />
             ) : contentView === "files" ? (
               <AdminFileUpload embedded />
             ) : (
               <div className="p-6 text-center text-gray-600">Unknown view.</div>
             )
           )}

          {/* ID Management Section */}
          {(activeSection === "staff-id" || activeSection === "resource-person-id") && (
            <AdminIdManagement />
           )}

                    {/* Announcements Section */}
          {activeSection === "announcements" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Announcements</h2>
                  <p className="text-gray-600">Create and manage announcements for trainees</p>
                </div>
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setAnnouncementView("create")}
                    className={`${
                      announcementView === "create"
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    }`}
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    Create Announcement
                  </Button>
                  <Button
                    onClick={() => setAnnouncementView("manage")}
                    className={`${
                      announcementView === "manage"
                        ? "bg-green-600 hover:bg-green-700 text-white border-green-600"
                        : "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                    }`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Manage Announcements
                  </Button>

                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="mb-4">
                  <p className="text-sm text-gray-600">Current view: {announcementView}</p>
                </div>
                
                {announcementView === "create" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Create Announcement</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Create New Announcement</h4>
                      <p className="text-gray-600 mb-4">Use the form below to create and send announcements to trainees.</p>
                      <div className="mt-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-blue-800 font-medium">Testing Announcement Creator Component</p>
                          <AdminAnnouncementCreator />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {announcementView === "manage" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Manage Announcements</h3>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Manage Existing Announcements</h4>
                      <p className="text-gray-600 mb-4">View, edit, and manage all announcements.</p>
                      <div className="mt-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                          <p className="text-green-800 font-medium">Testing Announcement Manager Component</p>
                          <AdminAnnouncementManager />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                

              </div>
            </div>
          )}

          {/* Trainees Section */}
          {activeSection === "trainees" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Trainee Management</h2>
                  <p className="text-gray-600">View and manage all registered trainees</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button 
                    onClick={handleRefresh} 
                    variant="outline"
                    disabled={isRefreshing || synchronizeAllocationsMutation.isPending}
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    <RefreshCw className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} size={16} />
                    {isRefreshing ? "Refreshing..." : "Refresh"}
                  </Button>
                  <Button 
                    onClick={() => synchronizeAllocationsMutation.mutate()} 
                    variant="outline"
                    disabled={isRefreshing || synchronizeAllocationsMutation.isPending}
                    className="bg-green-50 text-green-700 hover:bg-green-100"
                  >
                    {synchronizeAllocationsMutation.isPending ? "Synchronizing..." : "Synchronize Allocations"}
                  </Button>
                  <Button 
                    onClick={() => cleanupRoomAssignmentsMutation.mutate()} 
                    variant="outline"
                    disabled={cleanupRoomAssignmentsMutation.isPending}
                    className="bg-orange-50 text-orange-700 hover:bg-orange-100"
                  >
                    {cleanupRoomAssignmentsMutation.isPending ? "Cleaning..." : "Clean Invalid Rooms"}
                  </Button>
                  <Button 
                    onClick={() => cleanupTagAssignmentsMutation.mutate()} 
                    variant="outline"
                    disabled={cleanupTagAssignmentsMutation.isPending}
                    className="bg-purple-50 text-purple-700 hover:bg-purple-100"
                  >
                    {cleanupTagAssignmentsMutation.isPending ? "Cleaning..." : "Clean Invalid Tags"}
                  </Button>
                  {selectedTrainees.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteMultiple}
                      disabled={deleteTraineeMutation.isPending}
                    >
                      <Trash2 className="mr-2" size={16} />
                      Delete Selected ({selectedTrainees.length})
                    </Button>
                  )}
                  <Button onClick={exportToCSV} className="bg-green-600 hover:bg-green-700">
                    <Download className="mr-2" size={16} />
                    Export CSV
                  </Button>
                  <Button 
                    onClick={testRoomAllocation} 
                    variant="outline"
                    className="bg-purple-50 text-purple-700 hover:bg-purple-100"
                  >
                    Test Allocation
                  </Button>
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-6 border-b">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">
                      {filteredTrainees.length}
                    </div>
                    <p className="text-sm text-gray-600">Total Trainees</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">
                      {filteredTrainees.filter(t => {
                        const hasRoom = t.roomNumber && t.roomBlock && t.roomNumber !== 'pending' && t.roomBlock !== 'pending';
                        const hasTag = t.tagNumber && t.tagNumber !== 'pending';
                        return hasRoom && hasTag;
                      }).length}
                    </div>
                    <p className="text-sm text-gray-600">Allocated</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-orange-600">
                      {filteredTrainees.filter(t => {
                        const hasRoom = t.roomNumber && t.roomBlock && t.roomNumber !== 'pending' && t.roomBlock !== 'pending';
                        const hasTag = t.tagNumber && t.tagNumber !== 'pending';
                        return !hasRoom && !hasTag;
                      }).length}
                    </div>
                    <p className="text-sm text-gray-600">Pending</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">
                      {filteredTrainees.filter(t => {
                        const statusInfo = calculateDetailedStatus(t);
                        return statusInfo.status === 'partially_allocated';
                      }).length}
                    </div>
                    <p className="text-sm text-gray-600">Partial</p>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, tag, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Genders</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={stateFilter} onValueChange={setStateFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All States</SelectItem>
                    {Array.from(new Set(advancedTrainees.map(t => t.state).filter((state): state is string => !!state))).map(state => (
                      <SelectItem key={state} value={state}>{state}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setGenderFilter("all");
                    setStateFilter("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>

              {/* Selection Controls */}
              {filteredTrainees.length > 0 && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTrainees.length === filteredTrainees.length && filteredTrainees.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                    <span className="text-sm font-medium">
                      Select All ({selectedTrainees.length} selected)
                    </span>
                  </div>
                  {selectedTrainees.length > 0 && (
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteMultiple}
                      disabled={deleteTraineeMutation.isPending}
                    >
                      <Trash2 className="mr-2" size={16} />
                      Delete Selected
                    </Button>
                  )}
                </div>
              )}

              {/* Trainees Table */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedTrainees.length === filteredTrainees.length && filteredTrainees.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Tag Number</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Bed Space</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrainees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8">
                          <div className="text-gray-500">
                            <Users className="mx-auto h-12 w-12 mb-4 opacity-20" />
                            {advancedTrainees.length === 0 ? "No trainees registered yet" : "No trainees match your filters"}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrainees.map((trainee) => (
                        <TableRow key={trainee.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedTrainees.includes(trainee.id)}
                              onCheckedChange={(checked) => handleSelectTrainee(trainee.id, checked as boolean)}
                            />
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {trainee.tagNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {trainee.firstName} {trainee.surname}
                              </div>
                              {trainee.middleName && (
                                <div className="text-sm text-gray-500">
                                  {trainee.middleName}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{trainee.email}</div>
                              <div className="text-gray-500">{trainee.phone}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={trainee.gender === "male" ? "default" : "secondary"}>
                              {trainee.gender}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{trainee.state}</div>
                              <div className="text-gray-500">{trainee.lga}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {trainee.roomNumber && trainee.roomBlock ? (
                              <Badge variant="outline">
                                {trainee.roomBlock}-{trainee.roomNumber}
                              </Badge>
                            ) : (
                              <span className="text-gray-500 text-sm">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {(() => {
                              const statusInfo = calculateDetailedStatus(trainee);
                              return (
                                <div className="space-y-1">
                                  <Badge 
                                    variant={statusInfo.variant as any} 
                                    className={
                                      statusInfo.variant === 'default' ? 'bg-green-100 text-green-800' :
                                      statusInfo.variant === 'secondary' ? 'bg-orange-100 text-orange-800' :
                                      'bg-red-100 text-red-800'
                                    }
                                  >
                                    {statusInfo.status.replace('_', ' ').toUpperCase()}
                                  </Badge>
                                  <div className="text-xs text-gray-500">
                                    {statusInfo.details}
                                  </div>
                                </div>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            {trainee.bedSpace && trainee.bedSpace !== 'pending' ? (
                              <Badge variant="outline">{trainee.bedSpace}</Badge>
                            ) : (
                              <span className="text-gray-500 text-sm">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-blue-600 hover:text-blue-900"
                                onClick={() => handleEdit(trainee)}
                              >
                                <Edit size={16} />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-900"
                                onClick={() => handleDeleteSingle(trainee.id)}
                                disabled={deleteTraineeMutation.isPending}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
           )}

          {/* Certificate Section */}
          {activeSection === "certificate" && <AdminCertificateGeneration />}

          {/* Allocations Section */}
          {activeSection === "allocations" && (
            <div className="space-y-6">
              {/* Header with Action Buttons */}
              <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-2xl font-bold text-gray-900">Resort Management & Allocations</h2>
                  <p className="text-gray-600">Manage resort facilities, room allocations, and accommodation services</p>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Import Buttons */}
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleResortRoomImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isResortImportingRooms}
                      />
                      <Button 
                        variant="outline" 
                        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                        disabled={isResortImportingRooms}
                      >
                        <Upload className="mr-2" size={16} />
                        {isResortImportingRooms ? 'Importing...' : 'Import Rooms'}
                      </Button>
                    </div>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleResortTagImport}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        disabled={isResortImportingTags}
                      />
                      <Button 
                        variant="outline" 
                        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                        disabled={isResortImportingTags}
                      >
                        <Tag className="mr-2" size={16} />
                        {isResortImportingTags ? 'Importing...' : 'Import Tag Numbers'}
                      </Button>
                    </div>
                    <Button 
                      onClick={() => openResortConfirm('synchronize', 'Synchronize Allocations', 'This will process trainee allocations and update room/tag statuses. Continue?')}
                      variant="outline" 
                      className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                      disabled={isResortSynchronizing || isResortDeleting}
                    >
                      <RefreshCw className={`mr-2 ${isResortSynchronizing ? 'animate-spin' : ''}`} size={16} />
                      {isResortSynchronizing ? "Synchronizing..." : "Synchronize Allocations"}
                    </Button>
                    <Button 
                      onClick={() => openResortConfirm('manual_cleanup', 'Manual Cleanup', 'This will scan trainees for invalid/missing tags and set them to pending. Continue?')}
                      variant="outline" 
                      className="bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100"
                      disabled={isResortManualCleaning || isResortDeleting}
                    >
                      <RefreshCw className={`mr-2 ${isResortManualCleaning ? 'animate-spin' : ''}`} size={16} />
                      {isResortManualCleaning ? "Cleaning..." : "Manual Cleanup"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Import Instructions */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Import Instructions:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                    <strong>Rooms Excel Format:</strong>
                    <ul className="list-disc list-inside mt-1">
                      <li>S/N</li>
                      <li>Room Numbers</li>
                      <li>Bed Space</li>
                      <li>Block</li>
                    </ul>
                </div>
                  <div>
                    <strong>Tag Numbers Excel Format:</strong>
                    <ul className="list-disc list-inside mt-1">
                      <li>S/N</li>
                      <li>TAG NO</li>
                    </ul>
                  </div>
                </div>
                
                {/* Clear All Buttons */}
                <div className="mt-4 flex space-x-2">
                  <Button 
                    onClick={clearAllResortRooms}
                    variant="outline" 
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    disabled={isResortDeleting}
                  >
                    <Trash2 className="mr-2" size={16} />
                    Clear All Rooms
                  </Button>
                  <Button 
                    onClick={clearAllResortTags}
                    variant="outline" 
                    className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
                    disabled={isResortDeleting}
                  >
                    <Trash2 className="mr-2" size={16} />
                    Clear All Tag Numbers
                </Button>
              </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                        <Bed className="text-blue-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Rooms</p>
                        <p className="text-2xl font-bold text-gray-900">{resortRoomsData.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                        <Calendar className="text-green-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Available Facilities</p>
                        <p className="text-2xl font-bold text-gray-900">{resortFacilitiesData.filter(f => f.status === 'available').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mr-4">
                        <Users className="text-yellow-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Tasks</p>
                        <p className="text-2xl font-bold text-gray-900">{resortHousekeepingTasksData.filter(t => t.status === 'pending').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                        <Settings className="text-red-600" size={24} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-600">Pending Services</p>
                        <p className="text-2xl font-bold text-gray-900">{resortGuestServicesData.filter(s => s.status === 'pending').length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Management Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Room Management */}
                <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bed className="text-blue-600" size={20} />
                      Room Management ({resortRoomsData.length} rooms)
                    </CardTitle>
                </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        variant="outline"
                        onClick={() => openResortConfirm('deep_refresh_rooms', 'Deep Refresh Rooms', 'Recalculate room statuses based on current occupancy. Continue?')}
                        className="w-full"
                        disabled={isResortDeepRefreshing}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {isResortDeepRefreshing ? 'Refreshing...' : 'Deep Refresh'}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Search rooms..." 
                        className="flex-1" 
                        value={resortRoomSearchTerm}
                        onChange={(e) => setResortRoomSearchTerm(e.target.value)}
                      />
                      <div className="relative">
                        <Button 
                          variant="outline"
                          onClick={() => setShowResortRoomFilterDropdown(!showResortRoomFilterDropdown)}
                        >
                          <Filter className="mr-2" size={16} />
                          Filter
                        </Button>
                        {showResortRoomFilterDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 filter-dropdown">
                            <div className="py-1">
                              <button
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  resortRoomStatusFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setResortRoomStatusFilter('all');
                                  setShowResortRoomFilterDropdown(false);
                                }}
                              >
                                All Statuses
                              </button>
                              <button
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  resortRoomStatusFilter === 'available' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setResortRoomStatusFilter('available');
                                  setShowResortRoomFilterDropdown(false);
                                }}
                              >
                                Available Only
                              </button>
                              <button
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  resortRoomStatusFilter === 'occupied' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setResortRoomStatusFilter('occupied');
                                  setShowResortRoomFilterDropdown(false);
                                }}
                              >
                                Occupied Only
                              </button>
                              <button
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  resortRoomStatusFilter === 'maintenance' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setResortRoomStatusFilter('maintenance');
                                  setShowResortRoomFilterDropdown(false);
                                }}
                              >
                                Maintenance Only
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selection and Delete Controls */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedResortRooms.length === resortRoomsData.length && resortRoomsData.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedResortRooms(resortRoomsData.map(room => room.id!));
                            } else {
                              setSelectedResortRooms([]);
                            }
                          }}
                        />
                        <span className="text-sm font-medium">
                          Select All ({selectedResortRooms.length} selected)
                        </span>
                      </div>
                      {selectedResortRooms.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={deleteSelectedResortRooms}
                        >
                          <Trash2 className="mr-2" size={16} />
                          Delete Selected
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {resortRoomsData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Bed className="mx-auto mb-2 text-gray-400" size={32} />
                          <p>No rooms imported yet</p>
                          <p className="text-sm">Use the "Import Rooms" button to add rooms</p>
                        </div>
                      ) : (
                        resortRoomsData
                          .filter(room => {
                            const matchesSearch = room.roomNumber?.toLowerCase().includes(resortRoomSearchTerm.toLowerCase()) ||
                                                 room.block?.toLowerCase().includes(resortRoomSearchTerm.toLowerCase()) ||
                                                 room.bedSpace?.toLowerCase().includes(resortRoomSearchTerm.toLowerCase());
                            
                            const matchesStatus = resortRoomStatusFilter === 'all' || 
                                                 (resortRoomStatusFilter === 'available' && room.status === 'available') ||
                                                 (resortRoomStatusFilter === 'occupied' && room.status === 'occupied') ||
                                                 (resortRoomStatusFilter === 'maintenance' && room.status === 'maintenance');
                            
                            return matchesSearch && matchesStatus;
                          })
                          .map((room, index) => (
                            <div key={room.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-blue-50">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={selectedResortRooms.includes(room.id!)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedResortRooms(prev => [...prev, room.id!]);
                                    } else {
                                      setSelectedResortRooms(prev => prev.filter(id => id !== room.id!));
                                    }
                                  }}
                                />
                                <div>
                                  <h4 className="font-medium">{room.roomNumber}</h4>
                                  <p className="text-sm text-gray-600">{room.bedSpace} • Block {room.block}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">
                                  {room.status}
                                </Badge>
                              </div>
                            </div>
                          ))
                      )}
                  </div>
                </CardContent>
              </Card>

                {/* Tag Numbers Management */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="text-green-600" size={20} />
                      Tag Numbers Management ({resortTagNumbersData.length} tags)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center mb-4">
                      <Button
                        variant="outline"
                        onClick={() => openResortConfirm('deep_refresh_tags', 'Deep Refresh Tags', 'Recalculate tag statuses based on current assignments. Continue?')}
                        className="w-full"
                        disabled={isResortDeepRefreshingTags}
                      >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        {isResortDeepRefreshingTags ? 'Refreshing...' : 'Deep Refresh'}
                      </Button>
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Search tag numbers..." 
                        className="flex-1" 
                        value={resortTagSearchTerm}
                        onChange={(e) => setResortTagSearchTerm(e.target.value)}
                      />
                      <div className="relative">
                        <Button 
                          variant="outline"
                          onClick={() => setShowResortTagFilterDropdown(!showResortTagFilterDropdown)}
                        >
                          <Filter className="mr-2" size={16} />
                          Filter
                        </Button>
                        {showResortTagFilterDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10 filter-dropdown">
                            <div className="py-1">
                              <button
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  resortTagStatusFilter === 'all' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setResortTagStatusFilter('all');
                                  setShowResortTagFilterDropdown(false);
                                }}
                              >
                                All Statuses
                              </button>
                              <button
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  resortTagStatusFilter === 'available' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setResortTagStatusFilter('available');
                                  setShowResortTagFilterDropdown(false);
                                }}
                              >
                                Available Only
                              </button>
                              <button
                                className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                                  resortTagStatusFilter === 'assigned' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                                }`}
                                onClick={() => {
                                  setResortTagStatusFilter('assigned');
                                  setShowResortTagFilterDropdown(false);
                                }}
                              >
                                Assigned Only
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selection and Delete Controls */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={selectedResortTags.length === resortTagNumbersData.length && resortTagNumbersData.length > 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedResortTags(resortTagNumbersData.map(tag => tag.id!));
                            } else {
                              setSelectedResortTags([]);
                            }
                          }}
                        />
                        <span className="text-sm font-medium">
                          Select All ({selectedResortTags.length} selected)
                        </span>
                      </div>
                      {selectedResortTags.length > 0 && (
                        <Button 
                          variant="destructive" 
                          size="sm"
                          onClick={deleteSelectedResortTags}
                        >
                          <Trash2 className="mr-2" size={16} />
                          Delete Selected
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {resortTagNumbersData.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Tag className="mx-auto mb-2 text-gray-400" size={32} />
                          <p>No tag numbers imported yet</p>
                          <p className="text-sm">Use the "Import Tag Numbers" button to add tags</p>
                        </div>
                      ) : (
                        resortTagNumbersData
                          .filter(tag => {
                            const matchesSearch = tag.tagNo?.toLowerCase().includes(resortTagSearchTerm.toLowerCase());
                            
                            const matchesStatus = resortTagStatusFilter === 'all' || 
                                                 (resortTagStatusFilter === 'available' && tag.status === 'available') ||
                                                 (resortTagStatusFilter === 'assigned' && tag.status === 'assigned');
                            
                            return matchesSearch && matchesStatus;
                          })
                          .map((tag, index) => (
                            <div key={tag.id || index} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={selectedResortTags.includes(tag.id!)}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setSelectedResortTags(prev => [...prev, tag.id!]);
                                    } else {
                                      setSelectedResortTags(prev => prev.filter(id => id !== tag.id!));
                                    }
                                  }}
                                />
                                <div>
                                  <h4 className="font-medium">{tag.tagNo}</h4>
                                  <p className="text-sm text-gray-600">Tag Number</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge 
                                  variant={tag.status === 'available' ? 'secondary' : 'destructive'}
                                >
                                  {tag.status}
                                </Badge>
                              </div>
                            </div>
                          ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Generate ID Section */}
          {activeSection === "generate-id" && (
            <AdminIdManagement />
          )}

          {/* CBT Setup Section */}
          {activeSection === "cbt-setup" && (
            <AdminCBTSetup />
          )}

          {/* Registration Management Section */}
          {activeSection === "registration" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
            <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Registration Management</h2>
                  <p className="text-gray-600">Control access to different registration types across the system</p>
                </div>
              </div>

              {/* Current Status Summary - Moved to Top */}
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Current Status Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Trainee Registration:</span>
                      <Badge variant={registrationEnabled?.value === 'true' ? 'default' : 'secondary'}>
                        {registrationEnabled?.value === 'true' ? 'OPEN' : 'CLOSED'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Staff Registration:</span>
                      <Badge variant={staffRegistrationEnabled?.value === 'true' ? 'default' : 'secondary'}>
                        {staffRegistrationEnabled?.value === 'true' ? 'OPEN' : 'CLOSED'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="font-medium">Resource Person Registration:</span>
                      <Badge variant={rpRegistrationEnabled?.value === 'true' ? 'default' : 'secondary'}>
                        {rpRegistrationEnabled?.value === 'true' ? 'OPEN' : 'CLOSED'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Individual Registration Controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trainee Registration */}
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Trainee Registration
                    </CardTitle>
                    <CardDescription>Allow new trainee registrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={registrationEnabled?.value === 'true' ? 'default' : 'secondary'}>
                        {registrationEnabled?.value === 'true' ? 'OPEN' : 'CLOSED'}
                      </Badge>
                    </div>
                    <Button
                      variant={registrationEnabled?.value === 'true' ? 'destructive' : 'default'}
                      className="w-full"
                      onClick={() => {
                        const newStatus = registrationEnabled?.value === 'true' ? false : true;
                        registrationToggleMutation.mutate({ enabled: newStatus });
                      }}
                      disabled={registrationToggleMutation.isPending}
                    >
                      {registrationToggleMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        registrationEnabled?.value === 'true' ? 'Close Registration' : 'Open Registration'
                      )}
                  </Button>
                  </CardContent>
                </Card>

                {/* Staff Registration */}
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      Staff Registration
                    </CardTitle>
                    <CardDescription>Allow new staff registrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={staffRegistrationEnabled?.value === 'true' ? 'default' : 'secondary'}>
                        {staffRegistrationEnabled?.value === 'true' ? 'OPEN' : 'CLOSED'}
                      </Badge>
                    </div>
                    <Button
                      variant={staffRegistrationEnabled?.value === 'true' ? 'destructive' : 'default'}
                      className="w-full"
                      onClick={() => {
                        const newStatus = staffRegistrationEnabled?.value === 'true' ? false : true;
                        staffRegistrationToggleMutation.mutate(newStatus);
                      }}
                      disabled={staffRegistrationToggleMutation.isPending}
                    >
                      {staffRegistrationToggleMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        staffRegistrationEnabled?.value === 'true' ? 'Close Registration' : 'Open Registration'
                      )}
                </Button>
                  </CardContent>
                </Card>

                {/* Resource Person Registration */}
                <Card className="card-shadow">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserCheck className="h-5 w-5 text-purple-600" />
                      Resource Person Registration
                    </CardTitle>
                    <CardDescription>Allow new resource person registrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge variant={rpRegistrationEnabled?.value === 'true' ? 'default' : 'secondary'}>
                        {rpRegistrationEnabled?.value === 'true' ? 'OPEN' : 'CLOSED'}
                      </Badge>
              </div>
                    <Button
                      variant={rpRegistrationEnabled?.value === 'true' ? 'destructive' : 'default'}
                      className="w-full"
                      onClick={() => {
                        const newStatus = rpRegistrationEnabled?.value === 'true' ? false : true;
                        rpRegistrationToggleMutation.mutate(newStatus);
                      }}
                      disabled={rpRegistrationToggleMutation.isPending}
                    >
                      {rpRegistrationToggleMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        rpRegistrationEnabled?.value === 'true' ? 'Close Registration' : 'Open Registration'
                      )}
                    </Button>
                  </CardContent>
                </Card>
                  </div>

              {/* Bulk Controls */}
              <Card className="card-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-orange-600" />
                    Bulk Controls
                  </CardTitle>
                  <CardDescription>Control all registration types at once</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      variant="destructive"
                      className="w-full h-12"
                      disabled
                      title="Bulk close functionality coming soon"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Close All Registrations
                    </Button>
                    <Button
                      variant="default"
                      className="w-full h-12"
                      disabled
                      title="Bulk open functionality coming soon"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Start All Registrations
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Monitoring & Evaluation Section */}
          {activeSection === "monitoring-evaluation" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Monitoring & Evaluation</h2>
                  <p className="text-gray-600">Create and manage evaluation questions for trainees</p>
                </div>
                <div className="flex space-x-3">
                  <Button 
                    onClick={() => setEvaluationView("questions")}
                    className={`${
                      evaluationView === "questions" 
                        ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600" 
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                    }`}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Question
                  </Button>
                  <Button 
                    onClick={() => setEvaluationView("responses")}
                    className={`${
                      evaluationView === "responses" 
                        ? "bg-green-600 hover:bg-green-700 text-white border-green-600" 
                        : "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                    }`}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View Responses
                  </Button>
                  <Button 
                    onClick={() => setEvaluationView("manage")}
                    className={`${
                      evaluationView === "manage" 
                        ? "bg-purple-600 hover:bg-purple-700 text-white border-purple-600" 
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-200"
                    }`}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Questions
                  </Button>
                  <Button 
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["evaluation-questions"] })}
                    variant="outline"
                    className="bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              {/* Conditional Content Based on View */}
              {evaluationView === "manage" && (
                <>
                  {/* Evaluation Statistics */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <Card className="card-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Questions</p>
                            <p className="text-3xl font-bold text-blue-600">
                              {evaluationQuestions.length}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-blue-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="card-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Published</p>
                            <p className="text-3xl font-bold text-green-600">
                              {evaluationQuestions.filter(q => q.isPublished).length}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="card-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Drafts</p>
                            <p className="text-3xl font-bold text-orange-600">
                              {evaluationQuestions.filter(q => !q.isPublished).length}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-orange-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="card-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">Total Responses</p>
                            <p className="text-3xl font-bold text-purple-600">
                              {evaluationResponses.length}
                            </p>
                          </div>
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-purple-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                                     </div>

                   {/* Publish All Drafts Button */}
                   <div className="mb-6">
                     <Button 
                       onClick={() => {
                         const draftQuestions = evaluationQuestions.filter(q => !q.isPublished);
                         if (draftQuestions.length === 0) {
                           toast({
                             title: "No Draft Questions",
                             description: "All questions are already published.",
                             variant: "default",
                           });
                           return;
                         }
                         if (window.confirm(`Publish all ${draftQuestions.length} draft questions?`)) {
                           draftQuestions.forEach(question => {
                             updateQuestionMutation.mutate({
                               id: question.id,
                               questionData: { 
                                 isPublished: true,
                                 updatedAt: new Date()
                               }
                             });
                           });
                           toast({
                             title: "Bulk Publish Initiated",
                             description: `Publishing ${draftQuestions.length} questions...`,
                           });
                         }
                       }}
                       variant="outline"
                       className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                       disabled={evaluationQuestions.filter(q => !q.isPublished).length === 0}
                     >
                       <CheckCircle className="mr-2 h-4 w-4" />
                       Publish All Drafts
                     </Button>
                   </div>
                 </>
               )}

              {evaluationView === "questions" && (
                <div className="mb-8">
                  <Card className="card-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Plus className="mr-2 h-5 w-5 text-blue-600" />
                        Add New Evaluation Question
                      </CardTitle>
                      <CardDescription>
                        Create a new evaluation question for trainees to answer
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* Add Question Form Content - This will replace the modal */}
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="questionType">Question Type</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select question type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="yes_no">Yes/No</SelectItem>
                                <SelectItem value="single_choice">Single Choice</SelectItem>
                                <SelectItem value="rating">Rating (1-5)</SelectItem>
                                <SelectItem value="expression">Text Expression</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="questionStatus">Status</Label>
                            <Select>
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="published">Published</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="questionText">Question Text</Label>
                          <Textarea
                            placeholder="Enter your evaluation question..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <div className="flex justify-end space-x-3">
                          <Button 
                            variant="outline" 
                            onClick={() => setEvaluationView("manage")}
                          >
                            Hide
                          </Button>
                          <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" />
                            Add Question
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {evaluationView === "responses" && (
                <div className="mb-8">
                  <Card className="card-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Eye className="mr-2 h-5 w-5 text-green-600" />
                        Evaluation Responses
                      </CardTitle>
                      <CardDescription>
                        View and analyze trainee responses to evaluation questions
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {/* View Responses Content - This will replace the modal */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {evaluationResponses.length} Total Responses
                            </Badge>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              {evaluationQuestions.filter(q => q.isPublished).length} Active Questions
                            </Badge>
                          </div>
                                                     <div className="flex space-x-2">
                             <Button variant="outline" size="sm">
                               <Download className="mr-2 h-4 w-4" />
                               Export Responses
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => setEvaluationView("chart")}
                               className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                             >
                               <BarChart3 className="mr-2 h-4 w-4" />
                               Chart Response
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => setEvaluationView("manage")}
                             >
                               Hide
                             </Button>
                           </div>
                        </div>
                        <div className="border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Trainee</TableHead>
                                <TableHead>Question</TableHead>
                                <TableHead>Answer</TableHead>
                                <TableHead>Submitted</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {evaluationResponses.slice(0, 10).map((response) => (
                                <TableRow key={response.id}>
                                  <TableCell className="font-medium">{response.traineeName}</TableCell>
                                  <TableCell>{response.question}</TableCell>
                                  <TableCell>{response.answer}</TableCell>
                                  <TableCell>{new Date(response.submittedAt).toLocaleDateString()}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                             )}

               {evaluationView === "edit" && editingQuestion && (
                 <div className="mb-8">
                   <Card className="card-shadow">
                     <CardHeader>
                       <CardTitle className="flex items-center">
                         <Edit className="mr-2 h-5 w-5 text-orange-600" />
                         Edit Evaluation Question
                       </CardTitle>
                       <CardDescription>
                         Modify the question details and settings
                       </CardDescription>
                     </CardHeader>
                     <CardContent>
                       {/* Edit Question Form Content */}
                       <div className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <div>
                             <Label htmlFor="questionType">Question Type</Label>
                             <Select 
                               value={questionForm.type} 
                               onValueChange={(value) => setQuestionForm(prev => ({ ...prev, type: value as any }))}
                             >
                               <SelectTrigger>
                                 <SelectValue placeholder="Select question type" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="yes_no">Yes/No</SelectItem>
                                 <SelectItem value="single_choice">Single Choice</SelectItem>
                                 <SelectItem value="rating">Rating (1-5)</SelectItem>
                                 <SelectItem value="expression">Text Expression</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                           <div>
                             <Label htmlFor="questionStatus">Status</Label>
                             <Select 
                               value={questionForm.isPublished ? "published" : "draft"} 
                               onValueChange={(value) => setQuestionForm(prev => ({ ...prev, isPublished: value === "published" }))}
                             >
                               <SelectTrigger>
                                 <SelectValue placeholder="Select status" />
                               </SelectTrigger>
                               <SelectContent>
                                 <SelectItem value="draft">Draft</SelectItem>
                                 <SelectItem value="published">Published</SelectItem>
                               </SelectContent>
                             </Select>
                           </div>
                         </div>
                         <div>
                           <Label htmlFor="questionText">Question Text</Label>
                           <Textarea
                             placeholder="Enter your evaluation question..."
                             value={questionForm.question}
                             onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                             className="min-h-[100px]"
                           />
                         </div>
                         
                         {/* Options for single choice questions */}
                         {questionForm.type === 'single_choice' && (
                           <div>
                             <Label>Options</Label>
                             <div className="space-y-2">
                               {questionForm.options?.map((option, index) => (
                                 <div key={index} className="flex items-center space-x-2">
                                   <Input
                                     value={option}
                                     onChange={(e) => handleOptionChange(index, e.target.value)}
                                     placeholder={`Option ${index + 1}`}
                                   />
                                   {questionForm.options && questionForm.options.length > 1 && (
                                     <Button
                                       type="button"
                                       variant="outline"
                                       size="sm"
                                       onClick={() => handleRemoveOption(index)}
                                       className="text-red-600 hover:text-red-700"
                                     >
                                       <X className="h-4 w-4" />
                                     </Button>
                                   )}
                                 </div>
                               ))}
                               <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 onClick={handleAddOption}
                                 className="mt-2"
                               >
                                 <Plus className="mr-2 h-4 w-4" />
                                 Add Option
                               </Button>
                             </div>
                           </div>
                         )}
                         
                         <div className="flex justify-end space-x-3">
                           <Button 
                             variant="outline" 
                             onClick={() => {
                               setEvaluationView("manage");
                               setEditingQuestion(null);
                               setQuestionForm({
                                 question: '',
                                 type: 'yes_no',
                                 options: [''],
                                 isPublished: false
                               });
                             }}
                           >
                             Cancel
                           </Button>
                           <Button 
                             className="bg-orange-600 hover:bg-orange-700"
                             onClick={handleSubmitQuestion}
                           >
                             <Edit className="mr-2 h-4 w-4" />
                             Update Question
                           </Button>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                 </div>
               )}

               {evaluationView === "chart" && (
                 <div className="mb-8 space-y-6">
                   {/* Header with Summary Stats */}
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                     <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                       <CardContent className="p-4">
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="text-sm text-blue-600 font-medium">Total Responses</p>
                             <p className="text-2xl font-bold text-blue-700">{evaluationResponses.length}</p>
                           </div>
                           <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                             <Users className="h-5 w-5 text-blue-600" />
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                     
                     <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                       <CardContent className="p-4">
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="text-sm text-green-600 font-medium">Active Questions</p>
                             <p className="text-2xl font-bold text-green-700">{evaluationQuestions.filter(q => q.isPublished).length}</p>
                           </div>
                           <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                             <FileText className="h-5 w-5 text-green-600" />
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                     
                     <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
                       <CardContent className="p-4">
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="text-sm text-purple-600 font-medium">Avg Responses</p>
                             <p className="text-2xl font-bold text-purple-700">
                               {evaluationResponses.length > 0 ? Math.round(evaluationResponses.length / evaluationQuestions.filter(q => q.isPublished).length) : 0}
                             </p>
                           </div>
                           <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                             <BarChart3 className="h-5 w-5 text-purple-600" />
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                     
                     <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
                       <CardContent className="p-4">
                         <div className="flex items-center justify-between">
                           <div>
                             <p className="text-sm text-orange-600 font-medium">Latest Response</p>
                             <p className="text-lg font-bold text-orange-700">
                               {evaluationResponses.length > 0 ? new Date(Math.max(...evaluationResponses.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString() : 'N/A'}
                             </p>
                           </div>
                           <div className="w-10 h-10 bg-orange-200 rounded-full flex items-center justify-center">
                             <Clock className="h-5 w-5 text-orange-600" />
                           </div>
                         </div>
                       </CardContent>
                     </Card>
                   </div>

                   {/* Question-by-Question Analysis */}
                   <Card className="card-shadow">
                     <CardHeader>
                       <div className="flex items-center justify-between">
                         <div>
                           <CardTitle className="flex items-center">
                             <BarChart3 className="mr-2 h-5 w-5 text-indigo-600" />
                             Question-by-Question Analysis
                           </CardTitle>
                           <CardDescription>
                             Detailed breakdown of responses for each evaluation question
                           </CardDescription>
                         </div>
                         <div className="flex space-x-2">
                           <Button variant="outline" size="sm">
                             <Download className="mr-2 h-4 w-4" />
                             Export Data
                           </Button>
                           <Button 
                             variant="outline" 
                             size="sm"
                             onClick={() => setEvaluationView("manage")}
                           >
                             Back to Manage
                           </Button>
                         </div>
                       </div>
                     </CardHeader>
                     <CardContent>
                       <div className="space-y-8">
                         {evaluationQuestions.filter(q => q.isPublished).map((question, index) => {
                           const questionResponses = evaluationResponses.filter(r => r.questionId === question.id);
                           const responseCount = questionResponses.length;
                           
                           return (
                             <div key={question.id} className="border rounded-lg p-6 bg-gray-50">
                               <div className="mb-4">
                                 <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                   Q{index + 1}: {question.question}
                                 </h3>
                                 <div className="flex items-center space-x-4 text-sm text-gray-600">
                                   <span className="flex items-center">
                                     <Users className="mr-1 h-4 w-4" />
                                     {responseCount} responses
                                   </span>
                                   <span className="flex items-center">
                                     <Tag className="mr-1 h-4 w-4" />
                                     {question.type.replace('_', ' ')}
                                   </span>
                                   <span className="flex items-center">
                                     <CheckCircle className="mr-1 h-4 w-4 text-green-600" />
                                     Published
                                   </span>
                                 </div>
                               </div>

                               {/* Response Analysis based on question type */}
                               {question.type === 'yes_no' && (
                                 <div className="space-y-4">
                                   <div className="flex items-center justify-between">
                                     <span className="font-medium">Response Distribution:</span>
                                     <span className="text-sm text-gray-600">{responseCount} total responses</span>
                                   </div>
                                   <div className="bg-white rounded-lg p-4 border">
                                     <EvaluationPieChart
                                       data={{
                                         labels: ['Yes', 'No'],
                                         values: [
                                           questionResponses.filter(r => r.answer === 'yes').length,
                                           questionResponses.filter(r => r.answer === 'no').length
                                         ],
                                         colors: ['#10B981', '#EF4444']
                                       }}
                                       title="Yes/No Response Distribution"
                                       height={250}
                                     />
                                   </div>
                                 </div>
                               )}

                               {question.type === 'rating' && (
                                 <div className="space-y-4">
                                   <div className="flex items-center justify-between">
                                     <span className="font-medium">Rating Distribution:</span>
                                     <span className="text-sm text-gray-600">{responseCount} total responses</span>
                                   </div>
                                   <div className="bg-white rounded-lg p-4 border">
                                     <EvaluationBarChart
                                       data={{
                                         labels: ['5 Stars', '4 Stars', '3 Stars', '2 Stars', '1 Star'],
                                         values: [
                                           questionResponses.filter(r => r.answer === 5).length,
                                           questionResponses.filter(r => r.answer === 4).length,
                                           questionResponses.filter(r => r.answer === 3).length,
                                           questionResponses.filter(r => r.answer === 2).length,
                                           questionResponses.filter(r => r.answer === 1).length
                                         ],
                                         color: '#3B82F6'
                                       }}
                                       title="Rating Distribution"
                                       height={250}
                                     />
                                   </div>
                                   <div className="bg-white rounded-lg p-3 border">
                                     <div className="flex items-center justify-between">
                                       <span className="font-medium">Average Rating:</span>
                                       <span className="text-lg font-bold text-blue-600">
                                         {responseCount > 0 
                                           ? (questionResponses.reduce((sum, r) => sum + (r.answer as number), 0) / responseCount).toFixed(1)
                                           : 'N/A'
                                         }
                                       </span>
                                     </div>
                                   </div>
                                 </div>
                               )}

                               {question.type === 'single_choice' && question.options && (
                                 <div className="space-y-4">
                                   <div className="flex items-center justify-between">
                                     <span className="font-medium">Choice Distribution:</span>
                                     <span className="text-sm text-gray-600">{responseCount} total responses</span>
                                   </div>
                                   <div className="bg-white rounded-lg p-4 border">
                                     <EvaluationPieChart
                                       data={{
                                         labels: question.options,
                                         values: question.options.map(option => 
                                           questionResponses.filter(r => r.answer === option).length
                                         ),
                                         colors: ['#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#F97316', '#84CC16', '#EC4899', '#6366F1', '#3B82F6']
                                       }}
                                       title="Choice Distribution"
                                       height={250}
                                     />
                                   </div>
                                 </div>
                               )}

                               {question.type === 'expression' && (
                                 <div className="space-y-4">
                                   <div className="flex items-center justify-between">
                                     <span className="font-medium">Text Responses:</span>
                                     <span className="text-sm text-gray-600">{responseCount} total responses</span>
                                   </div>
                                   <div className="bg-white rounded-lg p-4 border max-h-64 overflow-y-auto">
                                     {questionResponses.length > 0 ? (
                                       <div className="space-y-3">
                                         {questionResponses.slice(0, 10).map((response, responseIndex) => (
                                           <div key={responseIndex} className="border-b border-gray-100 pb-3 last:border-b-0">
                                             <div className="flex items-start justify-between">
                                               <div className="flex-1">
                                                 <p className="text-sm text-gray-800">{response.answer}</p>
                                                 <p className="text-xs text-gray-500 mt-1">
                                                   by {response.traineeName} • {new Date(response.submittedAt).toLocaleDateString()}
                                                 </p>
                                               </div>
                                             </div>
                                           </div>
                                         ))}
                                         {questionResponses.length > 10 && (
                                           <p className="text-sm text-gray-500 text-center pt-2">
                                             Showing first 10 of {questionResponses.length} responses
                                           </p>
                                         )}
                                       </div>
                                     ) : (
                                       <p className="text-gray-500 text-center">No responses yet</p>
                                     )}
                                   </div>
                                 </div>
                               )}
                             </div>
                           );
                         })}
                       </div>
                     </CardContent>
                   </Card>
                 </div>
               )}

               {/* Real-time Activity Feed */}
              <Card className="card-shadow mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse mr-2"></div>
                    Live Activity Feed
                  </CardTitle>
                  <CardDescription>Real-time updates on evaluation question status changes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {evaluationQuestions
                      .filter(q => q.isPublished)
                      .slice(0, 3)
                      .map((question) => (
                        <div key={question.id} className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-800">
                              Question "{question.question.substring(0, 50)}..." is now live
                            </p>
                            <p className="text-xs text-green-600">
                              Published {new Date(question.updatedAt).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                            Active
                          </Badge>
                        </div>
                      ))}
                    {evaluationQuestions.filter(q => q.isPublished).length === 0 && (
                      <div className="text-center py-4 text-gray-500">
                        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No published questions yet. Publish questions to see them here.</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Questions Table */}
              <Card className="card-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Evaluation Questions</CardTitle>
                      <CardDescription>Manage questions for trainee evaluation and feedback</CardDescription>
                    </div>
                                      <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <div className={`w-3 h-3 rounded-full animate-pulse ${
                        questionsLoading ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <span>{questionsLoading ? 'Syncing...' : 'Live Status'}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {questionsLoading ? "Loading..." : `${evaluationQuestions.length} Questions`}
                    </Badge>
                    <div className="flex items-center space-x-1 text-xs text-gray-500">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>DB Connected</span>
                    </div>
                  </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Question</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {evaluationQuestions.map((question) => (
                          <TableRow key={question.id}>
                            <TableCell className="font-medium max-w-md truncate">
                              {question.question}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {question.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Badge 
                                  variant={question.isPublished ? "default" : "secondary"}
                                  className={question.isPublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                                >
                                  {question.isPublished ? "Published" : "Draft"}
                                </Badge>
                                {question.isPublished && (
                                  <div className="flex items-center space-x-1 text-xs text-green-600">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>Live</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(question.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePreviewQuestion(question)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleEditQuestion(question)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={question.isPublished ? "destructive" : "default"}
                                  onClick={() => handleTogglePublish(question)}
                                  disabled={updateQuestionMutation.isPending}
                                  className={question.isPublished 
                                    ? "bg-red-50 text-red-700 hover:bg-red-100 border-red-200" 
                                    : "bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                                  }
                                >
                                  {updateQuestionMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : question.isPublished ? (
                                    <>
                                      <X className="h-4 w-4 mr-1" />
                                      Unpublish
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Publish
                                    </>
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteQuestion(question.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
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
            </div>
          )}


        </main>
      </div>


      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-r from-green-200 via-green-50 to-white text-gray-700 py-3 px-6 border-t border-gray-200 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <img src="https://cssfarms.ng/wp-content/uploads/2024/12/scrnli_QWDQo0eIg5qH8M.png" alt="CSS FARMS Logo" className="h-4 w-auto" />
            <span className="font-semibold">CSS FARMS Nigeria</span>
            <span>•</span>
            <span>Administrator Dashboard</span>
            <span>•</span>
            <span>Agricultural Training Management System</span>
            </div>
          <div className="flex items-center space-x-4">
            <span>© 2024 CSS FARMS. All rights reserved.</span>
              </div>
          </div>
      </footer>



      {/* Question Creation/Edit Modal */}
      <Dialog open={showQuestionModal} onOpenChange={setShowQuestionModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {editingQuestion ? 'Edit Question' : 'Create New Question'}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseQuestionModal}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {/* Question Text */}
            <div className="space-y-2">
              <Label htmlFor="question">Question Text</Label>
              <Textarea
                id="question"
                placeholder="Enter your question here..."
                value={questionForm.question}
                onChange={(e) => setQuestionForm(prev => ({ ...prev, question: e.target.value }))}
                className="min-h-[100px]"
              />
            </div>

            {/* Question Type */}
            <div className="space-y-2">
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={questionForm.type}
                onValueChange={(value: EvaluationQuestion['type']) => 
                  setQuestionForm(prev => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger id="questionType">
                  <SelectValue placeholder="Select question type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes_no">Yes/No</SelectItem>
                  <SelectItem value="single_choice">Single Choice (Select One)</SelectItem>
                  <SelectItem value="expression">Expression (Text Response)</SelectItem>
                  <SelectItem value="rating">Rating (1-5 Scale)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Options for Single Choice */}
            {questionForm.type === 'single_choice' && (
              <div className="space-y-3">
                <Label>Options</Label>
                {questionForm.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                    />
                    {questionForm.options && questionForm.options.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveOption(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <Card className="p-4 bg-gray-50">
                <div className="space-y-3">
                  <p className="font-medium">{questionForm.question || 'Your question will appear here...'}</p>
                  
                  {questionForm.type === 'yes_no' && (
                    <RadioGroup>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="yes" id="yes" />
                        <Label htmlFor="yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="no" id="no" />
                        <Label htmlFor="no">No</Label>
                      </div>
                    </RadioGroup>
                  )}

                  {questionForm.type === 'single_choice' && questionForm.options && (
                    <RadioGroup>
                      {questionForm.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`option-${index}`} />
                          <Label htmlFor={`option-${index}`}>{option || `Option ${index + 1}`}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {questionForm.type === 'expression' && (
                    <Textarea
                      placeholder="Trainee will type their response here..."
                      disabled
                      className="bg-white"
                    />
                  )}

                  {questionForm.type === 'rating' && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">1</span>
                        <Slider
                          defaultValue={[3]}
                          max={5}
                          min={1}
                          step={1}
                          disabled
                          className="flex-1"
                        />
                        <span className="text-sm text-gray-600">5</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Poor</span>
                        <span>Fair</span>
                        <span>Good</span>
                        <span>Very Good</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Publish Toggle */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="publish"
                checked={questionForm.isPublished}
                onCheckedChange={(checked) => 
                  setQuestionForm(prev => ({ ...prev, isPublished: checked as boolean }))
                }
              />
              <Label htmlFor="publish">Publish immediately</Label>
            </div>
          </div>

          <div className="flex justify-end space-x-2 mt-6">
            <Button variant="secondary" onClick={handleCloseQuestionModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmitQuestion}>
              {editingQuestion ? 'Update Question' : 'Create Question'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Question Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Question Preview</DialogTitle>
          </DialogHeader>

          {previewQuestion && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Question</Label>
                <p className="text-gray-700">{previewQuestion.question}</p>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Type</Label>
                <Badge variant="outline" className="capitalize">
                  {previewQuestion.type.replace('_', ' ')}
                </Badge>
              </div>

              {previewQuestion.options && (
                <div className="space-y-2">
                  <Label className="font-medium">Options</Label>
                  <div className="space-y-1">
                    {previewQuestion.options.map((option, index) => (
                      <div key={index} className="text-sm text-gray-600">
                        {index + 1}. {option}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="font-medium">Status</Label>
                <Badge 
                  variant={previewQuestion.isPublished ? "default" : "secondary"}
                  className={previewQuestion.isPublished ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
                >
                  {previewQuestion.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">Created</Label>
                <p className="text-sm text-gray-600">
                  {new Date(previewQuestion.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-6">
            <Button onClick={() => setShowPreviewModal(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Responses Modal */}
      <Dialog open={showResponsesModal} onOpenChange={setShowResponsesModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              Trainee Evaluation Responses
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowResponsesModal(false)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
            <DialogDescription>
              View all responses from trainees for evaluation questions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {evaluationResponses.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Responses Yet</h3>
                <p className="text-gray-600">
                  No trainees have submitted evaluation responses yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {evaluationResponses.length}
                        </div>
                        <p className="text-sm text-gray-600">Total Responses</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {new Set(evaluationResponses.map(r => r.traineeId)).size}
                        </div>
                        <p className="text-sm text-gray-600">Unique Trainees</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {new Set(evaluationResponses.map(r => r.questionId)).size}
                        </div>
                        <p className="text-sm text-gray-600">Questions Answered</p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {evaluationResponses.length > 0 
                            ? new Date(Math.max(...evaluationResponses.map(r => new Date(r.submittedAt).getTime()))).toLocaleDateString()
                            : 'N/A'
                          }
                        </div>
                        <p className="text-sm text-gray-600">Latest Response</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Responses Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>All Responses</CardTitle>
                    <CardDescription>
                      Detailed view of all trainee evaluation responses
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Trainee</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Question</TableHead>
                            <TableHead>Answer</TableHead>
                            <TableHead>Submitted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {evaluationResponses.map((response) => (
                            <TableRow key={response.id}>
                              <TableCell className="font-medium">
                                {response.traineeName}
                              </TableCell>
                              <TableCell>
                                {response.traineeEmail}
                              </TableCell>
                              <TableCell className="max-w-md truncate">
                                {response.question}
                              </TableCell>
                              <TableCell className="max-w-md">
                                <div className="max-w-xs truncate" title={String(response.answer)}>
                                  {String(response.answer)}
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(response.submittedAt).toLocaleDateString()} {new Date(response.submittedAt).toLocaleTimeString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          <div className="flex justify-end mt-6">
            <Button 
              onClick={() => setShowResponsesModal(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trainee Management Progress Dialogs */}
      {(isRefreshing || synchronizeAllocationsMutation.isPending) && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="text-blue-600" size={20} />
                {isRefreshing ? "Refreshing Data..." : "Synchronizing Allocations..."}
              </DialogTitle>
              <DialogDescription className="text-left">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - refreshProgress / 100)}`}
                          className="text-blue-600 transition-all duration-300 ease-in-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">{Math.round(refreshProgress)}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {isRefreshing ? "Refreshing trainee data..." : "Processing allocations..."}
                    </p>
                    {refreshProgress >= 90 && (
                      <p className="text-xs text-blue-600 mt-2">
                        Finalizing...
                      </p>
                    )}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {/* Export Progress Dialog */}
      {isExporting && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Download className="text-blue-600" size={20} />
                Exporting Trainees...
              </DialogTitle>
              <DialogDescription className="text-left">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - exportProgress / 100)}`}
                          className="text-blue-600 transition-all duration-300 ease-in-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">{Math.round(exportProgress)}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Preparing CSV file with {filteredTrainees.length} trainees...
                    </p>
                    {exportProgress >= 95 && (
                      <p className="text-xs text-blue-600 mt-2">
                        Downloading file...
                      </p>
                    )}
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-red-600" size={20} />
              {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
            </DialogTitle>
            <DialogDescription>
              {isDeleting ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          className="text-gray-200"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="currentColor"
                          strokeWidth="8"
                          fill="none"
                          strokeDasharray={`${2 * Math.PI * 40}`}
                          strokeDashoffset={`${2 * Math.PI * 40 * (1 - deleteProgress / 100)}`}
                          className="text-red-600 transition-all duration-300 ease-in-out"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">{Math.round(deleteProgress)}%</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">
                      Deleting {currentDeleteIndex} of {deleteType === 'single' ? 1 : selectedTrainees.length} trainee(s)...
                    </p>
                  </div>
                </div>
              ) : (
                deleteType === 'single' 
                  ? "Are you sure you want to delete this trainee? This action cannot be undone."
                  : `Are you sure you want to delete ${selectedTrainees.length} selected trainees? This action cannot be undone.`
              )}
            </DialogDescription>
          </DialogHeader>
          {!isDeleting && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Trainee Dialog */}
      {editingTrainee && (
        <EditTraineeDialog 
          trainee={editingTrainee}
          onSave={handleSaveEdit}
          onCancel={() => setEditingTrainee(null)}
          isLoading={updateTraineeMutation.isPending}
        />
      )}

      {/* Resort Action Confirmation Dialog */}
      <Dialog open={showResortConfirmDialog} onOpenChange={setShowResortConfirmDialog}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{resortConfirmTitle}</DialogTitle>
            <DialogDescription>
              {resortConfirmDescription}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResortConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmResortAction}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resort Delete Confirmation/Progress Dialog */}
      <Dialog open={showResortDeleteDialog} onOpenChange={setShowResortDeleteDialog}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="text-red-600" size={20} />
              {isResortDeleting ? 'Deleting...' : 'Confirm Deletion'}
            </DialogTitle>
            <div>
              {isResortDeleting ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200" />
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - resortDeleteProgress / 100)}`} className="text-red-600 transition-all duration-300 ease-in-out" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">{Math.round(resortDeleteProgress)}%</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {`Processing ${resortCurrentDeleteIndex} of ${resortDeleteCount} ${resortDeleteType === 'rooms' ? 'room' : 'tag'}(s)...`}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-red-600 mb-2">Warning: This action cannot be undone.</div>
                  <div>Are you sure you want to delete {resortDeleteType === 'rooms' ? 'these rooms' : 'these tags'}?</div>
                  <div className="text-sm text-gray-500">{resortDeleteCount} {resortDeleteType === 'rooms' ? 'room(s)' : 'tag(s)'} will be permanently removed.</div>
                </div>
              )}
            </div>
          </DialogHeader>
          {!isResortDeleting && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowResortDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => (resortDeleteType === 'rooms' ? performResortRoomsDeletion() : performResortTagsDeletion())}>
                Delete
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Resort Operation Progress Dialogs */}
      {(isResortSynchronizing || isResortManualCleaning) && (
        <Dialog 
          open={true} 
          onOpenChange={(open) => {
            if (!open) {
              setIsResortSynchronizing(false);
              setIsResortManualCleaning(false);
            }
          }}
        >
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="text-blue-600" size={20} />
                {isResortSynchronizing ? 'Synchronizing Allocations...' : 'Manual Cleanup in Progress...'}
              </DialogTitle>
              <div className="text-left">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200" />
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - resortDeleteProgress / 100)}`} className="text-blue-600 transition-all duration-300 ease-in-out" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">{Math.round(resortDeleteProgress)}%</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {isResortSynchronizing ? 'Processing allocations...' : 'Cleaning trainee records...'}
                    </div>
                    {resortDeleteProgress >= 100 && (
                      <div className="mt-4">
                        <Button onClick={() => { setIsResortSynchronizing(false); setIsResortManualCleaning(false); }}>
                          Close
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {/* Resort Import Progress Dialog */}
      {(isResortImportingRooms || isResortImportingTags) && (
        <Dialog open={true} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="text-blue-600" size={20} />
                Importing {resortImportType === 'rooms' ? 'Rooms' : 'Tag Numbers'}...
              </DialogTitle>
              <div className="text-left">
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative w-16 h-16 mx-auto mb-4">
                      <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200" />
                        <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - resortImportProgress / 100)}`} className="text-blue-600 transition-all duration-300 ease-in-out" strokeLinecap="round" />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-semibold text-gray-700">{Math.round(resortImportProgress)}%</span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      {resortImportProgress < 30 ? 'Processing file...' :
                       resortImportProgress < 50 ? 'Validating data...' :
                       resortImportProgress < 70 ? 'Creating records...' :
                       resortImportProgress < 90 ? 'Updating database...' :
                       'Finalizing import...'}
                    </div>
                  </div>
                </div>
              </div>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      )}

      {/* Cleanup Progress Dialog */}
      <Dialog open={showCleanupProgressDialog} onOpenChange={setShowCleanupProgressDialog}>
        <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="text-orange-600" size={20} />
              Cleaning Invalid {cleanupType === 'rooms' ? 'Room' : 'Tag'} Assignments...
            </DialogTitle>
            <div className="text-left">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" className="text-gray-200" />
                      <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="none" strokeDasharray={`${2 * Math.PI * 40}`} strokeDashoffset={`${2 * Math.PI * 40 * (1 - cleanupProgress / 100)}`} className="text-orange-600 transition-all duration-300 ease-in-out" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-sm font-semibold text-gray-700">{Math.round(cleanupProgress)}%</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {cleanupStatus}
                  </div>
                  {cleanupTotal > 0 && (
                    <div className="text-xs text-gray-500">
                      Processing {cleanupCurrentIndex} of {cleanupTotal} trainees...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogHeader>
        </DialogContent>
      </Dialog>


    </div>
  );
}

// Edit Trainee Dialog Component
interface EditTraineeDialogProps {
  trainee: any;
  onSave: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function EditTraineeDialog({ trainee, onSave, onCancel, isLoading }: EditTraineeDialogProps) {
  const [formData, setFormData] = useState({
    firstName: trainee.firstName,
    surname: trainee.surname,
    middleName: trainee.middleName || '',
    email: trainee.email,
    phone: trainee.phone,
    gender: trainee.gender,
    state: trainee.state || '',
    lga: trainee.lga || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Trainee</DialogTitle>
          <DialogDescription>
            Update trainee information for {trainee.firstName} {trainee.surname}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">First Name</label>
              <Input
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium">Surname</label>
              <Input
                value={formData.surname}
                onChange={(e) => setFormData(prev => ({ ...prev, surname: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Middle Name</label>
            <Input
              value={formData.middleName}
              onChange={(e) => setFormData(prev => ({ ...prev, middleName: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Email</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Phone</label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              required
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Gender</label>
            <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as 'male' | 'female' }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <label className="text-sm font-medium">State</label>
            <Input
              value={formData.state}
              onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">LGA</label>
            <Input
              value={formData.lga}
              onChange={(e) => setFormData(prev => ({ ...prev, lga: e.target.value }))}
            />
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}