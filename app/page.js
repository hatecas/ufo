'use client';

import { useState, useRef, useCallback } from 'react';
import { TECHNIQUES, PRIZE_TYPES, MACHINE_TYPES } from './data';
import { drawMarkers } from './markers';

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

  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

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
      { pct: 15, text: '🔍 이미지 스캔 중...' },
      { pct: 30, text: '📐 상품 크기 및 위치 분석 중...' },
      { pct: 50, text: '⚖️ 무게 중심 추정 중...' },
      { pct: 70, text: '🎯 최적 공략 패턴 계산 중...' },
      { pct: 85, text: '🗺️ 공략 포인트 마킹 중...' },
      { pct: 95, text: '✅ 결과 생성 중...' },
    ];

    let idx = 0;
    const interval = setInterval(() => {
      if (idx < steps.length) {
        setLoadingProgress(steps[idx].pct);
        setLoadingText(steps[idx].text);
        idx++;
      }
    }, 800);

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
        setScreen('result');
      }, 600);
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
    setError(null);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 600px 400px at 20% 20%, rgba(255,60,80,0.06), transparent), radial-gradient(ellipse 500px 500px at 80% 70%, rgba(0,255,157,0.04), transparent)',
      }} />

      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} style={{ display: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 480, margin: '0 auto', padding: '0 20px' }}>

        <header style={{ paddingTop: 40, paddingBottom: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 42, marginBottom: 4, filter: 'drop-shadow(0 0 20px rgba(255,60,80,0.3))' }}>🕹️</div>
          <h1 style={{
            fontSize: 26, fontWeight: 800, margin: 0,
            background: 'linear-gradient(135deg, #FF3C50, #FF8C42, #FFD700)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>UFO Catcher Master</h1>
          <p style={{ fontSize: 13, color: '#888', marginTop: 6, letterSpacing: 2, textTransform: 'uppercase' }}>
            AI 크레인게임 공략 시스템
          </p>
        </header>

        {screen === 'home' && (
          <div className="animate-fade-in">
            <button onClick={() => fileInputRef.current?.click()} style={{
              width: '100%', padding: '48px 24px', borderRadius: 20, cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(255,60,80,0.12), rgba(255,140,66,0.08))',
              border: '2px dashed rgba(255,60,80,0.3)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              color: 'inherit',
            }}>
              <span style={{ fontSize: 48 }}>📸</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#FF3C50' }}>UFO 캐쳐 사진 업로드</span>
              <span style={{ fontSize: 13, color: '#888' }}>기계 앞에서 상품이 보이게 촬영해주세요</span>
            </button>

            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: '🎯', title: '위치 분석', desc: '상품의 정확한 위치와 각도' },
                { icon: '⚖️', title: '무게 중심', desc: '무게 중심점 자동 추정' },
                { icon: '🗺️', title: '공략 마킹', desc: '최적 포인트 이미지 표시' },
                { icon: '📊', title: '성공 확률', desc: '예상 성공률 & 횟수' },
              ].map((f, i) => (
                <div key={i} style={{
                  padding: '18px 14px', borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#ccc' }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{f.desc}</div>
                </div>
              ))}
            </div>

            <div style={{
              marginTop: 28, padding: 20, borderRadius: 16,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              <h3 style={{ fontSize: 14, color: '#888', marginTop: 0, marginBottom: 14, fontWeight: 600 }}>지원 공략 테크닉</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.values(TECHNIQUES).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 12, padding: '3px 8px', borderRadius: 6,
                      background: 'rgba(255,215,0,0.12)', color: '#FFD700',
                      fontWeight: 700, minWidth: 50, textAlign: 'center',
                    }}>{t.jp}</span>
                    <span style={{ fontSize: 12, color: '#aaa' }}>{t.kr} — {t.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {screen === 'upload' && (
          <div className="animate-fade-in">
            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: 12, marginBottom: 16,
                background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.3)', color: '#FF6060', fontSize: 13,
              }}>{error}</div>
            )}

            <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, border: '2px solid rgba(255,60,80,0.2)', position: 'relative' }}>
              <img src={image} alt="uploaded" style={{ width: '100%', display: 'block' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{
                position: 'absolute', bottom: 12, right: 12, padding: '8px 14px', borderRadius: 10,
                background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: 12, cursor: 'pointer',
              }}>📷 다시 촬영</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 10 }}>기계 종류 선택</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {MACHINE_TYPES.map(m => (
                  <button key={m.id} onClick={() => setMachineType(m.id)} style={{
                    padding: '14px 12px', borderRadius: 12, cursor: 'pointer',
                    background: machineType === m.id ? `${m.color}18` : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${machineType === m.id ? m.color : 'rgba(255,255,255,0.06)'}`,
                    color: machineType === m.id ? m.color : '#888', fontSize: 12, fontWeight: 600, textAlign: 'left',
                  }}>{m.label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, fontWeight: 700, color: '#aaa', display: 'block', marginBottom: 10 }}>상품 종류 선택</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PRIZE_TYPES.map(p => (
                  <button key={p.id} onClick={() => setPrizeType(p.id)} style={{
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    background: prizeType === p.id ? 'rgba(0,255,157,0.08)' : 'rgba(255,255,255,0.03)',
                    border: `2px solid ${prizeType === p.id ? '#00FF9D' : 'rgba(255,255,255,0.06)'}`,
                    color: prizeType === p.id ? '#00FF9D' : '#888', fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <div>
                      <div style={{ fontWeight: 700 }}>{p.label}</div>
                      <div style={{ fontSize: 11, opacity: 0.7 }}>약 {p.weight}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={runAnalysis} disabled={!machineType || !prizeType} style={{
              width: '100%', padding: 18, borderRadius: 14, border: 'none',
              background: (!machineType || !prizeType) ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FF3C50, #FF6B35)',
              color: (!machineType || !prizeType) ? '#555' : '#FFF',
              fontSize: 16, fontWeight: 800, cursor: (!machineType || !prizeType) ? 'not-allowed' : 'pointer',
              boxShadow: (!machineType || !prizeType) ? 'none' : '0 4px 24px rgba(255,60,80,0.3)',
            }}>🎯 AI 공략 분석 시작</button>

            <button onClick={resetAll} style={{
              width: '100%', padding: 14, marginTop: 10, background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#666', fontSize: 13, cursor: 'pointer',
            }}>처음으로</button>
          </div>
        )}

        {screen === 'analyzing' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40, paddingBottom: 40 }}>
            <div style={{
              width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,60,80,0.08)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 28, position: 'relative',
            }}>
              <div className="animate-pulse-scale" style={{ fontSize: 50 }}>🔬</div>
              <svg className="animate-spin-slow" style={{ position: 'absolute', top: -4, left: -4, width: 128, height: 128 }} viewBox="0 0 128 128">
                <circle cx="64" cy="64" r="60" fill="none" stroke="rgba(255,60,80,0.15)" strokeWidth="3" />
                <circle cx="64" cy="64" r="60" fill="none" stroke="#FF3C50" strokeWidth="3"
                  strokeDasharray={`${loadingProgress * 3.77} 377`} strokeLinecap="round"
                  transform="rotate(-90 64 64)" style={{ transition: 'stroke-dasharray 0.5s ease' }} />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{loadingText || '분석 준비 중...'}</div>
            <div style={{ width: '100%', maxWidth: 300, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginTop: 8 }}>
              <div style={{ height: '100%', borderRadius: 3, background: 'linear-gradient(90deg, #FF3C50, #FFD700)', width: `${loadingProgress}%`, transition: 'width 0.5s ease' }} />
            </div>
            <div style={{ fontSize: 12, color: '#555', marginTop: 8 }}>{loadingProgress}%</div>
          </div>
        )}

        {screen === 'result' && analysis && (
          <div className="animate-fade-in" style={{ paddingBottom: 40 }}>
            {analysis.give_up_recommendation && (
              <div style={{ padding: '16px 18px', borderRadius: 14, marginBottom: 16, background: 'rgba(255,60,60,0.12)', border: '1px solid rgba(255,60,60,0.3)' }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#FF6060', marginBottom: 6 }}>⚠️ 포기 권고</div>
                <div style={{ fontSize: 13, color: '#cc8888' }}>{analysis.give_up_reason}</div>
              </div>
            )}

            {markedImage && (
              <div style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 20, border: '2px solid rgba(0,255,157,0.2)' }}>
                <img src={markedImage} alt="analysis" style={{ width: '100%', display: 'block' }} />
              </div>
            )}

            <div style={{ padding: 18, borderRadius: 14, marginBottom: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#FF8C42', margin: '0 0 12px' }}>📋 상황 분석</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <InfoCell label="기계" value={analysis.situation_analysis?.machine_type} />
                <InfoCell label="상품" value={analysis.situation_analysis?.prize_type} />
                <InfoCell label="무게중심" value={analysis.situation_analysis?.weight_center} />
                <InfoCell label="난이도" value={
                  '🔴'.repeat(Math.min(analysis.situation_analysis?.difficulty || 0, 10)) +
                  '⚪'.repeat(10 - Math.min(analysis.situation_analysis?.difficulty || 0, 10))
                } />
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#999', lineHeight: 1.6 }}>
                {analysis.situation_analysis?.current_position}
              </div>
              {analysis.situation_analysis?.not_visible?.length > 0 && (
                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 8,
                  background: 'rgba(255,165,0,0.08)', border: '1px solid rgba(255,165,0,0.15)',
                  fontSize: 11, color: '#cc9944', lineHeight: 1.5,
                }}>📷 사진에서 확인 불가: {analysis.situation_analysis.not_visible.join(', ')}</div>
              )}
            </div>

            <div style={{
              padding: 18, borderRadius: 14, marginBottom: 14,
              background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,140,66,0.04))',
              border: '1px solid rgba(255,215,0,0.15)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(255,215,0,0.15)', color: '#FFD700', fontSize: 13, fontWeight: 800 }}>
                  {analysis.technique?.primary}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{analysis.technique?.primary_kr}</span>
              </div>
              <p style={{ fontSize: 12, color: '#aaa', margin: 0, lineHeight: 1.6 }}>{analysis.technique?.reason}</p>
            </div>

            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#00FF9D', marginBottom: 14 }}>🎮 공략 스텝</h3>
              {analysis.steps?.map((step, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 14, marginBottom: 14, padding: 14, borderRadius: 12,
                  background: 'rgba(0,255,157,0.03)', border: '1px solid rgba(0,255,157,0.08)',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', background: '#FF3C50', color: '#FFF',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, flexShrink: 0,
                  }}>{step.step}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                      {step.action}
                      <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(100,100,255,0.15)', color: '#8888FF' }}>
                        {step.direction === 'left' && '← 왼쪽'}
                        {step.direction === 'right' && '→ 오른쪽'}
                        {step.direction === 'forward' && '↑ 앞쪽'}
                        {step.direction === 'back' && '↓ 뒤쪽'}
                        {step.direction === 'center' && '◎ 센터'}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {analysis.warnings?.length > 0 && (
              <div style={{ padding: 16, borderRadius: 14, marginBottom: 14, background: 'rgba(255,165,0,0.06)', border: '1px solid rgba(255,165,0,0.12)' }}>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#FFA500', margin: '0 0 10px' }}>⚠️ 주의사항</h3>
                {analysis.warnings.map((w, i) => (
                  <div key={i} style={{ fontSize: 12, color: '#cc9944', marginBottom: 6, lineHeight: 1.5, paddingLeft: 12, borderLeft: '2px solid rgba(255,165,0,0.2)' }}>{w}</div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ padding: 18, borderRadius: 14, textAlign: 'center', background: 'rgba(0,255,157,0.05)', border: '1px solid rgba(0,255,157,0.12)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#00FF9D' }}>{analysis.success_rate}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>예상 성공률</div>
              </div>
              <div style={{ padding: 18, borderRadius: 14, textAlign: 'center', background: 'rgba(100,100,255,0.05)', border: '1px solid rgba(100,100,255,0.12)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#8888FF' }}>{analysis.estimated_tries}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>예상 소요 횟수</div>
              </div>
            </div>

            <button onClick={resetAll} style={{
              width: '100%', padding: 16, borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, #FF3C50, #FF6B35)',
              color: '#FFF', fontSize: 15, fontWeight: 800, cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(255,60,80,0.3)',
            }}>🕹️ 새로운 분석 시작</button>
          </div>
        )}

        <footer style={{ textAlign: 'center', padding: '30px 0 20px', fontSize: 11, color: '#444' }}>
          UFO Catcher Master v1.0 — AI-Powered Crane Game Strategy
        </footer>
      </div>
    </div>
  );
}

function InfoCell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#666', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#ccc', fontWeight: 600 }}>{value || '—'}</div>
    </div>
  );
}