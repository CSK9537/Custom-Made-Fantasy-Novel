/**
 * File: bookService.js
 * Description: 스위트북 API를 활용한 포토북(연구 일지) 뼈대 및 내지 조립 서비스
 */
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: process.env.SWEETBOOK_ENV,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ==========================================
// 1. 포토북 조립 (표지 및 내지 삽입)
// ==========================================
async function createAlchemistBook(coverImageUrl, imageUrls) {
  console.log("[BookService] ℹ️ [1/3] 연금술 연구 일지(책 뼈대) 연성 중...");

  const book = await client.books.create({
    bookSpecUid: "SQUAREBOOK_HC",
    title: "국가 연금술사 연구 일지: 진리를 향한 첫걸음",
    creationType: "TEST",
  });

  const bookUid = book.bookUid || book.uid;
  console.log(`[BookService] ✅ 책 생성 완료 (Book UID: ${bookUid})`);

  console.log("[BookService] ℹ️ [2/3] 표지 및 내지 데이터 조립 중...");

  const COVER_TEMPLATE_UID = "4Fy1mpIlm1ek";
  const IMAGE_TEMPLATE_UID = "79LHkH32MLH1";
  const BLANK_TEMPLATE_UID = "1zWsJbGghVO4";

  // 표지 연성
  await client.covers.create(bookUid, COVER_TEMPLATE_UID, {
    coverPhoto: coverImageUrl,
    subtitle: "국가 연금술사 연구 일지",
    dateRange: "아메스트리스력 1914년",
  });
  console.log("[BookService] ✅ 표지 연성 완료");

  // 규격 방어 1: 최대 130장 초과 시 안전하게 잘라내기
  if (imageUrls.length > 130) {
    console.log(
      `[BookService] ⚠️ 경고: 최대 규격(130장)을 초과하여 앞의 130장까지만 연성합니다.`,
    );
  }

  const safeImageUrls = imageUrls.slice(0, 130);
  console.log(
    `[BookService] ℹ️ 확정된 이미지(${safeImageUrls.length}개) 내지 삽입 시작...`,
  );

  // 내지 연성 (Rate Limit 방어를 위해 100ms 딜레이 적용)
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

  // 규격 방어 2: 최소 규격(24장) 미달 시 빈 페이지 보충
  const minimumPagesNeeded = Math.max(0, 24 - safeImageUrls.length);

  if (minimumPagesNeeded > 0) {
    console.log(
      `[BookService] ℹ️ 최소 두께(24p)를 맞추기 위해 빈 내지 ${minimumPagesNeeded}장을 추가합니다...`,
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
    console.log(
      `[BookService] ✅ ${safeImageUrls.length}페이지의 서사가 완성되었습니다!`,
    );
  }

  console.log("[BookService] ℹ️ [3/3] 책 상태 최종화(Finalize) 중...");
  await client.books.finalize(bookUid);

  console.log("[BookService] ✅ 책 최종화 완료");

  return bookUid;
}

module.exports = { createAlchemistBook };
