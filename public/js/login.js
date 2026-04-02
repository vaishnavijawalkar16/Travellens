document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-name').value.trim();
            const password = document.getElementById('login-password').value.trim();
            const emailError = document.getElementById('email-error');
            const passwordError = document.getElementById('password-error');
            
            emailError.innerText = '';
            passwordError.innerText = '';
            loginError.innerText = '';

            let hasError = false;
            if (!email) {
                emailError.innerText = 'Email is required';
                hasError = true;
            }
            if (!password) {
                passwordError.innerText = 'Password is required';
                hasError = true;
            }

            if (hasError) return;
            
            const submitBtn = loginForm.querySelector('.auth-submit');
            submitBtn.disabled = true;
            submitBtn.innerText = 'Logging in...';

            const formData = new FormData(loginForm);
            try {
                const res = await fetch('/auth/login', {
                    method: 'POST',
                    headers: { 
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(Object.fromEntries(formData))
                });

                const data = await res.json();
                if (res.ok) {
                    window.location.href = data.redirectUrl;
                } else {
                    loginError.innerText = data.message;
                    loginError.style.color = 'red';
                }
            } catch (err) {
                loginError.innerText = 'Network error. Try again.';
            }
        });
    }
});
