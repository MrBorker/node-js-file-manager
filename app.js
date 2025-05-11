import readline from "node:readline";
import fs from "node:fs/promises";
import { readdir, mkdir, rename, unlink } from "node:fs/promises";
import { resolve, dirname, basename } from "node:path";
import crypto from "node:crypto";
import { createReadStream, createWriteStream } from "fs";
import os from "node:os";
import { createBrotliCompress, createBrotliDecompress } from "node:zlib";

let currentDir = os.homedir();

let username;

const parseArgs = () => {
  process.argv.forEach((arg) => {
    if (arg.startsWith("--")) {
      const name =
        arg.slice(arg.indexOf("=") + 1)[0].toUpperCase() +
        arg.slice(arg.indexOf("=") + 2);
      username = name;
      console.log(`Welcome to the File Manager, ${name}!`);
      console.log(`You are currently in ${currentDir}`);
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
    case "up":
      try {
        const parentDir = dirname(currentDir);
        if (parentDir !== currentDir) {
          currentDir = parentDir;
        }
      } catch {
        console.log("Operation failed");
      }
      break;
    case "cd":
      try {
        if (!args[0]) {
          console.log("Invalid input");
          break;
        }
        const targetPath = resolve(currentDir, args[0]);
        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
          currentDir = targetPath;
        } else {
          console.log("Operation failed");
        }
      } catch {
        console.log("Operation failed");
      }
      break;

    case "ls":
      try {
        const filesArray = await readdir(currentDir);
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
        console.log("Operation failed");
      }
      break;

    case "add":
      try {
        if (!args[0]) {
          console.log("Invalid input");
          break;
        }
        const fullPath = resolve(currentDir, args[0]);
        await fs.writeFile(fullPath, "", { flag: "wx" });
      } catch (err) {
        console.log("Operation failed");
      }
      break;

    case "mkdir":
      try {
        if (!args[0]) {
          console.log("Invalid input");
          break;
        }
        const fullPath = resolve(currentDir, args[0]);
        await mkdir(fullPath, { recursive: true });
      } catch (err) {
        console.log("Operation failed");
      }
      break;

    case "cat":
      try {
        if (!args[0]) {
          console.log("Invalid input");
          break;
        }
        const fullPath = resolve(currentDir, args[0]);

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
        console.log("Operation failed");
      }
      break;

    case "rn":
      if (!args[0] || !args[1]) {
        console.log("Invalid input");
        break;
      }
      try {
        await rename(
          resolve(currentDir, args[0]),
          resolve(currentDir, args[1])
        );
      } catch (err) {
        console.log("Operation failed");
      }
      break;

    case "cp":
      if (!args[0] || !args[1]) {
        console.log("Invalid input");
        break;
      }
      try {
        const readable = createReadStream(resolve(currentDir, args[0]));
        const writable = createWriteStream(resolve(currentDir, args[1]));
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
        console.log("Operation failed");
      }
      break;

    case "mv":
      if (!args[0] || !args[1]) {
        console.log("Invalid input");
        break;
      }
      try {
        const sourcePath = resolve(currentDir, args[0]);
        const destinationInput = resolve(currentDir, args[1]);
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
        console.log("Operation failed");
      }
      break;

    case "rm":
      if (!args[0]) {
        console.log("Invalid input");
        break;
      }
      try {
        const sourcePath = resolve(currentDir, args[0]);
        await unlink(sourcePath);
      } catch (err) {
        console.log("Operation failed");
      }
      break;

    case "hash":
      try {
        if (!args[0]) {
          console.log("Invalid input");
          break;
        }
        const fileToHash = resolve(currentDir, args[0]);
        const hash = crypto.createHash("sha256");
        const stream = createReadStream(fileToHash);

        stream.on("data", (chunk) => {
          hash.update(chunk);
        });

        stream.on("end", () => {
          console.log(hash.digest("hex"));
        });
      } catch (err) {
        console.log("Operation failed");
      }
      break;

    case "os":
      try {
        const flag = args[0];
        switch (flag) {
          case "--EOL":
            console.log(JSON.stringify(os.EOL));
            break;
          case "--cpus":
            const cpus = os.cpus();
            console.log(`Total CPUs: ${cpus.length}`);
            cpus.forEach((cpu, index) => {
              console.log(
                `CPU ${index + 1}: ${cpu.model}, ${cpu.speed / 1000} GHz`
              );
            });
            break;
          case "--homedir":
            console.log(os.homedir());
            break;
          case "--username":
            console.log(os.userInfo().username);
            break;
          case "--architecture":
            console.log(process.arch);
            break;
          default:
            console.log("Invalid input");
        }
      } catch {
        console.log("Operation failed");
      }
      break;

    case "compress":
      try {
        if (!args[0] || !args[1]) {
          console.log("Invalid input");
          break;
        }
        const source = resolve(currentDir, args[0]);
        const destination = resolve(currentDir, args[1]);

        const readable = createReadStream(source);
        const writable = createWriteStream(destination);
        const brotli = createBrotliCompress();

        readable
          .pipe(brotli)
          .pipe(writable)
          .on("finish", () => {
            console.log("File compressed successfully");
          })
          .on("error", () => {
            console.log("Operation failed");
          });
      } catch {
        console.log("Operation failed");
      }
      break;

    case "decompress":
      try {
        if (!args[0] || !args[1]) {
          console.log("Invalid input");
          break;
        }
        const source = resolve(currentDir, args[0]);
        const destination = resolve(currentDir, args[1]);

        const readable = createReadStream(source);
        const writable = createWriteStream(destination);
        const brotli = createBrotliDecompress();

        readable
          .pipe(brotli)
          .pipe(writable)
          .on("finish", () => {
            console.log("File decompressed successfully");
          })
          .on("error", () => {
            console.log("Operation failed");
          });
      } catch {
        console.log("Operation failed");
      }
      break;

    default:
      console.log("Invalid input");
  }
  console.log(`You are currently in ${currentDir}`);
  rl.prompt();
});

rl.on("close", () => {
  console.log(`Thank you for using File Manager, ${username}, goodbye!`);
  process.exit(0);
});
