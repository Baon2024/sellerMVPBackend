import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import multer from 'multer';
import fs from 'fs';
import { getJson } from 'serpapi';
import { Client } from '@gradio/client';
import { getAccessTokenAndDevURL, getListings, convertToGBP } from './serverEbayAPIHelperFunctions.js';
import OpenAI from 'openai';





const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // ✅ or hardcode for testing
});

const app = express();
const PORT = 5005;
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
  
  //1 - get ebay OAuth access token
  const [ ebayAccessToken, ebayUrl ]  = await getAccessTokenAndDevURL("production", item_name);

  console.log("value of ebayAccessToken is: ", ebayAccessToken);
  console.log("value of ebayUrl is: ", ebayUrl);

  //2 - get item listings from ebay ebay based on item_name
  const itemListings = await getListings(ebayUrl, ebayAccessToken);

  console.log("the listing items returned from ebay, as itemListings variable, are: ", itemListings);

  if (Array.isArray(itemListings) && itemListings.length > 0) {

  //3 - remove item Listings whcih are the wrong condition
const itemListingsCorrectCondition = itemListings.filter(item => item.condition === item_condition);
 

  //3 - filter item Listings for relevant results:
  const llmdList = await Promise.all(itemListingsCorrectCondition.map(async (item) => {
    const filterPrompt = `
You are a product filter. The user is searching for an actual product: "${item_name}" (not accessories or parts).

You're given a result from eBay: "${item.title}".

Your job is to determine if the result is exactly the full product, not related parts, accessories, documents, manuals, covers, tires, wheels, bumpers, filters, mirrors, etc.


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

      console.log(`🧠 GPT result for item ${item.title}: ${answer}`);
      return isRelevant ? item : null;
}))



console.log("llmdList are: ", llmdList);


//4 - Remove nulls (non-relevant items)
const relevantResults = llmdList.filter((item) => item !== null);


//5 - convert prices if not in gdp
const relevantResultsCorrectCurrency = await convertToGBP(relevantResults);



//6 - loop through results
let lowestPrice = 0;

    // Loop through prices - //need to change this for properties of teh enay returned item objects
    relevantResultsCorrectCurrency.forEach(item => {
      console.log("item.price is", item.price.value);
      if (lowestPrice === 0) {
        lowestPrice = item.price.value;
      } else if (
        item.price.value < lowestPrice
      ); 
    });

    console.log(`lowest_price for ${item_name} is`, lowestPrice);
  

  

  let priceDiscount = 10
  lowestPrice = (lowestPrice / 100) * (100 - priceDiscount) //to get percentage
  let lowest_price = lowestPrice

  res.status(200).json({ lowest_price }); //or return second or third lowest-price
  } else {
    let lowest_price = `no results for ${item_name}` 
    res.status(200).json({ lowest_price })
  }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
