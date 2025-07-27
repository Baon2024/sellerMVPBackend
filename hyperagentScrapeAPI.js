//use deterministic hyperagent
import HyperAgent from "@hyperbrowser/agent";
import { ChatOpenAI } from "@langchain/openai";
import { z } from 'zod';
import OpenAI from 'openai';
import { response } from "express";
import { Hyperbrowser } from "@hyperbrowser/sdk";
import dotenv from 'dotenv';


dotenv.config()




const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // ✅ or hardcode for testing
});

  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY, //inaugural api key
    model: "gpt-4o",
  });

  const client = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY,
});


const main = async () => {

  const scrapeResult = await client.scrape.startAndWait({
    url: "https://www.arnoldclark.com/new-cars",
    sessionOptions: {
      acceptCookies: true,
      useStealth: false,
      useProxy: false,
      solveCaptchas: false,
    },
    scrapeOptions: {
      formats: ["markdown"],
      excludeTags: [],
      includeTags: [],
      onlyMainContent: true,
    }
  });

  console.log("Scrape result:", scrapeResult);

   let prompt = `You are a data formatter. Given the following data from a car offers page, select the deals/offers from the data and return them strictly in this format as a JSON array:

[
  {
    "carName": "name of the car featured in the car deal",
    "details": "general details of the car deal, capture all description",
    "apr": "the apr on offer, and any modifier attached to it",
    "specialDetails": "any terms and conditions that apply"
  }
]

if there are duplicates, exclude the second copy.

If the data is already formatted in the correct JSON structure, just return it as is without any additional commentary or explanation. Ensure the output is strictly in this format, and no other text is included.

Data:
${JSON.stringify(scrapeResult, null, 2)}
`;

const orderedData = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: prompt }],
  temperature: 0.0, // Lower temperature to ensure deterministic output
  max_tokens: 1000, // Adjust token limit based on expected output size
});

const answer = orderedData.choices[0].message.content.trim();
console.log("value of answer is: ", answer);

const answerJsoned = JSON.parse(answer)
console.log("value of answerJsoned is: ", answerJsoned)

return answerJsoned;


};

main()