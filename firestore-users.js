// firestore-users.js

import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-firestore.js";
import { getAuth, signOut } from "https://www.gstatic.com/firebasejs/12.9.0/firebase-auth.js";

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

const homeGymSelect = document.getElementById('homeGymSelect');
const saveHomeGymButton = document.getElementById('saveHomeGymButton');
const homeGymStatus = document.getElementById('homeGymStatus');


// --- Utility Functions for UI Visibility ---
function showLoggedInUI(userData) {
  authSection.classList.add('hidden');
  appSection.classList.add('visible');

  // Populate user data
  userDisplayName.textContent = userData.displayName || "N/A";
  userPhoneNumber.textContent = userData.phoneNumber || "N/A";
  userLoyaltyPoints.textContent = userData.loyaltyPoints || 0;
  userMembershipStatus.textContent = userData.membership?.status || "N/A";
  userMembershipType.textContent = userData.membership?.type || "N/A";
  userHomeGym.textContent = userData.homeGymName || "Not set";

  // Pre-select the user's home gym in the dropdown
  if (userData.homeGymId && homeGymSelect) {
    homeGymSelect.value = userData.homeGymId;
  }
}

function showLoggedOutUI() {
  authSection.classList.remove('hidden');
  appSection.classList.remove('visible');

  // Clear user data displays
  userDisplayName.textContent = "";
  userPhoneNumber.textContent = "";
  userLoyaltyPoints.textContent = "";
  userMembershipStatus.textContent = "";
  userMembershipType.textContent = "";
  userHomeGym.textContent = "";

  // Reset gym select
  if (homeGymSelect) homeGymSelect.value = "";
  if (homeGymStatus) homeGymStatus.textContent = "";
}


// --- Firestore User Management Functions (NOW COMPLETE) ---

async function createNewUserDocument(userAuth) {
  if (!userAuth || !userAuth.uid) {
    console.error("createNewUserDocument: Invalid userAuth object provided.");
    return null;
  }
  const userRef = doc(db, "users", userAuth.uid);
  const userData = {
    uid: userAuth.uid,
    email: userAuth.email || null,
    phoneNumber: userAuth.phoneNumber || null,
    displayName: userAuth.displayName || "New Climber",
    profilePictureUrl: userAuth.photoURL || null,
    createdAt: new Date(),
    loyaltyPoints: 0,
    membership: {
      status: "Inactive",
      type: "None",
      startDate: null,
      endDate: null,
      autoRenew: false
    }
  };
  try {
    console.log("createNewUserDocument: Attempting to set document for UID:", userAuth.uid);
    await setDoc(userRef, userData, { merge: true });
    console.log("createNewUserDocument: setDoc successful for UID:", userAuth.uid, "Returning userData:", userData);
    return userData;
  } catch (error) {
    console.error("createNewUserDocument: ERROR during setDoc for UID:", userAuth.uid, error);
    return null; // Explicitly return null on failure
  }
}

async function getUserData(uid) {
  if (!uid) {
    console.error("getUserData: UID must be provided.");
    return null;
  }
  const userRef = doc(db, "users", uid);
  try {
    console.log("getUserData: Attempting to get document for UID:", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const data = userSnap.data();
      console.log("getUserData: Document found for UID:", uid, "Data:", data);
      return data;
    } else {
      console.log("getUserData: No document found for UID:", uid, "Returning null.");
      return null;
    }
  } catch (error) {
    console.error("getUserData: ERROR during getDoc for UID:", uid, error);
    return null; // Explicitly return null on failure
  }
}

async function updateUserData(uid, updates) {
  if (!uid || !updates || Object.keys(updates).length === 0) {
    console.error("updateUserData: UID and update data must be provided.");
    return; // Don't return data, just indicate completion
  }
  const userRef = doc(db, "users", uid);
  try {
    console.log("updateUserData: Attempting to update document for UID:", uid, "Updates:", updates);
    await updateDoc(userRef, updates);
    console.log("updateUserData: updateDoc successful for UID:", uid);
  } catch (error) {
    console.error("updateUserData: ERROR during updateDoc for UID:", uid, error);
    throw error; // Re-throw this one, as update might imply a specific action
  }
}


// --- NEW: Gym Management Functions ---

let allGyms = [];

async function getAllGyms() {
  const gymsCol = collection(db, "gyms");
  try {
    console.log("getAllGyms: Attempting to fetch gyms collection.");
    const gymSnapshot = await getDocs(gymsCol);
    const gymsList = gymSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log("getAllGyms: Fetched gyms:", gymsList);
    return gymsList;
  } catch (error) {
    console.error("getAllGyms: ERROR fetching gyms:", error);
    return [];
  }
}

async function populateHomeGymSelect() {
  allGyms = await getAllGyms();
  if (homeGymSelect) {
    homeGymSelect.innerHTML = '<option value="">-- Select a Gym --</option>';
    allGyms.forEach(gym => {
      const option = document.createElement('option');
      option.value = gym.id;
      option.textContent = gym.name;
      homeGymSelect.appendChild(option);
    });
  }
}


// --- Event Listener for Firebase Authentication State Changes ---
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log("onAuthStateChanged: User logged in, UID:", user.uid);

    let userData = null; // Initialize userData to null explicitly

    try {
      // 1. Try to get existing user data from Firestore
      userData = await getUserData(user.uid);

      // 2. If no data exists, create a new user document
      if (!userData) {
        console.log("onAuthStateChanged: User data not found in Firestore, creating new document.");
        userData = await createNewUserDocument(user);
      }

      // CRITICAL CHECK: Ensure userData is valid AFTER trying to get or create it
      if (userData) { // Only proceed if userData is an actual object
        console.log("onAuthStateChanged: User's Firestore data retrieved/created:", userData);
        await populateHomeGymSelect(); // Populate gyms dropdown
        showLoggedInUI(userData);    // Update the UI with the valid user data
      } else {
        // If userData is still null/undefined here, it means both retrieval and creation failed
        console.error("onAuthStateChanged: Failed to retrieve or create user Firestore data. Forcing logout.");
        await signOut(auth); // Log out the user because their data couldn't be managed
        showLoggedOutUI();   // Show the logged-out UI
      }

    } catch (error) {
      // This catch block handles any unexpected errors during getUserData or createNewUserDocument
      console.error("Error handling user login state during Firestore data operation:", error);
      await signOut(auth);
      showLoggedOutUI();
    }
  } else {
    // User is signed out.
    console.log("onAuthStateChanged: User signed out.");
    showLoggedOutUI();
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
      const currentData = await getUserData(currentUser.uid);
      if (currentData) {
        const newPoints = (currentData.loyaltyPoints || 0) + 10;
        await updateUserData(currentUser.uid, { loyaltyPoints: newPoints });
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


// --- NEW: Save Home Gym Functionality ---
saveHomeGymButton.addEventListener('click', async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    homeGymStatus.textContent = "Please log in to save your home gym.";
    return;
  }

  const selectedGymId = homeGymSelect.value;
  if (!selectedGymId) {
    homeGymStatus.textContent = "Please select a gym.";
    return;
  }

  const selectedGym = allGyms.find(gym => gym.id === selectedGymId);
  const selectedGymName = selectedGym ? selectedGym.name : "";

  homeGymStatus.textContent = "Saving home gym...";
  try {
    await updateUserData(currentUser.uid, {
      homeGymId: selectedGymId,
      homeGymName: selectedGymName
    });
    userHomeGym.textContent = selectedGymName;
    homeGymStatus.textContent = `Home gym set to ${selectedGymName}!`;
    console.log(`User ${currentUser.uid} set home gym to ${selectedGymName} (${selectedGymId})`);
  } catch (error) {
    console.error("Error saving home gym:", error);
    homeGymStatus.textContent = `Error saving home gym: ${error.message}`;
  }
});


export {
  createNewUserDocument,
  getUserData,
  updateUserData,
  getAllGyms
};
