#!/bin/bash

# Treasury Curve Helper Script

# Full curve
if [ "$1" = "full" ] || [ -z "$1" ]; then
    curl -s http://localhost:3000/api/ust-curve | jq '.tenors'
fi

# Key rates only
if [ "$1" = "key" ]; then
    curl -s http://localhost:3000/api/ust-curve | jq -r '"2Y=" + (.tenors."2 Year" | tostring) + "% | 5Y=" + (.tenors."5 Year" | tostring) + "% | 10Y=" + (.tenors."10 Year" | tostring) + "% | 30Y=" + (.tenors."30 Year" | tostring) + "%"'
fi

# With date and timing info
if [ "$1" = "date" ]; then
    curl -s http://localhost:3000/api/ust-curve | jq -r '"📊 Treasury Curve: " + .recordDate, "Published: " + (.marketTime // "Time unknown"), "-" * 40, (.tenors | to_entries[] | "\(.key): \(.value)%")'
fi

# Timing info only
if [ "$1" = "time" ]; then
    curl -s http://localhost:3000/api/ust-curve | jq -r '"Market Date: " + .recordDate, "Published: " + (.marketTime // "Time unknown")'
fi

# Help
if [ "$1" = "help" ]; then
    echo "Treasury Curve Commands:"
    echo "  ./curve.sh          - Full curve (default)"
    echo "  ./curve.sh full     - Full curve"
    echo "  ./curve.sh key      - Key rates only"
    echo "  ./curve.sh date     - Full curve with market timing"
    echo "  ./curve.sh time     - Market timing info only"
fi 