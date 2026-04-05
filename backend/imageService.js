// backend/imageService.js
const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateSceneImage(prompt) {
  try {
    console.log(
      `🎨 DALL-E 3 최고 퀄리티 연성 중... (프롬프트: ${prompt.substring(0, 30)}...)`,
    );

    const response = await openai.images.generate({
      // 🚨 다시 가장 똑똑하고 작화력이 뛰어난 dall-e-3로 복귀!
      model: "dall-e-3",
      prompt: `${prompt}, in the exact visual style of Hiromu Arakawa's Fullmetal Alchemist anime. Cell-shaded animation, dark fantasy atmosphere, steampunk aesthetics, dramatic cinematic lighting, masterpiece, high quality.`,
      n: 1,
      // 스위트북 인쇄용 고해상도 유지
      size: "1024x1024",
      response_format: "url",
    });

    return response.data[0].url;
  } catch (error) {
    console.error("❌ 이미지 생성 실패:", error.message);
    return "https://via.placeholder.com/1024/000000/ffffff?text=Image+Generation+Failed";
  }
}

module.exports = { generateSceneImage };
