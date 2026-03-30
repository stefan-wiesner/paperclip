import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

const SUPPORTED_EXTENSIONS = new Set([
  ".js", ".jsx", ".ts", ".tsx", ".py", ".go", ".java", ".c", ".cpp", ".h", ".hpp",
  ".rb", ".php", ".cs", ".swift", ".kt", ".scala", ".rs", ".vue", ".svelte",
]);

const MAX_FILE_SIZE = 512 * 1024; // 512KB per file
const CHUNK_SIZE = 3000; // lines per chunk for LLM analysis

export interface CodeChunk {
  filePath: string;
  chunkIndex: number;
  totalChunks: number;
  content: string;
  language: string;
  startLine: number;
  endLine: number;
}

export interface IngestionResult {
  scanId: string;
  repoUrl: string;
  branch: string;
  localPath: string;
  totalFiles: number;
  chunks: CodeChunk[];
}

function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const langMap: Record<string, string> = {
    ".js": "javascript", ".jsx": "javascript", ".ts": "typescript", ".tsx": "typescript",
    ".py": "python", ".go": "go", ".java": "java", ".c": "c", ".cpp": "cpp",
    ".h": "c", ".hpp": "cpp", ".rb": "ruby", ".php": "php", ".cs": "csharp",
    ".swift": "swift", ".kt": "kotlin", ".scala": "scala", ".rs": "rust",
    ".vue": "vue", ".svelte": "svelte",
  };
  return langMap[ext] || "text";
}

function isSupported(filePath: string): boolean {
  return SUPPORTED_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

async function runGit(cloneUrl: string, branch: string, localPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = ["clone", "--branch", branch, "--single-branch", "--depth", "50", cloneUrl, localPath];
    const child = spawn("git", args, { stdio: "pipe" });
    let stderr = "";
    child.stderr?.on("data", (d) => { stderr += d.toString(); });
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`git clone failed: ${stderr}`));
    });
    child.on("error", reject);
  });
}

async function listFilesRecursive(dir: string, baseDir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);
      if (entry.isDirectory()) {
        if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") continue;
        results.push(...await listFilesRecursive(fullPath, baseDir));
      } else if (entry.isFile() && isSupported(fullPath)) {
        results.push(relativePath);
      }
    }
  } catch {}
  return results;
}

async function readFileChunk(filePath: string, startLine: number, endLine: number): Promise<string> {
  const content = await fs.readFile(filePath, "utf-8");
  const lines = content.split("\n");
  return lines.slice(startLine, endLine).join("\n");
}

export async function ingestRepo(scanId: string, repoUrl: string, branch: string): Promise<IngestionResult> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), `vuln-scan-${scanId.slice(0, 8)}-`));
  const localPath = path.join(tmpDir, "repo");

  try {
    await runGit(repoUrl, branch, localPath);
  } catch (err) {
    // Fallback: try main branch if requested branch doesn't exist
    try {
      await runGit(repoUrl, "main", localPath);
    } catch {
      await fs.rm(tmpDir, { recursive: true, force: true });
      throw new Error(`Failed to clone repo: ${repoUrl}`);
    }
  }

  const files = await listFilesRecursive(localPath, localPath);
  const chunks: CodeChunk[] = [];
  let totalFiles = 0;

  for (const relativePath of files) {
    const fullPath = path.join(localPath, relativePath);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.size > MAX_FILE_SIZE) continue;

      const content = await fs.readFile(fullPath, "utf-8");
      const lines = content.split("\n");
      const totalLines = lines.length;

      if (totalLines === 0) continue;
      totalFiles++;

      const numChunks = Math.ceil(totalLines / CHUNK_SIZE);
      for (let i = 0; i < numChunks; i++) {
        const startLine = i * CHUNK_SIZE + 1;
        const endLine = Math.min((i + 1) * CHUNK_SIZE, totalLines);
        chunks.push({
          filePath: relativePath,
          chunkIndex: i,
          totalChunks: numChunks,
          content: lines.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE).join("\n"),
          language: detectLanguage(relativePath),
          startLine,
          endLine,
        });
      }
    } catch {
      // Skip files that can't be read
    }
  }

  // Clean up clone but keep scan artifacts for debugging
  try {
    await fs.rm(path.join(localPath), { recursive: true, force: true });
  } catch {}

  return { scanId, repoUrl, branch, localPath: tmpDir, totalFiles, chunks };
}

export async function cleanupScan(scanId: string, localPath: string): Promise<void> {
  try {
    await fs.rm(localPath, { recursive: true, force: true });
  } catch {}
}
