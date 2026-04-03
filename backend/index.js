const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. 기본 연결 확인용
app.get("/", (req, res) => {
  res.send("AI 맞춤형 판타지 소설 백엔드 서버 작동 중! 🗡️");
});

// ==========================================
// 2. 게임 마스터(GM) 대화 API (더미 데이터)
app.post("/api/publish", async (req, res) => {
  try {
    const apiKey = process.env.SWEETBOOK_API_KEY;
    if (!apiKey) throw new Error("API Key가 없습니다.");

    // 1. SDK 초기화
    const sweetbookClient = new Sweetbook(apiKey);

    // 2. 판타지 소설 더미 데이터 구성 (실제로는 프론트에서 받은 대화 내역 사용)
    const novelData = {
      title: "기억을 잃은 용사의 서사시",
      pages: [
        { imageUrl: "https://.../forest.jpg", text: "어둠이 짙게 깔린 숲..." },
        { imageUrl: "https://.../goblin.jpg", text: "고블린이 나타났다!" },
      ],
      // (주의: 실제 SDK 문서의 프로퍼티명에 맞게 수정하세요)
    };

    // 3. Books API 호출 (책 생성)
    console.log("책 생성 중...");
    const bookResponse = await sweetbookClient.books.create(novelData);
    const createdBookId = bookResponse.id; // 생성된 책의 ID 추출

    // 4. Orders API 호출 (주문 생성 - 필수 조건!)
    console.log("주문 접수 중...");
    const orderResponse = await sweetbookClient.orders.create({
      bookId: createdBookId,
      shippingAddress: "환상세계의 용사님 댁",
    });

    res.json({
      success: true,
      message: "📚 판타지 소설 출판 및 주문이 완료되었습니다!",
    });
  } catch (error) {
    console.error("출판 에러:", error);
    res.status(500).json({ success: false, message: "출판 실패" });
  }
});
// ==========================================

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
