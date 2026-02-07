'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TECHNIQUES, PRIZE_TYPES, MACHINE_TYPES, SETUP_TYPES, CLAW_TYPES, CORE_PRINCIPLES, MACHINE_GUIDE, STAFF_CHANCE_TIPS, TECHNIQUE_GUIDES } from './data';
import { drawMarkers, drawStepImages } from './markers';
import { generateTechniqueDiagrams } from './diagrams';

export default function Home() {
  const [screen, setScreen] = useState('home');
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMediaType, setImageMediaType] = useState('image/jpeg');
  const [machineType, setMachineType] = useState('');
  const [prizeType, setPrizeType] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [markedImage, setMarkedImage] = useState(null);
  const [stepImages, setStepImages] = useState([]);
  const [activeTab, setActiveTab] = useState('strategy');
  const [showGuide, setShowGuide] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentGuide, setCurrentGuide] = useState(null);
  const [guideDiagrams, setGuideDiagrams] = useState([]);

  const fileInputRef = useRef(null);
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

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const type = file.type || 'image/jpeg';
    const supported = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    setImageMediaType(supported.includes(type) ? type : 'image/jpeg');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target.result);
      setImageBase64(ev.target.result.split(',')[1]);
      setScreen('upload');
    };
    reader.readAsDataURL(file);
  }, []);

  const runAnalysis = useCallback(async () => {
    setScreen('analyzing');
    setError(null);
    setLoadingProgress(0);

    const steps = [
      { pct: 12, text: '🔍 이미지 스캔 중...' },
      { pct: 25, text: '🎰 세팅 유형 분류 중...' },
      { pct: 40, text: '📐 봉 간격·상품 크기 측정 중...' },
      { pct: 55, text: '⚖️ 무게 중심 추정 중...' },
      { pct: 70, text: '🎯 최적 공략 패턴 계산 중...' },
      { pct: 82, text: '🗺️ 공략 포인트 마킹 중...' },
      { pct: 92, text: '💡 고수 팁 생성 중...' },
      { pct: 97, text: '✅ 결과 정리 중...' },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setLoadingProgress(steps[idx].pct);
        setLoadingText(steps[idx].text);
        idx++;
      }
    }, 700);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64,
          imageMediaType,
          machineType: MACHINE_TYPES.find((m) => m.id === machineType)?.label || '불명',
          prizeType: PRIZE_TYPES.find((p) => p.id === prizeType)?.label || '불명',
        }),
      });

      clearInterval(interval);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '서버 오류');
      }

      setAnalysis(data.analysis);
      setLoadingProgress(100);
      setLoadingText('✅ 분석 완료!');

      setTimeout(async () => {
        const marked = await drawMarkers(canvasRef.current, data.analysis, image);
        setMarkedImage(marked);
        const perStep = await drawStepImages(canvasRef.current, data.analysis, image);
        setStepImages(perStep);
        setScreen('result');
      }, 500);
    } catch (err) {
      clearInterval(interval);
      setError(err.message || '분석 중 오류가 발생했습니다.');
      setScreen('upload');
    }
  }, [imageBase64, imageMediaType, machineType, prizeType, image]);

  const resetAll = () => {
    setScreen('home');
    setImage(null);
    setImageBase64(null);
    setImageMediaType('image/jpeg');
    setMachineType('');
    setPrizeType('');
    setAnalysis(null);
    setMarkedImage(null);
    setStepImages([]);
    setError(null);
    setActiveTab('strategy');
  };

  const openGuide = (guideId) => {
    setCurrentGuide(guideId);
    setSidebarOpen(false);
    setScreen('guide');
  };

  const closeGuide = () => {
    setCurrentGuide(null);
    setScreen('home');
  };

  // ===== 세팅 유형 찾기 헬퍼 =====
  const getSetupInfo = (setupId) => SETUP_TYPES.find(s => s.id === setupId);
  const getClawInfo = (clawId) => CLAW_TYPES.find(c => c.id === clawId);
  const getTechniqueInfo = (jpName) => Object.values(TECHNIQUES).find(
    t => t.jp === jpName || t.kr === jpName
  );

  return (
    <div className="app-root">
      <div className="bg-glow" />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <canvas ref={diagramCanvasRef} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />

      {/* ===== SIDEBAR (Desktop: 항상 표시 / Mobile: 슬라이드인) ===== */}
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

      {/* 모바일 오버레이 배경 */}
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
          <p className="header-sub">AI 크레인게임 공략 시스템</p>
        </header>

        {/* ===== HOME SCREEN ===== */}
        {screen === 'home' && (
          <div className="animate-fade-in">
            <button onClick={() => fileInputRef.current?.click()} className="upload-btn">
              <span style={{ fontSize: 44 }}>📸</span>
              <span className="upload-btn-title">UFO 캐쳐 사진 촬영 / 업로드</span>
              <span className="upload-btn-desc">기계 앞에서 상품이 보이게 촬영해주세요</span>
            </button>

            {/* 핵심 기능 */}
            <div className="feature-grid">
              {[
                { icon: '🎰', title: '세팅 분류', desc: '7가지 세팅 자동 인식' },
                { icon: '⚖️', title: '무게 중심', desc: '무게중심 자동 추정' },
                { icon: '🗺️', title: '공략 마킹', desc: '포인트를 사진에 표시' },
                { icon: '💰', title: '비용 예측', desc: '예상 비용·횟수 안내' },
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

            {/* 테크닉 목록 */}
            <div className="section-card">
              <h3 className="section-title">🎯 지원 공략 테크닉</h3>
              <div className="tech-list">
                {Object.values(TECHNIQUES).slice(0, 6).map((t, i) => (
                  <div key={i} className="tech-item">
                    <span className="tech-badge">{t.jp}</span>
                    <span className="tech-desc">{t.kr} — {t.desc}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowGuide(!showGuide)} className="expand-btn">
                {showGuide ? '접기 ▲' : `+ ${Object.keys(TECHNIQUES).length - 6}개 더보기`}
              </button>
              {showGuide && (
                <div className="tech-list" style={{ marginTop: 8 }}>
                  {Object.values(TECHNIQUES).slice(6).map((t, i) => (
                    <div key={i} className="tech-item">
                      <span className="tech-badge">{t.jp}</span>
                      <span className="tech-desc">{t.kr} — {t.desc}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 기계 선택 가이드 */}
            <div className="section-card">
              <h3 className="section-title">💡 기계 선택 가이드</h3>
              <div style={{ marginBottom: 12 }}>
                <div className="guide-label guide-label-good">✅ 추천</div>
                {MACHINE_GUIDE.recommended.map((r, i) => (
                  <div key={i} className="guide-item">{r}</div>
                ))}
              </div>
              <div>
                <div className="guide-label guide-label-bad">❌ 피하기</div>
                {MACHINE_GUIDE.avoid.map((a, i) => (
                  <div key={i} className="guide-item">{a}</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===== UPLOAD SCREEN ===== */}
        {screen === 'upload' && (
          <div className="animate-fade-in">
            {error && <div className="error-box">{error}</div>}

            <div className="preview-wrap">
              <img src={image} alt="uploaded" className="preview-img" />
              <button onClick={() => fileInputRef.current?.click()} className="retake-btn">📷 다시 촬영</button>
            </div>

            {/* 기계 종류 */}
            <div className="select-section">
              <label className="select-label">🎰 기계 종류</label>
              <div className="machine-grid">
                {MACHINE_TYPES.map(m => (
                  <button key={m.id} onClick={() => setMachineType(m.id)} className={`select-card ${machineType === m.id ? 'active' : ''}`}
                    style={{ '--accent': m.color }}>
                    <span className="select-card-text">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 상품 종류 */}
            <div className="select-section">
              <label className="select-label">🎁 상품 종류</label>
              <div className="prize-list">
                {PRIZE_TYPES.map(p => (
                  <button key={p.id} onClick={() => setPrizeType(p.id)} className={`prize-card ${prizeType === p.id ? 'active' : ''}`}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div className="prize-card-name">{p.label}</div>
                      <div className="prize-card-weight">약 {p.weight}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={runAnalysis} disabled={!machineType || !prizeType} className={`analyze-btn ${(!machineType || !prizeType) ? 'disabled' : ''}`}>
              🎯 AI 공략 분석 시작
            </button>

            <button onClick={resetAll} className="back-btn">처음으로</button>
          </div>
        )}

        {/* ===== ANALYZING SCREEN ===== */}
        {screen === 'analyzing' && (
          <div className="animate-fade-in analyzing-screen">
            <div className="analyzing-circle">
              <div className="animate-pulse-scale" style={{ fontSize: 48 }}>🔬</div>
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
            <div className="analyzing-pct">{loadingProgress}%</div>
          </div>
        )}

        {/* ===== RESULT SCREEN ===== */}
        {screen === 'result' && analysis && (
          <div className="animate-fade-in result-screen">

            {/* 포기 권고 */}
            {analysis.give_up_recommendation && (
              <div className="giveup-box">
                <div className="giveup-title">⚠️ 포기 권고</div>
                <div className="giveup-reason">{analysis.give_up_reason}</div>
              </div>
            )}

            {/* 마킹 이미지 */}
            {markedImage && (
              <div className="result-image-wrap">
                <img src={markedImage} alt="analysis" className="result-image" />
              </div>
            )}

            {/* 탭 네비게이션 */}
            <div className="tab-nav">
              {[
                { id: 'strategy', label: '공략', icon: '🎯' },
                { id: 'analysis', label: '분석', icon: '📋' },
                { id: 'tips', label: '팁', icon: '💡' },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* ===== 공략 탭 ===== */}
            {activeTab === 'strategy' && (
              <div className="animate-fade-in">
                {/* 추천 테크닉 카드 */}
                <div className="technique-card">
                  <div className="technique-header">
                    <span className="technique-badge">{analysis.technique?.primary}</span>
                    <span className="technique-name">{analysis.technique?.primary_kr}</span>
                  </div>
                  <p className="technique-reason">{analysis.technique?.reason}</p>
                  {analysis.technique?.alternative && (
                    <div className="technique-alt">
                      대안: <strong>{analysis.technique.alternative}</strong> ({analysis.technique.alternative_kr})
                    </div>
                  )}
                  {/* 영상으로 보기 버튼 */}
                  {(() => {
                    const tech = getTechniqueInfo(analysis.technique?.primary);
                    if (!tech?.videoQuery) return null;
                    return (
                      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(tech.videoQuery)}`}
                        target="_blank" rel="noopener noreferrer" className="video-link">
                        ▶ 이 테크닉 영상으로 보기
                      </a>
                    );
                  })()}
                </div>

                {/* 공략 스텝 */}
                <div className="steps-section">
                  <h3 className="section-title">🎮 공략 스텝 — 여기에 집게를 내려라!</h3>
                  {analysis.steps?.map((step, i) => (
                    <div key={i} className="step-card">
                      {/* 스텝별 마킹 이미지 */}
                      {stepImages[i] && (
                        <div className="step-image-wrap">
                          <img src={stepImages[i]} alt={`Step ${step.step}`} className="step-image" />
                          <div className="step-image-badge">
                            <span className="step-image-num">{step.step}</span>
                            <span className="step-image-label">{step.marker_label || `Step ${step.step}`}</span>
                          </div>
                        </div>
                      )}
                      <div className="step-header">
                        <div className="step-number">{step.step}</div>
                        <div className="step-content">
                          <div className="step-action">
                            {step.action}
                            <span className="step-direction">
                              {step.direction === 'left' && '← 왼쪽'}
                              {step.direction === 'right' && '→ 오른쪽'}
                              {step.direction === 'forward' && '↑ 앞쪽'}
                              {step.direction === 'back' && '↓ 뒤쪽'}
                              {step.direction === 'center' && '◎ 센터'}
                            </span>
                          </div>
                          {/* 3줄 구조: 어디에 / 무슨 일이 / 결과 */}
                          {step.where ? (
                            <div className="step-3lines">
                              <div className="step-line step-line-where">
                                <span className="step-line-icon">📍</span>
                                <div>
                                  <div className="step-line-label">집게 위치</div>
                                  <div className="step-line-text">{step.where}</div>
                                </div>
                              </div>
                              <div className="step-line step-line-mechanism">
                                <span className="step-line-icon">⚡</span>
                                <div>
                                  <div className="step-line-label">일어나는 일</div>
                                  <div className="step-line-text">{step.mechanism}</div>
                                </div>
                              </div>
                              <div className="step-line step-line-result">
                                <span className="step-line-icon">📦</span>
                                <div>
                                  <div className="step-line-label">예상 결과</div>
                                  <div className="step-line-text">{step.expected_result}</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="step-detail">{step.detail}</div>
                          )}
                        </div>
                      </div>
                      {i < (analysis.steps.length - 1) && <div className="step-connector" />}
                    </div>
                  ))}
                </div>

                {/* 성공률·비용 요약 */}
                <div className="stats-grid">
                  <div className="stat-card stat-green">
                    <div className="stat-value">{analysis.success_rate}</div>
                    <div className="stat-label">예상 성공률</div>
                  </div>
                  <div className="stat-card stat-blue">
                    <div className="stat-value">{analysis.estimated_tries}</div>
                    <div className="stat-label">예상 횟수</div>
                  </div>
                  {analysis.estimated_cost && (
                    <div className="stat-card stat-gold">
                      <div className="stat-value" style={{ fontSize: 18 }}>{analysis.estimated_cost}</div>
                      <div className="stat-label">예상 비용</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== 분석 탭 ===== */}
            {activeTab === 'analysis' && (
              <div className="animate-fade-in">
                {/* 세팅 유형 */}
                {analysis.situation_analysis?.setup_type && (
                  <div className="info-card">
                    <h3 className="info-card-title">🎰 세팅 유형</h3>
                    {(() => {
                      const setup = getSetupInfo(analysis.situation_analysis.setup_type);
                      return setup ? (
                        <div className="setup-info">
                          <div className="setup-header">
                            <span className="setup-icon">{setup.icon}</span>
                            <div>
                              <div className="setup-name">{setup.label}</div>
                              <div className="setup-desc">{setup.desc}</div>
                            </div>
                          </div>
                          {setup.warning && <div className="setup-warning">⚠️ {setup.warning}</div>}
                          {analysis.situation_analysis.setup_detail && (
                            <div className="setup-detail">{analysis.situation_analysis.setup_detail}</div>
                          )}
                        </div>
                      ) : (
                        <div className="info-value">{analysis.situation_analysis.setup_type}</div>
                      );
                    })()}
                  </div>
                )}

                {/* 상황 분석 그리드 */}
                <div className="info-card">
                  <h3 className="info-card-title">📋 상황 분석</h3>
                  <div className="analysis-grid">
                    <InfoCell label="기계" value={analysis.situation_analysis?.machine_type} />
                    <InfoCell label="상품" value={analysis.situation_analysis?.prize_type} />
                    <InfoCell label="무게중심" value={analysis.situation_analysis?.weight_center} />
                    <InfoCell label="난이도" value={
                      <span className="difficulty-dots">
                        {'🔴'.repeat(Math.min(analysis.situation_analysis?.difficulty || 0, 10))}
                        {'⚪'.repeat(10 - Math.min(analysis.situation_analysis?.difficulty || 0, 10))}
                        <span className="difficulty-num">{analysis.situation_analysis?.difficulty}/10</span>
                      </span>
                    } />
                    {analysis.situation_analysis?.bar_gap_ratio && (
                      <InfoCell label="봉 간격 비율" value={analysis.situation_analysis.bar_gap_ratio} />
                    )}
                    {analysis.situation_analysis?.tilt_angle && (
                      <InfoCell label="기울기 각도" value={analysis.situation_analysis.tilt_angle} />
                    )}
                  </div>
                  {analysis.situation_analysis?.current_position && (
                    <div className="position-desc">{analysis.situation_analysis.current_position}</div>
                  )}
                  {analysis.situation_analysis?.not_visible?.length > 0 && (
                    <div className="not-visible-box">
                      📷 사진에서 확인 불가: {analysis.situation_analysis.not_visible.join(', ')}
                    </div>
                  )}
                </div>

                {/* 집게 정보 */}
                {analysis.situation_analysis?.claw_type && analysis.situation_analysis.claw_type !== 'unknown' && (
                  <div className="info-card">
                    <h3 className="info-card-title">🤖 집게 정보</h3>
                    {(() => {
                      const claw = getClawInfo(analysis.situation_analysis.claw_type);
                      return claw ? (
                        <div className="claw-info">
                          <span className="claw-icon">{claw.icon}</span>
                          <div>
                            <div className="claw-name">{claw.label}</div>
                            <div className="claw-desc">{claw.desc}</div>
                            {claw.tip && <div className="claw-tip">💡 {claw.tip}</div>}
                          </div>
                        </div>
                      ) : null;
                    })()}
                    {analysis.situation_analysis.claw_detail && (
                      <div className="claw-detail-text">{analysis.situation_analysis.claw_detail}</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===== 팁 탭 ===== */}
            {activeTab === 'tips' && (
              <div className="animate-fade-in">
                {/* 주의사항 */}
                {analysis.warnings?.length > 0 && (
                  <div className="tips-card tips-warning">
                    <h3 className="tips-title">⚠️ 주의사항</h3>
                    {analysis.warnings.map((w, i) => (
                      <div key={i} className="tip-item tip-warning">{w}</div>
                    ))}
                  </div>
                )}

                {/* 고수 팁 */}
                {analysis.pro_tips?.length > 0 && (
                  <div className="tips-card tips-pro">
                    <h3 className="tips-title">🏆 고수 팁</h3>
                    {analysis.pro_tips.map((t, i) => (
                      <div key={i} className="tip-item tip-pro">{t}</div>
                    ))}
                  </div>
                )}

                {/* 직원 찬스 */}
                {analysis.staff_chance && (
                  <div className="tips-card tips-staff">
                    <h3 className="tips-title">🙋 직원 찬스</h3>
                    <div className="staff-chance-text">{analysis.staff_chance}</div>
                    <div className="staff-tips">
                      <div className="staff-tips-title">일반적인 직원 찬스 타이밍:</div>
                      {STAFF_CHANCE_TIPS.map((t, i) => (
                        <div key={i} className="staff-tip-item">• {t}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 세팅별 핵심 포인트 */}
                {analysis.situation_analysis?.setup_type && (
                  <div className="tips-card">
                    <h3 className="tips-title">📖 세팅별 핵심 포인트</h3>
                    {(() => {
                      const setup = getSetupInfo(analysis.situation_analysis.setup_type);
                      if (!setup?.analysisPoints) return null;
                      return setup.analysisPoints.map((point, i) => (
                        <div key={i} className="tip-item tip-info">✓ {point}</div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}

            {/* 새 분석 버튼 */}
            <button onClick={resetAll} className="new-analysis-btn">🕹️ 새로운 분석 시작</button>
          </div>
        )}

        {/* ===== GUIDE SCREEN ===== */}
        {screen === 'guide' && currentGuide && (() => {
          const guide = TECHNIQUE_GUIDES[currentGuide];
          if (!guide) return null;
          return (
            <div className="animate-fade-in guide-screen">
              {/* 뒤로가기 */}
              <button onClick={closeGuide} className="guide-back-btn">← 메인으로</button>

              {/* 가이드 헤더 */}
              <div className="guide-hero">
                <div className="guide-hero-icon">{guide.icon}</div>
                <div className="guide-hero-info">
                  <h2 className="guide-hero-title">{guide.kr}</h2>
                  <div className="guide-hero-jp">{guide.jp}</div>
                </div>
              </div>

              {/* 메타 정보 */}
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

              {/* 요약 */}
              <div className="guide-section">
                <div className="guide-summary">{guide.summary}</div>
              </div>

              {/* 언제 사용? */}
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

              {/* 원리 */}
              <div className="guide-section">
                <h3 className="guide-section-title">⚡ 원리</h3>
                <div className="guide-principle">{guide.principle}</div>
              </div>

              {/* 단계별 공략 */}
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
                        {step.tip && (
                          <div className="guide-step-tip">💡 {step.tip}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 흔한 실수 */}
              <div className="guide-section">
                <h3 className="guide-section-title">❌ 흔한 실수</h3>
                <div className="guide-mistakes">
                  {guide.mistakes.map((m, i) => (
                    <div key={i} className="guide-mistake-item">{m}</div>
                  ))}
                </div>
              </div>

              {/* 영상 보기 */}
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

              {/* AI 분석으로 */}
              <button onClick={() => { setCurrentGuide(null); setScreen('home'); }} className="guide-cta-btn">
                📸 AI 분석으로 실전 공략받기
              </button>
            </div>
          );
        })()}

        <footer className="footer">
          UFO Catcher Master v2.0 — AI-Powered Crane Game Strategy
        </footer>
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div className="info-cell">
      <div className="info-cell-label">{label}</div>
      <div className="info-cell-value">{value || '—'}</div>
    </div>
  );
}
