/**
 * File: orderService.js
 * Description: 스위트북 결제/주문 및 주문 취소 서비스
 */
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
const { sendOrderReceiptEmail } = require("./emailService");
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: process.env.SWEETBOOK_ENV,
});

// ==========================================
// 1. 책 주문 생성 및 결제
// ==========================================
async function orderAlchemistBook(bookUid) {
  console.log("[OrderService] ℹ️ [1/3] 사령부 지원금 잔액 확인 중...");
  const balance = await client.credits.getBalance();

  if (balance.balance < 50000) {
    await client.credits.sandboxCharge(100000, "연금술 연구 지원금 충전");
    console.log("[OrderService] ✅ 지원금 충전 완료");
  } else {
    console.log(`[OrderService] ✅ 지원금 잔액 충분 (${balance.balance}원)`);
  }

  console.log("[OrderService] ℹ️ [2/3] 출판 견적 조회 중...");
  const orderItems = [{ bookUid: bookUid, quantity: 1 }];
  const estimate = await client.orders.estimate({ items: orderItems });

  if (!estimate.creditSufficient) {
    console.log(
      "[OrderService] ❌ Error: [결제 실패] 사령부 지원금이 부족합니다.",
    );
    throw new Error("INSUFFICIENT_CREDITS");
  }
  console.log(
    `[OrderService] ✅ 견적 확인 완료: 총 ${estimate.totalAmount}원 차감 예정`,
  );

  console.log("[OrderService] ℹ️ [3/3] 센트럴 사령부에 주문 접수 중...");
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
      // 이중 결제 방지용 멱등성 키 설정
      idempotencyKey: `order-${bookUid}-${Date.now()}`,
    },
  );

  console.log(`[OrderService] ✅ 주문 접수 완료 (주문번호: ${order.orderUid})`);
  sendOrderReceiptEmail(process.env.EMAIL_USER, order.orderUid, bookUid);

  return order.orderUid;
}

// ==========================================
// 2. 책 주문 취소
// ==========================================
async function cancelAlchemistOrder(orderUid) {
  console.log(
    `[OrderService] ℹ️ 주문번호 ${orderUid} 취소 가능 여부 확인 중...`,
  );

  const orderInfo = await client.orders.get(orderUid);
  const currentStatus = orderInfo.orderStatus || orderInfo.status;
  console.log(`[OrderService] 🔍 현재 주문 상태: ${currentStatus}`);

  const cancellableStatuses = ["PAID", "PDF_READY", 20, 25];

  if (!cancellableStatuses.includes(currentStatus)) {
    console.log(
      `[OrderService] ❌ Error: [취소 불가] 이미 연성이 시작된 상태(${currentStatus})입니다.`,
    );
    throw new Error("NON_CANCELLABLE_STATUS");
  }

  console.log(`[OrderService] ✅ 상태 검증 완료. 취소(비상탈출)를 진행합니다.`);
  const result = await client.orders.cancel(orderUid, {
    cancelReason: "연금술사의 변심 (비상탈출)",
  });

  console.log(`[OrderService] ✅ 취소 및 환불 완료`);
  return result;
}

module.exports = { orderAlchemistBook, cancelAlchemistOrder };
