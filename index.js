import express from "express";
import pkg from "pg";
import twilio from "twilio";
import { exec } from "child_process";
import fetch from "node-fetch"; // For making API calls to GPT
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Twilio Setup
const accountSid = process.env.SID;
const authToken = process.env.TOKEN;
const client = twilio(accountSid, authToken);

const { Pool } = pkg;
// PostgreSQL Connection
const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // Set to true if your database requires a verified certificate
  },
});

db.connect();

// Middleware
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");

// Route to display form for reporting product issue
app.get("/", (req, res) => {
  res.render("report-issue");
});

// Route to submit product issue and initiate call
app.post("/submit-issue", async (req, res) => {
  const { name, phone, product, issue } = req.body;

  try {
    

    // Initiate a call to the user
    await client.calls.create({
      to: "+91 9042348137",
      from: "+17755228853",
      url: "http://13.216.91.95:3000/submit-issue",
    });

    res.send("Issue reported successfully, and we have initiated a call.");
  } catch (error) {
    console.error("Error submitting issue:", error);
    res.status(500).send("Failed to report issue.");
  }
});

// AI Voice Interaction - Initial Question
app.post("/voice-response", (req, res) => {
  res.type("text/xml");
  res.send(`
    <Response>
      <Say>Hello, this is the support team calling regarding your reported product issue. Please provide more details.</Say>
      <Gather input="speech" action="/process-response" timeout="10">
        <Say>Can you describe the damage to the product? irfan i a good boy</Say>
      </Gather>
    </Response>
  `);
});

app.post("/process-response", async (req, res) => {
  const userResponse = req.body.SpeechResult || "";

  try {
    // Execute Python script to process the user response
    exec(
      `python3 ./nlp_script.py "${userResponse}"`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return res.type("text/xml").send(`
          <Response>
            <Say>Sorry, we encountered an error processing your response.</Say>
          </Response>
        `);
        }

        const aiReply = stdout.trim();

        res.type("text/xml");
        res.send(`
        <Response>
          <Say>${aiReply}</Say>
          <Gather input="speech" action="/process-response" timeout="10">
            <Say>Is there anything else I can assist you with?</Say>
          </Gather>
        </Response>
      `);
      }
    );
  } catch (error) {
    console.error("Error processing response:", error);
    res.type("text/xml");
    res.send(`
      <Response>
        <Say>Sorry, we are experiencing issues processing your response. Please try again later.</Say>
      </Response>
    `);
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
