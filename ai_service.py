import os
import io
import torch
import clip
import numpy as np
import pandas as pd
import ast
import uvicorn
import edge_tts
from PIL import Image
from io import BytesIO
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

# Load API Keys
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --- 1. MODEL LOADING (Optimized for AWS Free Tier) ---
device = "cpu"
# Using ViT-B/32 for 10x faster image recognition
clip_model, clip_preprocess = clip.load("ViT-B/32", device=device)

# Initialize Groq Client
client = Groq(api_key=GROQ_API_KEY)

# --- 2. LOAD LANDMARK DATA ---
EMBEDDINGS_FILE = "landmark_embeddings.csv"

def parse_embeddings(x):
    if isinstance(x, str):
        try:
            return list(map(float, ast.literal_eval(x)))
        except:
            return list(map(float, x.strip().split()))
    return x if isinstance(x, list) else []

if os.path.exists(EMBEDDINGS_FILE):
    df = pd.read_csv(EMBEDDINGS_FILE)
    df['embeddings'] = df['embeddings'].apply(parse_embeddings)
    landmarks = []
    for _, row in df.iterrows():
        emb = np.array(row['embeddings'], dtype=float)
        if np.linalg.norm(emb) != 0:
            emb = emb / np.linalg.norm(emb)
        landmarks.append({
            "name": row.get("name"),
            "wikiLink": row.get("wikipedialink", ""),
            "embedding": emb
        })
    print(f"✅ Loaded {len(landmarks)} landmarks.")
else:
    print(f"⚠️ FATAL: {EMBEDDINGS_FILE} not found in /home/ubuntu!")
    landmarks = []

# --- 3. FASTAPI SETUP ---
app = FastAPI(title="Travellens AI (Instant Groq edition)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-IN-NeerjaNeural"

class ChatRequest(BaseModel):
    message: str
    context: str
    temperature: float = 0.0

# --- 4. ENDPOINTS ---

@app.get("/")
async def root():
    return {"status": "online", "engine": "Groq-Cloud-Speed"}

@app.post("/search")
async def search(file: UploadFile = File(...)):
    try:
        data = await file.read()
        pil_img = Image.open(BytesIO(data)).convert("RGB")
        img = clip_preprocess(pil_img).unsqueeze(0).to(device)
        
        with torch.no_grad():
            query_emb = clip_model.encode_image(img).cpu().numpy()[0]
        query_emb = query_emb / np.linalg.norm(query_emb)

        best_score, best_hit = -1.0, None
        for lm in landmarks:
            score = float(np.dot(query_emb, lm["embedding"]))
            if score > best_score:
                best_score, best_hit = score, lm

        # Quality threshold
        if best_hit and best_score >= 0.70:
            return {
                "landmarkName": best_hit["name"], 
                "wikiLink": best_hit["wikiLink"], 
                "score": round(best_score, 3)
            }
        return {"landmarkName": "Unknown", "wikiLink": "", "score": round(best_score, 3)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/tts")
async def text_to_speech(request: TTSRequest):
    try:
        communicate = edge_tts.Communicate(request.text, request.voice)
        audio_stream = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_stream.write(chunk["data"])
        audio_stream.seek(0)
        return StreamingResponse(audio_stream, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Construct the "Master Tour Guide" prompt
        system_prompt = f"""
        You are a Master Tour Guide for Travellens. Follow these RULES:
        1. All responses must be 100% accurate, concise, and professional.
        2. If the user greets you, respond politely and then ask, 'How can I help you today?'.
        3. Use ONLY the provided landmark information to answer: {request.context[:1500]}
        4. If you don't know, say you don't have enough info. Do not invent facts.
        """
        
        # INSTANT CLOUD CALL
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": request.message}
            ],
            temperature=request.temperature,
            max_tokens=256
        )
        
        response_text = completion.choices[0].message.content
        return {"response": response_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
