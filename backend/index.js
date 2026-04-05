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

// ==========================================
// 1. 대화 전용 API (텍스트만 1초 만에 반환!)
// ==========================================
app.post("/api/chat", async (req, res) => {
  const { message, turn } = req.body;
  const gmResponse = await playWithGM(message, turn);
  res.json(gmResponse);
});

// ==========================================
// 2. 이미지 생성 전용 API (백그라운드에서 실행)
// ==========================================
app.post("/api/image", async (req, res) => {
  const { imagePrompt } = req.body;
  const imageUrl = await generateSceneImage(imagePrompt);
  res.json({ imageUrl });
});

// ==========================================
// 3. 출판 API (기존 코드와 동일하게 유지!)
// ==========================================
app.post("/api/publish", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || messages.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "대화 내역이 없습니다." });
    }

    console.log("[출판 1/5] 스토리를 바탕으로 표지 연성진 구성 중...");
    const coverPrompt = await generateCoverPromptByStory(messages);

    console.log("[출판 2/5] 표지 전용 고화질 이미지 연성 중...");
    const coverImageUrl = await generateSceneImage(coverPrompt);

    console.log("[출판 3/5] 내지 이미지 목록 조립 중...");
    const sceneImageUrls = messages
      .filter((msg) => msg.imageUrl)
      .map((msg) => msg.imageUrl);

    const completedBookUid = await createAlchemistBook(
      coverImageUrl,
      sceneImageUrls,
    );
    const orderUid = await orderAlchemistBook(completedBookUid);

    res.json({
      success: true,
      message: `📚 성공적으로 '표지까지 완벽한 연구 일지' 연성 완료! (주문번호: ${orderUid})`,
    });
  } catch (error) {
    console.error("❌ 출판 오류:", error);
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
