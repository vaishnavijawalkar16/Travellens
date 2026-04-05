#!/bin/bash

echo "🚀 Starting Travellens AI Setup..."

# 1. Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# 2. Create swap space
echo "💾 Configuring 8GB Swap Space..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 8G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ Swap Space Created."
else
    echo "⚠️ Swap already exists. Skipping."
fi

# 3. Install system packages
echo "🛠️ Installing Python, Node.js, PM2..."
sudo apt install -y python3-pip python3-venv nodejs npm build-essential
sudo npm install -g pm2

# 4. Create virtual environment
echo "🐍 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# 5. Upgrade pip
pip install --upgrade pip

# 6. Install project dependencies
echo "📂 Installing Python dependencies..."
pip install -r requirements.txt
pip install tqdm requests

# 7. Download model
echo "📥 Downloading model..."
python download_models.py

echo "🏁 Setup Complete!"
echo "Run these commands next:"
echo "pm2 start ai_service.py --name travellens-ai --interpreter /home/ubuntu/venv/bin/python"
echo "pm2 save"
echo "pm2 startup"