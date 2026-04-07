// backend/index.js
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

app.use(cors());
app.use((req, res, next) => {
  if (req.originalUrl === "/api/webhook/sweetbook") {
    next(); // 웹훅은 원본 그대로 통과시킴 (아래 라우터의 express.raw가 처리)
  } else {
    express.json()(req, res, next);
  }
});

// ==========================================
// 1. 대화 전용 API
// ==========================================
app.post("/api/chat", async (req, res) => {
  // 🚨 프론트엔드에서 고유 sessionId를 넘겨준다고 가정 (없으면 기본값 할당)
  const { sessionId = "guest-session", message, turn } = req.body;

  // playWithGM 함수에 sessionId를 첫 번째 인자로 꽂아줍니다.
  const gmResponse = await playWithGM(sessionId, message, turn);
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
    res.status(500).json({
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

    // 🚨 잔액 부족 에러를 잡아서 402 상태 코드로 응답
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

// ==========================================
// 🚨 [새로 추가] 주문 취소 API
// ==========================================
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
      message: "🗑️ 성공적으로 주문이 취소되고 지원금이 환불되었습니다.",
    });
  } catch (error) {
    console.error("❌ 주문 취소 오류:", error.message);

    // 🚨 제작 시작으로 인한 취소 불가 에러 처리
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
// 5. 스위트북 웹훅 수신 API (Inbound Webhook)
// ==========================================
// 🚨 개발자님이 제시하신 정석대로 express.raw를 사용하여 원본 버퍼를 직접 받습니다.
app.post(
  "/api/webhook/sweetbook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const signature = req.headers["x-webhook-signature"] || "";
      const timestamp = req.headers["x-webhook-timestamp"] || "";
      const secret = process.env.SWEETBOOK_WEBHOOK_SECRET;

      // express.raw() 덕분에 req.body는 순수한 버퍼(Buffer) 상태입니다. 문자열로 바꿉니다.
      const payload = req.body.toString("utf8");

      // 1. 보안 검증 (시크릿 키가 있을 때만 가동)
      if (secret) {
        const expectedSignature = `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex")}`;

        // 🚨 타이밍 공격(Timing Attack)을 방어하는 가장 안전한 검증 방식
        const sigBuffer = Buffer.from(signature);
        const expectedSigBuffer = Buffer.from(expectedSignature);

        // timingSafeEqual은 길이가 다르면 에러를 뱉으므로 길이 먼저 체크
        const isValid =
          sigBuffer.length === expectedSigBuffer.length &&
          crypto.timingSafeEqual(sigBuffer, expectedSigBuffer);

        if (!isValid) {
          console.log(
            "\n❌ [웹훅 방어] 위조된 스위트북 통신 접근 차단! (서명 불일치)",
          );
          return res.status(401).send("Invalid signature");
        }

        console.log("✅ [웹훅 방어] 서명 검증 완벽하게 통과!");
      }

      // 2. 검증이 끝났으니 문자열을 다시 JSON 객체로 파싱합니다.
      const event = JSON.parse(payload);

      // 스크린샷 1, 2번에 명시된 정확한 이벤트 타입 변수명
      const eventType = event.event_type;

      // ==========================================
      // 🚨 [추가] 스위트북이 진짜로 무슨 데이터를 보냈는지 전부 까봅니다!
      console.log("\n📦 [웹훅 페이로드 원본]:", JSON.stringify(event, null, 2));
      // ==========================================

      console.log(`\n🔔 [사령부 통신] 이벤트 수신: ${eventType || "unknown"}`);

      // 3. 이벤트 종류에 따른 분기 처리
      switch (eventType) {
        case "order.paid":
          if (event.test) {
            console.log(`  🧪 [테스트: 결제 완료] 사령부 테스트 통신 수신`);
            console.log(`     - 메시지: ${event.data?.message}`);
          } else {
            console.log(
              `  💳 [결제 완료] 인쇄가 시작됩니다. 주문번호: ${event.data?.order_uid}`,
            );
          }
          break;

        case "order.shipped":
          if (event.test) {
            console.log(`  🧪 [테스트: 배송 출발] 사령부 테스트 통신 수신`);
            console.log(`     - 메시지: ${event.data?.message}`);
            console.log(`     ✉️ (테스트) 배송 알림 이메일을 발송합니다.`);
            sendShippingEmail(
              process.env.EMAIL_USER,
              "[테스트_주문번호_999]",
              "[테스트_가상송장_12345]",
            );
          } else {
            console.log(`  🚀 [배송 출발] 연금술 일지가 출고되었습니다!`);
            console.log(`     - 주문번호: ${event.data?.order_uid}`);
            console.log(`     - 송장번호: ${event.data?.tracking_number}`);
            sendShippingEmail(
              process.env.EMAIL_USER,
              event.data?.order_uid,
              event.data?.tracking_number,
            );
          }
          break;

        case "order.confirmed":
          if (event.test) {
            console.log(`  🧪 [테스트: 제작 확정] 사령부 테스트 통신 수신`);
            console.log(`     - 메시지: ${event.data?.message}`);
          } else {
            console.log(
              `  🛠️ [제작 확정] 인쇄가 배정되었습니다. (출력일: ${event.data?.print_day})`,
            );
          }
          break;

        case "order.status_changed":
          if (event.test) {
            console.log(`  🧪 [테스트: 상태 변경] 사령부 테스트 통신 수신`);
            console.log(`     - 메시지: ${event.data?.message}`);
          } else {
            console.log(
              `  🔄 [상태 변경] ${event.data?.previous_status} -> ${event.data?.new_status}`,
            );
          }
          break;

        case "order.cancelled":
          if (event.test) {
            console.log(`  🧪 [테스트: 주문 취소] 사령부 테스트 통신 수신`);
            console.log(`     - 메시지: ${event.data?.message}`);
          } else {
            console.log(
              `  ❌ [주문 취소] 주문번호: ${event.data?.order_uid} (사유: ${event.data?.cancel_reason})`,
            );
          }
          break;

        default:
          console.log(
            `  ⚠️ [알 수 없는 이벤트] ${eventType} (테스트 여부: ${event.test})`,
          );
      }

      res.status(200).send("OK");
    } catch (err) {
      console.error("❌ [웹훅 처리 에러]:", err.message);
      res.status(400).send("Invalid Request");
    }
  },
);

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
