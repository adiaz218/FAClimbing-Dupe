// auth.js

import { RecaptchaVerifier, signInWithPhoneNumber } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

const auth = window.auth;

// Get references to your HTML elements (ensure these elements exist in index.html)
const phoneNumberInput = document.getElementById('phoneNumber');
const sendCodeButton = document.getElementById('sendCode');
const verificationCodeInput = document.getElementById('verificationCode');
const verifyCodeButton = document.getElementById('verifyCode');
const authStatus = document.getElementById('authStatus');

// Initialize the reCAPTCHA verifier
window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
  'size': 'invisible',
  'callback': (response) => {
    console.log("reCAPTCHA solved!");
  },
  'expired-callback': () => {
    console.log("reCAPTCHA expired, please try again.");
    window.recaptchaVerifier.render().then(function(widgetId) {
        grecaptcha.reset(widgetId);
    });
  }
});

window.recaptchaVerifier.render().then((widgetId) => {
  console.log("reCAPTCHA rendered with ID:", widgetId);
});

// Send the Verification Code
sendCodeButton.addEventListener('click', async () => {
  const phoneNumber = phoneNumberInput.value;
  if (!phoneNumber) {
    authStatus.textContent = "Please enter a phone number.";
    return;
  }

  authStatus.textContent = "Sending verification code...";
  try {
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
    window.confirmationResult = confirmationResult;
    authStatus.textContent = "Verification code sent! Please check your phone.";
    sendCodeButton.disabled = true;
    verificationCodeInput.disabled = false;
    verifyCodeButton.disabled = false;
  } catch (error) {
    console.error("Error sending verification code:", error);
    authStatus.textContent = `Error: ${error.message}`;
    window.recaptchaVerifier.render().then(function(widgetId) {
        grecaptcha.reset(widgetId);
    });
  }
});

// Verify the Code
verifyCodeButton.addEventListener('click', async () => {
  const verificationCode = verificationCodeInput.value;
  if (!verificationCode) {
    authStatus.textContent = "Please enter the verification code.";
    return;
  }

  if (!window.confirmationResult) {
    authStatus.textContent = "No verification request was sent. Please send code first.";
    return;
  }

  authStatus.textContent = "Verifying code...";
  try {
    const result = await window.confirmationResult.confirm(verificationCode);
    const user = result.user;
    console.log("User signed in:", user);
    authStatus.textContent = `Successfully signed in as: ${user.phoneNumber}`;
  } catch (error) {
    console.error("Error verifying code:", error);
    authStatus.textContent = `Error: ${error.message}`;
  }
});
