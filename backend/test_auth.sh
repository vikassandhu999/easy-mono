#!/bin/bash

# Authentication API Test Script
# Tests the Phoenix backend auth endpoints to match Go backend functionality

BASE_URL="http://localhost:4001/v1"

echo "=== EasyCoach Phoenix Backend Auth Testing ==="
echo

# Start the server in background (if not already running)
# cd /path/to/easy-backend && mix phx.server &
# sleep 5

echo "Testing authentication endpoints at $BASE_URL"
echo

# Test CORS preflight request
echo "0. Testing CORS preflight request..."
CORS_RESPONSE=$(curl -s -X OPTIONS "$BASE_URL/auth/signup" \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -w "HTTP_CODE:%{http_code}\n" \
  -o /dev/null)
echo "CORS Response: $CORS_RESPONSE"
echo

# Test 1: Signup with email
echo "1. Testing signup with email..."
SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}')
echo "Response: $SIGNUP_RESPONSE"
echo

# Extract token_id (you'd need jq for proper JSON parsing)
# TOKEN_ID=$(echo $SIGNUP_RESPONSE | jq -r '.token_id')

# Test 2: Signup with phone number
echo "2. Testing signup with phone number..."
PHONE_SIGNUP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{"phone_number": "+1234567890"}')
echo "Response: $PHONE_SIGNUP_RESPONSE"
echo

# Test 3: Send login passcode
echo "3. Testing send login passcode..."
PASSCODE_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/send-passcode" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}')
echo "Response: $PASSCODE_RESPONSE"
echo

# Test 4: Generate token with password
echo "4. Testing password authentication..."
TOKEN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_type": "password",
    "email": "test@example.com",
    "password": "TestPassword123"
  }')
echo "Response: $TOKEN_RESPONSE"
echo

# Test 5: Password reset request
echo "5. Testing password reset request..."
RESET_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/password-reset" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}')
echo "Response: $RESET_RESPONSE"
echo

# Test 6: Logout
echo "6. Testing logout..."
LOGOUT_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "Response: $LOGOUT_RESPONSE"
echo

echo "=== Testing completed ==="
echo
echo "Note: To run this script:"
echo "1. Start the Phoenix server: cd /path/to/easy-backend && mix phx.server"
echo "2. Run this script: ./test_auth.sh"
echo "3. Check logs for email/SMS messages in development mode"