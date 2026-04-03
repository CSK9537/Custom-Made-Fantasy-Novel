// backend/index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

// 방금 만든 서비스 모듈을 불러옵니다.
const { publishAlchemistNovel } = require("./sweetbook");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. 대화 API (기존 코드 그대로 유지)
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
// 2. 출판 API (극도로 깔끔해진 라우터)
// ==========================================
app.post("/api/publish", async (req, res) => {
  try {
    // 분리해둔 비즈니스 로직(sweetbook.js)을 호출하기만 하면 끝!
    const result = await publishAlchemistNovel();

    res.json({
      success: true,
      message: `📚 성공적으로 '연금술 연구 일지' 연성 및 군부 제출이 완료되었습니다! (주문번호: ${result.orderUid})`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "출판 실패: 등가교환의 법칙에 어긋났습니다.",
    });
  }
});

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
