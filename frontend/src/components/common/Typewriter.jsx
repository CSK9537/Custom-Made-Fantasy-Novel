/**
 * File: Typewriter.jsx
 * Description: 게임 마스터(GM)의 대사를 한 글자씩 출력하는 타이핑 이펙트 컴포넌트
 */
import { useState, useEffect } from "react";

// ==========================================
// 1. 타이핑 애니메이션 컴포넌트
// ==========================================
export default function Typewriter({ text, speed = 40, onTyping }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

  // ==========================================
  // 2. 타이머 기반 타이핑 제어 로직
  // ==========================================
  useEffect(() => {
    let i = 0;
    setIsTyping(true);
    setDisplayedText("");

    const timer = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (onTyping) onTyping();
      if (i >= text.length) {
        clearInterval(timer);
        setIsTyping(false);
      }
    }, speed);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed]);

  // ==========================================
  // 3. UI 렌더링 로직
  // ==========================================
  return (
    <div className="typewriter-text">
      {displayedText.split("\n").map((line, idx, arr) => (
        <p key={idx}>
          {line}
          {isTyping && idx === arr.length - 1 && (
            <span className="blinking-cursor">|</span>
          )}
        </p>
      ))}
    </div>
  );
}
