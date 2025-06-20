import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const handleConversation = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    // 🧠 Get AI-generated response from DeepSeek
    const openRouterResponse = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "openai/gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
      },
      {
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiResponse = openRouterResponse.data.choices[0].message.content;
    if (!aiResponse) {
      return res.status(500).json({ message: "No response from DeepSeek." });
    }

    // 🔊 Convert AI response to speech using All Voice Lab

    const response = await axios.get(
      "https://api.allvoicelab.com/v1/voices/get_all_voices",
      {
        params: {
          show_legacy: true,
          language_code: "en",
          gender: "male",
        },
        headers: {
          "ai-api-key": process.env.ALLVOICELAB_API_KEY, // Make sure to put this in a .env file
          "Content-Type": "application/json",
        },
      }
    );

    // console.log("Available voices:", response.data);

    const ttsResponse = await axios.post(
      "https://api.allvoicelab.com/v1/text-to-speech/create",
      {
        text: aiResponse,
        voice_id: "280800998262308871",
        model_id: "tts-multilingual",
      },
      {
        headers: {
          "ai-api-key": process.env.ALLVOICELAB_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );
    // console.log("Response from TTS API:", ttsResponse.data);

    const audioBase64 = Buffer.from(ttsResponse.data, "binary").toString(
      "base64"
    );

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
