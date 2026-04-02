document.addEventListener('DOMContentLoaded', () => {
    const editForm = document.getElementById('edit-profile-form');
    const editUsername = document.getElementById('edit-username');
    const editPassword = document.getElementById('edit-password');
    const usernameError = document.getElementById('edit-username-error');
    const generalError = document.getElementById('edit-general-error');
    
    // Get current username from data attribute
    const currentUsername = editUsername ? editUsername.getAttribute('data-current-username') : "";

    window.openModal = function() {
        const modal = document.getElementById("modalBg");
        if (modal) modal.style.display = "flex";
    };
    window.closeModal = function() {
        const modal = document.getElementById("modalBg");
        if (modal) modal.style.display = "none";
    };

    window.openDeleteModal = function() {
        const modal = document.getElementById("deleteModal");
        if (modal) modal.style.display = "flex";
    };
    window.closeDeleteModal = function() {
        const modal = document.getElementById("deleteModal");
        if (modal) modal.style.display = "none";
    };

    const checkUsername = async (val) => {
        if (!val || val === currentUsername) {
            if (usernameError) usernameError.innerText = '';
            return true;
        }
        try {
            const res = await fetch('/auth/check-exists', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: 'username', value: val })
            });
            const data = await res.json();
            if (data.exists) {
                if (usernameError) usernameError.innerText = 'Username already exists';
                return false;
            }
            if (usernameError) usernameError.innerText = '';
            return true;
        } catch (err) { return true; }
    };

    if (editUsername) {
        editUsername.addEventListener('blur', () => checkUsername(editUsername.value));
    }

    if (editForm) {
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const isAvailable = await checkUsername(editUsername.value);
            if (!isAvailable) return;

            const formData = new FormData(editForm);
            try {
                const res = await fetch('/auth/update-profile', {
                    method: 'POST',
                    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                    body: JSON.stringify(Object.fromEntries(formData))
                });
                const data = await res.json();
                if (res.ok) {
                    window.location.reload();
                } else {
                    if (generalError) generalError.innerText = data.message;
                }
            } catch (err) {
                if (generalError) generalError.innerText = 'Failed to update profile';
            }
        });
    }
});
