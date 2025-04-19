import { Timestamp } from "bson";

const mongoose = require("mongoose");

const QuestionSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true },
    question: { type: String, required: true },
  },
  { timestamps: true }
);

const Question = mongoose.model("Question", QuestionSchema);

module.exports = Question;
