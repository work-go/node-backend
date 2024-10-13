import fs from "fs";
import path from "path";
import { ZodType } from "zod";
import { zodToTs, createTypeAlias, printNode } from "zod-to-ts";

const BACKEND_DIR = "./src/schemas/shared";
const FRONTEND_DIR = "../react-dashboard/src/types/generated";

// Create output directory if it doesn't exist
if (!fs.existsSync(FRONTEND_DIR)) {
  fs.mkdirSync(FRONTEND_DIR, { recursive: true });
}

// Function to generate TypeScript types from Zod schemas
const generateTypes = async (schemaFile: string) => {
  const zodSchemas = await import(path.resolve(schemaFile)); // Import the Zod schemas
  let combinedTypes = "";

  // Iterate over each named export in the schema file
  for (const [name, zodSchema] of Object.entries(zodSchemas)) {
    if (zodSchema && typeof zodSchema === "object") {
      // Generate TypeScript types with an identifier
      const identifier = name.replace(/Schema$/, ""); // Use the name of the schema as the identifier
      const { node } = zodToTs(zodSchema as ZodType, identifier); // Generate the type
      const typeAlias = createTypeAlias(node, identifier); // Create a type alias
      const nodeString = printNode(typeAlias); // Convert to string

      combinedTypes += `// Type for ${name}\n${nodeString}\n\n`;
    }
  }

  // Write the combined types to a single output file
  const outputFilename =
    path.basename(schemaFile, ".ts").replace(/-schema$/, "") + ".d.ts"; // Example: user-schema.ts -> user.d.ts
  const outputPath = path.join(FRONTEND_DIR, outputFilename);
  fs.writeFileSync(outputPath, combinedTypes.trim());
  console.log(`Generated types for ${schemaFile} → ${outputPath}`);
};

// Read all .ts files in the backend schemas directory
fs.readdir(BACKEND_DIR, (err, files) => {
  if (err) {
    console.error("Error reading backend schemas directory:", err);
    return;
  }

  files.forEach((file) => {
    if (file.endsWith(".ts")) {
      generateTypes(path.join(BACKEND_DIR, file));
    }
  });
});
