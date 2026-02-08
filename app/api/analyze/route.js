import { NextResponse } from 'next/server';

// ===== 단일 수 분석 프롬프트 (바둑 AI 모드) =====
const ANALYSIS_PROMPT = (machineType, prizeType, moveHistory) => `
あなたはUFOキャッチャー（クレーンゲーム）の攻略AIです。囲碁AIのように「次の一手」だけを指示します。

ユーザーが選択した情報:
- 機体タイプ: ${machineType || "不明"}
- 景品タイプ: ${prizeType || "不明"}

${moveHistory ? `【これまでの手の履歴】
${moveHistory}
上記の手を踏まえて、現在の写真から「次の一手」を分析してください。
` : '【初回分析】これが最初の写真です。現在の状態を分析し、最初の一手を指示してください。'}

【最重要ルール】
- 「次の一手」だけを指示すること。複数手を返さない。
- 写真に映っていないものは推測しない
- 「ユーザーは初心者」前提で、超シンプルに説明する

【セッティングタイプ分類】
1. 橋渡し (hashiwatashi) — 2本の平行な棒の上に景品
2. 末広がり (suehirogari) — 棒が広がる
3. 前落とし (maeotoshi) — 前に傾いた状態
4. ラバーショベル (rubber_shovel) — ゴムストッパー
5. リングタイプ (ring) — リング引っ掛け
6. コーナーバランス (corner_balance) — L字棚
7. 確率機 (probability) — 棒押し・ドリル等

【攻略テクニック】
橋渡し / 縦ハメ / 横ハメ / 寄せ / ずらし / くるりんぱ / 前落とし / 止め掛け / スライド

【クローの位置検出 — 超重要】
★ 写真に映っているクロー（アーム/集計）の現在位置を特定してください
★ クローのバウンディングボックスを画像のパーセント座標で返すこと
  - claw_bbox.x_percent: クロー左端のX座標 (0-100)
  - claw_bbox.y_percent: クロー上端のY座標 (0-100)
  - claw_bbox.w_percent: クロー幅 (0-100)
  - claw_bbox.h_percent: クロー高さ (0-100)
★ クローが写真に映っていない場合は null

【位置指示ルール — 初心者でも迷わない表現】
★ 「左右」と「前後（奥手前）」を分けて指示すること：
  - lr_instruction: "좌우: 집게 봉을 상품의 [오른쪽 끝 / 왼쪽 끝 / 가운데 / 오른쪽에서 1/3 지점] 에 맞추세요"
  - fb_instruction: "앞뒤: 상품의 [앞쪽 끝 / 뒤쪽 끝 / 가운데 / 앞에서 1/3 지점] 에 맞추세요"
★ 相対的な表現を使う（商品の端、棒の位置を基準に）
★ 「約◯cm」のような曖昧な表現は避け、「商品の右端に合わせる」のような明確な表現を使う

以下のJSON形式で回答してください。有効なJSONのみ返してください：

{
  "move_number": ${moveHistory ? '次の手番号(整数)' : '1'},
  "situation_analysis": {
    "setup_type": "hashiwatashi / maeotoshi / probability 等",
    "prize_position": "상품의 현재 상태 간단 설명",
    "progress": "전체 진행도 추정 (예: '아직 시작 전', '절반 정도 진행', '거의 다 됨')",
    "difficulty": "1-10 숫자"
  },
  "technique": {
    "name_jp": "テクニック日本語名",
    "name_kr": "한국어 이름"
  },
  "claw_bbox": {
    "x_percent": 0,
    "y_percent": 0,
    "w_percent": 0,
    "h_percent": 0
  },
  "next_move": {
    "action": "이번 수 한줄 요약 (예: '오른쪽 모서리 밀기')",
    "lr_instruction": "좌우: 집게 봉을 상품의 [위치] 에 맞추세요",
    "fb_instruction": "앞뒤: 상품의 [위치] 에 맞추세요",
    "why": "왜 이 위치인지 한줄 설명",
    "expected_result": "이렇게 하면 상품이 어떻게 될지 (예: '시계방향으로 약간 회전')",
    "target_x_percent": 50,
    "target_y_percent": 50
  },
  "is_final_move": false,
  "give_up": false,
  "give_up_reason": "",
  "estimated_remaining_moves": "남은 예상 횟수",
  "tip": "이번 수 핵심 팁 한줄"
}

【target_x/y_percent ルール】
- 景品の上またはすぐ近くに配置（景品から離れた位置は禁止）
- クローを降ろすべき正確なポイント

有効なJSONのみ返してください。バッククォート不要。
`;

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

    // moveHistory를 프롬프트용 텍스트로 변환
    let historyText = '';
    if (moveHistory && moveHistory.length > 0) {
      historyText = moveHistory.map((m, i) =>
        `${i + 1}手目: ${m.action} (結果: ${m.result || '不明'})`
      ).join('\n');
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType || 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: ANALYSIS_PROMPT(machineType, prizeType, historyText || null),
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error('Anthropic API error:', errData);
      return NextResponse.json(
        { error: errData?.error?.message || `AI API 오류 (${response.status})` },
        { status: response.status }
      );
    }

    const data = await response.json();
    const text = data.content?.map(i => i.text || '').filter(Boolean).join('\n') || '';

    if (!text) {
      return NextResponse.json({ error: 'AI 응답이 비어있습니다.' }, { status: 500 });
    }

    let parsed;
    try {
      const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          parsed = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('JSON not found');
        }
      } catch {
        console.error('JSON parse failed:', text);
        return NextResponse.json({ error: 'AI 응답을 파싱할 수 없습니다.' }, { status: 500 });
      }
    }

    if (!parsed.next_move) {
      return NextResponse.json({ error: '분석 결과 형식이 올바르지 않습니다.' }, { status: 500 });
    }

    // target 위치 클램프
    if (parsed.next_move) {
      parsed.next_move.target_x_percent = Math.max(5, Math.min(95, parsed.next_move.target_x_percent || 50));
      parsed.next_move.target_y_percent = Math.max(5, Math.min(95, parsed.next_move.target_y_percent || 50));
    }

    return NextResponse.json({ analysis: parsed });

  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
