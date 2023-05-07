import { createWriteStream, existsSync } from "fs";
import * as fs from "fs/promises";
import fetch from "node-fetch";
import { pipeline } from "stream/promises";
import tar from "tar";
import { ARCH_MAPPING, CONFIG, PLATFORM_MAPPING } from "./config.js";
import path from "path";

async function install() {
  const version = await (
    await fetch("https://get-latest.deno.dev/cli/cli?no-v=true")
  ).text();

  // Fetch Static Config
  let { name: binName, path: binPath, url } = CONFIG;

  url = url.replace(/{{platform}}/g, PLATFORM_MAPPING[process.platform]);
  url = url.replace(/{{arch}}/g, ARCH_MAPPING[process.arch]);
  url = url.replace(/{{version}}/g, version);
  url = url.replace(/{{bin_name}}/g, binName);

  console.log(url);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("Failed fetching the binary: " + response.statusText);
  }

  const tarFile = "downloaded.tar.gz";

  await fs.mkdir(binPath, { recursive: true });
  await pipeline(response.body, createWriteStream(tarFile));
  await tar.x({ file: tarFile, cwd: binPath });
  await fs.rm(tarFile);

  await fs.copyFile(
    path.join(
      "bin",
      `${binName}_${version}_${PLATFORM_MAPPING[process.platform]}_${
        ARCH_MAPPING[process.arch]
      }`,
      "bin",
      process.platform === "win32" ? "gh.exe" : "gh"
    ),
    path.join("bin", process.platform === "win32" ? "gh.exe" : "gh")
  );
}

install()
  .then(async () => {
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    process.exit(1);
  });
