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
  console.info("Testing contact form API...");
  console.info("API URL:", API_URL);
  console.info("Test data:", testData);
  console.info("---");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(testData),
    });

    const result = await response.json();

    console.info("Response status:", response.status);
    console.info("Response body:", result);

    if (response.ok) {
      console.info("✅ SUCCESS: Email sent successfully!");
    } else {
      console.info("❌ FAILED: API returned an error");
    }
  } catch (error) {
    console.error("❌ ERROR: Failed to call API");
    console.error("Error details:", error.message);
    console.info("\nPossible issues:");
    console.info(
      "- Backend server not running (start with: cd backend && npm run dev)",
    );
    console.info("- Environment variables not configured");
    console.info("- AWS SES not properly set up");
  }
}

// Run the test
testContactAPI();
