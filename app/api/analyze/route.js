import { NextResponse } from 'next/server';

// ===== 물리 기반 크레인 게임 공략 알고리즘 프롬프트 =====
const ANALYSIS_PROMPT = (machineType, prizeType, moveHistory) => `
あなたはUFOキャッチャーの物理分析AIです。
物理法則（トルク・摩擦力・重心）に基づいて最適な攻略ポイントを計算し、囲碁AIのように「次の一手」を指示します。

ユーザー情報: 機体=${machineType || "不明"}, 景品=${prizeType || "不明"}
${moveHistory ? `\n【手の履歴】\n${moveHistory}\n上記を踏まえ、この写真の状態から次の一手を分析。` : '【初回】写真を分析し、最初の一手を指示。'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 1: 地形・物体の認識 (Terrain Mapping)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
写真から以下を正確に読み取れ：

A. 支持構造 (Support Structure):
   - 棒(Bar)は何本？平行か？間隔は？
   - 棒にゴム(滑り止め)はあるか？
   - 棒の傾斜はあるか？（前下がり/後ろ下がり）
   - 壁・シールド(ツメ)の有無と高さ

B. 景品の状態 (Prize State):
   - 形状: 箱型/人形型/不規則型
   - 素材: ビニール包装/紙箱/布 → 摩擦係数(μ)に影響
   - 長軸・短軸の方向
   - 箱の場合、棒に対して平行か斜めか

C. 接触点分析 (Contact Points):
   - 景品が棒に触れている点は何箇所？どこ？
   - 安定(Stable)か不安定(Unstable)か？
   - はみ出し(Overhang)があるか？どちら方向にどの程度？

D. 落とし口 (Exit):
   - 位置: 手前/奥/棒の間/左/右
   - 景品から落とし口までの最短経路

E. クロー(アーム):
   - 見えるか？ 位置は？ 2本アーム or 3本アーム？
   - 推定アーム力: 強/中/弱（機種から推定）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 2: 物理パラメータの推定 (Physics Estimation)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 重心(Center of Gravity) 推定:
- 箱型: 幾何学的中心 ≈ 重心
- 人形型: 上半身(頭部)側に偏る → 頭部側が重い
- 不規則: 色が濃い部分/大きい部分に重心が偏る
- 現在の傾きがあれば、重心がどちら側に寄っているか推定

■ トルク計算の考え方 (T = F × d × sinθ):
- F: クローの押す力/掴む力
- d: 支点(棒)からクローの接触点までの距離
- θ: 力の方向と腕の角度
→ dが大きいほど(棒から遠いほど)少ない力で大きく回転できる
→ 棒に近すぎる場所を攻めても回転しにくい！

■ 摩擦の判断:
- ビニール包装 → μ低い → 滑りやすい → 「押し(Push)」が有効
- 紙箱/布 → μ高い → 掴めるかも → 「持ち上げ(Lift)」も検討
- 棒にゴム → μ高い → 簡単にはズレない → 持ち上げ系が必要

■ 安定性の判断:
- 重心が支持点(2本の棒の間)の上にある → 安定 → 大きな力が必要
- 重心が支持点の外側にはみ出している → 不安定 → 少しの力で落ちる
- 片端がすでに浮いている → 非常に不安定 → そこを攻めれば落ちる

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 3: セッティング別 最適攻略 (Setting-specific Logic)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 橋渡し(Hashiwatashi) + 縦ハメ(Tatehame):
条件: 棒間隔 < 箱の短辺（箱は棒の間に落ちない状態）
戦略: 箱を縦に傾けて棒の間に通す
物理: 箱の端を持ち上げて角度θをつける。θが大きくなるほど重心が棒の内側に移動し、自重で落ちる。
攻撃点: 棒から最も遠い端（d最大 → トルク最大）
手順:
  1手目: 奥端の角を攻める（持ち上げ）→ 手前が下がり始める
  2手目: 手前端の角を攻める → 奥が下がる → 角度が増す
  3手目以降: 交互に繰り返し。角度が45°超えたら自重で落下。
位置: 攻める端の「棒から最も遠い角」が最適。中央ではない！

■ 橋渡し + 横ハメ(Yokohame):
条件: 棒間隔 > 箱の短辺（箱の短辺が棒の間を通る）
戦略: 箱を横にして棒の間から落とす
物理: 片端を棒から外すことで、重心が片方の棒だけで支える状態に → 不安定化
攻撃点: 外したい側の端、棒の真上 or やや外側
手順: 片端を繰り返し攻めて少しずつ棒から外す。反対側は攻めない。

■ 前落とし(Maeotoshi):
条件: 景品が前方に突き出ている + 手前に出口
物理: 奥端を押すことで景品全体を前方にスライド。μが低ければ効果大。
攻撃点: 必ず奥端(後ろ側)! 左右を交互に変えて蛇行前進させる。
注意: 前端を攻めるのは無意味(押し戻してしまう)。

■ くるりんぱ(Kurulinpa) / 回転:
条件: 箱が棒に平行で安定しすぎている
物理: 箱の角を押して回転モーメントを発生させる。支点は対角の棒接触点。
攻撃点: 四隅の一つ。棒から最も遠い角が最も回転しやすい(d最大)。
期待: 箱が回転して斜めになり、次のステップで縦ハメ/横ハメに移行。

■ 確率機(3本アーム/ボタン):
条件: 3本アーム、ボタンで開閉
判断: 設定次第。明らかに弱設定なら give_up 推奨。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 4: 最適攻略点の導出 (Optimal Point)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1-3の分析結果から:
1. トルクが最大になる点（棒から最も離れた景品の端/角）
2. 重心を不安定方向に移動させる力の方向
3. 落とし口への最短経路
→ これらを総合して「最もエネルギー効率の良い座標」を導出。

★ 位置指示は必ず写真内の具体物を基準にすること！
★ 「가운데」「끝부분」のような曖昧表現は禁止！
★ 具体例:
  - "좌우: 왼쪽 봉 바로 위, 박스 왼쪽 가장자리에서 바깥으로 1cm"
  - "앞뒤: 박스 뒤쪽 모서리, 뒤쪽 봉에서 2cm 안쪽 (뒤쪽 봉이 보이는 위치 기준)"
  - "좌우: 오른쪽 봉과 박스 오른쪽 면이 만나는 교차점"
  - "앞뒤: 박스 앞쪽 면에서 1/3 지점 (봉 2개 중 앞쪽 봉 근처)"

【禁止事項】
- 同じ指示の繰り返し禁止。${moveHistory ? '前回と違う位置/アプローチを必ず検討。' : ''}
- 根拠なき指示の禁止。必ずSTEP1-3の分析結果を引用すること。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
以下のJSONで回答。有効なJSONのみ。バッククォート不要。

{
  "move_number": ${moveHistory ? '次の手番号' : '1'},
  "physics": {
    "support_points": "지지점 분석: 봉 위치, 접촉점 수, 안정/불안정 상태",
    "center_of_gravity": "무게중심 추정: 어디에 무게가 쏠려있는지 + 근거",
    "overhang": "오버행(빠져나온 정도): 어느 방향으로 얼마나 빠져나왔는지",
    "surface_friction": "표면 마찰: 재질 추정(비닐/종이/천) → 밀기(Push) vs 들기(Lift) 판단",
    "torque_analysis": "이 공략점에서의 토크: 지지점(봉)에서 거리 d가 얼마나 되는지, 왜 이 점이 토크 최대인지",
    "stability": "안정도: stable/unstable/critical (중심이 지지 범위 안/밖/경계)"
  },
  "reasoning": "STEP 1-4 분석을 종합한 판단 근거. 왜 이 테크닉, 이 위치인지 물리적 근거 3-4문장",
  "technique": {
    "name_jp": "テクニック名 (縦ハメ/横ハメ/前落とし/くるりんぱ/確率機)",
    "name_kr": "한국어명 (세로하메/가로하메/앞떨어뜨리기/쿠루린파/확률기)"
  },
  "claw_bbox": { "x_percent": 0, "y_percent": 0, "w_percent": 0, "h_percent": 0 },
  "next_move": {
    "action": "이번 수 한줄 요약 (밀기/들기/회전 + 방향)",
    "lr_instruction": "좌우: [사진 속 봉/박스 모서리/꼭지점 기준 + cm단위 거리감]",
    "fb_instruction": "앞뒤: [테크닉별 최적 위치 — 토크가 최대가 되는 점 기준]",
    "force_type": "push 또는 lift (마찰력 분석 기반 판단)",
    "why": "물리적 근거: 토크 d=최대, 무게중심 방향, 마찰계수 고려",
    "expected_result": "예상 결과: 어느 방향으로 몇도 회전/몇cm 이동 예상",
    "success_rate": 65,
    "target_x_percent": 50,
    "target_y_percent": 50
  },
  "situation_analysis": {
    "setup_type": "hashiwatashi/tatehame/yokohame/maeotoshi/kurulinpa/probability",
    "progress": "초기/진행중(약 30%)/거의 완료(80%) 등",
    "difficulty": 5,
    "remaining_path": "낙하구까지의 남은 경로 설명"
  },
  "is_final_move": false,
  "give_up": false,
  "give_up_reason": "",
  "estimated_remaining_moves": "3-4수",
  "tip": "이 상황에서 가장 중요한 핵심 팁 1줄"
}

【座標ルール】target_x/yは景品の上/直近のみ。離れた位置禁止。
【success_rate】物理分析の確信度を0-100で。根拠なく高い値をつけるな。
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
        max_tokens: 3000,
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

    // success_rate 클램프
    if (parsed.next_move.success_rate != null) {
      parsed.next_move.success_rate = Math.max(0, Math.min(100, parsed.next_move.success_rate));
    }

    return NextResponse.json({ analysis: parsed });

  } catch (err) {
    console.error('Analyze API error:', err);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
