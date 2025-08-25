import { Button } from "@exam/components/ui/button";

interface QuestionNavigatorProps {
  totalQuestions: number;
  currentQuestion: number;
  answeredQuestions: Set<number>;
  markedQuestions: Set<number>;
  onNavigate: (questionIndex: number) => void;
}

export default function QuestionNavigator({
  totalQuestions,
  currentQuestion,
  answeredQuestions,
  markedQuestions,
  onNavigate,
}: QuestionNavigatorProps) {
  const getQuestionStatus = (index: number) => {
    if (answeredQuestions.has(index)) return "answered";
    if (markedQuestions.has(index)) return "marked";
    return "unanswered";
  };

  const getButtonClass = (index: number) => {
    const status = getQuestionStatus(index);
    const isCurrent = index === currentQuestion;
    
    let baseClass = "w-10 h-10 text-sm font-medium rounded-lg transition-colors ";
    
    if (isCurrent) {
      baseClass += "ring-2 ring-blue-500 ";
    }
    
    switch (status) {
      case "answered":
        return baseClass + "bg-green-500 text-white hover:bg-green-600";
      case "marked":
        return baseClass + "bg-yellow-500 text-white hover:bg-yellow-600";
      default:
        return baseClass + "bg-slate-200 text-slate-700 hover:bg-slate-300";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="px-6 py-4 border-b border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900">Question Navigator</h3>
      </div>
      <div className="p-6">
        <div className="grid grid-cols-10 gap-2 mb-4">
          {Array.from({ length: totalQuestions }, (_, index) => (
            <Button
              key={index}
              variant="ghost"
              className={getButtonClass(index)}
              onClick={() => onNavigate(index)}
            >
              {index + 1}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
            <span className="text-slate-600">Answered</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded mr-2"></div>
            <span className="text-slate-600">Marked for Review</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-slate-200 rounded mr-2"></div>
            <span className="text-slate-600">Not Answered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
