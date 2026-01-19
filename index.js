/* =======================================================
   VIDYAKUNJ SERVER – FINAL STABLE VERSION
   SMS + STUDENTS + ATTENDANCE SUMMARY
   ======================================================= */

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 10000;

/* ================= MIDDLEWARE ================= */
app.use(bodyParser.json());

/* ================= ENV ================= */
const {
  MONGO_URL,
  GUPSHUP_USERID,
  GUPSHUP_PASSWORD,
  GUPSHUP_SENDERID,
  SCHOOL_NAME = "Vidyakunj School Navsari",
} = process.env;

/* ================= MONGO CONNECT ================= */
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ================= SCHEMAS ================= */
const StudentSchema = new mongoose.Schema({
  std: String,
  div: String,
  name: String,
  roll: Number,
  mobile: String,
});

const AttendanceSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  std: String,
  div: String,
  roll: Number,
  date: Date,
  present: Boolean,
});

const Student = mongoose.model("students", StudentSchema);
const Attendance = mongoose.model("attendance", AttendanceSchema);

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.send(`${SCHOOL_NAME} API is running`);
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

/* ================= ATTENDANCE SUMMARY ================= */
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

    const parsedDate = new Date(date);
    parsedDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(parsedDate);
    nextDay.setDate(parsedDate.getDate() + 1);

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

    for (const c of classes) {
      const std = c._id.std;
      const div = c._id.div;
      const total = c.total;

      const absent = await Attendance.countDocuments({
        std,
        div,
        present: false,
        date: { $gte: parsedDate, $lt: nextDay },
      });

      const present = total - absent;

      const row = { std, div, total, present, absent };

      schoolTotal.total += total;
      schoolTotal.present += present;
      schoolTotal.absent += absent;

      if (parseInt(std) <= 8) primary.push(row);
      else secondary.push(row);
    }

    res.json({ success: true, primary, secondary, schoolTotal });
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

/* ================= SEND SMS ================= */
app.post("/send-sms", async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: "Missing phone or message" });
    }

    const smsUrl = "https://enterprise.smsgupshup.com/GatewayAPI/rest";

    const params = new URLSearchParams({
      method: "sendMessage",
      send_to: phone,
      msg: `${SCHOOL_NAME}: ${message}`,
      msg_type: "TEXT",
      userid: GUPSHUP_USERID,
      auth_scheme: "plain",
      password: GUPSHUP_PASSWORD,
      v: "1.1",
      format: "text",
      mask: GUPSHUP_SENDERID,
    });

    const response = await axios.post(smsUrl, params);
    res.json({ success: true, response: response.data });
  } catch (error) {
    console.error("SMS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
});

/* ================= START ================= */
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
