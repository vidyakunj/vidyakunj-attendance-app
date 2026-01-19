/* =======================================================
   VIDYAKUNJ ATTENDANCE BACKEND – SCHOOL SUMMARY FIXED
   ======================================================= */

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(bodyParser.json());

/* =======================================================
   MONGODB CONNECTION
   ======================================================= */
mongoose
  .connect(process.env.MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* =======================================================
   SCHEMAS
   ======================================================= */
const StudentSchema = new mongoose.Schema(
  {
    std: String,
    div: String,
    roll: Number,
    name: String,
    mobile: String,
  },
  { collection: "students" }
);

const AttendanceSchema = new mongoose.Schema(
  {
    studentId: mongoose.Schema.Types.ObjectId,
    std: String,
    div: String,
    roll: Number,
    date: Date,
    present: Boolean,
    late: Boolean,
  },
  { collection: "attendances" }
);

const Student = mongoose.model("Student", StudentSchema);
const Attendance = mongoose.model("Attendance", AttendanceSchema);

/* =======================================================
   HEALTH CHECK
   ======================================================= */
app.get("/", (req, res) => {
  res.send("Vidyakunj Attendance Server Running");
});

/* =======================================================
   SCHOOL SUMMARY (FIXED + ENHANCED)
   ======================================================= */
app.get("/attendance/summary-school", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.json({
        success: true,
        primary: [],
        secondary: [],
        schoolTotal: { total: 0, present: 0, absent: 0, late: 0 },
      });
    }

    const start = new Date(date);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    /* -------------------------------
       GROUP STUDENTS BY STD + DIV
       ------------------------------- */
    const classes = await Student.aggregate([
      {
        $group: {
          _id: { std: "$std", div: "$div" },
          total: { $sum: 1 },
        },
      },
      {
        $addFields: {
          stdNum: { $toInt: "$_id.std" },
        },
      },
      {
        $sort: { stdNum: 1, "_id.div": 1 },
      },
    ]);

    let primary = [];
    let secondary = [];
    let schoolTotal = { total: 0, present: 0, absent: 0, late: 0 };

    for (const cls of classes) {
      const std = cls._id.std;
      const div = cls._id.div;
      const total = cls.total;

      const presentCount = await Attendance.countDocuments({
        std,
        div,
        present: true,
        date: { $gte: start, $lt: end },
      });

      const lateCount = await Attendance.countDocuments({
        std,
        div,
        present: true,
        late: true,
        date: { $gte: start, $lt: end },
      });

      const absent = total - presentCount;
      const attendancePercent =
        total > 0 ? Number(((presentCount / total) * 100).toFixed(2)) : 0;

      const row = {
        std,
        div,
        total,
        present: presentCount,
        absent,
        late: lateCount,
        attendancePercent,
      };

      schoolTotal.total += total;
      schoolTotal.present += presentCount;
      schoolTotal.absent += absent;
      schoolTotal.late += lateCount;

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
    console.error("❌ SUMMARY ERROR:", err);
    res.json({
      success: true,
      primary: [],
      secondary: [],
      schoolTotal: { total: 0, present: 0, absent: 0, late: 0 },
    });
  }
});

/* =======================================================
   STUDENTS LIST (SAFE)
   ======================================================= */
app.get("/students", async (req, res) => {
  try {
    const students = await Student.find(req.query).sort({
      std: 1,
      div: 1,
      roll: 1,
    });
    res.json({ students });
  } catch (err) {
    console.error("❌ STUDENTS ERROR:", err);
    res.status(500).json({ students: [] });
  }
});

/* =======================================================
   START SERVER
   ======================================================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
