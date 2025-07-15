const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");
const { v4: uuidv4 } = require("uuid");
const authenticateToken = require("../middleware/auth");
const router = express.Router();

const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

// Use environment variable or fallback to localhost backend URL
const backendUrl = process.env.VITE_BACKEND_URL || "http://localhost:5000";

router.post(
  "/expense-photo",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const userId = req.user.id;
      // Always save as JPEG to ensure consistent format and extension
      const filename = `${uuidv4()}_${userId}.jpeg`;
      const filepath = path.join(uploadsDir, filename);

      try {
        await sharp(req.file.buffer)
          .resize(800, 600, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 80,
            mozjpeg: true,
          })
          .toFile(filepath);
      } catch (sharpError) {
        console.error("Sharp image processing error:", sharpError);
        return res.status(500).json({ message: "Failed to process image." });
      }

      // Return full URL including backend origin
      // Ensure no double slashes by removing trailing slash from backendUrl if present
      const cleanBackendUrl = backendUrl.endsWith("/")
        ? backendUrl.slice(0, -1)
        : backendUrl;
      const fileUrl = `${cleanBackendUrl}/uploads/${filename}`;
      res.json({
        message: "Photo uploaded successfully",
        filename,
        url: fileUrl,
      });
    } catch (error) {
      console.error("Upload error:", error);
      if (error.message === "Only image files are allowed") {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ message: "File size too large. Max 5MB." });
      }
      res.status(500).json({ message: "Failed to upload photo" });
    }
  }
);

module.exports = router;
