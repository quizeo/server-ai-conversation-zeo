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

    const audioResponse = await axios({
      method: "post",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`,
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      data: {
        text: aiResponse,
        model_id: "eleven_multilingual_v2",
        output_format: "mp3_44100_128",
      },
      responseType: "arraybuffer",
    });

    const audioBase64 = Buffer.from(audioResponse.data).toString("base64");

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
