import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export const gemini = {
  getModel: (model = 'gemini-1.5-flash') => genAI.getGenerativeModel({ model }),
}
