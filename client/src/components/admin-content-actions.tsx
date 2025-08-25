import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Upload } from "lucide-react";

/**
 * AdminContentActions
 * Simple component shown in Admin Dashboard when the sidebar "Content" item
 * is selected.  Mirrors the Video/File upload cards from ExamApp home page so
 * admins can jump straight to managing those resources.
 */
interface AdminContentActionsProps {
  onNavigate: (view: "actions" | "videos" | "files") => void;
}

export default function AdminContentActions({ onNavigate }: AdminContentActionsProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto py-8">
      {/* Video Upload */}
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white dark:bg-slate-800">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-xl text-slate-900 dark:text-white">Video Upload</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Upload and manage video files with play and delete functionality
          </p>
          <Button
            onClick={() => onNavigate("videos")}
            className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
          >
            Manage Videos
          </Button>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card className="hover:shadow-lg transition-shadow duration-300 border-0 shadow-md bg-white dark:bg-slate-800">
        <CardHeader className="text-center pb-4">
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-teal-600 dark:text-teal-400" />
          </div>
          <CardTitle className="text-xl text-slate-900 dark:text-white">File Upload</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Upload files of different formats and sizes with download options
          </p>
          <Button
            onClick={() => onNavigate("files")}
            className="w-full bg-teal-600 hover:bg-teal-700 dark:bg-teal-600 dark:hover:bg-teal-700"
          >
            Manage Files
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
