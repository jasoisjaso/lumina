#!/bin/bash

# Lumina Authentication Flow Test Script
# Tests the complete authentication flow: register, login, protected access, refresh, logout

set -e

echo "=== Lumina Authentication System Test ==="
echo ""

BASE_URL="http://localhost:3001"
API_URL="$BASE_URL/api/v1"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function for test results
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((TESTS_FAILED++))
  fi
  echo ""
}

# Generate random email for testing
RANDOM_EMAIL="test_$(date +%s)@example.com"

echo "Test user email: $RANDOM_EMAIL"
echo ""

# Test 1: User Registration
echo -e "${YELLOW}Test 1: User Registration${NC}"
REGISTER_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\":\"$RANDOM_EMAIL\",
    \"password\":\"test123456\",
    \"first_name\":\"Test\",
    \"last_name\":\"User\",
    \"family_id\":1
  }")

HTTP_CODE=$(echo "$REGISTER_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REGISTER_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "201" ]; then
  test_result 0 "User registration (HTTP 201)"
  echo "Response: $(echo $RESPONSE_BODY | head -c 100)..."
else
  test_result 1 "User registration (Expected 201, got $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
fi

# Test 2: User Login
echo -e "${YELLOW}Test 2: User Login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"test123456\"}")

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ ! -z "$ACCESS_TOKEN" ] && [ ! -z "$REFRESH_TOKEN" ]; then
  test_result 0 "User login and token generation"
  echo "Access Token: ${ACCESS_TOKEN:0:50}..."
  echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."
else
  test_result 1 "User login (Tokens not received)"
  echo "Response: $LOGIN_RESPONSE"
fi

# Test 3: Access Protected Endpoint (GET /me)
echo -e "${YELLOW}Test 3: Access Protected Endpoint${NC}"
ME_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

HTTP_CODE=$(echo "$ME_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$ME_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "Protected endpoint access with valid token (HTTP 200)"
  echo "User data: $(echo $RESPONSE_BODY | head -c 100)..."
else
  test_result 1 "Protected endpoint access (Expected 200, got $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
fi

# Test 4: Access Protected Endpoint Without Token (Should Fail)
echo -e "${YELLOW}Test 4: Access Protected Endpoint Without Token (Should Fail)${NC}"
UNAUTH_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me")

HTTP_CODE=$(echo "$UNAUTH_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  test_result 0 "Unauthorized access rejected (HTTP 401)"
else
  test_result 1 "Unauthorized access handling (Expected 401, got $HTTP_CODE)"
fi

# Test 5: Refresh Access Token
echo -e "${YELLOW}Test 5: Refresh Access Token${NC}"
REFRESH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

HTTP_CODE=$(echo "$REFRESH_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$REFRESH_RESPONSE" | head -n-1)

NEW_ACCESS_TOKEN=$(echo $RESPONSE_BODY | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ "$HTTP_CODE" = "200" ] && [ ! -z "$NEW_ACCESS_TOKEN" ]; then
  test_result 0 "Token refresh successful (HTTP 200)"
  echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
else
  test_result 1 "Token refresh (Expected 200, got $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
fi

# Test 6: Update User Profile
echo -e "${YELLOW}Test 6: Update User Profile${NC}"
UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"first_name":"Updated","color":"#FF5733"}')

HTTP_CODE=$(echo "$UPDATE_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$UPDATE_RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "User profile update (HTTP 200)"
  echo "Updated user: $(echo $RESPONSE_BODY | head -c 100)..."
else
  test_result 1 "User profile update (Expected 200, got $HTTP_CODE)"
  echo "Response: $RESPONSE_BODY"
fi

# Test 7: Invalid Login (Wrong Password)
echo -e "${YELLOW}Test 7: Invalid Login (Wrong Password - Should Fail)${NC}"
INVALID_LOGIN=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$RANDOM_EMAIL\",\"password\":\"wrongpassword\"}")

HTTP_CODE=$(echo "$INVALID_LOGIN" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  test_result 0 "Invalid login rejected (HTTP 401)"
else
  test_result 1 "Invalid login handling (Expected 401, got $HTTP_CODE)"
fi

# Test 8: Logout (Revoke Token)
echo -e "${YELLOW}Test 8: Logout (Revoke Refresh Token)${NC}"
LOGOUT_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

HTTP_CODE=$(echo "$LOGOUT_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  test_result 0 "Logout successful (HTTP 200)"
else
  test_result 1 "Logout (Expected 200, got $HTTP_CODE)"
fi

# Test 9: Use Revoked Refresh Token (Should Fail)
echo -e "${YELLOW}Test 9: Use Revoked Refresh Token (Should Fail)${NC}"
REVOKED_REFRESH=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")

HTTP_CODE=$(echo "$REVOKED_REFRESH" | tail -n1)

if [ "$HTTP_CODE" = "401" ]; then
  test_result 0 "Revoked token rejected (HTTP 401)"
else
  test_result 1 "Revoked token handling (Expected 401, got $HTTP_CODE)"
fi

# Summary
echo "============================================"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "============================================"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}All tests passed! Authentication system is working correctly.${NC}"
  exit 0
else
  echo -e "${RED}Some tests failed. Please check the output above.${NC}"
  exit 1
fi
