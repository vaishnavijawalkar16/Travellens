import os
import requests
from tqdm import tqdm

def download_file(url, filename):
    if os.path.exists(filename):
        print(f"{filename} already exists. Skipping download.")
        return
    
    print(f"Downloading {filename}...")
    response = requests.get(url, stream=True)
    total_size = int(response.headers.get('content-length', 0))
    
    with open(filename, 'wb') as file, tqdm(
        desc=filename,
        total=total_size,
        unit='iB',
        unit_scale=True,
        unit_divisor=1024,
    ) as bar:
        for data in response.iter_content(chunk_size=1024):
            size = file.write(data)
            bar.update(size)
    print(f"Download complete: {filename}")

if __name__ == "__main__":
    # Gemma-2b-it GGUF (approx 1.5GB)
    GEMMA_URL = "https://huggingface.co/lmstudio-ai/gemma-2b-it-GGUF/resolve/main/gemma-2b-it-q4_k_m.gguf"
    download_file(GEMMA_URL, "gemma-2b.gguf")

    # CLIP Fine-tuning placeholder or specific weights if needed
    # Note: clip.load("ViT-L/14") will handle its own download on first run
    print("CLIP ViT-L/14 will be downloaded automatically on first service run.")
