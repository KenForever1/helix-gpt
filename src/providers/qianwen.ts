import ApiBase from "../models/api.ts"
import * as types from "./qianwen.types.ts"
import config from "../config.ts"
import { log } from "../utils.ts"

export default class Qianwen extends ApiBase {

  constructor() {
    super({
      url: config.qianwenEndpoint as string,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.qianwenKey}`
      }
    })
  }

  async chat(request: string, contents: string, filepath: string, languageId: string): Promise<types.Chat> {
    const messages = [
      {
        "content": `You are an AI programming assistant.\nWhen asked for your name, you must respond with \"GitHub Copilot\".\nFollow the user's requirements carefully & to the letter.\n- Each code block starts with \`\`\` and // FILEPATH.\n- You always answer with ${languageId} code.\n- When the user asks you to document something, you must answer in the form of a ${languageId} code block.\nYour expertise is strictly limited to software development topics.\nFor questions not related to software development, simply give a reminder that you are an AI programming assistant.\nKeep your answers short and impersonal.`,
        "role": "system"
      },
      {
        "content": `I have the following code in the selection:\n\`\`\`${languageId}\n// FILEPATH: ${filepath.replace('file://', '')}\n${contents}`,
        "role": "user"
      },
      {
        "content": request,
        "role": "user"
      }
    ]

    const body = {
      max_tokens: parseInt(config.qianwenMaxTokens as string),
      model: config.qianwenModel,
      n: 1,
      stream: false,
      temperature: 0.1,
      messages
    }
    log("qianwen request chat : ", body)
    const data = await this.request({
      method: "POST",
      body,
      endpoint: "/compatible-mode/v1/chat/completions",
      timeout: 10000
    })

    return types.Chat.fromResponse(data, filepath, languageId)
  }

  async completion(contents: any, filepath: string, languageId: string, suggestions = 3): Promise<types.Completion> {
    const messages = [
      {
        role: "system",
        content: config.qianwenContext?.replace("<languageId>", languageId) + "\n\n" + `End of file context:\n\n${contents.contentAfter}`
      },
      {
        role: "user",
        content: `Start of file context:\n\n${contents.contentBefore}`
      }
    ]

    const body = {
      model: config.qianwenModel,
      max_tokens: parseInt(config.qianwenMaxTokens as string),
      n: suggestions,
      temperature: suggestions > 1 ? 0.4 : 0,
      frequency_penalty: 1,
      presence_penalty: 2,
      messages
    }
    log("qianwen request completion : ", body)

    const data = await this.request({
      method: "POST",
      body,
      endpoint: "/compatible-mode/v1/chat/completions"
    })

    return types.Completion.fromResponse(data)
  }
}
