import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PlusCircle, BarChart3, FileText, type LucideIcon } from "lucide-react";

interface AdminExamActionsProps {
  onNavigate: (view: "actions" | "setup" | "results" | "records") => void;
}

/**
 * AdminExamActions
 * Mirrors key ExamApp home buttons for exam creation and analytics so an admin
 * can quickly access them from the dashboard.
 */
export default function AdminExamActions({ onNavigate }: AdminExamActionsProps) {
  // Define card metadata with a strict literal type so TypeScript preserves the exact string literal for `view`.
  interface ExamCardMeta {
    icon: LucideIcon;
    title: string;
    description: string;
    button: string;
    view: "setup" | "results" | "records";
    color: string;
  }

  const cards: ExamCardMeta[] = [
    {
      icon: PlusCircle,
      title: "Setup Test/Exam",
      description: "Create new exams with multiple question types, set duration, and configure exam settings",
      button: "Create Exam",
      view: "setup",
      color: "blue",
    },
    {
      icon: BarChart3,
      title: "View Results",
      description: "View exam results, export data as CSV/PDF, and analyze performance",
      button: "View Results",
      view: "results",
      color: "purple",
    },
    {
      icon: FileText,
      title: "Exam Records",
      description: "View all past exam records and details for future reference",
      button: "View Records",
      view: "records",
      color: "orange",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto py-8">
      {cards.map(({ icon: Icon, title, description, button, view, color }) => (
        <Card key={title} className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white dark:bg-slate-800">
          <CardHeader className="text-center pb-4">
            <div
              className={`w-16 h-16 bg-${color}-100 dark:bg-${color}-900 rounded-full flex items-center justify-center mx-auto mb-4`}
            >
              <Icon className={`w-8 h-8 text-${color}-600 dark:text-${color}-400`} />
            </div>
            <CardTitle className="text-xl text-slate-900 dark:text-white">{title}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-slate-600 dark:text-slate-300 mb-6">{description}</p>
            <Button
              onClick={() => onNavigate(view)}
              className={`w-full bg-${color}-600 hover:bg-${color}-700 dark:bg-${color}-600 dark:hover:bg-${color}-700`}
            >
              {button}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
