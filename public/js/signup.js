document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signup-form');
  const usernameInput = document.getElementById('signup-name');
  const emailInput = document.getElementById('signup-email');
  const passwordInput = document.getElementById('signup-password');

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  const checkExists = async (field, value) => {
    if (!value) return false;
    try {
      const res = await fetch('/auth/check-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ field, value })
      });
      const data = await res.json();
      return data.exists;
    } catch (err) {
      return false;
    }
  };

  const validateUsername = async () => {
    const errorSpan = document.getElementById('username-error');
    if (!usernameInput.value) return false;
    
    if (usernameInput.value.length < 3) {
      errorSpan.innerText = 'Username too short';
      return false;
    }
    const exists = await checkExists('username', usernameInput.value);
    if (exists) {
      errorSpan.innerText = 'Username already exists';
      return false;
    }
    errorSpan.innerText = '';
    return true;
  };

  const validateEmail = async () => {
    const errorSpan = document.getElementById('email-error');
    if (!emailInput.value) return false;

    if (!emailInput.value.includes('@')) {
      errorSpan.innerText = 'Invalid email';
      return false;
    }
    const exists = await checkExists('email', emailInput.value);
    if (exists) {
      errorSpan.innerText = 'Email already exists';
      return false;
    }
    errorSpan.innerText = '';
    return true;
  };

  const validatePassword = () => {
    const errorSpan = document.getElementById('password-error');
    if (!passwordInput.value) return false;

    if (!passwordRegex.test(passwordInput.value)) {
      errorSpan.innerText = 'Min 8 chars, mixed case, number & special char';
      return false;
    }
    errorSpan.innerText = '';
    return true;
  };

  usernameInput.addEventListener('blur', validateUsername);
  emailInput.addEventListener('blur', validateEmail);
  passwordInput.addEventListener('input', validatePassword);

  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    document.querySelectorAll('.error-text').forEach(el => el.innerText = '');

    const uValid = await validateUsername();
    const eValid = await validateEmail();
    const pValid = validatePassword();

    if (uValid && eValid && pValid) {
      const submitBtn = signupForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.innerText = 'Creating Account...';

      const formData = new FormData(signupForm);
      try {
        const res = await fetch('/auth/signup', {
          method: 'POST',
          headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(formData))
        });
        const data = await res.json();
        if (res.ok) {
          window.location.href = data.redirectUrl;
        } else {
          alert(data.message);
          submitBtn.disabled = false;
          submitBtn.innerText = 'Sign Up';
        }
      } catch (err) {
        alert("An error occurred. Please try again.");
        submitBtn.disabled = false;
        submitBtn.innerText = 'Sign Up';
      }
    }
  });
});
