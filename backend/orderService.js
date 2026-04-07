// backend/orderService.js
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
const { sendOrderReceiptEmail } = require("./emailService"); // 🚨 이거 추가!
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: "sandbox",
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
      // 🚨 [핵심] 이중 결제 방지용 멱등성 키! (책 ID를 키로 사용하여 중복 주문 원천 차단)
      idempotencyKey: `order-${bookUid}`,
    },
  );

  console.log(`✅ 주문 접수 완료! 주문번호: ${order.orderUid}`);

  // ==========================================
  // 🚨 [새로 추가] 주문 성공 직후 내 이메일로 영수증 발송!
  // ==========================================
  sendOrderReceiptEmail(process.env.EMAIL_USER, order.orderUid, bookUid);

  return order.orderUid;
}

// 🚨 [추가] 주문 취소(비상탈출) 함수
async function cancelAlchemistOrder(orderUid) {
  console.log(`[주문 취소] 주문번호 ${orderUid} 취소 요청 중...`);

  // SDK의 취소 메서드 호출
  const result = await client.orders.cancel(orderUid, {
    cancelReason: "연금술사의 변심 (비상탈출)",
  });

  console.log(`✅ 취소 및 환불 완료!`);
  return result;
}

// 모듈 내보내기에 취소 함수도 추가합니다.
module.exports = { orderAlchemistBook, cancelAlchemistOrder };
