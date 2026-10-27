// Packages markasread/ into dist/mark-as-read-<version>.zip for the Chrome Web
// Store. Uses only Node built-ins (zlib.crc32 needs Node 22.2+).

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { crc32, deflateRawSync } from "node:zlib";

const root = join(import.meta.dirname, "..");
const source = join(root, "markasread");
const ignored = new Set([".DS_Store", "Thumbs.db"]);

function listFiles(dir) {
    return readdirSync(dir).flatMap(name => {
        if (ignored.has(name)) {
            return [];
        }
        const path = join(dir, name);
        return statSync(path).isDirectory() ? listFiles(path) : [path];
    }).sort();
}

// Writes a standard zip archive (deflate, no extra fields).
function zip(files) {
    const local = [];
    const central = [];
    let offset = 0;
    for (const { name, data } of files) {
        const nameBytes = Buffer.from(name, "utf8");
        const compressed = deflateRawSync(data, { level: 9 });
        const crc = crc32(data);

        const header = Buffer.alloc(30);
        header.writeUInt32LE(0x04034b50, 0);
        header.writeUInt16LE(20, 4);              // version needed
        header.writeUInt16LE(0x0800, 6);          // UTF-8 names
        header.writeUInt16LE(8, 8);               // deflate
        header.writeUInt16LE(0, 10);              // time
        header.writeUInt16LE(0x21, 12);           // date: 1980-01-01, for reproducible builds
        header.writeUInt32LE(crc, 14);
        header.writeUInt32LE(compressed.length, 18);
        header.writeUInt32LE(data.length, 22);
        header.writeUInt16LE(nameBytes.length, 26);
        local.push(header, nameBytes, compressed);

        const entry = Buffer.alloc(46);
        entry.writeUInt32LE(0x02014b50, 0);
        entry.writeUInt16LE(20, 4);               // version made by
        entry.writeUInt16LE(20, 6);
        entry.writeUInt16LE(0x0800, 8);
        entry.writeUInt16LE(8, 10);
        entry.writeUInt16LE(0, 12);
        entry.writeUInt16LE(0x21, 14);
        entry.writeUInt32LE(crc, 16);
        entry.writeUInt32LE(compressed.length, 20);
        entry.writeUInt32LE(data.length, 24);
        entry.writeUInt16LE(nameBytes.length, 28);
        entry.writeUInt32LE(offset, 42);
        central.push(entry, nameBytes);

        offset += header.length + nameBytes.length + compressed.length;
    }
    const centralSize = central.reduce((total, buf) => total + buf.length, 0);
    const end = Buffer.alloc(22);
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(files.length, 8);
    end.writeUInt16LE(files.length, 10);
    end.writeUInt32LE(centralSize, 12);
    end.writeUInt32LE(offset, 16);
    return Buffer.concat([...local, ...central, end]);
}

const { version } = JSON.parse(readFileSync(join(source, "manifest.json"), "utf8"));
const files = listFiles(source).map(path => ({
    name: relative(source, path).split(sep).join("/"),
    data: readFileSync(path)
}));

mkdirSync(join(root, "dist"), { recursive: true });
const output = join(root, "dist", `mark-as-read-${version}.zip`);
writeFileSync(output, zip(files));
console.log(`Wrote ${relative(root, output)} (${files.length} files)`);
