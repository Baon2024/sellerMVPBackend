from dotenv import load_dotenv
import os
import google.generativeai as genai
from groq import Groq
from PIL import Image
import gradio as gr
import requests
from io import BytesIO


# Load environment variables from .env
load_dotenv()

from groq import Groq

client = Groq(
    api_key=os.environ.get("GROQ_API_KEY"),
)




# Fetch variables
HF_TOKEN = os.getenv("HF_TOKEN")


#login(token=HF_TOKEN)


def product_identification_response(image_path=r"C:\Users\JoeJo\Downloads\XyAaqBEtYtb8YffjKZ68Gb.jpg"):
    # Authenticate
    genai.configure(api_key=os.environ.get("GENAI_API_KEY"))
    
    # Load Gemini Pro Vision
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    # Load your image
    clean_path = image_path.strip('"')
    #image = Image.open(clean_path)

    if clean_path.startswith("http"):
        response = requests.get(clean_path)
        response.raise_for_status()  # Throw error if download fails
        image = Image.open(BytesIO(response.content))
    else:
        image = Image.open(clean_path)
    
    # Ask Gemini
    response = model.generate_content(
        ["What is the registration number of the vehicle in this image", image]
    )
    
    print(f"gemini-1.5-flash answer is: {response.text}")
    
    prompt = f"""Your task is to returned structured JSON of product and condition in the following format: {{ "product": "the identity of the product", "condition": "the condition of the product"}}.
    The condition of the product must be one of the following: (*) New, (*) Like New, (*) Good or (*) Poor.
    Use the data from {response} as the source for your response
    """
    prompt2 = f"""Your task is to returned structured JSON of the registration of the car in the image, in the following format: {{ "registration_number": "the registration number of the car" }}.
    The registration number is the two art number that is visible at the front of the car.
    Use this image of the car as your data source: {response}"""

    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "system",
                "content": prompt2
            },
            {
                "role": "user",
                "content": response.text,
            }
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"},#and include word 'json' in messages/prompt
        )
        
    print(chat_completion.choices[0].message.content)
    return chat_completion.choices[0].message.content



#product_identification_response()

demo = gr.Interface(
    fn=product_identification_response,
    inputs="text",
    outputs="text",
    title="identify registration number",
    description="finds info about a product"
)

demo.launch(share=True)