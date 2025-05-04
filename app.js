import readline from "node:readline";
import fs from "node:fs/promises";
import { readdir, mkdir, rename, unlink } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream, createWriteStream } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const filePath = resolve(__dirname);

let username;

const parseArgs = () => {
  process.argv.forEach((arg) => {
    if (arg.startsWith("--")) {
      const name =
        arg.slice(arg.indexOf("=") + 1)[0].toUpperCase() +
        arg.slice(arg.indexOf("=") + 2);
      username = name;
      console.log(`Welcome to the File Manager, ${name}!`);
      console.log(`You are currently in ${__dirname}`);
    }
  });
};

parseArgs();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.setPrompt("Please enter your command:\n");
rl.prompt();

rl.on("line", async (input) => {
  console.log(`Please enter your command:\n`);
  const [command, ...args] = input.trim().split(" ");

  switch (command) {
    case "ls":
      try {
        const filesArray = await readdir(filePath);
        const result = filesArray
          .map((file) => {
            return {
              Name: file,
              Type: file.includes(".") ? "file" : "directory",
            };
          })
          .sort((a, b) => a.Name.localeCompare(b.Name))
          .sort((a, b) => a.Type.localeCompare(b.Type));
        console.table(result);
      } catch (err) {
        throw new Error("FS operation failed");
      }
      break;
    case "add":
      try {
        if (!args[0]) {
          console.log("Please provide a file name.");
          break;
        }
        const fullPath = resolve(filePath, args[0]);
        await fs.writeFile(fullPath, "", { flag: "wx" });
      } catch (err) {
        throw new Error("FS operation failed");
      }
      break;
    case "mkdir":
      try {
        if (!args[0]) {
          console.log("Please provide a dir name.");
          break;
        }
        const fullPath = resolve(filePath, args[0]);
        await mkdir(fullPath, { recursive: true });
      } catch (err) {
        throw new Error("FS operation failed");
      }
      break;
    case "cat":
      try {
        if (!args[0]) {
          console.log("Please provide a file name.");
          break;
        }
        const fullPath = resolve(filePath, args[0]);

        const readableStream = createReadStream(fullPath, {
          encoding: "utf-8",
        });
        readableStream.on("data", (chunk) => {
          process.stdout.write(chunk);
        });

        readableStream.on("end", () => {
          process.stdout.write("\n");
        });
      } catch (err) {
        throw new Error("FS operation failed");
      }
      break;
    case "rn":
      try {
        await rename(resolve(filePath, args[0]), resolve(filePath, args[1]));
      } catch (err) {
        throw new Error("FS operation failed");
      }
      break;
    case "cp":
      try {
        const readable = createReadStream(resolve(filePath, args[0]));
        const writable = createWriteStream(resolve(filePath, args[1]));
        readable.pipe(writable);
        writable.on("finish", () => {
          console.log("File copied successfully");
        });
        writable.on("error", (err) => {
          console.error("Error writing file:", err);
        });
        readable.on("error", (err) => {
          console.error("Error reading file:", err);
        });
      } catch (err) {
        console.error("Error copying file:", err);
        throw new Error("FS operation failed");
      }
      break;
    case "mv":
      try {
        const sourcePath = resolve(filePath, args[0]);
        const destinationInput = resolve(filePath, args[1]);
        const fileName = basename(sourcePath);
        const destinationPath = resolve(destinationInput, fileName);

        const readable = createReadStream(sourcePath);
        const writable = createWriteStream(destinationPath);
        readable.pipe(writable);
        writable.on("finish", async () => {
          await unlink(sourcePath);
          console.log("File copied successfully");
        });
        writable.on("error", (err) => {
          console.error("Error writing file:", err);
        });
        readable.on("error", (err) => {
          console.error("Error reading file:", err);
        });
      } catch (err) {
        console.error("Error copying file:", err);
        throw new Error("FS operation failed");
      }
      break;
    case "rm":
      try {
        const sourcePath = resolve(filePath, args[0]);
        await unlink(sourcePath);
      } catch (err) {
        throw new Error("FS operation failed");
      }
      break;
    default:
      console.log("Unknown command");
  }
  console.log(`You are currently in ${__dirname}`);
  rl.prompt();
});

rl.on("close", () => {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  process.exit(0);
});
