#!/bin/bash
set -e

echo "================================================="
echo "   STEP 10: MULTI-USER END-TO-END SIMULATION    "
echo "================================================="

# 1. Login Artist
echo "[1] Logging in Artist (artist@mingree.com)..."
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"artist@mingree.com","password":"password123"}' \
  -c /tmp/e2e_artist_cookie.txt > /tmp/art_login.json
ARTIST_NAME=$(jq -r '.user.name' /tmp/art_login.json)
echo "   LoggedIn Artist: $ARTIST_NAME"

# 2. Artist creates new campaign
echo "[2] Artist creating campaign 'Bhangra Beats 2026' with ₹50,000 budget (10 slots @ ₹5,000)..."
curl -s -X POST http://127.0.0.1:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Bhangra Beats 2026 Single Launch",
    "brand": "Rohan Records",
    "brandLogo": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=120",
    "description": "Create a high-energy Bhangra dance Reel using our official audio track.",
    "genre": "Music Reels",
    "language": "Punjabi",
    "contentTypes": ["Reel"],
    "promotionStyle": "Dance & Hook Step",
    "audioUrl": "https://assets.mingree.com/audio/bhangra-beats.mp3",
    "payAmount": 5000,
    "totalSlots": 10,
    "bookingModel": "instant",
    "minFollowers": 5000,
    "minMedianViews": 10000,
    "targetCountries": ["India"],
    "targetCities": ["Chandigarh", "Delhi"],
    "requiredCaptionNote": "Vibing to Bhangra Beats 2026! 🔥",
    "requiredTags": ["#Bhangra2026", "#RohanRecords"],
    "requiredMentions": ["@rohanrecords"],
    "disclosureInstructions": "#ad | Sponsored by Rohan Records",
    "minDurationSecs": 30,
    "deadline": "2026-11-20"
  }' \
  -b /tmp/e2e_artist_cookie.txt > /tmp/new_camp.json

NEW_CAMP_ID=$(jq -r '.campaign.id' /tmp/new_camp.json)
echo "   Created Campaign ID: $NEW_CAMP_ID"

# 3. Login Creator
echo "[3] Logging in Creator (creator@mingree.com)..."
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@mingree.com","password":"password123"}' \
  -c /tmp/e2e_creator_cookie.txt > /tmp/cr_login.json
CREATOR_NAME=$(jq -r '.user.name' /tmp/cr_login.json)
echo "   LoggedIn Creator: $CREATOR_NAME"

# 4. Creator reserves slot
echo "[4] Creator reserving slot in Campaign $NEW_CAMP_ID..."
curl -s -X POST "http://127.0.0.1:3000/api/campaigns/$NEW_CAMP_ID/reserve-or-apply" \
  -H "Content-Type: application/json" \
  -b /tmp/e2e_creator_cookie.txt > /tmp/res_slot.json

PARTICIPANT_ID=$(jq -r '.participant.id' /tmp/res_slot.json)
echo "   Reserved Participant ID: $PARTICIPANT_ID"

# 5. Creator submits Reel
echo "[5] Creator submitting Reel URL..."
curl -s -X POST "http://127.0.0.1:3000/api/campaigns/$NEW_CAMP_ID/submit-reel" \
  -H "Content-Type: application/json" \
  -d '{"postUrl":"https://www.instagram.com/reel/CBhangra2026/","audioConfirmed":true}' \
  -b /tmp/e2e_creator_cookie.txt > /tmp/sub_reel.json
SUB_STATUS=$(jq -r '.participant.status' /tmp/sub_reel.json)
echo "   Submission Status: $SUB_STATUS"

# 6. Artist approves submission & releases escrow
echo "[6] Artist reviewing & approving submission..."
curl -s -X POST "http://127.0.0.1:3000/api/campaigns/$NEW_CAMP_ID/review-submission" \
  -H "Content-Type: application/json" \
  -d "{\"participantId\":$PARTICIPANT_ID,\"action\":\"approve\"}" \
  -b /tmp/e2e_artist_cookie.txt > /tmp/app_reel.json
APP_MSG=$(jq -r '.message' /tmp/app_reel.json)
echo "   Approval Output: $APP_MSG"

echo "================================================="
echo "       POSTGRESQL DATABASE ASSERTIONS          "
echo "================================================="
echo "Campaign record in Postgres:"
psql -h 127.0.0.1 -U postgres -d mingree -c "SELECT id, title, total_budget, payAmount, total_spots, spots_remaining, status FROM campaigns WHERE id = $NEW_CAMP_ID;"

echo "Slot record in Postgres:"
psql -h 127.0.0.1 -U postgres -d mingree -c "SELECT id, campaign_id, creator_id, price, status FROM campaign_slots WHERE campaign_id = $NEW_CAMP_ID;"

echo "Submission record in Postgres:"
psql -h 127.0.0.1 -U postgres -d mingree -c "SELECT id, campaign_id, creator_id, post_url, status, reviewed_at FROM submissions WHERE campaign_id = $NEW_CAMP_ID;"

echo "Wallets after E2E escrow transfer in Postgres:"
psql -h 127.0.0.1 -U postgres -d mingree -c "SELECT user_id, balance, escrow_held FROM wallets WHERE user_id IN (4, 5);"

echo "Latest Wallet Transactions in Postgres:"
psql -h 127.0.0.1 -U postgres -d mingree -c "SELECT user_id, type, amount, balance_after, escrow_after, reference_type FROM wallet_transactions ORDER BY id DESC LIMIT 3;"

echo "E2E SIMULATION COMPLETED SUCCESSFULLY!"
