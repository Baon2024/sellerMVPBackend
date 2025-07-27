//just check you can ass four images to vision model, and can identify dents
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import multer from 'multer';
//import fs from 'fs';
import { getJson } from 'serpapi';
import { Client } from '@gradio/client';
import { getAccessTokenAndDevURL, getListings, convertToGBP } from './serverEbayAPIHelperFunctions.js';
import OpenAI from 'openai';
import { getSpecificsFromWeBuyAnyCar } from './hyperagentHelper.js';
import path from 'path'
import fs from 'fs/promises';

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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



//add a server endpoint for each step of the workflow


app.post("/llmAssessCarDamage", upload.fields([{ name: "carFront", maxCount: 1 }, { name: "carLeftSide", maxCount: 1 }, { name: "carBack", maxCount: 1}, { name: "carRightSide", maxCount: 1}]), async (req, res) => {
  //one field for each image, to make sure each is present
  //need to make sure formData has carFront, carLeftSide, carBack, carRightSide attached, and prevent submission otherwise
  //have modal for four pictures pop up on successful return from /getWBAYandGeneratePrice endpoint

  //don't code checks either here or frontend for whether each image is correct side - that can be added later for security
  console.log("req.files is: ", req.files);

  let carImages = []
  carImages.push(req.files.carFront[0])
  carImages.push(req.files.carLeftSide[0])
  carImages.push(req.files.carBack[0])
  carImages.push(req.files.carRightSide[0])

  console.log("carImages after pushing all four sides are: ", carImages);

  let publicUrls = []
  for (const image of carImages) {
    const serverUrl = "http://localhost:5005"; 
    const publicUrl = `${serverUrl}/uploads/${image.filename}`;
    console.log(`Public image URL: ${publicUrl}`);
    //use localhost for now, both backend and frontend
    publicUrls.push(publicUrl)
  }

  console.log("publicUrls after pushing all four sides are: ", publicUrls);

   let imageContentArray = []


  imageContentArray.unshift({
  type: "text",
  text: `These are four images of a car from each side. Please assess whether there is any visible damage such as dents, scratches, or broken parts. Be specific and mention the location if you spot any issues. ${publicUrls}`
});

console.log("value of imageContentArray before vision model call is: ", imageContentArray);

// Convert each image file to base64

const base64Images = await Promise.all(
  carImages.map(async (img) => {
    const data = await fs.readFile(img.path, { encoding: 'base64' });
    return data;
  })
);

const messages = [
  {
    role: "system",
    content: "You are a used car examiner. Identify visible damage like dents or scratches."
  },
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "These are four images of a car from each side. Assess damage."
      },
      ...base64Images.map(base64 => ({
        type: "image_url",
        image_url: {
          url: `data:image/jpeg;base64,${base64}`
        }
      }))
    ]
  }
];

console.log("value of base64 images and Messages are: ", messages);


//could replace this with custom trained model, that returns label for each image/overall 4 - based on data of images and conditions (multimodal text and image data)
const visionResponse = await openai.chat.completions.create({
  model: "gpt-4o",
  messages: messages,
  max_tokens: 500
});

const damageAssessment = visionResponse.choices[0].message.content;
console.log("🛠️ Damage Assessment:", damageAssessment);


//might also want agentAssessor to provide label: Like New, Very Good, Good, et cetera
//whatever labels exist for used cars, so could then draw nearest real sale prices for car model, or just average discount based on condition

//now, use detailedCarInfo to generate fake price here, then calculatye rice er tye of damage in same section, to deduct
  let fakePrice = "10,000" //would actually need a function here to draw average recent resell price for excellent used car, based on model
  //using Bob's data, or some other 3rd party.
  
  let scruffPrice = "50"

  let assessedPriceAfterDamage = `You are a used car assessor. Your role is to assess how much the car is worth, based on the data provided to you.
  
  
  You have been provided with a damage assessment for the car: ${damageAssessment}. Recent used cars of the same model and sub-model have sold for: £${fakePrice}.

  Each scruff or scratch deducts £${scruffPrice} from the overall resell value of the car.

  Based on this information, calculate the resell value of the car, and return strictly in this JSON format: [{ resellValue: /price-as-number/}] 
  `
  const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: assessedPriceAfterDamage }],
        temperature: 0.0,
        max_tokens: 700,
      });

  const resellResponse = response.choices[0].message.content.trim()
  console.log("value of used car calculated as: , ", resellResponse)
  let dejsonedPrice = JSON.parse(resellResponse);
  console.log("dejsonedPrice is: ", dejsonedPrice)

  //in longer term, if we have a dataset of used car sales, with columns like model, condition, price
  //would be straightforward to train via regression a model to predict sale price
  //and could then call it here to generate price, one car per call. 

  res.status(200).json({ dejsonedPrice })
});


app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));

 
/*curl -X POST http://localhost:5005/llmAssessCarDamage \
  -H "Content-Type: multipart/form-data" \
  -F "carFront=@/c/Users/JoeJo/Downloads/batty car front.jpg" \
  -F "carLeftSide=@/c/Users/JoeJo/Downloads/batty car left.jpg" \
  -F "carBack=@/c/Users/JoeJo/Downloads/batty car back.jpg" \
  -F "carRightSide=@/c/Users/JoeJo/Downloads/batty car right.jpg" */