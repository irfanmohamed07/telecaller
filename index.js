import express from "express";
import pkg from "pg";
import twilio from "twilio";
import fetch from "node-fetch"; // For making API calls to GPT
import dotenv from "dotenv";

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
    await db.query(
      "INSERT INTO product_issues (name, phone, product, issue) VALUES ($1, $2, $3, $4)",
      [name, phone, product, issue]
    );

    // Initiate a call to the user
    await client.calls.create({
      to: phone,
      from: "+17755228853",
      url: "https://telecaller-05uy.onrender.com/voice-response",
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
        <Say>Can you describe the damage to the product?</Say>
      </Gather>
    </Response>
  `);
});

// Process User Speech and Generate AI Response
app.post("/process-response", async (req, res) => {
  const userResponse = req.body.SpeechResult || "";

  try {
    // Send user response to OpenAI or any AI model for a dynamic reply
    const gptResponse = await fetch(
      "https://api.openai.com/v1/engines/text-davinci-003/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer your_openai_api_key`,
        },
        body: JSON.stringify({
          prompt: `User said: "${userResponse}". Respond as a customer support representative for a product issue.`,
          max_tokens: 100,
        }),
      }
    );

    const gptData = await gptResponse.json();
    const aiReply = gptData.choices[0].text.trim();

    res.type("text/xml");
    res.send(`
      <Response>
        <Say>${aiReply}</Say>
        <Gather input="speech" action="/process-response" timeout="10">
          <Say>Is there anything else I can assist you with?</Say>
        </Gather>
      </Response>
    `);
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
