/**
 * File: BottomAction.jsx
 * Description: 유저 선택지, 출판, 주문 및 취소 액션을 관리하는 하단 컨트롤러 컴포넌트
 */

// ==========================================
// 1. 하단 액션 컴포넌트 (상태에 따른 조건부 렌더링)
// ==========================================
export default function BottomAction({
  isFinished,
  bookUid,
  orderUid,
  choices,
  isGeneratingText,
  isPublishing,
  isOrdering,
  isCanceling,
  onChoiceSelect,
  onShowPreview,
  onOrder,
  onCancelOrder,
}) {
  // [진행 중] 선택지가 남아있는 경우
  if (!isFinished) {
    return (
      <div className="choices-container">
        {choices.map((choice, idx) => (
          <button
            key={idx}
            className="choice-btn"
            disabled={isGeneratingText}
            onClick={() => onChoiceSelect(choice)}
          >
            {choice}
          </button>
        ))}
      </div>
    );
  }

  // [챕터 완료] 책뼈대(BookUID) 생성 전 - 출판 미리보기 유도
  if (!bookUid) {
    return (
      <button
        className="action-btn publish-btn"
        onClick={onShowPreview}
        disabled={isPublishing}
      >
        {isPublishing
          ? "진리의 문에서 책을 엮는 중..."
          : "출판 전 연성진 검토 (미리보기)"}
      </button>
    );
  }

  // [출판 완료] 주문접수(OrderUID) 전 - 인쇄 신청 유도
  if (!orderUid) {
    return (
      <button
        className="action-btn order-btn"
        onClick={onOrder}
        disabled={isOrdering}
      >
        {isOrdering
          ? "사령부에 주문 접수 중..."
          : "센트럴 사령부에 인쇄 요청하기 (주문)"}
      </button>
    );
  }

  // [주문 완료] 완료 메시지 및 주문 취소(비상탈출) 유도
  return (
    <div className="fade-in order-success-container">
      <div className="success-box">
        국가 연금술사 사령부로 주문이 완료되었습니다. <br />
        <span>(주문번호: {orderUid})</span>
      </div>
      <button
        className="cancel-btn"
        onClick={onCancelOrder}
        disabled={isCanceling}
      >
        {isCanceling ? "취소 요청 중..." : "비상탈출 (인쇄 주문 취소하기)"}
      </button>
    </div>
  );
}
