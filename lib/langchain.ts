import Groq from "groq-sdk"

export const createChatModel = () => {
  return new Groq({
    apiKey: process.env.GROQ_API_KEY,
  })
}
