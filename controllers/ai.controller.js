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

    // 📤 Respond to frontend
    res.json({
      text: aiResponse,
      audio: null,
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
