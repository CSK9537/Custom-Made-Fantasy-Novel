const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 분리해둔 두 개의 서비스를 불러옵니다.
const { createAlchemistBook } = require("./bookService");
const { orderAlchemistBook } = require("./orderService");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ==========================================
// 1. 대화 API (강철의 연금술사 스토리 로직 복구!)
// ==========================================
app.post("/api/chat", (req, res) => {
  const { message, turn } = req.body;

  let gmResponse = {};

  if (turn === 0) {
    gmResponse = {
      text: "연금술의 제1원칙, '등가교환'. 당신은 금기를 어긴 대가로 신체의 일부를 잃고, 차가운 오토메일(기계갑옷)을 달게 된 젊은 연금술사입니다. 국가 연금술사 시험 당일, 심사관이 차가운 눈빛으로 당신의 이름을 묻습니다. 당신의 이름은 무엇입니까?",
      choices: [
        "자신 있게 내 이름을 댄다.",
        "대답 대신, 진리에서 본 지식을 바탕으로 무연성진 연금술을 보여준다.",
      ],
    };
  } else if (turn === 1) {
    gmResponse = {
      text: `"${message}"... 흥미롭군요. 하지만 당신이 실력을 증명하려는 찰나, 우로보로스 문신을 한 '호문쿨루스'가 시험장 벽을 부수고 난입합니다! 붉은 현자의 돌이 뿜어내는 불길한 기운이 느껴집니다. 어떻게 하시겠습니까?`,
      choices: [
        "양손을 마주쳐 바닥에서 거대한 돌창을 연성해 공격한다.",
        "품속의 은시계를 꽉 쥐며 밖의 군부에 지원을 요청한다.",
      ],
    };
  } else {
    gmResponse = {
      text: "당신의 기지가 빛을 발해 위기를 모면했습니다. '진리'를 쫓는 국가 연금술사로서의 험난한 여정이 이제 막 시작되었습니다. 당신의 이 찬란하고 씁쓸한 첫 기록을 '연금술 연구 일지'로 출판하시겠습니까?",
      choices: ["연구 일지 출판하기", "다른 세계선으로 돌아가기"],
      isEndOfChapter: true,
    };
  }

  res.json(gmResponse);
});

// ==========================================
// 2. 출판 API (모듈화된 로직 조립)
// ==========================================
app.post("/api/publish", async (req, res) => {
  try {
    // 1단계: 책 연성 (bookService)
    const completedBookUid = await createAlchemistBook();

    // 2단계: 군부 주문 (orderService)
    const orderUid = await orderAlchemistBook(completedBookUid);

    // 최종 프론트엔드 응답
    res.json({
      success: true,
      message: `📚 성공적으로 '연금술 연구 일지' 연성 및 군부 제출이 완료되었습니다! (주문번호: ${orderUid})`,
    });
  } catch (error) {
    console.error("❌ 출판 과정 중 오류 발생:", error.message);
    if (error.details)
      console.log("🔍 에러 상세:", JSON.stringify(error.details, null, 2));

    res
      .status(500)
      .json({
        success: false,
        message: "출판 실패: 등가교환의 법칙에 어긋났습니다.",
      });
  }
});

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
