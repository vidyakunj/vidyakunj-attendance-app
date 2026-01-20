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
   SCHOOL SUMMARY – DATE RANGE (ONLY MARKED DAYS)
   ======================================================= */
app.get("/attendance/summary-school-range", async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ success: false });
    }

    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    /* ------------------------------------
       Find attendance days that exist
       ------------------------------------ */
    const activeDates = await Attendance.distinct("date", {
      date: { $gte: startDate, $lte: endDate },
    });

    const totalDays = activeDates.length;

    if (totalDays === 0) {
      return res.json({
        success: true,
        primary: [],
        secondary: [],
        schoolTotal: {
          total: 0,
          present: 0,
          absent: 0,
          late: 0,
          attendancePercent: 0,
        },
      });
    }

    /* ------------------------------------
       Group students
       ------------------------------------ */
    const classes = await Student.aggregate([
      {
        $group: {
          _id: { std: "$std", div: "$div" },
          totalStudents: { $sum: 1 },
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
    let schoolTotal = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      attendancePercent: 0,
    };

    for (const c of classes) {
      const std = c._id.std;
      const div = c._id.div;
      const students = c.totalStudents;
      const possible = students * totalDays;

      const present = await Attendance.countDocuments({
        std,
        div,
        present: true,
        date: { $in: activeDates },
      });

      const late = await Attendance.countDocuments({
        std,
        div,
        present: true,
        late: true,
        date: { $in: activeDates },
      });

      const absent = possible - present;

      const percent =
        possible > 0 ? Number(((present / possible) * 100).toFixed(2)) : 0;

      const row = {
        std,
        div,
        totalStudents: students,
        attendanceDays: totalDays,
        present,
        absent,
        late,
        attendancePercent: percent,
      };

      schoolTotal.total += possible;
      schoolTotal.present += present;
      schoolTotal.absent += absent;
      schoolTotal.late += late;

      if (parseInt(std) <= 8) primary.push(row);
      else secondary.push(row);
    }

    schoolTotal.attendancePercent =
      schoolTotal.total > 0
        ? Number(
            ((schoolTotal.present / schoolTotal.total) * 100).toFixed(2)
          )
        : 0;

    res.json({
      success: true,
      from,
      to,
      totalAttendanceDays: totalDays,
      primary,
      secondary,
      schoolTotal,
    });
  } catch (err) {
    console.error("❌ RANGE SUMMARY ERROR:", err);
    res.status(500).json({ success: false });
  }
});
/* =======================================================
   ALIAS ROUTE (FIX FRONTEND 404 ISSUE)
   DO NOT MOVE THIS BLOCK
   ======================================================= */
app.get("/attendance/summary-range", (req, res) => {
  req.url = "/attendance/summary-school-range";
  app._router.handle(req, res);
});

/* =======================================================
   SIMPLE LOGIN (ADMIN / TEACHER)
   ======================================================= */
app.post("/login", (req, res) => {
  const { username, password, role } = req.body;

  const users = [
    { username: "admin", password: "admin123", role: "admin" },
    { username: "patil", password: "iken", role: "teacher" },
    { username: "teacher1", password: "1234", role: "teacher" },
  ];

  const user = users.find(
    (u) =>
      u.username === username &&
      u.password === password &&
      u.role === role
  );

  if (!user) {
    return res.status(401).json({ success: false });
  }

  res.json({
    success: true,
    role: user.role,
    username: user.username,
  });
});

/* =======================================================
   START SERVER
   ======================================================= */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});





