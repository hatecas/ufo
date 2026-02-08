import { NextResponse } from 'next/server';
import sharp from 'sharp';

// ===== 이미지 전처리: 대비 강화로 봉/재질 인식률 향상 =====
async function enhanceImage(base64Data, mediaType) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const enhanced = await sharp(buffer)
      .normalize()
      .sharpen({ sigma: 1.2 })
      .modulate({ brightness: 1.05 })
      .toFormat(mediaType === 'image/png' ? 'png' : 'jpeg', { quality: 90 })
      .toBuffer();
    return enhanced.toString('base64');
  } catch (err) {
    console.warn('Image enhancement failed, using original:', err.message);
    return base64Data;
  }
}

// ===== UFO Catcher Master v3.0 — 물리+기하학 통합 분석 프롬프트 =====
const ANALYSIS_PROMPT = (machineType, prizeType, moveHistory) => `
あなたはUFOキャッチャーの物理・幾何学分析の専門家です。
単純な説明ではなく、写真のピクセルデータと物理法則を融合して「実際に成功可能な座標」を算出することが目的です。
囲碁AIのように「次の一手」だけを正確に指示してください。

ユーザー情報: 機体=${machineType || "不明"}, 景品=${prizeType || "不明"}
${moveHistory ? `\n【手の履歴】\n${moveHistory}\n上記を踏まえ、この写真の現在状態から次の一手を分析。` : '【初回】写真を分析し、最初の一手を指示。'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 0: 思考プロセス強制 (Chain of Thought)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JSONを書く前に、内部的に以下の順序で必ず思考せよ:
1. アンカー識別: 写真内の「棒(Bar)」と「景品の4つの角」の座標を確定する。
2. オーバーハング比較: [前方棒→前端の距離d1] vs [後方棒→後端の距離d2] を比較し、d_maxを持つ側を特定。
3. 衝突チェック: 選択した攻略点の周囲10%領域に在庫箱・機械壁面・シールドがないか確認。
4. 座標検証: 最終target_x/yが空中ではなく「景品の物理的表面」上にあることを再確認。

★★★ 重要: 固定観念を捨てよ (Anti-Fixed Rule) ★★★
"前落としは必ず後ろを攻める"などの固定ルールに従うな。
必ずオーバーハング比較(d1 vs d2)を行い、物理的にd_maxの側を選べ。
前方がより突き出ているなら、前方を攻めるのが物理的正解。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 1: 地形・物理認識 (Anchoring & Physics)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. アンカー設定:
   - 写真内の「棒(Bar)」の位置を基準線(Baseline)として設定
   - 棒にゴム(滑り止め)があるか確認 → μ_barに直結
   - 壁・シールド(ツメ)の有無と高さ

B. 景品分析:
   - 形状: 箱型/人形型/不規則型
   - 素材: ビニール(μ低)→Push有効 / 紙箱・布(μ高)→Lift検討
   - フィギュア箱: キャラの顔側 = 重い側と推定
   - 長軸・短軸の向き

C. オーバーハング(はみ出し)の実測比較:
   ★ これが最重要判断材料。必ず両方向で測定せよ:
   - d_front = 前方棒から景品前端までの距離(cm推定)
   - d_back = 後方棒から景品後端までの距離(cm推定)
   - d_left = 左棒から景品左端までの距離
   - d_right = 右棒から景品右端までの距離
   → d_max(最も突き出ている方向)が最適攻略方向

D. スケール推定:
   棒の太さ(≒2~3cm)または箱の一辺を基準尺にして pixel→cm 変換

E. 落とし口(Exit)の位置と最短経路

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 2: 物理エンジン (Physics Engine)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 重心(G)推定と安定性判定:
  - G が棒の間の中央付近 → stable → 大きな力が必要
  - G が片方の棒に偏っている → critical → もう少しで落ちる
  - G が棒の外側にはみ出し → unstable → 軽い力で落下

■ 摩擦の2面分析:
  μ_bar(棒): ゴム付き→0.7~0.9(高) / 金属→0.2~0.4(低)
  μ_claw(集計): ゴム足→0.6~0.8 / プラ→0.2~0.3
  判定:
  - μ_bar高&μ_claw低 → Torque(回転)一択
  - μ_bar低&μ_claw低 → Push有効
  - μ_bar低&μ_claw高 → Lift有効
  - μ_bar高&μ_claw高 → Lift有効

■ トルク比較 (T = F × d × sinθ):
  ★ 必ず2箇所以上の候補点で d(cm) を比較:
  例: "前端d1=6cm T≈F×5.9 vs 後端d2=3cm T≈F×2.95 → 前端が2.0倍効率的"
  → d_maxの点を選択。「いつも後ろ」ではない！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 3: 衝突回避 (Collision Guard)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

選択した攻略点に対して:
1. 集計が降下する経路に障害物(隣の在庫箱、機械の壁、シールド)はないか？
2. 集計の開閉幅を考慮し、狭い場所では力が十分に伝わらない可能性はないか？
3. 障害物リスク:
   - Low: 障害物なし → そのまま実行
   - Med: 軽微な干渉可能性 → 座標を3~5%ずらして回避
   - High: 集計が入れない → 即座に次善の候補点に変更

★ collision_risk が Med/High なら、座標修正の根拠を必ず記載。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 4: アンカー座標算出 (Anchor-based Targeting)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

★★★ target_x/y_percent 決定前に、以下を定義せよ ★★★

1. A1 = 景品の左上角 (x%, y%)
2. A2 = 景品の右下角 (x%, y%)
3. A3 = 前方棒のy座標 (y%)

例:
  "A1(22%,28%)〜A2(68%,72%)。前方棒A3≈y58%。
   d_max方向=前方(d_front=6cm > d_back=3cm)。
   攻略点=景品前端の中央やや右。
   target_x = 22 + (68-22)×0.6 = 49.6% → 50%
   target_y = A2のy - 3% = 69%"

計算過程を示すこと。「なんとなく50%」は禁止。
最終座標が景品表面上にあることを確認。

${moveHistory ? '【同じ指示の繰り返し禁止】前回と違うアプローチを検討。' : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
以下のJSONで回答。有効なJSONのみ。バッククォート不要。

{
  "move_number": ${moveHistory ? '次の手番号' : '1'},
  "physics_engine": {
    "anchors": {
      "bars": "봉 인식: 위치, 간격, 고무 유무",
      "overhang_comparison": "d_front=Xcm, d_back=Ycm, d_left=Xcm, d_right=Ycm → d_max 방향=[앞/뒤/좌/우]"
    },
    "center_of_gravity": "무게중심(G): 위치 + 근거 → stable/critical/unstable",
    "friction": "μ_bar=X(고무유무), μ_claw=Y(고무발유무) → Push/Lift/Torque 판정",
    "torque_comparison": "후보A: d=Xcm T≈F×Y vs 후보B: d=Xcm T≈F×Y → A가 Z배 효율적",
    "collision_check": {
      "risk": "Low/Med/High",
      "detail": "장애물 분석 (벽/재고 박스/쉴드 등)",
      "adjustment": "장애물로 인해 좌표를 수정했는지 여부 + 내용"
    }
  },
  "anchors": {
    "prize_top_left": { "x_pct": 0, "y_pct": 0 },
    "prize_bottom_right": { "x_pct": 0, "y_pct": 0 },
    "front_bar_y_pct": 0
  },
  "reasoning": "STEP 0-4의 사고과정을 종합. 오버행 비교→토크 비교→충돌 체크→좌표 검증 순서로 3-4문장",
  "technique": {
    "name_kr": "기술명",
    "logic": "왜 이 기술이 지금 물리적으로 최선인지 근거 2문장"
  },
  "claw_bbox": { "x_percent": 0, "y_percent": 0, "w_percent": 0, "h_percent": 0 },
  "next_move": {
    "action": "이번 수 행동 요약 (Push/Lift/Torque + 방향)",
    "visual_guide": "좌우: [봉/모서리 기준 상대 위치 cm], 앞뒤: [봉/모서리 기준 상대 위치 cm]",
    "force_type": "push / lift / torque",
    "expected_movement": "예상 움직임: X방향으로 약 Y도 회전 / Xcm 이동",
    "target_x_percent": 50,
    "target_y_percent": 50
  },
  "situation_analysis": {
    "setup_type": "세팅 유형",
    "progress": "진행도",
    "difficulty": 5,
    "remaining_path": "낙하구까지 남은 경로"
  },
  "is_final_move": false,
  "give_up": false,
  "give_up_reason": "",
  "estimated_remaining_moves": "예상 남은 횟수",
  "tip": "실전 조작 시 주의사항 (예: 집게를 너무 깊게 넣지 말 것)"
}

【座標ルール】target_x/yは景品の物理表面上のみ。空中座標禁止。アンカー計算に基づくこと。
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

    // 이미지 전처리: 대비 강화 → 봉/재질 인식률 향상
    const enhancedBase64 = await enhanceImage(imageBase64, imageMediaType);

    let historyText = '';
    if (moveHistory && moveHistory.length > 0) {
      historyText = moveHistory.map((m, i) =>
        `${i + 1}手目: ${m.action} → 結果: ${m.result || '不明'} / 力: ${m.force_type || '不明'}`
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
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: imageMediaType || 'image/jpeg',
                data: enhancedBase64,
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

    // 앵커 기반 좌표 검증: target이 경품 범위 밖이면 클램프
    const anchors = parsed.anchors;
    if (anchors?.prize_top_left && anchors?.prize_bottom_right) {
      const minX = Math.max(5, (anchors.prize_top_left.x_pct || 5) - 10);
      const maxX = Math.min(95, (anchors.prize_bottom_right.x_pct || 95) + 10);
      const minY = Math.max(5, (anchors.prize_top_left.y_pct || 5) - 10);
      const maxY = Math.min(95, (anchors.prize_bottom_right.y_pct || 95) + 10);
      parsed.next_move.target_x_percent = Math.max(minX, Math.min(maxX, parsed.next_move.target_x_percent || 50));
      parsed.next_move.target_y_percent = Math.max(minY, Math.min(maxY, parsed.next_move.target_y_percent || 50));
    } else {
      parsed.next_move.target_x_percent = Math.max(5, Math.min(95, parsed.next_move.target_x_percent || 50));
      parsed.next_move.target_y_percent = Math.max(5, Math.min(95, parsed.next_move.target_y_percent || 50));
    }

    return NextResponse.json({ analysis: parsed });

  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
