/**
 * File: Header.jsx
 * Description: 상단 타이틀 바 컴포넌트 (강철의 연금술사 테마 유지)
 */

// ==========================================
// 1. 헤더 UI 컴포넌트
// ==========================================
export default function Header() {
  return (
    <div className="app-header">
      <h1 className="app-title">국가 연금술사 연구 일지</h1>
      <p className="app-subtitle">The Fullmetal Alchemist Visual Novel</p>
      <div className="app-divider" />
    </div>
  );
}
