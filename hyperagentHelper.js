import "dotenv/config";
import HyperAgent from "@hyperbrowser/agent";
import { ChatOpenAI } from "@langchain/openai";
import dotenv from 'dotenv';


dotenv.config()

export async function getSpecificsFromWeBuyAnyCar(regNum, mileage) {
  console.log("\n===== Running weBuyAnyCar =====");

  const llm = new ChatOpenAI({
    apiKey: process.env.OPENAI_API_KEY, //inaugural api key
    model: "gpt-4o",
  });

  const agent = new HyperAgent({
    llm: llm,
  });

  //let regNum = "H3HYU"
  //let mileage = "3"

  const result = await agent.executeTask(
    `Navigate to https://www.webuyanycar.com/, allow all cookies, enter ${regNum} into registration number input, and ${mileage} into mileage input, then retrieve all the information that is returned after the form is submitted - output all the info you collect`,
    {
      onStep: (step) => {
        console.log(`===== STEP ${step.idx} =====`);
        console.dir(step, { depth: null, colors: true });
        console.log("===============\n");
      },
    }
  );
  await agent.closeAgent();
  console.log("\nResult:");
  console.log("result.outut is ", result.output);
  return result;
}

