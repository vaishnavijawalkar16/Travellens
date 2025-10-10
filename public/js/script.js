// SHOW USER NAME ON HOME
window.onload = function () {
  let user = localStorage.getItem("username");
  if (user && document.getElementById("user-display")) {
    document.getElementById("user-display").innerText = user;
  }
};
