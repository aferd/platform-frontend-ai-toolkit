#!/bin/bash
# HCC Frontend AI Toolkit - Cursor Agent Installer
# Usage: ./install-cursor.sh

TARGET_DIR=".cursor/rules"
BASE_URL="https://raw.githubusercontent.com/RedHatInsights/platform-frontend-ai-toolkit/master/cursor/rules"
API_URL="https://api.github.com/repos/RedHatInsights/platform-frontend-ai-toolkit/contents/cursor/rules"

echo "🚀 Installing HCC Frontend AI Toolkit Agents for Cursor..."

# Create target directory
mkdir -p "$TARGET_DIR"

echo "🔍 Discovering available agents..."

# Fetch list of .mdc files from GitHub API
agent_list=$(curl -s "$API_URL" | grep -o '"name":"[^"]*\.mdc"' | sed 's/"name":"//g' | sed 's/"//g')

if [ -z "$agent_list" ]; then
    echo "❌ Failed to fetch agent list. Using fallback method..."

    # Fallback: try common agent names
    agent_list="hello-world.mdc
patternfly-component-builder.mdc
patternfly-dataview-specialist.mdc
patternfly-css-utility-specialist.mdc
storybook-specialist.mdc
typescript-type-refiner.mdc
unit-test-writer.mdc
react-patternfly-code-quality-scanner.mdc
dependency-cleanup-agent.mdc"
fi

echo "⬇️  Downloading agents..."

# Download each agent
success_count=0
total_count=0

while IFS= read -r agent; do
    if [ -n "$agent" ]; then
        total_count=$((total_count + 1))
        echo "  📥 $agent"

        if curl -s -f -o "$TARGET_DIR/$agent" "$BASE_URL/$agent"; then
            echo "    ✅ Downloaded successfully"
            success_count=$((success_count + 1))
        else
            echo "    ❌ Download failed"
        fi
    fi
done <<< "$agent_list"

echo ""
echo "📊 Installation Summary:"
echo "   Successfully installed: $success_count/$total_count agents"
echo ""

if [ $success_count -eq $total_count ] && [ $total_count -gt 0 ]; then
    echo "🎉 Installation complete!"
elif [ $success_count -gt 0 ]; then
    echo "⚠️  Partial installation - some agents may have failed to download"
else
    echo "❌ Installation failed - no agents were downloaded"
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "  1. Restart Cursor"
echo "  2. Open any project and use Cmd+K (or Ctrl+K)"
echo "  3. You should see the HCC agents available in the context menu"
echo ""
echo "💡 To set up MCP tools:"
echo "  1. Open Cursor Settings (Cmd/Ctrl + ,)"
echo "  2. Navigate to General > MCP"
echo "  3. Add this MCP server:"
echo "     Command: npx"
echo "     Args: @redhat-cloud-services/hcc-pf-mcp"
echo ""
echo "🔗 For more info: https://github.com/RedHatInsights/platform-frontend-ai-toolkit"