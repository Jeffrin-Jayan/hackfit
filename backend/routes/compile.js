import express from "express";
import { compileCode } from "../services/compilerService.js";

const router = express.Router();

// POST /api/v1/compile
router.post("/", async (req, res) => {
  const { language, source_code } = req.body;
  if (!language || !source_code) {
    return res.status(400).json({ error: "language and source_code are required" });
  }

  try {
    const result = await compileCode(language, source_code);
    res.json(result);
  } catch (err) {
    console.error("/compile error", err);
    res.status(500).json({ error: "Compilation failed", details: err.message });
  }
});

export default router;
