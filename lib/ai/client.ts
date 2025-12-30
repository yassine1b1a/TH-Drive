/**
 * Custom AI client using OpenRouter API
 * This provides access to multiple AI models including the specified allenai/olmo-3.1-32b-think:free
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

export class OpenRouterAIClient {
  private apiKey: string
  private baseURL = 'https://openrouter.ai/api/v1' // CORRECT OpenRouter endpoint

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
        model: options.model || 'allenai/olmo-3.1-32b-think:free', // Your specified model
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 500,
        stream: false
      }

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://th-drive.thprojects.ovh',
          'X-Title': 'TH-Drive Support'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
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
      console.error('OpenRouter chat error:', error)
      throw error
    }
  }
}

// Create singleton instance with YOUR API key
export const aiClient = new OpenRouterAIClient(
  process.env.OPENROUTER_API_KEY || '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'
)
