const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv)).argv;

const once = argv.once ?? false;

const isEqual = (obj1, obj2) => {
  if (obj1 === obj2) {
    return true;
  }

  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 == null || obj2 == null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!keys2.includes(key) || !isEqual(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
};

const writeMetadata = async (metadataPath, metadata) => {
  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  const existingMetadata = await fs.readFile(metadataPath, 'utf-8').catch(() => '{}');
  if (isEqual(JSON.parse(existingMetadata), metadata)) return;
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
  console.info(' 🐺 JSON data received and metadata file created');
};

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/__metadata') {
    let body = '';

    req.on('data', (chunk) => {
      body += chunk.toString(); // Convert Buffer to string
    });

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    req.on('end', async () => {
      try {
        const metadata = JSON.parse(body); // Parse the JSON data
        const filePath = path.join(__dirname, '../../.vovk/vovk-metadata.json');
        await writeMetadata(filePath, metadata);
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('JSON data received and file created');
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON');
        console.error(' ❌ ' + err.message);
      }
      if (once) server.close();
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

const PORT = process.env.VOVK_PORT || 3420;
server.listen(PORT, () => {
  console.info(` 🐺 Vovk Server running on port ${PORT}`);
});