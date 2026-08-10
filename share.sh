#!/bin/bash

PROJECT="$HOME/tdg-command-center"
ZIP="$PROJECT/tdg-share.zip"

cd "$PROJECT" || exit 1

echo "📦 TDG Share Tool"
echo ""

FILES=(
app
prisma
public
package.json
package-lock.json
tsconfig.json
next.config.ts
prisma.config.ts
)

if [ ! -f "$ZIP" ]; then
    echo "🆕 Eerste keer: ZIP aanmaken..."
    zip -r "$ZIP" "${FILES[@]}" \
        -x "node_modules/*" \
        -x ".next/*" \
        -x ".git/*"
else
    echo "🔄 ZIP bijwerken..."

    zip -ur "$ZIP" "${FILES[@]}" \
        -x "node_modules/*" \
        -x ".next/*" \
        -x ".git/*"
fi

echo ""
echo "✅ Klaar!"
echo "📦 $ZIP"