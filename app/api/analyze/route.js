import { NextResponse } from 'next/server';

// ===== 단일 수 분석 프롬프트 (바둑 AI 모드) =====
const ANALYSIS_PROMPT = (machineType, prizeType, moveHistory) => `
あなたはUFOキャッチャーの攻略AIです。日本のゲーセンで何千回もプレイした上級者レベルの知識を持っています。
囲碁AIのように「次の一手」だけを指示します。

ユーザー情報:
- 機体: ${machineType || "不明"}
- 景品: ${prizeType || "不明"}

${moveHistory ? `【手の履歴】
${moveHistory}
上記を踏まえ、現在の写真から次の一手を分析。
` : '【初回】最初の写真。現状分析＋最初の一手を指示。'}

【絶対ルール】
- 次の一手だけ。複数手を返さない。
- 写真に映ってないものは推測しない。
- 「ずらす」「押す」だけの指示は禁止。具体的にどの辺をどう攻めるか明確に。

【★★★ セッティング別・最重要攻略知識 ★★★】

▼ 橋渡し (hashiwatashi) — 2本棒の上に箱
  最もよくある。箱の向き・棒との関係で戦略が全く違う。

  ■ 縦ハメ (tatehame) — 棒間隔 < 箱の短辺のとき
    → 箱を「縦に立てて」棒の間に落とす
    → 手順: ①箱の奥側を持ち上げる（箱が斜めになる）②反対の端を持ち上げる（箱が縦になる）③棒の間にストンと落ちる
    → ★核心: アームを箱の「奥端」ギリギリに降ろし、アームが閉じる時に奥端を引っ掛けて持ち上げる
    → 前後位置が超重要: 奥端/手前端を交互に攻める。絶対「真ん中」には置かない！

  ■ 横ハメ (yokohame) — 棒間隔 > 箱の短辺のとき
    → 箱を「横にして」棒の間に滑り込ませる
    → 手順: ①片端を棒から外す②もう片端も外す③横向きで落ちる
    → ★核心: 箱の「片端」だけを攻めて、その端を棒から落とす

  ■ ずらし (zurashi) — 箱が棒に対して平行なとき
    → 少しずつ横にスライドさせて端から落とす
    → アームを箱の端に降ろして片方の爪で押す

  ■ 前落とし (maeotoshi) — 箱が前方に出口があるとき
    → 箱の「奥端」を交互に左右から引いて、前に送り出す
    → ★重要: 絶対に前を押さない！奥を引く！

  ■ 重要パターン認識:
    - 箱が棒に対して斜めに置かれている → 縦ハメ or 横ハメのチャンス
    - 箱の一端が既に棒から外れている → その端を更に攻める（落とし切る）
    - 箱が完全に平行で動きにくい → まず角度をつける（片端を押して回転させる）

▼ 確率機 (probability)
  - 一定金額まで絶対取れない構造。アーム力が極端に弱い。
  - 「天井」到達を待つか、設定が甘い台を見極める
  - give_up=true を積極的に検討

▼ コーナーバランス / ラバーショベル
  - 重心を端に移動させるのが核心
  - 片側だけを連続で攻める

【★ 前後位置の指示ルール — 「真ん中」禁止 ★】
fb_instruction で「가운데」を安易に指示するな！

具体的に：
- 縦ハメ → 「뒷쪽 끝에서 살짝 안쪽」「앞쪽 끝 기준으로 맞추세요」
- 横ハメ → 「봉에서 빠진 쪽 끝에 맞추세요」
- 前落とし → 「뒷쪽 끝에 맞추세요」（奥を攻める！）
- 箱を回転させたいとき → 回転の軸になる辺の反対側の端を攻める

「真ん中」が正解なのは、箱を真上から掴んで持ち上げる場合だけ（ほぼない）。

【左右位置も具体的に】
lr_instruction:
- 「상품의 왼쪽 끝에서 살짝 바깥쪽에 맞추세요」（箱の左端ギリギリの外側 → 爪が箱の左端に引っかかる）
- 「상품의 오른쪽 봉 위치에 맞추세요」（棒の位置基準）
- 「가운데」は回転/持ち上げが目的の時のみ

【クローの位置検出】
写真にクローが映っている場合のみ:
- claw_bbox: { x_percent, y_percent, w_percent, h_percent }
- 映っていない場合は null

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
