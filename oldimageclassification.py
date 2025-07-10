from transformers import pipeline, BeitForImageClassification, BeitImageProcessor, BeitConfig
from huggingface_hub import login
from dotenv import load_dotenv
import os


# Load environment variables from .env
load_dotenv()

# Fetch variables
HF_TOKEN = os.getenv("HF_TOKEN")


login(token=HF_TOKEN)



config = BeitConfig.from_pretrained("microsoft/beit-base-patch16-224-pt22k-ft22k")

model = BeitForImageClassification.from_pretrained(
    "microsoft/beit-base-patch16-224-pt22k-ft22k",
    config=config,
    ignore_mismatched_sizes=True
)

print("Number of labels:", model.config.num_labels)
print("Length of id2label:", len(model.config.id2label))
print("Sample keys in id2label:", list(model.config.id2label.keys())[:10])
print("Max id2label key:", max(model.config.id2label.keys()))
print("Model classifier output features:", model.classifier.out_features)

print("Sample keys and types in id2label:")
for k in list(model.config.id2label.keys())[:20]:
    print(f"Key: {k} (type: {type(k)})")

print("Is 9205 in id2label?", 9205 in model.config.id2label)
print("Is '9205' in id2label?", '9205' in model.config.id2label)

# Also try to print a value for 9205 if exists
try:
    print("Label for 9205:", model.config.id2label[9205])
except KeyError:
    print("Key 9205 not found")

try:
    print("Label for '9205':", model.config.id2label['9205'])
except KeyError:
    print("Key '9205' not found")



processor = BeitImageProcessor.from_pretrained("microsoft/beit-base-patch16-224-pt22k-ft22k")

max_key = max(model.config.id2label.keys())
model.config.id2label = {i: model.config.id2label.get(i, f"label_{i}") for i in range(max_key + 1)}


pipe = pipeline(
    "image-classification",
    model=model,
    feature_extractor=processor
)
image_classification_result = pipe(r"C:\Users\JoeJo\Downloads\20250623_134658.jpg")
print(f"image-_classification_result is: {image_classification_result}")


from PIL import Image


pipe3 = pipeline("image-to-text", model="Salesforce/blip2-opt-2.7b")
result = pipe3(r"C:\Users\JoeJo\Downloads\XyAaqBEtYtb8YffjKZ68Gb.jpg")
print(f"Salesforce/blip2-opt-2.7b result is: {result[0]['generated_text']}")

pipe2 = pipeline("image-to-text", model="Salesforce/blip-image-captioning-large")
result = pipe2(r"C:\Users\JoeJo\Downloads\20250623_134658.jpg")
print(f"result is: {result}")