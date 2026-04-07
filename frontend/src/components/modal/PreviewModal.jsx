/**
 * File: PreviewModal.jsx
 * Description: 출판 전 연성된 이미지(일지)를 확인하고 확정하는 미리보기 모달 컴포넌트
 */

// ==========================================
// 1. 모달 UI 컴포넌트
// ==========================================
export default function PreviewModal({ messages, onClose, onPublish }) {
  // 생성된 이미지가 존재하는 턴만 필터링하여 갤러리화
  const galleryImages = messages.filter((msg) => msg.imageUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>출판 전 수집된 일지 (총 {galleryImages.length}장)</h2>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body novel-scroll">
          <div className="gallery-grid">
            {galleryImages.map((msg, idx) => (
              <div key={idx} className="gallery-item">
                <img src={msg.imageUrl} alt={`Scene ${idx + 1}`} />
                <p>제 {idx + 1} 장</p>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="choice-btn modal-btn" onClick={onClose}>
            닫기
          </button>
          <button
            className="action-btn publish-btn modal-btn"
            onClick={onPublish}
          >
            최종 출판하기
          </button>
        </div>
      </div>
    </div>
  );
}
