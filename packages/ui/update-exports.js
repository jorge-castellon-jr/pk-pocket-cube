import fs from "fs";
import path from "path";
import { promisify } from "util";

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

async function updatePackageExports() {
  try {
    // Get the package.json path
    const packageJsonPath = path.resolve(
      path.dirname(""),
      "../ui/package.json"
    );

    // Read the package.json file
    const packageJsonContent = await readFile(packageJsonPath, "utf8");
    const packageJson = JSON.parse(packageJsonContent);

    // Get all .tsx files from src directory
    const srcDir = path.resolve(path.dirname(""), "../ui/src");
    const files = await readdir(srcDir);
    const tsxFiles = files.filter((file) => file.endsWith(".tsx"));

    // Create exports object
    const exports = {};

    // Add each .tsx file to exports
    for (const file of tsxFiles) {
      const baseName = path.basename(file, ".tsx");
      exports[`./${baseName}`] = `./src/${file}`;
    }

    // Update the package.json exports field
    packageJson.exports = {
      ...packageJson.exports,
      ...exports,
    };

    // Write the updated package.json
    await writeFile(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      "utf8"
    );

    console.log("Successfully updated package.json exports with .tsx files");
  } catch (error) {
    console.error("Error updating package.json exports:", error);
  }
}

// Run the function
updatePackageExports();
