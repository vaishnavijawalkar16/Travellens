document.addEventListener('DOMContentLoaded', () => {
    const cameraInput = document.getElementById('camera-input');
    const galleryInput = document.getElementById('gallery-input');
    const uploadForm = document.getElementById('uploadForm');
    const snapBtn = document.getElementById('snap-btn');
    const galleryBtn = document.getElementById('gallery-btn');

    if (snapBtn) snapBtn.addEventListener('click', () => cameraInput.click());
    if (galleryBtn) galleryBtn.addEventListener('click', () => galleryInput.click());

    const handleFileChange = function() {
        if (this.files && this.files.length > 0) {
            uploadForm.submit();
        }
    };

    if (cameraInput) cameraInput.addEventListener('change', handleFileChange);
    if (galleryInput) galleryInput.addEventListener('change', handleFileChange);
});
