import axios from "axios";
import dotenv from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { Readable } from "stream";

// Load environment variables
dotenv.config();

export const handleConversation = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // ✅ Validate ElevenLabs API Key
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenlabsApiKey) {
      return res
        .status(500)
        .json({ message: "Missing ElevenLabs API key in environment." });
    }

    // ✅ Call DeepSeek model using OpenRouter
    const openRouterResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-r1",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = openRouterResponse.data.choices[0].message.content;

    // ✅ Initialize ElevenLabs Client
    const elevenlabs = new ElevenLabsClient({
      apiKey: elevenlabsApiKey,
    });

    // ✅ Get available voices
    const voices = await elevenlabs.voices.getAll();
    if (!voices.voices?.length) {
      return res.status(500).json({ message: "No voices available." });
    }

    const defaultVoiceId = voices.voices[0].voiceId;

    // ✅ Convert AI response to speech
    const audioStream = await elevenlabs.textToSpeech.convert(defaultVoiceId, {
      text: aiResponse,
      modelId: "eleven_multilingual_v2",
      outputFormat: "mp3_44100_128",
    });

    // ✅ Stream to base64
    const stream = Readable.from(audioStream);
    const chunks = [];

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    const buffer = Buffer.concat(chunks);
    const audioBase64 = buffer.toString("base64");

    // ✅ Send response
    res.json({
      text: aiResponse,
      audio: `data:audio/mpeg;base64,${audioBase64}`,
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
