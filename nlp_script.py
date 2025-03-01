from transformers import pipeline
import sys

# Initialize the HuggingFace pipeline (or any other model you want to use)
nlp = pipeline("conversational", model="microsoft/DialoGPT-medium")

# Get user input (passed from the Express app)
user_input = sys.argv[1]  # sys.argv[1] will be the first argument passed to the script

# Generate the AI's response based on user input
response = nlp(user_input)

# Extract the response text
ai_reply = response[0]["generated_text"]

# Print the AI response, which will be captured by the exec() in Node.js
print(ai_reply)
