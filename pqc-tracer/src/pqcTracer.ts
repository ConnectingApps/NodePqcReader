import * as https from 'https';
import { IncomingHttpHeaders } from 'http';
import * as tls from 'tls';
import { startStderrCapture, stopStderrCapture, getTlsTrace, TlsTrace } from './tlsTrace';
export interface HttpResponse {
  statusCode: number | undefined;
  statusMessage: string | undefined;
  headers: IncomingHttpHeaders;
  httpVersion: string;
  body: string;
}
export interface RequestResult {
  tlsTrace: TlsTrace;
  response: HttpResponse;
}
export function executeRequest(options: https.RequestOptions): Promise<RequestResult> {
  return new Promise((resolve, _reject) => {
    let statusCode: number | undefined;
    const req = https.request(options, (res) => {
      const socket = res.socket as tls.TLSSocket;
      statusCode = res.statusCode;
      let responseBody = '';
      res.on('data', (chunk: Buffer | string) => {
        responseBody += chunk.toString();
      });
      res.on('end', () => {
        const traceOutput = stopStderrCapture();
        const tlsTrace = getTlsTrace(socket, traceOutput);
        resolve({
          tlsTrace,
          response: {
            statusCode: res.statusCode,
            statusMessage: res.statusMessage,
            headers: res.headers,
            httpVersion: res.httpVersion,
            body: responseBody,
          },
        });
      });
    });
    req.on('socket', (rawSocket) => {
      const handle = (rawSocket as any)._handle;
      if (handle && typeof handle.enableTrace === 'function') {
        startStderrCapture();
        handle.enableTrace();
      }
    });
    req.on('error', (err) => {
      stopStderrCapture();
      resolve({
        tlsTrace: { group: 'Error', cipherSuite: 'Error' },
        response: { statusCode: undefined, statusMessage: undefined, headers: {}, httpVersion: '', body: err.message },
      });
    });
    req.end();
  });
}
