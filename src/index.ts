import * as https from 'https';
import * as tls from 'tls';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import koffi from 'koffi';

interface TlsTrace {
  group: string;
  cipherSuite: string;
}

// libc fd-redirection helpers used to capture OpenSSL's trace output.
// enableTrace() writes directly to OS file-descriptor 2 (stderr), so we must
// redirect at the fd level rather than monkey-patching process.stderr.
const libc = koffi.load('libc.so.6');
const dupFn   = libc.func('int dup(int oldfd)');
const dup2Fn  = libc.func('int dup2(int oldfd, int newfd)');
const closeFn = libc.func('int close(int fd)');

let savedStderrFd = -1;
let captureFile   = '';

function startStderrCapture(): void {
  captureFile = path.join(os.tmpdir(), `tls-trace-${Date.now()}-${process.pid}.txt`);
  const tmpFd = fs.openSync(captureFile, 'w');
  savedStderrFd = dupFn(2);   // save a copy of stderr
  dup2Fn(tmpFd, 2);            // point fd 2 at the temp file
  closeFn(tmpFd);              // close the extra fd (dup2 already duplicated it to 2)
}

function stopStderrCapture(): string {
  if (savedStderrFd >= 0) {
    dup2Fn(savedStderrFd, 2);  // restore fd 2 to the real stderr
    closeFn(savedStderrFd);
    savedStderrFd = -1;
  }
  try {
    const output = fs.readFileSync(captureFile, 'utf8');
    fs.unlinkSync(captureFile);
    return output;
  } catch {
    return '';
  }
}

// Parse the negotiated key exchange group from OpenSSL's SSL trace output.
// enableTrace() writes a detailed handshake log that includes a line like:
//   ServerHello, Length=...
//     ...
//     extension_type=key_share(51), length=...
//         NamedGroup: X25519MLKEM768 (4588)
function parseGroupFromTrace(traceOutput: string): string | null {
  const serverHelloIdx = traceOutput.indexOf('ServerHello');
  if (serverHelloIdx === -1) return null;
  const afterServerHello = traceOutput.slice(serverHelloIdx);
  const match = afterServerHello.match(/NamedGroup:\s+(\S+)/);
  return match ? match[1] : null;
}

function makeHttpsRequest(): Promise<void> {
  return new Promise((resolve, _reject) => {
    let tlsTrace: TlsTrace | null = null;
    let statusCode: number | undefined;
    let cipherSuite = 'Unknown';

    const options: https.RequestOptions = {
      hostname: 'www.google.com',
      port: 443,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'NodePqcReader/1.0',
      },
    };

    const req = https.request(options, (res) => {
      // Capture socket reference immediately — it may become null by 'end'
      const socket = res.socket as tls.TLSSocket;
      statusCode = res.statusCode;

      // Collect the first 10 characters of the response body
      let responseBodyPreview = '';
      res.on('data', (chunk: Buffer | string) => {
        if (responseBodyPreview.length < 10) {
          responseBodyPreview += chunk.toString();
        }
      });

      res.on('end', () => {
        // Stop capturing after all TLS traffic for this response is done
        const traceOutput = stopStderrCapture();

        // Determine the negotiated group:
        //   1. getEphemeralKeyInfo().name  — works on Node 22 / TLS 1.2
        //   2. Parse SSL trace              — required for Node 24 / TLS 1.3
        const ephemeralInfo = socket.getEphemeralKeyInfo() as { name?: string } | null;
        const groupFromApi   = ephemeralInfo?.name ?? null;
        const groupFromTrace = groupFromApi ? null : parseGroupFromTrace(traceOutput);
        const group = groupFromApi ?? groupFromTrace ?? 'Unknown (no ephemeral key info)';

        const cipherInfo = socket.getCipher();
        cipherSuite = cipherInfo ? (cipherInfo.standardName ?? cipherInfo.name) : 'Unknown';

        tlsTrace = { group, cipherSuite };

        const responsePreview = responseBodyPreview.slice(0, 10);
        console.log(`Negotiated Group: ${tlsTrace.group}`);
        console.log(`Cipher Suite: ${tlsTrace.cipherSuite}`);
        console.log(`HTTP Status: ${statusCode}`);
        console.log(`Response Preview: ${responsePreview}`);
        resolve();
      });
    });

    // Enable SSL trace BEFORE the handshake starts so the full ServerHello
    // is captured. The trace is written directly to fd 2 (stderr) by OpenSSL,
    // so we redirect that fd to a temp file for the duration of the request.
    req.on('socket', (rawSocket) => {
      const handle = (rawSocket as any)._handle;
      if (handle && typeof handle.enableTrace === 'function') {
        startStderrCapture();
        handle.enableTrace();
      }
    });

    req.on('error', (err) => {
      stopStderrCapture();
      console.log(`Error: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

makeHttpsRequest().catch(console.error);
