/** XNote LLM：POST + SSE，见各 endpoint 实现。 */
import { Observable } from '@textbus/core'
import { LLMParams, LLMService, LLMTranslateParams } from '@textbus/xnote'

export class AiService extends LLMService {
  private baseUrl = '/api/llm'

  /**
   * 创建 SSE 流式请求（使用 POST 方法支持长内容）
   */
  private createSSEStream(endpoint: string, params: LLMParams | LLMTranslateParams): Observable<string> {
    return new Observable<string>(observer => {
      const url = `${this.baseUrl}${endpoint}`
      let isComplete = false

      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          'x-api-key': 'xnote',
        },
        body: JSON.stringify(params),
      })
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const reader = response.body?.getReader()
          if (!reader) {
            throw new Error('Response body is not readable')
          }

          const decoder = new TextDecoder()
          let buffer = ''

          const readStream = () => {
            reader.read().then(({ done, value }) => {
              if (done || isComplete) {
                observer.complete()
                return
              }

              buffer += decoder.decode(value, { stream: true })

              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    isComplete = true
                    observer.complete()
                    return
                  }
                  observer.next(data)
                } else if (line.startsWith('event: error')) {
                  const errorLine = lines[lines.indexOf(line) + 1]
                  if (errorLine && errorLine.startsWith('data: ')) {
                    observer.error(new Error(errorLine.slice(6)))
                  }
                  isComplete = true
                  observer.complete()
                  return
                }
              }

              readStream()
            }).catch(error => {
              observer.error(error)
            })
          }

          readStream()
        })
        .catch(error => {
          observer.error(error)
        })

      return () => {
        isComplete = true
      }
    })
  }

  continue(params: LLMParams): Observable<string> {
    return this.createSSEStream('/continue', params)
  }

  polish(params: LLMParams): Observable<string> {
    return this.createSSEStream('/polish', params)
  }

  simplify(params: LLMParams): Observable<string> {
    return this.createSSEStream('/simplify', params)
  }

  enrich(params: LLMParams): Observable<string> {
    return this.createSSEStream('/enrich', params)
  }

  translate(params: LLMTranslateParams): Observable<string> {
    return this.createSSEStream('/translate', params)
  }

  summarize(params: LLMParams): Observable<string> {
    return this.createSSEStream('/summarize', params)
  }
}
