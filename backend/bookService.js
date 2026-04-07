// backend/bookService.js
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: process.env.SWEETBOOK_ENV,
});

async function createAlchemistBook(coverImageUrl, imageUrls) {
  console.log("[1/3] 연금술 연구 일지(책 뼈대) 연성 중...");
  const book = await client.books.create({
    bookSpecUid: "SQUAREBOOK_HC",
    title: "국가 연금술사 연구 일지: 진리를 향한 첫걸음",
    creationType: "TEST",
  });
  const bookUid = book.bookUid || book.uid;
  console.log(`✅ 책 생성 완료: ${bookUid}`);

  console.log("[2/3] 표지 및 내지 데이터 조립 중...");
  const COVER_TEMPLATE_UID = "4Fy1mpIlm1ek";
  const IMAGE_TEMPLATE_UID = "79LHkH32MLH1";
  const BLANK_TEMPLATE_UID = "1zWsJbGghVO4";

  // 표지 삽입
  await client.covers.create(bookUid, COVER_TEMPLATE_UID, {
    coverPhoto: coverImageUrl,
    subtitle: "국가 연금술사 연구 일지",
    dateRange: "아메스트리스력 1914년",
  });
  console.log("✅ 표지 연성 완료");

  // ==========================================
  // 🚨 1. 최대 페이지(130장) 제한 적용 (초과 시 잘라내기)
  // ==========================================
  if (imageUrls.length > 130) {
    console.log(
      `⚠️ [경고] 최대 규격(130장)을 초과하여, 앞의 130장까지만 연성합니다.`,
    );
  }

  // 130장까지만 안전하게 잘라냅니다. (130장 이하면 원본 그대로 유지됨)
  const safeImageUrls = imageUrls.slice(0, 130);

  console.log(
    `✅ 확정된 이미지(${safeImageUrls.length}개)를 포토북 내지로 삽입합니다...`,
  );

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // 사진 내지 삽입
  for (let i = 0; i < safeImageUrls.length; i++) {
    const imgUrl = safeImageUrls[i];
    await client.contents.insert(
      bookUid,
      IMAGE_TEMPLATE_UID,
      {
        dayLabel: "아메스트리스력 1914년",
        photo: imgUrl,
        hasDayLabel: true,
      },
      { breakBefore: "page" },
    );
    await sleep(100);
  }

  // ==========================================
  // 🚨 2. 최소 페이지(24장) 미달 방지 (음수 방지)
  // ==========================================
  const minimumPagesNeeded = Math.max(0, 24 - safeImageUrls.length);

  if (minimumPagesNeeded > 0) {
    console.log(
      `✅ 최소 두께(24p)를 맞추기 위해 빈 내지 ${minimumPagesNeeded}장을 추가합니다...`,
    );
    for (let i = 0; i < minimumPagesNeeded; i++) {
      await client.contents.insert(
        bookUid,
        BLANK_TEMPLATE_UID,
        {},
        { breakBefore: "page" },
      );
      await sleep(100);
    }
  } else {
    console.log(`✅ ${safeImageUrls.length}페이지의 서사가 완성되었습니다!`);
  }

  console.log("[3/3] 책 상태 최종화(Finalize) 중...");
  await client.books.finalize(bookUid);
  console.log("✅ 책 최종화 완료");

  // 다음 단계(주문)를 위해 완성된 책의 UID를 반환
  return bookUid;
}

module.exports = { createAlchemistBook };
