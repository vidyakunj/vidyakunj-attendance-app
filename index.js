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
  res.send(`${SCHOOL_NAME} SMS API is running`);
});

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
