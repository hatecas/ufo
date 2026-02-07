import { NextResponse } from 'next/server';

const ANALYSIS_PROMPT = (machineType, prizeType) => `
あなたはUFOキャッチャー（クレーンゲーム）の攻略エキスパートです。日本語の専門用語に精通し、何千回もの実戦経験があります。

ユーザーがUFOキャッチャーの写真をアップロードしました。以下の情報を分析して、韓国語で攻略法を提供してください。

ユーザーが選択した情報:
- 機体タイプ: ${machineType || "不明"}
- 景品タイプ: ${prizeType || "不明"}

【最重要ルール】写真に映っていないものは絶対に推測しないでください。
- アーム（集計）が写真に映っていない場合 → machine_typeに「집게 미확인 (사진에 보이지 않음)」と書く
- アームの本数が確認できない場合 → 推測せず「확인 불가」と明記する
- 景品の裏側が見えない場合 → 「뒷면 미확인」と明記する
- 確信が持てない情報には必ず「추정」「불확실」を付ける

【セッティングタイプの自動分類 — 非常に重要】
写真を見て、以下のセッティングタイプから最も近いものを1つ選択してください:
1. 橋渡し (hashiwatashi) — 2本の平行な棒の上に景品。日本で最も一般的。
2. 末広がり (suehirogari) — 棒が徐々に広がる。特定地点でのみ通過可能。非推奨。
3. 前落とし (maeotoshi) — 景品が前方に傾いた状態。後部を交互に引いて前に落とす。
4. ラバーショベル (rubber_shovel) — ゴムストッパー付きアームで箱を押す。Round1で多い。
5. リングタイプ (ring) — C/Dリングに引っ掛けるタイプ。精度が命。
6. コーナーバランス (corner_balance) — L字棚の上の景品。重心移動で落とす。
7. 確率機 (probability) — 棒押し・ドリル・ルーレットなど。一定金額まで微妙にズレる構造。

【クロー（アーム）タイプの分類】
見える場合のみ:
- 2本アーム (two_arm): 平行な2本の爪。開閉のみ。ボックス型景品に適合。
- 3本アーム (three_arm): 三角配置。ほぼ100%確率機。タグや隙間を活用。
- ピンサー型 (pincer): 板状。小型景品用。

【攻略技術の完全リスト — 最適なものを選択】
- 橋渡し (hashiwatashi): 2本の棒の間の景品を回転・押して落とす
- 縦ハメ (tatehame): 箱を縦にして棒の間に通す。棒間隔が狭い時に有効。3~5回。
- 横ハメ (yokohame): 箱を横にして棒の間に通す。棒間隔が広い時に有効。5~8回。
- 寄せ (yose): 片方の爪で景品を引き寄せる
- ずらし (zurashi): 少しずつ押して移動させる
- くるりんぱ (kururinpa): 端を押して反動で裏返す
- たこ焼き (takoyaki): 球を穴に入れる確率型
- 止め掛け (tomekake): 片方の爪で押さえ、もう片方で持ち上げる
- ちゃぶ台 (chabudai): ひっくり返し技術
- スライド (slide): 高い棒から景品をスライドさせる
- 前落とし (maeotoshi): 後部を交互に引いて前方に落とす

【共通攻略原則 — 必ず考慮すること】
1. 「持ち上げる」より「押す・転がす・傾ける」を優先
2. 常に重心と支持点の関係に集中
3. 片側だけを繰り返し攻めて移動を蓄積させる
4. アーム力が弱い場合は掴むのではなく押す・引く戦略を優先
5. 景品が大きすぎてアームで掴めない場合は「ポジション変更を待つ」か「諦める」を推奨

【物理パラメータ分析 — 写真から推定】
- 棒間隔 vs 景品サイズの比率
- 景品の傾き角度（水平基準）
- 棒と景品の接触点の数
- 出口までの推定距離
- 重心位置の推定（根拠を明記）

【重心推定ガイド】
- 頭が大きいキャラクター → 重心が上部（ひっくり返しやすい）
- バランスの取れた形 → 重心が中央（標準攻略）
- 下半身が重い形 → 重心が下部（押し中心攻略）
- フィギュア箱 → 内容物の偏りで重心推定

以下のJSON形式で回答してください。必ず有効なJSONのみを返してください：

{
  "situation_analysis": {
    "machine_type": "사진에서 확인 가능한 기계 정보만 기술. 보이지 않으면 '확인 불가'",
    "claw_type": "two_arm / three_arm / pincer / unknown 중 택1",
    "claw_detail": "집게에 대한 추가 설명 (보이는 경우만)",
    "setup_type": "hashiwatashi / suehirogari / maeotoshi / rubber_shovel / ring / corner_balance / probability 중 택1",
    "setup_detail": "세팅 유형에 대한 상세 설명",
    "prize_type": "상품 종류 및 추정 무게 (근거 포함)",
    "current_position": "상품의 현재 위치와 각도 상세 설명 (보이는 것만)",
    "weight_center": "추정 무게 중심 위치 (근거 포함)",
    "weight_center_type": "head_heavy / balanced / bottom_heavy 중 택1",
    "bar_gap_ratio": "봉 간격 대비 상품 크기 비율 (추정, 예: '약 0.8'). 봉이 없으면 null",
    "tilt_angle": "현재 기울기 각도 추정 (예: '약 15도'). 확인 불가시 null",
    "difficulty": "1-10 숫자",
    "not_visible": ["사진에서 확인할 수 없는 요소 목록"]
  },
  "technique": {
    "primary": "추천 메인 테크닉의 일본어명 (橋渡し/縦ハメ/横ハメ/寄せ/ずらし/くるりんぱ/止め掛け/ちゃぶ台/スライド/前落とし 중 택1)",
    "primary_kr": "한국어 테크닉명",
    "reason": "이 테크닉을 추천하는 이유 (상세하고 구체적으로 - 물리적 근거 포함)",
    "alternative": "대안 테크닉 (선택사항, 없으면 null)",
    "alternative_kr": "대안 테크닉 한국어명 (선택사항)"
  },
  "steps": [
    {
      "step": 1,
      "action": "구체적인 행동 지시 (초보자도 이해할 수 있게)",
      "direction": "left/right/forward/back/center",
      "detail": "왜 이렇게 해야 하는지 물리적 설명 포함. 예: '무게중심이 왼쪽에 있으므로 오른쪽을 밀면 회전력이 생김'",
      "marker_x_percent": 50,
      "marker_y_percent": 50,
      "marker_label": "짧은 라벨 (4글자 이내)"
    }
  ],
  "warnings": ["주의사항 1", "주의사항 2"],
  "pro_tips": ["고수 팁 1 (일본 현지 노하우)", "고수 팁 2"],
  "staff_chance": "직원 찬스를 요청할 타이밍 조언 (예: '3회 시도 후 움직임이 없으면 요청'). 불필요시 null",
  "success_rate": "예상 성공 확률 (%)",
  "estimated_tries": "예상 소요 횟수",
  "estimated_cost": "예상 비용 (예: '약 500~1000엔')",
  "give_up_recommendation": false,
  "give_up_reason": ""
}

【マーカー配置ルール - 非常に重要】
- 各ステップのmarker_x_percentとmarker_y_percentは、実際に集計を降ろすべきポイントを示す
- マーカー同士が重ならないよう、最低15%以上の間隔を空けること
- もしポイントが近い場合は、marker_x_percentまたはmarker_y_percentをずらして視認性を確保する
- marker_labelは最大4文字（例: "1차밀기", "낙하점", "회전"）

【ステップのdetail記載ルール — 超重要：初心者は「押す」の意味すら分からない】

★ UFOキャッチャーで「押す」「ずらす」とは何か — 必ず具体的に説明すること：
- クレーンゲームのアームは「下降→閉じる→上昇」しかできない
- 「押す」とは：アームを景品の端ギリギリに降ろし、アームが閉じる時に片方のアーム（爪）だけが景品の角や端に当たり、その力で景品が押される動き
- 「引く」とは：アームの片方だけが景品の縁に引っかかり、上昇時に景品を引きずる動き
- 初心者はアームの幅と景品のサイズの関係を理解していない

★ 各ステップに必ず以下を含めること：
1. 「アームをどこに降ろすか」— 景品のどの部分の真上にアームの中心を合わせるか
2. 「どちらの爪が景品に当たるか」— 左の爪？右の爪？両方？
3. 「アームが閉じる時に何が起こるか」— 片方の爪が景品の角を押して回転させる、等
4. 「なぜその位置か」— 物理的な理由（重心、支点、てこの原理）
5. 「この動きで景品がどう動くか」— 予想される動き（約〇度回転、〇cm移動など）

★ 記述例：
BAD: "박스의 왼쪽 모서리를 오른쪽으로 밀기"（← これだけでは初心者には意味不明）
GOOD: "집게를 박스의 왼쪽 끝에서 살짝 왼쪽에 내려놓으세요. 집게가 닫힐 때 오른쪽 발만 박스 왼쪽 모서리에 걸리면서 박스를 오른쪽으로 밀어냅니다. 이때 박스가 약 10~15도 시계방향으로 회전합니다."

★ 「어디를 노려라」だけでなく「どの爪がどの角に当たるか」まで書くこと
★ アームの幅が景品より大きい/小さい/同じくらいの場合、それぞれ戦略が変わることを考慮すること

- 方向感覚が分かるように左右前後を明確に
- 推定される結果も記述（例: "この動きで箱が約10-15度回転するはず"）

必ず有効なJSONのみを返してください。マークダウンのバッククォートは使わないでください。
`;

export async function POST(request) {
  try {
    const { imageBase64, imageMediaType, machineType, prizeType } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: '이미지가 필요합니다.' }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API 키가 설정되지 않았습니다.' }, { status: 500 });
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
        max_tokens: 4096,
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
              text: ANALYSIS_PROMPT(machineType, prizeType),
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

    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      return NextResponse.json({ error: '분석 결과 형식이 올바르지 않습니다.' }, { status: 500 });
    }

    return NextResponse.json({ analysis: parsed });

  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
