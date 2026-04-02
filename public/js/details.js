let currentAudio = null;
let currentBtn = null;
let isPlayingAll = false;
let playlist = [];
let currentIndex = 0;

window.toggleTTS = async function(textId, btn) {
  const textElement = document.getElementById(textId);
  if (!textElement) return;
  playTTS(textElement.innerText, btn);
};

window.toggleTTSFromElement = async function(item, btn) {
  const body = item.querySelector('.content-body');
  if (!body || body.innerText.trim() === "" || body.innerText.includes("Loading")) {
    // Not loaded yet, open it
    item.querySelector('.accordion-header').click(); 
    return;
  }
  playTTS(body.innerText, btn);
};

function cleanWikiText(text) {
  if (!text) return "";
  return text
    .replace(/\[\d+\]/g, "") // Remove citations like [1], [22]
    .replace(/\^/g, "")      // Remove carets
    .replace(/\s+/g, " ")    // Normalize spaces
    .trim();
}

async function playTTS(text, btn) {
  if (!text || text.trim() === "") return;
  
  const cleanedText = cleanWikiText(text);
  if (!cleanedText) return;

  if (currentAudio && currentBtn === btn) {
    currentAudio.pause();
    resetBtn(btn);
    currentAudio = null;
    currentBtn = null;
    return;
  }

  if (currentAudio) {
    currentAudio.pause();
    resetBtn(currentBtn);
  }

  btn.classList.add('playing');
  btn.innerHTML = '<i class="fa-solid fa-pause"></i>';
  currentBtn = btn;

  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanedText.substring(0, 3000) }) // Increased limit
    });
    
    if (!response.ok) throw new Error("TTS failed");
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    currentAudio = new Audio(url);
    
    currentAudio.onended = () => {
      resetBtn(btn);
      currentAudio = null;
      currentBtn = null;
      if (isPlayingAll) playNextInSection();
    };
    
    currentAudio.play();
  } catch (err) {
    console.error(err);
    resetBtn(btn);
    alert("Audio failed. There was some unknown issue.");
  }
}

function resetBtn(btn) {
  if (!btn) return;
  btn.classList.remove('playing');
  if (btn.classList.contains('master-tts')) {
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Listen All';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  }
}

window.playAllSections = async function(masterBtn) {
  if (isPlayingAll) {
    isPlayingAll = false;
    if (currentAudio) currentAudio.pause();
    resetBtn(masterBtn);
    resetBtn(currentBtn);
    return;
  }

  playlist = [];
  // 🔹 Starting from sections only, excluding Overview
  const sections = document.querySelectorAll('.accordion-item');
  sections.forEach(item => {
    const body = item.querySelector('.content-body');
    const btn = item.querySelector('.section-tts-btn');
    if (body && body.innerText.trim() !== "" && !body.innerText.includes("Loading")) {
      playlist.push({ text: body.innerText, btn: btn, item: item });
    }
  });

  if (playlist.length === 0) {
    alert("No sections loaded yet. Please expand a section to load its content first.");
    return;
  }

  isPlayingAll = true;
  currentIndex = 0;
  masterBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Stop Listening';
  masterBtn.classList.add('playing');
  currentBtn = masterBtn;

  playNextInSection();
};

function playNextInSection() {
  if (!isPlayingAll || currentIndex >= playlist.length) {
    resetBtn(document.querySelector('.master-tts'));
    isPlayingAll = false;
    return;
  }

  const current = playlist[currentIndex];
  if (current.item) {
    current.item.classList.add('active');
    current.item.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  playTTS(current.text, current.btn);
  currentIndex++;
}

document.addEventListener('DOMContentLoaded', () => {
  const accordionHeaders = document.querySelectorAll('.accordion-header');

  accordionHeaders.forEach(header => {
    header.addEventListener('click', async () => {
      const item = header.parentElement;
      const content = item.querySelector('.accordion-content');
      const body = content.querySelector('.content-body');
      const loader = content.querySelector('.loader-container');
      const index = item.getAttribute('data-index');
      const title = item.getAttribute('data-title');

      // Close all other items
      document.querySelectorAll('.accordion-item').forEach(otherItem => {
        if (otherItem !== item) {
          otherItem.classList.remove('active');
        }
      });

      // Toggle current item
      item.classList.toggle('active');

      // Fetch content if not already loaded and item is active
      if (item.classList.contains('active') && body.innerHTML === '') {
        loader.style.display = 'flex';
        try {
          const response = await fetch(`/api/wiki/section?title=${encodeURIComponent(title)}&index=${index}`);
          const data = await response.json();
          if (data.content) {
            body.innerHTML = data.content;
            // Fix Wikipedia links in content
            body.querySelectorAll('a').forEach(link => {
              if (link.getAttribute('href')?.startsWith('/wiki/')) {
                link.setAttribute('href', 'https://en.wikipedia.org' + link.getAttribute('href'));
                link.setAttribute('target', '_blank');
              }
            });
          } else {
            body.innerHTML = `<p>This section content couldn't be retrieved directly. Check the <a href="${item.dataset.wikiUrl || '#'}" target="_blank">Full Wikipedia Article</a> for more details.</p>`;
          }
        } catch (err) {
          console.error('Error fetching section:', err);
          body.innerHTML = '<p>Error loading content. Please try again.</p>';
        } finally {
          loader.style.display = 'none';
        }
      }
    });
  });
});
