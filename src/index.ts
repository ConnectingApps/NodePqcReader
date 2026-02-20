import { executeRequest } from './requestExecutor';

const request = {
  hostname: 'www.google.com',
  port: 443,
  path: '/',
  method: 'GET',
  headers: {
    'User-Agent': 'NodePqcReader/1.0',
  },
};

executeRequest(request).then(({ tlsTrace, response }) => {
  console.log(`Negotiated Group: ${tlsTrace.group}`);
  console.log(`Cipher Suite: ${tlsTrace.cipherSuite}`);
  console.log(`HTTP Status: ${response.statusCode}`);
  console.log(`Response Preview: ${response.body.slice(0, 10)}`);
}).catch(console.error);
