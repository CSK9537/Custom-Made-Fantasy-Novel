// backend/index.js
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { playWithGM, generateCoverPromptByStory } = require("./aiService");
const { generateSceneImage } = require("./imageService");
const { createAlchemistBook } = require("./bookService");
const { orderAlchemistBook } = require("./orderService");

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// 1. 대화 전용 API
app.post("/api/chat", async (req, res) => {
  const { message, turn } = req.body;
  const gmResponse = await playWithGM(message, turn);
  res.json(gmResponse);
});

// 2. 이미지 생성 전용 API
app.post("/api/image", async (req, res) => {
  const { imagePrompt } = req.body;
  const imageUrl = await generateSceneImage(imagePrompt);
  res.json({ imageUrl });
});

// ==========================================
// 3. 출판 API (책 뼈대 생성 및 데이터 조립까지만!)
// ==========================================
app.post("/api/publish", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || messages.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "대화 내역이 없습니다." });
    }

    console.log("[출판 1/3] 스토리를 바탕으로 표지 연성진 구성 중...");
    const coverPrompt = await generateCoverPromptByStory(messages);

    console.log("[출판 2/3] 표지 전용 고화질 이미지 연성 중...");
    const coverImageUrl = await generateSceneImage(coverPrompt);

    console.log("[출판 3/3] 내지 이미지 목록 조립 중...");
    const sceneImageUrls = messages
      .filter((msg) => msg.imageUrl)
      .map((msg) => msg.imageUrl);

    // 책을 최종화까지만 하고, 프론트엔드에 bookUid를 넘겨줍니다.
    const completedBookUid = await createAlchemistBook(
      coverImageUrl,
      sceneImageUrls,
    );

    res.json({
      success: true,
      bookUid: completedBookUid, // 🚨 주문을 위해 프론트로 UID 전달
      message: `📚 완벽한 연구 일지가 연성되었습니다! (Book UID: ${completedBookUid})`,
    });
  } catch (error) {
    console.error("❌ 출판 오류:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "책 연성 실패: 등가교환의 법칙에 어긋났습니다.",
      });
  }
});

// ==========================================
// 4. 주문 API (새로 추가됨!)
// ==========================================
app.post("/api/order", async (req, res) => {
  try {
    const { bookUid } = req.body;

    if (!bookUid) {
      return res
        .status(400)
        .json({ success: false, message: "책 ID(bookUid)가 누락되었습니다." });
    }

    console.log(`[주문] ${bookUid} 책 주문 요청 수신됨`);
    const orderUid = await orderAlchemistBook(bookUid);

    res.json({
      success: true,
      orderUid: orderUid,
      message: `📦 인쇄 및 배송 주문 접수 완료! (주문번호: ${orderUid})`,
    });
  } catch (error) {
    console.error("❌ 주문 오류:", error);
    res
      .status(500)
      .json({ success: false, message: "주문 실패: 사령부 통신 장애." });
  }
});

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
