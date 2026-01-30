import fs from "fs";
import path from "path";

const __dirname = path.dirname("");

let routeName = process.argv[2]?.trim();

if (!routeName) {
  console.error("Please provide a route name");
  process.exit(1);
}

if (!/^[a-zA-Z0-9\-_]+$/.test(routeName)) {
  console.error(
    "Route name must only contain letters, numbers, hyphens, and underscores"
  );
  process.exit(1);
}

routeName = routeName.replaceAll("_", "-");

// https://stackoverflow.com/questions/63116039/camelcase-to-kebab-case
const kebabize = (str) =>
  str.replace(
    /[A-Z]+(?![a-z])|[A-Z]/g,
    ($, ofs) => (ofs ? "-" : "") + $.toLowerCase()
  );

// https://stackoverflow.com/questions/2970525/converting-a-string-with-spaces-into-camel-case
const camelize = (str) => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, function (word, index) {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, "");
};

routeName = kebabize(routeName);

const routePath = path.join(__dirname, "src", "routes", `${routeName}.ts`);
const routeContent = `import { Hono } from "hono";
import { type HonoAppContext } from "../auth";

export const ${camelize(routeName).replaceAll("-", "")} = new Hono<HonoAppContext>().get("/", async (c) => {
  // Always specify the status code to ensure correct type inference on the client side
  return c.json({ message: "Hello from ${routeName} route" }, 200);
});
`;

fs.writeFile(routePath, routeContent, { flag: "wx" }, (err) => {
  if (err) {
    if (err.code === "EEXIST") {
      console.error(`Route already exists at: ${routePath}`);
    } else {
      console.error(`Error creating new route at: ${routePath}`);
    }
  } else {
    console.log(`Created new route at: ${routePath}`);
  }
});
