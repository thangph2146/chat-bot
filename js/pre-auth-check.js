﻿try {
  const userDataString = localStorage.getItem('hub_user_data');
  let isAuthenticated = false;
  if (userDataString) {
    const userData = JSON.parse(userDataString);
    // Check for the essential token within the data structure
    if (userData && userData.data && userData.data.token) {
      isAuthenticated = true;
    } else {
      console.warn('[pre-auth-check.js] User data found but structure is invalid or token missing. Access denied.');
      localStorage.removeItem('hub_user_data'); // Clean up invalid data
    }
  } else {
  }

  if (!isAuthenticated) {
    window.location.replace('login.html'); // Use replace to prevent back navigation
  }
} catch (error) {
  console.error('[pre-auth-check.js] Error checking authentication:', error);
  localStorage.removeItem('hub_user_data'); // Clean up potentially corrupted data
  // Redirect even on error, as we can't verify auth status
  window.location.replace('login.html');
}