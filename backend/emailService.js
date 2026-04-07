/**
 * File: emailService.js
 * Description: Nodemailer 기반 상태 알림 이메일 전송 서비스
 */
const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ==========================================
// 1. 주문 영수증 이메일 발송
// ==========================================
async function sendOrderReceiptEmail(userEmail, orderUid, bookUid) {
  const mailOptions = {
    from: `"아메스트리스 센트럴 사령부" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `[주문 확인] 국가 연금술사 연구 일지 연성 완료`,
    html: `
      <div style="font-family: serif; background-color: #121214; color: #d1c7b7; padding: 40px; border: 2px solid #5c4b37; border-radius: 8px;">
        <h2 style="color: #f3e5d8; border-bottom: 1px solid #2a2218; padding-bottom: 10px;">📖 국가 연금술사 연구 일지 발급</h2>
        <p>훌륭한 연성진이었습니다. 귀하의 연구 일지가 사령부에 정상적으로 접수되었습니다.</p>
        <div style="background-color: #0b0b0c; padding: 20px; border-radius: 4px; border: 1px solid #3a2f24; margin: 20px 0;">
          <p><strong>📦 주문 번호:</strong> ${orderUid}</p>
          <p><strong>📚 책 번호:</strong> ${bookUid}</p>
          <p><strong>상태:</strong> 🛠️ 인쇄 준비 중</p>
        </div>
        <p style="text-align: right; margin-top: 40px; font-style: italic; color: #8c7355;">- 센트럴 사령부 기록보관소 -</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ ${userEmail}로 영수증 메일 발송 완료.`);
  } catch (error) {
    console.error(`[EmailService] ❌ Error: 영수증 메일 발송 실패 -`, error);
  }
}

// ==========================================
// 2. 배송 출발 이메일 발송
// ==========================================
async function sendShippingEmail(userEmail, orderUid, trackingNumber) {
  const mailOptions = {
    from: `"아메스트리스 센트럴 사령부" <${process.env.EMAIL_USER}>`,
    to: userEmail,
    subject: `[배송 출발] 국가 연금술사 연구 일지 출고 안내`,
    html: `
      <div style="font-family: serif; background-color: #121214; color: #d1c7b7; padding: 40px; border: 2px solid #5c4b37; border-radius: 8px;">
        <h2 style="color: #68d391; border-bottom: 1px solid #2a2218; padding-bottom: 10px;">🚚 물자 배송 출발</h2>
        <p>기다리시던 연구 일지가 인쇄를 마치고 사령부에서 출고되었습니다.</p>
        <div style="background-color: #0b0b0c; padding: 20px; border-radius: 4px; border: 1px solid #3a2f24; margin: 20px 0;">
          <p><strong>📦 주문 번호:</strong> ${orderUid}</p>
          <p><strong>🚀 송장 번호:</strong> ${trackingNumber}</p>
        </div>
        <p style="text-align: right; margin-top: 40px; font-style: italic; color: #8c7355;">- 센트럴 사령부 보급창고 -</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EmailService] ✅ ${userEmail}로 배송 알림 메일 발송 완료.`);
  } catch (error) {
    console.error(`[EmailService] ❌ Error: 배송 알림 메일 발송 실패 -`, error);
  }
}

module.exports = { sendOrderReceiptEmail, sendShippingEmail };
