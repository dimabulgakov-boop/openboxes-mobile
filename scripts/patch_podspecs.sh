#!/bin/bash
# This script patches the source URL in Boost-related .podspec files.
# It is designed to be run from the project root.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Running script to patch podspec files..."

# --- Find and patch the files ---
# The `find` command locates all .podspec files in node_modules.
# The `-exec` flag runs our portable sed command on the found files.
# The `+` at the end passes multiple filenames to a single sed command,
# which is more efficient than running it once per file.
echo "  Searching for .podspec files in node_modules to patch..."

if [ "$OSTYPE" == "darwin"* ]; then
  find node_modules -type f -name '*.podspec' -exec \
      sed -i '' 's|https://boostorg\.jfrog\.io/artifactory/main/|https://archives.boost.io/|g' {} +
else
  find node_modules -type f -name '*.podspec' -exec \
      sed -i 's|https://boostorg\.jfrog\.io/artifactory/main/|https://archives.boost.io/|g' {} +
fi

echo "Podspec patching complete."
