'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TECHNIQUES, PRIZE_TYPES, MACHINE_TYPES, CORE_PRINCIPLES, TECHNIQUE_GUIDES } from './data';
import { drawNextMove } from './markers';
import { generateTechniqueDiagrams } from './diagrams';

export default function Home() {
  // ===== 화면 상태 =====
  const [screen, setScreen] = useState('home');
  // home → setup → session → guide

  // ===== 세션 상태 (바둑 AI 모드) =====
  const [machineType, setMachineType] = useState('');
  const [prizeType, setPrizeType] = useState('');
  const [sessionMoves, setSessionMoves] = useState([]); // 지금까지의 수 히스토리
  const [currentImage, setCurrentImage] = useState(null);
  const [currentImageBase64, setCurrentImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState('image/jpeg');
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [moveImage, setMoveImage] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingText, setLoadingText] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState(null);

  // ===== 가이드 상태 =====
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentGuide, setCurrentGuide] = useState(null);
  const [guideDiagrams, setGuideDiagrams] = useState([]);

  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const canvasRef = useRef(null);
  const diagramCanvasRef = useRef(null);

  useEffect(() => {
    if (currentGuide && diagramCanvasRef.current) {
      const imgs = generateTechniqueDiagrams(currentGuide, diagramCanvasRef.current);
      setGuideDiagrams(imgs);
    } else {
      setGuideDiagrams([]);
    }
  }, [currentGuide]);

  // ===== 이미지 처리 (클라이언트 리사이즈 → 전송 속도 대폭 향상) =====
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      setCurrentImage(dataUrl); // 원본은 화면 표시용
      setError(null);

      // 클라이언트에서 1024px로 리사이즈 (5MB→200KB, API 전송 3-5초 단축)
      const img = new Image();
      img.onload = () => {
        const MAX = 1024;
        let { width, height } = img;
        let resizedBase64;
        let mediaType;

        if (width <= MAX && height <= MAX) {
          resizedBase64 = dataUrl.split(',')[1];
          mediaType = file.type || 'image/jpeg';
        } else {
          const ratio = Math.min(MAX / width, MAX / height);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(width * ratio);
          canvas.height = Math.round(height * ratio);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resizedBase64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          mediaType = 'image/jpeg';
        }

        setCurrentImageBase64(resizedBase64);
        setImageMediaType(mediaType);

        if (!machineType || !prizeType) {
          setScreen('setup');
        } else {
          runAnalysis(resizedBase64, mediaType);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, [machineType, prizeType]);

  // ===== AI 분석 (SSE 스트리밍 — 실시간 진행률) =====
  const runAnalysis = useCallback(async (base64Override, mediaTypeOverride) => {
    const base64 = base64Override || currentImageBase64;
    const mediaType = mediaTypeOverride || imageMediaType;
    if (!base64) return;

    setIsAnalyzing(true);
    setScreen('session');
    setError(null);
    setLoadingProgress(10);
    setLoadingText('📡 서버 전송 중...');
    setCurrentAnalysis(null);
    setMoveImage(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64,
          imageMediaType: mediaType,
          machineType: MACHINE_TYPES.find((m) => m.id === machineType)?.label || '불명',
          prizeType: PRIZE_TYPES.find((p) => p.id === prizeType)?.label || '불명',
          moveHistory: sessionMoves,
        }),
      });

      // 일반 JSON 에러 응답 처리
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        throw new Error(data.error || '서버 오류');
      }

      // SSE 스트림 읽기
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      const imgSrc = currentImage || `data:${mediaType};base64,${base64}`;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let event;
          try { event = JSON.parse(part.slice(6)); } catch { continue; }

          if (event.status === 'calling_ai') {
            setLoadingProgress(20);
            setLoadingText('🔍 AI 분석 시작...');
          } else if (event.status === 'generating') {
            const pct = Math.min(88, 25 + (event.chars || 0) / 15);
            setLoadingProgress(Math.round(pct));
            setLoadingText('🤖 AI 생성 중...');
          } else if (event.status === 'done') {
            setCurrentAnalysis(event.analysis);
            setLoadingProgress(100);
            setLoadingText('✅ 완료!');
            // 마킹 이미지 생성
            setTimeout(async () => {
              const marked = await drawNextMove(canvasRef.current, event.analysis, imgSrc);
              setMoveImage(marked);
              setIsAnalyzing(false);
            }, 200);
            return;
          } else if (event.status === 'error') {
            throw new Error(event.message || '분석 실패');
          }
        }
      }

      // 스트림 종료인데 done 이벤트 없으면 에러
      throw new Error('분석 결과를 받지 못했습니다.');
    } catch (err) {
      setError(err.message || '분석 중 오류가 발생했습니다.');
      setIsAnalyzing(false);
    }
  }, [currentImageBase64, imageMediaType, machineType, prizeType, sessionMoves, currentImage]);

  // ===== 수 완료 → 다음 사진 요청 =====
  const completeMove = useCallback(() => {
    if (!currentAnalysis?.next_move) return;
    setSessionMoves(prev => [...prev, {
      action: currentAnalysis.next_move.action,
      result: currentAnalysis.next_move.expected_result,
      force_type: currentAnalysis.next_move.force_type || '',
    }]);
    setCurrentAnalysis(null);
    setMoveImage(null);
    setCurrentImage(null);
    setCurrentImageBase64(null);
    // 다음 사진 대기 상태 (session 화면 유지)
  }, [currentAnalysis]);

  // ===== 세션 초기화 =====
  const resetAll = () => {
    setScreen('home');
    setMachineType('');
    setPrizeType('');
    setSessionMoves([]);
    setCurrentImage(null);
    setCurrentImageBase64(null);
    setCurrentAnalysis(null);
    setMoveImage(null);
    setError(null);
    setIsAnalyzing(false);
  };

  // ===== 가이드 =====
  const openGuide = (guideId) => {
    setCurrentGuide(guideId);
    setSidebarOpen(false);
    setScreen('guide');
  };

  const closeGuide = () => {
    setCurrentGuide(null);
    setScreen('home');
  };

  return (
    <div className="app-root">
      <div className="bg-glow" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={diagramCanvasRef} style={{ display: 'none' }} />

      {/* 카메라 input (촬영) */}
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment"
        onChange={handleFileSelect} style={{ display: 'none' }} />
      {/* 갤러리 input (사진 선택) */}
      <input ref={galleryInputRef} type="file" accept="image/*"
        onChange={handleFileSelect} style={{ display: 'none' }} />

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar-nav ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-nav-header">
          <h2 className="sidebar-nav-title">📖 공략법</h2>
          <button onClick={() => setSidebarOpen(false)} className="sidebar-close-btn">✕</button>
        </div>
        <div className="sidebar-nav-list">
          {Object.values(TECHNIQUE_GUIDES).map((guide) => (
            <button key={guide.id} onClick={() => openGuide(guide.id)}
              className={`sidebar-nav-item ${currentGuide === guide.id ? 'active' : ''}`}>
              <span className="sidebar-nav-icon">{guide.icon}</span>
              <div className="sidebar-nav-info">
                <div className="sidebar-nav-name">{guide.kr}</div>
                <div className="sidebar-nav-jp">{guide.jp}</div>
              </div>
              <div className="sidebar-nav-diff">{'⭐'.repeat(guide.difficulty)}</div>
            </button>
          ))}
        </div>
        <div className="sidebar-nav-footer">
          총 {Object.keys(TECHNIQUE_GUIDES).length}개 공략법
        </div>
      </aside>
      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <div className="container">
        {/* ===== HEADER ===== */}
        <header className="header">
          <button onClick={() => setSidebarOpen(true)} className="hamburger-btn" aria-label="메뉴">
            <span className="hamburger-line" />
            <span className="hamburger-line" />
            <span className="hamburger-line" />
          </button>
          <div className="header-icon">🕹️</div>
          <h1 className="header-title">UFO Catcher Master</h1>
          <p className="header-sub">AI 크레인게임 공략 — 바둑 AI처럼 한 수씩</p>
        </header>

        {/* ===== HOME SCREEN ===== */}
        {screen === 'home' && (
          <div className="animate-fade-in">
            {/* 촬영 안내 */}
            <div className="photo-guide-box">
              <div className="photo-guide-title">📸 사진 촬영 가이드</div>
              <div className="photo-guide-text">
                기계 <strong>정면</strong>에서 상품과 봉이 모두 보이게 찍어주세요
              </div>
              <div className="photo-guide-tips">
                <span className="photo-tip good">✅ 정면 위에서</span>
                <span className="photo-tip bad">❌ 옆에서 비스듬히</span>
              </div>
            </div>

            {/* 카메라 / 갤러리 버튼 */}
            <div className="upload-buttons">
              <button onClick={() => cameraInputRef.current?.click()} className="upload-btn upload-btn-camera">
                <span style={{ fontSize: 36 }}>📷</span>
                <span className="upload-btn-title">카메라로 촬영</span>
              </button>
              <button onClick={() => galleryInputRef.current?.click()} className="upload-btn upload-btn-gallery">
                <span style={{ fontSize: 36 }}>🖼️</span>
                <span className="upload-btn-title">갤러리에서 선택</span>
              </button>
            </div>

            {/* 핵심 기능 */}
            <div className="feature-grid">
              {[
                { icon: '🎯', title: '한 수씩', desc: '바둑 AI처럼 매번 최적의 한 수' },
                { icon: '📍', title: '집게 위치', desc: '좌우·앞뒤 정확한 위치 지정' },
                { icon: '🔄', title: '연속 진행', desc: '뽑을 때까지 계속 코칭' },
                { icon: '💰', title: '비용 절약', desc: '최소 비용으로 성공' },
              ].map((f, i) => (
                <div key={i} className="feature-card">
                  <div style={{ fontSize: 22, marginBottom: 6 }}>{f.icon}</div>
                  <div className="feature-card-title">{f.title}</div>
                  <div className="feature-card-desc">{f.desc}</div>
                </div>
              ))}
            </div>

            {/* 공략 원칙 */}
            <div className="section-card">
              <h3 className="section-title">⚡ 공략 4원칙</h3>
              <div className="principles-list">
                {CORE_PRINCIPLES.map((p, i) => (
                  <div key={i} className="principle-item">
                    <span className="principle-icon">{p.icon}</span>
                    <div>
                      <div className="principle-title">{p.title}</div>
                      <div className="principle-desc">{p.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== SETUP SCREEN (기계/상품 선택) ===== */}
        {screen === 'setup' && (
          <div className="animate-fade-in">
            {error && <div className="error-box">{error}</div>}

            <div className="preview-wrap">
              <img src={currentImage} alt="uploaded" className="preview-img" />
              <div className="preview-retake">
                <button onClick={() => cameraInputRef.current?.click()} className="retake-btn">📷 다시 촬영</button>
                <button onClick={() => galleryInputRef.current?.click()} className="retake-btn">🖼️ 다른 사진</button>
              </div>
            </div>

            <div className="select-section">
              <label className="select-label">🎰 기계 종류</label>
              <div className="machine-grid">
                {MACHINE_TYPES.map(m => (
                  <button key={m.id} onClick={() => setMachineType(m.id)}
                    className={`select-card ${machineType === m.id ? 'active' : ''}`}
                    style={{ '--accent': m.color }}>
                    <span className="select-card-text">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="select-section">
              <label className="select-label">🎁 상품 종류</label>
              <div className="prize-list">
                {PRIZE_TYPES.map(p => (
                  <button key={p.id} onClick={() => setPrizeType(p.id)}
                    className={`prize-card ${prizeType === p.id ? 'active' : ''}`}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div className="prize-card-name">{p.label}</div>
                      <div className="prize-card-weight">약 {p.weight}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => runAnalysis()} disabled={!machineType || !prizeType}
              className={`analyze-btn ${(!machineType || !prizeType) ? 'disabled' : ''}`}>
              🎯 AI 분석 시작
            </button>

            <button onClick={resetAll} className="back-btn">처음으로</button>
          </div>
        )}

        {/* ===== SESSION SCREEN (바둑 AI 모드) ===== */}
        {screen === 'session' && (
          <div className="animate-fade-in">
            {/* 세션 헤더 */}
            <div className="session-header">
              <div className="session-move-count">
                {sessionMoves.length > 0
                  ? `${sessionMoves.length}수 진행 중`
                  : '첫 번째 수'}
              </div>
              <button onClick={resetAll} className="session-reset-btn">✕ 종료</button>
            </div>

            {/* 분석 중 */}
            {isAnalyzing && (
              <div className="analyzing-screen">
                <div className="analyzing-circle">
                  <div className="animate-pulse-scale" style={{ fontSize: 48 }}>🎯</div>
                  <svg className="animate-spin-slow analyzing-ring" viewBox="0 0 128 128">
                    <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,60,80,0.12)" strokeWidth="3" />
                    <circle cx="64" cy="64" r="60" fill="none" stroke="#FF3C50" strokeWidth="3"
                      strokeDasharray={`${loadingProgress * 3.77} 377`} strokeLinecap="round"
                      transform="rotate(-90 64 64)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
                  </svg>
                </div>
                <div className="analyzing-text">{loadingText || '분석 준비 중...'}</div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${loadingProgress}%` }} />
                </div>
              </div>
            )}

            {/* 에러 */}
            {error && !isAnalyzing && (
              <div className="error-box">
                {error}
                <button onClick={() => runAnalysis()} className="retry-btn">다시 시도</button>
              </div>
            )}

            {/* 분석 결과: 다음 수 */}
            {currentAnalysis && !isAnalyzing && (
              <div className="move-result">
                {/* 포기 권고 */}
                {currentAnalysis.give_up && (
                  <div className="giveup-box">
                    <div className="giveup-title">⚠️ 포기 권고</div>
                    <div className="giveup-reason">{currentAnalysis.give_up_reason}</div>
                  </div>
                )}

                {/* 마킹 이미지 */}
                {moveImage && (
                  <div className="result-image-wrap">
                    <img src={moveImage} alt="다음 수" className="result-image" />
                  </div>
                )}

                {/* 테크닉 + 힘 타입 */}
                <div className="move-technique-row">
                  <div className="move-technique-badge">
                    {currentAnalysis.technique?.name_kr}
                  </div>
                  {currentAnalysis.next_move?.force_type && (
                    <span className={`force-badge force-${currentAnalysis.next_move.force_type}`}>
                      {currentAnalysis.next_move.force_type === 'push' ? '밀기' : currentAnalysis.next_move.force_type === 'lift' ? '들기' : '회전'}
                    </span>
                  )}
                  {/* 충돌 위험도 배지 */}
                  {currentAnalysis.physics_engine?.collision_check?.risk && currentAnalysis.physics_engine.collision_check.risk !== 'Low' && (
                    <span className={`collision-badge collision-${currentAnalysis.physics_engine.collision_check.risk.toLowerCase()}`}>
                      충돌 {currentAnalysis.physics_engine.collision_check.risk}
                    </span>
                  )}
                </div>

                {/* 테크닉 선택 근거 */}
                {currentAnalysis.technique?.logic && (
                  <div className="technique-logic">{currentAnalysis.technique.logic}</div>
                )}

                {/* 물리 분석 결과 (접이식) */}
                {currentAnalysis.physics_engine && (
                  <details className="physics-panel">
                    <summary className="physics-summary">물리 엔진 분석</summary>
                    <div className="physics-grid">
                      {currentAnalysis.physics_engine.anchors?.bars && (
                        <div className="physics-item">
                          <span className="physics-label">봉</span>
                          <span className="physics-value">{currentAnalysis.physics_engine.anchors.bars}</span>
                        </div>
                      )}
                      {currentAnalysis.physics_engine.anchors?.overhang_comparison && (
                        <div className="physics-item">
                          <span className="physics-label">오버행</span>
                          <span className="physics-value">{currentAnalysis.physics_engine.anchors.overhang_comparison}</span>
                        </div>
                      )}
                      {currentAnalysis.physics_engine.center_of_gravity && (
                        <div className="physics-item">
                          <span className="physics-label">무게중심</span>
                          <span className="physics-value">{currentAnalysis.physics_engine.center_of_gravity}</span>
                        </div>
                      )}
                      {currentAnalysis.physics_engine.friction && (
                        <div className="physics-item">
                          <span className="physics-label">마찰</span>
                          <span className="physics-value">{currentAnalysis.physics_engine.friction}</span>
                        </div>
                      )}
                      {currentAnalysis.physics_engine.torque_comparison && (
                        <div className="physics-item">
                          <span className="physics-label">토크</span>
                          <span className="physics-value">{currentAnalysis.physics_engine.torque_comparison}</span>
                        </div>
                      )}
                      {currentAnalysis.physics_engine.collision_check && (
                        <div className="physics-item">
                          <span className="physics-label">충돌</span>
                          <span className={`physics-value collision-text-${currentAnalysis.physics_engine.collision_check.risk?.toLowerCase()}`}>
                            [{currentAnalysis.physics_engine.collision_check.risk}] {currentAnalysis.physics_engine.collision_check.detail}
                            {currentAnalysis.physics_engine.collision_check.adjustment && currentAnalysis.physics_engine.collision_check.adjustment !== '없음' &&
                              ` → ${currentAnalysis.physics_engine.collision_check.adjustment}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* AI 판단 근거 */}
                {currentAnalysis.reasoning && (
                  <div className="move-reasoning">{currentAnalysis.reasoning}</div>
                )}

                {/* 핵심: 이번 수 지시 */}
                <div className="move-instruction-card">
                  <div className="move-instruction-header">
                    <span className="move-number">{currentAnalysis.move_number || sessionMoves.length + 1}</span>
                    <span className="move-action">{currentAnalysis.next_move?.action}</span>
                  </div>

                  {/* 위치 가이드 (통합) */}
                  {currentAnalysis.next_move?.visual_guide && (
                    <div className="move-visual-guide">{currentAnalysis.next_move.visual_guide}</div>
                  )}

                  <div className="move-expected">
                    → {currentAnalysis.next_move?.expected_movement}
                  </div>
                </div>

                {/* 팁 */}
                {currentAnalysis.tip && (
                  <div className="move-tip">💡 {currentAnalysis.tip}</div>
                )}

                {/* 진행 상태 */}
                <div className="session-progress">
                  <div className="progress-info">
                    <span>진행도: {currentAnalysis.situation_analysis?.progress}</span>
                    <span>남은 예상: {currentAnalysis.estimated_remaining_moves}수</span>
                  </div>
                </div>

                {/* 다음 수 버튼 */}
                {!currentAnalysis.is_final_move && !currentAnalysis.give_up && (
                  <div className="next-move-section">
                    <div className="next-move-label">위 지시대로 실행 후 사진을 찍어주세요</div>
                    <div className="upload-buttons">
                      <button onClick={() => { completeMove(); cameraInputRef.current?.click(); }}
                        className="upload-btn upload-btn-camera">
                        <span style={{ fontSize: 28 }}>📷</span>
                        <span className="upload-btn-title">실행 후 촬영</span>
                      </button>
                      <button onClick={() => { completeMove(); galleryInputRef.current?.click(); }}
                        className="upload-btn upload-btn-gallery">
                        <span style={{ fontSize: 28 }}>🖼️</span>
                        <span className="upload-btn-title">갤러리에서</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 성공! */}
                {currentAnalysis.is_final_move && (
                  <div className="success-box">
                    <div className="success-icon">🎉</div>
                    <div className="success-text">이 수로 획득 가능!</div>
                    <button onClick={resetAll} className="new-analysis-btn">🕹️ 새로운 도전</button>
                  </div>
                )}
              </div>
            )}

            {/* 사진 대기 상태 (분석 전, 다음 사진 기다리는 중) */}
            {!currentAnalysis && !isAnalyzing && !error && (
              <div className="waiting-photo">
                <div className="waiting-icon">📸</div>
                <div className="waiting-text">
                  {sessionMoves.length > 0
                    ? `${sessionMoves.length}수 완료! 다음 사진을 찍어주세요`
                    : '사진을 찍어서 분석을 시작하세요'}
                </div>
                <div className="upload-buttons">
                  <button onClick={() => cameraInputRef.current?.click()} className="upload-btn upload-btn-camera">
                    <span style={{ fontSize: 28 }}>📷</span>
                    <span className="upload-btn-title">카메라</span>
                  </button>
                  <button onClick={() => galleryInputRef.current?.click()} className="upload-btn upload-btn-gallery">
                    <span style={{ fontSize: 28 }}>🖼️</span>
                    <span className="upload-btn-title">갤러리</span>
                  </button>
                </div>

                {/* 히스토리 */}
                {sessionMoves.length > 0 && (
                  <div className="move-history">
                    <div className="move-history-title">진행 기록</div>
                    {sessionMoves.map((m, i) => (
                      <div key={i} className="move-history-item">
                        <span className="move-history-num">{i + 1}</span>
                        <span className="move-history-action">{m.action}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== GUIDE SCREEN ===== */}
        {screen === 'guide' && currentGuide && (() => {
          const guide = TECHNIQUE_GUIDES[currentGuide];
          if (!guide) return null;
          return (
            <div className="animate-fade-in guide-screen">
              <button onClick={closeGuide} className="guide-back-btn">← 메인으로</button>
              <div className="guide-hero">
                <div className="guide-hero-icon">{guide.icon}</div>
                <div className="guide-hero-info">
                  <h2 className="guide-hero-title">{guide.kr}</h2>
                  <div className="guide-hero-jp">{guide.jp}</div>
                </div>
              </div>
              <div className="guide-meta-grid">
                <div className="guide-meta-card">
                  <div className="guide-meta-label">난이도</div>
                  <div className="guide-meta-value">{'⭐'.repeat(guide.difficulty)}{'☆'.repeat(5 - guide.difficulty)}</div>
                </div>
                <div className="guide-meta-card">
                  <div className="guide-meta-label">예상 횟수</div>
                  <div className="guide-meta-value">{guide.tries}</div>
                </div>
                <div className="guide-meta-card">
                  <div className="guide-meta-label">예상 비용</div>
                  <div className="guide-meta-value">{guide.cost}</div>
                </div>
              </div>
              <div className="guide-section">
                <div className="guide-summary">{guide.summary}</div>
              </div>
              <div className="guide-section">
                <h3 className="guide-section-title">🎯 이럴 때 사용하세요</h3>
                <div className="guide-when-list">
                  {guide.when.map((w, i) => (
                    <div key={i} className="guide-when-item">
                      <span className="guide-when-check">✓</span>
                      <span>{w}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="guide-section">
                <h3 className="guide-section-title">⚡ 원리</h3>
                <div className="guide-principle">{guide.principle}</div>
              </div>
              <div className="guide-section">
                <h3 className="guide-section-title">🎮 단계별 공략</h3>
                <div className="guide-steps">
                  {guide.steps.map((step, i) => (
                    <div key={i} className="guide-step-card-v2">
                      {guideDiagrams[i] && (
                        <div className="guide-diagram-wrap">
                          <img src={guideDiagrams[i]} alt={step.title} className="guide-diagram-img" />
                        </div>
                      )}
                      <div className="guide-step-body">
                        <div className="guide-step-title">{step.title}</div>
                        <div className="guide-step-desc">{step.desc}</div>
                        {step.tip && <div className="guide-step-tip">💡 {step.tip}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="guide-section">
                <h3 className="guide-section-title">❌ 흔한 실수</h3>
                <div className="guide-mistakes">
                  {guide.mistakes.map((m, i) => (
                    <div key={i} className="guide-mistake-item">{m}</div>
                  ))}
                </div>
              </div>
              {(() => {
                const tech = TECHNIQUES[currentGuide];
                if (!tech?.videoQuery) return null;
                return (
                  <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(tech.videoQuery)}`}
                    target="_blank" rel="noopener noreferrer" className="guide-video-link">
                    ▶ 이 테크닉 영상으로 보기 (YouTube)
                  </a>
                );
              })()}
              <button onClick={() => { setCurrentGuide(null); setScreen('home'); }} className="guide-cta-btn">
                📸 AI 분석으로 실전 공략받기
              </button>
            </div>
          );
        })()}

        <footer className="footer">
          UFO Catcher Master v3.0 — AI Crane Game Coach
        </footer>
      </div>
    </div>
  );
}
