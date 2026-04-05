// backend/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🚨 1. 모델 이름을 변수로 빼서 위아래 모두 동일하게 적용 (에러 방지)
const MODEL_NAME = "gemini-2.5-flash";

// 게임 마스터의 뇌(모델) 세팅
const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  systemInstruction: `
    당신은 '강철의 연금술사(Fullmetal Alchemist)' TRPG의 게임 마스터입니다.
    유저의 선택에 따라 어둡고 긴장감 넘치는 스토리를 진행하세요.
    매 턴마다 대사와 선택지, 그리고 DALL-E 3용 영어 이미지 프롬프트를 JSON으로 반환해야 합니다.

    [🎨 이미지 프롬프트 작성 핵심 규칙]
    1. 저작권 필터를 피하기 위해 캐릭터 이름(Edward 등) 대신 외형을 묘사하세요. (예: a young boy with blond hair, red cloak, and a mechanical automail right arm)
    2. 강철의 연금술사 특유의 세계관(Amestris)을 묘사하는 키워드를 포함하세요. (예: early 20th-century European architecture, steampunk, dieselpunk)
    3. 군인이 등장할 때는 아메스트리스 군복을 묘사하세요. (예: blue military uniform with gold trim)
    4. 연금술을 사용할 때는 시각적 효과를 반드시 강조하세요. (예: glowing blue alchemical lightning, geometric transmutation circle on the ground, stone rubble flying)
  `,
  generationConfig: {
    responseMimeType: "application/json",
  },
});

// 대화 내역을 기억할 세션 변수 (로컬 테스트용)
let chatSession;

async function playWithGM(userMessage, turn) {
  try {
    if (turn === 0 || !chatSession) {
      chatSession = model.startChat({ history: [] });
      userMessage = `게임을 시작합니다. 첫 상황 묘사와 이미지 프롬프트를 주세요.`;
    } else {
      userMessage = `유저의 선택: "${userMessage}". 이어서 진행하세요.`;
    }

    const finalUserMessage = `
      ${userMessage}
      반드시 아래 JSON 형식으로만 응답하세요:
      {
        "text": "GM의 대사...",
        "choices": ["선택지1", "선택지2"],
        "imagePrompt": "Arakawa Hiromu anime style, detail visual description of the scene...", 
        "isEndOfChapter": false
      }
    `;

    const result = await chatSession.sendMessage(finalUserMessage);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error(
      "❌ AI 생성 통신 오류 발생! 더미 데이터로 대체합니다:",
      error.message,
    );

    // ==========================================
    // 🚨 2. 폴백 더미 데이터의 이미지 프롬프트를 구체적으로 작성!
    // ==========================================
    let fallbackResponse = {};

    if (turn === 0) {
      fallbackResponse = {
        text: "[통신 장애 - 대체 연성 가동] 연금술의 제1원칙, '등가교환'. 당신은 금기를 어긴 대가로 신체의 일부를 잃고, 차가운 오토메일(기계갑옷)을 달게 된 젊은 연금술사입니다. 국가 연금술사 시험 당일, 심사관이 차가운 눈빛으로 당신의 이름을 묻습니다. 당신의 이름은 무엇입니까?",
        choices: [
          "자신 있게 내 이름을 댄다.",
          "대답 대신, 진리에서 본 지식을 바탕으로 무연성진 연금술을 보여준다.",
        ],
        imagePrompt:
          "A young boy with blond hair and a mechanical metal right arm, standing confidently before a strict military examiner in a blue uniform. Early 20th-century European steampunk interior, dark fantasy atmosphere.",
        isEndOfChapter: false,
      };
    } else if (turn === 1) {
      fallbackResponse = {
        text: `[통신 장애 - 대체 연성 가동] "${userMessage}"... 흥미롭군요. 하지만 당신이 실력을 증명하려는 찰나, 우로보로스 문신을 한 '호문쿨루스'가 시험장 벽을 부수고 난입합니다! 붉은 현자의 돌이 뿜어내는 불길한 기운이 느껴집니다. 어떻게 하시겠습니까?`,
        choices: [
          "양손을 마주쳐 바닥에서 거대한 돌창을 연성해 공격한다.",
          "품속의 은시계를 꽉 쥐며 밖의 군부에 지원을 요청한다.",
        ],
        imagePrompt:
          "A terrifying humanoid creature breaking through a stone wall, glowing red magical energy. A young alchemist clapping hands together, glowing blue alchemical lightning, stone rubble flying. Cinematic lighting.",
        isEndOfChapter: false,
      };
    } else {
      fallbackResponse = {
        text: "[통신 장애 - 대체 연성 가동] 당신의 기지가 빛을 발해 위기를 모면했습니다. '진리'를 쫓는 국가 연금술사로서의 험난한 여정이 이제 막 시작되었습니다. 당신의 이 찬란하고 씁쓸한 첫 기록을 '연금술 연구 일지'로 출판하시겠습니까?",
        choices: ["연구 일지 출판하기", "다른 세계선으로 돌아가기"],
        imagePrompt:
          "A young alchemist holding a silver pocket watch, looking determined at sunset in a steampunk European city. Masterpiece, highly detailed.",
        isEndOfChapter: true,
      };
    }

    return fallbackResponse;
  }
}

// 대화 내용을 바탕으로 멋진 표지 프롬프트를 생성하는 함수
async function generateCoverPromptByStory(messages) {
  try {
    const userStory = messages
      .filter((msg) => msg.sender === "user")
      .map((msg) => msg.text)
      .join("\n");

    // 🚨 3. 표지 생성 시에도 DALL-E 저작권 필터(이름 사용 금지) 규칙 추가
    const prompt = `
      You are the author of a 'Fullmetal Alchemist' themed visual novel.
      Based on the user's adventure story below, create a detailed and dramatic DALL-E 3 prompt for the book cover.
      
      CRITICAL RULES:
      1. DO NOT use copyrighted names like "Edward Elric", "Alphonse", etc.
      2. Instead, describe their appearances (e.g., "a young boy with blond hair in a braid, wearing a red cloak and a mechanical automail arm").
      3. The style must be high-quality anime, dark fantasy, steampunk aesthetics, glowing alchemical lightning, cinematic composition.
      
      User's Story:
      "${userStory.substring(0, 1000)}..."

      Output ONLY the English DALL-E 3 prompt. Do not output JSON.
    `;

    const nonJsonModel = genAI.getGenerativeModel({
      model: MODEL_NAME, // 위에서 통일한 모델 변수 사용
    });
    const result = await nonJsonModel.generateContent(prompt);

    return result.response.text().trim();
  } catch (error) {
    console.error("표지 프롬프트 생성 실패:", error);
    return "A young alchemist with a mechanical arm and a red cloak, standing back-to-back with a giant suit of armor. Glowing blue transmutation circle on the ground, Central City steampunk background, dramatic sunset light.";
  }
}

module.exports = { playWithGM, generateCoverPromptByStory };
