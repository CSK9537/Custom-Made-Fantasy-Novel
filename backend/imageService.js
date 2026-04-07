// backend/imageService.js
const OpenAI = require("openai");
require("dotenv").config();

// 🚨 스위치 상태 읽어오기
const isTestMode = process.env.USE_TEST_MODE === "true";
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateSceneImage(prompt) {
  // ==========================================
  // 🚨 [추가] 테스트 모드일 경우 결제 없이 회색 더미 이미지 반환!
  // ==========================================
  if (isTestMode) {
    console.log(
      "🧪 [테스트 모드 가동] DALL-E 호출을 생략하고 더미 이미지를 반환합니다.",
    );
    // 실제 생성되는 척 2초 정도 딜레이
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return "https://dummyimage.com/1024x1024/2a2a2a/f6ad55.jpg?text=Test+Mode+Image";
  }

  // ==========================================
  // 아래는 실제 DALL-E 3 호출 로직
  // ==========================================
  try {
    console.log(
      `🎨 DALL-E 3 최고 퀄리티 연성 중... (프롬프트: ${prompt.substring(0, 30)}...)`,
    );

    const response = await openai.images.generate({
      // 🚨 다시 가장 똑똑하고 작화력이 뛰어난 dall-e-3로 복귀!
      model: "dall-e-3",
      prompt: `${prompt}, in the exact visual style of Hiromu Arakawa's Fullmetal Alchemist anime. Cell-shaded animation, steampunk aesthetics, dramatic cinematic lighting, masterpiece, high quality.`,
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
