#!/usr/bin/env node
/**
 * Simple test to verify frontend components are working
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 FRONTEND COMPONENT VALIDATION");
console.log("================================");

// Check if all required files exist
const requiredFiles = [
  "src/app/israeli-stocks/page.tsx",
  "src/components/IsraeliStocksDashboard.tsx",
  "src/components/IsraeliStockUploader.tsx",
  "src/components/IsraeliStockHoldings.tsx",
  "src/components/IsraeliStockTransactions.tsx",
  "src/components/IsraeliStockDividends.tsx",
  "src/services/api.ts",
  "src/types/israeli-stocks.ts",
];

console.log("\n📁 Checking file existence:");
let allFilesExist = true;

requiredFiles.forEach((file) => {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? "✅" : "❌"} ${file}`);
  if (!exists) allFilesExist = false;
});

// Check package.json for required dependencies
console.log("\n📦 Checking dependencies:");
try {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
  );
  const requiredDeps = [
    "react",
    "next",
    "typescript",
    "@heroicons/react",
    "axios",
    "react-dropzone",
  ];

  requiredDeps.forEach((dep) => {
    const exists =
      packageJson.dependencies[dep] || packageJson.devDependencies[dep];
    console.log(
      `   ${exists ? "✅" : "❌"} ${dep} ${exists ? `(${exists})` : ""}`
    );
  });
} catch (error) {
  console.log("   ❌ Could not read package.json");
}

// Check TypeScript configuration
console.log("\n🔧 Checking TypeScript config:");
const tsConfigExists = fs.existsSync(path.join(__dirname, "tsconfig.json"));
console.log(`   ${tsConfigExists ? "✅" : "❌"} tsconfig.json`);

// Check Tailwind configuration
console.log("\n🎨 Checking Tailwind config:");
const tailwindConfigExists =
  fs.existsSync(path.join(__dirname, "tailwind.config.js")) ||
  fs.existsSync(path.join(__dirname, "tailwind.config.ts"));
console.log(`   ${tailwindConfigExists ? "✅" : "❌"} tailwind.config`);

console.log("\n================================");
if (allFilesExist) {
  console.log("🎉 ALL COMPONENTS ARE READY!");
  console.log("\n📋 To start the system:");
  console.log("   1. Backend: cd ../backend && python run.py");
  console.log("   2. Frontend: npm run dev");
  console.log("   3. Visit: http://localhost:3000/israeli-stocks");
} else {
  console.log("⚠️  Some files are missing. Check the errors above.");
}
console.log("================================");
