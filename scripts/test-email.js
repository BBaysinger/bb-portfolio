#!/usr/bin/env node

/**
 * Test script for AWS SES contact form integration
 * Run with: node test-email.js
 */

import fetch from "node-fetch";

const API_URL = "http://localhost:3001/api/contact";

const testData = {
  name: "Test User",
  email: "test@example.com",
  message:
    "This is a test message from the automated test script. If you receive this, the AWS SES integration is working correctly!",
};

async function testContactAPI() {
  console.log("Testing contact form API...");
  console.log("API URL:", API_URL);
  console.log("Test data:", testData);
  console.log("---");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.log("Response status:", response.status);
    console.log("Response body:", result);

    if (response.ok) {
      console.log("✅ SUCCESS: Email sent successfully!");
    } else {
      console.log("❌ FAILED: API returned an error");
    }
  } catch (error) {
    console.error("❌ ERROR: Failed to call API");
    console.error("Error details:", error.message);
    console.log("\nPossible issues:");
    console.log(
      "- Backend server not running (start with: cd backend && npm run dev)",
    );
    console.log("- Environment variables not configured");
    console.log("- AWS SES not properly set up");
  }
}

// Run the test
testContactAPI();
