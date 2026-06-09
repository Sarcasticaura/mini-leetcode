// In-Browser Code Execution Engine using Web Workers and Blobs
// Prevents CORS issues on file:// protocol and sandboxes execution.

(function() {
  // Define JS Worker Code as a string
  const jsWorkerCode = `
    let logs = [];
    const customConsole = {
      log: (...args) => {
        logs.push(args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      },
      error: (...args) => {
        logs.push("[ERROR] " + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      },
      warn: (...args) => {
        logs.push("[WARN] " + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      },
      info: (...args) => {
        logs.push("[INFO] " + args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' '));
      }
    };
    self.console = customConsole;

    self.onmessage = function(e) {
      const { code, functionName, args } = e.data;
      logs = [];
      try {
        // Evaluate user function
        const evalFn = new Function(code + "\\nreturn " + functionName + ";");
        const userFn = evalFn();
        
        const startTime = performance.now();
        const result = userFn(...args);
        const endTime = performance.now();
        
        self.postMessage({
          success: true,
          result: result,
          logs: logs,
          runtime: (endTime - startTime).toFixed(2)
        });
      } catch (err) {
        self.postMessage({
          success: false,
          error: err.toString(),
          logs: logs
        });
      }
    };
  `;

  // Define Python Worker Code (using Pyodide)
  const pyWorkerCode = `
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

    let pyodide = null;
    let logs = [];

    async function initPyodide() {
      if (!pyodide) {
        self.postMessage({ type: 'status', status: 'loading' });
        pyodide = await loadPyodide({
          stdout: (text) => { logs.push(text); },
          stderr: (text) => { logs.push("[ERROR] " + text); }
        });
        self.postMessage({ type: 'status', status: 'ready' });
      }
    }

    self.onmessage = async function(e) {
      const { code, functionName, args } = e.data;
      logs = [];
      
      try {
        await initPyodide();
        
        // Convert JS args to Python arguments via JSON
        let pyArgs = [];
        for (let i = 0; i < args.length; i++) {
          let argStr = JSON.stringify(args[i]);
          let escapedStr = argStr.replace(/\\\\/g, '\\\\\\\\').replace(/'/g, "\\\\'");
          pyArgs.push("json.loads('" + escapedStr + "')");
        }
        
        let runCode = "import json\\n" +
          code + "\\n" +
          "\\n" +
          "try:\\n" +
          "    result = " + functionName + "(" + pyArgs.join(', ') + ")\\n" +
          "    serialized_result = json.dumps(result)\\n" +
          "    py_error = None\\n" +
          "except Exception as e:\\n" +
          "    import traceback\\n" +
          "    serialized_result = None\\n" +
          "    py_error = traceback.format_exc()\\n";

        const startTime = performance.now();
        await pyodide.runPythonAsync(runCode);
        const endTime = performance.now();
        
        const pyError = pyodide.globals.get('py_error');
        if (pyError) {
          self.postMessage({
            type: 'result',
            success: false,
            error: pyError,
            logs: logs
          });
        } else {
          const serializedResult = pyodide.globals.get('serialized_result');
          const result = JSON.parse(serializedResult);
          self.postMessage({
            type: 'result',
            success: true,
            result: result,
            logs: logs,
            runtime: (endTime - startTime).toFixed(2)
          });
        }
      } catch (err) {
        self.postMessage({
          type: 'result',
          success: false,
          error: err.toString(),
          logs: logs
        });
      }
    };
  `;

  // Persistent worker refs
  let persistentPyWorker = null;
  let pyWorkerStatus = 'idle'; // 'idle', 'loading', 'ready'
  let pyStatusCallback = null;

  function createJsWorker() {
    const blob = new Blob([jsWorkerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
  }

  function getPyWorker() {
    if (!persistentPyWorker) {
      const blob = new Blob([pyWorkerCode], { type: 'application/javascript' });
      persistentPyWorker = new Worker(URL.createObjectURL(blob));
      persistentPyWorker.onmessage = function(e) {
        if (e.data.type === 'status') {
          pyWorkerStatus = e.data.status;
          if (pyStatusCallback) pyStatusCallback(pyWorkerStatus);
        }
      };
    }
    return persistentPyWorker;
  }

  window.CodeRunner = {
    // Check or subscribe to Python worker loading status
    onPythonStatusChange: function(callback) {
      pyStatusCallback = callback;
      if (persistentPyWorker) {
        callback(pyWorkerStatus);
      }
    },

    runJavaScript: function(code, functionName, args) {
      return new Promise((resolve) => {
        const worker = createJsWorker();
        
        // 3-second timeout for JS execution
        const timeout = setTimeout(() => {
          worker.terminate();
          resolve({
            success: false,
            error: "Time Limit Exceeded (TLE): Your code ran for longer than 3000ms. Check for infinite loops.",
            logs: ["Execution aborted due to timeout."]
          });
        }, 3000);

        worker.onmessage = function(e) {
          clearTimeout(timeout);
          worker.terminate();
          resolve(e.data);
        };

        worker.onerror = function(err) {
          clearTimeout(timeout);
          worker.terminate();
          resolve({
            success: false,
            error: err.message,
            logs: []
          });
        };

        worker.postMessage({ code, functionName, args });
      });
    },

    runPython: function(code, functionName, args) {
      return new Promise((resolve) => {
        const worker = getPyWorker();
        
        // 8-second timeout for Python (longer to accommodate Pyodide startup)
        const timeout = setTimeout(() => {
          // Terminate the frozen worker
          persistentPyWorker.terminate();
          persistentPyWorker = null; // force recreate next time
          pyWorkerStatus = 'idle';
          if (pyStatusCallback) pyStatusCallback('idle');
          
          resolve({
            success: false,
            error: "Time Limit Exceeded (TLE): Python execution exceeded 8000ms. Check for infinite loops.",
            logs: ["Execution aborted due to timeout."]
          });
        }, 8000);

        // Temporarily override worker's result listener
        const previousOnMessage = worker.onmessage;
        worker.onmessage = function(e) {
          if (e.data.type === 'status') {
            pyWorkerStatus = e.data.status;
            if (pyStatusCallback) pyStatusCallback(pyWorkerStatus);
            return;
          }
          
          if (e.data.type === 'result') {
            clearTimeout(timeout);
            // Restore default listener
            worker.onmessage = previousOnMessage;
            resolve(e.data);
          }
        };

        worker.onerror = function(err) {
          clearTimeout(timeout);
          worker.onmessage = previousOnMessage;
          resolve({
            success: false,
            error: err.message,
            logs: []
          });
        };

        worker.postMessage({ code, functionName, args });
      });
    },

    run: function(language, code, functionName, args) {
      if (language === 'javascript') {
        return this.runJavaScript(code, functionName, args);
      } else if (language === 'python') {
        return this.runPython(code, functionName, args);
      } else {
        return Promise.resolve({
          success: false,
          error: `Unsupported language: ${language}`,
          logs: []
        });
      }
    }
  };
})();
