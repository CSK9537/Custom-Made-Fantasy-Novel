const express = require("express");
const cors = require("cors");
require("dotenv").config(); // .env 파일에서 스위트북 API 키 등을 불러옵니다.

const app = express();
const port = 3000;

// 미들웨어 설정
app.use(cors()); // 프론트엔드(Vite, 보통 포트 5173)와의 통신을 위한 CORS 허용
app.use(express.json()); // 프론트엔드에서 보내는 JSON 데이터를 읽기 위한 설정

// 기본 연결 확인용 라우트
app.get("/", (req, res) => {
  res.send("AI 맞춤형 판타지 소설 백엔드 서버가 정상적으로 실행 중입니다! 🦇");
});

// 환경변수 로딩 확인 (보안상 실제 키 값은 출력하지 않고 유무만 확인)
console.log(
  "Sweetbook API Key Load Check:",
  process.env.SWEETBOOK_API_KEY ? "Loaded O" : "Loaded X",
);

// 서버 실행
app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});
