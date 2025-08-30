import type { Express, Request } from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "./firebase";
import {
  getDocs,
  query,
  orderBy,
  doc,
  getDoc,
  deleteDoc,
  update,
} from "firebase-admin/firestore";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const UPLOADS_DIR = path.resolve("uploads");
const VIDEOS_DIR = path.join(UPLOADS_DIR, "videos");
const FILES_DIR = path.join(UPLOADS_DIR, "files");

/** Ensure base directories exist */
[UPLOADS_DIR, VIDEOS_DIR, FILES_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Multer storage for videos and generic files
function createDiskStorage(folder: string) {
  return multer.diskStorage({
    destination: (_req: Request, _file: Express.Multer.File, cb) => cb(null, folder),
    filename: (_req: Request, file: Express.Multer.File, cb) => {
      const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  });
}

const videoUpload = multer({ storage: createDiskStorage(VIDEOS_DIR) });
const fileUpload = multer({ storage: createDiskStorage(FILES_DIR) });

export function registerVideoFileRoutes(app: Express) {
  // Test endpoint to verify server is working
  app.get("/api/test", (_req, res) => {
    console.log("🧪 Test endpoint hit");
    res.json({ message: "Server is working", timestamp: new Date().toISOString() });
  });

  // --------------------------------- Videos ---------------------------------
  const videosCol = db.collection("videos");

  app.get("/api/videos", async (_req, res) => {
    try {
      const snapshot = await getDocs(query(videosCol, orderBy("uploadedAt", "desc")));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      res.json(data);
    } catch (err) {
      console.error("Error fetching videos", err);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  app.post("/api/videos/upload", videoUpload.single("video"), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const uploadedFile = req.file as Express.Multer.File;
      const { originalname, filename, mimetype, size, path: filePath } = uploadedFile;
      
      // Extract video duration using ffprobe
      let duration: number | undefined;
      try {
        const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
        duration = Math.round(parseFloat(stdout.trim()));
      } catch (durationError) {
        console.warn("Could not extract video duration:", durationError);
        duration = undefined;
      }
      
      const docRef = await videosCol.add({
        originalName: originalname,
        fileName: filename,
        mimeType: mimetype,
        size,
        path: filePath,
        duration,
        uploadedAt: new Date(),
      });
      res.json({ id: docRef.id });
    } catch (err) {
      console.error("Upload error", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.get("/api/videos/:id/stream", async (req, res) => {
    try {
      const docSnap = await getDoc(doc(videosCol, req.params.id));
      if (!docSnap.exists()) return res.status(404).json({ message: "Video not found" });
      const data = docSnap.data() as any;
      const filePath = data.path;
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing" });
      res.setHeader("Content-Type", data.mimeType || "video/mp4");
      fs.createReadStream(filePath).pipe(res);
    } catch (err) {
      console.error("Stream error", err);
      res.status(500).json({ message: "Stream failed" });
    }
  });

  app.get("/api/videos/:id/download", async (req, res) => {
    try {
      const docSnap = await getDoc(doc(videosCol, req.params.id));
      if (!docSnap.exists()) return res.status(404).json({ message: "Video not found" });
      const data = docSnap.data() as any;
      const filePath = data.path;
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing" });
      res.download(filePath, data.originalName);
    } catch (err) {
      console.error("Download error", err);
      res.status(500).json({ message: "Download failed" });
    }
  });

  app.delete("/api/videos/:id", async (req, res) => {
    try {
      const ref = doc(videosCol, req.params.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return res.status(404).json({ message: "Video not found" });
      const data = snap.data() as any;
      if (fs.existsSync(data.path)) fs.unlinkSync(data.path);
      await deleteDoc(ref);
      res.json({ message: "Video deleted" });
    } catch (err) {
      console.error("Delete error", err);
      res.status(500).json({ message: "Delete failed" });
    }
  });

  // --------------------------------- Files ----------------------------------
  const filesCol = collection(db, "files");

  app.get("/api/files", async (_req, res) => {
    try {
      const snapshot = await getDocs(query(filesCol, orderBy("uploadedAt", "desc")));
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      
      // Temporarily filter out the problematic TXT file until we fix the database
      const validFiles = data.filter(file => {
        if (file.id === "XZPjnza03xCAmbcayrro") {
          console.log(`Temporarily filtering out file with invalid path: ${file.originalName}`);
          return false;
        }
        return true;
      });
      
      res.json(validFiles);
    } catch (err) {
      console.error("Error fetching files", err);
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  app.post("/api/files/upload", fileUpload.single("file"), async (req: Request & { file?: Express.Multer.File }, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const uploadedFile = req.file as Express.Multer.File;
      const { originalname, filename, mimetype, size, path: filePath } = uploadedFile;
      const docRef = await filesCol.add({
        originalName: originalname,
        fileName: filename,
        mimeType: mimetype,
        size,
        path: filePath,
        uploadedAt: new Date(),
      });
      res.json({ id: docRef.id });
    } catch (err) {
      console.error("Upload error", err);
      res.status(500).json({ message: "Upload failed" });
    }
  });

  app.get("/api/files/:id/download", async (req, res) => {
    try {
      const docSnap = await getDoc(doc(filesCol, req.params.id));
      if (!docSnap.exists()) return res.status(404).json({ message: "File not found" });
      const data = docSnap.data() as any;
      const filePath = data.path;
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File missing" });
      res.download(filePath, data.originalName);
    } catch (err) {
      console.error("Download error", err);
      res.status(500).json({ message: "Download failed" });
    }
  });

  app.get("/api/files/:id/view", async (req, res) => {
    try {
      console.log(`📁 File view request: ${req.params.id}`);
      
      const docSnap = await getDoc(doc(filesCol, req.params.id));
      if (!docSnap.exists()) {
        console.error(`❌ File not found: ${req.params.id}`);
        return res.status(404).json({ message: "File not found" });
      }
      
      const data = docSnap.data() as any;
      const filePath = data.path;
      
      if (!fs.existsSync(filePath)) {
        console.error(`❌ File missing from disk: ${filePath}`);
        return res.status(404).json({ message: "File missing from disk" });
      }

      const stats = fs.statSync(filePath);
      console.log(`✅ File found: ${data.originalName} (${stats.size} bytes)`);

      // Set headers for browser viewing
      res.setHeader("Content-Type", data.mimeType || "application/octet-stream");
      res.setHeader("Content-Length", stats.size);
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("Access-Control-Allow-Origin", "*");
      
      // For text files, send content directly
      if (data.mimeType && data.mimeType.startsWith('text/')) {
        const content = fs.readFileSync(filePath, 'utf8');
        console.log(`✅ Text file sent: ${content.length} characters`);
        return res.send(content);
      }

      // For all other files (PDF, images, etc.), stream them
      console.log(`📤 Streaming file to browser...`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      
      stream.on('end', () => {
        console.log(`✅ File stream completed: ${data.originalName}`);
      });
      
    } catch (err) {
      console.error(`❌ File view error:`, err);
      if (!res.headersSent) {
        res.status(500).json({ message: "View failed" });
      }
    }
  });

  app.delete("/api/files/:id", async (req, res) => {
    try {
      const ref = doc(filesCol, req.params.id);
      const snap = await getDoc(ref);
      if (!snap.exists()) return res.status(404).json({ message: "File not found" });
      const data = snap.data() as any;
      if (fs.existsSync(data.path)) fs.unlinkSync(data.path);
      await deleteDoc(ref);
      res.json({ message: "File deleted" });
    } catch (err) {
      console.error("Delete error", err);
      res.status(500).json({ message: "Delete failed" });
    }
  });


}
