import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import { getJson } from 'serpapi';
import { Client } from '@gradio/client';

const app = express();
const PORT = 5001;
dotenv.config();

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
        api_key: serpApiKey
      }, (json) => {
        console.log(json); // Full response
        result.push(...json.organic_results);
        resolve();
      });
    });

    console.log("Result array:", result);


    //need to imrpove and create specific filtering logic, so onbly relevant results are checked for price
    //something conditional and dynamic, so if search term does not include x term, then results that include x term are filtered out
    let termsToFilter = ["wheel", "tyre", "exhaust"]

    const filteredResults = result.filter((result) => {
      for (const term of termsToFilter) {
        if (item_name.toLowerCase().includes(term) && result.title.toLowerCase().includes(term)) {
            return true; //only want to return item 
        } else if (item_name.include(term)) { //do i need this, as surely term should be in result title to be accurate?
            return true;
        } else {
            return false;
        }
      }

    })

    // - and/or map/filter through each and send to an LLM to judge whether result is relevant based on title comparison to item_name
    //would likely need to add delay if using free cohere, or use openai api_key

    /*
    const filteredResults = await Promise.all(
  result.map(async (result) => {
    let filterPrompt = `Your role is to determine whether this ebay result is relevant to the user's search, based on the ${item_name} and the result title, ${result.title}.

    for example, if ${item_name} is a car, results are relevant if the result title ${result.title} matches. But subproducts like wheels or tyres that include ${item_name} are not relevant.

    if it's relevant, return true. otherwise, return false;
    `;

    const relevantResults = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: filterPrompt }],
      temperature: 0.7,
      max_tokens: 50, // reduce this if you only need "true"/"false"
    });

    const booleanAnswer = relevantResults.choices[0].message.content.trim().toLowerCase();
    const isRelevant = booleanAnswer === "true";

    return isRelevant ? result : null;
  })
);

console.log("filteredResults are: ", filteredResults);

// Remove nulls (non-relevant items)
const finalResults = filteredResults.filter((item) => item !== null);
    */


    // Loop through prices
    filteredResults.forEach(item => {
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
