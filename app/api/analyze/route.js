import { NextResponse } from 'next/server';
import sharp from 'sharp';

// ===== 이미지 전처리: 리사이즈만 (속도 최적화) =====
// 기존: normalize+sharpen+modulate → 느림
// 변경: 1024px 리사이즈 + JPEG 80% → 전송량 대폭 감소
async function prepareImage(base64Data, mediaType) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const processed = await sharp(buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .toFormat('jpeg', { quality: 80 })
      .toBuffer();
    return { data: processed.toString('base64'), type: 'image/jpeg' };
  } catch (err) {
    console.warn('Image prep failed, using original:', err.message);
    return { data: base64Data, type: mediaType };
  }
}

// ===== 시스템 프롬프트 (정적 — cache_control로 캐싱) =====
// 기존 210줄 → 핵심만 압축. 반복 호출 시 캐시 히트로 입력 처리 시간 절약
const SYSTEM_PROMPT = `あなたはUFOキャッチャー物理分析の専門家。写真から「次の一手」の正確な座標を算出せよ。

【用語】받침봉=景品を乗せる横棒, 집게=クロー装置, 집게발=クロー先端
→「봉」単体禁止。必ず「받침봉」「집게」「집게발」と区別して韓国語出力。

【出力ルール】
・visual_guide: cm禁止。写真の地形地物で案内（例:「박스 뒷면 끝선에 맞춰서」「뒤쪽 받침봉 바로 위」）
・action: 動作ニュアンスまで（例:「집게가 내려가면서 박스 뒷면을 스치듯 눌러서 앞으로 밀어내기」）
・tip: 停止タイミングを視覚的に（例:「집게발이 박스 뒷면 선과 일치할 때 버튼을 누르세요」）

【分析手順】
1. 棒(받침봉)の位置・ゴム有無(μ_bar)、壁/シールド確認
2. 景品: 形状・素材(μ_claw)・重心(G)→stable/critical/unstable
3. オーバーハング実測: d_front/d_back/d_left/d_right → d_max方向＝攻略方向
   ★固定観念禁止:「前落としは後ろ」等のルール厳禁。必ずd比較で物理的に判断
4. トルク: 2箇所以上でT=F×d比較→効率高い点を選択
5. 衝突: Low/Med/High判定。Med以上→座標3-5%修正
6. 座標: A1(景品左上%), A2(右下%), A3(前棒y%)定義→計算でtarget算出

【座標ルール】target_x/yは景品の物理表面上のみ。空中禁止。計算過程を示すこと。`;

// ===== 동적 유저 프롬프트 (이미지와 함께 전송) =====
function getUserPrompt(machineType, prizeType, moveHistory) {
  let prompt = `機体=${machineType || "不明"}, 景品=${prizeType || "不明"}\n`;
  if (moveHistory) {
    prompt += `【履歴】\n${moveHistory}\n現在状態から次の一手。前回と違うアプローチを検討。\n`;
  } else {
    prompt += `【初回】最初の一手を指示。\n`;
  }
  prompt += `
以下のJSONのみで回答（バッククォート不要）:
{
  "move_number": ${moveHistory ? '次の番号' : '1'},
  "physics_engine": {
    "anchors": { "bars": "봉 인식", "overhang_comparison": "d_front vs d_back 비교" },
    "center_of_gravity": "G→stable/critical/unstable",
    "friction": "μ_bar, μ_claw 판정",
    "torque_comparison": "후보 비교",
    "collision_check": { "risk": "Low/Med/High", "detail": "장애물", "adjustment": "수정 또는 없음" }
  },
  "anchors": { "prize_top_left": {"x_pct":0,"y_pct":0}, "prize_bottom_right": {"x_pct":0,"y_pct":0}, "front_bar_y_pct": 0 },
  "reasoning": "핵심 판단 2-3문장",
  "technique": { "name_kr": "기술명", "logic": "선택 근거 1문장" },
  "claw_bbox": { "x_percent": 0, "y_percent": 0, "w_percent": 0, "h_percent": 0 },
  "next_move": {
    "action": "구체적 동작",
    "visual_guide": "좌우+앞뒤 위치 (지형지물 기반)",
    "force_type": "push/lift/torque",
    "expected_movement": "예상 움직임",
    "target_x_percent": 50, "target_y_percent": 50
  },
  "situation_analysis": { "setup_type": "세팅", "progress": "진행도", "difficulty": 5 },
  "estimated_remaining_moves": "예상 횟수",
  "tip": "조준 멈춤 타이밍"
}`;
  return prompt;
}

// ===== JSON 파싱 헬퍼 =====
function parseJSON(text) {
  try {
    return JSON.parse(text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim());
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('JSON not found');
  }
}

// ===== 좌표 클램핑 =====
function clampCoordinates(parsed) {
  const a = parsed.anchors;
  if (a?.prize_top_left && a?.prize_bottom_right) {
    const minX = Math.max(5, (a.prize_top_left.x_pct || 5) - 10);
    const maxX = Math.min(95, (a.prize_bottom_right.x_pct || 95) + 10);
    const minY = Math.max(5, (a.prize_top_left.y_pct || 5) - 10);
    const maxY = Math.min(95, (a.prize_bottom_right.y_pct || 95) + 10);
    parsed.next_move.target_x_percent = Math.max(minX, Math.min(maxX, parsed.next_move.target_x_percent || 50));
    parsed.next_move.target_y_percent = Math.max(minY, Math.min(maxY, parsed.next_move.target_y_percent || 50));
  } else {
    parsed.next_move.target_x_percent = Math.max(5, Math.min(95, parsed.next_move.target_x_percent || 50));
    parsed.next_move.target_y_percent = Math.max(5, Math.min(95, parsed.next_move.target_y_percent || 50));
  }
}

// ===== API 엔드포인트 (SSE 스트리밍) =====
export async function POST(request) {
  try {
    const { imageBase64, imageMediaType, machineType, prizeType, moveHistory } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
    }

    // 서버 리사이즈 (클라이언트에서 이미 리사이즈했지만 안전장치)
    const img = await prepareImage(imageBase64, imageMediaType);

    let historyText = '';
    if (moveHistory && moveHistory.length > 0) {
      historyText = moveHistory.map((m, i) =>
        `${i + 1}手目: ${m.action} → ${m.result || '不明'}`
      ).join('\n');
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 진행 상태: AI 호출 시작
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'calling_ai' })}\n\n`));

          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1500,
              temperature: 0.3,
              stream: true,
              system: [{
                type: 'text',
                text: SYSTEM_PROMPT,
                cache_control: { type: 'ephemeral' },
              }],
              messages: [{
                role: 'user',
                content: [
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: img.type,
                      data: img.data,
                    },
                  },
                  {
                    type: 'text',
                    text: getUserPrompt(machineType, prizeType, historyText || null),
                  },
                ],
              }],
            }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'error',
              message: errData?.error?.message || `API 오류 (${response.status})`,
            })}\n\n`));
            controller.close();
            return;
          }

          // Anthropic SSE 스트림 읽기
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'generating', chars: 0 })}\n\n`));

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let fullText = '';
          let charsSent = 0;

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            for (const line of chunk.split('\n')) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const event = JSON.parse(line.slice(6));
                  if (event.type === 'content_block_delta' && event.delta?.text) {
                    fullText += event.delta.text;
                    // 150자마다 진행 상태 전송
                    if (fullText.length - charsSent > 150) {
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({
                        status: 'generating',
                        chars: fullText.length,
                      })}\n\n`));
                      charsSent = fullText.length;
                    }
                  }
                } catch { /* SSE 파싱 에러 무시 */ }
              }
            }
          }

          if (!fullText) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'error', message: 'AI 응답이 비어있습니다.',
            })}\n\n`));
            controller.close();
            return;
          }

          // JSON 파싱 + 좌표 클램핑
          let parsed;
          try {
            parsed = parseJSON(fullText);
          } catch {
            console.error('JSON parse failed:', fullText.substring(0, 500));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'error', message: 'AI 응답을 파싱할 수 없습니다.',
            })}\n\n`));
            controller.close();
            return;
          }

          if (!parsed.next_move) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              status: 'error', message: '분석 결과 형식이 올바르지 않습니다.',
            })}\n\n`));
            controller.close();
            return;
          }

          clampCoordinates(parsed);

          // 최종 결과 전송
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'done',
            analysis: parsed,
          })}\n\n`));

        } catch (err) {
          console.error('Stream error:', err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            status: 'error', message: err.message || '서버 오류',
          })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
