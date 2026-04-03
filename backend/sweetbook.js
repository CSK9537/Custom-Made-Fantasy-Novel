// backend/sweetbook.js
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: "sandbox",
});

// 강철의 연금술사 테마 출판 및 주문을 처리하는 함수
async function publishAlchemistNovel() {
  try {
    // 1. 책 뼈대 생성 (01_create_book.js 참고)
    console.log("[1/4] 연금술 연구 일지(책 뼈대) 연성 중...");
    const book = await client.books.create({
      bookSpecUid: "SQUAREBOOK_HC", // 양장본
      title: "국가 연금술사 연구 일지: 진리를 향한 첫걸음",
      creationType: "TEST",
    });
    const bookUid = book.bookUid || book.uid;
    console.log(`✅ 책 생성 완료: ${bookUid}`);

    // ==========================================
    // 🚨 [추가된 부분] 1.5. 표지와 내지 삽입
    // ==========================================
    console.log("[1.5/4] 표지 및 내지 데이터 조립 중...");

    // 주의: 아래 문자열은 스위트북 파트너 포털(또는 API 문서)에서 확인한 실제 템플릿 UID로 반드시 교체해야 합니다!
    const COVER_TEMPLATE_UID = "1Es0DP4oARn8";
    const CONTENT_TEMPLATE_UID = "1zWsJbGghVO4";

    // 1) 표지 삽입 (강철의 연금술사 테마 이미지 적용)
    await client.covers.create(bookUid, COVER_TEMPLATE_UID, {
      coverPhoto: "https://picsum.photos/seed/cover/800/600",
      title: "국가 연금술사 연구 일지",
    });
    console.log("✅ 표지 연성 완료");

    // 2) 내지 삽입 (최소 1페이지 이상 필요)
    await client.contents.insert(
      bookUid,
      CONTENT_TEMPLATE_UID,
      {
        photo: "https://picsum.photos/seed/page1/800/600",
        text: "진리를 쫓는 나의 여정이 드디어 시작되었다. 우로보로스의 흔적을 찾아서...",
      },
      { breakBefore: "page" },
    );
    console.log("✅ 내지 연성 완료");
    // ==========================================

    // 2. 책 최종화 (이 단계를 거쳐야 주문 가능 상태인 'finalized'가 됩니다)
    console.log("[2/4] 책 상태 최종화(Finalize) 중...");
    await client.books.finalize(bookUid);
    console.log("✅ 책 최종화 완료");

    // 3. 잔액 확인 및 자동 충전 (02_order.js 참고)
    console.log("[3/4] 군부 연구 지원금(Sandbox 잔액) 확인 중...");
    const balance = await client.credits.getBalance();
    if (balance.balance < 50000) {
      await client.credits.sandboxCharge(100000, "연금술 연구 지원금 충전");
      console.log("✅ 지원금 충전 완료");
    }

    // 4. 주문 접수 (02_order.js 참고 - shipping 객체 구조 적용)
    console.log("[4/4] 군부에 출판(주문) 접수 중...");
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

    return { success: true, orderUid: order.orderUid };
  } catch (error) {
    console.error("❌ 스위트북 연동 오류:", error.message);
    if (error.details) console.error("상세 오류:", error.details);
    // 숨겨진 상세 에러 내용을 전부 까보기 위해 추가
    console.log("🔍 에러 상세 분석:", JSON.stringify(error, null, 2));
    throw error; // 에러를 라우터로 던짐
  }
}

module.exports = { publishAlchemistNovel };
