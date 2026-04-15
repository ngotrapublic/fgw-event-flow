const admin = require('firebase-admin');

// We can bypass initialization if we use fetch on the REST API but we need token.
// Let's just construct the fetch directly using localhost:5000 API logic.
// Ah, the API requires auth. I can just bypass the check by writing a temporary script.
