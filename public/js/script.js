// LOGIN
function loginUser() {
  let name = document.getElementById("login-name").value;
  let password = document.getElementById("login-password").value;

  if (name && password) {
    // Later: validate with backend
    localStorage.setItem("username", name);
    window.location.href = "/home";
  } else {
    alert("Please enter valid login details.");
  }
}

// SIGNUP
function signupUser() {
  let name = document.getElementById("signup-name").value;
  let email = document.getElementById("signup-email").value;
  let password = document.getElementById("signup-password").value;

  if (name && email && password) {
    // Later: save to database
    localStorage.setItem("username", name);
    alert("Signup successful! Please login.");
    window.location.href = "/login";
  } else {
    alert("Please fill all details.");
  }
}

// SHOW USER NAME ON HOME
window.onload = function () {
  let user = localStorage.getItem("username");
  if (user && document.getElementById("user-display")) {
    document.getElementById("user-display").innerText = user;
  }
};
