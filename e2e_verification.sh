#!/bin/bash
set -e

# 1. Login Artist
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"artist@mingree.com","password":"password123"}' \
  -c /tmp/e2e_artist_cookie.txt > /tmp/art_login.json

# 2. Artist creates new campaign
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

NEW_CAMP_ID=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("/tmp/new_camp.json")).id)')
echo "Campaign ID: $NEW_CAMP_ID"

# 3. Login Creator
curl -s -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"creator@mingree.com","password":"password123"}' \
  -c /tmp/e2e_creator_cookie.txt > /tmp/cr_login.json

# 4. Creator reserves slot
curl -s -X POST "http://127.0.0.1:3000/api/campaigns/$NEW_CAMP_ID/reserve-or-apply" \
  -H "Content-Type: application/json" \
  -b /tmp/e2e_creator_cookie.txt > /tmp/res_slot.json

PARTICIPANT_ID=$(node -e 'console.log(JSON.parse(require("fs").readFileSync("/tmp/res_slot.json")).participant.id)')
echo "Participant ID: $PARTICIPANT_ID"

# 5. Creator submits Reel
curl -s -X POST "http://127.0.0.1:3000/api/campaigns/$NEW_CAMP_ID/submit-reel" \
  -H "Content-Type: application/json" \
  -d '{"postUrl":"https://www.instagram.com/reel/CBhangra2026/","audioConfirmed":true}' \
  -b /tmp/e2e_creator_cookie.txt > /tmp/sub_reel.json

# 6. Artist approves submission & releases escrow
curl -s -X POST "http://127.0.0.1:3000/api/campaigns/$NEW_CAMP_ID/review-submission" \
  -H "Content-Type: application/json" \
  -d "{\"participantId\":$PARTICIPANT_ID,\"action\":\"approve\"}" \
  -b /tmp/e2e_artist_cookie.txt > /tmp/app_reel.json

# Final Assertions
echo "Final Wallet Check:"
psql -h 127.0.0.1 -U postgres -d mingree -c "SELECT user_id, balance, escrow_held FROM wallets WHERE user_id IN (4, 5);"
