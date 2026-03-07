import express from "express";
import { getCodingQuestion } from "../services/questionService.js";

const router = express.Router();

// GET /api/v1/question?difficulty=easy&topic=arrays
router.get("/", async (req, res) => {
  try {
    const difficulty = req.query.difficulty || "easy";
    const topic = req.query.topic || "general";
    const question = await getCodingQuestion({ difficulty, topic });
    res.json(question);
  } catch (err) {
    console.error("/question error", err);
    res.status(500).json({ error: "Failed to generate question" });
  }
});

export default router;
