# pqc-tracer

Reusable TLS Post-Quantum Cryptography tracer for outgoing HTTPS requests in Node.js.

This package allows you to make HTTPS requests and inspect the TLS handshake to detect whether Post-Quantum Cryptography (PQC) was used, specifically revealing the key exchange group (e.g., `X25519MLKEM768`) and cipher suite negotiated.

## Features

- Detects the negotiated TLS key exchange group (including ML-KEM / Kyber-based PQC groups)
- Captures the cipher suite used in the TLS session

## Installation

```bash
npm install pqc-tracer
```

## Usage

```typescript
import { executeRequest } from 'pqc-tracer';

const request = {
  hostname: 'www.example.com',
  port: 443,
  path: '/',
  method: 'GET',
};

executeRequest(request).then(({ tlsTrace, response }) => {
  console.log(`Negotiated Group: ${tlsTrace.group}`);
  console.log(`Cipher Suite: ${tlsTrace.cipherSuite}`);
  console.log(`HTTP Status: ${response.statusCode}`);
}).catch(console.error);
```

## API

### `executeRequest(options: https.RequestOptions): Promise<RequestResult>`

Makes an HTTPS request and returns TLS trace information along with the HTTP response.

### `TlsTrace`

```typescript
interface TlsTrace {
  group: string;       // e.g. "X25519MLKEM768"
  cipherSuite: string; // e.g. "TLS_AES_256_GCM_SHA384"
}
```

### `HttpResponse`

```typescript
interface HttpResponse {
  statusCode: number | undefined;
  statusMessage: string | undefined;
  headers: IncomingHttpHeaders;
  httpVersion: string;
  body: string;
}
```

### `RequestResult`

```typescript
interface RequestResult {
  tlsTrace: TlsTrace;
  response: HttpResponse;
}
```

## Low-level API

- `startStderrCapture()` — Redirects fd 2 (stderr) to a temp file to capture OpenSSL trace output.
- `stopStderrCapture(): string` — Restores stderr and returns captured output.
- `getTlsTrace(socket: tls.TLSSocket, traceOutput: string): TlsTrace` — Parses TLS trace from socket and/or trace output.

## Requirements

- Node.js >= 20
- Linux (uses `libc.so.6` for fd-level stderr redirection)

> ⚠️ **Warning:** This library is currently **Linux only**.

## About the Author

This library was made by **Daan Acohen**.

- 💼 Connect with me on [LinkedIn](https://www.linkedin.com/in/daanacohen)
- 🔒 Check out [Quantum Safe Audit](https://www.quantumsafeaudit.com/) to verify if your browser and web server are quantum safe.

## License

GPL-3.0
