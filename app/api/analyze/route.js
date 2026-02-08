import { NextResponse } from 'next/server';
import sharp from 'sharp';

// ===== 이미지 전처리: 대비(Contrast) 강화로 봉/재질 인식률 향상 =====
async function enhanceImage(base64Data, mediaType) {
  try {
    const buffer = Buffer.from(base64Data, 'base64');
    const enhanced = await sharp(buffer)
      .normalize()                    // 히스토그램 평활화 → 봉/경계선 선명화
      .sharpen({ sigma: 1.2 })        // 약간의 샤프닝 → 고무/비닐 텍스처 강조
      .modulate({ brightness: 1.05 }) // 약간 밝게 → 어두운 기계 내부 보정
      .toFormat(mediaType === 'image/png' ? 'png' : 'jpeg', {
        quality: 90,
      })
      .toBuffer();
    return enhanced.toString('base64');
  } catch (err) {
    console.warn('Image enhancement failed, using original:', err.message);
    return base64Data; // 실패 시 원본 사용
  }
}

// ===== 물리 기반 크레인 게임 공략 알고리즘 v2.0 프롬프트 =====
const ANALYSIS_PROMPT = (machineType, prizeType, moveHistory) => `
あなたはUFOキャッチャーの物理分析AIです。
物理法則（トルク・摩擦力・重心）に基づいて最適な攻略ポイントを座標で出力します。
囲碁AIのように「次の一手」だけを正確に指示してください。

ユーザー情報: 機体=${machineType || "不明"}, 景品=${prizeType || "不明"}
${moveHistory ? `\n【手の履歴】\n${moveHistory}\n上記を踏まえ、この写真の現在状態から次の一手を分析。` : '【初回】写真を分析し、最初の一手を指示。'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 1: 地形・物体の認識 (Terrain Mapping)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
写真から以下を正確に読み取れ:

A. 支持構造 (Support Structure):
   - 棒(Bar)の本数、平行度、間隔
   - 棒にゴム(滑り止め)があるか？ → 摩擦μ_barに直結
   - 棒の傾斜有無（前下がり/後ろ下がり）
   - 壁・シールド(ツメ)の有無と高さ

B. 景品の状態 (Prize State):
   - 形状: 箱型 / 人形型 / 不規則型
   - 素材(外装): ビニール包装 / 紙箱 / 布
   - 長軸・短軸の方向、棒に対して平行か斜めか
   - フィギュア箱の場合: キャラクター絵柄の向き（顔がある面=重い側の可能性大）

C. 接触点分析 (Contact Points):
   - 景品が棒に触れている箇所数と位置
   - 安定(Stable)/不安定(Unstable)/臨界(Critical)
   - はみ出し(Overhang): 方向と棒からの距離

D. 落とし口 (Exit):
   - 位置: 手前/奥/棒の間/左/右
   - 景品から落とし口までの最短経路と障害物

E. クロー(アーム):
   - 2本アーム or 3本アーム
   - 集計の先端にゴム(足)があるか？ → μ_clawに直結
   - 推定アーム力: 強/中/弱

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 2: 物理パラメータの推定 (Physics Engine)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 2-A. スケール推定 (Pixel → cm 変換):
★ 棒の太さ(通常2~3cm)、または箱の一辺(短辺≒10cm、長辺≒20cmが一般的)を
  「基準の物差し(Reference Ruler)」とせよ。
  例: "棒の太さが写真上で約30px → 30px ≈ 2.5cm → 1px ≈ 0.083cm"
  この比率を使って以降の距離d値をcm単位で推定すること。

■ 2-B. 重心(Center of Gravity) 推定:
- 箱型: 幾何学的中心 ≈ 重心（ただし中身が偏っている場合あり）
- 人形型(フィギュア):
  → 箱の絵柄でキャラの顔/上半身が描かれている面 = 重い側
  → 派手なグラフィック・顔がある方向に重心が偏ると仮定
  → 箱内で緩衝材がある場合、中身は箱の片側に寄っている可能性あり
- 不規則型: 色が濃い/大きい部分に重心偏り
- 現在傾いている → 重心がその方向に偏っている証拠

★ 重心(G)が2本の棒の中間線に対してどちら側にあるか判定:
  - G が棒の間の中央付近 → "安定(stable)" → 大きな力が必要
  - G が片方の棒に寄っている → "臨界(critical)" → もう少しで落ちる
  - G が棒の外側にはみ出している → "不安定(unstable)" → 軽い力で落下

■ 2-C. 摩擦力の2面分析:
★ 棒の摩擦(μ_bar)と集計の摩擦(μ_claw)を分けて考えよ。

μ_bar(棒側):
  - ゴムテープ付き → μ_bar ≈ 0.7~0.9 (高摩擦) → 景品が滑りにくい
    → 「押し(Push)」では動かない → 「持ち上げ(Lift)」か「回転(Torque)」が有効
  - 金属棒(ゴムなし) → μ_bar ≈ 0.2~0.4 (低摩擦) → 滑りやすい
    → 「押し(Push)」が有効

μ_claw(集計側):
  - 集計先端にゴム足あり → μ_claw ≈ 0.6~0.8 → 掴む力UP
    → 「持ち上げ(Lift)」の成功率が上がる
  - ゴム足なし(プラスチック) → μ_claw ≈ 0.2~0.3
    → 掴んでも滑る → 「押し(Push)」に特化

判定ロジック:
  - μ_bar高 & μ_claw低 → Push無効、Lift微妙 → Torque(回転)一択
  - μ_bar低 & μ_claw低 → Push有効(滑らせる)
  - μ_bar低 & μ_claw高 → Lift有効(掴んで引く)
  - μ_bar高 & μ_claw高 → Lift有効(掴んで持ち上げ)

■ 2-D. トルク計算 (T = F × d × sinθ):
★ STEP 2-Aで推定したスケールを使い、d値をcm単位で算出すること。

- F: クローの力(機種から推定)
- d: 支点(棒)から接触点までの距離【cm単位で推定】
- θ: 力と棒の角度(真下 = 90° = sinθ最大 = 最効率)

計算例:
  "棒から箱の奥端まで ≈ 8cm(推定)。d=8cm、θ≈80°、T=F×8×sin80°≈F×7.9"
  "棒から箱の中央まで ≈ 3cm。d=3cm、T=F×3×sin80°≈F×2.95"
  → 奥端の方がトルク2.7倍 → 奥端を攻めるべき

★ 必ず2箇所以上の候補点で d を比較し、最も d が大きい点を選べ。

■ 2-E. 仮想シミュレーション (Virtual Simulation):
選択した攻略点にクローが接触した際:
1. 力のベクトルを描け（下方向の力 → 景品に対してどの角度で作用するか）
2. そのベクトルが重心(G)に対してどの方向の回転モーメントを生むか計算
3. 景品が棒上で滑る確率(Slip probability)を推定:
   Slip_prob = 1 - (μ_bar × N / F_horizontal)
   Slip_prob > 0.7 なら「滑り」を前提とした Push 戦略
   Slip_prob < 0.3 なら「回転」や「持ち上げ」が必要

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 3: セッティング別 最適攻略 (Setting-specific Logic)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

■ 橋渡し + 縦ハメ(Tatehame):
条件: 棒間隔 < 箱の短辺
物理: 端を持ち上げ → 角度θ増加 → 重心Gが棒内側に移動 → 自重落下
攻撃: 棒から最も遠い端(d最大)。中央は×。
  → d値をcm推定で比較し「奥端d=Xcm vs 中央d=Ycm → 奥端がZ倍効率的」と明記
手順: 奥→手前→奥と交互。45°超で落下期待。
μ_bar高い場合: 滑らないので持ち上げで角度をつける戦略が有効。

■ 橋渡し + 横ハメ(Yokohame):
条件: 棒間隔 > 箱の短辺
物理: 片端を棒から外す → 1本支持に → 不安定化 → 落下
攻撃: 外したい端、棒の真上〜やや外側
手順: 同じ端を繰り返し。反対側は攻めない。

■ 前落とし(Maeotoshi):
条件: 前方突出 + 手前に出口
物理: μ_bar低 → 奥端を押して前方スライド。μ_bar高 → 奥端を持ち上げて前方に回転。
攻撃: 必ず奥端！左右交互で蛇行前進。
注意: 前端を攻めるのは逆効果。

■ くるりんぱ(Kurulinpa):
条件: 安定しすぎて動かない
物理: 箱の角を攻撃 → 対角の棒接触点を支点に回転モーメント発生
攻撃: 4隅のうち棒から最も遠い角(d最大)。
期待: 回転して斜めに → 次手で縦ハメ/横ハメに移行。

■ 確率機(3本アーム):
条件: 3本アーム、ボタン開閉
判断: 弱設定→give_up推奨。強設定→重心真上狙い。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
【STEP 4: アンカーポイント座標計算 (Anchor-based Targeting)】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

★★★ target_x/y_percent を決定する前に、必ず以下の3点を定義せよ ★★★

1. A1 = 景品の左上角の座標 (x%, y%)
2. A2 = 景品の右下角の座標 (x%, y%)
3. A3 = 手前の棒の中心線のy座標 (y%)

これら3つのアンカーポイントを基準として、ターゲット座標を相対的に計算:
  "景品はA1(20%,30%)〜A2(65%,70%)に位置。
   手前棒はA3≈y55%。
   攻撃点は景品の奥端=A1のy付近。
   A1のxから景品幅の30%右 → target_x = 20 + (65-20)×0.3 = 33.5%
   target_y = A1のy+5% = 35%"

このように必ず計算過程を示して座標を決定すること。
「なんとなく50%」は禁止。

【禁止事項】
- 同じ指示の繰り返し禁止。${moveHistory ? '前回と違う位置/アプローチを必ず検討。' : ''}
- 根拠なき指示の禁止。必ずSTEP1-4の物理計算を引用。
- 曖昧な位置表現(「가운데」「끝부분」)禁止。具体的なcm/棒基準で。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
以下のJSONで回答。有効なJSONのみ。バッククォート不要。

{
  "move_number": ${moveHistory ? '次の手番号' : '1'},
  "physics": {
    "scale_reference": "스케일 기준: [봉 두께 Xpx ≈ 2.5cm → 1px ≈ Ycm] 또는 [박스 단변 Xpx ≈ 10cm]",
    "support_points": "지지점: 봉 위치/간격, 접촉점 수, 고무 유무",
    "center_of_gravity": "무게중심(G): 위치 추정 + 근거 (피규어면 얼굴 방향, 박스면 기하학적 중심)",
    "cog_vs_support": "G가 봉 사이 중앙/한쪽 치우침/밖으로 나감 → stable/critical/unstable",
    "overhang": "오버행: 어느 방향으로 약 Xcm 빠져나옴 (스케일 기준 적용)",
    "friction_bar": "봉 마찰(μ_bar): 고무 유무 → 수치 추정 → 밀기 가능 여부",
    "friction_claw": "집게 마찰(μ_claw): 고무발 유무 → 수치 추정 → 들기 가능 여부",
    "torque_comparison": "토크 비교: 후보점A d=Xcm T≈F×Y vs 후보점B d=Xcm T≈F×Y → A가 Z배 효율적",
    "slip_probability": "미끄럼 확률: 0~1 (0.7이상이면 Push, 0.3이하면 Lift/Torque)",
    "stability": "stable / critical / unstable"
  },
  "anchors": {
    "prize_top_left": { "x_pct": 0, "y_pct": 0 },
    "prize_bottom_right": { "x_pct": 0, "y_pct": 0 },
    "front_bar_y_pct": 0
  },
  "reasoning": "STEP 1-4를 종합한 물리적 판단 근거 3-4문장. 반드시 d값(cm), μ값, 토크 비교를 인용",
  "technique": {
    "name_jp": "テクニック名",
    "name_kr": "한국어명"
  },
  "claw_bbox": { "x_percent": 0, "y_percent": 0, "w_percent": 0, "h_percent": 0 },
  "next_move": {
    "action": "이번 수 한줄 요약 (Push/Lift/Torque + 방향)",
    "lr_instruction": "좌우: [봉/박스 모서리 기준 + cm 거리 + 앵커 좌표 근거]",
    "fb_instruction": "앞뒤: [토크 최대점 기준 + cm 거리 + 앵커 좌표 근거]",
    "force_type": "push / lift / torque (μ_bar·μ_claw 분석 기반)",
    "why": "물리 근거: d=Xcm(토크 최대), μ_bar=X(밀기 가능/불가), G 방향=Y",
    "expected_result": "예상: X방향으로 약 Y도 회전 / X방향으로 약 Ycm 이동",
    "success_rate": 65,
    "target_x_percent": 50,
    "target_y_percent": 50
  },
  "simulation": {
    "force_vector": "힘 방향: 아래쪽 → 박스에 대해 X도 각도로 작용",
    "rotation_direction": "회전 방향: 시계/반시계 방향으로 약 X도",
    "slip_or_rotate": "결과 예측: 미끄러짐(slide) / 회전(rotate) / 들림(lift)"
  },
  "situation_analysis": {
    "setup_type": "hashiwatashi/tatehame/yokohame/maeotoshi/kurulinpa/probability",
    "progress": "초기/진행중(약 30%)/거의 완료(80%)",
    "difficulty": 5,
    "remaining_path": "낙하구까지 남은 경로"
  },
  "is_final_move": false,
  "give_up": false,
  "give_up_reason": "",
  "estimated_remaining_moves": "3-4수",
  "tip": "이 상황 핵심 팁 1줄"
}

【座標ルール】target_x/yは景品の上/直近のみ。離れた位置禁止。アンカー計算に基づくこと。
【success_rate】物理分析の確信度0-100。slip_prob、トルク比、安定度を考慮して算出。根拠なく高い値禁止。
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
