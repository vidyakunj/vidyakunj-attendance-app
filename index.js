const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

const GUPSHUP_USERID = process.env.GUPSHUP_USERID;
const GUPSHUP_PASSWORD = process.env.GUPSHUP_PASSWORD;
const GUPSHUP_SENDERID = process.env.GUPSHUP_SENDERID;
const SCHOOL_NAME = process.env.SCHOOL_NAME || "Vidyakunj School Navsari";

app.post("/send-sms", async (req, res) => {
  try {
    const { phone, message } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: "Missing phone or message" });
    }

    const smsUrl = `https://enterprise.smsgupshup.com/GatewayAPI/rest`;
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
    res.status(500).json({ error: error.message });
  }
});

app.get("/", (req, res) => {
  res.send(`${SCHOOL_NAME} SMS API is running`)/* ================= ADMIN SCHOOL SUMMARY ================= */
app.get("/attendance/summary-school", async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.json({
        success: true,
        primary: [],
        secondary: [],
        schoolTotal: { total: 0, present: 0, absent: 0 }
      });
    }

    const parsedDate = new Date(date);
    parsedDate.setHours(0, 0, 0, 0);

    const nextDay = new Date(parsedDate);
    nextDay.setDate(parsedDate.getDate() + 1);

    // Group students by class
    const classes = await Student.aggregate([
      {
        $group: {
          _id: { std: "$std", div: "$div" },
          total: { $sum: 1 }
        }
      }
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
        date: { $gte: parsedDate, $lt: nextDay }
      });

      const present = total - absent;

      const row = { std, div, total, present, absent };

      schoolTotal.total += total;
      schoolTotal.present += present;
      schoolTotal.absent += absent;

      if (parseInt(std) <= 8) primary.push(row);
      else secondary.push(row);
    }

    res.json({
      success: true,
      primary,
      secondary,
      schoolTotal
    });

  } catch (err) {
    console.error("SUMMARY ERROR:", err);
    res.json({
      success: true,
      primary: [],
      secondary: [],
      schoolTotal: { total: 0, present: 0, absent: 0 }
    });
  }
});
;
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

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));


