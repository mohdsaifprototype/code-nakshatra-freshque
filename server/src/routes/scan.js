import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { extractItemsFromReceipt } from "../services/ocrService.js";

export const scanRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

scanRouter.post("/receipt", upload.single("image"), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "image is required" });
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(req.file.mimetype)) {
      return res.status(415).json({ error: "Unsupported image type" });
    }
    
    console.log("[ocr] Starting scan for:", req.file.originalname);
    const items = await extractItemsFromReceipt({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });
    console.log("[ocr] Successfully found items:", items.length);
    
    res.json({ items });
  } catch (e) {
    console.error("[ocr] Error during scan:", e);
    next(e);
  }
});
