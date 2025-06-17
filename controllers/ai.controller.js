import axios from "axios";
import dotenv from "dotenv";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

// Load environment variables
dotenv.config();

export const handleConversation = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    // Validate required environment variables
    const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    if (!elevenlabsApiKey || !openRouterApiKey) {
      return res.status(500).json({ message: "Missing required API keys." });
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

    // 🎤 Initialize ElevenLabs client
    const elevenlabs = new ElevenLabsClient({ apiKey: elevenlabsApiKey });

    // Fetch available voices
    const voices = await elevenlabs.voices.getAll();
    if (!voices?.voices?.length) {
      return res.status(500).json({ message: "No voices available." });
    }

    const defaultVoiceId = voices.voices[0].voiceId;

    // 🎧 Convert AI response to speech
    const audioResponse = await axios({
      method: "post",
      url: `https://api.elevenlabs.io/v1/text-to-speech/${defaultVoiceId}`,
      headers: {
        "xi-api-key": elevenlabsApiKey,
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

    // 🔊 Encode audio to base64
    const audioBase64 = Buffer.from(audioResponse.data).toString("base64");

    // 📤 Respond to frontend
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
