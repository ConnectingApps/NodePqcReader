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

function makeHttpsRequest(): Promise<void> {
  return new Promise((resolve, reject) => {
    let tlsTrace: TlsTrace | null = null;
    let statusCode: number | undefined;
    let responsePreview: string | undefined;

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
      statusCode = res.statusCode;

      // Collect the first 10 characters of the response body
      let responseBodyPreview = '';
      res.on('data', (chunk: Buffer | string) => {
        if (responseBodyPreview.length < 10) {
          responseBodyPreview += chunk.toString();
        }
      });

      res.on('end', () => {
        responsePreview = responseBodyPreview.slice(0, 10);
        if (tlsTrace) {
          console.log(`Negotiated Group: ${tlsTrace.group}`);
          console.log(`Cipher Suite: ${tlsTrace.cipherSuite}`);
          console.log(`HTTP Status: ${statusCode}`);
          console.log(`Response Preview: ${responsePreview}`);
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
