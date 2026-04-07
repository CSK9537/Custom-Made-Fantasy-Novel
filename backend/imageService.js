/**
 * File: imageService.js
 * Description: DALL-E 3 연동 고화질 씬 이미지 생성 서비스
 */
const OpenAI = require("openai");
require("dotenv").config();

const isTestMode = process.env.USE_TEST_MODE === "true";
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ==========================================
// 1. 고화질 씬 이미지 생성 (DALL-E 3)
// ==========================================
async function generateSceneImage(prompt) {
  if (isTestMode) {
    console.log(
      "[ImageService] 🧪 테스트 모드 가동: DALL-E 3 호출 생략 (더미 이미지 반환)",
    );
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "https://dummyimage.com/1024x1024/2a2a2a/f6ad55.jpg?text=Test+Mode+Image";
  }

  try {
    console.log(
      `[ImageService] ℹ️ DALL-E 3 고품질 이미지 연성 중... (프롬프트: ${prompt.substring(0, 30)}...)`,
    );

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: `${prompt}, in the exact visual style of Hiromu Arakawa's Fullmetal Alchemist anime. Cell-shaded animation, steampunk aesthetics, dramatic cinematic lighting, masterpiece, high quality.`,
      n: 1,
      size: "1024x1024",
      response_format: "url",
    });

    return response.data[0].url;
  } catch (error) {
    console.error(
      `[ImageService] ❌ Error: 이미지 생성 실패 - ${error.message}`,
    );
    return "https://via.placeholder.com/1024/000000/ffffff?text=Image+Generation+Failed";
  }
}

module.exports = { generateSceneImage };
