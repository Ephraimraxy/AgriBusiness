export interface EvaluationResponse {
  id: string;
  timestamp: Date;
  courseTitle: string;
  date: string;
  resourcePerson: string;
  responses: Record<string, any>;
}

export interface EvaluationState {
  isPublished: boolean;
  questions: EvaluationQuestion[];
  responses: EvaluationResponse[];
}

export interface EvaluationQuestion {
  id: string;
  type: 'text' | 'radio' | 'textarea' | 'rating' | 'select';
  question: string;
  options?: string[];
  required: boolean;
  order: number;
}

class EvaluationService {
  private static instance: EvaluationService;
  private state: EvaluationState = {
    isPublished: false,
    questions: [],
    responses: []
  };

  private constructor() {
    // Load state from localStorage
    const savedState = localStorage.getItem('evaluationState');
    if (savedState) {
      this.state = JSON.parse(savedState);
    }
  }

  static getInstance(): EvaluationService {
    if (!EvaluationService.instance) {
      EvaluationService.instance = new EvaluationService();
    }
    return EvaluationService.instance;
  }

  // Save state to localStorage
  private saveState() {
    localStorage.setItem('evaluationState', JSON.stringify(this.state));
  }

  // Get current state
  getState(): EvaluationState {
    return { ...this.state };
  }

  // Update questions
  updateQuestions(questions: EvaluationQuestion[]) {
    this.state.questions = questions;
    this.saveState();
  }

  // Publish evaluation
  publishEvaluation() {
    this.state.isPublished = true;
    this.saveState();
  }

  // Close evaluation
  closeEvaluation() {
    this.state.isPublished = false;
    this.saveState();
  }

  // Check if evaluation is published
  isPublished(): boolean {
    return this.state.isPublished;
  }

  // Get published questions
  getPublishedQuestions(): EvaluationQuestion[] {
    return this.state.isPublished ? this.state.questions : [];
  }

  // Submit evaluation response
  submitResponse(response: Omit<EvaluationResponse, 'id' | 'timestamp'>) {
    const newResponse: EvaluationResponse = {
      ...response,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    this.state.responses.push(newResponse);
    this.saveState();
  }

  // Get all responses
  getResponses(): EvaluationResponse[] {
    return [...this.state.responses];
  }

  // Get response statistics
  getResponseStats() {
    const responses = this.state.responses;
    const totalResponses = responses.length;
    
    if (totalResponses === 0) {
      return {
        totalResponses: 0,
        averageRating: 0,
        courseStats: {},
        resourcePersonStats: {}
      };
    }

    // Calculate average rating (assuming rating questions have numeric values)
    const ratingResponses = responses.flatMap(r => 
      Object.entries(r.responses)
        .filter(([_, value]) => typeof value === 'string' && ['Below Average', 'Average', 'Good', 'Excellent'].includes(value))
        .map(([_, value]) => {
          const ratingMap = { 'Below Average': 1, 'Average': 2, 'Good': 3, 'Excellent': 4 };
          return ratingMap[value as keyof typeof ratingMap] || 0;
        })
    );
    
    const averageRating = ratingResponses.length > 0 
      ? ratingResponses.reduce((sum, rating) => sum + rating, 0) / ratingResponses.length 
      : 0;

    // Course statistics
    const courseStats = responses.reduce((acc, response) => {
      const course = response.courseTitle;
      acc[course] = (acc[course] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Resource person statistics
    const resourcePersonStats = responses.reduce((acc, response) => {
      const person = response.resourcePerson;
      acc[person] = (acc[person] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalResponses,
      averageRating: Math.round(averageRating * 10) / 10,
      courseStats,
      resourcePersonStats
    };
  }
}

export default EvaluationService; 