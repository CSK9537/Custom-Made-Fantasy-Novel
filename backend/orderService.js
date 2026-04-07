// backend/orderService.js
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
const { sendOrderReceiptEmail } = require("./emailService"); // 🚨 이거 추가!
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: process.env.SWEETBOOK_ENV,
});

async function orderAlchemistBook(bookUid) {
  console.log("[1/3] 군부 연구 지원금(Sandbox 잔액) 확인 중...");
  const balance = await client.credits.getBalance();

  if (balance.balance < 50000) {
    await client.credits.sandboxCharge(100000, "연금술 연구 지원금 충전");
    console.log("✅ 지원금 충전 완료");
  } else {
    console.log(`✅ 잔액 충분 (${balance.balance}원)`);
  }

  console.log("[2/3] 출판 견적 조회 중...");
  const orderItems = [{ bookUid: bookUid, quantity: 1 }];

  const estimate = await client.orders.estimate({
    items: orderItems,
  });
  console.log(`✅ 견적 확인 완료: 총 ${estimate.totalAmount}원 차감 예정`);

  // ==========================================
  // 🚨 [지뢰 제거] 충전금 충분 여부 사전 검증
  // ==========================================
  if (!estimate.creditSufficient) {
    console.log("❌ [결제 실패] 사령부 지원금(충전금)이 부족합니다.");
    // 에러를 던져서 프론트엔드로 전달할 수 있게 합니다.
    throw new Error("INSUFFICIENT_CREDITS");
  }

  console.log("[3/3] 센트럴 사령부에 출판(주문) 접수 중...");
  const order = await client.orders.create(
    {
      items: orderItems,
      shipping: {
        recipientName: "에드워드 엘릭",
        recipientPhone: "010-1234-5678",
        postalCode: "12345",
        address1: "아메스트리스 센트럴 시티",
        address2: "국가 연금술사 사령부 4층",
        shippingMemo: "부재 시 머스탱 대령에게 맡겨주세요",
      },
      externalRef: `ALCHEMIST-${bookUid}`,
    },
    {
      // ✅ [수정 후] 책 ID에 현재 시간(밀리초)을 붙여, 취소 후 재주문 시에도 충돌하지 않게 함!
      idempotencyKey: `order-${bookUid}-${Date.now()}`,
    },
  );

  console.log(`✅ 주문 접수 완료! 주문번호: ${order.orderUid}`);

  // ==========================================
  // 🚨 [새로 추가] 주문 성공 직후 내 이메일로 영수증 발송!
  // ==========================================
  sendOrderReceiptEmail(process.env.EMAIL_USER, order.orderUid, bookUid);

  return order.orderUid;
}

// 🚨 [추가/수정] 주문 취소(비상탈출) 함수 + 상태 검증 로직
async function cancelAlchemistOrder(orderUid) {
  console.log(`[주문 취소] 주문번호 ${orderUid} 취소 가능 여부 확인 중...`);

  // 1. 주문 상세 정보 사전 조회
  const orderInfo = await client.orders.get(orderUid);
  // API 응답 구조에 따라 status 또는 orderStatus에 담겨옵니다.
  const currentStatus = orderInfo.orderStatus || orderInfo.status;

  console.log(`  🔍 현재 주문 상태: ${currentStatus}`);

  // 2. 취소 가능 상태 필터링 (PAID: 결제완료, PDF_READY: 인쇄준비완료)
  const cancellableStatuses = ["PAID", "PDF_READY", 20, 25];

  if (!cancellableStatuses.includes(currentStatus)) {
    console.log(
      `❌ [취소 불가] 이미 제작이 시작된 상태(${currentStatus})입니다.`,
    );
    throw new Error("NON_CANCELLABLE_STATUS");
  }

  // 3. 검증 통과 시에만 취소 API 호출
  console.log(`✅ 취소 가능 상태 확인 완료. 안전하게 비상탈출을 진행합니다...`);
  const result = await client.orders.cancel(orderUid, {
    cancelReason: "연금술사의 변심 (비상탈출)",
  });

  console.log(`✅ 취소 및 환불 완료!`);
  return result;
}

// 모듈 내보내기에 취소 함수도 추가합니다.
module.exports = { orderAlchemistBook, cancelAlchemistOrder };
