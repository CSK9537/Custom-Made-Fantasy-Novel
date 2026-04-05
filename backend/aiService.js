// backend/aiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Gemini API 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 게임 마스터의 뇌(모델) 세팅
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash", // 빠르고 가성비 좋은 모델
  systemInstruction: `
    당신은 '강철의 연금술사' 세계관을 배경으로 하는 텍스트 TRPG의 게임 마스터입니다.
    유저는 금기를 어긴 대가로 오토메일을 달게 된 신입 국가 연금술사입니다.
    유저의 선택에 따라 긴장감 넘치고 흥미진진한 스토리를 진행해 주세요.
    한 턴의 스토리가 끝날 때마다 유저가 다음 행동을 결정할 수 있는 2개의 선택지를 줘야 합니다.
    스토리가 5~6턴 정도 진행되어 하나의 사건(챕터)이 마무리될 쯤이면 isEndOfChapter를 true로 반환하여 출판을 유도하세요.
  `,
  generationConfig: {
    // 🚨 핵심: 프론트엔드가 파싱할 수 있도록 무조건 JSON 형태로만 응답하게 강제합니다!
    responseMimeType: "application/json",
  },
});

// 대화 내역을 기억할 세션 변수 (로컬 테스트용)
let chatSession;

// 게임 마스터 대화 함수
async function playWithGM(userMessage, turn) {
  try {
    // 첫 턴(turn 0)이거나 세션이 없으면 대화 내역을 초기화하고 새로 시작합니다.
    if (turn === 0 || !chatSession) {
      chatSession = model.startChat({ history: [] });
      userMessage = `
        게임을 처음부터 시작합니다. 
        강철의 연금술사 세계관에 맞는 어둡고 긴장감 넘치는 첫 상황을 설명하고, 내 이름을 물어봐 주세요.
        응답은 반드시 아래 JSON 형식으로 작성하세요.
        {"text": "상황 설명...", "choices": ["선택지1", "선택지2"], "isEndOfChapter": false}
      `;
    } else {
      // 턴이 진행 중일 때의 유저 선택 전달
      userMessage = `
        유저의 선택: "${userMessage}"
        이 선택에 이어서 다음 스토리를 진행해 주세요.
        응답은 반드시 아래 JSON 형식으로 작성하세요.
        {"text": "스토리 진행...", "choices": ["선택지1", "선택지2"], "isEndOfChapter": false}
      `;
    }

    // Gemini에게 메시지 전송 및 응답 대기
    const result = await chatSession.sendMessage(userMessage);
    const responseText = result.response.text();

    // JSON 문자열을 자바스크립트 객체로 변환하여 반환
    return JSON.parse(responseText);
  } catch (error) {
    console.error("AI 생성 오류:", error);
    // 에러 발생 시 진행을 막지 않기 위한 임시 응답
    return {
      text: "진리의 문 너머로 통신이 끊어졌습니다. (AI 오류) 다시 시도해 주시겠습니까?",
      choices: ["다시 시도한다.", "기다린다."],
      isEndOfChapter: false,
    };
  }
}

module.exports = { playWithGM };
