import { z } from 'zod'

const GeminiResponseSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              text: z.string().optional(),
            }),
          ),
        }),
      }),
    )
    .optional(),
})

function extractJson(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  if (fenced?.[1]) {
    return fenced[1]
  }
  return trimmed
}

export async function generateGeminiJson<T>(args: {
  prompt: string
  fallback: T
  schema: z.ZodType<T>
}): Promise<{ data: T; source: 'gemini' | 'rules'; error?: string }> {
  const apiKey = process.env.GEMINI_API_KEY?.trim()
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-1.5-flash'

  if (!apiKey) {
    return { data: args.fallback, source: 'rules' }
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: args.prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          topP: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
    })

    if (!response.ok) {
      return { data: args.fallback, source: 'rules', error: `Gemini HTTP ${response.status}` }
    }

    const payload = GeminiResponseSchema.safeParse(await response.json())
    if (!payload.success) {
      return { data: args.fallback, source: 'rules', error: 'Invalid Gemini response format' }
    }

    const text = payload.data.candidates?.[0]?.content.parts?.map((part) => part.text ?? '').join('\n')?.trim()

    if (!text) {
      return { data: args.fallback, source: 'rules', error: 'Gemini response was empty' }
    }

    const parsed = args.schema.safeParse(JSON.parse(extractJson(text)))
    if (!parsed.success) {
      return { data: args.fallback, source: 'rules', error: 'Gemini JSON failed schema validation' }
    }

    return { data: parsed.data, source: 'gemini' }
  } catch (error) {
    return {
      data: args.fallback,
      source: 'rules',
      error: error instanceof Error ? error.message : 'Gemini request failed',
    }
  }
}
