/**
 * File: aiService.js
 * Description: Gemini 기반 TRPG 게임 마스터 및 프롬프트 생성 서비스
 */
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const isTestMode = process.env.USE_TEST_MODE === "true";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const MODEL_NAME = "gemini-2.5-flash";

const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  systemInstruction: `
    당신은 '강철의 연금술사(Fullmetal Alchemist)' TRPG의 게임 마스터입니다.
    유저의 선택에 따라 어둡고 긴장감 넘치는 스토리를 진행하세요.
    매 턴마다 대사와 선택지, 그리고 DALL-E 3용 영어 이미지 프롬프트를 JSON으로 반환해야 합니다.

    [📖 서사 페이스 조절 규칙 - 매우 중요!]
    - 이 게임은 최소 24페이지 분량의 포토북으로 출판되어야 합니다.
    - 턴(Turn) 정보를 바탕으로 기승전결을 조절하세요. (초반: 탐험/미스터리, 중반: 전투/갈등, 후반: 클라이맥스/진리)
    - 특별한 치명적 선택(배드엔딩/사망)이 발생하지 않는 한, **24턴이 되기 전까지는 절대 게임을 끝내지 말고 "isEndOfChapter": false 를 유지**하세요.
    - 24턴 이상이 되면 스토리를 자연스럽게 에필로그로 이끌고 "isEndOfChapter": true 를 반환하여 출판을 유도하세요.

    [🎨 이미지 프롬프트 작성 핵심 규칙]
    1. 저작권 필터를 피하기 위해 캐릭터 이름(Edward 등) 대신 외형을 묘사하세요.
    2. 강철의 연금술사 특유의 세계관(Amestris)을 묘사하는 키워드를 포함하세요.
    3. 군인이 등장할 때는 아메스트리스 군복을 묘사하세요.
    4. 연금술을 사용할 때는 시각적 효과를 반드시 강조하세요.
  `,
  generationConfig: {
    responseMimeType: "application/json",
  },
});

// 다중 사용자 세션 관리 맵
const chatSessions = new Map();

// ==========================================
// 1. TRPG 게임 마스터 통신
// ==========================================
async function playWithGM(sessionId, userMessage, turn) {
  if (isTestMode) {
    console.log(
      `[AIService] 🧪 테스트 모드 가동: Gemini API 호출 생략 (Turn: ${turn})`,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (turn === 0) {
      return {
        text: "[테스트 모드] 심사관이 차가운 눈빛으로 당신의 이름을 묻습니다.",
        choices: ["이름을 댄다.", "연금술을 보여준다."],
        imagePrompt: "A young boy with blond hair...",
        isEndOfChapter: false,
      };
    } else if (turn === 1) {
      return {
        text: `[테스트 모드] 호문쿨루스가 난입합니다! 어떻게 하시겠습니까?`,
        choices: ["공격한다.", "지원 요청한다."],
        imagePrompt: "A terrifying humanoid creature...",
        isEndOfChapter: false,
      };
    } else {
      return {
        text: "[테스트 모드] 위기를 모면했습니다. 첫 기록을 출판하시겠습니까?",
        choices: ["출판하기", "돌아가기"],
        imagePrompt: "A young alchemist...",
        isEndOfChapter: true,
      };
    }
  }

  try {
    let session = chatSessions.get(sessionId);

    if (turn === 0 || !session) {
      session = model.startChat({ history: [] });
      chatSessions.set(sessionId, session);
      userMessage = `게임을 시작합니다. 첫 상황 묘사와 이미지 프롬프트를 주세요.`;
    } else {
      userMessage = `유저의 선택: "${userMessage}". 이어서 진행하세요.`;
    }

    const finalUserMessage = `
      [시스템 정보: 현재 ${turn + 1}턴 진행 중 (목표: 24턴 이상)]
      ${userMessage}
      
      반드시 아래 JSON 형식으로만 응답하세요:
      {
        "text": "GM의 대사...",
        "choices": ["선택지1", "선택지2"],
        "imagePrompt": "Arakawa Hiromu anime style...", 
        "isEndOfChapter": false
      }
    `;

    const result = await session.sendMessage(finalUserMessage);
    return JSON.parse(result.response.text());
  } catch (error) {
    console.error(
      `[AIService] ❌ Error: 텍스트 생성 실패, 폴백(Fallback) 가동 - ${error.message}`,
    );
    return generateFallbackResponse(turn, userMessage);
  }
}

// ==========================================
// 2. 대화 기록 기반 표지 프롬프트 생성
// ==========================================
async function generateCoverPromptByStory(messages) {
  if (isTestMode) return "Test mode dummy cover prompt";

  try {
    const userStory = messages
      .filter((msg) => msg.sender === "user")
      .map((msg) => msg.text)
      .join("\n");

    const prompt = `
      You are the author of a 'Fullmetal Alchemist' themed visual novel.
      Based on the user's adventure story below, create a detailed and dramatic DALL-E 3 prompt for the book cover.
      
      CRITICAL RULES:
      1. DO NOT use copyrighted names like "Edward Elric", "Alphonse", etc.
      2. Instead, describe their appearances.
      3. The style must be high-quality anime, dark fantasy, steampunk aesthetics, cinematic composition.
      
      User's Story:
      "${userStory.substring(0, 1000)}..."

      Output ONLY the English DALL-E 3 prompt. Do not output JSON.
    `;

    const nonJsonModel = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await nonJsonModel.generateContent(prompt);

    return result.response.text().trim();
  } catch (error) {
    console.error(`[AIService] ❌ Error: 표지 프롬프트 생성 실패 -`, error);
    return "A young alchemist with a mechanical arm and a red cloak, standing back-to-back with a giant suit of armor. Glowing blue transmutation circle on the ground, Central City steampunk background, dramatic sunset light.";
  }
}

// ==========================================
// 3. 내부 헬퍼 함수 (폴백 데이터 제공)
// ==========================================
function generateFallbackResponse(turn, userMessage) {
  if (turn === 0) {
    return {
      text: "[통신 장애 - 대체 연성 가동] 연금술의 제1원칙, '등가교환'. 국가 연금술사 시험 당일, 심사관이 차가운 눈빛으로 당신의 이름을 묻습니다.",
      choices: ["이름을 댄다.", "무연성진 연금술을 보여준다."],
      imagePrompt:
        "A young boy with blond hair and a mechanical metal right arm, standing confidently before a strict military examiner. Steampunk interior.",
      isEndOfChapter: false,
    };
  } else if (turn === 1) {
    return {
      text: `[통신 장애 - 대체 연성 가동] "${userMessage}"... 호문쿨루스가 난입합니다! 붉은 현자의 돌이 뿜어내는 불길한 기운이 느껴집니다.`,
      choices: ["거대한 돌창을 연성해 공격한다.", "군부에 지원을 요청한다."],
      imagePrompt:
        "A terrifying humanoid creature breaking through a stone wall. A young alchemist clapping hands together, glowing blue alchemical lightning.",
      isEndOfChapter: false,
    };
  } else {
    return {
      text: "[통신 장애 - 대체 연성 가동] 위기를 모면했습니다. 당신의 첫 기록을 '연금술 연구 일지'로 출판하시겠습니까?",
      choices: ["연구 일지 출판하기", "다른 세계선으로 돌아가기"],
      imagePrompt:
        "A young alchemist holding a silver pocket watch, looking determined at sunset in a steampunk European city. Masterpiece.",
      isEndOfChapter: true,
    };
  }
}

module.exports = { playWithGM, generateCoverPromptByStory };
