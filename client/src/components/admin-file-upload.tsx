import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Upload, Download, Eye, Trash2, ArrowLeft, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import InlineDocumentViewer from "./inline-document-viewer";

interface UploadedFile {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

interface AdminFileUploadProps {
  onBack?: () => void;
  embedded?: boolean;
}

export default function AdminFileUpload({ onBack, embedded = true }: AdminFileUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: files = [], isLoading } = useQuery<UploadedFile[]>({
    queryKey: ["/api/files"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (list: FileList) => {
      const results = [] as any[];
      for (let i = 0; i < list.length; i++) {
        const fd = new FormData();
        fd.append("file", list[i]);
        const res = await fetch("/api/files/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to upload ${list[i].name}`);
        }
        results.push(await res.json());
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({ 
        title: "Files uploaded successfully", 
        description: "Your files have been uploaded and are now available for trainees."
      });
      setSelectedFiles(null);
      const input = document.getElementById("file-upload") as HTMLInputElement | null;
      if (input) input.value = "";
    },
    onError: (e: any) => {
      toast({ 
        title: "Upload failed", 
        description: e.message || "Could not upload files. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/files/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete file");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({ title: "File deleted successfully", description: "The file has been removed from the system." });
    },
    onError: (error: any) => {
      toast({ 
        title: "Delete failed", 
        description: error.message || "Could not delete the file. Please try again.",
        variant: "destructive" 
      });
    },
  });

  const handleDownload = (file: UploadedFile) => {
    window.open(`/api/files/${file.id}/download`, "_blank");
  };

  const handleView = (file: UploadedFile) => {
    setSelectedFile(file);
    setIsViewerOpen(true);
  };

  const formatDate = (d: Date) => new Date(d).toLocaleString();

  return (
    <div className={embedded ? "p-6" : "min-h-screen bg-slate-50 p-6"}>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          {onBack && (
            <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
          )}
          <h2 className="text-2xl font-bold">File Upload</h2>
        </div>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Upload Files</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input id="file-upload" type="file" multiple onChange={e => setSelectedFiles(e.target.files)} />
              {selectedFiles && selectedFiles.length > 0 && (
                <div className="text-sm text-gray-600">Selected {selectedFiles.length} file(s)</div>
              )}
              <Button onClick={() => uploadMutation.mutate(selectedFiles!)} disabled={!selectedFiles || uploading} className="w-full sm:w-auto">
                {uploading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        {!isViewerOpen && (
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files ({files.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center">Loading...</div>
              ) : files.length === 0 ? (
                <div className="py-8 text-center text-gray-500">No files uploaded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Uploaded</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {files.map(f => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.originalName}</TableCell>
                          <TableCell>{formatBytes(f.size)}</TableCell>
                          <TableCell>{f.mimeType}</TableCell>
                          <TableCell>{formatDate(f.uploadedAt)}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => handleView(f)}>
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => handleDownload(f)}>
                                <Download className="w-4 h-4 mr-1" />
                                Download
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Delete
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete File</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete "{f.originalName}"? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteMutation.mutate(f.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Document Viewer Section */}
      {selectedFile && isViewerOpen && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Viewing: {selectedFile.originalName}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsViewerOpen(false);
                  setSelectedFile(null);
                }}
              >
                Close Viewer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="min-h-[600px]">
              <InlineDocumentViewer
                file={selectedFile}
                onClose={() => {
                  setIsViewerOpen(false);
                  setSelectedFile(null);
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
