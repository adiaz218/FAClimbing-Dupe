// firestore-users.js

import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js"; // Import signOut

const db = window.firestore;
const auth = window.auth;

// --- UI Element References ---
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const userDisplayName = document.getElementById('userDisplayName');
const userPhoneNumber = document.getElementById('userPhoneNumber');
const userLoyaltyPoints = document.getElementById('userLoyaltyPoints');
const userMembershipStatus = document.getElementById('userMembershipStatus');
const userMembershipType = document.getElementById('userMembershipType');
const userHomeGym = document.getElementById('userHomeGym');
const logoutButton = document.getElementById('logoutButton');
const updatePointsButton = document.getElementById('updatePointsButton');


// --- Utility Functions for UI Visibility ---
function showLoggedInUI(userData) {
  authSection.classList.add('hidden'); // Hide authentication form
  appSection.classList.add('visible'); // Show application content

  // Populate user data
  userDisplayName.textContent = userData.displayName || "N/A";
  userPhoneNumber.textContent = userData.phoneNumber || "N/A";
  userLoyaltyPoints.textContent = userData.loyaltyPoints || 0;
  userMembershipStatus.textContent = userData.membership?.status || "N/A";
  userMembershipType.textContent = userData.membership?.type || "N/A";
  userHomeGym.textContent = userData.homeGymName || "Not set";
}

function showLoggedOutUI() {
  authSection.classList.remove('hidden'); // Show authentication form
  appSection.classList.remove('visible'); // Hide application content

  // Clear user data displays
  userDisplayName.textContent = "";
  userPhoneNumber.textContent = "";
  userLoyaltyPoints.textContent = "";
  userMembershipStatus.textContent = "";
  userMembershipType.textContent = "";
  userHomeGym.textContent = "";
}


// --- Firestore User Management Functions (from previous discussions) ---
async function createNewUserDocument(userAuth) {
  if (!userAuth || !userAuth.uid) { console.error("Invalid userAuth object provided."); return null; }
  const userRef = doc(db, "users", userAuth.uid);
  const userData = {
    uid: userAuth.uid, email: userAuth.email || null, phoneNumber: userAuth.phoneNumber || null,
    displayName: userAuth.displayName || "New Climber", profilePictureUrl: userAuth.photoURL || null,
    createdAt: new Date(), loyaltyPoints: 0,
    membership: { status: "Inactive", type: "None", startDate: null, endDate: null, autoRenew: false }
  };
  try {
    await setDoc(userRef, userData, { merge: true });
    console.log("User document created/updated successfully for UID:", userAuth.uid);
    return userData;
  } catch (error) { console.error("Error creating user document:", error); throw error; }
}

async function getUserData(uid) {
  if (!uid) { console.error("UID must be provided to getUserData."); return null; }
  const userRef = doc(db, "users", uid);
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      console.log("Fetched user data:", userSnap.data());
      return userSnap.data();
    } else {
      console.log("No user document found for UID:", uid);
      return null;
    }
  } catch (error) { console.error("Error getting user document:", error); throw error; }
}

async function updateUserData(uid, updates) {
  if (!uid || !updates || Object.keys(updates).length === 0) {
    console.error("UID and update data must be provided to updateUserData.");
    return;
  }
  const userRef = doc(db, "users", uid);
  try {
    await updateDoc(userRef, updates);
    console.log("User document updated successfully for UID:", uid, "Updates:", updates);
  } catch (error) { console.error("Error updating user document:", error); throw error; }
}


// --- Event Listener for Firebase Authentication State Changes ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("onAuthStateChanged: User logged in, UID:", user.uid);

    let userData;
    try {
      userData = await getUserData(user.uid);
      if (!userData) {
        console.log("onAuthStateChanged: User data not found, creating new document.");
        userData = await createNewUserDocument(user);
      }
      console.log("onAuthStateChanged: User's Firestore data:", userData);
      showLoggedInUI(userData); // Show logged-in UI and populate with data
    } catch (error) {
      console.error("Error handling user login state:", error);
      // Optionally, force log out if there's a critical error with Firestore data
      await signOut(auth);
      showLoggedOutUI();
    }
  } else {
    console.log("onAuthStateChanged: User signed out.");
    showLoggedOutUI(); // Show logged-out UI
  }
});


// --- Logout Functionality ---
logoutButton.addEventListener('click', async () => {
  try {
    await signOut(auth);
    console.log("User successfully logged out.");
  } catch (error) {
    console.error("Error logging out:", error);
  }
});

// --- Example: Updating Loyalty Points ---
updatePointsButton.addEventListener('click', async () => {
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      // Get current points to ensure atomic update (or use FieldValue.increment)
      const currentData = await getUserData(currentUser.uid);
      if (currentData) {
        const newPoints = (currentData.loyaltyPoints || 0) + 10;
        await updateUserData(currentUser.uid, { loyaltyPoints: newPoints });
        // After update, refresh UI (you might refetch user data or update local state)
        userLoyaltyPoints.textContent = newPoints;
        console.log(`Loyalty points updated to ${newPoints}`);
      }
    } catch (error) {
      console.error("Error updating loyalty points:", error);
    }
  } else {
    console.warn("No user logged in to update loyalty points.");
  }
});


// Export functions if needed elsewhere
export {
  createNewUserDocument,
  getUserData,
  updateUserData
};
