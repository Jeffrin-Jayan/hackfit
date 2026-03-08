import express from "express"

const router = express.Router()

router.post("/", async (req, res) => {
  try {
    const { language, source_code, stdin = "" } = req.body;

    if (!source_code) {
      return res.status(400).json({
        success: false,
        error: "No code provided",
      });
    }

    // helper to run a command with timeout
    const { spawn, exec } = await import("child_process");
    const fs = await import("fs");
    const path = await import("path");
    const os = await import("os");

    const tmpdir = os.tmpdir();
    const id = `${Date.now()}-${Math.random().toString(36).substr(2)}`;

    // wrappers
    const wrapPython = (src) => {
      return `import sys, json
input_data = sys.stdin.read()
${src}
try:
    result = solve(json.loads(input_data))
    if result is not None:
        print(result)
except Exception as e:
    import traceback
    traceback.print_exc()
`;
    };

    const wrapJavaScript = (src) => {
      return `const fs = require('fs');
let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  try {
    const data = JSON.parse(input);
    ${src}
    const out = solve(data);
    if (out !== undefined) console.log(out);
  } catch (e) {
    console.error(e.stack || e);
  }
});
`;
    };

    const runProcess = (cmd, args, input) => {
      return new Promise((resolve) => {
        const proc = spawn(cmd, args, { timeout: 3000 });
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d) => (stdout += d));
        proc.stderr.on("data", (d) => (stderr += d));
        proc.on("error", (e) => (stderr += e.message));
        proc.on("close", () => {
          resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
        });
        if (input) {
          proc.stdin.write(input);
        }
        proc.stdin.end();
      });
    };

    const execCmd = (command) => {
      return new Promise((resolve, reject) => {
        exec(command, { timeout: 3000 }, (err, stdout, stderr) => {
          if (err) {
            reject({ err, stdout, stderr });
          } else {
            resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
          }
        });
      });
    };

    // prepare file and commands
    let runResult = { stdout: "", stderr: "", runtime: "0ms" };
    const startTime = Date.now();
    try {
      if (language === "python") {
        const file = path.join(tmpdir, `${id}.py`);
        fs.writeFileSync(file, wrapPython(source_code));
        runResult = await runProcess("python3", [file], stdin);
      } else if (language === "javascript") {
        const file = path.join(tmpdir, `${id}.js`);
        fs.writeFileSync(file, wrapJavaScript(source_code));
        runResult = await runProcess("node", [file], stdin);
      } else if (language === "cpp") {
        const srcFile = path.join(tmpdir, `${id}.cpp`);
        const exeFile = path.join(tmpdir, `${id}.out`);
        fs.writeFileSync(srcFile, source_code);
        try {
          await execCmd(`g++ "${srcFile}" -o "${exeFile}"`);
        } catch (cerr) {
          // compilation error
          runResult.stdout = "";
          runResult.stderr = cerr.stderr || cerr.err.message;
          runResult.runtime = `${Date.now() - startTime}ms`;
          return res.json(runResult);
        }
        runResult = await runProcess(exeFile, [], stdin);
      } else if (language === "java") {
        // wrap user code into Main class if not provided?
        const srcFile = path.join(tmpdir, `Main${id}.java`);
        fs.writeFileSync(srcFile, source_code);
        try {
          await execCmd(`javac "${srcFile}" -d "${tmpdir}"`);
        } catch (cerr) {
          runResult.stdout = "";
          runResult.stderr = cerr.stderr || cerr.err.message;
          runResult.runtime = `${Date.now() - startTime}ms`;
          return res.json(runResult);
        }
        runResult = await runProcess("java", ["-cp", tmpdir, "Main"], stdin);
      } else {
        return res.status(400).json({ error: "Unsupported language" });
      }
    } catch (e) {
      runResult.stderr += `\n${e.message}`;
    }
    runResult.runtime = `${Date.now() - startTime}ms`;

    return res.json(runResult);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Compiler server error" });
  }
});

export default router