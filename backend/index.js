/**
 * File: index.js
 * Description: 아메스트리스 센트럴 사령부 메인 서버 (Express)
 */
const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const { playWithGM, generateCoverPromptByStory } = require("./aiService");
const { generateSceneImage } = require("./imageService");
const { createAlchemistBook } = require("./bookService");
const { orderAlchemistBook, cancelAlchemistOrder } = require("./orderService");
const { sendShippingEmail } = require("./emailService");

const app = express();
const port = 3000;

// ==========================================
// 1. 글로벌 미들웨어 설정
// ==========================================
app.use(cors());
app.use((req, res, next) => {
  // 웹훅 라우터는 원본(Raw) 데이터를 유지하기 위해 예외 처리
  if (req.originalUrl === "/api/webhook/sweetbook") {
    next();
  } else {
    express.json()(req, res, next);
  }
});

// ==========================================
// 2. 대화 및 이미지 생성 API
// ==========================================
app.post("/api/chat", async (req, res) => {
  const { sessionId = "guest-session", message, turn } = req.body;
  const gmResponse = await playWithGM(sessionId, message, turn);
  res.json(gmResponse);
});

app.post("/api/image", async (req, res) => {
  const { imagePrompt } = req.body;
  const imageUrl = await generateSceneImage(imagePrompt);
  res.json({ imageUrl });
});

// ==========================================
// 3. 출판 API (책 뼈대 생성 및 조립)
// ==========================================
app.post("/api/publish", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || messages.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "대화 내역이 없습니다." });
    }

    console.log(
      "[Server] ℹ️ [출판 1/3] 스토리를 바탕으로 표지 프롬프트 연성 중...",
    );
    const coverPrompt = await generateCoverPromptByStory(messages);

    console.log("[Server] ℹ️ [출판 2/3] 표지 전용 고화질 이미지 연성 중...");
    const coverImageUrl = await generateSceneImage(coverPrompt);

    console.log("[Server] ℹ️ [출판 3/3] 내지 이미지 목록 조립 중...");
    const sceneImageUrls = messages
      .filter((msg) => msg.imageUrl)
      .map((msg) => msg.imageUrl);

    const completedBookUid = await createAlchemistBook(
      coverImageUrl,
      sceneImageUrls,
    );

    res.json({
      success: true,
      bookUid: completedBookUid,
      message: `완벽한 연구 일지가 연성되었습니다! (Book UID: ${completedBookUid})`,
    });
  } catch (error) {
    console.error("[Server] ❌ Error: 출판 API 처리 중 오류 발생 -", error);
    res.status(500).json({
      success: false,
      message: "책 연성 실패: 등가교환의 법칙에 어긋났습니다.",
    });
  }
});

// ==========================================
// 4. 주문 및 취소 API
// ==========================================
app.post("/api/order", async (req, res) => {
  try {
    const { bookUid } = req.body;

    if (!bookUid) {
      return res
        .status(400)
        .json({ success: false, message: "책 ID(bookUid)가 누락되었습니다." });
    }

    console.log(`[Server] ℹ️ [주문] ${bookUid} 책 주문 요청 수신됨`);
    const orderUid = await orderAlchemistBook(bookUid);

    res.json({
      success: true,
      orderUid: orderUid,
      message: `인쇄 및 배송 주문 접수 완료! (주문번호: ${orderUid})`,
    });
  } catch (error) {
    console.error("[Server] ❌ Error: 주문 API 처리 중 오류 발생 -", error);

    if (error.message === "INSUFFICIENT_CREDITS") {
      return res.status(402).json({
        success: false,
        message: "사령부 지원금(충전금)이 부족하여 인쇄를 진행할 수 없습니다.",
      });
    }
    res
      .status(500)
      .json({ success: false, message: "주문 실패: 사령부 통신 장애." });
  }
});

app.post("/api/order/cancel", async (req, res) => {
  try {
    const { orderUid } = req.body;

    if (!orderUid) {
      return res
        .status(400)
        .json({ success: false, message: "주문 ID가 누락되었습니다." });
    }

    await cancelAlchemistOrder(orderUid);

    res.json({
      success: true,
      message: "성공적으로 주문이 취소되고 지원금이 환불되었습니다.",
    });
  } catch (error) {
    console.error(
      "[Server] ❌ Error: 주문 취소 API 처리 중 오류 발생 -",
      error.message,
    );

    if (error.message === "NON_CANCELLABLE_STATUS") {
      return res.status(400).json({
        success: false,
        message: "취소 불가: 이미 연성(제작)이 시작되어 돌이킬 수 없습니다.",
      });
    }
    res.status(500).json({
      success: false,
      message: "취소 실패: 알 수 없는 오류가 발생했습니다.",
    });
  }
});

// ==========================================
// 5. 웹훅 수신 API (스위트북 상태 동기화)
// ==========================================
app.post(
  "/api/webhook/sweetbook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const signature = req.headers["x-webhook-signature"] || "";
      const timestamp = req.headers["x-webhook-timestamp"] || "";
      const secret = process.env.SWEETBOOK_WEBHOOK_SECRET;
      const payload = req.body.toString("utf8");

      // 서명 검증 (보안)
      if (secret) {
        const expectedSignature = `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")}`;
        const sigBuffer = Buffer.from(signature);
        const expectedSigBuffer = Buffer.from(expectedSignature);

        const isValid =
          sigBuffer.length === expectedSigBuffer.length &&
          crypto.timingSafeEqual(sigBuffer, expectedSigBuffer);

        if (!isValid) {
          console.log(
            "\n[Server] ❌ Error: [웹훅 방어] 위조된 스위트북 통신 접근 차단 (서명 불일치)",
          );
          return res.status(401).send("Invalid signature");
        }
        console.log("[Server] ✅ [웹훅 방어] 서명 검증 완벽하게 통과!");
      }

      const event = JSON.parse(payload);
      const eventType = event.event_type;

      console.log(
        "\n[Server] 📦 [웹훅 페이로드 원본]:",
        JSON.stringify(event, null, 2),
      );
      console.log(`\n[Server] 🔔 이벤트 수신: ${eventType || "unknown"}`);

      // 이벤트 분기 처리
      switch (eventType) {
        case "order.paid":
          if (event.test) {
            console.log(
              `[Server] 🧪 [테스트: 결제 완료] 메시지: ${event.data?.message}`,
            );
          } else {
            console.log(
              `[Server] 💳 [결제 완료] 인쇄 시작. 주문번호: ${event.data?.order_uid}`,
            );
          }
          break;

        case "order.shipped":
          if (event.test) {
            console.log(
              `[Server] 🧪 [테스트: 배송 출발] 메시지: ${event.data?.message}`,
            );
            sendShippingEmail(
              process.env.EMAIL_USER,
              "[테스트_주문번호_999]",
              "[테스트_가상송장_12345]",
            );
          } else {
            console.log(
              `[Server] 🚀 [배송 출발] 주문번호: ${event.data?.order_uid} | 송장번호: ${event.data?.tracking_number}`,
            );
            sendShippingEmail(
              process.env.EMAIL_USER,
              event.data?.order_uid,
              event.data?.tracking_number,
            );
          }
          break;

        case "order.confirmed":
          if (event.test) {
            console.log(
              `[Server] 🧪 [테스트: 제작 확정] 메시지: ${event.data?.message}`,
            );
          } else {
            console.log(
              `[Server] 🛠️ [제작 확정] 인쇄 배정 (출력일: ${event.data?.print_day})`,
            );
          }
          break;

        case "order.status_changed":
          if (event.test) {
            console.log(
              `[Server] 🧪 [테스트: 상태 변경] 메시지: ${event.data?.message}`,
            );
          } else {
            console.log(
              `[Server] 🔄 [상태 변경] ${event.data?.previous_status} -> ${event.data?.new_status}`,
            );
          }
          break;

        case "order.cancelled":
          if (event.test) {
            console.log(
              `[Server] 🧪 [테스트: 주문 취소] 메시지: ${event.data?.message}`,
            );
          } else {
            console.log(
              `[Server] ❌ [주문 취소] 주문번호: ${event.data?.order_uid} (사유: ${event.data?.cancel_reason})`,
            );
          }
          break;

        default:
          console.log(
            `[Server] ⚠️ [알 수 없는 이벤트] ${eventType} (테스트 여부: ${event.test})`,
          );
      }

      res.status(200).send("OK");
    } catch (err) {
      console.error("[Server] ❌ Error: 웹훅 처리 실패 -", err.message);
      res.status(400).send("Invalid Request");
    }
  },
);

// 서버 실행
app.listen(port, () => {
  console.log(
    `[Server] ✅ 서버가 http://localhost:${port} 에서 실행 중입니다.`,
  );
});
