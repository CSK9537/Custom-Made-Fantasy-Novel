// backend/bookService.js
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: "sandbox",
});

async function createAlchemistBook() {
  console.log("[1/3] 연금술 연구 일지(책 뼈대) 연성 중...");
  const book = await client.books.create({
    bookSpecUid: "SQUAREBOOK_HC",
    title: "국가 연금술사 연구 일지: 진리를 향한 첫걸음",
    creationType: "TEST",
  });
  const bookUid = book.bookUid || book.uid;
  console.log(`✅ 책 생성 완료: ${bookUid}`);

  console.log("[2/3] 표지 및 내지 데이터 조립 중...");
  const COVER_TEMPLATE_UID = "1Es0DP4oARn8";
  const CONTENT_TEMPLATE_UID = "1zWsJbGghVO4";

  // 표지 삽입
  await client.covers.create(bookUid, COVER_TEMPLATE_UID, {
    coverPhoto: "https://picsum.photos/seed/cover/800/600",
    subtitle: "국가 연금술사 연구 일지",
    dateRange: "아메스트리스력 1914년",
  });
  console.log("✅ 표지 연성 완료");

  // 빈내지 삽입 (파라미터 없음)
  for (let i = 1; i <= 24; i++) {
    await client.contents.insert(
      bookUid,
      CONTENT_TEMPLATE_UID,
      { text: i },
      { breakBefore: "page" },
    );
    console.log("✅ 내지 연성 완료");
  }

  console.log("[3/3] 책 상태 최종화(Finalize) 중...");
  await client.books.finalize(bookUid);
  console.log("✅ 책 최종화 완료");

  // 다음 단계(주문)를 위해 완성된 책의 UID를 반환
  return bookUid;
}

module.exports = { createAlchemistBook };
