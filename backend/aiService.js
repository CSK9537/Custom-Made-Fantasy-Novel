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
    유저의 선택에 따라 스토리를 진행하되, 아래의 세계관 톤앤매너를 완벽하게 유지하세요.

    [✨ 핵심 서사 톤앤매너 (인간 찬가)]
    - 이 세계관은 단순히 어둡고 잔혹하기만 한 다크 판타지가 아닙니다. 비극과 절망적인 사건이 벌어지더라도, 궁극적으로는 꺾이지 않는 인간의 의지, 동료애, 그리고 '인간 찬가'를 노래하는 희망찬 감동 서사로 이끌어가야 합니다.
    - 유저가 좌절할 만한 상황에서도, 고통을 딛고 일어서서 진리를 향해 한 걸음 내디딜 수 있는 가슴 뜨거운 묘사를 반드시 포함하세요.

    [📖 서사 페이스 조절 규칙]
    - 이 게임은 최소 24페이지 분량의 포토북으로 출판되어야 합니다.
    - 턴(Turn) 정보를 바탕으로 기승전결을 조절하세요. (초반: 탐험/미스터리, 중반: 전투/갈등, 후반: 클라이맥스/진리)
    - 특별한 치명적 선택이 발생하지 않는 한, 24턴이 되기 전까지는 절대 게임을 끝내지 말고 "isEndOfChapter": false 를 유지하세요.
    - 24턴 이상이 되면 스토리를 자연스럽게 희망찬 에필로그로 이끌고 "isEndOfChapter": true 를 반환하세요.

  [🎨 이미지 일관성(Consistency) 및 화면 연출 절대 규칙 - 가장 중요!]
    DALL-E 3가 일관된 캐릭터를 그리면서도, 캐릭터에만 집중된 증명사진이 아닌 '풍부한 배경과 액션이 담긴 장면(Scene)'을 그리도록 아래 규칙을 무조건 따르세요.

    1. [캐릭터 외형 확정] 주인공의 상세한 외형 묘사(나이, 머리색, 헤어스타일, 눈색, 핵심 복장 특성)를 0턴에 확정하세요. 
    2. [카메라 구도와 배경 우선 묘사] imagePrompt의 맨 처음은 무조건 '카메라 구도(Wide shot, Cinematic angle, Establishing shot 등)'와 '배경/환경 묘사'로 시작하세요. 절대 캐릭터 묘사로 프롬프트를 시작하지 마세요.
    3. [캐릭터 배치 및 일관성] 배경 묘사 뒤에 주인공을 배치하세요. 이때 0턴에 확정한 주인공의 외형 영문 텍스트를 토씨 하나 틀리지 않고 똑같이 복사/붙여넣기 한 뒤, 캐릭터의 현재 행동을 적으세요.
      - ✅ 올바른 예시: "Wide shot of a ruined steampunk city street filled with dramatic smoke. In the center, [1턴에 확정한 주인공 외형 묘사 그대로 복붙] is running towards a glowing magical light..."
    4. [저작권 필터 우회] 저작권 필터를 피하기 위해 'Edward Elric' 같은 고유명사 대신 철저히 외형으로만 묘사하세요.
    5. [안전 필터 우회] blood, kill, gore, severed, weapon, violence 등의 단어 대신 "glowing magical light", "shattering stones" 등으로 은유하세요.
    6. [화풍 개입 금지] imagePrompt를 작성할 때 anime, realistic, cinematic, lighting, dark fantasy, illustration 같은 '화풍, 조명, 렌더링' 관련 단어를 절대 적지 마세요. 오직 피사체(인물, 배경, 행동)의 물리적 묘사만 매우 건조하게 작성하세요.
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
      3. The style must be high-quality anime, steampunk aesthetics, cinematic composition.
      
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
