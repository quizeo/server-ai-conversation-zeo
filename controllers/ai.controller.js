import axios from "axios";
import dotenv from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";

// Load environment variables
dotenv.config();

export const handleConversation = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,OPTIONS,PATCH,DELETE,POST,PUT"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
    );
    return res.status(200).end();
  }

  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Validate required environment variables
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return res.status(500).json({ message: "Missing OpenRouter API key." });
    }

    // 🧠 Call DeepSeek model via OpenRouter
    const openRouterResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = openRouterResponse.data.choices[0]?.message?.content;
    if (!aiResponse) {
      return res.status(500).json({ message: "No response from DeepSeek." });
    }

    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY, // Make sure this is set in your .env file
    });

    const voices = await elevenlabs.voices.getAll();
    console.log("Available voices:", voices.voices[0].voiceId);

    if (!voices || !voices.voices || voices.voices.length === 0) {
      return res
        .status(500)
        .json({ message: "No voices available for this API key." });
    }
    const defaultVoiceId = voices.voices[0].voiceId;

    // 🗣️ Convert response text to speech using TTSMaker
    const audio = await elevenlabs.textToSpeech.convert(defaultVoiceId, {
      text: aiResponse,
    });

    const stream = Readable.from(audio);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Encode buffer to base64
    const audioBase64 = buffer.toString("base64");

    // 📤 Respond to frontend
    res.json({
      text: aiResponse,
      audio: `data:audio/mp3;base64,${audioBase64}`,
    });
  } catch (error) {
    console.error("❌ Error in conversation:", error);

    return res.status(error?.response?.status || 500).json({
      message: "Something went wrong during processing",
      error: error.message,
      details: error.response?.data || error,
    });
  }
};
