//use deterministic hyperagent
import HyperAgent from "@hyperbrowser/agent";
import { ChatOpenAI } from "@langchain/openai";
import { z } from 'zod';
import OpenAI from 'openai';
import { response } from "express";


import dotenv from 'dotenv';
dotenv.config()


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // ✅ or hardcode for testing
});

  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY, //inaugural api key
    model: "gpt-4o",
  });

  const agent = new HyperAgent({
    llm: llm,
  });






let websitesToScrape = [
    {
      company: "Skoda",
      url: "https://www.skoda.co.uk/finance/new-car-deals"
    }
]

//map through websitesToScrape
let newOffersFromWebsitesToScrape = await Promise.all(websitesToScrape.map(async (website) => {
    
    

    

    let company = website.company
    

    /*const page = await agent.newPage();
await page.goto(website.url, { waitUntil: "load" });
await page.ai("search for new car deals on this page");
const res = await page.extract(
  "extract the car deals available on this page",
  z.object({
    carDeals: z.array(
      z.object({
        carName: z.string().describe("name of the car featured in the car deal"),
        details: z.string().describe("general details of the car deal, capture all description"),
        apr: z.string().describe("the apr on offer, and any modifier attached to it"),
        specialDetails: z.string().describe("any terms and conditions that apply")
      })
    ),
  })
);
console.log(res);*/

const result = await agent.executeTask(
    `(1) Navigate to ${website.url}.
     (2) if a cookie pop-up appears, accept all cookies 
     (3) search for new car deals on this page. If there is a "see more" button, click it in order to access all offers on the page.
     then search for new car deals on this page. 

     *stay on the url page ${website.url}
     
     (4) For each deal, save the info in this format:
    
    
  [
    {
      carName: *name of the car featured in the car deal*,
      details: *general details of the car deal, capture all description*,
      apr: *the apr on offer, and any modifier attached to it*,
      specialDetails: *any terms and conditions that apply*  
    }
  ]

    (5) Once you have viewed every deal and saved the data, then close the browser and return
    `,
    {
      onStep: (step) => {
        console.log(`===== STEP ${step.idx} =====`);
        console.dir(step, { depth: null, colors: true });
        console.log("===============\n");
      },
    }
  );

  console.log("result is: ", result);

// Clean up
await agent.closeAgent();

      let prompt = `You are a data formatter. Given the following car deal data, return it strictly in this format as a JSON array:

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
${result.output}
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

return answerJsoned;
}))

console.log("the value of newOffersFromWebsitesToScrape is: ", newOffersFromWebsitesToScrape)

//then map newOffersFromWebsitesToScrape to insert to supabase database.