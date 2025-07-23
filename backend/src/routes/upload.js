// Complete minimal upload route - works with your existing database setup
// Only uses Neon database + Vercel, no external services
// File: routes/upload.js

const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");
const { query } = require("../db"); // Your existing database connection
const authenticateToken = require("../middleware/auth");

const router = express.Router();

// Configure multer for memory storage (required for serverless)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max (reasonable for database storage)
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"), false);
    }
  },
});

router.post(
  "/expense-photo",
  authenticateToken,
  upload.single("photo"),
  async (req, res) => {
    try {
      console.log("Photo upload request received");

      if (!req.file) {
        console.log("No file uploaded");
        return res.status(400).json({ message: "No file uploaded" });
      }

      console.log(
        "File received:",
        req.file.originalname,
        req.file.size,
        "bytes"
      );

      const userId = req.user.id;
      const imageId = uuidv4();
      const filename = `${imageId}_${userId}.jpeg`;

      // Process image with Sharp (optimize for database storage)
      let processedImageBuffer;
      try {
        processedImageBuffer = await sharp(req.file.buffer)
          .resize(600, 400, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({
            quality: 75, // Good balance of quality and size
            mozjpeg: true,
          })
          .toBuffer();

        console.log(
          "Image processed with Sharp, final size:",
          processedImageBuffer.length,
          "bytes"
        );
      } catch (sharpError) {
        console.error("Sharp image processing error:", sharpError);
        return res.status(500).json({ message: "Failed to process image." });
      }

      // Convert to base64 for database storage
      const base64Image = processedImageBuffer.toString("base64");
      const dataUrl = `data:image/jpeg;base64,${base64Image}`;

      // Store in database using your existing query function
      try {
        const insertQuery = `
          INSERT INTO expense_images (id, user_id, filename, image_data, content_type, file_size, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING id, filename, created_at
        `;

        const result = await query(insertQuery, [
          imageId,
          userId,
          filename,
          base64Image,
          "image/jpeg",
          processedImageBuffer.length,
        ]);

        console.log("Image stored in database with ID:", imageId);

        // Return data URL for immediate use in frontend
        res.json({
          message: "Photo uploaded successfully",
          id: imageId,
          filename,
          url: dataUrl, // This can be used immediately in <img> tags
          size: processedImageBuffer.length,
        });
      } catch (dbError) {
        console.error("Database storage error:", dbError);

        // Handle the case where the table doesn't exist yet
        if (
          dbError.message &&
          dbError.message.includes('relation "expense_images" does not exist')
        ) {
          return res.status(500).json({
            message:
              "Database table not found. Please run the database schema setup first.",
            error: "expense_images table does not exist",
          });
        }

        return res.status(500).json({
          message: "Failed to store image in database",
          error:
            process.env.NODE_ENV === "development"
              ? dbError.message
              : undefined,
        });
      }
    } catch (error) {
      console.error("Upload error:", error);

      if (error.message === "Only image files are allowed") {
        return res.status(400).json({ message: error.message });
      }
      if (error.code === "LIMIT_FILE_SIZE") {
        return res
          .status(413)
          .json({ message: "File size too large. Max 2MB allowed." });
      }

      res.status(500).json({
        message: "Failed to upload photo",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }
);

// Route to retrieve images by ID (serves actual image data)
router.get("/image/:imageId", authenticateToken, async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    // Get image from database with basic permission check
    const selectQuery = `
      SELECT image_data, content_type, filename, file_size
      FROM expense_images 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await query(selectQuery, [imageId, userId]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Image not found or access denied" });
    }

    const imageData = result.rows[0];
    const imageBuffer = Buffer.from(imageData.image_data, "base64");

    // Set appropriate headers for image serving
    res.set({
      "Content-Type": imageData.content_type,
      "Content-Length": imageBuffer.length,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year
      "X-Filename": imageData.filename,
    });

    res.send(imageBuffer);
  } catch (error) {
    console.error("Image retrieval error:", error);
    res.status(500).json({
      message: "Failed to retrieve image",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Route to get image as data URL (useful for frontend)
router.get("/image/:imageId/dataurl", authenticateToken, async (req, res) => {
  try {
    const { imageId } = req.params;
    const userId = req.user.id;

    const selectQuery = `
      SELECT image_data, content_type
      FROM expense_images 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await query(selectQuery, [imageId, userId]);

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Image not found or access denied" });
    }

    const imageData = result.rows[0];
    const dataUrl = `data:${imageData.content_type};base64,${imageData.image_data}`;

    res.json({
      id: imageId,
      dataUrl: dataUrl,
    });
  } catch (error) {
    console.error("Image data URL retrieval error:", error);
    res.status(500).json({
      message: "Failed to retrieve image data URL",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

module.exports = router;
