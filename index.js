/* =======================================================
   VIDYAKUNJ – ATTENDANCE + SMS BACKEND
   FINAL STABLE VERSION (SCHOOL SUMMARY FIXED)
   ======================================================= */

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

/* ================= APP SETUP ================= */
const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors({
  origin: "https://vidyakunj-frontend.onrender.com",
  methods: ["GET", "POST"],
}));

app.use(bodyParser.json());

/* ================= MONGO CONNECT ================= */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ================= SCHEMAS ================= */
const Student = mongoose.model("students", new mongoose.Schema({
  std: String,
  div: String,
  name: String,
  roll: Number,
  mobile: String,
}));

const Attendance = mongoose.model("attendance", new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  std: String,
  div: String,
  roll: Number,
  date: Date,
  present: Boolean,
  late: Boolean,
}));

/* ================= BASIC ================= */
app.get("/", (req, res) => {
  res.send("Vidyakunj Attendance Server Running");
});

/* ================= STUDENTS API ================= */
app.get("/students", async (req, res) => {
  try {
    const students = await Student.find(req.query).sort({ roll: 1 });
    res.json({ students });
  } catch (err) {
    console.error("STUDENTS ERROR:", err);
    res.status(500).json({ students: [] });
  }
});

/* ================= SCHOOL SUMMARY ================= */
/*
   ✔ Whole school
   ✔ All standards
   ✔ All divisions
   ✔ Based on students collection
*/
app.get("/attendance/summary-school", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.json({
        success: true,
        primary: [],
        secondary: [],
        schoolTotal: { total: 0, present: 0, absent: 0 },
      });
    }

    const fromDate = new Date(date);
    fromDate.setHours(0, 0, 0, 0);

    const toDate = new Date(fromDate);
    toDate.setDate(fromDate.getDate() + 1);

    /* 1️⃣ Get all classes from students */
    const classes = await Student.aggregate([
      {
        $group: {
          _id: { std: "$std", div: "$div" },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.std": 1, "_id.div": 1 } },
    ]);

    let primary = [];
    let secondary = [];
    let schoolTotal = { total: 0, present: 0, absent: 0 };

    /* 2️⃣ For each class, calculate attendance */
    for (const cls of classes) {
      const std = cls._id.std;
      const div = cls._id.div;
      const total = cls.total;

      const presentCount = await Attendance.countDocuments({
        std,
        div,
        present: true,
        date: { $gte: fromDate, $lt: toDate },
      });

      const absent = total - presentCount;

      const row = {
        std,
        div,
        total,
        present: presentCount,
        absent,
      };

      schoolTotal.total += total;
      schoolTotal.present += presentCount;
      schoolTotal.absent += absent;

      if (parseInt(std) <= 8) primary.push(row);
      else secondary.push(row);
    }

    res.json({
      success: true,
      primary,
      secondary,
      schoolTotal,
    });

  } catch (err) {
    console.error("SUMMARY ERROR:", err);
    res.json({
      success: true,
      primary: [],
      secondary: [],
      schoolTotal: { total: 0, present: 0, absent: 0 },
    });
  }
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
