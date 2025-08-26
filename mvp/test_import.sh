#!/bin/bash

# Test script to import form template and verify features

echo "Testing form import with all features..."

# Get admin token from environment or use default
ADMIN_TOKEN=${ADMIN_TOKEN:-"test-admin-token"}

# Import the form template
echo "Importing form template..."
curl -X POST "http://localhost:3000/api/admin/import-form?token=${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @config/form-template.json \
  -s | jq '.'

echo ""
echo "Fetching imported form to verify features..."
# Get the form to verify features are preserved
curl -X GET http://localhost:3000/api/forms/example-comprehensive-form \
  -H "Content-Type: application/json" \
  -s | jq '.sections[0].questions[0]'

echo ""
echo "Checking if allowComment is present in features..."
curl -X GET http://localhost:3000/api/forms/example-comprehensive-form \
  -H "Content-Type: application/json" \
  -s | jq '.sections[].questions[] | select(.type == "likert") | {id, title, features}'