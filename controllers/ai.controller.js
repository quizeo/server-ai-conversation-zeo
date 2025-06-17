import axios from "axios";
import dotenv from "dotenv";
import { ElevenLabsClient, play } from "@elevenlabs/elevenlabs-js";
dotenv.config();
import { Readable } from "stream";

export const handleConversation = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Call DeepSeek via OpenRouter
    const openRouterResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1",
        messages: [{ role: "user", content: prompt }],
        provider: {
          sort: "throughput",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = openRouterResponse.data.choices[0].message.content;
    console.log("Using API Key:", process.env.ELEVENLABS_API_KEY);
    const elevenlabs = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY, // Make sure this is set in your .env file
    });

    const voices = await elevenlabs.voices.getAll();
    console.log("Available voices:", voices.voices[0].voiceId);
    const defaultVoiceId = voices.voices[0].voiceId;

    // Convert text to speech
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

    res.json({
      text: aiResponse,
      audio: `data:audio/mpeg;base64,${audioBase64}`,
    });
  } catch (error) {
    console.error("Error in conversation:", error);
    res.status(error.response?.status || 500).json({
      message: "Error processing conversation",
      error: error.message,
      details: error.response?.data || error,
    });
  }
};
