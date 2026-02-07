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

以下のJSON形式で回答してください。必ず有効なJSONのみを返してください：

{
  "situation_analysis": {
    "machine_type": "사진에서 확인 가능한 기계 정보만 기술. 보이지 않으면 '확인 불가'",
    "prize_type": "상품 종류 및 추정 무게 (근거 포함)",
    "current_position": "상품의 현재 위치와 각도 상세 설명 (보이는 것만)",
    "weight_center": "추정 무게 중심 위치 (근거 포함)",
    "difficulty": "1-10 숫자",
    "not_visible": ["사진에서 확인할 수 없는 요소 목록"]
  },
  "technique": {
    "primary": "추천 메인 테크닉 (橋渡し/寄せ/ずらし/くるりんぱ 중 택1)",
    "primary_kr": "한국어 테크닉명",
    "reason": "이 테크닉을 추천하는 이유 (상세)"
  },
  "steps": [
    {
      "step": 1,
      "action": "구체적인 행동 지시",
      "direction": "left/right/forward/back/center",
      "detail": "상세 설명",
      "marker_x_percent": 50,
      "marker_y_percent": 50,
      "marker_label": "짧은 라벨 (4글자 이내)"
    }
  ],
  "warnings": ["주의사항 1", "주의사항 2"],
  "success_rate": "예상 성공 확률 (%)",
  "estimated_tries": "예상 소요 횟수",
  "give_up_recommendation": false,
  "give_up_reason": ""
}

【マーカー配置ルール - 非常に重要】
- 各ステップのmarker_x_percentとmarker_y_percentは、実際に集計を降ろすべきポイントを示す
- マーカー同士が重ならないよう、最低15%以上の間隔を空けること
- もしポイントが近い場合は、marker_x_percentまたはmarker_y_percentをずらして視認性を確保する
- marker_labelは最大4文字（例: "1차", "낙하점", "밀기"）

重要な分析ポイント：
1. 景品の重心（Center of Gravity）を写真から推定する
2. アームの最大開き幅と景品サイズの関係を考慮する（アームが見える場合のみ）
3. 橋渡しの場合、棒の間隔と景品の幅の比率が重要
4. 「寄せ」が有効か「ずらし」が有効かは景品の表面摩擦に依存
5. 集計の力が弱い設定の場合は「持ち上げる」より「押す・引く」戦略を優先
6. 景品が大きすぎてアームで掴めない場合は正直に「ポジション変更を待つ」か「諦める」を推奨

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
        max_tokens: 4000,
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