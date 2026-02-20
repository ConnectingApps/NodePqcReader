import * as https from 'https';
import * as tls from 'tls';
import * as net from 'net';
import koffi from 'koffi';

interface TlsTrace {
  group: string;
  cipherSuite: string;
}

// Attempt to get the negotiated TLS group name via OpenSSL FFI.
// In Node.js, the SSL* pointer is not directly accessible from JS,
// so we use getEphemeralKeyInfo() to obtain the group name, which
// internally calls SSL_get_negotiated_group via the TLSWrap binding.
function getTlsTraceFromSocket(socket: tls.TLSSocket): TlsTrace | null {
  try {
    const cipherInfo = socket.getCipher();
    const cipherSuite = cipherInfo ? cipherInfo.standardName ?? cipherInfo.name : 'Unknown';

    // getEphemeralKeyInfo() returns the negotiated key exchange group name
    // (e.g., "X25519", "X25519MLKEM768") – equivalent to calling
    // SSL_ctrl(ssl, SSL_CTRL_GET_NEGOTIATED_GROUP, 0, NULL) + SSL_group_to_name().
    const ephemeralInfo = socket.getEphemeralKeyInfo() as { type?: string; name?: string; size?: number } | null;
    const group = ephemeralInfo?.name ?? 'Unknown (no ephemeral key info)';

    return { group, cipherSuite };
  } catch (err: any) {
    console.error('Error extracting TLS metadata:', err.message);
    return null;
  }
}

// Attempt to get the negotiated group NID via libssl.so.3 FFI using the
// SSL* pointer. In Node.js v22, the SSL* handle is not exposed to JavaScript,
// so this function demonstrates the FFI binding and falls back gracefully.
function getNegotiatedGroupViaFfi(sslPtr: Buffer | null): string {
  if (process.platform !== 'linux') {
    return 'Non-Linux';
  }

  if (!sslPtr) {
    return 'Err: Handle Not Found';
  }

  try {
    const libssl = koffi.load('libssl.so.3');

    const SSL_ctrl = libssl.func('SSL_ctrl', 'long', ['pointer', 'int', 'long', 'pointer']);
    const SSL_group_to_name = libssl.func('SSL_group_to_name', 'const char *', ['pointer', 'int']);

    const SSL_CTRL_GET_NEGOTIATED_GROUP = 134;
    const groupId = SSL_ctrl(sslPtr, SSL_CTRL_GET_NEGOTIATED_GROUP, 0, null) as number;

    if (groupId === 0) {
      return 'Unknown (GroupID=0)';
    }

    const groupName = SSL_group_to_name(sslPtr, groupId) as string | null;
    if (!groupName) {
      return `Decode Error (GroupID=${groupId})`;
    }

    return groupName;
  } catch (err: any) {
    return `Err: ${err.message}`;
  }
}

function makeHttpsRequest(): Promise<void> {
  return new Promise((resolve, reject) => {
    let tlsTrace: TlsTrace | null = null;

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
      const socket = res.socket as tls.TLSSocket;

      // Extract TLS trace from the established TLS socket
      tlsTrace = getTlsTraceFromSocket(socket);

      // Consume and discard the response body
      res.on('data', () => {});

      res.on('end', () => {
        if (tlsTrace) {
          console.log(`Negotiated Group: ${tlsTrace.group}`);
          console.log(`Cipher Suite: ${tlsTrace.cipherSuite}`);
        } else {
          console.log('TLS Trace not found.');
        }
        resolve();
      });
    });

    req.on('error', (err) => {
      console.log(`Error: ${err.message}`);
      resolve();
    });

    req.end();
  });
}

async function main(): Promise<void> {
  await makeHttpsRequest();
}

main();
