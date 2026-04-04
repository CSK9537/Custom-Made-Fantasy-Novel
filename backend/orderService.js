// backend/orderService.js
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: "sandbox",
});

async function orderAlchemistBook(bookUid) {
  console.log("[1/2] 군부 연구 지원금(Sandbox 잔액) 확인 중...");
  const balance = await client.credits.getBalance();

  if (balance.balance < 50000) {
    await client.credits.sandboxCharge(100000, "연금술 연구 지원금 충전");
    console.log("✅ 지원금 충전 완료");
  } else {
    console.log(`✅ 잔액 충분 (${balance.balance}원)`);
  }

  console.log("[2/2] 센트럴 사령부에 출판(주문) 접수 중...");
  const order = await client.orders.create({
    items: [{ bookUid: bookUid, quantity: 1 }],
    shipping: {
      recipientName: "에드워드 엘릭",
      recipientPhone: "010-1234-5678",
      postalCode: "12345",
      address1: "아메스트리스 센트럴 시티",
      address2: "국가 연금술사 사령부 4층",
      shippingMemo: "부재 시 머스탱 대령에게 맡겨주세요",
    },
    externalRef: "ALCHEMIST-001",
  });

  console.log(`✅ 주문 접수 완료! 주문번호: ${order.orderUid}`);
  return order.orderUid;
}

module.exports = { orderAlchemistBook };
