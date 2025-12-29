/**
 * Custom AI client using MiMo API
 * This is a free alternative to OpenAI
 */

interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface AIRequest {
  model: string
  messages: AIMessage[]
  temperature?: number
  max_tokens?: number
  stream?: boolean
}

interface AIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
  usage: {
    total_tokens: number
  }
}

export class MiMoAIClient {
  private apiKey: string
  private baseURL = 'https://api.mi.mo/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async chat(messages: AIMessage[], options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}) {
    try {
      const request: AIRequest = {
        model: options.model || 'MiMo-V2-Flash',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
        stream: false
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`AI API error: ${response.status} - ${errorText}`)
      }

      const data: AIResponse = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from AI')
      }

      return {
        content: data.choices[0].message.content,
        usage: data.usage
      }
    } catch (error) {
      console.error('AI chat error:', error)
      throw error
    }
  }
}

// Create singleton instance
export const aiClient = new MiMoAIClient(
  process.env.MIMO_API_KEY || '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'
)