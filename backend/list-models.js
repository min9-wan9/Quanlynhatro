const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
  try {
    const models = await genAI.getModels();
    console.log(models);
  } catch (e) {
    console.error(e);
  }
}
run();
