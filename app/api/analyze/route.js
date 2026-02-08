import { NextResponse } from 'next/server';

// ===== 프롬프트: "먼저 봐라, 그 다음 판단하라" 구조 =====
const ANALYSIS_PROMPT = (machineType, prizeType, moveHistory) => `
あなたはUFOキャッチャーの攻略AIです。囲碁AIのように「次の一手」だけを指示します。

ユーザー情報: 機体=${machineType || "不明"}, 景品=${prizeType || "不明"}
${moveHistory ? `\n【手の履歴】\n${moveHistory}\n上記を踏まえ、この写真の状態から次の一手を。` : '【初回】写真を分析し、最初の一手を指示。'}

【★★★ 最重要: まず写真を詳細に観察せよ ★★★】
JSONを書く前に、以下を必ず具体的に確認すること。これが全ての判断の根拠になる：

A. 棒の配置: 2本の平行な棒か？広がっているか？棒の間隔は箱に対して広いか狭いか？
B. 箱の向き: 棒に対して平行か？斜めか？どちらの端が奥か？
C. 箱の現在位置: 棒の上にしっかり載っているか？片端が既にはみ出ているか？傾いているか？
D. 出口(落とし口)の位置: 手前か？奥か？棒の間か？
E. 箱のサイズと棒間隔の関係: 箱の短辺は棒間隔より大きいか小さいか？
F. クロー(アーム)が見えるか？見える場合その位置は？

上記A-Fの観察結果に基づいて、テクニックと具体的な位置を決定すること。
「なんとなく」で判断するな。必ず写真から見えた具体的な根拠を示せ。

【テクニック選択ガイド — 観察結果に基づいて選べ】

IF 棒間隔 < 箱の短辺 AND 出口が棒の間:
  → 縦ハメ (tatehame): 箱を縦にして棒の間に落とす
  → 箱の片端を持ち上げて角度をつける。奥端と手前端を交互に攻める。

IF 棒間隔 > 箱の短辺:
  → 横ハメ (yokohame): 箱を横にして棒の間から落とす
  → 片端だけを攻めて棒から外す。

IF 箱が既に斜めになっている:
  → 既に進行中。傾いている方向を更に攻めて落とす。

IF 箱が棒に平行で全く動きにくい状態:
  → まず回転させる: 片端の角を押して箱に角度をつける。

IF 箱が前方に突き出ている + 手前に出口:
  → 前落とし (maeotoshi): 箱の奥端を左右交互に引いて前に送る。

IF 3本アーム or ボタン押し or ドリル:
  → 確率機 (probability): give_up検討。

IF 箱の一端が既に棒から外れかけている:
  → その端を更に攻めて完全に落とす。「外れかけ」を見逃すな！

【位置指示 — 写真から見えた具体物を基準にせよ】
★ 「좌우」「앞뒤」は、写真の中の具体的な物を基準にすること:
  - "좌우: 박스 왼쪽 끝의 바깥쪽, 왼쪽 봉 바로 위에 맞추세요"
  - "앞뒤: 박스 뒷면 끝에 맞추세요 (뒤쪽 봉보다 살짝 안쪽)"
  - "좌우: 오른쪽 봉과 박스 오른쪽 모서리가 만나는 지점"
★ 「가운데」は最後の手段。ほとんどの場合、端/角/モサリを攻める。
★ 写真に棒が見えるなら、棒の位置を基準に使え。

【同じ指示の繰り返し禁止】
前回と全く同じ位置・同じアクションを指示するな。
${moveHistory ? '前回の手と違うアプローチを必ず検討すること。同じ位置がベストでも、少なくとも理由を変えて説明せよ。' : ''}

以下のJSONで回答。有効なJSONのみ。バッククォート不要。

{
  "move_number": ${moveHistory ? '次の手番号' : '1'},
  "observation": {
    "bars": "봉 배치 상태 (2개 평행/넓어지는 형태 등)",
    "bar_gap_vs_box": "봉 간격 vs 박스 크기 관계 (간격이 더 넓다/좁다/비슷하다)",
    "box_orientation": "박스 방향 (봉에 평행/비스듬/세로 등)",
    "box_position": "박스 위치 (봉 위에 안정적/한쪽이 빠져나옴/기울어짐 등)",
    "exit_direction": "출구(낙하구) 방향 (앞쪽/봉 사이/확인불가)",
    "claw_visible": true
  },
  "reasoning": "관찰 결과를 근거로, 왜 이 테크닉과 위치를 선택했는지 2-3문장",
  "technique": {
    "name_jp": "テクニック名",
    "name_kr": "한국어명"
  },
  "claw_bbox": { "x_percent": 0, "y_percent": 0, "w_percent": 0, "h_percent": 0 },
  "next_move": {
    "action": "이번 수 한줄 요약",
    "lr_instruction": "좌우: [사진에서 보이는 구체적 기준물 기반 위치]",
    "fb_instruction": "앞뒤: [사진에서 보이는 구체적 기준물 기반 위치]",
    "why": "이 위치를 선택한 이유 (관찰 결과 기반)",
    "expected_result": "예상 결과",
    "target_x_percent": 50,
    "target_y_percent": 50
  },
  "situation_analysis": {
    "setup_type": "hashiwatashi 등",
    "progress": "진행도",
    "difficulty": 5
  },
  "is_final_move": false,
  "give_up": false,
  "give_up_reason": "",
  "estimated_remaining_moves": "3-4수",
  "tip": "핵심 팁"
}

【target_x/y ルール】景品の上/直近のみ。離れた位置禁止。
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
    parsed.next_move.target_x_percent = Math.max(5, Math.min(95, parsed.next_move.target_x_percent || 50));
    parsed.next_move.target_y_percent = Math.max(5, Math.min(95, parsed.next_move.target_y_percent || 50));

    return NextResponse.json({ analysis: parsed });

  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
