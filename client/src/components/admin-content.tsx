import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Content, Sponsor } from "@shared/schema";

import { useContent } from "@/hooks/useContent";
import { createDocument, updateDocument } from "@/lib/firebaseService";
import { storage as fbStorage } from "@/lib/firebase";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "firebase/storage";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Upload, Trash2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AdminContent() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: content } = useContent();
  // Mock sponsors data (since we don't have backend)
  const sponsors: Sponsor[] = [
    {
      id: '1',
      name: 'CSS FARMS Nigeria',
      description: 'Agricultural Training Program',
      isActive: true,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "video" as "video" | "quiz" | "assignment",
    contentUrl: "",
    sponsorId: "",
  });

  const createContentMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        description: form.description,
        type: form.type,
        contentUrl: form.contentUrl || undefined,
        sponsorId: form.sponsorId || undefined,
      } as Partial<Content>;
      await createDocument('content', { ...payload, createdAt: new Date(), isActive: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["content"] });
      toast({ title: "Content Added", description: "New content has been added." });
      setShowDialog(false);
      setForm({ title: "", description: "", type: "video", contentUrl: "", sponsorId: "" });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message ?? "Failed to add content", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createContentMutation.mutate();
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileRef = storageRef(fbStorage, `content/${Date.now()}_${file.name}`);
    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      "state_changed",
      undefined,
      (error) => {
        console.error(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        const fileType = file.type.startsWith("video") ? "video" : "file";
        await createDocument('content', {
          title: file.name,
          type: fileType,
          contentUrl: downloadURL,
          contentData: { size: file.size },
          createdAt: new Date(),
          isActive: true
        });
        queryClient.invalidateQueries({ queryKey: ["content"] });
      }
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Content Management</h2>
          <p className="text-gray-600">Upload lecture materials & training videos</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white">
              <Plus className="mr-2 h-4 w-4" /> Add Content
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg animate-in zoom-in-95 fade-in-50">
            <DialogHeader>
              <DialogTitle>Add New Content</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <Select
                  value={form.type}
                  onValueChange={(val) => setForm({ ...form, type: val as any })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="quiz">Quiz</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Content URL</label>
                <Input
                  value={form.contentUrl}
                  onChange={(e) => setForm({ ...form, contentUrl: e.target.value })}
                  placeholder="https://..."
                  required={form.type === "video"}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Sponsor (optional)</label>
                <Select
                  value={form.sponsorId}
                  onValueChange={(val) => setForm({ ...form, sponsorId: val })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select sponsor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sponsors?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={createContentMutation.isPending}>
                {createContentMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="card-shadow overflow-hidden">
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="text-lg font-semibold text-gray-800">All Content</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>View</TableHead>
                  <TableHead>Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {content?.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell>{c.type}</TableCell>
                    <TableCell>{new Date(c.createdAt!).toLocaleDateString()}</TableCell>
                    <TableCell>{c.contentData?.size ? `${(c.contentData.size/ (1024*1024)).toFixed(2)} MB` : "-"}</TableCell>
                    <TableCell>
                      {c.contentUrl && (
                        <a href={c.contentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center"><Eye className="h-4 w-4 mr-1"/>View</a>) }
                    </TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={async()=>{
                        await updateDocument('content', c.id, { isActive: false });
                        queryClient.invalidateQueries({ queryKey: ["content"] });
                      }}>
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {content && content.length === 0 && (
              <div className="text-center py-8 text-gray-600">No content yet.</div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload button */}
      <div className="mt-4 flex justify-end">
        <Button variant="outline" onClick={handleUploadClick}>
          <Upload className="h-4 w-4 mr-2" /> Upload File
        </Button>
        <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} />
      </div>
    </div>
  );
}
