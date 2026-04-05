// backend/bookService.js
const { SweetbookClient } = require("bookprintapi-nodejs-sdk");
require("dotenv").config();

const client = new SweetbookClient({
  apiKey: process.env.SWEETBOOK_API_KEY,
  environment: "sandbox",
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
  // 🚨 대화 중 생성된 이미지들을 진짜 포토북 내지에 찍어내기
  // ==========================================
  console.log(
    `✅ 생성된 이미지(${imageUrls.length}개)를 포토북에 연성합니다...`,
  );

  for (let i = 0; i < imageUrls.length; i++) {
    const imgUrl = imageUrls[i];

    // 사진 내지 삽입 (변수명 'photo'는 템플릿에 맞게 변경!)
    await client.contents.insert(
      bookUid,
      IMAGE_TEMPLATE_UID,
      {
        dayLabel: "아메스트리스력 1914년",
        photo: imgUrl, // 🚨 생성된 이미지 URL을 꽂음!
        hasDayLabel: true,
      },
      { breakBefore: "page" },
    );
  }

  // 빈내지 삽입 (파라미터 없음)
  const remainingPages = 24 - messages.length;
  if (remainingPages > 0) {
    console.log(
      `✅ 최소 두께를 맞추기 위해 빈 내지 ${remainingPages}장을 추가합니다...`,
    );
    for (let i = 0; i < remainingPages; i++) {
      await client.contents.insert(
        bookUid,
        BLANK_TEMPLATE_UID,
        {},
        { breakBefore: "page" },
      );
    }
  }

  console.log("[3/3] 책 상태 최종화(Finalize) 중...");
  await client.books.finalize(bookUid);
  console.log("✅ 책 최종화 완료");

  // 다음 단계(주문)를 위해 완성된 책의 UID를 반환
  return bookUid;
}

module.exports = { createAlchemistBook };
