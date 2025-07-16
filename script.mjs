import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import { getJson } from 'serpapi';
import { Client } from '@gradio/client';
import OpenAI from 'openai';



const app = express();
const PORT = 5001;
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // ✅ or hardcode for testing
});

// Allow only frontend origin
app.use(cors({ origin: process.env.FRONTEND_URL
      ? [process.env.FRONTEND_URL, 'http://localhost:3000']
      : 'http://localhost:3000' }));//change to public url
app.use(bodyParser.json());
app.use(express.json());
app.use("/uploads", express.static("uploads"));



const upload = multer({ dest: "uploads/" });

/*curl -X POST http://localhost:5001/identify-image \
  -H "Content-Type: multipart/form-data" \
  -F "image=@/c/Users/JoeJo/Downloads/XyAaqBEtYtb8YffjKZ68Gb.jpg"*/ //to test identify-image endpoint

app.post("/identify-image", upload.single("image"), async (req, res) => {
  const imagePath = req.file.path;
  console.log(`Processing image: ${imagePath}`);

  // Turn local file path into public URL
/*const serverUrl = process.env.SERVER_URL || "http://localhost:5001"; // set SERVER_URL in .env
const publicUrl = `${serverUrl}/uploads/${req.file.filename}`;
console.log(`Public image URL: ${publicUrl}`);*/

const serverUrl = req.protocol + "://" + req.get("host");
const publicUrl = `${serverUrl}/uploads/${req.file.filename}`;
console.log(`Public image URL: ${publicUrl}`);
 

  //imagePath needs to be the url at this point, in order to work

  //const client = await Client.connect("http://127.0.0.1:7860/");//change to hf space url
  const client = await Client.connect("Baon2024/SellerMVPPython");
  const result = await client.predict("/predict", {
    image_path: publicUrl,
  });

  console.log("result from hfSpace is: ", result.data);
  // Step 1: Get first item in array
    const jsonString = result.data[0];

    // Step 2: Parse the JSON string
    const parsed = JSON.parse(jsonString);

    // Step 3: Destructure into variables
    const { product, condition } = parsed;

    console.log("Product:", product);
    console.log("Condition:", condition);

  //need to break result.data into seperate product and condition variables

  res.status(200).json({ product, condition }); // ✅ send result back
});



app.post("/getPriceEndpoint", async (req, res) => {
  const { item_name, item_condition } = req.body;
  //const api_key = "2211e6499f31ba90a3b79f6e29360cc9b51ccd2ad1c61e3ed2ef75b8e9752627";
  const serpApiKey = process.env.SERP_API_KEY

  let result = [];
  let lowest_price = 0;

  async function fetchData() {
    await new Promise((resolve, reject) => {
      getJson({
        engine: "ebay",
        _nkw: item_name,
        ebay_domain: "ebay.com",
        category_id: "6001",
        api_key: serpApiKey
      }, (json) => {
        console.log(json); // Full response
        result.push(...json.organic_results);
        resolve();
      });
    });

    console.log("Result array:", result);

     //let termsToFilter = ["wheel", "tyre", "exhaust"]

    /*const filteredResults = result.filter((result) => {
      for (const term of termsToFilter) {
        if (item_name.toLowerCase().includes(term) && result.title.toLowerCase().includes(term)) {
            return true; //only want to return item 
        } else if (item_name.include(term)) { //do i need this, as surely term should be in result title to be accurate?
            return true;
        } else {
            return false;
        }
      }

    })*/

    const filteredResults = await Promise.all(
  result.map(async (result, i) => {
    try {
      if (!result || !result.title) {
        console.warn(`⚠️ Skipping item at index ${i} due to missing title`);
        return null;
      }

      //this dynamic use of item_name presumes that all item searches will be cars, for this specific use-case

      const filterPrompt = `
You are a product filter. The user is searching for an actual product: "${item_name}" (not accessories or parts).

You're given a result from eBay: "${result.title}".

Your job is to determine if the result is exactly the full product, not related parts, accessories, documents, manuals, covers, tires, wheels, bumpers, filters, mirrors, etc.

Examples of NON-relevant results:
- ${item_name} i20 wheel
- ${item_name} i20 manual
- ${item_name} i20 bumper

Examples of relevant results:
- 2016 ${item_name} Hatchback
- Used ${item_name}, 1.2L Petrol

Question: Is this eBay result the full product "${item_name}" and not a related part?

Respond with exactly **true** or **false** only.
`;

      const relevantResults = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: filterPrompt }],
        temperature: 0.7,
        max_tokens: 50,
      });

      const answer = relevantResults.choices[0].message.content.trim().toLowerCase();
      const isRelevant = answer === "true";

      console.log(`🧠 GPT result for item ${i}: ${answer}`);
      return isRelevant ? result : null;

    } catch (err) {
      console.error(`❌ Error filtering item ${i}:`, err);
      return null;
    }
  })
);

console.log("filteredResults are: ", filteredResults);

// Remove nulls (non-relevant items)
const finalResults = filteredResults.filter((item) => item !== null);

    console.log("finalresults are: ", finalResults);

    console.log("finalResults number: ", finalResults.length, "and original results length: ", result.length);

    // Loop through prices
    finalResults.forEach(item => {
      console.log("item.price is", item.price);
      if (lowest_price === 0) {
        lowest_price = item.price.extracted;
      } else if (
        item.price.extracted < lowest_price &&
        item.condition === item_condition
      ) {
        lowest_price = item.price.extracted;
      }
    });

    console.log(`lowest_price for ${item_name} is`, lowest_price);
  }

  await fetchData();

  let priceDiscount = 10
  lowest_price = (lowest_price / 100) * (100 - priceDiscount) //to get percentage

  res.status(200).json({ lowest_price }); //or return second or third lowest-price
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
