import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
  setDoc
} from "firebase/firestore";
import { db } from "./firebase";

// CBT Question Interface
export interface CBTQuestion {
  id: string;
  subject: string;
  topic: string;
  question: string;
  questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
  options: string[];
  correctAnswer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// CBT Exam Interface
export interface CBTExam {
  id: string;
  title: string;
  description?: string;
  duration: number; // in minutes
  totalQuestions: number;
  passingScore: number;
  subjects: string[];
  randomization: boolean;
  showResults: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// CBT Exam Attempt Interface
export interface CBTExamAttempt {
  id: string;
  examId: string;
  traineeId: string;
  traineeName: string;
  traineeEmail: string;
  startTime: Date;
  endTime?: Date;
  timeSpent: number; // in minutes
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  isPassed: boolean;
  answers: Record<string, string>; // questionId -> answer
  status: 'in_progress' | 'completed' | 'abandoned';
  createdAt: Date;
}

// Collections
const CBT_QUESTIONS_COLLECTION = "cbt_questions";
const CBT_EXAMS_COLLECTION = "cbt_exams";
const CBT_EXAM_ATTEMPTS_COLLECTION = "cbt_exam_attempts";

// Question Management
export const createCBTQuestion = async (question: Omit<CBTQuestion, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CBT_QUESTIONS_COLLECTION), {
      ...question,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating CBT question:', error);
    throw error;
  }
};

export const updateCBTQuestion = async (id: string, question: Partial<Omit<CBTQuestion, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, CBT_QUESTIONS_COLLECTION, id);
    await updateDoc(docRef, {
      ...question,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating CBT question:', error);
    throw error;
  }
};

export const deleteCBTQuestion = async (id: string): Promise<void> => {
  try {
    const docRef = doc(db, CBT_QUESTIONS_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting CBT question:', error);
    throw error;
  }
};

export const getCBTQuestions = async (): Promise<CBTQuestion[]> => {
  try {
    const q = query(
      collection(db, CBT_QUESTIONS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as CBTQuestion[];
  } catch (error) {
    console.error('Error fetching CBT questions:', error);
    throw error;
  }
};

export const getActiveCBTQuestions = async (subjects?: string[]): Promise<CBTQuestion[]> => {
  try {
    let q;
    
    if (subjects && subjects.length > 0) {
      try {
        // If subjects are specified, try to filter by them
        q = query(
          collection(db, CBT_QUESTIONS_COLLECTION),
          where('isActive', '==', true),
          where('subject', 'in', subjects),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as CBTQuestion[];
      } catch (filterError) {
        console.warn('Subject filtering failed, fetching all questions and filtering client-side:', filterError);
        // Fallback: get all questions and filter client-side
        try {
          q = query(
            collection(db, CBT_QUESTIONS_COLLECTION),
            where('isActive', '==', true),
            orderBy('createdAt', 'desc')
          );
          const snapshot = await getDocs(q);
          
          const allQuestions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          })) as CBTQuestion[];
          
          // Filter by subjects client-side
          return allQuestions.filter(question => subjects.includes(question.subject));
        } catch (orderByError) {
          console.warn('OrderBy failed, fetching without ordering:', orderByError);
          // Final fallback: get all active questions without ordering
          q = query(
            collection(db, CBT_QUESTIONS_COLLECTION),
            where('isActive', '==', true)
          );
          const snapshot = await getDocs(q);
          
          const allQuestions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date()
          })) as CBTQuestion[];
          
          // Filter by subjects and sort client-side
          const filteredQuestions = allQuestions.filter(question => subjects.includes(question.subject));
          filteredQuestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return filteredQuestions;
        }
      }
    } else {
      // Get all active questions
      try {
        q = query(
          collection(db, CBT_QUESTIONS_COLLECTION),
          where('isActive', '==', true),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as CBTQuestion[];
      } catch (orderByError) {
        console.warn('OrderBy failed, fetching without ordering:', orderByError);
        // Fallback: get all active questions without ordering
        q = query(
          collection(db, CBT_QUESTIONS_COLLECTION),
          where('isActive', '==', true)
        );
        const snapshot = await getDocs(q);
        
        const allQuestions = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date()
        })) as CBTQuestion[];
        
        // Sort client-side
        allQuestions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        return allQuestions;
      }
    }
  } catch (error) {
    console.error('Error fetching active CBT questions:', error);
    throw error;
  }
};

// Exam Management
export const createCBTExam = async (exam: Omit<CBTExam, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CBT_EXAMS_COLLECTION), {
      ...exam,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating CBT exam:', error);
    throw error;
  }
};

export const updateCBTExam = async (id: string, exam: Partial<Omit<CBTExam, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, CBT_EXAMS_COLLECTION, id);
    await updateDoc(docRef, {
      ...exam,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating CBT exam:', error);
    throw error;
  }
};

export const getCBTExams = async (): Promise<CBTExam[]> => {
  try {
    const q = query(
      collection(db, CBT_EXAMS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate() || new Date(),
      updatedAt: doc.data().updatedAt?.toDate() || new Date()
    })) as CBTExam[];
  } catch (error) {
    console.error('Error fetching CBT exams:', error);
    throw error;
  }
};

export const getActiveCBTExam = async (): Promise<CBTExam | null> => {
  try {
    // First try with the composite index query
    try {
      const q = query(
        collection(db, CBT_EXAMS_COLLECTION),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      } as CBTExam;
    } catch (indexError) {
      console.warn('Composite index not available, falling back to client-side sorting:', indexError);
      
      // Fallback: get all active exams and sort client-side
      const q = query(
        collection(db, CBT_EXAMS_COLLECTION),
        where('isActive', '==', true)
      );
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      // Sort by createdAt in descending order client-side
      const exams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as CBTExam[];
      
      // Sort by createdAt descending and return the first one
      exams.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return exams[0];
    }
  } catch (error) {
    console.error('Error fetching active CBT exam:', error);
    throw error;
  }
};

// Check if trainee has already taken the exam
export const hasTraineeTakenExam = async (traineeId: string, examId: string): Promise<boolean> => {
  try {
    const q = query(
      collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
      where('traineeId', '==', traineeId),
      where('examId', '==', examId),
      where('status', 'in', ['completed', 'abandoned'])
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (error) {
    console.warn('Primary attempt check failed; falling back to client-side filtering:', error);
    // Fallback 1: Fetch by traineeId only and filter client-side
    try {
      const qTrainee = query(
        collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
        where('traineeId', '==', traineeId)
      );
      const traineeSnap = await getDocs(qTrainee);
      const has = traineeSnap.docs.some(d => {
        const data = d.data() as any;
        return data.examId === examId && ['completed', 'abandoned'].includes(data.status);
      });
      return has;
    } catch (e1) {
      console.warn('Fallback by traineeId failed; trying examId only:', e1);
      // Fallback 2: Fetch by examId only and filter client-side
      try {
        const qExam = query(
          collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
          where('examId', '==', examId)
        );
        const examSnap = await getDocs(qExam);
        const has = examSnap.docs.some(d => {
          const data = d.data() as any;
          return data.traineeId === traineeId && ['completed', 'abandoned'].includes(data.status);
        });
        return has;
      } catch (e2) {
        console.warn('Fallback by examId failed; fetching all attempts and filtering:', e2);
        // Final fallback: fetch all attempts and filter client-side
        const allSnap = await getDocs(collection(db, CBT_EXAM_ATTEMPTS_COLLECTION));
        const has = allSnap.docs.some(d => {
          const data = d.data() as any;
          return data.traineeId === traineeId && data.examId === examId && ['completed', 'abandoned'].includes(data.status);
        });
        return has;
      }
    }
  }
};

// Get trainee's previous attempt for an exam
export const getTraineeExamAttempt = async (traineeId: string, examId: string): Promise<CBTExamAttempt | null> => {
  try {
    const q = query(
      collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
      where('traineeId', '==', traineeId),
      where('examId', '==', examId),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || undefined,
      createdAt: doc.data().createdAt?.toDate() || new Date()
    } as CBTExamAttempt;
  } catch (error) {
    console.warn('Primary trainee attempt fetch failed; falling back to client-side filtering:', error);
    // Fallback: fetch attempts for trainee and filter by examId, then sort by createdAt desc
    try {
      const qTrainee = query(
        collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
        where('traineeId', '==', traineeId)
      );
      const snap = await getDocs(qTrainee);
      const attempts = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const filtered = attempts
        .filter(a => a.examId === examId)
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || 0));
      if (!filtered.length) return null;
      const a = filtered[0];
      return {
        id: a.id,
        ...a,
        startTime: a.startTime?.toDate?.() || new Date(a.startTime) || new Date(),
        endTime: a.endTime?.toDate?.() || (a.endTime ? new Date(a.endTime) : undefined),
        createdAt: a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date()
      } as CBTExamAttempt;
    } catch (e1) {
      console.warn('Fallback by traineeId failed; trying all attempts:', e1);
      const allSnap = await getDocs(collection(db, CBT_EXAM_ATTEMPTS_COLLECTION));
      const attempts = allSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
      const filtered = attempts
        .filter(a => a.traineeId === traineeId && a.examId === examId)
        .sort((a, b) => (b.createdAt?.toDate?.()?.getTime?.() || 0) - (a.createdAt?.toDate?.()?.getTime?.() || 0));
      if (!filtered.length) return null;
      const a = filtered[0];
      return {
        id: a.id,
        ...a,
        startTime: a.startTime?.toDate?.() || new Date(a.startTime) || new Date(),
        endTime: a.endTime?.toDate?.() || (a.endTime ? new Date(a.endTime) : undefined),
        createdAt: a.createdAt?.toDate?.() || new Date(a.createdAt) || new Date()
      } as CBTExamAttempt;
    }
  }
};

// Exam Attempt Management
export const createCBTExamAttempt = async (attempt: Omit<CBTExamAttempt, 'id' | 'createdAt'>): Promise<string> => {
  try {
    const docRef = await addDoc(collection(db, CBT_EXAM_ATTEMPTS_COLLECTION), {
      ...attempt,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating CBT exam attempt:', error);
    throw error;
  }
};

export const updateCBTExamAttempt = async (id: string, attempt: Partial<Omit<CBTExamAttempt, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const docRef = doc(db, CBT_EXAM_ATTEMPTS_COLLECTION, id);
    await updateDoc(docRef, attempt);
  } catch (error) {
    console.error('Error updating CBT exam attempt:', error);
    throw error;
  }
};

export const getCBTExamAttempts = async (traineeId?: string): Promise<CBTExamAttempt[]> => {
  try {
    let q;
    if (traineeId) {
      q = query(
        collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
        where('traineeId', '==', traineeId),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startTime: doc.data().startTime?.toDate() || new Date(),
      endTime: doc.data().endTime?.toDate() || undefined,
      createdAt: doc.data().createdAt?.toDate() || new Date()
    })) as CBTExamAttempt[];
  } catch (error) {
    console.warn('Primary attempts fetch failed; falling back without orderBy or client-side sort:', error);
    // Fallback: fetch basic set and sort client-side
    try {
      let q;
      if (traineeId) {
        q = query(
          collection(db, CBT_EXAM_ATTEMPTS_COLLECTION),
          where('traineeId', '==', traineeId)
        );
      } else {
        q = query(collection(db, CBT_EXAM_ATTEMPTS_COLLECTION));
      }
      const snapshot = await getDocs(q);
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        startTime: doc.data().startTime?.toDate() || new Date(),
        endTime: doc.data().endTime?.toDate() || undefined,
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as CBTExamAttempt[];
      return list.sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0));
    } catch (e1) {
      console.warn('Fallback attempts fetch failed; returning empty list:', e1);
      return [];
    }
  }
};

export const getCBTExamAttempt = async (id: string): Promise<CBTExamAttempt | null> => {
  try {
    const docRef = doc(db, CBT_EXAM_ATTEMPTS_COLLECTION, id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) return null;
    
    return {
      id: docSnap.id,
      ...docSnap.data(),
      startTime: docSnap.data().startTime?.toDate() || new Date(),
      endTime: docSnap.data().endTime?.toDate() || undefined,
      createdAt: docSnap.data().createdAt?.toDate() || new Date()
    } as CBTExamAttempt;
  } catch (error) {
    console.error('Error fetching CBT exam attempt:', error);
    throw error;
  }
};

// Utility Functions
export const calculateExamScore = (answers: Record<string, string>, questions: CBTQuestion[]): {
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  totalQuestions: number;
  questionResults: Array<{
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    questionType: string;
  }>;
} => {
  let correctAnswers = 0;
  let wrongAnswers = 0;
  let unanswered = 0;
  const questionResults: Array<{
    questionId: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    questionType: string;
  }> = [];
  
  questions.forEach(question => {
    const userAnswer = answers[question.id] || '';
    const trimmedUserAnswer = userAnswer.trim();
    const trimmedCorrectAnswer = question.correctAnswer.trim();
    
    let isCorrect = false;
    
    if (!trimmedUserAnswer) {
      unanswered++;
    } else {
      // Handle different question types
      switch (question.questionType) {
        case 'multiple_choice':
        case 'true_false':
          isCorrect = trimmedUserAnswer.toLowerCase() === trimmedCorrectAnswer.toLowerCase();
          break;
        case 'fill_blank':
          // For fill in the blank, allow multiple correct answers separated by commas
          const correctAnswerOptions = trimmedCorrectAnswer.toLowerCase().split(',').map(a => a.trim());
          isCorrect = correctAnswerOptions.includes(trimmedUserAnswer.toLowerCase());
          break;
        default:
          isCorrect = trimmedUserAnswer.toLowerCase() === trimmedCorrectAnswer.toLowerCase();
      }
      
      if (isCorrect) {
        correctAnswers++;
      } else {
        wrongAnswers++;
      }
    }
    
    questionResults.push({
      questionId: question.id,
      question: question.question,
      userAnswer: trimmedUserAnswer || 'Not answered',
      correctAnswer: trimmedCorrectAnswer,
      isCorrect,
      questionType: question.questionType
    });
  });
  
  const totalQuestions = questions.length;
  const score = Math.round((correctAnswers / totalQuestions) * 100);
  
  return {
    score,
    correctAnswers,
    wrongAnswers,
    unanswered,
    totalQuestions,
    questionResults
  };
};

export const getRandomQuestions = (questions: CBTQuestion[], count: number): CBTQuestion[] => {
  const shuffled = [...questions].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};
